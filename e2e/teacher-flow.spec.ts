import { expect, test } from '@playwright/test';

const baseUrl = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'oneclick.session',
      JSON.stringify({
        accessToken: 'teacher-e2e-token',
        refreshToken: 'teacher-e2e-refresh',
        user: { id: 'teacher-e2e', name: '김지훈', email: 'teacher@example.com', role: 'teacher' },
      }),
    );
  });
});

test('강의자 상세 화면과 핵심 운영 페이지를 빠짐없이 이동한다', async ({ page }) => {
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${baseUrl}/classes/notion`);

  await expect(page.getByRole('heading', { name: '노션으로 시작하는 업무 자동화' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('108명');
  await expect(page.locator('body')).not.toContainText('(128)');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );

  const shareWidths = await page
    .locator('.oc-share-buttons > *')
    .evaluateAll((elements) =>
      elements.map((element) => Math.round(element.getBoundingClientRect().width)),
    );
  expect(Math.max(...shareWidths) - Math.min(...shareWidths)).toBeLessThanOrEqual(2);

  const destinations = [
    ['신청자', '/classes/notion/applicants'],
    ['출석/QR', '/classes/notion/attendance'],
    ['설문·시험', '/classes/notion/survey'],
    ['수료증', '/classes/notion/certificates'],
    ['설정', '/classes/notion/manage'],
  ] as const;
  for (const [label, path] of destinations) {
    await page.locator('.oc-detail-tabs').getByRole('link', { name: label, exact: true }).click();
    await expect(page).toHaveURL(`${baseUrl}${path}`);
    const overviewLink = page
      .locator('.oc-detail-tabs')
      .getByRole('link', { name: '개요', exact: true });
    await expect(overviewLink).toBeVisible();
    await overviewLink.click();
    await expect(page).toHaveURL(`${baseUrl}/classes/notion`);
  }

  await page
    .locator('.oc-detail-actions')
    .getByRole('link', { name: '강의 수정', exact: true })
    .click();
  await expect(page).toHaveURL(`${baseUrl}/classes/new?edit=notion`);
  await expect(page.getByRole('heading', { name: '어떤 강의인지 알려주세요' })).toBeVisible();
  await page.goto(`${baseUrl}/classes/notion`);

  await page.getByRole('link', { name: '신청 페이지', exact: true }).click();
  await expect(page).toHaveURL(`${baseUrl}/s/notion-auto`);
  await expect(page.getByRole('heading', { name: '노션으로 시작하는 업무 자동화' })).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('강의자 운영 화면의 주요 액션이 실제 상태를 바꾼다', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto(`${baseUrl}/classes/notion/applicants`);
  await expect(page.locator('.operation-table .oc-table-row')).toHaveCount(2);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '신청자 내보내기' }).click();
  await expect(await download).toBeTruthy();
  await page.locator('.operation-table .oc-table-row').first().click();
  await expect(page).toHaveURL(`${baseUrl}/applicants/1?classId=notion`);

  await page.goto(`${baseUrl}/classes/calligraphy/attendance`);
  await expect(page.getByAltText('출석 QR 코드')).toBeVisible();
  const firstAttendance = page.locator('.attendance-edit-row').first();
  await expect(firstAttendance).toContainText('출석');
  await firstAttendance.click();
  await expect(firstAttendance).toContainText('지각');
  await page.getByRole('button', { name: 'QR 새로고침' }).click();
  await expect(page.getByText('QR 코드를 새로 발급했어요')).toBeVisible();

  await page.goto(`${baseUrl}/classes/notion/survey`);
  await expect(page.locator('.survey-card')).toHaveCount(4);
  await page.getByRole('button', { name: '새 항목 만들기' }).click();
  await page.getByLabel('제목').fill('수강 종료 설문');
  await page.getByRole('button', { name: '생성', exact: true }).click();
  await expect(page.getByRole('heading', { name: '수강 종료 설문' })).toBeVisible();

  await page.goto(`${baseUrl}/classes/notion/certificates`);
  await expect(page.locator('.certificate-target-row')).toHaveCount(2);
  await page.getByRole('button', { name: '발급 설정' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByText('수료증 설정을 저장했어요')).toBeVisible();

  await page.goto(`${baseUrl}/classes/notion/manage`);
  await page.getByRole('button', { name: '신청 페이지 비공개로 전환' }).click();
  await expect(page.getByText('비공개로 전환했어요')).toBeVisible();
  await page.getByRole('button', { name: '정원 늘리기' }).click();
  await expect(page.locator('.oc-settings-panel')).toContainText('35명');
});

test('커리큘럼에서 섹션과 차시를 추가하고 수정한 내용이 유지된다', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${baseUrl}/classes/notion`);
  await page.getByRole('link', { name: '강의 구성 수정' }).click();
  await expect(page).toHaveURL(`${baseUrl}/classes/notion/curriculum`);
  await expect(page.getByRole('heading', { name: '커리큘럼 관리' })).toBeVisible();
  await expect(page.locator('.curriculum-lesson-row')).toHaveCount(4);

  await page.getByLabel('새 섹션').fill('실전 프로젝트');
  await page.getByRole('button', { name: '섹션 추가' }).click();
  await expect(page.getByLabel('2번 섹션 이름')).toHaveValue('실전 프로젝트');

  await page
    .locator('.curriculum-section-card')
    .nth(1)
    .getByRole('button', { name: '차시 추가' })
    .click();
  await page.getByLabel('차시 제목').fill('자동화 프로젝트 완성');
  await page.getByLabel('콘텐츠 유형').selectOption('assignment');
  await page.getByLabel('예상 학습 시간(분)').fill('55');
  await page.getByRole('switch', { name: '차시 공개 설정' }).click();
  await page.getByRole('button', { name: '저장', exact: true }).click();

  const newLesson = page
    .locator('.curriculum-lesson-row')
    .filter({ hasText: '자동화 프로젝트 완성' });
  await expect(newLesson).toContainText('과제 · 55분');
  await expect(newLesson).toContainText('공개');
  await newLesson.getByRole('button', { name: '차시 수정' }).click();
  await page.getByLabel('차시 제목').fill('자동화 프로젝트 제출');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByText('자동화 프로젝트 제출', { exact: true })).toBeVisible();

  await page
    .locator('.curriculum-section-card')
    .nth(1)
    .getByRole('button', { name: '섹션 위로 이동' })
    .click();
  await expect(page.getByLabel('1번 섹션 이름')).toHaveValue('실전 프로젝트');

  await page.reload();
  await expect(page.getByText('자동화 프로젝트 제출', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: '클래스 상세로 돌아가기' }).click();
  await expect(page.getByText('자동화 프로젝트 제출', { exact: true })).toBeVisible();
  await page.goto(`${baseUrl}/classes/notion/curriculum`);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.getByRole('heading', { name: '커리큘럼 관리' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await expect(page.getByText('자동화 프로젝트 제출', { exact: true })).toBeVisible();
});

for (const viewport of [
  { width: 1280, height: 800 },
  { width: 1024, height: 768 },
]) {
  test(`${viewport.width}px 강의자 화면이 가로로 깨지지 않는다`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto(`${baseUrl}/classes/notion`);
    await expect(
      page.getByRole('heading', { name: '노션으로 시작하는 업무 자동화' }),
    ).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await expect(page.locator('.oc-share-buttons')).toBeVisible();
  });
}
