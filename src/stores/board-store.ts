import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { BoardElement, ElementContent, ElementStyle } from '@/types/board';

export type BoardTool = 'select' | 'text' | 'rectangle' | 'circle' | 'sticky' | 'image' | 'video' | 'frame';

interface HistoryState {
  elements: BoardElement[];
}

interface BoardState {
  // 보드 정보
  boardId: string | null;
  projectId: string | null;

  // 요소
  elements: BoardElement[];

  // 선택
  selectedIds: string[];

  // 도구
  currentTool: BoardTool;

  // 캔버스 상태
  zoom: number;
  panX: number;
  panY: number;

  // 그리드
  gridEnabled: boolean;
  snapEnabled: boolean;

  // 히스토리
  history: HistoryState[];
  historyIndex: number;

  // 상태
  isLoading: boolean;
  isSaving: boolean;
}

interface BoardActions {
  // 초기화
  initialize: (boardId: string, projectId: string) => void;
  reset: () => void;

  // 요소 관리
  setElements: (elements: BoardElement[]) => void;
  addElement: (element: BoardElement) => void;
  updateElement: (id: string, updates: Partial<BoardElement>) => void;
  updateElementContent: (id: string, content: Partial<ElementContent>) => void;
  updateElementStyle: (id: string, style: Partial<ElementStyle>) => void;
  deleteElements: (ids: string[]) => void;
  duplicateElements: (ids: string[]) => string[];

  // 선택
  select: (id: string, append?: boolean) => void;
  selectAll: () => void;
  deselectAll: () => void;
  setSelectedIds: (ids: string[]) => void;

  // 도구
  setTool: (tool: BoardTool) => void;

