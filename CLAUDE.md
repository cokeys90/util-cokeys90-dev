# side-quests

util.cokeys90.dev 전체를 관리하는 저장소. 공개 저장소다.
웹 도구와 Chrome 확장 프로그램이 모두 이 도메인의 `/<id>/` 경로 아래에 놓이고, `/` 는 그 목록을 보여 주는 허브다.
확장 프로그램 전용 저장소가 아니다. 구조나 문구를 확장 기준으로만 짜지 말 것.

## 구조

- `site/` — 허브(`index.html`), 공통 404·스타일, 확장별 소개·방침·지원 페이지 (`site/<id>/`)
- `tools/<id>/` — 웹 도구 (예정). 각자 빌드해서 `dist/site/<id>/` 에 결과를 넣는다
- `extensions/<id>/` — Chrome 확장 소스, `store/<id>/` — 스토어 등록 자료
- `release.config.json` — 허브 카드 목록(`tools`, `extensions`)과 공통 정보
- 도구 id와 확장 id는 같은 경로 공간을 쓴다. 겹치면 안 되고, 정한 뒤에는 바꾸지 않는다

## 절대 규칙

- 시크릿 파일 (절대 커밋 금지): `.env*`, Firebase 서비스 계정 키 (`*-firebase-adminsdk-*.json`). 읽지도 말 것
- 서비스 계정 키는 GitHub Secrets `FIREBASE_SERVICE_ACCOUNT_UTIL_COKEYS90_DEV` 에만 둔다
- 확장 프로그램에 AI·원격 코드·외부 서버 호출을 넣지 않는다 (스토어 정책, 개인정보처리방침과 어긋남)
- 확장 동작(저장하는 데이터, 통신하는 곳, 권한)을 바꾸면 `site/<id>/privacy.html` 과 `store/<id>/listing.md` 도 같이 고친다

## 명령어

- `npm run check` — 커밋 전, CI에서 실행. JS 문법 + manifest 규칙
- `npm run build` — `site/` → `dist/site/`. `--strict` 는 예시 값이 남아 있으면 실패 (live 배포에서 사용)
- `npm run pack:ext <id> [--bump patch|minor|major]` — 스토어 업로드 zip
- `npm run new:ext <id> "<이름>"` — 새 확장

## 사이트

- 정적 HTML + `site/assets/site.css` 하나. 프레임워크·빌드 도구 없음
- CSP가 `'self'` 만 허용 → 인라인 `<script>`, `style=""` 속성, 외부 폰트·CDN 금지
- 링크는 절대 경로 (`/assets/site.css`, `/<id>/privacy.html`)
- `{{PLACEHOLDER}}` 는 `kit/scripts/build-site.mjs` 가 `release.config.json` 으로 채운다
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

## 코드 스타일

- Prettier (`.prettierrc.json`), 커밋 시 lint-staged가 자동 적용
- 주석·문구는 한국어
