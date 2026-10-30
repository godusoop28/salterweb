/**
 * Captura las pantallas principales del prototipo en escritorio y móvil.
 * Uso: con la app corriendo (npm run dev), ejecutar `npm run previews`.
 * Usa el navegador Microsoft Edge o Google Chrome instalado (playwright-core, sin descargas).
 */
import { chromium } from "playwright-core";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const OUT = path.resolve("previews");
const only = process.argv.slice(2);

const desktop = [
  ["01-bienvenida", "/"],
  ["02-login", "/login"],
  ["03-dashboard", "/dashboard"],
  ["04-paquetes", "/paquetes"],
  ["05-paquetes-vista-rapida", "/paquetes", "quickview"],
  ["06-nuevo-paquete", "/paquetes?nuevo=1"],
  ["07-detalle-paquete", "/paquetes/SAL-001200"],
  ["08-repartidores", "/repartidores"],
  ["09-remitentes", "/remitentes"],
  ["10-incidencias", "/incidencias"],
  ["11-reportes", "/reportes"],
  ["12-usuarios", "/usuarios"],
  ["13-configuracion", "/configuracion"],
  ["14-rastreo", "/rastreo?guia=SAL-001230"],
  ["15-portal-remitente", "/portal"],
  ["16-mis-envios", "/mis-envios"],
  ["17-nuevo-envio", "/nuevo-envio"],
  ["18-app-repartidor-escritorio", "/entregas"],
];

const mobile = [
  ["m01-dashboard", "/dashboard"],
  ["m02-repartidor-entregas", "/entregas"],
  ["m03-repartidor-ruta", "/ruta"],
  ["m04-repartidor-detalle", "/entregas", "first-delivery"],
  ["m05-repartidor-evidencia", "/entregas", "evidence"],
  ["m06-repartidor-historial", "/historial"],
  ["m07-rastreo", "/rastreo?guia=SAL-001230"],
  ["m08-paquetes", "/paquetes"],
  ["m09-portal-remitente", "/portal"],
  ["m10-login", "/login"],
];

async function launch() {
  for (const channel of ["msedge", "chrome"]) {
    try {
      return await chromium.launch({ channel });
    } catch {
      // probar siguiente navegador
    }
  }
  throw new Error("No se encontró Microsoft Edge ni Google Chrome instalados.");
}

async function run() {
  await mkdir(path.join(OUT, "escritorio"), { recursive: true });
  await mkdir(path.join(OUT, "movil"), { recursive: true });
  const browser = await launch();

  const shoot = async (ctxOpts, list, folder) => {
    const ctx = await browser.newContext({ ...ctxOpts, locale: "es-MX", timezoneId: "America/Mexico_City" });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    for (const [name, url, action] of list) {
      if (only.length && !only.some((o) => name.includes(o))) continue;
      await page.goto(BASE + url, { waitUntil: "networkidle" });
      await page.waitForTimeout(900);
      if (action === "quickview") {
        await page.locator("tbody tr").first().click();
        await page.waitForTimeout(600);
      }
      if (action === "first-delivery" || action === "evidence") {
        await page.locator("a[href^='/entregas/']").first().click();
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(700);
        if (action === "evidence") {
          await page.locator("a[href$='/evidencia']").first().click();
          await page.waitForLoadState("networkidle");
          await page.waitForTimeout(700);
          const canvas = page.locator("canvas").first();
          const box = await canvas.boundingBox();
          if (box) {
            await page.mouse.move(box.x + 30, box.y + box.height * 0.6);
            await page.mouse.down();
            for (let i = 0; i <= 24; i++) {
              await page.mouse.move(box.x + 30 + i * ((box.width - 60) / 24), box.y + box.height * (0.55 + 0.22 * Math.sin(i / 2.2)));
            }
            await page.mouse.up();
          }
        }
      }
      const file = path.join(OUT, folder, `${name}.png`);
      await page.screenshot({ path: file, fullPage: folder === "escritorio" && !["02-login", "01-bienvenida", "18-app-repartidor-escritorio"].includes(name) });
      console.log("✓", folder, name);
    }
    if (errors.length) console.log("Errores de consola:", [...new Set(errors)]);
    await ctx.close();
  };

  await shoot({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, desktop, "escritorio");
  await shoot({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }, mobile, "movil");
  await browser.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
