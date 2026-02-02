'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface AnalyticsPeriodSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function AnalyticsPeriodSelect({
  value,
  onChange,
}: AnalyticsPeriodSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-36">
        <SelectValue placeholder="기간 선택" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="7d">최근 7일</SelectItem>
        <SelectItem value="30d">최근 30일</SelectItem>
        <SelectItem value="90d">최근 90일</SelectItem>
        <SelectItem value="all">전체 기간</SelectItem>
      </SelectContent>
    </Select>
  );
}
