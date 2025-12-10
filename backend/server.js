import  { searchGoogleBooks, getGoogleBookDetails , findGoogleBookSequels } from "./utils/googlebooks.js";
import express from "express";
import cors from "cors";
import { PrismaClient } from "@prisma/client";
import { API_URL } from "../frontend/src/api.js";

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

// ==================== GOOGLE BOOKS API ROUTES ====================

app.get("/api/googlebooks/search", async (req, res) => {
  try {
    const q = req.query.q;
    if (!q) return res.json([]);
    const results = await searchGoogleBooks(q);
    res.json(results);
  } catch (err) {
    console.error("Search Google Books error:", err);
    res.status(500).json({ error: "API call failed" });
  }
});

app.get("/api/googlebooks/details", async (req, res) => {
  try {
    const id = req.query.id;
    if (!id) return res.json({});
    const details = await getGoogleBookDetails(id);
    res.json(details);
  } catch (err) {
    console.error("Details Google Books error:", err);
    res.status(500).json({ error: "API call failed" });
  }
});

/**
 * Find sequels/related books in a series
 * GET /api/googlebooks/sequels
 * Query params: author, title, volume
 */
app.get("/api/googlebooks/sequels", async (req, res) => {
  try {
    const { author, title, volume } = req.query;
    
    if (!author || !title) {
      return res.status(400).json({ 
        error: "Author and title are required" 
      });
    }

    const volumeNumber = volume ? parseFloat(volume) : null;
    const sequels = await findGoogleBookSequels(author, title, volumeNumber);
    
    res.json(sequels);
  } catch (err) {
    console.error("Error finding sequels:", err);
    res.status(500).json({ error: "Failed to find sequels" });
  }
});

// ==================== DATABASE ROUTES ====================

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

// POST new book
app.post("/api/books", async (req, res) => {
  try {
    const { title, author, series, summary, rating, readDate, citations, smut, tomeNb, coverUrl, googleBooksId } = req.body;

    // Validation
    if (!title) {
      return res.status(400).json({ error: "Title and author name are required" });
    }

    // 1️⃣ Upsert author
    let new_author = await prisma.author.upsert({
      where: { name: author.name },
      update: {},
      create: { name: author.name },
    });

    // 2️⃣ Upsert series
    let new_series = null;
    if (series) {
      new_series = await prisma.series.upsert({
        where: { title: series.title },
        update: {},
        create: { title: series.title },
      });
    }

    // 3️⃣ Créer le livre
    const book = await prisma.book.create({
      data: {
        title,
        authorId: new_author.id,
        seriesId: new_series ? new_series.id : null,
        summary: summary,
        coverUrl,
        googleBooksId: googleBooksId || null,
        rating: rating,
        readDate: readDate ? new Date(readDate) : null,
        citations: JSON.stringify(citations),
        smut: JSON.stringify(smut),
        isRead: false,
        tomeNb: tomeNb,
      },
      include: { author: true, series: true },
    });

    res.status(201).json({ book });
    console.log("Book created:", title);
  } catch (error) {
    console.error("Error creating book:", error);
    res.status(500).json({ error: "Failed to create book", details: error.message });
  }
});

// PUT update book
app.put("/api/books/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, author, series, summary, rating, readDate, citations, smut, coverUrl, isRead, tomeNb, googleBooksId } = req.body;

    // Handle author update/creation
    let authorId;
    if (author.name) {
      const new_author = await prisma.author.upsert({
        where: { name: author.name },
        update: {},
        create: { name: author.name },
      });
      authorId = new_author.id;
    }

    // Handle series update/creation
    let seriesId = null;
    if (series) {
      const new_series = await prisma.series.upsert({
        where: { title: series.title },
        update: {},
        create: { title: series.title  },
      });
      seriesId = new_series.id;
    }

    const book = await prisma.book.update({
      where: { id: parseInt(id) },
      data: {
        ...(title && { title }),
        ...(authorId && { authorId }),
        ...(seriesId !== undefined && { seriesId }),
        ...(summary !== undefined && { summary }),
        ...(coverUrl !== undefined && { coverUrl }),
        ...(googleBooksId !== undefined && { googleBooksId }),
        ...(rating !== undefined && { rating: rating ? parseInt(rating) : null }),
        ...(readDate !== undefined && { readDate: readDate ? new Date(readDate) : null }),
        ...(tomeNb !== undefined && { tomeNb: parseFloat(tomeNb) }),
        ...(isRead !== undefined && { isRead }),
        ...(citations !== undefined && { 
          citations: citations ? JSON.stringify(citations) : "" 
        }),
        ...(smut !== undefined && { 
          smut: smut ? JSON.stringify(smut) : "" 
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

app.put('/api/series/:id', async (req, res) => {
  const { title } = req.body;
  const updated = await prisma.series.update({
    where: { id: parseInt(req.params.id) },
    data: { title },
  });
  res.json(updated);
});

app.delete('/api/series/:id', async (req, res) => {
  await prisma.book.updateMany({ where: { seriesId: parseInt(req.params.id) }, data: { seriesId: null } });
  await prisma.series.delete({ where: { id: parseInt(req.params.id) } });
  res.json({ message: 'Series deleted' });
});

// Graceful shutdown
process.on("SIGINT", async () => {
  await prisma.$disconnect();
  process.exit(0);
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Backend running on 
    ${API_URL}`);
});