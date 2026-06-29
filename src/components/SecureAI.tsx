import { useState, useRef, useEffect, FormEvent } from "react";
import { GameState, ChatMessage, Contract, LISAAction, LISAResponse } from "../types";
import { Terminal, Send, Loader, Cpu, Plus, Zap, ShieldCheck, AlertTriangle, ArrowRightLeft, Mail } from "lucide-react";

interface SecureAIProps {
  gameState: GameState;
  onAddChatMessage: (msg: ChatMessage) => void;
  onAddContract: (contract: Contract) => void;
  onUpdateEmpire: (empire: GameState["empire"]) => void;
  onUpdateTelemetry: (telemetry: GameState["telemetry"]) => void;
  onAddInboxMessage: (sender: string, avatar: string, subject: string, body: string, actionable?: boolean) => void;
}

const ACTION_LABELS: Record<string, { icon: string; label: string; color: string }> = {
  ADD_CONTRACT:        { icon: "⚔️",  label: "CONTRAT AJOUTÉ AU DECK",        color: "text-emerald-400" },
  UPGRADE_ENTERPRISE:  { icon: "🔒",  label: "SÉCURITÉ ENTERPRISE UPGRADÉE",  color: "text-reverb-cyan" },
  SET_ALERT_LEVEL:     { icon: "🚨",  label: "NIVEAU D'ALERTE VCPD MODIFIÉ",  color: "text-reverb-pink" },
  TRANSFER_FUNDS:      { icon: "💸",  label: "TRANSFERT DE FONDS EFFECTUÉ",   color: "text-emerald-400" },
  SEND_INBOX:          { icon: "📨",  label: "MESSAGE ENVOYÉ DANS L'INBOX",   color: "text-reverb-cyan" },
};

const AI_LOADING_PHASES = [
  "DECRYPTING VCPD DISPATCH FREQUENCIES...",
  "ROUTING VPN THROUGH LEONIDA POWER STATIONS...",
  "RECALCULATING OFFSHORE TRANSFER SAFEWAYS...",
  "CALCULATING ESCAPE VECTOR POLYNOMIALS...",
  "ESTABLISHING CRYPTOGRAPHIC BROKER SYNAPSE..."
];

const WORKER_URL = "https://99b92864-reverb01.mindsetredcom.workers.dev";

