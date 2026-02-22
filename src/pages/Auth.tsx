import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Bot, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && user) navigate('/dashboard');
  }, [user, authLoading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) throw error;
        navigate('/dashboard');
      } else {
        const { error } = await signUp(email, password, fullName);
        if (error) throw error;
        toast({ title: 'সফল!', description: 'ইমেইল যাচাই করুন।' });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'ত্রুটি', description: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm space-y-6"
      >
        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto">
            <Bot className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold gradient-text">TIVO AI Agent</h1>
          <p className="text-sm text-muted-foreground">আপনার AI কমান্ড সেন্টার</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-1.5">
              <Label htmlFor="name">নাম</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input id="name" placeholder="আপনার নাম" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-9 bg-muted/50 border-border" />
              </div>
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">ইমেইল</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9 bg-muted/50 border-border" required />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">পাসওয়ার্ড</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-9 bg-muted/50 border-border" required />
            </div>
          </div>
          <Button type="submit" className="w-full gap-2" disabled={loading}>
            {loading ? 'অপেক্ষা করুন...' : isLogin ? 'লগইন' : 'সাইনআপ'}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {isLogin ? 'অ্যাকাউন্ট নেই?' : 'অ্যাকাউন্ট আছে?'}{' '}
          <button onClick={() => setIsLogin(!isLogin)} className="text-primary hover:underline font-medium">
            {isLogin ? 'সাইনআপ করুন' : 'লগইন করুন'}
          </button>
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
