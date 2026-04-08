# Sécurité des applications web

Lab pédagogique pour apprendre à identifier et corriger les vulnérabilités web courantes (OWASP Top 10).

## Guides

| Fichier                                      | Pour qui                                                                      |
| -------------------------------------------- | ----------------------------------------------------------------------------- |
| [`GUIDE_APPRENANT.md`](./GUIDE_APPRENANT.md) | Apprenants — contexte, démo, objectifs et indices pour corriger chaque faille |

## Structure

| Dossier      | Contenu                                  |
| ------------ | ---------------------------------------- |
| `starter/`   | Application vulnérable (point de départ) |
| `final/`     | Application corrigée (référence)         |
| `reveal.js/` | Présentation Reveal.js du cours          |

## Slides

```bash
# 1. Installer les dépendances (une seule fois)
cd reveal.js && npm install

# 2. Lancer le serveur de développement
npm start
```

Les slides sont disponibles sur `http://localhost:8000`.
