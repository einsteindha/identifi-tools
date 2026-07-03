# identifi-tools 프로젝트 지침

## 배포 환경
- **URL**: https://identifi-tools.vercel.app
- **GitHub**: einsteindha/identifi-tools (auto-deploy on push to main)
- **vercel.json**: `outputDirectory: "public"`, Hobby plan 최대 **12개** 서버리스 함수

## 현재 API 함수 (11개, 여유 1개 — 다음 도구 추가 전 반드시 재검토)
| 파일 | maxDuration | 역할 |
|------|-------------|------|
| api/fetch-data.js | 30s | 범용 데이터 fetch |
| api/retirement-sim.js | 30s | 은퇴 인출 시뮬레이션 |
| api/backtest-asset.js | 30s | 자산 백테스트 |
| api/goal-sim.js | 30s | 목적자금 시뮬레이션 |
| api/life-fund-sim.js | 30s | 생애자금 시뮬레이션 (실물·금융자산+부채+현금흐름, 130세까지) |
| api/investment-profile.js | 10s | 투자 성향 |
| api/financial-statement.js | 10s | 재무제표 |
| api/yahoo-proxy.js | 15s | Yahoo Finance 프록시 |
| api/finance-calc.js | (미지정, 기본 10s) | 재무 계산기 |
| api/fire-calc.js | (미지정, 기본 10s) | 파이어 계산기 |
| api/pension-calc.js | (미지정, 기본 10s) | 연금 계산기 |

## 디렉토리 구조
```
public/
  index.html           # 메인 페이지 (3 섹션: 방향잡기, 현재상태파악, 계획·점검·실행)
  portfolio-backtest/
    index.html         # 포트폴리오 백테스트 도구
    data/
      kr_stocks.json   # KR 종목 3910개 (ticker/name/market/sector, 가격 없음)
      us_stocks.json   # US 종목 (ticker/name/market/sector, 가격 없음)
  whole-life-simulation/
    index.html         # 생애자금 시뮬레이터 (실물·금융자산+부채+현금흐름, 130세까지 전망)
api/
  yahoo-proxy.js       # Vercel 서버에서 Yahoo Finance 중계
  life-fund-sim.js     # 생애자금 시뮬레이터 계산 엔진 (부채 상환스케줄+몬테카를로)
```

## 핵심 기술 이슈

### Yahoo Finance 429 차단
- Yahoo Finance가 Vercel/데이터센터 IP를 429로 차단
- query2 + Referer/Origin 헤더 우회 시도 → **미해결**
- 로컬 ISP IP에서는 정상 동작
- 포트폴리오 백테스트가 이 이유로 Vercel에서 동작 안 함

### 포트폴리오 백테스트 데이터 요구사항
백테스트 실행에 필요한 외부 데이터:
1. **각 종목 월별 adjclose 가격** — Yahoo v8 chart API (`interval=1mo`, `events=adjclose`)
2. **KRW=X 환율 월별 데이터** — 환율 변동 반영 ON + USD 자산 있을 때만
3. **대체 프록시 월별 가격** — ETF 상장일이 startYear 이후일 때만 (선택)
4. 예금/예수금은 외부 API 불필요 (금리+복리 수학 계산)
5. 섹터 분류(Yahoo v10)는 원형차트 표시용만, 백테스트 계산에 영향 없음

### 서버사이드 백테스트 아키텍처 (미결정)
수식 숨기기 목적. 검토 중인 방법:
- **GitHub Actions 캐시** — Actions 러너(일반 IP)로 Yahoo 수집 후 JSON 커밋, Vercel에서 서빙. 사전 등록 종목만 가능.
- **Financial Modeling Prep API** — 무료 250 calls/day, 월별 데이터 지원
- **Vercel Edge Function** — 다른 IP 대역 가능성 (미테스트)

## 코딩 규칙
- Vercel 서버리스: package.json 없음(CommonJS 기본) → `module.exports = async (req, res) => {...}` 패턴이 다수 (일부 파일만 `export default function handler`로 되어 있으나 신규 함수는 module.exports 권장)
- WordPress 삽입 HTML은 반드시 **한 줄로** 작성 (줄바꿈 시 공백 생김)
- 주요 CORS 프록시들은 대부분 사망 (thingproxy, corsproxy.io, allorigins, codetabs)
