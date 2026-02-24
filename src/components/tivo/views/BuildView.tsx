import { useState, useEffect, useCallback, useRef } from 'react';
import { Github, Eye, EyeOff, Play, FolderGit2, FileCode, AlertTriangle, CheckCircle2, Loader2, Terminal, Plus, Save, ArrowLeft, Pencil, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/hooks/use-toast';
import { useTokens } from '@/hooks/useTokens';
import { useGitHubAPI } from '@/hooks/useGitHubAPI';

interface GitHubFile {
  name: string;
  path: string;
  type: string;
  sha: string;
  size?: number;
  download_url?: string;
}

interface TypewriterLine {
  text: string;
  status: 'typing' | 'done' | 'error';
  icon?: 'connect' | 'fetch' | 'push' | 'error' | 'success';
}

type ViewState = 'input' | 'terminal' | 'file-viewer' | 'file-editor' | 'file-creator';

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

const TypewriterLineComponent = ({ line, onDone }: { line: TypewriterLine; onDone?: () => void }) => {
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
  const { tokens, setToken } = useTokens();
  const gitHub = useGitHubAPI();
  const [token, setLocalToken] = useState(() => tokens.GITHUB_TOKEN || '');
  const [showToken, setShowToken] = useState(false);
  const [repoUrl, setRepoUrl] = useState('');
  const [isExecuting, setIsExecuting] = useState(false);
  const [lines, setLines] = useState<TypewriterLine[]>([]);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [repoFiles, setRepoFiles] = useState<GitHubFile[]>([]);
  const [executionComplete, setExecutionComplete] = useState(false);
  const [viewState, setViewState] = useState<ViewState>('input');
  const [currentPath, setCurrentPath] = useState('');
  const [pathHistory, setPathHistory] = useState<string[]>([]);
  const [parsedRepo, setParsedRepo] = useState<{ owner: string; repo: string } | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  // File viewer/editor state
  const [viewingFile, setViewingFile] = useState<{ path: string; content: string; sha: string } | null>(null);
  const [editContent, setEditContent] = useState('');
  const [commitMessage, setCommitMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // File creator state
  const [newFileName, setNewFileName] = useState('');
  const [newFileContent, setNewFileContent] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [currentLineIndex]);

  // Sync token from context
  useEffect(() => { setLocalToken(tokens.GITHUB_TOKEN || ''); }, [tokens.GITHUB_TOKEN]);

  const saveToken = () => {
    if (token.trim()) {
      setToken('GITHUB_TOKEN', token.trim());
      toast({ title: '✅ টোকেন সেভ হয়েছে' });
    }
  };

  const parseRepo = (url: string) => {
    const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
    if (match) return { owner: match[1], repo: match[2].replace('.git', '') };
    const parts = url.split('/').filter(Boolean);
    if (parts.length >= 2) return { owner: parts[0], repo: parts[1] };
    return null;
  };

  const ghFetch = async (endpoint: string, options?: RequestInit) => {
    return fetch(`https://api.github.com${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token.trim() || tokens.GITHUB_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });
  };

  const fetchContents = async (path = '') => {
    if (!parsedRepo) return;
    const endpoint = `/repos/${parsedRepo.owner}/${parsedRepo.repo}/contents/${path}`;
    const resp = await ghFetch(endpoint);
    if (resp.status === 401) {
      toast({ variant: 'destructive', title: 'Token Invalid', description: 'Wait, I think the token is invalid. Please double-check it, friend.' });
      return;
    }
    if (!resp.ok) throw new Error(`GitHub API error: ${resp.status}`);
    const data = await resp.json();
    setRepoFiles(Array.isArray(data) ? data : [data]);
    setCurrentPath(path);
  };

  const handleExecute = useCallback(async () => {
    if (!token.trim() || !repoUrl.trim()) return;

    const parsed = parseRepo(repoUrl);
    if (!parsed) {
      toast({ variant: 'destructive', title: 'ভুল ফরম্যাট', description: 'সঠিক GitHub URL বা owner/repo দিন।' });
      return;
    }

    setParsedRepo(parsed);
    setIsExecuting(true);
    setExecutionComplete(false);
    setRepoFiles([]);
    setCurrentLineIndex(0);
    setViewState('terminal');

    const maskedToken = token.slice(0, 4) + '••••••••' + token.slice(-4);

    const executionLines: TypewriterLine[] = [
      { text: 'TIVO is connecting to GitHub...', status: 'typing', icon: 'connect' },
      { text: `Authenticating with Token [${maskedToken}]...`, status: 'typing', icon: 'connect' },
      { text: `Fetching repository data from ${parsed.owner}/${parsed.repo}...`, status: 'typing', icon: 'fetch' },
    ];
    setLines(executionLines);

    try {
      const response = await ghFetch(`/repos/${parsed.owner}/${parsed.repo}/contents`);

      if (response.status === 401) {
        setLines(prev => [...prev, { text: 'Wait, I think the token is invalid. Please double-check it, friend.', status: 'error', icon: 'error' }]);
        setIsExecuting(false);
        return;
      }
      if (response.status === 404) {
        setLines(prev => [...prev, { text: `Repository "${parsed.owner}/${parsed.repo}" not found.`, status: 'error', icon: 'error' }]);
        setIsExecuting(false);
        return;
      }
      if (!response.ok) throw new Error(`GitHub API error: ${response.status}`);

      const files: GitHubFile[] = await response.json();
      setRepoFiles(files);

      setLines(prev => [
        ...prev,
        { text: `✓ Fetched ${files.length} items from repository.`, status: 'done', icon: 'success' },
        { text: `Repository "${parsed.owner}/${parsed.repo}" is ready. Click files to view/edit.`, status: 'done', icon: 'success' },
      ]);
      setExecutionComplete(true);
    } catch (err: any) {
      setLines(prev => [...prev, { text: `Error: ${err.message}`, status: 'error', icon: 'error' }]);
    } finally {
      setIsExecuting(false);
    }
  }, [token, repoUrl]);

  const handleFileClick = async (file: GitHubFile) => {
    if (!parsedRepo) return;
    if (file.type === 'dir') {
      setPathHistory(prev => [...prev, currentPath]);
      await fetchContents(file.path);
      return;
    }

    // Fetch file content
    try {
      const resp = await ghFetch(`/repos/${parsedRepo.owner}/${parsedRepo.repo}/contents/${file.path}`);
      if (!resp.ok) throw new Error('Failed to fetch file');
      const data = await resp.json();
      const content = atob(data.content);
      setViewingFile({ path: file.path, content, sha: data.sha });
      setEditContent(content);
      setCommitMessage(`Update ${file.name}`);
      setViewState('file-viewer');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'ত্রুটি', description: err.message });
    }
  };

  const handleGoBack = async () => {
    if (pathHistory.length > 0) {
      const prev = pathHistory[pathHistory.length - 1];
      setPathHistory(p => p.slice(0, -1));
      await fetchContents(prev);
    }
  };

  const handleSaveFile = async () => {
    if (!parsedRepo || !viewingFile) return;
    setIsSaving(true);
    try {
      const resp = await ghFetch(`/repos/${parsedRepo.owner}/${parsedRepo.repo}/contents/${viewingFile.path}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: commitMessage || `Update ${viewingFile.path}`,
          content: btoa(unescape(encodeURIComponent(editContent))),
          sha: viewingFile.sha,
        }),
      });
      if (resp.status === 401) {
        toast({ variant: 'destructive', title: 'Token Invalid', description: 'Wait, I think the token is invalid. Please double-check it, friend.' });
        return;
      }
      if (!resp.ok) throw new Error(`Push failed: ${resp.status}`);
      const result = await resp.json();
      setViewingFile(prev => prev ? { ...prev, sha: result.content.sha, content: editContent } : null);
      toast({ title: '✅ পুশ সফল', description: `"${viewingFile.path}" কমিট ও পুশ হয়েছে।` });
      setViewState('file-viewer');
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'ত্রুটি', description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateFile = async () => {
    if (!parsedRepo || !newFileName.trim()) return;
    setIsCreating(true);
    const filePath = currentPath ? `${currentPath}/${newFileName}` : newFileName;
    try {
      const resp = await ghFetch(`/repos/${parsedRepo.owner}/${parsedRepo.repo}/contents/${filePath}`, {
        method: 'PUT',
        body: JSON.stringify({
          message: `Create ${filePath}`,
          content: btoa(unescape(encodeURIComponent(newFileContent))),
        }),
      });
      if (resp.status === 401) {
        toast({ variant: 'destructive', title: 'Token Invalid', description: 'Wait, I think the token is invalid. Please double-check it, friend.' });
        return;
      }
      if (!resp.ok) throw new Error(`Create failed: ${resp.status}`);
      toast({ title: '✅ ফাইল তৈরি হয়েছে', description: `"${filePath}" পুশ হয়েছে।` });
      setNewFileName('');
      setNewFileContent('');
      setViewState('terminal');
      await fetchContents(currentPath);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'ত্রুটি', description: err.message });
    } finally {
      setIsCreating(false);
    }
  };

  const handleLineDone = useCallback(() => {
    setCurrentLineIndex(prev => prev + 1);
  }, []);

  const resetAll = () => {
    setLines([]);
    setCurrentLineIndex(0);
    setRepoFiles([]);
    setExecutionComplete(false);
    setViewState('input');
    setCurrentPath('');
    setPathHistory([]);
    setParsedRepo(null);
    setViewingFile(null);
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 scrollbar-hide">
      {/* Input Panel */}
      <AnimatePresence mode="wait">
        {viewState === 'input' && (
          <motion.div key="input-panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="max-w-xl mx-auto space-y-5">
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
                  <Input type={showToken ? 'text' : 'password'} placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" value={token} onChange={(e) => setLocalToken(e.target.value)} onBlur={saveToken} className="bg-muted/50 border-border pr-10 font-mono text-xs" />
                  <button type="button" onClick={() => setShowToken(!showToken)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Repository (URL or owner/repo)</Label>
                <Input placeholder="https://github.com/owner/repo or owner/repo" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} className="bg-muted/50 border-border font-mono text-xs" />
              </div>
              <Button onClick={handleExecute} className="w-full gap-2" disabled={!token.trim() || !repoUrl.trim()}>
                <Play className="w-4 h-4" /> Execute
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Terminal + File Browser */}
      {viewState === 'terminal' && (
        <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-2xl mx-auto space-y-4">
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-destructive/70" />
                <div className="w-3 h-3 rounded-full bg-accent/70" />
                <div className="w-3 h-3 rounded-full bg-primary/70" />
              </div>
              <span className="text-xs text-muted-foreground font-mono flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" /> TIVO GitHub Client
              </span>
            </div>
            <div ref={terminalRef} className="p-4 space-y-3 min-h-[180px] max-h-[300px] overflow-y-auto scrollbar-hide bg-background/50">
              {lines.map((line, i) => (
                i <= currentLineIndex && (
                  <TypewriterLineComponent key={i} line={line} onDone={i === currentLineIndex ? handleLineDone : undefined} />
                )
              ))}
            </div>
          </div>

          {/* File Browser */}
          {executionComplete && repoFiles.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FolderGit2 className="w-4 h-4 text-primary" />
                  {currentPath ? `/${currentPath}` : 'Repository Root'}
                </h3>
                <div className="flex gap-1.5">
                  {currentPath && (
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleGoBack}>
                      <ArrowLeft className="w-3.5 h-3.5" /> পেছনে
                    </Button>
                  )}
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setViewState('file-creator'); }}>
                    <Plus className="w-3.5 h-3.5" /> নতুন ফাইল
                  </Button>
                </div>
              </div>
              <div className="grid gap-1">
                {repoFiles.sort((a, b) => (a.type === 'dir' ? -1 : 1) - (b.type === 'dir' ? -1 : 1) || a.name.localeCompare(b.name)).map((file) => (
                  <button
                    key={file.sha}
                    onClick={() => handleFileClick(file)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-left w-full group"
                  >
                    {file.type === 'dir' ? (
                      <FolderGit2 className="w-3.5 h-3.5 text-secondary shrink-0" />
                    ) : (
                      <FileCode className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    )}
                    <span className="text-xs font-mono text-foreground truncate">{file.name}</span>
                    {file.type === 'file' && (
                      <Pencil className="w-3 h-3 text-muted-foreground/0 group-hover:text-muted-foreground ml-auto shrink-0 transition-colors" />
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {!isExecuting && (
            <div className="text-center">
              <Button variant="outline" size="sm" onClick={resetAll}>নতুন অপারেশন</Button>
            </div>
          )}
        </motion.div>
      )}

      {/* File Viewer */}
      {viewState === 'file-viewer' && viewingFile && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setViewState('terminal')}>
              <ArrowLeft className="w-3.5 h-3.5" /> ফাইল ব্রাউজার
            </Button>
            <Button size="sm" className="gap-1 text-xs" onClick={() => setViewState('file-editor')}>
              <Pencil className="w-3.5 h-3.5" /> এডিট ও পুশ
            </Button>
          </div>

          <div className="glass-card rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b border-border flex items-center gap-2">
              <FileCode className="w-4 h-4 text-primary" />
              <span className="text-xs font-mono text-foreground">{viewingFile.path}</span>
            </div>
            <pre className="p-4 text-xs font-mono text-foreground overflow-x-auto max-h-[500px] overflow-y-auto scrollbar-hide bg-background/50 whitespace-pre-wrap break-all">
              {viewingFile.content}
            </pre>
          </div>
        </motion.div>
      )}

      {/* File Editor */}
      {viewState === 'file-editor' && viewingFile && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setViewState('file-viewer')}>
              <ArrowLeft className="w-3.5 h-3.5" /> ভিউয়ার
            </Button>
            <span className="text-xs font-mono text-muted-foreground">{viewingFile.path}</span>
          </div>

          <div className="glass-card rounded-xl p-4 space-y-3">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="bg-background/50 border-border font-mono text-xs min-h-[350px] resize-y"
              spellCheck={false}
            />
            <div className="space-y-2">
              <Input
                placeholder="কমিট মেসেজ লিখুন..."
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                className="bg-muted/50 border-border text-xs"
              />
              <div className="flex gap-2">
                <Button onClick={handleSaveFile} className="flex-1 gap-2" disabled={isSaving}>
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  কমিট ও পুশ
                </Button>
                <Button variant="outline" onClick={() => setViewState('file-viewer')}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* File Creator */}
      {viewState === 'file-creator' && (
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-2xl mx-auto space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setViewState('terminal')}>
              <ArrowLeft className="w-3.5 h-3.5" /> ফাইল ব্রাউজার
            </Button>
            <span className="text-xs text-muted-foreground">{currentPath ? `/${currentPath}/` : '/'}</span>
          </div>

          <div className="glass-card rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Plus className="w-4 h-4 text-primary" /> নতুন ফাইল তৈরি করুন
            </h3>
            <Input
              placeholder="ফাইলের নাম (যেমন: index.js, README.md)"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              className="bg-muted/50 border-border font-mono text-xs"
            />
            <Textarea
              placeholder="ফাইলের কনটেন্ট লিখুন..."
              value={newFileContent}
              onChange={(e) => setNewFileContent(e.target.value)}
              className="bg-background/50 border-border font-mono text-xs min-h-[250px] resize-y"
              spellCheck={false}
            />
            <div className="flex gap-2">
              <Button onClick={handleCreateFile} className="flex-1 gap-2" disabled={isCreating || !newFileName.trim()}>
                {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                তৈরি ও পুশ
              </Button>
              <Button variant="outline" onClick={() => setViewState('terminal')}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};
