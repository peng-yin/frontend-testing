import { expect, test } from "./coverage-fixture";

test("loads and refreshes a user profile", async ({ page }) => {
  let requestCount = 0;

  await page.route("**/api/users/42", async (route) => {
    requestCount += 1;
    await route.fulfill({
      json: {
        id: "42",
        name: requestCount === 1 ? "Ada Lovelace" : "Grace Hopper",
        role: "Test Architect",
      },
    });
  });

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Ada Lovelace" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Refresh" }).click();

  await expect(
    page.getByRole("heading", { name: "Grace Hopper" }),
  ).toBeVisible();
  expect(requestCount).toBe(2);
});
