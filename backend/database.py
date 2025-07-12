import os
from typing import Optional
import asyncpg
from pydantic import BaseModel
from datetime import datetime, date
import json
from dotenv import load_dotenv

# .env 파일 로드
load_dotenv()

# 환경 변수에서 PostgreSQL 설정 가져오기
DB_HOST = os.getenv("DB_HOST", "localhost")
DB_PORT = os.getenv("DB_PORT", "5432")
DB_NAME = os.getenv("DB_NAME", "etf_rebalancer")
DB_USER = os.getenv("DB_USER", "postgres")
DB_PASSWORD = os.getenv("DB_PASSWORD", "")

# 데이터베이스 연결 풀
connection_pool = None

async def init_database():
    """데이터베이스 연결 풀 초기화"""
    global connection_pool
    try:
        connection_pool = await asyncpg.create_pool(
            host=DB_HOST,
            port=int(DB_PORT),
            database=DB_NAME,
            user=DB_USER,
            password=DB_PASSWORD,
            min_size=2,
            max_size=10
        )
        print("✅ PostgreSQL 연결 성공")
        
        # 테이블 생성
        await create_tables()
        
    except Exception as e:
        print(f"❌ PostgreSQL 연결 실패: {e}")
        print(f"연결 정보: {DB_USER}@{DB_HOST}:{DB_PORT}/{DB_NAME}")

async def create_tables():
    """필요한 테이블 생성"""
    if not connection_pool:
        return
    
    async with connection_pool.acquire() as conn:
        # portfolios 테이블
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS portfolios (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                name TEXT NOT NULL,
                description TEXT,
                user_id TEXT NOT NULL DEFAULT 'anonymous',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)
        
        # etf_holdings 테이블
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS etf_holdings (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                portfolio_id UUID REFERENCES portfolios(id) ON DELETE CASCADE,
                symbol TEXT NOT NULL,
                name TEXT NOT NULL,
                shares DECIMAL(15, 6) NOT NULL,
                current_price DECIMAL(15, 6) NOT NULL,
                purchase_price DECIMAL(15, 6) NOT NULL,
                purchase_date DATE NOT NULL,
                sector TEXT NOT NULL,
                currency TEXT NOT NULL DEFAULT 'USD',
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)
        
        # 인덱스 생성
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_portfolios_user_id 
            ON portfolios(user_id);
        """)
        
        await conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_etf_holdings_portfolio_id 
            ON etf_holdings(portfolio_id);
        """)
        
        print("✅ 테이블 생성 완료")

async def close_database():
    """데이터베이스 연결 풀 종료"""
    if connection_pool:
        await connection_pool.close()
        print("✅ 데이터베이스 연결 종료")

# 데이터베이스 모델 정의
class PortfolioCreate(BaseModel):
    name: str
    description: Optional[str] = None
    user_id: Optional[str] = "anonymous"

class ETFHoldingCreate(BaseModel):
    portfolio_id: str
    symbol: str
    name: str
    shares: float
    current_price: float
    purchase_price: float
    purchase_date: str
    sector: str
    currency: str = "USD"

class PortfolioResponse(BaseModel):
    id: str
    name: str
    description: Optional[str]
    user_id: str
    created_at: str
    updated_at: str
    holdings: list[dict] = []

# 포트폴리오 데이터베이스 작업
async def create_portfolio(portfolio: PortfolioCreate) -> Optional[dict]:
    """새 포트폴리오 생성"""
    if not connection_pool:
        return None
    
    try:
        async with connection_pool.acquire() as conn:
            result = await conn.fetchrow("""
                INSERT INTO portfolios (name, description, user_id, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING id, name, description, user_id, created_at, updated_at
            """, 
            portfolio.name, 
            portfolio.description, 
            portfolio.user_id,
            datetime.now(),
            datetime.now()
            )
            
            if result:
                # UUID 객체를 문자열로 변환
                result_dict = dict(result)
                result_dict['id'] = str(result_dict['id'])
                return result_dict
            return None
    except Exception as e:
        print(f"포트폴리오 생성 오류: {e}")
        return None

async def save_etf_holdings(portfolio_id: str, holdings: list[ETFHoldingCreate]) -> bool:
    """ETF 보유 정보 저장"""
    if not connection_pool:
        return False
    
    try:
        async with connection_pool.acquire() as conn:
            # 기존 보유 정보 삭제
            await conn.execute("""
                DELETE FROM etf_holdings WHERE portfolio_id = $1
            """, portfolio_id)
            
            # 새 보유 정보 삽입
            if holdings:
                values = []
                for holding in holdings:
                    # 문자열 날짜를 datetime.date 객체로 변환
                    if isinstance(holding.purchase_date, str):
                        purchase_date = datetime.strptime(holding.purchase_date, '%Y-%m-%d').date()
                    else:
                        purchase_date = holding.purchase_date
                    
                    values.append((
                        portfolio_id,
                        holding.symbol,
                        holding.name,
                        holding.shares,
                        holding.current_price,
                        holding.purchase_price,
                        purchase_date,
                        holding.sector,
                        holding.currency,
                        datetime.now()
                    ))
                
                await conn.executemany("""
                    INSERT INTO etf_holdings 
                    (portfolio_id, symbol, name, shares, current_price, purchase_price, 
                     purchase_date, sector, currency, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                """, values)
            
            return True
    except Exception as e:
        print(f"ETF 보유 정보 저장 오류: {e}")
        return False

