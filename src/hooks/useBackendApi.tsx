import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Backend connection config
const getHfUrl = () => {
  // Try Vercel env vars first, then localStorage fallback
  return import.meta.env.VITE_HF_SPACE_URL || localStorage.getItem('tivo_backend_url') || '';
};

const getMasterSecret = () => {
  return import.meta.env.VITE_MASTER_SECRET || localStorage.getItem('tivo_master_secret') || '';
};

export type ConnectionStatus = 'connected' | 'disconnected' | 'checking' | 'sleeping';

interface BackendApiContextType {
  status: ConnectionStatus;
  isConnected: boolean;
  backendUrl: string;
  checkConnection: () => Promise<any>;
  // AI Engine
  chatStream: (messages: any[], options?: any) => Promise<ReadableStream | null>;
  autoBuild: (prompt: string, options?: any) => Promise<any>;
  fullStackBuild: (prompt: string, options?: any) => Promise<any>;
  buildNative: (projectId: string, platform: 'apk' | 'exe') => Promise<any>;
  reviewCode: (code: string, lang?: string) => Promise<any>;
  fixCode: (code: string, error: string) => Promise<any>;
  refactorCode: (code: string, instructions: string) => Promise<any>;
  convertCode: (code: string, from: string, to: string) => Promise<any>;
  generateApi: (spec: any) => Promise<any>;
  generateDocs: (code: string) => Promise<any>;
  suggest: (input: string) => Promise<any>;
  // Project Manager
  listProjects: () => Promise<any>;
  getProject: (id: string) => Promise<any>;
  createProject: (data: any) => Promise<any>;
  updateProject: (id: string, data: any) => Promise<any>;
  deleteProject: (id: string) => Promise<any>;
  uploadFiles: (projectId: string, files: File[]) => Promise<any>;
  publishProject: (projectId: string, target: string) => Promise<any>;
  downloadProject: (projectId: string) => Promise<Blob | null>;
  getVersions: (projectId: string) => Promise<any>;
  getPublicUrl: (projectId: string) => Promise<any>;
  // Sandbox & Testing
  validateCode: (code: string) => Promise<any>;
  auditCode: (code: string) => Promise<any>;
  visualAudit: (url: string) => Promise<any>;
  generateTests: (code: string) => Promise<any>;
  autoTestFix: (code: string, testResults: any) => Promise<any>;
  optimizeCode: (code: string) => Promise<any>;
  factory: (template: string, options?: any) => Promise<any>;
  executeCode: (code: string, lang?: string) => Promise<any>;
  codeToImage: (code: string, options?: any) => Promise<any>;
  generateSchema: (description: string) => Promise<any>;
  analyzeDeps: (packageJson: any) => Promise<any>;
  // System & Monitoring
  getHealth: () => Promise<any>;
  getStats: () => Promise<any>;
  getLogs: (limit?: number) => Promise<any>;
  frontendGuide: (feature: string) => Promise<any>;
}

const BackendApiContext = createContext<BackendApiContextType | undefined>(undefined);

