import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Play,
  Code2,
  FileText,
  FolderTree,
  Terminal,
  Sparkles,
  ExternalLink,
  Settings,
  ChevronRight,
  ChevronDown,
  File,
  Folder,
  Rocket,
  Eye,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { ProjectChat } from '@/components/dashboard/ProjectChat';
import { PublishModal } from '@/components/tivo/PublishModal';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';

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

interface FileNode {
  name: string;
  type: 'file' | 'folder';
  path: string;
  children?: FileNode[];
  content?: string;
}

// Mock file structure for demo
const mockFileStructure: FileNode[] = [
  {
    name: 'src',
    type: 'folder',
    path: '/src',
    children: [
      {
        name: 'components',
        type: 'folder',
        path: '/src/components',
        children: [
          {
            name: 'App.tsx',
            type: 'file',
            path: '/src/components/App.tsx',
            content: `import React from 'react';
import { Header } from './Header';
import { Main } from './Main';
import { Footer } from './Footer';

export const App = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Main />
      <Footer />
    </div>
  );
};`,
          },
          {
            name: 'Header.tsx',
            type: 'file',
            path: '/src/components/Header.tsx',
            content: `import React from 'react';

export const Header = () => {
  return (
    <header className="p-4 border-b">
      <h1 className="text-xl font-bold">My App</h1>
    </header>
  );
};`,
          },
        ],
      },
      {
        name: 'index.tsx',
        type: 'file',
        path: '/src/index.tsx',
        content: `import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './components/App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);`,
      },
      {
        name: 'index.css',
        type: 'file',
        path: '/src/index.css',
        content: `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
}`,
      },
    ],
  },
  {
    name: 'package.json',
    type: 'file',
    path: '/package.json',
    content: `{
  "name": "my-app",
  "version": "1.0.0",
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}`,
  },
];

