from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import re
from typing import Optional, Union, List
import yfinance as yf
import pandas as pd
import logging

# 데이터베이스 모듈 import
from database import (
    init_database, 
    close_database,
    create_portfolio, 
    save_etf_holdings, 
    get_portfolio_with_holdings, 
    get_user_portfolios,
    delete_portfolio,
    PortfolioCreate,
    ETFHoldingCreate,
    PortfolioResponse
)

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ETF 리밸런서 API", version="1.0.0")

# 앱 시작 시 데이터베이스 초기화
@app.on_event("startup")
async def startup_event():
    await init_database()

# 앱 종료 시 데이터베이스 연결 종료
@app.on_event("shutdown")
async def shutdown_event():
    await close_database()

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js 개발 서버
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class StockInfo(BaseModel):
    symbol: str
    name: str
    exchange: str
    country: str
    current_price: Optional[float] = None
    currency: str = "USD"

class PortfolioSaveRequest(BaseModel):
    name: str
    description: Optional[str] = None
    etf_holdings: List[dict]

@app.get("/")
async def root():
    return {"message": "ETF 리밸런서 API"}

@app.get("/api/stock/{symbol}", response_model=StockInfo)
async def get_stock_info(symbol: str):
    """
    종목 코드로 ETF/주식 정보를 가져옵니다.
    한국 주식: 6자리 숫자
    외국 주식: 알파벳 + 숫자 조합
    """
    symbol = symbol.upper().strip()
    
    # 한국 주식인지 외국 주식인지 판별
    is_korean = re.match(r'^\d{6}$', symbol)
    
    try:
        if is_korean:
            # 한국 주식 처리 (예시 - 실제로는 한국투자증권 API 등 사용)
            return await get_korean_stock_info(symbol)
        else:
            # 외국 주식 처리 (Alpha Vantage, Yahoo Finance 등 사용)
            return await get_foreign_stock_info(symbol)
    except Exception as e:
        raise HTTPException(status_code=404, detail=f"종목 정보를 찾을 수 없습니다: {symbol}")

async def get_korean_stock_info(symbol: str) -> StockInfo:
    """
    한국 주식 정보를 가져옵니다.
    yfinance를 사용하여 실제 데이터를 가져옵니다.
    """
    try:
        # 한국 주식 심볼 포맷 변환 (6자리 → .KS 형태)
        yf_symbol = f"{symbol}.KS"
        
        # yfinance로 정보 가져오기
        ticker = yf.Ticker(yf_symbol)
        info = ticker.info
        
        # 종목명 추출
        name = info.get('longName') or info.get('shortName')
        
        # 종목명이 없으면 기본 ETF 목록에서 검색
        if not name or name == yf_symbol:
            korean_etf_names = {
                "069500": "KODEX 200",
                "114800": "KODEX 인버스",
                "251350": "KODEX 코스닥150",
                "102110": "TIGER 200",
                "148070": "KOSEF 국고채10년",
                "233740": "KODEX 코스닥150 레버리지",
                "251340": "KODEX 코스닥150선물인버스",
                "122630": "KODEX 레버리지",
                "279530": "KODEX 3X 인버스",
                "308620": "KODEX 미국달러선물",
                "182490": "TIGER 200 IT",
                "091180": "KODEX 은행",
                "091170": "KODEX 은행 인버스",
                "229200": "KODEX 코스닥150 IT",
                "152100": "TIGER 200 건설",
                "169950": "KODEX 200 선물인버스2X"
            }
            name = korean_etf_names.get(symbol, f"종목 {symbol}")
        
        # 거래소 정보 추출
        exchange = info.get('exchange', 'KRX')
        if exchange not in ['KRX', 'KOSPI', 'KOSDAQ']:
            exchange = 'KRX'
        
        # 현재가 정보 추출
        current_price = None
        try:
            # 여러 가능한 필드에서 현재가 추출 시도
            current_price = (
                info.get('currentPrice') or 
                info.get('regularMarketPrice') or 
                info.get('previousClose') or
                info.get('open')
            )
            
            # 현재가가 없으면 최근 종가 가져오기
            if not current_price:
                hist = ticker.history(period="5d")
                if not hist.empty:
                    current_price = float(hist['Close'].iloc[-1])
            
            # 한국 주식의 경우 yfinance에서 원화로 제공되는지 확인
            if current_price and current_price < 10:  # 달러로 변환된 경우 (보통 10달러 이하)
                # 환율 적용 또는 원화 가격 재조회 시도
                logger.info(f"한국 주식 {symbol} 현재가가 {current_price}로 낮음 - 달러 변환 가능성")
                
                # 다른 방법으로 한국 주식 가격 조회 시도
                try:
                    # 원화 기준으로 다시 조회
                    korean_hist = ticker.history(period="1d")
                    if not korean_hist.empty:
                        korean_price = float(korean_hist['Close'].iloc[-1])
                        if korean_price > 1000:  # 원화 기준으로 보이는 경우
                            current_price = korean_price
                            logger.info(f"한국 주식 {symbol} 원화 기준 가격 조회 성공: {current_price}")
                except Exception as e:
                    logger.warning(f"한국 주식 원화 가격 재조회 실패 - {symbol}: {e}")
            
        except Exception as e:
            logger.warning(f"현재가 정보 가져오기 실패 - {symbol}: {e}")
        
        return StockInfo(
            symbol=symbol,
            name=name,
            exchange=exchange,
            country="KR",
            current_price=current_price,
            currency="KRW"  # 한국 주식은 원화
        )
        
    except Exception as e:
        logger.error(f"한국 주식 정보 가져오기 실패 - {symbol}: {e}")
        
        # 실패 시 기본 ETF 정보 반환
        korean_etfs = {
            "069500": "KODEX 200",
            "114800": "KODEX 인버스",
            "251350": "KODEX 코스닥150",
            "102110": "TIGER 200",
            "148070": "KOSEF 국고채10년",
            "233740": "KODEX 코스닥150 레버리지",
            "251340": "KODEX 코스닥150선물인버스",
            "122630": "KODEX 레버리지",
            "279530": "KODEX 3X 인버스",
            "308620": "KODEX 미국달러선물"
        }
        
        name = korean_etfs.get(symbol, f"종목 {symbol}")
        
        return StockInfo(
            symbol=symbol,
            name=name,
            exchange="KRX",
            country="KR",
            current_price=None,
            currency="KRW"
        )

