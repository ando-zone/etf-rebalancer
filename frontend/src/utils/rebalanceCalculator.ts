import { ETFHolding, SectorType, SectorAllocation, SectorRebalanceRecommendation } from '@/types/portfolio';
import { calculateETFValueInKRW } from './currencyConverter';

// 목표 포트폴리오 비중
export const TARGET_ALLOCATION = {
  growth: 40,    // 성장주 ETF 40%
  dividend: 40,  // 배당주 ETF 40%
  bond: 10,      // 채권 ETF 10%
  gold: 5,       // 금 ETF 5%
  crypto: 5      // 비트코인 5%
};

// 섹터 한글명 매핑
export const SECTOR_NAMES = {
  growth: '성장주 ETF',
  dividend: '배당주 ETF',
  bond: '채권 ETF',
  gold: '금 ETF',
  crypto: '비트코인'
};

// 섹터 색상 매핑
export const SECTOR_COLORS = {
  growth: '#3B82F6',     // 파란색
  dividend: '#10B981',   // 초록색
  bond: '#F59E0B',       // 주황색
  gold: '#EF4444',       // 빨간색
  crypto: '#8B5CF6'      // 보라색
};

/**
 * 섹터별 자산 배분 계산 (환율 고려)
 */
export async function calculateSectorAllocation(etfs: ETFHolding[]): Promise<SectorAllocation[]> {
  // 전체 포트폴리오 가치 계산 (원화 기준)
  const etfValuesInKRW = await Promise.all(
    etfs.map(etf => calculateETFValueInKRW(etf.shares, etf.currentPrice, etf.currency || 'USD'))
  );
  const totalValue = etfValuesInKRW.reduce((sum, value) => sum + value, 0);
  
  // 섹터별 그룹화
  const sectorGroups = etfs.reduce((groups, etf) => {
    const sector = etf.sector;
    if (!groups[sector]) {
      groups[sector] = [];
    }
    groups[sector].push(etf);
    return groups;
  }, {} as Record<SectorType, ETFHolding[]>);
  
  // 모든 섹터에 대해 배분 계산
  const allocations: SectorAllocation[] = [];
  
  await Promise.all(
    Object.keys(TARGET_ALLOCATION).map(async (sector) => {
      const sectorType = sector as SectorType;
      const sectorEtfs = sectorGroups[sectorType] || [];
      
      // 섹터별 가치 계산 (원화 기준)
      const sectorValues = await Promise.all(
        sectorEtfs.map(etf => calculateETFValueInKRW(etf.shares, etf.currentPrice, etf.currency || 'USD'))
      );
      const sectorValue = sectorValues.reduce((sum, value) => sum + value, 0);
      const percentage = totalValue > 0 ? (sectorValue / totalValue) * 100 : 0;
      
      allocations.push({
        sector: sectorType,
        sectorName: SECTOR_NAMES[sectorType],
        value: sectorValue,
        percentage: percentage,
        targetPercentage: TARGET_ALLOCATION[sectorType],
        color: SECTOR_COLORS[sectorType]
      });
    })
  );
  
  return allocations;
}

/**
 * 섹터별 리밸런싱 권장사항 계산 (환율 고려)
 */
export async function calculateSectorRebalanceRecommendations(etfs: ETFHolding[]): Promise<SectorRebalanceRecommendation[]> {
  const sectorAllocations = await calculateSectorAllocation(etfs);
  
  // 전체 포트폴리오 가치 계산 (원화 기준)
  const etfValuesInKRW = await Promise.all(
    etfs.map(etf => calculateETFValueInKRW(etf.shares, etf.currentPrice, etf.currency || 'USD'))
  );
  const totalValue = etfValuesInKRW.reduce((sum, value) => sum + value, 0);
  
  const recommendations: SectorRebalanceRecommendation[] = [];
  
  sectorAllocations.forEach(allocation => {
    const currentWeight = allocation.percentage;
    const targetWeight = allocation.targetPercentage;
    const difference = targetWeight - currentWeight;
    
    // 권장 금액 계산 (총 포트폴리오 가치 기준, 원화)
    const recommendedAmount = (difference / 100) * totalValue;
    
    // 액션 결정 (1% 이상 차이날 때만 권장)
    let action: 'buy' | 'sell' | 'hold' = 'hold';
    if (Math.abs(difference) >= 1) {
      action = difference > 0 ? 'buy' : 'sell';
    }
    
    recommendations.push({
      sector: allocation.sector,
      sectorName: allocation.sectorName,
      currentWeight: currentWeight,
      targetWeight: targetWeight,
      action: action,
      recommendedAmount: recommendedAmount
    });
  });
  
  // 권장사항 정렬: 매수 권장 > 매도 권장 > 유지
  return recommendations.sort((a, b) => {
    if (a.action === 'buy' && b.action !== 'buy') return -1;
    if (a.action !== 'buy' && b.action === 'buy') return 1;
    if (a.action === 'sell' && b.action === 'hold') return -1;
    if (a.action === 'hold' && b.action === 'sell') return 1;
    return Math.abs(b.recommendedAmount) - Math.abs(a.recommendedAmount);
  });
}

/**
 * 포트폴리오 요약 정보 계산 (환율 고려)
 */
export async function calculatePortfolioSummary(etfs: ETFHolding[]) {
  // 현재 가치 계산 (원화 기준)
  const currentValuesInKRW = await Promise.all(
    etfs.map(etf => calculateETFValueInKRW(etf.shares, etf.currentPrice, etf.currency || 'USD'))
  );
  const totalValue = currentValuesInKRW.reduce((sum, value) => sum + value, 0);
  
  // 매입 비용 계산 (원화 기준)
  const purchaseValuesInKRW = await Promise.all(
    etfs.map(etf => calculateETFValueInKRW(etf.shares, etf.purchasePrice, etf.currency || 'USD'))
  );
  const totalCost = purchaseValuesInKRW.reduce((sum, value) => sum + value, 0);
  
  const totalReturn = totalValue - totalCost;
  const totalReturnPercent = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0;
  
  return {
    totalValue,
    totalReturn,
    totalReturnPercent,
    dayChange: 0, // 일일 변화는 실시간 데이터가 필요하므로 0으로 설정
    dayChangePercent: 0
  };
}