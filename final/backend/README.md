# Secure Coding Lab — Backend

API REST Express/TypeScript servant de support pédagogique pour illustrer des vulnérabilités web courantes et leurs corrections.

## Stack

| Outil | Rôle |
|---|---|
| [Express 5](https://expressjs.com/) | Framework HTTP |
| [TypeScript](https://www.typescriptlang.org/) | Typage statique |
| [Drizzle ORM](https://orm.drizzle.team/) | Accès base de données |
| [libSQL / SQLite](https://github.com/tursodatabase/libsql) | Base de données locale |
| [Zod](https://zod.dev/) | Validation des entrées |
| [pnpm](https://pnpm.io/) | Gestionnaire de paquets |

## Démarrage rapide

**Prérequis :** Node.js 20+, pnpm

```bash
# 1. Installer les dépendances
pnpm install

# 2. Configurer les variables d'environnement
cp .env.example .env

# 3. Créer et peupler la base de données
pnpm db:push
pnpm db:seed

# 4. Lancer le serveur en mode développement
pnpm dev
```

Le serveur démarre sur `http://localhost:5000`.

## Variables d'environnement

| Variable | Défaut | Description |
|---|---|---|
| `NODE_ENV` | `development` | Environnement d'exécution |
| `PORT` | `5000` | Port d'écoute |
| `HOSTNAME` | `localhost` | Hôte d'écoute |
| `DB_FILE_NAME` | `file:local.db` | Chemin vers la base SQLite |

## Scripts

| Commande | Description |
|---|---|
| `pnpm dev` | Serveur en mode watch (tsx) |
| `pnpm build` | Compilation TypeScript → `dist/` |
| `pnpm start` | Démarrer le build compilé |
| `pnpm typecheck` | Vérification des types sans compilation |
| `pnpm db:push` | Appliquer le schéma Drizzle à la base |
| `pnpm db:seed` | Insérer des données initiales |

## Architecture

```
src/
├── config/          # Variables d'environnement (env.ts)
├── db/              # Client Drizzle, schémas, seed
├── modules/
│   ├── auth/        # Authentification (POST /api/v1/auth/login)
│   │   ├── auth.router.ts
│   │   └── auth.schema.ts
│   ├── comment/     # Commentaires (GET/POST /api/v1/comments)
│   │   ├── comment.router.ts
│   │   └── comment.schema.ts
│   └── transfer/    # Virements (POST /api/v1/transfers)
│       └── transfer.router.ts
├── middlewares/     # error, not-found, validate
├── errors/          # AppError et sous-classes
├── app.ts           # Configuration Express
├── routes.ts        # Routeur racine /api/v1
└── server.ts        # Point d'entrée
```

## Routes

| Méthode | Chemin | Description |
|---|---|---|
| `POST` | `/api/v1/auth/login` | Connexion utilisateur |
| `GET` | `/api/v1/comments` | Lister les commentaires |
| `POST` | `/api/v1/comments` | Créer un commentaire |
| `POST` | `/api/v1/transfers` | Effectuer un virement |
| `GET` | `/form` | Formulaire de démo CSRF |

## Vulnérabilités démontrées

Ce projet illustre trois catégories de vulnérabilités ainsi que leurs contre-mesures.

### Injection SQL

- **Module :** `auth`
- **Vulnérable :** construction d'une requête SQL par concaténation de chaînes
- **Corrigé :** requêtes paramétrées via Drizzle ORM (`eq`, `and`)

### XSS (Cross-Site Scripting)

- **Module :** `comment`
- **Vulnérable :** injection du contenu brut dans le HTML de la réponse
- **Corrigé :** échappement systématique via `escape-html` avant le rendu

### CSRF (Cross-Site Request Forgery)

- **Module :** `transfer`
- **Vulnérable :** endpoint acceptant toute requête POST sans vérification d'origine
- **Corrigé :** token CSRF généré côté serveur, transmis via cookie et champ de formulaire, comparé à chaque requête
