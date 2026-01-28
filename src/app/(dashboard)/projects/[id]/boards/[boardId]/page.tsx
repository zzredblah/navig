'use client';

import { useState, useEffect, useCallback, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { useBoardStore } from '@/stores/board-store';
import { BoardToolbar } from '@/components/board/BoardToolbar';
import { BoardHeader } from '@/components/board/BoardHeader';
import { BoardZoomControls } from '@/components/board/BoardZoomControls';
import { PropertiesPanel } from '@/components/board/panels/PropertiesPanel';
import { useBoardHotkeys } from '@/hooks/use-board-hotkeys';
import type { Board, BoardElement } from '@/types/board';
import type { BoardCanvasRef } from '@/components/board/BoardCanvas';

// 이미지 크기 가져오기
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      // 최대 크기 제한 (캔버스에서 너무 크면 줄임)
      let width = img.naturalWidth;
      let height = img.naturalHeight;
      const maxSize = 800;

      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      resolve({ width, height });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 300, height: 200 }); // 기본값
    };
    img.src = url;
  });
}

// 비디오 크기 가져오기
function getVideoDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement('video');
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      // 최대 크기 제한
      let width = video.videoWidth;
      let height = video.videoHeight;
      const maxSize = 800;

      if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      resolve({ width, height });
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 480, height: 270 }); // 기본값 (16:9)
    };
    video.src = url;
  });
}

