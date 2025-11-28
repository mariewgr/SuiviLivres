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
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Rating,
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
  citations?: string | null;
  smut?: string | null;
  isRead?: boolean;
  tomeNb?: number | null;
  createdAt: string;
}

interface SeriesOption {
  id: number;
  title: string;
}

const API_URL = "http://localhost:4000/api";

export default function BookEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allSeries, setAllSeries] = useState<SeriesOption[]>([]);

  const [form, setForm] = useState({
    title: "",
    authorName: "",
    seriesTitle: "",
    summary: "",
    rating: "",
    readDate: "",
    citations: "",
    smut: "",
    isRead: false,
    tomeNb: -1,
    coverUrl: "",
  });

  useEffect(() => {
    fetchBookDetail();
    fetchAllSeries();
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

      // Parse smut if they exist
      let smutString = "";
      if (book.smut) {
        try {
          const smutArray = JSON.parse(book.smut);
          smutString = smutArray.join("; ");
        } catch {
          smutString = book.smut;
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
        citations: citationsString,
        smut: smutString,
        coverUrl: book.coverUrl || "",
        isRead: book.isRead || false,
        tomeNb: book.tomeNb || -1,
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

  const fetchAllSeries = async () => {
    try {
      const response = await fetch(`${API_URL}/series`);
      const data = await response.json();
      setAllSeries(data);
    } catch (err) {
      console.error("Error fetching series:", err);
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
    let citationsArray = [];
    if (form.citations.trim()) {
      citationsArray = form.citations
        .split(";")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
    }

    // Prepare smut array
    let smutArray = [];
    if (form.smut.trim()) {
      smutArray = form.smut
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
      citations: citationsArray,
      smut: smutArray,
      isRead: form.isRead,
      tomeNb: form.tomeNb,
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

            {/* Series Dropdown */}
            <Grid item xs={12}>
              <FormControl fullWidth disabled={saving}>
                <InputLabel id="series-select-label">
                  Collection / Série
                </InputLabel>
                <Select
                  labelId="series-select-label"
                  value={form.seriesTitle}
                  label="Collection / Série"
                  onChange={(e) =>
                    setForm({ ...form, seriesTitle: e.target.value })
                  }
                >
                  <MenuItem value="">
                    <em>Aucune collection</em>
                  </MenuItem>
                  {allSeries.map((series) => (
                    <MenuItem key={series.id} value={series.title}>
                      {series.title}
                    </MenuItem>
                  ))}
                  <MenuItem value="__new__">
                    <em>+ Créer une nouvelle collection...</em>
                  </MenuItem>
                </Select>
              </FormControl>

              {form.seriesTitle === "__new__" && (
                <TextField
                  fullWidth
                  label="Nom de la nouvelle collection"
                  placeholder="Entrez le nom de la collection"
                  onChange={(e) =>
                    setForm({
                      ...form,
                      seriesTitle:
                        e.target.value === "" ? "__new__" : e.target.value,
                    })
                  }
                  sx={{ mt: 2 }}
                  autoFocus
                />
              )}
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
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Note
                </Typography>
                <Rating
                  value={form.rating ? parseInt(form.rating) : 0}
                  onChange={(event, newValue) => {
                    setForm({
                      ...form,
                      rating: newValue ? newValue.toString() : "",
                    });
                  }}
                  size="large"
                  sx={{ mt: 0.5 }}
                />
              </Box>
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

            {/* Tome number */}
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="int"
                label="Numéro de Tome"
                name="tomeNb"
                value={form.tomeNb}
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
              />
            </Grid>

            {/* Smut */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Chapitre de Smut"
                name="smut"
                value={form.smut}
                onChange={handleChange}
                multiline
                rows={3}
                disabled={saving}
                placeholder="Séparez chaque chapitre par un point-virgule (;)"
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