// Generic backend fetch
const backendFetch = async (path: string, options?: RequestInit & { stream?: boolean }) => {
  const url = getHfUrl();
  const secret = getMasterSecret();
  if (!url) throw new Error('Backend URL not configured');

  const res = await fetch(`${url.replace(/\/$/, '')}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { 'x-master-secret': secret } : {}),
      ...options?.headers,
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error');
    throw new Error(`Backend ${res.status}: ${text}`);
  }

  if (options?.stream) return res;
  return res.json();
};

export const BackendApiProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const { session } = useAuth();

  const isConnected = status === 'connected';
  const backendUrl = getHfUrl();

  const checkConnection = useCallback(async () => {
    if (!getHfUrl()) {
      setStatus('disconnected');
      return { status: 'disconnected', reason: 'No backend URL' };
    }
    setStatus('checking');
    try {
      const data = await backendFetch('/api/health');
      if (data?.status === 'sleeping') {
        setStatus('sleeping');
      } else {
        setStatus('connected');
      }
      return data;
    } catch (e: any) {
      if (e.message?.includes('503') || e.message?.includes('sleeping')) {
        setStatus('sleeping');
      } else {
        setStatus('disconnected');
      }
      return { status: 'disconnected', error: e.message };
    }
  }, []);

  // Check on mount
  useEffect(() => {
    if (getHfUrl()) checkConnection();
  }, [checkConnection]);

  // === AI Engine ===
  const chatStream = useCallback(async (messages: any[], options?: any) => {
    const res = await backendFetch('/api/chat/stream', {
      method: 'POST',
      body: JSON.stringify({ messages, ...options }),
      stream: true,
    });
    return res?.body || null;
  }, []);

  const autoBuild = useCallback(async (prompt: string, options?: any) => {
    return backendFetch('/api/build/auto', { method: 'POST', body: JSON.stringify({ prompt, ...options }) });
  }, []);

  const fullStackBuild = useCallback(async (prompt: string, options?: any) => {
    return backendFetch('/api/build/fullstack', { method: 'POST', body: JSON.stringify({ prompt, ...options }) });
  }, []);

  const buildNative = useCallback(async (projectId: string, platform: 'apk' | 'exe') => {
    return backendFetch('/api/build/native', { method: 'POST', body: JSON.stringify({ projectId, platform }) });
  }, []);

  const reviewCode = useCallback(async (code: string, lang?: string) => {
    return backendFetch('/api/code/review', { method: 'POST', body: JSON.stringify({ code, language: lang }) });
  }, []);

  const fixCode = useCallback(async (code: string, error: string) => {
    return backendFetch('/api/code/fix', { method: 'POST', body: JSON.stringify({ code, error }) });
  }, []);

  const refactorCode = useCallback(async (code: string, instructions: string) => {
    return backendFetch('/api/code/refactor', { method: 'POST', body: JSON.stringify({ code, instructions }) });
  }, []);

  const convertCode = useCallback(async (code: string, from: string, to: string) => {
    return backendFetch('/api/code/convert', { method: 'POST', body: JSON.stringify({ code, from, to }) });
  }, []);

  const generateApi = useCallback(async (spec: any) => {
    return backendFetch('/api/generate/api', { method: 'POST', body: JSON.stringify(spec) });
  }, []);

  const generateDocs = useCallback(async (code: string) => {
    return backendFetch('/api/generate/docs', { method: 'POST', body: JSON.stringify({ code }) });
  }, []);

  const suggest = useCallback(async (input: string) => {
    return backendFetch('/api/suggest', { method: 'POST', body: JSON.stringify({ input }) });
  }, []);

  // === Project Manager ===
  const listProjects = useCallback(async () => backendFetch('/api/projects'), []);
  const getProject = useCallback(async (id: string) => backendFetch(`/api/projects/${id}`), []);
  const createProject = useCallback(async (data: any) => backendFetch('/api/projects', { method: 'POST', body: JSON.stringify(data) }), []);
  const updateProject = useCallback(async (id: string, data: any) => backendFetch(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }), []);
  const deleteProject = useCallback(async (id: string) => backendFetch(`/api/projects/${id}`, { method: 'DELETE' }), []);

  const uploadFiles = useCallback(async (projectId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach(f => formData.append('files', f));
    const url = getHfUrl();
    const secret = getMasterSecret();
    const res = await fetch(`${url}/api/projects/${projectId}/upload`, {
      method: 'POST',
      headers: secret ? { 'x-master-secret': secret } : {},
      body: formData,
    });
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  }, []);

  const publishProject = useCallback(async (projectId: string, target: string) => {
    return backendFetch(`/api/projects/${projectId}/publish`, { method: 'POST', body: JSON.stringify({ target }) });
  }, []);

  const downloadProject = useCallback(async (projectId: string) => {
    const url = getHfUrl();
    const secret = getMasterSecret();
    const res = await fetch(`${url}/api/projects/${projectId}/download`, {
      headers: secret ? { 'x-master-secret': secret } : {},
    });
    if (!res.ok) return null;
    return res.blob();
  }, []);

  const getVersions = useCallback(async (projectId: string) => backendFetch(`/api/projects/${projectId}/versions`), []);
  const getPublicUrl = useCallback(async (projectId: string) => backendFetch(`/api/projects/${projectId}/public-url`), []);

  // === Sandbox & Testing ===
  const validateCode = useCallback(async (code: string) => backendFetch('/api/sandbox/validate', { method: 'POST', body: JSON.stringify({ code }) }), []);
  const auditCode = useCallback(async (code: string) => backendFetch('/api/sandbox/audit', { method: 'POST', body: JSON.stringify({ code }) }), []);
  const visualAudit = useCallback(async (url: string) => backendFetch('/api/sandbox/visual-audit', { method: 'POST', body: JSON.stringify({ url }) }), []);
  const generateTests = useCallback(async (code: string) => backendFetch('/api/sandbox/generate-tests', { method: 'POST', body: JSON.stringify({ code }) }), []);
  const autoTestFix = useCallback(async (code: string, testResults: any) => backendFetch('/api/sandbox/auto-test-fix', { method: 'POST', body: JSON.stringify({ code, testResults }) }), []);
  const optimizeCode = useCallback(async (code: string) => backendFetch('/api/sandbox/optimize', { method: 'POST', body: JSON.stringify({ code }) }), []);
  const factory = useCallback(async (template: string, options?: any) => backendFetch('/api/sandbox/factory', { method: 'POST', body: JSON.stringify({ template, ...options }) }), []);
  const executeCode = useCallback(async (code: string, lang?: string) => backendFetch('/api/sandbox/execute', { method: 'POST', body: JSON.stringify({ code, language: lang }) }), []);
  const codeToImage = useCallback(async (code: string, options?: any) => backendFetch('/api/sandbox/code-to-image', { method: 'POST', body: JSON.stringify({ code, ...options }) }), []);
  const generateSchema = useCallback(async (description: string) => backendFetch('/api/sandbox/generate-schema', { method: 'POST', body: JSON.stringify({ description }) }), []);
  const analyzeDeps = useCallback(async (packageJson: any) => backendFetch('/api/sandbox/analyze-deps', { method: 'POST', body: JSON.stringify(packageJson) }), []);

  // === System ===
  const getHealth = useCallback(async () => backendFetch('/api/health'), []);
  const getStats = useCallback(async () => backendFetch('/api/stats'), []);
  const getLogs = useCallback(async (limit = 50) => backendFetch(`/api/logs?limit=${limit}`), []);
  const frontendGuide = useCallback(async (feature: string) => backendFetch(`/api/guide/${feature}`), []);

  return (
    <BackendApiContext.Provider value={{
      status, isConnected, backendUrl, checkConnection,
      chatStream, autoBuild, fullStackBuild, buildNative,
      reviewCode, fixCode, refactorCode, convertCode,
      generateApi, generateDocs, suggest,
      listProjects, getProject, createProject, updateProject, deleteProject,
      uploadFiles, publishProject, downloadProject, getVersions, getPublicUrl,
      validateCode, auditCode, visualAudit, generateTests, autoTestFix,
      optimizeCode, factory, executeCode, codeToImage, generateSchema, analyzeDeps,
      getHealth, getStats, getLogs, frontendGuide,
    }}>
      {children}
    </BackendApiContext.Provider>
  );
};

export const useBackendApi = () => {
  const ctx = useContext(BackendApiContext);
  if (!ctx) throw new Error('useBackendApi must be used within BackendApiProvider');
  return ctx;
};
