import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Tv, TrendingUp, Mail, Server, ChevronRight, X } from "lucide-react";
import { useI18n } from "../i18n";

const STORAGE_KEY = "reverb-onboarding-v1";

export function isOnboardingDone(): boolean {
  return !!localStorage.getItem(STORAGE_KEY);
}

interface Props {
  onDone: () => void;
}

const STEPS = [
  { icon: Tv,          titleKey: "onboarding.1.title" as const, descKey: "onboarding.1.desc" as const, color: "text-reverb-cyan",  border: "border-reverb-cyan/40",  bg: "bg-reverb-cyan/10"  },
  { icon: TrendingUp,  titleKey: "onboarding.2.title" as const, descKey: "onboarding.2.desc" as const, color: "text-reverb-pink",  border: "border-reverb-pink/40",  bg: "bg-reverb-pink/10"  },
  { icon: Mail,        titleKey: "onboarding.3.title" as const, descKey: "onboarding.3.desc" as const, color: "text-emerald-400", border: "border-emerald-400/40", bg: "bg-emerald-400/10" },
  { icon: Server,      titleKey: "onboarding.4.title" as const, descKey: "onboarding.4.desc" as const, color: "text-reverb-cyan",  border: "border-reverb-cyan/40",  bg: "bg-reverb-cyan/10"  },
];

export default function OnboardingTutorial({ onDone }: Props) {
  const { t } = useI18n();
  const [step, setStep] = useState(0);

  const finish = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    onDone();
  };

  const current = STEPS[step];
  const Icon = current.icon;
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[90] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, scale: 0.94, y: 16 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: -10 }}
          transition={{ type: "spring", stiffness: 340, damping: 26 }}
          className={`bg-reverb-card border ${current.border} rounded-xl p-6 max-w-sm w-full font-mono shadow-2xl`}
        >
          {/* Step indicator */}
          <div className="flex justify-between items-center mb-5">
            <div className="flex gap-1.5">
              {STEPS.map((_, i) => (
                <span
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === step ? `w-6 ${current.color.replace("text-", "bg-")}` : "w-2 bg-gray-700"
                  }`}
                />
              ))}
            </div>
            <button onClick={finish} className="text-gray-600 hover:text-gray-300 transition">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Icon */}
          <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl border ${current.border} ${current.bg} mb-4`}>
            <Icon className={`w-7 h-7 ${current.color}`} />
          </div>

          {/* Content */}
          <h2 className={`font-display font-extrabold text-lg tracking-wider mb-2 ${current.color}`}>
            {t(current.titleKey)}
          </h2>
          <p className="text-gray-300 text-[13px] leading-relaxed mb-6">
            {t(current.descKey)}
          </p>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={finish}
              className="text-gray-500 hover:text-gray-300 text-[11px] uppercase tracking-wider transition px-3 py-2"
            >
              {t("onboarding.skip")}
            </button>
            <button
              onClick={() => isLast ? finish() : setStep(s => s + 1)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-display font-bold text-sm uppercase tracking-wider transition ${
                isLast
                  ? "bg-reverb-pink hover:bg-reverb-pink/85 text-white shadow-glow-pink"
                  : `${current.bg} border ${current.border} ${current.color} hover:opacity-80`
              }`}
            >
              {isLast ? t("onboarding.done") : t("onboarding.next")}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
