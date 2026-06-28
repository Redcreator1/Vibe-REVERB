import { useState } from "react";
import { GameState, Telemetry, ChatMessage, Contract, NPCMessage } from "./types";
import { INITIAL_STATE } from "./data/mockData";
import { usePersistedState } from "./hooks/usePersistedState";
import LiveTelemetry from "./components/LiveTelemetry";
import OfflineBroker from "./components/OfflineBroker";
import SecureAI from "./components/SecureAI";
import SecureInbox from "./components/SecureInbox";
import SandboxRP from "./components/SandboxRP";
import { motion, AnimatePresence } from "motion/react";
import {
  Compass,
  DollarSign,
  TrendingUp,
  Mail,
  Cpu,
  Tv,
  Users,
  AlertOctagon,
  Award,
  Radio,
  Clock,
  ExternalLink,
  Flame,
  Check,
  AlertCircle,
  Server
} from "lucide-react";

/** Fields of GameState that are persisted to localStorage */
type PersistedGameState = Pick<GameState, "isOnline" | "telemetry" | "empire" | "contracts">;

const PERSIST_KEY = "vibe-reverb-gamestate";

const initialPersisted: PersistedGameState = {
  isOnline: INITIAL_STATE.isOnline,
  telemetry: INITIAL_STATE.telemetry,
  empire: INITIAL_STATE.empire,
  contracts: INITIAL_STATE.contracts,
};

