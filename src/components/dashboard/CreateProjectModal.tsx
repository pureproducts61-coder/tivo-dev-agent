import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onProjectCreated: (project: any) => void;
}

export const CreateProjectModal = ({ open, onClose, onProjectCreated }: CreateProjectModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({
        title: 'ত্রুটি',
        description: 'প্রজেক্টের নাম দিন',
        variant: 'destructive',
      });
      return;
    }

    if (!user) return;

    setIsCreating(true);

    try {
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: user.id,
          name: name.trim(),
          description: description.trim() || null,
          status: 'creating',
          tech_stack: [],
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: 'সফল!',
        description: 'প্রজেক্ট তৈরি হয়েছে',
      });

      onProjectCreated(data);
      setName('');
      setDescription('');
    } catch (error) {
      console.error('Error creating project:', error);
      toast({
        title: 'ত্রুটি',
        description: 'প্রজেক্ট তৈরি করতে সমস্যা হয়েছে',
        variant: 'destructive',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg"
          >
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-primary/20">
                    <Sparkles className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground">নতুন প্রজেক্ট</h2>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="text-muted-foreground"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="projectName">প্রজেক্টের নাম</Label>
                  <Input
                    id="projectName"
                    placeholder="My Awesome Project"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="bg-background/50"
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="projectDescription">বিবরণ (ঐচ্ছিক)</Label>
                  <Textarea
                    id="projectDescription"
                    placeholder="এই প্রজেক্টে কী বানাতে চান সেটা লিখুন..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="bg-background/50 min-h-[100px]"
                    maxLength={500}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={onClose}
                    disabled={isCreating}
                  >
                    বাতিল
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-primary to-secondary"
                    onClick={handleCreate}
                    disabled={isCreating || !name.trim()}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        তৈরি হচ্ছে...
                      </>
                    ) : (
                      'প্রজেক্ট তৈরি করুন'
                    )}
                  </Button>
                </div>
              </div>
            </GlassCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
