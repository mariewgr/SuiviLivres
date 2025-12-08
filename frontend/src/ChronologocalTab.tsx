import React, { useState } from "react";
import {
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemButton,
  Rating,
  Chip,
  ToggleButtonGroup,
  ToggleButton,
  Grid,
  Tooltip,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import ViewListIcon from "@mui/icons-material/ViewList";
import TimelineIcon from "@mui/icons-material/Timeline";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import IconButton from "@mui/material/IconButton";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

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

interface ChronologicalTabProps {
  books: Book[];
}

export default function ChronologicalTab({ books }: ChronologicalTabProps) {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"list" | "timeline" | "calendar">(
    "list"
  );

  // Filter and sort books by read date
  const readBooks = books
    .filter((b) => b.isRead && b.readDate)
    .sort((a, b) => {
      const dateA = new Date(a.readDate!).getTime();
      const dateB = new Date(b.readDate!).getTime();
      return dateB - dateA; // Most recent first
    });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  // Month state
  const today = new Date();
  const [activeYear, setActiveYear] = useState(today.getFullYear());
  const [activeMonth, setActiveMonth] = useState(today.getMonth());
  const [transitionDirection, setTransitionDirection] = useState<
    "left" | "right"
  >("right");

  // Group books by month/year
  const groupedBooks = readBooks.reduce((acc, book) => {
    const date = new Date(book.readDate!);
    const monthYear = date.toLocaleDateString("fr-FR", {
      month: "long",
      year: "numeric",
    });

    if (!acc[monthYear]) {
      acc[monthYear] = [];
    }
    acc[monthYear].push(book);
    return acc;
  }, {} as Record<string, Book[]>);

  // Group books by calendar day
  const calendarBooks = readBooks.reduce((acc, book) => {
    const date = new Date(book.readDate!);
    const year = date.getFullYear();
    const month = date.getMonth();
    const key = `${year}-${month}`;

    if (!acc[key]) {
      acc[key] = {
        year,
        month,
        monthName: date.toLocaleDateString("fr-FR", {
          month: "long",
          year: "numeric",
        }),
        days: {},
      };
    }

    const day = date.getDate();
    if (!acc[key].days[day]) {
      acc[key].days[day] = [];
    }
    acc[key].days[day].push(book);

    return acc;
  }, {} as Record<string, { year: number; month: number; monthName: string; days: Record<number, Book[]> }>);

  if (readBooks.length === 0) {
    return (
      <Box sx={{ textAlign: "center", py: 8 }}>
        <Typography variant="h5" color="text.secondary">
          📚 Aucun livre lu pour le moment
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
          Commencez à marquer vos livres comme lus pour voir votre chronologie
          de lecture
        </Typography>
      </Box>
    );
  }

  const renderListView = () => (
    <Box>
      {Object.entries(groupedBooks).map(([monthYear, booksInMonth]) => (
        <Box key={monthYear} sx={{ mb: 4 }}>
          <Typography
            variant="h6"
            fontWeight="bold"
            sx={{
              mb: 2,
              textTransform: "capitalize",
              color: "primary.main",
            }}
          >
            {monthYear}
          </Typography>

          <List>
            {booksInMonth.map((book) => (
              <Paper
                key={book.id}
                elevation={2}
                sx={{
                  mb: 2,
                  borderRadius: 3,
                  overflow: "hidden",
                  transition: "0.3s",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow: 4,
                  },
                }}
              >
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => navigate(`/book/${book.id}`)}
                    sx={{ p: 2 }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        gap: 2,
                        width: "100%",
                        alignItems: "flex-start",
                      }}
                    >
                      {book.coverUrl ? (
                        <Box
                          component="img"
                          src={book.coverUrl}
                          alt={book.title}
                          sx={{
                            width: 80,
                            height: 120,
                            borderRadius: 2,
                            objectFit: "cover",
                            flexShrink: 0,
                          }}
                        />
                      ) : (
                        <Box
                          sx={{
                            width: 80,
                            height: 120,
                            borderRadius: 2,
                            backgroundColor: "grey.300",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "2rem",
                            flexShrink: 0,
                          }}
                        >
                          📘
                        </Box>
                      )}

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="h6"
                          fontWeight="bold"
                          sx={{ mb: 0.5 }}
                        >
                          {book.title}
                        </Typography>

                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ mb: 1 }}
                        >
                          {book.author.name}
                        </Typography>

                        {book.series && (
                          <Chip
                            label={book.series.title}
                            size="small"
                            sx={{ mb: 1 }}
                          />
                        )}

                        <Box
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 2,
                            flexWrap: "wrap",
                          }}
                        >
                          {book.rating && (
                            <Box sx={{ display: "flex", alignItems: "center" }}>
                              <Rating
                                value={book.rating}
                                readOnly
                                size="small"
                              />
                            </Box>
                          )}

                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ fontStyle: "italic" }}
                          >
                            Lu le {formatDate(book.readDate!)}
                          </Typography>
                        </Box>

                        {book.summary && (
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{
                              mt: 1,
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                            }}
                          >
                            {book.summary}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </ListItemButton>
                </ListItem>
              </Paper>
            ))}
          </List>
        </Box>
      ))}
    </Box>
  );

  const renderTimelineView = () => (
    <Box sx={{ position: "relative", pl: 4 }}>
      {/* Vertical line */}
      <Box
        sx={{
          position: "absolute",
          left: 16,
          top: 0,
          bottom: 0,
          width: 3,
          bgcolor: "primary.main",
          opacity: 0.3,
        }}
      />

      {readBooks.map((book, index) => (
        <Box
          key={book.id}
          sx={{
            position: "relative",
            mb: 4,
            display: "flex",
            alignItems: "flex-start",
          }}
        >
          {/* Timeline dot */}
          <Box
            sx={{
              position: "absolute",
              left: -20,
              top: 20,
              width: 16,
              height: 16,
              borderRadius: "50%",
              bgcolor: "primary.main",
              border: "3px solid white",
              boxShadow: 2,
              zIndex: 1,
            }}
          />

          <Paper
            elevation={2}
            sx={{
              flex: 1,
              p: 2,
              borderRadius: 3,
              cursor: "pointer",
              transition: "0.3s",
              "&:hover": {
                transform: "translateX(8px)",
                boxShadow: 4,
              },
            }}
            onClick={() => navigate(`/book/${book.id}`)}
          >
            <Box sx={{ display: "flex", gap: 2 }}>
              {book.coverUrl ? (
                <Box
                  component="img"
                  src={book.coverUrl}
                  alt={book.title}
                  sx={{
                    width: 60,
                    height: 90,
                    borderRadius: 2,
                    objectFit: "cover",
                    flexShrink: 0,
                  }}
                />
              ) : (
                <Box
                  sx={{
                    width: 60,
                    height: 90,
                    borderRadius: 2,
                    backgroundColor: "grey.300",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5rem",
                    flexShrink: 0,
                  }}
                >
                  📘
                </Box>
              )}

              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" fontWeight="bold">
                  {book.title}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mb: 1 }}
                >
                  {book.author.name}
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    flexWrap: "wrap",
                  }}
                >
                  <Typography
                    variant="caption"
                    color="primary.main"
                    fontWeight="bold"
                  >
                    📅 {formatDate(book.readDate!)}
                  </Typography>

                  {book.rating && (
                    <Rating value={book.rating} readOnly size="small" />
                  )}

                  {book.series && (
                    <Chip label={book.series.title} size="small" />
                  )}
                </Box>
              </Box>
            </Box>
          </Paper>
        </Box>
      ))}
    </Box>
  );

  const renderCalendarView = () => {
    const getDaysInMonth = (year: number, month: number) =>
      new Date(year, month + 1, 0).getDate();

    // Monday = 0, Sunday = 6
    const getFirstWeekdayOfMonth = (year: number, month: number) => {
      const jsDay = new Date(year, month, 1).getDay(); // Sunday = 0
      return jsDay === 0 ? 6 : jsDay - 1;
    };

    const key = `${activeYear}-${activeMonth}`;

    const daysInMonth = getDaysInMonth(activeYear, activeMonth);
    const firstWeekday = getFirstWeekdayOfMonth(activeYear, activeMonth);

    // Like Apple Calendar: 5 weeks (35 days) or 6 (42 days)
    const totalCells = firstWeekday + daysInMonth;
    const paddedCells = totalCells <= 35 ? 35 : 42;

    const cells = Array.from({ length: paddedCells }, (_, index) => {
      const dayNumber = index - firstWeekday + 1;
      return dayNumber > 0 && dayNumber <= daysInMonth ? dayNumber : null;
    });

    const slideAnimations = {
      "@keyframes slideInRight": {
        from: { opacity: 0, transform: "translateX(25px)" },
        to: { opacity: 1, transform: "translateX(0)" },
      },
      "@keyframes slideInLeft": {
        from: { opacity: 0, transform: "translateX(-25px)" },
        to: { opacity: 1, transform: "translateX(0)" },
      },
    };

    return (
      <Box sx={{ ...slideAnimations }}>
        {/* Month Navigation */}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            mb: 2,
          }}
        >
          <IconButton
            onClick={() => {
              setTransitionDirection("left");
              if (activeMonth === 0) {
                setActiveMonth(11);
                setActiveYear((y) => y - 1);
              } else {
                setActiveMonth((m) => m - 1);
              }
            }}
          >
            <ChevronLeftIcon />
          </IconButton>

          <Typography
            variant="h5"
            fontWeight="bold"
            sx={{ textTransform: "capitalize" }}
          >
            {new Date(activeYear, activeMonth).toLocaleDateString("fr-FR", {
              month: "long",
              year: "numeric",
            })}
          </Typography>

          <IconButton
            onClick={() => {
              setTransitionDirection("right");
              if (activeMonth === 11) {
                setActiveMonth(0);
                setActiveYear((y) => y + 1);
              } else {
                setActiveMonth((m) => m + 1);
              }
            }}
          >
            <ChevronRightIcon />
          </IconButton>
        </Box>
        <Paper
          key={`${activeYear}-${activeMonth}`}
          elevation={2}
          sx={{ p: 3, mb: 4, borderRadius: 3 }}
        >
          {/* Weekday headers */}
          <Grid container spacing={1} sx={{ mb: 1 }}>
            {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((day) => (
              <Grid item xs key={day}>
                <Typography
                  variant="caption"
                  fontWeight="bold"
                  color="text.secondary"
                  sx={{ textAlign: "center", display: "block" }}
                >
                  {day}
                </Typography>
              </Grid>
            ))}
          </Grid>

          {/* Apple-style calendar grid */}
          <Grid container spacing={1}>
            {cells.map((day, i) => {
              const booksOnDay =
                day && calendarBooks[key]?.days
                  ? calendarBooks[key].days[day] || []
                  : [];

              return (
                <Grid item xs={1.7} key={i}>
                  <Paper
                    elevation={booksOnDay.length > 0 ? 3 : 0}
                    sx={{
                      position: "relative",
                      width: "100%",
                      paddingTop: "100%", // perfect square
                      bgcolor:
                        booksOnDay.length > 0 ? "primary.light" : "grey.50",
                      cursor: booksOnDay.length > 0 ? "pointer" : "default",
                      transition: "0.2s",
                      "&:hover":
                        booksOnDay.length > 0
                          ? { transform: "scale(1.05)", boxShadow: 4 }
                          : {},
                    }}
                    onClick={() => {
                      if (booksOnDay.length === 1) {
                        navigate(`/book/${booksOnDay[0].id}`);
                      }
                    }}
                  >
                    {/* CONTENT */}
                    {day && (
                      <Box
                        sx={{
                          position: "absolute",
                          inset: 0,
                          p: 0.5,
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        {/* Day number */}
                        <Typography
                          variant="caption"
                          fontWeight="bold"
                          sx={{
                            textAlign: "right",
                            pr: 0.5,
                            opacity: day ? 1 : 0.3,
                          }}
                        >
                          {day}
                        </Typography>

                        {/* Book covers */}
                        {booksOnDay.length > 0 && (
                          <Box
                            sx={{
                              flex: 1,
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              gap: 0.3,
                              flexWrap: "wrap",
                            }}
                          >
                            {booksOnDay.slice(0, 2).map((book) => (
                              <Box
                                key={book.id}
                                component="img"
                                src={book.coverUrl}
                                alt={book.title}
                                sx={{
                                  width: "40%",
                                  height: "auto",
                                  maxHeight: "60%",
                                  borderRadius: 1,
                                  objectFit: "cover",
                                }}
                              />
                            ))}
                            {booksOnDay.length > 2 && (
                              <Typography
                                variant="caption"
                                fontWeight="bold"
                                sx={{ fontSize: "0.65rem" }}
                              >
                                +{booksOnDay.length - 2}
                              </Typography>
                            )}
                          </Box>
                        )}
                      </Box>
                    )}
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </Paper>
      </Box>
    );
  };

  return (
    <Box>
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
        <Box>
          <Typography variant="h4" fontWeight="bold">
            📅 Chronologie de lecture
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {readBooks.length} livre{readBooks.length > 1 ? "s" : ""} lu
            {readBooks.length > 1 ? "s" : ""}
          </Typography>
        </Box>

        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(e, newMode) => newMode && setViewMode(newMode)}
          aria-label="view mode"
        >
          <ToggleButton value="list" aria-label="list view">
            <ViewListIcon sx={{ mr: 1 }} />
            Liste
          </ToggleButton>
          <ToggleButton value="timeline" aria-label="timeline view">
            <TimelineIcon sx={{ mr: 1 }} />
            Frise
          </ToggleButton>
          <ToggleButton value="calendar" aria-label="calendar view">
            <CalendarMonthIcon sx={{ mr: 1 }} />
            Calendrier
          </ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {viewMode === "list" && renderListView()}
      {viewMode === "timeline" && renderTimelineView()}
      {viewMode === "calendar" && renderCalendarView()}
    </Box>
  );
}
