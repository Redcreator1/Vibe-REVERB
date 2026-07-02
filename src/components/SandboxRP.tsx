import { useState, FormEvent } from "react";
import { GameState, RPServerInstance, BotCitizen, Contract } from "../types";
import {
  Server, Shield, Coins, Users, CloudRain, Cpu, Terminal, Sliders,
  Plus, Play, Flame, TrendingUp, PlusCircle, CheckCircle, RefreshCw,
  UserPlus, X, HelpCircle, Activity, Globe
} from "lucide-react";
import { formatUSD } from "../utils/format";
import { useSoundSystem } from "../hooks/useSound";

interface SandboxRPProps {
  gameState: GameState;
  onUpdateEmpire: (updatedEmpire: GameState["empire"]) => void;
  onUpdateTelemetry: (updatedTelemetry: GameState["telemetry"]) => void;
  onAddContract: (contract: Contract) => void;
  onAddChatMessage: (msg: any) => void;
}

const PRESET_SERVERS: RPServerInstance[] = [
  {
    id: "srv_1",
    name: "Vice City Legends RP",
    economyMultiplier: 1.5,
    policeAggressive: "Modérée",
    activeFactions: ["Cartel Diaz", "Malibu Syndicate", "Cholos Street Gang"],
    weather: "Soleil Tropical",
    maxPlayers: 64,
    activeBotsCount: 18,
    status: "ONLINE",
    creationDate: "2026-06-25"
  },
  {
    id: "srv_2",
    name: "Leonida Sheriff's Nightmare",
    economyMultiplier: 1.0,
    policeAggressive: "Impitoyable",
    activeFactions: ["Sheriff County Patrol", "Redneck Outlaws"],
    weather: "Orage Violent",
    maxPlayers: 32,
    activeBotsCount: 12,
    status: "ONLINE",
    creationDate: "2026-06-27"
  },
  {
    id: "srv_3",
    name: "South Beach Cartel Wars",
    economyMultiplier: 2.2,
    policeAggressive: "Faible",
    activeFactions: ["Cosa Nostra Miami", "South Beach Cartel", "Hacker Syndicate"],
    weather: "Brouillard Néon Night",
    maxPlayers: 128,
    activeBotsCount: 35,
    status: "DORMANT",
    creationDate: "2026-06-28"
  }
];

const PRESET_BOTS: BotCitizen[] = [
  { id: "bot_1", name: "Jason_Leonida", role: "Braqueur Professionnel", faction: "Malibu Syndicate", cash: 125000, status: "En cavale" },
  { id: "bot_2", name: "Lucia_Vance", role: "Reine du Vol", faction: "Malibu Syndicate", cash: 189000, status: "Sur écoute" },
  { id: "bot_3", name: "Detective_Carter", role: "Indicateur Corrompu", faction: "Sheriff County Patrol", cash: 45000, status: "Sous couverture" },
  { id: "bot_4", name: "Don_Sonny", role: "Parrain de la pègre", faction: "Cosa Nostra Miami", cash: 1500000, status: "Intouchable" },
  { id: "bot_5", name: "V_Shadow_Hack", role: "Cerveau Cyber", faction: "Hacker Syndicate", cash: 320000, status: "Chiffré" }
];

