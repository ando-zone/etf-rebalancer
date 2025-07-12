const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface StockInfo {
  symbol: string;
  name: string;
  exchange: string;
  country: string;
  current_price?: number | null;
  currency?: string;
}

export async function getStockInfo(symbol: string): Promise<StockInfo | null> {
  try {
    if (!symbol || symbol.trim().length === 0) {
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/api/stock/${encodeURIComponent(symbol.trim())}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`종목 정보를 찾을 수 없습니다: ${symbol}`);
        return null;
      }
      throw new Error(`API 호출 실패: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('종목 정보 조회 중 오류:', error);
    return null;
  }
}

export function isKoreanStock(symbol: string): boolean {
  return /^\d{6}$/.test(symbol.trim());
}

export function isForeignStock(symbol: string): boolean {
  return /^[A-Z]+[A-Z0-9]*$/.test(symbol.trim().toUpperCase());
} 