async def get_foreign_stock_info(symbol: str) -> StockInfo:
    """
    외국 주식 정보를 가져옵니다.
    yfinance를 사용하여 실제 데이터를 가져옵니다.
    """
    try:
        # yfinance로 정보 가져오기
        ticker = yf.Ticker(symbol)
        info = ticker.info
        
        # 종목명 추출
        name = info.get('longName') or info.get('shortName')
        if not name:
            name = f"{symbol} ETF"
        
        # 거래소 정보 추출
        exchange = info.get('exchange', 'NASDAQ')
        
        # 거래소에 따른 국가 코드 설정
        country = "US"
        if exchange in ['LSE', 'LON']:
            country = "GB"
        elif exchange in ['TSE', 'TYO']:
            country = "JP"
        elif exchange in ['ETR', 'FRA']:
            country = "DE"
        elif exchange in ['EPA', 'PAR']:
            country = "FR"
        elif exchange in ['AMS']:
            country = "NL"
        elif exchange in ['SWX']:
            country = "CH"
        elif exchange in ['TSX']:
            country = "CA"
        elif exchange in ['ASX']:
            country = "AU"
        elif exchange in ['HKG']:
            country = "HK"
        elif exchange in ['SHA', 'SHE']:
            country = "CN"
        
        # 현재가 정보 추출
        current_price = None
        currency = "USD"  # 기본값은 USD
        
        try:
            # 여러 가능한 필드에서 현재가 추출 시도
            current_price = (
                info.get('currentPrice') or 
                info.get('regularMarketPrice') or 
                info.get('previousClose') or
                info.get('open')
            )
            
            # 통화 정보 추출
            currency = info.get('currency', 'USD')
            
            # 현재가가 없으면 최근 종가 가져오기
            if not current_price:
                hist = ticker.history(period="5d")
                if not hist.empty:
                    current_price = float(hist['Close'].iloc[-1])
        except Exception as e:
            logger.warning(f"현재가 정보 가져오기 실패 - {symbol}: {e}")
        
        return StockInfo(
            symbol=symbol,
            name=name,
            exchange=exchange,
            country=country,
            current_price=current_price,
            currency=currency
        )
        
    except Exception as e:
        logger.error(f"외국 주식 정보 가져오기 실패 - {symbol}: {e}")
        
        # 실패 시 유명한 ETF 정보 반환
        famous_etfs = {
            "SPY": {"name": "SPDR S&P 500 ETF Trust", "exchange": "ARCA", "country": "US"},
            "QQQ": {"name": "Invesco QQQ Trust", "exchange": "NASDAQ", "country": "US"},
            "VTI": {"name": "Vanguard Total Stock Market ETF", "exchange": "ARCA", "country": "US"},
            "VOO": {"name": "Vanguard S&P 500 ETF", "exchange": "ARCA", "country": "US"},
            "IVV": {"name": "iShares Core S&P 500 ETF", "exchange": "ARCA", "country": "US"},
            "VEA": {"name": "Vanguard FTSE Developed Markets ETF", "exchange": "ARCA", "country": "US"},
            "VWO": {"name": "Vanguard FTSE Emerging Markets ETF", "exchange": "ARCA", "country": "US"},
            "BND": {"name": "Vanguard Total Bond Market ETF", "exchange": "NASDAQ", "country": "US"},
            "AGG": {"name": "iShares Core U.S. Aggregate Bond ETF", "exchange": "ARCA", "country": "US"},
            "GLD": {"name": "SPDR Gold Shares", "exchange": "ARCA", "country": "US"},
            "SCHD": {"name": "Schwab US Dividend Equity ETF", "exchange": "ARCA", "country": "US"},
            "VYM": {"name": "Vanguard High Dividend Yield ETF", "exchange": "ARCA", "country": "US"},
            "VXUS": {"name": "Vanguard Total International Stock ETF", "exchange": "NASDAQ", "country": "US"},
            "IEFA": {"name": "iShares Core MSCI EAFE IMI Index ETF", "exchange": "ARCA", "country": "US"},
            "IEMG": {"name": "iShares Core MSCI Emerging Markets IMI Index ETF", "exchange": "ARCA", "country": "US"}
        }
        
        if symbol in famous_etfs:
            etf_info = famous_etfs[symbol]
            return StockInfo(
                symbol=symbol,
                name=etf_info["name"],
                exchange=etf_info["exchange"],
                country=etf_info["country"],
                current_price=None,
                currency="USD"
            )
        else:
            # 기본값 반환
            return StockInfo(
                symbol=symbol,
                name=f"{symbol} ETF",
                exchange="US",
                country="US",
                current_price=None,
                currency="USD"
            )

