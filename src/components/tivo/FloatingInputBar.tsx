import { useState, useRef, useEffect } from 'react';
import { Send, Mic, Paperclip, Hammer, Zap, MessageSquare, ChevronUp } from 'lucide-react';
import { useAppMode, AppMode } from '@/hooks/useAppMode';
import { motion, AnimatePresence } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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
  const [modePopoverOpen, setModePopoverOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { mode, setMode } = useAppMode();

  const currentMode = modes.find(m => m.id === mode)!;

  // Auto-expand textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 200) + 'px';
    }
  }, [input]);

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

  const handleModeSelect = (modeId: AppMode) => {
    setMode(modeId);
    setModePopoverOpen(false);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="max-w-4xl mx-auto">
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

        {/* Input area */}
        <div className="glass-card rounded-2xl flex items-end gap-2 p-2">
          {/* Mode selector popup */}
          <Popover open={modePopoverOpen} onOpenChange={setModePopoverOpen}>
            <PopoverTrigger asChild>
              <button className={`p-2 rounded-xl hover:bg-muted/50 transition-colors shrink-0 flex items-center gap-1 ${currentMode.color}`}>
                <currentMode.icon className="w-5 h-5" />
                <ChevronUp className="w-3 h-3" />
              </button>
            </PopoverTrigger>
            <PopoverContent side="top" align="start" className="w-44 p-1 glass-card border-border">
              {modes.map((m) => (
                <button
                  key={m.id}
                  onClick={() => handleModeSelect(m.id)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    mode === m.id ? `bg-primary/15 ${m.color}` : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <m.icon className="w-4 h-4" />
                  {m.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          <button
            onClick={() => fileRef.current?.click()}
            className="p-2 rounded-xl hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <Paperclip className="w-5 h-5" />
          </button>
          <input type="file" ref={fileRef} className="hidden" multiple onChange={handleFileChange} />

          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="আপনার নির্দেশ লিখুন..."
            rows={1}
            className="flex-1 bg-transparent resize-none outline-none text-foreground placeholder:text-muted-foreground text-sm py-2"
            style={{ minHeight: '2.25rem', maxHeight: '200px' }}
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
