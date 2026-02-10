import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useAppMode } from '@/hooks/useAppMode';
import { useBackendConfig } from '@/hooks/useBackendConfig';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/tivo/Header';
import { FloatingInputBar } from '@/components/tivo/FloatingInputBar';
import { SettingsModal } from '@/components/tivo/SettingsModal';
import { ModeSwitchDialog } from '@/components/tivo/ModeSwitchDialog';
import { PlanView } from '@/components/tivo/views/PlanView';
import { BuildView } from '@/components/tivo/views/BuildView';
import { AutomationView } from '@/components/tivo/views/AutomationView';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

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

  const handleSend = useCallback(async (message: string) => {
    if (!message.trim()) return;

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
            }),
          }
        );

        if (!resp.ok) throw new Error('AI error');
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
            if (!line.startsWith('data: ') || line.trim() === '') continue;
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
            } catch {}
          }
        }
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'ত্রুটি', description: e.message });
    } finally {
      setIsLoading(false);
    }
  }, [messages, mode]);

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

      <main className="flex-1 flex flex-col pt-14 md:pt-14 pb-40">
        {mode === 'plan' && <PlanView messages={messages} />}
        {mode === 'build' && <BuildView projects={buildProjects} />}
        {mode === 'automation' && <AutomationView logs={automationLogs} />}
      </main>

      <FloatingInputBar onSend={handleSend} isLoading={isLoading} />
      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <ModeSwitchDialog />
    </div>
  );
};

export default Dashboard;
