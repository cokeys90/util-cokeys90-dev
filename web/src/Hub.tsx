import { useState } from 'react'
import { config } from './config'
import { Footer, Layout, Mail } from './Layout'

const { site } = config

type Kind = 'tool' | 'extension'
type Item = {
  id: string
  kind: Kind
  name: string
  summary: string
  href: string
  external: boolean
  icon?: string
  thumb?: string
  tags: { label: string; live?: boolean }[]
}

// 도구·확장을 한 목록으로 (필터 탭이 kind 로 거름)
const items: Item[] = [
  ...Object.entries(config.tools).map(([id, t]) => ({
    id,
    kind: 'tool' as const,
    name: t.name,
    summary: t.summary,
    href: t.url || `/${id}/`,
    external: !!t.url,
    tags: [{ label: '운영 중', live: true }, ...(t.tag ? [{ label: t.tag }] : [])],
  })),
  ...Object.entries(config.extensions).map(([id, e]) => ({
    id,
    kind: 'extension' as const,
    name: e.name,
    summary: e.summary ?? '',
    href: `/${id}/`,
    external: false,
    icon: `/${id}/icon.png`,
    thumb: e.thumb && `/${id}/${e.thumb}`,
    tags: [
      e.storeUrl ? { label: 'Chrome 웹 스토어', live: true } : { label: '스토어 등록 준비 중' },
      { label: '개발자 서버 없음' },
    ],
  })),
]

const kindLabel: Record<Kind, string> = { tool: '웹 도구', extension: 'Chrome 확장' }
const filters: { key: 'all' | Kind; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'tool', label: '웹 도구' },
  { key: 'extension', label: '확장 프로그램' },
]

function Card({ item }: { item: Item }) {
  return (
    <a
      href={item.href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-surface text-inherit no-underline transition duration-200 hover:-translate-y-1 hover:border-fg/20 hover:shadow-lg hover:shadow-fg/10 focus-visible:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <div className="grid aspect-[2/1] place-items-center overflow-hidden border-b border-line bg-bg transition-colors duration-200 group-hover:bg-brand-soft/60">
        {item.thumb ? (
          <img
            src={item.thumb}
            alt=""
            className="size-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transition-none"
          />
        ) : item.icon ? (
          <img
            src={item.icon}
            alt=""
            className="size-14 rounded-2xl transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none"
          />
        ) : (
          <span
            aria-hidden="true"
            className="grid size-14 place-items-center rounded-2xl bg-surface font-mono text-xl font-bold text-brand shadow-sm transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none"
          >
            {item.name.trim()[0]}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 px-5 pt-4 pb-5">
        <div className="flex items-center justify-between gap-3 text-xs text-faint">
          <span>{kindLabel[item.kind]}</span>
          <span
            aria-hidden="true"
            className="transition-transform duration-200 group-hover:translate-x-1 group-hover:text-brand motion-reduce:transition-none"
          >
            {item.external ? '↗' : '→'}
          </span>
        </div>
        <h3 className="m-0 text-[17px] leading-snug font-bold">{item.name}</h3>
        <p className="m-0 text-sm text-muted">{item.summary}</p>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
          {item.tags.map((t) => (
            <span
              key={t.label}
              className={`rounded-full px-2.5 py-0.5 text-xs ${t.live ? 'bg-ok-soft text-ok' : 'bg-bg text-muted'}`}
            >
              {t.label}
            </span>
          ))}
        </div>
      </div>
    </a>
  )
}

export default function Hub() {
  const [filter, setFilter] = useState<'all' | Kind>('all')
  const shown = filter === 'all' ? items : items.filter((i) => i.kind === filter)

  return (
    <Layout wide nav={[{ href: site.repo, label: 'GitHub' }]}>
      <section className="max-w-[640px] pt-6 pb-12">
        <p className="mb-3 font-mono text-[13px] tracking-wide text-faint">{config.domain}</p>
        <h1 className="mb-4 font-mono text-[44px] leading-tight font-bold tracking-tight">
          {site.title}
          <span
            aria-hidden="true"
            className="ml-0.5 animate-caret text-brand motion-reduce:animate-none"
          >
            _
          </span>
        </h1>
        <p className="m-0 text-xl font-semibold text-fg">{site.headline}</p>
        <p className="mt-2 mb-0 text-base text-muted">{site.tagline}</p>
      </section>

      <div className="mb-6 border-b border-line pb-4">
        <div role="group" aria-label="종류로 거르기" className="flex flex-wrap gap-1.5">
          {filters.map((f) => {
            const count =
              f.key === 'all' ? items.length : items.filter((i) => i.kind === f.key).length
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={filter === f.key}
                onClick={() => setFilter(f.key)}
                className="cursor-pointer rounded-full border border-line bg-surface px-3.5 py-1.5 text-sm text-muted transition-colors hover:border-fg/30 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand aria-pressed:border-fg aria-pressed:bg-fg aria-pressed:text-surface"
              >
                {f.label}
                <span className="ml-1.5 text-xs opacity-60">{count}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-5">
        {shown.map((item) => (
          <Card key={item.id} item={item} />
        ))}
      </div>
      {shown.length === 0 && <p className="text-sm text-faint">아직 없어요.</p>}

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
