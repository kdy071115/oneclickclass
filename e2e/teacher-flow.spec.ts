import { expect, test } from '@playwright/test';

const baseUrl = process.env.E2E_BASE_URL ?? 'http://127.0.0.1:4173';

async function completeOnlineClass(
  page: import('@playwright/test').Page,
  title: string,
  youtube = false,
) {
  await page.goto(`${baseUrl}/classes/new`);
  await page.getByRole('button', { name: /^온라인 / }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  if (youtube) {
    await page.getByLabel('YouTube URL', { exact: true }).fill('https://youtu.be/M7lc1UVf-VE');
    await page.getByRole('button', { name: '영상 불러오기', exact: true }).click();
    await page.getByRole('button', { name: '이 자료로 클래스 정보 만들기', exact: true }).click();
    await expect(page.getByText('클래스 정보 초안을 준비했어요')).toBeVisible();
  } else {
    await page.getByRole('button', { name: '자료 없이 직접 작성하기', exact: true }).click();
  }
  await page.getByLabel(/클래스 제목/).fill(title);
  await page
    .getByLabel(/클래스 소개/)
    .fill('핵심 개념부터 실제 결과물 완성까지 차근차근 배우는 클래스입니다.');
  await page
    .getByPlaceholder('클래스에서 배우는 내용을 자유롭게 적어 주세요.')
    .fill(
      '처음 시작하는 학습자를 위해 꼭 필요한 개념을 실습 중심으로 설명하고 결과물을 완성합니다.',
    );
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await expect(page.getByRole('progressbar', { name: '클래스 만들기 진행률' })).toHaveAttribute(
    'aria-valuenow',
    '75',
  );
  await expect(page.getByRole('button', { name: '데스크톱', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '모바일', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '클래스 게시', exact: true }).click();
  const publishDialog = page.getByRole('dialog', { name: '클래스를 게시할까요?' });
  await expect(publishDialog).toBeVisible();
  await publishDialog.getByRole('button', { name: '클래스 게시', exact: true }).click();
  await expect(page.getByRole('heading', { name: '클래스가 완성되었습니다!' })).toBeVisible();
  return page.getByLabel('클래스 링크').inputValue();
}

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

test('새 클래스를 만들면 완료 링크를 바로 공유할 수 있다', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  const publicUrl = await completeOnlineClass(page, '신규 클래스 흐름 테스트');
  await expect(page.getByLabel('클래스 링크')).toHaveValue(publicUrl);
  await page.getByRole('button', { name: '클래스 보러가기', exact: true }).click();
  await expect(page.getByRole('heading', { name: '신규 클래스 흐름 테스트' })).toBeVisible();
});

test('YouTube 차시를 공개하고 수강생이 강의실까지 입장한다', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  const publicUrl = await completeOnlineClass(page, 'YouTube 공개 흐름 테스트', true);
  const classId = publicUrl.split('/').pop();
  await page.goto(`${baseUrl}/classes/${classId}/curriculum?setup=1`);

  await page.getByLabel('새 섹션').fill('첫 번째 과정');
  await page.getByRole('button', { name: '섹션 추가' }).click();
  await page.getByRole('button', { name: '차시 추가' }).click();
  await page.getByLabel('차시 제목').fill('YouTube 첫 강의');
  await page.getByLabel('영상 URL').fill('youtube.com/watch?v=invalid');
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(
    page.getByText('http:// 또는 https://로 시작하는 전체 주소를 입력해 주세요.'),
  ).toBeVisible();
  await page.getByLabel('영상 URL').fill('https://youtu.be/M7lc1UVf-VE');
  await expect(page.locator('.content-source-status')).toHaveText('자동 확인 · YouTube 영상');
  await page.getByLabel('예상 학습 시간(분)').fill('15');
  await page.getByRole('switch', { name: '순차 학습 설정' }).click();
  await page.getByRole('switch', { name: '차시 공개 설정' }).click();
  await page.getByRole('button', { name: '저장', exact: true }).click();
  await expect(page.getByText('영상 · 15분 · 필수 · 순차 학습')).toBeVisible();

  await page.getByRole('link', { name: '신청 페이지 미리보기' }).click();
  const publishButton = page.getByRole('button', { name: '공개하고 링크 복사' });
  await expect(publishButton).toBeEnabled();
  await publishButton.click();
  await expect(page).toHaveURL(/\/classes\/published\?shareToken=/);
  await page.getByRole('link', { name: '신청 페이지 열기' }).click();
  await expect(page.getByRole('heading', { name: 'YouTube 공개 흐름 테스트' })).toBeVisible();
  await expect(page.getByRole('article').filter({ hasText: 'YouTube 첫 강의' })).toBeVisible();

  await page.getByPlaceholder('이름을 입력하세요').fill('연결 테스트 수강생');
  await page.getByPlaceholder('010-0000-0000').fill('010-1234-5678');
  await page.getByRole('checkbox', { name: /개인정보 수집/ }).check();
  await page.getByRole('button', { name: '휴대전화 확인하기' }).click();
  const verificationHint = await page.getByText(/테스트 인증번호는/).textContent();
  await page.getByPlaceholder('6자리 인증번호').fill(verificationHint?.match(/\d{6}/)?.[0] ?? '');
  await page.getByRole('button', { name: '신청하고 바로 입장' }).click();
  await expect(page.getByRole('heading', { name: '신청이 완료됐어요.' })).toBeVisible();
  await page.getByRole('button', { name: '강의실 입장하기' }).click();
  await expect(page).toHaveURL(/\/learn\/[^/]+$/);
  await expect(page.getByRole('heading', { name: 'YouTube 첫 강의' })).toBeVisible();
  await expect(page.getByRole('button', { name: /1 YouTube 첫 강의 예상 15분/ })).toBeVisible();
  await expect(page.locator('.youtube-player')).toBeVisible();
  await expect(page.getByText('콘텐츠 준비 중')).toHaveCount(0);
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
    const destinationLink = page
      .locator('.oc-detail-tabs')
      .getByRole('link', { name: label, exact: true });
    await expect(destinationLink).toHaveAttribute('href', path);
    await destinationLink.evaluate((element: HTMLAnchorElement) => element.click());
    await expect(page).toHaveURL(`${baseUrl}${path}`);
    const overviewLink = page
      .locator('.oc-detail-tabs')
      .getByRole('link', { name: '개요', exact: true });
    await expect(overviewLink).toBeVisible();
    await overviewLink.evaluate((element: HTMLAnchorElement) => element.click());
    await expect(page).toHaveURL(`${baseUrl}/classes/notion`);
  }

  await page
    .locator('.oc-detail-actions')
    .getByRole('link', { name: '강의 수정', exact: true })
    .click();
  await expect(page).toHaveURL(`${baseUrl}/classes/new?edit=notion`);
  await expect(
    page.getByRole('heading', { name: '어떤 방식으로 클래스를 진행하시나요?' }),
  ).toBeVisible();
  await page.getByRole('button', { name: '다음', exact: true }).click();
  await expect(page.getByRole('heading', { name: '클래스 정보를 준비해 볼까요?' })).toBeVisible();
  await expect(page.getByLabel('클래스 제목')).toHaveValue('노션으로 시작하는 업무 자동화');
  await expect(page.getByLabel('클래스 소개')).toHaveValue('반복 업무를 자동화하는 실전 4주 과정');
  await page.goto(`${baseUrl}/classes/notion`);

  await page.getByRole('link', { name: '신청 페이지', exact: true }).click();
  await expect(page).toHaveURL(`${baseUrl}/s/notion-auto`);
  await expect(page.getByRole('heading', { name: '노션으로 시작하는 업무 자동화' })).toBeVisible();
  expect(pageErrors).toEqual([]);
});

