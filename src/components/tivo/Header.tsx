import { useState } from 'react';
import { Bot, Settings, Zap, Hammer, MessageSquare, History, Globe, LogOut, User, Palette, Languages } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

const navItems = [
  { label: 'অটোমেটেড', icon: Zap, id: 'automated' },
  { label: 'বিল্ট', icon: Hammer, id: 'built' },
  { label: 'পাবলিশড', icon: Globe, id: 'published' },
  { label: 'চ্যাট হিস্ট্রি', icon: History, id: 'history' },
];

interface HeaderProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onOpenSettings: () => void;
}

export const Header = ({ activeTab, onTabChange, onOpenSettings }: HeaderProps) => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    navigate('/auth');
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border">
      <div className="flex items-center justify-between px-4 h-14">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <span className="font-bold text-lg gradient-text">TIVO</span>
        </div>

        {/* Nav tabs */}
        <nav className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === item.id
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <item.icon className="w-4 h-4" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Settings */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-lg">
              <Settings className="w-5 h-5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 glass-card border-border">
            <DropdownMenuItem onClick={onOpenSettings} className="gap-2">
              <Zap className="w-4 h-4" /> ব্যাকেন্ড কনফিগ
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2">
              <Palette className="w-4 h-4" /> থিম
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2">
              <Languages className="w-4 h-4" /> ভাষা
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2">
              <User className="w-4 h-4" /> প্রোফাইল
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="gap-2 text-destructive">
              <LogOut className="w-4 h-4" /> লগআউট
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile nav */}
      <div className="flex md:hidden items-center gap-1 px-2 pb-2 overflow-x-auto scrollbar-hide">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              activeTab === item.id
                ? 'bg-primary/15 text-primary'
                : 'text-muted-foreground'
            }`}
          >
            <item.icon className="w-3.5 h-3.5" />
            {item.label}
          </button>
        ))}
      </div>
    </header>
  );
};
