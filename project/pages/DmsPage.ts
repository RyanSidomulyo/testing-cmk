import fs from "fs";
import path from "path";
import { Page } from "@playwright/test";

export class DmsPage {
  constructor(private page: Page) {}

  // 🔐 LOGIN
  async login(username: string, password: string) {
    console.log("🔐 Logging in...");
    await this.page.goto("https://staging-dms.intra.cmk.co.id/login", {
      waitUntil: "networkidle",
    });

    await this.page.getByPlaceholder("Input Username").fill(username);
    await this.page.getByPlaceholder("Input Password").fill(password);
    await this.page.getByRole("button", { name: "Login", exact: true }).click();

    await this.page.waitForLoadState("networkidle");
    await this.page.waitForTimeout(2000);
    console.log("✅ Login success!");
  }

  // 🏷️ PILIH BRAND
  async selectBrand(brandName: string) {
    console.log(`🏷 Selecting brand: ${brandName}...`);

    const dropdown = this.page.locator('img[alt="select brands"]');
    await dropdown.waitFor({ state: "visible", timeout: 10000 });
    await dropdown.click();

    const option = this.page.getByText(brandName, { exact: true });
    await option.waitFor({ state: "visible", timeout: 10000 });
    await option.click();

    console.log(`✅ Selected brand: ${brandName}`);
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForTimeout(2000);
  }

  // 📂 BUKA PRODUCT SELECTIONS
  async openProductSelections() {
    console.log("📂 Navigating to Product Selections...");

    const productSel = this.page
      .getByRole("button", { name: "Product Selections" })
      .first();

    try {
      await productSel.waitFor({ state: "visible", timeout: 5000 });
      await productSel.click();
      console.log("✅ Clicked Product Selections directly");
    } catch {
      console.log(
        "ℹ️ Product Selections not visible directly — trying fallback"
      );

      const dropdownIcon = this.page.locator(
        'img[alt="select brands"], button[aria-label="select brands"], button:has(svg)'
      );
      await dropdownIcon.first().waitFor({ state: "visible", timeout: 8000 });
      await dropdownIcon.first().click();

      await productSel.waitFor({ state: "visible", timeout: 10000 });
      await productSel.click();
      console.log("✅ Clicked Product Selections via dropdown");
    }

    console.log("⏳ Waiting for Product Selection list to load...");
    await this.page.waitForSelector("table", { timeout: 15000 });

    await this.page.waitForFunction(
      () =>
        document.querySelectorAll("button svg path[d*='M5 15H4']").length > 0,
      { timeout: 20000 }
    );

    console.log("✅ Product Selections page fully loaded (list detected)");

    // 🔹 Pastikan filter "Published" aktif
    console.log("🟩 Ensuring Published filter is applied...");

    const publishedBtn = this.page.locator(
      "div.cursor-pointer:has-text('Published')"
    );
    await publishedBtn.first().waitFor({ state: "visible", timeout: 10000 });

    // Deteksi apakah tombol sudah aktif (punya bg-primary)
    const isActive = await publishedBtn.first().evaluate((el) => {
      const cls = el.className;
      return cls.includes("bg-primary") || cls.includes("text-white");
    });

    if (!isActive) {
      console.log("🔘 Published filter not active — clicking...");
      await publishedBtn.first().click({ force: true });

      // 🔁 Tunggu sampai table refresh (tanda data terupdate)
      await this.page.waitForResponse(
        (resp) =>
          resp.url().includes("/product-selection") && resp.status() === 200,
        { timeout: 10000 }
      );

      // Tambahkan waktu tunggu ekstra agar render stabil
      await this.page.waitForTimeout(1500);
      console.log("✅ Published filter applied and table refreshed!");
    } else {
      console.log("ℹ️ Published filter already active");
    }
  }

