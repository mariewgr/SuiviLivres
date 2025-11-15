import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  Rating,
  List,
  Box,
} from "@mui/material";

interface Author {
  id: number;
  name: string;
}

interface Series {
  id: number;
  title: string;
}

interface Book {
  id: number;
  title: string;
  summary?: string;
  rating?: number;
  pages?: number;
  coverUrl?: string;
  citations?: string[];
  author: Author;
  series?: Series;
}

interface PendingBook {
  book: Book;
  coverUrl?: string;
  nextSeriesTitle?: string;
}

const API_URL = "http://localhost:4000/api";

export default function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [form, setForm] = useState({
    title: "",
    authorName: "",
    seriesTitle: "",
    summary: "",
    rating: "",
    pages: "",
    citations: "",
  });

  const [pendingBook, setPendingBook] = useState<PendingBook | null>(null);
  const [openDialog, setOpenDialog] = useState(false);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const res = await fetch(`${API_URL}/books`);
      const data = await res.json();
      setBooks(data);
    } catch (err) {
      console.error("Erreur fetchBooks:", err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...form,
      rating: form.rating ? parseInt(form.rating) : null,
      citations: form.citations ? form.citations.split(";") : [],
    };

    try {
      const res = await fetch(`${API_URL}/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data: PendingBook = await res.json();

      if (data.coverUrl || data.nextSeriesTitle) {
        setPendingBook(data);
        setOpenDialog(true);
      } else {
        fetchBooks();
      }

      setForm({
        title: "",
        authorName: "",
        seriesTitle: "",
        summary: "",
        rating: "",
        pages: "",
        citations: "",
      });
    } catch (err) {
      console.error("Erreur addBook:", err);
    }
  };

  const handleConfirm = async () => {
    if (!pendingBook) return;

    try {
      await fetch(`${API_URL}/books/${pendingBook.book.id}/confirm`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          coverUrl: pendingBook.coverUrl,
          nextSeriesTitle: pendingBook.nextSeriesTitle,
        }),
      });
    } catch (err) {
      console.error("Erreur confirmBook:", err);
    }

    setOpenDialog(false);
    setPendingBook(null);
    fetchBooks();
  };

  const handleIgnore = () => {
    setOpenDialog(false);
    setPendingBook(null);
    fetchBooks();
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h3" gutterBottom>
        📚 Suivi de Livres
      </Typography>

      {/* Formulaire */}
      <Paper sx={{ p: 3, mb: 4 }} elevation={3}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              label="Titre"
              name="title"
              value={form.title}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              required
              label="Auteur"
              name="authorName"
              value={form.authorName}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Série (optionnel)"
              name="seriesTitle"
              value={form.seriesTitle}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Résumé"
              name="summary"
              value={form.summary}
              onChange={handleChange}
              multiline
              rows={3}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Pages"
              name="pages"
              value={form.pages}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Note (1 à 5)"
              name="rating"
              value={form.rating}
              onChange={handleChange}
              InputProps={{ inputProps: { min: 1, max: 5 } }}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Citations (séparées par ;)"
              name="citations"
              value={form.citations}
              onChange={handleChange}
            />
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" color="primary" onClick={handleSubmit}>
              Ajouter le livre
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Liste des livres */}
      <Typography variant="h4" gutterBottom>
        📖 Liste des livres
      </Typography>
      <List>
        {books.map((b) => (
          <Paper
            key={b.id}
            sx={{ mb: 2, p: 2, display: "flex", gap: 2 }}
            elevation={2}
          >
            {b.coverUrl && (
              <Box
                component="img"
                src={b.coverUrl}
                alt={b.title}
                sx={{ width: 100, objectFit: "cover" }}
              />
            )}
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6">{b.title}</Typography>
              <Typography variant="subtitle2" color="text.secondary">
                {b.author?.name} {b.series ? `- ${b.series.title}` : ""}
              </Typography>
              {b.rating && <Rating value={b.rating} readOnly />}
              {b.summary && (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  {b.summary}
                </Typography>
              )}
            </Box>
          </Paper>
        ))}
      </List>
    </Container>
  );
}
