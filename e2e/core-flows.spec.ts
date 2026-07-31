import { expect, test, type Page } from '@playwright/test';

const account = { email: 'e2e@oneclick.test', password: 'password' };

async function login(page: Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: '이메일로 로그인', exact: true }).click();
  await page.getByLabel('이메일', { exact: true }).fill(account.email);
  await page.getByLabel('비밀번호').fill(account.password);
  await page.getByRole('button', { name: '이메일로 로그인', exact: true }).last().click();
  await expect(page).toHaveURL('/dashboard');
}

async function makeMockCertificatesEligible(page: Page) {
  await page.evaluate(() => {
    localStorage.setItem(
      'oneclick.certificate-policy.notion',
      JSON.stringify({
        minProgress: 0,
        requireRequiredLessons: false,
      }),
    );
  });
}

test('보호 라우트에서 로그인 후 대시보드로 진입한다', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL('/login');
  await page.getByRole('button', { name: '이메일로 로그인', exact: true }).click();
  await page.getByLabel('이메일', { exact: true }).fill(account.email);
  await page.getByLabel('비밀번호').fill(account.password);
  await page.getByRole('button', { name: '이메일로 로그인', exact: true }).last().click();
  await expect(page).toHaveURL('/dashboard');
});

test('강의 생성 단계 검증과 정산 화면을 이동한다', async ({ page }) => {
  await login(page);
  await page.goto('/classes/new');
  await expect(page.getByRole('button', { name: '이전', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '다음', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: /^온라인 / }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await expect(page.getByRole('button', { name: '다음', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '자료 없이 직접 작성하기', exact: true }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await expect(page.getByLabel('클래스 제목', { exact: true })).toBeFocused();
  await expect(page.getByText('클래스 제목을 입력해 주세요.', { exact: true })).toBeVisible();
  await page.goto('/settlements');
  if ((page.viewportSize()?.width ?? 0) >= 900) {
    await expect(page.getByRole('button', { name: 'CSV 내보내기' })).toBeVisible();
    await expect(page.getByRole('button', { name: '계좌 설정', exact: true })).toBeVisible();
  } else {
    await expect(page.locator('.account-bank')).toBeVisible();
    await expect(page.getByText('정산 내역', { exact: true })).toBeVisible();
  }
});

test('공개 신청 페이지에서 필수 신청 정보를 검증한다', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'oneclick-class-preview:e2e-paid-application',
      JSON.stringify({
        _schemaVersion: 2,
        type: 'online',
        title: '필수 신청 정보 테스트',
        payment: 'paid',
        price: 45000,
        capacity: 30,
      }),
    );
  });
  await page.goto('/s/e2e-paid-application');
  await expect(page.getByRole('heading', { name: '필수 신청 정보 테스트' })).toBeVisible();
  await page.getByRole('button', { name: '휴대전화 확인하기' }).click();
  await expect(page.getByText('이름을 입력해 주세요.')).toBeVisible();
  await page.getByPlaceholder('이름을 입력하세요').fill('테스트 수강생');
  await page.getByPlaceholder('010-0000-0000').fill('010-1234-5678');
  await page.getByRole('checkbox', { name: /개인정보 수집/ }).check();
  await page.getByRole('checkbox', { name: /결제 및 환불/ }).check();
  await page.getByRole('button', { name: '휴대전화 확인하기' }).click();
  const verificationHint = await page.getByText(/테스트 인증번호는/).textContent();
  await page.getByPlaceholder('6자리 인증번호').fill(verificationHint?.match(/\d{6}/)?.[0] ?? '');
  await expect(page.getByRole('button', { name: '신청하고 결제하기' })).toBeVisible();
});

