import { useState, useEffect } from 'react';
import { Zap, Play, Pause, CheckCircle, Circle, Loader2, Clock, Plus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';

interface AutomationTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  steps: { name: string; status: string }[];
  current_step: number;
  schedule: string | null;
  last_run_at: string | null;
  created_at: string;
}

export const AutomationView = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<AutomationTask[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showAdd, setShowAdd] = useState(false);

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
    if (!newTaskTitle.trim() || !user) return;
    const steps = [
      { name: 'পরিকল্পনা তৈরি', status: 'pending' },
      { name: 'কোড জেনারেশন', status: 'pending' },
      { name: 'টেস্টিং', status: 'pending' },
      { name: 'ডিপ্লয়মেন্ট', status: 'pending' },
    ];
    const { data } = await supabase
      .from('automation_tasks')
      .insert({
        user_id: user.id,
        title: newTaskTitle,
        steps: steps as any,
        status: 'pending',
      })
      .select()
      .single();
    if (data) {
      setTasks(prev => [data as unknown as AutomationTask, ...prev]);
      setNewTaskTitle('');
      setShowAdd(false);
      toast({ title: 'টাস্ক তৈরি হয়েছে' });
    }
  };

  const runTask = async (task: AutomationTask) => {
    // Simulate step-by-step execution
    const updatedSteps = [...task.steps];
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'running' } : t));

    for (let i = 0; i < updatedSteps.length; i++) {
      updatedSteps[i].status = 'running';
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, steps: [...updatedSteps], current_step: i } : t));
      
      // Simulate work
      await new Promise(r => setTimeout(r, 1500 + Math.random() * 1000));
      
      updatedSteps[i].status = 'done';
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, steps: [...updatedSteps], current_step: i + 1 } : t));
    }

    // Update in DB
    await supabase
      .from('automation_tasks')
      .update({ status: 'completed', steps: updatedSteps as any, current_step: updatedSteps.length, last_run_at: new Date().toISOString() })
      .eq('id', task.id);
    
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'completed', last_run_at: new Date().toISOString() } : t));
    toast({ title: '✅ টাস্ক সম্পন্ন', description: task.title });
  };

  const deleteTask = async (id: string) => {
    await supabase.from('automation_tasks').delete().eq('id', id);
    setTasks(prev => prev.filter(t => t.id !== id));
  };

  const getStepIcon = (status: string) => {
    switch (status) {
      case 'done': return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'running': return <Loader2 className="w-4 h-4 text-primary animate-spin" />;
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
            অটোমেশন টাস্ক তৈরি করুন — AI ধাপে ধাপে সম্পন্ন করবে।
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
      {/* Add task */}
      <div className="flex gap-2">
        <Input
          placeholder="টাস্কের নাম লিখুন..."
          value={newTaskTitle}
          onChange={(e) => setNewTaskTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && createTask()}
          className="bg-muted/50 border-border text-sm"
        />
        <Button onClick={createTask} size="sm" disabled={!newTaskTitle.trim()}>
          <Plus className="w-4 h-4" />
        </Button>
      </div>

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
                <h3 className="font-semibold text-foreground text-sm">{task.title}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    task.status === 'completed' ? 'bg-emerald-500/15 text-emerald-400' :
                    task.status === 'running' ? 'bg-primary/15 text-primary' :
                    'bg-muted text-muted-foreground'
                  }`}>
                    {task.status === 'completed' ? 'সম্পন্ন' : task.status === 'running' ? 'চলমান' : 'অপেক্ষমাণ'}
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
                    <Play className="w-4 h-4 text-primary" />
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
                  <span className={step.status === 'done' ? 'text-emerald-400' : step.status === 'running' ? 'text-primary' : 'text-muted-foreground'}>
                    {step.name}
                  </span>
                </div>
              ))}
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${(task.steps.filter(s => s.status === 'done').length / task.steps.length) * 100}%` }}
              />
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};
