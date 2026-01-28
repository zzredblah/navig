'use client';

/**
 * QR 코드 모달
 * - 프로젝트 공유 링크 QR 코드 표시
 * - PNG 다운로드 기능
 */

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, QrCode, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface QRCodeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url: string;
  title: string;
}

export function QRCodeModal({
  open,
  onOpenChange,
  url,
  title,
}: QRCodeModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // QR 코드 생성
  useEffect(() => {
    if (!open) {
      // 모달이 닫히면 상태 초기화
      setIsGenerating(true);
      setError(null);
      return;
    }

    // Dialog 애니메이션 완료 후 canvas가 확실히 마운트되도록 약간의 지연
    const timer = setTimeout(() => {
      if (!canvasRef.current) {
        setError('캔버스를 찾을 수 없습니다.');
        return;
      }

      const generateQRCode = async () => {
        setIsGenerating(true);
        setError(null);

        try {
          await QRCode.toCanvas(canvasRef.current!, url, {
            width: 280,
            margin: 2,
            color: {
              dark: '#1F2937', // gray-800
              light: '#FFFFFF',
            },
          });
        } catch (err) {
          console.error('QR 코드 생성 실패:', err);
          setError('QR 코드 생성에 실패했습니다.');
        } finally {
          setIsGenerating(false);
        }
      };

      generateQRCode();
    }, 100);

    return () => clearTimeout(timer);
  }, [open, url]);

  // PNG 다운로드
  const handleDownload = () => {
    if (!canvasRef.current) return;

    try {
      const link = document.createElement('a');
      link.download = `${title.replace(/[^a-zA-Z0-9가-힣]/g, '_')}_qrcode.png`;
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();

      toast({
        title: 'QR 코드 다운로드',
        description: 'QR 코드 이미지가 다운로드되었습니다.',
      });
    } catch (err) {
      console.error('다운로드 실패:', err);
      toast({
        title: '다운로드 실패',
        description: 'QR 코드 다운로드에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR 코드 공유
          </DialogTitle>
          <DialogDescription className="truncate">{title}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center py-4">
          <div className="relative w-[280px] h-[280px]">
            {/* 캔버스는 항상 렌더링 (숨김 처리만) */}
            <canvas
              ref={canvasRef}
              className={`rounded-lg border border-gray-200 shadow-sm ${isGenerating || error ? 'invisible' : 'visible'}`}
            />

            {/* 로딩 오버레이 */}
            {isGenerating && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            )}

            {/* 에러 오버레이 */}
            {error && !isGenerating && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-lg">
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-4 text-center max-w-[280px] break-all">
            {url}
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            닫기
          </Button>
          <Button
            className="flex-1 bg-primary-600 hover:bg-primary-700"
            onClick={handleDownload}
            disabled={isGenerating || !!error}
          >
            <Download className="h-4 w-4 mr-2" />
            다운로드
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
