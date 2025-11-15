const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");
const fetch = require("node-fetch"); // Node <18, sinon fetch natif

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// Route test
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// GET all books
app.get("/api/books", async (req, res) => {
  const books = await prisma.book.findMany({
    include: { author: true, series: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(books);
});

// POST new book with automatic cover & next series
app.post("/api/books", async (req, res) => {
  const { title, authorName, seriesTitle, summary, rating, readDate, pages, citations } = req.body;

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
      // Détecter la série / suite
      if (bookData.series && bookData.series.length > 0) {
        nextSeriesTitle = bookData.series[0]; // première série détectée
      }
    }
  } catch (err) {
    console.error("Erreur récupération couverture:", err);
  }

  // 4️⃣ Créer le livre
  const book = await prisma.book.create({
    data: {
      title,
      authorId: author.id,
      seriesId: series ? series.id : null,
      summary,
      coverUrl,
      rating,
      readDate,
      pages,
      citations,
    },
    include: { author: true, series: true },
  });

  // 5️⃣ Renvoyer livre + suite détectée
  res.json({ book, nextSeriesTitle });
});

app.listen(4000, () => console.log("✅ Backend running on http://localhost:4000"));
