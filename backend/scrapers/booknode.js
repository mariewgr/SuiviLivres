// scrapers/booknode.js
import axios from "axios";
import * as cheerio from "cheerio";

export async function searchBooknode(query) {
  const url = "https://booknode.com/recherche?q=" + encodeURIComponent(query);

  const { data } = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  const $ = cheerio.load(data);

  const results = [];

  $(".book-search-result").each((_, el) => {
    const title = $(el).find(".titre a").text().trim();
    const link = "https://booknode.com" + $(el).find(".titre a").attr("href");
    const author = $(el).find(".auteur").text().trim();
    const cover = $(el).find("img").attr("src");

    results.push({ title, author, link, cover });
  });

  return results;
}

export async function getBookDetails(url) {
  const { data } = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  const $ = cheerio.load(data);

  const title = $("h1[itemprop='name']").text().trim();
  const author = $("span[itemprop='author']").text().trim();
  const resume = $("#resume").text().trim();
  const cover = $(".bookcover img").attr("src");

  // --- Série ---
  let seriesTitle = null;
  let tome = null;

  const serieText = $(".serie").text().trim(); // ex: "Série : La passe-miroir, Tome 2"

  if (serieText) {
    const match = serieText.match(/(.+), Tome (\d+)/i);
    if (match) {
      seriesTitle = match[1].trim();
      tome = parseInt(match[2], 10);
    }
  }

  return {
    title,
    author,
    resume,
    cover,
    seriesTitle,
    tome,
  };
}

export async function getSeriesBooks(seriesName) {
  const url =
    "https://booknode.com/recherche?q=" + encodeURIComponent(seriesName);

  const { data } = await axios.get(url, {
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  const $ = cheerio.load(data);
  const list = [];

  $(".book-search-result").each((_, el) => {
    const titre = $(el).find(".titre a").text();
    if (titre.toLowerCase().includes(seriesName.toLowerCase())) {
      list.push({
        title: titre,
        link:
          "https://booknode.com" + $(el).find(".titre a").attr("href"),
      });
    }
  });

  return list;
}
