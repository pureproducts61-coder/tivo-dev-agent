import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Edit3 } from 'lucide-react';

interface ActionConfirmationProps {
  action: string | null;
  onConfirm: () => void;
  onModify: () => void;
}

export const ActionConfirmation = ({ action, onConfirm, onModify }: ActionConfirmationProps) => {
  return (
    <AnimatePresence>
      {action && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-28 left-0 right-0 z-40 flex justify-center px-4"
        >
          <div className="glass-card rounded-2xl p-4 max-w-lg w-full space-y-3">
            <p className="text-sm text-foreground font-medium text-center">
              ⚠️ সংবেদনশীল কাজ: <strong>{action}</strong>
            </p>
            <div className="flex gap-3">
              <button
                onClick={onConfirm}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors"
              >
                <CheckCircle className="w-5 h-5" />
                Confirm & Execute
              </button>
              <button
                onClick={onModify}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors"
              >
                <Edit3 className="w-5 h-5" />
                Modify Plan
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
