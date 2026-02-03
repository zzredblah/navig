'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Loader2, Upload, X, ExternalLink, Video as VideoIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import type { PortfolioWork } from '@/types/portfolio';
import { WORK_CATEGORIES } from '@/types/portfolio';

interface WorkEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  work: PortfolioWork | null;
  onSave: (data: Partial<PortfolioWork>) => Promise<void>;
}

export function WorkEditorModal({
  open,
  onOpenChange,
  work,
  onSave,
}: WorkEditorModalProps) {
  const t = useTranslations('portfolio');

  const [formData, setFormData] = useState<Partial<PortfolioWork>>({
    title: '',
    description: '',
    category: '',
    thumbnail_url: '',
    video_url: '',
    external_url: '',
    tags: [],
    is_featured: false,
    is_public: true,
  });

  const [newTag, setNewTag] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // work가 변경되면 폼 데이터 업데이트
  useEffect(() => {
    if (work) {
      setFormData({
        title: work.title,
        description: work.description || '',
        category: work.category || '',
        thumbnail_url: work.thumbnail_url || '',
        video_url: work.video_url || '',
        external_url: work.external_url || '',
        tags: work.tags || [],
        is_featured: work.is_featured,
        is_public: work.is_public,
      });
    } else {
      setFormData({
        title: '',
        description: '',
        category: '',
        thumbnail_url: '',
        video_url: '',
        external_url: '',
        tags: [],
        is_featured: false,
        is_public: true,
      });
    }
  }, [work, open]);

  const handleSubmit = async () => {
    if (!formData.title?.trim()) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTag = () => {
    if (!newTag.trim()) return;
    if (formData.tags && formData.tags.length >= 10) return;
    if (formData.tags?.includes(newTag.trim())) return;

    setFormData((prev) => ({
      ...prev,
      tags: [...(prev.tags || []), newTag.trim()],
    }));
    setNewTag('');
  };

  const handleRemoveTag = (tag: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: (prev.tags || []).filter((t) => t !== tag),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {work ? t('editWork') : t('addWork')}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 제목 */}
          <div className="space-y-2">
            <Label htmlFor="title">{t('workTitle')} *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, title: e.target.value }))
              }
              placeholder={t('workTitlePlaceholder')}
            />
          </div>

          {/* 설명 */}
          <div className="space-y-2">
            <Label htmlFor="description">{t('workDescription')}</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, description: e.target.value }))
              }
              placeholder={t('workDescriptionPlaceholder')}
              rows={3}
            />
          </div>

          {/* 카테고리 */}
          <div className="space-y-2">
            <Label>{t('category')}</Label>
            <Select
              value={formData.category || ''}
              onValueChange={(value) =>
                setFormData((prev) => ({ ...prev, category: value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectCategory')} />
              </SelectTrigger>
              <SelectContent>
                {WORK_CATEGORIES.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 썸네일 URL */}
          <div className="space-y-2">
            <Label htmlFor="thumbnail_url">{t('thumbnailUrl')}</Label>
            <div className="flex gap-2">
              <Input
                id="thumbnail_url"
                type="url"
                value={formData.thumbnail_url || ''}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, thumbnail_url: e.target.value }))
                }
                placeholder="https://..."
              />
            </div>
            {formData.thumbnail_url && (
              <div className="relative w-full aspect-video bg-gray-100 rounded-lg overflow-hidden">
                <img
                  src={formData.thumbnail_url}
                  alt="Thumbnail preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              </div>
            )}
          </div>

          {/* 영상 URL */}
          <div className="space-y-2">
            <Label htmlFor="video_url" className="flex items-center gap-1">
              <VideoIcon className="h-4 w-4" />
              {t('videoUrl')}
            </Label>
            <Input
              id="video_url"
              type="url"
              value={formData.video_url || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, video_url: e.target.value }))
              }
              placeholder="https://..."
            />
            <p className="text-xs text-gray-500">{t('videoUrlHelp')}</p>
          </div>

          {/* 외부 링크 */}
          <div className="space-y-2">
            <Label htmlFor="external_url" className="flex items-center gap-1">
              <ExternalLink className="h-4 w-4" />
              {t('externalUrl')}
            </Label>
            <Input
              id="external_url"
              type="url"
              value={formData.external_url || ''}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, external_url: e.target.value }))
              }
              placeholder="https://youtube.com/watch?v=..."
            />
            <p className="text-xs text-gray-500">{t('externalUrlHelp')}</p>
          </div>

          {/* 태그 */}
          <div className="space-y-2">
            <Label>{t('tags')}</Label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(formData.tags || []).map((tag) => (
                <Badge key={tag} variant="secondary" className="gap-1">
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-1 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder={t('addTagPlaceholder')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={handleAddTag}>
                {t('add')}
              </Button>
            </div>
          </div>

          {/* 옵션 */}
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <Label>{t('isPublic')}</Label>
                <p className="text-sm text-gray-500">{t('isPublicDescription')}</p>
              </div>
              <Switch
                checked={formData.is_public}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_public: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label>{t('isFeatured')}</Label>
                <p className="text-sm text-gray-500">{t('isFeaturedDescription')}</p>
              </div>
              <Switch
                checked={formData.is_featured}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({ ...prev, is_featured: checked }))
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('cancel')}
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || !formData.title?.trim()}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {work ? t('save') : t('add')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
