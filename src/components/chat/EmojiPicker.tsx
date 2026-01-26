'use client';

/**
 * 이모지 선택기 컴포넌트
 */

import { useState } from 'react';
import { Smile } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { COMMON_EMOJIS, EMOJI_CATEGORIES } from '@/types/chat';
import { cn } from '@/lib/utils';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  trigger?: React.ReactNode;
  align?: 'start' | 'center' | 'end';
}

type CategoryKey = keyof typeof EMOJI_CATEGORIES;

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  smileys: '😀 표정',
  gestures: '👍 제스처',
  hearts: '❤️ 하트',
  objects: '🎉 사물',
};

export function EmojiPicker({ onSelect, trigger, align = 'end' }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<CategoryKey | 'common'>('common');

  const handleSelect = (emoji: string) => {
    onSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <Smile className="h-5 w-5 text-gray-500" />
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align={align}>
        {/* 카테고리 탭 */}
        <div className="flex items-center gap-1 p-2 border-b border-gray-100 overflow-x-auto scrollbar-thin">
          <button
            onClick={() => setActiveCategory('common')}
            className={cn(
              'px-2 py-1 text-xs rounded transition-colors whitespace-nowrap',
              activeCategory === 'common'
                ? 'bg-primary-100 text-primary-700'
                : 'hover:bg-gray-100 text-gray-600'
            )}
          >
            ⭐ 자주 사용
          </button>
          {(Object.keys(EMOJI_CATEGORIES) as CategoryKey[]).map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={cn(
                'px-2 py-1 text-xs rounded transition-colors whitespace-nowrap',
                activeCategory === category
                  ? 'bg-primary-100 text-primary-700'
                  : 'hover:bg-gray-100 text-gray-600'
              )}
            >
              {CATEGORY_LABELS[category]}
            </button>
          ))}
        </div>

        {/* 이모지 그리드 */}
        <div className="p-2 max-h-48 overflow-y-auto scrollbar-thin">
          <div className="grid grid-cols-8 gap-1">
            {(activeCategory === 'common'
              ? COMMON_EMOJIS
              : EMOJI_CATEGORIES[activeCategory]
            ).map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSelect(emoji)}
                className="w-8 h-8 flex items-center justify-center text-lg hover:bg-gray-100 rounded transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
