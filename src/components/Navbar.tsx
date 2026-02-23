import { Link } from 'react-router-dom';
import { Moon, Sun, Eye, Type, Sparkles, Menu, Languages } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useThemeStore } from '@/store/themeStore';
import { useUserStore } from '@/store/userStore';
import { SUPPORTED_LANGUAGES } from '@/services/translateService';
import { TranslatedText } from '@/components/TranslatedText';
import { motion } from 'framer-motion';

export function Navbar() {
  const { mode, setMode, isDyslexia, toggleDyslexia, isColorblind, toggleColorblind, language, setLanguage } = useThemeStore();
  const { isAuthenticated, user, logout } = useUserStore();

  const navLinks = [
    { label: 'Dashboard', path: '/dashboard' },
    { label: 'Courses', path: '/courses' },
    { label: 'AI Bot', path: '/ai-bot' },
    { label: 'Roadmap', path: '/roadmap' },
    { label: 'Notes', path: '/notes' },
    { label: 'Focus', path: '/focus' },
    { label: 'Study Planner', path: '/study-planner' },
    { label: 'Study VR', path: '/study-vr' },
    { label: 'Community', path: '/community' },
    { label: 'Analytics', path: '/analytics' },
  ];

  return (
    <motion.div
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className="fixed top-4 left-0 right-0 z-50 flex justify-center w-full pointer-events-none px-2 sm:px-4"
    >
      <nav className="pointer-events-auto flex h-14 w-full max-w-[98%] 2xl:max-w-7xl items-center justify-between rounded-full glass-panel px-3 lg:px-6 notranslate overflow-hidden">
        <div className="flex items-center gap-2 xl:gap-6 shrink-0">
          <Link to="/" className="flex items-center gap-2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="h-6 w-6 text-primary" />
            </motion.div>
            <span className="text-xl font-bold bg-gradient-cosmic bg-clip-text text-transparent">
              Edura
            </span>
          </Link>

          {/* Desktop Navigation */}
          {isAuthenticated && (
            <nav className="hidden lg:flex items-center gap-0 xl:gap-1 overflow-x-auto no-scrollbar">
              {navLinks.map((link) => (
                <Link key={link.path} to={link.path} className="shrink-0">
                  <Button variant="ghost" className="h-8 px-2 xl:px-3 text-[11px] xl:text-sm whitespace-nowrap">
                    <TranslatedText text={link.label} />
                  </Button>
                </Link>
              ))}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-1 xl:gap-2 shrink-0">
          {/* Language Selector */}
          <div className="notranslate hidden sm:block">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-[110px] xl:w-[140px] h-8 xl:h-9 text-xs xl:text-sm">
                <Languages className="mr-1 h-3 w-3 xl:h-4 xl:w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="notranslate">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code} className="text-xs xl:text-sm">
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 xl:h-10 xl:w-10"
            onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')}
            title="Toggle theme"
          >
            {mode === 'dark' ? <Sun className="h-4 w-4 xl:h-5 xl:w-5" /> : <Moon className="h-4 w-4 xl:h-5 xl:w-5" />}
          </Button>

          {/* Colorblind Mode */}
          <Button
            variant={isColorblind ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8 xl:h-10 xl:w-10 hidden md:inline-flex"
            onClick={toggleColorblind}
            title="Toggle colorblind-friendly mode"
          >
            <Eye className="h-4 w-4 xl:h-5 xl:w-5" />
          </Button>

          {/* Dyslexia Mode */}
          <Button
            variant={isDyslexia ? 'default' : 'ghost'}
            size="icon"
            className="h-8 w-8 xl:h-10 xl:w-10 hidden md:inline-flex"
            onClick={toggleDyslexia}
            title="Toggle dyslexia-friendly mode"
          >
            <Type className="h-4 w-4 xl:h-5 xl:w-5" />
          </Button>

          {isAuthenticated ? (
            <>
              {/* Mobile Menu */}
              <div className="lg:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    {navLinks.map((link) => (
                      <DropdownMenuItem key={link.path} asChild>
                        <Link to={link.path} className="w-full">
                          <TranslatedText text={link.label} />
                        </Link>
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="w-full">
                        <TranslatedText text="Settings" />
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={logout}>
                      <TranslatedText text="Logout" />
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Desktop User Menu */}
              <div className="hidden lg:block">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost">
                      {user?.name}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to="/settings" className="w-full">
                        <TranslatedText text="Settings" />
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={logout}>
                      <TranslatedText text="Logout" />
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          ) : (
            <Link to="/login">
              <Button variant="default" className="ml-2">
                <TranslatedText text="Get Started" />
              </Button>
            </Link>
          )}
        </div>
      </nav>
    </motion.div>
  );
}
