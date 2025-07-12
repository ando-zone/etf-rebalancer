/**
 * 환율 정보를 가져오고 통화 변환을 처리하는 유틸리티
 */

// 기본 환율 (USD/KRW) - 실제 환율 API 호출 전까지 사용
const DEFAULT_USD_TO_KRW_RATE = 1300;

// 환율 캐시 (실제 환율 API 호출 최적화)
let cachedExchangeRate: number | null = null;
let lastFetchTime: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5분

/**
 * USD/KRW 환율 가져오기
 */
export async function getUSDToKRWRate(): Promise<number> {
  const now = Date.now();
  
  // 캐시된 환율이 있고 5분 이내라면 캐시 사용
  if (cachedExchangeRate !== null && lastFetchTime !== null && (now - lastFetchTime) < CACHE_DURATION) {
    return cachedExchangeRate;
  }
  
  try {
    // 무료 환율 API 사용 (예: exchangerate-api.com)
    // 여기서는 임시로 기본값 사용 (실제 환율 API 연동 시 수정)
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = await response.json();
    
    if (data.rates && data.rates.KRW) {
      const rate = data.rates.KRW as number;
      cachedExchangeRate = rate;
      lastFetchTime = now;
      return rate;
    }
  } catch (error) {
    console.warn('환율 정보를 가져오는데 실패했습니다. 기본값을 사용합니다:', error);
  }
  
  // API 호출 실패 시 기본값 사용
  cachedExchangeRate = DEFAULT_USD_TO_KRW_RATE;
  lastFetchTime = now;
  return DEFAULT_USD_TO_KRW_RATE;
}

/**
 * 주어진 금액을 원화로 변환
 */
export async function convertToKRW(amount: number, currency: string): Promise<number> {
  if (currency === 'KRW') {
    return amount;
  }
  
  if (currency === 'USD') {
    const rate = await getUSDToKRWRate();
    return amount * rate;
  }
  
  // 다른 통화는 기본적으로 USD로 간주 (확장 가능)
  console.warn(`지원하지 않는 통화: ${currency}. USD로 간주합니다.`);
  const rate = await getUSDToKRWRate();
  return amount * rate;
}

/**
 * 현재 환율 정보 가져오기 (표시용)
 */
export async function getCurrentExchangeRate(): Promise<{ rate: number; lastUpdated: string }> {
  const rate = await getUSDToKRWRate();
  const lastUpdated = lastFetchTime ? new Date(lastFetchTime).toLocaleTimeString('ko-KR') : '캐시됨';
  
  return {
    rate,
    lastUpdated
  };
}

/**
 * ETF 보유 정보의 가치를 원화로 계산
 */
export async function calculateETFValueInKRW(shares: number, currentPrice: number, currency: string): Promise<number> {
  const totalValue = shares * currentPrice;
  return await convertToKRW(totalValue, currency);
}

/**
 * 통화 포맷팅 (원화 기준)
 */
export function formatKRW(amount: number): string {
  return new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * 간단한 환율 표시용 포맷
 */
export function formatExchangeRate(rate: number): string {
  return `1 USD = ${rate.toLocaleString('ko-KR')} KRW`;
} 