async def get_portfolio_with_holdings(portfolio_id: str) -> Optional[PortfolioResponse]:
    """포트폴리오와 보유 정보 조회"""
    if not connection_pool:
        return None
    
    try:
        async with connection_pool.acquire() as conn:
            # 포트폴리오 조회
            portfolio_result = await conn.fetchrow("""
                SELECT id, name, description, user_id, created_at, updated_at
                FROM portfolios 
                WHERE id = $1
            """, portfolio_id)
            
            if not portfolio_result:
                return None
            
            # 보유 정보 조회
            holdings_result = await conn.fetch("""
                SELECT id, portfolio_id, symbol, name, shares, current_price, 
                       purchase_price, purchase_date, sector, currency, created_at
                FROM etf_holdings 
                WHERE portfolio_id = $1
                ORDER BY created_at
            """, portfolio_id)
            
            # UUID 객체를 문자열로 변환하고 날짜 필드도 문자열로 변환
            holdings = []
            for row in holdings_result:
                holding = dict(row)
                holding['id'] = str(holding['id'])
                holding['portfolio_id'] = str(holding['portfolio_id'])
                
                # 날짜 필드를 문자열로 변환
                if holding['purchase_date']:
                    holding['purchase_date'] = holding['purchase_date'].strftime('%Y-%m-%d')
                
                holdings.append(holding)
            
            return PortfolioResponse(
                id=str(portfolio_result['id']),
                name=portfolio_result['name'],
                description=portfolio_result['description'],
                user_id=portfolio_result['user_id'],
                created_at=portfolio_result['created_at'].isoformat(),
                updated_at=portfolio_result['updated_at'].isoformat(),
                holdings=holdings
            )
    except Exception as e:
        print(f"포트폴리오 조회 오류: {e}")
        return None

async def get_user_portfolios(user_id: str = "anonymous") -> list[dict]:
    """사용자의 모든 포트폴리오 조회"""
    if not connection_pool:
        return []
    
    try:
        async with connection_pool.acquire() as conn:
            result = await conn.fetch("""
                SELECT id, name, description, user_id, created_at, updated_at
                FROM portfolios 
                WHERE user_id = $1
                ORDER BY updated_at DESC
            """, user_id)
            
            # UUID 객체를 문자열로 변환
            portfolios = []
            for row in result:
                portfolio = dict(row)
                portfolio['id'] = str(portfolio['id'])
                portfolios.append(portfolio)
            
            return portfolios
    except Exception as e:
        print(f"사용자 포트폴리오 조회 오류: {e}")
        return []

async def update_portfolio(portfolio_id: str, portfolio: PortfolioCreate, holdings: list[ETFHoldingCreate]) -> Optional[dict]:
    """포트폴리오 업데이트"""
    if not connection_pool:
        print("❌ 데이터베이스 연결 풀이 없습니다")
        return None
    
    try:
        print(f"🔄 포트폴리오 업데이트 시작 - ID: {portfolio_id}")
        async with connection_pool.acquire() as conn:
            # 트랜잭션 시작
            async with conn.transaction():
                # 포트폴리오 정보 업데이트
                print(f"📝 포트폴리오 기본 정보 업데이트: {portfolio.name}")
                portfolio_result = await conn.fetchrow("""
                    UPDATE portfolios 
                    SET name = $1, description = $2, updated_at = $3
                    WHERE id = $4
                    RETURNING id, name, description, user_id, created_at, updated_at
                """, 
                portfolio.name, 
                portfolio.description, 
                datetime.now(),
                portfolio_id
                )
                
                if not portfolio_result:
                    print(f"❌ 포트폴리오를 찾을 수 없습니다 - ID: {portfolio_id}")
                    return None
                
                # 기존 보유 정보 삭제
                print(f"🗑️ 기존 ETF 보유 정보 삭제")
                delete_result = await conn.execute("""
                    DELETE FROM etf_holdings WHERE portfolio_id = $1
                """, portfolio_id)
                print(f"🗑️ 삭제된 행 수: {delete_result}")
                
                # 새 보유 정보 삽입
                if holdings:
                    print(f"💾 새 ETF 보유 정보 삽입 - {len(holdings)}개")
                    values = []
                    for holding in holdings:
                        # 문자열 날짜를 datetime.date 객체로 변환
                        if isinstance(holding.purchase_date, str):
                            purchase_date = datetime.strptime(holding.purchase_date, '%Y-%m-%d').date()
                        else:
                            purchase_date = holding.purchase_date
                        
                        values.append((
                            portfolio_id,
                            holding.symbol,
                            holding.name,
                            holding.shares,
                            holding.current_price,
                            holding.purchase_price,
                            purchase_date,
                            holding.sector,
                            holding.currency,
                            datetime.now()
                        ))
                    
                    await conn.executemany("""
                        INSERT INTO etf_holdings 
                        (portfolio_id, symbol, name, shares, current_price, purchase_price, 
                         purchase_date, sector, currency, created_at)
                        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                    """, values)
                    print(f"✅ ETF 보유 정보 삽입 완료")
                
                # UUID 객체를 문자열로 변환
                result_dict = dict(portfolio_result)
                result_dict['id'] = str(result_dict['id'])
                print(f"✅ 포트폴리오 업데이트 완료 - ID: {portfolio_id}")
                return result_dict
    except Exception as e:
        print(f"❌ 포트폴리오 업데이트 오류: {e}")
        import traceback
        traceback.print_exc()
        return None

async def delete_portfolio(portfolio_id: str) -> bool:
    """포트폴리오 삭제"""
    if not connection_pool:
        return False
    
    try:
        async with connection_pool.acquire() as conn:
            # CASCADE로 인해 etf_holdings도 자동 삭제됨
            result = await conn.execute("""
                DELETE FROM portfolios WHERE id = $1
            """, portfolio_id)
            
            return result == "DELETE 1"
    except Exception as e:
        print(f"포트폴리오 삭제 오류: {e}")
        return False 