import { test } from "@playwright/test";
import { DmsPage } from "../pages/DmsPage";

test("DMS Product Selection check for multiple brands", async ({ page }) => {
  // 🕒 Ubah timeout total test jadi 3 menit
  test.setTimeout(180000);

  const dms = new DmsPage(page);

  // 🔐 LOGIN
  await dms.login("241036", "ivanG4nteng");

  // 📦 Daftar brand dan slug-nya
  const brands = [
    { name: "Frank & Co.", slug: "frankandcojewellery" },
    { name: "The Palace", slug: "thepalacejeweler" },
    // { name: "Mondial", slug: "mondialjeweler" },
  ];

  // 🔁 Loop setiap brand
  for (const brand of brands) {
    console.log(
      `\n==================== ${brand.name.toUpperCase()} ====================`
    );
    await dms.selectBrand(brand.name);
    await dms.openProductSelections();

    // 🟩 Klik tombol filter "Published" sebelum cek data
    const publishedButton = page.locator(
      "div.p-1.px-2.rounded-lg.min-w-12.text-center.flex.justify-center.items-center.cursor-pointer.font-normal.text-sm.bg-primary.text-white"
    );

    console.log("🟩 Clicking Published filter...");
    await publishedButton.waitFor({ state: "visible", timeout: 10000 });
    await publishedButton.click();
    console.log("✅ Published filter applied!");

    // 🔍 Jalankan pengecekan slug dan URL
    await dms.checkAllProductUrls(5, brand.slug);

    // ⏳ Tambahkan jeda agar stabil sebelum lanjut ke brand berikutnya
    await page.waitForTimeout(2000);
  }

  console.log("🎉 All brand checks completed successfully!");
});
