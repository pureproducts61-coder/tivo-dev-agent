import { useCallback } from 'react';
import { useTokens } from './useTokens';

interface GitHubPushResult {
  success: boolean;
  message: string;
  url?: string;
}

export const useGitHubAPI = () => {
  const { getToken, hasToken } = useTokens();

  const ghFetch = useCallback(async (endpoint: string, options?: RequestInit) => {
    const token = getToken('GITHUB_TOKEN');
    if (!token) throw new Error('GitHub Token সেট করা হয়নি। Settings থেকে সেট করুন।');
    return fetch(`https://api.github.com${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  }, [getToken]);

  const parseRepo = useCallback((url: string) => {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (match) return { owner: match[1], repo: match[2].replace('.git', '') };
    const parts = url.split('/').filter(Boolean);
    if (parts.length >= 2) return { owner: parts[0], repo: parts[1] };
    return null;
  }, []);

  const fetchRepoContents = useCallback(async (owner: string, repo: string, path = '') => {
    const resp = await ghFetch(`/repos/${owner}/${repo}/contents/${path}`);
    if (resp.status === 401) throw new Error('Wait, I think the token is invalid. Please double-check it, friend.');
    if (resp.status === 404) throw new Error(`Repository "${owner}/${repo}" not found.`);
    if (!resp.ok) throw new Error(`GitHub API error: ${resp.status}`);
    return resp.json();
  }, [ghFetch]);

  const fetchFileContent = useCallback(async (owner: string, repo: string, path: string) => {
    const resp = await ghFetch(`/repos/${owner}/${repo}/contents/${path}`);
    if (!resp.ok) throw new Error('Failed to fetch file');
    const data = await resp.json();
    return { content: atob(data.content), sha: data.sha };
  }, [ghFetch]);

  const pushFile = useCallback(async (owner: string, repo: string, path: string, content: string, message: string, sha?: string): Promise<GitHubPushResult> => {
    const body: any = {
      message,
      content: btoa(unescape(encodeURIComponent(content))),
    };
    if (sha) body.sha = sha;

    const resp = await ghFetch(`/repos/${owner}/${repo}/contents/${path}`, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    if (resp.status === 401) return { success: false, message: 'Wait, I think the token is invalid. Please double-check it, friend.' };
    if (!resp.ok) return { success: false, message: `Push failed: ${resp.status}` };
    const result = await resp.json();
    return { success: true, message: `"${path}" pushed successfully.`, url: result.content?.html_url };
  }, [ghFetch]);

  const createRepo = useCallback(async (name: string, description = '', isPrivate = false): Promise<GitHubPushResult> => {
    const resp = await ghFetch('/user/repos', {
      method: 'POST',
      body: JSON.stringify({ name, description, private: isPrivate, auto_init: true }),
    });
    if (resp.status === 401) return { success: false, message: 'Token invalid.' };
    if (resp.status === 422) return { success: false, message: 'Repository already exists.' };
    if (!resp.ok) return { success: false, message: `Create repo failed: ${resp.status}` };
    const data = await resp.json();
    return { success: true, message: `Repository "${name}" created.`, url: data.html_url };
  }, [ghFetch]);

  const pushMultipleFiles = useCallback(async (owner: string, repo: string, files: { path: string; content: string }[], message: string): Promise<GitHubPushResult> => {
    try {
      for (const file of files) {
        const result = await pushFile(owner, repo, file.path, file.content, message);
        if (!result.success) return result;
      }
      return { success: true, message: `${files.length} files pushed successfully.` };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }, [pushFile]);

  const triggerWorkflow = useCallback(async (owner: string, repo: string, workflowFile: string, ref = 'main'): Promise<GitHubPushResult> => {
    // Find workflow
    const listResp = await ghFetch(`/repos/${owner}/${repo}/actions/workflows`);
    if (listResp.status === 401) return { success: false, message: 'Token invalid.' };
    if (!listResp.ok) return { success: false, message: `Workflow list failed: ${listResp.status}` };
    const workflows = await listResp.json();
    const found = workflows.workflows?.find((w: any) => w.name === workflowFile || w.path?.includes(workflowFile));
    if (!found) return { success: false, message: `Workflow "${workflowFile}" not found.` };

    const triggerResp = await ghFetch(`/repos/${owner}/${repo}/actions/workflows/${found.id}/dispatches`, {
      method: 'POST',
      body: JSON.stringify({ ref }),
    });
    if (!triggerResp.ok && triggerResp.status !== 204) return { success: false, message: `Trigger failed: ${triggerResp.status}` };
    return { success: true, message: `Workflow "${found.name}" triggered.` };
  }, [ghFetch]);

  return {
    isConfigured: hasToken('GITHUB_TOKEN'),
    parseRepo,
    fetchRepoContents,
    fetchFileContent,
    pushFile,
    createRepo,
    pushMultipleFiles,
    triggerWorkflow,
    ghFetch,
  };
};
