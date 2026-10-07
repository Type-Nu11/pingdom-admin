# 릴리스 회귀 검사 기준 (#273)

## 경계와 현재 상태

- 기준: 2026-10-07 develop `fbf1f35` 이후 웹 검사 보강. 업무 구현/API/인증·권한·금액 계산은 변경하지 않는다.
- GitHub Actions 조회 결과는 `Dependabot Updates` 한 개였다. PR #281에는 검증 check가 없었고, 저장소에 체크인된 검증 workflow도 없었다. 외부 서비스의 미공개 CI 존재 여부는 확인하지 못했다.
- `Release verification`은 develop/release의 PR·push 및 수동 실행에서 lint/build/unit/핵심 Chromium 회귀를 실행하는 최소 workflow다. 기본 브랜치는 release이며 배포·시크릿·브랜치 보호를 변경하지 않는다. `pull_request_target`이나 쓰기 권한을 사용하지 않는다. checkout/setup-node v6 태그의 공식 commit SHA를 확인해 고정했다.
- 로컬 검증과 GitHub 실행 결과는 별개다. 최초 로컬 검증 시점에는 커밋·푸시 전이었으며, 이후 PR #282 리뷰에서 확인한 원격 실패 및 로컬 후속 수정은 아래에 구분한다.

## 재현 가능한 준비와 실행

Node.js 24, npm 및 Git이 필요하다. 깨끗한 checkout에서 다음을 실행한다.

```sh
npm ci
npx --no-install playwright install --with-deps chromium
npm run lint
npm run build
npm test
npm run test:release-browser
```

이미 설치된 개발 환경에서는 의존성을 다시 덮어쓰지 않고 동일한 검사 명령을 실행할 수 있다. Linux에서는 Chromium 시스템 라이브러리 설치 권한이 필요하다. Node 버전은 workflow와 맞춘다. 첫 npm/브라우저 설치에는 인터넷 연결이 필요하다.

- 브라우저 검사는 6개 suite를 **순차** 실행한다. 각 suite는 별도 Node 프로세스·동적 로컬 포트·합성 fixture를 사용하며, 사용자 localhost:5173을 사용하거나 종료하지 않는다.
- 기본 로그/JSON summary는 OS 임시 디렉터리에 저장한다. CI는 `PINGDOM_QA_OUTPUT`을 runner 임시 경로로 지정한다. 체크인 대상에 로그·스크린샷·인증 정보를 추가하지 않는다.
- suite당 제한은 180초다. 예외/import 오류/비정상 종료/시간 초과/중단은 실패다. 최초 실패에서 멈추며, 실행하지 않은 뒤 suite를 통과로 표시하지 않는다. 제한·중단 시 해당 자식 프로세스 그룹과 브라우저를 종료한다.
- 각 suite는 성공/실패 시 자체 `finally`에서 브라우저·QA 서버를 닫는다. 로그와 스크린샷은 진단을 위해 임시 경로에 남는다. Actions summary에는 종류와 결과만 기록하며 인증/요청 payload는 포함하지 않는다.

## 검사 범위

| suite | 보호하는 경계 |
| --- | --- |
| detector-probes | 실제 공통 모달·탭·미저장 보호·로그인 버튼 CSS의 정상 동작과 10종 고의 결함 감지 |
| dashboard | 정상/0건/로딩/일부 실패/전체 실패/재시도, 중복 집계 계약, 새로고침 잠금과 바로가기 |
| accessibility | 실제 CSS 48개 조합×3상태 대비, 로그인/방문자 목록·상세·빈 결과·오류, 탭 선택·키보드·패널 연결 |
| reservation-context | 목록→장소→뒤로가기/재로드, 조회 조건·선택 복원, 실패·권한 변경·계정 경계 |
| merchant-safety | 실제 상점주 모달 5종의 지연 요청 중 닫기/입력 잠금·포커스, 실패 후 대상/입력 보존과 재시도 |
| merchant-identity | 실제 Router/MerchantLayout의 매장 식별·중복 조회·키보드·응답 미저장 보호·부분 실패/재조회 |