test('수강생이 관심 클래스를 저장하고 목록에서 다시 연다', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'oneclick.enrollment.bookmark-e2e',
      JSON.stringify({
        memberSeq: 'member-bookmark',
        courseApplySeq: 'apply-bookmark',
        courseActiveSeq: 'bookmark-e2e',
        learnerName: '관심 수강생',
        applyStatusCd: 'APPLY_STATUS::002',
        applicationStatus: 'APPROVED',
        paymentStatus: 'NOT_REQUIRED',
        enrollmentStatus: 'AVAILABLE',
        canLearn: true,
        accessReason: 'AVAILABLE',
        progress: 0,
        lastPosition: '1강 0분 0초',
      }),
    );
    localStorage.setItem(
      'oneclick-class-preview:bookmark-e2e',
      JSON.stringify({
        _schemaVersion: 2,
        type: 'online',
        title: '관심 클래스 E2E',
        summary: '저장 후 다시 찾는 클래스',
        payment: 'free',
        capacity: 20,
      }),
    );
  });

  await page.goto('/s/bookmark-e2e');
  const bookmark = page.getByRole('button', { name: '관심 클래스 등록' });
  await expect(bookmark).toBeVisible();
  await bookmark.click();
  await expect(page.getByRole('button', { name: '관심 클래스 해제' })).toBeVisible();

  await page.goto('/favorites');
  await expect(page.getByRole('heading', { name: '관심 클래스 E2E' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.getByRole('link', { name: '강의 정보 보기' }).click();
  await expect(page).toHaveURL('/s/bookmark-e2e');
  await expect(page.getByRole('button', { name: '관심 클래스 해제' })).toBeVisible();
});

test('관심 목록에서 클래스를 해제하면 빈 상태로 전환한다', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('oneclick.course-bookmark.notion', 'Y');
  });
  await page.goto('/favorites');
  await expect(page.getByRole('heading', { name: '노션으로 시작하는 업무 자동화' })).toBeVisible();
  await page.getByRole('button', { name: '노션으로 시작하는 업무 자동화 관심 클래스 해제' }).click();
  await expect(page.getByRole('heading', { name: '아직 관심 클래스가 없어요.' })).toBeVisible();
});

