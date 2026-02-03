import { create } from 'zustand';
import type {
  EditMetadata,
  TextOverlay,
  FilterSettings,
  EditTool,
} from '@/types/editing';
import { DEFAULT_EDIT_METADATA, DEFAULT_FILTERS } from '@/types/editing';

interface EditWorkspaceState {
  // 프로젝트 정보
  editProjectId: string | null;
  projectId: string | null;
  title: string;

  // 영상
  videoUrl: string | null;
  videoDuration: number;

  // 재생
  currentTime: number;
  isPlaying: boolean;

  // 편집 메타데이터
  metadata: EditMetadata;

  // UI 상태
  selectedTool: EditTool;
  selectedOverlayId: string | null;

  // 저장 상태
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: Date | null;

  // 히스토리 (Undo/Redo)
  history: EditMetadata[];
  historyIndex: number;
}

interface EditWorkspaceActions {
  // 초기화
  initialize: (data: {
    editProjectId: string;
    projectId: string;
    title: string;
    videoUrl: string | null;
    videoDuration: number;
    metadata: EditMetadata;
  }) => void;
  reset: () => void;

  // 재생 컨트롤
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;

  // 도구 선택
  setSelectedTool: (tool: EditTool) => void;
  setSelectedOverlayId: (id: string | null) => void;

  // 트림
  setTrimStart: (time: number) => void;
  setTrimEnd: (time: number) => void;

  // 속도
  setSpeed: (speed: number) => void;

  // 텍스트 오버레이
  addTextOverlay: (overlay: Omit<TextOverlay, 'id'>) => string;
  updateTextOverlay: (id: string, updates: Partial<TextOverlay>) => void;
  removeTextOverlay: (id: string) => void;

  // 필터
  setFilter: (filter: keyof FilterSettings, value: number) => void;
  setFilters: (filters: FilterSettings) => void;
  resetFilters: () => void;

  // 오디오
  setVolume: (volume: number) => void;
  setMuted: (muted: boolean) => void;

  // 자막
  setSubtitleId: (id: string | null) => void;

  // 히스토리
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // 저장
  markDirty: () => void;
  markSaved: () => void;
  setIsSaving: (saving: boolean) => void;

  // 메타데이터 직접 설정 (API 로드 시)
  setMetadata: (metadata: EditMetadata) => void;

  // 영상 URL/Duration 설정 (업로드 후)
  setVideoUrl: (url: string | null) => void;
  setVideoDuration: (duration: number) => void;
}

const initialState: EditWorkspaceState = {
  editProjectId: null,
  projectId: null,
  title: '',
  videoUrl: null,
  videoDuration: 0,
  currentTime: 0,
  isPlaying: false,
  metadata: DEFAULT_EDIT_METADATA,
  selectedTool: 'trim',
  selectedOverlayId: null,
  isDirty: false,
  isSaving: false,
  lastSavedAt: null,
  history: [],
  historyIndex: -1,
};

