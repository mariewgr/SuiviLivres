import { chromium } from "playwright";

/**
 * Extracts volume number from title and returns cleaned title
 * @param {string} title - Original book title
 * @returns {{cleanTitle: string, volume: number|null}} - Cleaned title and volume number
 */
export function extractVolumeFromTitle(title) {
  if (!title) return { cleanTitle: title, volume: -1 };

  // Patterns to match volume numbers
  const patterns = [
    /,?\s*Tome\s+(\d+)/i,           // "Tome 1", ", Tome 1"
    /,?\s*Volume\s+(\d+)/i,         // "Volume 1", ", Volume 1"
    /,?\s*Vol\.?\s+(\d+)/i,         // "Vol 1", "Vol. 1", ", Vol 1"
    /,?\s*T\.?\s+(\d+)/i,           // "T 1", "T. 1", ", T 1"
    /,?\s*#(\d+)/,                  // "#1", ", #1"
    /,?\s*-\s*(\d+)$/,              // "- 1" at the end
    /\((\d+)\)$/,                   // "(1)" at the end
    /,?\s*Livre\s+(\d+)/i,          // "Livre 1", ", Livre 1"
    /,?\s*Part\s+(\d+)/i,           // "Part 1", ", Part 1"
    /,?\s*Partie\s+(\d+)/i          // "Partie 1", ", Partie 1"
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      const volume = parseFloat(match[1]);
      const cleanTitle = title.replace(pattern, "").trim();
      // Remove trailing commas or colons
      const finalTitle = cleanTitle.replace(/[,:]\s*$/, "").trim();
      return { cleanTitle: finalTitle, volume };
    }
  }

  return { cleanTitle: title, volume: null };
}

/**
 * Recherche Booknode à partir d’une requête texte
 * @param {string} query
 * @returns {Promise<Array>} Liste de livres : { title, url, cover }
 */
export async function searchBooknode(query) {
  
  // Lancement du navigateur Playwright (100% compatible Render)
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu"
    ]
  });

  const page = await browser.newPage();

  // Charger la page de recherche Booknode
  await page.goto(
    `https://booknode.com/search?words=${encodeURIComponent(query)}`,
    { waitUntil: "domcontentloaded" }
  );

   const results = await page.evaluate(() => {
  return [...document.querySelectorAll(".list-group-item.result-book")].map((el) => {
    const titleEl = el.querySelector(".book-name a");
    const authorEl = el.querySelector(".authors .author");
    const imgEl = el.querySelector(".left img");
    const uid = function(){
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    return {
      key: uid(),
      title: titleEl?.innerText?.trim() || null,
      author_name: [authorEl?.innerText?.trim()] || [],
      link: titleEl?.href || null,
      cover: imgEl?.src || null
    };
  });
});

  await browser.close();
  return results;
}

export async function getBookDetails(url) {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu"
    ]
  });

  const page = await browser.newPage();

  // Charger la page de recherche Booknode
  await page.goto(url,{ waitUntil: "domcontentloaded" });

  const details = await page.evaluate(() => {
    // Title
    const title = document.querySelector("h1")?.innerText?.trim() || null;

    // Cover image
    const cover = document.querySelector(".main-cover img")?.src || null;

    // Author(s)
    const author_name = [];
    document.querySelectorAll(".main-bloc-right a[href*='/auteur/']").forEach(el => {
      const authorName = el.querySelector("span")?.innerText?.trim();
      if (authorName) author_name.push(authorName);
    });

    // Description
    let description = null;
    const descPanel = document.querySelector(".frontbook-description .actual-text");
    if (descPanel) {
      // Remove the "Résumé" title if present
      const resumeTitle = descPanel.querySelector(".resume-title");
      if (resumeTitle) resumeTitle.remove();
      description = descPanel.innerText?.trim() || null;
    }

    // Rating
    const ratingText = document.querySelector(".detail-global-rating")?.getAttribute("data-content");
    let rating = null;
    let ratingsCount = null;
    if (ratingText) {
      const match = ratingText.match(/(\d+\.\d+)\/10\s*-\s*([\d\s]+)\s*notes/);
      if (match) {
        rating = parseFloat(match[1]);
        ratingsCount = parseInt(match[2].replace(/\s/g, ""));
      }
    }

    // Themes/Categories
    const categories = [];
    document.querySelectorAll("a[href*='/theme/']").forEach(el => {
      const theme = el.innerText?.trim();
      if (theme) categories.push(theme);
    });

    // Tropes
    const tropes = [];
    document.querySelectorAll("a[href*='/trope/']").forEach(el => {
      const trope = el.innerText?.trim();
      if (trope) tropes.push(trope);
    });

    // Series information
    const seriesLink= document.querySelector("a[href*='/serie/']");
    var seriesUrl = "";
    if (seriesLink) {
        seriesUrl = seriesLink.href;
    }


    // ISBN or other metadata could be added here if available in the HTML

    return {
      title,
      cover,
      description,
      author_name,
      rating,
      ratingsCount,
      categories,
      tropes,
      seriesUrl,
      source: window.location.href

    };
  });
  const { cleanTitle, volume } = extractVolumeFromTitle(details.title);
  details.title = cleanTitle;
  details.volume = volume;

  await browser.close();
  return details;
}

export async function getBookSequels(url) {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu"
    ]
  });

  const page = await browser.newPage();

  await page.goto(url, { waitUntil: "domcontentloaded"});

  // Wait for main content to load
  await page.waitForSelector("h1", { timeout: 30000 });

  const books = await page.evaluate(() => {
    // Remove the 'doc' parameter - use 'document' directly
    const current_books = document.querySelectorAll(".book");

    const sequels = [];
    
    current_books.forEach((book, index) => {
      const titleElement = book.querySelector(".block_title a h4");
      const coverElement = book.querySelector(".main_cover_link");
      const linkElement = book.querySelector(".block_title a");

      if (titleElement && coverElement && linkElement) {
        const number = titleElement.querySelector("small.text-muted")?.textContent?.trim() || "";
        const title = titleElement.textContent.replace(number, "").trim();
        const coverUrl = coverElement.querySelector("img")?.src;
        const bookNodeUrl = linkElement.href;
        const pattern = /^(.+?)\s+tome\s+(\d+(?:\.\d+)?)\s*:\s*(.+)$/i;
        const pattern2 = /^(.+?)\s+tome\s+(\d+(?:\.\d+)?)$/i;
        const match = title.match(pattern);
        const match2 = title.match(pattern2);
        const cleanTitle = match ? match[3].trim() : match2 ? match2[1].trim() : title;
        const volume = match ? parseFloat(match[2]) : 1;

        sequels.push({
          number,
          title: cleanTitle,
          coverUrl,
          bookNodeUrl,
          tomeNb: volume
        });
      }
    });

    return sequels;
  });

  await browser.close();
  return books;
}