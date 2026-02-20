import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, Copy, Check } from 'lucide-react';
import { BrandLogo } from '../BrandLogo';
import { toast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface PlanViewProps {
  messages: Message[];
  onFeedback?: (index: number, type: 'like' | 'dislike') => void;
}

export const PlanView = ({ messages, onFeedback }: PlanViewProps) => {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [feedbackState, setFeedbackState] = useState<Record<number, 'like' | 'dislike'>>({});

  const handleCopy = (content: string, idx: number) => {
    navigator.clipboard.writeText(content);
    setCopiedIdx(idx);
    toast({ title: 'কপি হয়েছে!' });
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleFeedback = (idx: number, type: 'like' | 'dislike') => {
    setFeedbackState(prev => ({ ...prev, [idx]: type }));
    onFeedback?.(idx, type);
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <BrandLogo size={40} />
          </div>
          <h2 className="text-2xl font-bold gradient-text">TIVO DEV AGENT</h2>
          <p className="text-muted-foreground max-w-md">
            আপনার AI-চালিত ডেভেলপমেন্ট কমান্ড সেন্টার। নিচে প্রম্পট লিখে শুরু করুন।
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-2 sm:px-4 py-4 space-y-4 scrollbar-hide">
      <AnimatePresence initial={false}>
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            {/* Message bubble */}
            <div
              className={`rounded-2xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-primary/15 text-foreground max-w-[75%]'
                  : 'glass-card text-foreground w-full max-w-full'
              }`}
            >
              <div className={`prose prose-sm prose-invert max-w-none ${msg.role === 'assistant' ? 'prose-pre:overflow-x-auto' : ''}`}>
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>

            {/* Feedback buttons for assistant */}
            {msg.role === 'assistant' && msg.content && (
              <div className="flex items-center gap-1 mt-1.5 ml-1">
                <button
                  onClick={() => handleFeedback(i, 'like')}
                  className={`p-1.5 rounded-lg text-xs transition-colors ${
                    feedbackState[i] === 'like'
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleFeedback(i, 'dislike')}
                  className={`p-1.5 rounded-lg text-xs transition-colors ${
                    feedbackState[i] === 'dislike'
                      ? 'bg-red-500/20 text-red-400'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <ThumbsDown className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => handleCopy(msg.content, i)}
                  className="p-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  {copiedIdx === i ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
