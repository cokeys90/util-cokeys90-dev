# ToolHub

util.cokeys90.dev 전체를 관리하는 저장소. 공개 저장소다.
웹 도구와 Chrome 확장 프로그램이 모두 이 도메인의 `/<id>/` 경로 아래에 놓이고, `/` 는 그 목록을 보여 주는 허브다.
확장 프로그램 전용 저장소가 아니다. 구조나 문구를 확장 기준으로만 짜지 말 것.

## 구조

```
web/                     React 페이지 (Vite 멀티 페이지 + Tailwind + TypeScript)
  index.html, main.tsx   허브 진입점 → /
  <id>/                  확장 소개 → /<id>/   (index.html·main.tsx 진입점, Page.tsx 페이지 내용)
  src/
    Hub.tsx              허브 화면 (카드는 release.config.json 에서)
    mount.tsx            진입점(main.tsx)에서만 부르는 mount(). 사전 렌더링된 HTML이 있으면 hydrate
    prerender.tsx        빌드 때 페이지를 HTML로 그림 (Hub + web/*/Page.tsx 자동)
    Layout.tsx           상단 바·본문 틀·푸터
    ExtensionPage.tsx    확장 소개 공통 틀 (아이콘·설치 버튼) + Card·Features·H2·Shot
    config.ts            release.config.json 타입
    styles.css           Tailwind. 색은 tokens.css 를 @theme inline 으로 연결만
site/                    정적 파일 (빌드 때 그대로 복사 후 자리표시자 채움)
  404.html, favicon.png
  assets/tokens.css      색·글꼴 토큰 (정적·React 페이지 공용, 색은 여기서만 고침). 다크 모드는 두지 않음
  assets/site.css        정적 페이지 전용 스타일
  <id>/                  privacy.html, support.html, icon.png, screenshot-*.png
vite.config.ts           web/*/index.html 자동 진입점, publicDir = site/
```

- 빌드 흐름: `vite build` 가 `dist/site/` 를 비우고 `web/` 페이지를 빌드하며 `site/` 를 복사 → `prerender.mjs` 가 React 페이지를 HTML로 미리 그려 `<div id="root">` 에 넣음 → `build-site.mjs` 가 `site/` 의 HTML·CSS 자리표시자를 채워 덮어씀
- 새 React 페이지: `web/<id>/index.html` + `main.tsx`(mount만) + `Page.tsx`(컴포넌트)를 만들면 진입점에 자동으로 들어간다. 진입점과 컴포넌트를 한 파일에 섞지 않는다 (Fast Refresh, ESLint `react-refresh` 규칙). 확장은 `npm run new:ext` 가 `kit/templates/web/` 로 만들어 준다
- `tools/<id>/` — 웹 도구 (예정). 각자 빌드해서 `dist/site/<id>/` 에 결과를 넣는다. `vite build` 가 `dist/site/` 를 비우므로 도구 빌드는 반드시 그 뒤에 돌린다
- `extensions/<id>/` — Chrome 확장 소스, `store/<id>/` — 스토어 등록 자료
- `release.config.json` — 허브 카드 목록(`tools`, `extensions`)과 공통 정보
- 도구 id와 확장 id는 같은 경로 공간을 쓴다. 겹치면 안 되고, 정한 뒤에는 바꾸지 않는다

## 절대 규칙

- 시크릿 파일 (절대 커밋 금지): `.env*`, Firebase 서비스 계정 키 (`*-firebase-adminsdk-*.json`). 읽지도 말 것
- 서비스 계정 키는 GitHub Secrets `FIREBASE_SERVICE_ACCOUNT_UTIL_COKEYS90_DEV` 에만 둔다
- 확장 프로그램에 AI·원격 코드·외부 서버 호출을 넣지 않는다 (스토어 정책, 개인정보처리방침과 어긋남)
- npm 의존성: `.npmrc` 의 `min-release-age=7` 로 공개 7일 안 된 버전은 설치하지 않는다 (공급망 공격 대비). 끄지 말 것. 급한 보안 패치만 `--min-release-age=0` 으로 한 번
- 확장 동작(저장하는 데이터, 통신하는 곳, 권한)을 바꾸면 `site/<id>/privacy.html` 과 `store/<id>/listing.md` 도 같이 고친다

## 명령어

- `npm run dev` — 개발 서버 (`web/` React 페이지 + `site/` 정적 파일)
- `npm run check` — JS 문법 + manifest 규칙 + `tsc -p web` + `eslint .`
- `npm run verify` — check + `build:strict` + `verify-dist.mjs`(필수 페이지·자리표시자·CSP 위반·깨진 참조). push 전과 CI에서 이것 하나로 판정
- 린트·포맷: ESLint(flat config, `web/`·`vite.config.ts` 대상) + Prettier. 커밋 때 lint-staged가 `eslint --fix`·`prettier --write` 실행
- TypeScript는 6.0에 둔다. 7(네이티브)은 typescript-eslint가 아직 지원하지 않음 (peer `<6.1`)
- `npm run build` — `vite build`(web/ + site/ 복사) 후 `build-site.mjs`가 정적 페이지 자리표시자를 채움 → `dist/site/`. `--strict` 는 예시 값이 남아 있으면 실패 (live 배포에서 사용)
- `npm run pack:ext <id> [--bump patch|minor|major]` — 스토어 업로드 zip
- `npm run new:ext <id> "<이름>"` — 새 확장

## 검사 단계 (main push = 바로 운영 배포)