export default function App() {
  const [persisted, setPersisted] = usePersistedState<PersistedGameState>(PERSIST_KEY, initialPersisted);

  // Non-persisted runtime state (chat + inbox messages)
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(INITIAL_STATE.chatHistory);
  const [messages, setMessages] = useState(INITIAL_STATE.messages);

  // Unified read-only view for components that expect GameState
  const state: GameState = { ...persisted, chatHistory, messages };

  // Proxy setState to split persisted vs non-persisted fields
  const setState = (updater: GameState | ((prev: GameState) => GameState)) => {
    const next = typeof updater === "function" ? updater(state) : updater;
    setPersisted({
      isOnline: next.isOnline,
      telemetry: next.telemetry,
      empire: next.empire,
      contracts: next.contracts,
    });
    setChatHistory(next.chatHistory);
    setMessages(next.messages);
  };

  const [activeTab, setActiveTab] = useState<"telemetry" | "empire" | "lisa" | "inbox" | "sandbox">("sandbox");
  
  // Simulation heist status
  const [activeMission, setActiveMission] = useState<Contract | null>(null);
  const [missionProgress, setMissionProgress] = useState<number>(0);
  const [missionStatus, setMissionStatus] = useState<"idle" | "running" | "success" | "arrested">("idle");
  const [missionLog, setMissionLog] = useState<string>("");

  // Helpers to update state
  const updateTelemetry = (updated: Telemetry) => {
    setState(prev => ({
      ...prev,
      telemetry: updated
    }));
  };

  const toggleSync = () => {
    setState(prev => ({
      ...prev,
      isOnline: !prev.isOnline
    }));
  };

  const updateEmpire = (updatedEmpire: GameState["empire"]) => {
    setState(prev => ({
      ...prev,
      empire: updatedEmpire
    }));
  };

  const addChatMessage = (msg: ChatMessage) => {
    setState(prev => ({
      ...prev,
      chatHistory: [...prev.chatHistory, msg]
    }));
  };

  const addContract = (contract: Contract) => {
    setState(prev => ({
      ...prev,
      contracts: [contract, ...prev.contracts]
    }));
  };

  const updateMessages = (updatedMessages: NPCMessage[]) => {
    setState(prev => ({
      ...prev,
      messages: updatedMessages
    }));
  };

  // Insert manual notification in inbox
  const addInboxMessage = (
    sender: string,
    senderAvatar: string,
    subject: string,
    body: string,
    isActionable: boolean = false
  ) => {
    const newMsg: NPCMessage = {
      id: `msg_dyn_${Date.now()}`,
      sender,
      senderAvatar,
      subject,
      body,
      time: "À l'instant",
      decrypted: true,
      actionRequired: isActionable,
      actionLabel: "Réparer les dégâts ($25,000)",
      rewardAmount: "Sécurité boostée"
    };

    setState(prev => ({
      ...prev,
      messages: [newMsg, ...prev.messages]
    }));
  };

  // Simulated contract job runner
  const executeJobSimulation = (job: Contract) => {
    if (missionStatus === "running") return;
    setActiveMission(job);
    setMissionStatus("running");
    setMissionProgress(0);
    setMissionLog(`[REVERB CORE] Planification de la mission: "${job.title}"...`);

    // Dynamic progression logs
    setTimeout(() => {
      setMissionLog(`[REVERB CORE] Infiltration de Lucia & Jason dans la zone ${job.location}...`);
      setMissionProgress(30);
    }, 1200);

    setTimeout(() => {
      setMissionLog(`[VCPD INTERCEPT] Rapport d'infraction reçu à ${job.location} ! Patrouilles en route.`);
      setMissionProgress(60);
      // Spike search level temporarily during heist!
      setState(prev => ({
        ...prev,
        telemetry: { ...prev.telemetry, searchLevel: Math.min(prev.telemetry.searchLevel + 1, 5) }
      }));
    }, 2500);

    setTimeout(() => {
      // Risk check calculation
      const successChance = 100 - job.risk;
      const roll = Math.random() * 100;

      if (roll <= successChance) {
        // Success!
        const parsedReward = parseInt(job.reward.replace(/[^0-9]/g, ""));
        
        setState(prev => ({
          ...prev,
          empire: {
            ...prev.empire,
            cashDirty: prev.empire.cashDirty + parsedReward
          },
          telemetry: {
            ...prev.telemetry,
            ammo: Math.max(prev.telemetry.ammo - 35, 12),
            speed: 180
          }
        }));

        setMissionStatus("success");
        setMissionProgress(100);
        setMissionLog(`[SUCCÈS] Braquage terminé ! +${job.reward} sales ajoutés à votre coffre-fort.`);
        
        // Add random cool message to broker logs
        addChatMessage({
          id: `lisa_job_${Date.now()}`,
          role: "assistant",
          content: `⚡ RAPPORT TACTIQUE : Félicitations Chef ! Le coup "${job.title}" à ${job.location} s'est terminé sans anicroche. Les fonds de ${job.reward} sales ont été téléversés. Préparez le blanchiment dans le Malibu Club pour dissimuler la trace.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      } else {
        // Arrested / Busted! Fines clean cash and sets alert to max!
        setState(prev => ({
          ...prev,
          empire: {
            ...prev.empire,
            cashClean: Math.max(prev.empire.cashClean - 50000, 0)
          },
          telemetry: {
            ...prev.telemetry,
            searchLevel: 5,
            health: 25,
            armor: 0
          }
        }));

        setMissionStatus("arrested");
        setMissionProgress(100);
        setMissionLog(`[ÉCHEC] BUSTED ! Jason a été intercepté par le SWAT. Caution payée : $50,000 propres.`);

        addChatMessage({
          id: `lisa_job_fail_${Date.now()}`,
          role: "assistant",
          content: `🚨 ALERTE CRITIQUE : Jason ou Lucia a été repéré par le shérif de Leonida pendant l'exécution de "${job.title}". J'ai dû blanchir $50,000 en urgence de caution. Faites profil bas, le niveau d'alerte a atteint son paroxysme !`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }
    }, 4500);
  };

  const closeMissionHUD = () => {
    setActiveMission(null);
    setMissionStatus("idle");
    setMissionProgress(0);
    setMissionLog("");
  };

  return (
    <div className="min-h-screen bg-reverb-dark text-white font-sans crt-grid flex flex-col justify-between">
      {/* Immersive Top Bar */}
      <header className="bg-reverb-card border-b border-reverb-pink/30 p-4 sticky top-0 z-50 shadow-glow-pink">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Logo Title */}
          <div className="flex items-center space-x-3">
            <div className="bg-reverb-pink/15 p-2 rounded border border-reverb-pink/30 shadow-glow-pink animate-pulse">
              <Cpu className="w-5.5 h-5.5 text-reverb-pink" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-lg tracking-wider text-white flex items-center gap-2">
                SYSTÈME <span className="text-reverb-pink drop-shadow-[0_0_8px_rgba(255,42,116,0.8)]">REVERB</span>
                <span className="text-xs font-mono font-normal bg-reverb-cyan/10 text-reverb-cyan px-2 py-0.5 rounded border border-reverb-cyan/20">
                  V2.0.0
                </span>
              </h1>
              <p className="text-[10px] text-gray-400 font-mono">
                CONSOLE INVERSIVE DE SÉCURITÉ DE VICE CITY
              </p>
            </div>
          </div>

          {/* Connected Quick Telemetry Bar */}
          <div className="flex items-center space-x-6 text-xs font-mono">
            <div className="hidden sm:block">
              <span className="text-gray-500 text-[10px] block">FLUX TÉLÉMÉTRIQUE</span>
              <span className={`font-bold flex items-center gap-1 ${state.isOnline ? "text-reverb-cyan" : "text-reverb-pink"}`}>
                <span className={`w-2 h-2 rounded-full inline-block ${state.isOnline ? "bg-reverb-cyan animate-pulse" : "bg-reverb-pink"}`}></span>
                {state.isOnline ? "SYNC_OK" : "SYNC_INTERRUPTED"}
              </span>
            </div>

            <div>
              <span className="text-gray-500 text-[10px] block">FONDS TOTAUX EMPIRE</span>
              <span className="text-white font-bold text-sm">
                ${(state.empire.cashClean + state.empire.cashDirty).toLocaleString()}
              </span>
            </div>

            <div>
              <span className="text-gray-500 text-[10px] block">ALERTE VCPD</span>
              <span className="text-reverb-pink font-bold flex items-center gap-1">
                <Flame className="w-4.5 h-4.5 text-reverb-pink fill-reverb-pink animate-bounce" />
                {state.telemetry.searchLevel} / 5 ETOILES
              </span>
            </div>
          </div>

        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto p-4 md:p-6 w-full flex-grow space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex flex-wrap bg-reverb-card border border-gray-800 p-1.5 rounded-lg font-mono text-xs gap-1 max-w-4xl">
          <button
            onClick={() => setActiveTab("telemetry")}
            className={`flex-1 min-w-[120px] py-2.5 rounded font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === "telemetry"
                ? "bg-reverb-cyan text-black font-extrabold shadow-glow-cyan"
                : "text-gray-400 hover:text-white hover:bg-reverb-dark/40"
            }`}
          >
            <Tv className="w-4 h-4" /> Second Écran
          </button>
          <button
            onClick={() => setActiveTab("empire")}
            className={`flex-1 min-w-[120px] py-2.5 rounded font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === "empire"
                ? "bg-reverb-pink text-white font-extrabold shadow-glow-pink"
                : "text-gray-400 hover:text-white hover:bg-reverb-dark/40"
            }`}
          >
            <TrendingUp className="w-4 h-4" /> Empire
          </button>
          <button
            onClick={() => setActiveTab("lisa")}
            className={`flex-1 min-w-[120px] py-2.5 rounded font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === "lisa"
                ? "bg-reverb-cyan text-black font-extrabold shadow-glow-cyan"
                : "text-gray-400 hover:text-white hover:bg-reverb-dark/40"
            }`}
          >
            <Cpu className="w-4 h-4" /> Broker AI
          </button>
          <button
            onClick={() => setActiveTab("inbox")}
            className={`flex-1 min-w-[120px] py-2.5 rounded font-bold transition flex items-center justify-center gap-1.5 ${
              activeTab === "inbox"
                ? "bg-reverb-pink text-white font-extrabold shadow-glow-pink"
                : "text-gray-400 hover:text-white hover:bg-reverb-dark/40"
            }`}
          >
            <Mail className="w-4 h-4" /> Messagerie
          </button>
          <button
            onClick={() => setActiveTab("sandbox")}
            className={`flex-1 min-w-[140px] py-2.5 rounded font-bold transition flex items-center justify-center gap-1.5 relative overflow-hidden ${
              activeTab === "sandbox"
                ? "bg-reverb-cyan text-black font-extrabold shadow-glow-cyan"
                : "text-gray-200 bg-reverb-cyan/10 border border-reverb-cyan/30 hover:text-white hover:bg-reverb-cyan/20"
            }`}
          >
            <Server className="w-4 h-4 text-reverb-cyan animate-pulse" />
            <span>Sandbox RP</span>
            <span className="absolute top-0 right-0 bg-reverb-pink text-white text-[8px] font-extrabold px-1 py-0.5 rounded-bl uppercase tracking-wider animate-bounce">
              LIVE
            </span>
          </button>
        </div>

        {/* Global Sandbox Notification Banner */}
        <div className="bg-gradient-to-r from-reverb-cyan/20 to-reverb-pink/20 border border-reverb-cyan/30 p-3.5 rounded-lg font-mono text-xs flex flex-col sm:flex-row items-center justify-between gap-3 shadow-glow-cyan/10 animate-pulse">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-reverb-cyan opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-reverb-cyan"></span>
            </span>
            <p className="text-gray-200">
              ⚡ <strong className="text-reverb-cyan">CONSOLE REVERB ACTIVE :</strong> Le simulateur de serveurs <strong>Sandbox RP</strong> en monde ouvert est opérationnel. Modifiez les règles, créez des citoyens IA ou générez des guerres de gangs à la volée !
            </p>
          </div>
          <button 
            onClick={() => setActiveTab("sandbox")}
            className="text-[10px] bg-reverb-cyan hover:bg-reverb-cyan/80 text-black px-3 py-1.5 rounded font-bold uppercase tracking-wider transition"
          >
            Accéder à l'Éditeur RP
          </button>
        </div>

        {/* Dynamic Views Rendering with Animations */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.25 }}
          >
            {activeTab === "telemetry" && (
              <LiveTelemetry
                telemetry={state.telemetry}
                isOnline={state.isOnline}
                onUpdateTelemetry={updateTelemetry}
                onToggleSync={toggleSync}
              />
            )}

            {activeTab === "empire" && (
              <OfflineBroker
                gameState={state}
                onUpdateEmpire={updateEmpire}
                onAddMessage={addInboxMessage}
              />
            )}

            {activeTab === "lisa" && (
              <SecureAI
                gameState={state}
                onAddChatMessage={addChatMessage}
                onAddContract={addContract}
              />
            )}

            {activeTab === "inbox" && (
              <SecureInbox
                gameState={state}
                onUpdateMessages={updateMessages}
                onUpdateEmpire={updateEmpire}
                onAddChatMessage={addChatMessage}
              />
            )}

            {activeTab === "sandbox" && (
              <SandboxRP
                gameState={state}
                onUpdateEmpire={updateEmpire}
                onUpdateTelemetry={updateTelemetry}
                onAddContract={addContract}
                onAddChatMessage={addChatMessage}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {/* Live Active Mission Simulation Overlay HUD */}
        {activeMission && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-reverb-card border border-reverb-pink/50 rounded-lg p-6 max-w-md w-full font-mono text-xs space-y-4 shadow-glow-pink">
              <div className="flex justify-between items-center border-b border-reverb-pink/20 pb-2">
                <span className="text-reverb-pink font-extrabold text-sm flex items-center gap-1">
                  ⚔️ ALERTE EXÉCUTION SYNDICAT
                </span>
                <span className="text-[10px] text-gray-500">REVERB SIM v2.0</span>
              </div>

              <div className="space-y-1">
                <h3 className="font-display font-bold text-white text-base">{activeMission.title}</h3>
                <p className="text-gray-400 text-[11px]">{activeMission.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-[11px] p-2.5 bg-reverb-dark rounded border border-gray-800">
                <div>
                  <span className="text-gray-500">RÉCOMPENSE SALES :</span>
                  <span className="block font-bold text-emerald-400 text-sm">{activeMission.reward}</span>
                </div>
                <div>
                  <span className="text-gray-500">FACTEUR DE RISQUE :</span>
                  <span className="block font-bold text-reverb-pink text-sm">{activeMission.risk}%</span>
                </div>
              </div>

              {/* Progress logs terminal */}
              <div className="bg-reverb-dark p-3.5 rounded border border-gray-900 h-28 overflow-y-auto text-reverb-cyan text-[11px] font-mono leading-relaxed space-y-1 scrollbar-thin">
                <div>{missionLog}</div>
                {missionProgress > 0 && (
                  <div className="w-full bg-gray-950 h-1.5 rounded mt-2.5 overflow-hidden">
                    <div className="bg-reverb-cyan h-full transition-all duration-300" style={{ width: `${missionProgress}%` }} />
                  </div>
                )}
              </div>

              {/* Action button */}
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-900">
                {missionStatus !== "running" && (
                  <button
                    onClick={closeMissionHUD}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-750 text-white rounded text-xs transition uppercase font-bold"
                  >
                    FERMER LE RAPPORT
                  </button>
                )}
                {missionStatus === "running" && (
                  <div className="flex items-center gap-2 text-reverb-cyan text-[10px] animate-pulse">
                    <Clock className="w-4 h-4 animate-spin" /> EXÉCUTION DU SCRIPT...
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Global Active Contracts Board / Deck Section */}
        <div className="p-5 bg-reverb-card border border-gray-800 rounded-lg space-y-4">
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <h2 className="font-display font-semibold text-white text-base flex items-center gap-2">
              <Award className="w-4.5 h-4.5 text-reverb-pink" /> MISSIONS & CONTRATS ACTIFS
            </h2>
            <span className="text-xs font-mono text-gray-500">DECK DE CONTRAT CRÉÉ PAR L.I.S.A</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {state.contracts.map((job) => (
              <div
                key={job.title}
                className="bg-reverb-dark/95 border border-gray-800/80 hover:border-reverb-pink/40 p-4 rounded flex flex-col justify-between space-y-4 transition"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-mono text-gray-500 uppercase">
                      📍 {job.location}
                    </span>
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold border ${
                      job.difficulty === "Extrême"
                        ? "bg-red-950/40 border-red-800 text-red-400"
                        : job.difficulty === "Difficile"
                        ? "bg-amber-950/40 border-amber-800 text-amber-500"
                        : "bg-emerald-950/40 border-emerald-800 text-emerald-500"
                    }`}>
                      {job.difficulty}
                    </span>
                  </div>

                  <h4 className="font-display font-bold text-white text-sm">{job.title}</h4>
                  <p className="text-[11px] text-gray-400 font-mono leading-relaxed mt-1">
                    {job.description}
                  </p>
                </div>

                <div className="border-t border-gray-900 pt-3 flex justify-between items-center">
                  <div>
                    <span className="text-[9px] text-gray-500 font-mono block">RÉCOMPENSE</span>
                    <span className="font-bold text-emerald-400 font-display text-sm">{job.reward}</span>
                  </div>

                  <button
                    onClick={() => executeJobSimulation(job)}
                    disabled={missionStatus === "running"}
                    className="px-3 py-1.5 bg-reverb-pink hover:bg-reverb-pink/85 text-white font-display font-bold text-[10px] rounded transition uppercase tracking-wider shadow-glow-pink"
                  >
                    Exécuter
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

      </main>

      {/* Retro aesthetic Footer */}
      <footer className="bg-reverb-card border-t border-gray-900 p-5 font-mono text-center text-xs text-gray-500 mt-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px]">
            © REVERB SYSTEM INC. TOUS DROITS RÉSERVÉS. CONSOLE DE JEU COMPAGNON IMMERSIF GTA 6.
          </p>
          <div className="flex gap-4 text-[10px] items-center">
            <a href="#" className="hover:text-reverb-cyan transition">LOGS TERMINAL</a>
            <a href="#" className="hover:text-reverb-pink transition">SECURE KEY</a>
            <button
              onClick={() => {
                localStorage.removeItem(PERSIST_KEY);
                window.location.reload();
              }}
              className="text-gray-600 hover:text-red-400 transition border border-gray-800 hover:border-red-900 px-2 py-1 rounded font-mono text-[9px] uppercase tracking-wider"
              title="Effacer la sauvegarde locale"
            >
              RESET
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
