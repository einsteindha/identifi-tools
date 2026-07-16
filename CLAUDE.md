# identifi-tools 프로젝트 지침

## 배포 환경
- **URL**: https://identifi-tools.vercel.app
- **GitHub**: einsteindha/identifi-tools (auto-deploy on push to main)
- **vercel.json**: `outputDirectory: "public"`, Hobby plan 최대 **12개** 서버리스 함수

## 현재 API 함수 (9개, 여유 3개 — 다음 도구 추가 전 반드시 재검토)
| 파일 | maxDuration | 역할 |
|------|-------------|------|
| api/fetch-data.js | 30s | 범용 데이터 fetch |
| api/retirement-sim.js | 30s | 은퇴 인출 시뮬레이션 |
| api/goal-sim.js | 30s | 목적자금 시뮬레이션 |
| api/life-fund-sim.js | 30s | 생애자금 시뮬레이션 (실물·금융자산+부채+현금흐름, 130세까지) |
| api/investment-profile.js | 10s | 투자 성향 |
| api/financial-statement.js | 10s | 재무제표 |
| api/finance-calc.js | (미지정, 기본 10s) | 재무 계산기 |
| api/fire-calc.js | (미지정, 기본 10s) | 파이어 계산기 |
| api/pension-calc.js | (미지정, 기본 10s) | 연금 계산기 |

## 디렉토리 구조
```
public/
  index.html           # 메인 페이지 (3 섹션: 방향잡기, 현재상태파악, 계획·점검·실행)
  whole-life-simulation/
    index.html         # 생애자금 시뮬레이터 (실물·금융자산+부채+현금흐름, 130세까지 전망)
api/
  life-fund-sim.js     # 생애자금 시뮬레이터 계산 엔진 (부채 상환스케줄+몬테카를로)
```

## 포트폴리오 백테스트 (identifi-tools 소관 아님)
- 포트폴리오 백테스트는 identifi-tools/Vercel과 무관한 별도 도구 — 코드·배포 전부 **`einsteindha/portfolio-backtest`** 저장소(GitHub Pages, `https://einsteindha.github.io/portfolio-backtest/`)에서 관리됨.
- identifi-tools에는 복사본을 두지 않고, rewrite도 걸지 않음 (Vercel 함수/자리 아끼려고 의도적으로 제외). `public/financial-statement/index.html`의 카드에서 `https://einsteindha.github.io/portfolio-backtest/`로 직접 나가는 외부링크(`target="_blank"`)만 유지.
- 코드 수정은 `einsteindha/portfolio-backtest` 저장소에서 직접 할 것.

## 자산배분 백테스트 (identifi-tools 소관 아님)
- 자산배분 백테스트도 identifi-tools/Vercel과 무관한 별도 도구 — 코드·배포 전부 **`einsteindha/asset-allocation-backtest`** 저장소(GitHub Pages, `https://einsteindha.github.io/asset-allocation-backtest/`, 로컬 클론 `도구/백테스트자산배분`)에서 관리됨.
- identifi-tools에는 복사본을 두지 않고(2026-07-16 `public/asset-allocation-backtest` 및 `api/backtest-asset.js` 제거), rewrite도 걸지 않음 (포트폴리오 백테스트와 동일하게 Vercel 함수/자리 아끼려고 의도적으로 제외). `public/index.html`, `public/financial-statement/index.html`의 카드에서 `https://einsteindha.github.io/asset-allocation-backtest/`로 직접 나가는 외부링크(`target="_blank"`)만 유지.
- 코드 수정은 `einsteindha/asset-allocation-backtest` 저장소(로컬 `도구/백테스트자산배분`)에서 직접 할 것.

## 코딩 규칙
- Vercel 서버리스: package.json 없음(CommonJS 기본) → `module.exports = async (req, res) => {...}` 패턴이 다수 (일부 파일만 `export default function handler`로 되어 있으나 신규 함수는 module.exports 권장)
- WordPress 삽입 HTML은 반드시 **한 줄로** 작성 (줄바꿈 시 공백 생김)
