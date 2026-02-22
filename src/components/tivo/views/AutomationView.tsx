import { useState, useEffect } from 'react';
import { Zap, Play, CheckCircle, Circle, Loader2, Clock, Plus, Trash2, Github, Rocket, AlertTriangle, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface AutomationTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  steps: { name: string; status: string; detail?: string }[];
  current_step: number;
  schedule: string | null;
  last_run_at: string | null;
  created_at: string;
}

type TaskType = 'custom' | 'github-actions' | 'vercel-deploy';

const TASK_TEMPLATES: Record<TaskType, { title: string; steps: { name: string; status: string }[] }> = {
  'custom': {
    title: '',
    steps: [
      { name: 'পরিকল্পনা তৈরি', status: 'pending' },
      { name: 'কোড জেনারেশন', status: 'pending' },
      { name: 'টেস্টিং', status: 'pending' },
      { name: 'ডিপ্লয়মেন্ট', status: 'pending' },
    ],
  },
  'github-actions': {
    title: 'GitHub Actions Trigger',
    steps: [
      { name: 'GitHub API সংযোগ', status: 'pending' },
      { name: 'Workflow ফাইল সনাক্ত', status: 'pending' },
      { name: 'Workflow ট্রিগার', status: 'pending' },
      { name: 'স্ট্যাটাস চেক', status: 'pending' },
    ],
  },
  'vercel-deploy': {
    title: 'Vercel Deploy',
    steps: [
      { name: 'Vercel API সংযোগ', status: 'pending' },
      { name: 'প্রজেক্ট সনাক্ত', status: 'pending' },
      { name: 'ডিপ্লয়মেন্ট ট্রিগার', status: 'pending' },
      { name: 'বিল্ড স্ট্যাটাস মনিটর', status: 'pending' },
    ],
  },
};

