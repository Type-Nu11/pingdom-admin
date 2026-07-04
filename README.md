# Pingdum Admin Web

## 소개

Pingdum Admin Web은 지도 기반 위치 서비스의 관리자용 웹 애플리케이션입니다.
관리자는 지도 위에 축제, 광고, 이벤트를 등록하고 위치 기반 콘텐츠를 관리할 수 있습니다.

---

## 주요 기능

* 지도 기반 이벤트 및 광고 등록
* 좌표 클릭을 통한 아이콘 배치
* 축제 및 프로모션 관리
* (확장 예정) 데이터 기반 대시보드

---

## 프로젝트 구조

```bash
src/
├── app/        # 전역 설정 (router, provider)
├── features/   # 기능 단위 (auth, event, map, dashboard)
├── shared/     # 공통 컴포넌트 및 유틸
├── services/   # API
├── types/      # 전역 타입
├── assets/     # 이미지
└── styles/     # 테마
```

---

## 아키텍처 원칙

### 데이터 흐름

모든 데이터는 아래 흐름을 따릅니다.

```
Screen → Hook → API → Server
```

* Screen에서 API 직접 호출 금지
* Component에 비즈니스 로직 작성 금지
* 데이터 처리는 Hook에서만 수행

---

### 상태 관리

* 전역 상태는 최소한으로 유지합니다
* 서버 데이터는 상태로 저장하지 않습니다

---

## 브랜치 전략

* main: 배포용 (직접 push 금지)
* develop: 통합 개발
* feature/<기능명>: 기능 개발

---

## 커밋 규칙

형식:

```
타입: 내용
```

예시:

```
Feat: 이벤트 등록 기능 추가
Fix: 로그인 오류 수정
Refactor: map hook 구조 개선
```

---

## 협업 규칙

* main 브랜치 직접 push 금지
* feature 브랜치에서 작업 후 PR 생성
* 최소 1명 리뷰 후 merge
* 공통 코드 수정 시 사전 공유

---

## 한 줄 정의

Pingdum Admin Web은
지도 기반 콘텐츠를 관리하는 관리자 도구입니다.
