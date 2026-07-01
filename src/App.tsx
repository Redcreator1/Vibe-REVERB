import { useState, useEffect, useCallback } from "react";
import { GameState, Telemetry, ChatMessage, Contract, NPCMessage } from "./types";
import { INITIAL_STATE } from "./data/mockData";
import { usePersistedState } from "./hooks/usePersistedState";
import { useSoundSystem } from "./hooks/useSound";
import { useI18n } from "./i18n";
import LiveTelemetry from "./components/LiveTelemetry";
import OfflineBroker from "./components/OfflineBroker";
import SecureInbox from "./components/SecureInbox";
import SandboxRP from "./components/SandboxRP";
import OperatorChat from "./components/OperatorChat";
import SplashScreen, { isFirstVisit } from "./components/SplashScreen";
import OnboardingTutorial, { isOnboardingDone } from "./components/OnboardingTutorial";
import RevenueSimulator from "./components/RevenueSimulator";
import TerritoryMap from "./components/TerritoryMap";
import { motion, AnimatePresence } from "motion/react";
import {
  TrendingUp, Mail, Cpu, Tv, Award, Clock, Flame, Server, Globe, Sun, Share2
} from "lucide-react";
import { Lang } from "./i18n";

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
  const { t, lang, setLang } = useI18n();
  const play = useSoundSystem();

  const [persisted, setPersisted] = usePersistedState<PersistedGameState>(PERSIST_KEY, initialPersisted);

  // Non-persisted runtime state
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>(INITIAL_STATE.chatHistory);
  const [messages, setMessages] = useState(INITIAL_STATE.messages);

  const state: GameState = { ...persisted, chatHistory, messages };

  const setState = useCallback((updater: GameState | ((prev: GameState) => GameState)) => {
    const next = typeof updater === "function" ? updater(state) : updater;
    setPersisted({
      isOnline: next.isOnline,
      telemetry: next.telemetry,
      empire: next.empire,
      contracts: next.contracts,
    });
    setChatHistory(next.chatHistory);
    setMessages(next.messages);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(persisted)]);

  const [activeTab, setActiveTab] = useState<"telemetry" | "empire" | "inbox" | "sandbox">("sandbox");
  const [showSplash, setShowSplash] = useState(() => isFirstVisit());
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  // High contrast mode
  const [hiContrast, setHiContrast] = usePersistedState<boolean>("reverb-contrast", false);
  useEffect(() => {
    document.documentElement.classList.toggle("high-contrast", hiContrast);
  }, [hiContrast]);

  // Mission state
  const [activeMission, setActiveMission] = useState<Contract | null>(null);
  const [missionProgress, setMissionProgress] = useState(0);
  const [missionStatus, setMissionStatus] = useState<"idle" | "running" | "success" | "arrested">("idle");
  const [missionLog, setMissionLog] = useState("");

  const handleTabChange = (tab: typeof activeTab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    play("nav");
  };

  const handleSplashDone = () => {
    setShowSplash(false);
    if (!isOnboardingDone()) setTimeout(() => setShowOnboarding(true), 400);
  };

  const handleShare = async () => {
    const total = state.empire.cashClean + state.empire.cashDirty;
    const text = `${t("share.text")}\n💰 Empire : $${total.toLocaleString()}\n🏢 ${state.empire.enterprises.filter(e => e.status === "active").length} entreprises actives\n🔗 vibe-reverb.pages.dev`;
    if (navigator.share) {
      await navigator.share({ title: "SYSTÈME REVERB", text, url: "https://vibe-reverb.pages.dev" }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(text);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    }
    play("click");
  };

  const cycleLang = () => {
    const order: Lang[] = ["fr", "en", "es", "it"];
    const next = order[(order.indexOf(lang) + 1) % order.length];
    setLang(next);
    play("click");
  };

  const updateTelemetry = (updated: Telemetry) =>
    setState(prev => ({ ...prev, telemetry: updated }));

  const toggleSync = () =>
    setState(prev => ({ ...prev, isOnline: !prev.isOnline }));

  const updateEmpire = (updatedEmpire: GameState["empire"]) =>
    setState(prev => ({ ...prev, empire: updatedEmpire }));

  const addChatMessage = (msg: ChatMessage) =>
    setState(prev => ({ ...prev, chatHistory: [...prev.chatHistory, msg] }));

  const addContract = (contract: Contract) =>
    setState(prev => ({ ...prev, contracts: [contract, ...prev.contracts] }));

  const updateMessages = (updatedMessages: NPCMessage[]) =>
    setState(prev => ({ ...prev, messages: updatedMessages }));

  const addInboxMessage = (
    sender: string,
    senderAvatar: string,
    subject: string,
    body: string,
    isActionable = false
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
    setState(prev => ({ ...prev, messages: [newMsg, ...prev.messages] }));
    play("message");
  };

  const executeJobSimulation = (job: Contract) => {
    if (missionStatus === "running") return;
    setActiveMission(job);
    setMissionStatus("running");
    setMissionProgress(0);
    setMissionLog(`[REVERB CORE] Planification de la mission: "${job.title}"...`);
    play("alert");

    setTimeout(() => {
      setMissionLog(`[REVERB CORE] Infiltration de Lucia & Jason dans la zone ${job.location}...`);
      setMissionProgress(30);
    }, 1200);

    setTimeout(() => {
      setMissionLog(`[VCPD INTERCEPT] Rapport d'infraction reçu à ${job.location} ! Patrouilles en route.`);
      setMissionProgress(60);
      setState(prev => ({
        ...prev,
        telemetry: { ...prev.telemetry, searchLevel: Math.min(prev.telemetry.searchLevel + 1, 5) }
      }));
    }, 2500);

    setTimeout(() => {
      const successChance = 100 - job.risk;
      const roll = Math.random() * 100;

      if (roll <= successChance) {
        const parsedReward = parseInt(job.reward.replace(/[^0-9]/g, ""));
        setState(prev => ({
          ...prev,
          empire: { ...prev.empire, cashDirty: prev.empire.cashDirty + parsedReward },
          telemetry: { ...prev.telemetry, ammo: Math.max(prev.telemetry.ammo - 35, 12), speed: 180 }
        }));
        setMissionStatus("success");
        setMissionProgress(100);
        setMissionLog(`[SUCCÈS] Braquage terminé ! +${job.reward} sales ajoutés à votre coffre-fort.`);
        play("success");

        addChatMessage({
          id: `lisa_job_${Date.now()}`,
          role: "assistant",
          content: `⚡ RAPPORT TACTIQUE : Félicitations Chef ! Le coup "${job.title}" à ${job.location} s'est terminé sans anicroche. Les fonds de ${job.reward} sales ont été téléversés. Préparez le blanchiment dans le Malibu Club pour dissimuler la trace.`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        });
      } else {
        setState(prev => ({
          ...prev,
          empire: { ...prev.empire, cashClean: Math.max(prev.empire.cashClean - 50000, 0) },
          telemetry: { ...prev.telemetry, searchLevel: 5, health: 25, armor: 0 }
        }));
        setMissionStatus("arrested");
        setMissionProgress(100);
        setMissionLog(`[ÉCHEC] BUSTED ! Jason a été intercepté par le SWAT. Caution payée : $50,000 propres.`);
        play("error");

        addChatMessage({
          id: `lisa_job_fail_${Date.now()}`,
          role: "assistant",
          content: `🚨 ALERTE CRITIQUE : Jason ou Lucia a été repéré par le shérif de Leonida pendant l'exécution de "${job.title}". J'ai dû blanchir $50,000 en urgence de caution. Faites profil bas, le niveau d'alerte a atteint son paroxysme !`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
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

  const unreadCount = state.messages.filter(m => !m.decrypted || (m.actionRequired && !m.actionCompleted)).length;

  const LANG_LABELS: Record<Lang, string> = { fr: "FR", en: "EN", es: "ES", it: "IT" };
  const NEXT_LANG: Record<Lang, string> = { fr: "EN", en: "ES", es: "IT", it: "FR" };

  return (
    <>
    {showSplash && <SplashScreen onEnter={handleSplashDone} />}
    {showOnboarding && <OnboardingTutorial onDone={() => setShowOnboarding(false)} />}
    <div className="min-h-screen bg-reverb-dark text-white font-sans crt-grid flex flex-col justify-between">
      {/* Header */}
      <header className="bg-reverb-card border-b border-reverb-pink/30 px-4 py-3 sticky top-0 z-50 shadow-glow-pink">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 sm:gap-3">

          {/* Logo */}
          <div className="flex items-center space-x-2.5">
            <div className="bg-reverb-pink/15 p-1.5 rounded border border-reverb-pink/30 shadow-glow-pink animate-pulse">
              <Cpu className="w-5 h-5 text-reverb-pink" />
            </div>
            <div>
              <h1 className="font-display font-extrabold text-base tracking-wider text-white flex items-center gap-2">
                {t("app.title").split(" ")[0]}{" "}
                <span className="text-reverb-pink drop-shadow-[0_0_8px_rgba(255,42,116,0.8)]">
                  {t("app.title").split(" ").slice(1).join(" ")}
                </span>
                <span className="hidden sm:inline text-xs font-mono font-normal bg-reverb-cyan/10 text-reverb-cyan px-2 py-0.5 rounded border border-reverb-cyan/20">
                  V2.1.0
                </span>
              </h1>
              <p className="hidden sm:block text-[10px] text-gray-400 font-mono">{t("app.subtitle")}</p>
            </div>
          </div>

          {/* Right controls — wraps to its own row on mobile */}
          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-4 flex-wrap">
            <div className="flex items-center gap-3 sm:gap-6 text-xs font-mono">
              <div className="hidden md:block">
                <span className="text-gray-500 text-[10px] block">{t("header.flux")}</span>
                <span className={`font-bold flex items-center gap-1 ${state.isOnline ? "text-reverb-cyan" : "text-reverb-pink"}`}>
                  <span className={`w-2 h-2 rounded-full inline-block ${state.isOnline ? "bg-reverb-cyan animate-pulse" : "bg-reverb-pink"}`} />
                  {state.isOnline ? t("status.online") : t("status.offline")}
                </span>
              </div>
              <div>
                <span className="text-gray-500 text-[9px] sm:text-[10px] block">{t("header.resources")}</span>
                <span className="text-white font-bold text-xs sm:text-sm">
                  ${(state.empire.cashClean + state.empire.cashDirty).toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-gray-500 text-[9px] sm:text-[10px] block">{t("header.vcpd")}</span>
                <span className="text-reverb-pink font-bold flex items-center gap-1">
                  <Flame className="w-4 h-4 text-reverb-pink fill-reverb-pink animate-bounce" />
                  <span className="text-xs">{state.telemetry.searchLevel}/5</span>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* Hi-contrast toggle */}
              <button
                onClick={() => { setHiContrast(!hiContrast); play("click"); }}
                className="hidden sm:flex items-center gap-1 text-[9px] font-mono font-bold border border-gray-700 hover:border-reverb-cyan/50 px-2 py-1 rounded text-gray-400 hover:text-reverb-cyan transition"
                title={hiContrast ? t("contrast.off") : t("contrast.on")}
              >
                <Sun className="w-3 h-3" />
                {hiContrast ? t("contrast.off") : t("contrast.on")}
              </button>

              {/* Share button */}
              <button
                onClick={handleShare}
                className="flex items-center gap-1 text-[9px] font-mono font-bold border border-gray-700 hover:border-reverb-pink/50 px-2 py-1 rounded text-gray-400 hover:text-reverb-pink transition relative"
                title={t("share.title")}
              >
                <Share2 className="w-3 h-3" />
                <span className="hidden sm:inline">{shareCopied ? t("share.copied") : "SHARE"}</span>
              </button>

              {/* Language switcher */}
              <button
                onClick={cycleLang}
                className="flex items-center gap-1 text-[9px] font-mono font-bold border border-gray-700 hover:border-reverb-cyan/50 px-2 py-1 rounded text-gray-400 hover:text-reverb-cyan transition"
                title="Switch language"
              >
                <Globe className="w-3 h-3" />
                {LANG_LABELS[lang]} → {NEXT_LANG[lang]}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 w-full flex-grow space-y-4 sm:space-y-6 pb-20 sm:pb-6">

        {/* Desktop tabs */}
        <div className="hidden sm:flex flex-wrap bg-reverb-card border border-gray-800 p-1.5 rounded-lg font-mono text-xs gap-1 max-w-4xl">
          {([
            { id: "telemetry" as const, label: t("tab.screen"), icon: Tv, active: "bg-reverb-cyan text-black shadow-glow-cyan", badge: undefined as number | undefined, live: false },
            { id: "empire" as const, label: t("tab.empire"), icon: TrendingUp, active: "bg-reverb-pink text-white shadow-glow-pink", badge: undefined as number | undefined, live: false },
            { id: "inbox" as const, label: t("tab.inbox"), icon: Mail, active: "bg-reverb-pink text-white shadow-glow-pink", badge: unreadCount as number | undefined, live: false },
            { id: "sandbox" as const, label: t("tab.sandbox"), icon: Server, active: "bg-reverb-cyan text-black shadow-glow-cyan", badge: undefined as number | undefined, live: true },
          ]).map(({ id, label, icon: Icon, active, badge, live }) => (
            <button
              key={id}
              onClick={() => handleTabChange(id)}
              className={`flex-1 min-w-[110px] py-2.5 rounded font-bold transition flex items-center justify-center gap-1.5 relative overflow-hidden ${
                activeTab === id ? active : "text-gray-400 hover:text-white hover:bg-reverb-dark/40"
              }`}
            >
              <Icon className={`w-4 h-4 ${live ? "animate-pulse" : ""}`} />
              {label}
              {badge != null && badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-reverb-pink text-white text-[8px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {badge}
                </span>
              )}
              {live && (
                <span className="absolute top-0 right-0 bg-reverb-pink text-white text-[8px] font-extrabold px-1 py-0.5 rounded-bl uppercase tracking-wider animate-bounce">
                  LIVE
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Sandbox banner */}
        <div className="hidden sm:flex bg-gradient-to-r from-reverb-cyan/20 to-reverb-pink/20 border border-reverb-cyan/30 p-3.5 rounded-lg font-mono text-xs flex-col sm:flex-row items-center justify-between gap-3 shadow-glow-cyan/10">
          <div className="flex items-center gap-2.5">
            <span className="flex h-2.5 w-2.5 relative shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-reverb-cyan opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-reverb-cyan" />
            </span>
            <p className="text-gray-200">
              ⚡ <strong className="text-reverb-cyan">CONSOLE REVERB ACTIVE :</strong> {t("sandbox.banner")}
            </p>
          </div>
          <button
            onClick={() => handleTabChange("sandbox")}
            className="shrink-0 text-[10px] bg-reverb-cyan hover:bg-reverb-cyan/80 text-black px-3 py-1.5 rounded font-bold uppercase tracking-wider transition"
          >
            {t("sandbox.cta")}
          </button>
        </div>

        {/* Animated tab content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 14, scale: 0.99 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.99 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
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
              <div className="space-y-4">
                <OfflineBroker
                  gameState={state}
                  onUpdateEmpire={updateEmpire}
                  onAddMessage={addInboxMessage}
                />
                <RevenueSimulator empire={state.empire} />
              </div>
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
              <div className="space-y-4">
                <SandboxRP
                  gameState={state}
                  onUpdateEmpire={updateEmpire}
                  onUpdateTelemetry={updateTelemetry}
                  onAddContract={addContract}
                  onAddChatMessage={addChatMessage}
                />
                <TerritoryMap />
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Mission HUD overlay */}
        {activeMission && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-reverb-card border border-reverb-pink/50 rounded-lg p-6 max-w-md w-full font-mono text-xs space-y-4 shadow-glow-pink"
            >
              <div className="flex justify-between items-center border-b border-reverb-pink/20 pb-2">
                <span className="text-reverb-pink font-extrabold text-sm flex items-center gap-1">
                  ⚔️ {t("mission.title")}
                </span>
                <span className="text-[10px] text-gray-500">REVERB SIM v2.1</span>
              </div>
              <div className="space-y-1">
                <h3 className="font-display font-bold text-white text-base">{activeMission.title}</h3>
                <p className="text-gray-400 text-[11px]">{activeMission.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-3 text-[11px] p-2.5 bg-reverb-dark rounded border border-gray-800">
                <div>
                  <span className="text-gray-500">{t("mission.reward")}</span>
                  <span className="block font-bold text-emerald-400 text-sm">{activeMission.reward}</span>
                </div>
                <div>
                  <span className="text-gray-500">{t("mission.risk")}</span>
                  <span className="block font-bold text-reverb-pink text-sm">{activeMission.risk}%</span>
                </div>
              </div>
              <div className="bg-reverb-dark p-3.5 rounded border border-gray-900 h-28 overflow-y-auto text-reverb-cyan text-[11px] font-mono leading-relaxed space-y-1 scrollbar-thin">
                <div>{missionLog}</div>
                {missionProgress > 0 && (
                  <div className="w-full bg-gray-950 h-1.5 rounded mt-2.5 overflow-hidden">
                    <motion.div
                      className="bg-reverb-cyan h-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${missionProgress}%` }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-900">
                {missionStatus !== "running" ? (
                  <button
                    onClick={closeMissionHUD}
                    className="px-4 py-2 bg-gray-800 hover:bg-gray-750 text-white rounded text-xs transition uppercase font-bold"
                  >
                    {t("mission.close")}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-reverb-cyan text-[10px] animate-pulse">
                    <Clock className="w-4 h-4 animate-spin" /> {t("mission.running")}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}

        {/* Contracts board */}
        <div className="p-5 bg-reverb-card border border-gray-800 rounded-lg space-y-4">
          <div className="flex justify-between items-center border-b border-gray-800 pb-2">
            <h2 className="font-display font-semibold text-white text-base flex items-center gap-2">
              <Award className="w-4.5 h-4.5 text-reverb-pink" /> {t("contracts.title")}
            </h2>
            <span className="hidden sm:block text-xs font-mono text-gray-500">REVERB CONTRACTS BOARD</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {state.contracts.map((job) => (
              <motion.div
                key={job.title}
                whileHover={{ scale: 1.02, borderColor: "rgba(255,42,116,0.4)" }}
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="bg-reverb-dark/95 border border-gray-800/80 p-4 rounded flex flex-col justify-between space-y-4"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-mono text-gray-500 uppercase">📍 {job.location}</span>
                    <span className={`text-[9px] font-mono px-2 py-0.5 rounded font-bold border ${
                      job.difficulty === "Extrême" ? "bg-red-950/40 border-red-800 text-red-400"
                      : job.difficulty === "Difficile" ? "bg-amber-950/40 border-amber-800 text-amber-500"
                      : "bg-emerald-950/40 border-emerald-800 text-emerald-500"
                    }`}>
                      {job.difficulty}
                    </span>
                  </div>
                  <h4 className="font-display font-bold text-white text-sm">{job.title}</h4>
                  <p className="text-[11px] text-gray-400 font-mono leading-relaxed mt-1">{job.description}</p>
                </div>
                <div className="border-t border-gray-900 pt-3 flex justify-between items-center">
                  <div>
                    <span className="text-[9px] text-gray-500 font-mono block">RÉCOMPENSE</span>
                    <span className="font-bold text-emerald-400 font-display text-sm">{job.reward}</span>
                  </div>
                  <button
                    onClick={() => executeJobSimulation(job)}
                    disabled={missionStatus === "running"}
                    className="px-3 py-1.5 bg-reverb-pink hover:bg-reverb-pink/85 text-white font-display font-bold text-[10px] rounded transition uppercase tracking-wider shadow-glow-pink disabled:opacity-40"
                  >
                    {t("mission.execute")}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-reverb-card border-t border-reverb-pink/30 flex items-stretch h-16 shadow-[0_-4px_24px_rgba(255,42,116,0.15)]">
        {([
          { id: "telemetry" as const, icon: Tv, label: t("nav.screen") },
          { id: "empire" as const, icon: TrendingUp, label: t("nav.empire") },
          { id: "inbox" as const, icon: Mail, label: t("nav.messages"), badge: unreadCount },
          { id: "sandbox" as const, icon: Server, label: t("nav.sandbox"), live: true },
        ]).map(({ id, icon: Icon, label, badge, live }) => (
          <button
            key={id}
            onClick={() => handleTabChange(id)}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 relative transition-all ${
              activeTab === id ? "text-reverb-pink" : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {activeTab === id && (
              <motion.span
                layoutId="nav-indicator"
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-reverb-pink rounded-b-full"
              />
            )}
            <div className="relative">
              <Icon className={`w-5 h-5 ${live ? "animate-pulse" : ""}`} />
              {badge ? (
                <span className="absolute -top-1.5 -right-1.5 bg-reverb-pink text-white text-[8px] font-bold w-3.5 h-3.5 rounded-full flex items-center justify-center">
                  {badge}
                </span>
              ) : null}
              {live && activeTab !== id && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-reverb-cyan rounded-full animate-pulse" />
              )}
            </div>
            <span className="text-[9px] font-mono font-semibold uppercase tracking-wider">{label}</span>
          </button>
        ))}
      </nav>

      {/* Operator chat (floating) */}
      <OperatorChat />

      {/* Footer */}
      <footer className="bg-reverb-card border-t border-gray-900 p-5 font-mono text-center text-xs text-gray-500 mt-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[10px]">{t("footer.copy")}</p>
          <div className="flex gap-4 text-[10px] items-center">
            <a href="#" className="hover:text-reverb-cyan transition">{t("footer.logs")}</a>
            <a href="#" className="hover:text-reverb-pink transition">{t("footer.secure")}</a>
            <button
              onClick={() => { localStorage.removeItem(PERSIST_KEY); window.location.reload(); }}
              className="text-gray-600 hover:text-red-400 transition border border-gray-800 hover:border-red-900 px-2 py-1 rounded font-mono text-[9px] uppercase tracking-wider"
            >
              {t("footer.reset")}
            </button>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
