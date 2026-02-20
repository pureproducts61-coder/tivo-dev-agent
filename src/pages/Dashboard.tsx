import { useState, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAppMode } from '@/hooks/useAppMode';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/tivo/Header';
import { FloatingInputBar } from '@/components/tivo/FloatingInputBar';
import { SettingsModal } from '@/components/tivo/SettingsModal';
import { ModeSwitchDialog } from '@/components/tivo/ModeSwitchDialog';
import { ActionConfirmation } from '@/components/tivo/ActionConfirmation';
import { PlanView } from '@/components/tivo/views/PlanView';
import { BuildView } from '@/components/tivo/views/BuildView';
import { AutomationView } from '@/components/tivo/views/AutomationView';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const BOSS_NAME = 'Sheikh Razwan Bin Roushon';

// Detect sensitive actions in AI response
const SENSITIVE_ACTIONS = ['push to github', 'deploy to vercel', 'publish', 'delete', 'drop table'];

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

const Dashboard = () => {
  const { user, loading } = useAuth();
  const { mode } = useAppMode();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('automated');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [buildProjects, setBuildProjects] = useState<any[]>([]);
  const [automationLogs, setAutomationLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isBoss, setIsBoss] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .then(({ data }) => {
        if (data) setBuildProjects(data);
      });
  }, [user]);

  const checkForSensitiveAction = (text: string) => {
    const lower = text.toLowerCase();
    for (const action of SENSITIVE_ACTIONS) {
      if (lower.includes(action)) {
        return action;
      }
    }
    return null;
  };

  const handleFeedback = useCallback(async (msgIndex: number, type: 'like' | 'dislike') => {
    if (type === 'dislike') {
      // AI apologizes and asks for feedback
      const apologyMsg: Message = {
        role: 'assistant',
        content: '😔 দুঃখিত! আমার উত্তরটি সন্তোষজনক হয়নি। অনুগ্রহ করে বলুন কোথায় ভুল হয়েছে বা কী ধরনের উত্তর আপনি চাইছিলেন, আমি আবার চেষ্টা করবো।'
      };
      setMessages(prev => [...prev, apologyMsg]);
    }
  }, []);

  const handleSend = useCallback(async (message: string) => {
    if (!message.trim()) return;

    // Boss check
    if (message.trim() === `I'm ${BOSS_NAME}` || message.trim() === `I'm ${BOSS_NAME}`) {
      setIsBoss(true);
      const bossMsg: Message = {
        role: 'assistant',
        content: `✅ স্বাগতম, **${BOSS_NAME}**! আপনার সম্পূর্ণ অ্যাডমিন/এক্সিকিউশন অ্যাক্সেস সক্রিয় করা হয়েছে। আপনি এখন সব কমান্ড চালাতে পারবেন।`
      };
      setMessages(prev => [...prev, { role: 'user', content: message }, bossMsg]);
      return;
    }

    const userMsg: Message = { role: 'user', content: message };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      if (mode === 'plan') {
        const allMessages = [...messages, userMsg];
        let assistantSoFar = '';

        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/project-chat`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            },
            body: JSON.stringify({
              messages: allMessages.map(m => ({ role: m.role, content: m.content })),
              isBoss,
            }),
          }
        );

        if (!resp.ok) {
          if (resp.status === 429) {
            toast({ variant: 'destructive', title: 'রেট লিমিট', description: 'অনুগ্রহ করে কিছুক্ষণ পর আবার চেষ্টা করুন।' });
            return;
          }
          if (resp.status === 402) {
            toast({ variant: 'destructive', title: 'ক্রেডিট শেষ', description: 'অনুগ্রহ করে ক্রেডিট যোগ করুন।' });
            return;
          }
          throw new Error('AI error');
        }
        if (!resp.body) throw new Error('No stream');

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let newlineIdx: number;
          while ((newlineIdx = buffer.indexOf('\n')) !== -1) {
            let line = buffer.slice(0, newlineIdx);
            buffer = buffer.slice(newlineIdx + 1);
            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (line.startsWith(':') || line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;
            const json = line.slice(6).trim();
            if (json === '[DONE]') break;
            try {
              const parsed = JSON.parse(json);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantSoFar += content;
                setMessages(prev => {
                  const last = prev[prev.length - 1];
                  if (last?.role === 'assistant') {
                    return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
                  }
                  return [...prev, { role: 'assistant', content: assistantSoFar }];
                });
              }
            } catch {
              buffer = line + '\n' + buffer;
              break;
            }
          }
        }

        // Check for sensitive actions in final response
        const sensitiveAction = checkForSensitiveAction(assistantSoFar);
        if (sensitiveAction) {
          setPendingAction(sensitiveAction);
        }
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'ত্রুটি', description: e.message });
    } finally {
      setIsLoading(false);
    }
  }, [messages, mode, isBoss]);

  const handleConfirmAction = () => {
    toast({ title: '✅ কার্যকর করা হচ্ছে', description: `"${pendingAction}" চলছে...` });
    setPendingAction(null);
  };

  const handleModifyAction = () => {
    const modifyMsg: Message = {
      role: 'assistant',
      content: '🔄 ঠিক আছে, পরিকল্পনা পরিবর্তন করা যাক। আপনি কী পরিবর্তন চান তা বলুন।'
    };
    setMessages(prev => [...prev, modifyMsg]);
    setPendingAction(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header activeTab={activeTab} onTabChange={setActiveTab} onOpenSettings={() => setSettingsOpen(true)} />

      <main className="flex-1 flex flex-col pt-14 md:pt-14 pb-28">
        {mode === 'plan' && <PlanView messages={messages} onFeedback={handleFeedback} />}
        {mode === 'build' && <BuildView projects={buildProjects} />}
        {mode === 'automation' && <AutomationView logs={automationLogs} />}
      </main>

      <FloatingInputBar onSend={handleSend} isLoading={isLoading} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ModeSwitchDialog />
      <ActionConfirmation
        action={pendingAction}
        onConfirm={handleConfirmAction}
        onModify={handleModifyAction}
      />
    </div>
  );
};

export default Dashboard;
