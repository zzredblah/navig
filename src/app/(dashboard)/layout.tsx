import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { createClient } from '@/lib/supabase/server';
import { MainLayout } from '@/components/layout';

export const metadata: Metadata = {
  title: 'NAVIG - 대시보드',
  description: '영상 제작 외주 협업 플랫폼',
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

// React cache로 요청 단위 중복 호출 방지
const getUser = cache(async () => {
  const supabase = await createClient();
  return supabase.auth.getUser();
});

const getProfile = cache(async (userId: string) => {
  const supabase = await createClient();
  return supabase
    .from('profiles')
    .select('name, avatar_url, sidebar_config')
    .eq('id', userId)
    .single();
});

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: { user }, error } = await getUser();

  if (error || !user) {
    redirect('/login');
  }

  // 프로필 정보 가져오기 (캐싱됨)
  const { data: profile } = await getProfile(user.id);

  const userData = {
    id: user.id,
    name: profile?.name || user.email?.split('@')[0] || '사용자',
    email: user.email || '',
    avatar_url: profile?.avatar_url,
  };

  return (
    <MainLayout user={userData} sidebarConfig={profile?.sidebar_config}>
      {children}
    </MainLayout>
  );
}
