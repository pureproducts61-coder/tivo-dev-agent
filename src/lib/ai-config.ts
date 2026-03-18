// AI Self-Awareness Configuration
// This file defines TIVO's knowledge of its own infrastructure

export const AI_INFRASTRUCTURE = {
  identity: {
    name: 'TIVO DEV AGENT',
    version: '2.0.0',
    type: 'Autonomous AI SaaS Platform',
  },
  repositories: {
    frontend: {
      owner: 'pureproducts61-coder',
      repo: 'tivo-dev-agent',
      fullName: 'pureproducts61-coder/tivo-dev-agent',
      description: 'TIVO DEV AGENT Frontend — React + Vite + Supabase',
    },
    backend: {
      owner: 'pureproducts61-coder',
      repo: 'tivo-dev-agent-beckend',
      fullName: 'pureproducts61-coder/tivo-dev-agent-beckend',
      description: 'TIVO DEV AGENT Backend — FastAPI on HuggingFace Spaces',
    },
  },
  deployment: {
    frontend: {
      platform: 'Vercel',
      url: 'https://tivo-dev-agent.vercel.app',
      projectName: 'tivo-dev-agent',
    },
    backend: {
      platform: 'HuggingFace Spaces',
      spaceName: 'tivo-dev-agent-beckend',
      // URL and Master Secret come from edge function secrets (HF_BACKEND_URL, HF_MASTER_SECRET)
    },
  },
  tokens: {
    // These are secret names stored in Supabase Edge Function secrets
    GITHUB_TOKEN: 'Full GitHub access for repo management, file CRUD, Actions triggers',
    VERCEL_TOKEN: 'Vercel deployment management and environment variable control',
    HF_TOKEN: 'HuggingFace API access for model inference and Space management',
    HF_BACKEND_URL: 'Backend FastAPI service URL on HuggingFace Spaces',
    HF_MASTER_SECRET: 'Master secret for authenticating with HF backend',
    ADMIN_EMAIL: 'Admin email for role-based access',
    ADMIN_PASSWORD: 'Admin password for verification',
  },
  capabilities: {
    withGithubToken: [
      'Read/write files in repos',
      'Create branches and PRs',
      'Trigger GitHub Actions',
      'Manage repository settings',
    ],
    withVercelToken: [
      'Trigger deployments',
      'Manage environment variables',
      'View deployment logs',
      'Rollback deployments',
    ],
    withHfToken: [
      'Run AI model inference',
      'Manage HF Spaces',
      'Upload models and datasets',
    ],
    withBackend: [
      'Extended AI processing',
      'Long-running tasks',
      'Custom model inference',
      'Database migrations',
    ],
  },
} as const;

// Generate system context for AI based on available tokens
export function generateAISystemContext(availableTokens: string[]): string {
  const capabilities: string[] = [];

  if (availableTokens.includes('GITHUB_TOKEN')) {
    capabilities.push(`GitHub Access: ${AI_INFRASTRUCTURE.capabilities.withGithubToken.join(', ')}`);
    capabilities.push(`Frontend Repo: ${AI_INFRASTRUCTURE.repositories.frontend.fullName}`);
    capabilities.push(`Backend Repo: ${AI_INFRASTRUCTURE.repositories.backend.fullName}`);
  }

  if (availableTokens.includes('VERCEL_TOKEN')) {
    capabilities.push(`Vercel Access: ${AI_INFRASTRUCTURE.capabilities.withVercelToken.join(', ')}`);
    capabilities.push(`Vercel URL: ${AI_INFRASTRUCTURE.deployment.frontend.url}`);
  }

  if (availableTokens.includes('HF_TOKEN')) {
    capabilities.push(`HuggingFace Access: ${AI_INFRASTRUCTURE.capabilities.withHfToken.join(', ')}`);
  }

  if (availableTokens.includes('HF_BACKEND_URL')) {
    capabilities.push(`Backend Connected: ${AI_INFRASTRUCTURE.capabilities.withBackend.join(', ')}`);
  }

  return capabilities.length > 0
    ? `\n\nAVAILABLE INFRASTRUCTURE:\n${capabilities.map(c => `- ${c}`).join('\n')}`
    : '\n\nNo external tokens configured. Operating in basic chat mode.';
}
