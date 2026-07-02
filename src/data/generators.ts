import { Contract } from "../types";
import { VICE_CITY_ZONES } from "./mockData";

/** Recurring named contacts, reused across contracts, inbox messages and Sandbox bots for a consistent world. */
export const NPC_CONTACTS = ["Jason", "Lucia", "L.I.S.A.", "Don Sonny", "Detective Carter", "V_Shadow_Hack"] as const;

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

interface MissionTemplate {
  type: string;
  difficulty: Contract["difficulty"];
  rewardRange: [number, number];
  riskRange: [number, number];
  variants: (location: string, client: string) => string[];
}

const MISSION_TEMPLATES: MissionTemplate[] = [
  {
    type: "Casse",
    difficulty: "Moyen",
    rewardRange: [60000, 150000],
    riskRange: [30, 55],
    variants: (loc, client) => [
      `Infiltrer un entrepôt sécurisé à ${loc} et exfiltrer la cargaison avant l'arrivée du VCPD. Contact : ${client}.`,
      `${client} a repéré une faille dans la sécurité d'un dépôt à ${loc} — fenêtre d'action limitée à quelques minutes.`,
    ],
  },
  {
    type: "Hack",
    difficulty: "Difficile",
    rewardRange: [50000, 100000],
    riskRange: [50, 70],
    variants: (loc, client) => [
      `Pirater les serveurs de sécurité du secteur ${loc} pour effacer des preuves compromettantes. Demandé par ${client}.`,
      `${client} a besoin d'un accès root sur le réseau administratif de ${loc} — traçage VCPD actif.`,
    ],
  },
  {
    type: "Livraison",
    difficulty: "Facile",
    rewardRange: [20000, 50000],
    riskRange: [10, 25],
    variants: (loc, client) => [
      `Transporter une cargaison discrète jusqu'à ${loc} sans attirer l'attention. Client : ${client}.`,
      `${client} attend une livraison urgente à ${loc} — itinéraire libre, patrouilles réduites.`,
    ],
  },
  {
    type: "Extraction",
    difficulty: "Moyen",
    rewardRange: [70000, 130000],
    riskRange: [35, 60],
    variants: (loc, client) => [
      `Exfiltrer un allié coincé à ${loc} avant l'arrivée des renforts VCPD. Mission demandée par ${client}.`,
      `${client} a un contact en danger à ${loc} — extraction rapide requise, véhicule blindé recommandé.`,
    ],
  },
  {
    type: "Sabotage",
    difficulty: "Extrême",
    rewardRange: [90000, 180000],
    riskRange: [55, 80],
    variants: (loc, client) => [
      `Neutraliser les installations rivales à ${loc} sans laisser de trace. Commandité par ${client}.`,
      `${client} veut voir les opérations concurrentes de ${loc} paralysées avant la fin de semaine.`,
    ],
  },
  {
    type: "Surveillance",
    difficulty: "Facile",
    rewardRange: [30000, 70000],
    riskRange: [15, 40],
    variants: (loc, client) => [
      `Surveiller discrètement les mouvements d'une faction rivale autour de ${loc}. Rapport attendu par ${client}.`,
      `${client} veut des renseignements précis sur l'activité nocturne à ${loc}.`,
    ],
  },
];

export function generateContract(): Contract {
  const template = pick(MISSION_TEMPLATES);
  const location = pick(VICE_CITY_ZONES);
  const client = pick(NPC_CONTACTS);
  const description = pick(template.variants(location, client));
  const reward = randInt(...template.rewardRange);
  const risk = randInt(...template.riskRange);

  return {
    id: `contract_gen_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    title: `${template.type} — ${location}`,
    client,
    reward: `$${reward.toLocaleString()}`,
    difficulty: template.difficulty,
    description,
    risk,
    location,
  };
}

interface InboxTemplate {
  subject: string;
  body: (location: string) => string;
}

const INBOX_TEMPLATES: InboxTemplate[] = [
  {
    subject: "Patrouilles renforcées",
    body: (loc) => `On a repéré des patrouilles VCPD supplémentaires autour de ${loc}. Reste discret pendant quelques heures.`,
  },
  {
    subject: "Opportunité en approche",
    body: (loc) => `Un contact à ${loc} propose un deal intéressant. Je t'en dis plus si tu es chaud.`,
  },
  {
    subject: "Rumeur du milieu",
    body: (loc) => `On raconte qu'une faction rivale prépare quelque chose à ${loc}. À surveiller de près.`,
  },
  {
    subject: "Livraison confirmée",
    body: (loc) => `La cargaison est bien arrivée à ${loc}. Rien à signaler côté sécurité pour l'instant.`,
  },
  {
    subject: "Ambiance tendue",
    body: (loc) => `Le climat se réchauffe à ${loc} depuis hier soir. Prépare-toi à toute éventualité.`,
  },
  {
    subject: "Info réseau REVERB",
    body: (loc) => `Le flux crypto transitant par ${loc} a été ralenti par la brigade financière — rien de critique.`,
  },
];

export function generateInboxMessage(): { sender: string; senderAvatar: string; subject: string; body: string } {
  const sender = pick(NPC_CONTACTS);
  const location = pick(VICE_CITY_ZONES);
  const template = pick(INBOX_TEMPLATES);
  return {
    sender,
    senderAvatar: sender[0].toUpperCase(),
    subject: template.subject,
    body: template.body(location),
  };
}
