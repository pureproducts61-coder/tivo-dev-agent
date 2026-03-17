import { useState, useRef, useEffect } from 'react';
import { Send, Mic, Paperclip, Sparkles, ChevronUp } from 'lucide-react';
import { useAppMode, AppMode } from '@/hooks/useAppMode';
import { motion, AnimatePresence } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const modes: { id: AppMode; label: string; emoji: string }[] = [
  { id: 'plan', label: 'Chat', emoji: '💬' },
  { id: 'build', label: 'Build', emoji: '🔨' },
  { id: 'automation', label: 'Auto', emoji: '⚡' },
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
    if (e.target.files) setAttachments(prev => [...prev, ...Array.from(e.target.files!)]);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="max-w-3xl mx-auto">
        {/* Attachments */}
        <AnimatePresence>
          {attachments.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="flex gap-2 mb-2 px-2 flex-wrap">
              {attachments.map((f, i) => (
                <span key={i} className="text-xs bg-muted px-2 py-1 rounded-md text-muted-foreground flex items-center gap-1">
                  {f.name}
                  <button onClick={() => setAttachments(a => a.filter((_, j) => j !== i))} className="hover:text-foreground">×</button>
                </span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main card-style input */}
        <div className="glass-card rounded-2xl p-3 space-y-2">
          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="আপনার নির্দেশ লিখুন..."
            rows={1}
            className="w-full bg-transparent resize-none outline-none text-foreground placeholder:text-muted-foreground text-sm py-1 px-1"
            style={{ minHeight: '2.25rem', maxHeight: '200px' }}
          />

          {/* Bottom action row with 4 round buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {/* AI Mode Button */}
              <Popover open={modePopoverOpen} onOpenChange={setModePopoverOpen}>
                <PopoverTrigger asChild>
                  <button className="w-10 h-10 rounded-full bg-primary/15 hover:bg-primary/25 flex items-center justify-center transition-all text-lg active:scale-95 ring-2 ring-primary/20">
                    <span>{currentMode.emoji}</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent side="top" align="start" className="w-40 p-1 glass-card border-border">
                  {modes.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setMode(m.id); setModePopoverOpen(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        mode === m.id ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <span>{m.emoji}</span> {m.label}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>

              {/* Voice Button */}
              <button
                onClick={() => setIsRecording(!isRecording)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-95 ring-2 ${
                  isRecording
                    ? 'bg-destructive/20 text-destructive ring-destructive/30 animate-pulse'
                    : 'bg-secondary/15 hover:bg-secondary/25 text-secondary ring-secondary/20'
                }`}
              >
                <Mic className="w-5 h-5" />
              </button>

              {/* File Share Button */}
              <button
                onClick={() => fileRef.current?.click()}
                className="w-10 h-10 rounded-full bg-accent/15 hover:bg-accent/25 flex items-center justify-center transition-all active:scale-95 ring-2 ring-accent/20 text-accent"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              <input type="file" ref={fileRef} className="hidden" multiple onChange={handleFileChange} />
            </div>

            {/* Submit Button */}
            <button
              onClick={handleSend}
              disabled={isLoading || (!input.trim() && attachments.length === 0)}
              className="w-12 h-12 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground flex items-center justify-center transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ring-2 ring-primary/30 shadow-lg shadow-primary/20"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
