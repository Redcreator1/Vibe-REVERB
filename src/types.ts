/**
 * REVERB System - Global Types & Interfaces
 */

export interface Telemetry {
  latitude: number;
  longitude: number;
  speed: number;
  vehicle: string;
  gear: number;
  rpm: number;
  searchLevel: number; // 0 to 5 stars
  zone: string;
  health: number;
  armor: number;
  ammo: number;
  activeRadio: string;
}

export interface Enterprise {
  id: string;
  name: string;
  type: "club" | "lab" | "cargo" | "server";
  location: string;
  incomePerMin: number;
  securityLevel: number; // 1 to 5
  dirtyStock: number; // 0 to 100
  cleanCashPending: number;
  status: "active" | "raided" | "idle";
}

export interface Contract {
  title: string;
  client: string;
  reward: string;
  difficulty: "Facile" | "Moyen" | "Difficile" | "Extrême";
  description: string;
  risk: number; // 1 to 100
  location: string;
}

export interface NPCMessage {
  id: string;
  sender: string;
  senderAvatar: string;
  subject: string;
  body: string;
  time: string;
  decrypted: boolean;
  actionRequired?: boolean;
  actionCompleted?: boolean;
  actionLabel?: string;
  rewardAmount?: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

export interface GameState {
  isOnline: boolean; // Sync status with the simulated game server
  telemetry: Telemetry;
  empire: {
    cashDirty: number;
    cashClean: number;
    cryptoBalance: number;
    enterprises: Enterprise[];
  };
  contracts: Contract[];
  messages: NPCMessage[];
  chatHistory: ChatMessage[];
}

export interface RPServerInstance {
  id: string;
  name: string;
  economyMultiplier: number;
  policeAggressive: "Faible" | "Modérée" | "Impitoyable";
  activeFactions: string[];
  weather: string;
  maxPlayers: number;
  activeBotsCount: number;
  status: "ONLINE" | "DORMANT" | "MAINTENANCE";
  creationDate: string;
}

export interface BotCitizen {
  id: string;
  name: string;
  role: string;
  faction: string;
  cash: number;
  status: string;
}

// Agentique L.I.S.A. — actions qu'elle peut déclencher dans le jeu
export type LISAAction =
  | { type: "ADD_CONTRACT"; title: string; client: string; reward: string; difficulty: "Facile" | "Moyen" | "Difficile" | "Extrême"; description: string; risk: number; location: string }
  | { type: "UPGRADE_ENTERPRISE"; enterpriseId: string; fieldDescription: string }
  | { type: "SET_ALERT_LEVEL"; level: number }
  | { type: "TRANSFER_FUNDS"; amount: number }
  | { type: "SEND_INBOX"; sender: string; subject: string; body: string };

export interface LISAResponse {
  text: string;
  action?: LISAAction;
}

