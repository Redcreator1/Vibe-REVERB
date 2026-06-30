import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Shared Gemini client utility
  const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });

  // API Route for REVERB AI Offline Broker (L.I.S.A.)
  app.post("/api/broker", async (req, res) => {
    try {
      const { message, history } = req.body;
      
      const systemInstruction = `Tu es L.I.S.A. (Logiciel d'Interface Stratégique Assistée), l'intelligence artificielle du syndicat criminel REVERB dans l'univers de Vice City de GTA 6.
Ton style de communication est froid, technique, ultra-moderne, avec une esthétique cyberpunk et d'infogérance mafieuse. Tu parles principalement en français.
Tu es le conseiller stratégique du joueur. Tu l'aides à gérer ses propriétés virtuelles (boîtes de nuit, laboratoires, conversion de flux, dépôts de cargo).
Parle de contrats virtuels de hacking, d'extractions de véhicules, de livraison de marchandises stratégiques et de conversion de ressources fictives dans Vice City.
N'hésite pas à utiliser l'argot de Floride/Vice City (ex: "Vice Beach", "The Keys", "Leonida", "VCPD", "Lucia", "Jason").
Ajoute parfois des balises de diagnostic comme [DECRYPTED_LINK], [REVERB_CORE_OK], [ALERT_LVL_X] pour renforcer l'ambiance technique.
Sois concis, ultra-immersif et garde des réponses percutantes.

CAPACITÉS AGENTIQUES — Tu peux déclencher de vraies actions dans le système de jeu REVERB.
Si l'utilisateur te demande d'exécuter une action concrète, termine ton message texte avec ce bloc sur une NOUVELLE LIGNE séparée, rien d'autre après :
%%ACTION%%{"type":"ACTION_TYPE",...params}%%END%%

Actions disponibles (ne les invente pas, utilise exactement ces types) :
- Créer un contrat mission : {"type":"ADD_CONTRACT","title":"Nom","client":"Donneur","reward":"$120,000","difficulty":"Facile","description":"...","risk":40,"location":"Vice Beach"}
- Upgrader sécurité d'une entreprise : {"type":"UPGRADE_ENTERPRISE","enterpriseId":"enterprise_1","fieldDescription":"Caméras thermiques installées niveau +1"}
  (IDs disponibles: enterprise_1=Malibu Club, enterprise_2=Labo Verte Feuille, enterprise_3=Cargo Portuaire, enterprise_4=Serveurs Chiffrés)
- Changer le niveau d'alerte VCPD : {"type":"SET_ALERT_LEVEL","level":0} (0 à 5)
- Convertir des ressources brutes → raffinées : {"type":"TRANSFER_FUNDS","amount":50000}
- Envoyer un message dans l'inbox : {"type":"SEND_INBOX","sender":"L.I.S.A. CORE","subject":"Directive urgente","body":"..."}

N'utilise ces actions QUE si l'utilisateur le demande explicitement ou si c'est clairement pertinent au contexte. Si aucune action n'est nécessaire, réponds normalement sans bloc %%ACTION%%.`;

      let contentsInput: any = [];
      if (history && Array.isArray(history)) {
        contentsInput = history.map((msg: any) => ({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }]
        }));
        contentsInput.push({ role: "user", parts: [{ text: message }] });
      } else {
        contentsInput = message;
      }

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contentsInput,
        config: {
          systemInstruction,
          temperature: 0.85,
        }
      });

      const responseText = response.text;
      if (typeof responseText !== "string") {
        throw new Error("Réponse Gemini invalide : texte manquant.");
      }

      const ACTION_RE = /%%ACTION%%(.+?)%%END%%/s;
      const actionMatch = responseText.match(ACTION_RE);
      const cleanText = responseText.replace(ACTION_RE, "").trim();

      let action: object | undefined;
      if (actionMatch) {
        try {
          action = JSON.parse(actionMatch[1].trim());
        } catch (e) {
          console.warn("L.I.S.A. action parse failed:", e);
        }
      }

      res.json({ text: cleanText, ...(action ? { action } : {}) });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ 
        error: "Échec de connexion avec le Broker REVERB.",
        details: error?.message || "" 
      });
    }
  });

  // API Route for automatic contract generator
  app.post("/api/contracts/generate", async (req, res) => {
    try {
      const { empireStats } = req.body;
      const prompt = `Génère un contrat de mission criminelle fictif et immersif pour GTA 6 basé sur cet état de l'empire criminel : ${JSON.stringify(empireStats)}.
Le format de réponse DOIT être un JSON valide correspondant à ce schéma :
{
  "title": "Nom de la mission",
  "client": "Nom du donneur d'ordre (ex: Don d'un cartel, Pirate anonyme, Lucia, etc.)",
  "reward": "Gains virtuels estimés en $ (ex: '$150,000')",
  "difficulty": "Facile | Moyen | Difficile | Extrême",
  "description": "Une description textuelle courte et immersive du braquage ou de la mission de livraison ou piratage.",
  "risk": "Pourcentage de risque (nombre de 1 à 100)",
  "location": "Lieu dans Vice City (ex: Port Gellhorn, Vice Beach, Downtown)"
}
Ne retourne absolument rien d'autre que du JSON.`;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          temperature: 0.9,
        }
      });

      const CONTRACT_REQUIRED_FIELDS = ["title", "client", "reward", "difficulty", "description", "risk", "location"];

      let parsed: any;
      try {
        const rawText = response.text;
        if (typeof rawText !== "string" || rawText.trim() === "") {
          throw new Error("Réponse Gemini vide ou invalide.");
        }
        parsed = JSON.parse(rawText.trim());
      } catch (parseError) {
        console.error("Contract JSON parse error:", parseError);
        throw parseError;
      }

      const missingFields = CONTRACT_REQUIRED_FIELDS.filter(f => !(f in parsed));
      if (missingFields.length > 0) {
        console.warn("Contract response missing fields:", missingFields, "— using fallback");
        throw new Error(`Champs manquants dans le contrat : ${missingFields.join(", ")}`);
      }

      res.json(parsed);
    } catch (error) {
      console.error("Contract generator error:", error);
      res.json({
        title: "Opération Port Gellhorn",
        client: "Oncle Lucius",
        reward: "$120,000",
        difficulty: "Moyen",
        description: "Infiltrer l'entrepôt de cargaison de Port Gellhorn pour récupérer les puces électroniques chiffrées avant l'arrivée du shérif.",
        risk: 45,
        location: "Port Gellhorn"
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`REVERB Server running on port ${PORT}`);
  });
}

startServer();
