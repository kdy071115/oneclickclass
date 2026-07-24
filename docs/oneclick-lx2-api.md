# OneClick applicant API contract for LX2

원클릭 신청자 화면은 LX2의 기존 `cs_course_active`, `cs_course_apply`, `member`, 일부 강의실 데이터를 아래 JSON 계약으로 받아 사용한다.
모든 원클릭 기능을 LX2 안에 넣는 것이 목적은 아니다. LX2는 회원, 과정, 수강신청, 진도 같은 핵심 데이터의 기준으로 두고, 원클릭 전용 신청 UX와 상태 화면은 얇은 JSON 래퍼와 프론트 도메인 모델에서 관리한다.

기존 LX2 `.do` 컨트롤러를 직접 노출하기보다 이 계약으로 감싸면 프론트 변경 없이 빠르게 연결할 수 있다.

## Environment

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_USE_MOCK=false
VITE_API_WITH_CREDENTIALS=true
```

## Frontend structure

신청자 전용 프론트 구조는 아래처럼 분리한다.

```text
src/api/client.ts
  공통 axios 인스턴스, LX2 세션 쿠키 옵션

src/api/oneclick.ts
  신청자 도메인 타입
  LX2/래퍼 응답 정규화
  mock fallback
  oneclickService

src/pages/PreviewPage.tsx
  /s/:shareToken 신청 페이지
  /learn/:courseActiveSeq 수강실
