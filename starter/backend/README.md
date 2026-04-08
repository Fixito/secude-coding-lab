# Secure Coding Lab — Backend (version vulnérable)

> ⚠️ Ce dossier est le **point de départ du lab** — l'application contient volontairement des failles de sécurité à identifier et corriger.
> Consulte [`GUIDE_APPRENANT.md`](../../GUIDE_APPRENANT.md) pour les instructions pas à pas.

API REST Express/TypeScript servant de support pédagogique pour illustrer des vulnérabilités web courantes (OWASP Top 10).

## Stack

| Outil                                                                          | Rôle                                             |
| ------------------------------------------------------------------------------ | ------------------------------------------------ |
| [Express 5](https://expressjs.com/)                                            | Framework HTTP                                   |
| [TypeScript](https://www.typescriptlang.org/)                                  | Typage statique                                  |
| [Drizzle ORM](https://orm.drizzle.team/)                                       | Accès base de données                            |
| [libSQL / SQLite](https://github.com/tursodatabase/libsql)                     | Base de données locale                           |
| [Zod](https://zod.dev/)                                                        | Validation des entrées                           |
| [bcryptjs](https://github.com/nicolo-ribaudo/bcryptjs)                         | Hachage des mots de passe                        |
| [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)                     | Authentification JWT                             |
| [express-rate-limit](https://github.com/express-rate-limit/express-rate-limit) | Protection contre le bruteforce                  |
| [helmet](https://helmetjs.github.io/)                                          | En-têtes HTTP de sécurité                        |
| [cors](https://github.com/expressjs/cors)                                      | Configuration CORS                               |
| [pino](https://getpino.io/)                                                    | Logging structuré (JSON en prod, lisible en dev) |
| [pino-http](https://github.com/pinojs/pino-http)                               | Middleware de logging HTTP (remplace Morgan)     |
| [pnpm](https://pnpm.io/)                                                       | Gestionnaire de paquets                          |

## Démarrage rapide

**Prérequis :** Node.js 20+, pnpm

```bash
# 1. Installer les dépendances
pnpm install

# 2. Configurer les variables d'environnement
cp .env.example .env
# Éditer .env et renseigner JWT_SECRET avec une valeur forte :
# openssl rand -hex 64

# 3. Créer et peupler la base de données
pnpm db:push
pnpm db:seed

# 4. Lancer le serveur en mode développement
pnpm dev
```

Le serveur démarre sur `http://localhost:5000`.

## Variables d'environnement

| Variable       | Défaut          | Description                                      |
| -------------- | --------------- | ------------------------------------------------ |
| `NODE_ENV`     | `development`   | Environnement d'exécution                        |
| `PORT`         | `5000`          | Port d'écoute                                    |
| `HOSTNAME`     | `localhost`     | Hôte d'écoute                                    |
| `DB_FILE_NAME` | `file:local.db` | Chemin vers la base SQLite                       |
| `JWT_SECRET`   | —               | **Requis.** Clé secrète JWT (min. 32 caractères) |

## Scripts

| Commande         | Description                                                    |
| ---------------- | -------------------------------------------------------------- |
| `pnpm dev`       | Serveur en mode watch (tsx)                                    |
| `pnpm build`     | Compilation TypeScript → `dist/`                               |
| `pnpm start`     | Démarrer le build compilé                                      |
| `pnpm typecheck` | Vérification des types sans compilation                        |
| `pnpm lint`      | Analyse statique du code (oxlint)                              |
| `pnpm lint:fix`  | Correction automatique des erreurs de lint                     |
| `pnpm fmt`       | Formatage du code (oxfmt)                                      |
| `pnpm fmt:check` | Vérification du formatage sans modification                    |
| `pnpm db:push`   | Appliquer le schéma Drizzle à la base                          |
| `pnpm db:seed`   | Insérer des données initiales (2 utilisateurs, 2 commentaires) |

## Architecture

```
src/
├── config/          # Variables d'environnement (env.ts)
├── db/              # Client Drizzle, schémas, seed
├── modules/
│   ├── auth/        # Authentification (POST /api/v1/auth/login)
│   ├── comment/     # Commentaires (GET/POST /api/v1/comments)
│   ├── transfer/    # Virements (POST /api/v1/transfers)
│   └── users/       # Profils utilisateurs (GET /api/v1/users/:id)
├── middlewares/
│   ├── auth.middleware.ts           # Vérification JWT
│   ├── error.middleware.ts          # Gestion centralisée des erreurs
│   ├── not-found.middleware.ts      # 404
│   ├── rate-limit.middleware.ts     # Protection bruteforce
│   └── validate.middleware.ts       # Validation Zod
├── errors/          # AppError et sous-classes
├── app.ts           # Configuration Express (helmet, cors, middlewares)
├── routes.ts        # Routeur racine /api/v1
└── server.ts        # Point d'entrée
```

## Routes

| Méthode | Chemin               | Auth | Description                    |
| ------- | -------------------- | ---- | ------------------------------ |
| `POST`  | `/api/v1/auth/login` | Non  | Connexion — retourne un JWT    |
| `GET`   | `/api/v1/comments`   | Non  | Lister les commentaires        |
| `POST`  | `/api/v1/comments`   | Non  | Créer un commentaire           |
| `POST`  | `/api/v1/transfers`  | Non  | Virement (démo CSRF)           |
| `GET`   | `/api/v1/users/:id`  | JWT  | Profil utilisateur (démo IDOR) |
| `GET`   | `/form`              | Non  | Formulaire de démo CSRF        |

## Vulnérabilités démontrées

Convention dans le code :

- `//! VULNERABLE — Axx : Nom` : version vulnérable (commentée ou annotée)
- `//* SECURE` : contre-mesure appliquée

---

### A01 — Broken Access Control (IDOR)

- **Module :** `users`
- **Route :** `GET /api/v1/users/:id`
- **Vulnérable :** le endpoint retourne n'importe quel profil sans vérifier que l'appelant est bien cet utilisateur
- **Objectif :** ajouter `requireAuth` et comparer `req.user.userId === id` après vérification du JWT
- **Scénario :** se connecter en tant que `john.doe@example.com`, utiliser le token JWT pour accéder à `/api/v1/users/2` (jane.smith)

---

### A02 — Cryptographic Failures

- **Module :** `auth`
- **Vulnérable :** mot de passe stocké et comparé en clair en base de données
- **Objectif :** hacher les mots de passe avec `bcryptjs` (salt factor 12) au seeding, utiliser `bcrypt.compare()` pour l'authentification
- **Concept clé :** le salt rend chaque hash unique même pour des mots de passe identiques ; le work factor rend les attaques GPU coûteuses

---

### A03 — Injection (SQL Injection)

- **Module :** `auth`
- **Vulnérable :** construction d'une requête SQL par concaténation de chaînes
- **Objectif :** remplacer par des requêtes paramétrées via Drizzle ORM (`eq`, `and`)
- **Exploit :** `email = "' OR '1'='1" --"` bypasse l'authentification

---

### A03 — Injection (XSS — Cross-Site Scripting)

- **Module :** `comment`
- **Route :** `GET /api/v1/comments`
- **Vulnérable :** injection du contenu brut dans le HTML de la réponse
- **Objectif :** échapper systématiquement le contenu via `escape-html` avant le rendu
- **Exploit :** poster `<script>alert('XSS')</script>` comme commentaire

---

### A05 — Security Misconfiguration

- **Fichier :** `app.ts`
- **Vulnérable :** absence de headers de sécurité HTTP, CORS non configuré (tout ou rien)
- **Objectif :**
  - Ajouter `helmet()` pour les headers de sécurité (CSP, X-Frame-Options, HSTS…)
  - Configurer `cors({ origin: 'http://localhost:3000', credentials: true })`
- **À observer :** comparer les headers HTTP dans l'onglet **Headers** de Postman avec/sans helmet

---

### A07 — Identification and Authentication Failures

- **Module :** `auth`
- **Vulnérable :** aucune limite sur les tentatives de connexion (bruteforce possible)
- **Objectif :** ajouter `express-rate-limit` — 5 tentatives / 15 min par IP
- **À tester (script cross-platform) :**
  ```bash
  node brute-force-demo.mjs
  ```

---

### CSRF — Cross-Site Request Forgery

- **Module :** `transfer`
- **Route :** `POST /api/v1/transfers` + formulaire `GET /form`
- **Vulnérable :** endpoint acceptant toute requête POST sans vérification d'origine
- **Objectif :** implémenter le Double Submit Cookie Pattern — token généré serveur, transmis dans cookie et formulaire, comparé à chaque requête

## Scanner de dépendances — `pnpm audit`

`pnpm audit` analyse les dépendances du projet contre la base de données publique [OSV](https://osv.dev/) (Open Source Vulnerabilities) et signale les paquets connus pour contenir des failles de sécurité.

```bash
pnpm audit
```

### Lire la sortie

```
┌─────────────────────────────────────────────────┐
│                    npm audit                    │
│              found 2 vulnerabilities            │
│         1 moderate, 1 high severity             │
└─────────────────────────────────────────────────┘

moderate  ReDoS in some-package
  Package: some-package
  Severity: moderate
  Fix available: pnpm audit --fix
```

| Niveau     | Signification                                      |
| ---------- | -------------------------------------------------- |
| `low`      | Impact limité, à corriger à l'occasion             |
| `moderate` | Risque réel selon le contexte d'utilisation        |
| `high`     | À corriger rapidement avant mise en production     |
| `critical` | Exploitable immédiatement — bloquer le déploiement |

### Corriger les vulnérabilités

```bash
# Tenter une correction automatique (mise à jour vers la version corrigée)
pnpm audit --fix

# Voir le rapport au format JSON (utile en CI/CD)
pnpm audit --json
```

### Intégration en CI/CD

Ajouter `pnpm audit --audit-level=high` dans le pipeline bloque le déploiement si une vulnérabilité de niveau `high` ou `critical` est détectée.

> **Limites :** `pnpm audit` scanne uniquement les dépendances tierces. Il ne détecte pas les failles dans votre propre code (SQL injection, XSS…). Pour l'analyse statique du code source, un outil comme `eslint-plugin-security` est complémentaire.

## Données de seed

| Email                  | Mot de passe | ID  |
| ---------------------- | ------------ | --- |
| john.doe@example.com   | 123secret    | 1   |
| jane.smith@example.com | 123secret    | 2   |
