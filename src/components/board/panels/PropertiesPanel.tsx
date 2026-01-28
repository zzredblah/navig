'use client';

import { useCallback, useState } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronsUp,
  ChevronsDown,
  Lock,
  Unlock,
  Trash2,
  Copy,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  Columns3,
  Rows3,
  Type,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Layers,
  Settings2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBoardStore, useSelectedElements } from '@/stores/board-store';
import { LayersPanel } from './LayersPanel';
import type { ElementStyle, ShapeType } from '@/types/board';
import { cn } from '@/lib/utils';

const STICKY_COLORS = [
  { value: '#fef08a', label: '노랑' },
  { value: '#bbf7d0', label: '초록' },
  { value: '#bfdbfe', label: '파랑' },
  { value: '#fbcfe8', label: '분홍' },
  { value: '#fed7aa', label: '주황' },
  { value: '#e9d5ff', label: '보라' },
];

// 폰트 크기 옵션
const FONT_SIZES = [12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72];

export function PropertiesPanel() {
  const selectedElements = useSelectedElements();
  const {
    updateElement,
    updateElementContent,
    updateElementStyle,
    deleteElements,
    duplicateElements,
    bringToFront,
    sendToBack,
    bringForward,
    sendBackward,
    alignLeft,
    alignCenter,
    alignRight,
    alignTop,
    alignMiddle,
    alignBottom,
    distributeHorizontal,
    distributeVertical,
    saveHistory,
  } = useBoardStore();

  const selectedIds = selectedElements.map((e) => e.id);
  const element = selectedElements.length === 1 ? selectedElements[0] : null;

  // 공통 스타일 계산 (다중 선택 시)
  const commonStyle: Partial<ElementStyle> =
    selectedElements.length > 0
      ? selectedElements.reduce((acc, el) => {
          const style = el.style;
          return {
            opacity: acc.opacity === style.opacity ? acc.opacity : undefined,
            background_color:
              acc.background_color === style.background_color
                ? acc.background_color
                : undefined,
          };
        }, selectedElements[0].style)
      : {};

  // 위치/크기 업데이트
  const handlePositionChange = useCallback(
    (field: 'position_x' | 'position_y' | 'width' | 'height' | 'rotation', value: number) => {
      if (!element) return;
      updateElement(element.id, { [field]: value });
      saveHistory();
    },
    [element, updateElement, saveHistory]
  );

  // 스타일 업데이트
  const handleStyleChange = useCallback(
    (style: Partial<ElementStyle>) => {
      selectedIds.forEach((id) => {
        updateElementStyle(id, style);
      });
      saveHistory();
    },
    [selectedIds, updateElementStyle, saveHistory]
  );

  // 콘텐츠 업데이트 (텍스트)
  const handleContentChange = useCallback(
    (content: { text?: string }) => {
      if (!element) return;
      updateElementContent(element.id, content);
      saveHistory();
    },
    [element, updateElementContent, saveHistory]
  );

  // 잠금 토글
  const handleLockToggle = useCallback(() => {
    if (!element) return;
    updateElement(element.id, { locked: !element.locked });
    saveHistory();
  }, [element, updateElement, saveHistory]);

  // 삭제
  const handleDelete = useCallback(() => {
    deleteElements(selectedIds);
  }, [selectedIds, deleteElements]);

  // 복제
  const handleDuplicate = useCallback(() => {
    duplicateElements(selectedIds);
  }, [selectedIds, duplicateElements]);

  return (
    <div className="w-64 bg-white border-l border-gray-200 flex flex-col h-full">
      <Tabs defaultValue="properties" className="flex flex-col h-full">
        <div className="border-b border-gray-200 px-2 pt-2">
          <TabsList className="grid w-full grid-cols-2 h-9">
            <TabsTrigger value="properties" className="text-xs gap-1">
              <Settings2 className="h-3.5 w-3.5" />
              속성
            </TabsTrigger>
            <TabsTrigger value="layers" className="text-xs gap-1">
              <Layers className="h-3.5 w-3.5" />
              레이어
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="layers" className="flex-1 m-0 overflow-hidden">
          <LayersPanel />
        </TabsContent>

        <TabsContent value="properties" className="flex-1 m-0 overflow-y-auto">
          {selectedElements.length === 0 ? (
            <div className="p-4">
              <p className="text-sm text-gray-500 text-center">
                요소를 선택하면 속성을 편집할 수 있습니다
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* 헤더 */}
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">속성</h3>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDuplicate}>
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-600 hover:text-red-700"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

        {/* 선택 정보 */}
        {selectedElements.length > 1 && (
          <p className="text-xs text-gray-500">{selectedElements.length}개 요소 선택됨</p>
        )}

        <Separator />

        {/* 위치 (단일 선택 시) */}
        {element && (
          <>
            <div>
              <Label className="text-xs text-gray-500">위치</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div>
                  <Label className="text-xs">X</Label>
                  <Input
                    type="number"
                    value={Math.round(element.position_x)}
                    onChange={(e) => handlePositionChange('position_x', Number(e.target.value))}
                    className="h-8"
                  />
                </div>
                <div>
                  <Label className="text-xs">Y</Label>
                  <Input
                    type="number"
                    value={Math.round(element.position_y)}
                    onChange={(e) => handlePositionChange('position_y', Number(e.target.value))}
                    className="h-8"
                  />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs text-gray-500">크기</Label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div>
                  <Label className="text-xs">W</Label>
                  <Input
                    type="number"
                    value={Math.round(element.width)}
                    onChange={(e) => handlePositionChange('width', Number(e.target.value))}
                    className="h-8"
                    min={10}
                  />
                </div>
                <div>
                  <Label className="text-xs">H</Label>
                  <Input
                    type="number"
                    value={Math.round(element.height)}
                    onChange={(e) => handlePositionChange('height', Number(e.target.value))}
                    className="h-8"
                    min={10}
                  />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs text-gray-500">회전</Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  type="number"
                  value={Math.round(element.rotation)}
                  onChange={(e) => handlePositionChange('rotation', Number(e.target.value))}
                  className="h-8"
                />
                <span className="text-sm text-gray-500">°</span>
              </div>
            </div>

            <Separator />
          </>
        )}

        {/* 스타일 */}
        <div>
          <Label className="text-xs text-gray-500">투명도</Label>
          <div className="flex items-center gap-2 mt-1">
            <Slider
              value={[commonStyle.opacity ?? 1]}
              onValueChange={([value]) => handleStyleChange({ opacity: value })}
              min={0}
              max={1}
              step={0.1}
              className="flex-1"
            />
            <span className="text-sm text-gray-500 w-12 text-right">
              {Math.round((commonStyle.opacity ?? 1) * 100)}%
            </span>
          </div>
        </div>

        {/* 스티키 노트 색상 */}
        {element?.type === 'sticky' && (
          <div>
            <Label className="text-xs text-gray-500">색상</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {STICKY_COLORS.map((color) => (
                <button
                  key={color.value}
                  className="w-8 h-8 rounded-lg border-2 transition-all"
                  style={{
                    backgroundColor: color.value,
                    borderColor:
                      element.style.background_color === color.value ? '#3b82f6' : 'transparent',
                  }}
                  onClick={() => handleStyleChange({ background_color: color.value })}
                  title={color.label}
                />
              ))}
            </div>
          </div>
        )}

        {/* 텍스트/스티키 콘텐츠 편집 */}
        {element && (element.type === 'text' || element.type === 'sticky') && (
          <div>
            <Label className="text-xs text-gray-500">텍스트 내용</Label>
            <Textarea
              value={element.content.text || ''}
              onChange={(e) => handleContentChange({ text: e.target.value })}
              placeholder="텍스트를 입력하세요"
              className="mt-1 min-h-[80px] text-sm"
            />
          </div>
        )}

        {/* 텍스트 스타일링 (텍스트/스티키) */}
        {element && (element.type === 'text' || element.type === 'sticky') && (
          <>
            <Separator />
            <div>
              <Label className="text-xs text-gray-500">텍스트 스타일</Label>
              <div className="space-y-2 mt-1">
                {/* 폰트 크기 */}
                <div className="flex items-center gap-2">
                  <Type className="h-4 w-4 text-gray-400" />
                  <Select
                    value={String(element.style.font_size || 16)}
                    onValueChange={(v) => handleStyleChange({ font_size: Number(v) })}
                  >
                    <SelectTrigger className="h-8 flex-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_SIZES.map((size) => (
                        <SelectItem key={size} value={String(size)}>
                          {size}px
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* 텍스트 색상 */}
                <div className="flex items-center gap-2">
                  <Label className="text-xs w-16">글자색</Label>
                  <Input
                    type="color"
                    value={element.style.text_color || '#1f2937'}
                    onChange={(e) => handleStyleChange({ text_color: e.target.value })}
                    className="h-8 flex-1"
                  />
                </div>

                {/* 정렬 버튼 */}
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn("h-8 w-8", element.style.text_align === 'left' && "bg-gray-100")}
                    onClick={() => handleStyleChange({ text_align: 'left' })}
                  >
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn("h-8 w-8", element.style.text_align === 'center' && "bg-gray-100")}
                    onClick={() => handleStyleChange({ text_align: 'center' })}
                  >
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn("h-8 w-8", element.style.text_align === 'right' && "bg-gray-100")}
                    onClick={() => handleStyleChange({ text_align: 'right' })}
                  >
                    <AlignRight className="h-4 w-4" />
                  </Button>
                  <div className="w-px bg-gray-200 mx-1" />
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn("h-8 w-8", element.style.font_weight === 'bold' && "bg-gray-100")}
                    onClick={() => handleStyleChange({
                      font_weight: element.style.font_weight === 'bold' ? 'normal' : 'bold'
                    })}
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className={cn("h-8 w-8", element.style.font_style === 'italic' && "bg-gray-100")}
                    onClick={() => handleStyleChange({
                      font_style: element.style.font_style === 'italic' ? 'normal' : 'italic'
                    })}
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* 도형 색상 */}
        {element?.type === 'shape' && (
          <>
            <Separator />
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-gray-500">배경색</Label>
                <Input
                  type="color"
                  value={element.style.background_color || '#e5e7eb'}
                  onChange={(e) => handleStyleChange({ background_color: e.target.value })}
                  className="h-8 w-full mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">테두리색</Label>
                <Input
                  type="color"
                  value={element.style.border_color || '#9ca3af'}
                  onChange={(e) => handleStyleChange({ border_color: e.target.value })}
                  className="h-8 w-full mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">테두리 두께</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Slider
                    value={[element.style.border_width || 2]}
                    onValueChange={([value]) => handleStyleChange({ border_width: value })}
                    min={0}
                    max={10}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-500 w-8 text-right">
                    {element.style.border_width || 2}px
                  </span>
                </div>
              </div>
              <div>
                <Label className="text-xs text-gray-500">모서리 둥글기</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Slider
                    value={[element.style.border_radius || 0]}
                    onValueChange={([value]) => handleStyleChange({ border_radius: value })}
                    min={0}
                    max={50}
                    step={1}
                    className="flex-1"
                  />
                  <span className="text-sm text-gray-500 w-8 text-right">
                    {element.style.border_radius || 0}
                  </span>
                </div>
              </div>
            </div>
          </>
        )}

        <Separator />

        {/* 레이어 순서 */}
        <div>
          <Label className="text-xs text-gray-500">레이어</Label>
          <div className="grid grid-cols-4 gap-1 mt-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-full"
              onClick={() => bringToFront(selectedIds)}
              title="맨 앞으로"
            >
              <ChevronsUp className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-full"
              onClick={() => bringForward(selectedIds)}
              title="앞으로"
            >
              <ChevronUp className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-full"
              onClick={() => sendBackward(selectedIds)}
              title="뒤로"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-full"
              onClick={() => sendToBack(selectedIds)}
              title="맨 뒤로"
            >
              <ChevronsDown className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* 정렬 (다중 선택 시) */}
        {selectedElements.length >= 2 && (
          <>
            <Separator />
            <div>
              <Label className="text-xs text-gray-500">정렬</Label>
              <div className="grid grid-cols-4 gap-1 mt-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-full"
                  onClick={() => alignLeft(selectedIds)}
                  title="왼쪽 정렬"
                >
                  <AlignStartVertical className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-full"
                  onClick={() => alignCenter(selectedIds)}
                  title="가로 중앙 정렬"
                >
                  <AlignCenterVertical className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-full"
                  onClick={() => alignRight(selectedIds)}
                  title="오른쪽 정렬"
                >
                  <AlignEndVertical className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-full"
                  onClick={() => distributeHorizontal(selectedIds)}
                  title="가로 균등 배치"
                  disabled={selectedElements.length < 3}
                >
                  <Columns3 className="h-4 w-4" />
                </Button>
              </div>
              <div className="grid grid-cols-4 gap-1 mt-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-full"
                  onClick={() => alignTop(selectedIds)}
                  title="위쪽 정렬"
                >
                  <AlignStartHorizontal className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-full"
                  onClick={() => alignMiddle(selectedIds)}
                  title="세로 중앙 정렬"
                >
                  <AlignCenterHorizontal className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-full"
                  onClick={() => alignBottom(selectedIds)}
                  title="아래쪽 정렬"
                >
                  <AlignEndHorizontal className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-full"
                  onClick={() => distributeVertical(selectedIds)}
                  title="세로 균등 배치"
                  disabled={selectedElements.length < 3}
                >
                  <Rows3 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}

              {/* 잠금 */}
              {element && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleLockToggle}
                >
                  {element.locked ? (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      잠금 해제
                    </>
                  ) : (
                    <>
                      <Unlock className="h-4 w-4 mr-2" />
                      잠금
                    </>
                  )}
                </Button>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