test('강의자 전역 메뉴에서 수강생용 수료증 화면을 노출하지 않는다', async ({ page }) => {
  await page.goto(`${baseUrl}/dashboard`);
  await expect(page.locator('.oc-side-nav').getByRole('link', { name: '수료증' })).toHaveCount(0);
  await expect(page.getByRole('link', { name: '받은 수료증' })).toHaveCount(0);

  await page.goto(`${baseUrl}/my/certificates`);
  await expect(page.getByRole('heading', { name: '404' })).toBeVisible();

  await page.goto(`${baseUrl}/classes/notion/certificates`);
  await expect(page.getByRole('heading', { name: '수료증 관리' })).toBeVisible();

  await page.goto(`${baseUrl}/classes/notion/certificates/setup`);
  await expect(page).toHaveURL(`${baseUrl}/classes/notion/certificates`);
  await expect(page.getByRole('heading', { name: '수료증 관리' })).toBeVisible();
});

test('넓은 화면에서도 대시보드 KPI 카드 레이아웃을 유지한다', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.setViewportSize({ width: 1920, height: 900 });
  await page.goto(`${baseUrl}/dashboard`);

  await expect(page.locator('.oc-kpi-card')).toHaveCount(4);
  const layout = await page.locator('.oc-kpi-grid').evaluate((element) => {
    const card = element.querySelector('.oc-kpi-card');
    return {
      gridDisplay: getComputedStyle(element).display,
      gridWidth: element.getBoundingClientRect().width,
      cardDisplay: card ? getComputedStyle(card).display : '',
      cardWidth: card?.getBoundingClientRect().width ?? 0,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });

  expect(layout.gridDisplay).toBe('grid');
  expect(layout.cardDisplay).toBe('flex');
  expect(layout.gridWidth).toBeGreaterThan(0);
  expect(layout.cardWidth).toBeGreaterThan(250);
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewportWidth);
});

test('강의자 운영 화면의 주요 액션이 실제 상태를 바꾼다', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop');
  await page.setViewportSize({ width: 1440, height: 900 });

  await page.goto(`${baseUrl}/classes/notion/applicants`);
  await expect(page.locator('.operation-table .oc-table-row')).toHaveCount(2);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '신청자 내보내기' }).click();
  await expect(await download).toBeTruthy();
  await page.locator('.operation-table .oc-table-row').first().click();
  await expect(page).toHaveURL(`${baseUrl}/applicants/1?classId=notion`);

  await page.goto(`${baseUrl}/classes/notion`);
  await expect(page.locator('.oc-detail-tabs').getByRole('link', { name: '출석/QR' })).toHaveCount(
    0,
  );

  await page.goto(`${baseUrl}/classes/notion/survey`);
  await expect(page.locator('.survey-card')).toHaveCount(4);
  await page.getByRole('button', { name: '새 항목 만들기' }).click();
  await page.getByLabel('제목').fill('수강 종료 설문');
  await page.getByRole('button', { name: '생성', exact: true }).click();
  await expect(page.getByRole('heading', { name: '수강 종료 설문' })).toBeVisible();

  await page.evaluate(() => {
    localStorage.setItem(
      'oneclick.certificate-policy.notion',
      JSON.stringify({
        minProgress: 0,
        requireRequiredLessons: false,
      }),
    );
  });
  await page.goto(`${baseUrl}/classes/notion/certificates`);
  await expect(page.locator('.certificate-candidate-row')).toHaveCount(2);
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
  await expect(page.getByText('공개하려면 제출 안내 URL을 입력해 주세요.')).toBeVisible();
  await page
    .getByLabel('제출 안내 URL', { exact: true })
    .fill('https://example.com/assignments/final');
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
