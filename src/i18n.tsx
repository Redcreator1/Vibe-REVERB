import { createContext, useContext, useState, ReactNode } from "react";

export type Lang = "fr" | "en" | "es";

const T = {
  fr: {
    "app.title": "SYSTÈME REVERB",
    "app.subtitle": "CONSOLE INVERSIVE DE SÉCURITÉ DE VICE CITY",
    "header.flux": "FLUX TÉLÉMÉTRIQUE",
    "header.resources": "RESSOURCES TOTALES",
    "header.vcpd": "VCPD",
    "nav.screen": "Écran",
    "nav.empire": "Empire",
    "nav.messages": "Messages",
    "nav.sandbox": "Sandbox",
    "tab.screen": "Second Écran",
    "tab.empire": "Empire",
    "tab.inbox": "Messagerie",
    "tab.sandbox": "Sandbox RP",
    "status.online": "SYNC_OK",
    "status.offline": "OFFLINE",
    "mission.title": "ALERTE EXÉCUTION SYNDICAT",
    "mission.reward": "RÉCOMPENSE SALES :",
    "mission.risk": "FACTEUR DE RISQUE :",
    "mission.running": "EXÉCUTION DU SCRIPT...",
    "mission.close": "FERMER LE RAPPORT",
    "mission.execute": "Exécuter",
    "contracts.title": "MISSIONS & CONTRATS ACTIFS",
    "footer.copy": "© REVERB SYSTEM INC. TOUS DROITS RÉSERVÉS. CONSOLE COMPAGNON GTA 6.",
    "footer.logs": "LOGS TERMINAL",
    "footer.secure": "SECURE KEY",
    "footer.reset": "RESET",
    "sandbox.banner": "CONSOLE REVERB ACTIVE : Le simulateur Sandbox RP est opérationnel. Modifiez les règles ou générez des guerres de gangs !",
    "sandbox.cta": "Éditeur RP",
    "contrast.on": "CONTRASTE+",
    "contrast.off": "CONTRASTE-",
    "chat.title": "OPÉRATEURS EN LIGNE",
    "chat.placeholder": "Message réseau REVERB...",
    "chat.send": "Envoyer",
    "chat.connecting": "Connexion au réseau...",
    "chat.offline": "Chat hors ligne",
    "chat.config": "Configurez VITE_WS_URL pour activer",
  },
  en: {
    "app.title": "REVERB SYSTEM",
    "app.subtitle": "VICE CITY INVERSE SECURITY CONSOLE",
    "header.flux": "TELEMETRY FEED",
    "header.resources": "TOTAL ASSETS",
    "header.vcpd": "VCPD",
    "nav.screen": "Screen",
    "nav.empire": "Empire",
    "nav.messages": "Messages",
    "nav.sandbox": "Sandbox",
    "tab.screen": "Live Screen",
    "tab.empire": "Empire",
    "tab.inbox": "Inbox",
    "tab.sandbox": "Sandbox RP",
    "status.online": "SYNC_OK",
    "status.offline": "OFFLINE",
    "mission.title": "SYNDICATE EXECUTION ALERT",
    "mission.reward": "DIRTY REWARD:",
    "mission.risk": "RISK FACTOR:",
    "mission.running": "RUNNING SCRIPT...",
    "mission.close": "CLOSE REPORT",
    "mission.execute": "Execute",
    "contracts.title": "ACTIVE MISSIONS & CONTRACTS",
    "footer.copy": "© REVERB SYSTEM INC. ALL RIGHTS RESERVED. GTA 6 IMMERSIVE COMPANION APP.",
    "footer.logs": "TERMINAL LOGS",
    "footer.secure": "SECURE KEY",
    "footer.reset": "RESET",
    "sandbox.banner": "REVERB CONSOLE ACTIVE: Sandbox RP simulator is operational. Edit rules or generate gang wars!",
    "sandbox.cta": "RP Editor",
    "contrast.on": "HI-CONTRAST",
    "contrast.off": "CONTRAST-",
    "chat.title": "ONLINE OPERATORS",
    "chat.placeholder": "REVERB network message...",
    "chat.send": "Send",
    "chat.connecting": "Connecting to network...",
    "chat.offline": "Chat offline",
    "chat.config": "Set VITE_WS_URL to enable",
  },
  es: {
    "app.title": "SISTEMA REVERB",
    "app.subtitle": "CONSOLA DE SEGURIDAD INVERSA DE VICE CITY",
    "header.flux": "TELEMETRÍA EN VIVO",
    "header.resources": "ACTIVOS TOTALES",
    "header.vcpd": "VCPD",
    "nav.screen": "Pantalla",
    "nav.empire": "Imperio",
    "nav.messages": "Mensajes",
    "nav.sandbox": "Sandbox",
    "tab.screen": "Pantalla en Vivo",
    "tab.empire": "Imperio",
    "tab.inbox": "Mensajería",
    "tab.sandbox": "Sandbox RP",
    "status.online": "SYNC_OK",
    "status.offline": "OFFLINE",
    "mission.title": "ALERTA EJECUCIÓN SINDICATO",
    "mission.reward": "RECOMPENSA SUCIA:",
    "mission.risk": "FACTOR DE RIESGO:",
    "mission.running": "EJECUTANDO SCRIPT...",
    "mission.close": "CERRAR INFORME",
    "mission.execute": "Ejecutar",
    "contracts.title": "MISIONES Y CONTRATOS ACTIVOS",
    "footer.copy": "© REVERB SYSTEM INC. TODOS LOS DERECHOS RESERVADOS.",
    "footer.logs": "LOGS TERMINAL",
    "footer.secure": "CLAVE SEGURA",
    "footer.reset": "RESET",
    "sandbox.banner": "CONSOLA REVERB ACTIVA: Simulador Sandbox RP operacional. ¡Edita reglas o genera guerras de pandillas!",
    "sandbox.cta": "Editor RP",
    "contrast.on": "ALTO CONTRASTE",
    "contrast.off": "CONTRASTE-",
    "chat.title": "OPERADORES EN LÍNEA",
    "chat.placeholder": "Mensaje red REVERB...",
    "chat.send": "Enviar",
    "chat.connecting": "Conectando a la red...",
    "chat.offline": "Chat sin conexión",
    "chat.config": "Configura VITE_WS_URL para activar",
  },
} as const satisfies Record<Lang, Record<string, string>>;

type TKey = keyof (typeof T)["fr"];

interface I18nCtx {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TKey) => string;
}

const I18nContext = createContext<I18nCtx>({
  lang: "fr",
  setLang: () => {},
  t: (k) => k,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const stored = (typeof localStorage !== "undefined" ? localStorage.getItem("reverb-lang") : null) as Lang | null;
  const [lang, setLangState] = useState<Lang>(stored ?? "fr");

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("reverb-lang", l);
  };

  const t = (key: TKey): string => (T[lang] as Record<string, string>)[key] ?? (T.fr as Record<string, string>)[key] ?? key;

  return <I18nContext.Provider value={{ lang, setLang, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
