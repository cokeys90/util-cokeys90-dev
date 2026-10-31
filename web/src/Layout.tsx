import type { ReactNode } from 'react'
import { config } from './config'

const container = 'mx-auto max-w-[760px] px-5'

type NavItem = { href: string; label: string; current?: boolean }

export function Layout({ nav, children }: { nav: NavItem[]; children: ReactNode }) {
  return (
    <>
      <header className="border-b border-line bg-surface">
        <div className={`${container} flex items-center justify-between gap-3 py-3.5`}>
          <a className="font-mono font-bold text-fg no-underline" href="/">
            {config.site.title}
          </a>
          <nav className="flex gap-4 text-sm">
            {nav.map((n) => (
              <a
                key={n.href}
                href={n.href}
                aria-current={n.current ? 'page' : undefined}
                className="text-muted no-underline hover:text-fg aria-[current=page]:text-fg"
              >
                {n.label}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <main className={`${container} pt-10 pb-20`}>{children}</main>
    </>
  )
}

export function Footer({ children }: { children: ReactNode }) {
  return (
    <div className="mt-14 flex flex-wrap gap-x-5 gap-y-1.5 border-t border-line pt-5 text-sm text-faint [&_a]:break-all">
      {children}
    </div>
  )
}

export function Mail() {
  return <a href={`mailto:${config.contactEmail}`}>{config.contactEmail}</a>
}
