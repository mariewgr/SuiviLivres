export const API_URL = "http://localhost:10000/api";

export const getBooks = async () => {
  const res = await fetch(`${API_URL}/api/books`);
  return res.json();
};

export const addBook = async (data) => {
  const res = await fetch(`${API_URL}/api/books`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return res.json();
};