test('수강생 신청 페이지와 강의실이 모바일에서 가로로 깨지지 않는다', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await page.addInitScript(() => {
    localStorage.setItem(
      'oneclick-class-preview:responsive-course',
      JSON.stringify({
        _schemaVersion: 2,
        type: 'online',
        title: '모바일 수강 테스트',
        summary: '작은 화면에서도 이어지는 강의',
        description: '모바일 신청과 학습 화면을 확인합니다.',
        startDate: '2026-08-31',
        capacity: 20,
        payment: 'free',
      }),
    );
    localStorage.setItem(
      'oneclick.curriculum.responsive-course',
      JSON.stringify([
        {
          id: 'section-1',
          title: '기본 과정',
          lessons: [
            {
              id: 'lesson-1',
              title: '콘텐츠 준비 중인 강의',
              durationMinutes: 10,
              published: true,
              contentType: 'video',
            },
            {
              id: 'lesson-2',
              title: '모바일 첫 강의',
              durationMinutes: 15,
              published: true,
              contentUrl: 'https://youtu.be/M7lc1UVf-VE',
              contentType: 'video',
            },
            {
              id: 'lesson-3',
              title: '모바일 다음 강의',
              durationMinutes: 20,
              published: true,
              contentUrl: 'https://youtu.be/M7lc1UVf-VE',
              contentType: 'video',
            },
          ],
        },
      ]),
    );
    localStorage.setItem(
      'oneclick.enrollment.responsive-course',
      JSON.stringify({
        memberSeq: 'member-mobile',
        courseApplySeq: 'apply-mobile',
        courseActiveSeq: 'responsive-course',
        shareToken: 'responsive-course',
        learnerName: '모바일 수강생',
        applyStatusCd: 'APPLY_STATUS::002',
        progress: 0,
        lastPosition: '1강 0분 0초',
      }),
    );
  });

  await page.goto('/s/responsive-course');
  await expect(page.getByRole('heading', { name: '모바일 수강 테스트' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByRole('button', { name: '바로 이어보기' })).toHaveCount(1);
  await page.locator('.learner-mobile-apply-cta').click();
  await expect(page).toHaveURL('/learn/responsive-course');
  await expect(page.getByRole('heading', { name: '모바일 첫 강의' })).toBeVisible();

  await page.getByRole('button', { name: '커리큘럼 보기' }).click();
  await expect(page.getByLabel('강의 커리큘럼')).toBeVisible();
  await expect(page.getByRole('button', { name: /모바일 첫 강의 예상 15분/ })).toBeVisible();
  await page.getByRole('button', { name: '커리큘럼 닫기' }).last().click();
  await expect(page.getByLabel('강의 커리큘럼')).not.toBeVisible();

  await page.getByRole('button', { name: '다음 차시' }).click();
  await expect(page.getByRole('heading', { name: '모바일 다음 강의' })).toBeVisible();

  await page.getByRole('button', { name: /수강 후기/ }).click();
  await expect(page.getByText('전체 진도 50%부터 후기를 작성할 수 있어요.')).toBeVisible();
  await expect(page.getByRole('textbox', { name: '후기 내용' })).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test('신청자 상세와 수료증을 데스크톱에서 표시한다', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await login(page);
  await page.goto('/applicants/1');
  const detail = page.locator('.applicant-detail-web');
  await expect(detail.getByRole('heading', { name: '김서연', exact: true })).toBeVisible();
  await expect(detail.getByText('seoyeon@email.com', { exact: true })).toBeVisible();
  await expect(detail.getByRole('button', { name: '결제 확인', exact: true })).toBeVisible();

  await page.goto('/classes/notion/certificates');
  const certificate = page.locator('.certificate-document').first();
  await expect(certificate).toBeVisible();
  await expect(page.getByRole('heading', { name: '수료증 미리보기' })).toBeVisible();
});

test('긴 신청서 답변을 접고 상세 카드 행을 맞춘다', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await login(page);
  await page.goto('/applicants/3');
  const answerCard = page.locator('.applicant-grid-answers');
  const messageCard = page.locator('.applicant-grid-message');
  const answerBox = await answerCard.boundingBox();
  const messageBox = await messageCard.boundingBox();
  expect(answerBox?.y).toBe(messageBox?.y);
  expect(answerBox?.height).toBe(messageBox?.height);
  await page.getByRole('button', { name: '더보기' }).click();
  await expect(page.getByRole('button', { name: '접기' })).toBeVisible();
  const expandedAnswerBox = await answerCard.boundingBox();
  const expandedMessageBox = await messageCard.boundingBox();
  expect(expandedAnswerBox?.y).toBe(expandedMessageBox?.y);
  expect(expandedAnswerBox?.height).toBe(expandedMessageBox?.height);
});

test('데스크톱 수강 인증 화면과 프로필 이미지 입력을 표시한다', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await login(page);
  await page.goto('/learn/notion');
  await expect(page.getByRole('heading', { name: '신청 정보를 확인하면 바로 이어서 볼 수 있어요.' })).toBeVisible();
  await expect(page.getByRole('button', { name: '인증번호 받기' })).toBeVisible();

  await page.goto('/settings');
  const profileInput = page.locator('.profile-setting-actions input[type="file"]');
  await expect(profileInput).toHaveCount(1);
  await expect(page.getByText('사진 추가', { exact: true })).toBeVisible();
  await profileInput.setInputFiles({
    name: 'profile.png',
    mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z7n0AAAAASUVORK5CYII=', 'base64'),
  });
  await expect(page.locator('.profile-setting-avatar img')).toBeVisible();
  await expect(page.locator('.oc-user > span img')).toBeVisible();
  await page.getByRole('button', { name: '프로필 사진 삭제' }).click();
  await expect(page.locator('.profile-setting-avatar img')).toHaveCount(0);
  await expect(page.locator('.profile-setting-avatar')).toContainText('지');
});

test('데스크톱 알림 팝오버에서 연관 화면으로 이동한다', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await login(page);
  await page.getByRole('button', { name: '알림', exact: true }).click();
  const popover = page.getByRole('dialog', { name: '알림', exact: true });
  await expect(popover.getByRole('heading', { name: '오늘', exact: true })).toBeVisible();
  await expect(popover.getByRole('heading', { name: '어제', exact: true })).toBeVisible();
  await popover.getByRole('link', { name: /새로운 신청/ }).click();
  await expect(page).toHaveURL('/applicants/1');
  await expect(page.locator('.applicant-detail-web')).toContainText('김서연');
});

