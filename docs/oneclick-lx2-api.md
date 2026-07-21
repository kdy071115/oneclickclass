# OneClick applicant API contract for LX2

원클릭 신청자 화면은 LX2의 기존 `cs_course_active`, `cs_course_apply`, `member`, 강의실 데이터를 아래 JSON 계약으로 받아 사용한다.
기존 LX2 `.do` 컨트롤러를 직접 노출하기보다 이 계약으로 얇게 감싸면 프론트 변경 없이 빠르게 연결할 수 있다.

## Environment

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_USE_MOCK=false
VITE_API_WITH_CREDENTIALS=true
```

## Endpoints

### `GET /oneclick/shares/{shareToken}`

공유 토큰으로 신청 페이지 정보를 조회한다.

LX2 매핑 기준:

- `courseActiveSeq`: `UICourseActiveVO.courseActiveSeq`
- `courseMasterSeq`: `UICourseActiveVO.courseMasterSeq`
- `title`: `courseActiveTitle`
- `summary`: 과정 요약 또는 메타데이터
- `description`: 과정 소개 또는 메타데이터
- `capacity`: 모집 정원
- `enrolled`: 신청 인원
- `applyStatus`: `OPEN` 또는 `CLOSED`
- `paymentType`: `FREE` 또는 `PAID`

### `POST /oneclick/shares/{shareToken}/apply`

이름, 휴대전화 번호, 선택 이메일로 내부 회원과 수강신청을 생성한다.

요청:

```json
{
  "name": "홍길동",
  "phone": "010-1234-5678",
  "email": "user@example.com"
}
```

응답은 수강실 진입에 필요한 `courseActiveSeq`, `courseApplySeq`, `memberSeq`를 포함한다.

### `GET /oneclick/learn/{courseActiveSeq}/room`

신청자의 수강실 데이터를 조회한다. LX2의 `UICourseClassroomController`에서 쓰는 강의실 상세, 주차 목록, 게시판 카운트, 평가 항목을 이 응답으로 합친다.

### `POST /oneclick/learn/{courseActiveSeq}/continue`

새 기기에서 휴대전화 확인 후 세션을 발급하고 기존 수강권을 반환한다.

### `POST /oneclick/learn/{courseActiveSeq}/heartbeat`

재생 중인 강의와 위치를 저장한다. LX2의 LCMS 학습 진도/이력 저장 구조로 연결한다.

```json
{
  "courseApplySeq": "8301",
  "lessonId": "38",
  "currentSeconds": 721,
  "playing": true
}
```
