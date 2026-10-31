# 구독 채널 정리함 · Chrome 웹 스토어 제출 문구

개발자 대시보드의 각 칸에 그대로 붙여넣는 용도입니다. 주소는 util.cokeys90.dev 기준입니다.

---

## 1. 스토어 등록정보 탭

### 이름
manifest의 `name`이 그대로 쓰입니다.
```
구독 채널 정리함
```

### 요약 (132자 이내, manifest의 description)
```
YouTube 구독 채널을 한눈에 보고 정리하거나, 여러 계정의 구독을 하나로 합칩니다. 데이터는 이 브라우저 밖으로 나가지 않습니다.
```

### 상세 설명
```
YouTube 구독이 너무 많아졌거나, 계정이 여러 개라 구독이 흩어져 있다면 한 화면에서 정리하세요.

■ 계정 하나 정리
• 채널마다 최근 영상과 쇼츠를 올린 시점을 보여줍니다.
• 활동 상태를 활발 · 뜸함 · 휴면 · 영상 없음으로 나눠, 1년 넘게 쉰 채널만 골라볼 수 있습니다.
• 걸러진 채널을 한 번에 빼두고, 실행하면 구독 취소합니다.

■ 여러 계정 합치기
• 이 브라우저에 로그인된 YouTube 계정을 2개 이상 고르면 구독 목록을 비교합니다.
• 어느 계정에만 있는지, 모두에 있는지 색으로 구분해 보여줍니다.
• 남길 계정을 고르면 그 계정에 없는 채널은 새로 구독하고, 뺀 채널은 구독 취소합니다. 다른 계정은 바뀌지 않습니다.

■ 실수 없이 실행
• 바뀌는 채널 목록을 먼저 보여주고, 시작을 눌러야 실행합니다.
• 빼둔 채널은 실행 전까지 언제든 다시 넣을 수 있고, 되돌리기도 됩니다.
• 채널을 열 때마다 남길 계정으로 열렸는지 확인하고, 다른 계정이면 건너뜁니다.
• 작업이 끝나면 구독 목록을 다시 받아 목표와 비교하고, 남은 채널만 다시 시도할 수 있습니다.

■ 개인정보
• 개발자 서버가 없습니다. 계정 정보와 구독 목록은 브라우저 안에서만 처리되고, 개발자를 포함해 누구에게도 보내지 않습니다.
• 저장된 정보는 첫 화면의 '저장된 데이터 지우기'로 언제든 지울 수 있습니다.

■ 알아두세요
• YouTube 웹 화면을 이용하는 방식이라, YouTube 화면이 바뀌면 일시적으로 동작하지 않을 수 있습니다.
• 짧은 시간에 너무 많이 바꾸면 YouTube가 구독을 잠시 막을 수 있어, 채널마다 몇 초씩 간격을 두고 처리합니다.
• 브랜드 계정은 아직 지원하지 않습니다.
• 이 확장 프로그램은 YouTube 또는 Google과 관련이 없습니다.

사용법과 자주 묻는 질문: https://util.cokeys90.dev/subs-organizer/support.html
```

### 카테고리
`생산성(Productivity)` 아래 `도구(Tools)`

### 언어
`한국어`

### 그래픽
| 항목 | 파일 | 필수 |
|---|---|---|
| 스토어 아이콘 128×128 | `extensions/subs-organizer/icons/icon128.png` | 필수 |
| 스크린샷 1280×800 | `store/subs-organizer/screenshots/01~05.png` | 1장 이상 필수 |
| 작은 홍보 타일 440×280 | `store/subs-organizer/promo-440x280.png` | 선택 |

### URL
| 항목 | 값 |
|---|---|
| 홈페이지 URL | `https://util.cokeys90.dev/subs-organizer/` |
| 지원 URL | `https://util.cokeys90.dev/subs-organizer/support.html` |

---

## 2. 개인정보 보호 탭

### 단일 목적
```
사용자가 로그인한 YouTube 계정의 구독 채널 목록을 보여주고, 사용자가 고른 대로 구독을 정리하거나 여러 계정의 구독을 하나의 계정으로 합치는 도구입니다.
```

### 권한별 사용 이유

