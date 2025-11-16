import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  TextField,
  Grid,
  CircularProgress,
  Alert,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import SaveIcon from "@mui/icons-material/Save";

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
  author: Author;
  series?: Series | null;
  summary?: string | null;
  coverUrl?: string | null;
  rating?: number | null;
  readDate?: string | null;
  pages?: number | null;
  citations?: string | null;
  createdAt: string;
}

const API_URL = "http://localhost:4000/api";

export default function BookEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    title: "",
    authorName: "",
    seriesTitle: "",
    summary: "",
    rating: "",
    readDate: "",
    pages: "",
    citations: "",
    coverUrl: "",
  });

  useEffect(() => {
    fetchBookDetail();
  }, [id]);

  const fetchBookDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/books/${id}`);
      if (!response.ok) {
        throw new Error("Livre non trouvé");
      }
      const book: Book = await response.json();

      // Parse citations if they exist
      let citationsString = "";
      if (book.citations) {
        try {
          const citationsArray = JSON.parse(book.citations);
          citationsString = citationsArray.join("; ");
        } catch {
          citationsString = book.citations;
        }
      }

      // Format date for input field
      let formattedDate = "";
      if (book.readDate) {
        const date = new Date(book.readDate);
        formattedDate = date.toISOString().split("T")[0];
      }

      setForm({
        title: book.title || "",
        authorName: book.author?.name || "",
        seriesTitle: book.series?.title || "",
        summary: book.summary || "",
        rating: book.rating?.toString() || "",
        readDate: formattedDate,
        pages: book.pages?.toString() || "",
        citations: citationsString,
        coverUrl: book.coverUrl || "",
      });
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Échec du chargement du livre"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim() || !form.authorName.trim()) {
      setError("Le titre et l'auteur sont obligatoires");
      return;
    }

    setSaving(true);
    setError(null);

    // Prepare citations array
    let citationsArray;
    if (form.citations.trim()) {
      citationsArray = form.citations
        .split(";")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
    }

    const payload = {
      title: form.title.trim(),
      authorName: form.authorName.trim(),
      seriesTitle: form.seriesTitle.trim() || null,
      summary: form.summary.trim() || null,
      rating: form.rating ? parseInt(form.rating) : null,
      readDate: form.readDate || null,
      pages: form.pages ? parseInt(form.pages) : null,
      citations: citationsArray,
      coverUrl: form.coverUrl.trim() || null,
    };

    try {
      const response = await fetch(`${API_URL}/books/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Échec de la mise à jour du livre");
      }

      // Navigate back to the book detail page
      navigate(`/book/${id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Échec de la mise à jour du livre"
      );
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: "center" }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Chargement du livre...</Typography>
      </Container>
    );
  }

  if (error && !form.title) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/")}
          variant="outlined"
        >
          Retour à la liste
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Back Button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(`/book/${id}`)}
        sx={{ mb: 3 }}
        disabled={saving}
      >
        Retour au livre
      </Button>

      <Paper elevation={3} sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold">
          ✏️ Modifier le livre
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Title */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Titre"
                name="title"
                value={form.title}
                onChange={handleChange}
                disabled={saving}
                error={!form.title.trim() && form.title !== ""}
                helperText={
                  !form.title.trim() && form.title !== ""
                    ? "Le titre est requis"
                    : ""
                }
              />
            </Grid>

            {/* Author */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Auteur"
                name="authorName"
                value={form.authorName}
                onChange={handleChange}
                disabled={saving}
                error={!form.authorName.trim() && form.authorName !== ""}
                helperText={
                  !form.authorName.trim() && form.authorName !== ""
                    ? "L'auteur est requis"
                    : ""
                }
              />
            </Grid>

            {/* Series */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Série (optionnel)"
                name="seriesTitle"
                value={form.seriesTitle}
                onChange={handleChange}
                disabled={saving}
                placeholder="Ex: Harry Potter"
              />
            </Grid>

            {/* Summary */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Résumé"
                name="summary"
                value={form.summary}
                onChange={handleChange}
                multiline
                rows={4}
                disabled={saving}
                placeholder="Décrivez brièvement l'histoire du livre..."
              />
            </Grid>

            {/* Rating */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Note (1 à 5)"
                name="rating"
                value={form.rating}
                onChange={handleChange}
                InputProps={{ inputProps: { min: 1, max: 5, step: 1 } }}
                disabled={saving}
                placeholder="1-5"
              />
            </Grid>

            {/* Pages */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="Nombre de pages"
                name="pages"
                value={form.pages}
                onChange={handleChange}
                InputProps={{ inputProps: { min: 1 } }}
                disabled={saving}
                placeholder="Ex: 350"
              />
            </Grid>

            {/* Read Date */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="date"
                label="Date de lecture"
                name="readDate"
                value={form.readDate}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                disabled={saving}
              />
            </Grid>

            {/* Cover URL */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="URL de la couverture"
                name="coverUrl"
                value={form.coverUrl}
                onChange={handleChange}
                disabled={saving}
                placeholder="https://exemple.com/couverture.jpg"
                helperText="Laisser vide pour utiliser la couverture automatique d'Open Library"
              />
            </Grid>

            {/* Citations */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Citations favorites"
                name="citations"
                value={form.citations}
                onChange={handleChange}
                multiline
                rows={3}
                disabled={saving}
                placeholder="Séparez chaque citation par un point-virgule (;)"
                helperText='Exemple: "La vie est belle; L amour triomphe toujours; Carpe diem"'
              />
            </Grid>

            {/* Action Buttons */}
            <Grid item xs={12}>
              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  justifyContent: "flex-end",
                  mt: 2,
                }}
              >
                <Button
                  variant="outlined"
                  onClick={() => navigate(`/book/${id}`)}
                  disabled={saving}
                  size="large"
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  startIcon={
                    saving ? (
                      <CircularProgress size={20} color="inherit" />
                    ) : (
                      <SaveIcon />
                    )
                  }
                  disabled={
                    saving || !form.title.trim() || !form.authorName.trim()
                  }
                  size="large"
                >
                  {saving
                    ? "Enregistrement..."
                    : "Enregistrer les modifications"}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
}
