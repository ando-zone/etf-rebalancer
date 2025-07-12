'use client';

import { SectorRebalanceRecommendation } from '@/types/portfolio';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';

interface SectorRebalanceRecommendationsProps {
  recommendations: SectorRebalanceRecommendation[];
}

export default function SectorRebalanceRecommendations({ recommendations }: SectorRebalanceRecommendationsProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'buy':
        return 'text-green-600 bg-green-50';
      case 'sell':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'buy':
        return <TrendingUp className="h-4 w-4" />;
      case 'sell':
        return <TrendingDown className="h-4 w-4" />;
      default:
        return <Minus className="h-4 w-4" />;
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'buy':
        return '매수 권장';
      case 'sell':
        return '매도 권장';
      default:
        return '유지';
    }
  };

  const buyRecommendations = recommendations.filter(r => r.action === 'buy');
  const sellRecommendations = recommendations.filter(r => r.action === 'sell');
  const holdRecommendations = recommendations.filter(r => r.action === 'hold');

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <div className="flex items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">섹터별 리밸런싱 권장사항</h2>
        <Info className="h-5 w-5 text-gray-500 ml-2" />
      </div>

      {/* 목표 포트폴리오 비중 안내 */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold text-blue-800 mb-2">목표 포트폴리오 비중</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
          <div className="text-center">
            <div className="font-medium text-blue-700">성장주 ETF</div>
            <div className="text-2xl font-bold text-blue-600">40%</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-green-700">배당주 ETF</div>
            <div className="text-2xl font-bold text-green-600">40%</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-yellow-700">채권 ETF</div>
            <div className="text-2xl font-bold text-yellow-600">10%</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-red-700">금 ETF</div>
            <div className="text-2xl font-bold text-red-600">5%</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-purple-700">비트코인</div>
            <div className="text-2xl font-bold text-purple-600">5%</div>
          </div>
        </div>
      </div>

      {/* 요약 정보 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-600 mb-1">매수 권장</p>
          <p className="text-2xl font-bold text-green-600">{buyRecommendations.length}개 섹터</p>
        </div>
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-600 mb-1">매도 권장</p>
          <p className="text-2xl font-bold text-red-600">{sellRecommendations.length}개 섹터</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 text-center">
          <p className="text-sm text-gray-600 mb-1">유지 권장</p>
          <p className="text-2xl font-bold text-gray-600">{holdRecommendations.length}개 섹터</p>
        </div>
      </div>

      {/* 권장사항 목록 */}
      <div className="space-y-4">
        {recommendations.map((recommendation, index) => (
          <div 
            key={index}
            className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <div className={`flex items-center px-3 py-1 rounded-full text-sm font-medium ${getActionColor(recommendation.action)}`}>
                  {getActionIcon(recommendation.action)}
                  <span className="ml-1">{getActionText(recommendation.action)}</span>
                </div>
                <div className="ml-4">
                  <h3 className="font-semibold text-gray-800">{recommendation.sectorName}</h3>
                  <p className="text-sm text-gray-600">목표 비중: {recommendation.targetWeight}%</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">현재 비중</p>
                <p className="font-semibold text-gray-800">{recommendation.currentWeight.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-gray-600">비중 차이</p>
                <p className={`font-semibold ${recommendation.targetWeight - recommendation.currentWeight > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {recommendation.targetWeight - recommendation.currentWeight > 0 ? '+' : ''}
                  {(recommendation.targetWeight - recommendation.currentWeight).toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-gray-600">권장 금액</p>
                <p className={`font-semibold ${recommendation.recommendedAmount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {recommendation.recommendedAmount > 0 ? '+' : '-'}{formatCurrency(recommendation.recommendedAmount)}
                </p>
              </div>
            </div>

            {/* 비중 차이 시각화 */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                <span>현재: {recommendation.currentWeight.toFixed(2)}%</span>
                <span>목표: {recommendation.targetWeight.toFixed(2)}%</span>
              </div>
              <div className="relative h-3 bg-gray-200 rounded-full">
                {/* 현재 비중 표시 */}
                <div 
                  className="absolute h-3 bg-blue-500 rounded-full opacity-70" 
                  style={{ width: `${Math.min(recommendation.currentWeight, 100)}%` }}
                />
                {/* 목표 비중 표시 */}
                <div 
                  className="absolute h-3 border-2 border-orange-500 rounded-full bg-orange-500 opacity-50" 
                  style={{ 
                    left: `${Math.min(recommendation.targetWeight, 100)}%`, 
                    width: '4px',
                    marginLeft: '-2px'
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>현재 비중</span>
                <span>목표 비중</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 설명 텍스트 */}
      <div className="mt-6 p-4 bg-yellow-50 rounded-lg">
        <p className="text-sm text-gray-700 mb-2">
          💡 <strong>섹터별 리밸런싱 안내:</strong>
        </p>
        <ul className="text-sm text-gray-600 space-y-1 ml-4">
          <li>• 각 섹터의 목표 비중에 맞춰 포트폴리오를 조정하는 것을 권장합니다.</li>
          <li>• 1% 미만의 차이는 거래 비용을 고려하여 조정하지 않는 것이 좋습니다.</li>
          <li>• 섹터 내에서 어떤 ETF를 매수/매도할지는 개별 ETF의 성과와 수수료를 고려하여 결정하세요.</li>
          <li>• 시장 상황과 개인의 투자 성향에 따라 목표 비중을 조정할 수 있습니다.</li>
        </ul>
      </div>
    </div>
  );
}