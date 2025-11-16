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
  FormControlLabel,
  Checkbox,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import RadioButtonUncheckedIcon from "@mui/icons-material/RadioButtonUnchecked";

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
  isRead?: boolean;
  createdAt: string;
}

const API_URL = "http://localhost:4000/api";

export default function BookDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  const handleToggleRead = async () => {
    if (!book) return;

    try {
      const response = await fetch(`${API_URL}/books/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isRead: !book.isRead,
        }),
      });

      if (response.ok) {
        const updatedBook = await response.json();
        setBook(updatedBook);
      }
    } catch (err) {
      console.error("Error updating read status:", err);
      alert("Erreur lors de la mise à jour du statut");
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

      <Paper elevation={3} sx={{ overflow: "hidden" }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", md: "row" },
            gap: 3,
          }}
        >
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

              {/* READ/UNREAD CHECKBOX - THIS IS THE CHECKBOX */}
              <FormControlLabel
                control={
                  <Checkbox
                    checked={book.isRead || false}
                    onChange={handleToggleRead}
                    icon={<RadioButtonUncheckedIcon />}
                    checkedIcon={<CheckCircleIcon />}
                    color="success"
                    sx={{ "& .MuiSvgIcon-root": { fontSize: 28 } }}
                  />
                }
                label={
                  <Typography
                    variant="h6"
                    fontWeight="bold"
                    color={book.isRead ? "success.main" : "text.secondary"}
                  >
                    {book.isRead ? "✓ Lu" : "Non lu"}
                  </Typography>
                }
                sx={{ mb: 2 }}
              />
            </Box>

            <Typography variant="h6" color="text.secondary" gutterBottom>
              par {book.author?.name}
            </Typography>

            {book.series && (
              <Chip
                label={`Série: ${book.series.title}`}
                color="primary"
                variant="outlined"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/series/${book.series!.id}`);
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

            {/* Rating */}
            {book.rating && (
              <Box sx={{ mb: 2 }}>
                <Rating value={book.rating} readOnly size="large" />
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 0.5 }}
                >
                  {book.rating}/5
                </Typography>
              </Box>
            )}

            {/* Meta Information */}
            <Box sx={{ display: "flex", gap: 4, mb: 3, flexWrap: "wrap" }}>
              {book.pages && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Pages
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {book.pages}
                  </Typography>
                </Box>
              )}
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
      </Paper>
    </Container>
  );
}
