import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";

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
  TextField,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import MenuBookIcon from "@mui/icons-material/MenuBook";

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
  tomeNb?: number | null;
  citations?: string | null;
  smut?: string | null;
  isRead?: boolean;
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

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");

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
  const fetchSeries = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/series/${id}`);
      const data = await res.json();
      setSeries(data);
      setNewTitle(data.title);
    } catch (e) {
      setError("Impossible de charger la collection");
    } finally {
      setLoading(false);
    }
  };

  // ---- RENAME COLLECTION ----
  const renameSeries = async () => {
    try {
      const res = await fetch(`${API_URL}/series/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      });

      if (!res.ok) throw new Error();

      setEditOpen(false);
      fetchSeries();
    } catch {
      alert("Erreur lors du renommage");
    }
  };

  // ---- DELETE COLLECTION ----
  const deleteSeries = async () => {
    try {
      const res = await fetch(`${API_URL}/series/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error();

      navigate("/");
    } catch {
      alert("Erreur lors de la suppression de la collection");
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

  const onDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(series?.books).sort(
      (a, b) => (a.tomeNb || 999) - (b.tomeNb || 999)
    );
    const [moved] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, moved);

    // Recompute tome numbers
    const updated = items.map((b, i) => ({ ...b, tomeNb: i + 1 }));

    setSeries({ ...series, books: updated });

    // Send updates to backend
    for (const b of updated) {
      await fetch(`${API_URL}/books/${b.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...b, seriesTitle: series?.title }),
      });
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

  if (!series)
    return (
      <Container sx={{ py: 5 }}>
        <Alert severity="error">Collection introuvable</Alert>
      </Container>
    );

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
              <Box sx={{ display: "flex", gap: 2 }}>
                <IconButton onClick={() => setEditOpen(true)}>
                  <EditIcon />
                </IconButton>
                <IconButton color="error" onClick={() => setDeleteOpen(true)}>
                  <DeleteIcon />
                </IconButton>
              </Box>
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
        <DragDropContext onDragEnd={onDragEnd}>
          <Droppable droppableId="series-books" direction="vertical">
            {(provided) => (
              <Grid
                container
                spacing={3}
                sx={{ mt: 3 }}
                {...provided.droppableProps}
                ref={provided.innerRef}
              >
                {series.books
                  .sort((a, b) => {
                    // Si les deux ont un tomeNB, comparer les numéros
                    if (a.tomeNb && b.tomeNb) {
                      return a.tomeNb - b.tomeNb;
                    }
                    // Si seulement a a un tomeNB, il vient en premier
                    if (a.tomeNb) return -1;
                    // Si seulement b a un tomeNB, il vient en premier
                    if (b.tomeNb) return 1;
                    // Si aucun n'a de tomeNB, garder l'ordre actuel
                    return 0;
                  })
                  .map((book, index) => (
                    <Draggable
                      key={book.id}
                      draggableId={book.id.toString()}
                      index={index}
                    >
                      {(providedDrag) => (
                        <Grid
                          item
                          xs={12}
                          sm={6}
                          md={4}
                          ref={providedDrag.innerRef}
                          {...providedDrag.draggableProps}
                          {...providedDrag.dragHandleProps}
                        >
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
                              <Typography
                                variant="h6"
                                gutterBottom
                                fontWeight="bold"
                              >
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
                                  <Rating
                                    value={book.rating}
                                    readOnly
                                    size="small"
                                  />
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
                                  {new Date(book.readDate).toLocaleDateString(
                                    "fr-FR"
                                  )}
                                </Typography>
                              )}
                            </CardContent>
                          </Card>
                        </Grid>
                      )}
                    </Draggable>
                  ))}

                {provided.placeholder}
              </Grid>
            )}
          </Droppable>
        </DragDropContext>
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

      {/* --- EDIT SERIES DIALOG --- */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)}>
        <DialogTitle>Renommer la collection</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Nouveau nom"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Annuler</Button>
          <Button variant="contained" onClick={renameSeries}>
            Renommer
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- DELETE SERIES DIALOG --- */}
      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>Supprimer la collection ?</DialogTitle>
        <DialogContent>
          <Typography>
            Tous les livres garderont leurs données mais seront retirés de la
            collection.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>Annuler</Button>
          <Button color="error" variant="contained" onClick={deleteSeries}>
            Supprimer
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
