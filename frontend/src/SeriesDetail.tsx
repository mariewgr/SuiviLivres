import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Container,
  Paper,
  Typography,
  Box,
  Button,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  Rating,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  IconButton,
  Checkbox,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";

interface Author {
  id: number;
  name: string;
}

interface Book {
  id: number;
  title: string;
  author: Author;
  summary?: string | null;
  coverUrl?: string | null;
  rating?: number | null;
  readDate?: string | null;
  pages?: number | null;
}

interface Series {
  id: number;
  title: string;
  books: Book[];
  createdAt: string;
}

const API_URL = "http://localhost:4000/api";

export default function SeriesDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [series, setSeries] = useState<Series | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [availableBooks, setAvailableBooks] = useState<Book[]>([]);
  const [selectedBooks, setSelectedBooks] = useState<number[]>([]);
  const [loadingBooks, setLoadingBooks] = useState(false);

  useEffect(() => {
    fetchSeriesDetail();
  }, [id]);

  const fetchSeriesDetail = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/series/${id}`);
      if (!response.ok) {
        throw new Error("Collection non trouvée");
      }
      const data = await response.json();
      setSeries(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Échec du chargement de la collection"
      );
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableBooks = async () => {
    try {
      setLoadingBooks(true);
      // Get all books
      const response = await fetch(`${API_URL}/books`);
      const allBooks = await response.json();

      // Filter out books already in this series
      const booksInSeries = series?.books.map((b) => b.id) || [];
      const available = allBooks.filter(
        (book: Book) => !booksInSeries.includes(book.id)
      );
      setAvailableBooks(available);
    } catch (err) {
      console.error("Error fetching books:", err);
    } finally {
      setLoadingBooks(false);
    }
  };

  const handleOpenAddDialog = () => {
    fetchAvailableBooks();
    setAddDialogOpen(true);
  };

  const handleToggleBook = (bookId: number) => {
    setSelectedBooks((prev) =>
      prev.includes(bookId)
        ? prev.filter((id) => id !== bookId)
        : [...prev, bookId]
    );
  };

  const handleAddBooks = async () => {
    try {
      // Update each selected book to add it to this series
      await Promise.all(
        selectedBooks.map((bookId) =>
          fetch(`${API_URL}/books/${bookId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              seriesTitle: series?.title,
            }),
          })
        )
      );

      // Refresh series data
      await fetchSeriesDetail();
      setAddDialogOpen(false);
      setSelectedBooks([]);
    } catch (err) {
      console.error("Error adding books:", err);
      alert("Erreur lors de l'ajout des livres");
    }
  };

  const handleRemoveBook = async (bookId: number, bookTitle: string) => {
    if (!window.confirm(`Retirer "${bookTitle}" de cette collection ?`)) {
      return;
    }

    try {
      // Update the book to remove it from the series
      await fetch(`${API_URL}/books/${bookId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seriesTitle: null,
        }),
      });

      // Refresh series data
      await fetchSeriesDetail();
    } catch (err) {
      console.error("Error removing book:", err);
      alert("Erreur lors du retrait du livre");
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 8, textAlign: "center" }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Chargement...</Typography>
      </Container>
    );
  }

  if (error || !series) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || "Collection non trouvée"}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate("/")}
          variant="outlined"
        >
          Retour à l'accueil
        </Button>
      </Container>
    );
  }

  const averageRating =
    series.books.length > 0 && series.books.filter((b) => b.rating).length > 0
      ? series.books.reduce((sum, book) => sum + (book.rating || 0), 0) /
        series.books.filter((b) => b.rating).length
      : 0;

  const totalPages = series.books.reduce(
    (sum, book) => sum + (book.pages || 0),
    0
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Back Button */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate("/")}
        sx={{ mb: 3 }}
      >
        Retour à l'accueil
      </Button>

      {/* Series Header */}
      <Paper elevation={3} sx={{ p: 4, mb: 4 }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 3,
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <MenuBookIcon sx={{ fontSize: 40, color: "primary.main" }} />
            <Box>
              <Typography variant="h3" component="h1" fontWeight="bold">
                {series.title}
              </Typography>
              <Typography variant="subtitle1" color="text.secondary">
                Collection de {series.books.length} livre
                {series.books.length > 1 ? "s" : ""}
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={<AddIcon />}
            onClick={handleOpenAddDialog}
          >
            Ajouter des livres
          </Button>
        </Box>

        {/* Series Stats */}
        <Grid container spacing={3}>
          <Grid item xs={12} sm={4}>
            <Box
              sx={{
                textAlign: "center",
                p: 2,
                backgroundColor: "grey.50",
                borderRadius: 2,
              }}
            >
              <Typography variant="h4" color="primary" fontWeight="bold">
                {series.books.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {series.books.length > 1 ? "Livres" : "Livre"}
              </Typography>
            </Box>
          </Grid>
          {averageRating > 0 && (
            <Grid item xs={12} sm={4}>
              <Box
                sx={{
                  textAlign: "center",
                  p: 2,
                  backgroundColor: "grey.50",
                  borderRadius: 2,
                }}
              >
                <Rating value={averageRating} readOnly precision={0.1} />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  Note moyenne
                </Typography>
              </Box>
            </Grid>
          )}
          {totalPages > 0 && (
            <Grid item xs={12} sm={4}>
              <Box
                sx={{
                  textAlign: "center",
                  p: 2,
                  backgroundColor: "grey.50",
                  borderRadius: 2,
                }}
              >
                <Typography variant="h4" color="primary" fontWeight="bold">
                  {totalPages}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pages au total
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </Paper>

      {/* Books in Series */}
      <Typography variant="h5" gutterBottom fontWeight="bold" sx={{ mb: 3 }}>
        📚 Livres de la collection
      </Typography>

      {series.books.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center" }}>
          <Typography color="text.secondary" gutterBottom>
            Aucun livre dans cette collection pour le moment.
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAddDialog}
            sx={{ mt: 2 }}
          >
            Ajouter des livres
          </Button>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {series.books.map((book, index) => (
            <Grid item xs={12} sm={6} md={4} key={book.id}>
              <Card
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  position: "relative",
                  transition: "all 0.3s ease",
                  "&:hover": {
                    boxShadow: 6,
                  },
                }}
              >
                {/* Remove Button */}
                <IconButton
                  sx={{
                    position: "absolute",
                    top: 8,
                    right: 8,
                    backgroundColor: "rgba(255, 255, 255, 0.95)",
                    boxShadow: 2,
                    "&:hover": {
                      backgroundColor: "error.main",
                      color: "white",
                    },
                    zIndex: 2,
                  }}
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveBook(book.id, book.title);
                  }}
                  title="Retirer de la collection"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>

                {/* Book Cover */}
                <Box
                  sx={{
                    position: "relative",
                    cursor: "pointer",
                    "&:hover": {
                      opacity: 0.9,
                    },
                  }}
                  onClick={() => navigate(`/book/${book.id}`)}
                >
                  {book.coverUrl ? (
                    <CardMedia
                      component="img"
                      height="300"
                      image={book.coverUrl}
                      alt={book.title}
                      sx={{ objectFit: "cover" }}
                    />
                  ) : (
                    <Box
                      sx={{
                        height: 300,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "grey.200",
                      }}
                    >
                      <Typography fontSize={60}>📚</Typography>
                    </Box>
                  )}
                  {/* Book Number Badge */}
                  <Chip
                    label={`#${index + 1}`}
                    color="primary"
                    size="small"
                    sx={{
                      position: "absolute",
                      top: 8,
                      left: 8,
                      fontWeight: "bold",
                    }}
                  />
                </Box>

                {/* Book Info */}
                <CardContent
                  sx={{
                    flexGrow: 1,
                    cursor: "pointer",
                    "&:hover": {
                      backgroundColor: "action.hover",
                    },
                  }}
                  onClick={() => navigate(`/book/${book.id}`)}
                >
                  <Typography variant="h6" gutterBottom fontWeight="bold">
                    {book.title}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    par {book.author.name}
                  </Typography>

                  {book.rating && (
                    <Box sx={{ mt: 1 }}>
                      <Rating value={book.rating} readOnly size="small" />
                    </Box>
                  )}

                  {book.pages && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ mt: 1, display: "block" }}
                    >
                      {book.pages} pages
                    </Typography>
                  )}

                  {book.readDate && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      sx={{ display: "block" }}
                    >
                      Lu le{" "}
                      {new Date(book.readDate).toLocaleDateString("fr-FR")}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add Books Dialog */}
      <Dialog
        open={addDialogOpen}
        onClose={() => {
          setAddDialogOpen(false);
          setSelectedBooks([]);
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            Ajouter des livres à "{series?.title}"
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          {loadingBooks ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : availableBooks.length === 0 ? (
            <Box sx={{ py: 4, textAlign: "center" }}>
              <Typography color="text.secondary">
                Tous vos livres sont déjà dans cette collection ou vous n'avez
                pas d'autres livres.
              </Typography>
            </Box>
          ) : (
            <List sx={{ pt: 0 }}>
              {availableBooks.map((book) => (
                <ListItem
                  key={book.id}
                  disablePadding
                  sx={{
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    "&:last-child": {
                      borderBottom: "none",
                    },
                  }}
                >
                  <ListItemButton
                    onClick={() => handleToggleBook(book.id)}
                    sx={{ py: 1.5 }}
                  >
                    <Checkbox
                      checked={selectedBooks.includes(book.id)}
                      edge="start"
                      tabIndex={-1}
                      disableRipple
                    />
                    {book.coverUrl && (
                      <Box
                        component="img"
                        src={book.coverUrl}
                        alt={book.title}
                        sx={{
                          width: 50,
                          height: 70,
                          objectFit: "cover",
                          borderRadius: 1,
                          mr: 2,
                          boxShadow: 1,
                        }}
                      />
                    )}
                    <ListItemText
                      primary={
                        <Typography fontWeight={500}>{book.title}</Typography>
                      }
                      secondary={`par ${book.author.name}`}
                    />
                  </ListItemButton>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={() => {
              setAddDialogOpen(false);
              setSelectedBooks([]);
            }}
            size="large"
          >
            Annuler
          </Button>
          <Button
            variant="contained"
            size="large"
            onClick={handleAddBooks}
            disabled={selectedBooks.length === 0}
            startIcon={<AddIcon />}
          >
            Ajouter {selectedBooks.length > 0 && `(${selectedBooks.length})`}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
