# 신뢰 점수 이력 페이지 계약 및 검증 (#299)

## 확인 기준

- 2026-10-19 KST 공개 admin Swagger HTTP 200: `GET /admin/trust-score/reporters/{reporterUserId}/history`의 응답은 `AdminTrustScoreChangeHistoryResponse` 객체이며 items/page/limit/total/totalPages/hasNext를 가진다. page 기본 1, limit 기본 20이다.
- 서버 소스 대조 기준: `2b3dbe258d5c80d3f8f753ff28bf281ba89ac43d`. `AdminTrustScoreController`는 `TrustScoreBatchService.listHistory`를 호출한다. 이 메서드는 readOnly이며 page≥1, limit 1~100으로 보정하고 changedAt·id 내림차순 Spring Page를 응답으로 변환한다. API의 최신 응답과 해당 소스 기준을 대조한 것이며 운영 DB 직접 확인이 아니다.
- `AdminTrustScoreChangeHistoryItem.from`은 reason enum의 name과 LocalDateTime changedAt을 반환한다. 이번에는 타임존 의미를 새로 가정하거나 기존 날짜 표시 함수를 변경하지 않았다.

## 변경과 안전 경계

- API 타입을 배열에서 실제 페이지 객체로 변경하고 page/limit를 전송한다. items에는 배열만 저장하고 서버의 건수·page/limit/totalPages/hasNext를 별도로 보존한다. 배열/잘못된 페이지/항목 형식·대상 불일치는 조회 실패로 처리하며 빈 결과로 숨기지 않는다.
- 신고자 조회와 이력 조회를 `useAdminTrustScoreReporter`로 분리했다. 이력 실패만으로 성공한 점수까지 지우지 않는다. 이력 페이지 이동은 점수 조회·평가·재계산을 호출하지 않는다.
- 전체 건수와 서버 페이지를 표시하고 공용 AdminPagination을 사용한다. 최초 로딩·정상 0건·실패·이전 결과를 구분하며, 실패한 요청 페이지를 재시도한다. 실패한 2페이지 대신 이전 1페이지를 최신 결과처럼 표시하지 않는다.
- 마지막 페이지 데이터가 줄어 응답 page가 totalPages를 넘어가면 실제 마지막 페이지를 최대 한 번 다시 조회한다. 임의로 페이지 숫자만 낮추거나 이전 데이터를 해당 페이지 데이터로 꾸미지 않는다.
- 새로운 신고자는 점수·이력·페이지와 평가 선택을 초기화한다. 요청 번호·선택 대상·auth session·계정/역할 소유권으로 응답 역전·계정 전환·언마운트 후 결과를 차단한다. 점수/이력의 401·403은 이전 결과를 숨기고 기존 인증 해제 정책을 유지한다. 일반 조회 실패만 이전의 검증된 결과를 남긴다.
- 점수 재조회 중/실패 후 이전 점수는 표시할 수 있으나 신고자 규칙 평가·일괄 재계산 버튼을 비활성화한다. 이전 신고자의 늦은 평가 결과가 새 신고자를 다시 조회하거나 평가 안내 상세를 복원하지 않는다.
- 이상치·규칙·재계산·평가 API와 기존 대상/사유/중복 제출 확인 흐름은 유지한다. 나머지 이상치/규칙 화면 전체의 비동기 상태 리팩토링까지 완료했다고 주장하지 않는다. 기존 mutation 6종은 합성 요청으로만 회귀 검증했다.

## 검증

- `node --test tests/trust-score-history.test.mjs`: 31개 통과. 첫/중간/마지막/빈 페이지, malformed/구형 배열, 부분 실패·500·401/403·네트워크 오류, 이전 결과 보존, 재시도, 신고자 변경·빠른 응답 역전·늦은 오류, 계정/역할/세션 전환·언마운트, 마지막 페이지 축소, 실제 페이지 렌더링, 기존 mutation 연결 및 늦은 평가 보호. 점수 조회 자체의 403과 재조회 실패 후 이전 점수/행동 차단도 확인한다.
- `npm run test:trust-score-history-browser`: 1920×1080, 1366×768, 390×844 통과. 실제 TrustScorePage·훅·API 함수에 합성 adapter를 연결하여 조회·키보드 페이지 이동·끝 페이지·실패·재시도/지연·정상 빈 결과·403·malformed·계정 변경·401을 검증했다. 가로 넘침 없음과 화면 스크린샷을 확인했다.
- 브라우저는 isolated Vite(.env/proxy 미사용), GET만 허용하는 adapter, 외부/API 네트워크 차단 및 예상 밖 console/HTTP/fixture 오류 검사를 사용한다. 사용자 5173 개발 서버를 재시작하지 않았다.
- `npm test`: 865개 통과, 실패/취소/skip 없음. TypeScript 포함 build, lint 및 diff 공백 검사 통과. 계약표 수정 후 해당 6개 검사도 별도 확인했다.
- 브라우저 명령은 별도로 추가했으며 기본 release browser 실행 목록이나 배포 설정은 변경하지 않았다.

## 남은 검증

흐름 검증 기준: 신고자 조회/페이지 이동 → GET history의 page/limit → 서버의 읽기 전용 페이지 DTO → 웹의 items·전체 건수·페이지 상태 표시다. 웹 요청·응답·화면 상호작용은 합성 브라우저의 PASS와 adapter 요청 기록으로, 서버 DB 읽기·정렬·DTO 구성은 위 소스로 확인했다. 운영 DB/서버 런타임 로그까지 실행 검증한 것은 아니다. 검증 서버는 .env/proxy 없이 기동·종료됐으며 예기치 않은 브라우저·HTTP·fixture 오류는 없었다.

- 인증된 실제 관리자 이력 조회, 운영 상태 변경 및 배포 QA는 수행하지 않았다. 운영 점수/제한/규칙/이상치를 바꾸거나 실제 평가·재계산 요청을 보내지 않았다. 합성 성공을 실서버 mutation 성공으로 해석하지 않는다.
- 원본 OpenAPI 전체 스냅샷·잔여 계약 정합성은 #302에서 갱신한다. 이번 계약표는 점수/이력 조회 2개 행의 호출부와 검사 근거만 갱신했다.
- Docker·전체 release browser suite·Safari/Firefox·실기기 터치·스크린리더는 미수행이다. 외부 폰트 CSS를 빈 응답으로 처리하므로 스크린샷은 운영 폰트/아이콘 픽셀 검증이 아니다.
