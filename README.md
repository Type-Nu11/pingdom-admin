<img width="7680" height="4320" alt="image" src="https://github.com/user-attachments/assets/1de387e0-c1fa-4797-a864-2e48f4ec1dcc" />


---

## Overview

이 저장소는 Pingdom 프로젝트의 **관리자 웹 애플리케이션**을 관리합니다.

운영자가 Pingdom 서비스의 장소, 게시글, 신고, 사용자 제재, 장소 중복 데이터를 확인하고 관리할 수 있는 관리자 전용 웹 화면을 제공합니다.  
프론트엔드 화면 구현뿐만 아니라 관리자 API 연동, 인증 상태 관리, Kakao Maps 기반 장소 시각화, 운영 데이터 조회 흐름을 담당합니다.

## Project Status

현재 **SNAPSHOT 개발 단계**입니다.

프로젝트 요구사항을 검증하고 있으며, 안정화 이전까지 기능, 구성, 인터페이스 및 제공 결과가 예고 없이 변경될 수 있습니다.

| Item | Status |
|---|---|
| Development | `In Progress` |
| Release | `SNAPSHOT` |
| Stability | `Experimental` |

## Repository Role

| Item | Description |
|---|---|
| Type | `Admin` |
| Responsibility | Pingdom 관리자 화면, 인증 흐름, 운영 기능 UI 및 API 연동 |
| Primary Output | 관리자 웹 애플리케이션 |
| Target | Pingdom 서비스 운영자 및 관리자 |

## Scope

### Included

- 관리자 로그인, 보호 라우팅, JWT 기반 인증 상태 관리
- 장소, 게시글, 신고, 사용자 제재, 장소 중복 관리 화면
- Kakao Maps 기반 장소 목록 시각화 및 마커 상호작용
- 관리자 API 연동, 목록 조회, 검색, 정렬, 페이지네이션 처리

### Not Included

- 일반 사용자용 모바일/웹 애플리케이션
- 백엔드 API 서버 및 데이터베이스 구현
- 추천 알고리즘, 신고 정책, 제재 정책의 서버 측 핵심 로직
- 운영 인프라, 배포 파이프라인, 모니터링 시스템 구성

## Key Capabilities

- **관리자 인증**: 로그인, 로그아웃, 보호 라우팅, access token 자동 재발급을 처리합니다.
- **대시보드 조회**: 관리자 홈에서 주요 운영 현황과 최근 활동 정보를 확인합니다.
- **장소 관리**: 장소 목록 조회, 검색, 정렬, 상세 조회, 삭제, Kakao Maps 위치 확인을 제공합니다.
- **게시글 및 신고 관리**: 게시글 목록, 상세 정보, 신고 이력, 삭제 및 신고 처리 흐름을 제공합니다.
- **사용자 제재 관리**: 사용자 검색, 제재 등록, 제재 해제, 제재 이력 조회를 지원합니다.
- **장소 중복 관리**: 중복 장소 후보 확인, 병합 영향 조회, 장소 병합 처리를 지원합니다.

## Technology and Tools

| Category | Technology |
|---|---|
| Primary | TypeScript, React |
| Framework | Vite, React Router |
| Styling | styled-components |
| API | Axios |
| Map | Kakao Maps JavaScript SDK |
| Build | npm, Vite |
| Quality | ESLint, TypeScript |
| Delivery | 정적 웹 애플리케이션 빌드 결과물 |

## Getting Started

이 저장소를 확인하거나 실행하기 위해 필요한 최소 절차입니다.

### Requirements

- Node.js
- npm
- 관리자 API 서버 접근 권한
- Kakao Maps JavaScript API Key

### Setup

```bash
git clone https://github.com/Type-Nu11/PingDom_Admin_Web.git
cd PingDom_Admin_Web
npm install

Usage
npm run dev
기본 개발 서버는 Vite 설정에 따라 5173 포트를 사용합니다.
Configuration
설정에 필요한 환경 변수는 .env 파일에 구성합니다.
VITE_API_BASE_URL=
VITE_KAKAO_MAP_APP_KEY=
실제 인증정보, API Key, 비밀 값 및 운영 환경 정보는 저장소에 커밋하지 않습니다.
Verification
저장소 변경사항은 다음 방법으로 검증합니다.
Verification	Purpose
npm run lint	ESLint 기반 코드 검사
npm run build	TypeScript 타입 검사 및 프로덕션 빌드 검증
npm run preview	빌드 결과물 로컬 미리보기


Repository Structure
.
├── public             # 정적 리소스 및 로고
├── src
│   ├── api            # 관리자 API 요청 모듈
│   ├── app            # 전역 Provider 및 Router 구성
│   ├── assets         # 마커 등 화면 리소스
│   ├── components     # 공통 컴포넌트와 지도 컴포넌트
│   ├── constants      # 인증, 레이아웃 등 상수
│   ├── hooks          # 관리자 기능별 상태 및 API 연동 로직
│   ├── pages          # 로그인, 대시보드, 장소, 게시글, 제재 화면
│   ├── styles         # 전역 스타일과 테마
│   ├── types          # API 응답 및 도메인 타입
│   └── utils          # 인증 저장소, 디버그, 카테고리 유틸
├── index.html
├── vite.config.ts
├── eslint.config.js
├── tsconfig.json
└── README.md
Release and Compatibility
현재 버전은 안정화 이전의 SNAPSHOT 버전입니다.
정식 버전과의 호환성을 보장하지 않습니다.
변경사항은 저장소의 Release 또는 변경 이력을 기준으로 확인합니다.
안정화 이후 별도의 버전 정책을 적용할 예정입니다.
```

<div align="center">

Part of Pingdom
</div>
