import raw from '../../release.config.json'

export type Tool = { name: string; summary: string; url?: string; tag?: string }
export type Extension = { name: string; summary?: string; storeUrl: string; privacyUpdated: string }

type Config = {
  site: { title: string; tagline: string; repo: string }
  developer: string
  contactEmail: string
  domain: string
  tools: Record<string, Tool>
  extensions: Record<string, Extension>
}

export const config: Config = raw
