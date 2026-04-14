import { useState } from 'react';
import { Settings, Shield, LogOut, User, Palette, Languages, Zap, Crown, ChevronRight, Moon, Sun, Check } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useNavigate } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrandLogo } from './BrandLogo';
import { NotificationBell } from './NotificationBell';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenSettings: () => void;
  onOpenAdmin?: () => void;
}

export const Header = ({ activeTab, onTabChange, onOpenSettings, onOpenAdmin }: HeaderProps) => {
  const { user, signOut } = useAuth();
  const { isAdmin } = useAdmin();
  const navigate = useNavigate();
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [language, setLanguage] = useState<'bn' | 'en'>('bn');
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileData, setProfileData] = useState({ full_name: '', avatar_url: '' });
  const [savingProfile, setSavingProfile] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    document.documentElement.classList.toggle('light', newTheme === 'light');
    toast({ title: newTheme === 'dark' ? '🌙 ডার্ক মোড' : '☀️ লাইট মোড' });
  };

  const toggleLanguage = () => {
    const newLang = language === 'bn' ? 'en' : 'bn';
    setLanguage(newLang);
    toast({ title: newLang === 'bn' ? '🇧🇩 বাংলা সিলেক্ট হয়েছে' : '🇺🇸 English selected' });
  };

  const openProfile = async () => {
    setProfileOpen(true);
    if (user) {
      const { data } = await supabase.from('profiles').select('full_name, avatar_url').eq('user_id', user.id).single();
      if (data) setProfileData({ full_name: data.full_name || '', avatar_url: data.avatar_url || '' });
    }
  };

  const saveProfile = async () => {
    if (!user) return;
    setSavingProfile(true);
    await supabase.from('profiles').update({ full_name: profileData.full_name, avatar_url: profileData.avatar_url, updated_at: new Date().toISOString() } as any).eq('user_id', user.id);
    toast({ title: '✅ প্রোফাইল আপডেট হয়েছে' });
    setSavingProfile(false);
    setProfileOpen(false);
  };

  const userEmail = user?.email || 'ইউজার';
  const displayName = userEmail.split('@')[0];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/50 backdrop-blur-xl">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2.5 pl-10 md:pl-0">
            <BrandLogo size={28} />
            <span className="font-bold text-lg gradient-text tracking-tight">TIVO DEV</span>
          </div>

          <div className="flex items-center gap-1.5">
            <NotificationBell />

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl hover:bg-muted/50 transition-colors">
                  <Settings className="w-5 h-5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 glass-card border-border/50 rounded-2xl p-1.5" sideOffset={8}>
                {/* User info */}
                <div className="px-3 py-2.5 mb-1">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center ring-1 ring-primary/10">
                      <User className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{displayName}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{userEmail}</p>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="mt-2 flex items-center gap-1.5 px-2 py-1 bg-primary/10 rounded-lg w-fit">
                      <Crown className="w-3 h-3 text-primary" />
                      <span className="text-[10px] font-semibold text-primary uppercase tracking-wider">অ্যাডমিন</span>
                    </div>
                  )}
                </div>

                <DropdownMenuSeparator className="bg-border/30 mx-1" />

                {isAdmin && onOpenAdmin && (
                  <>
                    <DropdownMenuItem onClick={onOpenAdmin} className="gap-3 rounded-xl py-2.5 px-3 text-primary cursor-pointer focus:bg-primary/10">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Shield className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">অ্যাডমিন প্যানেল</p>
                        <p className="text-[10px] text-muted-foreground">সিস্টেম ও ইউজার ম্যানেজমেন্ট</p>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                    </DropdownMenuItem>
                    <DropdownMenuSeparator className="bg-border/30 mx-1" />
                  </>
                )}

                <DropdownMenuItem onClick={onOpenSettings} className="gap-3 rounded-xl py-2.5 px-3 cursor-pointer focus:bg-muted/50">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Zap className="w-4 h-4 text-accent" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">টোকেন ও API</p>
                    <p className="text-[10px] text-muted-foreground">কী কনফিগারেশন</p>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem onClick={toggleTheme} className="gap-3 rounded-xl py-2.5 px-3 cursor-pointer focus:bg-muted/50">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    {theme === 'dark' ? <Moon className="w-4 h-4 text-purple-400" /> : <Sun className="w-4 h-4 text-yellow-400" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">থিম</p>
                    <p className="text-[10px] text-muted-foreground">{theme === 'dark' ? 'ডার্ক মোড' : 'লাইট মোড'}</p>
                  </div>
                  <Check className={`w-3.5 h-3.5 ${theme === 'dark' ? 'text-purple-400' : 'text-yellow-400'}`} />
                </DropdownMenuItem>

                <DropdownMenuItem onClick={toggleLanguage} className="gap-3 rounded-xl py-2.5 px-3 cursor-pointer focus:bg-muted/50">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                    <Languages className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">ভাষা</p>
                    <p className="text-[10px] text-muted-foreground">{language === 'bn' ? '🇧🇩 বাংলা' : '🇺🇸 English'}</p>
                  </div>
                  <Check className="w-3.5 h-3.5 text-cyan-400" />
                </DropdownMenuItem>

                <DropdownMenuItem onClick={openProfile} className="gap-3 rounded-xl py-2.5 px-3 cursor-pointer focus:bg-muted/50">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <User className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground">প্রোফাইল</p>
                    <p className="text-[10px] text-muted-foreground">অ্যাকাউন্ট সেটিংস</p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-border/30 mx-1" />

                <DropdownMenuItem onClick={handleLogout} className="gap-3 rounded-xl py-2.5 px-3 cursor-pointer focus:bg-destructive/10 text-destructive">
                  <div className="w-8 h-8 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">লগআউট</p>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="glass-card border-border/50 sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              <User className="w-5 h-5 text-primary" /> প্রোফাইল সেটিংস
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center ring-2 ring-primary/10">
                <User className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{displayName}</p>
                <p className="text-xs text-muted-foreground">{userEmail}</p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">পুরো নাম</Label>
              <Input
                value={profileData.full_name}
                onChange={(e) => setProfileData(prev => ({ ...prev, full_name: e.target.value }))}
                placeholder="আপনার নাম"
                className="bg-muted/30 border-border/50 rounded-xl"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">অবতার URL</Label>
              <Input
                value={profileData.avatar_url}
                onChange={(e) => setProfileData(prev => ({ ...prev, avatar_url: e.target.value }))}
                placeholder="https://..."
                className="bg-muted/30 border-border/50 rounded-xl"
              />
            </div>
            <Button onClick={saveProfile} disabled={savingProfile} className="w-full rounded-xl gap-2">
              {savingProfile ? 'সেভ হচ্ছে...' : '✅ প্রোফাইল সেভ করুন'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
