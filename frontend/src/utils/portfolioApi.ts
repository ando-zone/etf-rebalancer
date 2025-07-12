const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface PortfolioSaveRequest {
  name: string;
  description?: string;
  etf_holdings: Array<{
    symbol: string;
    name: string;
    shares: number;
    currentPrice: number;
    purchasePrice: number;
    purchaseDate: string;
    sector: string;
    currency?: string;
  }>;
}

export interface PortfolioResponse {
  id: string;
  name: string;
  description?: string;
  user_id: string;
  created_at: string;
  updated_at: string;
  holdings: Array<{
    symbol: string;
    name: string;
    shares: number;
    current_price: number;
    purchase_price: number;
    purchase_date: string;
    sector: string;
    currency: string;
  }>;
}

export async function savePortfolio(portfolioData: PortfolioSaveRequest): Promise<{ portfolio_id: string; message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/portfolios`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(portfolioData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || '포트폴리오 저장 실패');
    }

    return await response.json();
  } catch (error) {
    console.error('포트폴리오 저장 오류:', error);
    throw error;
  }
}

export async function getPortfolios(userId: string = 'anonymous'): Promise<PortfolioResponse[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/portfolios?user_id=${userId}`);
    
    if (!response.ok) {
      throw new Error('포트폴리오 목록 조회 실패');
    }

    return await response.json();
  } catch (error) {
    console.error('포트폴리오 목록 조회 오류:', error);
    throw error;
  }
}

export async function getPortfolio(portfolioId: string): Promise<PortfolioResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/portfolios/${portfolioId}`);
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('포트폴리오를 찾을 수 없습니다');
      }
      throw new Error('포트폴리오 조회 실패');
    }

    return await response.json();
  } catch (error) {
    console.error('포트폴리오 조회 오류:', error);
    throw error;
  }
}

export async function updatePortfolio(portfolioId: string, portfolioData: PortfolioSaveRequest): Promise<{ portfolio_id: string; message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/portfolios/${portfolioId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(portfolioData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || '포트폴리오 업데이트 실패');
    }

    return await response.json();
  } catch (error) {
    console.error('포트폴리오 업데이트 오류:', error);
    throw error;
  }
}

export async function deletePortfolio(portfolioId: string): Promise<{ message: string }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/portfolios/${portfolioId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('포트폴리오를 찾을 수 없습니다');
      }
      throw new Error('포트폴리오 삭제 실패');
    }

    return await response.json();
  } catch (error) {
    console.error('포트폴리오 삭제 오류:', error);
    throw error;
  }
} 