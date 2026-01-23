'use client';

import { useState, useEffect, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Pencil, Download, Printer, Clock, CheckCircle,
  XCircle, Send, FileSignature, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DocumentStatusBadge } from '@/components/document/DocumentStatusBadge';
import { DocumentPreview } from '@/components/document/DocumentPreview';
import { RejectReasonModal } from '@/components/document/RejectReasonModal';
import { SignaturePad } from '@/components/document/SignaturePad';
import { downloadPdf } from '@/lib/pdf-download';
import type { DocumentStatus, TemplateField } from '@/types/database';

interface DocumentDetail {
  id: string;
  project_id: string;
  type: string;
  title: string;
  content: Record<string, unknown>;
  status: DocumentStatus;
  version: number;
  reject_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  document_templates: {
    id: string;
    name: string;
    type: string;
    fields: TemplateField[];
  } | null;
  profiles: { id: string; name: string; email: string } | null;
  signatures: {
    id: string;
    user_id: string;
    signed_at: string;
    profiles: { id: string; name: string; email: string };
  }[];
}

interface VersionItem {
  id: string;
  version: number;
  content: Record<string, unknown>;
  created_at: string;
  profiles: { id: string; name: string } | null;
}

export default function DocumentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [document, setDocument] = useState<DocumentDetail | null>(null);
  const [versions, setVersions] = useState<VersionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [compareVersion, setCompareVersion] = useState<VersionItem | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const fetchDocument = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${resolvedParams.id}`);
      if (res.ok) {
        const data = await res.json();
        setDocument(data.data);
      }
    } catch (err) {
      console.error('문서 조회 실패:', err);
    } finally {
      setLoading(false);
    }
  }, [resolvedParams.id]);

  const fetchVersions = useCallback(async () => {
    try {
      const res = await fetch(`/api/documents/${resolvedParams.id}/versions`);
      if (res.ok) {
        const data = await res.json();
        setVersions(data.data || []);
      }
    } catch (err) {
      console.error('버전 조회 실패:', err);
    }
  }, [resolvedParams.id]);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setCurrentUserId(data.data?.user?.id || '');
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchDocument();
    fetchVersions();
    fetchCurrentUser();
  }, [fetchDocument, fetchVersions, fetchCurrentUser]);

  const handleStatusChange = async (newStatus: string, rejectReason?: string) => {
    setActionLoading(true);
    try {
      const body: Record<string, string> = { status: newStatus };
      if (rejectReason) body.reject_reason = rejectReason;

      const res = await fetch(`/api/documents/${resolvedParams.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        await fetchDocument();
        setShowRejectModal(false);
      } else {
        const errData = await res.json();
        alert(errData.error || '상태 변경에 실패했습니다');
      }
    } catch {
      alert('상태 변경에 실패했습니다');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSign = async (signatureData: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/documents/${resolvedParams.id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signature_data: signatureData }),
      });

      if (res.ok) {
        await fetchDocument();
        setShowSignModal(false);
      } else {
        const errData = await res.json();
        alert(errData.error || '서명에 실패했습니다');
      }
    } catch {
      alert('서명에 실패했습니다');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
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

  const isAuthor = currentUserId === document.created_by;
  const canEdit = isAuthor && document.status !== 'signed';
  const canSubmit = document.status === 'draft' && isAuthor;
  const canApproveReject = document.status === 'pending' && !isAuthor;
  const canSign = document.status === 'approved' && document.type === 'contract';
  const canRevert = document.status === 'rejected' && isAuthor;

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            onClick={() => router.push(`/projects/${document.project_id}/documents`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{document.title}</h1>
            <div className="flex items-center gap-2 mt-1">
              <DocumentStatusBadge status={document.status} />
              <span className="text-sm text-gray-500">v{document.version}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
          <Button
            variant="outline"
            size="sm"
            disabled={pdfLoading}
            onClick={async () => {
              setPdfLoading(true);
              try {
                await downloadPdf(`/api/documents/${document.id}/pdf`, document.title);
              } catch {
                alert('PDF 다운로드에 실패했습니다');
              } finally {
                setPdfLoading(false);
              }
            }}
          >
            {pdfLoading ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-1" />
            )}
            {pdfLoading ? '생성 중...' : 'PDF'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(`/api/documents/${document.id}/pdf?print=true`, '_blank')}
          >
            <Printer className="h-4 w-4 mr-1" />
            인쇄
          </Button>
          {canEdit && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push(`/documents/${document.id}/edit`)}
            >
              <Pencil className="h-4 w-4 mr-1" />
              편집
            </Button>
          )}
          {canSubmit && (
            <Button
              size="sm"
              onClick={() => handleStatusChange('pending')}
              disabled={actionLoading}
              className="bg-primary-600 hover:bg-primary-700"
            >
              <Send className="h-4 w-4 mr-1" />
              제출
            </Button>
          )}
          {canApproveReject && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading}
              >
                <XCircle className="h-4 w-4 mr-1" />
                반려
              </Button>
              <Button
                size="sm"
                onClick={() => handleStatusChange('approved')}
                disabled={actionLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                승인
              </Button>
            </>
          )}
          {canSign && (
            <Button
              size="sm"
              onClick={() => setShowSignModal(true)}
              disabled={actionLoading}
              className="bg-primary-600 hover:bg-primary-700"
            >
              <FileSignature className="h-4 w-4 mr-1" />
              서명
            </Button>
          )}
          {canRevert && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange('draft')}
              disabled={actionLoading}
            >
              수정하기
            </Button>
          )}
        </div>
      </div>

      {/* 반려 사유 */}
      {document.status === 'rejected' && document.reject_reason && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-sm font-medium text-red-800 mb-1">반려 사유</div>
          <p className="text-sm text-red-700">{document.reject_reason}</p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* 문서 미리보기 (또는 버전 비교) */}
        <div className="lg:col-span-2">
          {compareVersion ? (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4 items-start">
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2 h-6">
                    <span className="inline-block w-3 h-3 rounded-full bg-red-200" />
                    v{compareVersion.version} (이전)
                  </div>
                  <DocumentPreview
                    title={document.title}
                    type={document.type}
                    fields={document.document_templates?.fields || []}
                    content={compareVersion.content}
                    compact
                  />
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-500 mb-2 flex items-center gap-2 h-6">
                    <span className="inline-block w-3 h-3 rounded-full bg-green-200" />
                    v{document.version} (현재)
                  </div>
                  <DocumentPreview
                    title={document.title}
                    type={document.type}
                    fields={document.document_templates?.fields || []}
                    content={document.content}
                    compact
                  />
                </div>
              </div>
              {/* 변경 내역 요약 */}
              <VersionDiff
                fields={document.document_templates?.fields || []}
                oldContent={compareVersion.content}
                newContent={document.content}
              />
            </div>
          ) : (
            <div className="bg-gray-100 rounded-xl p-6">
              <DocumentPreview
                title={document.title}
                type={document.type}
                fields={document.document_templates?.fields || []}
                content={document.content}
              />
            </div>
          )}
        </div>

        {/* 사이드바 */}
        <div className="space-y-4">
          {/* 문서 정보 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">문서 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">작성자</span>
                <span>{document.profiles?.name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">템플릿</span>
                <span>{document.document_templates?.name || '-'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">생성일</span>
                <span>{new Date(document.created_at).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">수정일</span>
                <span>{new Date(document.updated_at).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </CardContent>
          </Card>

          {/* 서명 정보 */}
          {document.signatures.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">서명 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {document.signatures.map((sig) => (
                  <div key={sig.id} className="flex items-center justify-between text-sm">
                    <span>{sig.profiles?.name}</span>
                    <span className="text-gray-500">
                      {new Date(sig.signed_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* 버전 히스토리 */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-1">
                <Clock className="h-4 w-4" />
                버전 히스토리
              </CardTitle>
            </CardHeader>
            <CardContent>
              {versions.length === 0 ? (
                <p className="text-sm text-gray-500">버전 기록 없음</p>
              ) : (
                <div className="space-y-1">
                  {versions.map((ver) => (
                    <button
                      key={ver.id}
                      onClick={() => setCompareVersion(compareVersion?.id === ver.id ? null : ver)}
                      className={`w-full flex items-center justify-between text-sm p-2 rounded-md transition-colors ${
                        compareVersion?.id === ver.id
                          ? 'bg-primary-50 border border-primary-200'
                          : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className={`font-medium ${
                        ver.version === document.version ? 'text-primary-600' : ''
                      }`}>
                        v{ver.version}
                        {ver.version === document.version && ' (현재)'}
                      </span>
                      <span className="text-gray-500 text-xs">
                        {ver.profiles?.name} · {new Date(ver.created_at).toLocaleString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </button>
                  ))}
                </div>
              )}
              {compareVersion && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    v{compareVersion.version}과 현재 버전(v{document.version})을 비교 중
                  </p>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-1 text-xs"
                    onClick={() => setCompareVersion(null)}
                  >
                    비교 닫기
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 모달들 */}
      <RejectReasonModal
        open={showRejectModal}
        onOpenChange={setShowRejectModal}
        onConfirm={(reason) => handleStatusChange('rejected', reason)}
        loading={actionLoading}
      />
      <SignaturePad
        open={showSignModal}
        onOpenChange={setShowSignModal}
        onSign={handleSign}
        loading={actionLoading}
      />
    </div>
  );
}

function VersionDiff({
  fields,
  oldContent,
  newContent,
}: {
  fields: TemplateField[];
  oldContent: Record<string, unknown>;
  newContent: Record<string, unknown>;
}) {
  const changes = fields.filter((field) => {
    const oldVal = String(oldContent[field.name] ?? '');
    const newVal = String(newContent[field.name] ?? '');
    return oldVal !== newVal;
  });

  if (changes.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500 text-center">
        변경된 내용이 없습니다
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <h4 className="text-sm font-medium text-gray-700">변경 내역 ({changes.length}건)</h4>
      </div>
      <div className="divide-y divide-gray-100">
        {changes.map((field) => {
          const oldVal = String(oldContent[field.name] ?? '') || '(비어있음)';
          const newVal = String(newContent[field.name] ?? '') || '(비어있음)';
          return (
            <div key={field.name} className="px-4 py-3">
              <div className="text-sm font-medium text-gray-700 mb-2">{field.label}</div>
              <div className="grid md:grid-cols-2 gap-2 text-sm">
                <div className="bg-red-50 rounded p-2 text-red-800 break-words">
                  <span className="text-xs text-red-500 block mb-0.5">이전</span>
                  {oldVal}
                </div>
                <div className="bg-green-50 rounded p-2 text-green-800 break-words">
                  <span className="text-xs text-green-500 block mb-0.5">현재</span>
                  {newVal}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
