'use client';

import { useState, useEffect } from 'react';
import { FileText, FileCheck, FileSignature, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { DocumentTemplate, DocumentType, TemplateField } from '@/types/database';

const typeConfig: Record<DocumentType, { label: string; icon: typeof FileText; description: string }> = {
  request: { label: '작업 요청서', icon: FileText, description: '영상 작업을 요청할 때 사용합니다' },
  estimate: { label: '견적서', icon: FileCheck, description: '작업 비용과 조건을 명시합니다' },
  contract: { label: '계약서', icon: FileSignature, description: '양측 합의사항을 문서화합니다' },
};

interface CreateDocumentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectTitle?: string;
  onCreated: () => void;
}

export function CreateDocumentModal({ open, onOpenChange, projectId, projectTitle, onCreated }: CreateDocumentModalProps) {
  const [step, setStep] = useState<'type' | 'template' | 'fields'>('type');
  const [selectedType, setSelectedType] = useState<DocumentType | null>(null);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setStep('type');
      setSelectedType(null);
      setSelectedTemplate(null);
      setTitle('');
      setContent({});
      setError('');
    }
  }, [open]);

  const handleTypeSelect = async (type: DocumentType) => {
    setSelectedType(type);
    setLoading(true);
    try {
      const res = await fetch(`/api/templates?type=${type}`);
      const data = await res.json();
      setTemplates(data.data || []);
      setStep('template');
    } catch {
      setError('템플릿 목록을 불러오는데 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    setTitle(`${typeConfig[template.type].label} - ${new Date().toLocaleDateString('ko-KR')}`);
    // 프로젝트명 필드가 있으면 자동으로 채움
    const initialContent: Record<string, unknown> = {};
    if (projectTitle) {
      const projectNameField = template.fields.find((f) => f.name === 'project_name');
      if (projectNameField) {
        initialContent.project_name = projectTitle;
      }
    }
    setContent(initialContent);
    setStep('fields');
  };

  const handleFieldChange = (fieldName: string, value: unknown) => {
    setContent((prev) => ({ ...prev, [fieldName]: value }));
  };

  const renderField = (field: TemplateField) => {
    const value = content[field.name] ?? '';
    const isAutoFilled = field.name === 'project_name' && !!projectTitle;

    switch (field.type) {
      case 'text':
        return (
          <Input
            value={String(value)}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.label}
            disabled={isAutoFilled}
            className={isAutoFilled ? 'bg-gray-50 text-gray-600' : ''}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            value={String(value)}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.label}
          />
        );
      case 'date':
        return (
          <div className="relative">
            <input
              type="date"
              value={String(value)}
              onChange={(e) => handleFieldChange(field.name, e.target.value)}
              className="flex h-10 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 cursor-pointer"
              style={{ colorScheme: 'light' }}
            />
          </div>
        );
      case 'textarea':
        return (
          <Textarea
            value={String(value)}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.label}
            rows={3}
          />
        );
      case 'select':
        return (
          <select
            value={String(value)}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900"
          >
            <option value="">선택하세요</option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        );
      default:
        return (
          <Input
            value={String(value)}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.label}
          />
        );
    }
  };

  const validateFields = (): boolean => {
    if (!selectedTemplate) return true;
    const requiredFields = selectedTemplate.fields.filter((f) => f.required);
    for (const field of requiredFields) {
      const value = content[field.name];
      if (!value || String(value).trim() === '') {
        setError(`"${field.label}" 항목은 필수입니다.`);
        return false;
      }
    }
    return true;
  };

  const handleCreate = async () => {
    if (!selectedType || !title.trim()) return;
    if (!validateFields()) return;

    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/projects/${projectId}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          template_id: selectedTemplate?.id,
          title: title.trim(),
          content,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || '문서 생성에 실패했습니다');
      }

      onCreated();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '문서 생성에 실패했습니다');
    } finally {
      setLoading(false);
    }
  };

  const fields = selectedTemplate?.fields || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-200 [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-gray-300">
        <DialogHeader>
          <DialogTitle>
            {step === 'type' && '문서 유형 선택'}
            {step === 'template' && '템플릿 선택'}
            {step === 'fields' && '문서 작성'}
          </DialogTitle>
          <DialogDescription>
            {step === 'type' && '생성할 문서 유형을 선택하세요'}
            {step === 'template' && '사용할 템플릿을 선택하세요'}
            {step === 'fields' && '문서 정보를 입력하세요'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>
        )}

        {step === 'type' && (
          <div className="grid gap-3">
            {(Object.entries(typeConfig) as [DocumentType, typeof typeConfig.request][]).map(([type, config]) => {
              const Icon = config.icon;
              return (
                <button
                  key={type}
                  onClick={() => handleTypeSelect(type)}
                  disabled={loading}
                  className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{config.label}</div>
                    <div className="text-sm text-gray-500">{config.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {step === 'template' && (
          <div className="grid gap-3">
            {templates.map((template) => (
              <button
                key={template.id}
                onClick={() => handleTemplateSelect(template)}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors text-left"
              >
                <div>
                  <div className="font-medium text-gray-900">{template.name}</div>
                  {template.description && (
                    <div className="text-sm text-gray-500 mt-1">{template.description}</div>
                  )}
                  <div className="text-xs text-gray-400 mt-1">
                    {template.fields.length}개 필드
                  </div>
                </div>
                {template.is_default && (
                  <span className="text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                    기본
                  </span>
                )}
              </button>
            ))}
            {templates.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                사용 가능한 템플릿이 없습니다
              </div>
            )}
            <Button variant="ghost" onClick={() => setStep('type')} className="mt-2">
              <ArrowLeft className="h-4 w-4 mr-1" />
              이전으로
            </Button>
          </div>
        )}

        {step === 'fields' && (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div>
                <Label htmlFor="doc-title" className="text-sm font-medium text-gray-700">문서 제목</Label>
                <Input
                  id="doc-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="문서 제목을 입력하세요"
                  className="mt-1.5 bg-white"
                />
              </div>

              {selectedTemplate && (
                <div className="text-xs text-gray-400">
                  템플릿: {selectedTemplate.name}
                </div>
              )}
            </div>

            {fields.length > 0 && (
              <div className="space-y-4">
                <div className="text-sm font-medium text-gray-700 border-b border-gray-100 pb-2">상세 정보</div>
                {(() => {
                  const compactTypes = ['date', 'number'];
                  const rendered: React.ReactNode[] = [];
                  let i = 0;
                  while (i < fields.length) {
                    const field = fields[i];
                    const nextField = i + 1 < fields.length ? fields[i + 1] : null;
                    // 두 필드가 연속으로 compact 타입이면 2컬럼
                    if (compactTypes.includes(field.type) && nextField && compactTypes.includes(nextField.type)) {
                      rendered.push(
                        <div key={`row-${field.name}`} className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-sm font-medium text-gray-700">
                              {field.label}
                              {field.required && <span className="text-red-500 ml-0.5">*</span>}
                            </Label>
                            <div className="mt-1.5">{renderField(field)}</div>
                          </div>
                          <div>
                            <Label className="text-sm font-medium text-gray-700">
                              {nextField.label}
                              {nextField.required && <span className="text-red-500 ml-0.5">*</span>}
                            </Label>
                            <div className="mt-1.5">{renderField(nextField)}</div>
                          </div>
                        </div>
                      );
                      i += 2;
                    } else {
                      rendered.push(
                        <div key={field.name}>
                          <Label className="text-sm font-medium text-gray-700">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-0.5">*</span>}
                            {field.name === 'project_name' && (
                              <span className="text-xs text-gray-400 ml-2">(자동 입력)</span>
                            )}
                          </Label>
                          <div className="mt-1.5">{renderField(field)}</div>
                        </div>
                      );
                      i += 1;
                    }
                  }
                  return rendered;
                })()}
              </div>
            )}

            <div className="flex gap-2 justify-between pt-3 border-t border-gray-100">
              <Button variant="ghost" onClick={() => setStep('template')}>
                <ArrowLeft className="h-4 w-4 mr-1" />
                이전으로
              </Button>
              <Button
                onClick={handleCreate}
                disabled={!title.trim() || loading}
                className="bg-primary-600 hover:bg-primary-700"
              >
                {loading ? '생성 중...' : '문서 생성'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
