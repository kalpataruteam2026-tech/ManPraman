import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { useToast } from '../../lib/toast';

const ICONS = { success: CheckCircle2, error: XCircle, info: Info } as const;
const TONE = {
  success: 'text-pass-fg',
  error: 'text-fail-fg',
  info: 'text-accent-600',
} as const;

export function Toaster() {
  const toasts = useToast((s) => s.toasts);
  const dismiss = useToast((s) => s.dismiss);
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-full max-w-sm flex-col gap-2.5">
      <AnimatePresence>
        {toasts.map((t) => {
          const Icon = ICONS[t.kind];
          return (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 40, scale: 0.96 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40, scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              className="pointer-events-auto flex items-start gap-3 rounded-xl2 border border-line bg-white/90 p-3.5 shadow-panel backdrop-blur"
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${TONE[t.kind]}`} />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-ink">{t.title}</div>
                {t.message && <div className="mt-0.5 text-xs text-ink-faint">{t.message}</div>}
              </div>
              <button onClick={() => dismiss(t.id)} className="text-ink-faint hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
