import { useState } from 'react';
import { Settings, Shield, LogOut, User, Palette, Languages, Zap, Crown, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { useNavigate } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { BrandLogo } from './BrandLogo';
import { NotificationBell } from './NotificationBell';

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

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  const userEmail = user?.email || 'ইউজার';
  const displayName = userEmail.split('@')[0];

  return (
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
              {/* User info header */}
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

              <DropdownMenuItem className="gap-3 rounded-xl py-2.5 px-3 cursor-pointer focus:bg-muted/50">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Palette className="w-4 h-4 text-purple-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">থিম</p>
                  <p className="text-[10px] text-muted-foreground">ডার্ক / লাইট মোড</p>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem className="gap-3 rounded-xl py-2.5 px-3 cursor-pointer focus:bg-muted/50">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <Languages className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">ভাষা</p>
                  <p className="text-[10px] text-muted-foreground">বাংলা / English</p>
                </div>
              </DropdownMenuItem>

              <DropdownMenuItem className="gap-3 rounded-xl py-2.5 px-3 cursor-pointer focus:bg-muted/50">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">প্রোফাইল</p>
                  <p className="text-[10px] text-muted-foreground">অ্যাকাউন্ট সেটিংস</p>
                </div>
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
  );
};
