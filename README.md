# 📊 서귀포 직영관광지 관람객 대시보드

공공데이터포털의 **제주특별자치도 서귀포시_직영관광지 관람객수 추이** (odcloud API, 데이터셋 15125100)를 차트로 보여주는 사이트입니다. Vite + React + Recharts, Vercel 배포.

- 월별 추이 꺾은선(관광지 선택), 연도별 관광지 비교, 월별 평균(붐비는 달/한적한 달), 월별 표
- 인증키는 서버리스 함수(`api/visitors.js`)에서만 사용 → 브라우저에 노출되지 않음, 응답은 하루 캐시

## 인증키 설정

1. 공공데이터포털 → 마이페이지 → 데이터활용 → Open API → 개발계정 → **일반 인증키**(Decoding/Encoding 아무거나)
2. 로컬: `.env.example` 을 `.env` 로 복사하고 `DATA_GO_KR_KEY=` 뒤에 키를 넣습니다. (`.env` 는 git에 올라가지 않음)
3. 키가 없거나 틀리면 화면 상단에 노란 경고가 뜨고 **샘플(가짜) 데이터**가 표시됩니다.

## 실행

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Vercel 배포

1. GitHub에 올린 뒤 https://vercel.com/new 에서 저장소를 Import (Framework: Vite 자동 인식)
2. **Environment Variables** 에 `DATA_GO_KR_KEY` 추가 (Production/Preview/Development 모두 체크, 값 앞뒤 공백·따옴표 없이)
3. Deploy. 값을 바꾼 뒤에는 Redeploy 해야 반영됩니다.

## 데이터 메모

- 데이터셋 두 개(20250831 / 20251002 버전)를 모두 불러와 합칩니다. 같은 달이면 새 버전 값을 우선 사용합니다.
- 필드: 천지연폭포, 정방폭포, 천제연폭포, 중문대포 주상절리대, 산방산_용머리, 감귤박물관 (월별 관람객 수)
- 빈칸("데이터 미집계")은 0이 아니라 **없음**으로 처리해 차트에서 선이 끊겨 보입니다.
- 공공데이터의 이용허락범위는 데이터 상세 페이지에서 확인하세요.
