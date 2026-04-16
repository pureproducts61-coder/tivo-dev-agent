import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const getBackendUrl = () => import.meta.env.VITE_HF_SPACE_URL || import.meta.env.VITE_BACKEND_URL || localStorage.getItem('tivo_backend_url') || '';
const getMasterSecret = () => import.meta.env.VITE_MASTER_SECRET || import.meta.env.VITE_HF_MASTER_SECRET || localStorage.getItem('tivo_master_secret') || '';

export type ConnectionStatus = 'connected' | 'disconnected' | 'checking' | 'sleeping';

interface BackendApiContextType {
  status: ConnectionStatus;
  isConnected: boolean;
  backendUrl: string;
  backendVersion: string;
  checkConnection: () => Promise<any>;
  // v7.0 API methods
  apiCall: (functionName: string, action: string, method: string, body?: any, stream?: boolean) => Promise<any>;
  chatStream: (messages: any[], options?: any) => Promise<ReadableStream | null>;
  generateCode: (prompt: string, opts?: any) => Promise<any>;
  generateProject: (description: string, opts?: any) => Promise<any>;
  autoBuild: (description: string, opts?: any) => Promise<any>;
  fullStackBuild: (description: string, opts?: any) => Promise<any>;
  buildNative: (projectId: string, buildType: 'apk' | 'exe') => Promise<any>;
  reviewCode: (code: string, lang?: string) => Promise<any>;
  fixCode: (code: string, error?: string) => Promise<any>;
  refactorCode: (code: string, goal?: string) => Promise<any>;
  convertCode: (code: string, from: string, to: string) => Promise<any>;
  generateApi: (spec: any) => Promise<any>;
  generateDocs: (code: string, docType?: string) => Promise<any>;
  generateImage: (prompt: string, opts?: any) => Promise<any>;
  editImage: (imageUrl: string, instruction: string) => Promise<any>;
  processFile: (fileContent: string, fileType?: string, fileName?: string, instruction?: string) => Promise<any>;
  suggest: (intent: string) => Promise<any>;
  // Project Manager
  listProjects: (userId?: string) => Promise<any>;
  getProject: (id: string) => Promise<any>;
  createProject: (data: any) => Promise<any>;
  updateProject: (data: any) => Promise<any>;
  deleteProject: (id: string) => Promise<any>;
  uploadFiles: (projectId: string, files: any[]) => Promise<any>;
  publishProject: (projectId: string) => Promise<any>;
  downloadProject: (projectId: string) => Promise<any>;
  getVersions: (projectId: string) => Promise<any>;
  // Sandbox
  validateCode: (code: string, opts?: any) => Promise<any>;
  auditCode: (opts?: any) => Promise<any>;
  visualAudit: (opts?: any) => Promise<any>;
  autoTestFix: (opts?: any) => Promise<any>;
  generateTests: (code: string, opts?: any) => Promise<any>;
  optimizeCode: (code: string, opts?: any) => Promise<any>;
  factory: (description: string, opts?: any) => Promise<any>;
  executeCommand: (command: string, params?: any) => Promise<any>;
  codeToImage: (opts?: any) => Promise<any>;
  generateSchema: (description: string, opts?: any) => Promise<any>;
  deployAutomation: (projectId: string, platform: string) => Promise<any>;
  generateComponents: (description: string, opts?: any) => Promise<any>;
  analyzeDeps: (packageJson: any) => Promise<any>;
  // System
  getHealth: () => Promise<any>;
  getCapabilities: () => Promise<any>;
  getStats: () => Promise<any>;
  getLogs: (limit?: number) => Promise<any>;
  frontendGuide: () => Promise<any>;
}

const BackendApiContext = createContext<BackendApiContextType | undefined>(undefined);

// Retry with exponential backoff
const fetchWithRetry = async (url: string, options: RequestInit, maxRetries = 3): Promise<Response> => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok || res.status < 500) return res;
    } catch (e) {
      if (i === maxRetries - 1) throw e;
    }
    await new Promise(r => setTimeout(r, Math.pow(2, i) * 1000));
  }
  throw new Error('Max retries reached');
};

