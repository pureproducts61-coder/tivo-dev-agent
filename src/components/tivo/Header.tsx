import { Settings } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { BrandLogo } from './BrandLogo';
import { LogOut, User, Palette, Languages, Zap } from 'lucide-react';

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
        <div className="flex items-center gap-2 pl-10 md:pl-0">
          <BrandLogo size={28} />
          <span className="font-bold text-lg gradient-text">TIVO DEV</span>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-lg">
              <Settings className="w-5 h-5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 glass-card border-border">
            <DropdownMenuItem onClick={onOpenSettings} className="gap-2">
              <Zap className="w-4 h-4" /> টোকেন ও API কনফিগ
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
    </header>
  );
};
