# Survly 프로젝트 문서

## 1. 프로젝트 개요
- **Survly**는 설문 생성, 응답, 결과 공유, 북마크, follow, 댓글 등 다양한 기능을 제공하는 설문 플랫폼입니다.
- React(Vite) 프론트엔드와 Node.js(Express) + MongoDB 백엔드로 구성되어 있습니다.

## 2. 기술 스택
## 2. 기술 스택 (Skills / Tech Stack)

아래는 이 프로젝트에서 사용한 주요 기술을 카테고리별로 정리한 목록입니다. 로고를 추가하고 싶으면 Shields/이미지 배지를 함께 넣어도 좋습니다.

- **Frontend:** React 19, Vite, React Router, Recharts
- **Backend:** Node.js, Express 5, Mongoose 9
- **Database:** MongoDB Atlas (Managed MongoDB)
- **Authentication / Security:** JWT, bcrypt, helmet, cors
- **File Upload / Storage:** multer (로컬 개발), AWS S3 (프로덕션 파일 스토리지 연계)
- **DevOps & Cloud (예시):** AWS — EC2 (Docker 기반 앱 호스팅), S3 (정적/업로드 파일 분리), CloudFront (CDN), Route53 (도메인), CloudWatch (로그/모니터링)
- **Infrastructure Tools:** Docker (컨테이너화), nginx (리버스 프록시)
- **환경관리/유틸:** dotenv, ESLint

## 3. 프로젝트 상세 설명 (Projects)

**Survly (설문 플랫폼)** — 개인/팀용 설문 생성·응답·공유 서비스

- **핵심 기술 스택:** React (Vite) + Node.js(Express) + MongoDB Atlas

- **Cloud / 운영(How & Why & Result):**
	- **AWS EC2 (Docker 기반)**: 애플리케이션 런타임을 컨테이너화하여 배포의 일관성을 확보했습니다. EC2 위에 Docker 이미지를 배포함으로써 환경 차이로 인한 버그를 줄였고, 필요 시 인스턴스 교체로 롤링 업데이트가 용이해졌습니다.
		- 이유: 빠른 배포와 운영 제어가 필요했고, CI 빌드 결과를 컨테이너로 운영 환경에 바로 반영하기 위해 선택했습니다.
		- 결과: 배포 반복 비용과 환경 이슈가 감소하고, 배포 파이프라인 단순화에 기여했습니다.

	- **AWS S3 (파일 스토리지)**: 사용자 업로드 이미지와 설문 관련 정적 자산을 S3에 저장하여 애플리케이션 서버의 디스크 사용을 분리했습니다.
		- 이유: 파일을 로컬에 보관하면 서버 확장/교체 시 데이터 마이그레이션이 필요하므로, 내구성·확장성이 뛰어난 S3를 사용했습니다.
		- 결과: 서버 스토리지 부담이 크게 줄었고, 업로드 파일 제공을 CloudFront와 연계하면 응답 지연과 트래픽 비용을 더 줄일 수 있습니다.

	- **MongoDB Atlas (Managed DB)**: 문서 기반 데이터 모델(설문 구조, 동적 질문/옵션)이 잘 맞아 Atlas를 사용했습니다.
		- 이유: 관리형 DB의 자동 백업·복제·모니터링 기능을 활용하여 운영 부담을 줄이고, 스키마 변경이 잦은 도메인에 유연하게 대응하기 위해 선택했습니다.
		- 결과: 운영 안정성이 확보되었고, 데이터 백업/복구와 복제 구성이 쉬워 운영 리스크가 낮아졌습니다.

	- **모니터링 & 로깅:** AWS CloudWatch(또는 Elastic Stack)를 통해 애플리케이션 로그와 메트릭을 수집하고, 주요 에러/성능 이상 시 알림을 설정했습니다.

	- **인증/보안:** JWT 토큰 기반 인증으로 API 접근을 제어하고, 업로드 파일의 접근 정책은 S3 정책(또는 프록시)을 통해 제한합니다.

