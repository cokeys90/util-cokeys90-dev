# 할 일

> 공개 저장소에 올라가는 파일. 비밀값·공개하기 싫은 개인 메모는 넣지 않음 (그런 메모는 로컬 전용 파일로)
> 상태는 세 구역으로만 나눔. 항목 앞에 `[범위]`(저장소·site·확장 id·도구 id)를 붙임
> 기다리는 일은 "무엇을 기다리는지"와 "언제·어떻게 확인하는지"를 같이 씀
> 끝난 항목은 지움 (이력은 git log). 설명이 길면 아래 "상세"나 별도 파일로 링크

## 지금 할 일

- [ ] [subs-organizer] 배포 탭 공개 범위 확인 → 상세 1
- [ ] [subs-organizer] (선택) 테스트 안내 입력. 심사 중이라 막히면 건너뜀 → 상세 2
- [ ] [저장소] 배포 액션 버전을 커밋 SHA로 고정 → `PUBLIC-REVIEW.md` 1번
- [ ] [저장소] `.gitignore`에 `service-account*.json` 추가 → `PUBLIC-REVIEW.md` 3번
- [ ] [저장소] GitHub Secret scanning·Push protection·브랜치 보호 설정 → `PUBLIC-REVIEW.md` 4번

## 기다리는 일

- [ ] [subs-organizer] 크롬 웹 스토어 심사 결과 (2026-10-31 제출)
  - 확인: 승인·반려 메일, 개발자 대시보드 상태
  - 승인되면 → 상세 3, 반려되면 → 상세 "반려되면"
- [ ] [poe2-search] firebase가 고정한 `@grpc/grpc-js` 취약점 패치 (2026-11-01 기준 high 4건, firestore 미사용이라 실제 영향 없음)
  - 확인: poe2-search에서 `npm audit` → grpc-js 항목이 `npm audit fix`(force 없이)로 해결되는지
  - 풀리면 `npm audit fix` 후 `npm run build`, `npm run verify`

## 미뤄둔 일

- [ ] [저장소] Firebase CLI 업데이트: `npm install -g firebase-tools`
- [ ] [subs-organizer] (선택) 대시보드에서 util.cokeys90.dev 도메인 소유 확인 → 등록정보 "공식 URL" 지정
- [ ] [poe2-search] `/poe2` 로 옮기기 (CLAUDE.md "웹 도구 옮겨 오기" 참고)

---

# 상세

## 구독 채널 정리함 (subs-organizer) 스토어 등록 마무리

- 확장 ID: `cdfegkfhdfapjejgjlffnhpaenigdaij`
- 제출 버전: 0.1.0 (2026-10-31 제출, 상태: 검토 대기 중)
- 개발자 대시보드: https://chrome.google.com/webstore/devconsole

### 1. 배포 탭 공개 범위 확인

- [ ] 대시보드 → 구독 채널 정리함 → **배포** 탭에서 공개 범위 확인
- 계획: 처음에는 **미등록(Unlisted)** + 지역 **대한민국**, 가격 무료
- **공개(Public)** 로 되어 있고 미등록으로 바꾸고 싶다면:
  1. 상태(또는 패키지) 화면에서 **검토 취소**
  2. 배포 탭에서 미등록 + 대한민국으로 변경
  3. 임시 저장 → **검토를 위해 제출** (심사 순서는 처음으로 돌아감)
- 공개로 그냥 가도 괜찮으면 그대로 둔다

### 2. 테스트 안내 입력 (선택)

- [ ] 대시보드 → **액세스 → 테스트 안내**에 아래 메모 넣기 (검토 중이라 수정이 막히면 건너뜀)

```
This extension has no server. It only works on www.youtube.com while the user is signed in.
To test: sign in to YouTube in Chrome, click the toolbar icon, pick one account, move one channel to the right column, press 실행하기 (Run) then 시작 (Start). A small YouTube window opens and processes the selected channel. Nothing runs without the user pressing Start.
The UI is in Korean.
```

### 3. 승인 후 사이트에 스토어 링크 연결

승인 메일이 온 뒤에 한다. 승인 전에 넣으면 열리지 않는 링크가 걸린다.

- [ ] 스토어 주소가 열리는지 확인: https://chromewebstore.google.com/detail/cdfegkfhdfapjejgjlffnhpaenigdaij
- [ ] `release.config.json` → `extensions.subs-organizer.storeUrl` 에 위 주소 넣기
- [ ] `npm run build:strict` 로 확인 후 커밋, push

  ```powershell
  git add release.config.json
  git commit -m "feat(site): 구독 채널 정리함 스토어 링크 연결"
  git push
  ```

- [ ] 배포 후 https://util.cokeys90.dev/ 카드가 "Chrome 웹 스토어"로 바뀌고, https://util.cokeys90.dev/subs-organizer/ 설치 버튼이 열리는지 확인

### 반려되면

- 대시보드와 메일로 온 반려 사유를 확인하고 고친다
- 코드를 고쳤다면 버전을 올려서 다시 묶는다: `npm run pack:ext subs-organizer --bump patch`
- 확장 동작(저장 데이터, 통신, 권한)이 바뀌면 `site/subs-organizer/privacy.html`, `store/subs-organizer/listing.md` 도 같이 고친다
