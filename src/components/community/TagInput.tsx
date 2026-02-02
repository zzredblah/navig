'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagInputProps {
  availableTags: Tag[];
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  maxTags?: number;
}

const TAG_COLORS: Record<string, string> = {
  blue: 'bg-blue-100 text-blue-700',
  orange: 'bg-orange-100 text-orange-700',
  green: 'bg-green-100 text-green-700',
  purple: 'bg-purple-100 text-purple-700',
  red: 'bg-red-100 text-red-700',
  primary: 'bg-primary-100 text-primary-700',
  gray: 'bg-gray-100 text-gray-700',
};

export function TagInput({
  availableTags,
  selectedTags,
  onTagsChange,
  maxTags = 5,
}: TagInputProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleAddTag = (tagId: string) => {
    if (selectedTags.length >= maxTags) return;

    const tag = availableTags.find((t) => t.id === tagId);
    if (tag && !selectedTags.find((t) => t.id === tagId)) {
      onTagsChange([...selectedTags, tag]);
    }
    setIsOpen(false);
  };

  const handleRemoveTag = (tagId: string) => {
    onTagsChange(selectedTags.filter((t) => t.id !== tagId));
  };

  const remainingTags = availableTags.filter(
    (t) => !selectedTags.find((s) => s.id === t.id)
  );

  return (
    <div className="space-y-2">
      {/* 선택된 태그 */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedTags.map((tag) => (
            <Badge
              key={tag.id}
              variant="secondary"
              className={cn(
                'text-sm pr-1',
                TAG_COLORS[tag.color] || TAG_COLORS.gray
              )}
            >
              {tag.name}
              <button
                type="button"
                onClick={() => handleRemoveTag(tag.id)}
                className="ml-1 hover:bg-black/10 rounded p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* 태그 선택 */}
      {selectedTags.length < maxTags && remainingTags.length > 0 && (
        <Select
          open={isOpen}
          onOpenChange={setIsOpen}
          onValueChange={handleAddTag}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="태그 추가..." />
          </SelectTrigger>
          <SelectContent>
            {remainingTags.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded text-xs',
                    TAG_COLORS[tag.color] || TAG_COLORS.gray
                  )}
                >
                  {tag.name}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <p className="text-xs text-gray-400">
        최대 {maxTags}개 태그 선택 가능 ({selectedTags.length}/{maxTags})
      </p>
    </div>
  );
}