- **구현상 주요 포인트 (Problem → Solution):**
	- **이미지 업로드 처리 문제:** 서버 로컬에 파일을 저장하면 확장성이 떨어짐 → S3 연동으로 파일 분리, 업로드 실패 대비 재시도 로직 추가
	- **설문 구조 동적 변경 문제:** 질문/옵션 구조가 자주 바뀌어 응답 정합성 위험 → 명확한 트랜잭션(또는 Mongoose session)을 도입하여 구조 변경 시 데이터 일관성 확보
	- **대용량 트래픽 대응:** 정적 자산을 CloudFront로 캐싱하고, API는 오토스케일링 가능한 인스턴스로 분리하여 트래픽 급증에 대응

위 설명은 `survly`를 운영하면서 실제로 적용하거나 적용할 수 있는 아키텍처/운영 패턴을 프로젝트 관점에서 정리한 것입니다. 필요하시면 배포 스크립트(예: `Dockerfile`, `deploy.sh`, GitHub Actions 워크플로`) 예시도 작성해 드리겠습니다.

## 4. 주요 기능 및 API 명세

### 인증/회원
- `POST /api/auth/register` : 회원가입 (email, password, userId, username)
- `POST /api/auth/login` : 로그인 (userId, password)
- `GET /api/auth/check-userid` : 아이디 중복 확인

### 설문
- `GET /api/surveys` : 설문 목록 조회 (검색, 정렬, 페이징)
- `POST /api/surveys` : 설문 생성 (JWT 필요, 이미지 업로드 지원)
- `GET /api/surveys/:surveyId` : 설문 상세 조회
- `PUT /api/surveys/:surveyId` : 설문 수정 (JWT 필요)
- `DELETE /api/surveys/:surveyId` : 설문 삭제 (JWT 필요)
- `POST /api/surveys/:surveyId/responses` : 설문 응답 제출 (JWT 필요)
- `GET /api/surveys/:surveyId/results` : 설문 결과 조회 (공개/참여자/작성자만)
- `GET /api/surveys/:surveyId/comments` : 설문 댓글 목록
- `POST /api/surveys/:surveyId/comments` : 설문 댓글 작성 (참여자만)
- `GET /api/surveys/:surveyId/bookmark-status` : 북마크 여부
- `POST /api/surveys/:surveyId/bookmark` : 북마크 추가
- `DELETE /api/surveys/:surveyId/bookmark` : 북마크 해제

### 마이페이지/follow/북마크
- `GET /api/me` : 내 프로필
- `GET /api/me/surveys` : 내가 만든 설문
- `GET /api/me/responded-surveys` : 내가 참여한 설문
- `GET /api/me/bookmark-lists` : 내 북마크 목록
- `GET /api/me/comments` : 내가 쓴 댓글
- `POST /api/users/:userId/follow` : follow
- `DELETE /api/users/:userId/follow` : unfollow

## 4. DB 구조 (주요 컬렉션)

### User
- email, password, userId, displayName, avatarUrl, followerCount, followingCount

### Survey
- title, description, embedUrl, isPublic, responseTabPublic, userId, link, img, participantCount

### Question
- surveyId, type, question, isRequired

### Option
- questionId, optionText

### Response
- surveyId, questionId, answer, userId

### Comment
- surveyId, userId, parentCommentId, content

### BookmarkList
- userId, name

### SurveyBookmark
- userId, surveyId, listId

### Follow
- followerId, followingId

## 5. 설계/구현의 어려움 및 해결 방법
- **동시성 문제:** 설문/응답/댓글/북마크 등 트랜잭션이 필요한 부분은 mongoose session을 활용해 데이터 정합성을 보장.
- **설문 구조 동적 변경:** 설문 수정 시 질문/옵션 구조가 바뀌면 기존 응답/옵션/질문을 삭제 후 재생성하여 일관성 유지.
- **권한 관리:** JWT 기반 인증, 참여자/작성자/공개 여부에 따라 설문 결과/댓글 접근 제어.
- **이미지 업로드:** multer로 파일 업로드 처리, 업로드 경로를 정적으로 제공.
- **검색/정렬/페이징:** aggregate, 정규식, 정렬, skip/limit 등 MongoDB 기능 적극 활용.
- **API 일관성:** 모든 API는 success, message, error 필드로 응답, 예외 상황에 명확한 메시지 제공.

## 6. 환경 변수 예시 (.env)
```
MONGODB_URI=your_mongodb_uri
MONGODB_DB_NAME=survly
JWT_SECRET=your_jwt_secret
PORT=5000
```

---
자세한 API 파라미터/응답 예시는 각 컨트롤러 참고.
