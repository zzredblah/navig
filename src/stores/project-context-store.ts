'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Project {
  id: string;
  title: string;
}

interface ProjectContextState {
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
  clearSelectedProject: () => void;
}

const STORE_NAME = 'navig-project-context';

export const useProjectContextStore = create<ProjectContextState>()(
  persist(
    (set) => ({
      selectedProject: null,
      setSelectedProject: (project) => set({ selectedProject: project }),
      clearSelectedProject: () => set({ selectedProject: null }),
    }),
    {
      name: STORE_NAME,
    }
  )
);

/**
 * 로그아웃 시 모든 앱 데이터를 클리어하는 함수
 * localStorage에 저장된 모든 navig 관련 데이터를 삭제합니다.
 */
export function clearAllAppData() {
  // 1. Zustand persist 스토어 클리어
  useProjectContextStore.getState().clearSelectedProject();

  // 2. localStorage에서 navig 관련 모든 항목 삭제
  if (typeof window !== 'undefined') {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('navig-') || key.startsWith('sb-'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));

    // sessionStorage도 클리어
    for (let i = sessionStorage.length - 1; i >= 0; i--) {
      const key = sessionStorage.key(i);
      if (key && (key.startsWith('navig-') || key.startsWith('sb-'))) {
        sessionStorage.removeItem(key);
      }
    }
  }
}
