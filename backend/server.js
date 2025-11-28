const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");

// Use native fetch for Node 18+, or import node-fetch for older versions
const fetch = globalThis.fetch || require("node-fetch");

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Route test
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// GET all books
app.get("/api/books", async (req, res) => {
  try {
    console.log("📚 Fetching books...");
    const books = await prisma.book.findMany({
      include: { author: true, series: true },
      orderBy: { createdAt: "desc" },
    });
    console.log(`✅ Found ${books.length} books`);
    res.json(books);
  } catch (error) {
    console.error("❌ Error fetching books:", error);
    console.error("Stack:", error.stack);
    res.status(500).json({ error: "Failed to fetch books", details: error.message });
  }
});

// helper: convert roman numerals to integer (I, II, III, IV, V, X...)
function romanToInt(rom) {
  if (!rom) return null;
  const map = {I:1,V:5,X:10,L:50,C:100,D:500,M:1000};
  let s = rom.toUpperCase().replace(/[^IVXLCDM]/g,'');
  if (!s) return null;
  let total = 0;
  for (let i = 0; i < s.length; i++) {
    const curr = map[s[i]];
    const next = map[s[i+1]];
    if (next && curr < next) total -= curr;
    else total += curr;
  }
  return total || null;
}

async function detectTomeNumberFromOpenLibrary(title, authorName) {
  let tomeNb = null;
  const tried = [];

  try {
    const query = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(authorName)}&limit=5`;
    const resp = await fetch(query);
    const data = await resp.json();
    if (!data.docs || data.docs.length === 0) return { tomeNb: null, tried };

    // go through top docs to increase chance to find a doc with number
    for (const doc of data.docs) {
      tried.push({ source: 'search_doc', doc });
      // 1) direct numeric fields
      if (doc.series_number) { tomeNb = Number(doc.series_number); if (tomeNb) return { tomeNb, tried }; }
      if (doc.volume) { tomeNb = Number(doc.volume); if (tomeNb) return { tomeNb, tried }; }
      if (doc.number) { tomeNb = Number(doc.number); if (tomeNb) return { tomeNb, tried }; }

      // 2) series[] strings — try many patterns
      if (Array.isArray(doc.series)) {
        for (const raw of doc.series) {
          // common patterns: "Series Title ; 2", "Series Title, #2", "Series Title (Book 2)", "Series Title, Volume 2"
          const patterns = [
            /;\s*#?\s*([0-9]+)\b/i,
            /#\s*([0-9]+)\b/i,
            /(?:tome|volume|vol\.|book|book\s+)\s*([0-9]+)\b/i,
            /\(\s*(?:book|volume|tome)?\s*([0-9]+)\s*\)/i,
            /,\s*(?:book|volume|tome)\s*([0-9]+)\b/i,
            /(?:\bpart\b|\bpt\b)\s*([0-9]+)\b/i,
            /(?:\bpart\b|\bpt\b)\s*([ivxlcdm]+)\b/i, // roman in series string
            /(?:\bbook\b|\bvolume\b|\btome\b)\s*([ivxlcdm]+)\b/i
          ];
          for (const re of patterns) {
            const m = raw.match(re);
            if (m && m[1]) {
              const candidate = isNaN(m[1]) ? romanToInt(m[1]) : Number(m[1]);
              if (candidate) return { tomeNb: candidate, tried };
            }
          }
          // fallback: extract trailing number
          const trailing = raw.match(/([0-9]+)\s*$/);
          if (trailing) {
            const candidate = Number(trailing[1]);
            if (candidate) return { tomeNb: candidate, tried };
          }
        }
      }

      // 3) title / subtitle heuristics
      const textFields = [doc.title, doc.subtitle, doc.title_suggest, doc.edition_name].filter(Boolean);
      for (const txt of textFields) {
        tried.push({ source: 'text_field', text: txt });
        // patterns in title
        const titlePatterns = [
          /(?:book|volume|vol\.|tome|part)\s*([0-9]+)\b/i,
          /(?:book|volume|vol\.|tome|part)\s*([ivxlcdm]+)\b/i,
          /(?:#|no\.|nº)\s*([0-9]+)/i,
          /\b([0-9]{1,3})\b\s*$/ // trailing number
        ];
        for (const re of titlePatterns) {
          const m = txt.match(re);
          if (m && m[1]) {
            const candidate = isNaN(m[1]) ? romanToInt(m[1]) : Number(m[1]);
            if (candidate) return { tomeNb: candidate, tried };
          }
        }
      }

      // 4) If doc has an edition key, fetch edition metadata (editions sometimes contain series info)
      if (Array.isArray(doc.edition_key) && doc.edition_key.length > 0) {
        for (const editionKey of doc.edition_key.slice(0, 3)) { // limit to first 3 editions
          try {
            const edUrl = `https://openlibrary.org/books/${editionKey}.json`;
            const edRes = await fetch(edUrl);
            if (!edRes.ok) continue;
            const ed = await edRes.json();
            tried.push({ source: 'edition', editionKey, ed });

            // edition.series can be array of strings
            if (ed.series && Array.isArray(ed.series)) {
              for (const raw of ed.series) {
                const m = raw.match(/(?:tome|volume|vol\.|book|#)\s*([0-9ivxlcdm]+)/i);
                if (m && m[1]) {
                  const candidate = isNaN(m[1]) ? romanToInt(m[1]) : Number(m[1]);
                  if (candidate) return { tomeNb: candidate, tried };
                }
              }
            }

            // some editions have 'series_position' or similar
            if (ed.series_position) {
              const candidate = Number(ed.series_position);
              if (!isNaN(candidate)) return { tomeNb: candidate, tried };
            }

            // some editions include 'work' link; later we query work
            if (ed.works && ed.works.length > 0) {
              const workKey = ed.works[0].key; // e.g. "/works/OLxxxxW"
              const workUrl = `https://openlibrary.org${workKey}.json`;
              const workRes = await fetch(workUrl);
              if (workRes.ok) {
                const work = await workRes.json();
                tried.push({ source: 'work', work });
                if (work.series && Array.isArray(work.series)) {
                  for (const raw of work.series) {
                    const m = raw.match(/(?:tome|volume|book|#)\s*([0-9ivxlcdm]+)/i);
                    if (m && m[1]) {
                      const candidate = isNaN(m[1]) ? romanToInt(m[1]) : Number(m[1]);
                      if (candidate) return { tomeNb: candidate, tried };
                    }
                  }
                }
                if (work.series_position) {
                  const candidate = Number(work.series_position);
                  if (!isNaN(candidate)) return { tomeNb: candidate, tried };
                }
              }
            }
          } catch (e) {
            tried.push({ source: 'edition_error', editionKey, error: String(e) });
            // non-blocking
          }
        }
      }

      // 5) As last fallback, try to parse roman numerals standalone in title
      const romanMatch = (doc.title || '').match(/\b([ivxlcdm]{1,6})\b/i);
      if (romanMatch) {
        const candidate = romanToInt(romanMatch[1]);
        if (candidate) return { tomeNb: candidate, tried };
      }
    } // end for each doc

  } catch (e) {
    tried.push({ source: 'search_error', error: String(e) });
    console.error('OpenLibrary search error', e);
  }

  // if nothing found:
  return { tomeNb: null, tried };
}


