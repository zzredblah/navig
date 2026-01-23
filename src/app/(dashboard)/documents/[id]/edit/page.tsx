'use client';

import { useState, useEffect, useCallback, useRef, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Eye, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DocumentPreview } from '@/components/document/DocumentPreview';
import type { DocumentStatus, TemplateField } from '@/types/database';

interface DocumentData {
  id: string;
  project_id: string;
  type: string;
  title: string;
  content: Record<string, unknown>;
  status: DocumentStatus;
  version: number;
  document_templates: {
    id: string;
    name: string;
    type: string;
    fields: TemplateField[];
  } | null;
}

export default function DocumentEditPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [content, setContent] = useState<Record<string, unknown>>({});
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);
  const initialContentRef = useRef<Record<string, unknown>>({});
  const initialTitleRef = useRef('');

  const fetchDocument = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${resolvedParams.id}`);
      if (res.ok) {
        const data = await res.json();
        const doc = data.data;
        setDocument(doc);
        setTitle(doc.title);
        setContent(doc.content || {});
        initialContentRef.current = doc.content || {};
        initialTitleRef.current = doc.title;
      }
    } catch (err) {
      console.error('문서 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id]);

  useEffect(() => {
    fetchDocument();
  }, [fetchDocument]);

  // 변경사항 여부 확인
  const hasChanges = useMemo(() => {
    if (!document) return false;
    if (title !== initialTitleRef.current) return true;
    const currentStr = JSON.stringify(content);
    const initialStr = JSON.stringify(initialContentRef.current);
    return currentStr !== initialStr;
  }, [title, content, document]);

  // 자동 저장 (30초, draft 상태에서만, 변경사항 있을 때만)
  useEffect(() => {
    if (!document || document.status !== 'draft') return;

    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    autoSaveTimer.current = setTimeout(() => {
      if (hasChanges) {
        handleSave(true);
      }
    }, 30000);

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [content, title, document?.status, hasChanges]);

  const handleSave = async (isAutoSave = false) => {
    if (!document || saving) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/documents/${resolvedParams.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });

      if (res.ok) {
        const data = await res.json();
        setDocument(data.data);
        setLastSaved(new Date());
        initialContentRef.current = { ...content };
        initialTitleRef.current = title;
        if (!isAutoSave) {
          // 수동 저장 시 문서 상세로 이동
          router.push(`/documents/${resolvedParams.id}`);
        }
      } else {
        const errData = await res.json();
        if (!isAutoSave) {
          alert(errData.error || '저장에 실패했습니다');
        }
      }
    } catch {
      if (!isAutoSave) {
        alert('저장에 실패했습니다');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push(`/documents/${resolvedParams.id}`);
  };

  const handleFieldChange = (fieldName: string, value: unknown) => {
    setContent((prev) => ({ ...prev, [fieldName]: value }));
  };

  const renderField = (field: TemplateField) => {
    const value = content[field.name] ?? '';
    const isProjectName = field.name === 'project_name';

    switch (field.type) {
      case 'text':
        return (
          <Input
            value={String(value)}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            placeholder={field.label}
            disabled={isProjectName}
            className={isProjectName ? 'bg-gray-50 text-gray-600 cursor-not-allowed' : ''}
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
            rows={4}
            className="resize-none"
          />
        );
      case 'select':
        return (
          <select
            value={String(value)}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className="w-full h-10 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
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

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="h-96 bg-gray-100 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (!document) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">문서를 찾을 수 없습니다</p>
      </div>
    );
  }

  if (document.status === 'signed') {
    router.push(`/documents/${resolvedParams.id}`);
    return null;
  }

  const fields = document.document_templates?.fields || [];

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={handleCancel}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">문서 편집</h1>
            {lastSaved && (
              <p className="text-xs text-gray-400 mt-0.5">
                마지막 저장: {lastSaved.toLocaleTimeString('ko-KR')}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="h-4 w-4 mr-1" />
            {showPreview ? '편집' : '미리보기'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
          >
            <X className="h-4 w-4 mr-1" />
            취소
          </Button>
          <Button
            size="sm"
            onClick={() => handleSave()}
            disabled={saving || !hasChanges}
            className="bg-primary-600 hover:bg-primary-700"
          >
            <Save className="h-4 w-4 mr-1" />
            {saving ? '저장 중...' : '저장'}
          </Button>
        </div>
      </div>

      {/* 비 draft 상태에서 수정 시 안내 */}
      {document.status !== 'draft' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            수정 시 새로운 버전(v{document.version + 1})으로 저장되며, 문서 상태가 &quot;작성 중&quot;으로 변경됩니다.
            이전 버전은 버전 히스토리에서 확인할 수 있습니다.
          </p>
        </div>
      )}

      {showPreview ? (
        <div className="bg-gray-100 rounded-xl p-6">
          <DocumentPreview
            title={title}
            type={document.type}
            fields={fields}
            content={content}
          />
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* 폼 영역 */}
          <Card className="border border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-100 bg-gray-50/50">
              <CardTitle className="text-base">문서 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5 pt-5">
              <div>
                <Label htmlFor="edit-title" className="text-sm font-medium text-gray-700">문서 제목</Label>
                <Input
                  id="edit-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1.5"
                />
              </div>

              {fields.length > 0 ? (
                <div className="space-y-4 border-t border-gray-100 pt-4">
                  {(() => {
                    const compactTypes = ['date', 'number'];
                    const rendered: React.ReactNode[] = [];
                    let i = 0;
                    while (i < fields.length) {
                      const field = fields[i];
                      const nextField = i + 1 < fields.length ? fields[i + 1] : null;
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
                                <span className="text-xs text-gray-400 ml-2">(변경 불가)</span>
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
              ) : (
                <p className="text-sm text-gray-500">
                  템플릿 필드가 없습니다. 자유롭게 내용을 작성해주세요.
                </p>
              )}
            </CardContent>
          </Card>

          {/* 실시간 미리보기 (데스크탑) */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <div className="text-sm font-medium text-gray-500 mb-2">미리보기</div>
              <div className="bg-gray-100 rounded-xl p-4">
                <DocumentPreview
                  title={title}
                  type={document.type}
                  fields={fields}
                  content={content}
                  compact
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
