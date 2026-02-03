'use client';

import { useState } from 'react';
import { Loader2, Upload, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  editId: string;
  onSuccess: (videoVersionId: string) => void;
}

export function RegisterModal({
  isOpen,
  onClose,
  projectId,
  editId,
  onSuccess,
}: RegisterModalProps) {
  const [versionName, setVersionName] = useState('');
  const [changeNotes, setChangeNotes] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const handleRegister = async () => {
    setIsRegistering(true);
    try {
      const res = await fetch(
        `/api/projects/${projectId}/edits/${editId}/register`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            version_name: versionName.trim() || undefined,
            change_notes: changeNotes.trim() || undefined,
          }),
        }
      );

      if (res.ok) {
        const data = await res.json();
        setIsComplete(true);
        setTimeout(() => {
          onSuccess(data.data.videoVersionId);
        }, 1500);
      } else {
        const error = await res.json();
        console.error('등록 실패:', error);
      }
    } catch (error) {
      console.error('등록 오류:', error);
    } finally {
      setIsRegistering(false);
    }
  };

  const handleClose = () => {
    if (!isRegistering) {
      setVersionName('');
      setChangeNotes('');
      setIsComplete(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {isComplete ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              등록 완료!
            </h3>
            <p className="text-sm text-gray-500 text-center">
              편집 영상이 영상 섹션에 등록되었습니다.
              <br />
              잠시 후 영상 페이지로 이동합니다...
            </p>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>영상 섹션에 등록</DialogTitle>
              <DialogDescription>
                편집된 영상을 영상 섹션에 등록하여 승인 프로세스를 시작합니다.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* 버전 이름 */}
              <div className="space-y-2">
                <Label htmlFor="version-name">버전 이름 (선택)</Label>
                <Input
                  id="version-name"
                  value={versionName}
                  onChange={(e) => setVersionName(e.target.value)}
                  placeholder="예: 1차 수정본"
                />
              </div>

              {/* 변경 내용 */}
              <div className="space-y-2">
                <Label htmlFor="change-notes">변경 내용 (선택)</Label>
                <Textarea
                  id="change-notes"
                  value={changeNotes}
                  onChange={(e) => setChangeNotes(e.target.value)}
                  placeholder="편집 내용에 대한 설명을 입력하세요"
                  rows={3}
                />
              </div>

              {/* 안내 */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700">
                  등록 후에는 편집 프로젝트를 수정할 수 없습니다.
                  영상 섹션에서 승인/반려 프로세스가 진행됩니다.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isRegistering}
              >
                취소
              </Button>
              <Button onClick={handleRegister} disabled={isRegistering}>
                {isRegistering ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    등록 중...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    등록하기
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