  // 🔍 CEK SEMUA PRODUCT URL
  async checkAllProductUrls(limit = 5, brandSlug = "frankandcojewellery") {
    console.log(
      `🔍 Checking up to ${limit} product URLs for brand ${brandSlug}...`
    );

    const pathD =
      "M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1m-4 4h9a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2v-9a2 2 0 0 1 2-2Z";
    const copyButtons = this.page.locator(`button:has(svg path[d="${pathD}"])`);
    const total = Math.min(limit, await copyButtons.count());

    console.log(
      `🔹 Found ${await copyButtons.count()} copy buttons, testing ${total}...`
    );

    const reportDir = "reports";
    if (!fs.existsSync(reportDir)) fs.mkdirSync(reportDir);

    const reportPath = `${reportDir}/slug-report-${brandSlug}-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.txt`;

    fs.writeFileSync(
      reportPath,
      `🧾 SLUG URL REPORT — ${brandSlug} (${new Date().toLocaleString()})\n\n`
    );

    // cari kolom slug
    const firstRowCells = await this.page.$$eval(
      "table tbody tr:first-child td",
      (tds) => tds.map((td) => td.textContent?.trim() || "")
    );
    let slugColIndex =
      firstRowCells.findIndex((txt) => /^[a-z0-9-]+$/.test(txt)) + 1;
    if (slugColIndex === 0) slugColIndex = 4;

    console.log(`📊 Slug detected in column index: ${slugColIndex}`);

    for (let i = 0; i < total; i++) {
      console.log(`➡️  Checking product #${i + 1}...`);
      fs.appendFileSync(reportPath, `\n#${i + 1} `);

      const btn = copyButtons.nth(i);
      await btn.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(400);

      const svgPath = btn.locator(`svg path[d="${pathD}"]`);
      await svgPath.waitFor({ state: "visible", timeout: 8000 });

      const svgHandle = await svgPath.elementHandle();
      if (svgHandle) {
        await this.page.evaluate((el) => {
          el.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        }, svgHandle);
      }

      await this.page.waitForTimeout(400);

      let copiedUrl = "";
      try {
        copiedUrl = await this.page.evaluate(() =>
          navigator.clipboard.readText()
        );
      } catch {}

      if (!copiedUrl) {
        console.warn("⚠️ Clipboard empty — using table slug column...");
        copiedUrl = await btn.evaluate(
          (
            b: HTMLElement,
            args: { slugColIndex: number; brandSlug: string }
          ) => {
            const { slugColIndex, brandSlug } = args;
            const row = b.closest("tr");
            if (!row) return "";
            const slugCell = row.querySelector(`td:nth-child(${slugColIndex})`);
            const slug = slugCell?.textContent?.trim();
            if (!slug) return "";
            const cleanSlug = slug.toLowerCase().replace(/\s+/g, "-");
            return `https://staging.intra.${brandSlug}.com/selections/${cleanSlug}`;
          },
          { slugColIndex, brandSlug }
        );
      }

      if (!copiedUrl) {
        console.warn("⚠️ Still no URL, skipping...");
        fs.appendFileSync(reportPath, `⚠️ URL not found\n`);
        continue;
      }

      console.log(`📎 Copied URL: ${copiedUrl}`);
      fs.appendFileSync(reportPath, `📎 ${copiedUrl} `);

      // buka URL di tab baru
      const newPagePromise = this.page.context().waitForEvent("page");
      await this.page.evaluate((url) => window.open(url, "_blank"), copiedUrl);
      const newPage = await newPagePromise;

      await newPage.waitForLoadState("domcontentloaded");
      await newPage.waitForTimeout(1000);

      const fullText = await newPage.evaluate(
        () => document.body.innerText || ""
      );
      const normalized = fullText.toLowerCase();

      const isBroken =
        normalized.includes("404") ||
        normalized.includes("not found") ||
        normalized.includes("something went wrong") ||
        normalized.includes("an error occurred") ||
        normalized.includes("this page isn’t working");

      if (isBroken) {
        console.error(`❌ Broken Page Detected: ${copiedUrl}`);
        fs.appendFileSync(reportPath, `❌ BROKEN\n`);
        await newPage.screenshot({
          path: `${reportDir}/error-${brandSlug}-${i + 1}.png`,
        });
      } else {
        console.log(`✅ OK: ${copiedUrl}`);
        fs.appendFileSync(reportPath, `✅ OK\n`);
      }

      await newPage.close();
      await this.page.waitForTimeout(300);
    }

    const endTime = new Date().toLocaleString();
    fs.appendFileSync(reportPath, `\n✅ Completed at ${endTime}\n`);
    console.log(`📄 Report saved to ${reportPath}`);
  }
}
