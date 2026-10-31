import { Card, ExtensionPage, Features, H2, Shot } from '../src/ExtensionPage'

const id = 'subs-organizer'

export default function Page() {
  return (
    <ExtensionPage
      id={id}
      lead="YouTube 구독 채널을 한눈에 보고, 오래 쉰 채널을 골라 정리하거나, 여러 계정의 구독을 하나로 합칩니다."
    >
      <Shot
        src={`/${id}/screenshot-1.png`}
        alt="두 계정의 구독 목록을 비교하고 남길 계정을 고르는 정리 화면"
      />

      <H2>할 수 있는 일</H2>
      <Features>
        <Card title="계정 하나 정리">
          채널마다 최근 영상과 쇼츠를 올린 시점을 보여줘요. 1년 넘게 쉰 채널만 골라 한 번에 구독
          취소할 수 있어요.
        </Card>
        <Card title="여러 계정 합치기">
          이 브라우저에 로그인된 계정을 2개 이상 고르면 구독 목록을 비교하고, 남길 계정 하나로
          모아줘요.
        </Card>
        <Card title="실행 전 미리 보기">
          새로 구독할 채널과 구독 취소할 채널을 먼저 보여주고, 시작을 눌러야 실행돼요. 빼둔 채널은
          언제든 다시 넣을 수 있어요.
        </Card>
        <Card title="끝나면 다시 확인">
          작업이 끝나면 구독 목록을 다시 받아 목표와 비교하고, 남은 채널만 다시 시도할 수 있어요.
        </Card>
      </Features>

      <H2>개인정보</H2>
      <Card ok>
        이 확장 프로그램에는 개발자 서버가 없습니다. 계정 정보와 구독 목록은 사용자의 브라우저
        안에서만 처리되고 저장되며, 개발자나 다른 누구에게도 보내지 않습니다. 자세한 내용은{' '}
        <a href={`/${id}/privacy.html`}>개인정보처리방침</a>을 확인해 주세요.
      </Card>

      <H2>알아두면 좋은 점</H2>
      <ul className="list-disc pl-6">
        <li>
          YouTube 웹 화면을 읽고 버튼을 누르는 방식이라, YouTube 화면이 바뀌면 일시적으로 동작하지
          않을 수 있어요.
        </li>
        <li>
          너무 많은 채널을 짧은 시간에 바꾸면 YouTube가 구독을 잠시 막을 수 있어서, 채널마다 몇 초씩
          간격을 두고 처리해요.
        </li>
        <li>브랜드 계정(하나의 Google 계정 아래 여러 채널)은 아직 지원하지 않아요.</li>
        <li>이 확장 프로그램은 YouTube 또는 Google과 관련이 없는 개인 개발 도구입니다.</li>
      </ul>
    </ExtensionPage>
  )
}
