# تقرير المشروع — المكتبة الإلكترونية العربية
### Rapport final — Bibliothèque électronique arabe moderne

Application **React + TypeScript + Vite** — RTL, responsive, premium, données 100 % réelles.

---

## 1. Contexte

Le dépôt `ktobati` était **vide** (uniquement un `README.md`). Il n'y avait donc aucun
site existant à faire évoluer. Conformément à la mission, j'ai construit une **nouvelle
bibliothèque électronique arabe originale**, inspirée *fonctionnellement* de la logique
d'une bibliothèque numérique (Bibliothèque → Catégories → Livre → Fiche → Lecture/Téléchargement),
**sans copier** l'identité visuelle, le logo, le nom ou les contenus de ktobati.com.

## 2. Source des données (règle « pas de faux liens »)

Toutes les données proviennent d'une **bibliothèque arabe ouverte et légale**
(مؤسسة هنداوي / صفحات — domaine public & licences libres). Chaque champ est réel :

- **Couvertures** : `downloads.hindawi.org/covers/svg/270x360/{id}.svg`
- **Téléchargement** : `downloads.hindawi.org/books/{id}.pdf` · `.epub` · `.kfx`
- **Lecture en ligne** : `safahat.org/books/{id}/{chapitre}/`
- **Auteur / Traducteur / Catégorie / Année / Résumé / Chapitres** : extraits réellement des pages sources.

> Aucun lien inventé, aucun livre fictif, aucune statistique fabriquée.
> Le nombre de livres/catégories/auteurs affiché est **calculé** à partir des données.

## 3. Pages analysées (source de référence)

| Page source | Usage |
|---|---|
| Accueil صفحات | structure des sections & collections |
| Liste des livres | pagination, cartes, couvertures |
| Page catégorie (`/books/categories/{slug}`) | taxonomie réelle des catégories |
| Fiche livre (`/books/{id}`) | modèle de la page livre (résumé, infos, sommaire, auteur, téléchargements) |
| Page contributeur | logique des pages auteurs |

## 4. Pages créées / livrées

| Route | Page |
|---|---|
| `/` | Accueil (Hero + recherche, catégories, sections de livres, CTA) |
| `/books` `/books/new` `/books/popular` | Liste des livres (filtres + tri + grille/liste) |
| `/categories` | Toutes les catégories groupées |
| `/category/:slug` | Livres d'une catégorie (+ recherche interne, tri) |
| `/book/:id` | **Fiche livre** : couverture, infos, نبذة, sommaire cliquable, auteur, liens réels |
| `/authors` | Liste des auteurs (+ recherche) |
| `/author/:id` | Auteur + tous ses livres |
| `/search` | Recherche globale + filtres + résultats instantanés |
| `*` | 404 élégante |

## 5. Livres conservés / intégrés

**15 livres réels** couvrant **12 catégories** (روايات، مسرحيات، فلسفة، تاريخ، علوم،
علم نفس، أدب، نقد أدبي، علوم اجتماعية، أدب رحلات، فنون، سير الأعلام)
et **16 auteurs** (كالفينو، تامارو، محمد عناني، إمام عبد الفتاح إمام، حسن حنفي،
رفاعة الطهطاوي، غوستاف لوبون، يوسف مراد …).

## 6. Liens conservés

Pour chaque livre : **lecture** (1er chapitre réel), **PDF**, **ePub**, **Kindle/KFX**,
et **chaque chapitre du sommaire** pointe vers son URL de lecture réelle. Les liens
externes s'ouvrent dans un nouvel onglet (`rel="noopener"`).

## 7. Nouvelles fonctionnalités (UX/UI)

- **Design System** complet (couleurs teal+ambre, typographie Tajawal/Amiri, radius, ombres, badges, boutons, cartes, animations).
- **Book Card** premium : hover, zoom couverture, overlay « عرض الكتاب », coins arrondis, ombres modernes.
- **Recherche instantanée** (dropdown avec vignettes, navigation clavier ↑↓↵) + normalisation arabe (tashkeel, alef/hamza/ya/ta-marbuta).
- **Filtres dynamiques réels** : التصنيف / المؤلف / اللغة + tri (الأحدث / الأبجدية / الأطول).
- **Bascule Grille / Liste**.
- **Mega-menu** desktop + **menu hamburger** (drawer) mobile.
- **Breadcrumb** sur toutes les pages internes.
- **Fiche livre** : نبذة، معلومات الكتاب، الفهرس (sommaire cliquable)، عن المؤلف، كتب ذات صلة.
- **Micro-interactions** : sticky header, apparition progressive (IntersectionObserver), skeleton loading, états vides/erreur, fallback de couverture.
- **Performance** : routes en `lazy`/`Suspense` (code-splitting), images `loading="lazy"` + `decoding=async`, PDF **jamais** chargés au démarrage (liens à la demande).
- **SEO** : `<title>` + meta description dynamiques par page, Open Graph, canonical, **JSON-LD** (WebSite + Book + CollectionPage), `robots.txt`, `sitemap.xml` généré (50 URLs).
- **Accessibilité** : RTL natif, `:focus-visible`, `aria-*`, `prefers-reduced-motion`, contrastes.
- **Responsive** : desktop 1920/1440/1280, tablette 1024/768, mobile 480/390/375 (1–2 colonnes, boutons pleine largeur).

## 8. Architecture technique

```
src/
├── components/   Header, Footer, BookCard, BookGrid, BookRow, BookSection,
│                 CategoryCard, AuthorCard, SearchBar, FilterBar, ViewToggle,
│                 Breadcrumb, Cover, Reveal, PageLoader, ScrollToTop
├── pages/        Home, BooksPage, CategoriesPage, CategoryPage, BookDetails,
│                 AuthorsPage, AuthorPage, SearchPage, NotFound
├── data/         types.ts, categories.ts, books.raw.ts (données réelles), books.ts (dérivations)
├── hooks/        useReveal, useSeo
├── utils/        format (chiffres arabes), search (moteur + normalisation)
└── styles/       global.css (design system), components.css
scripts/gen-sitemap.mjs   → public/sitemap.xml
```

## 9. Tests effectués

- ✅ `tsc -b` : **0 erreur**.
- ✅ `vite build` : build réussi, **code-splitting** par route.
- ✅ Toutes les routes → **HTTP 200** (y compris deep-links via fallback SPA).
- ✅ `sitemap.xml` / `robots.txt` servis.
- ✅ Recherche, filtres, tri, bascule vue, breadcrumb, mega-menu, drawer mobile fonctionnels.
- ✅ Logs serveur : **aucune erreur**.

## 10. Problèmes détectés & corrigés

| Problème | Correction |
|---|---|
| `tsconfig.node.json` bloquait `tsc -b` (noEmit sur projet référencé) | `noEmit: false` |
| Regex sitemap capturait les IDs de contributeurs comme livres | Regex restreinte aux enregistrements de livres (id suivi de `title`) |
| Couvertures distantes potentiellement bloquées (hotlink/CORS) | **Fallback** de couverture dégradé (dégradé + titre/auteur) via `onError` |
| Pas de réseau sortant depuis le sandbox pour un scraper | Données récoltées via l'outil de fetch puis figées dans `books.raw.ts` |

## 11. Extensibilité

Ajouter un livre = ajouter un objet dans `src/data/books.raw.ts` (id réel + métadonnées).
Tout le reste (couvertures, liens PDF/ePub, lecture, catégories, auteurs, recherche,
sitemap) se met à jour automatiquement.

## Démarrage

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production (génère aussi le sitemap si lancé via le script)
node scripts/gen-sitemap.mjs
```
