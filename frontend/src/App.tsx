import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import BookDetail from "./BookDetails";
import BookEdit from "./BookEdit";
import SeriesDetail from "./SeriesDetail";
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardMedia,
  CardContent,
  CircularProgress,
  Chip,
  IconButton,
  Tabs,
  Tab,
  Badge,
  ListItem,
  ListItemButton,
  ListItemText,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import AddIcon from "@mui/icons-material/Add";

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
  coverUrl?: string;
  citations?: string[];
  isRead?: boolean;
  readDate?: string;
  smut?: string[];
  author: Author;
  series?: Series;
}

interface PendingBook {
  book: Book;
  coverUrl?: string;
  nextSeriesTitle?: string;
}

interface OpenLibraryBook {
  key: string;
  title: string;
  author_name?: string[];
  cover_i?: number;
  first_publish_year?: number;
  isbn?: string[];
  series?: string[];
}

interface SeriesWithCount {
  id: number;
  title: string;
  books: Book[];
  _count: {
    books: number;
  };
}

const API_URL = "http://localhost:4000/api";

function BookList() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [series, setSeries] = useState<SeriesWithCount[]>([]);
  const [currentTab, setCurrentTab] = useState(0);
  const [form, setForm] = useState({
    title: "",
    authorName: "",
    seriesTitle: "",
    summary: "",
    rating: "",
    citations: "",
    smut: "",
    tomeNb: -1,
  });

  const [pendingBook, setPendingBook] = useState<PendingBook | null>(null);
  const [openDialog, setOpenDialog] = useState(false);

  // Search functionality
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<OpenLibraryBook[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedBooksToRead, setSelectedBooksToRead] = useState<Book[]>([]);

  // Create collection functionality
  const [createCollectionOpen, setCreateCollectionOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [selectedBooksForCollection, setSelectedBooksForCollection] = useState<
    number[]
  >([]);

  useEffect(() => {
    fetchBooks();
    fetchSeries();
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

  const fetchSeries = async () => {
    try {
      const res = await fetch(`${API_URL}/series`);
      const data = await res.json();
      setSeries(data);
    } catch (err) {
      console.error("Erreur fetchSeries:", err);
    }
  };

  // --- TOGGLE SELECTION ---
  const handleToggleSelectToRead = (book) => {
    setSelectedBooksToRead((prev) =>
      prev.includes(book)
        ? prev.filter((b) => b.id !== book.id)
        : [...prev, book]
    );
  };

  // --- MARK SELECTED BOOKS AS READ ---
  const handleMarkSelectedAsRead = async () => {
    try {
      await Promise.all(
        selectedBooksToRead.map((b) =>
          fetch(`${API_URL}/books/${b.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...b,
              seriesTitle: b.series?.title,
              isRead: true,
              readDate: new Date(),
            }),
          })
        )
      );

      setSelectedBooksToRead([]);
      fetchBooks();
    } catch (err) {
      console.error("Erreur mark-as-read:", err);
      alert("Impossible de marquer comme lu");
    }
  };
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSearchBooks = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const response = await fetch(
        `https://openlibrary.org/search.json?q=${encodeURIComponent(
          searchQuery
        )}&limit=10`
      );
      const data = await response.json();
      setSearchResults(data.docs || []);
    } catch (error) {
      console.error("Error searching books:", error);
      alert("Erreur lors de la recherche de livres");
    } finally {
      setSearching(false);
    }
  };

  const handleSelectBook = (book: OpenLibraryBook) => {
    const coverUrl = book.cover_i
      ? `https://covers.openlibrary.org/b/id/${book.cover_i}-L.jpg`
      : "";

    setForm({
      title: book.title || "",
      authorName: book.author_name?.[0] || "",
      seriesTitle: book.series?.[0] || "",
      summary: "",
      rating: "",
      citations: "",
      smut: "",
      tomeNb: -1,
    });

    // Store cover URL separately if needed
    if (coverUrl) {
      (form as any).coverUrl = coverUrl;
    }

    setSearchDialogOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newCollectionName != "" && form.seriesTitle === "__new__")
      form.seriesTitle = newCollectionName;

    const payload = {
      ...form,
      rating: form.rating ? parseInt(form.rating) : null,
      citations: form.citations ? form.citations.split(";") : [],
      smut: form.smut ? form.smut.split(";") : [],
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
        fetchSeries();
      }

      setForm({
        title: "",
        authorName: "",
        seriesTitle: "",
        summary: "",
        rating: "",
        citations: "",
        smut: "",
        tomeNb: -1,
      });
    } catch (err) {
      console.error("Erreur addBook:", err);
    }
    setCreateCollectionOpen(false);
    setNewCollectionName("");
  };

  const handleBookClick = (bookId: number) => {
    navigate(`/book/${bookId}`);
  };

  const handleToggleBookForCollection = (bookId: number) => {
    setSelectedBooksForCollection((prev) =>
      prev.includes(bookId)
        ? prev.filter((id) => id !== bookId)
        : [...prev, bookId]
    );
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) {
      alert("Veuillez entrer un nom pour la collection");
      return;
    }

    try {
      // Update each selected book to add it to the new series
      await Promise.all(
        selectedBooksForCollection.map((bookId) =>
          fetch(`${API_URL}/books/${bookId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              seriesTitle: newCollectionName.trim(),
            }),
          })
        )
      );

      // Refresh data
      await fetchBooks();
      await fetchSeries();

      // Reset and close
      setCreateCollectionOpen(false);
      setNewCollectionName("");
      setSelectedBooksForCollection([]);
    } catch (err) {
      console.error("Error creating collection:", err);
      alert("Erreur lors de la création de la collection");
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h3" gutterBottom>
        📚 Suivi de Livres
      </Typography>

      {/* Tabs for Books and Collections */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={currentTab}
          onChange={(e, newValue) => setCurrentTab(newValue)}
        >
          <Tab label={`Livres (${books.length})`} />
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                Collections
                <Badge badgeContent={series.length} color="primary" />
              </Box>
            }
          />
        </Tabs>
      </Box>

      {/* Tab Content */}
      {currentTab === 0 ? (
        <>
          {/* Formulaire */}
          <Paper sx={{ p: 3, mb: 4 }} elevation={3}>
            {/* Header with Search Button */}
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 3,
              }}
            >
              <Typography variant="h6" fontWeight="bold">
                Ajouter un livre
              </Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<SearchIcon />}
                onClick={() => setSearchDialogOpen(true)}
                size="large"
              >
                Rechercher en ligne
              </Button>
            </Box>

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
                <FormControl fullWidth>
                  <InputLabel id="series-select-label">
                    Collection / Série (optionnel)
                  </InputLabel>
                  <Select
                    labelId="series-select-label"
                    value={form.seriesTitle}
                    label="Collection / Série (optionnel)"
                    onChange={(e) =>
                      setForm({ ...form, seriesTitle: e.target.value })
                    }
                  >
                    <MenuItem value="">
                      <em>Aucune collection</em>
                    </MenuItem>
                    {series.map((s) => (
                      <MenuItem key={s.id} value={s.title}>
                        {s.title} ({s.books?.length || 0} livre
                        {(s.books?.length || 0) > 1 ? "s" : ""})
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
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    value={newCollectionName}
                    sx={{ mt: 2 }}
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
                />
              </Grid>
              <Grid container xs={10} spacing={2}>
                <Grid item xs={12} sm={5}>
                  <Box>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      gutterBottom
                    >
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
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Numéro du Tome"
                    name="tomeNb"
                    value={form.tomeNb}
                    onChange={handleChange}
                    multiline
                    rows={1}
                  />
                </Grid>
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
                <TextField
                  fullWidth
                  label="Chapitre de Smut (séparées par ;)"
                  name="smut"
                  value={form.smut}
                  onChange={handleChange}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSubmit}
                >
                  Ajouter le livre
                </Button>
              </Grid>
            </Grid>
          </Paper>

          {/* Liste des livres */}
          <Typography variant="h4" gutterBottom>
            📖 Liste des livres
          </Typography>
          <Button
            variant="contained"
            color="success"
            disabled={selectedBooksToRead.length === 0}
            onClick={handleMarkSelectedAsRead}
            sx={{ mb: 2 }}
          >
            Marquer comme lu ({selectedBooksToRead.length})
          </Button>
          <List>
            {books.map(
              (b) =>
                !b.isRead && (
                  <ListItem disablePadding>
                    <ListItemButton
                      onClick={() => handleToggleSelectToRead(b)}
                      sx={{ alignItems: "flex-start" }}
                    >
                      <Checkbox
                        checked={selectedBooksToRead.includes(b)}
                        tabIndex={-1}
                        disableRipple
                        sx={{ mt: 1 }}
                      />
                      <Paper
                        key={b.id}
                        sx={{
                          mb: 2,
                          p: 2,
                          display: "flex",
                          gap: 2,
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          "&:hover": {
                            transform: "translateY(-2px)",
                            boxShadow: 6,
                            backgroundColor: "action.hover",
                          },
                        }}
                        elevation={2}
                        onClick={() => handleBookClick(b.id)}
                      >
                        {b.coverUrl && (
                          <Box
                            component="img"
                            src={b.coverUrl}
                            alt={b.title}
                            sx={{
                              width: 100,
                              height: 140,
                              objectFit: "cover",
                              borderRadius: 1,
                            }}
                          />
                        )}
                        <Box sx={{ flex: 1 }}>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {b.title}
                          </Typography>
                          <Typography
                            variant="subtitle2"
                            color="text.secondary"
                          >
                            {b.author?.name}
                          </Typography>
                          {b.rating && (
                            <Box sx={{ mt: 1 }}>
                              <Rating value={b.rating} readOnly size="small" />
                            </Box>
                          )}
                          {b.series && (
                            <Chip
                              label={`Série: ${b.series.title}`}
                              color="primary"
                              variant="outlined"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/series/${b.series?.id}`);
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
                          {b.summary && (
                            <Typography
                              variant="body2"
                              sx={{
                                mt: 1,
                                display: "-webkit-box",
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: "vertical",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {b.summary}
                            </Typography>
                          )}
                        </Box>
                      </Paper>
                    </ListItemButton>
                  </ListItem>
                )
            )}
          </List>
        </>
      ) : (
        /* Collections Tab */
        <Box>
          {/* Header with Create Button */}
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 3,
              flexWrap: "wrap",
              gap: 2,
            }}
          >
            <Typography variant="h4" fontWeight="bold">
              📚 Mes Collections
            </Typography>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => setCreateCollectionOpen(true)}
              size="large"
              sx={{
                fontWeight: "bold",
                px: 3,
              }}
            >
              Créer une collection
            </Button>
          </Box>

          {series.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: "center" }}>
              <MenuBookIcon sx={{ fontSize: 60, color: "grey.400", mb: 2 }} />
              <Typography color="text.secondary" gutterBottom>
                Aucune collection pour le moment.
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Ajoutez des livres avec une série pour créer des collections !
              </Typography>
            </Paper>
          ) : (
            <List>
              {series.map((s) => (
                <Paper
                  key={s.id}
                  sx={{
                    mb: 2,
                    overflow: "hidden",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: 6,
                    },
                  }}
                  elevation={2}
                  onClick={() => navigate(`/series/${s.id}`)}
                >
                  <Box sx={{ display: "flex", gap: 2 }}>
                    {/* Collection Cover */}
                    <Box
                      sx={{
                        width: 150,
                        height: 200,
                        backgroundColor: "grey.100",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      {s.books && s.books.length > 0 && s.books[0].coverUrl ? (
                        <Box
                          component="img"
                          src={s.books[0].coverUrl}
                          alt={s.title}
                          sx={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        <MenuBookIcon
                          sx={{ fontSize: 60, color: "grey.400" }}
                        />
                      )}
                    </Box>

                    {/* Collection Info */}
                    <Box
                      sx={{
                        flex: 1,
                        p: 2,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                      }}
                    >
                      <Typography variant="h5" fontWeight="bold" gutterBottom>
                        {s.title}
                      </Typography>
                      {s.books && s.books.length > 0 && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          par {s.books[0].author.name}
                        </Typography>
                      )}
                      <Box
                        sx={{
                          display: "flex",
                          gap: 1,
                          mt: 1,
                          flexWrap: "wrap",
                        }}
                      >
                        <Chip
                          label={`${s.books?.length || 0} livre${
                            (s.books?.length || 0) > 1 ? "s" : ""
                          }`}
                          color="primary"
                          size="small"
                        />
                        {s.books && s.books.length > 0 && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ alignSelf: "center", ml: 1 }}
                          >
                            Cliquez pour voir les détails
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </Paper>
              ))}
            </List>
          )}
        </Box>
      )}

      {/* Search Dialog */}
      <Dialog
        open={searchDialogOpen}
        onClose={() => setSearchDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            Rechercher un livre
            <IconButton onClick={() => setSearchDialogOpen(false)}>
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", gap: 2, mb: 3 }}>
            <TextField
              fullWidth
              placeholder="Titre, auteur ou ISBN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearchBooks()}
            />
            <Button
              variant="contained"
              onClick={handleSearchBooks}
              disabled={searching || !searchQuery.trim()}
            >
              {searching ? <CircularProgress size={24} /> : <SearchIcon />}
            </Button>
          </Box>

          {searching && (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <CircularProgress />
              <Typography sx={{ mt: 2 }}>Recherche en cours...</Typography>
            </Box>
          )}

          {!searching && searchResults.length === 0 && searchQuery && (
            <Typography color="text.secondary" align="center">
              Aucun résultat trouvé. Essayez une autre recherche.
            </Typography>
          )}

          <Grid container spacing={2}>
            {searchResults.map((book, index) => (
              <Grid item xs={12} key={book.key || index}>
                <Card
                  sx={{
                    display: "flex",
                    cursor: "pointer",
                    "&:hover": { boxShadow: 4 },
                  }}
                  onClick={() => handleSelectBook(book)}
                >
                  {book.cover_i ? (
                    <CardMedia
                      component="img"
                      sx={{ width: 100, objectFit: "cover" }}
                      image={`https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg`}
                      alt={book.title}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 100,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "grey.200",
                      }}
                    >
                      <Typography fontSize={40}>📚</Typography>
                    </Box>
                  )}
                  <CardContent sx={{ flex: 1 }}>
                    <Typography variant="h6" gutterBottom>
                      {book.title}
                    </Typography>
                    {book.author_name && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        gutterBottom
                      >
                        par {book.author_name.join(", ")}
                      </Typography>
                    )}
                    <Box
                      sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 1 }}
                    >
                      {book.first_publish_year && (
                        <Chip label={book.first_publish_year} size="small" />
                      )}
                      {book.series && book.series.length > 0 && (
                        <Chip
                          label={`Série: ${book.series[0]}`}
                          size="small"
                          color="primary"
                        />
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSearchDialogOpen(false)}>Fermer</Button>
        </DialogActions>
      </Dialog>

      {/* Create Collection Dialog */}
      <Dialog open={createCollectionOpen} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Typography variant="h6" fontWeight="bold">
            Créer une nouvelle collection
          </Typography>
        </DialogTitle>
        <DialogContent dividers>
          <TextField
            fullWidth
            label="Nom de la collection"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            sx={{ mb: 3 }}
            autoFocus
          />

          <Typography variant="subtitle2" fontWeight="bold" gutterBottom>
            Sélectionnez les livres à ajouter (optionnel)
          </Typography>

          {books.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              Aucun livre disponible. Ajoutez d'abord des livres à votre
              bibliothèque.
            </Typography>
          ) : (
            <List sx={{ maxHeight: 400, overflow: "auto" }}>
              {books.map((book) => (
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
                    onClick={() => handleToggleBookForCollection(book.id)}
                  >
                    <Checkbox
                      checked={selectedBooksForCollection.includes(book.id)}
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
              setCreateCollectionOpen(false);
              setNewCollectionName("");
              setSelectedBooksForCollection([]);
            }}
            size="large"
          >
            Annuler
          </Button>
          <Button
            variant="contained"
            size="large"
            onClick={handleCreateCollection}
            disabled={!newCollectionName.trim()}
            startIcon={<AddIcon />}
          >
            Créer{" "}
            {selectedBooksForCollection.length > 0 &&
              `(${selectedBooksForCollection.length} livres)`}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<BookList />} />
        <Route path="/book/:id" element={<BookDetail />} />
        <Route path="/edit/:id" element={<BookEdit />} />
        <Route path="/series/:id" element={<SeriesDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
