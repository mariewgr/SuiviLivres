/**
 * Google Books API scraper
 * Uses the official Google Books API to search and retrieve book information
 */
import { extractVolumeFromTitle } from "./bookParser.js";
const GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes";

// Use native fetch for Node 18+, or import node-fetch for older versions
const fetch = globalThis.fetch || require("node-fetch");

/**
 * Search for books using Google Books API
 * @param {string} query - Search query
 * @returns {Promise<Array>} List of books with title, authors, cover, etc.
 */
export async function searchGoogleBooks(query) {
  try {
    const url = `${GOOGLE_BOOKS_API}?q=${encodeURIComponent(query)}&maxResults=10`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.items) {
      return [];
    }
    
    return data.items.map(item => {
      const volumeInfo = item.volumeInfo;
      const { cleanTitle, volume } = extractVolumeFromTitle(volumeInfo.title);
      
      return {
        key: item.id,
        title: cleanTitle || "Unknown Title",
        author_name: volumeInfo.authors || [],
        description: volumeInfo.description || null,
        cover: volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
        first_publish_year: volumeInfo.publishedDate ? parseInt(volumeInfo.publishedDate.split('-')[0]) : null,
        isbn: volumeInfo.industryIdentifiers?.map(id => id.identifier) || [],
        link: item.selfLink,
        googleBooksId: item.id,
        tomeNb: volume
      };
    });
  } catch (error) {
    console.error("Error searching Google Books:", error);
    throw error;
  }
}

/**
 * Get detailed book information from Google Books
 * @param {string} googleBooksId - Google Books volume ID
 * @returns {Promise<Object>} Detailed book information
 */
export async function getGoogleBookDetails(googleBooksId) {
  try {
    const url = `${GOOGLE_BOOKS_API}/${googleBooksId}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.status}`);
    }
    
    const item = await response.json();
    const volumeInfo = item.volumeInfo;
    const { cleanTitle, volume } = extractVolumeFromTitle(volumeInfo.title);
    
    return {
      title: cleanTitle || "Unknown Title",
      author_name: volumeInfo.authors || [],
      description: volumeInfo.description || null,
      cover: volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || 
             volumeInfo.imageLinks?.smallThumbnail?.replace('http:', 'https:') || null,
      first_publish_year: volumeInfo.publishedDate ? parseInt(volumeInfo.publishedDate.split('-')[0]) : null,
      isbn: volumeInfo.industryIdentifiers?.map(id => id.identifier) || [],
      pageCount: volumeInfo.pageCount || null,
      publisher: volumeInfo.publisher || null,
      categories: volumeInfo.categories || [],
      rating: volumeInfo.averageRating || null,
      ratingsCount: volumeInfo.ratingsCount || null,
      language: volumeInfo.language || null,
      googleBooksId: item.id,
      link: item.selfLink,
      tomeNb: volume
    };
  } catch (error) {
    console.error("Error fetching Google Books details:", error);
    throw error;
  }
}