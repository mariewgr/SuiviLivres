import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Rating,
  Chip,
  Divider,
  CircularProgress,
  Alert,
  Avatar,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
} from "@mui/material";

import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import MenuBookIcon from "@mui/icons-material/MenuBook";

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
  createdAt: string;
}

const API_URL = "http://localhost:4000/api";

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sequels, setSequels] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    fetchBookDetail();
  }, [id]);

  const fetchBookDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/books/${id}`);
      if (!response.ok) throw new Error("Book not found");
      setBook(await response.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Supprimer ce livre définitivement ?")) return;
    try {
      await fetch(`${API_URL}/books/${id}`, { method: "DELETE" });
      navigate("/");
    } catch {
      alert("Erreur lors de la suppression.");
    }
  };

  const markAsRead = async () => {
    if (!book) return;
    setSaving(true);

    const payload = {
      ...book,
      seriesTitle: book.series?.title,
      isRead: true,
      readDate: new Date().toISOString().split("T")[0],
    };

    try {
      await fetch(`${API_URL}/books/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      fetchBookDetail();
    } finally {
      setSaving(false);
    }
  };

  const markAsNotRead = async () => {
    if (!book) return;
    setSaving(true);

    const payload = {
      ...book,
      seriesTitle: book.series?.title,
      isRead: false,
      readDate: null,
    };

    try {
      await fetch(`${API_URL}/books/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      fetchBookDetail();
    } finally {
      setSaving(false);
    }
  };

  const findSequels = async () => {
    if (!book) return;
    setSearching(true);
    try {
      let results = [];
      const r = await fetch(
        `https://openlibrary.org/search.json?title=${encodeURIComponent(
          book.title
        )}&author=${encodeURIComponent(book.author.name)}&limit=50`
      );
      const data = await r.json();
      results = data.docs || [];

      const existing = await fetch(`${API_URL}/books`).then((r) => r.json());

      const missing = results.filter((b) => {
        if (!b.title || !b.author_name) return false;
        const titleLower = b.title.toLowerCase();
        if (titleLower === book.title.toLowerCase()) return false;
        return !existing.some((e) => e.title.toLowerCase() === titleLower);
      });

      setSequels(missing);
      setOpenDialog(true);
    } finally {
      setSearching(false);
    }
  };

  const addBook = async (item) => {
    const payload = {
      title: item.title,
      authorName: book?.author.name,
      seriesTitle: item.series ? item.series[0] : book?.series?.title,
      summary: book?.summary,
      rating: book?.rating || null,
      readDate: book?.readDate,
      citations: book?.citations,
      smut: book?.smut,
      coverUrl: book?.coverUrl,
      isRead: book?.isRead,
    };

    try {
      await fetch(`${API_URL}/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      fetchBookDetail();
    } catch {
      setError("Impossible d'ajouter la suite.");
    }
  };

  if (loading)
    return (
      <Container maxWidth="md" sx={{ py: 8, textAlign: "center" }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Chargement…</Typography>
      </Container>
    );

  if (error || !book)
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || "Livre introuvable"}
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate("/")}>
          Retour
        </Button>
      </Container>
    );

  const citations = book.citations ? JSON.parse(book.citations) : [];
  const smut = book.smut ? JSON.parse(book.smut) : [];

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* ------------------------------------------------------------------ */}
      {/* TOP BAR (iOS minimal) */}
      {/* ------------------------------------------------------------------ */}

      <Box sx={{ display: "flex", alignItems: "center", mb: 4, gap: 2 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/")}
          sx={{ color: "black", textTransform: "none", fontSize: "1rem" }}
        >
          Retour
        </Button>

        {book.isRead ? (
          <Button
            variant="outlined"
            onClick={markAsNotRead}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              color: "#333",
              borderColor: "#CCC",
            }}
          >
            Marquer comme non lu
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={markAsRead}
            sx={{
              borderRadius: 2,
              textTransform: "none",
              background: "#111",
              "&:hover": { background: "#000" },
            }}
          >
            ✓ Marquer comme lu
          </Button>
        )}

        <Button
          variant="outlined"
          onClick={findSequels}
          disabled={searching}
          sx={{
            textTransform: "none",
            borderRadius: 2,
            borderColor: "#CCC",
            color: "#333",
          }}
        >
          🔍 {searching ? "Recherche…" : "Suites"}
        </Button>
      </Box>

      {/* ------------------------------------------------------------------ */}
      {/* MAIN CARD (Apple look) */}
      {/* ------------------------------------------------------------------ */}

      <Paper
        elevation={0}
        sx={{
          p: 4,
          borderRadius: 5,
          border: "1px solid #EEE",
          background: "white",
          boxShadow: "0 10px 40px rgba(0,0,0,0.04)",
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: 4,
        }}
      >
        {/* COVER */}
        <Box
          sx={{
            width: { xs: "100%", md: 320 },
            background: "#FAFAFA",
            borderRadius: 4,
            p: 3,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "1px solid #EEE",
          }}
        >
          {book.coverUrl ? (
            <Box
              component="img"
              src={book.coverUrl}
              alt={book.title}
              sx={{
                width: "100%",
                borderRadius: 4,
                objectFit: "cover",
              }}
            />
          ) : (
            <MenuBookIcon sx={{ fontSize: 100, opacity: 0.2 }} />
          )}
        </Box>

        {/* INFO */}
        <Box sx={{ flex: 1 }}>
          <Typography
            variant="h4"
            sx={{
              fontWeight: 600,
              mb: 1,
              letterSpacing: "-0.5px",
            }}
          >
            {book.title}
          </Typography>

          <Typography variant="h6" sx={{ color: "#777", mb: 2 }}>
            {book.author.name}
          </Typography>

          {book.series && (
            <Chip
              label={`Série : ${book.series.title}`}
              variant="outlined"
              onClick={() => navigate(`/series/${book.series?.id}`)}
              sx={{
                borderRadius: 2,
                mb: 3,
                cursor: "pointer",
                "&:hover": { background: "#F0F0F0" },
              }}
            />
          )}

          <Box sx={{ display: "flex", gap: 4, mb: 3, flexWrap: "wrap" }}>
            {book.rating !== null && (
              <Box>
                <Typography variant="caption" color="#888">
                  Note
                </Typography>
                <Rating value={book.rating} readOnly />
              </Box>
            )}

            {book.readDate && (
              <Box>
                <Typography variant="caption" color="#888">
                  Lu le
                </Typography>
                <Typography fontWeight={500}>
                  {new Date(book.readDate).toLocaleDateString("fr-FR")}
                </Typography>
              </Box>
            )}
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              variant="contained"
              startIcon={<EditIcon />}
              sx={{
                borderRadius: 2,
                textTransform: "none",
                background: "#111",
                "&:hover": { background: "#000" },
              }}
              onClick={() => navigate(`/edit/${book.id}`)}
            >
              Modifier
            </Button>

            <Button
              variant="outlined"
              startIcon={<DeleteIcon />}
              color="error"
              sx={{
                borderRadius: 2,
                textTransform: "none",
              }}
              onClick={handleDelete}
            >
              Supprimer
            </Button>
          </Box>
        </Box>
      </Paper>

      {/* ------------------------------------------------------------------ */}
      {/* SUMMARY */}
      {/* ------------------------------------------------------------------ */}
      {book.summary && (
        <Paper
          elevation={0}
          sx={{
            mt: 4,
            p: 3,
            borderRadius: 4,
            border: "1px solid #EEE",
          }}
        >
          <Typography variant="h6" fontWeight="600" sx={{ mb: 1 }}>
            Résumé
          </Typography>
          <Typography sx={{ color: "#666", lineHeight: 1.6 }}>
            {book.summary}
          </Typography>
        </Paper>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* CITATIONS */}
      {/* ------------------------------------------------------------------ */}
      {citations.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            mt: 4,
            p: 3,
            borderRadius: 4,
            border: "1px solid #EEE",
          }}
        >
          <Typography variant="h6" fontWeight="600" sx={{ mb: 2 }}>
            Citations
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {citations.map((c, i) => (
              <Paper
                key={i}
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  border: "1px solid #F2F2F2",
                  background: "#FAFAFA",
                }}
              >
                <Typography fontStyle="italic" color="#444">
                  “{c}”
                </Typography>
              </Paper>
            ))}
          </Box>
        </Paper>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* SMUT */}
      {/* ------------------------------------------------------------------ */}
      {smut.length > 0 && (
        <Paper
          elevation={0}
          sx={{
            mt: 4,
            p: 3,
            borderRadius: 4,
            border: "1px solid #EEE",
          }}
        >
          <Typography variant="h6" fontWeight="600" sx={{ mb: 2 }}>
            Chapitres Smut
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            {smut.map((c, i) => (
              <Paper
                key={i}
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 3,
                  border: "1px solid #F2F2F2",
                  background: "#FAFAFA",
                }}
              >
                <Typography fontStyle="italic" color="#444">
                  “{c}”
                </Typography>
              </Paper>
            ))}
          </Box>
        </Paper>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* DIALOG SUITES (Apple Style) */}
      {/* ------------------------------------------------------------------ */}

      <Dialog
        open={openDialog}
        onClose={() => setOpenDialog(false)}
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 4,
            p: 1,
            boxShadow: "0 20px 60px rgba(0,0,0,0.15)",
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 600 }}>Suites trouvées</DialogTitle>

        <DialogContent dividers sx={{ border: 0 }}>
          {sequels.length === 0 ? (
            <Typography>Aucune suite trouvée.</Typography>
          ) : (
            <List>
              {sequels.map((s, i) => (
                <ListItem
                  key={i}
                  sx={{
                    borderRadius: 3,
                    mb: 1,
                    border: "1px solid #EEE",
                  }}
                  secondaryAction={
                    <Button
                      variant="contained"
                      onClick={() => addBook(s)}
                      sx={{
                        borderRadius: 3,
                        background: "#111",
                        textTransform: "none",
                        "&:hover": { background: "#000" },
                      }}
                    >
                      Ajouter
                    </Button>
                  }
                >
                  <ListItemAvatar>
                    <Avatar
                      sx={{
                        bgcolor: "#EEE",
                        color: "#555",
                      }}
                    >
                      {s.cover_i ? (
                        <img
                          src={`https://covers.openlibrary.org/b/id/${s.cover_i}-S.jpg`}
                          alt=""
                        />
                      ) : (
                        <MenuBookIcon fontSize="small" />
                      )}
                    </Avatar>
                  </ListItemAvatar>

                  <ListItemText
                    primary={s.title}
                    secondary={s.author_name?.[0]}
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => setOpenDialog(false)}
            sx={{ textTransform: "none" }}
          >
            Fermer
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