```

화면은 LX2 원본 VO 이름을 직접 알지 않는다. 백엔드 래퍼가 기존 LX2 데이터를 내려주면 `src/api/oneclick.ts`에서 `OneClickShare`, `OneClickEnrollment`, `OneClickLearnRoom`으로 정규화한다.

## LX2 backend wrapper responsibility

기존 LX2 컨트롤러는 대부분 `.do` + JSP/세션 흐름이므로 원클릭 신청자 화면에는 얇은 JSON 래퍼를 추가한다.
래퍼는 기존 LX2 기능을 전부 새로 만들지 않고, 원클릭 화면에 필요한 상태와 식별자만 안정적으로 반환한다.

래퍼에서 담당할 일:

- `shareToken`으로 `courseActiveSeq`를 찾는다.
- 이름/휴대전화로 내부 회원을 조회하거나 생성한다.
- `cs_course_apply` 수강신청을 생성하거나 기존 신청을 조회한다.
- 신청/결제 완료 후 LX2 세션 또는 별도 원클릭 세션 쿠키를 발급한다.
- 강의실 진입 시 신청 권한과 진도 데이터를 확인한다.
- LCMS 진도 저장은 기존 학습 이력 서비스로 연결한다.

래퍼에 넣지 않을 것:

- LX2의 전체 강의실 메뉴 재구현
- 과제, 토론, 수료증, 상세 평가표의 1차 MVP 강제 포함
- 동시 재생 제한, 기기 관리, 이상 접근 탐지의 초기 구현
- 기존 LX2 화면을 원클릭 화면에 그대로 노출하는 방식

프론트에서 기대하는 인증 방식:

```text
첫 접속: /s/{shareToken}
신청 완료: /learn/{courseActiveSeq}
이후 인증: HttpOnly 세션 쿠키
다른 기기: 휴대전화 확인 후 새 세션 쿠키 발급
```

## Endpoints

상태 전이, 좌석, 결제 멱등성, 수강권 회수, 완료 기준은 [`ONECLICK_STATE_POLICY.md`](./ONECLICK_STATE_POLICY.md)를 따른다. `APPLY_STATUS`는 LX2 호환 코드이며 원클릭 응답은 신청·결제·수강권 상태와 서버 계산 접근값을 함께 반환한다.

### 공통 차시 콘텐츠 모델

프론트는 강의자 커리큘럼과 수강생 강의실에서 같은 차시 모델을 사용한다. 백엔드는 LX2의 과정 차시, 콘텐츠, 자료 파일, 마커 정보를 아래 형태로 감싸서 내려준다.

```json
{
  "lessonId": "38",
  "sectionId": "410",
  "sectionTitle": "1주차",
  "organizationSeq": "410",
  "itemSeq": "411",
  "activeElementSeq": "38",
  "contentsSeq": "205",
  "title": "업무 구조 잡기",
  "description": "흩어진 업무를 수강생 상황에 맞게 정리합니다.",
  "contentType": "video",
  "contentUrl": "https://cdn.example.com/course/38/master.m3u8",
  "durationMinutes": 42,
  "durationText": "42분",
  "preview": false,
  "published": true,
  "required": true,
  "sequential": false,
  "markers": [],
  "resources": []
}
```

`contentType`은 프론트 내부 값 기준으로 `video`, `live`, `document`, `assignment`를 사용한다. LX2 코드값을 그대로 노출해야 한다면 wrapper에서 이 값으로 변환한다.

차시별 학습 자료는 `contentType=document`와 `resources` 배열을 사용한다. PDF, Office 문서, 이미지, ZIP 등 다운로드·새 창 열람이 가능한 파일을 여러 개 포함할 수 있다.

```json
{
  "lessonId": "52",
  "sectionId": "410",
  "sectionTitle": "1주차",
  "title": "실습 자료 내려받기",
  "description": "강의 전에 예제 파일과 체크리스트를 확인해 주세요.",
  "contentType": "document",
  "contentUrl": "",
  "durationMinutes": 10,
  "durationText": "10분",
  "preview": false,
  "published": true,
  "required": true,
  "sequential": false,
  "resources": [
    {
      "id": "file-901",
      "name": "업무 구조 체크리스트.pdf",
      "url": "https://cdn.example.com/resources/file-901.pdf",
      "type": "application/pdf",
      "size": 248120
    },
    {
      "id": "file-902",
      "name": "실습 예제.zip",
      "url": "https://cdn.example.com/resources/file-902.zip",
      "type": "application/zip",
      "size": 1053182
    }
  ]
}
```

자료 차시는 `contentUrl`이 없어도 `resources`가 1개 이상이면 공개 가능한 차시로 본다. 수강생이 자료 링크를 열면 프론트는 `heartbeat`를 한 번 전송해 해당 차시를 완료 처리하도록 요청한다. 서버는 자료 차시의 완료 기준을 `completionReason=MANUAL` 또는 `DOCUMENT_OPENED` 같은 서버 내부 값으로 저장해도 되지만, 원클릭 응답에는 기존 `completed`, `progress`, `completedAt`을 일관되게 반환한다.

프론트 정규화는 백엔드 응답에서 `resources`, `resourceList`, `fileList`, `attachments` 필드를 차시 자료 파일로 인식한다. 그래도 신규 백엔드는 `resources`를 표준으로 사용한다.

### `POST /classes/{classId}/publish`

강의 공개 상태를 저장하고 신청 페이지용 비예측 `shareToken`을 발급한다. 같은 강의를 다시 공개할 때는 활성 토큰을 재사용하거나 기존 토큰을 폐기한 뒤 새 토큰을 반환한다.

```json
{
  "shareToken": "7KpX92Lm"
}
```

### `GET /oneclick/shares/{shareToken}`

공유 토큰으로 신청 페이지 정보를 조회한다.

LX2 매핑 기준:

- `courseActiveSeq`: `UICourseActiveVO.courseActiveSeq`
- `courseMasterSeq`: `UICourseActiveVO.courseMasterSeq`
- `title`: `courseActiveTitle`
- `summary`: 과정 요약 또는 메타데이터
- `description`: 과정 소개 또는 메타데이터
- `capacity`: 모집 정원
- `confirmedCount`: 좌석이 확정된 인원
- `heldCount`: 아직 만료되지 않은 결제 임시 점유 인원
- `remainingSeats`: 서버가 계산한 신청 가능 좌석
- `courseLifecycleStatus`: 강의 진행 상태
- `recruitmentStatus`: `PRIVATE`, `OPEN`, `CLOSED`, `FULL`
- `paymentType`: `FREE` 또는 `PAID`

권장 응답:

```json
{
  "shareToken": "7KpX92Lm",
  "courseActiveSeq": "104",
  "courseMasterSeq": "notion-master",
  "title": "노션으로 시작하는 업무 자동화",
  "summary": "반복 업무를 자동화하는 실전 4주 과정",
  "description": "과정 소개",
  "price": 45000,
  "capacity": 30,
  "enrolled": 12,
  "confirmedCount": 12,
  "heldCount": 0,
  "remainingSeats": 18,
  "applyStatus": "OPEN",
  "courseLifecycleStatus": "READY",
  "recruitmentStatus": "OPEN",
  "paymentType": "PAID",
  "instructorName": "이지훈",
  "scheduleText": "자유 수강",
  "locationText": "온라인 강의실",
  "difficulty": "초급",
  "highlights": ["업무 흐름을 기준으로 데이터베이스를 설계해요."],
  "curriculum": [
    {
      "lessonId": "38",
      "contentType": "VIDEO",
      "provider": "DIRECT",
      "title": "업무 구조 잡기",
      "description": "흩어진 업무를 수강생 상황에 맞게 정리합니다.",
      "durationText": "42분",
      "resources": []
    }
  ]
}
```

공개 신청 페이지의 커리큘럼은 수강 전 안내용이므로 `contentUrl`은 내려주지 않아도 된다. 무료 미리보기 차시를 지원할 경우에만 `preview=true`와 미리보기 가능한 콘텐츠 정보를 함께 반환한다. 자료 차시는 파일명 정도는 노출 가능하지만, 유료/비공개 자료 URL은 수강실 응답에서만 내려준다.

### 강의자 커리큘럼 API

강의자 커리큘럼 화면은 아래 API를 호출한다. 백엔드는 응답을 항상 전체 `CurriculumSection[]`으로 반환하면 프론트가 별도 병합 로직 없이 바로 화면을 갱신한다.

```text
GET    /classes/{classId}/curriculum
POST   /classes/{classId}/curriculum/sections
PATCH  /classes/{classId}/curriculum/sections/{sectionId}
DELETE /classes/{classId}/curriculum/sections/{sectionId}
POST   /classes/{classId}/curriculum/lessons
PATCH  /classes/{classId}/curriculum/lessons/{lessonId}
DELETE /classes/{classId}/curriculum/lessons/{lessonId}
PUT    /classes/{classId}/curriculum/order
```

섹션 응답:

```json
[
  {
    "id": "section-410",
    "title": "1주차",
    "lessons": [
      {
        "id": "lesson-38",
        "organizationSeq": "410",
        "itemSeq": "411",
        "activeElementSeq": "38",
        "contentsSeq": "205",
        "title": "업무 구조 잡기",
        "description": "흩어진 업무를 정리합니다.",
        "contentType": "video",
        "contentUrl": "https://www.youtube.com/watch?v=M7lc1UVf-VE",
        "durationMinutes": 42,
        "preview": false,
        "published": true,
        "required": true,
        "sequential": false,
        "markers": [],
        "resources": []
      }
    ]
  }
]
```

차시 생성 요청은 `sectionId`와 차시 필드를 함께 보낸다.

```json
{
  "sectionId": "section-410",
  "title": "실습 자료 내려받기",
  "description": "예제 파일을 확인해 주세요.",
  "contentType": "document",
  "contentUrl": "",
  "durationMinutes": 10,
  "preview": false,
  "published": true,
  "required": true,
  "sequential": false,
  "markers": [],
  "resources": [
    {
      "id": "file-901",
      "name": "업무 구조 체크리스트.pdf",
      "url": "https://cdn.example.com/resources/file-901.pdf",
      "type": "application/pdf",
      "size": 248120
    }
  ]
}
```

백엔드는 `published=true` 저장 시 서버에서도 콘텐츠 유효성을 재검증한다.

- `video`: `contentUrl` 필수. YouTube, Vimeo, 직접 MP4/HLS 등 허용 정책을 서버에서 검증한다.
- `live`: `contentUrl` 필수.
- `document`: `contentUrl` 또는 `resources` 1개 이상 필요.
- `assignment`: `contentUrl` 필수 또는 추후 과제 본문 모델이 생기면 본문 필수.

### 파일 업로드 API

강의자 화면은 썸네일/마커 이미지와 학습 자료 파일 업로드를 분리해서 호출한다.

```text
POST /classes/images
POST /classes/files
```

둘 다 `multipart/form-data`로 `file` 필드를 보낸다.

자료 파일 업로드 권장 응답:

```json
{
  "id": "file-901",
  "name": "업무 구조 체크리스트.pdf",
  "url": "https://cdn.example.com/resources/file-901.pdf",
  "type": "application/pdf",
  "size": 248120
}
```

현재 프론트는 최소 `{ "url": "..." }`만 있어도 동작하지만, `name`, `type`, `size`를 내려주면 강의자 편집 화면과 수강생 자료 화면에 그대로 표시한다. 파일 접근 권한이 필요한 경우 `url`은 공개 URL이 아니라 인증 쿠키로 접근 가능한 다운로드 URL이어야 한다.

### `POST /oneclick/shares/{shareToken}/apply`

이름, 휴대전화 번호, 선택 이메일로 내부 회원과 수강신청을 생성한다.

요청:

```json
{
  "name": "홍길동",
  "phone": "010-1234-5678",
  "email": "user@example.com",
  "privacyConsent": true,
  "paymentConsent": true
}
```

응답은 수강실 진입에 필요한 `courseActiveSeq`, `courseApplySeq`, `memberSeq`를 포함한다.
신청 후 프론트는 바로 강의실로 보내지 않고 서버의 `applicationStatus`, `paymentStatus`, `enrollmentStatus`, `canLearn`, `accessReason`을 기준으로 완료 화면을 먼저 보여준다. `applyStatusCd`는 LX2 호환 표시값이다.
유료가 아닌 강의에서는 `paymentConsent`를 생략할 수 있다.

권장 응답:

```json
{
  "memberSeq": "501",
  "courseApplySeq": "8301",
  "courseActiveSeq": "104",
  "courseMasterSeq": "72",
  "learnerName": "홍길동",
  "applyStatusCd": "APPLY_STATUS::002",
  "applicationStatus": "APPROVED",
  "paymentStatus": "PAID",
  "enrollmentStatus": "AVAILABLE",
  "canLearn": true,
  "accessReason": "AVAILABLE",
  "progress": 0,
  "lastPosition": "1-1차시 0분 0초",
  "resumeLessonId": "38"
}
```

상태별 프론트 동작은 `accessReason`을 우선 사용한다.

```text
APPLY_STATUS::002
  수강 가능, 강의실 입장 버튼 노출

