'use client';

/**
 * 키보드 단축키 도움말 모달
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Keyboard, Command, Video, Navigation } from 'lucide-react';
import { SHORTCUT_LIST } from '@/hooks/use-global-hotkeys';

interface ShortcutsHelpModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// 카테고리 정보
const categories = {
  global: {
    icon: Command,
    title: '전역',
    description: '어디서나 사용 가능',
  },
  video: {
    icon: Video,
    title: '영상 페이지',
    description: '영상 리뷰 시 사용',
  },
  navigation: {
    icon: Navigation,
    title: '네비게이션',
    description: '페이지 이동',
  },
};

export function ShortcutsHelpModal({
  open,
  onOpenChange,
}: ShortcutsHelpModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            키보드 단축키
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {(Object.keys(categories) as Array<keyof typeof categories>).map(
            (category) => {
              const { icon: Icon, title, description } = categories[category];
              const shortcuts = SHORTCUT_LIST[category];

              return (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-3">
                    <Icon className="h-4 w-4 text-primary-600" />
                    <h3 className="font-semibold text-gray-900">{title}</h3>
                    <span className="text-xs text-gray-500">
                      ({description})
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {shortcuts.map(({ key, description }) => (
                      <div
                        key={key}
                        className="flex items-center justify-between p-2 rounded-lg bg-gray-50"
                      >
                        <span className="text-sm text-gray-600">
                          {description}
                        </span>
                        <kbd className="px-2 py-1 text-xs font-mono bg-white border border-gray-200 rounded shadow-sm">
                          {key}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              );
            }
          )}
        </div>

        <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 border border-gray-200 rounded">
              Cmd/Ctrl
            </kbd>
            {' + '}
            <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 border border-gray-200 rounded">
              /
            </kbd>
            {' 또는 '}
            <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 border border-gray-200 rounded">
              ?
            </kbd>
            {' 로 이 도움말 열기'}
          </p>
          <button
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            <kbd className="px-1.5 py-0.5 text-xs bg-gray-100 border border-gray-200 rounded">
              Esc
            </kbd>
            <span>닫기</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
