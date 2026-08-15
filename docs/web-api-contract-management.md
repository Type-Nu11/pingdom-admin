# Web API 계약 매트릭스 운영 기준

이 문서는 운영 Swagger의 `Web` 그룹 API를 실제 관리자 화면 구현과 연결해 추적하는 기준입니다. API 호출 도구나 Swagger 대체 화면을 만들기 위한 문서가 아닙니다.

## 기준 스냅샷

- 상위 이슈: #67
- 매트릭스 이슈: #78
- 운영 Swagger: `http://54.116.166.107:8080/v3/api-docs`
- 확인일: 2026-08-15
- Web operation: 133개
- 기록 파일: [`web-api-contract-matrix.csv`](./web-api-contract-matrix.csv)

2026-08-15 기준 로컬 백엔드 `src/test/resources/openapi-baseline/web.json`은 117개 operation입니다. 운영 Swagger와 비교하면 아래 16개 operation이 로컬 baseline에 없습니다.

- 사용자 역할 3개
- Scout 프로필 8개
- Trust Score 2개
- legacy 후보인 장소 등록 신청 3개

따라서 운영 133개와 로컬 117개 중 어느 한쪽을 임의로 최신 계약으로 간주하지 않습니다. 배포 대상 백엔드의 canonical 계약을 확인한 뒤 차이를 해소해야 합니다.

## 상태 규칙

| 상태 | 판단 기준 |
| --- | --- |
| `implemented` | route, API module, hook/page가 연결되어 실제 운영 흐름에서 호출할 수 있음 |
| `partial` | canonical 후보 구현은 있으나 legacy 경로 관계 또는 일부 계약 확인이 남음 |
| `missing` | 백엔드 계약은 있지만 프론트 route/API/page 구현이 없음 |
| `blocked` | mutation만 있고 목록·상세 조회 등 안전한 운영에 필요한 선행 계약이 없음 |

제거된 path 또는 schema만 남은 API는 `implemented`로 기록하지 않습니다. path가 사라졌으면 관련 이슈를 연결한 뒤 `missing` 또는 `blocked`로 바꾸고, canonical 대체 경로가 확인된 경우에만 `partial`로 기록합니다.

## 현재 상태

| 상태 | 개수 | 범위 |
| --- | ---: | --- |
| `implemented` | 122 | 실제 관리자 route/API/hook/page 연결 |
| `partial` | 3 | `/admin/place-registration-applications/**` legacy 후보 |
| `missing` | 2 | 감사 로그, 개인정보 처리 이력 (#32) |
| `blocked` | 6 | 광고 2개 (#34), 기간형 이벤트 4개 (#44) |

`/admin/ad`와 `/admin/place-events`는 생성·수정·취소 API만으로 운영 화면을 만들지 않습니다. 목록·상세 GET 계약과 상태 조회 기준이 백엔드에 추가될 때까지 blocked 상태를 유지합니다.

## Swagger 변경 확인 절차

아래 절차는 저장소 루트에서 실행합니다. 임시 파일만 `/tmp`에 만들며 저장소 파일은 자동 변경하지 않습니다.

```bash
curl -s -o /tmp/pingdom-openapi.json http://54.116.166.107:8080/v3/api-docs

jq -r '
  .paths | to_entries[] as $path
  | $path.value | to_entries[]
  | select(.key | IN("get", "post", "put", "patch", "delete"))
  | select(.value.tags // [] | index("Web"))
  | "\(.key | ascii_upcase) \($path.key)"
' /tmp/pingdom-openapi.json | sort > /tmp/swagger-web-operations.txt

tail -n +2 docs/web-api-contract-matrix.csv \
  | awk -F',' '{ gsub(/"/, "", $2); gsub(/"/, "", $3); print $2 " " $3 }' \
  | sort > /tmp/matrix-web-operations.txt

comm -3 /tmp/matrix-web-operations.txt /tmp/swagger-web-operations.txt
```

`comm` 출력이 없으면 method + path 집합이 같습니다. 차이가 있으면 다음 순서로 처리합니다.

1. 추가·변경·제거된 operation의 summary, request schema, success/error response schema를 Swagger에서 확인합니다.
2. canonical/legacy 관계와 backend 선행 계약 여부를 확인합니다.
3. 해당 operation을 담당할 GitHub issue를 연결합니다.
4. 실제 route/API/hook/page 연결 상태에 맞춰 status를 기록합니다.
5. 파괴적 mutation이면 확인 dialog, 사유 입력, 대상 재입력 등 보호 수준을 확인합니다.
6. `last_verified`를 실제 확인일로 갱신합니다.

행 수와 필수 추적값은 다음 명령으로 확인합니다.

```bash
test "$(($(wc -l < docs/web-api-contract-matrix.csv) - 1))" -eq 133
awk -F',' 'NR > 1 && ($8 == "\"\"" || $9 == "\"\"") { print NR }' docs/web-api-contract-matrix.csv
```

두 번째 명령이 아무 행도 출력하지 않아야 합니다.

## PR 기록 규칙

Web API에 영향이 있는 PR은 PR 템플릿에 `METHOD path`를 모두 적습니다. 계약 변경이 없다면 `영향 없음`을 선택합니다. 계약이 바뀌면 매트릭스의 schema, status, issue, canonical 상태, 마지막 확인일을 같은 PR에서 갱신합니다.

파괴 작업은 API 연결만으로 완료 처리하지 않습니다. 사용자에게 영향과 복구 가능성을 보여주고, 작업 위험도에 맞는 명시적 확인 수단이 실제 UI에 있어야 `implemented`로 기록할 수 있습니다.