뒤의 5개 suite는 1920×1080·1366×768·390×844에서 실행한다. detector-probes는 공통 계약의 감지 능력 검사이며 전체 화면 QA로 해석하지 않는다. 기존 다른 브라우저 스크립트를 삭제하거나 이 6개가 모든 화면을 검증한다고 주장하지 않는다. 기존 날짜/금액/조회 상태·입력 보호 테스트는 `npm test` 전체에 포함된다.

## 실패를 숨기지 않는 기준

- 공통 guard는 `console.error/warning`, `pageerror`, HTTP 4xx/5xx, 실패한 네트워크 요청과 금지된 요청을 기록한다. Axios 합성 adapter의 실패도 직접 기록하므로 앱이 예외를 잡아 콘솔에 남기지 않아도 검사한다.
- 요청 진단에는 method/path/status만 남기며 query·토큰·본문은 기록하지 않는다. 허용된 오류도 별도 수집하고 버리지 않는다. 정상 시나리오에는 허용 규칙이 없다.
- API와 외부 네트워크는 브라우저에서 차단한다. 폰트 CSS GET만 빈 CSS로 로컬 응답해 외부 로딩 편차를 제거한다. 폰트 도메인 전체를 일반 통신 허용하지 않는다. 아이콘/서체의 실제 로딩과 픽셀 단위 디자인 동일성 검증은 아니며 스크린샷의 아이콘 글자 fallback을 제품 오류로 분류하지 않는다. fixture 서버는 Vite 개발 config/.env/프록시를 읽지 않는다.
- 대시보드 fixture의 미등록 endpoint/mutation은 실패하며 중복 그룹/후보에 각각 groups/candidates 및 page/limit/total/totalPages/hasNext를 제공한다. 정상/0건 시나리오에서 업무 조회 12/12 성공까지 확인한다.
- 결함 주입은 QA fixture의 조건 또는 브라우저 DOM만 바꾼다. 저장소의 제품 코드를 덮어쓰거나 앱에 오류 숨김을 추가하지 않는다. 지정된 assertion의 실패만 성공적인 감지로 인정하며 import 오류나 timeout은 감지 성공이 아니다. 대시보드에서는 groups/page/limit를 누락시킨 과거 fixture 문제도 별도로 주입해 두 pagination 오류와 guard 실패를 확인한다.

### 의도한 오류의 좁은 허용 목록

| suite/상태 | 허용할 오류 | 반드시 확인하는 UI |
| --- | --- | --- |
| dashboard partial/retry | GET 예약 목록의 `Synthetic query failure` 및 같은 업무의 지정 콘솔 prefix | 실패 표시/이전 결과/재시도 |
| dashboard all-error | 알려진 업무 GET의 위 합성 오류 및 업무 번호 1~12의 지정 콘솔 prefix | 모든 업무 실패, 업무 없음으로 표시하지 않음 |
| accessibility failure | 두 방문자 GET의 500·`합성 조회 실패`, 지정 reports/corrections 콘솔 prefix | 조회 실패 alert |
| reservation-context 실패 주입 구간 | 목록 GET 500 또는 선택 상세 GET 403·`합성 조회 실패`, 각각 지정 콘솔 prefix | 재시도 또는 권한/대상 변경 안내 |
| merchant-safety | 해당 모달의 지정 POST 한 번의 500·`Synthetic failure`, 해당 처리 콘솔 prefix | 대상/입력 유지·닫기 재허용·재시도 성공 |
| merchant-identity fail | 매장 #2 상세 GET의 `Synthetic detail failure` | 실패 보조 ID·재조회 성공 |

경로/메서드/상태가 다르거나 같은 구간의 다른 콘솔·runtime·네트워크 오류는 실패한다. 의도한 HTTP 실패를 전역 허용하지 않는다. 감지 자체를 검증하는 probe의 오류는 해당 assertion이 실패해야 하며 정상 allowlist에 추가하지 않는다.

## QA 종류와 결과 기록

