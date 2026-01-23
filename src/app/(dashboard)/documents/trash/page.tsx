'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trash2, RotateCcw, FileText, FileCheck, FileSignature } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { DocumentType } from '@/types/database';

interface TrashDocumentItem {
  id: string;
  type: DocumentType;
  title: string;
  version: number;
  deleted_at: string;
  profiles: { id: string; name: string; email: string } | null;
  projects: { id: string; title: string } | null;
}

export default function DocumentTrashPage() {
  const [documents, setDocuments] = useState<TrashDocumentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTrash = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/documents/trash');
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.data || []);
      }
    } catch (err) {
      console.error('휴지통 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTrash();
  }, [fetchTrash]);

  const handleRestore = async (docId: string) => {
    try {
      const res = await fetch(`/api/documents/${docId}/restore`, { method: 'PATCH' });
      if (res.ok) {
        fetchTrash();
      } else {
        const data = await res.json();
        alert(data.error || '복구에 실패했습니다');
      }
    } catch {
      alert('복구에 실패했습니다');
    }
  };

  const getDaysRemaining = (deletedAt: string): number => {
    const deleted = new Date(deletedAt);
    const expiry = new Date(deleted);
    expiry.setDate(expiry.getDate() + 14);
    const now = new Date();
    return Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">휴지통</h1>
        <p className="text-sm text-gray-500 mt-1">
          삭제된 문서는 2주 후 자동으로 영구 삭제됩니다
        </p>
      </div>

      {/* 문서 목록 */}
      {loading ? (
        <div className="grid gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Trash2 className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500">휴지통이 비어있습니다</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {documents.map((doc) => {
            const daysRemaining = getDaysRemaining(doc.deleted_at);
            return (
              <Card key={doc.id} className="opacity-75 hover:opacity-100 transition-opacity">
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center">
                      {doc.type === 'request' && <FileText className="h-5 w-5" />}
                      {doc.type === 'estimate' && <FileCheck className="h-5 w-5" />}
                      {doc.type === 'contract' && <FileSignature className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">{doc.title}</div>
                      <div className="text-sm text-gray-500">
                        {doc.projects?.title || '프로젝트 없음'} · {doc.profiles?.name || '알 수 없음'} · v{doc.version}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        삭제: {new Date(doc.deleted_at).toLocaleDateString('ko-KR')} · {daysRemaining}일 후 영구 삭제
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRestore(doc.id)}
                    className="text-primary-600 hover:text-primary-700"
                  >
                    <RotateCcw className="h-4 w-4 mr-1" />
                    복구
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