APPLY_STATUS::004
  결제 대기, 결제하기 버튼 노출, 결제 완료 후 상태 재조회

APPLY_STATUS::001
  승인 대기, 상태 다시 확인 버튼 노출
```

위 코드는 구버전 LX2 응답 호환용이다. 신규 프론트 분기는 아래 값을 사용한다.

```text
AVAILABLE          강의실 입장
AWAITING_APPROVAL  승인 대기
AWAITING_PAYMENT   결제 진행
PAYMENT_FAILED     결제 재시도
REJECTED           승인 거절
CANCELLED          신청 취소
REFUNDED           환불 완료, 수강권 회수
SUSPENDED          관리자 정지
```

상태 다시 확인은 화면 새로고침이 아니라 `GET /oneclick/learn/{courseActiveSeq}` 재호출로 처리한다.

### 결제 주문과 콜백

```text
POST /oneclick/applications/{courseApplySeq}/payment-orders
POST /oneclick/payments/callback
POST /oneclick/applications/{courseApplySeq}/refunds
```

결제 주문 생성 시 서버가 주문 금액을 결정하고 좌석을 15분 임시 점유한다. 콜백은 PG 서명, 서버 주문 금액, 거래 ID를 검증한다.

```json
{
  "paymentOrderId": "ORDER-20260723-0001",
  "amount": 45000,
  "seatStatus": "HELD",
  "seatHoldExpiresAt": "2026-07-23T11:15:00+09:00"
}
```

`paymentOrderId`, `pgTransactionId`, `idempotencyKey`에는 유니크 제약을 둔다. 콜백에서 결제 원장 저장, 좌석 확정, 수강권 활성화, 알림·정산 이벤트 생성을 원자적이고 멱등하게 처리한다.

### `GET /oneclick/learn/{courseActiveSeq}/room`

신청자의 수강실 데이터를 조회한다. LX2의 `UICourseClassroomController`에서 쓰는 강의실 상세, 주차 목록, 게시판 카운트, 평가 항목을 이 응답으로 합친다.

권장 응답:

```json
{
  "memberSeq": "501",
  "courseApplySeq": "8301",
  "courseActiveSeq": "104",
  "learnerName": "홍길동",
  "applyStatusCd": "APPLY_STATUS::002",
  "applicationStatus": "APPROVED",
  "paymentStatus": "PAID",
  "enrollmentStatus": "AVAILABLE",
  "canLearn": true,
  "accessReason": "AVAILABLE",
  "progress": 62,
  "lastPosition": "2-1차시 14분 27초",
  "resumeLessonId": "52",
  "courseTitle": "노션으로 시작하는 업무 자동화",
  "courseSummary": "반복 업무를 자동화하는 실전 4주 과정",
  "lessons": [
    {
      "lessonId": "38",
      "organizationSeq": "410",
      "itemSeq": "411",
      "activeElementSeq": "38",
      "contentsSeq": "205",
      "title": "업무 구조 잡기",
      "description": "흩어진 업무를 수강생 상황에 맞게 정리합니다.",
      "durationText": "42분",
      "progress": 100,
      "progressPercent": 100,
      "locked": false,
      "completed": true,
      "completedAt": "2026-07-23T10:30:00+09:00",
      "completionReason": "WATCH_THRESHOLD",
      "playable": true,
      "currentSeconds": 2520,
      "durationSeconds": 2700,
      "contentUrl": "https://cdn.example.com/course/38/master.m3u8",
      "contentProvider": "FILE",
      "resources": []
    },
    {
      "lessonId": "52",
      "sectionId": "410",
      "sectionTitle": "1주차",
      "title": "실습 자료 내려받기",
      "description": "예제 파일과 체크리스트를 확인해 주세요.",
      "durationText": "10분",
      "progress": 0,
      "progressPercent": 0,
      "locked": false,
      "completed": false,
      "playable": true,
      "contentProvider": "DOCUMENT",
      "contentUrl": "",
      "resources": [
        {
          "id": "file-901",
          "name": "업무 구조 체크리스트.pdf",
          "url": "https://cdn.example.com/resources/file-901.pdf",
          "type": "application/pdf",
          "size": 248120
        }
      ]
    }
  ],
  "tools": {
    "noticeCount": 1,
    "resourceCount": 3,
    "examCount": 1,
    "surveyCount": 1
  },
  "notices": [
    {
      "id": "12",
      "label": "필독",
      "title": "수강 전 확인해 주세요",
      "description": "강의 자료는 차시별로 열립니다.",
      "read": false
    }
  ],
  "resources": [
    {
      "id": "15",
      "label": "PDF",
      "title": "업무 구조 체크리스트",
      "description": "1강 실습 자료",
      "url": "https://cdn.example.com/resources/15.pdf"
    }
  ],
  "assessments": [
    {
      "id": "21",
      "type": "SURVEY",
      "label": "필수",
      "title": "수강 전 설문",
      "description": "현재 경험을 확인합니다.",
      "required": true,
      "completed": false
    }
  ]
}
```

`resumeLessonId`는 마지막으로 학습한 차시의 `lessonId`다. 프론트는 이 값을 우선 사용해
이어보기 차시를 선택하고, 구버전 응답에서 값이 없을 때만 `lastPosition`을 보조값으로 사용한다.

카운트와 목록은 같은 데이터에서 계산해 서로 다르지 않게 반환한다. `contentUrl`은 재생 가능한 콘텐츠에 포함한다. 자료 차시는 `contentUrl` 없이 `resources`만 내려줘도 프론트가 자료 카드로 표시한다. `contentUrl`과 `resources`가 모두 없으면 프론트는 준비 중 상태를 표시한다.

`lessonId`는 프론트 라우팅과 상태 갱신에 사용하는 wrapper ID다. LX2 학습 이력 조회·저장에는 응답에 포함된 `organizationSeq`, `itemSeq`, `activeElementSeq`, `contentsSeq`를 사용한다. LX2의 `learnerDatamodel.progressMeasure`는 `0~1` 비율이므로 wrapper가 `progressPercent(0~100)`로 변환한다.

### `POST /oneclick/learn/{courseActiveSeq}/verification-codes`

새 기기에서 이어보기 전에 휴대전화 인증번호를 발급한다. 응답이나 로그에 실제 인증번호를 포함하지 않는다.

```json
{
  "phone": "010-1234-5678"
}
```

```json
{
  "expiresAt": "2026-07-22T10:30:00+09:00"
}
```

### `POST /oneclick/learn/{courseActiveSeq}/continue`

새 기기에서 휴대전화와 인증번호를 함께 검증한 뒤 세션을 발급하고 기존 수강권을 반환한다. 인증번호 누락, 불일치, 만료는 `400` 또는 `401`로 거절한다.

```json
{
  "phone": "010-1234-5678",
  "verificationCode": "123456"
}
```

### `POST /oneclick/learn/{courseActiveSeq}/heartbeat`

재생 중인 강의와 위치를 저장한다. LX2의 LCMS 학습 진도/이력 저장 구조로 연결한다. 직접 영상과 YouTube는 동일한 계약을 사용하되, 클라이언트가 보낸 비율이나 완료 여부를 그대로 신뢰하지 않는다.

```json
{
  "courseApplySeq": "8301",
  "lessonId": "38",
  "currentSeconds": 721,
  "durationSeconds": 2520,
  "ended": false,
  "playing": true
}
```

자료 차시를 열었을 때도 같은 endpoint를 사용한다. 이 경우 클라이언트는 `currentSeconds=1`, `durationSeconds=1`, `ended=true`, `playing=false`로 한 번 전송한다.

```json
{
  "courseApplySeq": "8301",
  "lessonId": "52",
  "currentSeconds": 1,
  "durationSeconds": 1,
  "ended": true,
  "playing": false
}
```

서버는 차시의 `contentProvider` 또는 `contentType`이 자료형인지 확인하고, 자료 접근 권한과 현재 세션 소유권이 맞으면 완료로 처리한다. 클라이언트가 보낸 `ended=true`만으로 다른 유형의 차시를 완료 처리하지 않는다.

클라이언트는 LX2 식별자를 heartbeat payload에 다시 보내지 않는다. 서버는 현재 `courseActiveSeq + lessonId`의 커리큘럼 매핑에서 `organizationSeq`, `itemSeq`, `activeElementSeq`를 조회해 저장한다. 이 방식으로 다른 강의의 식별자를 주입하는 요청을 막는다.

영상 재생 중에는 약 10초 간격으로 저장하고, 일시정지·종료 시 마지막 위치를 한 번 더 저장한다. YouTube는 IFrame Player API의 현재 위치·전체 길이·종료 이벤트를 사용한다. 직접 영상은 HTMLMediaElement 값을 사용한다.

서버는 다음을 검증·계산한다.

- `courseApplySeq`가 현재 세션 소유이고 해당 차시를 열람할 수 있는지 확인한다.
- 음수, 전체 길이를 초과한 위치, 비정상적으로 큰 시간 점프를 보정하거나 거절한다.
- 서버가 알고 있는 콘텐츠 길이가 있으면 클라이언트의 `durationSeconds`보다 우선한다.
- `progressPercent = min(currentSeconds / durationSeconds * 100, 100)`으로 계산한다.
- 90% 이상 시청했거나 유효한 종료 이벤트를 받으면 완료 처리한다.
- 완료 후 재시청은 허용하되 `completedAt`을 제거하거나 진도를 낮추지 않는다.

응답은 서버가 확정한 값을 반환한다.

```json
{
  "lessonId": "38",
  "currentSeconds": 721,
  "durationSeconds": 2520,
  "progressPercent": 28.6,
  "completed": false,
  "completedAt": null,
  "completionReason": null
}
```

### `POST /oneclick/learn/{courseActiveSeq}/notices/{noticeId}/read`

현재 세션의 수강생이 공지를 읽은 상태로 저장한다. 성공 후 강의실 응답의 `notices[].read`는 `true`, `tools.noticeCount`는 읽지 않은 공지 수로 반환한다.

### 수강생 설문·시험

```text
GET  /oneclick/learn/{courseActiveSeq}/survey/questions
POST /oneclick/learn/{courseActiveSeq}/survey/responses
GET  /oneclick/learn/{courseActiveSeq}/exam/questions
POST /oneclick/learn/{courseActiveSeq}/exam/submissions
GET  /oneclick/learn/{courseActiveSeq}/exam/result
```

시험 정답은 문제 조회 응답에 포함하지 않는다. 제출 API가 서버에서 채점하고 아래 결과만 반환한다.

```json
{
  "score": 67,
  "correctCount": 2,
  "totalCount": 3,
  "passed": false
}
```

### 수강 후기

공개 신청 페이지의 후기 목록과 수강생 본인의 후기 작성은 분리한다. 공개 목록에는 이름을 축약해서 반환하고, 작성·수정·삭제는 현재 수강 세션의 `courseApplySeq` 소유권을 확인한다.

```text
GET    /oneclick/shares/{shareToken}/reviews
GET    /oneclick/learn/{courseActiveSeq}/review
PUT    /oneclick/learn/{courseActiveSeq}/review
DELETE /oneclick/learn/{courseActiveSeq}/review
```

### 수강생 관심 강의

LX2 수강생 과정 즐겨찾기를 OneClick 계약으로 감싼다. 관리자 메뉴 즐겨찾기 API와 혼용하지 않는다.

```text
GET    /oneclick/classes/{courseActiveSeq}/bookmark
PUT    /oneclick/classes/{courseActiveSeq}/bookmark
DELETE /oneclick/classes/{courseActiveSeq}/bookmark
```

```json
{
  "courseActiveSeq": "104",
  "bookmarked": true
}
```

wrapper는 현재 세션의 `memberSeq`와 `courseActiveSeq`로 LX2 `/usr/bookmark/insert/json.do`, `/usr/bookmark/delete/json.do` 계층에 연결한다. 프론트에서 `memberSeq`나 LX2 `referenceSeq`를 입력받지 않는다. 같은 요청을 반복해도 최종 상태가 동일하도록 멱등하게 처리한다.

작성·수정 요청:

```json
{
  "courseApplySeq": "8301",
  "rating": 5,
  "content": "실습 예제가 구체적이라 바로 적용할 수 있었어요."
}
```

후기는 수강신청 한 건당 하나만 유지하고 `PUT`은 기존 후기가 있으면 수정한다. 공개 목록 응답의 `learnerName`은 `홍**`처럼 마스킹한다.

## 강의자 클래스 상세

### `GET /classes/{courseActiveSeq}/detail`

강의자 상세·신청자·출석·설문·수료증 화면의 공통 헤더는 이 응답 하나를 사용한다. LX2의 과정 기본 정보와 차수 정보, 신청 집계, LCMS 진도 집계, 후기 집계를 원클릭 전용 응답으로 조합한다. 프론트가 경로 ID로 신청 링크를 추측하지 않도록 실제 공개 링크의 `shareToken`을 반드시 반환한다.

```json
{
  "id": "104",
  "title": "노션으로 시작하는 업무 자동화",
  "summary": "반복 업무를 자동화하는 실전 4주 과정",
  "status": "모집중",
  "courseLifecycleStatus": "READY",
  "recruitmentStatus": "OPEN",
  "type": "온라인",
  "rating": 4.9,
  "reviewCount": 12,
  "capacity": 30,
  "enrolled": 24,
  "confirmedCount": 24,
  "heldCount": 0,
  "remainingSeats": 6,
  "completionRate": 80,
  "sessions": 4,
  "recruitEndDate": "7월 29일",
  "shareToken": "7KpX92Lm",
  "applicantTrend": [30, 43, 56, 68, 74, 80],
  "curriculum": [
    {
      "id": "38",
      "title": "노션 기본기와 데이터베이스",
      "description": "데이터베이스 · 필터 · 관계형 DB",
      "durationText": "45분",
      "published": true
    }
  ],
  "recentActivities": [
    {
      "id": "8301",
      "type": "applicant",
      "label": "새 신청자 1명",
      "occurredAt": "2시간 전"
    }
  ]
}
```

`completionRate`와 `applicantTrend`는 LX2 신청·학습 이력을 집계하고, `curriculum`은 차시/콘텐츠 구조를 변환한다. 최근 활동은 별도 이벤트 테이블이 없다면 신청·수료·후기의 최신 변경 이력을 합쳐 최대 5건만 반환한다. 원본 LX2 테이블을 프론트가 직접 조합하지 않는다.

강의자 운영 화면은 아래 클래스 범위 API를 사용한다. 전역 신청자 목록을 프론트에서 강의명으로 필터링하지 않는다.

```text
GET   /classes/{courseActiveSeq}/applicants
GET   /classes/{courseActiveSeq}/attendance/checkins
POST  /classes/{courseActiveSeq}/attendance/qr
POST  /classes/{courseActiveSeq}/attendance/qr/refresh
GET   /classes/{courseActiveSeq}/surveys
POST  /classes/{courseActiveSeq}/surveys
GET   /classes/{courseActiveSeq}/certificates/recipients
POST  /classes/{courseActiveSeq}/certificates
PATCH /classes/{courseActiveSeq}/settings
```

`PATCH /settings`는 `recruitmentStatus`, `capacity` 등 변경된 값만 받는다. `publicOn`, `recruitmentClosed`는 기존 프론트 호환 필드로만 유지하고 서버 저장 기준으로 사용하지 않는다. LX2 과정 기본 테이블을 직접 수정하기보다 원클릭 공개·모집 정책 서비스에서 검증한 뒤 반영한다.

모든 강의자 API는 로그인 역할뿐 아니라 아래 소유권을 함께 검증한다.

```sql
WHERE course_active_seq = :courseActiveSeq
  AND teacher_member_seq = :sessionMemberSeq
