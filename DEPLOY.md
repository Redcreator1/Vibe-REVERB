# 🚀 Guide de déploiement REVERB

## Architecture

- **Backend (Cloudflare Worker)** → `https://vibe-reverb-api.mindsetredcom.workers.dev`
  (nom du Worker fixé par `name` dans `wrangler.toml` — ne pas le renommer,
  ça créerait un Worker séparé au lieu de mettre à jour celui-ci)
- **Frontend (Cloudflare Pages)** → `https://vibe-reverb.pages.dev`

Aucune intégration IA payante — le Worker héberge uniquement les Durable
Objects pour le chat temps réel (`ReverbChatSQL`), la guerre de territoires
(`ReverbTerritories`) et les comptes joueurs (`ReverbAccounts`).

---

## 1. Backend — Cloudflare Worker

```bash
npm run build
npx wrangler deploy
```

Le nom et les bindings sont définis dans `wrangler.toml` — pas besoin de
`--name`, il doit correspondre à `vibe-reverb-api`.

---

## 2. Frontend — Cloudflare Pages (connecté à GitHub ✅)

Chaque push sur `main` redéploie automatiquement via Cloudflare Pages.

Configuration build :
- **Build command** : `npm run build`
- **Build output directory** : `dist`
- **Node.js version** : `20`

---

## Vérification

- Worker health : `curl https://vibe-reverb-api.mindsetredcom.workers.dev/`
- Réponse attendue : `{"status":"REVERB CORE ONLINE",...}`
