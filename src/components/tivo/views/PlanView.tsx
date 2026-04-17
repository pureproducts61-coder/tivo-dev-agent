import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { ThumbsUp, ThumbsDown, Copy, Check, ChevronDown, ChevronUp, User } from 'lucide-react';
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

const USER_MSG_COLLAPSE_THRESHOLD = 300;

export const PlanView = ({ messages, onFeedback }: PlanViewProps) => {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [feedbackState, setFeedbackState] = useState<Record<number, 'like' | 'dislike'>>({});
  const [expandedUserMsgs, setExpandedUserMsgs] = useState<Record<number, boolean>>({});

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
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
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
    <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-6 space-y-6 scrollbar-hide">
      <AnimatePresence initial={false}>
        {messages.map((msg, i) => {
          const isUser = msg.role === 'user';
          const isLongUserMsg = isUser && msg.content.length > USER_MSG_COLLAPSE_THRESHOLD;
          const isExpanded = expandedUserMsgs[i];

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="w-full"
            >
              {isUser ? (
                /* ===== USER MESSAGE — Edge-to-edge, header-aligned ===== */
                <div className="w-full">
                  <div className="flex items-center gap-2 mb-2 justify-end px-1">
                    <span className="text-[11px] font-semibold text-accent">আপনি</span>
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-accent/20 to-primary/20 flex items-center justify-center ring-1 ring-accent/20">
                      <User className="w-3.5 h-3.5 text-accent" />
                    </div>
                  </div>
                  <div className="rounded-2xl bg-primary/10 border border-primary/20 text-foreground px-4 py-3 sm:px-5 sm:py-4">
                    <p className={`whitespace-pre-wrap break-words text-[15px] leading-relaxed ${isLongUserMsg && !isExpanded ? 'line-clamp-4' : ''}`}>
                      {msg.content}
                    </p>
                    {isLongUserMsg && (
                      <button
                        onClick={() => setExpandedUserMsgs(prev => ({ ...prev, [i]: !isExpanded }))}
                        className="mt-2 flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
                      >
                        {isExpanded ? <><ChevronUp className="w-3.5 h-3.5" /> সংক্ষেপ করুন</> : <><ChevronDown className="w-3.5 h-3.5" /> সম্পূর্ণ দেখুন</>}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                /* ===== AI MESSAGE — Edge-to-edge, header-aligned ===== */
                <div className="w-full">
                  <div className="flex items-center gap-2 mb-2 px-1">
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center ring-1 ring-primary/20">
                      <BrandLogo size={16} />
                    </div>
                    <span className="text-[11px] font-semibold text-primary">TIVO AI</span>
                  </div>
                  <div className="rounded-2xl bg-muted/30 border border-border/50 text-foreground px-4 py-4 sm:px-5 sm:py-4 w-full">
                    <div className="prose prose-sm prose-invert max-w-none
                      prose-headings:text-foreground prose-headings:font-bold prose-headings:mt-4 prose-headings:mb-2
                      prose-h1:text-xl prose-h2:text-lg prose-h3:text-base
                      prose-p:text-[15px] prose-p:leading-7 prose-p:my-2 prose-p:text-foreground/90
                      prose-li:text-[14px] prose-li:my-0.5
                      prose-strong:text-primary prose-strong:font-semibold
                      prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:text-[13px] prose-code:font-mono
                      prose-pre:bg-background/80 prose-pre:border prose-pre:border-border/50 prose-pre:rounded-xl prose-pre:p-4 prose-pre:overflow-x-auto prose-pre:my-3
                      prose-a:text-primary prose-a:underline prose-a:underline-offset-2 hover:prose-a:text-primary/80
                      prose-blockquote:border-l-primary/50 prose-blockquote:bg-primary/5 prose-blockquote:rounded-r-lg prose-blockquote:py-1 prose-blockquote:px-4
                      prose-hr:border-border/30
                      prose-table:text-xs prose-th:bg-muted/40 prose-th:px-3 prose-th:py-2 prose-td:px-3 prose-td:py-2 prose-td:border-border/30
                      prose-img:rounded-xl prose-img:my-3
                    ">
                      <ReactMarkdown
                        components={{
                          a: ({ href, children }) => (
                            <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors">
                              {children}
                            </a>
                          ),
                          code: ({ className, children, ...props }) => {
                            const isInline = !className;
                            if (isInline) {
                              return <code className="text-primary bg-primary/10 px-1.5 py-0.5 rounded-md text-[13px] font-mono">{children}</code>;
                            }
                            return (
                              <div className="relative group my-3">
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(String(children));
                                      toast({ title: 'কোড কপি হয়েছে!' });
                                    }}
                                    className="p-1.5 rounded-lg bg-muted/80 hover:bg-muted text-muted-foreground hover:text-foreground text-xs backdrop-blur-sm"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <pre className="bg-background/80 border border-border/50 rounded-xl p-4 overflow-x-auto">
                                  <code className={className} {...props}>{children}</code>
                                </pre>
                              </div>
                            );
                          },
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {/* Feedback bar */}
                  <div className="flex items-center gap-0.5 mt-2 px-1">
                    <button
                      onClick={() => handleFeedback(i, 'like')}
                      className={`p-1.5 rounded-lg text-xs transition-all ${
                        feedbackState[i] === 'like'
                          ? 'bg-emerald-500/20 text-emerald-400 scale-110'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <ThumbsUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleFeedback(i, 'dislike')}
                      className={`p-1.5 rounded-lg text-xs transition-all ${
                        feedbackState[i] === 'dislike'
                          ? 'bg-red-500/20 text-red-400 scale-110'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <ThumbsDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleCopy(msg.content, i)}
                      className="p-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all"
                    >
                      {copiedIdx === i ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};
