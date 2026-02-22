import { useState, useEffect, useCallback, useRef } from 'react';
import { Github, Eye, EyeOff, Play, FolderGit2, FileCode, AlertTriangle, CheckCircle2, Loader2, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';

interface GitHubFile {
  name: string;
  path: string;
  type: string;
  sha: string;
}

interface TypewriterLine {
  text: string;
  status: 'typing' | 'done' | 'error';
  icon?: 'connect' | 'fetch' | 'push' | 'error' | 'success';
}

const useTypewriter = (text: string, speed = 30, startTyping = false) => {
  const [displayed, setDisplayed] = useState('');
  const [isDone, setIsDone] = useState(false);

  useEffect(() => {
    if (!startTyping) { setDisplayed(''); setIsDone(false); return; }
    setDisplayed('');
    setIsDone(false);
    let i = 0;
    const interval = setInterval(() => {
      if (i < text.length) {
        setDisplayed(text.slice(0, i + 1));
        i++;
      } else {
        setIsDone(true);
        clearInterval(interval);
      }
    }, speed);
    return () => clearInterval(interval);
  }, [text, speed, startTyping]);

  return { displayed, isDone };
};

const TypewriterLine = ({ line, onDone }: { line: TypewriterLine; onDone?: () => void }) => {
  const { displayed, isDone } = useTypewriter(line.text, 25, true);

  useEffect(() => {
    if (isDone && onDone) onDone();
  }, [isDone, onDone]);

  const iconMap = {
    connect: <Github className="w-4 h-4 text-primary" />,
    fetch: <FolderGit2 className="w-4 h-4 text-secondary" />,
    push: <FileCode className="w-4 h-4 text-primary" />,
    error: <AlertTriangle className="w-4 h-4 text-destructive" />,
    success: <CheckCircle2 className="w-4 h-4 text-primary" />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="flex items-start gap-3 font-mono text-sm"
    >
      <span className="mt-0.5 shrink-0">
        {line.status === 'typing' && !isDone ? (
          <Loader2 className="w-4 h-4 text-primary animate-spin" />
        ) : line.status === 'error' ? (
          iconMap.error
        ) : (
          iconMap[line.icon || 'success']
        )}
      </span>
      <span className={line.status === 'error' ? 'text-destructive' : 'text-foreground'}>
        {displayed}
        {!isDone && <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-0.5" />}
      </span>
    </motion.div>
  );
};

export const BuildView = () => {
  const [token, setToken] = useState(() => localStorage.getItem('tivo_GITHUB_TOKEN') || '');
  const [showToken, setShowToken] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [lines, setLines] = useState<TypewriterLine[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [repoFiles, setRepoFiles] = useState<GitHubFile[]>([]);
  const [executionComplete, setExecutionComplete] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [currentLineIndex]);

  const saveToken = () => {
    if (token.trim()) {
      localStorage.setItem('tivo_GITHUB_TOKEN', token.trim());
      toast({ title: '✅ টোকেন সেভ হয়েছে', description: 'GitHub Personal Access Token সংরক্ষিত।' });
    }
  };

  const parseRepo = (url: string) => {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (match) return { owner: match[1], repo: match[2].replace('.git', '') };
    const parts = url.split('/').filter(Boolean);
    if (parts.length >= 2) return { owner: parts[0], repo: parts[1] };
    return null;
  };

  const handleExecute = useCallback(async () => {
    if (!token.trim()) {
      toast({ variant: 'destructive', title: 'টোকেন দরকার', description: 'অনুগ্রহ করে GitHub Token দিন।' });
      return;
    }
    if (!repoUrl.trim()) {
      toast({ variant: 'destructive', title: 'রেপো দরকার', description: 'Repository URL বা owner/repo দিন।' });
      return;
    }

    const parsed = parseRepo(repoUrl);
    if (!parsed) {
      toast({ variant: 'destructive', title: 'ভুল ফরম্যাট', description: 'সঠিক GitHub URL বা owner/repo দিন।' });
      return;
    }

    // Clear screen and start execution
    setIsExecuting(true);
    setExecutionComplete(false);
    setRepoFiles([]);
    setCurrentLineIndex(0);

    const maskedToken = token.slice(0, 4) + '••••••••' + token.slice(-4);

    const executionLines: TypewriterLine[] = [
      { text: 'TIVO is connecting to GitHub...', status: 'typing', icon: 'connect' },
      { text: `Authenticating with Token [${maskedToken}]...`, status: 'typing', icon: 'connect' },
      { text: `Fetching repository data from ${parsed.owner}/${parsed.repo}...`, status: 'typing', icon: 'fetch' },
    ];

    setLines(executionLines);

    // Actually fetch from GitHub API
    try {
      const response = await fetch(
        `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/contents`,
        {
          headers: {
            Authorization: `Bearer ${token.trim()}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      if (response.status === 401) {
        setLines(prev => [
          ...prev,
          { text: 'Wait, I think the token is invalid. Please double-check it, friend.', status: 'error', icon: 'error' },
        ]);
        setIsExecuting(false);
        return;
      }

      if (response.status === 404) {
        setLines(prev => [
          ...prev,
          { text: `Repository "${parsed.owner}/${parsed.repo}" not found. Check the URL.`, status: 'error', icon: 'error' },
        ]);
        setIsExecuting(false);
        return;
      }

      if (!response.ok) {
        throw new Error(`GitHub API error: ${response.status}`);
      }

      const files: GitHubFile[] = await response.json();
      setRepoFiles(files);

      setLines(prev => [
        ...prev,
        { text: `✓ Successfully fetched ${files.length} items from repository.`, status: 'done', icon: 'success' },
        { text: `Repository "${parsed.owner}/${parsed.repo}" is ready for operations.`, status: 'done', icon: 'success' },
      ]);
      setExecutionComplete(true);
    } catch (err: any) {
      setLines(prev => [
        ...prev,
        { text: `Error: ${err.message}`, status: 'error', icon: 'error' },
      ]);
    } finally {
      setIsExecuting(false);
    }
  }, [token, repoUrl]);

  const handleLineDone = useCallback(() => {
    setCurrentLineIndex(prev => prev + 1);
  }, []);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-hide">
      {/* Token & Repo Input */}
      <AnimatePresence mode="wait">
        {!isExecuting && lines.length === 0 && (
          <motion.div
            key="input-panel"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="max-w-xl mx-auto space-y-5"
          >
            <div className="text-center space-y-2">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Github className="w-7 h-7 text-primary" />
              </div>
              <h2 className="text-xl font-bold text-foreground">GitHub API Client</h2>
              <p className="text-sm text-muted-foreground">টার্মিনাল ছাড়াই GitHub রেপো ম্যানেজ করুন</p>
            </div>

            <div className="glass-card rounded-xl p-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Personal Access Token</Label>
                <div className="relative">
                  <Input
                    type={showToken ? 'text' : 'password'}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    onBlur={saveToken}
                    className="bg-muted/50 border-border pr-10 font-mono text-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Repository (URL or owner/repo)</Label>
                <Input
                  placeholder="https://github.com/owner/repo or owner/repo"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  className="bg-muted/50 border-border font-mono text-xs"
                />
              </div>

              <Button onClick={handleExecute} className="w-full gap-2" disabled={!token.trim() || !repoUrl.trim()}>
                <Play className="w-4 h-4" /> Execute
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Terminal Output */}
      {lines.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-2xl mx-auto"
        >
          <div className="glass-card rounded-xl overflow-hidden">
            {/* Terminal header */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive/70" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                <div className="w-3 h-3 rounded-full bg-primary/70" />
              </div>
              <span className="text-xs text-muted-foreground font-mono flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" /> TIVO GitHub Client
              </span>
            </div>

            {/* Terminal body */}
            <div ref={terminalRef} className="p-4 space-y-3 min-h-[200px] max-h-[400px] overflow-y-auto scrollbar-hide bg-background/50">
              {lines.map((line, i) => (
                i <= currentLineIndex && (
                  <TypewriterLine
                    key={i}
                    line={line}
                    onDone={i === currentLineIndex ? handleLineDone : undefined}
                  />
                )
              ))}
            </div>
          </div>

          {/* Repo files */}
          {executionComplete && repoFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="glass-card rounded-xl mt-4 p-4 space-y-2"
            >
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-primary" /> Repository Contents
              </h3>
              <div className="grid gap-1">
                {repoFiles.map((file) => (
                  <div key={file.sha} className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-muted/50 transition-colors">
                    {file.type === 'dir' ? (
                      <FolderGit2 className="w-3.5 h-3.5 text-secondary" />
                    ) : (
                      <FileCode className="w-3.5 h-3.5 text-muted-foreground" />
                    )}
                    <span className="text-xs font-mono text-foreground">{file.name}</span>
                    <span className="text-[10px] text-muted-foreground ml-auto uppercase">{file.type}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Reset button */}
          {!isExecuting && lines.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-4 text-center">
              <Button variant="outline" size="sm" onClick={() => { setLines([]); setCurrentLineIndex(0); setRepoFiles([]); setExecutionComplete(false); }}>
                নতুন অপারেশন শুরু করুন
              </Button>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
};
