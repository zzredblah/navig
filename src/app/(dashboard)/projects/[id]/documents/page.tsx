'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, FileText, FileCheck, FileSignature, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { DocumentStatusBadge } from '@/components/document/DocumentStatusBadge';
import { CreateDocumentModal } from '@/components/document/CreateDocumentModal';
import type { DocumentType, DocumentStatus } from '@/types/database';

interface DocumentItem {
  id: string;
  type: DocumentType;
  title: string;
  status: DocumentStatus;
  version: number;
  created_at: string;
  updated_at: string;
  profiles: { id: string; name: string; email: string } | null;
  document_templates: { id: string; name: string; type: string } | null;
}

const tabs: { type: DocumentType | 'all'; label: string; icon: typeof FileText }[] = [
  { type: 'all', label: '전체', icon: FileText },
  { type: 'request', label: '요청서', icon: FileText },
  { type: 'estimate', label: '견적서', icon: FileCheck },
  { type: 'contract', label: '계약서', icon: FileSignature },
];

export default function ProjectDocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [projectTitle, setProjectTitle] = useState('');
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<DocumentType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | ''>('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchProject = useCallback(async () => {
    try {
      const res = await fetch(`/api/projects/${resolvedParams.id}`);
      if (res.ok) {
        const data = await res.json();
        setProjectTitle(data.data?.project?.title || '');
      }
    } catch {
      // ignore
    }
  }, [resolvedParams.id]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (activeTab !== 'all') params.set('type', activeTab);
      if (statusFilter) params.set('status', statusFilter);

      const res = await fetch(`/api/projects/${resolvedParams.id}/documents?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setDocuments(data.data || []);
      }
    } catch (err) {
      console.error('문서 목록 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id, activeTab, statusFilter]);

  useEffect(() => {
    fetchProject();
    fetchDocuments();
  }, [fetchProject, fetchDocuments]);

  const handleDocumentClick = (docId: string) => {
    router.push(`/documents/${docId}`);
  };

  const handleDelete = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    if (!confirm('이 문서를 삭제하시겠습니까? 휴지통으로 이동됩니다.')) return;

    try {
      const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
      if (res.ok) {
        fetchDocuments();
      } else {
        const data = await res.json();
        alert(data.error || '삭제에 실패했습니다');
      }
    } catch {
      alert('삭제에 실패했습니다');
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">문서 관리</h1>
          <p className="text-sm text-gray-500 mt-1">프로젝트 문서를 관리합니다</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary-600 hover:bg-primary-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          문서 생성
        </Button>
      </div>

      {/* 탭 & 필터 */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.type}
                onClick={() => setActiveTab(tab.type)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeTab === tab.type
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as DocumentStatus | '')}
          className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-gray-900"
        >
          <option value="">모든 상태</option>
          <option value="draft">작성 중</option>
          <option value="pending">검토 대기</option>
          <option value="approved">승인</option>
          <option value="rejected">반려</option>
          <option value="signed">서명 완료</option>
        </select>
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
            <FileText className="h-12 w-12 text-gray-300 mb-4" />
            <p className="text-gray-500 mb-4">문서가 없습니다</p>
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              첫 문서 생성하기
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {documents.map((doc) => (
            <Card
              key={doc.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => handleDocumentClick(doc.id)}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 text-primary-600 flex items-center justify-center">
                    {doc.type === 'request' && <FileText className="h-5 w-5" />}
                    {doc.type === 'estimate' && <FileCheck className="h-5 w-5" />}
                    {doc.type === 'contract' && <FileSignature className="h-5 w-5" />}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900">{doc.title}</div>
                    <div className="text-sm text-gray-500">
                      {doc.profiles?.name || '알 수 없음'} · v{doc.version} ·{' '}
                      {new Date(doc.updated_at).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <DocumentStatusBadge status={doc.status} />
                  <button
                    onClick={(e) => handleDelete(e, doc.id)}
                    className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                    title="삭제"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 문서 생성 모달 */}
      <CreateDocumentModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        projectId={resolvedParams.id}
        projectTitle={projectTitle}
        onCreated={fetchDocuments}
      />
    </div>
  );
}
