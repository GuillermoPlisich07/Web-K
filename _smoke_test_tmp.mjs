import { chromium } from "playwright-core";

const BASE = "http://localhost:3000";
const shotDir = "/tmp/claude-1000/-mnt-c-Users-f283592-Desktop-Guillermo-KONVERZA/3d059ef7-c1ef-4e8b-8098-47590e5335a6/scratchpad/shots";
import fs from "fs";
fs.mkdirSync(shotDir, { recursive: true });

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const errors = [];
const results = [];

function log(step, ok, detail) {
  results.push({ step, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} — ${step}${detail ? ": " + detail : ""}`);
}

async function shot(page, name) {
  await page.screenshot({ path: `${shotDir}/${name}.png` });
}

async function login(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "load", timeout: 15000 });
  await page.fill('#login-email', email);
  await page.fill('#login-password', password);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);
}

const page = await browser.newPage();
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});

try {
  // Step 1: admin login, expect gate (existing seeded users now have profileCompleted=false)
  await login(page, "admin@konverza.com", "Konverza-Admin-2026!");
  await shot(page, "01-after-admin-login");
  const gateVisible = await page.locator("text=Completá tu perfil").isVisible().catch(() => false);
  log("Admin login shows profile gate (pre-existing seeded user, profileCompleted defaulted false)", gateVisible);

  if (gateVisible) {
    await page.fill("#gate-age", "35");
    await page.fill("#gate-personality", "Analitico y directo");
    await page.fill("#gate-self-description", "Administrador de la plataforma Konverza");
    await page.click('button:has-text("Continuar")');
    await page.waitForTimeout(1500);
    await shot(page, "02-after-gate-submit");
    const sidebarVisible = await page.locator("text=Konverza").first().isVisible().catch(() => false);
    log("After submitting gate, normal app chrome appears without re-login", sidebarVisible);
  }

  // Step 2: /users screen
  await page.goto(`${BASE}/users`, { waitUntil: "load", timeout: 15000 });
  await page.waitForTimeout(1000);
  await shot(page, "03-users-screen-admin");
  const usersHeading = await page.locator("h2:has-text('Usuarios')").isVisible().catch(() => false);
  const newUserBtn = await page.locator("text=Nuevo usuario").isVisible().catch(() => false);
  log("/users shows real Usuarios screen (not placeholder)", usersHeading);
  log("/users shows + Nuevo usuario button for admin", newUserBtn);

  if (newUserBtn) {
    await page.click("text=Nuevo usuario");
    await page.waitForTimeout(300);
    const roleOptions = await page.locator("#user-form-role option").allTextContents();
    log("Role dropdown offers all 3 roles", roleOptions.length === 3, roleOptions.join(", "));
    await page.fill("#user-form-email", `smoketest-${Date.now()}@konverza.com`);
    await page.fill("#user-form-password", "Smoke-Test-Pass1!");
    await page.selectOption("#user-form-role", "EXEC");
    await shot(page, "04-create-user-form");
    await page.click('button:has-text("Guardar")');
    await page.waitForTimeout(1000);
    await shot(page, "05-after-create-user");
    const errorShown = await page.locator("text=No se pudo crear el usuario").isVisible().catch(() => false);
    log("Creating an EXEC-role user succeeds (no error)", !errorShown);
  }

  // Step 3: /company screen
  await page.goto(`${BASE}/company`, { waitUntil: "load", timeout: 15000 });
  await page.waitForTimeout(1000);
  await shot(page, "06-company-screen-create-mode");
  const createHeading = await page.locator("h3:has-text('Crear empresa')").isVisible().catch(() => false);
  log("/company shows 'Crear empresa' form (no record exists yet)", createHeading);

  if (createHeading) {
    await page.fill("#empresa-name", "Konverza SA (smoke test)");
    await page.fill("#empresa-context", "Empresa de entrenamiento de ventas con IA.");
    await page.click('button:has-text("Crear empresa")');
    await page.waitForTimeout(1000);
    await shot(page, "07-company-after-create");
    const editHeading = await page.locator("h3:has-text('Editar empresa')").isVisible().catch(() => false);
    log("After creating, screen switches to 'Editar empresa'", editHeading);
  }

  // Step 4: /settings
  await page.goto(`${BASE}/settings`, { waitUntil: "load", timeout: 15000 });
  await page.waitForTimeout(1000);
  await shot(page, "08-settings-screen");
  const ageVal = await page.locator("#settings-age").inputValue().catch(() => "");
  log("/settings prefills age from earlier gate submission", ageVal === "35", `got "${ageVal}"`);

  // Step 5: logout, then exec login
  await page.click('button:has-text("Sign out")').catch(async () => {
    // account menu might need opening first
    await page.locator("button", { hasText: /Admin|Executive|Employee/ }).first().click().catch(() => {});
    await page.click('button:has-text("Sign out")').catch(() => {});
  });
  await page.waitForTimeout(1000);

  await login(page, "exec@konverza.com", "Konverza-Exec-2026!");
  await shot(page, "09-after-exec-login");
  const execGateVisible = await page.locator("text=Completá tu perfil").isVisible().catch(() => false);
  log("Exec login shows profile gate too", execGateVisible);
  if (execGateVisible) {
    await page.fill("#gate-age", "45");
    await page.fill("#gate-personality", "Reservado, analitico");
    await page.fill("#gate-self-description", "Gerente de ventas, superviso al equipo");
    await page.click('button:has-text("Continuar")');
    await page.waitForTimeout(1000);
  }

  await page.goto(`${BASE}/users`, { waitUntil: "load", timeout: 15000 });
  await page.waitForTimeout(1000);
  await shot(page, "10-users-screen-exec");
  const execNewBtn = await page.locator("text=Nuevo usuario").isVisible().catch(() => false);
  const execEditLink = await page.locator("text=Editar").isVisible().catch(() => false);
  log("Autoridad sees /users with NO create/edit controls", !execNewBtn && !execEditLink);

  await page.goto(`${BASE}/company`, { waitUntil: "load", timeout: 15000 });
  await page.waitForTimeout(1000);
  await shot(page, "11-company-screen-exec");
  const execCreateForm = await page.locator("#empresa-name").isVisible().catch(() => false);
  const execCompanyName = await page.locator("text=Konverza SA (smoke test)").isVisible().catch(() => false);
  log("Autoridad sees /company read-only (no form, shows name as text)", !execCreateForm && execCompanyName);

} catch (e) {
  log("UNEXPECTED ERROR", false, String(e));
  await shot(page, "99-error-state");
}

console.log("\n--- Console errors captured ---");
console.log(errors.length ? errors.join("\n") : "(none)");

console.log("\n--- Summary ---");
const failed = results.filter((r) => !r.ok);
console.log(`${results.length - failed.length}/${results.length} checks passed`);

await browser.close();
process.exit(failed.length ? 1 : 0);
