
import { expect, test } from "@playwright/test";

test("standalone discover page delivers value without requiring setup", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  const response = await page.goto("/discover", { waitUntil: "networkidle" });
  expect(await response?.text()).not.toContain('ent_mixo_84c7e1');

  await expect(
    page.getByRole("heading", { level: 1, name: "事例を探す" }),
  ).toBeVisible();

  const list = page.getByTestId("discover-list");
  const rows = list.getByRole("button");
  const initialCount = await rows.count();
  expect(initialCount).toBeGreaterThan(5);

  // 詳細は entity.reader だけを読む。reader は公開版にだけ入るので、E2E のサーバー（作業ツリーのデータ）では
  // 詳細は「準備中」になり、出典のない数字や文を出さない。選んだ行の名前が詳細の見出しに出る。
  const detail = page.getByTestId("discover-detail");
  await expect(detail.getByRole("heading", { level: 2 })).toBeVisible();
  await expect(detail).toContainText("この事例の詳細は準備中です。");
  await expect(detail).not.toContainText(/(?<![\d,.])0円/);

  await page.getByRole("button", { name: "少額で開始", exact: true }).click();
  await expect(rows).toHaveCount(initialCount);

  await rows.nth(1).click();
  const secondName = (await rows.nth(1).innerText()).split("\n")[0].trim();
  await expect(detail.getByRole("heading", { level: 2 })).toContainText(secondName);
  await expect(detail).toContainText("この事例について質問");

  const search = page.getByPlaceholder("事例名・業種・収益の仕組みで検索");
  await search.fill("no-match-discovery-smoke-zzzz");
  await expect(list).toContainText("一致する事例がありません。");
  await page.getByRole("button", { name: "検索を解除", exact: true }).click();
  await expect(rows).toHaveCount(initialCount);

  expect(errors).toEqual([]);
});
