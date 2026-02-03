'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GoogleDriveCard, GoogleDriveFileBrowser } from '@/components/integrations';
import { Link2, Package, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

function IntegrationsContent() {
  const t = useTranslations('integrations');
  const searchParams = useSearchParams();
  const [showFileBrowser, setShowFileBrowser] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Hydration 안전하게 처리
  useEffect(() => {
    setMounted(true);
  }, []);

  // URL 쿼리 파라미터로 결과 표시
  useEffect(() => {
    if (!mounted) return;

    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'google_drive') {
      toast.success('Google Drive가 연결되었습니다');
    } else if (error) {
      const errorMessages: Record<string, string> = {
        not_configured: 'Google Drive 연동이 설정되지 않았습니다',
        access_denied: '접근이 거부되었습니다',
        no_code: '인증 코드가 없습니다',
        invalid_state: '잘못된 요청입니다',
        expired: '인증이 만료되었습니다. 다시 시도해주세요',
        db_error: '데이터베이스 오류가 발생했습니다',
        unknown: '알 수 없는 오류가 발생했습니다',
      };
      toast.error(errorMessages[error] || errorMessages.unknown);
    }
  }, [searchParams, mounted]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Link2 className="h-6 w-6 text-primary-600" />
          {t('title')}
        </h1>
        <p className="mt-1 text-sm text-gray-500">{t('description')}</p>
      </div>

      {/* 연동 카드들 */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Google Drive */}
        <GoogleDriveCard onImportClick={() => setShowFileBrowser(true)} />

        {/* Dropbox (출시 예정) */}
        <Card className="opacity-60">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  {t('dropbox.title')}
                  <Badge variant="secondary" className="text-xs">
                    {t('dropbox.comingSoon')}
                  </Badge>
                </CardTitle>
                <CardDescription>{t('dropbox.description')}</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-400">
              Dropbox 연동은 곧 출시될 예정입니다.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 파일 브라우저 모달 (임시 - 프로젝트 선택 필요) */}
      <GoogleDriveFileBrowser
        isOpen={showFileBrowser}
        onClose={() => setShowFileBrowser(false)}
        projectId=""
        importType="video"
        onImportSuccess={(file) => {
          toast.success(`${file.name} 파일을 가져왔습니다`);
        }}
      />
    </div>
  );
}

export default function IntegrationsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      }
    >
      <IntegrationsContent />
    </Suspense>
  );
}
