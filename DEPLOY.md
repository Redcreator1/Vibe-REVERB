# 🚀 Guide de déploiement REVERB

## Architecture

- **Backend (Cloudflare Worker)** → `https://reverb01.mindsetredcom.workers.dev`
- **Frontend (Cloudflare Pages)** → à configurer (voir ci-dessous)

---

## 1. Backend — Cloudflare Worker (déjà déployé ✅)

Le Worker est live. Pour mettre à jour :

```bash
npm run build:worker
npx wrangler deploy --name reverb01
```

Pour configurer la clé Gemini :
```bash
npx wrangler secret put GEMINI_API_KEY --name reverb01
```

---

## 2. Frontend — Cloudflare Pages (à faire une fois)

### Option A : Via le dashboard (recommandé)

1. Aller sur [dash.cloudflare.com](https://dash.cloudflare.com) → **Pages**
2. **Create a project** → **Connect to Git**
3. Sélectionner le repo `redcreator1/vibe-reverb`
4. Configuration build :
   - **Framework preset** : None
   - **Build command** : `npm run build`
   - **Build output directory** : `dist`
   - **Node.js version** : `20`
5. **Save and Deploy** → URL automatique `vibe-reverb.pages.dev`

Une fois connecté, chaque push sur `main` redéploie automatiquement.

### Option B : Via wrangler CLI (local)

```bash
npm run build
npx wrangler pages deploy dist --project-name vibe-reverb
```

---

## 3. Variables d'environnement Pages

Aucune variable requise côté Pages — le frontend appelle directement le Worker.

---

## Vérification

- Worker health : `curl https://reverb01.mindsetredcom.workers.dev/`
- Réponse attendue : `{"status":"REVERB CORE ONLINE","lisa":"v2.0-agentique"}`
