'use client';

/**
 * 전역 키보드 단축키 프로바이더
 *
 * - Command Palette (Cmd+K)
 * - 단축키 도움말 (Cmd+/ 또는 ?)
 * - 네비게이션 단축키 (G → D, G → P 등)
 */

import { createContext, useContext, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useCommandPalette, useShortcutsHelp, useGlobalHotkey } from '@/hooks/use-global-hotkeys';
import { CommandPalette } from '@/components/common/CommandPalette';
import { ShortcutsHelpModal } from '@/components/common/ShortcutsHelpModal';

interface GlobalHotkeysContextValue {
  openCommandPalette: () => void;
  openShortcutsHelp: () => void;
}

const GlobalHotkeysContext = createContext<GlobalHotkeysContextValue | null>(null);

export function useGlobalHotkeysContext() {
  const context = useContext(GlobalHotkeysContext);
  if (!context) {
    throw new Error('useGlobalHotkeysContext must be used within GlobalHotkeysProvider');
  }
  return context;
}

interface GlobalHotkeysProviderProps {
  children: ReactNode;
}

export function GlobalHotkeysProvider({ children }: GlobalHotkeysProviderProps) {
  const router = useRouter();
  const commandPalette = useCommandPalette();
  const shortcutsHelp = useShortcutsHelp();

  // G → D: 대시보드로 이동
  useGlobalHotkey(
    'g d',
    () => router.push('/dashboard'),
    { enableOnFormTags: false },
    [router]
  );

  // G → P: 프로젝트 목록으로 이동
  useGlobalHotkey(
    'g p',
    () => router.push('/projects'),
    { enableOnFormTags: false },
    [router]
  );

  // G → H: 홈으로 이동
  useGlobalHotkey(
    'g h',
    () => router.push('/'),
    { enableOnFormTags: false },
    [router]
  );

  // G → S: 설정으로 이동
  useGlobalHotkey(
    'g s',
    () => router.push('/settings'),
    { enableOnFormTags: false },
    [router]
  );

  const contextValue: GlobalHotkeysContextValue = {
    openCommandPalette: commandPalette.open,
    openShortcutsHelp: shortcutsHelp.open,
  };

  return (
    <GlobalHotkeysContext.Provider value={contextValue}>
      {children}

      {/* Command Palette */}
      <CommandPalette
        open={commandPalette.isOpen}
        onOpenChange={(open) =>
          open ? commandPalette.open() : commandPalette.close()
        }
        onShowShortcuts={shortcutsHelp.open}
      />

      {/* 단축키 도움말 모달 */}
      <ShortcutsHelpModal
        open={shortcutsHelp.isOpen}
        onOpenChange={(open) =>
          open ? shortcutsHelp.open() : shortcutsHelp.close()
        }
      />
    </GlobalHotkeysContext.Provider>
  );
}
