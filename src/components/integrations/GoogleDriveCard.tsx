'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, FolderOpen, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

interface GoogleDriveStatus {
  configured: boolean;
  connected: boolean;
  email?: string;
  connectedAt?: string;
  error?: string;
}

interface GoogleDriveCardProps {
  onImportClick?: () => void;
}

export function GoogleDriveCard({ onImportClick }: GoogleDriveCardProps) {
  const t = useTranslations('integrations.googleDrive');
  const tErrors = useTranslations('integrations.errors');
  const [status, setStatus] = useState<GoogleDriveStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  // 연결 상태 조회
  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/integrations/google-drive/status');
      if (response.ok) {
        const data = await response.json();
        setStatus(data.data);
      }
    } catch (error) {
      console.error('[GoogleDriveCard] Status fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 연결하기
  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch('/api/integrations/google-drive/auth');
      if (response.ok) {
        const data = await response.json();
        // Google OAuth 페이지로 리다이렉트
        window.location.href = data.data.auth_url;
      } else {
        toast.error(tErrors('connectionFailed'));
      }
    } catch (error) {
      console.error('[GoogleDriveCard] Connect error:', error);
      toast.error(tErrors('connectionFailed'));
    } finally {
      setIsConnecting(false);
    }
  };

  // 연결 해제
  const handleDisconnect = async () => {
    if (!confirm('Google Drive 연결을 해제하시겠습니까?')) return;

    setIsDisconnecting(true);
    try {
      const response = await fetch('/api/integrations/google-drive', {
        method: 'DELETE',
      });
      if (response.ok) {
        setStatus({ configured: true, connected: false });
        toast.success('Google Drive 연결이 해제되었습니다');
      } else {
        toast.error(tErrors('connectionFailed'));
      }
    } catch (error) {
      console.error('[GoogleDriveCard] Disconnect error:', error);
      toast.error(tErrors('connectionFailed'));
    } finally {
      setIsDisconnecting(false);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </CardContent>
      </Card>
    );
  }

  if (!status?.configured) {
    return (
      <Card className="opacity-60">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <FolderOpen className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base">{t('title')}</CardTitle>
              <CardDescription>{t('description')}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            {tErrors('notConfigured')}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <FolderOpen className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                {t('title')}
                {status.connected ? (
                  <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {t('connected')}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-gray-500">
                    <XCircle className="h-3 w-3 mr-1" />
                    {t('notConnected')}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>{t('description')}</CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.connected ? (
          <>
            <p className="text-sm text-gray-600">
              {t('connectedAs', { email: status.email || '' })}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onImportClick}
              >
                <FolderOpen className="h-4 w-4 mr-2" />
                {t('import')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDisconnect}
                disabled={isDisconnecting}
              >
                {isDisconnecting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4 mr-2" />
                )}
                {t('disconnect')}
              </Button>
            </div>
          </>
        ) : (
          <Button
            onClick={handleConnect}
            disabled={isConnecting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isConnecting ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4 mr-2" />
            )}
            {t('connect')}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
