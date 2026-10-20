"""Reconcile checked-in OpenAPI with source evidence; no network or runtime QA."""
import csv
import io
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MATRIX = ROOT / 'docs/web-api-contract-matrix.csv'
normalize = lambda p: re.sub(r'\{[^}]+\}', '{}', p)


def schema(value):
    if not value:
        return '-'
    if '$ref' in value:
        return value['$ref'].rsplit('/', 1)[-1]
    if value.get('type') == 'array':
        return schema(value.get('items')) + '[]'
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(',', ':'))


def content(value):
    return '|'.join(sorted({schema(v.get('schema')) for v in value.get('content', {}).values()})) or '-'


def main():
    metadata = json.loads((ROOT / 'docs/openapi/metadata.json').read_text())
    known = json.loads((ROOT / 'docs/openapi/known-source-contracts.json').read_text())
    known_by_key = {(r['method'], normalize(r['path'])): r for r in known}
    with MATRIX.open() as f:
        reader = csv.DictReader(f)
        fields = reader.fieldnames
        old = list(reader)
    inventory = json.loads(subprocess.check_output(['node', 'scripts/api-source-inventory.mjs'], cwd=ROOT))
    evidence = {}
    for item in inventory:
        evidence.setdefault((item['method'], normalize(item['path'])), []).append(item)
    prior = {(r['method'], normalize(r['path'])): r for r in old}
    rows = []
    current = set()
    for group in ['admin', 'merchant']:
        doc = json.loads((ROOT / f'docs/openapi/{group}.json').read_text())
        for path, methods in sorted(doc['paths'].items()):
            for method, operation in sorted(methods.items()):
                if method not in ['get', 'post', 'put', 'patch', 'delete']:
                    continue
                key = (method.upper(), normalize(path))
                current.add(key)
                previous = prior.get(key, {})
                row = {f: previous.get(f, '') for f in fields}
                calls = evidence.get(key, [])
                if not calls:
                    calls = [c for c in inventory if c['method'] == key[0] and re.fullmatch(re.sub(r'\\\{.*?\\\}', '[^/]+', re.escape(c['path'])), path)]
                connected = [c for c in calls if c['callers']]
                row.update(method=method.upper(), path=path, summary=operation.get('summary', ''),
                           request_schema=content(operation.get('requestBody', {})),
                           success_response_schema='|'.join(f'{s}:{content(v)}' for s, v in operation.get('responses', {}).items() if s.startswith('2')) or '-',
                           error_response_schemas='|'.join(f'{s}:{content(v)}' for s, v in operation.get('responses', {}).items() if not s.startswith('2')) or '-',
                           last_verified=metadata['collected_at'], canonical_status=f'{group}: documented',
                           issue=previous.get('issue') or metadata.get('issue', '#302'), backend_prerequisite=previous.get('backend_prerequisite') or '계약 존재; 실서버 QA 미수행')
                row['frontend_target'] = '; '.join(f"{c['file']}::{c['function']} -> {','.join(c['callers']) or 'no callers'}" for c in calls) or '호출 근거 없음'
                row['status'] = 'partial' if connected else 'missing'
                row['destructive'] = previous.get('destructive') or ('no' if method == 'get' else 'review-required')
                row['confirmation'] = previous.get('confirmation') or ('해당 없음' if method == 'get' else '호출 연결 확인; 작업 UI 검증 별도')
                if connected and previous.get('status') == 'implemented':
                    row['status'] = 'implemented'
                if path == '/admin/dashboard/pending-items':
                    row.update(status='alternative', issue='#207',
                               frontend_target='src/api/adminPendingWorkApi.ts: 장소 신청·리뷰 삭제·커뮤니티 신고·검증·중복·Scout·Trust Score의 개별 API 집계; 예약은 상점주 처리 업무로 제외',
                               backend_prerequisite='옛 게시글 혼합 집계 대신 장소 신청 전용 조회; 서버 API 삭제 의미 아님')
                if '/members' in path or '/invitations/' in path:
                    if not connected:
                        row.update(status='excluded', issue='#204', confirmation='기획상 보류; 웹에서 처리하지 않음', backend_prerequisite='팀원 관리는 현재 제품 범위 제외; 서버 차단 아님')
                if (path.startswith('/admin/posts/') and '/s3/' not in path) or path.startswith(('/admin/reports/', '/admin/report-appeals')):
                    row.update(status='excluded', issue='#207', confirmation='기획상 제외; 웹에서 처리하지 않음',
                               backend_prerequisite='옛 MapImage 운영 기능 제외; 서버 API·데이터 삭제는 별도 결정')
                if method == 'get' and (path == '/merchant-owner/places/{placeId}/menus/{menuId}' or path == '/users/me/merchant-place-applications/{applicationId}/attachments') and not connected:
                    row.update(status='alternative', frontend_target='메뉴 목록 또는 통합 신청 상세의 첨부 배열 사용; 단건 API 직접 호출 없음')
                if path == '/admin/places/{id}/kakao-place-id' and not connected:
                    row.update(status='excluded', issue='#292; #302', confirmation='웹 Kakao ID 수정 UI/API 제거; 호출하지 않음',
                               backend_prerequisite='서버 문서에는 존재하지만 현 웹 제품 범위에서 제외; 서버 endpoint 삭제 의미 아님')
                if connected and '/media' in path:
                    row.update(status='implemented', confirmation='useMerchantPlaceOperations; displayOrder 이동 위치/업로드 후 완료 등록', backend_prerequisite='없음; 현재 문서 계약과 요청 필드 연결 확인')
                if connected and path.endswith('/naver-place-search'):
                    row.update(status='implemented')
                # An automated source inventory must not replace manually verified
                # product evidence (#295-#301) with older #256-era assumptions.
                if connected and previous.get('status') == 'implemented':
                    for field in ['issue', 'confirmation', 'backend_prerequisite', 'frontend_target']:
                        if previous.get(field):
                            row[field] = previous[field]
                if connected and path.startswith(('/admin/reservations', '/merchant-owner/reservations')):
                    row.update(status='implemented', issue='#317; #318' if group == 'admin' else '#315; #316; #318',
                               confirmation='관리자 조회 전용·상점주 승인/반려/취소 합성 회귀; 실서버 쓰기 미수행',
                               backend_prerequisite='최신 공개 계약 및 별도 고정한 서버 소스 기준 대조; 인증된 운영 QA 미수행')
                rows.append(row)
    for previous in old:
        key = (previous['method'], normalize(previous['path']))
        if key in current:
            continue
        row = previous.copy()
        in_scope = row['path'].startswith(('/admin/', '/merchant-owner/', '/users/me/merchant-'))
        if in_scope:
            calls = evidence.get(key, [])
            connected = [c for c in calls if c['callers']]
            source_contract = known_by_key.get(key)
            row.update(status='blocked' if connected else 'removed', issue=previous.get('issue') or ('#203' if 'merchant-verification' in row['path'] else '#207'),
                       canonical_status='현재 Admin/Merchant 문서에 없음; 서버 삭제 확정 아님',
                       last_verified=metadata['collected_at'],
                       backend_prerequisite='사용 중 호출의 계약 확인 필요' if connected else '통합 신청 등 대체 사용; 구형 호출 근거 없음',
                       frontend_target='; '.join(f"{c['file']}::{c['function']} -> {','.join(c['callers'])}" for c in connected) or '호출 근거 없음')
            if connected and source_contract:
                row.update(status=previous['status'], issue=previous['issue'],
                           success_response_schema=source_contract['success_response_schema'],
                           confirmation=previous['confirmation'], frontend_target=previous['frontend_target'],
                           backend_prerequisite=source_contract['verification'],
                           canonical_status='현재 Admin/Merchant 문서에 없음; 서버 소스 구현 확인; 알려진 문서 그룹 누락')
            if key[0] == 'POST' and re.fullmatch(r'/admin/reservations/\{[^}]+\}/(confirm|reject)', row['path']):
                row.update(status='removed', issue='#317; #318',
                           canonical_status='retired: 현재 Admin 문서 및 고정 서버 소스에서 제거 확인',
                           backend_prerequisite='관리자 승인·반려 폐기; 상점주 예약 처리 API로 이관',
                           frontend_target='호출 함수·hook action·관리자 UI 제거', confirmation='정적 호출 부재·관리자 읽기 전용 회귀 검사')
        else:
            row['canonical_status'] = 'out-of-scope: 기존 기록 보존, 이번 확인 대상 아님'
        rows.append(row)
    for row in rows:
        # Keep the original product evidence while making the formerly pending
        # snapshot task current. This transformation is idempotent.
        row['backend_prerequisite'] = row['backend_prerequisite'].replace('전체 스냅샷 갱신 #302', '원본 스냅샷은 #302 기준으로 갱신')
    output = io.StringIO(newline='')
    writer = csv.DictWriter(output, fields, quoting=csv.QUOTE_ALL, lineterminator='\n')
    writer.writeheader()
    for i, row in enumerate(rows, 1):
        row['id'] = str(i)
        writer.writerow(row)
    gaps = [{**c, **({'known_contract': known_by_key[(c['method'], normalize(c['path']))]} if (c['method'], normalize(c['path'])) in known_by_key else {})} for c in inventory if c['callers'] and c['path'].startswith(('/admin/', '/merchant-owner/', '/users/me/merchant-')) and not any(
        c['method'] == method and re.fullmatch(re.sub(r'\\\{.*?\\\}', '[^/]+', re.escape(c['path'])), p)
        for method, p in current)]
    artifacts = {MATRIX: output.getvalue(), ROOT / 'docs/openapi/source-contract-gaps.json': json.dumps(gaps, ensure_ascii=False, indent=2) + '\n'}
    if '--check' in sys.argv:
        if any(path.read_text() != contents for path, contents in artifacts.items()):
            raise SystemExit('Contract matrix/source gaps are stale; refresh explicitly and review the diff')
    else:
        for path, contents in artifacts.items():
            path.write_text(contents)
    print(f'{len(current)} current operations; {len(rows)} total rows')
    for row in rows:
        if row['status'] in ['missing', 'alternative']:
            print(row['status'], row['method'], row['path'])


if __name__ == '__main__':
    main()
