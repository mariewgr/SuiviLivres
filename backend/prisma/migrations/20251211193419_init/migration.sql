/*
  Warnings:

  - You are about to drop the column `bookNodeUrl` on the `Book` table. All the data in the column will be lost.
  - You are about to drop the column `seriesUrl` on the `Book` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Book" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "authorId" INTEGER NOT NULL,
    "seriesId" INTEGER,
    "tomeNb" INTEGER,
    "summary" TEXT,
    "coverUrl" TEXT,
    "rating" INTEGER,
    "readDate" DATETIME,
    "citations" TEXT,
    "smut" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "googleBooksId" TEXT,
    CONSTRAINT "Book_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "Author" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Book_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Book" ("authorId", "citations", "coverUrl", "createdAt", "googleBooksId", "id", "isRead", "rating", "readDate", "seriesId", "smut", "summary", "title", "tomeNb", "updatedAt") SELECT "authorId", "citations", "coverUrl", "createdAt", "googleBooksId", "id", "isRead", "rating", "readDate", "seriesId", "smut", "summary", "title", "tomeNb", "updatedAt" FROM "Book";
DROP TABLE "Book";
ALTER TABLE "new_Book" RENAME TO "Book";
CREATE INDEX "Book_authorId_idx" ON "Book"("authorId");
CREATE INDEX "Book_seriesId_idx" ON "Book"("seriesId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
