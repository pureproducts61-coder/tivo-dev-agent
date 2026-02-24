import { useCallback } from 'react';
import { useTokens } from './useTokens';

interface DeployResult {
  success: boolean;
  message: string;
  url?: string;
}

export const useVercelAPI = () => {
  const { getToken, hasToken } = useTokens();

  const vercelFetch = useCallback(async (endpoint: string, options?: RequestInit) => {
    const token = getToken('VERCEL_TOKEN');
    if (!token) throw new Error('Vercel Token সেট করা হয়নি। Settings থেকে সেট করুন।');
    return fetch(`https://api.vercel.com${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  }, [getToken]);

  const checkAuth = useCallback(async (): Promise<DeployResult> => {
    const resp = await vercelFetch('/v2/user');
    if (!resp.ok) return { success: false, message: 'Vercel token invalid.' };
    const data = await resp.json();
    return { success: true, message: `Authenticated as ${data.user?.username || 'user'}` };
  }, [vercelFetch]);

  const deploy = useCallback(async (projectName: string): Promise<DeployResult> => {
    // Step 1: find project
    const projResp = await vercelFetch(`/v9/projects/${encodeURIComponent(projectName)}`);
    if (!projResp.ok) return { success: false, message: `Project "${projectName}" not found.` };
    const project = await projResp.json();

    // Step 2: get latest deployment and redeploy
    const depsResp = await vercelFetch(`/v6/deployments?projectId=${project.id}&limit=1&target=production`);
    if (!depsResp.ok) return { success: false, message: 'Failed to fetch deployments.' };
    const deps = await depsResp.json();
    const latestId = deps.deployments?.[0]?.uid;

    if (latestId) {
      const redeployResp = await vercelFetch('/v13/deployments?forceNew=1', {
        method: 'POST',
        body: JSON.stringify({ name: projectName, deploymentId: latestId, target: 'production' }),
      });
      if (redeployResp.ok) {
        const data = await redeployResp.json();
        return { success: true, message: `Deployment triggered.`, url: data.url ? `https://${data.url}` : undefined };
      }
      return { success: false, message: `Redeploy failed: ${redeployResp.status}` };
    }

    // No previous deploy - create new
    const deployResp = await vercelFetch('/v13/deployments', {
      method: 'POST',
      body: JSON.stringify({ name: projectName, target: 'production' }),
    });
    if (!deployResp.ok) return { success: false, message: `Deploy failed: ${deployResp.status}` };
    const data = await deployResp.json();
    return { success: true, message: 'Deployment created.', url: data.url ? `https://${data.url}` : undefined };
  }, [vercelFetch]);

  return {
    isConfigured: hasToken('VERCEL_TOKEN'),
    checkAuth,
    deploy,
    vercelFetch,
  };
};
