# 🚀 Guide de déploiement REVERB

## Architecture

- **Backend (Cloudflare Worker)** → `https://reverb01.mindsetredcom.workers.dev`
- **Frontend (Cloudflare Pages)** → `https://vibe-reverb.pages.dev`

---

## 1. Backend — Cloudflare Worker (déjà déployé ✅)

Pour mettre à jour :

```bash
npm run build:worker
npx wrangler deploy --name reverb01
```

Pour configurer la clé Gemini :
```bash
npx wrangler secret put GEMINI_API_KEY --name reverb01
```

---

## 2. Frontend — Cloudflare Pages (connecté à GitHub ✅)

Chaque push sur `main` redéploie automatiquement via Cloudflare Pages.

Configuration build :
- **Build command** : `npm run build`
- **Build output directory** : `dist`
- **Node.js version** : `20`

---

## Vérification

- Worker health : `curl https://reverb01.mindsetredcom.workers.dev/`
- Réponse attendue : `{"status":"REVERB CORE ONLINE","lisa":"v2.0-agentique"}`
