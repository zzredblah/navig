'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, AlertCircle, Clock, Eye, Volume2, Type, Wand2, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoVersion {
  id: string;
  version_number: number;
  change_notes?: string | null;
}

interface ChangeMarker {
  id: string;
  type: string;
  start_time: number | null;
  end_time: number | null;
  description: string | null;
  confidence: number | null;
  is_ai_generated: boolean;
}

interface VideoDiffAnalyzerProps {
  currentVersionId: string;
  versions: VideoVersion[];
  onMarkerClick?: (startTime: number) => void;
}

const CHANGE_TYPE_ICONS: Record<string, React.ReactNode> = {
  visual: <Eye className="h-3.5 w-3.5" />,
  audio: <Volume2 className="h-3.5 w-3.5" />,
  text: <Type className="h-3.5 w-3.5" />,
  effect: <Wand2 className="h-3.5 w-3.5" />,
  other: <HelpCircle className="h-3.5 w-3.5" />,
};

const CHANGE_TYPE_COLORS: Record<string, string> = {
  visual: 'bg-blue-100 text-blue-700 border-blue-200',
  audio: 'bg-purple-100 text-purple-700 border-purple-200',
  text: 'bg-green-100 text-green-700 border-green-200',
  effect: 'bg-orange-100 text-orange-700 border-orange-200',
  other: 'bg-gray-100 text-gray-700 border-gray-200',
};

function formatTimecode(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function VideoDiffAnalyzer({
  currentVersionId,
  versions,
  onMarkerClick,
}: VideoDiffAnalyzerProps) {
  const t = useTranslations('videoDiff');
  const [selectedCompareVersion, setSelectedCompareVersion] = useState<string>('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [markers, setMarkers] = useState<ChangeMarker[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState<number | null>(null);

  // Get other versions to compare
  const compareVersions = versions.filter((v) => v.id !== currentVersionId);

  // Auto-select previous version
  useEffect(() => {
    if (compareVersions.length > 0 && !selectedCompareVersion) {
      // Select the version with highest version_number that's less than current
      const currentVersion = versions.find((v) => v.id === currentVersionId);
      const previousVersions = compareVersions
        .filter((v) => currentVersion && v.version_number < currentVersion.version_number)
        .sort((a, b) => b.version_number - a.version_number);

      if (previousVersions.length > 0) {
        setSelectedCompareVersion(previousVersions[0].id);
      } else if (compareVersions.length > 0) {
        setSelectedCompareVersion(compareVersions[0].id);
      }
    }
  }, [compareVersions, selectedCompareVersion, versions, currentVersionId]);

  // Load existing markers
  useEffect(() => {
    const loadMarkers = async () => {
      if (!selectedCompareVersion) return;

      try {
        const response = await fetch(
          `/api/ai/video-diff?version_id=${currentVersionId}&compared_version_id=${selectedCompareVersion}`
        );
        if (response.ok) {
          const data = await response.json();
          if (data.data && data.data.length > 0) {
            const latestAnalysis = data.data[0];
            if (latestAnalysis.status === 'completed') {
              // Load markers for this analysis
              const markersResponse = await fetch(
                `/api/videos/change-markers?version_id=${currentVersionId}&compared_version_id=${selectedCompareVersion}&is_ai_generated=true`
              );
              if (markersResponse.ok) {
                const markersData = await markersResponse.json();
                setMarkers(markersData.data || []);
              }
            }
          }
        }
      } catch (err) {
        console.error('[VideoDiffAnalyzer] Load markers error:', err);
      }
    };

    loadMarkers();
  }, [currentVersionId, selectedCompareVersion]);

  const handleAnalyze = async () => {
    if (!selectedCompareVersion) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/video-diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version_id: currentVersionId,
          compared_version_id: selectedCompareVersion,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || t('errors.analyzeFailed'));
        return;
      }

      setMarkers(data.data?.markers || []);
      setRemaining(data.remaining);
    } catch (err) {
      console.error('[VideoDiffAnalyzer] Analyze error:', err);
      setError(t('errors.analyzeFailed'));
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (compareVersions.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary-500" />
            {t('title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            비교할 다른 버전이 없습니다. 새 버전을 업로드하면 AI 분석을 사용할 수 있습니다.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary-500" />
          {t('title')}
        </CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Version selector */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <label className="text-sm font-medium text-gray-700 shrink-0">
            비교 버전:
          </label>
          <select
            value={selectedCompareVersion}
            onChange={(e) => {
              setSelectedCompareVersion(e.target.value);
              setMarkers([]);
            }}
            className="flex-1 rounded-md border border-gray-200 bg-white text-gray-900 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
            disabled={isAnalyzing}
          >
            <option value="">버전 선택...</option>
            {compareVersions.map((v) => (
              <option key={v.id} value={v.id}>
                v{v.version_number}
                {v.change_notes ? ` - ${v.change_notes.slice(0, 30)}...` : ''}
              </option>
            ))}
          </select>
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !selectedCompareVersion}
            size="sm"
            className="shrink-0"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('analyzing')}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {t('analyze')}
              </>
            )}
          </Button>
        </div>

        {/* Error message */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 text-red-700 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Remaining usage */}
        {remaining !== null && remaining >= 0 && (
          <div className="text-xs text-gray-500">
            남은 사용량: {remaining}회
          </div>
        )}

        {/* Results */}
        {markers.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-900">
                {t('changesDetected', { count: markers.length })}
              </h4>
              <Badge variant="outline" className="text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                {t('aiGenerated')}
              </Badge>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {markers.map((marker) => (
                <button
                  key={marker.id}
                  onClick={() => marker.start_time !== null && onMarkerClick?.(marker.start_time)}
                  className={cn(
                    'w-full text-left p-3 rounded-lg border transition-colors hover:bg-gray-50',
                    CHANGE_TYPE_COLORS[marker.type] || CHANGE_TYPE_COLORS.other
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      {CHANGE_TYPE_ICONS[marker.type] || CHANGE_TYPE_ICONS.other}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="secondary" className="text-xs capitalize">
                          {t(`changeTypes.${marker.type}` as const) || marker.type}
                        </Badge>
                        {marker.start_time !== null && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTimecode(marker.start_time)}
                            {marker.end_time !== null && marker.end_time !== marker.start_time && (
                              <> - {formatTimecode(marker.end_time)}</>
                            )}
                          </span>
                        )}
                        {marker.confidence !== null && (
                          <span className="text-xs text-gray-400">
                            {t('confidence', { score: Math.round(marker.confidence * 100) })}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 line-clamp-2">
                        {marker.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : !isAnalyzing && selectedCompareVersion ? (
          <div className="text-center py-6">
            <Sparkles className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">{t('noChanges')}</p>
            <p className="text-xs text-gray-400 mt-1">{t('noChangesHint')}</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
