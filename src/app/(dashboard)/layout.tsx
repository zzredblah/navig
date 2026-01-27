import { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { MainLayout } from '@/components/layout';

export const metadata: Metadata = {
  title: 'NAVIG - 대시보드',
  description: '영상 제작 외주 협업 플랫폼',
};

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const supabase = await createClient();

  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // 프로필 정보 가져오기
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, avatar_url, sidebar_config')
    .eq('id', user.id)
    .single();

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
