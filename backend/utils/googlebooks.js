/**
 * Google Books API scraper
 * Uses the official Google Books API to search and retrieve book information
 */
import { extractVolumeFromTitle, extractSeriesFromTitle } from "./bookParser.js";
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

/**
 * Find potential sequels/related books in a series
 * Strategy: Search for books by the same author and try to identify series books
 * @param {string} authorName - Author name
 * @param {string} bookTitle - Original book title
 * @param {number|null} currentVolume - Current book volume number
 * @returns {Promise<Array>} List of potential sequels
 */
export async function findGoogleBookSequels(authorName, bookTitle, currentVolume = null) {
  try {
    // Try to extract series name from the title
    const seriesName = extractSeriesFromTitle(bookTitle) || bookTitle;
    
    // Strategy 1: Search for the series name + author
    let searchQuery = `"${seriesName}" inauthor:"${authorName}"`;
    
    const url = `${GOOGLE_BOOKS_API}?q=${encodeURIComponent(searchQuery)}&maxResults=40&orderBy=relevance`;
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Google Books API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.items) {
      return [];
    }
    
    // Process and filter results
    const processedBooks = data.items
      .map(item => {
        const volumeInfo = item.volumeInfo;
        const { cleanTitle, volume } = extractVolumeFromTitle(volumeInfo.title);
        
        // Calculate relevance score
        let relevanceScore = 0;
        
        // Check if author matches exactly
        const hasMatchingAuthor = volumeInfo.authors?.some(
          author => author.toLowerCase() === authorName.toLowerCase()
        );
        if (hasMatchingAuthor) relevanceScore += 100;
        
        // Check if it's a numbered volume
        if (volume !== null) {
          relevanceScore += 50;
          
          // Prefer books with volume numbers close to current
          if (currentVolume !== null) {
            const volumeDiff = Math.abs(volume - currentVolume);
            if (volumeDiff <= 3) relevanceScore += 30 - volumeDiff * 5;
          }
        }
        
        // Check title similarity to series name
        const titleLower = cleanTitle.toLowerCase();
        const seriesLower = seriesName.toLowerCase();
        if (titleLower.includes(seriesLower) || seriesLower.includes(titleLower)) {
          relevanceScore += 20;
        }
        
        return {
          key: item.id,
          title: cleanTitle,
          originalTitle: volumeInfo.title,
          volume: volume,
          tomeNb: volume,
          author_name: volumeInfo.authors || [],
          description: volumeInfo.description || null,
          coverUrl: volumeInfo.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
          summary: volumeInfo.description || null,
          googleBooksId: item.id,
          relevanceScore: relevanceScore
        };
      })
      // Filter out books without matching authors
      .filter(book => {
        return book.author_name.some(
          author => author.toLowerCase() === authorName.toLowerCase()
        );
      })
      // Filter out the current book
      .filter(book => {
        if (currentVolume !== null && book.volume !== null) {
          return book.volume !== currentVolume;
        }
        return book.title.toLowerCase() !== bookTitle.toLowerCase();
      })
      // Sort by relevance score
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      // Take top 10 most relevant
      .slice(0, 10);
    
    // If we have volumes, sort by volume number
    const hasVolumes = processedBooks.some(b => b.volume !== null);
    if (hasVolumes) {
      return processedBooks.sort((a, b) => {
        if (a.volume === null) return 1;
        if (b.volume === null) return -1;
        return a.volume - b.volume;
      });
    }
    
    return processedBooks;
    
  } catch (error) {
    console.error("Error finding sequels:", error);
    return [];
  }
}