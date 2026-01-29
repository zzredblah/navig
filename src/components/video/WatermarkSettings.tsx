'use client';

/**
 * 워터마크 설정 컴포넌트
 *
 * 프로젝트 워터마크 설정 UI + 실시간 미리보기
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Loader2, Save, Upload, X, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  DEFAULT_WATERMARK_SETTINGS,
  WATERMARK_POSITION_OPTIONS,
  WATERMARK_TYPE_OPTIONS,
  type WatermarkSettings,
  type WatermarkType,
  type WatermarkPosition,
} from '@/types/watermark';
import { formatDuration } from '@/types/video';
import { cn } from '@/lib/utils';

interface WatermarkSettingsProps {
  projectId: string;
  initialSettings?: WatermarkSettings;
  onSave?: (settings: WatermarkSettings) => void;
}

export function WatermarkSettingsForm({
  projectId,
  initialSettings,
  onSave,
}: WatermarkSettingsProps) {
  const [settings, setSettings] = useState<WatermarkSettings>(
    initialSettings || DEFAULT_WATERMARK_SETTINGS
  );
  const [isLoading, setIsLoading] = useState(!initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const logoImageRef = useRef<HTMLImageElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewTimeRef = useRef(75); // 미리보기용 시간 (1:15)

  // 초기 설정 로드
  useEffect(() => {
    if (initialSettings) return;

    const fetchSettings = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/watermark`);
        if (response.ok) {
          const { data } = await response.json();
          setSettings(data.settings);
        }
      } catch (err) {
        console.error('워터마크 설정 로드 실패:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [projectId, initialSettings]);

  // 로고 이미지 로드
  useEffect(() => {
    if (settings.logo_url) {
      const img = new window.Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        logoImageRef.current = img;
        renderPreview();
      };
      img.src = settings.logo_url;
    } else {
      logoImageRef.current = null;
    }
  }, [settings.logo_url]);

  // 미리보기 렌더링
  const renderPreview = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // 캔버스 초기화
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 배경 (영상 프레임 시뮬레이션)
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 영상 콘텐츠 시뮬레이션 (그라데이션)
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#16213e');
    gradient.addColorStop(1, '#0f3460');
    ctx.fillStyle = gradient;
    ctx.fillRect(20, 20, canvas.width - 40, canvas.height - 40);

    if (!settings.enabled) return;

    ctx.globalAlpha = settings.opacity;
    const padding = 15;

    // 로고 타입인 경우
    if (settings.type === 'logo' && logoImageRef.current) {
      const logo = logoImageRef.current;
      const maxLogoHeight = 40;
      const scale = maxLogoHeight / logo.height;
      const logoWidth = logo.width * scale;
      const logoHeight = maxLogoHeight;

      let x = 0;
      let y = 0;
      switch (settings.position) {
        case 'top-left':
          x = padding;
          y = padding;
          break;
        case 'top-right':
          x = canvas.width - logoWidth - padding;
          y = padding;
          break;
        case 'bottom-left':
          x = padding;
          y = canvas.height - logoHeight - padding;
          break;
        case 'bottom-right':
          x = canvas.width - logoWidth - padding;
          y = canvas.height - logoHeight - padding;
          break;
        case 'center':
          x = (canvas.width - logoWidth) / 2;
          y = (canvas.height - logoHeight) / 2;
          break;
      }

      ctx.drawImage(logo, x, y, logoWidth, logoHeight);
      ctx.globalAlpha = 1;
      return;
    }

    // 텍스트/타임코드/복합 타입
    let watermarkText = '';
    if (settings.type === 'text' || settings.type === 'combined') {
      watermarkText = settings.text || 'NAVIG Corp';
    }
    if (settings.type === 'timecode' || settings.type === 'combined' || settings.show_timecode) {
      const timecode = formatDuration(previewTimeRef.current);
      if (watermarkText) {
        watermarkText += `  ${timecode}`;
      } else {
        watermarkText = timecode;
      }
    }

    if (!watermarkText) {
      ctx.globalAlpha = 1;
      return;
    }

    // 폰트 설정
    const fontSize = 16;
    ctx.font = `${fontSize}px "Pretendard", sans-serif`;

    // 텍스트 크기 측정
    const metrics = ctx.measureText(watermarkText);
    const textWidth = metrics.width;
    const textHeight = fontSize;

    // 위치 계산
    let x = 0;
    let y = 0;
    switch (settings.position) {
      case 'top-left':
        x = padding;
        y = padding + textHeight;
        break;
      case 'top-right':
        x = canvas.width - textWidth - padding;
        y = padding + textHeight;
        break;
      case 'bottom-left':
        x = padding;
        y = canvas.height - padding;
        break;
      case 'bottom-right':
        x = canvas.width - textWidth - padding;
        y = canvas.height - padding;
        break;
      case 'center':
        x = (canvas.width - textWidth) / 2;
        y = canvas.height / 2;
        break;
    }

    // 텍스트 그림자
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.strokeText(watermarkText, x, y);

    // 텍스트 그리기
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText(watermarkText, x, y);

    ctx.globalAlpha = 1;
  }, [settings]);

  // 설정 변경 시 미리보기 업데이트
  useEffect(() => {
    renderPreview();
  }, [renderPreview]);

  // 설정 변경 핸들러
  const updateSettings = (partial: Partial<WatermarkSettings>) => {
    setSettings((prev) => ({ ...prev, ...partial }));
    setSuccess(false);
  };

  // 로고 업로드
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 파일 크기 검증
    if (file.size > 2 * 1024 * 1024) {
      setError('파일 크기는 2MB 이하여야 합니다');
      return;
    }

    // 파일 타입 검증
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setError('PNG, JPG, WebP, SVG 파일만 업로드할 수 있습니다');
      return;
    }

    setIsUploadingLogo(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('logo', file);

      const response = await fetch(`/api/projects/${projectId}/watermark/logo`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '로고 업로드에 실패했습니다');
      }

      const { data } = await response.json();
      updateSettings({ logo_url: data.logo_url });
    } catch (err) {
      setError(err instanceof Error ? err.message : '로고 업로드에 실패했습니다');
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // 로고 삭제
  const handleLogoDelete = async () => {
    setIsUploadingLogo(true);
    setError(null);

    try {
      const response = await fetch(`/api/projects/${projectId}/watermark/logo`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '로고 삭제에 실패했습니다');
      }

      updateSettings({ logo_url: undefined });
    } catch (err) {
      setError(err instanceof Error ? err.message : '로고 삭제에 실패했습니다');
    } finally {
      setIsUploadingLogo(false);
    }
  };

  // 저장
  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch(`/api/projects/${projectId}/watermark`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || '저장에 실패했습니다');
      }

      setSuccess(true);
      onSave?.(settings);

      // 3초 후 성공 메시지 숨김
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 활성화 토글 */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>워터마크</CardTitle>
              <CardDescription>
                검토용 영상에 워터마크를 표시하여 무단 배포를 방지합니다
              </CardDescription>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(enabled) => updateSettings({ enabled })}
            />
          </div>
        </CardHeader>
      </Card>

      {/* 설정 폼 */}
      <div
        className={cn(
          'space-y-6 transition-opacity',
          !settings.enabled && 'opacity-50 pointer-events-none'
        )}
      >
        {/* 워터마크 타입 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">워터마크 유형</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={settings.type}
              onValueChange={(value) => updateSettings({ type: value as WatermarkType })}
              className="grid grid-cols-2 gap-3"
            >
              {WATERMARK_TYPE_OPTIONS.map((option) => (
                <div key={option.value}>
                  <RadioGroupItem
                    value={option.value}
                    id={option.value}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={option.value}
                    className={cn(
                      'flex flex-col items-start p-3 rounded-lg border-2 cursor-pointer transition-colors',
                      'hover:bg-gray-50',
                      settings.type === option.value
                        ? 'border-primary-500 bg-primary-50'
                        : 'border-gray-200'
                    )}
                  >
                    <span className="font-medium text-sm">{option.label}</span>
                    <span className="text-xs text-gray-500 mt-0.5">
                      {option.description}
                    </span>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* 텍스트 입력 */}
        {(settings.type === 'text' || settings.type === 'combined') && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">워터마크 텍스트</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={settings.text || ''}
                onChange={(e) => updateSettings({ text: e.target.value })}
                placeholder="NAVIG Corp"
                maxLength={100}
              />
              <p className="text-xs text-gray-500 mt-2">
                최대 100자까지 입력할 수 있습니다
              </p>
            </CardContent>
          </Card>
        )}

        {/* 로고 업로드 */}
        {settings.type === 'logo' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">로고 이미지</CardTitle>
              <CardDescription>
                PNG, JPG, WebP, SVG 파일 (최대 2MB)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {settings.logo_url ? (
                <div className="flex items-center gap-4">
                  <div className="relative w-32 h-16 bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center">
                    <Image
                      src={settings.logo_url}
                      alt="워터마크 로고"
                      fill
                      className="object-contain p-2"
                      unoptimized
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleLogoDelete}
                    disabled={isUploadingLogo}
                  >
                    {isUploadingLogo ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <X className="h-4 w-4 mr-1" />
                        삭제
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div
                  className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center cursor-pointer hover:border-primary-300 hover:bg-gray-50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploadingLogo ? (
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400 mx-auto" />
                  ) : (
                    <>
                      <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600 mb-1">
                        클릭하여 로고 업로드
                      </p>
                      <p className="text-xs text-gray-400">
                        PNG, JPG, WebP, SVG (최대 2MB)
                      </p>
                    </>
                  )}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                className="hidden"
                onChange={handleLogoUpload}
              />
            </CardContent>
          </Card>
        )}

        {/* 위치 & 투명도 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">위치 및 스타일</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid sm:grid-cols-2 gap-4">
              {/* 위치 */}
              <div className="space-y-2">
                <Label>위치</Label>
                <Select
                  value={settings.position}
                  onValueChange={(value) =>
                    updateSettings({ position: value as WatermarkPosition })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WATERMARK_POSITION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 투명도 */}
              <div className="space-y-2">
                <Label>투명도: {Math.round(settings.opacity * 100)}%</Label>
                <Slider
                  value={[settings.opacity]}
                  min={0.1}
                  max={1}
                  step={0.1}
                  onValueChange={([value]) => updateSettings({ opacity: value })}
                />
              </div>
            </div>

            {/* 타임코드 표시 옵션 */}
            {settings.type !== 'timecode' && settings.type !== 'logo' && (
              <div className="flex items-center justify-between pt-2">
                <div>
                  <Label>타임코드 함께 표시</Label>
                  <p className="text-xs text-gray-500">
                    현재 재생 시간을 워터마크에 포함합니다
                  </p>
                </div>
                <Switch
                  checked={settings.show_timecode}
                  onCheckedChange={(show_timecode) =>
                    updateSettings({ show_timecode })
                  }
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* 미리보기 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">미리보기</CardTitle>
            <CardDescription>실제 영상에 표시될 워터마크 모습입니다</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative rounded-lg overflow-hidden bg-gray-900">
              <canvas
                ref={canvasRef}
                width={400}
                height={225}
                className="w-full"
                style={{ aspectRatio: '16/9' }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 에러/성공 메시지 */}
      {error && (
        <div className="p-3 rounded-md bg-error-50 border border-error-200 text-error-700 text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="p-3 rounded-md bg-success-50 border border-success-200 text-success-700 text-sm">
          워터마크 설정이 저장되었습니다
        </div>
      )}

      {/* 저장 버튼 */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              저장 중...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              설정 저장
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
