'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2,
  Folder,
  FileVideo,
  FileText,
  File,
  ArrowLeft,
  Check,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  thumbnailLink?: string;
  webViewLink?: string;
  iconLink?: string;
  modifiedTime?: string;
  isFolder: boolean;
}

interface GoogleDriveFileBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  importType: 'video' | 'document';
  onImportSuccess?: (file: { id: string; name: string; url: string }) => void;
}

function formatFileSize(bytes?: string | number): string {
  if (!bytes) return '';
  const size = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDate(dateString?: string): string {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('ko-KR');
}

function getFileIcon(mimeType: string, isFolder: boolean) {
  if (isFolder) return <Folder className="h-5 w-5 text-yellow-500" />;
  if (mimeType.startsWith('video/')) return <FileVideo className="h-5 w-5 text-purple-500" />;
  if (mimeType === 'application/pdf') return <FileText className="h-5 w-5 text-red-500" />;
  if (mimeType.includes('document') || mimeType.includes('word'))
    return <FileText className="h-5 w-5 text-blue-500" />;
  if (mimeType.includes('sheet') || mimeType.includes('excel'))
    return <FileText className="h-5 w-5 text-green-500" />;
  if (mimeType.startsWith('image/')) return <FileText className="h-5 w-5 text-pink-500" />;
  return <File className="h-5 w-5 text-gray-500" />;
}

export function GoogleDriveFileBrowser({
  isOpen,
  onClose,
  projectId,
  importType,
  onImportSuccess,
}: GoogleDriveFileBrowserProps) {
  const t = useTranslations('integrations.fileBrowser');
  const tGD = useTranslations('integrations.googleDrive');
  const tErrors = useTranslations('integrations.errors');

  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [folderStack, setFolderStack] = useState<{ id: string; name: string }[]>([]);
  const [selectedFile, setSelectedFile] = useState<GoogleDriveFile | null>(null);
  const [isImporting, setIsImporting] = useState(false);

  // 현재 폴더 ID
  const currentFolderId = folderStack.length > 0
    ? folderStack[folderStack.length - 1].id
    : undefined;

  // 파일 목록 조회
  useEffect(() => {
    if (isOpen) {
      fetchFiles();
    }
  }, [isOpen, currentFolderId]);

  const fetchFiles = async () => {
    setIsLoading(true);
    setSelectedFile(null);
    try {
      const url = new URL('/api/integrations/google-drive/files', window.location.origin);
      if (currentFolderId) {
        url.searchParams.set('folder_id', currentFolderId);
      }

      const response = await fetch(url.toString());
      if (response.ok) {
        const data = await response.json();
        setFiles(data.data.files || []);
      } else if (response.status === 401) {
        toast.error(tErrors('tokenExpired'));
        onClose();
      } else {
        toast.error(t('loading') + ' 실패');
      }
    } catch (error) {
      console.error('[FileBrowser] Fetch error:', error);
      toast.error(t('loading') + ' 실패');
    } finally {
      setIsLoading(false);
    }
  };

  // 폴더 진입
  const handleFolderClick = (folder: GoogleDriveFile) => {
    setFolderStack([...folderStack, { id: folder.id, name: folder.name }]);
  };

  // 상위 폴더로 이동
  const handleBack = () => {
    setFolderStack(folderStack.slice(0, -1));
  };

  // 파일 선택
  const handleFileSelect = (file: GoogleDriveFile) => {
    if (file.isFolder) {
      handleFolderClick(file);
    } else {
      setSelectedFile(selectedFile?.id === file.id ? null : file);
    }
  };

  // 파일 가져오기
  const handleImport = async () => {
    if (!selectedFile) return;

    setIsImporting(true);
    try {
      const response = await fetch('/api/integrations/google-drive/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_id: selectedFile.id,
          project_id: projectId,
          type: importType,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(tGD('importSuccess'));
        onImportSuccess?.(data.data);
        onClose();
      } else {
        const error = await response.json();
        toast.error(error.error || tErrors('importFailed'));
      }
    } catch (error) {
      console.error('[FileBrowser] Import error:', error);
      toast.error(tErrors('importFailed'));
    } finally {
      setIsImporting(false);
    }
  };

  // 파일 필터링 (importType에 따라)
  const filteredFiles = files.filter((file) => {
    if (file.isFolder) return true;
    if (importType === 'video') {
      return file.mimeType.startsWith('video/');
    }
    return (
      file.mimeType === 'application/pdf' ||
      file.mimeType.includes('document') ||
      file.mimeType.includes('word') ||
      file.mimeType.includes('sheet') ||
      file.mimeType.includes('excel') ||
      file.mimeType.startsWith('image/')
    );
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5 text-blue-600" />
            {t('title')}
            <Badge variant="outline" className="ml-2">
              {importType === 'video' ? t('video') : t('document')}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* 경로 표시 */}
        {folderStack.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              {t('back')}
            </Button>
            <span className="text-sm text-gray-500">/</span>
            {folderStack.map((folder, index) => (
              <span key={folder.id} className="text-sm">
                {folder.name}
                {index < folderStack.length - 1 && (
                  <span className="text-gray-400 mx-1">/</span>
                )}
              </span>
            ))}
          </div>
        )}

        {/* 파일 목록 */}
        <div className="flex-1 overflow-y-auto min-h-0 border rounded-lg">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-500">{t('loading')}</span>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Folder className="h-12 w-12 mb-2 opacity-30" />
              <p className="text-sm">{t('empty')}</p>
            </div>
          ) : (
            <div className="divide-y">
              {filteredFiles.map((file) => (
                <button
                  key={file.id}
                  onClick={() => handleFileSelect(file)}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left',
                    selectedFile?.id === file.id && 'bg-primary-50 hover:bg-primary-50'
                  )}
                >
                  <div className="shrink-0">
                    {selectedFile?.id === file.id ? (
                      <div className="w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center">
                        <Check className="h-3 w-3 text-white" />
                      </div>
                    ) : (
                      getFileIcon(file.mimeType, file.isFolder)
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {file.isFolder ? t('folder') : formatFileSize(file.size)}
                      {file.modifiedTime && !file.isFolder && (
                        <span className="ml-2">{formatDate(file.modifiedTime)}</span>
                      )}
                    </p>
                  </div>
                  {!file.isFolder && file.webViewLink && (
                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            onClick={handleImport}
            disabled={!selectedFile || selectedFile.isFolder || isImporting}
          >
            {isImporting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {tGD('importing')}
              </>
            ) : (
              t('importSelected')
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
