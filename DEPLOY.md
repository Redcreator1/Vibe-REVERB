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

- Worker health : `curl https://vibe-reverb-api.mindsetredcom.workers.dev/`
- Réponse attendue : `{"status":"REVERB CORE ONLINE",...}`
