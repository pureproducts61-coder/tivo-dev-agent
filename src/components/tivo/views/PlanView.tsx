import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface PlanViewProps {
  messages: Message[];
}

export const PlanView = ({ messages }: PlanViewProps) => {
  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-4"
        >
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Bot className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-bold gradient-text">TIVO AI Agent</h2>
          <p className="text-muted-foreground max-w-md">
            আপনার AI-চালিত ফ্রন্টএন্ড কমান্ড সেন্টার। নিচে প্রম্পট লিখে শুরু করুন।
          </p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 scrollbar-hide">
      <AnimatePresence initial={false}>
        {messages.map((msg, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
          >
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-1">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-primary/15 text-foreground'
                  : 'glass-card text-foreground'
              }`}
            >
              <div className="prose prose-sm prose-invert max-w-none">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-1">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
