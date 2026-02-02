import { createClient } from '@/lib/supabase/server';
import { PostDetail } from '@/components/community/PostDetail';

interface PostPageProps {
  params: Promise<{ id: string }>;
}

export default async function PostPage({ params }: PostPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <PostDetail postId={id} currentUserId={user?.id} />;
}
