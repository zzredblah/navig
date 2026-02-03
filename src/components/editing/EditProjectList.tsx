'use client';

import { useState, useEffect, useCallback } from 'react';
import { Scissors, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EditProjectCard } from './EditProjectCard';
import { CreateEditModal } from './CreateEditModal';
import type { EditProjectWithDetails } from '@/types/editing';

interface EditProjectListProps {
  projectId: string;
}

export function EditProjectList({ projectId }: EditProjectListProps) {
  const [editProjects, setEditProjects] = useState<EditProjectWithDetails[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchEditProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/edits`);
      if (res.ok) {
        const data = await res.json();
        setEditProjects(data.data || []);
      }
    } catch (error) {
      console.error('편집 프로젝트 목록 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchEditProjects();
  }, [fetchEditProjects]);

  const handleDelete = (id: string) => {
    setEditProjects((prev) => prev.filter((p) => p.id !== id));
  };

  const handleCreated = (newProject: EditProjectWithDetails) => {
    setEditProjects((prev) => [newProject, ...prev]);
    setIsCreateModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">편집</h1>
          <p className="text-gray-500 mt-1">
            영상을 편집하고 승인을 위해 등록하세요
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          새 편집
        </Button>
      </div>

      {/* 목록 */}
      {editProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <Scissors className="h-12 w-12 text-gray-300 mb-4" />
          <p className="text-gray-500 mb-4">편집 프로젝트가 없습니다</p>
          <Button onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            첫 편집 프로젝트 만들기
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {editProjects.map((editProject) => (
            <EditProjectCard
              key={editProject.id}
              editProject={editProject}
              projectId={projectId}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      {/* 생성 모달 */}
      <CreateEditModal
        projectId={projectId}
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleCreated}
      />
    </div>
  );
}
