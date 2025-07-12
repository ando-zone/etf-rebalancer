'use client';

import { useState } from 'react';
import PortfolioSummary from '@/components/PortfolioSummary';
import AssetAllocationChart from '@/components/AssetAllocationChart';
import ETFInputForm from '@/components/ETFInputForm';
import SectorRebalanceRecommendations from '@/components/SectorRebalanceRecommendations';
import { ETFHolding } from '@/types/portfolio';
import { 
  calculateSectorAllocation, 
  calculateSectorRebalanceRecommendations,
  calculatePortfolioSummary 
} from '@/utils/rebalanceCalculator';
import { BarChart3, Target, AlertTriangle } from 'lucide-react';

export default function Home() {
  const [etfs, setEtfs] = useState<ETFHolding[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleETFSubmit = (submittedEtfs: ETFHolding[]) => {
    setEtfs(submittedEtfs);
    setShowResults(true);
  };

  const sectorAllocations = etfs.length > 0 ? calculateSectorAllocation(etfs) : [];
  const rebalanceRecommendations = etfs.length > 0 ? calculateSectorRebalanceRecommendations(etfs) : [];
  const portfolioSummary = etfs.length > 0 ? calculatePortfolioSummary(etfs) : null;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <BarChart3 className="h-8 w-8 text-blue-600" />
              <h1 className="ml-2 text-2xl font-bold text-gray-900">ETF 리밸런서</h1>
            </div>
            <div className="text-sm text-gray-600">
              섹터별 포트폴리오 리밸런싱 도구
            </div>
          </div>
        </div>
      </header>

      {/* 메인 콘텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 환영 메시지 */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg shadow-lg p-6 mb-8 text-white">
          <h2 className="text-3xl font-bold mb-2">섹터별 포트폴리오 리밸런싱</h2>
          <p className="text-blue-100 mb-4">
            성장주 40%, 배당주 40%, 채권 10%, 금 5%, 비트코인 5% 기준으로 리밸런싱 제안을 받아보세요.
          </p>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center">
              <Target className="h-4 w-4 mr-2" />
              <span>섹터별 목표 비중 관리</span>
            </div>
            <div className="flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              <span>실시간 포트폴리오 분석</span>
            </div>
            <div className="flex items-center">
              <AlertTriangle className="h-4 w-4 mr-2" />
              <span>리스크 분산 관리</span>
            </div>
          </div>
        </div>

        {/* ETF 입력 폼 */}
        <ETFInputForm onSubmit={handleETFSubmit} />

        {/* 결과 표시 */}
        {showResults && etfs.length > 0 && (
          <>
            {/* 포트폴리오 요약 */}
            {portfolioSummary && (
              <PortfolioSummary summary={portfolioSummary} />
            )}

            {/* 섹터별 자산 배분 차트 */}
            <AssetAllocationChart data={sectorAllocations} />

            {/* 섹터별 리밸런싱 권장사항 */}
            <SectorRebalanceRecommendations recommendations={rebalanceRecommendations} />
          </>
        )}

        {/* 추가 정보 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {/* 다음 단계 안내 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">다음 단계</h3>
            <div className="space-y-3">
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-xs font-medium text-blue-600">1</span>
                </div>
                <div>
                  <p className="font-medium text-gray-800">리밸런싱 검토</p>
                  <p className="text-sm text-gray-600">권장사항을 검토하고 투자 목표와 일치하는지 확인하세요.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-xs font-medium text-blue-600">2</span>
                </div>
                <div>
                  <p className="font-medium text-gray-800">거래 수수료 고려</p>
                  <p className="text-sm text-gray-600">매매 시 발생하는 수수료와 세금을 계산해보세요.</p>
                </div>
              </div>
              <div className="flex items-start">
                <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                  <span className="text-xs font-medium text-blue-600">3</span>
                </div>
                <div>
                  <p className="font-medium text-gray-800">단계별 실행</p>
                  <p className="text-sm text-gray-600">한 번에 모든 것을 변경하지 말고 점진적으로 조정하세요.</p>
                </div>
              </div>
            </div>
          </div>

          {/* 투자 팁 */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">💡 투자 팁</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                <strong>정기적인 리밸런싱:</strong> 3-6개월마다 포트폴리오를 점검하고 리밸런싱을 고려해보세요.
              </p>
              <p>
                <strong>감정적 판단 금지:</strong> 시장의 단기 변동에 휘둘리지 말고 장기적인 관점을 유지하세요.
              </p>
              <p>
                <strong>분산투자 원칙:</strong> 하나의 자산에 집중하지 말고 여러 자산에 분산하여 투자하세요.
              </p>
              <p>
                <strong>수수료 최소화:</strong> 거래 횟수를 줄이고 저비용 ETF를 활용하여 수수료를 절약하세요.
              </p>
            </div>
          </div>
        </div>

        {/* 면책 조항 */}
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-600 text-center">
            ⚠️ <strong>면책 조항:</strong> 본 서비스는 투자 정보 제공 목적이며, 투자 조언이 아닙니다. 
            모든 투자 결정의 최종 책임은 투자자 본인에게 있으며, 투자 시 원금 손실 위험이 있습니다. 
            투자 전 충분한 검토와 전문가 상담을 권장합니다.
          </p>
        </div>
      </main>
    </div>
  );
}
