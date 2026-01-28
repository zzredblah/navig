'use client';

import { Button } from '@/components/ui/button';
import {
  type ChangeMarkerType,
  MARKER_TYPE_COLORS,
  MARKER_TYPE_LABELS,
} from '@/types/change-marker';

interface ChangeMarkerFilterProps {
  visibleTypes: ChangeMarkerType[];
  onToggle: (type: ChangeMarkerType) => void;
}

const allTypes: ChangeMarkerType[] = ['visual', 'audio', 'text', 'effect', 'other'];

export function ChangeMarkerFilter({ visibleTypes, onToggle }: ChangeMarkerFilterProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {allTypes.map((type) => {
        const isActive = visibleTypes.includes(type);
        return (
          <Button
            key={type}
            size="sm"
            variant={isActive ? 'default' : 'outline'}
            className="h-7 px-2 text-xs"
            style={{
              backgroundColor: isActive ? MARKER_TYPE_COLORS[type] : undefined,
              borderColor: MARKER_TYPE_COLORS[type],
              color: isActive ? 'white' : MARKER_TYPE_COLORS[type],
            }}
            onClick={() => onToggle(type)}
          >
            {MARKER_TYPE_LABELS[type]}
          </Button>
        );
      })}
    </div>
  );
}
