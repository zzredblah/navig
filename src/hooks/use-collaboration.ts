'use client';

/**
 * 실시간 협업 훅
 *
 * Yjs + Supabase Realtime을 사용하여 보드의 실시간 협업 기능 제공
 */

import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import * as Y from 'yjs';
import {
  SupabaseProvider,
  type CollaboratorState,
} from '@/lib/collaboration/SupabaseProvider';

// 사용자별 고유 색상 생성
const COLLABORATOR_COLORS = [
  '#EF4444', // red
  '#F59E0B', // amber
  '#10B981', // emerald
  '#3B82F6', // blue
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
];

function getRandomColor(): string {
  return COLLABORATOR_COLORS[Math.floor(Math.random() * COLLABORATOR_COLORS.length)];
}

/**
 * throttle 유틸리티
 */
function throttle<T extends (...args: Parameters<T>) => void>(
  func: T,
  limit: number
): T {
  let lastCall = 0;
  let lastArgs: Parameters<T> | null = null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const throttled = (...args: Parameters<T>) => {
    const now = Date.now();
    const remaining = limit - (now - lastCall);

    if (remaining <= 0) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCall = now;
      func(...args);
    } else {
      lastArgs = args;
      if (!timeoutId) {
        timeoutId = setTimeout(() => {
          lastCall = Date.now();
          timeoutId = null;
          if (lastArgs) {
            func(...lastArgs);
            lastArgs = null;
          }
        }, remaining);
      }
    }
  };

  return throttled as T;
}

interface User {
  id: string;
  name: string;
  avatar_url?: string | null;
}

interface UseCollaborationOptions {
  boardId: string;
  user: User;
  enabled?: boolean;
  /** 커서 업데이트 throttle 간격 (ms), 기본 50ms */
  cursorThrottleMs?: number;
}

interface UseCollaborationReturn {
  doc: Y.Doc | null;
  provider: SupabaseProvider | null;
  isConnected: boolean;
  status: 'connecting' | 'connected' | 'disconnected';
  collaborators: CollaboratorState[];
  updateCursor: (position: { x: number; y: number } | null) => void;
  updateSelection: (elementIds: string[]) => void;
  /** 수동 재연결 */
  reconnect: () => void;
}

export function useCollaboration({
  boardId,
  user,
  enabled = true,
  cursorThrottleMs = 50,
}: UseCollaborationOptions): UseCollaborationReturn {
  const docRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<SupabaseProvider | null>(null);
  const colorRef = useRef<string>(getRandomColor());

  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [collaborators, setCollaborators] = useState<CollaboratorState[]>([]);

  // 연결 설정 함수
  const setupConnection = useCallback(() => {
    if (!enabled || !boardId || !user) return null;

    // Yjs 문서 생성
    const doc = new Y.Doc();
    docRef.current = doc;

    // Supabase Provider 생성
    const provider = new SupabaseProvider(`board:${boardId}`, doc, {
      awareness: true,
    });
    providerRef.current = provider;

    // 로컬 상태 설정
    provider.setLocalState({
      user: {
        id: user.id,
        name: user.name,
        avatar: user.avatar_url,
        color: colorRef.current,
      },
      cursor: null,
      selection: [],
    });

    // 연결 상태 리스너
    const unsubscribeStatus = provider.onStatusChange((newStatus) => {
      setStatus(newStatus);
    });

    // Awareness 변경 리스너
    const unsubscribeAwareness = provider.onAwarenessChange(() => {
      const newCollaborators = provider.getCollaborators();
      setCollaborators(newCollaborators);
    });

    return () => {
      unsubscribeStatus();
      unsubscribeAwareness();
      provider.destroy();
      doc.destroy();
      docRef.current = null;
      providerRef.current = null;
    };
  }, [boardId, user, enabled]);

  useEffect(() => {
    const cleanup = setupConnection();
    return () => {
      cleanup?.();
    };
  }, [setupConnection]);

  // 수동 재연결
  const reconnect = useCallback(() => {
    if (providerRef.current) {
      providerRef.current.destroy();
      docRef.current?.destroy();
    }
    setupConnection();
  }, [setupConnection]);

  // 커서 위치 업데이트 (throttle 적용)
  const updateCursor = useMemo(
    () =>
      throttle((position: { x: number; y: number } | null) => {
        if (providerRef.current) {
          providerRef.current.setLocalState({ cursor: position });
        }
      }, cursorThrottleMs),
    [cursorThrottleMs]
  );

  // 선택 요소 업데이트
  const updateSelection = useCallback((elementIds: string[]) => {
    if (providerRef.current) {
      providerRef.current.setLocalState({ selection: elementIds });
    }
  }, []);

  return {
    doc: docRef.current,
    provider: providerRef.current,
    isConnected: status === 'connected',
    status,
    collaborators,
    updateCursor,
    updateSelection,
    reconnect,
  };
}

/**
 * 커서 스무딩 훅
 *
 * 다른 사용자의 커서를 부드럽게 애니메이션
 */
export function useSmoothCursor(
  targetPosition: { x: number; y: number } | null
): { x: number; y: number } | null {
  const [smoothPosition, setSmoothPosition] = useState<{ x: number; y: number } | null>(null);
  const animationRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!targetPosition) {
      setSmoothPosition(null);
      return;
    }

    const animate = () => {
      setSmoothPosition((prev) => {
        if (!prev) return targetPosition;

        const dx = targetPosition.x - prev.x;
        const dy = targetPosition.y - prev.y;

        // 거리가 작으면 바로 이동
        if (Math.abs(dx) < 1 && Math.abs(dy) < 1) {
          return targetPosition;
        }

        // 선형 보간 (30% 씩 이동)
        return {
          x: prev.x + dx * 0.3,
          y: prev.y + dy * 0.3,
        };
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetPosition]);

  return smoothPosition;
}
