#!/bin/bash

# 가상환경이 있는지 확인
if [ ! -d "venv" ]; then
    echo "가상환경을 생성합니다..."
    python3 -m venv venv
fi

# 가상환경 활성화
source venv/bin/activate

# 의존성 설치
echo "의존성을 설치합니다..."
pip install -r requirements.txt

# FastAPI 서버 실행
echo "FastAPI 서버를 시작합니다..."
uvicorn main:app --reload --host 0.0.0.0 --port 8000 