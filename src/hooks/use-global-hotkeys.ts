'use client';

/**
 * 전역 키보드 단축키 훅
 * react-hotkeys-hook 기반
 */

import { useHotkeys, Options } from 'react-hotkeys-hook';
import { useCallback, useState } from 'react';

// 단축키 정의
export interface Shortcut {
  id: string;
  key: string;
  description: string;
  category: 'global' | 'video' | 'navigation';
  handler: () => void;
}

// 단축키 설정 옵션
const defaultOptions: Options = {
  enableOnFormTags: false, // input, textarea 등에서 비활성화
  preventDefault: true,
};

/**
 * 전역 단축키 훅
 */
export function useGlobalHotkey(
  key: string,
  callback: () => void,
  options?: Partial<Options>,
  deps?: unknown[]
) {
  const memoizedCallback = useCallback(callback, deps || []);

  useHotkeys(
    key,
    memoizedCallback,
    {
      ...defaultOptions,
      ...options,
    },
    deps
  );
}

/**
 * 영상 페이지 전용 단축키 훅
 */
export function useVideoHotkeys({
  onPlayPause,
  onSeekForward,
  onSeekBackward,
  onNextFeedback,
  onPrevFeedback,
  onToggleFeedbackPanel,
  enabled = true,
}: {
  onPlayPause?: () => void;
  onSeekForward?: () => void;
  onSeekBackward?: () => void;
  onNextFeedback?: () => void;
  onPrevFeedback?: () => void;
  onToggleFeedbackPanel?: () => void;
  enabled?: boolean;
}) {
  // Space: 재생/정지
  useHotkeys(
    'space',
    (e) => {
      e.preventDefault();
      onPlayPause?.();
    },
    { enabled, enableOnFormTags: false },
    [onPlayPause, enabled]
  );

  // →: 5초 앞으로
  useHotkeys(
    'right',
    (e) => {
      e.preventDefault();
      onSeekForward?.();
    },
    { enabled, enableOnFormTags: false },
    [onSeekForward, enabled]
  );

  // ←: 5초 뒤로
  useHotkeys(
    'left',
    (e) => {
      e.preventDefault();
      onSeekBackward?.();
    },
    { enabled, enableOnFormTags: false },
    [onSeekBackward, enabled]
  );

  // J: 다음 피드백
  useHotkeys(
    'j',
    () => onNextFeedback?.(),
    { enabled, enableOnFormTags: false },
    [onNextFeedback, enabled]
  );

  // K: 이전 피드백
  useHotkeys(
    'k',
    () => onPrevFeedback?.(),
    { enabled, enableOnFormTags: false },
    [onPrevFeedback, enabled]
  );

  // F: 피드백 패널 토글
  useHotkeys(
    'f',
    () => onToggleFeedbackPanel?.(),
    { enabled, enableOnFormTags: false },
    [onToggleFeedbackPanel, enabled]
  );
}

/**
 * 단축키 도움말 표시 상태 훅
 */
export function useShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  // Cmd/Ctrl + / 또는 ? 로 도움말 열기
  useHotkeys(
    'mod+slash, shift+slash',
    () => setIsOpen(true),
    { enableOnFormTags: false },
    [setIsOpen]
  );

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
  };
}

/**
 * Command Palette 상태 훅
 */
export function useCommandPalette() {
  const [isOpen, setIsOpen] = useState(false);

  // Cmd/Ctrl + K 로 팔레트 열기
  useHotkeys(
    'mod+k',
    (e) => {
      e.preventDefault();
      setIsOpen(true);
    },
    { enableOnFormTags: true }, // input에서도 작동
    [setIsOpen]
  );

  // Esc로 닫기
  useHotkeys(
    'escape',
    () => setIsOpen(false),
    { enabled: isOpen, enableOnFormTags: true },
    [setIsOpen, isOpen]
  );

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen((prev) => !prev),
  };
}

// 단축키 카테고리별 목록
export const SHORTCUT_LIST = {
  global: [
    { key: 'Cmd/Ctrl + K', description: '글로벌 검색' },
    { key: 'Cmd/Ctrl + /', description: '단축키 도움말' },
    { key: 'G → D', description: '대시보드 이동' },
    { key: 'G → P', description: '프로젝트 목록 이동' },
  ],
  video: [
    { key: 'Space', description: '재생/정지' },
    { key: '←', description: '5초 뒤로' },
    { key: '→', description: '5초 앞으로' },
    { key: 'J', description: '다음 피드백' },
    { key: 'K', description: '이전 피드백' },
    { key: 'F', description: '피드백 패널 토글' },
  ],
  navigation: [
    { key: 'G → H', description: '홈으로 이동' },
    { key: 'G → S', description: '설정으로 이동' },
    { key: 'Esc', description: '팝업 닫기' },
  ],
};
