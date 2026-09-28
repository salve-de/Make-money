
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

  await expect(page.getByTestId("discover-detail")).toContainText("事業の説明・分析");
  await expect(page.getByTestId("discover-detail")).toContainText("事業の要点");
  await expect(page.getByTestId("discover-detail")).toContainText("数値の出典・対象時期");

  await page.getByRole("button", { name: "初期資金", exact: true }).click();
  await expect(rows).toHaveCount(initialCount);

  await rows.nth(1).click();
  await expect(page.getByTestId("discover-detail")).toContainText("支払理由の分析");

  const search = page.getByPlaceholder("事例名・業種・収益の仕組みで検索");
  await search.fill("no-match-discovery-smoke-zzzz");
  await expect(list).toContainText("一致する事例がありません。");
  await page.getByRole("button", { name: "検索を解除", exact: true }).click();
  await expect(rows).toHaveCount(initialCount);

  expect(errors).toEqual([]);
});
