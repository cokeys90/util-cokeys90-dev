import type { ReactNode } from 'react'
import { config } from './config'
import { Footer, Layout, Mail } from './Layout'

const { site } = config

function Card(p: {
  href: string
  icon: ReactNode
  name: string
  summary?: string
  tags: ReactNode
}) {
  return (
    <a
      href={p.href}
      className="flex items-start gap-4 rounded-2xl border border-line bg-surface px-[18px] py-4 text-inherit no-underline transition-colors hover:border-brand"
    >
      {p.icon}
      <span className="flex min-w-0 flex-col gap-1">
        <h3 className="m-0 text-base font-bold">{p.name}</h3>
        <p className="m-0 text-[15px] text-muted">{p.summary}</p>
        <span className="mt-0.5 flex flex-wrap gap-1.5">{p.tags}</span>
      </span>
    </a>
  )
}

function Letter({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="grid size-11 flex-none place-items-center rounded-[10px] bg-brand-soft font-mono font-bold text-brand"
    >
      {name.trim()[0]}
    </span>
  )
}

function Tag({ live, children }: { live?: boolean; children: ReactNode }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-px text-xs ${live ? 'border-transparent bg-ok-soft text-ok' : 'border-line bg-bg text-muted'}`}
    >
      {children}
    </span>
  )
}

function Section(p: { id: string; title: string; note: string; children: ReactNode }) {
  return (
    <section id={p.id} className="mt-10">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-line pb-2">
        <h2 className="m-0 text-lg font-bold">{p.title}</h2>
        <span className="text-sm text-faint">{p.note}</span>
      </div>
      <div className="flex flex-col gap-2.5">{p.children}</div>
    </section>
  )
}

const empty = <p className="text-sm text-faint">아직 없어요.</p>
const tools = Object.entries(config.tools)
const extensions = Object.entries(config.extensions)

export default function Hub() {
  return (
    <Layout
      nav={[
        { href: '#tools', label: '웹 도구' },
        { href: '#extensions', label: '확장 프로그램' },
        { href: site.repo, label: 'GitHub' },
      ]}
    >
      <p className="mb-1.5 font-mono text-[13px] tracking-wide text-faint">{config.domain}</p>
      <h1 className="mb-2.5 font-mono text-[40px] leading-tight font-bold tracking-tight">
        {site.title}
        <span
          aria-hidden="true"
          className="ml-0.5 animate-caret text-brand motion-reduce:animate-none"
        >
          _
        </span>
      </h1>
      <p className="mb-6 max-w-[60ch] text-lg text-muted">{site.tagline}</p>

      <Section id="tools" title="웹 도구" note="브라우저에서 바로 써요">
        {tools.length
          ? tools.map(([id, t]) => (
              <Card
                key={id}
                href={t.url || `/${id}/`}
                icon={<Letter name={t.name} />}
                name={t.name}
                summary={t.summary}
                tags={
                  <>
                    <Tag live>운영 중</Tag>
                    {t.tag && <Tag>{t.tag}</Tag>}
                  </>
                }
              />
            ))
          : empty}
      </Section>

      <Section
        id="extensions"
        title="Chrome 확장 프로그램"
        note="개발자 서버 없음 · 데이터는 브라우저 안에만"
      >
        {extensions.length
          ? extensions.map(([id, e]) => (
              <Card
                key={id}
                href={`/${id}/`}
                icon={
                  <img
                    src={`/${id}/icon.png`}
                    alt=""
                    className="size-11 flex-none rounded-[10px]"
                  />
                }
                name={e.name}
                summary={e.summary}
                tags={
                  <>
                    {e.storeUrl ? <Tag live>Chrome 웹 스토어</Tag> : <Tag>스토어 등록 준비 중</Tag>}
                    <Tag>개인정보처리방침</Tag>
                  </>
                }
              />
            ))
          : empty}
      </Section>

      <Footer>
        <span>
          소스 코드: <a href={site.repo}>{site.repo}</a>
        </span>
        <span>
          문의: <Mail />
        </span>
      </Footer>
    </Layout>
  )
}
