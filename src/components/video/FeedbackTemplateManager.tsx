'use client';

/**
 * 피드백 템플릿 관리 모달
 * - 템플릿 추가, 수정, 삭제
 * - 드래그 앤 드롭으로 순서 변경 (@dnd-kit)
 */

import { useState, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  GripVertical,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  AlertTriangle,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { FeedbackTemplate, MAX_TEMPLATES, DEFAULT_TEMPLATES } from '@/types/feedback-template';
import { toast } from '@/hooks/use-toast';

interface FeedbackTemplateManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 정렬 가능한 템플릿 아이템 컴포넌트
function SortableTemplateItem({
  template,
  onEdit,
  onDelete,
}: {
  template: FeedbackTemplate;
  onEdit: (template: FeedbackTemplate) => void;
  onDelete: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: template.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 group"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 text-gray-400 hover:text-gray-600"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {template.is_urgent && (
            <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0" />
          )}
          <span className="font-medium text-sm truncate">{template.title}</span>
        </div>
        <p className="text-xs text-gray-500 truncate mt-0.5">
          {template.content}
        </p>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => onEdit(template)}
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-red-500 hover:text-red-600 hover:bg-red-50"
          onClick={() => onDelete(template.id)}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function FeedbackTemplateManager({
  open,
  onOpenChange,
}: FeedbackTemplateManagerProps) {
  const [templates, setTemplates] = useState<FeedbackTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // 편집 모드
  const [editingTemplate, setEditingTemplate] = useState<FeedbackTemplate | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // 폼 상태
  const [formTitle, setFormTitle] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formIsUrgent, setFormIsUrgent] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 템플릿 로드
  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/feedback-templates');
      if (response.ok) {
        const json = await response.json();
        setTemplates(json.data || []);
      }
    } catch (error) {
      console.error('템플릿 로드 실패:', error);
      toast({
        title: '오류',
        description: '템플릿을 불러오는데 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 드래그 종료 핸들러
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = templates.findIndex((t) => t.id === active.id);
      const newIndex = templates.findIndex((t) => t.id === over.id);

      const newTemplates = arrayMove(templates, oldIndex, newIndex);
      setTemplates(newTemplates);

      // 서버에 순서 저장
      try {
        await fetch('/api/feedback-templates', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ templateIds: newTemplates.map((t) => t.id) }),
        });
      } catch (error) {
        console.error('순서 저장 실패:', error);
        // 실패 시 원래 순서로 복구
        fetchTemplates();
      }
    }
  };

  // 새 템플릿 생성 시작
  const handleStartCreate = () => {
    setIsCreating(true);
    setEditingTemplate(null);
    setFormTitle('');
    setFormContent('');
    setFormIsUrgent(false);
  };

  // 편집 시작
  const handleStartEdit = (template: FeedbackTemplate) => {
    setEditingTemplate(template);
    setIsCreating(false);
    setFormTitle(template.title);
    setFormContent(template.content);
    setFormIsUrgent(template.is_urgent);
  };

  // 폼 취소
  const handleCancelForm = () => {
    setIsCreating(false);
    setEditingTemplate(null);
    setFormTitle('');
    setFormContent('');
    setFormIsUrgent(false);
  };

  // 저장
  const handleSave = async () => {
    if (!formTitle.trim() || !formContent.trim()) {
      toast({
        title: '입력 오류',
        description: '제목과 내용을 모두 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    try {
      if (isCreating) {
        // 새 템플릿 생성
        const response = await fetch('/api/feedback-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formTitle.trim(),
            content: formContent.trim(),
            is_urgent: formIsUrgent,
          }),
        });

        if (response.ok) {
          toast({ title: '템플릿이 생성되었습니다.' });
          fetchTemplates();
          handleCancelForm();
        } else {
          const json = await response.json();
          throw new Error(json.error);
        }
      } else if (editingTemplate) {
        // 템플릿 수정
        const response = await fetch(`/api/feedback-templates/${editingTemplate.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: formTitle.trim(),
            content: formContent.trim(),
            is_urgent: formIsUrgent,
          }),
        });

        if (response.ok) {
          toast({ title: '템플릿이 수정되었습니다.' });
          fetchTemplates();
          handleCancelForm();
        } else {
          const json = await response.json();
          throw new Error(json.error);
        }
      }
    } catch (error) {
      toast({
        title: '저장 실패',
        description: error instanceof Error ? error.message : '저장에 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // 삭제
  const handleDelete = async (id: string) => {
    if (!confirm('이 템플릿을 삭제하시겠습니까?')) return;

    try {
      const response = await fetch(`/api/feedback-templates/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({ title: '템플릿이 삭제되었습니다.' });
        setTemplates((prev) => prev.filter((t) => t.id !== id));
      } else {
        const json = await response.json();
        throw new Error(json.error);
      }
    } catch (error) {
      toast({
        title: '삭제 실패',
        description: error instanceof Error ? error.message : '삭제에 실패했습니다.',
        variant: 'destructive',
      });
    }
  };

  // 기본 템플릿 추가
  const handleAddDefaultTemplates = async () => {
    const availableSlots = MAX_TEMPLATES - templates.length;
    if (availableSlots <= 0) {
      toast({
        title: '추가 불가',
        description: '템플릿이 이미 최대 개수입니다.',
        variant: 'destructive',
      });
      return;
    }

    // 이미 있는 템플릿 제목 확인 (중복 방지)
    const existingTitles = new Set(templates.map((t) => t.title));
    const templatesToAdd = DEFAULT_TEMPLATES.filter(
      (t) => !existingTitles.has(t.title)
    ).slice(0, availableSlots);

    if (templatesToAdd.length === 0) {
      toast({
        title: '추가할 템플릿 없음',
        description: '기본 템플릿이 이미 모두 추가되어 있습니다.',
      });
      return;
    }

    setIsSaving(true);
    try {
      let addedCount = 0;
      for (const template of templatesToAdd) {
        const response = await fetch('/api/feedback-templates', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(template),
        });
        if (response.ok) {
          addedCount++;
        }
      }

      toast({
        title: '기본 템플릿 추가 완료',
        description: `${addedCount}개의 템플릿이 추가되었습니다.`,
      });
      fetchTemplates();
    } catch (error) {
      toast({
        title: '추가 실패',
        description: '기본 템플릿 추가에 실패했습니다.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const isFormOpen = isCreating || editingTemplate !== null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>피드백 템플릿 관리</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              {/* 템플릿 추가/편집 폼 */}
              {isFormOpen && (
                <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="template-title" className="text-sm">
                        제목
                      </Label>
                      <Input
                        id="template-title"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="템플릿 제목"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="template-content" className="text-sm">
                        내용
                      </Label>
                      <Textarea
                        id="template-content"
                        value={formContent}
                        onChange={(e) => setFormContent(e.target.value)}
                        placeholder="피드백 내용"
                        rows={3}
                        className="mt-1 resize-none"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="template-urgent"
                        checked={formIsUrgent}
                        onCheckedChange={(checked) =>
                          setFormIsUrgent(checked === true)
                        }
                      />
                      <Label
                        htmlFor="template-urgent"
                        className="text-sm cursor-pointer flex items-center gap-1"
                      >
                        <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                        긴급 피드백
                      </Label>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCancelForm}
                      >
                        <X className="h-4 w-4 mr-1" />
                        취소
                      </Button>
                      <Button
                        size="sm"
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-primary-600 hover:bg-primary-700"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4 mr-1" />
                        )}
                        저장
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* 템플릿 목록 */}
              {templates.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500 mb-1">템플릿이 없습니다</p>
                  <p className="text-sm text-gray-400 mb-4">
                    자주 사용하는 피드백을 템플릿으로 저장하세요
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleAddDefaultTemplates}
                    disabled={isSaving}
                    className="gap-1"
                  >
                    {isSaving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    기본 템플릿 추가
                  </Button>
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={templates.map((t) => t.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-2">
                      {templates.map((template) => (
                        <SortableTemplateItem
                          key={template.id}
                          template={template}
                          onEdit={handleStartEdit}
                          onDelete={handleDelete}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
            </>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <span className="text-xs text-gray-500">
            {templates.length}/{MAX_TEMPLATES}개
          </span>
          <Button
            onClick={handleStartCreate}
            disabled={templates.length >= MAX_TEMPLATES || isFormOpen}
            className="bg-primary-600 hover:bg-primary-700"
          >
            <Plus className="h-4 w-4 mr-1" />
            템플릿 추가
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