const FileTreeItem = ({
  node,
  depth = 0,
  onSelect,
  selectedPath,
}: {
  node: FileNode;
  depth?: number;
  onSelect: (node: FileNode) => void;
  selectedPath: string | null;
}) => {
  const [isOpen, setIsOpen] = useState(depth < 2);

  const handleClick = () => {
    if (node.type === 'folder') {
      setIsOpen(!isOpen);
    } else {
      onSelect(node);
    }
  };

  return (
    <div>
      <button
        className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted/50 transition-colors rounded ${
          selectedPath === node.path ? 'bg-primary/10 text-primary' : 'text-foreground'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={handleClick}
      >
        {node.type === 'folder' ? (
          <>
            {isOpen ? (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
            <Folder className="w-4 h-4 text-yellow-500" />
          </>
        ) : (
          <>
            <span className="w-4" />
            <File className="w-4 h-4 text-blue-500" />
          </>
        )}
        <span className="truncate">{node.name}</span>
      </button>
      {node.type === 'folder' && isOpen && node.children && (
        <div>
          {node.children.map((child) => (
            <FileTreeItem
              key={child.path}
              node={child}
              depth={depth + 1}
              onSelect={onSelect}
              selectedPath={selectedPath}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ProjectEditor = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [project, setProject] = useState<Project | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [showChat, setShowChat] = useState(false);
  const [showPublish, setShowPublish] = useState(false);
  const [activeTab, setActiveTab] = useState('code');
  const [terminalOutput, setTerminalOutput] = useState<string[]>([
    '$ npm install',
    'Installing dependencies...',
    '✓ Dependencies installed successfully',
    '$ npm run dev',
    'Starting development server...',
    '✓ Server running at http://localhost:5173',
  ]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (projectId && user) {
      fetchProject();
    }
  }, [projectId, user]);

  const fetchProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setProject(data);

      // Select first file by default
      const firstFile = mockFileStructure[0]?.children?.[0]?.children?.[0];
      if (firstFile) {
        setSelectedFile(firstFile);
        setFileContent(firstFile.content || '');
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      toast({
        title: 'ত্রুটি',
        description: 'প্রজেক্ট লোড করতে সমস্যা হয়েছে',
        variant: 'destructive',
      });
      navigate('/dashboard');
    } finally {
      setIsLoadingProject(false);
    }
  };

  const handleFileSelect = (node: FileNode) => {
    setSelectedFile(node);
    setFileContent(node.content || '');
  };

  const handleSave = () => {
    toast({
      title: 'সেভ হয়েছে',
      description: `${selectedFile?.name} সেভ করা হয়েছে`,
    });
  };

  const handleRunProject = () => {
    setTerminalOutput((prev) => [
      ...prev,
      '$ npm run build',
      'Building project...',
      '✓ Build completed successfully',
    ]);
    toast({
      title: 'বিল্ড সম্পন্ন',
      description: 'প্রজেক্ট বিল্ড সফল হয়েছে',
    });
  };

  if (loading || isLoadingProject) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-mesh">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              ড্যাশবোর্ড
            </Button>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="font-semibold">{project.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSave}>
              <Save className="w-4 h-4 mr-2" />
              সেভ
            </Button>
            <Button variant="outline" size="sm" onClick={handleRunProject}>
              <Play className="w-4 h-4 mr-2" />
              রান
            </Button>
            <Button
              variant={showChat ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowChat(!showChat)}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AI চ্যাট
            </Button>
            {project.preview_url && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(project.preview_url!, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                প্রিভিউ
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="flex-1">
          {/* File Tree */}
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30}>
            <div className="h-full border-r border-border bg-muted/30">
              <div className="p-3 border-b border-border flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">ফাইলস</span>
              </div>
              <div className="p-2 overflow-y-auto h-[calc(100%-48px)]">
                {mockFileStructure.map((node) => (
                  <FileTreeItem
                    key={node.path}
                    node={node}
                    onSelect={handleFileSelect}
                    selectedPath={selectedFile?.path || null}
                  />
                ))}
              </div>
            </div>
          </ResizablePanel>

          <ResizableHandle withHandle />

          {/* Editor & Terminal */}
          <ResizablePanel defaultSize={showChat ? 50 : 80}>
            <ResizablePanelGroup direction="vertical">
              {/* Code Editor */}
              <ResizablePanel defaultSize={70} minSize={30}>
                <div className="h-full flex flex-col">
                  {selectedFile ? (
                    <>
                      <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm">{selectedFile.path}</span>
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <textarea
                          value={fileContent}
                          onChange={(e) => setFileContent(e.target.value)}
                          className="w-full h-full p-4 bg-background text-foreground font-mono text-sm resize-none focus:outline-none"
                          spellCheck={false}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                      <div className="text-center">
                        <Code2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                        <p>একটি ফাইল সিলেক্ট করুন</p>
                      </div>
                    </div>
                  )}
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle />

              {/* Terminal */}
              <ResizablePanel defaultSize={30} minSize={15}>
                <div className="h-full flex flex-col bg-zinc-950">
                  <div className="px-4 py-2 border-b border-border flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-zinc-300">টার্মিনাল</span>
                  </div>
                  <div className="flex-1 p-4 overflow-y-auto font-mono text-sm text-zinc-300">
                    {terminalOutput.map((line, index) => (
                      <div key={index} className="leading-6">
                        {line.startsWith('$') ? (
                          <span className="text-green-400">{line}</span>
                        ) : line.startsWith('✓') ? (
                          <span className="text-green-500">{line}</span>
                        ) : line.startsWith('✗') ? (
                          <span className="text-red-500">{line}</span>
                        ) : (
                          <span>{line}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </ResizablePanel>

          {/* AI Chat Panel */}
          {showChat && (
            <>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={30} minSize={20}>
                <ProjectChat
                  project={project}
                  onClose={() => setShowChat(false)}
                  onProjectUpdated={(updatedProject) => setProject(updatedProject)}
                  isEmbedded
                />
              </ResizablePanel>
            </>
          )}
        </ResizablePanelGroup>
      </div>
    </div>
  );
};

export default ProjectEditor;
