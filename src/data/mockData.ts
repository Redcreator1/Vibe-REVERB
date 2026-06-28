import { GameState, Contract, NPCMessage } from "../types";

export const VICE_CITY_ZONES = [
  "Vice Beach",
  "Downtown Vice",
  "Port Gellhorn",
  "Leonida Keys",
  "Little Haiti",
  "Starfish Island",
  "Ocean Drive",
  "Winding Canyons",
  "Kelley County"
];

export const VEHICLE_TEMPLATES = [
  { name: "Cheetah V8", rpmMax: 8200, gearMax: 6 },
  { name: "Pegassi Vacca", rpmMax: 8800, gearMax: 7 },
  { name: "Grotti Carbonizzare", rpmMax: 8000, gearMax: 6 },
  { name: "Vapid Dominator", rpmMax: 6500, gearMax: 5 },
  { name: "Maibatsu Sanchez", rpmMax: 7500, gearMax: 5 },
  { name: "Imponte Ruiner", rpmMax: 6000, gearMax: 5 }
];

export const RADIO_STATIONS = [
  "Wave 103 (New Wave)",
  "V-Rock (Metal & Classic Rock)",
  "Flash FM (Pop Hits)",
  "Fever 105 (Funk & Soul)",
  "Radio Espantoso (Latin Jazz)",
  "Vice City Public Radio (VCPR)"
];

export const INITIAL_CONTRACTS: Contract[] = [
  {
    title: "Le Casse de Port Gellhorn",
    client: "Jason",
    reward: "$120,000",
    difficulty: "Moyen",
    description: "Infiltrer l'entrepôt principal de cargaison à Port Gellhorn et exfiltrer deux caisses d'équipements tactiques.",
    risk: 35,
    location: "Port Gellhorn"
  },
  {
    title: "Hack de la VCPD",
    client: "L.I.S.A.",
    reward: "$85,000",
    difficulty: "Difficile",
    description: "Pirater les serveurs de répartition de la police de Vice City (VCPD) pour effacer les casiers judiciaires actifs.",
    risk: 65,
    location: "Downtown Vice"
  },
  {
    title: "Livraison Rapide",
    client: "Lucia",
    reward: "$45,000",
    difficulty: "Facile",
    description: "Transporter la marchandise de contrebande depuis le port jusqu'à la planque de Starfish Island sans attirer l'attention.",
    risk: 15,
    location: "Starfish Island"
  }
];

export const INITIAL_MESSAGES: NPCMessage[] = [
  {
    id: "msg_1",
    sender: "Lucia",
    senderAvatar: "L",
    subject: "Planque de Vice Beach sous surveillance ?",
    body: "Salut, j'ai vu deux bagnoles banalisées rôder près de notre entrepôt de Vice Beach ce matin. On devrait temporairement geler le blanchiment là-bas ou booster la sécurité. L.I.S.A. peut recalculer le niveau de risque pour nous ?",
    time: "Il y a 10 min",
    decrypted: true,
    actionRequired: true,
    actionLabel: "Booster la sécurité ($15,000)",
    rewardAmount: "Sécurité +2"
  },
  {
    id: "msg_2",
    sender: "Jason",
    senderAvatar: "J",
    subject: "CONTRAT REQUIS : Flics corrompus",
    body: "On a un contact au port qui est d'accord pour fermer les yeux sur la prochaine cargaison, mais il demande un paiement de 5,000 $ en crypto-monnaie REVERB. Envoie les fonds par la console sécurisée dès que tu peux.",
    time: "Il y a 1 heure",
    decrypted: true,
    actionRequired: true,
    actionLabel: "Débloquer le contact (-$5,000 Crypto)",
    rewardAmount: "Débloque la mission Port Gellhorn"
  },
  {
    id: "msg_3",
    sender: "V_SHADOW_HACK",
    senderAvatar: "X",
    subject: "FICHIER CHIFFRÉ : Télémétrie Militaire",
    body: "U0VDUkVUIE1JTElUQVJZIFNUQVRJT04gQVQgTEVPTklEQSBLRVlTIDogUkFEQVIgRlJFUVVFTkNZIDkxNS41IE1IWi4gRVhGSUxUUkFUSU9OIFBMQU5ORUQgRlJPTSBPQ0VBTiBEUklWRS4=",
    time: "Il y a 4 heures",
    decrypted: false,
    actionRequired: false,
    actionLabel: "Décrypter avec L.I.S.A.",
    rewardAmount: "Données secrètes"
  }
];

export const INITIAL_STATE: GameState = {
  isOnline: true,
  telemetry: {
    latitude: 450,
    longitude: 350,
    speed: 124,
    vehicle: "Cheetah V8",
    gear: 4,
    rpm: 6200,
    searchLevel: 2,
    zone: "Vice Beach",
    health: 100,
    armor: 80,
    ammo: 154,
    activeRadio: "Wave 103 (New Wave)"
  },
  empire: {
    cashDirty: 245000,
    cashClean: 1420500,
    cryptoBalance: 12.45,
    enterprises: [
      {
        id: "ent_1",
        name: "Malibu Club",
        type: "club",
        location: "Ocean Drive",
        incomePerMin: 120,
        securityLevel: 3,
        dirtyStock: 45,
        cleanCashPending: 18000,
        status: "active"
      },
      {
        id: "ent_2",
        name: "Labo Verte Feuille",
        type: "lab",
        location: "Kelley County",
        incomePerMin: 85,
        securityLevel: 2,
        dirtyStock: 80,
        cleanCashPending: 35000,
        status: "active"
      },
      {
        id: "ent_3",
        name: "Contrebande Portuaire",
        type: "cargo",
        location: "Port Gellhorn",
        incomePerMin: 150,
        securityLevel: 4,
        dirtyStock: 20,
        cleanCashPending: 12000,
        status: "active"
      },
      {
        id: "ent_4",
        name: "Serveurs Chiffrés",
        type: "server",
        location: "Downtown Vice",
        incomePerMin: 95,
        securityLevel: 5,
        dirtyStock: 10,
        cleanCashPending: 8000,
        status: "active"
      }
    ]
  },
  contracts: INITIAL_CONTRACTS,
  messages: INITIAL_MESSAGES,
  chatHistory: [
    {
      id: "ch_init",
      role: "assistant",
      content: "Système REVERB v2.0.0 initialisé. Réseau sécurisé établi. Bonjour Chef. Tous les serveurs de blanchiment et d'écoute télémétrique sont synchronisés. Que souhaitez-vous analyser ?",
      timestamp: "01:36"
    }
  ]
};