// GET single book by ID
app.get("/api/books/:id", async (req, res) => {
  try {
    const book = await prisma.book.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { author: true, series: true },
    });
    if (!book) {
      return res.status(404).json({ error: "Book not found" });
    }
    res.json(book);
  } catch (error) {
    console.error("Error fetching book:", error);
    res.status(500).json({ error: "Failed to fetch book" });
  }
});

// POST new book with automatic cover & next series
app.post("/api/books", async (req, res) => {
  try {
    const { title, authorName, seriesTitle, summary, rating, readDate, citations, smut , tomeNb} = req.body;

    // Validation
    if (!title || !authorName) {
      return res.status(400).json({ error: "Title and author name are required" });
    }

    // 1️⃣ Upsert author
    const author = await prisma.author.upsert({
      where: { name: authorName },
      update: {},
      create: { name: authorName },
    });

    // 2️⃣ Upsert series
    let series = null;
    if (seriesTitle) {
      series = await prisma.series.upsert({
        where: { title: seriesTitle },
        update: {},
        create: { title: seriesTitle },
      });
    }

    // 3️⃣ Chercher couverture et suite via Open Library
    let coverUrl = null;
    let nextSeriesTitle = null;
    try {
      const query = `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(authorName)}`;
      const response = await fetch(query);
      const data = await response.json();
      
      if (data.docs && data.docs.length > 0) {
        const bookData = data.docs[0];
        
        // Couverture
        if (bookData.cover_i) {
          coverUrl = `https://covers.openlibrary.org/b/id/${bookData.cover_i}-L.jpg`;
        }
      
      }
    } catch (err) {
      console.error("Erreur récupération couverture:", err);
      // Continue without cover - non-blocking error
    }

    // 3. Extraire le numéro du tome automatiquement depuis OpenLibrary

    let tomeNb_searched = (await detectTomeNumberFromOpenLibrary(title, authorName)).tomeNb;
    // 4️⃣ Créer le livre
    const book = await prisma.book.create({
      data: {
        title,
        authorId: author.id,
        seriesId: series ? series.id : null,
        summary: summary || null,
        coverUrl,
        rating: rating ? parseInt(rating) : null,
        readDate: readDate ? new Date(readDate) : null,
        citations: citations ? (typeof citations === 'string' ? citations : JSON.stringify(citations)) : null,
        smut: smut ? (typeof smut === 'string' ? smut : JSON.stringify(smut)) : null,
        isRead: false, // Default to not read
        tomeNb: tomeNb != -1 ? parseInt(tomeNb) : tomeNb_searched,
      },
      include: { author: true, series: true },
    });

    // 5️⃣ Renvoyer livre + suite détectée
    res.status(201).json({ book, nextSeriesTitle });
    console.error("Book created:", title);
  } catch (error) {
    console.error("Error creating book:", error);
    res.status(500).json({ error: "Failed to create book", details: error.message });
  }
});

