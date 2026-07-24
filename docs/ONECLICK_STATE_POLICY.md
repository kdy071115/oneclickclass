# 원클릭 클래스 상태·권한·정합성 정책

> 목적: LX2 및 PG 연동 전에 신청, 결제, 좌석, 수강권 상태가 서로 꼬이지 않도록 서버 기준을 확정한다.
> 원칙: 프론트는 상태를 추측해 수강권을 발급하지 않고 서버가 반환한 접근 가능 여부를 표시한다.
## 1. 강의 진행과 모집 상태

두 상태를 별도 필드로 관리한다.

```ts
type CourseLifecycleStatus = 'DRAFT' | 'READY' | 'IN_PROGRESS' | 'ENDED' | 'SUSPENDED';
type RecruitmentStatus = 'PRIVATE' | 'OPEN' | 'CLOSED' | 'FULL';
```

| 구분 | 상태 | 의미 |
|---|---|---|
| 강의 | `DRAFT` | 기본 정보 또는 커리큘럼 작성 중 |
| 강의 | `READY` | 공개 조건 충족 |
| 강의 | `IN_PROGRESS` | 강의 운영 중 |
| 강의 | `ENDED` | 운영 종료 |
| 강의 | `SUSPENDED` | 장애·정책 사유로 학습 임시 중지 |
| 모집 | `PRIVATE` | 신청 페이지 비공개 |
| 모집 | `OPEN` | 신청 가능 |
| 모집 | `CLOSED` | 강의자가 모집 마감 |
| 모집 | `FULL` | 확정 좌석과 유효 임시 점유가 정원 도달 |

허용 조합 예시:

```text
READY + PRIVATE
READY + OPEN
IN_PROGRESS + OPEN
IN_PROGRESS + CLOSED
ENDED + CLOSED
SUSPENDED + CLOSED
```

규칙:

1. 신청 가능 여부는 `recruitmentStatus=OPEN`과 서버 좌석 검증으로 결정한다.
2. `IN_PROGRESS` 전환이 모집을 자동 종료하지 않는다.
3. `PRIVATE`, `CLOSED`, `FULL`은 서로 다른 안내를 사용한다.
4. 시작·종료 전환은 서버 시간과 강의 시간대를 기준으로 한다.
5. 기존 프론트의 `CURRICULUM`은 `DRAFT`의 작성 단계, `RECRUITING`은 `OPEN` 표시값으로만 사용한다.

## 2. 신청·결제·수강권 상태

```ts
type ApplicationStatus = 'APPLIED' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
type PaymentStatus =
  | 'NOT_REQUIRED'
  | 'PENDING'
  | 'PAID'
  | 'FAILED'
  | 'CANCELLED'
  | 'REFUND_REQUESTED'
  | 'REFUNDED';
type EnrollmentStatus = 'PENDING' | 'AVAILABLE' | 'SUSPENDED' | 'COMPLETED' | 'REVOKED';
```

`APPLY_STATUS::001/002/004`는 LX2 호환 코드로만 사용한다. 원클릭 API는 위 세 상태와 서버 계산 접근값을 반환한다.

```ts
type LearningAccess = {
  canLearn: boolean;
  reason:
    | 'AVAILABLE'
    | 'AWAITING_APPROVAL'
    | 'AWAITING_PAYMENT'
    | 'PAYMENT_FAILED'
    | 'REJECTED'
    | 'CANCELLED'
    | 'REFUNDED'
    | 'SUSPENDED'
    | 'COURSE_UNAVAILABLE';
};
```

기본 수강 가능 조건:

```text
applicationStatus = APPROVED
AND paymentStatus IN (PAID, NOT_REQUIRED)
AND enrollmentStatus IN (AVAILABLE, COMPLETED)
AND courseLifecycleStatus != SUSPENDED
```

프론트는 이 조건을 재계산하지 않고 서버의 `canLearn`, `accessReason`을 사용한다.

## 3. 신청 순서

### 무료·자동 승인

```text
정보 입력 → 휴대전화 인증 → 회원 조회/생성
→ 정원 트랜잭션 검증
→ APPROVED + NOT_REQUIRED + AVAILABLE
→ 세션 발급
```

### 유료·자동 승인

```text
정보 입력 → 휴대전화 인증 → 회원 조회/생성 → 신청 생성
→ 결제 주문 생성과 좌석 15분 임시 점유
→ PG 결제와 콜백 검증
→ PAID + 좌석 확정 + AVAILABLE
```

### 승인형

MVP는 **승인 후 결제**로 고정한다.