export default function BoardDetailPage({
  params,
}: {
  params: Promise<{ id: string; boardId: string }>;
}) {
  const resolvedParams = use(params);
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<BoardCanvasRef>(null);
  const lastSavedElementsRef = useRef<string>('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [board, setBoard] = useState<Board | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [BoardCanvas, setBoardCanvas] = useState<React.ForwardRefExoticComponent<{ width: number; height: number } & React.RefAttributes<BoardCanvasRef>> | null>(null);
  const [serverElementIds, setServerElementIds] = useState<Set<string>>(new Set()); // 서버에 있는 요소 ID 추적

  // 클라이언트에서만 react-konva 로드
  useEffect(() => {
    import('@/components/board/BoardCanvas')
      .then((mod) => {
        setBoardCanvas(() => mod.BoardCanvas);
      })
      .catch((err) => {
        console.error('[BoardPage] BoardCanvas 로드 실패:', err);
      });
  }, []);

  const {
    elements,
    initialize,
    reset,
    setElements,
    addElement,
    setLoading,
    setSaving,
    isSaving,
  } = useBoardStore();

  // 수동 저장 (먼저 정의해야 useBoardHotkeys에서 사용 가능)
  const handleSaveBoard = useCallback(async () => {
    if (!board || isSaving) return;

    try {
      setSaving(true);

      const currentElementIds = new Set(elements.map(e => e.id));

      // 1. 삭제된 요소 처리 (서버에는 있지만 현재 elements에 없는 것)
      const deletedIds = [...serverElementIds].filter(id => !currentElementIds.has(id));
      const deletePromises = deletedIds.map(async (elementId) => {
        await fetch(`/api/boards/${board.id}/elements/${elementId}`, {
          method: 'DELETE',
        });
      });

      // 2. 요소별로 업데이트 또는 생성
      const upsertPromises = elements.map(async (element) => {
        const response = await fetch(`/api/boards/${board.id}/elements/${element.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            position_x: element.position_x,
            position_y: element.position_y,
            width: element.width,
            height: element.height,
            rotation: element.rotation,
            z_index: element.z_index,
            locked: element.locked,
            content: element.content,
            style: element.style,
          }),
        });

        // 새 요소인 경우 (서버에 없는 경우) 생성
        if (response.status === 404) {
          await fetch(`/api/boards/${board.id}/elements`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: element.id,
              type: element.type,
              position_x: element.position_x,
              position_y: element.position_y,
              width: element.width,
              height: element.height,
              rotation: element.rotation,
              content: element.content,
              style: element.style,
            }),
          });
        }
      });

      await Promise.all([...deletePromises, ...upsertPromises]);

      // 3. 썸네일 생성 및 업로드
      if (canvasRef.current && elements.length > 0) {
        try {
          const thumbnail = await canvasRef.current.generateThumbnail();
          if (thumbnail) {
            await fetch(`/api/boards/${board.id}/thumbnail`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ thumbnail }),
            });
          }
        } catch (thumbnailError) {
          console.error('[Save] 썸네일 업로드 실패:', thumbnailError);
          // 썸네일 실패해도 저장은 성공으로 처리
        }
      }

      // 서버 요소 ID 목록 업데이트
      setServerElementIds(currentElementIds);
      lastSavedElementsRef.current = JSON.stringify(elements);
      setHasUnsavedChanges(false);
    } catch (error) {
      console.error('[Save] 저장 실패:', error);
    } finally {
      setSaving(false);
    }
  }, [board, elements, isSaving, setSaving, serverElementIds]);

  // 키보드 단축키 (Ctrl+S 저장 포함)
  useBoardHotkeys({ enabled: !isLoading, onSave: handleSaveBoard });

  // 변경사항 추적
  useEffect(() => {
    if (!board || isLoading) return;

    const currentElementsJson = JSON.stringify(elements);
    setHasUnsavedChanges(currentElementsJson !== lastSavedElementsRef.current);
  }, [elements, board, isLoading]);

  // 캔버스 크기 계산 - board가 로드된 후에만 실행
  useEffect(() => {
    if (!board) return;

    const calculateSize = () => {
      const container = containerRef.current;
      if (!container) return false;

      let width = container.offsetWidth;
      let height = container.offsetHeight;

      if (width === 0 || height === 0) {
        width = container.clientWidth;
        height = container.clientHeight;
      }

      if (width === 0 || height === 0) {
        const rect = container.getBoundingClientRect();
        width = Math.floor(rect.width);
        height = Math.floor(rect.height);
      }

      // 폴백: 윈도우 크기 기반 계산
      if (width === 0 || height === 0) {
        const sidebarWidth = window.innerWidth >= 1024 ? 256 : 0;
        const toolbarWidth = 56;
        const headerHeight = 112;

        width = window.innerWidth - sidebarWidth - toolbarWidth - 16;
        height = window.innerHeight - headerHeight - 16;
      }

      if (width > 0 && height > 0) {
        setCanvasSize({ width: Math.floor(width), height: Math.floor(height) });
        return true;
      }

      return false;
    };

    let resizeObserver: ResizeObserver | null = null;

    const setupObserver = () => {
      const container = containerRef.current;
      if (!container) return;

      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          if (width > 0 && height > 0) {
            setCanvasSize({ width: Math.floor(width), height: Math.floor(height) });
          }
        }
      });

      resizeObserver.observe(container);
    };

    const tryCalculate = () => {
      if (calculateSize()) {
        setupObserver();
      }
    };

    tryCalculate();
    const timers = [
      setTimeout(tryCalculate, 0),
      setTimeout(tryCalculate, 50),
      setTimeout(tryCalculate, 100),
      setTimeout(tryCalculate, 200),
    ];

    const handleResize = () => calculateSize();
    window.addEventListener('resize', handleResize);

    return () => {
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
    };
  }, [board]);

  // 보드 데이터 로드
  useEffect(() => {
    async function fetchBoard() {
      setIsLoading(true);
      setLoading(true);

      try {
        const response = await fetch(`/api/boards/${resolvedParams.boardId}`);
        if (response.ok) {
          const data = await response.json();
          setBoard(data.board);
          initialize(resolvedParams.boardId, resolvedParams.id);
          setElements(data.elements || []);
          // 서버에 있는 요소 ID 추적 (삭제 감지용)
          const serverIds = new Set<string>((data.elements || []).map((e: BoardElement) => e.id));
          setServerElementIds(serverIds);
          lastSavedElementsRef.current = JSON.stringify(data.elements || []);
        } else if (response.status === 404) {
          router.push(`/projects/${resolvedParams.id}/boards`);
        }
      } catch (error) {
        console.error('보드 로드 실패:', error);
      } finally {
        setIsLoading(false);
        setLoading(false);
      }
    }

    fetchBoard();

    return () => {
      reset();
    };
  }, [resolvedParams.boardId, resolvedParams.id, router, initialize, reset, setElements, setLoading]);

  // 보드 업데이트
  const handleUpdateBoard = useCallback(
    async (updates: Partial<Board>) => {
      if (!board) return;

      try {
        setSaving(true);
        const response = await fetch(`/api/boards/${board.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updates),
        });

        if (response.ok) {
          const data = await response.json();
          setBoard(data.board);
        }
      } catch (error) {
        console.error('보드 업데이트 실패:', error);
      } finally {
        setSaving(false);
      }
    },
    [board, setSaving]
  );

  // 보드 삭제
  const handleDeleteBoard = useCallback(async () => {
    if (!board || !confirm('이 보드를 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/boards/${board.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        router.push(`/projects/${resolvedParams.id}/boards`);
      }
    } catch (error) {
      console.error('보드 삭제 실패:', error);
    }
  }, [board, router, resolvedParams.id]);

  // 공유
  const handleShare = useCallback(async () => {
    if (!board) return;

    try {
      const response = await fetch(`/api/boards/${board.id}/share`, {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        await navigator.clipboard.writeText(data.share_url);
        alert('공유 링크가 클립보드에 복사되었습니다.');
      }
    } catch (error) {
      console.error('공유 링크 생성 실패:', error);
    }
  }, [board]);

  // 이미지 추가
  const handleAddImage = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  // 영상 추가
  const handleAddVideo = useCallback(() => {
    videoInputRef.current?.click();
  }, []);

  // 파일 업로드 처리 (원본 크기 로드)
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
      const file = e.target.files?.[0];
      if (!file || !board) return;

      // 파일 크기 가져오기
      const dimensions = type === 'image'
        ? await getImageDimensions(file)
        : await getVideoDimensions(file);

      const url = URL.createObjectURL(file);

      const newElement: BoardElement = {
        id: crypto.randomUUID(),
        board_id: board.id,
        type,
        position_x: 100 + Math.random() * 200,
        position_y: 100 + Math.random() * 200,
        width: dimensions.width,
        height: dimensions.height,
        rotation: 0,
        z_index: 0,
        locked: false,
        content: {
          url,
          original_filename: file.name,
        },
        style: {},
        created_by: '',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      addElement(newElement);
      e.target.value = '';
    },
    [board, addElement]
  );

  // 로딩 중일 때
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  // 보드가 없을 때
  if (!board) {
    return null;
  }

  // 캔버스 렌더링 가능 여부
  const canRenderCanvas = BoardCanvas && canvasSize.width > 0 && canvasSize.height > 0;

  return (
    <div
      className="flex flex-col -mx-4 sm:-mx-6 lg:-mx-8 -my-4 sm:-my-6 lg:-my-8"
      style={{ height: 'calc(100vh - 4rem)' }}
    >
      {/* 헤더 */}
      <div className="shrink-0">
        <BoardHeader
          board={board}
          projectId={resolvedParams.id}
          onUpdateBoard={handleUpdateBoard}
          onShare={handleShare}
          onDelete={handleDeleteBoard}
          onSave={handleSaveBoard}
          hasUnsavedChanges={hasUnsavedChanges}
        />
      </div>

      {/* 메인 영역 */}
      <div
        className="flex overflow-hidden"
        style={{ flex: '1 1 0%', minHeight: 0 }}
      >
        {/* 도구바 */}
        <div className="shrink-0">
          <BoardToolbar onAddImage={handleAddImage} onAddVideo={handleAddVideo} />
        </div>

        {/* 캔버스 컨테이너 */}
        <div
          ref={containerRef}
          className="relative bg-gray-100 overflow-hidden"
          style={{ flex: '1 1 0%', minWidth: 0 }}
        >
          {canRenderCanvas ? (
            <>
              <BoardCanvas ref={canvasRef} width={canvasSize.width} height={canvasSize.height} />
              <BoardZoomControls />
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500">
                  {!BoardCanvas ? '캔버스 로딩 중...' : '크기 계산 중...'}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 속성 패널 */}
        <div className="shrink-0">
          <PropertiesPanel />
        </div>
      </div>

      {/* 숨겨진 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileUpload(e, 'image')}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => handleFileUpload(e, 'video')}
      />
    </div>
  );
}
