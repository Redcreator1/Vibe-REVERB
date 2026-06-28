import { useState, useEffect, useRef } from "react";
import { GameState, Enterprise, Contract } from "../types";
import { DollarSign, ShieldAlert, Key, TrendingUp, AlertTriangle, Shield, CheckCircle, RefreshCw, Layers } from "lucide-react";

interface OfflineBrokerProps {
  gameState: GameState;
  onUpdateEmpire: (updatedEmpire: GameState["empire"]) => void;
  onAddMessage: (sender: string, senderAvatar: string, subject: string, body: string, isActionable?: boolean) => void;
}

export default function OfflineBroker({
  gameState,
  onUpdateEmpire,
  onAddMessage
}: OfflineBrokerProps) {
  const { cashDirty, cashClean, cryptoBalance, enterprises } = gameState.empire;
  
  // Money laundering state
  const [launderingAmount, setLaunderingAmount] = useState<number>(25000);
  const [selectedEnterpriseId, setSelectedEnterpriseId] = useState<string>(enterprises[0]?.id || "");
  const [isLaundering, setIsLaundering] = useState<boolean>(false);
  const [launderingProgress, setLaunderingProgress] = useState<number>(0);
  const [feedback, setFeedback] = useState<{ type: "success" | "error" | "info" | null; msg: string }>({ type: null, msg: "" });

  // Calculate dynamic risk
  const selectedEnterprise = enterprises.find(e => e.id === selectedEnterpriseId) || enterprises[0];
  const securityFactor = selectedEnterprise ? (6 - selectedEnterprise.securityLevel) * 15 : 50;
  const amountFactor = Math.min((launderingAmount / 150000) * 45, 45);
  const calculatedRisk = Math.round(securityFactor + amountFactor);

  // Keep a stable ref to the latest empire state and callback so the interval
  // reads current values without being listed as deps (which would re-register
  // the interval on every tick whenever passive income updates the empire).
  const empireRef = useRef(gameState.empire);
  useEffect(() => {
    empireRef.current = gameState.empire;
  }, [gameState.empire]);

  const onUpdateEmpireRef = useRef(onUpdateEmpire);
  useEffect(() => {
    onUpdateEmpireRef.current = onUpdateEmpire;
  }, [onUpdateEmpire]);

  // Auto-generate passive pending cash for fun
  useEffect(() => {
    const timer = setInterval(() => {
      const { enterprises: ents, cashDirty: cd, cashClean: cc, cryptoBalance: cb } = empireRef.current;
      const updatedEnterprises = ents.map(ent => {
        if (ent.status !== "active") return ent;
        // Increase dirty stock and pending clean cash slightly
        const stockIncrease = Math.random() > 0.6 ? 1 : 0;
        const newStock = Math.min(ent.dirtyStock + stockIncrease, 100);
        // Every stock increase adds clean pending
        const cashIncrease = stockIncrease > 0 ? Math.floor(Math.random() * 200 + 100) : 0;
        return {
          ...ent,
          dirtyStock: newStock,
          cleanCashPending: ent.cleanCashPending + cashIncrease
        };
      });
      onUpdateEmpireRef.current({
        cashDirty: cd,
        cashClean: cc,
        cryptoBalance: cb,
        enterprises: updatedEnterprises
      });
    }, 8000);

    return () => clearInterval(timer);
  }, []); // stable: reads empire via ref, no deps needed

  // Execute money laundering process
  const startLaundering = () => {
    if (cashDirty < launderingAmount) {
      setFeedback({ type: "error", msg: "Fonds sales insuffisants pour cette opération." });
      return;
    }
    if (launderingAmount <= 0) {
      setFeedback({ type: "error", msg: "Spécifiez un montant supérieur à $0." });
      return;
    }

    setIsLaundering(true);
    setLaunderingProgress(0);
    setFeedback({ type: "info", msg: `Initialisation du transfert via les comptes du ${selectedEnterprise.name}...` });

    // Deduct dirty money upfront
    onUpdateEmpire({
      ...gameState.empire,
      cashDirty: cashDirty - launderingAmount
    });
  };

  const completeLaundering = () => {
    setIsLaundering(false);
    
    // Risk check - chance to trigger a raid or police fine
    const successThreshold = 100 - calculatedRisk;
    const roll = Math.random() * 100;

    if (roll > successThreshold) {
      // Failed! Police seized 40% of the laundering amount and security dropped!
      const fine = Math.round(launderingAmount * 0.4);
      const lost = launderingAmount - fine;
      
      const updatedEnterprises = enterprises.map(ent => {
        if (ent.id === selectedEnterpriseId) {
          return {
            ...ent,
            securityLevel: Math.max(ent.securityLevel - 1, 1),
            dirtyStock: Math.max(ent.dirtyStock - 30, 0)
          };
        }
        return ent;
      });

      onUpdateEmpire({
        ...gameState.empire,
        cashClean: cashClean + fine, // only partial returned
        enterprises: updatedEnterprises
      });

      setFeedback({
        type: "error",
        msg: `🚨 ALERTE VCPD ! L'opération a été repérée. ${fine.toLocaleString()}$ ont été sauvés, mais la police a saisi le reste et dégradé la sécurité du ${selectedEnterprise.name}.`
      });

      // Add warning message in inbox
      onAddMessage(
        "L.I.S.A.",
        "A",
        `Raid évité de justesse au ${selectedEnterprise.name}`,
        `Alerte rouge. Une transaction suspecte de ${launderingAmount.toLocaleString()}$ a attiré l'attention de la brigade financière. Nous avons dû couper les serveurs en urgence. Améliorez la sécurité physique et informatique au plus vite !`,
        true
      );

    } else {
      // Success! Laundering tax of 10% is applied by L.I.S.A.
      const cleanedNet = Math.round(launderingAmount * 0.9);
      
      onUpdateEmpire({
        ...gameState.empire,
        cashClean: cashClean + cleanedNet
      });

      setFeedback({
        type: "success",
        msg: `💸 TRANSACTION FINISALISÉE ! ${cleanedNet.toLocaleString()}$ propres ont été transférés sur votre compte off-shore (Frais L.I.S.A. : 10%).`
      });
    }
  };

  // Keep a stable ref to completeLaundering so the progress effect always
  // calls the latest closure (with current calculatedRisk / launderingAmount).
  const completeLaunderingRef = useRef(completeLaundering);
  useEffect(() => {
    completeLaunderingRef.current = completeLaundering;
  });

  // Progress animation ticker — only active while a laundering op is running
  useEffect(() => {
    if (!isLaundering) return;

    const intervalId = setInterval(() => {
      setLaunderingProgress(prev => Math.min(prev + 10, 100));
    }, 300);

    return () => clearInterval(intervalId);
  }, [isLaundering]);

  // Trigger completeLaundering exactly once when progress reaches 100
  useEffect(() => {
    if (isLaundering && launderingProgress >= 100) {
      completeLaunderingRef.current();
    }
  }, [isLaundering, launderingProgress]);

  // Collect passive cash from a property
  const collectDividends = (entId: string) => {
    const ent = enterprises.find(e => e.id === entId);
    if (!ent || ent.cleanCashPending <= 0) return;

    const collectedAmount = ent.cleanCashPending;
    
    const updated = enterprises.map(e => {
      if (e.id === entId) {
        return { ...e, cleanCashPending: 0 };
      }
      return e;
    });

    onUpdateEmpire({
      ...gameState.empire,
      cashClean: cashClean + collectedAmount,
      enterprises: updated
    });

    setFeedback({
      type: "success",
      msg: `💰 Dividendes de ${collectedAmount.toLocaleString()}$ collectés avec succès depuis le ${ent.name}.`
    });
  };

  // Upgrade security of a property
  const upgradeSecurity = (entId: string) => {
    const ent = enterprises.find(e => e.id === entId);
    if (!ent) return;
    
    const cost = ent.securityLevel * 20000;
    if (cashClean < cost) {
      setFeedback({ type: "error", msg: `Fonds propres insuffisants pour améliorer la sécurité (Requis: ${cost.toLocaleString()}$)` });
      return;
    }

    if (ent.securityLevel >= 5) {
      setFeedback({ type: "info", msg: "Sécurité déjà au niveau maximal (Niveau 5/5)." });
      return;
    }

    const updated = enterprises.map(e => {
      if (e.id === entId) {
        return { ...e, securityLevel: e.securityLevel + 1 };
      }
      return e;
    });

    onUpdateEmpire({
      ...gameState.empire,
      cashClean: cashClean - cost,
      enterprises: updated
    });

    setFeedback({
      type: "success",
      msg: `🛡️ Sécurité du ${ent.name} augmentée au niveau ${ent.securityLevel + 1} pour ${cost.toLocaleString()}$.`
    });
  };

  return (
    <div className="space-y-6" id="offline-broker-module">
      {/* Financial status banners */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-reverb-card border border-reverb-pink/30 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-reverb-pink uppercase block tracking-wider">FONDS SALES (DIRTY STOCK)</span>
            <span className="text-xl font-display font-bold text-white tracking-tight">
              ${cashDirty.toLocaleString()}
            </span>
          </div>
          <div className="p-2.5 bg-reverb-pink/10 rounded border border-reverb-pink/20">
            <DollarSign className="w-5 h-5 text-reverb-pink" />
          </div>
        </div>

        <div className="p-4 bg-reverb-card border border-reverb-cyan/30 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-reverb-cyan uppercase block tracking-wider">FONDS NETS PROPRES (OFFSHORE)</span>
            <span className="text-xl font-display font-bold text-white tracking-tight">
              ${cashClean.toLocaleString()}
            </span>
          </div>
          <div className="p-2.5 bg-reverb-cyan/10 rounded border border-reverb-cyan/20">
            <CheckCircle className="w-5 h-5 text-reverb-cyan" />
          </div>
        </div>

        <div className="p-4 bg-reverb-card border border-gray-800 rounded-lg flex items-center justify-between">
          <div>
            <span className="text-xs font-mono text-gray-400 uppercase block tracking-wider">REVERB CRYTPO (R_COIN)</span>
            <span className="text-xl font-display font-bold text-white tracking-tight">
              {cryptoBalance.toFixed(2)} BTC
            </span>
          </div>
          <div className="p-2.5 bg-gray-800/50 rounded border border-gray-700">
            <Layers className="w-5 h-5 text-gray-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Laundering Console */}
        <div className="lg:col-span-1 p-5 bg-reverb-card border border-reverb-pink/20 rounded-lg space-y-5">
          <div className="border-b border-reverb-pink/10 pb-2">
            <h2 className="font-display font-semibold text-reverb-pink text-base flex items-center gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-reverb-pink" /> LAUNCH LAUNDERING PROCESS
            </h2>
            <p className="text-xs text-gray-400 font-mono mt-0.5">Blanchiment de fonds d'Empire</p>
          </div>

          {/* Amount slider */}
          <div className="space-y-2">
            <div className="flex justify-between font-mono text-xs">
              <span className="text-gray-400">MONTANT À TRANSFERER</span>
              <span className="text-white font-bold">${launderingAmount.toLocaleString()}</span>
            </div>
            <input
              type="range"
              min={1000}
              max={Math.min(cashDirty, 150000) || 50000}
              step={1000}
              value={launderingAmount}
              disabled={isLaundering || cashDirty <= 0}
              onChange={(e) => setLaunderingAmount(Number(e.target.value))}
              className="w-full accent-reverb-pink bg-reverb-dark h-2 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between font-mono text-[9px] text-gray-500">
              <span>$1,000</span>
              <span>$150,000 max par dépôt</span>
            </div>
          </div>

          {/* Enterprise selector */}
          <div className="space-y-2">
            <label className="block text-xs font-mono text-gray-400">CANAL DE LESSIVAGE</label>
            <select
              value={selectedEnterpriseId}
              disabled={isLaundering}
              onChange={(e) => setSelectedEnterpriseId(e.target.value)}
              className="w-full p-2.5 bg-reverb-dark border border-gray-800 rounded font-mono text-xs text-white outline-none cursor-pointer focus:border-reverb-pink"
            >
              {enterprises.map(e => (
                <option key={e.id} value={e.id}>
                  {e.name} (Sec: Lvl {e.securityLevel})
                </option>
              ))}
            </select>
          </div>

          {/* Risk calculator hud */}
          <div className="p-3 bg-reverb-dark/90 rounded border border-gray-800 font-mono text-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">RISQUE ESTIMÉ DU RAID</span>
              <span className={`font-bold ${calculatedRisk > 60 ? "text-red-500" : calculatedRisk > 35 ? "text-amber-500" : "text-emerald-500"}`}>
                {calculatedRisk}%
              </span>
            </div>
            <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${calculatedRisk > 60 ? "bg-red-500" : calculatedRisk > 35 ? "bg-amber-500" : "bg-emerald-500"}`}
                style={{ width: `${calculatedRisk}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-[10px] text-gray-500 pt-1">
              <span className="flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5 text-reverb-pink" /> VCPD Trace index
              </span>
              <span>L.I.S.A. Tax: 10%</span>
            </div>
          </div>

          {/* Progress bar */}
          {isLaundering && (
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-reverb-cyan">
                <span className="animate-pulse">TRANSFERT CYBER SECURISE...</span>
                <span>{launderingProgress}%</span>
              </div>
              <div className="w-full bg-reverb-dark h-3 rounded border border-reverb-cyan/20 overflow-hidden">
                <div
                  className="h-full bg-reverb-cyan shadow-glow-cyan transition-all duration-300"
                  style={{ width: `${launderingProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Action Trigger */}
          <button
            onClick={startLaundering}
            disabled={isLaundering || cashDirty <= 0 || launderingAmount > cashDirty}
            className={`w-full py-2.5 rounded font-display font-bold text-sm tracking-wider uppercase transition duration-300 ${
              isLaundering
                ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                : cashDirty <= 0
                ? "bg-gray-800 text-gray-500 cursor-not-allowed"
                : "bg-reverb-pink hover:bg-reverb-pink/80 text-white shadow-glow-pink"
            }`}
          >
            {isLaundering ? "LESSIVAGE EN COURS..." : "Blanchir Fonds Sales"}
          </button>

          {/* Notifications feed inside panel */}
          {feedback.type && (
            <div className={`p-3 rounded text-xs font-mono border ${
              feedback.type === "error"
                ? "bg-red-950/40 border-red-800 text-red-400"
                : feedback.type === "success"
                ? "bg-emerald-950/40 border-emerald-800 text-emerald-400"
                : "bg-reverb-cyan/5 border-reverb-cyan/20 text-reverb-cyan"
            }`}>
              {feedback.msg}
            </div>
          )}
        </div>

        {/* Right Side: Properties & Passive income management */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-5 bg-reverb-card border border-reverb-cyan/20 rounded-lg space-y-4">
            <div className="flex justify-between items-center border-b border-reverb-cyan/10 pb-2">
              <h2 className="font-display font-semibold text-reverb-cyan text-base flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-reverb-cyan" /> EMPIRE CRIMINEL ACTIF (VIRTUAL BOARD)
              </h2>
              <span className="text-xs font-mono text-gray-400">DIVIDENDES GENERES EN CONTINU</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {enterprises.map(ent => {
                const upgradeCost = ent.securityLevel * 20000;
                return (
                  <div
                    key={ent.id}
                    className="p-4 bg-reverb-dark/80 rounded border border-gray-800 flex flex-col justify-between space-y-3 relative overflow-hidden"
                  >
                    {/* Glowing side accent */}
                    <div className="absolute top-0 left-0 bottom-0 w-1 bg-reverb-cyan" />

                    <div>
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-display font-bold text-white text-sm">{ent.name}</h4>
                          <span className="text-[10px] font-mono text-gray-500 block">
                            📍 {ent.location.toUpperCase()}
                          </span>
                        </div>
                        <span className="text-[11px] font-mono px-2 py-0.5 bg-gray-800 rounded border border-gray-700 text-reverb-cyan font-bold">
                          +${ent.incomePerMin}/m
                        </span>
                      </div>

                      {/* Progress and security trackers */}
                      <div className="grid grid-cols-2 gap-3 mt-3.5 font-mono text-xs">
                        <div>
                          <span className="text-gray-500 block text-[9px]">STOCK ILLÉGAL</span>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="font-bold text-white">{ent.dirtyStock}%</span>
                            <div className="w-12 bg-gray-900 h-1.5 rounded overflow-hidden">
                              <div className="bg-reverb-pink h-full" style={{ width: `${ent.dirtyStock}%` }} />
                            </div>
                          </div>
                        </div>

                        <div>
                          <span className="text-gray-500 block text-[9px]">SÉCURITÉ BLINDÉE</span>
                          <div className="flex gap-0.5 mt-1">
                            {[1, 2, 3, 4, 5].map(i => (
                              <Shield
                                key={i}
                                className={`w-3.5 h-3.5 ${
                                  i <= ent.securityLevel
                                    ? "text-reverb-cyan fill-reverb-cyan"
                                    : "text-gray-700"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-gray-900/80 pt-2.5 flex justify-between items-center gap-2">
                      <div className="text-left font-mono">
                        <span className="text-[9px] text-gray-500 block">EN ATTENTE</span>
                        <span className="font-bold text-emerald-400 text-xs">
                          ${ent.cleanCashPending.toLocaleString()}
                        </span>
                      </div>

                      <div className="flex gap-1.5">
                        <button
                          onClick={() => upgradeSecurity(ent.id)}
                          disabled={ent.securityLevel >= 5 || cashClean < upgradeCost}
                          className="px-2 py-1 bg-reverb-dark border border-reverb-cyan/20 hover:border-reverb-cyan text-reverb-cyan text-[10px] font-mono rounded transition disabled:opacity-40"
                          title={`Améliorer la sécurité physique ($${upgradeCost.toLocaleString()})`}
                        >
                          +🛡️ Sec
                        </button>
                        <button
                          onClick={() => collectDividends(ent.id)}
                          disabled={ent.cleanCashPending <= 0}
                          className="px-2 py-1 bg-reverb-pink hover:bg-reverb-pink/80 text-white text-[10px] font-mono rounded font-bold transition disabled:opacity-30"
                        >
                          Collecter
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
