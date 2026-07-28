# OneClick Backend Integration Checklist

이 문서는 백엔드 API가 아직 없는 상태에서 프론트와 바로 연동하기 위해 맞춰야 하는 계약과 구현 순서를 정리한다.

프론트 전환 환경값:

```env
VITE_API_BASE_URL=http://localhost:8080/api
VITE_USE_MOCK=false
VITE_API_WITH_CREDENTIALS=true
```

`VITE_USE_MOCK=false`로 바꾸면 `src/api/services.ts`, `src/api/oneclick.ts`의 mock 분기가 꺼지고 실제 HTTP 요청을 사용한다.

## 1. 구현 우선순위

### P0. 수강생 신청과 수강실 MVP

이 묶음이 완성되면 공유 링크 신청부터 강의실 입장까지 테스트할 수 있다.

1. `GET /oneclick/shares/{shareToken}`
2. `POST /oneclick/learn/{courseActiveSeq}/verification-codes`
3. `POST /oneclick/shares/{shareToken}/apply`
4. `GET /oneclick/learn/{courseActiveSeq}`
5. `GET /oneclick/learn/{courseActiveSeq}/room`
6. `POST /oneclick/learn/{courseActiveSeq}/heartbeat`

### P0. 강의자 커리큘럼과 파일 업로드

이 묶음이 완성되면 강의자가 차시를 만들고 수강생 화면에서 볼 수 있다.

1. `GET /classes/{classId}/detail`
2. `GET /classes/{classId}/curriculum`
3. `POST/PATCH/DELETE /classes/{classId}/curriculum/sections`
4. `POST/PATCH/DELETE /classes/{classId}/curriculum/lessons`
5. `PUT /classes/{classId}/curriculum/order`
6. `POST /classes/images`
7. `POST /classes/files`
8. `POST /classes/{classId}/publish`

### P1. 운영 관리

1. `GET /classes`
2. `GET /dashboard`
3. `GET /classes/{classId}/applicants`
4. `PATCH /applicants/{id}/payment`
5. 알림, 출석, 설문, 시험, 수료증, 정산 API

## 2. 백엔드 응답 원칙

- LX2 `.do` 화면 응답을 직접 반환하지 않는다.
- 프론트 계약 JSON으로 감싸서 반환한다.
- `courseActiveSeq`, `courseMasterSeq`, `courseApplySeq`, `memberSeq`는 문자열로 반환한다.
- 화면 표시 라벨과 서버 상태 코드를 섞지 않는다.
- 수강 가능 여부는 서버가 `canLearn`, `accessReason`으로 최종 계산한다.
- 프론트가 보낸 결제 금액, 완료 여부, 진도율은 신뢰하지 않는다.
- 목록 카운트와 목록 배열은 같은 데이터에서 계산한다.
- `undefined`, `null` 문자열이 URL에 들어가지 않도록 빈 값은 `""` 또는 필드 생략으로 반환한다.

## 3. 필수 상태값

### 신청 상태

```text
APPLIED
APPROVED
REJECTED
CANCELLED
```

### 결제 상태

```text
NOT_REQUIRED
PENDING
PAID
FAILED
CANCELLED
REFUND_REQUESTED
REFUNDED
```

### 수강권 상태

```text
PENDING
AVAILABLE
SUSPENDED
COMPLETED
REVOKED
```

### 접근 사유

```text
AVAILABLE
AWAITING_APPROVAL
AWAITING_PAYMENT
PAYMENT_FAILED
REJECTED
CANCELLED
REFUNDED
SUSPENDED
COURSE_UNAVAILABLE
```

프론트는 `applicationStatus`, `paymentStatus`, `enrollmentStatus`를 보여줄 수 있지만, 버튼과 라우팅의 최종 기준은 `canLearn`과 `accessReason`이다.

## 4. 강의자 API 계약

### 클래스 목록

`GET /classes`

```json
[
  {
    "id": "104",
    "courseMasterSeq": "72",
    "courseActiveSeq": "104",
    "lifecycleStatus": "RECRUITING",
    "title": "노션으로 시작하는 업무 자동화",
    "status": "모집중",
    "type": "온라인",
    "date": "자유 수강",
    "enrolled": 24,
    "capacity": 30,
    "color": "#3182f6",
    "thumbnail": "https://cdn.example.com/thumb.jpg"
  }
]
```

`status`는 현재 프론트 화면 표시용 한글 라벨이다. LX2 코드만 내려줄 경우 프론트에 별도 정규화 작업이 필요하다.

### 클래스 상세

`GET /classes/{classId}/detail`

`src/types/class.ts`의 `ClassDetail`에 맞춘다. 특히 `curriculum`은 상세 화면 요약용이므로 차시 전체가 아니라 아래 최소 필드만 있어도 된다.

