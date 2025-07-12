'use client';

import { useState, useCallback, useEffect } from 'react';
import { ETFHolding, SectorType } from '@/types/portfolio';
import { Plus, Trash2, Loader2 } from 'lucide-react';
import { getStockInfo, isKoreanStock, isForeignStock } from '@/utils/stockApi';

interface ETFInputFormProps {
  onSubmit: (etfs: ETFHolding[]) => void;
  initialEtfs?: ETFHolding[];
}

const SECTOR_OPTIONS = [
  { value: 'growth' as SectorType, label: '성장주 ETF' },
  { value: 'dividend' as SectorType, label: '배당주 ETF' },
  { value: 'bond' as SectorType, label: '채권 ETF' },
  { value: 'gold' as SectorType, label: '금 ETF' },
  { value: 'crypto' as SectorType, label: '비트코인' }
];

export default function ETFInputForm({ onSubmit, initialEtfs }: ETFInputFormProps) {
  const [etfs, setEtfs] = useState<Partial<ETFHolding>[]>([
    { symbol: '', name: '', shares: 0, purchasePrice: 0, currentPrice: 0, sector: 'growth' }
  ]);
  const [loadingStates, setLoadingStates] = useState<boolean[]>([false]);

  // 디바운스를 위한 타이머 저장
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [debounceTimers, setDebounceTimers] = useState<(NodeJS.Timeout | null)[]>([null]);

  // 입력 중인 텍스트를 저장하는 상태
  const [inputTexts, setInputTexts] = useState<{[key: string]: string}>({});

  // 초기 ETF 데이터가 변경될 때 상태 업데이트
  useEffect(() => {
    if (initialEtfs && initialEtfs.length > 0) {
      setEtfs(initialEtfs);
      setLoadingStates(new Array(initialEtfs.length).fill(false));
      setDebounceTimers(new Array(initialEtfs.length).fill(null));
      setInputTexts({}); // 입력 텍스트 상태 초기화
    }
  }, [initialEtfs]);

  const addETF = () => {
    setEtfs(currentEtfs => [...currentEtfs, { symbol: '', name: '', shares: 0, purchasePrice: 0, currentPrice: 0, sector: 'growth' }]);
    setLoadingStates(currentStates => [...currentStates, false]);
    setDebounceTimers(currentTimers => [...currentTimers, null]);
  };

  const removeETF = (index: number) => {
    // 진행 중인 타이머가 있다면 취소
    setDebounceTimers(currentTimers => {
      if (currentTimers[index]) {
        clearTimeout(currentTimers[index]!);
      }
      return currentTimers.filter((_, i) => i !== index);
    });
    
    // 해당 ETF의 입력 텍스트 정리
    setInputTexts(prevTexts => {
      const newTexts = { ...prevTexts };
      Object.keys(newTexts).forEach(key => {
        if (key.startsWith(`${index}-`)) {
          delete newTexts[key];
        }
      });
      
      // 인덱스 재조정
      const adjustedTexts: {[key: string]: string} = {};
      Object.keys(newTexts).forEach(key => {
        const [keyIndex, field] = key.split('-');
        const keyIndexNum = parseInt(keyIndex);
        if (keyIndexNum > index) {
          adjustedTexts[`${keyIndexNum - 1}-${field}`] = newTexts[key];
        } else {
          adjustedTexts[key] = newTexts[key];
        }
      });
      
      return adjustedTexts;
    });
    
    setEtfs(currentEtfs => currentEtfs.filter((_, i) => i !== index));
    setLoadingStates(currentStates => currentStates.filter((_, i) => i !== index));
  };

  const updateETF = (index: number, field: keyof ETFHolding, value: string | number | SectorType) => {
    setEtfs(currentEtfs => {
      const updatedEtfs = [...currentEtfs];
      updatedEtfs[index] = { ...updatedEtfs[index], [field]: value };
      return updatedEtfs;
    });
  };

  // 숫자 포맷팅 함수들
  const formatNumber = (value: number | string, type: 'shares' | 'currency', currency: string = 'USD'): string => {
    if (!value && value !== 0) return '';
    const numValue = typeof value === 'string' ? parseFloat(value.replace(/,/g, '')) : value;
    if (isNaN(numValue)) return '';
    
    if (type === 'shares') {
      // 보유 수량은 소수점 4자리까지
      return numValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 4 });
    } else {
      // 한국 원화는 소수점 없이, 달러는 소수점 표시 (필요시에만)
      return currency === 'KRW' 
        ? numValue.toLocaleString('ko-KR', { maximumFractionDigits: 0 })
        : numValue.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }
  };

  const parseNumber = (value: string): number => {
    if (!value || value.trim() === '') return 0;
    const cleaned = value.replace(/[^0-9.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // 숫자 입력 핸들러
  const handleNumberInput = (index: number, field: 'shares' | 'currentPrice' | 'purchasePrice', value: string) => {
    const inputKey = `${index}-${field}`;
    
    // 입력 중인 텍스트 저장
    setInputTexts(prev => ({
      ...prev,
      [inputKey]: value
    }));
    
    // 숫자 값 업데이트
    const numValue = parseNumber(value);
    updateETF(index, field, numValue);
  };

  // 숫자 입력 필드 포커스 해제 시 텍스트 정리
  const handleNumberBlur = (index: number, field: 'shares' | 'currentPrice' | 'purchasePrice') => {
    const inputKey = `${index}-${field}`;
    
    // 입력 텍스트 정리
    setInputTexts(prev => {
      const newTexts = { ...prev };
      delete newTexts[inputKey];
      return newTexts;
    });
  };

  // 입력 필드 값 가져오기
  const getInputValue = (index: number, field: 'shares' | 'currentPrice' | 'purchasePrice', etf: Partial<ETFHolding>): string => {
    const inputKey = `${index}-${field}`;
    
    // 입력 중인 텍스트가 있으면 그것을 반환
    if (inputTexts[inputKey] !== undefined) {
      return inputTexts[inputKey];
    }
    
    // 아니면 포맷팅된 값 반환
    const value = etf[field];
    if (!value && value !== 0) return '';
    
    if (field === 'shares') {
      return formatNumber(value, 'shares');
    } else {
      return formatNumber(value, 'currency', etf.currency);
    }
  };

  // 종목 코드로 ETF명 자동 조회
  const fetchStockName = useCallback(async (originalSymbol: string, index: number) => {
    if (!originalSymbol || originalSymbol.trim().length === 0) {
      return;
    }

    // 한국 주식(6자리 숫자) 또는 외국 주식(알파벳) 형태인지 확인
    const trimmedSymbol = originalSymbol.trim();
    if (!isKoreanStock(trimmedSymbol) && !isForeignStock(trimmedSymbol)) {
      return;
    }

    // 로딩 상태 시작
    setLoadingStates(current => {
      const newStates = [...current];
      newStates[index] = true;
      return newStates;
    });

    try {
      console.log(`API 호출 시작: ${trimmedSymbol}`);
      const stockInfo = await getStockInfo(trimmedSymbol);
      
      if (stockInfo) {
        console.log(`API 응답 받음:`, stockInfo);
                  // 원본 종목 코드는 유지하고 ETF명과 현재가 업데이트
          setEtfs(currentEtfs => {
            const updatedEtfs = [...currentEtfs];
            // 원본 종목 코드가 변경되지 않았는지 확인
            if (updatedEtfs[index]?.symbol === trimmedSymbol) {
              const updateData: Partial<ETFHolding> = { 
                ...updatedEtfs[index], 
                name: stockInfo.name,
                // 종목 코드는 원본 유지 (API에서 받은 값 사용하지 않음)
                symbol: trimmedSymbol
              };
              
              // 현재가 정보가 있으면 자동으로 입력
              if (stockInfo.current_price && stockInfo.current_price > 0) {
                updateData.currentPrice = stockInfo.current_price;
                // 통화 정보도 저장
                updateData.currency = stockInfo.currency || 'USD';
                console.log(`현재가 자동 입력: ${stockInfo.current_price} ${stockInfo.currency || 'USD'}`);
              }
              
              updatedEtfs[index] = updateData;
            }
            return updatedEtfs;
          });
      }
    } catch (error) {
      console.error('종목 정보 조회 실패:', error);
    } finally {
      // 로딩 상태 종료
      setLoadingStates(current => {
        const newStates = [...current];
        newStates[index] = false;
        return newStates;
      });
    }
  }, []);

  // 종목 코드 입력 시 디바운스 적용
  const handleSymbolChange = (index: number, value: string) => {
    console.log(`종목 코드 입력: ${value}`);
    
    // 종목 코드 즉시 업데이트
    updateETF(index, 'symbol', value);

    // 이전 타이머 취소
    setDebounceTimers(currentTimers => {
      const newTimers = [...currentTimers];
      if (newTimers[index]) {
        clearTimeout(newTimers[index]!);
      }

      // 새 타이머 설정 (1초 후 API 호출)
      const newTimer = setTimeout(() => {
        console.log(`디바운스 완료, API 호출: ${value}`);
        fetchStockName(value, index);
      }, 1000);

      newTimers[index] = newTimer;
      return newTimers;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validEtfs = etfs.filter(etf => 
      etf.symbol && etf.name && etf.shares && etf.purchasePrice && etf.currentPrice
    ) as ETFHolding[];
    
    const etfsWithIds = validEtfs.map((etf, index) => ({
      ...etf,
      id: `${index + 1}`,
      purchaseDate: new Date().toISOString().split('T')[0]
    }));
    
    onSubmit(etfsWithIds);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 mb-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">ETF 보유 현황 입력</h2>
      
      <form onSubmit={handleSubmit}>
        {etfs.map((etf, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-700">ETF #{index + 1}</h3>
              {etfs.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeETF(index)}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  종목 코드 *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={etf.symbol || ''}
                    onChange={(e) => handleSymbolChange(index, e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500 text-gray-900 font-mono font-bold"
                    placeholder="예: SPY, QQQ, 069500"
                    required
                  />
                  {loadingStates[index] && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  한국: 6자리 숫자, 해외: 알파벳
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ETF명 *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={etf.name || ''}
                    onChange={(e) => updateETF(index, 'name', e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500 text-gray-900"
                    placeholder="종목 코드 입력 시 자동 완성"
                    required
                  />
                  {etf.symbol && etf.name && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      <div className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-xs font-medium">
                        {etf.symbol}
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {etf.symbol && etf.name ? `${etf.symbol} - ${etf.name}` : '종목 코드를 입력하면 자동으로 ETF명이 조회됩니다'}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  섹터 *
                </label>
                <select
                  value={etf.sector || 'growth'}
                  onChange={(e) => updateETF(index, 'sector', e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500 text-gray-900"
                  required
                >
                  {SECTOR_OPTIONS.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  보유 수량 *
                </label>
                <input
                  type="text"
                  value={getInputValue(index, 'shares', etf)}
                  onChange={(e) => handleNumberInput(index, 'shares', e.target.value)}
                  onBlur={() => handleNumberBlur(index, 'shares')}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500 text-gray-900"
                  placeholder="예: 50"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  평균 매입가 ({etf.currency === 'KRW' ? '₩' : '$'}) *
                </label>
                <input
                  type="text"
                  value={getInputValue(index, 'purchasePrice', etf)}
                  onChange={(e) => handleNumberInput(index, 'purchasePrice', e.target.value)}
                  onBlur={() => handleNumberBlur(index, 'purchasePrice')}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500 text-gray-900"
                  placeholder={etf.currency === 'KRW' ? "예: 80,000" : "예: 410.00"}
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  현재가 ({etf.currency === 'KRW' ? '₩' : '$'}) *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={getInputValue(index, 'currentPrice', etf)}
                    onChange={(e) => handleNumberInput(index, 'currentPrice', e.target.value)}
                    onBlur={() => handleNumberBlur(index, 'currentPrice')}
                    className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-gray-500 text-gray-900"
                    placeholder="종목 코드 입력 시 자동 조회"
                    required
                  />
                  {etf.currentPrice && etf.currentPrice > 0 && (
                    <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
                      <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded-md text-xs font-medium">
                        실시간
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  종목 코드를 입력하면 현재가가 자동으로 조회됩니다
                  {etf.currency && (
                    <span className="ml-2 text-blue-600 font-medium">
                      ({etf.currency === 'KRW' ? '원화' : '달러'})
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        ))}
        
        <div className="flex items-center gap-4 mt-6">
          <button
            type="button"
            onClick={addETF}
            className="flex items-center px-4 py-2 text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            ETF 추가
          </button>
          
          <button
            type="submit"
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            리밸런싱 계산
          </button>
        </div>
      </form>
    </div>
  );
}