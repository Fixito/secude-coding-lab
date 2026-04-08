# Guide de sécurisation progressive — Apprenant

Ce guide t'accompagne pas à pas pour identifier, comprendre et corriger les vulnérabilités présentes dans l'application `starter/`.

**Convention dans le code source :**

- `//! VULNERABLE — Axx : Nom` → code vulnérable à corriger
- `//* SECURE` → contre-mesure appliquée (visible dans `final/` pour référence)

---

## Prérequis — Postman

Les démonstrations utilisent **Postman** pour envoyer les requêtes HTTP. Deux options :

- **Extension VS Code** (recommandée) : `Postman.postman-for-vscode` — déjà listée dans les extensions recommandées du projet, VS Code proposera de l'installer automatiquement.
- **Application desktop** : [postman.com/downloads](https://www.postman.com/downloads/)

### Importer la collection

1. Ouvrir Postman (extension ou app).
2. Importer le fichier `starter/backend/secure-coding-lab.postman_collection.json`.
3. Créer une variable de collection `URL` avec la valeur `http://localhost:5000/api/v1`.

Toutes les requêtes sont prêtes à l'emploi — les payloads de démonstration sont déjà configurés.

**Démarrer le serveur avant chaque démonstration :**

```bash
cd starter/backend
pnpm dev
```

---

## Étape 1 — A05 · Security Misconfiguration (CORS + Headers HTTP)

### Contexte

Par défaut, Express expose des informations sur sa stack technique (`X-Powered-By: Express`) et n'envoie aucun en-tête de sécurité. De plus, une configuration CORS trop permissive (`cors()` sans options) autorise n'importe quel site à interroger l'API.

### Démonstration

1. Dans Postman, envoyer n'importe quelle requête (ex. **Auth / Login**).
2. Dans la réponse, ouvrir l'onglet **Headers**.
3. Observer : `X-Powered-By: Express` est présent. `Content-Security-Policy` et `X-Frame-Options` sont absents.

### Objectif

- Ajouter les headers de sécurité HTTP recommandés (CSP, X-Frame-Options, HSTS, etc.).
- Restreindre CORS à l'unique origine autorisée du frontend.

### Indices

**Fichier à modifier :** `src/app.ts`

Deux middlewares sont disponibles dans le projet :

```ts
// Restreindre CORS à une origine précise
import cors from 'cors';
app.use(cors({ origin: '...', credentials: true }));

// Ajouter ~15 headers de sécurité en une ligne
import helmet from 'helmet';
app.use(helmet());
```

#### Ce que `helmet()` ajoute concrètement

| En-tête                     | Valeur par défaut     | Rôle                                                                                                                            |
| --------------------------- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `Content-Security-Policy`   | Politique restrictive | Indique au navigateur quelles ressources (scripts, images, styles…) il est autorisé à charger. Réduit la surface d'attaque XSS. |
| `X-Frame-Options`           | `SAMEORIGIN`          | Empêche la page d'être intégrée dans un `<iframe>` depuis un autre domaine. Protège contre le **clickjacking**.                 |
| `X-Content-Type-Options`    | `nosniff`             | Interdit au navigateur de "deviner" le type MIME d'une réponse.                                                                 |
| `Strict-Transport-Security` | `max-age=15552000`    | Force le navigateur à toujours utiliser HTTPS pour ce domaine pendant 180 jours.                                                |
| `Referrer-Policy`           | `no-referrer`         | Contrôle les informations envoyées dans l'en-tête `Referer`. Évite de fuiter des URLs internes.                                 |
| `X-DNS-Prefetch-Control`    | `off`                 | Désactive la résolution DNS anticipée des liens de la page.                                                                     |
| `X-Powered-By`              | _(supprimé)_          | Retire l'en-tête qui révèle la stack technique (`Express`).                                                                     |

Ces headers sont des **directives** envoyées au navigateur — c'est le navigateur qui les applique, pas le serveur. Ils constituent une défense en profondeur mais ne remplacent pas la correction des vulnérabilités dans le code.

#### 📖 Documentation

- [helmet.js — documentation officielle](https://helmetjs.github.io/)
- [cors — middleware Express](https://expressjs.com/en/resources/middleware/cors.html)
- [OWASP — Security Headers](https://owasp.org/www-project-secure-headers/)

### Validation

Dans Postman, renvoyer la même requête et vérifier l'onglet **Headers** de la réponse :

- `X-Powered-By` : absent
- `Content-Security-Policy` : présent
- `X-Frame-Options` : présent

---

## Étape 2 — A03 · Injection SQL

### Contexte

La route de connexion construit sa requête SQL par **concaténation de chaînes**. Un attaquant peut injecter du SQL dans le champ `email` pour modifier la logique de la requête et s'authentifier **sans connaître l'adresse email de la victime**.

### Démonstration

Dans Postman, ouvrir **Auth / Login**. Le payload est déjà configuré :

```json
{
  "email": "' OR '1'='1'; --",
  "password": "123secret"
}
```

Envoyer la requête → **HTTP 200** + token JWT retourné sans connaître aucun email valide.

La chaîne injectée transforme la requête en :

```sql
SELECT * FROM users WHERE email = '' OR '1'='1'; --' AND password = '...'
--                                    ^^^^^^^^^^^  ^^
--                                    toujours vrai  commente le reste
-- → retourne le premier utilisateur de la table, quel que soit son email
```

### Objectif

Remplacer la requête SQL construite par concaténation par une **requête paramétrée** via l'ORM.

### Indices

**Fichier à modifier :** `src/modules/auth/auth.router.ts`

L'ORM Drizzle (déjà utilisé ailleurs dans le projet) génère des prepared statements :

```ts
import { eq } from 'drizzle-orm';
import { usersTable } from '@/db/schemas/user.schema.js';

// Drizzle transmet la valeur séparément de la requête → injection impossible
const result = await db.select().from(usersTable).where(eq(usersTable.email, email));
```

#### 📖 Documentation

- [Drizzle ORM — Filtering / Where](https://orm.drizzle.team/docs/select#filtering)
- [OWASP — SQL Injection Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)

### Validation

Dans Postman, renvoyer **Auth / Login** avec le même payload d'injection → **HTTP 401 Unauthorized**.

---

## Étape 3 — A02 · Cryptographic Failures (mots de passe)

### Contexte

Même avec des requêtes paramétrées, les mots de passe sont stockés **en clair** dans la base de données. En cas de fuite de la base (dump SQL, sauvegarde exposée…), tous les mots de passe des utilisateurs sont immédiatement lisibles.

### Démonstration

L'extension **SQLite Viewer** (recommandée dans le projet) permet d'ouvrir `starter/backend/local.db` directement dans VS Code et de parcourir la table `users` : les mots de passe sont lisibles en clair.

### Objectif

- Hacher les mots de passe avec `bcrypt` au moment du seed (inscription).
- Remplacer la comparaison en clair par `bcrypt.compare()` lors de l'authentification.

### Indices

**Fichiers à modifier :** `src/modules/auth/auth.router.ts` · `src/db/seed.ts`

```ts
import bcrypt from 'bcryptjs';

// Au seeding (inscription) — salt factor 12 recommandé
const hashedPassword = await bcrypt.hash(plaintextPassword, 12);

// À l'authentification — ne jamais re-hasher pour comparer
const isValid = await bcrypt.compare(plaintextPassword, hashedPassword);
```

#### 📖 Documentation

- [bcryptjs — npm](https://www.npmjs.com/package/bcryptjs)
- [OWASP — Password Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

### Validation

Ouvrir `local.db` dans SQLite Viewer après avoir relancé `pnpm db:seed` : les mots de passe affichent `$2a$12$...` (hash bcrypt illisible).

Dans Postman, envoyer **Auth / Login** avec les vraies identifiants `john.doe@example.com` / `123secret` → **HTTP 200** : le login fonctionne toujours malgré le hachage.

---

## Étape 4 — A07 · Identification and Authentication Failures (bruteforce)

### Contexte

Sans limitation du nombre de tentatives, un attaquant peut tester des milliers de combinaisons email/mot de passe par seconde (**attaque par force brute**) ou rejouer une liste de mots de passe volés (**credential stuffing**).

### Démonstration

```bash
# Depuis la racine du projet
node starter/brute-force-demo.mjs
```

```
Envoi de 10 tentatives de connexion vers http://localhost:5000/api/v1/auth/login

Tentative  1 → HTTP 401
Tentative  2 → HTTP 401
...
Tentative 10 → HTTP 401
# Jamais de 429 → aucune limite
```

### Objectif

Limiter les tentatives de connexion à **5 essais par IP sur 15 minutes** et retourner HTTP 429 au-delà.

### Indices

**Fichiers à modifier :** `src/middlewares/rate-limit.middleware.ts` · `src/modules/auth/auth.router.ts`

La factory `createRateLimiter` est déjà présente dans le projet :

```ts
import { createRateLimiter } from '@/middlewares/rate-limit.middleware.js';

// Créer un limiteur spécifique pour le login
export const loginRateLimiter = createRateLimiter(
  5,               // max tentatives
  15 * 60 * 1000,  // fenêtre (ms)
  'Too many login attempts. Please try again in 15 minutes.',
);

// Appliquer comme middleware sur la route POST /login
router.post('/login', loginRateLimiter, validate(loginSchema), async (req, res) => { ... });
```

#### 📖 Documentation

- [express-rate-limit — documentation officielle](https://express-rate-limit.mintlify.app/)
- [OWASP — Blocking Brute Force Attacks](https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks)

### Validation

```bash
node starter/brute-force-demo.mjs
```

```
Tentative  1 → HTTP 401
Tentative  2 → HTTP 401
Tentative  3 → HTTP 401
Tentative  4 → HTTP 401
Tentative  5 → HTTP 401
Tentative  6 → HTTP 429 ← bloqué (rate limit)
Tentative  7 → HTTP 429 ← bloqué (rate limit)
...
```

---

## Étape 5 — A03 · XSS (Cross-Site Scripting)

### Contexte

La route `GET /api/v1/comments` insère le contenu des commentaires **directement dans du HTML** sans l'échapper. Un attaquant peut poster un commentaire contenant du JavaScript malveillant qui s'exécutera dans le navigateur de tous les visiteurs.

### Démonstration

1. Dans Postman, ouvrir **Comment / Create Comment**. Le payload est déjà configuré :

```json
{ "content": "<script>alert('XSS')</script>" }
```

2. Envoyer la requête → **HTTP 201**.
3. Ouvrir `http://localhost:5000/api/v1/comments` dans un navigateur → une boîte d'alerte JavaScript s'ouvre.

### Objectif

Échapper systématiquement les caractères HTML spéciaux (`<`, `>`, `&`, `"`, `'`) avant de les insérer dans la réponse HTML.

### Indices

**Fichier à modifier :** `src/modules/comment/comment.router.ts`

La librairie `escape-html` est disponible dans le projet :

```ts
import escape from 'escape-html';

// Avant : `<p>${c.content}</p>` → dangereux
// Après :
`<p>${escape(c.content)}</p>`;
// escape() convertit < → &lt;  > → &gt;  " → &quot;  etc.
```

#### 📖 Documentation

- [escape-html — npm](https://www.npmjs.com/package/escape-html)
- [OWASP — XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)

### Validation

Dans Postman, envoyer **Comment / Get All Comments** → la réponse affiche :

```html
<p>&lt;script&gt;alert('XSS')&lt;/script&gt;</p>
```

Le tag `<script>` est rendu inoffensif.

---

## Étape 6 — CSRF (Cross-Site Request Forgery)

### Contexte

La route `POST /api/v1/transfers` accepte n'importe quelle requête POST sans vérifier son origine. Un site malveillant peut déclencher silencieusement ce transfert au nom d'un utilisateur authentifié, simplement en l'attirant sur une page piégée.

### Démonstration

1. Ouvrir `starter/attack.html` directement dans un navigateur.
2. La page soumet automatiquement un formulaire vers `http://localhost:5000/api/v1/transfers`.
3. Le transfert est accepté sans que l'utilisateur ait rien fait.

```html
<!-- attack.html — formulaire auto-soumis depuis un site tiers -->
<form action="http://localhost:5000/api/v1/transfers" method="POST">
  <input type="hidden" name="amount" value="1000" />
</form>
<script>
  document.forms[0].submit();
</script>
```

### Objectif

Implémenter le **Double Submit Cookie Pattern** : générer un token CSRF côté serveur, l'envoyer dans un cookie ET dans le corps du formulaire, puis vérifier leur correspondance à chaque requête POST.

### Indices

**Fichier à modifier :** `src/modules/transfer/transfer.router.ts`

Le token est déjà généré et placé dans le formulaire (`GET /form` dans `app.ts`) :

```ts
// Côté serveur — vérification dans le handler POST
const tokenFromBody = req.body.csrf; // valeur soumise dans le formulaire
const tokenFromCookie = req.cookies.csrf; // cookie posé par le serveur

// Un site tiers ne peut pas lire le cookie (politique Same-Origin)
// → seul le site légitime peut construire une requête avec les deux valeurs correspondantes
if (tokenFromBody !== tokenFromCookie) {
  throw new ForbiddenError('Invalid CSRF token');
}
```

#### 📖 Documentation

- [OWASP — CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)

### Validation

Dans Postman, envoyer **Transfer / Create Transfer** sans token CSRF → **HTTP 403 Forbidden**.

Ouvrir `http://localhost:5000/form` dans le navigateur et soumettre le formulaire légitime → **HTTP 200** : le token correspond.

---

## Étape 7 — A01 · Broken Access Control / IDOR

### Contexte

La route `GET /api/v1/users/:id` retourne les données de n'importe quel utilisateur sans vérifier que l'appelant est bien cet utilisateur. Un attaquant authentifié peut accéder à tous les profils en incrémentant l'ID dans l'URL (**IDOR — Insecure Direct Object Reference**).

### Démonstration

1. Dans Postman, envoyer **Auth / Login** avec `john.doe@example.com` / `123secret` → copier le token JWT de la réponse.
2. Ouvrir **User / Get User By ID**, ajouter le token dans l'onglet **Authorization** (type Bearer Token).
3. Envoyer la requête vers `/users/1` → les données de john.doe s'affichent (normal).
4. Modifier l'URL pour `/users/2` → les données de jane.smith s'affichent ← c'est le problème.

### Objectif

- Protéger la route avec le middleware d'authentification JWT (`requireAuth`).
- Vérifier que l'ID demandé dans l'URL correspond à l'ID contenu dans le token JWT.

### Indices

**Fichier à modifier :** `src/modules/users/users.router.ts`

```ts
import { requireAuth } from '@/middlewares/auth.middleware.js';
import { ForbiddenError } from '@/errors/index.js';

// requireAuth vérifie le JWT et expose req.user (userId, email)
router.get('/:id', requireAuth, validate(userParamsSchema, 'params'), async (req, res) => {
  const { id } = req.params;

  // Comparer l'ID de la ressource demandée avec celui du token
  if (req.user!.userId !== Number(id)) {
    throw new ForbiddenError("You don't have permission to access this resource");
  }

  // ... suite du handler
});
```

#### 📖 Documentation

- [OWASP — Insecure Direct Object Reference Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html)
- [OWASP — Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)

### Validation

Dans Postman, envoyer **User / Get User By ID** vers `/users/2` avec le token de john.doe → **HTTP 403 Forbidden**.

Envoyer vers `/users/1` → **HTTP 200** : accès autorisé uniquement à son propre profil.

---

## Étape 8 — Audit des dépendances et analyse statique

### Contexte

Deux types d'outils permettent de détecter des vulnérabilités **sans exécuter le code** :

| Outil            | Ce qu'il analyse                      | Exemple                                   |
| ---------------- | ------------------------------------- | ----------------------------------------- |
| **`pnpm audit`** | Les dépendances tierces (CVE publiés) | "express@4.18 contient une faille connue" |
| **SAST**         | Votre propre code source              | "cette concaténation SQL est dangereuse"  |

### 9a — Audit des dépendances (`pnpm audit`)

```bash
cd starter/backend
pnpm audit
```

```bash
# Corriger automatiquement les vulnérabilités
pnpm audit --fix

# En CI/CD : bloquer si une vuln. high ou critical est détectée
pnpm audit --audit-level=high
```

| Niveau     | Signification                                      |
| ---------- | -------------------------------------------------- |
| `low`      | Impact limité, à corriger à l'occasion             |
| `moderate` | Risque réel selon le contexte                      |
| `high`     | À corriger avant mise en production                |
| `critical` | Exploitable immédiatement — bloquer le déploiement |

#### 📖 Documentation

- [pnpm audit — documentation officielle](https://pnpm.io/cli/audit)
- [OWASP — Vulnerable and Outdated Components](https://owasp.org/Top10/A06_2021-Vulnerable_and_Outdated_Components/)
- [OWASP — SAST Tools](https://owasp.org/www-community/Source_Code_Analysis_Tools)

### Validation

```bash
pnpm audit
# → found 0 vulnerabilities (idéalement)
```

---

### 9b — Analyse statique du code source (SAST)

Un **SAST** (Static Application Security Testing) est un outil qui lit votre code source — sans l'exécuter — et cherche des **patterns dangereux** connus.

**Comment ça fonctionne :**

L'outil parcourt vos fichiers et cherche des constructions de code qui ressemblent à des vulnérabilités connues. Par exemple, il repère qu'une variable venant de l'utilisateur (`req.body.email`) se retrouve directement dans une requête SQL sans passer par un mécanisme de protection. Ce type de correspondance s'appelle une **règle** — il en existe des milliers, chacune ciblant un pattern spécifique.

```
Code source → Analyse des patterns → Rapport "ligne X : ce code ressemble à une SQL injection"
```

**Ce qu'il détecte (exemples) :**

- Requêtes SQL construites par concaténation de chaînes
- Contenu utilisateur injecté dans du HTML sans échappement
- Secrets hardcodés dans le code (`const apiKey = "sk-..."`)
- Utilisation de fonctions connues pour être dangereuses (`eval()`, `exec()`)

**Ce qu'il ne détecte pas :**

- Les vulnérabilités logiques (règle métier mal implémentée)
- Les failles dans les dépendances tierces (rôle de `pnpm audit`)
- Les patterns dangereux écrits d'une façon qu'il ne reconnaît pas

Un SAST appliqué au projet `starter/` détecterait automatiquement la construction de requête SQL par concaténation dans `auth.router.ts` et l'injection de contenu non échappé dans `comment.router.ts`. Le même outil sur `final/` ne trouverait rien.

Des outils SAST existent pour TypeScript/JavaScript : Semgrep, Snyk Code, SonarQube — certains gratuits, d'autres payants, certains intégrables directement en CI/CD.

---

## Récapitulatif

| #   | Vulnérabilité                   | Fichier clé             | Correction                           |
| --- | ------------------------------- | ----------------------- | ------------------------------------ |
| 1   | A05 — Security Misconfiguration | `app.ts`                | `helmet()` + `cors({ origin })`      |
| 2   | A03 — SQL Injection             | `auth.router.ts`        | Requêtes paramétrées (Drizzle ORM)   |
| 3   | A02 — Cryptographic Failures    | `auth.router.ts` + seed | `bcrypt.hash()` + `bcrypt.compare()` |
| 4   | A07 — Brute Force               | `auth.router.ts`        | `express-rate-limit`                 |
| 5   | A03 — XSS                       | `comment.router.ts`     | `escape-html`                        |
| 6   | CSRF                            | `transfer.router.ts`    | Double Submit Cookie Pattern         |
| 7   | A01 — Broken Access Control     | `users.router.ts`       | `requireAuth` + comparaison userId   |
| 8   | Dépendances + code source       | `package.json`          | `pnpm audit` + SAST                  |

> La solution complète de chaque étape est disponible dans `final/backend/src/`.
