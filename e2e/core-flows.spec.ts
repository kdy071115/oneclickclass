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
  expect((box?.width ?? 0) / (box?.height ?? 1)).toBeCloseTo(297 / 210, 2);
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
