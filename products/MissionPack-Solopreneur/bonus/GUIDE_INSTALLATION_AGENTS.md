# Bonus — Installer les agents Solopreneur en 2 minutes

Ce guide te montre comment activer les prompts agents optimisés pour le mode Solopreneur.

---

## Étape 1 — Sauvegarde tes prompts actuels

Avant de modifier, copie les fichiers originaux :
```
agents/researcher/prompts.py  →  agents/researcher/prompts.BACKUP.py
agents/strategist/prompts.py  →  agents/strategist/prompts.BACKUP.py
```

---

## Étape 2 — Remplace les prompts

Ouvre `agents/researcher/prompts.py` et remplace la valeur de `RESEARCHER_SYSTEM_PROMPT` par le contenu du fichier `agents-config/researcher_solopreneur.py`.

Ouvre `agents/strategist/prompts.py` et remplace `STRATEGIST_SYSTEM_PROMPT` par le contenu de `agents-config/strategist_solopreneur.py`.

---

## Étape 3 — Redémarre la console

Ferme la fenêtre noire et relance `start-aether.bat`.

---

## Revenir aux agents par défaut

Renomme tes fichiers `.BACKUP.py` en `.py` et redémarre. Les agents reviennent à leur comportement d'origine.

---

## Tip avancé — Switcher de profil sans redémarrer

Tu peux créer plusieurs fichiers de profil et les swapper selon ta session :
- `prompts.SOLOPRENEUR.py` pour les sessions business
- `prompts.DEFAULT.py` pour les sessions techniques
- `prompts.CREATIVE.py` pour les sessions contenu

Un script Python de 5 lignes peut gérer le switch automatiquement.
