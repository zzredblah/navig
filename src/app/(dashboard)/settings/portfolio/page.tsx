'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PortfolioEditor } from '@/components/portfolio/PortfolioEditor';
import type { Portfolio, PortfolioWork } from '@/types/portfolio';

export default function PortfolioSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [works, setWorks] = useState<PortfolioWork[]>([]);

  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        // 포트폴리오 조회
        const portfolioRes = await fetch('/api/portfolio/me');
        if (portfolioRes.ok) {
          const { data } = await portfolioRes.json();
          setPortfolio(data);
        }

        // 작품 목록 조회
        const worksRes = await fetch('/api/portfolio/works');
        if (worksRes.ok) {
          const { data } = await worksRes.json();
          setWorks(data || []);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchPortfolio();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/settings">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">포트폴리오</h1>
          <p className="text-sm text-gray-500 mt-0.5">나만의 포트폴리오 페이지를 만들어 보세요</p>
        </div>
      </div>

      <PortfolioEditor initialPortfolio={portfolio} initialWorks={works} />
    </div>
  );
}