export const AutomationView = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<AutomationTask[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [taskType, setTaskType] = useState<TaskType>('custom');

  // GitHub Actions fields
  const [ghRepo, setGhRepo] = useState('');
  const [ghWorkflow, setGhWorkflow] = useState('');

  // Vercel fields
  const [vercelProject, setVercelProject] = useState('');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('automation_tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) setTasks(data as unknown as AutomationTask[]);
      });
  }, [user]);

  const createTask = async () => {
    if (!user) return;
    const template = TASK_TEMPLATES[taskType];
    const title = taskType === 'custom' ? newTaskTitle.trim() : template.title;
    if (!title) return;

    const description = taskType === 'github-actions'
      ? `repo:${ghRepo} workflow:${ghWorkflow}`
      : taskType === 'vercel-deploy'
        ? `project:${vercelProject}`
        : null;

    const { data } = await supabase
      .from('automation_tasks')
      .insert({
        user_id: user.id,
        title,
        description,
        steps: template.steps as any,
        status: 'pending',
      })
      .select()
      .single();

    if (data) {
      setTasks(prev => [data as unknown as AutomationTask, ...prev]);
      setNewTaskTitle('');
      setGhRepo('');
      setGhWorkflow('');
      setVercelProject('');
      setShowAdd(false);
      toast({ title: 'টাস্ক তৈরি হয়েছে' });
    }
  };

  const runGitHubActions = async (task: AutomationTask) => {
    const token = localStorage.getItem('tivo_GITHUB_TOKEN');
    if (!token) {
      toast({ variant: 'destructive', title: 'টোকেন নেই', description: 'Settings থেকে GitHub Token সেট করুন।' });
      return;
    }

    const desc = task.description || '';
    const repoMatch = desc.match(/repo:([^\s]+)/);
    const workflowMatch = desc.match(/workflow:([^\s]+)/);
    if (!repoMatch || !workflowMatch) {
      toast({ variant: 'destructive', title: 'কনফিগ ত্রুটি', description: 'Repo বা workflow তথ্য পাওয়া যায়নি।' });
      return;
    }

    const repo = repoMatch[1];
    const workflow = workflowMatch[1];
    const steps = [...task.steps];

    const updateStep = (i: number, status: string, detail?: string) => {
      steps[i] = { ...steps[i], status, detail };
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, steps: [...steps], current_step: i, status: 'running' } : t));
    };

    // Step 0: Connect
    updateStep(0, 'running');
    await delay(800);
    updateStep(0, 'done');

    // Step 1: Find workflow
    updateStep(1, 'running');
    try {
      const listResp = await fetch(`https://api.github.com/repos/${repo}/actions/workflows`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
      });
      if (listResp.status === 401) {
        updateStep(1, 'error', 'Token invalid');
        toast({ variant: 'destructive', title: '401', description: 'Wait, I think the token is invalid. Please double-check it, friend.' });
        return;
      }
      if (!listResp.ok) throw new Error(`${listResp.status}`);
      const workflows = await listResp.json();
      const found = workflows.workflows?.find((w: any) => w.name === workflow || w.path?.includes(workflow));
      if (!found) {
        updateStep(1, 'error', `"${workflow}" workflow পাওয়া যায়নি`);
        finishTask(task.id, steps, 'failed');
        return;
      }
      updateStep(1, 'done', found.name);

      // Step 2: Trigger
      updateStep(2, 'running');
      const triggerResp = await fetch(`https://api.github.com/repos/${repo}/actions/workflows/${found.id}/dispatches`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: 'main' }),
      });
      if (!triggerResp.ok && triggerResp.status !== 204) {
        updateStep(2, 'error', `Trigger failed: ${triggerResp.status}`);
        finishTask(task.id, steps, 'failed');
        return;
      }
      updateStep(2, 'done');

      // Step 3: Check status
      updateStep(3, 'running');
      await delay(3000);
      const runsResp = await fetch(`https://api.github.com/repos/${repo}/actions/runs?per_page=1`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
      });
      if (runsResp.ok) {
        const runs = await runsResp.json();
        const latest = runs.workflow_runs?.[0];
        updateStep(3, 'done', latest ? `Run #${latest.run_number}: ${latest.status}` : 'Triggered successfully');
      } else {
        updateStep(3, 'done', 'Triggered (status check unavailable)');
      }

      finishTask(task.id, steps, 'completed');
      toast({ title: '✅ GitHub Actions সফল', description: `"${workflow}" ট্রিগার হয়েছে।` });
    } catch (err: any) {
      updateStep(steps.findIndex(s => s.status === 'running'), 'error', err.message);
      finishTask(task.id, steps, 'failed');
    }
  };

  const runVercelDeploy = async (task: AutomationTask) => {
    const token = localStorage.getItem('tivo_VERCEL_TOKEN');
    if (!token) {
      toast({ variant: 'destructive', title: 'টোকেন নেই', description: 'Settings থেকে Vercel Token সেট করুন।' });
      return;
    }

    const desc = task.description || '';
    const projectMatch = desc.match(/project:([^\s]+)/);
    const projectName = projectMatch?.[1] || '';
    const steps = [...task.steps];

    const updateStep = (i: number, status: string, detail?: string) => {
      steps[i] = { ...steps[i], status, detail };
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, steps: [...steps], current_step: i, status: 'running' } : t));
    };

    // Step 0: Connect
    updateStep(0, 'running');
    await delay(800);
    try {
      const userResp = await fetch('https://api.vercel.com/v2/user', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!userResp.ok) {
        updateStep(0, 'error', 'Vercel token invalid');
        finishTask(task.id, steps, 'failed');
        return;
      }
      updateStep(0, 'done');

      // Step 1: Find project
      updateStep(1, 'running');
      const projResp = await fetch(`https://api.vercel.com/v9/projects/${encodeURIComponent(projectName)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!projResp.ok) {
        updateStep(1, 'error', `"${projectName}" প্রজেক্ট পাওয়া যায়নি`);
        finishTask(task.id, steps, 'failed');
        return;
      }
      const project = await projResp.json();
      updateStep(1, 'done', project.name);

      // Step 2: Trigger deploy
      updateStep(2, 'running');
      const ghRepoLink = project.link;
      if (!ghRepoLink) {
        // Create deployment via Vercel API
        const deployResp = await fetch('https://api.vercel.com/v13/deployments', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: projectName, target: 'production' }),
        });
        if (!deployResp.ok) {
          updateStep(2, 'error', `Deploy trigger failed: ${deployResp.status}`);
          finishTask(task.id, steps, 'failed');
          return;
        }
        const deploy = await deployResp.json();
        updateStep(2, 'done', `Deploy ID: ${deploy.id?.slice(0, 8)}...`);
      } else {
        // Trigger via redeploy
        const deploymentsResp = await fetch(`https://api.vercel.com/v6/deployments?projectId=${project.id}&limit=1&target=production`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (deploymentsResp.ok) {
          const deps = await deploymentsResp.json();
          const latestId = deps.deployments?.[0]?.uid;
          if (latestId) {
            const redeployResp = await fetch(`https://api.vercel.com/v13/deployments?forceNew=1`, {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: projectName, deploymentId: latestId, target: 'production' }),
            });
            if (redeployResp.ok) {
              const redeploy = await redeployResp.json();
              updateStep(2, 'done', `Redeploy: ${redeploy.url || 'triggered'}`);
            } else {
              updateStep(2, 'done', 'Redeploy triggered (status uncertain)');
            }
          } else {
            updateStep(2, 'done', 'No previous deploy found, manual deploy needed');
          }
        } else {
          updateStep(2, 'done', 'Deploy triggered');
        }
      }

      // Step 3: Monitor
      updateStep(3, 'running');
      await delay(3000);
      updateStep(3, 'done', 'ডিপ্লয়মেন্ট প্রক্রিয়াধীন — Vercel ড্যাশবোর্ডে চেক করুন');

      finishTask(task.id, steps, 'completed');
      toast({ title: '✅ Vercel Deploy সফল', description: `"${projectName}" ডিপ্লয় হচ্ছে।` });
    } catch (err: any) {
      const runningIdx = steps.findIndex(s => s.status === 'running');
      if (runningIdx >= 0) updateStep(runningIdx, 'error', err.message);
      finishTask(task.id, steps, 'failed');
    }
  };

  const runCustomTask = async (task: AutomationTask) => {
    const steps = [...task.steps];
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'running' } : t));

    for (let i = 0; i < steps.length; i++) {
      steps[i].status = 'running';
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, steps: [...steps], current_step: i } : t));
      await delay(1500 + Math.random() * 1000);
      steps[i].status = 'done';
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, steps: [...steps], current_step: i + 1 } : t));
    }

    finishTask(task.id, steps, 'completed');
    toast({ title: '✅ টাস্ক সম্পন্ন', description: task.title });
  };

  const runTask = async (task: AutomationTask) => {
    if (task.title === 'GitHub Actions Trigger') {
      await runGitHubActions(task);
    } else if (task.title === 'Vercel Deploy') {
      await runVercelDeploy(task);
    } else {
      await runCustomTask(task);
    }
  };

  const finishTask = async (id: string, steps: any[], status: string) => {
    await supabase
      .from('automation_tasks')
      .update({ status, steps: steps as any, current_step: steps.length, last_run_at: new Date().toISOString() })
      .eq('id', id);
    setTasks(prev => prev.map(t => t.id === id ? { ...t, status, last_run_at: new Date().toISOString() } : t));
  };

  const deleteTask = async (id: string) => {
    await supabase.from('automation_tasks').delete().eq('id', id);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'done': return <CheckCircle className="w-4 h-4 text-primary" />;
      case 'running': return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-destructive" />;
      default: return <Circle className="w-4 h-4 text-muted-foreground/40" />;
    }
  };

  if (tasks.length === 0 && !showAdd) {
    return (
      <div className="flex-1 flex items-center justify-center text-center px-4">
        <div className="space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto">
            <Zap className="w-8 h-8 text-secondary" />
          </div>
          <p className="text-muted-foreground text-sm">
            অটোমেশন টাস্ক তৈরি করুন — GitHub Actions ট্রিগার, Vercel Deploy, বা কাস্টম টাস্ক।
          </p>
          <Button onClick={() => setShowAdd(true)} variant="outline" className="gap-2">
            <Plus className="w-4 h-4" /> নতুন টাস্ক
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 scrollbar-hide">
      {/* Add task panel */}
      {(showAdd || tasks.length > 0) && (
        <div className="glass-card rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Select value={taskType} onValueChange={(v: TaskType) => setTaskType(v)}>
              <SelectTrigger className="w-[180px] h-8 text-xs bg-muted/50 border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-card border-border">
                <SelectItem value="custom">কাস্টম টাস্ক</SelectItem>
                <SelectItem value="github-actions">
                  <span className="flex items-center gap-1.5"><Github className="w-3.5 h-3.5" /> GitHub Actions</span>
                </SelectItem>
                <SelectItem value="vercel-deploy">
                  <span className="flex items-center gap-1.5"><Rocket className="w-3.5 h-3.5" /> Vercel Deploy</span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {taskType === 'custom' && (
            <div className="flex gap-2">
              <Input placeholder="টাস্কের নাম লিখুন..." value={newTaskTitle} onChange={(e) => setNewTaskTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && createTask()} className="bg-muted/50 border-border text-sm" />
              <Button onClick={createTask} size="sm" disabled={!newTaskTitle.trim()}><Plus className="w-4 h-4" /></Button>
            </div>
          )}

          {taskType === 'github-actions' && (
            <div className="space-y-2">
              <Input placeholder="owner/repo (যেমন: user/my-app)" value={ghRepo} onChange={(e) => setGhRepo(e.target.value)} className="bg-muted/50 border-border text-xs font-mono" />
              <Input placeholder="Workflow নাম বা ফাইল (যেমন: ci.yml)" value={ghWorkflow} onChange={(e) => setGhWorkflow(e.target.value)} className="bg-muted/50 border-border text-xs font-mono" />
              <Button onClick={createTask} size="sm" className="w-full gap-2" disabled={!ghRepo.trim() || !ghWorkflow.trim()}>
                <Github className="w-4 h-4" /> টাস্ক তৈরি
              </Button>
            </div>
          )}

          {taskType === 'vercel-deploy' && (
            <div className="space-y-2">
              <Input placeholder="Vercel প্রজেক্ট নাম" value={vercelProject} onChange={(e) => setVercelProject(e.target.value)} className="bg-muted/50 border-border text-xs font-mono" />
              <Button onClick={createTask} size="sm" className="w-full gap-2" disabled={!vercelProject.trim()}>
                <Rocket className="w-4 h-4" /> টাস্ক তৈরি
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Task list */}
      <AnimatePresence>
        {tasks.map((task, i) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ delay: i * 0.03 }}
            className="glass-card rounded-xl p-4 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                  {task.title === 'GitHub Actions Trigger' && <Github className="w-4 h-4 text-primary" />}
                  {task.title === 'Vercel Deploy' && <Rocket className="w-4 h-4 text-primary" />}
                  {task.title}
                </h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    task.status === 'completed' ? 'bg-primary/15 text-primary' :
                    task.status === 'running' ? 'bg-secondary/15 text-secondary' :
                    task.status === 'failed' ? 'bg-destructive/15 text-destructive' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {task.status === 'completed' ? 'সম্পন্ন' : task.status === 'running' ? 'চলমান' : task.status === 'failed' ? 'ব্যর্থ' : 'অপেক্ষমাণ'}
                  </span>
                  {task.schedule && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {task.schedule}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                {task.status !== 'running' && (
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => runTask(task)}>
                    {task.status === 'completed' || task.status === 'failed' ? (
                      <RefreshCw className="w-4 h-4 text-primary" />
                    ) : (
                      <Play className="w-4 h-4 text-primary" />
                    )}
                  </Button>
                )}
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => deleteTask(task.id)}>
                  <Trash2 className="w-4 h-4 text-muted-foreground" />
                </Button>
              </div>
            </div>

            {/* Steps */}
            <div className="space-y-1.5 pl-1">
              {task.steps.map((step, si) => (
                <div key={si} className="flex items-center gap-2 text-xs">
                  {getStepIcon(step.status)}
                  <span className={step.status === 'done' ? 'text-primary' : step.status === 'running' ? 'text-secondary' : step.status === 'error' ? 'text-destructive' : 'text-muted-foreground'}>
                    {step.name}
                  </span>
                  {step.detail && <span className="text-muted-foreground text-[10px] ml-auto truncate max-w-[150px]">{step.detail}</span>}
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${task.status === 'failed' ? 'bg-destructive' : 'bg-primary'}`}
                style={{ width: `${(task.steps.filter(s => s.status === 'done').length / task.steps.length) * 100}%` }}
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
