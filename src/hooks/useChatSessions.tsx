import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface ChatSession {
  id: string;
  title: string;
  updated_at: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const useChatSessions = () => {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Load sessions
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from('chat_sessions')
        .select('id, title, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (data) setSessions(data);
    };
    load();
  }, [user]);

  // Load messages when session changes
  useEffect(() => {
    if (!activeSessionId || !user) {
      setMessages([]);
      return;
    }
    const load = async () => {
      setLoadingMessages(true);
      const { data } = await supabase
        .from('chat_messages')
        .select('role, content')
        .eq('session_id', activeSessionId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (data) setMessages(data.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })));
      setLoadingMessages(false);
    };
    load();
  }, [activeSessionId, user]);

  const createSession = useCallback(async (title?: string) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('chat_sessions')
      .insert({ user_id: user.id, title: title || 'নতুন চ্যাট' })
      .select('id, title, updated_at')
      .single();
    if (data) {
      setSessions(prev => [data, ...prev]);
      setActiveSessionId(data.id);
      setMessages([]);
      return data.id;
    }
    return null;
  }, [user]);

  const addMessage = useCallback(async (role: 'user' | 'assistant', content: string) => {
    if (!activeSessionId || !user) return;
    await supabase.from('chat_messages').insert({
      session_id: activeSessionId,
      user_id: user.id,
      role,
      content,
    });
    // Update session title from first user message
    if (role === 'user' && messages.length === 0) {
      const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
      await supabase.from('chat_sessions').update({ title }).eq('id', activeSessionId);
      setSessions(prev => prev.map(s => s.id === activeSessionId ? { ...s, title } : s));
    }
  }, [activeSessionId, user, messages.length]);

  const deleteSession = useCallback(async (id: string) => {
    await supabase.from('chat_sessions').delete().eq('id', id);
    setSessions(prev => prev.filter(s => s.id !== id));
    if (activeSessionId === id) {
      setActiveSessionId(null);
      setMessages([]);
    }
  }, [activeSessionId]);

  return {
    sessions,
    activeSessionId,
    setActiveSessionId,
    messages,
    setMessages,
    loadingMessages,
    createSession,
    addMessage,
    deleteSession,
  };
};