test('온라인 클래스의 설문·수료증 관리 흐름을 처리한다', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await login(page);

  await page.goto('/classes/notion/survey');
  await page.getByRole('button', { name: '새 항목 만들기' }).click();
  const createDialog = page.locator('.ui-dialog[open]');
  await createDialog.locator('select').selectOption('시험');
  await createDialog.getByLabel('제목').fill('4주차 최종 퀴즈');
  await createDialog.getByRole('button', { name: '생성' }).click();
  await expect(page.getByRole('heading', { name: '4주차 최종 퀴즈' })).toBeVisible();

  await makeMockCertificatesEligible(page);
  await page.goto('/classes/notion/certificates');
  const certificateTargets = page.locator('.certificate-targets');
  const candidateRows = certificateTargets.locator('.certificate-candidate-row');

  await page.getByRole('button', { name: '발급 설정' }).click();
  const settingsDialog = page.locator('.certificate-editor-dialog[open]');
  await expect(settingsDialog).toBeVisible();
  await settingsDialog.getByLabel('발급 기관').fill('원클릭 클래스 교육원');
  await settingsDialog.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByText('수료증 설정을 저장했어요')).toBeVisible();
  await page.getByRole('button', { name: '발급 설정' }).click();
  await expect(settingsDialog.getByLabel('발급 기관')).toHaveValue('원클릭 클래스 교육원');
  await settingsDialog.getByRole('button', { name: '취소' }).click();

  await expect(candidateRows).toHaveCount(2);
  await candidateRows.first().getByRole('button', { name: '개별 발급' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '1명 발급', exact: true }).click();
  await expect(
    certificateTargets.getByRole('tab', { name: '발급 완료 1' }),
  ).toBeVisible();
  await certificateTargets.getByRole('tab', { name: '발급 가능 1' }).click();
  await expect(candidateRows).toHaveCount(1);
  await candidateRows.first().getByRole('checkbox').check();
  await certificateTargets.getByRole('button', { name: '선택 1명 발급' }).click();
  await page.getByRole('dialog').getByRole('button', { name: '1명 발급', exact: true }).click();
  await expect(
    certificateTargets.getByRole('tab', { name: '발급 완료 2' }),
  ).toBeVisible();

  await certificateTargets.getByRole('tab', { name: '발급 완료 2' }).click();
  await page.route('**/certificates/*/pdf', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 200));
    await route.fulfill({
      contentType: 'application/pdf',
      body: Buffer.from('%PDF-1.4 test certificate'),
    });
  });
  const download = page.waitForEvent('download');
  await candidateRows.first().getByRole('button', { name: 'PDF 다운로드' }).click();
  await expect(candidateRows.first().getByRole('button')).toHaveText('다운로드 중...');
  await expect(await download).toBeTruthy();
  await expect(page.getByText(/수료증 PDF를 저장했어요/)).toBeVisible();

  await page.unroute('**/certificates/*/pdf');
  await page.route('**/certificates/*/pdf', (route) => route.abort());
  await candidateRows.last().getByRole('button', { name: 'PDF 다운로드' }).click();
  await expect(page.getByText('수료증 PDF를 다운로드하지 못했어요')).toBeVisible();
});

test('모바일 수료증이 데스크톱과 같은 발급 상태를 사용한다', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await login(page);
  await makeMockCertificatesEligible(page);
  await page.goto('/classes/notion/certificates');
  const mobileCertificate = page.locator('.original-operations');
  const pendingRows = mobileCertificate.locator('.check-row:not(:disabled)');
  await expect(pendingRows).toHaveCount(2);
  await pendingRows.first().click();
  await expect(mobileCertificate.locator('.cert-issue-stats')).toContainText('발급 가능1명');
  await expect(mobileCertificate.locator('.cert-issue-stats')).toContainText('발급 완료1명');
  await page.reload();
  await expect(mobileCertificate.locator('.cert-issue-stats')).toContainText('발급 완료1명');
});

test('데스크톱 온라인 클래스에는 참가비 설정만 표시한다', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await login(page);
  await page.goto('/classes/new');
  await page.getByRole('button', { name: /^온라인 / }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '자료 없이 직접 작성하기', exact: true }).click();
  await page.getByLabel(/클래스 제목/).fill('온라인 설정 테스트');
  await page
    .getByLabel(/클래스 소개/)
    .fill('온라인 클래스의 세부 설정 항목을 확인하는 소개입니다.');
  await page
    .getByPlaceholder('클래스에서 배우는 내용을 자유롭게 적어 주세요.')
    .fill('온라인 클래스에서 꼭 필요한 참가비 설정만 노출되는지 확인합니다.');
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await expect(page.getByLabel('참가비', { exact: true })).toBeVisible();
  await expect(page.getByLabel('참가인원', { exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '클래스 장소' })).toHaveCount(0);
});