export const BackendApiProvider = ({ children }: { children: ReactNode }) => {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [backendVersion, setBackendVersion] = useState('');
  const healthInterval = useRef<ReturnType<typeof setInterval>>();

  const isConnected = status === 'connected';
  const backendUrl = getBackendUrl();

  // v7.0 API URL format: ${BACKEND_URL}/functions/v1/{function-name}/{action}
  const apiCall = useCallback(async (functionName: string, action: string, method: string, body?: any, stream?: boolean) => {
    const url = getBackendUrl();
    const secret = getMasterSecret();
    if (!url) throw new Error('Backend URL not configured');

    const fullUrl = `${url.replace(/\/$/, '')}/functions/v1/${functionName}/${action}`;
    const res = await fetchWithRetry(fullUrl, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(secret ? { 'x-master-secret': secret } : {}),
      },
      ...(body && method !== 'GET' ? { body: JSON.stringify(body) } : {}),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => 'Unknown error');
      throw new Error(`Backend ${res.status}: ${text}`);
    }
    if (stream) return res;
    return res.json();
  }, []);

  const checkConnection = useCallback(async () => {
    if (!getBackendUrl()) { setStatus('disconnected'); return { status: 'disconnected' }; }
    setStatus('checking');
    try {
      const data = await apiCall('backend-api', 'health', 'GET');
      if (data?.status === 'sleeping') { setStatus('sleeping'); }
      else { setStatus('connected'); }
      if (data?.version) setBackendVersion(data.version);
      return data;
    } catch (e: any) {
      if (e.message?.includes('503') || e.message?.includes('sleeping')) { setStatus('sleeping'); }
      else { setStatus('disconnected'); }
      return { status: 'disconnected', error: e.message };
    }
  }, [apiCall]);

  useEffect(() => {
    if (getBackendUrl()) checkConnection();
    healthInterval.current = setInterval(() => { if (getBackendUrl()) checkConnection(); }, 60000);
    return () => { if (healthInterval.current) clearInterval(healthInterval.current); };
  }, [checkConnection]);

  // AI Engine methods
  const chatStream = useCallback(async (messages: any[], options?: any) => {
    const url = getBackendUrl();
    const secret = getMasterSecret();
    if (!url) return null;
    const res = await fetchWithRetry(`${url.replace(/\/$/, '')}/functions/v1/ai-engine/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(secret ? { 'x-master-secret': secret } : {}) },
      body: JSON.stringify({ messages, stream: true, ...options }),
    });
    if (!res.ok) throw new Error(`Stream error ${res.status}`);
    return res.body;
  }, []);

  const generateCode = useCallback((prompt: string, opts?: any) => apiCall('ai-engine', 'generate', 'POST', { prompt, ...opts }), [apiCall]);
  const generateProject = useCallback((description: string, opts?: any) => apiCall('ai-engine', 'generate-project', 'POST', { description, ...opts }), [apiCall]);
  const autoBuild = useCallback((description: string, opts?: any) => apiCall('ai-engine', 'auto-build', 'POST', { description, ...opts }), [apiCall]);
  const fullStackBuild = useCallback((description: string, opts?: any) => apiCall('ai-engine', 'full-stack-build', 'POST', { description, ...opts }), [apiCall]);
  const buildNative = useCallback((projectId: string, buildType: 'apk' | 'exe') =>
    apiCall('ai-engine', 'build-native', 'POST', { project_id: projectId, build_type: buildType, hf_space_url: import.meta.env.VITE_HF_SPACE_URL || '' }), [apiCall]);
  const reviewCode = useCallback((code: string, lang?: string) => apiCall('ai-engine', 'review', 'POST', { code, language: lang }), [apiCall]);
  const fixCode = useCallback((code: string, error?: string) => apiCall('ai-engine', 'fix', 'POST', { code, error_message: error }), [apiCall]);
  const refactorCode = useCallback((code: string, goal?: string) => apiCall('ai-engine', 'refactor', 'POST', { code, goal }), [apiCall]);
  const convertCode = useCallback((code: string, from: string, to: string) => apiCall('ai-engine', 'convert', 'POST', { code, from_language: from, to_language: to }), [apiCall]);
  const generateApi = useCallback((spec: any) => apiCall('ai-engine', 'generate-api', 'POST', spec), [apiCall]);
  const generateDocs = useCallback((code: string, docType?: string) => apiCall('ai-engine', 'generate-docs', 'POST', { code, doc_type: docType }), [apiCall]);
  const generateImage = useCallback((prompt: string, opts?: any) => apiCall('ai-engine', 'generate-image', 'POST', { prompt, ...opts }), [apiCall]);
  const editImage = useCallback((imageUrl: string, instruction: string) => apiCall('ai-engine', 'edit-image', 'POST', { image_url: imageUrl, instruction }), [apiCall]);
  const processFile = useCallback((fileContent: string, fileType?: string, fileName?: string, instruction?: string) =>
    apiCall('ai-engine', 'process-file', 'POST', { file_content: fileContent, file_type: fileType, file_name: fileName, instruction }), [apiCall]);
  const suggest = useCallback((intent: string) => apiCall('backend-api', 'suggest', 'POST', { intent }), [apiCall]);

  // Project Manager
  const listProjects = useCallback((userId?: string) => {
    const url = getBackendUrl();
    const params = userId ? `?user_id=${userId}` : '';
    return apiCall('project-manager', `list${params}`, 'GET');
  }, [apiCall]);
  const getProject = useCallback((id: string) => apiCall('project-manager', `get?id=${id}`, 'GET'), [apiCall]);
  const createProject = useCallback((data: any) => apiCall('project-manager', 'create', 'POST', data), [apiCall]);
  const updateProject = useCallback((data: any) => apiCall('project-manager', 'update', 'PUT', data), [apiCall]);
  const deleteProject = useCallback((id: string) => apiCall('project-manager', 'delete', 'DELETE', { id }), [apiCall]);
  const uploadFiles = useCallback((projectId: string, files: any[]) => apiCall('project-manager', 'upload-files', 'POST', { project_id: projectId, files }), [apiCall]);
  const publishProject = useCallback((projectId: string) => apiCall('project-manager', 'publish', 'POST', { project_id: projectId }), [apiCall]);
  const downloadProject = useCallback((projectId: string) => apiCall('project-manager', `download?id=${projectId}`, 'GET'), [apiCall]);
  const getVersions = useCallback((projectId: string) => apiCall('project-manager', `versions?id=${projectId}`, 'GET'), [apiCall]);

  // Sandbox
  const validateCode = useCallback((code: string, opts?: any) => apiCall('sandbox', 'validate', 'POST', { code, ...opts }), [apiCall]);
  const auditCode = useCallback((opts?: any) => apiCall('sandbox', 'audit', 'POST', opts), [apiCall]);
  const visualAudit = useCallback((opts?: any) => apiCall('sandbox', 'visual-audit', 'POST', opts), [apiCall]);
  const autoTestFix = useCallback((opts?: any) => apiCall('sandbox', 'auto-test-fix', 'POST', opts), [apiCall]);
  const generateTests = useCallback((code: string, opts?: any) => apiCall('sandbox', 'generate-tests', 'POST', { code, ...opts }), [apiCall]);
  const optimizeCode = useCallback((code: string, opts?: any) => apiCall('sandbox', 'optimize', 'POST', { code, ...opts }), [apiCall]);
  const factory = useCallback((description: string, opts?: any) => apiCall('sandbox', 'factory', 'POST', { description, ...opts }), [apiCall]);
  const executeCommand = useCallback((command: string, params?: any) => apiCall('sandbox', 'execute', 'POST', { command, params }), [apiCall]);
  const codeToImage = useCallback((opts?: any) => apiCall('sandbox', 'code-to-image', 'POST', opts), [apiCall]);
  const generateSchema = useCallback((description: string, opts?: any) => apiCall('sandbox', 'generate-schema', 'POST', { description, ...opts }), [apiCall]);
  const deployAutomation = useCallback((projectId: string, platform: string) => apiCall('sandbox', 'deploy-automation', 'POST', { project_id: projectId, platform }), [apiCall]);
  const generateComponents = useCallback((description: string, opts?: any) => apiCall('sandbox', 'generate-components', 'POST', { description, ...opts }), [apiCall]);
  const analyzeDeps = useCallback((packageJson: any) => apiCall('sandbox', 'analyze-deps', 'POST', { package_json: packageJson }), [apiCall]);

  // System
  const getHealth = useCallback(() => apiCall('backend-api', 'health', 'GET'), [apiCall]);
  const getCapabilities = useCallback(() => apiCall('backend-api', 'capabilities', 'GET'), [apiCall]);
  const getStats = useCallback(() => apiCall('backend-api', 'stats', 'GET'), [apiCall]);
  const getLogs = useCallback((limit = 50) => apiCall('backend-api', `logs?limit=${limit}`, 'GET'), [apiCall]);
  const frontendGuide = useCallback(() => apiCall('backend-api', 'frontend-ai-guide', 'GET'), [apiCall]);

  return (
    <BackendApiContext.Provider value={{
      status, isConnected, backendUrl, backendVersion, checkConnection, apiCall,
      chatStream, generateCode, generateProject, autoBuild, fullStackBuild, buildNative,
      reviewCode, fixCode, refactorCode, convertCode, generateApi, generateDocs,
      generateImage, editImage, processFile, suggest,
      listProjects, getProject, createProject, updateProject, deleteProject,
      uploadFiles, publishProject, downloadProject, getVersions,
      validateCode, auditCode, visualAudit, autoTestFix, generateTests, optimizeCode,
      factory, executeCommand, codeToImage, generateSchema, deployAutomation, generateComponents, analyzeDeps,
      getHealth, getCapabilities, getStats, getLogs, frontendGuide,
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
