#!/bin/bash

set -e

PROJECT_NAME="SuiviDeLivres"

echo "🚀 Création du projet $PROJECT_NAME ..."
mkdir -p $PROJECT_NAME
cd $PROJECT_NAME

#######################################
# FRONTEND
#######################################
echo "📦 Installation du frontend React + Vite + Tailwind ..."
npx create-vite@latest frontend --template react

cd frontend
npm install
npm install -D tailwindcss postcss autoprefixer

# Config Tailwind
cat > tailwind.config.js <<'EOF'
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOF

# Inject Tailwind CSS
cat > src/index.css <<'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF

cd ..

#######################################
# BACKEND
#######################################
echo "📦 Installation du backend Node + Express + Prisma ..."
mkdir backend
cd backend
npm init -y
npm install express cors prisma @prisma/client
npm install -D nodemon

# Fichier server.js minimal
cat > server.js <<'EOF'
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req,res)=> res.json({status:"ok"}));

app.listen(4000, () => console.log("✅ Backend running on http://localhost:4000"));
EOF

# Init Prisma
npx prisma init

# Met à jour DATABASE_URL
sed -i '' 's/DATABASE_URL=""/DATABASE_URL="postgresql:\/\/dev:dev@localhost:5432\/livres?schema=public"/' .env 2>/dev/null \
  || sed -i 's/DATABASE_URL=""/DATABASE_URL="postgresql:\/\/dev:dev@localhost:5432\/livres?schema=public"/' .env

cd ..

#######################################
# DOCKER POSTGRES
#######################################
echo "🐘 Création fichier docker-compose pour Postgres ..."

cat > docker-compose.yml <<'EOF'
version: "3.9"

services:
  postgres:
    image: postgres:15
    container_name: livres-postgres
    environment:
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
      POSTGRES_DB: livres
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  postgres-data:
EOF

#######################################
# FIN
#######################################
echo ""
echo "✅ Setup terminé !"
echo "------------------------------------------"
echo "Commande pour lancer PostgreSQL :"
echo "    docker compose up -d"
echo ""
echo "Backend :"
echo "    cd $PROJECT_NAME/backend"
echo "    npx prisma migrate dev --name init   (à faire après PostgreSQL)"
echo "    npm run dev"
echo ""
echo "Frontend :"
echo "    cd $PROJECT_NAME/frontend"
echo "    npm run dev"
echo "------------------------------------------"
echo "Ton projet est prêt 🚀"
