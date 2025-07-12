// 포트폴리오 관련 타입 정의

export interface ETFHolding {
  id: string;
  symbol: string; // ETF 코드 (예: "SPY", "QQQ")
  name: string; // ETF명
  shares: number; // 보유 주식 수
  currentPrice: number; // 현재 주가
  purchasePrice: number; // 매입 단가
  purchaseDate: string; // 매입일
  sector: SectorType; // 사용자가 선택한 섹터
  currency?: string; // 통화 정보 (KRW, USD 등)
}

export type SectorType = 'growth' | 'dividend' | 'bond' | 'gold' | 'crypto';

export interface Portfolio {
  id: string;
  name: string;
  etfs: ETFHolding[];
  totalValue: number; // 총 평가금액
  totalCost: number; // 총 매입금액
  totalReturn: number; // 총 수익률
  lastUpdated: string;
}

export interface SectorAllocation {
  sector: SectorType;
  sectorName: string; // 섹터 한글명
  value: number; // 평가금액
  percentage: number; // 비중
  targetPercentage: number; // 목표 비중
  color: string; // 차트 색상
}

export interface SectorRebalanceRecommendation {
  sector: SectorType;
  sectorName: string;
  currentWeight: number; // 현재 비중
  targetWeight: number; // 목표 비중
  action: 'buy' | 'sell' | 'hold'; // 권장 액션
  recommendedAmount: number; // 권장 금액
}

export interface PortfolioSummary {
  totalValue: number;
  totalReturn: number;
  totalReturnPercent: number;
  dayChange: number;
  dayChangePercent: number;
} 