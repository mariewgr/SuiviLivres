import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import BookDetail from "./BookDetails";
import BookEdit from "./BookEdit";
import SeriesDetail from "./SeriesDetail";
import { API_URL } from "./api";

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
  IconButton,
  Tabs,
  Tab,
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
import AddIcon from "@mui/icons-material/Add";
import ChronologicalTab from "./ChronologocalTab";

interface Author {
  id: number;
  name: string;
}

interface Series {
  id: number;
  title: string;
}

export interface Book {
  id: number;
  title: string;
  summary: string;
  rating: number;
  coverUrl: string;
  citations: string[];
  isRead: boolean;
  readDate?: string;
  smut: string[];
  author: Author;
  series: Series;
  tomeNb: number;
  googleBooksId?: string;
}

interface PendingBook {
  book: Book;
  coverUrl?: string;
}

interface ScrapedBook {
  key: string;
  title: string;
  originalTitle: string;
  author_name: string[];
  description: string;
  cover: string;
  first_publish_year?: number;
  isbn?: string[];
  link: string;
  googleBooksId: string;
  tomeNb: string;
}

interface SeriesWithCount {
  id: number;
  title: string;
  books: Book[];
  _count: {
    books: number;
  };
}

function BookList() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [series, setSeries] = useState<SeriesWithCount[]>([]);
  const [currentTab, setCurrentTab] = useState(0);

  const [form, setForm] = useState<Book>({
    id: -1,
    title: "",
    author: { id: 0, name: "" },
    series: { id: 0, title: "" },
    summary: "",
    rating: 0,
    coverUrl: "",
    citations: [],
    smut: [],
    tomeNb: -1,
    isRead: false,
    readDate: "",
  });

  const [pendingBook, setPendingBook] = useState<PendingBook | null>(null);
  const [openDialog, setOpenDialog] = useState(false);

  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchBook, setSearchBook] = useState("");
  const [searchCollection, setSearchCollection] = useState("");

  const [searchResults, setSearchResults] = useState<ScrapedBook[]>([]);
  const [searching, setSearching] = useState(false);
  const [availableBooks, setAvailableBooks] = useState<Book[]>([]);
  const [availableCollections, setAvailableCollections] = useState<
    SeriesWithCount[]
  >([]);
  const [loadingBooks, setLoadingBooks] = useState(false);
  const [loadingCollections, setLoadingCollections] = useState(false);

  const [createCollectionOpen, setCreateCollectionOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [selectedBooksForCollection, setSelectedBooksForCollection] = useState<
    number[]
  >([]);

  useEffect(() => {
    fetchBooks();
    fetchSeries();
  }, []);

  const fetchAvailableBooks = async () => {
    try {
      setLoadingBooks(true);
      const res = await fetch(`${API_URL}/books`);
      const allBooks = await res.json();

      const filtered =
        searchBook == ""
          ? allBooks
          : allBooks.filter((b: Book) => {
              const q = searchBook.toLowerCase();
              return (
                (b.title && b.title.toLowerCase().includes(q)) ||
                (b.author && b.author.name.toLowerCase().includes(q)) ||
                b.series?.title.toLowerCase().includes(q)
              );
            });

      setAvailableBooks(filtered);
    } finally {
      setLoadingBooks(false);
    }
  };

  const fetchAvailableCollections = async () => {
    try {
      setLoadingCollections(true);
      const res = await fetch(`${API_URL}/series`);
      const allSeries = await res.json();

      const filtered =
        searchCollection == ""
          ? allSeries
          : allSeries.filter((b: SeriesWithCount) => {
              const q = searchCollection.toLowerCase();
              return b.title.toLowerCase().includes(q);
            });

      setAvailableCollections(filtered);
    } finally {
      setLoadingCollections(false);
    }
  };

  const fetchBooks = async () => {
    const res = await fetch(`${API_URL}/books`);
    setBooks(await res.json());
  };

  const fetchSeries = async () => {
    const res = await fetch(`${API_URL}/series`);
    const series = await res.json();
    setSeries(series);
    setAvailableCollections(series);
  };

  const handleSearchBooks = async () => {
    if (!searchQuery.trim()) return;

    setSearching(true);
    try {
      const response = await fetch(
        `${API_URL}/googlebooks/search?q=${encodeURIComponent(searchQuery)}`
      );

      const data = await response.json();
      setSearchResults(data);
    } finally {
      setSearching(false);
    }
  };

  const handleSelectBook = async (book: ScrapedBook) => {
    setForm({
      id: -1,
      googleBooksId: book.googleBooksId,
      title: book.title,
      author: { id: 0, name: book.author_name?.[0] || "" },
      series: { id: 0, title: "" }, // Google Books n'a pas de séries structurées
      summary: book.description || "",
      rating: 0,
      citations: [],
      smut: [],
      tomeNb: parseFloat(book.tomeNb || "-1"),
      coverUrl: book.cover || "",
      isRead: false,
    });

    setSearchDialogOpen(false);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newCollectionName !== "" && form?.series?.title === "__new__") {
      form.series.title = newCollectionName;
    }

    const res = await fetch(`${API_URL}/books`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const data = await res.json();

    if (data.coverUrl) {
      setPendingBook(data);
      setOpenDialog(true);
    } else {
      fetchBooks();
      fetchSeries();
    }

    setForm({
      id: -1,
      title: "",
      author: { id: 0, name: "" },
      series: { id: 0, title: "" },
      summary: "",
      rating: 0,
      citations: [],
      smut: [],
      tomeNb: -1,
      coverUrl: "",
      isRead: false,
    });

    setNewCollectionName("");
  };

  const handleToggleBookForCollection = (id: number) => {
    setSelectedBooksForCollection((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  };

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) {
      alert("Veuillez entrer un nom.");
      return;
    }

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

    fetchBooks();
    fetchSeries();
    setCreateCollectionOpen(false);
    setSelectedBooksForCollection([]);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleBookClick = (id: number) => {
    navigate(`/book/${id}`);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" sx={{ mb: 3, fontWeight: "bold" }}>
        📚 Suivi de Livres
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 4 }}>
        <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)}>
          <Tab label={`Livres`} />
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                Collections
              </Box>
            }
          />
          <Tab
            label={
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                Chronologie
              </Box>
            }
          />
        </Tabs>
      </Box>

      {/* ---------------------------------------------------------------- */}
      {/* ----------------------------- TAB LIVRES ----------------------- */}
      {/* ---------------------------------------------------------------- */}

      {currentTab === 0 && (
        <Grid container spacing={4} sx={{ mt: 1 }}>
          {/* ------------------------------------------------------------ */}
          {/*                       FORMULAIRE GAUCHE                      */}
          {/* ------------------------------------------------------------ */}

          <Grid item xs={12} md={4}>
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
                ✨ Ajouter un nouveau livre
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<SearchIcon />}
                    onClick={() => setSearchDialogOpen(true)}
                    sx={{
                      py: 1.2,
                      borderRadius: 3,
                      textTransform: "none",
                      fontWeight: 600,
                    }}
                  >
                    Rechercher en ligne
                  </Button>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Titre"
                    name="title"
                    value={form?.title}
                    onChange={handleChange}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Auteur"
                    name="authorName"
                    value={form?.author ? form?.author.name : ""}
                    onChange={handleChange}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <FormControl fullWidth>
                    <InputLabel>Série (optionnel)</InputLabel>
                    <Select
                      value={form?.series?.title}
                      label="Série (optionnel)"
                      onChange={(e) =>
                        setForm({
                          ...form,
                          id: 0,
                          series: { id: 0, title: e.target.value },
                        })
                      }
                      sx={{ borderRadius: 3 }}
                    >
                      <MenuItem value="">
                        <em>Aucune série</em>
                      </MenuItem>

                      {series.map((s) => (
                        <MenuItem key={s.id} value={s.title}>
                          {s.title} ({s.books.length} livres)
                        </MenuItem>
                      ))}

                      <MenuItem value="__new__">
                        <em>+ Nouvelle série…</em>
                      </MenuItem>
                    </Select>
                  </FormControl>

                  {form?.series?.title === "__new__" && (
                    <TextField
                      fullWidth
                      label="Nom de la nouvelle série"
                      value={newCollectionName}
                      onChange={(e) => setNewCollectionName(e.target.value)}
                      sx={{
                        mt: 2,
                        "& .MuiOutlinedInput-root": { borderRadius: 3 },
                      }}
                    />
                  )}
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Résumé"
                    name="summary"
                    value={form?.summary}
                    multiline
                    rows={3}
                    onChange={handleChange}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
                  />
                </Grid>

                <Grid item xs={6}>
                  <Typography variant="body2" fontWeight={600} sx={{ mb: 1 }}>
                    Note
                  </Typography>
                  <Rating
                    value={form?.rating ? form.rating : 0}
                    onChange={(e, v) =>
                      setForm({ ...form, id: 0, rating: v ? v : 0 })
                    }
                  />
                </Grid>

                <Grid item xs={6}>
                  <TextField
                    fullWidth
                    label="Numéro du tome"
                    name="tomeNb"
                    value={form?.tomeNb}
                    onChange={handleChange}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Citations (séparées par ; )"
                    name="citations"
                    value={form?.citations}
                    onChange={handleChange}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Chapitres Smut (séparés par ; )"
                    name="smut"
                    value={form?.smut}
                    onChange={handleChange}
                    sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    onClick={handleSubmit}
                    sx={{
                      py: 1.4,
                      borderRadius: 3,
                      fontWeight: "bold",
                      fontSize: "1rem",
                    }}
                  >
                    Ajouter le livre
                  </Button>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
          {/* ------------------------------------------------------------ */}
          {/*                     TROISIÈME COLONNE : NON LUS             */}
          {/* ------------------------------------------------------------ */}

          <Grid item xs={12} md={4}>
            <Paper
              elevation={3}
              sx={{
                p: 3,
                borderRadius: 4,
                height: "100%",
                maxHeight: "85vh",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
                📖 Livres non lus
              </Typography>

              <Box sx={{ overflowY: "auto", pr: 1 }}>
                {books.filter((b) => !b.isRead).length === 0 ? (
                  <Typography
                    color="text.secondary"
                    sx={{ mt: 3, textAlign: "center" }}
                  >
                    Aucun livre non lu 🎉
                  </Typography>
                ) : (
                  <List>
                    {books
                      .filter((b) => !b.isRead)
                      .map((b) => (
                        <ListItem key={b.id} disablePadding>
                          <ListItemButton
                            sx={{
                              p: 2,
                              borderRadius: 3,
                              mb: 2,
                              transition: "0.3s",
                              "&:hover": {
                                backgroundColor: "rgba(0,0,0,0.04)",
                                transform: "translateY(-2px)",
                              },
                            }}
                            onClick={() => navigate(`/book/${b.id}`)}
                          >
                            <Box sx={{ display: "flex", gap: 2 }}>
                              {b.coverUrl ? (
                                <Box
                                  component="img"
                                  src={b.coverUrl}
                                  alt={b.title}
                                  sx={{
                                    width: 60,
                                    height: 85,
                                    borderRadius: 2,
                                    objectFit: "cover",
                                  }}
                                />
                              ) : (
                                <Box
                                  sx={{
                                    width: 60,
                                    height: 85,
                                    borderRadius: 2,
                                    backgroundColor: "grey.300",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                  }}
                                >
                                  📘
                                </Box>
                              )}

                              <Box>
                                <Typography fontWeight="bold">
                                  {b.title}
                                </Typography>
                                <Typography
                                  variant="body2"
                                  color="text.secondary"
                                >
                                  {b?.author ? b.author.name : ""}
                                </Typography>
                              </Box>
                            </Box>
                          </ListItemButton>
                        </ListItem>
                      ))}
                  </List>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* ------------------------------------------------------------ */}
          {/*                        LISTE DE DROITE                      */}
          {/* ------------------------------------------------------------ */}

          <Grid item xs={12} md={4}>
            <Paper
              elevation={3}
              sx={{
                p: 3,
                borderRadius: 4,
                height: "100%",
                maxHeight: "85vh",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <Box
                sx={{
                  mb: 2,
                  position: "sticky",
                  top: 0,
                  background: "white",
                  zIndex: 10,
                }}
              >
                <TextField
                  fullWidth
                  placeholder="🔍 Rechercher un livre..."
                  value={searchBook}
                  onChange={(e) => {
                    setSearchBook(e.target.value);
                    fetchAvailableBooks();
                  }}
                  sx={{
                    "& .MuiOutlinedInput-root": {
                      borderRadius: 3,
                      background: "rgba(245,245,245,0.7)",
                    },
                  }}
                />
              </Box>

              <Box sx={{ overflowY: "auto", pr: 1 }}>
                {loadingBooks ? (
                  <Box sx={{ textAlign: "center", py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : availableBooks.length === 0 ? (
                  <Typography
                    color="text.secondary"
                    sx={{ textAlign: "center", mt: 4 }}
                  >
                    Aucun livre trouvé.
                  </Typography>
                ) : (
                  <List>
                    {availableBooks.map((b) => (
                      <ListItem key={b.id} disablePadding>
                        <ListItemButton
                          sx={{
                            p: 2,
                            borderRadius: 3,
                            mb: 2,
                            transition: "0.3s",
                            "&:hover": {
                              backgroundColor: "rgba(0,0,0,0.04)",
                              transform: "translateY(-2px)",
                            },
                          }}
                          onClick={() => handleBookClick(b.id)}
                        >
                          <Box sx={{ display: "flex", gap: 2 }}>
                            {b.coverUrl ? (
                              <Box
                                component="img"
                                src={b.coverUrl}
                                alt={b.title}
                                sx={{
                                  width: 70,
                                  height: 100,
                                  borderRadius: 2,
                                  objectFit: "cover",
                                }}
                              />
                            ) : (
                              <Box
                                sx={{
                                  width: 70,
                                  height: 100,
                                  borderRadius: 2,
                                  backgroundColor: "grey.300",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                📘
                              </Box>
                            )}

                            <Box>
                              <Typography fontWeight="bold">
                                {b.title}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                              >
                                {b.author ? b.author.name : ""}
                              </Typography>
                            </Box>
                          </Box>
                        </ListItemButton>
                      </ListItem>
                    ))}
                  </List>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* ----------------------------- TAB COLLECTIONS ----------------- */}
      {/* ---------------------------------------------------------------- */}

      {currentTab === 1 && (
        <Box>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              mb: 3,
              alignItems: "center",
            }}
          >
            <Typography variant="h4" fontWeight="bold">
              📚 Mes Collections
            </Typography>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateCollectionOpen(true)}
            >
              Créer une collection
            </Button>
          </Box>
          <TextField
            fullWidth
            placeholder="🔍 Rechercher une collection..."
            value={searchCollection}
            onChange={(e) => {
              setSearchCollection(e.target.value);
              fetchAvailableCollections();
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 3,
                background: "rgba(245,245,245,0.7)",
              },
            }}
          />
          {loadingCollections ? (
            <Box sx={{ textAlign: "center", py: 4 }}>
              <CircularProgress />
            </Box>
          ) : availableCollections.length === 0 ? (
            <Typography
              color="text.secondary"
              sx={{ textAlign: "center", mt: 4 }}
            >
              Aucune collection trouvée.
            </Typography>
          ) : (
            <List>
              {availableCollections.map((s) => (
                <Paper
                  key={s.id}
                  elevation={2}
                  sx={{
                    mb: 2,
                    p: 2,
                    borderRadius: 3,
                    cursor: "pointer",
                    transition: "0.3s",
                    "&:hover": { backgroundColor: "action.hover" },
                  }}
                  onClick={() => navigate(`/series/${s.id}`)}
                >
                  <Typography variant="h6" fontWeight="bold">
                    {s.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {s.books.length} livres
                  </Typography>
                </Paper>
              ))}
            </List>
          )}
        </Box>
      )}

      {/* ---------------------------------------------------------------- */}
      {/* ----------------------------- TAB CHRONOLOGIE ----------------- */}
      {/* ---------------------------------------------------------------- */}

      {currentTab === 2 && <ChronologicalTab books={books} />}

      {/* ---------------------------------------------------------------- */}
      {/* -------------------------- DIALOG RECHERCHE ------------------- */}
      {/* ---------------------------------------------------------------- */}

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
              placeholder="Titre, auteur, ISBN..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSearchBooks()}
            />
            <Button onClick={handleSearchBooks} variant="contained">
              {searching ? <CircularProgress size={24} /> : <SearchIcon />}
            </Button>
          </Box>

          <Grid container spacing={2}>
            {searchResults.length === 0 && (
              <Typography>Aucun livre trouvé.</Typography>
            )}
            {searchResults.map((book) => (
              <Grid item xs={12} key={book.key}>
                <Card
                  sx={{
                    display: "flex",
                    cursor: "pointer",
                    "&:hover": { boxShadow: 6 },
                  }}
                  onClick={() => handleSelectBook(book)}
                >
                  {book.cover ? (
                    <CardMedia
                      component="img"
                      sx={{ width: 100 }}
                      image={book.cover}
                    />
                  ) : (
                    <Box
                      sx={{
                        width: 100,
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "grey.200",
                      }}
                    >
                      📚
                    </Box>
                  )}

                  <CardContent>
                    <Typography variant="h6">{book.title}</Typography>
                    <Typography variant="h6">{book.originalTitle}</Typography>
                    {book?.author_name && (
                      <Typography variant="body2" color="text.secondary">
                        {book?.author_name.join(", ")}
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </DialogContent>
      </Dialog>

      {/* ---------------------------------------------------------------- */}
      {/* --------------------------- DIALOG COLLECTION ----------------- */}
      {/* ---------------------------------------------------------------- */}

      <Dialog open={createCollectionOpen} maxWidth="sm" fullWidth>
        <DialogTitle>Créer une collection</DialogTitle>

        <DialogContent dividers>
          <TextField
            fullWidth
            label="Nom de la collection"
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            sx={{ mb: 3 }}
          />

          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
            Sélectionnez les livres à ajouter :
          </Typography>

          <List sx={{ maxHeight: 400, overflowY: "auto" }}>
            {books.map((b) => (
              <ListItem key={b.id} disablePadding>
                <ListItemButton
                  onClick={() => handleToggleBookForCollection(b.id)}
                >
                  <Checkbox
                    checked={selectedBooksForCollection.includes(b.id)}
                  />
                  <ListItemText primary={b.title} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => {
              setCreateCollectionOpen(false);
              setSelectedBooksForCollection([]);
            }}
          >
            Annuler
          </Button>
          <Button variant="contained" onClick={handleCreateCollection}>
            Créer
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

export default function App() {
  return (
    <BrowserRouter basename="/SuiviLivres">
      <Routes>
        <Route path="/" element={<BookList />} />
        <Route path="/book/:id" element={<BookDetail />} />
        <Route path="/edit/:id" element={<BookEdit />} />
        <Route path="/series/:id" element={<SeriesDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
