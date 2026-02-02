'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { TagInput } from './TagInput';

interface Tag {
  id: string;
  name: string;
  color: string;
}

export function PostForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 태그 로드
  useEffect(() => {
    async function fetchTags() {
      try {
        const response = await fetch('/api/community/tags');
        if (response.ok) {
          const data = await response.json();
          setAvailableTags(data.data || []);
        }
      } catch (err) {
        console.error('태그 로드 실패:', err);
      }
    }
    fetchTags();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('제목을 입력해주세요');
      return;
    }

    if (!content.trim()) {
      toast.error('내용을 입력해주세요');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          content: content.trim(),
          tag_ids: selectedTags.map((t) => t.id),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || '게시글 작성에 실패했습니다');
        return;
      }

      toast.success('게시글이 작성되었습니다');
      router.push(`/community/${data.data.id}`);
    } catch (error) {
      toast.error('게시글 작성 중 오류가 발생했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 제목 */}
      <div className="space-y-2">
        <Label htmlFor="title">제목</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="질문 제목을 입력하세요"
          className="text-lg"
          disabled={isSubmitting}
        />
      </div>

      {/* 내용 */}
      <div className="space-y-2">
        <Label htmlFor="content">내용</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="질문 내용을 자세히 작성해주세요..."
          rows={12}
          disabled={isSubmitting}
        />
        <p className="text-xs text-gray-400">
          마크다운 문법을 지원합니다
        </p>
      </div>

      {/* 태그 */}
      <div className="space-y-2">
        <Label>태그</Label>
        <TagInput
          availableTags={availableTags}
          selectedTags={selectedTags}
          onTagsChange={setSelectedTags}
          maxTags={5}
        />
      </div>

      {/* 버튼 */}
      <div className="flex items-center gap-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          취소
        </Button>
        <Button
          type="submit"
          className="bg-primary-600 hover:bg-primary-700"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              작성 중...
            </>
          ) : (
            '질문 등록'
          )}
        </Button>
      </div>
    </form>
  );
}
