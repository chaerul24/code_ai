import chalk from "chalk";
import * as cheerio from "cheerio";

// ===============================
// 🔍 SCRAPE ABSTRACT
// ===============================
const scrapeAbstract = async (url) => {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0"
      }
    });

    const html = await res.text();
    const $ = cheerio.load(html);

    // 🔥 selector umum (Semantic Scholar page)
    const abstract =
      $("meta[name='description']").attr("content") ||
      $("meta[property='og:description']").attr("content") ||
      $("p").first().text();

    return abstract?.slice(0, 300) || "Abstract tidak tersedia";
  } catch {
    return "Gagal ambil abstract";
  }
};


export const searchJournal = async (query, { startLoading, stopLoading, log }) => {
  try {
    startLoading();

    const res = await fetch(
      `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=5&fields=title,authors,year,url`
    );

    const data = await res.json();
    stopLoading();

    if (!data.data || data.data.length === 0) {
      log("INFO", "Jurnal tidak ditemukan");
      return;
    }

    console.log("\n📚 Hasil Jurnal + Abstract:\n");

    for (let i = 0; i < data.data.length; i++) {
      const paper = data.data[i];

      console.log(chalk.yellow(`${i + 1}. ${paper.title}`));

      const authors = paper.authors?.map(a => a.name).join(", ") || "Unknown";

      console.log(chalk.gray(`   👤 ${authors} (${paper.year || "-"})`));
      console.log(chalk.cyan(`   🔗 ${paper.url}`));

      // 🔥 scrape abstract
      const abstract = await scrapeAbstract(paper.url);

      console.log(chalk.white(`   🧠 ${abstract}\n`));
    }

  } catch (err) {
    stopLoading();
    log("ERROR", "Gagal mencari jurnal");
  }
};