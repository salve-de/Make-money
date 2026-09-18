
import { expect, test } from "@playwright/test";

test("standalone discover page delivers value without requiring setup", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));

  await page.goto("/discover", { waitUntil: "networkidle" });

  await expect(
    page.getByRole("heading", { level: 1, name: "金を作った「決定的な一手」だけ。" }),
  ).toBeVisible();

  const list = page.getByTestId("discover-list");
  const rows = list.getByRole("button");
  const initialCount = await rows.count();
  expect(initialCount).toBeGreaterThan(5);

  await expect(page.getByTestId("discover-detail")).toContainText("THE CRITICAL MOVE");
  await expect(page.getByTestId("discover-detail")).toContainText("こいつだけ？");
  await expect(page.getByTestId("discover-detail")).toContainText("今も使える？");

  await page.getByRole("button", { name: "少資本", exact: true }).click();
  await expect(rows).toHaveCount(initialCount);

  await rows.nth(1).click();
  await expect(page.getByTestId("discover-detail")).toContainText("なぜ金が動いた？");

  const search = page.getByPlaceholder("人物・急所・金の取り方を検索");
  await search.fill("no-match-discovery-smoke-zzzz");
  await expect(list).toContainText("一致する事例がありません。");
  await page.getByRole("button", { name: "検索を解除", exact: true }).click();
  await expect(rows).toHaveCount(initialCount);

  expect(errors).toEqual([]);
});
