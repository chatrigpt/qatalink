# Qatalink

SaaS de menus et catalogues interactifs, générables depuis une image ou du texte, personnalisables et partageables par QR code avec commande WhatsApp.

## Stack
- Next.js 15 / React 19
- Supabase Auth + Postgres + Storage
- n8n OCR webhook
- Maketou checkout
- Vercel

## Local
1. La V1 fournie contient déjà un `.env.local` de travail pour Supabase et Maketou.
2. `npm install`
3. `npm run dev`
4. Pour Vercel, recopier les mêmes variables dans les variables d’environnement du projet (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `MAKETOU_API_KEY`, `NEXT_PUBLIC_APP_URL`).

> Ne jamais exposer `MAKETOU_API_KEY` dans le navigateur.
