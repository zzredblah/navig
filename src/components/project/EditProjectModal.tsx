'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { updateProjectSchema, type UpdateProjectInput } from '@/lib/validations/project';
import type { Project, ProjectStatus } from '@/types/database';

interface EditProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  project: Project;
}

const statusOptions: { value: ProjectStatus; label: string }[] = [
  { value: 'planning', label: '기획' },
  { value: 'production', label: '제작' },
  { value: 'review', label: '검수' },
  { value: 'completed', label: '완료' },
];

export function EditProjectModal({ isOpen, onClose, onSuccess, project }: EditProjectModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UpdateProjectInput>({
    resolver: zodResolver(updateProjectSchema),
  });

  const selectedStatus = watch('status');

  useEffect(() => {
    if (isOpen && project) {
      reset({
        title: project.title,
        description: project.description || '',
        status: project.status,
      });
    }
  }, [isOpen, project, reset]);

  const onSubmit = async (data: UpdateProjectInput) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${project.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || '프로젝트 수정에 실패했습니다');
        return;
      }

      onSuccess();
    } catch {
      setError('서버 오류가 발생했습니다');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>프로젝트 수정</DialogTitle>
          <DialogDescription>
            프로젝트 정보를 수정합니다
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="p-3 rounded-md bg-error-50 border border-error-200 text-error-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">프로젝트 제목</Label>
            <Input
              id="title"
              placeholder="프로젝트 제목을 입력하세요"
              disabled={isLoading}
              {...register('title')}
            />
            {errors.title && (
              <p className="text-sm text-error-500">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              placeholder="프로젝트에 대한 설명을 입력하세요"
              rows={3}
              disabled={isLoading}
              {...register('description')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">상태</Label>
            <Select
              value={selectedStatus}
              onValueChange={(value) => setValue('status', value as ProjectStatus)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="상태 선택" />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              취소
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  저장 중...
                </>
              ) : (
                '저장'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
