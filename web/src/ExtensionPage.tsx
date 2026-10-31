import type { ReactNode } from 'react'
import { config } from './config'
import { Footer, Layout, Mail } from './Layout'

/** 확장 소개 페이지 공통 틀: 상단 메뉴, 아이콘·이름, 설치 버튼, 문의 */
export function ExtensionPage(p: { id: string; lead: string; children: ReactNode }) {
  const ext = config.extensions[p.id]
  const base = `/${p.id}/`
  return (
    <Layout
      nav={[
        { href: base, label: '소개', current: true },
        { href: `${base}privacy.html`, label: '개인정보처리방침' },
        { href: `${base}support.html`, label: '도움말' },
      ]}
    >
      <div className="mb-2 flex items-center gap-5">
        <img src={`${base}icon.png`} alt="" className="size-18 flex-none rounded-2xl" />
        <div>
          <h1 className="mb-2 text-[30px] leading-snug font-bold tracking-tight">{ext.name}</h1>
          <p className="m-0 text-sm text-faint">Chrome 확장 프로그램 · 무료</p>
        </div>
      </div>
      <p className="mb-6 max-w-[60ch] text-lg text-muted">{p.lead}</p>

      <div className="mt-6 mb-2 flex flex-wrap gap-2.5">
        {ext.storeUrl ? (
          <a className={btn.primary} href={ext.storeUrl}>
            Chrome 웹 스토어에서 설치
          </a>
        ) : (
          <a
            className={`${btn.primary} opacity-55`}
            aria-disabled="true"
            title="스토어 등록 후 열립니다"
          >
            Chrome 웹 스토어에서 설치
          </a>
        )}
        <a className={btn.base} href={`${base}support.html`}>
          사용법 보기
        </a>
      </div>

      {p.children}

      <Footer>
        <span>
          문의: <Mail />
        </span>
      </Footer>
    </Layout>
  )
}

const btnBase =
  'inline-flex items-center gap-2 rounded-[10px] border px-[18px] py-2.5 font-semibold no-underline'
const btn = {
  base: `${btnBase} border-line bg-surface text-fg`,
  primary: `${btnBase} border-brand bg-brand text-white`,
}

export function H2({ children }: { children: ReactNode }) {
  return <h2 className="mt-10 mb-2.5 text-xl font-bold">{children}</h2>
}

export function Card({
  title,
  ok,
  children,
}: {
  title?: string
  ok?: boolean
  children: ReactNode
}) {
  return (
    <div
      className={`rounded-2xl border px-5 py-[18px] ${ok ? 'my-4 border-transparent bg-ok-soft' : 'border-line bg-surface'}`}
    >
      {title && <h3 className="mb-1.5 text-base font-bold">{title}</h3>}
      <p className="m-0">{children}</p>
    </div>
  )
}

export function Features({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-3">
      {children}
    </div>
  )
}

export function Shot({ src, alt }: { src: string; alt: string }) {
  return <img src={src} alt={alt} className="my-4 block w-full rounded-xl border border-line" />
}