| 종류 | 허용 범위 | 완료 근거 |
| --- | --- | --- |
| 자동·모의 회귀 | 고정 합성 읽기/쓰기, 실제 앱 컴포넌트와 Chromium | 명령/소스 SHA/화면 크기/정상·빈 결과·예상 오류/결과 |
| 실제 읽기 전용 QA | 승인된 계정의 조회·목록/상세/복귀 | 서버 환경/응답 종류/조회 근거, 운영 상태 변경 없음 |
| 변경 QA | 별도 승인된 테스트 대상만 신청·환불·집행 등 실행 | 대상/승인 범위/실제 결과/정리·원복 |
| 실기기·브라우저 QA | 실제 터치/키보드/Safari/Firefox/스크린리더 | 장치/브라우저/기능별 결과 |
| 배포 후 QA | 배포 계획 승인 후 실제 URL/CSP/Worker/로그인 진입 | 배포 SHA/시각/환경/근거 |

기록 형식: `시나리오 | 소스 SHA·서버 환경 | 화면·입력 장치 | 기대 결과 | 실제 근거 | 통과/실패/차단/미수행·후속`.

전체 실환경 QA는 #220·#221을 유지한다. #268의 실제 서버 읽기 전용 왕복, #272의 Chrome 재시작 후 startTime 재발 확인은 이번 모의 검사로 대체하지 않는다. 배포 보류·실기기·권한 변경·모든 통화 사례는 계속 미검증이다.

## 로컬 실행 기록

- Node.js 24.16.0 / 로컬 Chromium, `codex/release-regression-guard`의 미커밋 변경 기준.
- `npm test`: 전체 688개 통과(guard/fixture observer/runner 신규 13개 포함), 실패·skip 없음.
- `npm run lint`, `npm run build`(TypeScript 포함), `git diff --check` 통과.
- `npm run test:release-browser`: 6개 suite 순차 통과. 10종 고의 결함의 지정 assertion 실패와 malformed duplicate fixture의 두 계약 오류 감지를 확인했다. 상점주 5개 처리 모달×3 화면 크기의 지연·실패·재시도 통과.
- 생성된 좁은 화면 선택 모달 스크린샷에서 긴 본문 스크롤과 처리 버튼 노출을 추가 확인했다. 실데이터 mutation은 없다.
- workflow YAML 로컬 파싱 통과, checkout/setup-node SHA와 node24 실행 선언은 공식 저장소 API로 대조했다. 로컬에 actionlint가 없어 해당 도구는 미수행이다. 실제 Ubuntu Actions 설치/실행은 푸시 후 확인해야 한다.
- 실제 서버·계정 전체 QA, 실기기·다른 브라우저·운영 배포 및 외부 CI 존재 확인은 이번 로컬 검사 완료 범위가 아니다.

## PR #282 리뷰 후속 검증

- 원격 HEAD `0eff688`의 Actions run `37616328189`는 job이 시작되기 전에 실패했다. job-level env에서 `runner.temp`를 참조한 것이 원인이며, 로컬 YAML 파싱만으로는 이 컨텍스트 제한을 검증하지 못했다.
- 지적 1: job-level env를 제거하고 준비 step에서 `$RUNNER_TEMP` 기반 출력 경로를 `$GITHUB_ENV`에 기록한다. 이후 브라우저 실행과 summary step이 동일한 경로를 사용한다. 시크릿·권한·트리거·배포 설정은 변경하지 않는다.
- 지적 2: `npm test`에도 Chromium을 실행하는 보안 헤더 검사가 포함되어 있다. 설치되지 않은 별도 브라우저 캐시로 2개 실패를 재현했으며 Chromium 및 시스템 의존성 설치를 `npm test`보다 앞으로 옮겼다.
- 두 지적의 재발을 막는 workflow 회귀 검사 2개를 추가했다. 전체 `npm test` 690개, 보안 헤더/새 workflow 검사 5개, lint·TypeScript/build·diff 검사 통과.
- 공식 actionlint 1.7.12 릴리스의 SHA-256을 확인한 임시 실행 파일로 검사했다. 기존 workflow는 runner 컨텍스트 오류로 실패하고, 후속 수정 workflow는 통과했다. shellcheck는 별도로 실행하지 않았다.
- 제품 코드와 브라우저 suite는 바뀌지 않았다. 수정 직전 리뷰에서 핵심 브라우저 6종을 다시 실행해 모두 통과했다. 위 후속 검증은 로컬 결과이며, 수정된 workflow의 원격 Ubuntu Actions 실행은 푸시 후 별도로 확인해야 한다.
