import { expect, test, type Page } from '@playwright/test';

const account = { email: 'e2e@oneclick.test', password: 'password' };

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel('이메일 아이디').fill(account.email);
  await page.getByLabel('비밀번호').fill(account.password);
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page).toHaveURL('/dashboard');
}

test('보호 라우트에서 로그인 후 대시보드로 진입한다', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL('/login');
  await page.getByLabel('이메일 아이디').fill(account.email);
  await page.getByLabel('비밀번호').fill(account.password);
  await page.getByRole('button', { name: '로그인', exact: true }).click();
  await expect(page).toHaveURL('/dashboard');
});

test('강의 생성 단계 검증과 정산 화면을 이동한다', async ({ page }) => {
  await login(page);
  await page.goto('/classes/new');
  const nextName = (page.viewportSize()?.width ?? 0) >= 900 ? '다음 단계' : '다음';
  await page.getByRole('button', { name: nextName, exact: true }).click();
  await page.getByRole('button', { name: nextName, exact: true }).click();
  await expect(page.locator('.form-error:visible')).toHaveText('강의 제목을 입력해 주세요.');
  await page.goto('/settlements');
  if ((page.viewportSize()?.width ?? 0) >= 900) {
    await expect(page.getByRole('button', { name: 'CSV 내보내기' })).toBeVisible();
    await expect(page.getByRole('button', { name: '계좌 설정', exact: true })).toBeVisible();
  } else {
    await expect(page.locator('.account-bank')).toBeVisible();
    await expect(page.getByText('정산 내역', { exact: true })).toBeVisible();
  }
});

test('비회원 신청 조회 폼을 검증한다', async ({ page }) => {
  await page.goto('/guest');
  await page.getByPlaceholder('신청 시 입력한 이메일').fill(account.email);
  await page.getByRole('button', { name: '코드 전송' }).click();
  await page.getByPlaceholder('6자리 인증코드').fill('123456');
  await page.getByRole('button', { name: '신청조회' }).click();
  await expect(page.getByText('노션으로 시작하는 업무 자동화')).toBeVisible();
});

test('신청자 상세와 수료증을 데스크톱에서 표시한다', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await login(page);
  await page.goto('/applicants/1');
  const detail = page.locator('.applicant-detail-web');
  await expect(detail.getByRole('heading', { name: '김서연', exact: true })).toBeVisible();
  await expect(detail.getByText('seoyeon@email.com', { exact: true })).toBeVisible();
  await expect(detail.getByRole('button', { name: '결제 확인', exact: true })).toBeVisible();

  await page.goto('/my/certificates/0');
  const certificate = page.locator('.oc-cert-page .certificate');
  await expect(certificate).toBeVisible();
  const box = await certificate.boundingBox();
  expect(box).not.toBeNull();
  expect((box?.width ?? 0) / (box?.height ?? 1)).toBeCloseTo(210 / 297, 2);
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

test('데스크톱 수강 화면과 프로필 이미지 입력을 표시한다', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await login(page);
  await page.goto('/learn/classes/notion');
  await expect(page.locator('.student-learning-hero')).toBeVisible();
  await expect(page.getByRole('button', { name: '2강 이어서 듣기' })).toBeVisible();
  await expect(page.locator('.preview-page')).toBeHidden();

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

test('클래스 출석·설문·수료증 관리 흐름을 처리한다', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await login(page);

  await page.goto('/classes/notion/attendance');
  await expect(page.locator('.oc-real-qr img')).toBeVisible();
  await page.getByLabel('회차 선택').selectOption('4');
  await expect(page.getByText('4주차', { exact: true })).toHaveCount(2);
  await page.getByRole('button', { name: /정하늘.*결석/ }).click();
  await expect(page.getByRole('button', { name: /정하늘.*출석/ })).toBeVisible();

  await page.goto('/classes/notion/survey');
  await page.getByRole('button', { name: '새 항목 만들기' }).click();
  const createDialog = page.locator('.ui-dialog[open]');
  await createDialog.locator('select').selectOption('시험');
  await createDialog.getByLabel('제목').fill('4주차 최종 퀴즈');
  await createDialog.getByRole('button', { name: '생성' }).click();
  await expect(page.getByRole('heading', { name: '4주차 최종 퀴즈' })).toBeVisible();

  await page.goto('/classes/notion/certificates');
  const certificateTargets = page.locator('.certificate-targets');
  const individualButtons = certificateTargets.getByRole('button', { name: '개별 발급' });
  await expect(individualButtons).toHaveCount(2);
  await individualButtons.first().click();
  await expect(certificateTargets.getByText('발급완료', { exact: true })).toHaveCount(2);
  await certificateTargets.getByRole('checkbox', { name: '박민지 선택' }).check();
  await certificateTargets.getByRole('button', { name: '선택 1명 발급' }).click();
  await expect(certificateTargets.getByText('발급완료', { exact: true })).toHaveCount(3);
});

test('모바일 수료증이 데스크톱과 같은 발급 상태를 사용한다', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile');
  await login(page);
  await page.goto('/classes/calligraphy/certificates');
  const mobileCertificate = page.locator('.original-operations');
  const pendingRows = mobileCertificate.locator('.check-row:not(:disabled)');
  await expect(pendingRows).toHaveCount(2);
  await pendingRows.first().click();
  await expect(mobileCertificate.locator('.cert-issue-stats')).toContainText('발급 대기1명');
  await expect(mobileCertificate.locator('.cert-issue-stats')).toContainText('발급 완료2명');
  await page.reload();
  await expect(mobileCertificate.locator('.cert-issue-stats')).toContainText('발급 완료2명');
});

test('데스크톱 강의 일정 캘린더에서 날짜를 선택한다', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await login(page);
  await page.goto('/classes/new');
  await page.getByRole('button', { name: '3 일정과 가격을 정해주세요', exact: true }).click();
  const scheduleButton = page.getByRole('button', { name: '강의 일정', exact: true });
  await scheduleButton.click();
  await expect(page.getByText('강의 일정을 골라주세요', { exact: true })).toBeVisible();
  const today = new Date();
  await page.getByRole('button', { name: String(today.getDate()), exact: true }).click();
  const selected = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  await expect(scheduleButton).toContainText(selected);
});