  // 캔버스
  setZoom: (zoom: number) => void;
  setPan: (x: number, y: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  resetView: () => void;

  // 그리드
  toggleGrid: () => void;
  toggleSnap: () => void;

  // 레이어
  bringToFront: (ids: string[]) => void;
  sendToBack: (ids: string[]) => void;
  bringForward: (ids: string[]) => void;
  sendBackward: (ids: string[]) => void;

  // 정렬
  alignLeft: (ids: string[]) => void;
  alignCenter: (ids: string[]) => void;
  alignRight: (ids: string[]) => void;
  alignTop: (ids: string[]) => void;
  alignMiddle: (ids: string[]) => void;
  alignBottom: (ids: string[]) => void;
  distributeHorizontal: (ids: string[]) => void;
  distributeVertical: (ids: string[]) => void;

  // 히스토리
  saveHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // 상태
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
}

const MAX_HISTORY = 50;
const ZOOM_STEP = 0.1;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;

const initialState: BoardState = {
  boardId: null,
  projectId: null,
  elements: [],
  selectedIds: [],
  currentTool: 'select',
  zoom: 1,
  panX: 0,
  panY: 0,
  gridEnabled: true,
  snapEnabled: true,
  history: [],
  historyIndex: -1,
  isLoading: false,
  isSaving: false,
};

export const useBoardStore = create<BoardState & BoardActions>()(
  immer((set, get) => ({
    ...initialState,

    // 초기화
    initialize: (boardId, projectId) => {
      set((state) => {
        state.boardId = boardId;
        state.projectId = projectId;
      });
    },

    reset: () => {
      set(initialState);
    },

    // 요소 관리
    setElements: (elements) => {
      set((state) => {
        state.elements = elements;
        // 초기 히스토리 저장
        state.history = [{ elements: [...elements] }];
        state.historyIndex = 0;
      });
    },

    addElement: (element) => {
      set((state) => {
        state.elements.push(element);
      });
      get().saveHistory();
    },

    updateElement: (id, updates) => {
      set((state) => {
        const index = state.elements.findIndex((e) => e.id === id);
        if (index !== -1) {
          state.elements[index] = { ...state.elements[index], ...updates };
        }
      });
    },

    updateElementContent: (id, content) => {
      set((state) => {
        const index = state.elements.findIndex((e) => e.id === id);
        if (index !== -1) {
          state.elements[index].content = {
            ...state.elements[index].content,
            ...content,
          };
        }
      });
    },

    updateElementStyle: (id, style) => {
      set((state) => {
        const index = state.elements.findIndex((e) => e.id === id);
        if (index !== -1) {
          state.elements[index].style = {
            ...state.elements[index].style,
            ...style,
          };
        }
      });
    },

    deleteElements: (ids) => {
      set((state) => {
        state.elements = state.elements.filter((e) => !ids.includes(e.id));
        state.selectedIds = state.selectedIds.filter((id) => !ids.includes(id));
      });
      get().saveHistory();
    },

    duplicateElements: (ids) => {
      const newIds: string[] = [];
      set((state) => {
        const toDuplicate = state.elements.filter((e) => ids.includes(e.id));
        const maxZ = Math.max(...state.elements.map((e) => e.z_index), 0);

        toDuplicate.forEach((element, i) => {
          const newId = crypto.randomUUID();
          newIds.push(newId);
          state.elements.push({
            ...element,
            id: newId,
            position_x: element.position_x + 20,
            position_y: element.position_y + 20,
            z_index: maxZ + i + 1,
          });
        });

        state.selectedIds = newIds;
      });
      get().saveHistory();
      return newIds;
    },

    // 선택
    select: (id, append = false) => {
      set((state) => {
        if (append) {
          const index = state.selectedIds.indexOf(id);
          if (index === -1) {
            state.selectedIds.push(id);
          } else {
            state.selectedIds.splice(index, 1);
          }
        } else {
          state.selectedIds = [id];
        }
      });
    },

    selectAll: () => {
      set((state) => {
        state.selectedIds = state.elements.map((e) => e.id);
      });
    },

    deselectAll: () => {
      set((state) => {
        state.selectedIds = [];
      });
    },

    setSelectedIds: (ids) => {
      set((state) => {
        state.selectedIds = ids;
      });
    },

    // 도구
    setTool: (tool) => {
      set((state) => {
        state.currentTool = tool;
        if (tool !== 'select') {
          state.selectedIds = [];
        }
      });
    },

    // 캔버스
    setZoom: (zoom) => {
      set((state) => {
        state.zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
      });
    },

    setPan: (x, y) => {
      set((state) => {
        state.panX = x;
        state.panY = y;
      });
    },

    zoomIn: () => {
      set((state) => {
        state.zoom = Math.min(MAX_ZOOM, state.zoom + ZOOM_STEP);
      });
    },

    zoomOut: () => {
      set((state) => {
        state.zoom = Math.max(MIN_ZOOM, state.zoom - ZOOM_STEP);
      });
    },

    zoomToFit: () => {
      // TODO: Calculate bounding box and fit
      set((state) => {
        state.zoom = 1;
        state.panX = 0;
        state.panY = 0;
      });
    },

    resetView: () => {
      set((state) => {
        state.zoom = 1;
        state.panX = 0;
        state.panY = 0;
      });
    },

    // 그리드
    toggleGrid: () => {
      set((state) => {
        state.gridEnabled = !state.gridEnabled;
      });
    },

    toggleSnap: () => {
      set((state) => {
        state.snapEnabled = !state.snapEnabled;
      });
    },

    // 레이어
    bringToFront: (ids) => {
      set((state) => {
        const maxZ = Math.max(...state.elements.map((e) => e.z_index), 0);
        ids.forEach((id, i) => {
          const index = state.elements.findIndex((e) => e.id === id);
          if (index !== -1) {
            state.elements[index].z_index = maxZ + i + 1;
          }
        });
      });
      get().saveHistory();
    },

    sendToBack: (ids) => {
      set((state) => {
        const minZ = Math.min(...state.elements.map((e) => e.z_index), 0);
        ids.forEach((id, i) => {
          const index = state.elements.findIndex((e) => e.id === id);
          if (index !== -1) {
            state.elements[index].z_index = minZ - ids.length + i;
          }
        });
      });
      get().saveHistory();
    },

    bringForward: (ids) => {
      set((state) => {
        ids.forEach((id) => {
          const index = state.elements.findIndex((e) => e.id === id);
          if (index !== -1) {
            state.elements[index].z_index += 1;
          }
        });
      });
      get().saveHistory();
    },

    sendBackward: (ids) => {
      set((state) => {
        ids.forEach((id) => {
          const index = state.elements.findIndex((e) => e.id === id);
          if (index !== -1) {
            state.elements[index].z_index -= 1;
          }
        });
      });
      get().saveHistory();
    },

    // 정렬
    alignLeft: (ids) => {
      set((state) => {
        const selected = state.elements.filter((e) => ids.includes(e.id));
        if (selected.length < 2) return;
        const minX = Math.min(...selected.map((e) => e.position_x));
        ids.forEach((id) => {
          const index = state.elements.findIndex((e) => e.id === id);
          if (index !== -1) {
            state.elements[index].position_x = minX;
          }
        });
      });
      get().saveHistory();
    },

    alignCenter: (ids) => {
      set((state) => {
        const selected = state.elements.filter((e) => ids.includes(e.id));
        if (selected.length < 2) return;
        const centers = selected.map((e) => e.position_x + e.width / 2);
        const avgCenter = centers.reduce((a, b) => a + b, 0) / centers.length;
        ids.forEach((id) => {
          const index = state.elements.findIndex((e) => e.id === id);
          if (index !== -1) {
            const element = state.elements[index];
            state.elements[index].position_x = avgCenter - element.width / 2;
          }
        });
      });
      get().saveHistory();
    },

    alignRight: (ids) => {
      set((state) => {
        const selected = state.elements.filter((e) => ids.includes(e.id));
        if (selected.length < 2) return;
        const maxRight = Math.max(...selected.map((e) => e.position_x + e.width));
        ids.forEach((id) => {
          const index = state.elements.findIndex((e) => e.id === id);
          if (index !== -1) {
            const element = state.elements[index];
            state.elements[index].position_x = maxRight - element.width;
          }
        });
      });
      get().saveHistory();
    },

    alignTop: (ids) => {
      set((state) => {
        const selected = state.elements.filter((e) => ids.includes(e.id));
        if (selected.length < 2) return;
        const minY = Math.min(...selected.map((e) => e.position_y));
        ids.forEach((id) => {
          const index = state.elements.findIndex((e) => e.id === id);
          if (index !== -1) {
            state.elements[index].position_y = minY;
          }
        });
      });
      get().saveHistory();
    },

    alignMiddle: (ids) => {
      set((state) => {
        const selected = state.elements.filter((e) => ids.includes(e.id));
        if (selected.length < 2) return;
        const middles = selected.map((e) => e.position_y + e.height / 2);
        const avgMiddle = middles.reduce((a, b) => a + b, 0) / middles.length;
        ids.forEach((id) => {
          const index = state.elements.findIndex((e) => e.id === id);
          if (index !== -1) {
            const element = state.elements[index];
            state.elements[index].position_y = avgMiddle - element.height / 2;
          }
        });
      });
      get().saveHistory();
    },

    alignBottom: (ids) => {
      set((state) => {
        const selected = state.elements.filter((e) => ids.includes(e.id));
        if (selected.length < 2) return;
        const maxBottom = Math.max(...selected.map((e) => e.position_y + e.height));
        ids.forEach((id) => {
          const index = state.elements.findIndex((e) => e.id === id);
          if (index !== -1) {
            const element = state.elements[index];
            state.elements[index].position_y = maxBottom - element.height;
          }
        });
      });
      get().saveHistory();
    },

    distributeHorizontal: (ids) => {
      set((state) => {
        const selected = state.elements.filter((e) => ids.includes(e.id));
        if (selected.length < 3) return;

        // 왼쪽 위치 기준 정렬
        const sorted = [...selected].sort((a, b) => a.position_x - b.position_x);
        const first = sorted[0];
        const last = sorted[sorted.length - 1];

        const totalWidth = sorted.reduce((sum, e) => sum + e.width, 0);
        const totalSpace = (last.position_x + last.width) - first.position_x - totalWidth;
        const gap = totalSpace / (sorted.length - 1);

        let currentX = first.position_x + first.width + gap;
        for (let i = 1; i < sorted.length - 1; i++) {
          const index = state.elements.findIndex((e) => e.id === sorted[i].id);
          if (index !== -1) {
            state.elements[index].position_x = currentX;
            currentX += sorted[i].width + gap;
          }
        }
      });
      get().saveHistory();
    },

    distributeVertical: (ids) => {
      set((state) => {
        const selected = state.elements.filter((e) => ids.includes(e.id));
        if (selected.length < 3) return;

        // 위쪽 위치 기준 정렬
        const sorted = [...selected].sort((a, b) => a.position_y - b.position_y);
        const first = sorted[0];
        const last = sorted[sorted.length - 1];

        const totalHeight = sorted.reduce((sum, e) => sum + e.height, 0);
        const totalSpace = (last.position_y + last.height) - first.position_y - totalHeight;
        const gap = totalSpace / (sorted.length - 1);

        let currentY = first.position_y + first.height + gap;
        for (let i = 1; i < sorted.length - 1; i++) {
          const index = state.elements.findIndex((e) => e.id === sorted[i].id);
          if (index !== -1) {
            state.elements[index].position_y = currentY;
            currentY += sorted[i].height + gap;
          }
        }
      });
      get().saveHistory();
    },

    // 히스토리
    saveHistory: () => {
      set((state) => {
        // 현재 인덱스 이후의 히스토리 삭제
        state.history = state.history.slice(0, state.historyIndex + 1);

        // 새 상태 저장
        state.history.push({
          elements: JSON.parse(JSON.stringify(state.elements)),
        });

        // 최대 개수 제한
        if (state.history.length > MAX_HISTORY) {
          state.history.shift();
        } else {
          state.historyIndex += 1;
        }
      });
    },

    undo: () => {
      const { historyIndex, history } = get();
      if (historyIndex > 0) {
        set((state) => {
          state.historyIndex -= 1;
          state.elements = JSON.parse(
            JSON.stringify(history[state.historyIndex].elements)
          );
          state.selectedIds = [];
        });
      }
    },

    redo: () => {
      const { historyIndex, history } = get();
      if (historyIndex < history.length - 1) {
        set((state) => {
          state.historyIndex += 1;
          state.elements = JSON.parse(
            JSON.stringify(history[state.historyIndex].elements)
          );
          state.selectedIds = [];
        });
      }
    },

    canUndo: () => {
      return get().historyIndex > 0;
    },

    canRedo: () => {
      const { historyIndex, history } = get();
      return historyIndex < history.length - 1;
    },

    // 상태
    setLoading: (loading) => {
      set((state) => {
        state.isLoading = loading;
      });
    },

    setSaving: (saving) => {
      set((state) => {
        state.isSaving = saving;
      });
    },
  }))
);

// 선택된 요소 가져오기
export const useSelectedElements = () => {
  return useBoardStore((state) =>
    state.elements.filter((e) => state.selectedIds.includes(e.id))
  );
};

// 정렬된 요소 가져오기 (z_index 기준)
export const useSortedElements = () => {
  return useBoardStore((state) =>
    [...state.elements].sort((a, b) => a.z_index - b.z_index)
  );
};
