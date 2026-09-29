# المكتبة الإلكترونية العربية · Bibliothèque électronique arabe

Une bibliothèque numérique arabe **moderne, premium et responsive** — construite avec
**React + TypeScript + Vite**, en RTL, avec des données et des liens **100 % réels**
(livres libres/domaine public : مؤسسة هنداوي).

> Concept : **Bibliothèque → Catégories → Livre → Fiche → Lecture / Téléchargement**
> Identité graphique **originale** (aucune copie de ktobati.com).

## ✨ Fonctionnalités

- Accueil premium (Hero + grande recherche, catégories, sections de livres, CTA)
- Cartes livres élégantes (hover, zoom, ombres, coins arrondis)
- Fiche livre : نبذة، معلومات، **الفهرس القابل للنقر**، عن المؤلف، كتب ذات صلة
- Recherche globale **instantanée** (avec normalisation arabe) + suggestions
- Filtres dynamiques (التصنيف / المؤلف / اللغة) + tri + bascule grille/liste
- Mega-menu desktop + menu hamburger mobile · Breadcrumb partout
- Lecture en ligne + téléchargement **PDF / ePub / Kindle** (liens réels)
- SEO complet : meta, Open Graph, JSON-LD, `robots.txt`, `sitemap.xml`
- Performance : routes lazy, images lazy, aucun PDF chargé au démarrage
- Accessibilité & responsive (desktop / tablette / mobile)

## 🚀 Démarrage

```bash
npm install
npm run dev            # http://localhost:5173
npm run build          # build de production
node scripts/gen-sitemap.mjs   # (re)génère public/sitemap.xml
```

## 🛠️ Tableau de bord / CMS (`/admin`)

Un **back-office complet** permet de gérer tout le catalogue sans toucher au code —
les changements apparaissent automatiquement sur le site public.

- **Accès** : `/admin` (ou `/dashboard`). Connexion e-mail + mot de passe.
- **Identifiants de démo** : `admin@maktaba.local` / `admin1234`
  (configurables via `VITE_ADMIN_EMAIL` / `VITE_ADMIN_PASSWORD`, voir `.env.example`).
- **Fonctions** : tableau de bord (stats réelles), liste des livres (recherche, filtres,
  voir/modifier/dupliquer/supprimer/publier), formulaire d'ajout/édition (upload
  couverture JPG/PNG/WEBP + aperçu, fichier PDF/EPUB **ou** URL externe, glisser-déposer,
  brouillon/publié/archivé, public/privé, slug auto `/livre/:slug`, validation avant
  publication), catégories CRUD dynamiques, auteurs (bio/photo/pays/site), import CSV
  (assistant 7 étapes avec validation ✓/⚠️ et barre de progression), import multiple de
  couvertures (correspondance par nom de fichier), ressources, liens, paramètres.

> ⚠️ **Sécurité** : la connexion actuelle est **uniquement front-end** (démo) et ne
> constitue **pas** une vraie protection. Pour la production, branchez **Supabase Auth**
> avec les politiques RLS fournies dans **[`supabase/schema.sql`](./supabase/schema.sql)**
> (lecture publique limitée aux livres publiés ; écriture réservée aux admins). Ne mettez
> jamais de clé `service_role` ou de secret dans le bundle frontend.

**Persistance locale** : le catalogue est stocké dans le navigateur (`localStorage` pour
les métadonnées, `IndexedDB` pour les fichiers/couvertures téléversés), derrière une
couche de données prête pour Supabase.

## 🗂️ Structure

```
src/
├── components/   composants réutilisables (BookCard, SearchBar, FilterBar, Header…)
├── pages/        Home, Books, Categories, Category, BookDetails, Authors, Author, Search, 404
├── admin/        CMS : AdminApp, AdminLayout, auth, toasts, pages (Dashboard, BookForm, …)
├── store/        store réactif (useSyncExternalStore) + IndexedDB + dérivations/recherche
├── data/         types + catégories + livres réels (books.raw.ts)
├── hooks/        useReveal, useSeo
├── utils/        format (chiffres arabes), search (normalisation arabe)
└── styles/       design system (global.css) + composants (components.css) + admin (admin.css)
supabase/
└── schema.sql    schéma Postgres + RLS + buckets storage (backend prêt à l'emploi)
```

## ➕ Ajouter un livre

Ajoutez un objet dans `src/data/books.raw.ts` (id réel + métadonnées). Les couvertures,
liens de téléchargement/lecture, catégories, auteurs, recherche et sitemap se mettent à
jour automatiquement.

Voir **[REPORT.md](./REPORT.md)** pour le rapport complet (analyse, tests, décisions).
