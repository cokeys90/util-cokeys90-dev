# ToolHub

> '언젠가 만들어야지' 하고 미뤄 둔 도구들, AI도 있겠다 이때다 싶어서 드디어 만들었어요. 직접 쓰려고 만든 작은 도구 모음이에요.
> Small tools I build to scratch my own itches. No servers, no tracking.

[util.cokeys90.dev](https://util.cokeys90.dev) 전체를 관리하는 저장소입니다. 웹 도구와 Chrome 확장 프로그램이 모두 이 도메인의 경로(`/<id>/`) 아래에 놓이고, 첫 화면은 그 목록을 보여 주는 허브입니다.

**→ [util.cokeys90.dev](https://util.cokeys90.dev)**

## 퀘스트 목록

| 이름                                                          | 종류        | 설명                                                                |
| ------------------------------------------------------------- | ----------- | ------------------------------------------------------------------- |
| [구독 채널 정리함](https://util.cokeys90.dev/subs-organizer/) | Chrome 확장 | YouTube 구독 채널을 정리하거나, 여러 계정의 구독을 하나로 합쳐요.   |
| [PoE2 경로석·서판 검색기](https://poe2.cokeys90.dev)          | 웹 도구     | Path of Exile 2 경로석·서판 옵션으로 게임 검색용 정규식을 만들어요. |

## 구조

```
site/                   허브와 공통 정적 페이지 → dist/site/
  index.html            허브 (도구·확장 카드는 release.config.json에서 생성)
  404.html, assets/     공통 404, 공통 스타일
  <id>/                 확장별 소개·개인정보처리방침·지원 페이지
tools/<id>/             웹 도구 (예정) → dist/site/<id>/ 로 빌드
extensions/<id>/        Chrome 확장 소스 (MV3, 빌드 없이 그대로 로드 가능)
store/<id>/             확장 스토어 등록 문구, 스크린샷, 프로모 이미지
kit/
  scripts/              빌드·패키징·점검 스크립트 (의존성 없음)
  templates/            새 확장 뼈대
  CHECKLIST.md          확장 스토어 제출 체크리스트
release.config.json     사이트 제목, 개발자 정보, 도구·확장 목록
```

| 경로                           | 내용                                      |
| ------------------------------ | ----------------------------------------- |
| `util.cokeys90.dev/`           | 허브 (웹 도구·확장 프로그램 목록)         |
| `util.cokeys90.dev/<도구 id>/` | 웹 도구 본체                              |
| `util.cokeys90.dev/<확장 id>/` | 확장 소개, `privacy.html`, `support.html` |

웹 도구는 지금은 각자 따로 배포된 곳(예: poe2.cokeys90.dev)을 허브 카드로 연결만 하고, 하나씩 `tools/<id>/` 로 옮겨 올 예정입니다.

## 명령어

```bash
npm install                         # 처음 한 번 (prettier, husky)
npm run check                       # JS 문법 + manifest 규칙 점검
npm run build                       # site/ → dist/site/ (Firebase 공개 폴더)
npm run pack:ext subs-organizer     # dist/subs-organizer-<ver>.zip (스토어 업로드용)
npm run new:ext my-tool "내 도구"   # 새 확장 뼈대 + 사이트 페이지 + 스토어 문구
```

확장을 로컬에서 써 보려면 `chrome://extensions` → 개발자 모드 → **압축해제된 확장 프로그램 로드** → `extensions/<id>/` 선택.

## 배포

`main` 에 push하면 GitHub Actions가 `npm run check` → `npm run build:strict` → Firebase Hosting(`util-cokeys90-dev`) live 채널에 배포합니다.
PR은 미리보기 채널에 배포되고 PR 댓글로 주소가 달립니다.

## 원칙

- 개발자 서버 없음. 데이터는 사용자의 브라우저 안에서만 처리
- 분석 도구·광고·외부 스크립트 없음 (사이트 CSP가 `'self'` 만 허용)
- 확장은 꼭 필요한 권한만
- 도구·확장마다 경로 하나 (`/<id>/`). id는 한 번 정하면 바꾸지 않음 (주소, 스토어 등록, 개인정보처리방침 링크가 걸려 있음)

## License

[MIT](LICENSE)
