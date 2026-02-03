import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import BoardDetailClient from './BoardDetailClient';

interface BoardDetailPageProps {
  params: Promise<{ id: string; boardId: string }>;
}

export default async function BoardDetailPage({ params }: BoardDetailPageProps) {
  const resolvedParams = await params;
  const supabase = await createClient();

  // 사용자 정보 가져오기
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/login');
  }

  // 프로필 정보 가져오기
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, avatar_url')
    .eq('id', user.id)
    .single();

  const userData = {
    id: user.id,
    name: profile?.name || user.email?.split('@')[0] || '사용자',
    avatar_url: profile?.avatar_url,
  };

  return (
    <BoardDetailClient
      projectId={resolvedParams.id}
      boardId={resolvedParams.boardId}
      user={userData}
      enableCollaboration={true}
    />
  );
}
