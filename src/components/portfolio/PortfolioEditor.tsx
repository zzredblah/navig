'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import {
  Save,
  Eye,
  ExternalLink,
  Plus,
  GripVertical,
  Pencil,
  Trash2,
  Star,
  Loader2,
  Globe,
  Mail,
  Link as LinkIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import type { Portfolio, PortfolioWork, SocialLinks } from '@/types/portfolio';
import { SKILL_PRESETS } from '@/types/portfolio';
import { WorkEditorModal } from './WorkEditorModal';

interface PortfolioEditorProps {
  initialPortfolio?: Portfolio | null;
  initialWorks?: PortfolioWork[];
}

export function PortfolioEditor({ initialPortfolio, initialWorks = [] }: PortfolioEditorProps) {
  const t = useTranslations('portfolio');
  const router = useRouter();

  const [portfolio, setPortfolio] = useState<Partial<Portfolio>>({
    slug: '',
    display_name: '',
    bio: '',
    skills: [],
    website_url: '',
    contact_email: '',
    social_links: {},
    is_public: false,
    theme: 'default',
    ...initialPortfolio,
  });

  const [works, setWorks] = useState<PortfolioWork[]>(initialWorks);
  const [isSaving, setIsSaving] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [editingWork, setEditingWork] = useState<PortfolioWork | null>(null);
  const [isWorkModalOpen, setIsWorkModalOpen] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // 포트폴리오 저장
  const handleSave = useCallback(async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/portfolio/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(portfolio),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '저장 실패');
      }

      const { data } = await response.json();
      setPortfolio(data);
      toast.success(t('saved'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '저장 실패');
    } finally {
      setIsSaving(false);
    }
  }, [portfolio, t]);

  // 스킬 추가
  const handleAddSkill = useCallback(() => {
    if (!newSkill.trim()) return;
    if (portfolio.skills && portfolio.skills.length >= 20) {
      toast.error('최대 20개까지 추가할 수 있습니다');
      return;
    }
    setPortfolio((prev) => ({
      ...prev,
      skills: [...(prev.skills || []), newSkill.trim()],
    }));
    setNewSkill('');
  }, [newSkill, portfolio.skills]);

  // 스킬 삭제
  const handleRemoveSkill = useCallback((skill: string) => {
    setPortfolio((prev) => ({
      ...prev,
      skills: (prev.skills || []).filter((s) => s !== skill),
    }));
  }, []);

  // 프리셋 스킬 추가
  const handleAddPresetSkill = useCallback((skill: string) => {
    if (portfolio.skills?.includes(skill)) return;
    if (portfolio.skills && portfolio.skills.length >= 20) {
      toast.error('최대 20개까지 추가할 수 있습니다');
      return;
    }
    setPortfolio((prev) => ({
      ...prev,
      skills: [...(prev.skills || []), skill],
    }));
  }, [portfolio.skills]);

  // 작품 추가/수정
  const handleSaveWork = useCallback(async (workData: Partial<PortfolioWork>) => {
    try {
      let response;
      if (editingWork) {
        // 수정
        response = await fetch(`/api/portfolio/works/${editingWork.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workData),
        });
      } else {
        // 생성
        response = await fetch('/api/portfolio/works', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workData),
        });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '저장 실패');
      }

      const { data } = await response.json();

      if (editingWork) {
        setWorks((prev) => prev.map((w) => (w.id === data.id ? data : w)));
      } else {
        setWorks((prev) => [...prev, data]);
      }

      setIsWorkModalOpen(false);
      setEditingWork(null);
      toast.success(editingWork ? t('workUpdated') : t('workAdded'));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '저장 실패');
    }
  }, [editingWork, t]);

  // 작품 삭제
  const handleDeleteWork = useCallback(async (workId: string) => {
    if (!confirm(t('confirmDeleteWork'))) return;

    try {
      const response = await fetch(`/api/portfolio/works/${workId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('삭제 실패');
      }

      setWorks((prev) => prev.filter((w) => w.id !== workId));
      toast.success(t('workDeleted'));
    } catch {
      toast.error('삭제 실패');
    }
  }, [t]);

  // Featured 토글
  const handleToggleFeatured = useCallback(async (work: PortfolioWork) => {
    try {
      const response = await fetch(`/api/portfolio/works/${work.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_featured: !work.is_featured }),
      });

      if (!response.ok) {
        throw new Error('변경 실패');
      }

      const { data } = await response.json();
      setWorks((prev) => prev.map((w) => (w.id === data.id ? data : w)));
    } catch {
      toast.error('변경 실패');
    }
  }, []);

  // 드래그 앤 드롭 순서 변경
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newWorks = [...works];
    const [removed] = newWorks.splice(draggedIndex, 1);
    newWorks.splice(index, 0, removed);

    // order_index 재계산
    newWorks.forEach((work, i) => {
      work.order_index = i;
    });

    setWorks(newWorks);
    setDraggedIndex(index);
  };

  const handleDragEnd = async () => {
    setDraggedIndex(null);

    // 서버에 순서 저장
    try {
      await fetch('/api/portfolio/works', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          works: works.map((w) => ({ id: w.id, order_index: w.order_index })),
        }),
      });
    } catch {
      toast.error('순서 저장 실패');
    }
  };

  // 미리보기
  const handlePreview = useCallback(() => {
    if (portfolio.slug) {
      window.open(`/p/${portfolio.slug}`, '_blank');
    }
  }, [portfolio.slug]);

  const publicUrl = portfolio.slug ? `${typeof window !== 'undefined' ? window.location.origin : ''}/p/${portfolio.slug}` : '';

  return (
    <div className="space-y-8">
      {/* 공개 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            {t('publicSettings')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">{t('makePublic')}</p>
              <p className="text-sm text-gray-500">{t('makePublicDescription')}</p>
            </div>
            <Switch
              checked={portfolio.is_public || false}
              onCheckedChange={(checked) =>
                setPortfolio((prev) => ({ ...prev, is_public: checked }))
              }
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">{t('portfolioUrl')}</label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">{typeof window !== 'undefined' ? window.location.origin : ''}/p/</span>
              <Input
                value={portfolio.slug || ''}
                onChange={(e) =>
                  setPortfolio((prev) => ({
                    ...prev,
                    slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                  }))
                }
                placeholder="your-name"
                className="max-w-[200px]"
              />
              {portfolio.slug && portfolio.is_public && (
                <Button variant="outline" size="sm" onClick={handlePreview}>
                  <Eye className="h-4 w-4 mr-1" />
                  {t('preview')}
                </Button>
              )}
            </div>
          </div>

          {publicUrl && portfolio.is_public && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
              <LinkIcon className="h-4 w-4 text-gray-500" />
              <span className="text-sm text-gray-600 truncate flex-1">{publicUrl}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(publicUrl);
                  toast.success(t('linkCopied'));
                }}
              >
                {t('copyLink')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 프로필 정보 */}
      <Card>
        <CardHeader>
          <CardTitle>{t('profileInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">{t('displayName')}</label>
            <Input
              value={portfolio.display_name || ''}
              onChange={(e) =>
                setPortfolio((prev) => ({ ...prev, display_name: e.target.value }))
              }
              placeholder={t('displayNamePlaceholder')}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">{t('bio')}</label>
            <Textarea
              value={portfolio.bio || ''}
              onChange={(e) =>
                setPortfolio((prev) => ({ ...prev, bio: e.target.value }))
              }
              placeholder={t('bioPlaceholder')}
              rows={4}
              className="mt-1"
            />
          </div>

          <div>
            <label className="text-sm font-medium">{t('skills')}</label>
            <div className="flex flex-wrap gap-2 mt-2 mb-3">
              {(portfolio.skills || []).map((skill) => (
                <Badge key={skill} variant="secondary" className="gap-1">
                  {skill}
                  <button
                    onClick={() => handleRemoveSkill(skill)}
                    className="ml-1 hover:text-red-500"
                  >
                    ×
                  </button>
                </Badge>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={newSkill}
                onChange={(e) => setNewSkill(e.target.value)}
                placeholder={t('addSkillPlaceholder')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSkill();
                  }
                }}
              />
              <Button variant="outline" onClick={handleAddSkill}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-3">
              <span className="text-xs text-gray-500 mr-2">{t('suggestedSkills')}:</span>
              {SKILL_PRESETS.filter(
                (skill) => !portfolio.skills?.includes(skill)
              ).map((skill) => (
                <button
                  key={skill}
                  onClick={() => handleAddPresetSkill(skill)}
                  className="text-xs px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                >
                  + {skill}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium flex items-center gap-1">
                <Globe className="h-4 w-4" />
                {t('website')}
              </label>
              <Input
                type="url"
                value={portfolio.website_url || ''}
                onChange={(e) =>
                  setPortfolio((prev) => ({ ...prev, website_url: e.target.value || null }))
                }
                placeholder="https://your-website.com"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium flex items-center gap-1">
                <Mail className="h-4 w-4" />
                {t('contactEmail')}
              </label>
              <Input
                type="email"
                value={portfolio.contact_email || ''}
                onChange={(e) =>
                  setPortfolio((prev) => ({ ...prev, contact_email: e.target.value || null }))
                }
                placeholder="your@email.com"
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 작품 목록 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('works')}</CardTitle>
          <Button
            onClick={() => {
              setEditingWork(null);
              setIsWorkModalOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            {t('addWork')}
          </Button>
        </CardHeader>
        <CardContent>
          {works.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>{t('noWorks')}</p>
              <p className="text-sm mt-1">{t('noWorksDescription')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {works.map((work, index) => (
                <div
                  key={work.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`relative group border rounded-lg overflow-hidden bg-white transition-shadow hover:shadow-md ${
                    draggedIndex === index ? 'opacity-50' : ''
                  }`}
                >
                  {/* 썸네일 */}
                  <div className="aspect-video bg-gray-100 relative">
                    {work.thumbnail_url ? (
                      <img
                        src={work.thumbnail_url}
                        alt={work.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        No Image
                      </div>
                    )}

                    {/* Featured 뱃지 */}
                    {work.is_featured && (
                      <div className="absolute top-2 left-2">
                        <Badge className="bg-yellow-500">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          Featured
                        </Badge>
                      </div>
                    )}

                    {/* 드래그 핸들 */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab">
                      <div className="bg-white/80 backdrop-blur-sm rounded p-1">
                        <GripVertical className="h-4 w-4 text-gray-600" />
                      </div>
                    </div>
                  </div>

                  {/* 정보 */}
                  <div className="p-3">
                    <h4 className="font-medium truncate">{work.title}</h4>
                    {work.category && (
                      <p className="text-sm text-gray-500">{work.category}</p>
                    )}
                  </div>

                  {/* 액션 */}
                  <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 bg-white/80 backdrop-blur-sm"
                      onClick={() => handleToggleFeatured(work)}
                    >
                      <Star
                        className={`h-4 w-4 ${
                          work.is_featured ? 'fill-yellow-500 text-yellow-500' : ''
                        }`}
                      />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 bg-white/80 backdrop-blur-sm"
                      onClick={() => {
                        setEditingWork(work);
                        setIsWorkModalOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 bg-white/80 backdrop-blur-sm text-red-500 hover:text-red-600"
                      onClick={() => handleDeleteWork(work.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 저장 버튼 */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving} size="lg">
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {t('save')}
        </Button>
      </div>

      {/* 작품 편집 모달 */}
      <WorkEditorModal
        open={isWorkModalOpen}
        onOpenChange={setIsWorkModalOpen}
        work={editingWork}
        onSave={handleSaveWork}
      />
    </div>
  );
}
