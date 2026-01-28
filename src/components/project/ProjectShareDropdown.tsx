'use client';

/**
 * 프로젝트 공유 드롭다운
 * - 링크 복사
 * - QR 코드 표시
 */

import { useState, useEffect } from 'react';
import { Share2, Link2, QrCode, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { QRCodeModal } from './QRCodeModal';
import { toast } from '@/hooks/use-toast';

interface ProjectShareDropdownProps {
  projectId: string;
  projectTitle: string;
}

export function ProjectShareDropdown({
  projectId,
  projectTitle,
}: ProjectShareDropdownProps) {
  const [showQRModal, setShowQRModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const projectUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/projects/${projectId}`
      : '';

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(projectUrl);
      setCopied(true);
      toast({
        title: '링크가 복사되었습니다',
        description: '클립보드에 프로젝트 링크가 복사되었습니다.',
      });

      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('복사 실패:', err);
      toast({
        title: '복사 실패',
        description: '링크 복사에 실패했습니다. 수동으로 복사해주세요.',
        variant: 'destructive',
      });
    }
  };

  // Hydration 에러 방지
  if (!mounted) {
    return (
      <Button variant="outline" size="sm">
        <Share2 className="h-4 w-4 mr-1" />
        공유
      </Button>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-1" />
            공유
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={handleCopyLink}
            className="cursor-pointer"
          >
            {copied ? (
              <Check className="h-4 w-4 mr-2 text-green-500" />
            ) : (
              <Link2 className="h-4 w-4 mr-2" />
            )}
            {copied ? '복사됨!' : '링크 복사'}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowQRModal(true)}
            className="cursor-pointer"
          >
            <QrCode className="h-4 w-4 mr-2" />
            QR 코드
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <QRCodeModal
        open={showQRModal}
        onOpenChange={setShowQRModal}
        url={projectUrl}
        title={projectTitle}
      />
    </>
  );
}
