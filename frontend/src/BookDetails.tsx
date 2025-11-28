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
      if (!response.ok) {
        throw new Error("Book not found");
      }
      const data = await response.json();
      setBook(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load book");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer ce livre ?")) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/books/${id}`, {
        method: "DELETE",
      });
      if (response.ok) {
        navigate("/");
      }
    } catch (err) {
      alert("Failed to delete book");
    }
  };

  const markAsRead = async () => {
    setSaving(true);

    const today = new Date().toISOString().split("T")[0];

    const payload = {
      ...book,
      seriesTitle: book?.series?.title,
      isRead: true,
      readDate: today,
    };

    try {
      const response = await fetch(`${API_URL}/books/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Erreur lors de la mise à jour");
      else fetchBookDetail();
    } catch (err) {
      setError("Impossible de marquer comme lu");
      console.error(err);
      setSaving(false);
    }
  };

  const markAsNotRead = async () => {
    setSaving(true);

    const payload = {
      ...book,
      seriesTitle: book?.series?.title,
      readDate: null,
      isRead: false,
    };

    try {
      const response = await fetch(`${API_URL}/books/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error("Erreur lors de la mise à jour");
      else fetchBookDetail();
    } catch (err) {
      setError("Impossible de marquer comme lu");
      console.error(err);
      setSaving(false);
    }
  };

  const findSequels = async () => {
    if (!book) return;
    setSearching(true);

    try {
      // Approche 1: Chercher le nom de la série dans le titre ou comme mot-clé général
      let sequelResults = [];

      // D'abord, essayer de chercher par titre + auteur pour voir si une série existe
      const searchUrl = `https://openlibrary.org/search.json?title=${encodeURIComponent(
        book.title
      )}&author=${encodeURIComponent(book.author.name)}&limit=1`;

      const res = await fetch(searchUrl);
      const data = await res.json();

      let seriesName = null;
      if (data.docs && data.docs[0] && data.docs[0].series) {
        seriesName = data.docs[0].series[0];
        console.log("Série trouvée:", seriesName);
      }

      if (seriesName) {
        // Chercher tous les livres qui contiennent le nom de la série
        // IMPORTANT: Utiliser 'q' au lieu de 'series'
        const seriesSearchUrl = `https://openlibrary.org/search.json?q=${encodeURIComponent(
          seriesName
        )}&author=${encodeURIComponent(book.author.name)}&limit=50`;

        const res2 = await fetch(seriesSearchUrl);
        const data2 = await res2.json();
        sequelResults = data2.docs || [];

        console.log(`${sequelResults.length} livres trouvés dans la série`);
      } else {
        // Plan B: Si pas de série détectée, chercher par auteur
        // et filtrer manuellement les titres similaires
        const authorSearchUrl = `https://openlibrary.org/search.json?author=${encodeURIComponent(
          book.author.name
        )}&limit=50`;

        const res3 = await fetch(authorSearchUrl);
        const data3 = await res3.json();

        // Chercher des patterns de suite (tome, volume, book, etc.)
        const titleBase = book.title
          .replace(/\s+(tome|volume|book|part|vol\.?)\s*\d+/i, "")
          .trim();

        sequelResults = data3.docs || [];

        console.log(`${sequelResults.length} livres similaires trouvés`);
      }

      // Récupérer les livres existants
      const existing = await fetch(`${API_URL}/books`).then((r) => r.json());

      // Filtrer les doublons
      const missing = sequelResults.filter((b) => {
        if (!b.title || !b.author_name[0]) return false;
        if (
          b.title.toLowerCase().trim() === book.title.toLowerCase().trim() ||
          b.author_name[0].toLowerCase() !== book.author.name.toLowerCase()
        )
          return false;
        const titleLower = b.title.toLowerCase();

        // Exclure les livres déjà dans la bibliothèque
        return !existing.some((e) => e.title.toLowerCase() === titleLower);
      });

      console.log(`${missing.length} livres potentielles trouvées`);
      setSequels(missing);

      if (missing.length > 0) {
        setOpenDialog(true);
      } else {
        setError("Aucune suite trouvée pour ce livre");
      }
    } catch (err) {
      console.error("Erreur findSequels:", err);
      setError("Erreur lors de la recherche de suites");
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
      rating: book?.rating ? book.rating : null,
      readDate: book?.readDate,
      citations: book?.citations,
      smut: book?.smut,
      coverUrl: book?.coverUrl,
      isRead: book?.isRead,
    };
    try {
      const response = await fetch(`${API_URL}/books`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Échec de la mise à jour du livre");
      } else {
        fetchBookDetail();
      }
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
        <Typography sx={{ mt: 2 }}>Chargement...</Typography>
      </Container>
    );
  }

  if (error || !book) {
    return (
      <Container maxWidth="md" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || "Livre non trouvé"}
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

  const citations = book.citations ? JSON.parse(book.citations) : [];
  const smut = book.smut ? JSON.parse(book.smut) : [];

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      {/* Back Button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate("/")}
        sx={{ mb: 3 }}
      >
        Retour à la liste
      </Button>

      {!book.isRead ? (
        <Button
          variant="contained"
          color="success"
          onClick={markAsRead}
          sx={{ mb: 3, ml: 2 }}
        >
          ✔️ Marquer comme lu
        </Button>
      ) : (
        <Button
          variant="contained"
          color="success"
          onClick={markAsNotRead}
          sx={{ mb: 3, ml: 2 }}
        >
          Marquer comme non lu
        </Button>
      )}

      <Button
        variant="contained"
        sx={{ mb: 3, ml: 2 }}
        onClick={findSequels}
        disabled={searching}
      >
        🔍 {searching ? "Recherche..." : "Trouver les suites"}
      </Button>

      <Paper elevation={3} sx={{ overflow: "hidden" }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 3,
          }}
        >
          {/* Book content unchanged */}

          <Dialog
            open={openDialog}
            onClose={() => setOpenDialog(false)}
            fullWidth
          >
            <DialogTitle>Suites trouvées</DialogTitle>
            <DialogContent>
              {sequels.length === 0 ? (
                <Typography>Aucune suite trouvée.</Typography>
              ) : (
                <List>
                  {sequels.map((s, i) => (
                    <ListItem
                      key={i}
                      secondaryAction={
                        <Button onClick={() => addBook(s)}>Ajouter</Button>
                      }
                    >
                      <ListItemAvatar>
                        <Avatar>
                          {s.cover_i ? (
                            <img
                              src={`https://covers.openlibrary.org/b/id/${s.cover_i}-S.jpg`}
                              alt=""
                            />
                          ) : (
                            "📘"
                          )}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText primary={s.title} />
                      <ListItemText secondary={s.author_name} />
                      {/* <ListItemText secondary={s.series[0]} /> */}
                    </ListItem>
                  ))}
                </List>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setOpenDialog(false)}>Fermer</Button>
            </DialogActions>
          </Dialog>
          {/* Book Cover */}
          <Box
            sx={{
              width: { xs: "100%", md: 300 },
              minHeight: 400,
              backgroundColor: "grey.100",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              p: 3,
            }}
          >
            {book.coverUrl ? (
              <Box
                component="img"
                src={book.coverUrl}
                alt={book.title}
                sx={{
                  maxWidth: "100%",
                  maxHeight: 500,
                  objectFit: "contain",
                  borderRadius: 1,
                  boxShadow: 3,
                }}
              />
            ) : (
              <Typography variant="h1" sx={{ opacity: 0.3 }}>
                📚
              </Typography>
            )}
          </Box>

          {/* Book Details */}
          <Box sx={{ flex: 1, p: 3 }}>
            {/* Title and Read Status */}
            <Box sx={{ mb: 2 }}>
              <Typography
                variant="h4"
                component="h1"
                fontWeight="bold"
                gutterBottom
              >
                {book.title}
              </Typography>

              <Typography variant="h6" color="text.secondary" gutterBottom>
                {book.author.name}
              </Typography>

              <Typography
                variant="h6"
                fontWeight="bold"
                color={book.isRead ? "success.main" : "text.secondary"}
              >
                {book.isRead ? "✓ Lu" : "Non lu"}
              </Typography>
            </Box>

            {book.series && (
              <Chip
                label={`Série: ${book.series?.title}`}
                color="primary"
                variant="outlined"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/series/${book.series?.id}`);
                }}
                sx={{
                  mb: 2,
                  cursor: "pointer",
                  "&:hover": {
                    backgroundColor: "primary.light",
                    color: "white",
                  },
                }}
              />
            )}

            {/* Meta Information */}
            <Box sx={{ display: "flex", gap: 4, mb: 3, flexWrap: "wrap" }}>
              {book.readDate && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Lu le
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {new Date(book.readDate).toLocaleDateString("fr-FR")}
                  </Typography>
                </Box>
              )}
            </Box>

            {/* Action Buttons */}
            <Box
              sx={{
                display: "flex",
                gap: 2,
                pt: 2,
                borderTop: 1,
                borderColor: "divider",
              }}
            >
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={() => navigate(`/edit/${book.id}`)}
              >
                Modifier
              </Button>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteIcon />}
                onClick={handleDelete}
              >
                Supprimer
              </Button>
            </Box>
          </Box>
        </Box>

        <Divider />

        {/* Summary Section */}
        {book.summary && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom fontWeight="bold">
              Résumé
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              {book.summary}
            </Typography>
          </Box>
        )}

        {/* Citations Section */}
        {citations.length > 0 && (
          <>
            <Divider />
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Citations favorites
              </Typography>
              <Box
                sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}
              >
                {citations.map((citation: string, index: number) => (
                  <Paper
                    key={index}
                    elevation={0}
                    sx={{
                      p: 2,
                      backgroundColor: "grey.50",
                      borderLeft: 4,
                      borderColor: "primary.main",
                    }}
                  >
                    <Typography variant="body1" fontStyle="italic">
                      "{citation}"
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </Box>
          </>
        )}
        {/* Smut Section */}
        {smut.length > 0 && (
          <>
            <Divider />
            <Box sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom fontWeight="bold">
                Chapitre de Smut
              </Typography>
              <Box
                sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}
              >
                {smut.map((citation: string, index: number) => (
                  <Paper
                    key={index}
                    elevation={0}
                    sx={{
                      p: 2,
                      backgroundColor: "grey.50",
                      borderLeft: 4,
                      borderColor: "primary.main",
                    }}
                  >
                    <Typography variant="body1" fontStyle="italic">
                      "{citation}"
                    </Typography>
                  </Paper>
                ))}
              </Box>
            </Box>
          </>
        )}
      </Paper>
    </Container>
  );
}
