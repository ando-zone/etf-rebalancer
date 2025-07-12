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
import { BarChart3, Target, AlertTriangle, Save, Upload, List } from 'lucide-react';
import { savePortfolio, getPortfolios, getPortfolio, type PortfolioResponse } from '@/utils/portfolioApi';

export default function Home() {
  const [etfs, setEtfs] = useState<ETFHolding[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [portfolios, setPortfolios] = useState<PortfolioResponse[]>([]);
  const [portfolioName, setPortfolioName] = useState('');
  const [portfolioDescription, setPortfolioDescription] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleETFSubmit = (submittedEtfs: ETFHolding[]) => {
    setEtfs(submittedEtfs);
    setShowResults(true);
  };

  // 포트폴리오 저장 함수
  const handleSavePortfolio = async () => {
    if (!portfolioName.trim()) {
      alert('포트폴리오 이름을 입력해주세요.');
      return;
    }

    if (etfs.length === 0) {
      alert('저장할 ETF 데이터가 없습니다.');
      return;
    }

    setIsLoading(true);
    try {
      const portfolioData = {
        name: portfolioName,
        description: portfolioDescription,
        etf_holdings: etfs.map(etf => ({
          symbol: etf.symbol,
          name: etf.name,
          shares: etf.shares,
          currentPrice: etf.currentPrice,
          purchasePrice: etf.purchasePrice,
          purchaseDate: etf.purchaseDate,
          sector: etf.sector,
          currency: etf.currency || 'USD'
        }))
      };

      const result = await savePortfolio(portfolioData);
      alert(`포트폴리오가 성공적으로 저장되었습니다! (ID: ${result.portfolio_id})`);
      setShowSaveModal(false);
      setPortfolioName('');
      setPortfolioDescription('');
    } catch (error) {
      alert(`포트폴리오 저장 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 포트폴리오 목록 불러오기
  const handleLoadPortfolios = async () => {
    setIsLoading(true);
    try {
      const portfolioList = await getPortfolios();
      setPortfolios(portfolioList);
      setShowLoadModal(true);
    } catch (error) {
      alert(`포트폴리오 목록 불러오기 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 포트폴리오 불러오기
  const handleLoadPortfolio = async (portfolioId: string) => {
    setIsLoading(true);
    try {
      const portfolio = await getPortfolio(portfolioId);
      const loadedEtfs: ETFHolding[] = portfolio.holdings.map((holding, index) => ({
        id: `${index + 1}`,
        symbol: holding.symbol,
        name: holding.name,
        shares: holding.shares,
        currentPrice: holding.current_price,
        purchasePrice: holding.purchase_price,
        purchaseDate: holding.purchase_date,
        sector: holding.sector as ETFHolding['sector'],
        currency: holding.currency
      }));
      
      setEtfs(loadedEtfs);
      setShowResults(true);
      setShowLoadModal(false);
      alert(`포트폴리오 "${portfolio.name}"를 불러왔습니다.`);
    } catch (error) {
      alert(`포트폴리오 불러오기 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    } finally {
      setIsLoading(false);
    }
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

        {/* 포트폴리오 저장/불러오기 버튼 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-wrap gap-4 justify-center">
            <button
              onClick={() => setShowSaveModal(true)}
              disabled={etfs.length === 0 || isLoading}
              className="flex items-center px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Save className="h-5 w-5 mr-2" />
              포트폴리오 저장
            </button>
            
            <button
              onClick={handleLoadPortfolios}
              disabled={isLoading}
              className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Upload className="h-5 w-5 mr-2" />
              포트폴리오 불러오기
            </button>
          </div>
        </div>

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

        {/* 포트폴리오 저장 모달 */}
        {showSaveModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4">포트폴리오 저장</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    포트폴리오 이름 *
                  </label>
                  <input
                    type="text"
                    value={portfolioName}
                    onChange={(e) => setPortfolioName(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="예: 나의 ETF 포트폴리오"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    설명 (선택사항)
                  </label>
                  <textarea
                    value={portfolioDescription}
                    onChange={(e) => setPortfolioDescription(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    rows={3}
                    placeholder="포트폴리오에 대한 설명을 입력하세요"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowSaveModal(false)}
                  disabled={isLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:cursor-not-allowed"
                >
                  취소
                </button>
                <button
                  onClick={handleSavePortfolio}
                  disabled={isLoading || !portfolioName.trim()}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isLoading ? '저장 중...' : '저장'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 포트폴리오 불러오기 모달 */}
        {showLoadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl mx-4 max-h-96 overflow-y-auto">
              <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <List className="h-5 w-5 mr-2" />
                저장된 포트폴리오
              </h3>
              
              {portfolios.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  저장된 포트폴리오가 없습니다.
                </div>
              ) : (
                <div className="space-y-3">
                  {portfolios.map((portfolio) => (
                    <div
                      key={portfolio.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                      onClick={() => handleLoadPortfolio(portfolio.id)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-semibold text-gray-800">{portfolio.name}</h4>
                          {portfolio.description && (
                            <p className="text-sm text-gray-600 mt-1">{portfolio.description}</p>
                          )}
                          <p className="text-xs text-gray-500 mt-2">
                            생성일: {new Date(portfolio.created_at).toLocaleDateString('ko-KR')}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm text-blue-600 font-medium">
                            {portfolio.holdings?.length || 0}개 ETF
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowLoadModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
