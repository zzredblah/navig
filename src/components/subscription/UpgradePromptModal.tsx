'use client';

import { Sparkles, Check, Zap, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useRouter } from 'next/navigation';

interface UpgradePromptModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  message?: string;
  feature?: string;
}

const PLAN_FEATURES = [
  { plan: 'Pro', icon: Zap, price: '₩19,900', features: ['프로젝트 10개', '스토리지 50GB', '프로젝트당 멤버 15명'] },
  { plan: 'Team', icon: Crown, price: '₩49,900', features: ['프로젝트 무제한', '스토리지 200GB', '멤버 무제한'] },
];

export function UpgradePromptModal({
  open,
  onOpenChange,
  title = '플랜 업그레이드가 필요합니다',
  message = '현재 플랜의 제한에 도달했습니다. 더 많은 기능을 사용하려면 플랜을 업그레이드하세요.',
  feature,
}: UpgradePromptModalProps) {
  const router = useRouter();

  const handleUpgrade = () => {
    onOpenChange(false);
    router.push('/pricing');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary-600" />
            </div>
            <DialogTitle className="text-lg">{title}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="mt-2">
          <p className="text-gray-600">{message}</p>

          {feature && (
            <div className="mt-3 p-2.5 rounded-lg bg-primary-50 text-sm text-primary-700 border border-primary-100">
              <span className="font-medium">필요한 기능:</span> {feature}
            </div>
          )}
        </div>

        {/* 플랜 비교 */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          {PLAN_FEATURES.map(({ plan, icon: Icon, price, features }) => (
            <div
              key={plan}
              className="p-3 rounded-lg border border-gray-200 bg-gray-50/50"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4 text-primary-600" />
                <span className="font-semibold text-gray-900">{plan}</span>
              </div>
              <p className="text-lg font-bold text-gray-900 mb-2">
                {price}<span className="text-xs font-normal text-gray-500">/월</span>
              </p>
              <ul className="space-y-1">
                {features.map((feat) => (
                  <li key={feat} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <Check className="h-3 w-3 text-green-500 shrink-0" />
                    {feat}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-5 flex gap-3 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            나중에
          </Button>
          <Button
            className="bg-primary-600 hover:bg-primary-700"
            onClick={handleUpgrade}
          >
            요금제 보기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