**storage**
```
사용자가 빼둔 채널 목록, 남길 계정 선택, 실행 진행 상태, 채널별 최근 업로드 확인 결과를 사용자 브라우저에 저장해, 화면을 다시 열거나 작업이 중단되었을 때 이어갈 수 있게 합니다. 외부로 전송하지 않습니다.
```

**scripting**
```
youtube.com 페이지 안에서 함수를 실행해, 로그인된 계정 목록과 각 계정의 구독 채널 목록을 읽고, 사용자가 시작을 누른 경우에만 채널 페이지의 구독 버튼 상태를 확인하고 누르기 위해 사용합니다.
```

**호스트 권한 (https://www.youtube.com/*)**
```
구독 목록 읽기, 사용자가 요청한 구독·구독 취소 실행, 채널의 공개 RSS 피드로 최근 업로드 시점 확인에 필요합니다. 접근 범위를 www.youtube.com 하나로 제한했습니다.
```

### 원격 코드 사용
`아니요, 원격 코드를 사용하지 않습니다.`
```
모든 JavaScript는 확장 프로그램 패키지에 포함되어 있으며 외부 스크립트를 불러오거나 eval로 실행하지 않습니다.
```

### 데이터 사용

스토어 정책상 **브라우저 안에서만 처리하는 정보도 공개 대상**입니다. 아래 두 항목에 체크합니다.

| 항목 | 체크 | 해당 정보 |
|---|---|---|
| 개인 식별 정보 | ✅ | 로그인된 YouTube 계정의 이름, 이메일, 프로필 사진 (계정 선택 화면 표시용) |
| 웹사이트 콘텐츠 | ✅ | 구독 채널 목록, 채널의 공개 정보와 최근 업로드 정보 |
| 건강 정보 | ⬜ | |
| 금융 및 결제 정보 | ⬜ | |
| 인증 정보 | ⬜ | 비밀번호, 쿠키, 토큰을 읽거나 저장하지 않음 |
| 개인 커뮤니케이션 | ⬜ | |
| 위치 | ⬜ | |
| 웹 기록 | ⬜ | |
| 사용자 활동 | ⬜ | |

아래 세 가지 확인 항목은 모두 체크합니다.
- 승인된 사용 사례 외의 목적으로 제3자에게 사용자 데이터를 판매하거나 전송하지 않습니다.
- 항목의 단일 목적과 관련 없는 목적으로 사용자 데이터를 사용하거나 전송하지 않습니다.
- 신용도 판단이나 대출 목적으로 사용자 데이터를 사용하거나 전송하지 않습니다.

### 개인정보처리방침 URL
```
https://util.cokeys90.dev/subs-organizer/privacy.html
```

---

## 3. 배포 탭

| 항목 | 권장 |
|---|---|
| 공개 범위 | 처음에는 **미등록(Unlisted)**. 링크를 아는 사람만 설치 |
| 지역 | 처음에는 대한민국만. 화면이 한국어뿐이라서 |
| 가격 | 무료 |

---

## 4. 심사 담당자에게 남길 메모 (테스트 안내 칸이 있으면)
```
This extension has no server. It only works on www.youtube.com while the user is signed in.
To test: sign in to YouTube in Chrome, click the toolbar icon, pick one account, move one channel to the right column, press 실행하기 (Run) then 시작 (Start). A small YouTube window opens and processes the selected channel. Nothing runs without the user pressing Start.
The UI is in Korean.
```

---

## 영어 등록정보 (화면을 영어로 바꾼 뒤 추가 권장)

지금 화면은 한국어뿐이라, 영어 등록정보는 화면 다국어 작업 후에 넣는 걸 권합니다. 미리 준비해 둔 문구입니다.

**Summary**
```
See all your YouTube subscriptions at a glance, clean up inactive channels, or merge subscriptions from several accounts. Data stays in your browser.
```

**Description**
```
Organize your YouTube subscriptions in one screen.

• Clean up one account: see when each channel last uploaded a video or Short, filter channels inactive for over a year, and unsubscribe in one run.
• Merge accounts: pick two or more YouTube accounts signed in to this browser, compare their subscriptions, and move everything into one account. Other accounts are not changed.
• Safe runs: preview every change before you press Start, undo anytime before running, and the extension checks that each channel page opened as the target account. After the run, it re-reads the subscription list and lets you retry anything left.
• Private: there is no developer server. Account details and subscription lists are processed only in your browser and are never sent anywhere.

Not affiliated with YouTube or Google.
```
