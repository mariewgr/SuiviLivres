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

export default function BookEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [allSeries, setAllSeries] = useState<SeriesOption[]>([]);
  const [newCollectionName, setNewCollectionName] = useState("");

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

      let citationsString = "";
      if (book.citations) {
        try {
          const citationsArray = JSON.parse(book.citations);
          citationsString = citationsArray.join("; ");
        } catch {
          citationsString = book.citations;
        }
      }

      let smutString = "";
      if (book.smut) {
        try {
          const smutArray = JSON.parse(book.smut);
          smutString = smutArray.join("; ");
        } catch {
          smutString = book.smut;
        }
      }

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

    let finalSeriesTitle = form.seriesTitle;
    if (form.seriesTitle === "__new__" && newCollectionName.trim()) {
      finalSeriesTitle = newCollectionName.trim();
    }

    let citationsArray = [];
    if (form.citations.trim()) {
      citationsArray = form.citations
        .split(";")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
    }

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
      seriesTitle: finalSeriesTitle || null,
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
                value={form.authorName}
                onChange={handleChange}
                disabled={saving}
                sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
                error={!form.authorName.trim() && form.authorName !== ""}
                helperText={
                  !form.authorName.trim() && form.authorName !== ""
                    ? "L'auteur est requis"
                    : ""
                }
              />
            </Grid>

            <Grid item xs={12}>
              <FormControl fullWidth disabled={saving}>
                <InputLabel>Série (optionnel)</InputLabel>
                <Select
                  value={form.seriesTitle}
                  label="Série (optionnel)"
                  onChange={(e) =>
                    setForm({ ...form, seriesTitle: e.target.value })
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

              {form.seriesTitle === "__new__" && (
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
                value={form.rating ? parseInt(form.rating) : 0}
                onChange={(e, v) =>
                  setForm({ ...form, rating: v ? v.toString() : "" })
                }
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
                value={form.citations}
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
                value={form.smut}
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
                    saving || !form.title.trim() || !form.authorName.trim()
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