| 단계    | 무엇                                                                | 어디                                                |
| ------- | ------------------------------------------------------------------- | --------------------------------------------------- |
| 커밋    | 바뀐 파일만 `eslint --fix` + `prettier`                             | `.husky/pre-commit` (lint-staged)                   |
| push 전 | `npm run verify`                                                    | `.husky/pre-push`                                   |
| CI      | `npm ci` → `npm run verify` 통과해야 배포 (PR 미리보기도 같은 기준) | `.github/workflows/`                                |
| 배포 후 | 운영 주소 주요 페이지 200 + 이번 빌드 JS가 반영됐는지               | `kit/scripts/smoke-live.mjs` (live 워크플로 마지막) |

- 훅을 `--no-verify` 로 건너뛰지 않는다. 실패하면 원인을 고친다
- 새 페이지 종류나 CSP에 걸릴 만한 것을 넣으면 `verify-dist.mjs` 점검 항목도 같이 늘린다
- 단위 테스트 프레임워크는 아직 없음. 인터랙션 로직(필터·검색 등)이 생기면 그 함수만 `node --test` 로 테스트하고 `verify` 에 넣는다. 화면 동작이 복잡해지면 Playwright 콘솔 에러 점검을 검토

## 사이트

- 허브와 확장 소개 페이지는 React(`web/`), 개인정보처리방침·지원·404는 정적 HTML(`site/`). 방침·지원은 스토어 심사·법적 문서라 JS 없이 읽혀야 하므로 React로 옮기지 않는다
- React 페이지는 사전 렌더링된다(JS 오기 전 빈 화면 방지). 그래서 컴포넌트 렌더 중에 `window`·`document`·`localStorage`·현재 시각·난수를 쓰지 않는다. 필요하면 `useEffect` 안에서. 어기면 빌드가 깨지거나 hydrate 불일치가 난다
- 허브 문구: `release.config.json` 의 `site.headline`(3초 안에 읽히는 핵심 한 줄)과 `site.tagline`(이야기). 카드 미리보기는 확장의 `thumb`(`site/<id>/` 파일 이름), 없으면 아이콘
- SPA 라우터를 쓰지 않는다. 페이지마다 `web/<id>/index.html` 진입점 (도구·확장이 같은 `/<id>/` 경로 공간을 쓰므로)
- 색·글꼴 값은 `site/assets/tokens.css` 하나에만 둔다. 새 색은 거기에 변수를 만들고 `styles.css` 의 `@theme inline` 에 이름을 붙인다
- CSP가 `'self'` 만 허용 → 인라인 `<script>`, HTML `style=""` 속성, 외부 폰트·CDN 금지 (React `style={{}}` 도 쓰지 말고 Tailwind 클래스로)
- 링크는 절대 경로 (`/assets/site.css`, `/<id>/privacy.html`)
- 정적 페이지의 `{{PLACEHOLDER}}` 는 `kit/scripts/build-site.mjs` 가, React 페이지는 `release.config.json` 을 직접 import 해서 쓴다
- 캐시: `/assets/*-*.(js|css)` (Vite 해시 파일)는 1년 `immutable`. 그래서 `site/assets/` 의 해시 없는 파일 이름에 `-` 를 넣지 않는다 (바꿔도 1년 동안 옛 파일이 쓰임)
- 캐시: Firebase headers는 요청 경로로 매칭한다. `**/*.html` 만으로는 `/`, `/<id>/` 요청에 안 걸리므로 `firebase.json` 에 디렉터리 경로 규칙을 따로 둔다

## 웹 도구 옮겨 오기 (예정)

- 첫 대상: poe2-search → `/poe2`. 지금은 `release.config.json` 의 `tools.poe2-search.url` 로 바깥 주소를 연결만 해 둔 상태
- 옮길 때 할 일: Vite `base: '/poe2/'`, 빌드 결과를 `dist/site/poe2/` 로, `build-site.mjs` 와 워크플로에 도구 빌드 단계 추가, poe2.cokeys90.dev → util.cokeys90.dev/poe2/ 301 리다이렉트, 허브 카드 url 제거
- 주의: localStorage는 출처(도메인)별이라 옮기면 기존 저장값이 안 따라온다. 같은 도메인을 여러 도구가 쓰므로 저장 키에 도구 id 접두어를 붙인다
- 주의: `firebase.json` 의 CSP는 지금 사이트 전체에 걸린다. 도구가 다른 출처(API, 폰트 등)를 쓰면 `/<id>/**` 용 헤더 규칙을 따로 둔다

## 확장 프로그램 (`extensions/<id>/`)

- MV3, 빌드 없이 그대로 로드
- `subs-organizer`: YouTube 내부 엔드포인트와 화면 버튼을 쓰므로 YouTube 화면이 바뀌면 깨질 수 있다. 셀렉터는 `inject.js` 의 `ytPage` 에 모여 있다
- 실행 상태 쓰기는 반드시 `background.js` 의 `mutateRun` 을 거친다 (동시 쓰기 덮어쓰기 방지)

## 할 일 관리

- 할 일은 루트 `TODO.md` 하나에 모은다. 공개 저장소에 커밋되므로 비밀값·개인 메모는 넣지 않는다
- 구역은 "지금 할 일 / 기다리는 일 / 미뤄둔 일" 셋, 항목 앞에 `[범위]` (저장소·site·확장 id·도구 id)
- "할 일 뭐 있지" 류 질문: `TODO.md` 세 구역을 범위별로 요약하고, 기다리는 일은 지금 확인할 방법을 같이 알려 준다. 코드의 `shortcut:` 주석도 찾아서 덧붙인다
- 작업 중 미루거나 외부를 기다려야 하는 일이 생기면 `TODO.md` 에 넣자고 제안한다. 끝난 항목은 지운다

## 코드 스타일

- Prettier (`.prettierrc.json`), 커밋 시 lint-staged가 자동 적용
- 주석·문구는 한국어
