import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAppMode } from '@/hooks/useAppMode';
import { useTokens } from '@/hooks/useTokens';
import { useAdmin } from '@/hooks/useAdmin';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/tivo/Header';
import { AppSidebar } from '@/components/tivo/AppSidebar';
import { FloatingInputBar } from '@/components/tivo/FloatingInputBar';
import { SettingsModal } from '@/components/tivo/SettingsModal';
import { ModeSwitchDialog } from '@/components/tivo/ModeSwitchDialog';
import { ActionConfirmation } from '@/components/tivo/ActionConfirmation';
import { AdminDashboard } from '@/components/tivo/AdminDashboard';
import { CentralCard } from '@/components/tivo/CentralCard';
import { PlanView } from '@/components/tivo/views/PlanView';
import { BuildView } from '@/components/tivo/views/BuildView';
import { AutomationView } from '@/components/tivo/views/AutomationView';
import { useChatSessions } from '@/hooks/useChatSessions';
import { toast } from '@/hooks/use-toast';

const SENSITIVE_ACTIONS = ['push to github', 'deploy to vercel', 'publish', 'delete', 'drop table', 'update now', 'rollback'];

const Dashboard = () => {
  const { user, loading } = useAuth();
  const { mode } = useAppMode();
  const { tokens } = useTokens();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('automated');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const {
    sessions, activeSessionId, setActiveSessionId,
    messages, setMessages, createSession, addMessage, deleteSession,
  } = useChatSessions();

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  const checkForSensitiveAction = (text: string) => {
    const lower = text.toLowerCase();
    for (const action of SENSITIVE_ACTIONS) {
      if (lower.includes(action)) return action;
    }
    return null;
  };

  const handleFeedback = useCallback(async (msgIndex: number, type: 'like' | 'dislike') => {
    if (type === 'dislike') {
      setMessages(prev => [...prev, { role: 'assistant', content: '😔 দুঃখিত! আমার উত্তরটি সন্তোষজনক হয়নি। অনুগ্রহ করে বলুন কোথায় ভুল হয়েছে।' }]);
    }
  }, [setMessages]);

  const handleSend = useCallback(async (message: string) => {
    if (!message.trim()) return;

    let sessionId = activeSessionId;
    if (!sessionId) {
      sessionId = await createSession(message.slice(0, 50));
      if (!sessionId) return;
    }

    const userMsg = { role: 'user' as const, content: message };
    setMessages(prev => [...prev, userMsg]);
    await addMessage('user', message);
    setIsLoading(true);

    try {
      if (mode === 'plan') {
        const allMessages = [...messages, userMsg];
        const systemContext = [
          tokens.GITHUB_TOKEN ? 'User has GitHub token configured.' : '',
          tokens.VERCEL_TOKEN ? 'User has Vercel token configured.' : '',
          isAdmin ? 'User is admin with full access.' : '',
        ].filter(Boolean).join(' ');

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
              systemContext,
              isAdmin,
            }),
          }
        );

        if (!resp.ok) {
          if (resp.status === 429) {
            toast({ variant: 'destructive', title: 'রেট লিমিট', description: 'কিছুক্ষণ পর চেষ্টা করুন।' });
            return;
          }
          if (resp.status === 402) {
            toast({ variant: 'destructive', title: 'ক্রেডিট শেষ', description: 'ক্রেডিট যোগ করুন।' });
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

        if (assistantSoFar) await addMessage('assistant', assistantSoFar);
        const sensitiveAction = checkForSensitiveAction(assistantSoFar);
        if (sensitiveAction) setPendingAction(sensitiveAction);
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'ত্রুটি', description: e.message });
    } finally {
      setIsLoading(false);
    }
  }, [messages, mode, tokens, activeSessionId, createSession, addMessage, setMessages, isAdmin]);

  const handleConfirmAction = () => {
    toast({ title: '✅ কার্যকর হচ্ছে', description: `"${pendingAction}" চলছে...` });
    setPendingAction(null);
  };

  const handleModifyAction = () => {
    setMessages(prev => [...prev, { role: 'assistant', content: '🔄 পরিকল্পনা পরিবর্তন করা যাক। কী চান বলুন।' }]);
    setPendingAction(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const showCentralCard = mode === 'plan' && messages.length === 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenAdmin={() => setAdminOpen(true)}
      />

      <div className="flex-1 flex pt-14">
        <AppSidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          activeSessionId={activeSessionId}
          onSessionSelect={setActiveSessionId}
          onNewSession={() => createSession()}
          sessions={sessions}
          onDeleteSession={deleteSession}
        />

        <main className="flex-1 flex flex-col pb-32 min-w-0">
          {showCentralCard && <CentralCard />}
          {mode === 'plan' && messages.length > 0 && <PlanView messages={messages} onFeedback={handleFeedback} />}
          {mode === 'build' && <BuildView />}
          {mode === 'automation' && <AutomationView />}
        </main>
      </div>

      <FloatingInputBar onSend={handleSend} isLoading={isLoading} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <AdminDashboard open={adminOpen} onClose={() => setAdminOpen(false)} />
      <ModeSwitchDialog />
      <ActionConfirmation action={pendingAction} onConfirm={handleConfirmAction} onModify={handleModifyAction} />
    </div>
  );
};

export default Dashboard;
