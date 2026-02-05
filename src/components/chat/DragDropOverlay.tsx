'use client';

import { Upload } from 'lucide-react';

interface DragDropOverlayProps {
  show: boolean;
}

/**
 * 파일 드래그 앤 드롭 시 표시되는 오버레이
 */
export function DragDropOverlay({ show }: DragDropOverlayProps) {
  if (!show) return null;

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-primary-500/10 backdrop-blur-sm pointer-events-none">
      <div className="flex flex-col items-center gap-3 p-8 bg-white rounded-2xl shadow-xl border-2 border-dashed border-primary-400">
        <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
          <Upload className="h-8 w-8 text-primary-600" />
        </div>
        <div className="text-center">
          <p className="text-lg font-medium text-gray-900">파일을 여기에 놓으세요</p>
          <p className="text-sm text-gray-500 mt-1">이미지, 영상, 문서 파일 지원</p>
        </div>
      </div>
    </div>
  );
}
