# Suivis de livres

Une application permettant de gérer vos lectures, ajouter des tomes manquants, marquer des livres comme lus, afficher les résumés, afficher la chronologie de lecture

---

### Installation

Les étapes pour installer votre programme sont simples et se font en deux parties : **backend** et **frontend**.

---

## 🖥️ Backend

Dans le dossier `backend`, exécutez les commandes suivantes :

Installation des dépendances :

```
npm install
```

Génération du client Prisma :

```
npx prisma generate
```

Création de la base de données + migration initiale :

```
npx prisma migrate dev --name init
```

Lancement du serveur backend :

```
npm run dev
```

Le backend sera accessible sur :

```
http://localhost:4000
```

---

## 💻 Frontend

Dans le dossier `frontend`, exécutez :

```
npm install
```

Puis lancez le serveur de développement :

```
npm run dev
```

Le frontend sera accessible sur :

```
http://localhost:5173
```

---

Ensuite vous pouvez montrer ce que vous obtenez au final…
→ Une application permettant de gérer vos lectures, ajouter des tomes manquants, marquer des livres comme lus, afficher les résumés, etc.

---

## Démarrage

Pour démarrer l'application complète :

1. Lancer le **backend** avec `npm run dev` dans son dossier.
2. Lancer le **frontend** avec `npm run dev` dans son dossier.
3. Ouvrir l'URL affichée par Vite (généralement [http://localhost:5173](http://localhost:5173)).

---

## Fabriqué avec

Les technologies utilisées :

* **React + Vite** — Frontend rapide et moderne
* **Material UI** — Composants UI élégants
* **Node.js** — Serveur backend
* **Prisma ORM** — Couche base de données
* **SQLite / PostgreSQL** (selon configuration) — Base de données
* **VS Code** — Éditeur utilisé pendant le développement
