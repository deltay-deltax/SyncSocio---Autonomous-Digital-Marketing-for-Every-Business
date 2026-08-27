import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import {
  Home,
  BarChart3,
  Settings,
  Sparkles,
  Image,
  MessageSquare,
  Bot,
  HelpCircle,
  CreditCard,
  Package,
  History,
  Zap,
  Send,
  Palette,
  Copy,
  Calendar,
} from 'lucide-react';

const navigationItems = [
  { label: 'Dashboard Home', icon: Home, path: '/dashboard', group: 'Navigation' },
  { label: 'Content Strategy', icon: Sparkles, path: '/dashboard/strategy', group: 'Navigation' },
  { label: 'Content Plan', icon: Calendar, path: '/dashboard/content/plan', group: 'Navigation' },
  { label: 'Feed', icon: Image, path: '/dashboard/feed', group: 'Navigation' },
  { label: 'Analytics', icon: BarChart3, path: '/dashboard/analytics', group: 'Navigation' },
  { label: 'DM Automation', icon: MessageSquare, path: '/dashboard/dms', group: 'Navigation' },
  { label: 'Nexa AI Agent', icon: Bot, path: '/dashboard/nexa', group: 'Navigation' },
  { label: 'Asset Library', icon: Image, path: '/dashboard/assets', group: 'Navigation' },
  { label: 'Products', icon: Package, path: '/dashboard/products', group: 'Navigation' },
  { label: 'History', icon: History, path: '/dashboard/history', group: 'Navigation' },
  { label: 'Settings', icon: Settings, path: '/dashboard/settings', group: 'Navigation' },
];

const actionItems = [
  { label: 'Generate New Creative', icon: Sparkles, path: '/dashboard/strategy', group: 'Actions' },
  { label: 'Autopilot Mode', icon: Zap, path: '/dashboard/autopilot', group: 'Actions' },
  { label: 'Clone Mode', icon: Copy, path: '/dashboard/clone', group: 'Actions' },
  { label: 'Post Optimizer', icon: Send, path: '/dashboard/post-optimizer', group: 'Actions' },
  { label: 'Editor', icon: Palette, path: '/dashboard/editor', group: 'Actions' },
];

const supportItems = [
  { label: 'Buy Credits', icon: CreditCard, path: '/dashboard/buy-credits', group: 'Support' },
  { label: 'Billing', icon: CreditCard, path: '/dashboard/billing', group: 'Support' },
  { label: 'FAQ', icon: HelpCircle, path: '/dashboard/faq', group: 'Support' },
  { label: 'Support', icon: HelpCircle, path: '/dashboard/support', group: 'Support' },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      setOpen((prev) => !prev);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleSelect = (path: string) => {
    setOpen(false);
    navigate(path);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Search pages, actions, settings..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          {navigationItems.map((item) => (
            <CommandItem
              key={item.path}
              onSelect={() => handleSelect(item.path)}
              className="cursor-pointer"
            >
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Quick Actions">
          {actionItems.map((item) => (
            <CommandItem
              key={item.path + item.label}
              onSelect={() => handleSelect(item.path)}
              className="cursor-pointer"
            >
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>

        <CommandSeparator />

        <CommandGroup heading="Support & Billing">
          {supportItems.map((item) => (
            <CommandItem
              key={item.path + item.label}
              onSelect={() => handleSelect(item.path)}
              className="cursor-pointer"
            >
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.label}</span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>

      <div className="border-t px-3 py-2 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Navigate with ↑↓ keys • Enter to select • Esc to close</span>
        <CommandShortcut>⌘K</CommandShortcut>
      </div>
    </CommandDialog>
  );
}
