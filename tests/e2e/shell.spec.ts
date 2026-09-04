import { expect, test } from "@playwright/test";

test("login shell renders", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Officer Login" })).toBeVisible();
  await expect(page.getByText("Members present their permanent QR.")).toBeVisible();
});
