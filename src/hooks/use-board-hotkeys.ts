import { useEffect, useCallback } from 'react';
import { useBoardStore } from '@/stores/board-store';

interface UseBoardHotkeysOptions {
  enabled?: boolean;
}

export function useBoardHotkeys({ enabled = true }: UseBoardHotkeysOptions = {}) {
  const {
    selectedIds,
    currentTool,
    setTool,
    selectAll,
    deselectAll,
    deleteElements,
    duplicateElements,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useBoardStore();

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // 입력 필드에서는 단축키 비활성화
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      const isMod = e.metaKey || e.ctrlKey;

      // Cmd/Ctrl + 단축키
      if (isMod) {
        switch (e.key.toLowerCase()) {
          case 'a':
            e.preventDefault();
            selectAll();
            break;
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              if (canRedo()) redo();
            } else {
              if (canUndo()) undo();
            }
            break;
          case 'y':
            e.preventDefault();
            if (canRedo()) redo();
            break;
          case 'd':
            e.preventDefault();
            if (selectedIds.length > 0) {
              duplicateElements(selectedIds);
            }
            break;
          case '[':
            e.preventDefault();
            if (selectedIds.length > 0) {
              if (e.shiftKey) {
                sendToBack(selectedIds);
              } else {
                sendBackward(selectedIds);
              }
            }
            break;
          case ']':
            e.preventDefault();
            if (selectedIds.length > 0) {
              if (e.shiftKey) {
                bringToFront(selectedIds);
              } else {
                bringForward(selectedIds);
              }
            }
            break;
        }
        return;
      }

      // 일반 단축키
      switch (e.key.toLowerCase()) {
        case 'v':
          setTool('select');
          break;
        case 't':
          setTool('text');
          break;
        case 'r':
          setTool('rectangle');
          break;
        case 'o':
          setTool('circle');
          break;
        case 'n':
          setTool('sticky');
          break;
        case 'f':
          setTool('frame');
          break;
        case 'delete':
        case 'backspace':
          if (selectedIds.length > 0) {
            e.preventDefault();
            deleteElements(selectedIds);
          }
          break;
        case 'escape':
          deselectAll();
          setTool('select');
          break;
      }
    },
    [
      selectedIds,
      selectAll,
      deselectAll,
      deleteElements,
      duplicateElements,
      bringToFront,
      sendToBack,
      bringForward,
      sendBackward,
      undo,
      redo,
      canUndo,
      canRedo,
      setTool,
    ]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled, handleKeyDown]);
}
