import { Card, ExtensionPage, Features, H2, Shot } from '../src/ExtensionPage'

const id = '{{EXT_ID}}'

export default function Page() {
  return (
  <ExtensionPage id={id} lead="TODO: 이 확장이 해결하는 문제를 한두 문장으로">
    <Shot src={`/${id}/screenshot-1.png`} alt="TODO: 스크린샷 설명" />

    <H2>할 수 있는 일</H2>
    <Features>
      <Card title="TODO 기능 1">TODO</Card>
      <Card title="TODO 기능 2">TODO</Card>
    </Features>

    <H2>개인정보</H2>
    <Card ok>
      TODO: 데이터가 어디서 처리되고 어디로 가는지 한 문단. 자세한 내용은{' '}
      <a href={`/${id}/privacy.html`}>개인정보처리방침</a>을 확인해 주세요.
    </Card>
  </ExtensionPage>
  )
}