// PUT update book
app.put("/api/books/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, authorName, seriesTitle, summary, rating, readDate, citations, smut, coverUrl, isRead, tomeNb } = req.body;

    // Handle author update/creation
    let authorId;
    if (authorName) {
      const author = await prisma.author.upsert({
        where: { name: authorName },
        update: {},
        create: { name: authorName },
      });
      authorId = author.id;
    }

    // Handle series update/creation
    let seriesId = null;
    if (seriesTitle) {
      const series = await prisma.series.upsert({
        where: { title: seriesTitle },
        update: {},
        create: { title: seriesTitle },
      });
      seriesId = series.id;
    }

    const book = await prisma.book.update({
      where: { id: parseInt(id) },
      data: {
        ...(title && { title }),
        ...(authorId && { authorId }),
        ...(seriesId !== undefined && { seriesId }),
        ...(summary !== undefined && { summary }),
        ...(coverUrl !== undefined && { coverUrl }),
        ...(rating !== undefined && { rating: rating ? parseInt(rating) : null }),
        ...(readDate !== undefined && { readDate: readDate ? new Date(readDate) : null }),
        ...(tomeNb !== undefined && { tomeNb : parseInt(tomeNb) }),
        ...(isRead !== undefined && { isRead }),
        ...(citations !== undefined && { 
          citations: citations ? (typeof citations === 'string' ? citations : JSON.stringify(citations)) : null 
        }),
        ...(smut !== undefined && { 
          smut: smut ? (typeof smut === 'string' ? smut : JSON.stringify(smut)) : null 
        }),
      },
      include: { author: true, series: true },
    });

    res.json(book);
  } catch (error) {
    console.error("Error updating book:", error);
    res.status(500).json({ error: "Failed to update book", details: error.message });
  }
});

// DELETE book
app.delete("/api/books/:id", async (req, res) => {
  try {
    await prisma.book.delete({
      where: { id: parseInt(req.params.id) },
    });
    res.json({ message: "Book deleted successfully" });
  } catch (error) {
    console.error("Error deleting book:", error);
    res.status(500).json({ error: "Failed to delete book" });
  }
});

// GET all authors
app.get("/api/authors", async (req, res) => {
  try {
    const authors = await prisma.author.findMany({
      include: { _count: { select: { books: true } } },
      orderBy: { name: "asc" },
    });
    res.json(authors);
  } catch (error) {
    console.error("Error fetching authors:", error);
    res.status(500).json({ error: "Failed to fetch authors" });
  }
});

// GET all series
app.get("/api/series", async (req, res) => {
  try {
    const series = await prisma.series.findMany({
      include: { 
        _count: { select: { books: true } },
        books: {
          include: { author: true },
          orderBy: { createdAt: "asc" }
        }
      },
      orderBy: { title: "asc" },
    });
    res.json(series);
  } catch (error) {
    console.error("Error fetching series:", error);
    res.status(500).json({ error: "Failed to fetch series" });
  }
});

// GET single series with all books
app.get("/api/series/:id", async (req, res) => {
  try {
    const series = await prisma.series.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        books: {
          include: { author: true },
          orderBy: { createdAt: "asc" }
        }
      }
    });
    if (!series) {
      return res.status(404).json({ error: "Series not found" });
    }
    res.json(series);
  } catch (error) {
    console.error("Error fetching series:", error);
    res.status(500).json({ error: "Failed to fetch series" });
  }
});

app.put('/api/series/:id', async (req,res)=>{
const { title } = req.body;
const updated = await prisma.series.update({
where:{ id: parseInt(req.params.id)},
data:{ title },
});
res.json(updated);
});

app.delete('/api/series/:id', async (req,res)=>{
await prisma.book.updateMany({ where:{ seriesId: parseInt(req.params.id)}, data:{ seriesId:null }});
await prisma.series.delete({ where:{ id: parseInt(req.params.id)} });
res.json({ message:'Series deleted' });
});


// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});