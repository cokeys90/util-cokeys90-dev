import raw from '../../release.config.json'

export type Tool = { name: string; summary: string; url?: string; tag?: string }
export type Extension = {
  name: string
  summary?: string
  storeUrl: string
  privacyUpdated: string
  /** 허브 카드 미리보기 이미지, site/<id>/ 기준 파일 이름 */
  thumb?: string
}

type Config = {
  site: { title: string; headline: string; tagline: string; repo: string }
  developer: string
  contactEmail: string
  domain: string
  tools: Record<string, Tool>
  extensions: Record<string, Extension>
}

export const config: Config = raw
