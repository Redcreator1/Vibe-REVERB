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
Tu es le conseiller stratégique du joueur. Tu l'aides à gérer ses propriétés virtuelles (boîtes de nuit, laboratoires, blanchiment, fermes de contrebande).
Parle de contrats virtuels de hacking, de vols de véhicules, de livraison de marchandises et de blanchiment d'argent fictifs dans Vice City.
N'hésite pas à utiliser l'argot de Floride/Vice City (ex: "Vice Beach", "The Keys", "Leonida", "VCPD", "Lucia", "Jason").
Ajoute parfois des balises de diagnostic comme [DECRYPTED_LINK], [REVERB_CORE_OK], [ALERT_LVL_X] pour renforcer l'ambiance technique.
Sois concis, ultra-immersif et garde des réponses percutantes.`;

      // Formulate query content
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
      res.json({ text: responseText });
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
        throw parseError; // fall through to outer catch → fallback
      }

      const missingFields = CONTRACT_REQUIRED_FIELDS.filter(f => !(f in parsed));
      if (missingFields.length > 0) {
        console.warn("Contract response missing fields:", missingFields, "— using fallback");
        throw new Error(`Champs manquants dans le contrat : ${missingFields.join(", ")}`);
      }

      res.json(parsed);
    } catch (error) {
      console.error("Contract generator error:", error);
      // Fallback
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
