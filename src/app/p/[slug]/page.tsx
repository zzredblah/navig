import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { createAdminClient } from '@/lib/supabase/server';
import { PublicPortfolioView } from '@/components/portfolio/PublicPortfolioView';
import type { Portfolio, PortfolioWork } from '@/types/portfolio';

interface PageProps {
  params: Promise<{ slug: string }>;
}

// 메타데이터 생성 (SEO)
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const adminClient = createAdminClient();

  const { data: portfolio } = await adminClient
    .from('portfolios')
    .select(`
      *,
      profile:profiles!user_id (
        name,
        avatar_url
      )
    `)
    .eq('slug', slug)
    .eq('is_public', true)
    .single();

  if (!portfolio) {
    return {
      title: '포트폴리오를 찾을 수 없습니다',
    };
  }

  const displayName = portfolio.display_name || portfolio.profile?.name || '작업자';
  const description = portfolio.bio?.slice(0, 160) || `${displayName}의 포트폴리오`;

  return {
    title: `${displayName} - 포트폴리오 | NAVIG`,
    description,
    openGraph: {
      title: `${displayName} - 포트폴리오`,
      description,
      type: 'profile',
      images: portfolio.profile?.avatar_url ? [portfolio.profile.avatar_url] : [],
    },
    twitter: {
      card: 'summary',
      title: `${displayName} - 포트폴리오`,
      description,
    },
  };
}

export default async function PublicPortfolioPage({ params }: PageProps) {
  const { slug } = await params;
  const adminClient = createAdminClient();

  // 포트폴리오 조회
  const { data: portfolio, error: portfolioError } = await adminClient
    .from('portfolios')
    .select(`
      *,
      profile:profiles!user_id (
        name,
        avatar_url
      )
    `)
    .eq('slug', slug)
    .eq('is_public', true)
    .single();

  if (portfolioError || !portfolio) {
    notFound();
  }

  // 공개 작품 목록 조회
  const { data: works } = await adminClient
    .from('portfolio_works')
    .select('*')
    .eq('user_id', portfolio.user_id)
    .eq('is_public', true)
    .order('is_featured', { ascending: false })
    .order('order_index', { ascending: true });

  // 조회수 증가 (비동기)
  void adminClient
    .from('portfolios')
    .update({ view_count: (portfolio.view_count || 0) + 1 })
    .eq('user_id', portfolio.user_id);

  return (
    <PublicPortfolioView
      portfolio={portfolio as Portfolio & { profile: { name: string; avatar_url: string | null } }}
      works={(works || []) as PortfolioWork[]}
    />
  );
}