export default function SandboxRP({
  gameState,
  onUpdateEmpire,
  onUpdateTelemetry,
  onAddContract,
  onAddChatMessage
}: SandboxRPProps) {
  // Active server instance
  const [activeServer, setActiveServer] = useState<RPServerInstance>(PRESET_SERVERS[0]);
  const [serverList, setServerList] = useState<RPServerInstance[]>(PRESET_SERVERS);
  const [bots, setBots] = useState<BotCitizen[]>(PRESET_BOTS);
  
  // Custom server form creation fields
  const [newSrvName, setNewSrvName] = useState("");
  const [newSrvEco, setNewSrvEco] = useState(1.5);
  const [newSrvPolice, setNewSrvPolice] = useState<"Faible" | "Modérée" | "Impitoyable">("Modérée");
  const [newSrvWeather, setNewSrvWeather] = useState("Soleil Tropical");
  const [selectedFactions, setSelectedFactions] = useState<string[]>(["Malibu Syndicate"]);

  // Bot creation fields
  const [botName, setBotName] = useState("");
  const [botRole, setBotRole] = useState("Chauffeur de Go-Fast");
  const [botFaction, setBotFaction] = useState("Malibu Syndicate");
  const [botCash, setBotCash] = useState(10000);

  // Live sandbox simulator logs
  const [sandboxLogs, setSandboxLogs] = useState<string[]>([
    "[SANDBOX] Serveur 'Vice City Legends RP' initialisé.",
    "[BOT] Jason_Leonida est connecté en tant que Chef de bande.",
    "[BOT] Detective_Carter patrouille sur Ocean Drive.",
    "[VCPD] Fréquences de patrouilles adaptées à l'agressivité 'Modérée'."
  ]);

  const [isCreatingServer, setIsCreatingServer] = useState(false);
  const [isAddingBot, setIsAddingBot] = useState(false);
  const [selectedBotId, setSelectedBotId] = useState<string>(PRESET_BOTS[0]?.id ?? "");
  const [botActionCooldown, setBotActionCooldown] = useState(false);
  const play = useSoundSystem();

  // Add message to sandbox terminal
  const logEvent = (text: string) => {
    setSandboxLogs(prev => [`[${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}] ${text}`, ...prev.slice(0, 15)]);
  };

  // Switch Active Server
  const handleSelectServer = (srv: RPServerInstance) => {
    setActiveServer(srv);
    logEvent(`Changement de serveur actif : Établissement de la liaison avec '${srv.name}'...`);
    logEvent(`Règles appliquées -> Économie: ${srv.economyMultiplier}x | VCPD: ${srv.policeAggressive} | Factions: ${srv.activeFactions.join(", ")}`);
    
    // Dynamically notify user in general chat
    onAddChatMessage({
      id: `sandbox_srv_${Date.now()}`,
      role: "assistant",
      content: `🌐 INSTANCE CONNECTÉE : Votre console REVERB est désormais synchronisée avec le serveur Sandbox [${srv.name}]. Les contrats générés bénéficieront d'un modificateur de gain de ${srv.economyMultiplier}x !`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  };

  // Submit custom server
  const handleCreateServer = (e: FormEvent) => {
    e.preventDefault();
    if (!newSrvName.trim()) return;

    const newSrv: RPServerInstance = {
      id: `srv_custom_${Date.now()}`,
      name: newSrvName,
      economyMultiplier: Number(newSrvEco),
      policeAggressive: newSrvPolice,
      activeFactions: selectedFactions.length > 0 ? selectedFactions : ["Gangs Locaux"],
      weather: newSrvWeather,
      maxPlayers: 100,
      activeBotsCount: 0,
      status: "ONLINE",
      creationDate: new Date().toISOString().split('T')[0]
    };

    setServerList(prev => [...prev, newSrv]);
    setActiveServer(newSrv);
    setIsCreatingServer(false);
    setNewSrvName("");
    
    logEvent(`NOUVEAU SERVEUR CONSTRUIT : '${newSrv.name}' est maintenant en ligne !`);
    logEvent(`Paramètres injectés : Économie = ${newSrv.economyMultiplier}x, Danger VCPD = ${newSrv.policeAggressive}`);
  };

  // Add custom bot player
  const handleAddBot = (e: FormEvent) => {
    e.preventDefault();
    if (!botName.trim()) return;

    const newBot: BotCitizen = {
      id: `bot_custom_${Date.now()}`,
      name: botName.replace(/\s+/g, "_"),
      role: botRole,
      faction: botFaction,
      cash: Number(botCash),
      status: "Actif"
    };

    setBots(prev => [...prev, newBot]);
    setIsAddingBot(false);
    setBotName("");

    logEvent(`BOT ENREGISTRÉ : @${newBot.name} a rejoint la session (${newBot.role}).`);
  };

  // Toggle faction check for server creation
  const handleToggleFaction = (faction: string) => {
    if (selectedFactions.includes(faction)) {
      setSelectedFactions(prev => prev.filter(f => f !== faction));
    } else {
      setSelectedFactions(prev => [...prev, faction]);
    }
  };

  // Simulate a random action by a random bot
  // Chaque action a une vraie conséquence sur l'empire/télémétrie — plus de flavor text creux.
  const handleTriggerBotAction = () => {
    if (bots.length === 0 || botActionCooldown) return;
    const actingBot = bots.find(b => b.id === selectedBotId) ?? bots[Math.floor(Math.random() * bots.length)];

    // Chaque action calcule son montant une seule fois et le réutilise pour le texte ET l'effet,
    // pour que le log affiché corresponde exactement à ce qui a été appliqué.
    const outcomes: (() => string)[] = [
      () => {
        const gain = Math.floor(Math.random() * 8000) + 1500;
        onUpdateEmpire({ ...gameState.empire, cashDirty: gameState.empire.cashDirty + gain });
        onUpdateTelemetry({ ...gameState.telemetry, searchLevel: Math.min(gameState.telemetry.searchLevel + 1, 5) });
        return `a mené une extraction rapide sur Little Havana et a récolté ${formatUSD(gain)} de ressources brutes.`;
      },
      () => {
        onUpdateTelemetry({ ...gameState.telemetry, searchLevel: Math.min(gameState.telemetry.searchLevel + 1, 5) });
        return `a été repéré par un hélicoptère de patrouille dans le secteur nord — niveau d'alerte en hausse.`;
      },
      () => {
        const gain = +(Math.random() * 2.5 + 0.5).toFixed(2);
        onUpdateEmpire({ ...gameState.empire, cryptoBalance: +(gameState.empire.cryptoBalance + gain).toFixed(2) });
        return `a transféré ${gain} R_COIN à un contact anonyme sur le réseau cryptographique.`;
      },
      () => {
        const ents = gameState.empire.enterprises;
        if (ents.length === 0) return `n'a trouvé aucun établissement à cibler cette fois.`;
        const target = ents[Math.floor(Math.random() * ents.length)];
        onUpdateEmpire({
          ...gameState.empire,
          enterprises: ents.map(e => e.id === target.id ? { ...e, securityLevel: Math.max(e.securityLevel - 1, 1) } : e),
        });
        return `a déclenché une alarme de sécurité dans ${target.name} — sécurité dégradée d'un niveau.`;
      },
      () => {
        const fee = Math.floor(Math.random() * 4000) + 500;
        if (gameState.empire.cashDirty < fee) return `a proposé une conversion, mais vos ressources brutes sont insuffisantes.`;
        onUpdateEmpire({ ...gameState.empire, cashDirty: gameState.empire.cashDirty - fee, cashClean: gameState.empire.cashClean + Math.round(fee * 0.85) });
        return `a converti ${formatUSD(fee)} de ressources brutes en échange d'une commission de 15%.`;
      },
      () => {
        const fine = Math.floor(Math.random() * 6000) + 2000;
        onUpdateEmpire({ ...gameState.empire, cashClean: Math.max(gameState.empire.cashClean - fine, 0) });
        onUpdateTelemetry({ ...gameState.telemetry, searchLevel: Math.min(gameState.telemetry.searchLevel + 2, 5) });
        return `a provoqué un accident spectaculaire avec le FBI — caution d'urgence de ${formatUSD(fine)} payée.`;
      },
    ];

    const resultText = outcomes[Math.floor(Math.random() * outcomes.length)]();
    logEvent(`[BOT] @${actingBot.name} ${resultText}`);
    play("click");

    setBotActionCooldown(true);
    setTimeout(() => setBotActionCooldown(false), 4000);
  };

  // Core Simulation Event Injectors
  const handleInjectRaid = () => {
    logEvent("⚠️ INJECTION D'ÉVÉNEMENT : [POLICE RAID] Lancement d'une offensive d'envergure du VCPD !");
    onUpdateTelemetry({
      ...gameState.telemetry,
      searchLevel: 5
    });

    onAddChatMessage({
      id: `sandbox_raid_${Date.now()}`,
      role: "assistant",
      content: `🚨 ALERTE SANDBOX : L'événement [POLICE RAID] a été injecté de force. Le SWAT quadrille toutes les sorties de Vice City ! Utilisez la console pour réduire l'agressivité ou fuyez la zone.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  };

  const handleInjectFactionWar = () => {
    logEvent("⚔️ INJECTION D'ÉVÉNEMENT : [WAR ZONE] Déclaration de guerre entre les factions du serveur !");
    
    // Create an extreme premium contract for this war!
    const rewardAmt = Math.floor(250000 * activeServer.economyMultiplier);
    const warContract: Contract = {
      title: `💥 Carnage à Starfish Island (${activeServer.name})`,
      client: "Syndicat REVERB Sandbox",
      reward: `$${rewardAmt.toLocaleString()}`,
      difficulty: "Extrême",
      description: "Profitez du chaos de la guerre des gangs pour piller le convoi d'armes blindé bloqué au rond-point principal de l'île.",
      risk: 85,
      location: "Starfish Island Bypass"
    };

    onAddContract(warContract);

    onAddChatMessage({
      id: `sandbox_war_${Date.now()}`,
      role: "assistant",
      content: `⚔️ CONTRE-MESURE SANDBOX : Une opportunité d'infiltration a été générée suite à la Guerre de Factions sur '${activeServer.name}'. Gain potentiel calculé avec modificateur : **${warContract.reward}** !`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  };

  const handleInjectAirdrop = () => {
    logEvent("📦 INJECTION D'ÉVÉNEMENT : [AIRDROP SECRÈTE] Un largage militaire non identifié s'est écrasé !");
    
    const rewardAmt = Math.floor(120000 * activeServer.economyMultiplier);
    const dropContract: Contract = {
      title: `📦 Récupération Airdrop: Cargo ${Math.floor(Math.random() * 900) + 100}`,
      client: "Cargo Tracker Alpha",
      reward: `$${rewardAmt.toLocaleString()}`,
      difficulty: "Moyen",
      description: "Localisez la balise GPS Reverb et récupérez la valise de lingots d'or parachutée par erreur sur les marécages.",
      risk: 40,
      location: "Leonida Swamps"
    };

    onAddContract(dropContract);
  };

  const handleInjectLaundering = () => {
    const { cashDirty, cashClean } = gameState.empire;
    if (cashDirty <= 0) {
      logEvent("❌ INJECTION ÉCHOUÉE : Aucune ressource brute disponible à convertir.");
      return;
    }

    const amountToLaunder = Math.min(cashDirty, 50000);
    const taxRate = Math.max(0.05, 0.25 - (activeServer.economyMultiplier * 0.05));
    const launderedClean = Math.floor(amountToLaunder * (1 - taxRate));

    onUpdateEmpire({
      ...gameState.empire,
      cashDirty: cashDirty - amountToLaunder,
      cashClean: cashClean + launderedClean
    });

    logEvent(`💸 CONVERSION AUTO : $${amountToLaunder.toLocaleString()} bruts convertis en $${launderedClean.toLocaleString()} raffinés.`);
    logEvent(`Commission prélevée par la faction locale : ${(taxRate * 100).toFixed(0)}%`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="sandbox-rp-root">
      
      {/* Left Column: Server Instances Configurator & Active Rules */}
      <div className="lg:col-span-1 space-y-6">
        
        {/* Active server identity info card */}
        <div className="bg-reverb-card border border-reverb-cyan/15 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-900 pb-3">
            <h3 className="font-display font-bold text-white text-sm flex items-center gap-2">
              <Globe className="w-4.5 h-4.5 text-reverb-cyan" /> SERVEUR ACTIF
            </h3>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-2 py-0.5 rounded font-mono font-bold animate-pulse">
              {activeServer.status}
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-[10px] text-gray-500 font-mono block">NOM DE L'INSTANCE RP</span>
              <span className="text-white font-display font-extrabold text-base tracking-wide">
                {activeServer.name}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-reverb-dark p-2.5 rounded border border-gray-800 font-mono">
                <span className="text-gray-500 text-[9px] block">ÉCONOMIE</span>
                <span className="text-emerald-400 font-bold text-xs flex items-center gap-1 mt-0.5">
                  <Coins className="w-3.5 h-3.5 text-emerald-400" /> {activeServer.economyMultiplier}x
                </span>
              </div>
              
              <div className="bg-reverb-dark p-2.5 rounded border border-gray-800 font-mono">
                <span className="text-gray-500 text-[9px] block">FLUX POLICE</span>
                <span className={`font-bold text-xs flex items-center gap-1 mt-0.5 ${
                  activeServer.policeAggressive === "Impitoyable" ? "text-reverb-pink" : 
                  activeServer.policeAggressive === "Modérée" ? "text-amber-400" : "text-emerald-400"
                }`}>
                  <Shield className="w-3.5 h-3.5" /> {activeServer.policeAggressive}
                </span>
              </div>
            </div>

            <div className="pt-1">
              <span className="text-[10px] text-gray-500 font-mono block">MÉTÉO APPLIQUÉE</span>
              <span className="text-gray-300 font-semibold text-xs flex items-center gap-1 mt-1">
                <CloudRain className="w-3.5 h-3.5 text-reverb-cyan" /> {activeServer.weather}
              </span>
            </div>

            <div className="pt-1">
              <span className="text-[10px] text-gray-500 font-mono block">FACTIONS MAJEURES</span>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {activeServer.activeFactions.map(fac => (
                  <span key={fac} className="bg-reverb-cyan/5 border border-reverb-cyan/15 text-reverb-cyan text-[10px] px-2 py-0.5 rounded font-mono">
                    {fac}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Server Switcher / Creator */}
        <div className="bg-reverb-card border border-gray-800 rounded-lg p-5">
          <div className="flex items-center justify-between border-b border-gray-900 pb-3 mb-4">
            <h3 className="font-display font-semibold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Server className="w-4 h-4 text-reverb-pink" /> Mes Serveurs Sandbox
            </h3>
            <button
              onClick={() => setIsCreatingServer(!isCreatingServer)}
              className="text-reverb-pink hover:text-white transition flex items-center gap-0.5 font-mono text-[10px] bg-reverb-pink/10 border border-reverb-pink/20 px-2 py-1 rounded"
            >
              {isCreatingServer ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />} CREER
            </button>
          </div>

          {!isCreatingServer ? (
            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {serverList.map((srv) => (
                <button
                  key={srv.id}
                  onClick={() => handleSelectServer(srv)}
                  className={`w-full text-left p-3 rounded border font-mono transition flex items-center justify-between ${
                    srv.id === activeServer.id
                      ? "bg-reverb-cyan/5 border-reverb-cyan/35 shadow-glow-cyan/20"
                      : "bg-reverb-dark/40 border-gray-800 hover:border-gray-700 hover:bg-reverb-dark/80"
                  }`}
                >
                  <div>
                    <span className={`text-[11px] font-bold block ${
                      srv.id === activeServer.id ? "text-reverb-cyan" : "text-white"
                    }`}>
                      {srv.name}
                    </span>
                    <span className="text-[9px] text-gray-500">
                      Eco: {srv.economyMultiplier}x | VCPD: {srv.policeAggressive}
                    </span>
                  </div>
                  {srv.id === activeServer.id && (
                    <span className="text-[9px] bg-reverb-cyan/15 text-reverb-cyan px-1.5 py-0.5 rounded font-bold">
                      ACTIF
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <form onSubmit={handleCreateServer} className="space-y-4 font-mono text-xs">
              <div className="space-y-1">
                <label className="text-gray-400 block text-[10px]">Nom du Serveur</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Miami High Stakes"
                  value={newSrvName}
                  onChange={(e) => setNewSrvName(e.target.value)}
                  className="w-full bg-reverb-dark border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-reverb-pink text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-gray-400 block text-[10px]">Multiplicateur Gain</label>
                  <select
                    value={newSrvEco}
                    onChange={(e) => setNewSrvEco(Number(e.target.value))}
                    className="w-full bg-reverb-dark border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-reverb-pink text-xs"
                  >
                    <option value="0.8">0.8x (Hardcore)</option>
                    <option value="1.2">1.2x (Standard)</option>
                    <option value="1.8">1.8x (Avantageux)</option>
                    <option value="2.5">2.5x (Folie Cash)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-gray-400 block text-[10px]">Agressivité Police</label>
                  <select
                    value={newSrvPolice}
                    onChange={(e) => setNewSrvPolice(e.target.value as any)}
                    className="w-full bg-reverb-dark border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-reverb-pink text-xs"
                  >
                    <option value="Faible">Faible (Discret)</option>
                    <option value="Modérée">Modérée</option>
                    <option value="Impitoyable">Impitoyable (SWAT)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 block text-[10px]">Ambiance & Météo</label>
                <select
                  value={newSrvWeather}
                  onChange={(e) => setNewSrvWeather(e.target.value)}
                  className="w-full bg-reverb-dark border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-reverb-pink text-xs"
                >
                  <option value="Soleil Tropical">Soleil Tropical</option>
                  <option value="Orage Violent">Orage Violent</option>
                  <option value="Brouillard Néon Night">Brouillard Néon Night</option>
                  <option value="Coucher de soleil Pourpre">Coucher de soleil Pourpre</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 block text-[10px]">Sélectionner Factions</label>
                <div className="grid grid-cols-2 gap-2 mt-1 bg-reverb-dark p-2 rounded border border-gray-850">
                  {["Cosa Nostra Miami", "Malibu Syndicate", "Hacker Syndicate", "Cartel Diaz", "Bikers V-Twin"].map(fac => {
                    const checked = selectedFactions.includes(fac);
                    return (
                      <button
                        type="button"
                        key={fac}
                        onClick={() => handleToggleFaction(fac)}
                        className={`text-left p-1.5 rounded text-[10px] transition ${
                          checked ? "bg-reverb-pink/15 text-reverb-pink border border-reverb-pink/35" : "text-gray-400 hover:bg-gray-800 border border-transparent"
                        }`}
                      >
                        {checked ? "✓ " : "+ "} {fac}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-grow py-2 bg-reverb-pink hover:bg-reverb-pink/85 text-white font-display font-bold rounded transition uppercase tracking-wider text-xs"
                >
                  CONSTRUIRE ET LANCER
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreatingServer(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-750 text-white rounded text-xs transition"
                >
                  ANNULER
                </button>
              </div>
            </form>
          )}
        </div>

      </div>

      {/* Middle Column: Event Injector Terminal & Live Simulation Logs */}
      <div className="lg:col-span-1 flex flex-col justify-between space-y-6">
        
        {/* Event Injector Card */}
        <div className="bg-reverb-card border border-reverb-pink/15 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-gray-900 pb-3">
            <h3 className="font-display font-bold text-white text-sm flex items-center gap-2">
              <Flame className="w-4.5 h-4.5 text-reverb-pink" /> INJECTEUR D'ÉVÉNEMENTS
            </h3>
            <span className="text-[10px] font-mono text-gray-500">REVERB SIMULATOR</span>
          </div>

          <p className="text-gray-400 text-[11px] leading-relaxed font-mono">
            Injectez des situations d'urgence ou des opportunités économiques majeures directement sur votre serveur de jeu actif.
          </p>

          <div className="grid grid-cols-2 gap-3 pt-2">
            
            <button
              onClick={handleInjectRaid}
              className="p-3 bg-reverb-dark hover:bg-red-950/20 border border-gray-850 hover:border-reverb-pink/40 rounded text-left transition flex flex-col justify-between h-24 font-mono group"
            >
              <div className="flex justify-between items-start w-full">
                <Shield className="w-5 h-5 text-reverb-pink group-hover:scale-110 transition duration-350" />
                <span className="text-[8px] bg-reverb-pink/15 text-reverb-pink px-1 rounded">VCPD</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-white block">POLICE RAID</span>
                <span className="text-[9px] text-gray-500">Recherche Max</span>
              </div>
            </button>

            <button
              onClick={handleInjectFactionWar}
              className="p-3 bg-reverb-dark hover:bg-reverb-cyan/5 border border-gray-850 hover:border-reverb-cyan/30 rounded text-left transition flex flex-col justify-between h-24 font-mono group"
            >
              <div className="flex justify-between items-start w-full">
                <Activity className="w-5 h-5 text-reverb-cyan group-hover:scale-110 transition duration-350" />
                <span className="text-[8px] bg-reverb-cyan/15 text-reverb-cyan px-1 rounded">GUERRE</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-white block">WAR ZONE</span>
                <span className="text-[9px] text-gray-500">+1 Contrat Extrême</span>
              </div>
            </button>

            <button
              onClick={handleInjectAirdrop}
              className="p-3 bg-reverb-dark hover:bg-reverb-cyan/5 border border-gray-850 hover:border-reverb-cyan/30 rounded text-left transition flex flex-col justify-between h-24 font-mono group"
            >
              <div className="flex justify-between items-start w-full">
                <CloudRain className="w-5 h-5 text-reverb-cyan group-hover:scale-110 transition duration-350" />
                <span className="text-[8px] bg-emerald-500/15 text-emerald-400 px-1 rounded">CARGO</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-white block">AIRDROP SUPPLY</span>
                <span className="text-[9px] text-gray-500">Butin Spécial</span>
              </div>
            </button>

            <button
              onClick={handleInjectLaundering}
              className="p-3 bg-reverb-dark hover:bg-emerald-950/20 border border-gray-850 hover:border-emerald-500/30 rounded text-left transition flex flex-col justify-between h-24 font-mono group"
            >
              <div className="flex justify-between items-start w-full">
                <Coins className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition duration-350" />
                <span className="text-[8px] bg-emerald-500/15 text-emerald-400 px-1 rounded">CASH</span>
              </div>
              <div>
                <span className="text-[11px] font-bold text-white block">CONVERSION FLASH</span>
                <span className="text-[9px] text-gray-500">Convertit $50,000 bruts</span>
              </div>
            </button>

          </div>
        </div>

        {/* Live Terminal Output Console */}
        <div className="bg-reverb-card border border-gray-800 rounded-lg p-5 flex-grow flex flex-col justify-between min-h-[220px]">
          <div className="flex justify-between items-center border-b border-gray-900 pb-2.5 gap-2 flex-wrap">
            <h3 className="font-display font-semibold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-reverb-cyan" /> Sandbox Live Console
            </h3>
            <div className="flex items-center gap-1.5">
              <select
                value={selectedBotId}
                onChange={(e) => setSelectedBotId(e.target.value)}
                className="bg-reverb-dark border border-gray-800 rounded text-[10px] font-mono text-gray-300 px-1.5 py-1 outline-none focus:border-reverb-cyan/50 max-w-[110px]"
                title="Choisir le bot à activer"
              >
                {bots.map(b => (
                  <option key={b.id} value={b.id}>@{b.name}</option>
                ))}
              </select>
              <button
                onClick={handleTriggerBotAction}
                disabled={botActionCooldown || bots.length === 0}
                className="bg-reverb-cyan/10 border border-reverb-cyan/35 text-reverb-cyan hover:bg-reverb-cyan hover:text-black transition px-2.5 py-1 rounded text-[10px] font-mono flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-reverb-cyan/10 disabled:hover:text-reverb-cyan"
              >
                <RefreshCw className={`w-3 h-3 ${botActionCooldown ? "animate-spin" : ""}`} />
                {botActionCooldown ? "..." : "AGIR BOT"}
              </button>
            </div>
          </div>

          {/* Console Output */}
          <div className="flex-grow my-3 bg-black/95 p-3 rounded border border-gray-900 overflow-y-auto h-36 font-mono text-[10px] leading-relaxed space-y-2 scrollbar-thin">
            {sandboxLogs.map((log, index) => (
              <div 
                key={index} 
                className={`transition-colors duration-300 ${
                  log.includes("⚠️") || log.includes("POLICE") ? "text-reverb-pink" :
                  log.includes("⚔️") || log.includes("BOT") ? "text-reverb-cyan" :
                  log.includes("💸") ? "text-emerald-400" : "text-gray-400"
                }`}
              >
                {log}
              </div>
            ))}
          </div>

          <div className="text-[9px] text-gray-500 font-mono text-center">
            TERMINAL SÉCURISÉ REVERB V2 // SYNC STATUS: CONNECTED
          </div>
        </div>

      </div>

      {/* Right Column: Bot Citizens & Customizable Players */}
      <div className="lg:col-span-1 space-y-6">
        
        {/* Bots List */}
        <div className="bg-reverb-card border border-gray-800 rounded-lg p-5">
          <div className="flex items-center justify-between border-b border-gray-900 pb-3 mb-4">
            <h3 className="font-display font-semibold text-white text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4.5 h-4.5 text-reverb-cyan" /> Citoyens & Bots RP ({bots.length})
            </h3>
            <button
              onClick={() => setIsAddingBot(!isAddingBot)}
              className="text-reverb-cyan hover:text-white transition flex items-center gap-0.5 font-mono text-[10px] bg-reverb-cyan/10 border border-reverb-cyan/20 px-2 py-1 rounded"
            >
              {isAddingBot ? <X className="w-3 h-3" /> : <UserPlus className="w-3.5 h-3.5" />} AJOUTER
            </button>
          </div>

          {!isAddingBot ? (
            <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
              {bots.map((bot) => (
                <div
                  key={bot.id}
                  className="p-3 bg-reverb-dark/60 border border-gray-850 hover:border-gray-800 rounded font-mono text-[11px] flex justify-between items-center"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-reverb-cyan animate-pulse"></span>
                      <span className="font-bold text-white text-xs">@{bot.name}</span>
                    </div>
                    <div className="text-gray-400 text-[10px]">
                      {bot.role} • <span className="text-reverb-pink/80">{bot.faction}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="block font-bold text-emerald-400">${bot.cash.toLocaleString()}</span>
                    <span className="text-[9px] text-gray-500 font-normal block">{bot.status}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <form onSubmit={handleAddBot} className="space-y-4 font-mono text-xs">
              <div className="space-y-1">
                <label className="text-gray-400 block text-[10px]">Pseudo du Citoyen</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Tommy_Vance"
                  value={botName}
                  onChange={(e) => setBotName(e.target.value)}
                  className="w-full bg-reverb-dark border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-reverb-cyan text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 block text-[10px]">Rôle RP du Bot</label>
                <select
                  value={botRole}
                  onChange={(e) => setBotRole(e.target.value)}
                  className="w-full bg-reverb-dark border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-reverb-cyan text-xs"
                >
                  <option value="Chauffeur de Go-Fast">Chauffeur de Go-Fast</option>
                  <option value="Pirate Informatique">Pirate Informatique</option>
                  <option value="Detective VCPD">Detective VCPD</option>
                  <option value="Gros Bonnet de la pègre">Gros Bonnet de la pègre</option>
                  <option value="Livreur de Cargo">Livreur de Cargo</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 block text-[10px]">Faction du Bot</label>
                <select
                  value={botFaction}
                  onChange={(e) => setBotFaction(e.target.value)}
                  className="w-full bg-reverb-dark border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-reverb-cyan text-xs"
                >
                  <option value="Malibu Syndicate">Malibu Syndicate</option>
                  <option value="Cosa Nostra Miami">Cosa Nostra Miami</option>
                  <option value="Hacker Syndicate">Hacker Syndicate</option>
                  <option value="Sheriff County Patrol">Sheriff County Patrol</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-gray-400 block text-[10px]">Solde Bancaire de Départ</label>
                <input
                  type="number"
                  value={botCash}
                  onChange={(e) => setBotCash(Number(e.target.value))}
                  className="w-full bg-reverb-dark border border-gray-800 rounded px-3 py-2 text-white focus:outline-none focus:border-reverb-cyan text-xs"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-grow py-2 bg-reverb-cyan hover:bg-reverb-cyan/85 text-black font-display font-bold rounded transition uppercase tracking-wider text-xs"
                >
                  CRÉER CITOYEN
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingBot(false)}
                  className="px-4 py-2 bg-gray-800 hover:bg-gray-750 text-white rounded text-xs transition"
                >
                  ANNULER
                </button>
              </div>
            </form>
          )}
        </div>

      </div>

    </div>
  );
}
