import { useState } from "react";
import { NPCMessage, GameState } from "../types";
import { Mail, MailOpen, Lock, ShieldCheck, CornerDownRight, Check, Key, Loader, ArrowLeft } from "lucide-react";

interface SecureInboxProps {
  gameState: GameState;
  onUpdateMessages: (updatedMessages: NPCMessage[]) => void;
  onUpdateEmpire: (updatedEmpire: GameState["empire"]) => void;
  onAddChatMessage: (msg: any) => void;
}

export default function SecureInbox({
  gameState,
  onUpdateMessages,
  onUpdateEmpire,
  onAddChatMessage
}: SecureInboxProps) {
  const { messages } = gameState;
  const { cashDirty, cashClean, cryptoBalance, enterprises } = gameState.empire;
  const [selectedMsgId, setSelectedMsgId] = useState<string>(messages[0]?.id || "");
  const [decryptingId, setDecryptingId] = useState<string | null>(null);
  const [mobileShowDetail, setMobileShowDetail] = useState(false);

  const selectedMessage = messages.find(m => m.id === selectedMsgId) || messages[0];

  // Run a satisfying decryption sequence
  const handleDecryptMessage = (msgId: string) => {
    setDecryptingId(msgId);
    
    setTimeout(() => {
      const updated = messages.map(msg => {
        if (msg.id === msgId) {
          return {
            ...msg,
            decrypted: true,
            body: "PLANQUE DE LEONIDA KEYS RECONSTRUITE : FRÉQUENCE RADAR FIXÉE À 915.5 MHZ. INFILTRATION DU DRONE DE SURVEILLANCE PARFAITEMENT VALIDE. LA CARGAISON SERA EXFILTRÉE DEPUIS OCEAN DRIVE VERS LES CODES DE SÉCURITÉ REVERB."
          };
        }
        return msg;
      });
      onUpdateMessages(updated);
      setDecryptingId(null);

      // Log in assistant chat
      onAddChatMessage({
        id: `lisa_decrypt_${Date.now()}`,
        role: "assistant",
        content: "🔑 CANAL SÉCURISÉ : Les informations chiffrées de V_SHADOW_HACK ont été décryptées avec succès. Les coordonnées de la base d'Leonida Keys ont été poussées sur votre écran de télémétrie.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    }, 2000);
  };

  // Complete an inbox message action
  const handleMessageAction = (msgId: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg) return;

    if (msg.id === "msg_1") {
      // Security upgrade cost: $15,000 clean cash
      if (cashClean < 15000) {
        alert("Fonds propres insuffisants pour cette action.");
        return;
      }

      // Upgrade security of first enterprise (Malibu Club or other) for fun
      const updatedEnterprises = enterprises.map((ent, idx) => {
        if (idx === 0) { // Malibu Club
          return {
            ...ent,
            securityLevel: Math.min(ent.securityLevel + 2, 5)
          };
        }
        return ent;
      });

      onUpdateEmpire({
        ...gameState.empire,
        cashClean: cashClean - 15000,
        enterprises: updatedEnterprises
      });

    } else if (msg.id === "msg_2") {
      // Unlock contact cost: 5.000 crypto
      if (cryptoBalance < 5.0) {
        alert("Fonds crypto insuffisants (Requis: 5.0 R_COIN).");
        return;
      }

      onUpdateEmpire({
        ...gameState.empire,
        cryptoBalance: cryptoBalance - 5.0
      });
    }

    // Mark action as completed
    const updatedMessages = messages.map(m => {
      if (m.id === msgId) {
        return {
          ...m,
          actionCompleted: true
        };
      }
      return m;
    });

    onUpdateMessages(updatedMessages);
  };

  const handleSelectMessage = (id: string) => {
    setSelectedMsgId(id);
    setMobileShowDetail(true);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6" id="secure-inbox-module">
      {/* Left pane: Messages List — hidden on mobile when detail is open */}
      <div className={`md:col-span-1 bg-reverb-card border border-reverb-cyan/10 rounded-lg overflow-hidden flex flex-col h-[calc(100svh-14rem)] md:h-[480px] ${mobileShowDetail ? "hidden md:flex" : "flex"}`}>
        <div className="p-3 bg-reverb-dark border-b border-gray-800 flex items-center justify-between font-mono text-xs">
          <span className="text-white font-bold flex items-center gap-1.5">
            <Mail className="w-3.5 h-3.5 text-reverb-cyan" /> ENCRYP_INBOX
          </span>
          <span className="bg-reverb-pink/20 text-reverb-pink px-1.5 py-0.5 rounded text-[10px]">
            {messages.filter(m => !m.decrypted).length} CHIFFRÉS
          </span>
        </div>

        <div className="flex-grow overflow-y-auto divide-y divide-gray-900">
          {messages.map((msg) => {
            const isSelected = msg.id === selectedMsgId;
            return (
              <button
                key={msg.id}
                onClick={() => handleSelectMessage(msg.id)}
                className={`w-full text-left p-3.5 transition block relative ${
                  isSelected ? "bg-reverb-dark/90" : "hover:bg-reverb-dark/30"
                }`}
              >
                {/* Blue border for selected */}
                {isSelected && (
                  <div className="absolute top-0 left-0 bottom-0 w-1.5 bg-reverb-cyan" />
                )}

                <div className="flex justify-between items-start font-mono text-xs mb-1">
                  <span className="font-bold text-white flex items-center gap-1">
                    <span className="w-5 h-5 rounded-full bg-gray-800 text-reverb-cyan flex items-center justify-center font-display font-semibold text-[10px]">
                      {msg.senderAvatar}
                    </span>
                    {msg.sender}
                  </span>
                  <span className="text-gray-500 text-[10px]">{msg.time}</span>
                </div>

                <div className="text-[11px] text-gray-300 font-display font-semibold truncate">
                  {msg.subject}
                </div>

                <div className="text-[10px] text-gray-500 font-mono truncate mt-1">
                  {msg.decrypted ? msg.body : "•••••••••••••••••••••••••••••••••••••••••••••"}
                </div>

                <div className="mt-2 flex items-center justify-between text-[9px] font-mono">
                  {msg.decrypted ? (
                    <span className="text-emerald-500 flex items-center gap-0.5">
                      <ShieldCheck className="w-3 h-3" /> VERIFIÉ
                    </span>
                  ) : (
                    <span className="text-reverb-pink flex items-center gap-0.5">
                      <Lock className="w-3 h-3" /> CHIFFRÉ
                    </span>
                  )}

                  {msg.actionRequired && !msg.actionCompleted && (
                    <span className="text-amber-400 font-bold">REQUIS</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right pane: Message details — full screen on mobile when open */}
      <div className={`md:col-span-2 bg-reverb-card border border-reverb-cyan/15 rounded-lg overflow-hidden flex flex-col h-[calc(100svh-14rem)] md:h-[480px] justify-between ${mobileShowDetail ? "flex" : "hidden md:flex"}`}>
        {selectedMessage ? (
          <>
            {/* Header */}
            <div className="p-4 bg-reverb-dark border-b border-gray-900 font-mono text-xs space-y-2">
              {/* Mobile back button */}
              <button
                onClick={() => setMobileShowDetail(false)}
                className="md:hidden flex items-center gap-1 text-reverb-cyan text-[11px] mb-2 hover:text-white transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Retour inbox
              </button>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">DE :</span>
                <span className="text-reverb-cyan font-bold">{selectedMessage.sender} (SENDER_NODE)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">OBJET :</span>
                <span className="text-white font-semibold">{selectedMessage.subject}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">RESEAU :</span>
                <span className={`font-bold ${selectedMessage.decrypted ? "text-emerald-400" : "text-reverb-pink"}`}>
                  {selectedMessage.decrypted ? "CANAL OUVERT ET DECRYPTÉ" : "LIGNE SECURE COMPROMISE"}
                </span>
              </div>
            </div>

            {/* Body */}
            <div className="flex-grow p-5 overflow-y-auto leading-relaxed font-mono text-xs text-gray-200">
              {selectedMessage.decrypted ? (
                <div className="space-y-4">
                  <p className="bg-reverb-dark/30 p-3 rounded border border-gray-900/40">
                    {selectedMessage.body}
                  </p>
                  
                  {selectedMessage.rewardAmount && (
                    <div className="flex items-center gap-2 bg-reverb-cyan/5 p-2.5 rounded border border-reverb-cyan/15 text-reverb-cyan text-[11px]">
                      <Key className="w-4 h-4" />
                      <span><strong>RECOMPENSE VIRTUELLE :</strong> {selectedMessage.rewardAmount}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full space-y-4 py-8 text-center">
                  <Lock className="w-12 h-12 text-reverb-pink animate-pulse" />
                  <div>
                    <h4 className="font-display font-bold text-reverb-pink">FLUX CHIFFRÉ MILITAIRE</h4>
                    <p className="text-gray-500 text-[10px] mt-1 max-w-sm">
                      Cette communication utilise une clé de chiffrement RSA asymétrique. Vous devez lancer l'ordinateur de bord L.I.S.A. pour craquer le code.
                    </p>
                  </div>
                  <button
                    onClick={() => handleDecryptMessage(selectedMessage.id)}
                    disabled={decryptingId !== null}
                    className="bg-reverb-pink hover:bg-reverb-pink/85 text-white font-display font-bold text-xs px-4 py-2 rounded shadow-glow-pink uppercase tracking-wider flex items-center gap-1.5 transition"
                  >
                    {decryptingId === selectedMessage.id ? (
                      <>
                        <Loader className="w-3.5 h-3.5 animate-spin" /> CRAQUAGE EN COURS...
                      </>
                    ) : (
                      <>
                        <Key className="w-4.5 h-4.5" /> Crack Chiffrement REVERB
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="p-4 bg-reverb-dark/60 border-t border-gray-900 flex justify-between items-center font-mono text-xs">
              <span className="text-gray-500">Action requis:</span>
              
              {selectedMessage.decrypted && selectedMessage.actionRequired ? (
                selectedMessage.actionCompleted ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <Check className="w-4 h-4" /> ACTION COMPLETÉE
                  </span>
                ) : (
                  <button
                    onClick={() => handleMessageAction(selectedMessage.id)}
                    className="bg-reverb-cyan hover:bg-reverb-cyan/85 text-black font-display font-bold text-[11px] px-3.5 py-1.5 rounded uppercase tracking-wider transition"
                  >
                    {selectedMessage.actionLabel}
                  </button>
                )
              ) : (
                <span className="text-gray-600">Aucune directive additionnelle</span>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 text-xs font-mono">
            Sélectionnez un message pour l'afficher.
          </div>
        )}
      </div>
    </div>
  );
}
