// 슬라이드 원고의 cap-*.png 를 만든다. 결과 화면(AI 응답이 필요한 화면)은 만들지 않는다 — 실습 때 실제 결과로 캡처.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect, navigate } from 'file:///D:/projects/3in1/tests/e2e/fixtures.mjs';

const OUT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../images');
const shot = (page, name) => page.screenshot({ path: path.join(OUT, `${name}.png`) });

async function settings(page, id) {
  if (!await page.getByRole('dialog').isVisible()) await page.getByRole('button', { name: '설정', exact: true }).click();
  await page.locator(`.set-item[data-section="${id}"]`).click();
  const view = page.locator('.set-view:visible');
  await expect(view).toBeVisible();
  return view;
}

test('settings screens', async ({ page, app }) => {
  await app.open({ configured: false });
  await shot(page, 'cap-home');
  for (const [id, name] of [['refs', 'cap-settings-references'], ['criteria', 'cap-settings-criteria'], ['tamguGuide', 'cap-settings-tamgu-guide'],
    ['prompts', 'cap-settings-prompts'], ['records', 'cap-settings-records'], ['contact', 'cap-settings-contact'], ['ai', 'cap-settings-ai']]) {
    await settings(page, id);
    await page.waitForTimeout(400);
    await shot(page, name);
  }
  const view = await settings(page, 'rubric');
  await page.waitForTimeout(300);
  await shot(page, 'cap-settings-rubric');
  const tabs = view.getByRole('tab');
  const names = ['subject', 'autonomy', 'club', 'career', 'behavior'];
  for (let i = 0; i < Math.min(await tabs.count(), names.length); i++) {
    await tabs.nth(i).click();
    await page.waitForTimeout(300);
    await shot(page, `cap-rubric-${names[i]}`);
  }
});

test('input screens', async ({ page, app }) => {
  await app.open({ configured: false });
  await navigate(page, '탐구주제추천', '새 상담');
  await page.waitForTimeout(300);
  await shot(page, 'cap-tamgu-new');
  await page.getByRole('radio', { name: '창체 활동', exact: true }).click();
  await page.getByRole('radio', { name: '동아리활동', exact: true }).click();
  await page.getByRole('radio', { name: '엑셀 일괄 입력', exact: true }).click();
  await page.waitForTimeout(300);
  await shot(page, 'cap-tamgu-bulk');
  await navigate(page, '탐구주제추천', '창체 씨앗 카드 생성');
  await page.waitForTimeout(300);
  await shot(page, 'cap-tamgu-seed-prompt');

  await navigate(page, '열매세특', '열매카드 생성');
  await page.getByRole('radio', { name: '동아리', exact: true }).click();
  await page.locator('main input[type="text"]').fill('수리탐구반');
  await page.getByRole('button', { name: 'Google Forms 문항 프롬프트', exact: true }).click();
  await page.waitForTimeout(300);
  await shot(page, 'cap-saeteuk-card-prompt');
  await navigate(page, '열매세특', '세특 초안 작성');
  await page.waitForTimeout(300);
  await shot(page, 'cap-saeteuk-write');

  await navigate(page, '세특검토함', '개별 점검');
  await page.waitForTimeout(300);
  await shot(page, 'cap-checkr-individual');
  await navigate(page, '세특검토함', '일괄 점검(NEIS)');
  await page.waitForTimeout(300);
  await shot(page, 'cap-checkr-batch');
});