export const useEditWorkspaceStore = create<EditWorkspaceState & EditWorkspaceActions>(
  (set, get) => ({
    ...initialState,

    // 초기화
    initialize: (data) => {
      set({
        editProjectId: data.editProjectId,
        projectId: data.projectId,
        title: data.title,
        videoUrl: data.videoUrl,
        videoDuration: data.videoDuration,
        metadata: data.metadata,
        history: [data.metadata],
        historyIndex: 0,
        isDirty: false,
        currentTime: data.metadata.trim?.startTime || 0,
      });
    },

    reset: () => {
      set(initialState);
    },

    // 재생 컨트롤
    setCurrentTime: (time) => set({ currentTime: time }),
    setIsPlaying: (playing) => set({ isPlaying: playing }),

    // 도구 선택
    setSelectedTool: (tool) => set({ selectedTool: tool }),
    setSelectedOverlayId: (id) => set({ selectedOverlayId: id }),

    // 트림
    setTrimStart: (time) => {
      const state = get();
      set({
        metadata: {
          ...state.metadata,
          trim: {
            ...state.metadata.trim,
            startTime: Math.max(0, Math.min(time, state.metadata.trim.endTime)),
          },
        },
        isDirty: true,
      });
    },

    setTrimEnd: (time) => {
      const state = get();
      set({
        metadata: {
          ...state.metadata,
          trim: {
            ...state.metadata.trim,
            endTime: Math.min(state.videoDuration, Math.max(time, state.metadata.trim.startTime)),
          },
        },
        isDirty: true,
      });
    },

    // 속도
    setSpeed: (speed) => {
      const state = get();
      set({
        metadata: {
          ...state.metadata,
          speed: Math.max(0.25, Math.min(4, speed)),
        },
        isDirty: true,
      });
    },

    // 텍스트 오버레이
    addTextOverlay: (overlay) => {
      const id = `text-${Date.now()}`;
      const state = get();
      set({
        metadata: {
          ...state.metadata,
          textOverlays: [...state.metadata.textOverlays, { ...overlay, id }],
        },
        selectedOverlayId: id,
        isDirty: true,
      });
      return id;
    },

    updateTextOverlay: (id, updates) => {
      const state = get();
      set({
        metadata: {
          ...state.metadata,
          textOverlays: state.metadata.textOverlays.map((o) =>
            o.id === id ? { ...o, ...updates } : o
          ),
        },
        isDirty: true,
      });
    },

    removeTextOverlay: (id) => {
      const state = get();
      set({
        metadata: {
          ...state.metadata,
          textOverlays: state.metadata.textOverlays.filter((o) => o.id !== id),
        },
        selectedOverlayId: state.selectedOverlayId === id ? null : state.selectedOverlayId,
        isDirty: true,
      });
    },

    // 필터
    setFilter: (filter, value) => {
      const state = get();
      set({
        metadata: {
          ...state.metadata,
          filters: {
            ...state.metadata.filters,
            [filter]: value,
          },
        },
        isDirty: true,
      });
    },

    setFilters: (filters) => {
      const state = get();
      set({
        metadata: {
          ...state.metadata,
          filters,
        },
        isDirty: true,
      });
    },

    resetFilters: () => {
      const state = get();
      set({
        metadata: {
          ...state.metadata,
          filters: DEFAULT_FILTERS,
        },
        isDirty: true,
      });
    },

    // 오디오
    setVolume: (volume) => {
      const state = get();
      set({
        metadata: {
          ...state.metadata,
          audio: {
            ...state.metadata.audio,
            volume: Math.max(0, Math.min(100, volume)),
          },
        },
        isDirty: true,
      });
    },

    setMuted: (muted) => {
      const state = get();
      set({
        metadata: {
          ...state.metadata,
          audio: {
            ...state.metadata.audio,
            muted,
          },
        },
        isDirty: true,
      });
    },

    // 자막
    setSubtitleId: (id) => {
      const state = get();
      set({
        metadata: {
          ...state.metadata,
          subtitleId: id || undefined,
        },
        isDirty: true,
      });
    },

    // 히스토리
    pushHistory: () => {
      const state = get();
      const newHistory = state.history.slice(0, state.historyIndex + 1);
      newHistory.push({ ...state.metadata });
      set({
        history: newHistory.slice(-50), // 최대 50개 유지
        historyIndex: newHistory.length - 1,
      });
    },

    undo: () => {
      const state = get();
      if (state.historyIndex > 0) {
        const newIndex = state.historyIndex - 1;
        set({
          metadata: state.history[newIndex],
          historyIndex: newIndex,
          isDirty: true,
        });
      }
    },

    redo: () => {
      const state = get();
      if (state.historyIndex < state.history.length - 1) {
        const newIndex = state.historyIndex + 1;
        set({
          metadata: state.history[newIndex],
          historyIndex: newIndex,
          isDirty: true,
        });
      }
    },

    canUndo: () => {
      const state = get();
      return state.historyIndex > 0;
    },

    canRedo: () => {
      const state = get();
      return state.historyIndex < state.history.length - 1;
    },

    // 저장
    markDirty: () => set({ isDirty: true }),
    markSaved: () => set({ isDirty: false, lastSavedAt: new Date() }),
    setIsSaving: (saving) => set({ isSaving: saving }),

    // 메타데이터 직접 설정
    setMetadata: (metadata) => set({ metadata }),

    // 영상 URL/Duration 설정 (업로드 후)
    setVideoUrl: (url) => set({ videoUrl: url }),
    setVideoDuration: (duration) => {
      const state = get();
      set({
        videoDuration: duration,
        metadata: {
          ...state.metadata,
          trim: {
            ...state.metadata.trim,
            endTime: duration,
          },
        },
      });
    },
  })
);
