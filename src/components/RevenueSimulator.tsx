import { useMemo } from "react";
import { motion } from "motion/react";
import { TrendingUp, Building2 } from "lucide-react";
import { useI18n } from "../i18n";
import { GameState } from "../types";

interface Props {
  empire: GameState["empire"];
}

const DAY_LABELS = ["J+1", "J+2", "J+3", "J+4", "J+5", "J+6", "J+7"];

export default function RevenueSimulator({ empire }: Props) {
  const { t } = useI18n();

  const activeEnterprises = empire.enterprises.filter(e => e.status === "active");

  const incomePerDay = useMemo(() => {
    const totalPerMin = activeEnterprises.reduce((sum, e) => sum + e.incomePerMin, 0);
    return totalPerMin * 60 * 24;
  }, [activeEnterprises]);

  // 7-day projection with slight random variance for realism
  const days = useMemo(() => {
    return DAY_LABELS.map((label, i) => {
      const variance = 1 + (Math.sin(i * 1.7) * 0.08);
      const raided = activeEnterprises.some(e => e.status === "raided") ? 0.75 : 1;
      return { label, value: Math.round(incomePerDay * variance * raided * (1 + i * 0.02)) };
    });
  }, [incomePerDay, activeEnterprises]);

  const maxVal = Math.max(...days.map(d => d.value), 1);
  const total7 = days.reduce((s, d) => s + d.value, 0);

  return (
    <div className="bg-reverb-card border border-reverb-cyan/20 rounded-lg p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-reverb-cyan/10 pb-3">
        <h3 className="font-display font-bold text-reverb-cyan text-sm flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          {t("revenue.title")}
        </h3>
        <span className="font-mono text-[10px] text-gray-500">
          {activeEnterprises.length} {t("revenue.enterprises")}
        </span>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-reverb-dark rounded p-3 border border-gray-800">
          <span className="font-mono text-[10px] text-gray-500 block">{t("revenue.daily")}</span>
          <span className="font-display font-bold text-emerald-400 text-lg">
            ${incomePerDay.toLocaleString()}
          </span>
        </div>
        <div className="bg-reverb-dark rounded p-3 border border-gray-800">
          <span className="font-mono text-[10px] text-gray-500 block">{t("revenue.total")}</span>
          <span className="font-display font-bold text-reverb-cyan text-lg">
            ${total7.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-2 h-28 pt-2">
        {days.map((day, i) => (
          <div key={day.label} className="flex-1 flex flex-col items-center gap-1">
            <span className="font-mono text-[9px] text-gray-500">
              ${Math.round(day.value / 1000)}k
            </span>
            <motion.div
              className="w-full bg-reverb-cyan/70 rounded-t"
              style={{ height: `${(day.value / maxVal) * 80}px` }}
              initial={{ height: 0 }}
              animate={{ height: `${(day.value / maxVal) * 80}px` }}
              transition={{ duration: 0.4, delay: i * 0.06, ease: "easeOut" }}
            />
            <span className="font-mono text-[9px] text-gray-600">{day.label}</span>
          </div>
        ))}
      </div>

      {/* Enterprises breakdown */}
      <div className="space-y-1.5 border-t border-gray-800 pt-3">
        {activeEnterprises.map(e => (
          <div key={e.id} className="flex items-center justify-between font-mono text-[10px]">
            <span className="flex items-center gap-1.5 text-gray-400">
              <Building2 className="w-3 h-3 text-reverb-cyan/60" />
              {e.name}
            </span>
            <span className="text-emerald-400 font-bold">
              +${e.incomePerMin}{t("revenue.permin")}
            </span>
          </div>
        ))}
        {activeEnterprises.length === 0 && (
          <p className="text-center text-gray-600 text-[10px] py-2">{t("revenue.noEnterprises")}</p>
        )}
      </div>
    </div>
  );
}