export default function SecureAI({
  gameState,
  onAddChatMessage,
  onAddContract,
  onUpdateEmpire,
  onUpdateTelemetry,
  onAddInboxMessage,
}: SecureAIProps) {
  const { chatHistory } = gameState;
  const [userInput, setUserInput] = useState<string>("");
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [loadingPhase, setLoadingPhase] = useState<string>(AI_LOADING_PHASES[0]);
  const [isGeneratingContract, setIsGeneratingContract] = useState<boolean>(false);
  const [lastAction, setLastAction] = useState<LISAAction | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory, isTyping]);

  useEffect(() => {
    if (!isTyping && !isGeneratingContract) return;
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % AI_LOADING_PHASES.length;
      setLoadingPhase(AI_LOADING_PHASES[index]);
    }, 1500);
    return () => clearInterval(interval);
  }, [isTyping, isGeneratingContract]);

  const executeAction = (action: LISAAction) => {
    setLastAction(action);
    setTimeout(() => setLastAction(null), 4000);

    switch (action.type) {
      case "ADD_CONTRACT": {
        const { type: _, ...contractFields } = action;
        onAddContract(contractFields as Contract);
        break;
      }
      case "UPGRADE_ENTERPRISE": {
        const updated = gameState.empire.enterprises.map(e =>
          e.id === action.enterpriseId
            ? { ...e, securityLevel: Math.min(e.securityLevel + 1, 5) }
            : e
        );
        onUpdateEmpire({ ...gameState.empire, enterprises: updated });
        break;
      }
      case "SET_ALERT_LEVEL": {
        onUpdateTelemetry({ ...gameState.telemetry, searchLevel: Math.max(0, Math.min(5, action.level)) });
        break;
      }
      case "TRANSFER_FUNDS": {
        const tax = Math.floor(action.amount * 0.1);
        const net = action.amount - tax;
        const dirty = Math.max(gameState.empire.cashDirty - action.amount, 0);
        const clean = gameState.empire.cashClean + net;
        onUpdateEmpire({ ...gameState.empire, cashDirty: dirty, cashClean: clean });
        break;
      }
      case "SEND_INBOX": {
        onAddInboxMessage(action.sender, "🤖", action.subject, action.body, false);
        break;
      }
    }
  };

  const sendMessageToLISA = async (e: FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || isTyping) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: "user",
      content: userInput,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    onAddChatMessage(userMsg);
    const textToSend = userInput;
    setUserInput("");
    setIsTyping(true);

    try {
      const response = await fetch(`${WORKER_URL}/api/broker`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: chatHistory.map(m => ({ role: m.role, content: m.content }))
        })
      });

      const data: LISAResponse & { error?: string } = await response.json();

      if (response.ok && data.text) {
        onAddChatMessage({
          id: `lisa_${Date.now()}`,
          role: "assistant",
          content: data.text,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        if (data.action) executeAction(data.action);
      } else {
        throw new Error(data.error || "Réponse vide de L.I.S.A.");
      }
    } catch (err: any) {
      console.error(err);
      onAddChatMessage({
        id: `lisa_err_${Date.now()}`,
        role: "assistant",
        content: `🚨 ERREUR DE COUPLAGE L.I.S.A. : Impossible de joindre le nœud de calcul neuronal. Détails : ${err.message || "Veuillez configurer votre clé API Gemini."}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    } finally {
      setIsTyping(false);
    }
  };

  const generateBespokeContract = async () => {
    if (isGeneratingContract) return;
    setIsGeneratingContract(true);

    try {
      const response = await fetch(`${WORKER_URL}/api/contracts/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          empireStats: {
            cashClean: gameState.empire.cashClean,
            cashDirty: gameState.empire.cashDirty,
            enterprisesCount: gameState.empire.enterprises.length
          }
        })
      });

      const data = await response.json();

      if (response.ok && data.title) {
        onAddContract(data as Contract);
        onAddChatMessage({
          id: `lisa_gen_${Date.now()}`,
          role: "assistant",
          content: `📡 REVERB CORE : Nouveau contrat tactique décrypté. Mission: **"${data.title}"** — ${data.reward} à **${data.location}** (risque ${data.risk}%). Téléversé dans votre deck !`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      } else {
        throw new Error("Opération rejetée par la grille.");
      }
    } catch (err) {
      console.error(err);
      const fallback: Contract = {
        title: "Incursion Portuaire Privée",
        client: "L.I.S.A. Core",
        reward: "$110,000",
        difficulty: "Difficile",
        description: "Infiltrer l'entrepôt numéro 4 du port de Leonida pour subtiliser les cargaisons de puces mémoires thermiques.",
        risk: 55,
        location: "Port Gellhorn"
      };
      onAddContract(fallback);
      onAddChatMessage({
        id: `lisa_gen_fb_${Date.now()}`,
        role: "assistant",
        content: `🛰️ REVERB ALERTE: Mode sécurité activé. Contrat local généré : **"${fallback.title}"** (${fallback.reward}).`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    } finally {
      setIsGeneratingContract(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" id="secure-ai-module">
      <div className="lg:col-span-1 p-5 bg-reverb-card border border-reverb-cyan/10 rounded-lg flex flex-col justify-between space-y-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-2 border-b border-reverb-cyan/10 pb-3">
            <Cpu className="w-5 h-5 text-reverb-cyan animate-pulse" />
            <div>
              <h3 className="font-display font-bold text-white text-sm">REVERB CORE SYSTEM</h3>
              <p className="text-[10px] text-gray-400 font-mono">IA L.I.S.A. v2.0-Agentique</p>
            </div>
          </div>

          <div className="space-y-3 font-mono text-[11px] text-gray-400">
            <p className="bg-reverb-dark/80 p-2.5 rounded border border-gray-800 leading-relaxed">
              L.I.S.A. est connectée au Worker Cloudflare. Elle peut <span className="text-reverb-cyan font-bold">exécuter des actions</span> dans votre empire en temps réel.
            </p>

            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] text-gray-500 block uppercase tracking-wider">Commandes agentiques</span>
              {[
                { icon: <ShieldCheck className="w-3 h-3 text-reverb-cyan" />, cmd: 'Upgrade la sécurité du Malibu Club' },
                { icon: <AlertTriangle className="w-3 h-3 text-reverb-pink" />, cmd: "Baisse mon niveau d'alerte à 0" },
                { icon: <ArrowRightLeft className="w-3 h-3 text-emerald-400" />, cmd: 'Transfère $50,000 sales en propre' },
                { icon: <Mail className="w-3 h-3 text-reverb-cyan" />, cmd: "Envoie un message d'alerte dans l'inbox" },
                { icon: <Plus className="w-3 h-3 text-reverb-pink" />, cmd: 'Crée un contrat à Vice Beach' },
              ].map(({ icon, cmd }) => (
                <button
                  key={cmd}
                  onClick={() => setUserInput(cmd)}
                  className="w-full text-left flex items-start gap-1.5 p-1.5 bg-reverb-dark/40 border border-gray-800 hover:border-reverb-cyan/30 rounded transition cursor-pointer"
                >
                  <span className="mt-0.5 shrink-0">{icon}</span>
                  <span className="leading-tight text-[10px]">{cmd}</span>
                </button>
              ))}
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] text-gray-500 block">STATUT SYSTÈME</span>
              <div className="flex items-center justify-between p-1.5 bg-reverb-dark/40 border border-gray-800 rounded">
                <span>WORKER CLOUDFLARE</span>
                <span className="text-reverb-cyan font-bold">ONLINE</span>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-reverb-dark/40 border border-gray-800 rounded">
                <span>MODE AGENTIQUE</span>
                <span className="text-reverb-pink font-bold">ON</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 pt-4 border-t border-gray-900">
          <button
            onClick={generateBespokeContract}
            disabled={isGeneratingContract || isTyping}
            className={`w-full py-2.5 px-3 rounded text-xs font-display font-bold tracking-wider uppercase flex items-center justify-center gap-2 transition duration-300 ${
              isGeneratingContract
                ? "bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700"
                : "bg-reverb-cyan hover:bg-reverb-cyan/80 text-black shadow-glow-cyan"
            }`}
          >
            {isGeneratingContract ? (
              <><Loader className="w-3.5 h-3.5 animate-spin" /> GÉNÉRATION...</>
            ) : (
              <><Plus className="w-4 h-4" /> Contrat Spécial AI</>
            )}
          </button>
          <p className="text-[9px] font-mono text-center text-gray-500 leading-normal">
            Génère une mission criminelle 100% immersive basée sur l'état de votre empire.
          </p>
        </div>
      </div>

      <div className="lg:col-span-3 bg-reverb-dark border border-reverb-cyan/20 rounded-lg flex flex-col h-[480px]">
        <div className="p-3 bg-reverb-card border-b border-reverb-cyan/25 flex items-center justify-between font-mono text-xs">
          <div className="flex items-center space-x-2 text-reverb-cyan">
            <Terminal className="w-4 h-4" />
            <span className="font-bold">L.I.S.A. @ REVERB-DAEMON: ~</span>
          </div>
          <div className="flex space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-reverb-pink"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-reverb-cyan"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-gray-600"></span>
          </div>
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-4">
          {chatHistory.map((msg) => {
            const isAI = msg.role === "assistant";
            return (
              <div key={msg.id} className={`flex flex-col max-w-[85%] ${isAI ? "self-start" : "self-end ml-auto"}`}>
                <span className={`text-[10px] font-mono mb-1 ${isAI ? "text-reverb-cyan" : "text-reverb-pink text-right"}`}>
                  {isAI ? "🤖 L.I.S.A. BROKER" : "👤 VOUS (CHEF)"} • {msg.timestamp}
                </span>
                <div className={`p-3.5 rounded-lg text-xs leading-relaxed font-mono ${
                  isAI ? "bg-reverb-card border border-reverb-cyan/20 text-white whitespace-pre-line" : "bg-reverb-pink text-white rounded-br-none"
                }`}>
                  {msg.content}
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex flex-col max-w-[80%] self-start space-y-1.5 animate-pulse">
              <span className="text-[10px] font-mono text-reverb-cyan">🤖 L.I.S.A. BROKER • RECHERCHE DE DONNÉES...</span>
              <div className="bg-reverb-card border border-reverb-cyan/30 p-4 rounded-lg font-mono text-xs text-reverb-cyan flex items-center gap-3">
                <Loader className="w-4 h-4 animate-spin text-reverb-cyan" />
                <span>{loadingPhase}</span>
              </div>
            </div>
          )}

          {isGeneratingContract && (
            <div className="flex flex-col max-w-[80%] self-start space-y-1.5 animate-pulse">
              <span className="text-[10px] font-mono text-reverb-cyan">🤖 L.I.S.A. BROKER • RE-CALCUL STRATÉGIQUE...</span>
              <div className="bg-reverb-card border border-reverb-cyan/30 p-4 rounded-lg font-mono text-xs text-reverb-cyan flex items-center gap-3">
                <Loader className="w-4 h-4 animate-spin text-reverb-cyan" />
                <span>{loadingPhase}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {lastAction && (
          <div className="mx-3 mb-1 px-3 py-2 bg-reverb-cyan/10 border border-reverb-cyan/30 rounded font-mono text-[11px] text-reverb-cyan flex items-center gap-2 animate-pulse">
            <Zap className="w-3.5 h-3.5 shrink-0" />
            <span>
              <span className="font-bold">ACTION L.I.S.A. EXÉCUTÉE</span> —{" "}
              {ACTION_LABELS[lastAction.type]?.icon} {ACTION_LABELS[lastAction.type]?.label}
            </span>
          </div>
        )}

        <form onSubmit={sendMessageToLISA} className="p-3 bg-reverb-card border-t border-gray-800 flex gap-2">
          <input
            type="text"
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            disabled={isTyping || isGeneratingContract}
            placeholder={isTyping ? "L.I.S.A. calcule..." : "Directive criminelle (ex: Baisse mon alerte à 0)"}
            className="flex-grow bg-reverb-dark border border-gray-800 rounded px-3.5 py-2 text-xs font-mono text-white outline-none focus:border-reverb-cyan transition"
          />
          <button
            type="submit"
            disabled={!userInput.trim() || isTyping || isGeneratingContract}
            className={`px-4 py-2 rounded flex items-center justify-center transition duration-300 ${
              !userInput.trim() || isTyping || isGeneratingContract
                ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                : "bg-reverb-pink hover:bg-reverb-pink/85 text-white shadow-glow-pink"
            }`}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
