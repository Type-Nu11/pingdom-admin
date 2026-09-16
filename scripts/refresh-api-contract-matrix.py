"""Reconcile checked-in OpenAPI with source evidence; no network or runtime QA."""
import csv
import json
import re
import subprocess
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
                           issue='#207', backend_prerequisite='계약 존재; 실서버 QA 미수행')
                row['frontend_target'] = '; '.join(f"{c['file']}::{c['function']} -> {','.join(c['callers']) or 'no callers'}" for c in calls) or '호출 근거 없음'
                row['status'] = 'partial' if connected else 'missing'
                row['destructive'] = previous.get('destructive') or ('no' if method == 'get' else 'review-required')
                row['confirmation'] = previous.get('confirmation') or ('해당 없음' if method == 'get' else '호출 연결 확인; 작업 UI 검증 별도')
                if connected and previous.get('status') == 'implemented':
                    row['status'] = 'implemented'
                if path == '/admin/dashboard/pending-items':
                    row.update(status='alternative', issue='#207',
                               frontend_target='대시보드는 /admin/merchant-place-applications?status=PENDING&page=1&limit=10 및 서버 total 사용',
                               backend_prerequisite='옛 게시글 혼합 집계 대신 장소 신청 전용 조회; 서버 API 삭제 의미 아님')
                if '/members' in path or '/invitations/' in path:
                    row.update(issue='#204', backend_prerequisite='팀원 관리는 현재 제품 범위 제외; 서버 차단 아님')
                if (path.startswith('/admin/posts/') and '/s3/' not in path) or path.startswith(('/admin/reports/', '/admin/report-appeals')):
                    row.update(status='excluded', issue='#207', confirmation='기획상 제외; 웹에서 처리하지 않음',
                               backend_prerequisite='옛 MapImage 운영 기능 제외; 서버 API·데이터 삭제는 별도 결정')
                if method == 'get' and (path == '/merchant-owner/places/{placeId}/menus/{menuId}' or path == '/users/me/merchant-place-applications/{applicationId}/attachments') and not connected:
                    row.update(status='alternative', frontend_target='메뉴 목록 또는 통합 신청 상세의 첨부 배열 사용; 단건 API 직접 호출 없음')
                if connected and '/media' in path:
                    row.update(status='implemented', confirmation='useMerchantPlaceOperations; displayOrder 이동 위치/업로드 후 완료 등록', backend_prerequisite='없음; 현재 문서 계약과 요청 필드 연결 확인')
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
            row.update(status='blocked' if connected else 'removed', issue='#203' if 'merchant-verification' in row['path'] else '#207',
                       canonical_status='현재 Admin/Merchant 문서에 없음; 서버 삭제 확정 아님',
                       last_verified=metadata['collected_at'],
                       backend_prerequisite='사용 중 호출의 계약 확인 필요' if connected else '통합 신청 등 대체 사용; 구형 호출 근거 없음',
                       frontend_target='; '.join(f"{c['file']}::{c['function']} -> {','.join(c['callers'])}" for c in connected) or '호출 근거 없음')
        else:
            row['canonical_status'] = 'out-of-scope: 기존 기록 보존, 이번 확인 대상 아님'
        rows.append(row)
    with MATRIX.open('w', newline='') as f:
        writer = csv.DictWriter(f, fields, quoting=csv.QUOTE_ALL, lineterminator='\n')
        writer.writeheader()
        for i, row in enumerate(rows, 1):
            row['id'] = str(i)
            writer.writerow(row)
    gaps = [c for c in inventory if c['callers'] and c['path'].startswith(('/admin/', '/merchant-owner/', '/users/me/merchant-')) and not any(
        c['method'] == method and re.fullmatch(re.sub(r'\\\{.*?\\\}', '[^/]+', re.escape(c['path'])), p)
        for method, p in current)]
    (ROOT / 'docs/openapi/source-contract-gaps.json').write_text(json.dumps(gaps, ensure_ascii=False, indent=2) + '\n')
    print(f'{len(current)} current operations; {len(rows)} total rows')
    for row in rows:
        if row['status'] in ['missing', 'alternative']:
            print(row['status'], row['method'], row['path'])


if __name__ == '__main__':
    main()