```

### 커리큘럼 관리

커리큘럼은 섹션과 차시의 2단계 구조로 반환한다. `lesson.id`는 LX2의 차시 또는 콘텐츠 식별자와 안정적으로 연결되어야 하며 화면 순서를 식별자로 사용하지 않는다.

```text
GET    /classes/{courseActiveSeq}/curriculum
POST   /classes/{courseActiveSeq}/curriculum/sections
PATCH  /classes/{courseActiveSeq}/curriculum/sections/{sectionId}
DELETE /classes/{courseActiveSeq}/curriculum/sections/{sectionId}
POST   /classes/{courseActiveSeq}/curriculum/lessons
PATCH  /classes/{courseActiveSeq}/curriculum/lessons/{lessonId}
DELETE /classes/{courseActiveSeq}/curriculum/lessons/{lessonId}
PUT    /classes/{courseActiveSeq}/curriculum/order
```

```json
[
  {
    "id": "section-1",
    "title": "1주차 · 업무 구조 이해하기",
    "lessons": [
      {
        "id": "lesson-38",
        "organizationSeq": "410",
        "itemSeq": "411",
        "activeElementSeq": "38",
        "contentsSeq": "205",
        "title": "데이터베이스 기본 구조 만들기",
        "description": "업무 정보를 데이터베이스로 정리합니다.",
        "contentType": "video",
        "contentUrl": "https://video.example.com/38",
        "durationMinutes": 45,
        "preview": false,
        "published": true
      }
    ]
  }
]
```

`contentType`은 `video`, `live`, `document`, `assignment` 중 하나다. 순서 변경 요청은 섹션과 차시 ID 배열을 트랜잭션으로 갱신한다. 학습 이력이 있으면 차시를 물리 삭제하지 않고 비활성화하며 기존 `lessonId`와 완료 이력을 유지한다. 공개 강의의 마지막 공개 차시는 바로 비공개로 변경할 수 없다.

식별자 매핑은 아래처럼 유지한다.

| OneClick | LX2 | 용도 |
|---|---|---|
| `section.id` | organization 또는 운영용 그룹 ID | 커리큘럼 묶음·순서 |
| `lesson.id` / `lessonId` | wrapper 안정 ID | 프론트 수정·선택 |
| `organizationSeq` | LCMS organization | 학습 조직 |
| `itemSeq` | LCMS item | learnerDatamodel 진도 키 |
| `activeElementSeq` | course active element | 운영 강의 차시 |
| `contentsSeq` | LCMS contents | 원본 콘텐츠와 재생 메타데이터 |

`preview=true`는 현재 편집 필드만 구현된 상태다. 신청 전 재생을 제공하려면 `shareToken + lessonId` 범위의 단기 서명 URL을 별도 발급하고 정식 수강 진도와 분리해야 한다. 이 계약이 구현되기 전에는 운영 기능으로 노출하지 않는다.