```json
{
  "id": "104",
  "title": "노션으로 시작하는 업무 자동화",
  "status": "모집중",
  "type": "온라인",
  "date": "자유 수강",
  "enrolled": 24,
  "capacity": 30,
  "color": "#3182f6",
  "summary": "반복 업무를 자동화하는 실전 4주 과정",
  "description": "과정 소개",
  "instructor": "이지훈",
  "price": 45000,
  "recruitEndDate": "2026-07-29",
  "sessions": 5,
  "location": "온라인 강의실",
  "rating": 4.9,
  "reviewCount": 12,
  "completionRate": 80,
  "shareToken": "7KpX92Lm",
  "publicOn": true,
  "recruitmentClosed": false,
  "applicantTrend": [8, 12, 15, 18, 24],
  "curriculum": [],
  "recentActivities": []
}
```

### 커리큘럼

`GET /classes/{classId}/curriculum`

```json
[
  {
    "id": "section-1",
    "title": "1주차",
    "lessons": [
      {
        "id": "lesson-1",
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

자료 차시:

```json
{
  "id": "lesson-doc-1",
  "title": "실습 자료 내려받기",
  "description": "예제 파일과 체크리스트를 확인해 주세요.",
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

## 5. 파일 업로드 계약

### 썸네일과 마커 이미지

`POST /classes/images`

`multipart/form-data`

```text
file: File
```

```json
{
  "url": "https://cdn.example.com/images/abc.jpg"
}
```

### 학습 자료 파일

`POST /classes/files`

`multipart/form-data`

```text
file: File
```

```json
{
  "id": "file-901",
  "name": "업무 구조 체크리스트.pdf",
  "url": "https://cdn.example.com/resources/file-901.pdf",
  "type": "application/pdf",
  "size": 248120
}
```

프론트는 `url`만 있어도 동작하지만, `name`, `type`, `size`를 내려주면 화면 품질이 좋아진다.

## 6. 수강생 API 계약

### 공유 링크 조회

`GET /oneclick/shares/{shareToken}`

- 공개 신청 페이지 데이터
- 수강 전에는 유료/비공개 자료 URL을 내려주지 않는다.
- 커리큘럼은 제목, 설명, 시간, 섹션 정보 정도만 내려줘도 된다.

### 신청

`POST /oneclick/shares/{shareToken}/apply`

서버 책임:

- 휴대전화 인증 확인
- 회원 조회 또는 생성
- 기존 신청 중복 방지
- 좌석 확인
- 결제 필요 여부 판단
- 원클릭 세션 쿠키 발급

### 수강실

`GET /oneclick/learn/{courseActiveSeq}/room`

서버 책임:

- 현재 세션이 해당 수강권 소유자인지 확인
- `canLearn=false`면 콘텐츠 URL과 자료 다운로드 URL을 내려주지 않는다.
- `lessons[].locked`, `playable`, `completed`, `progress`를 서버가 계산한다.
- 자료 차시는 `contentProvider=DOCUMENT`, `resources[]`로 내려준다.
- 마지막으로 학습한 차시는 `resumeLessonId`로 내려준다. 표시용 `lastPosition` 문자열만으로 차시를 식별하지 않는다.

## 7. 자료 차시 완료 처리

수강생이 자료 파일을 열면 프론트는 heartbeat를 한 번 전송한다.

```json
{
  "courseApplySeq": "8301",
  "lessonId": "lesson-doc-1",
  "currentSeconds": 1,
  "durationSeconds": 1,
  "ended": true,
  "playing": false
}
```

서버는 다음을 확인한다.

- 현재 세션의 수강권인지
- 해당 차시가 자료 차시인지
- 순차 학습 잠금이 해제된 상태인지
- 파일 URL 접근 권한이 있는지

성공 후 다음 `room` 응답에서 해당 차시는 `completed=true`, `progress=100` 또는 서버 정책상 완료율로 반환한다.

## 8. 연동 전 프론트 점검

백엔드 API가 생긴 뒤 아래 순서로 확인한다.

1. `.env`에서 `VITE_USE_MOCK=false`로 변경
2. 로그인 후 `/dashboard` 접근
3. `/classes` 목록 조회
4. `/classes/{id}/curriculum`에서 섹션/차시 생성
5. 영상 URL 차시 저장
6. 자료 파일 차시 저장
7. `/classes/{id}/preview` 공개 페이지 확인
8. `/s/{shareToken}` 신청
9. `/learn/{courseActiveSeq}` 수강실 입장
10. 영상 heartbeat 저장 확인
11. 자료 파일 열기 후 완료 처리 확인
12. 새로고침 후 진도와 완료 상태 유지 확인

## 9. 현재 프론트에서 추가 어댑터가 필요한 영역

아래 영역은 현재 API 호출 인터페이스는 있지만 응답 정규화가 얇다. 백엔드가 프론트 타입 그대로 내려주면 바로 동작하고, LX2 원본 필드명으로 내려주면 프론트 어댑터를 추가해야 한다.

- 강의자 클래스 목록과 상세
- 신청자 목록과 상세
- 출석 QR과 출석 명단
- 설문·시험 관리
- 수료증 발급과 PDF 다운로드
- 정산 요약과 CSV 다운로드
- 알림 SSE

MVP에서는 수강생 원클릭 플로우와 강의자 커리큘럼 API부터 맞추고, 운영 기능은 순차적으로 계약을 고정한다.