```text
신청 → APPLIED + PENDING
→ 강의자 승인
→ 무료: AVAILABLE
→ 유료: 결제 주문과 좌석 임시 점유
→ 결제 완료 후 AVAILABLE
```

승인 대기 신청은 좌석을 점유하지 않는다. 승인 시 좌석이 없으면 승인·결제를 진행하지 않는다.

## 4. 좌석 정책

```ts
type SeatStatus = 'HELD' | 'CONFIRMED' | 'RELEASED' | 'EXPIRED';
```

| 상황 | 처리 |
|---|---|
| 무료 신청 확정 | 신청 트랜잭션에서 즉시 `CONFIRMED` |
| 유료 결제 시작 | 15분 동안 `HELD` |
| 결제 성공 | 같은 트랜잭션에서 `CONFIRMED` |
| 실패·취소·만료 | `RELEASED` 또는 `EXPIRED` |
| 승인 대기 | 좌석 미점유 |
| 환불 완료·신청 취소 | 좌석 `RELEASED` |

```text
remainingSeats = capacity - confirmedCount - validHeldCount
```

`enrolled`는 좌석 계산에 사용하지 않는다. API는 `confirmedCount`, `heldCount`, `remainingSeats`를 반환한다.

필수 제약:

- `(courseActiveSeq, memberSeq)` 활성 신청 유니크
- 좌석 확인과 확정은 같은 데이터베이스 트랜잭션
- 만료 좌석은 배치와 요청 시점 검증으로 해제
- 취소·실패 후 재신청 허용 여부를 기존 신청 상태로 결정

## 5. 회원 식별과 인증

1. 최초 신청도 휴대전화 인증 후 회원을 조회하거나 생성한다.
2. 이름과 전화번호 문자열만으로 동일인을 판단하지 않는다.
3. 인증된 정규화 전화번호를 회원 검색 키로 사용한다.
4. 기존 강의자 계정과 번호가 같으면 동일 `memberSeq`에 수강 역할을 추가할 수 있다.
5. 탈퇴·번호 변경·가족 공용 번호는 자동 병합하지 않고 복구 정책으로 보낸다.
6. 계정 존재 여부가 드러나지 않는 동일한 인증 응답을 사용한다.
7. 만료, 재전송 간격, 일일 횟수, 실패 횟수를 서버에서 제한한다.

새 기기 수강권 조회 조건:

```text
verifiedPhone + memberSeq + courseActiveSeq
+ applicationStatus NOT IN (REJECTED, CANCELLED)
+ paymentStatus NOT IN (FAILED, CANCELLED, REFUNDED)
+ enrollmentStatus NOT IN (REVOKED, SUSPENDED)
```

## 6. 취소·거절·환불과 수강권 회수

| 이벤트 | 신청 | 결제 | 수강권 |
|---|---|---|---|
| 승인 거절 | `REJECTED` | `NOT_REQUIRED/CANCELLED` | `REVOKED` |
| 신청 취소 | `CANCELLED` | 대기 결제 `CANCELLED` | `REVOKED` |
| 결제 실패 | 유지 | `FAILED` | `PENDING` |
| 환불 요청 | 유지 | `REFUND_REQUESTED` | 정책에 따라 `SUSPENDED` |
| 환불 완료 | 유지 | `REFUNDED` | `REVOKED` |
| 관리자 정지 | 유지 | 유지 | `SUSPENDED` |

강의실 API는 매 요청마다 수강권을 확인한다. `REVOKED` 또는 `SUSPENDED`면 콘텐츠 URL을 반환하지 않는다.

## 7. 결제 원자성과 멱등성

결제 콜백에서 아래 작업을 하나의 서비스 트랜잭션과 멱등 처리로 수행한다.

```text
PG 서명·거래 검증
→ 서버 주문 금액과 승인 금액 비교
→ 결제 원장 저장
→ paymentStatus=PAID
→ 좌석 HELD→CONFIRMED
→ enrollmentStatus=AVAILABLE
→ 알림·정산 이벤트 기록
```

필수 유니크 키:

```text
paymentOrderId UNIQUE
pgTransactionId UNIQUE
idempotencyKey UNIQUE
```

동일 콜백 재수신 시 기존 성공 결과를 반환하고 좌석·수강권·정산을 중복 생성하지 않는다.

## 8. 차시 완료와 진도

```ts
type LessonProgress = {
  progressPercent: number;
  watchedSeconds?: number;
  completedAt?: string;
  completionReason?: 'WATCH_THRESHOLD' | 'ENDED' | 'MANUAL' | 'ATTENDANCE' | 'SUBMISSION';
};
```