# 포트폴리오 관련 API 엔드포인트

@app.post("/api/portfolios", response_model=dict)
async def save_portfolio(request: PortfolioSaveRequest):
    """포트폴리오 저장"""
    try:
        # 포트폴리오 생성
        portfolio_data = PortfolioCreate(
            name=request.name,
            description=request.description,
            user_id="anonymous"  # 추후 사용자 인증 구현 시 변경
        )
        
        portfolio = await create_portfolio(portfolio_data)
        if not portfolio:
            raise HTTPException(status_code=500, detail="포트폴리오 생성 실패")
        
        # ETF 보유 정보 저장
        holdings = []
        for holding_data in request.etf_holdings:
            holding = ETFHoldingCreate(
                portfolio_id=portfolio["id"],
                symbol=holding_data["symbol"],
                name=holding_data["name"],
                shares=holding_data["shares"],
                current_price=holding_data["currentPrice"],
                purchase_price=holding_data["purchasePrice"],
                purchase_date=holding_data["purchaseDate"],
                sector=holding_data["sector"],
                currency=holding_data.get("currency", "USD")
            )
            holdings.append(holding)
        
        success = await save_etf_holdings(portfolio["id"], holdings)
        if not success:
            raise HTTPException(status_code=500, detail="ETF 보유 정보 저장 실패")
        
        return {
            "message": "포트폴리오가 성공적으로 저장되었습니다.",
            "portfolio_id": portfolio["id"],
            "portfolio": portfolio
        }
    
    except Exception as e:
        logger.error(f"포트폴리오 저장 오류: {e}")
        raise HTTPException(status_code=500, detail=f"포트폴리오 저장 중 오류가 발생했습니다: {str(e)}")

@app.get("/api/portfolios", response_model=List[dict])
async def get_portfolios(user_id: str = "anonymous"):
    """사용자의 모든 포트폴리오 목록 조회"""
    try:
        portfolios = await get_user_portfolios(user_id)
        return portfolios
    except Exception as e:
        logger.error(f"포트폴리오 목록 조회 오류: {e}")
        raise HTTPException(status_code=500, detail="포트폴리오 목록 조회 중 오류가 발생했습니다.")

@app.get("/api/portfolios/{portfolio_id}", response_model=PortfolioResponse)
async def get_portfolio(portfolio_id: str):
    """특정 포트폴리오 상세 조회"""
    try:
        portfolio = await get_portfolio_with_holdings(portfolio_id)
        if not portfolio:
            raise HTTPException(status_code=404, detail="포트폴리오를 찾을 수 없습니다.")
        return portfolio
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"포트폴리오 조회 오류: {e}")
        raise HTTPException(status_code=500, detail="포트폴리오 조회 중 오류가 발생했습니다.")

@app.delete("/api/portfolios/{portfolio_id}")
async def delete_portfolio_endpoint(portfolio_id: str):
    """포트폴리오 삭제"""
    try:
        success = await delete_portfolio(portfolio_id)
        if not success:
            raise HTTPException(status_code=404, detail="포트폴리오를 찾을 수 없습니다.")
        
        return {"message": "포트폴리오가 성공적으로 삭제되었습니다."}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"포트폴리오 삭제 오류: {e}")
        raise HTTPException(status_code=500, detail="포트폴리오 삭제 중 오류가 발생했습니다.")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 