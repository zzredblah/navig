'use client';

import { useEditWorkspaceStore } from '@/stores/edit-workspace-store';
import { cn } from '@/lib/utils';
import {
  Scissors,
  Type,
  Palette,
  Gauge,
  Volume2,
  Captions,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { EditTool } from '@/types/editing';

const tools: { id: EditTool; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { id: 'trim', icon: Scissors, label: '자르기' },
  { id: 'speed', icon: Gauge, label: '속도' },
  { id: 'filter', icon: Palette, label: '필터' },
  { id: 'text', icon: Type, label: '텍스트' },
  { id: 'audio', icon: Volume2, label: '오디오' },
  { id: 'subtitle', icon: Captions, label: '자막' },
];

export function ToolPanel() {
  const { selectedTool, setSelectedTool } = useEditWorkspaceStore();

  return (
    <div className="w-16 bg-gray-800 flex flex-col items-center py-4 space-y-2">
      {tools.map((tool) => {
        const Icon = tool.icon;
        const isSelected = selectedTool === tool.id;

        return (
          <Button
            key={tool.id}
            variant="ghost"
            size="icon"
            onClick={() => setSelectedTool(tool.id)}
            className={cn(
              'w-12 h-12 flex flex-col items-center justify-center gap-1 rounded-lg transition-colors',
              isSelected
                ? 'bg-primary-600 text-white hover:bg-primary-700'
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            )}
            title={tool.label}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px]">{tool.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
