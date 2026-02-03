'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Globe,
  Mail,
  ExternalLink,
  Play,
  Star,
  Youtube,
  Instagram,
  Twitter,
  Linkedin,
  Github,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Portfolio, PortfolioWork, SocialLinks } from '@/types/portfolio';
import { WORK_CATEGORIES } from '@/types/portfolio';

interface PublicPortfolioViewProps {
  portfolio: Portfolio & {
    profile: {
      name: string;
      avatar_url: string | null;
    };
  };
  works: PortfolioWork[];
}

const SOCIAL_ICONS: Record<keyof SocialLinks, React.ComponentType<{ className?: string }>> = {
  youtube: Youtube,
  instagram: Instagram,
  twitter: Twitter,
  linkedin: Linkedin,
  github: Github,
  behance: ExternalLink,
  vimeo: ExternalLink,
};

export function PublicPortfolioView({ portfolio, works }: PublicPortfolioViewProps) {
  const [selectedWork, setSelectedWork] = useState<PortfolioWork | null>(null);

  const displayName = portfolio.display_name || portfolio.profile?.name || '작업자';
  const initials = displayName.slice(0, 2).toUpperCase();
  const featuredWorks = works.filter((w) => w.is_featured);
  const otherWorks = works.filter((w) => !w.is_featured);

  const getCategoryLabel = (value: string | null) => {
    if (!value) return null;
    const category = WORK_CATEGORIES.find((c) => c.value === value);
    return category?.label || value;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="text-xl font-bold text-primary-600">
            NAVIG
          </Link>
        </div>
      </header>

      {/* 프로필 섹션 */}
      <section className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            {/* 아바타 */}
            <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-white shadow-lg">
              <AvatarImage
                src={portfolio.profile?.avatar_url || undefined}
                alt={displayName}
              />
              <AvatarFallback className="text-2xl sm:text-3xl bg-primary-100 text-primary-700">
                {initials}
              </AvatarFallback>
            </Avatar>

            {/* 정보 */}
            <div className="flex-1 text-center sm:text-left">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {displayName}
              </h1>

              {portfolio.bio && (
                <p className="mt-3 text-gray-600 leading-relaxed max-w-2xl">
                  {portfolio.bio}
                </p>
              )}

              {/* 스킬 */}
              {portfolio.skills && portfolio.skills.length > 0 && (
                <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-4">
                  {portfolio.skills.map((skill) => (
                    <Badge key={skill} variant="secondary">
                      {skill}
                    </Badge>
                  ))}
                </div>
              )}

              {/* 링크 */}
              <div className="flex flex-wrap justify-center sm:justify-start gap-3 mt-6">
                {portfolio.website_url && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={portfolio.website_url} target="_blank" rel="noopener noreferrer">
                      <Globe className="h-4 w-4 mr-2" />
                      웹사이트
                    </a>
                  </Button>
                )}

                {portfolio.contact_email && (
                  <Button variant="outline" size="sm" asChild>
                    <a href={`mailto:${portfolio.contact_email}`}>
                      <Mail className="h-4 w-4 mr-2" />
                      연락하기
                    </a>
                  </Button>
                )}

                {/* 소셜 링크 */}
                {portfolio.social_links &&
                  Object.entries(portfolio.social_links).map(([key, url]) => {
                    if (!url) return null;
                    const Icon = SOCIAL_ICONS[key as keyof SocialLinks];
                    return (
                      <Button key={key} variant="ghost" size="icon" asChild>
                        <a href={url} target="_blank" rel="noopener noreferrer">
                          <Icon className="h-5 w-5" />
                        </a>
                      </Button>
                    );
                  })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 작품 섹션 */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <h2 className="text-xl font-bold text-gray-900 mb-6">작품</h2>

        {works.length === 0 ? (
          <div className="text-center py-16 text-gray-500">
            아직 등록된 작품이 없습니다.
          </div>
        ) : (
          <div className="space-y-12">
            {/* Featured 작품 */}
            {featuredWorks.length > 0 && (
              <div className="space-y-6">
                {featuredWorks.map((work) => (
                  <div
                    key={work.id}
                    className="group cursor-pointer"
                    onClick={() => setSelectedWork(work)}
                  >
                    <div className="relative aspect-video bg-gray-100 rounded-xl overflow-hidden shadow-lg">
                      {work.thumbnail_url ? (
                        <img
                          src={work.thumbnail_url}
                          alt={work.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          No Image
                        </div>
                      )}

                      {/* 오버레이 */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                      {/* Featured 뱃지 */}
                      <div className="absolute top-4 left-4">
                        <Badge className="bg-yellow-500 hover:bg-yellow-500">
                          <Star className="h-3 w-3 mr-1 fill-current" />
                          Featured
                        </Badge>
                      </div>

                      {/* 재생 버튼 */}
                      {(work.video_url || work.external_url) && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                            <Play className="h-8 w-8 text-primary-600 ml-1" />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-4">
                      <h3 className="text-xl font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                        {work.title}
                      </h3>
                      {work.description && (
                        <p className="mt-2 text-gray-600 line-clamp-2">
                          {work.description}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        {work.category && (
                          <Badge variant="outline">{getCategoryLabel(work.category)}</Badge>
                        )}
                        {work.tags?.slice(0, 3).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 기타 작품 그리드 */}
            {otherWorks.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {otherWorks.map((work) => (
                  <div
                    key={work.id}
                    className="group cursor-pointer"
                    onClick={() => setSelectedWork(work)}
                  >
                    <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                      {work.thumbnail_url ? (
                        <img
                          src={work.thumbnail_url}
                          alt={work.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          No Image
                        </div>
                      )}

                      {/* 재생 버튼 */}
                      {(work.video_url || work.external_url) && (
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                          <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                            <Play className="h-6 w-6 text-primary-600 ml-0.5" />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-3">
                      <h3 className="font-medium text-gray-900 group-hover:text-primary-600 transition-colors truncate">
                        {work.title}
                      </h3>
                      {work.category && (
                        <p className="text-sm text-gray-500 mt-1">
                          {getCategoryLabel(work.category)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 푸터 */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} {displayName}
            </p>
            <Link href="/" className="text-sm text-primary-600 hover:underline">
              Powered by NAVIG
            </Link>
          </div>
        </div>
      </footer>

      {/* 작품 상세 모달 */}
      <WorkDetailModal
        work={selectedWork}
        onClose={() => setSelectedWork(null)}
      />
    </div>
  );
}

interface WorkDetailModalProps {
  work: PortfolioWork | null;
  onClose: () => void;
}

function WorkDetailModal({ work, onClose }: WorkDetailModalProps) {
  if (!work) return null;

  const getCategoryLabel = (value: string | null) => {
    if (!value) return null;
    const category = WORK_CATEGORIES.find((c) => c.value === value);
    return category?.label || value;
  };

  // YouTube/Vimeo URL을 embed URL로 변환
  const getEmbedUrl = (url: string): string | null => {
    // YouTube
    const ytMatch = url.match(
      /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]+)/
    );
    if (ytMatch) {
      return `https://www.youtube.com/embed/${ytMatch[1]}`;
    }

    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }

    return null;
  };

  const embedUrl = work.external_url ? getEmbedUrl(work.external_url) : null;
  const hasVideo = work.video_url || embedUrl;

  return (
    <Dialog open={!!work} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto p-0">
        <DialogTitle className="sr-only">{work.title}</DialogTitle>
        {/* 영상/썸네일 */}
        <div className="relative aspect-video bg-black">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : work.video_url ? (
            <video
              src={work.video_url}
              controls
              className="w-full h-full"
              autoPlay
            />
          ) : work.thumbnail_url ? (
            <img
              src={work.thumbnail_url}
              alt={work.title}
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">
              No Media
            </div>
          )}

          {/* 닫기 버튼 */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 정보 */}
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-900">{work.title}</h2>

          {work.description && (
            <p className="mt-3 text-gray-600 leading-relaxed whitespace-pre-wrap">
              {work.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2 mt-4">
            {work.category && (
              <Badge variant="outline">{getCategoryLabel(work.category)}</Badge>
            )}
            {work.tags?.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>

          {/* 외부 링크 */}
          {work.external_url && (
            <div className="mt-6">
              <Button variant="outline" asChild>
                <a href={work.external_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  외부에서 보기
                </a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
