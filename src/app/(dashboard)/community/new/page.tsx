import { PostForm } from '@/components/community/PostForm';

export default function NewPostPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">새 질문 작성</h1>
        <p className="text-sm text-gray-500 mt-1">
          궁금한 점을 질문하면 커뮤니티에서 답변을 받을 수 있습니다
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <PostForm />
      </div>
    </div>
  );
}
