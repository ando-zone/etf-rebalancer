'use client';

import { PortfolioSummary } from '@/types/portfolio';
import { TrendingUp, TrendingDown, DollarSign, Percent } from 'lucide-react';

interface PortfolioSummaryProps {
  summary: PortfolioSummary;
}

export default function PortfolioSummaryComponent({ summary }: PortfolioSummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    return `${percent > 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">포트폴리오 요약</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 총 평가금액 */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">총 평가금액</p>
              <p className="text-2xl font-bold text-blue-600">
                {formatCurrency(summary.totalValue)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        {/* 총 수익/손실 */}
        <div className={`rounded-lg p-4 ${summary.totalReturn >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">총 수익/손실</p>
              <p className={`text-2xl font-bold ${summary.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.totalReturn)}
              </p>
            </div>
            {summary.totalReturn >= 0 ? (
              <TrendingUp className="h-8 w-8 text-green-500" />
            ) : (
              <TrendingDown className="h-8 w-8 text-red-500" />
            )}
          </div>
        </div>

        {/* 수익률 */}
        <div className={`rounded-lg p-4 ${summary.totalReturnPercent >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">수익률</p>
              <p className={`text-2xl font-bold ${summary.totalReturnPercent >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercent(summary.totalReturnPercent)}
              </p>
            </div>
            <Percent className={`h-8 w-8 ${summary.totalReturnPercent >= 0 ? 'text-green-500' : 'text-red-500'}`} />
          </div>
        </div>

        {/* 일일 변동 */}
        <div className={`rounded-lg p-4 ${summary.dayChange >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">일일 변동</p>
              <p className={`text-lg font-bold ${summary.dayChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(summary.dayChange)}
              </p>
              <p className={`text-sm ${summary.dayChangePercent >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {formatPercent(summary.dayChangePercent)}
              </p>
            </div>
            {summary.dayChange >= 0 ? (
              <TrendingUp className="h-8 w-8 text-green-500" />
            ) : (
              <TrendingDown className="h-8 w-8 text-red-500" />
            )}
          </div>
        </div>
      </div>

      {/* 설명 텍스트 */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-sm text-gray-600">
          💡 <strong>포트폴리오 요약 설명:</strong> 총 평가금액은 현재 시점에서 모든 보유 주식의 가치를 합한 금액입니다. 
          수익률은 매입가격 대비 현재 가격의 변동률을 나타냅니다.
        </p>
      </div>
    </div>
  );
} 