import { useState, useRef } from 'react';
import { Send, Mic, Paperclip, Hammer, Zap, MessageSquare } from 'lucide-react';
import { useAppMode, AppMode } from '@/hooks/useAppMode';
import { motion, AnimatePresence } from 'framer-motion';

const modes: { id: AppMode; label: string; icon: typeof Hammer; color: string }[] = [
  { id: 'build', label: 'Build', icon: Hammer, color: 'text-primary' },
  { id: 'automation', label: 'Automation', icon: Zap, color: 'text-secondary' },
  { id: 'plan', label: 'Plan', icon: MessageSquare, color: 'text-accent' },
];

interface FloatingInputBarProps {
  onSend: (message: string, attachments?: File[]) => void;
  isLoading?: boolean;
}

export const FloatingInputBar = ({ onSend, isLoading }: FloatingInputBarProps) => {
  const [input, setInput] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { mode, setMode } = useAppMode();

  const handleSend = () => {
    if (!input.trim() && attachments.length === 0) return;
    onSend(input, attachments);
    setInput('');
    setAttachments([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="max-w-3xl mx-auto">
        {/* Attachments preview */}
        <AnimatePresence>
          {attachments.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="flex gap-2 mb-2 px-2 flex-wrap"
            >
              {attachments.map((f, i) => (
                <span key={i} className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground flex items-center gap-1">
                  {f.name}
                  <button onClick={() => setAttachments(a => a.filter((_, j) => j !== i))} className="hover:text-foreground">×</button>
                </span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mode selector */}
        <div className="flex items-center gap-1 mb-2 px-1">
          {modes.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                mode === m.id
                  ? `glass-card ${m.color} border-current/20`
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <m.icon className="w-3 h-3" />
              {m.label}
            </button>
          ))}
        </div>

        {/* Input area */}
        <div className="glass-card rounded-2xl flex items-end gap-2 p-2">
          <button
            onClick={() => fileRef.current?.click()}
            className="p-2 rounded-xl hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input type="file" ref={fileRef} className="hidden" multiple onChange={handleFileChange} />

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="আপনার নির্দেশ লিখুন..."
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-foreground placeholder:text-muted-foreground text-sm py-2 max-h-32"
            style={{ minHeight: '2.25rem' }}
          />

          <button
            onClick={() => setIsRecording(!isRecording)}
            className={`p-2 rounded-xl transition-colors shrink-0 ${
              isRecording ? 'bg-destructive/20 text-destructive' : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
            }`}
          >
            <Mic className="w-5 h-5" />
          </button>

          <button
            onClick={handleSend}
            disabled={isLoading || (!input.trim() && attachments.length === 0)}
            className="p-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
