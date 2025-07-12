'use client';

import { useState, useEffect } from 'react';
import { getCurrentExchangeRate, formatExchangeRate } from '@/utils/currencyConverter';
import { RefreshCw } from 'lucide-react';

export default function ExchangeRateInfo() {
  const [exchangeRate, setExchangeRate] = useState<{ rate: number; lastUpdated: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchExchangeRate = async () => {
    setIsLoading(true);
    try {
      const rateInfo = await getCurrentExchangeRate();
      setExchangeRate(rateInfo);
    } catch (error) {
      console.error('환율 정보 조회 실패:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExchangeRate();
  }, []);

  if (!exchangeRate) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="text-sm">
            <span className="text-blue-700 font-medium">현재 환율: </span>
            <span className="text-blue-900 font-bold">{formatExchangeRate(exchangeRate.rate)}</span>
          </div>
          <div className="ml-4 text-xs text-blue-600">
            마지막 업데이트: {exchangeRate.lastUpdated}
          </div>
        </div>
        <button
          onClick={fetchExchangeRate}
          disabled={isLoading}
          className="flex items-center px-2 py-1 text-xs text-blue-700 hover:text-blue-900 disabled:opacity-50"
        >
          <RefreshCw className={`h-3 w-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
          새로고침
        </button>
      </div>
      <div className="mt-1 text-xs text-blue-600">
        💡 달러 자산은 현재 환율로 원화 변환되어 계산됩니다.
      </div>
    </div>
  );
} 