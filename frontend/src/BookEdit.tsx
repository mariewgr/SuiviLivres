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
import { API_URL } from "./api";
import { Book } from "./App";

interface SeriesOption {
  id: number;
  title: string;
}

export default function BookEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allSeries, setAllSeries] = useState<SeriesOption[]>([]);
  const [newCollectionName, setNewCollectionName] = useState("");

  const [form, setForm] = useState<Book>({
    title: "",
    author: { id: 0, name: "" },
    series: { id: 0, title: "" },
    summary: "",
    rating: 0,
    readDate: "",
    citations: [],
    smut: [],
    isRead: false,
    tomeNb: -1,
    coverUrl: "",
    googleBooksId: "",
    id: -1,
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

      let formattedDate = "";
      if (book.readDate) {
        const date = new Date(book.readDate);
        formattedDate = date.toISOString().split("T")[0];
      }

      setForm({
        title: book.title || "",
        author: { id: 0, name: book.author?.name || "" },
        series: { id: 0, title: book.series?.title || "" },
        summary: book.summary || "",
        rating: book.rating,
        readDate: formattedDate,
        citations: book.citations,
        smut: book.smut,
        coverUrl: book.coverUrl || "",
        isRead: book.isRead || false,
        tomeNb: book.tomeNb || -1,
        googleBooksId: book.googleBooksId || "",
        id: book.id,
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

    if (!form.title.trim() || !form.author.name.trim()) {
      setError("Le titre et l'auteur sont obligatoires");
      return;
    }

    setSaving(true);
    setError(null);

    if (form.series.title === "__new__" && newCollectionName.trim()) {
      form.series.title = newCollectionName.trim();
    }

    try {
      const response = await fetch(`${API_URL}/books/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Échec de la mise à jour du livre");
      }

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
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(`/book/${id}`)}
        sx={{ mb: 3 }}
        disabled={saving}
      >
        Retour au livre
      </Button>

      <Paper
        elevation={4}
        sx={{
          p: 4,
          borderRadius: 4,
          backdropFilter: "blur(6px)",
          background: "rgba(255,255,255,0.7)",
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
        }}
      >
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 3 }}>
          ✏️ Modifier le livre
        </Typography>

        {error && (
          <Alert
            severity="error"
            sx={{ mb: 3, borderRadius: 3 }}
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Titre"
                name="title"
                value={form.title}
                onChange={handleChange}
                disabled={saving}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
                error={!form.title.trim() && form.title !== ""}
                helperText={
                  !form.title.trim() && form.title !== ""
                    ? "Le titre est requis"
                    : ""
                }
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="Auteur"
                name="authorName"
                value={form.author.name}
                onChange={handleChange}
                disabled={saving}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
                error={!form.author.name.trim() && form.author.name !== ""}
                helperText={
                  !form.author.name.trim() && form.author.name !== ""
                    ? "L'auteur est requis"
                    : ""
                }
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth disabled={saving}>
                <InputLabel>Série (optionnel)</InputLabel>
                <Select
                  value={form.series.title}
                  label="Série (optionnel)"
                  onChange={(e) =>
                    setForm({
                      ...form,
                      series: { ...form.series, title: e.target.value },
                    })
                  }
                  sx={{ borderRadius: 3 }}
                >
                  <MenuItem value="">
                    <em>Aucune série</em>
                  </MenuItem>

                  {allSeries.map((s) => (
                    <MenuItem key={s.id} value={s.title}>
                      {s.title}
                    </MenuItem>
                  ))}

                  <MenuItem value="__new__">
                    <em>+ Nouvelle série…</em>
                  </MenuItem>
                </Select>
              </FormControl>

              {form.series.title === "__new__" && (
                <TextField
                  fullWidth
                  label="Nom de la nouvelle série"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  sx={{
                    mt: 2,
                    "& .MuiOutlinedInput-root": { borderRadius: 3 },
                  }}
                  autoFocus
                />
              )}
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
                disabled={saving}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
                placeholder="Décrivez brièvement l'histoire du livre..."
              />
            </Grid>

            <Grid item xs={6}>
              <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                Note
              </Typography>
              <Rating
                value={form.rating}
                onChange={(e, v) => setForm({ ...form, rating: v || 0 })}
              />
            </Grid>

            <Grid item xs={6}>
              <TextField
                fullWidth
                label="Numéro du tome"
                name="tomeNb"
                value={form.tomeNb}
                onChange={handleChange}
                disabled={saving}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                type="date"
                label="Date de lecture"
                name="readDate"
                value={form.readDate}
                onChange={handleChange}
                InputLabelProps={{ shrink: true }}
                disabled={saving}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="URL de la couverture"
                name="coverUrl"
                value={form.coverUrl}
                onChange={handleChange}
                disabled={saving}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
                placeholder="https://exemple.com/couverture.jpg"
                helperText="Laisser vide pour utiliser la couverture automatique d'Open Library"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Citations (séparées par ; )"
                name="citations"
                value={form.citations.length > 0 ? form.citations : ""}
                onChange={handleChange}
                disabled={saving}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Chapitres Smut (séparés par ; )"
                name="smut"
                value={form.smut.length > 0 ? form.smut : ""}
                onChange={handleChange}
                disabled={saving}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
              />
            </Grid>

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
                  sx={{
                    py: 1.4,
                    borderRadius: 3,
                    fontWeight: "bold",
                    textTransform: "none",
                  }}
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
                    saving || !form.title.trim() || !form.author.name.trim()
                  }
                  sx={{
                    py: 1.4,
                    borderRadius: 3,
                    fontWeight: "bold",
                    fontSize: "1rem",
                  }}
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
