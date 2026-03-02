# Deploy Vercel + Data Online

## 1) Pre-requis
- Un repo GitHub avec ce projet.
- Un compte Vercel.
- Une base Postgres (Neon ou Supabase Postgres recommande).
- Vercel Blob active dans ton projet.

## 2) Variables d'environnement (Vercel)
Dans Vercel > Project > Settings > Environment Variables:
- `DATABASE_URL`: URL de ta base Postgres.
- `ADMIN_TOKEN`: mot de passe long (ex: 32+ caracteres).

## 3) Base de donnees
Execute le SQL de `db/schema.sql` dans ta base.

## 4) Import du projet
- Vercel > New Project > Import Git Repository.
- Deploy.

## 5) Utilisation
- Page publique: `/`.
- Page edition: `/modifier.html`.
- Dans la page `modifier.html`, colle la valeur `ADMIN_TOKEN` dans "Token admin" puis clique "Enregistrer".

## 6) API disponible
- `GET /api/reviews`
- `GET /api/reviews/:id`
- `POST /api/reviews` (token admin requis)
- `DELETE /api/reviews/:id` (token admin requis)
- `POST /api/upload` (token admin requis)

## 7) Notes importantes
- Les medias locaux sont uploades vers Vercel Blob.
- Si un fichier est tres lourd, l'upload via API peut echouer (limites payload/functions).
- Pour de tres grosses videos, privilegie des URLs externes (YouTube/Vimeo) ou un pipeline upload dedie.
