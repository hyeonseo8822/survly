# Survly 프로젝트 문서

## 1. 프로젝트 개요
- **Survly**는 설문 생성, 응답, 결과 공유, 북마크, 팔로우, 댓글 등 다양한 기능을 제공하는 설문 플랫폼입니다.
- React(Vite) 프론트엔드와 Node.js(Express) + MongoDB 백엔드로 구성되어 있습니다.

## 2. 기술 스택
- **Frontend:** React 19, Vite, React Router, Recharts
- **Backend:** Node.js, Express 5, Mongoose 9, MongoDB Atlas
- **기타:** JWT 인증, bcrypt, multer(파일 업로드), dotenv, cors

## 3. 주요 기능 및 API 명세

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

### 마이페이지/팔로우/북마크
- `GET /api/me` : 내 프로필
- `GET /api/me/surveys` : 내가 만든 설문
- `GET /api/me/responded-surveys` : 내가 참여한 설문
- `GET /api/me/bookmark-lists` : 내 북마크 목록
- `GET /api/me/comments` : 내가 쓴 댓글
- `POST /api/users/:userId/follow` : 팔로우
- `DELETE /api/users/:userId/follow` : 언팔로우

## 4. DB 구조 (주요 컬렉션)

### User
- email, password, userId, displayName, headline, bio, avatarUrl, followerCount, followingCount

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
