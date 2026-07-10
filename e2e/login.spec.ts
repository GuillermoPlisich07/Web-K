import { test, expect } from "@playwright/test";

// Matches the demo seed user created by DataSeeder (spring-boot). Override
// via env vars if SEED_EMPLOYEE_PASSWORD was customized for this environment.
const EMAIL = process.env.E2E_EMPLOYEE_EMAIL ?? "vendedor@konverza.com";
const PASSWORD = process.env.E2E_EMPLOYEE_PASSWORD ?? "Konverza-Demo-2026!";

test.describe("login", () => {
  test("direct navigation to a protected route while logged out redirects to /login", async ({ page }) => {
    await page.goto("/scenarios");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("invalid credentials shows an error and does not navigate away", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(EMAIL);
    await page.getByLabel(/password/i).fill("definitely-wrong-password");
    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByRole("alert")).toBeVisible();
    await expect(page).toHaveURL(/\/login$/);
  });

  test("full flow: login -> protected route -> logout -> redirect to /login", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel(/email/i).fill(EMAIL);
    await page.getByLabel(/password/i).fill(PASSWORD);
    await page.getByRole("button", { name: /sign in/i }).click();

    // Successful login lands on a protected route (the dashboard).
    await expect(page).toHaveURL("/");
    await expect(page.getByText("Konverza")).toBeVisible();

    // Navigate to another protected route to confirm the session holds.
    await page.goto("/scenarios");
    await expect(page).toHaveURL(/\/scenarios$/);

    // Sign out via the account menu in the top bar.
    await page.getByRole("button", { name: /employee|admin|executive/i }).click();
    await page.getByRole("button", { name: /sign out/i }).click();

    await expect(page).toHaveURL(/\/login$/);

    // Session is fully cleared — going back to a protected route bounces to /login again.
    await page.goto("/scenarios");
    await expect(page).toHaveURL(/\/login$/);
  });
});
