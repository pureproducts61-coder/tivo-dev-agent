import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, 
  FolderOpen, 
  Play, 
  Pause, 
  Trash2, 
  ExternalLink, 
  Github,
  Sparkles,
  LogOut,
  Search,
  LayoutGrid,
  List,
  Code2
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { GlassCard } from '@/components/ui/GlassCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CreateProjectModal } from '@/components/dashboard/CreateProjectModal';
import { ProjectChat } from '@/components/dashboard/ProjectChat';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  tech_stack: string[];
  github_url: string | null;
  preview_url: string | null;
  created_at: string;
  updated_at: string;
}

const Dashboard = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchProjects();
    }
  }, [user]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast({
        title: 'ত্রুটি',
        description: 'প্রজেক্ট লোড করতে সমস্যা হয়েছে',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingProjects(false);
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', projectId);

      if (error) throw error;

      setProjects(projects.filter(p => p.id !== projectId));
      toast({
        title: 'সফল',
        description: 'প্রজেক্ট মুছে ফেলা হয়েছে',
      });
    } catch (error) {
      console.error('Error deleting project:', error);
      toast({
        title: 'ত্রুটি',
        description: 'প্রজেক্ট মুছতে সমস্যা হয়েছে',
        variant: 'destructive',
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    project.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'deployed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'running':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'creating':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'stopped':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'error':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'deployed': return 'ডিপ্লয়েড';
      case 'running': return 'চলছে';
      case 'creating': return 'তৈরি হচ্ছে';
      case 'stopped': return 'বন্ধ';
      case 'error': return 'ত্রুটি';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-mesh">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-mesh">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-primary" />
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Auto Dev
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden md:block">
              {user?.email}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="text-muted-foreground hover:text-foreground"
            >
              <LogOut className="w-4 h-4 mr-2" />
              লগআউট
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Top Actions */}
        <div className="flex flex-col md:flex-row gap-4 mb-8 items-start md:items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">আপনার প্রজেক্টস</h1>
            <p className="text-muted-foreground">
              AI দিয়ে নতুন প্রজেক্ট তৈরি করুন বা আগের প্রজেক্ট ম্যানেজ করুন
            </p>
          </div>

          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-gradient-to-r from-primary to-secondary hover:opacity-90"
          >
            <Plus className="w-4 h-4 mr-2" />
            নতুন প্রজেক্ট
          </Button>
        </div>

        {/* Search and View Toggle */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="প্রজেক্ট খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background/50"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Projects Grid/List */}
        {isLoadingProjects ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <GlassCard className="p-12 text-center">
            <FolderOpen className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">কোনো প্রজেক্ট নেই</h3>
            <p className="text-muted-foreground mb-6">
              {searchQuery ? 'এই নামে কোনো প্রজেক্ট পাওয়া যায়নি' : 'আপনার প্রথম প্রজেক্ট তৈরি করুন'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                নতুন প্রজেক্ট তৈরি করুন
              </Button>
            )}
          </GlassCard>
        ) : (
          <motion.div
            className={
              viewMode === 'grid'
                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
                : 'flex flex-col gap-4'
            }
          >
            <AnimatePresence>
              {filteredProjects.map((project, index) => (
                <motion.div
                  key={project.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GlassCard 
                    className={`p-6 hover:shadow-glass transition-all cursor-pointer ${
                      viewMode === 'list' ? 'flex items-center justify-between' : ''
                    }`}
                    onClick={() => setSelectedProject(project)}
                  >
                    <div className={viewMode === 'list' ? 'flex items-center gap-4 flex-1' : ''}>
                      <div className={viewMode === 'list' ? 'flex-1' : ''}>
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-lg font-semibold text-foreground truncate">
                            {project.name}
                          </h3>
                          <Badge className={`${getStatusColor(project.status)} border`}>
                            {getStatusText(project.status)}
                          </Badge>
                        </div>

                        {project.description && (
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                            {project.description}
                          </p>
                        )}

                        {project.tech_stack.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-4">
                            {project.tech_stack.slice(0, 3).map((tech) => (
                              <Badge key={tech} variant="secondary" className="text-xs">
                                {tech}
                              </Badge>
                            ))}
                            {project.tech_stack.length > 3 && (
                              <Badge variant="secondary" className="text-xs">
                                +{project.tech_stack.length - 3}
                              </Badge>
                            )}
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground">
                          {new Date(project.created_at).toLocaleDateString('bn-BD')}
                        </p>
                      </div>
                    </div>

                    <div className={`flex gap-2 ${viewMode === 'list' ? '' : 'mt-4'}`}>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/project/${project.id}`);
                        }}
                      >
                        <Code2 className="w-4 h-4 mr-1" />
                        এডিট
                      </Button>
                      {project.preview_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(project.preview_url!, '_blank');
                          }}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      )}
                      {project.github_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(project.github_url!, '_blank');
                          }}
                        >
                          <Github className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProject(project.id);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </GlassCard>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </main>

      {/* Create Project Modal */}
      <CreateProjectModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onProjectCreated={(project) => {
          setProjects([project, ...projects]);
          setShowCreateModal(false);
          setSelectedProject(project);
        }}
      />

      {/* Project Chat Modal */}
      {selectedProject && (
        <ProjectChat
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onProjectUpdated={(updatedProject) => {
            setProjects(projects.map(p => 
              p.id === updatedProject.id ? updatedProject : p
            ));
            setSelectedProject(updatedProject);
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