| 콘텐츠 | 완료 기준 |
|---|---|
| 직접 영상·YouTube·Vimeo | 90% 이상 시청 또는 종료 이벤트 |
| 문서·외부 링크 | 열람 후 사용자 `학습 완료` 선택 |
| 라이브 | 출석 데이터 또는 강의자 완료 처리 |
| 과제 | 제출 완료 |

서버는 클라이언트 퍼센트를 그대로 신뢰하지 않고 저장 시간과 콘텐츠 길이로 계산한다.

## 9. 필수·순차 학습·수료

순차 학습의 선행 차시는 **현재 수강생에게 공개된 직전 학습 대상 차시**다.

- 비공개·삭제·접근 불가 차시는 제외한다.
- 선택 차시도 순차 배열에 포함되면 완료해야 다음 차시가 열린다.
- 외부 링크·문서·라이브·과제는 8장의 완료 기준을 만족해야 한다.
- 명시적 복수 선수 차시는 MVP 이후 `prerequisiteLessonIds`로 확장한다.

```text
progressRate = 공개 학습 대상 차시별 progressPercent 평균
requiredCompletionRate = 완료 필수 차시 수 / 전체 필수 차시 수
```

수료 판정:

```text
requiredCompletionRate=100
AND 필수 설문 완료
AND 필수 시험 합격
AND 출석 기준 충족
```

각 조건 사용 여부와 기준값은 강의별 수료 정책으로 저장한다.

## 10. 공개 후 수정

| 상황 | 정책 |
|---|---|
| 신청자 없음 | 자유 수정 |
| 신청자 있음, 학습 이력 없음 | 영향 안내 후 수정, 가격은 신규 신청에만 적용 |
| 학습 이력 있음 | 제한 수정, 구조 변경은 버전 생성 권장 |

학습 이력이 있을 때:

- 차시는 물리 삭제하지 않고 비활성화한다.
- 완료 이력의 `lessonId`를 유지한다.
- 순서 변경으로 완료 이력을 초기화하지 않는다.
- 필수·순차 설정 변경 전 영향 인원과 재계산 여부를 안내한다.
- 가격 변경은 기존 신청·주문에 소급하지 않는다.
- 일정·장소 변경은 수강생 알림을 생성한다.
- 공개 강의의 마지막 공개 차시는 바로 비공개로 바꿀 수 없다. 전체 중지는 `SUSPENDED`를 사용한다.

## 11. 무료 미리보기

현재 `preview`는 편집 필드만 있고 신청 전 재생 권한은 구현되지 않았다. 운영 배포 전 아래 중 하나를 선택한다.

1. MVP에서 필드를 숨긴다.
2. `shareToken + preview lesson` 전용 단기 서명 URL을 발급한다.

미리보기는 정식 진도와 분리하고 원본 URL을 직접 노출하지 않는다. 정책 확정 전에는 완료 기능으로 표시하지 않는다.

## 12. QR 출석 보안

- QR은 `courseActiveSeq`, 회차, 만료 시각, nonce를 포함한 서버 서명 토큰이다.
- 출석 가능 시간대와 수강권을 확인한다.
- `(sessionSeq, courseApplySeq)` 중복 체크인을 막는다.
- 만료·교체된 nonce를 재사용할 수 없다.
- 짧은 유효기간과 주기적 교체로 캡처 공유 위험을 줄인다.

## 13. API 식별자와 소유권

경로 변수는 `{id}` 대신 실제 식별자 이름을 사용한다.

```text
/classes/{courseActiveSeq}
/classes/{courseActiveSeq}/curriculum
/applications/{courseApplySeq}
/lessons/{lessonId}
/oneclick/learn/{courseActiveSeq}/room
```

강의자 API는 항상 강의 소유권을 함께 검증한다.

```sql
WHERE course_active_seq = :courseActiveSeq
  AND teacher_member_seq = :sessionMemberSeq
```

수강생 API는 세션의 `memberSeq`, `courseApplySeq`, 요청 `courseActiveSeq`가 모두 일치해야 한다.

## 14. 서버 불변 조건

1. 승인·결제·좌석 조건을 모두 만족한 서버만 수강권을 활성화한다.
2. 환불·취소·거절 후 콘텐츠 URL을 반환하지 않는다.
3. 좌석은 정원을 초과해 확정될 수 없다.
4. 결제 콜백 재처리 결과는 동일해야 한다.
5. 마스터 ID와 차수 ID를 혼용하지 않는다.
6. 모든 쓰기 요청에서 역할과 리소스 소유권을 검증한다.
7. 콘텐츠 완료와 수료 판정은 서버 값이 기준이다.
