const { searchBooknode, getBookDetails, getBookSequels } = require("./booknode.js");
const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");

// Use native fetch for Node 18+, or import node-fetch for older versions
const fetch = globalThis.fetch || require("node-fetch");

const app = express();
const prisma = new PrismaClient();

app.use(
  cors({
    origin: "https://mariewgr.github.io",
  })
);


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

app.get("/api/booknode/search", async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.json([]);

    const results = await searchBooknode(q);
    res.json(results);
  } catch (err) {
    console.error("Search Booknode error:", err);
    res.status(500).json({ error: "Scraping failed" });
  }
});

app.get("/api/booknode/details", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.json({});

    const details = await getBookDetails(url);
    res.json(details);
  } catch (err) {
    console.error("Details Booknode error:", err);
    res.status(500).json({ error: "Scraping failed" });
  }
});

app.get("/api/booknode/series", async (req, res) => {
  try {
    const url = req.query.url;
    if (!url) return res.json({});

    const books = await getBookSequels(url);
    res.json(books);
  } catch (err) {
    console.error("Details Booknode error:", err);
    res.status(500).json({ error: "Scraping failed" });
  }
});

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
    const { title, authorName, seriesTitle, summary, rating, readDate, citations, smut , tomeNb, coverUrl, bookNodeUrl, seriesUrl} = req.body;

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

    // 4️⃣ Créer le livre
    const book = await prisma.book.create({
      data: {
        title,
        authorId: author.id,
        seriesId: series ? series.id : null,
        summary: summary || null,
        coverUrl,
        bookNodeUrl,
        seriesUrl,
        rating: rating ? parseInt(rating) : null,
        readDate: readDate ? new Date(readDate) : null,
        citations: citations ? (typeof citations === 'string' ? citations : JSON.stringify(citations)) : null,
        smut: smut ? (typeof smut === 'string' ? smut : JSON.stringify(smut)) : null,
        isRead: false, // Default to not read
        tomeNb: tomeNb != -1 ? parseFloat(tomeNb) : tomeNb_searched,
      },
      include: { author: true, series: true },
    });

    // 5️⃣ Renvoyer livre + suite détectée
    res.status(201).json({ book });
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
    const { title, authorName, seriesTitle, summary, rating, readDate, citations, smut, coverUrl, seriesUrl, bookNodeUrl, isRead, tomeNb } = req.body;

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
        ...(bookNodeUrl !== undefined && { bookNodeUrl }),
        ...(seriesUrl !== undefined && { seriesUrl }),
        ...(rating !== undefined && { rating: rating ? parseInt(rating) : null }),
        ...(readDate !== undefined && { readDate: readDate ? new Date(readDate) : null }),
        ...(tomeNb !== undefined && { tomeNb : parseFloat(tomeNb) }),
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