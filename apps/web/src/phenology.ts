export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

/** 季节按景区所在地计算；主题规则不替代现场物候观测。 */
export function seasonAt(timestamp: number): Season {
  const month = Number(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Shanghai', month: 'numeric' }).format(timestamp))
  return month >= 3 && month <= 5 ? 'spring' : month >= 6 && month <= 8 ? 'summer' : month >= 9 && month <= 11 ? 'autumn' : 'winter'
}

export function leafColor(percent: number | null, text = false): string {
  if (percent === null || !Number.isFinite(percent)) return text ? 'var(--ink-300)' : 'var(--paper-400)'
  const value = Math.max(0, Math.min(100, percent))
  const yellow = text ? 'var(--ginkgo-600)' : 'var(--ginkgo-400)'
  return value <= 50
    ? `color-mix(in srgb, var(--moss-600) ${100 - value * 2}%, ${yellow})`
    : `color-mix(in srgb, ${yellow} ${200 - value * 2}%, var(--leaf-text))`
}

export function autumnTone(percent: number | null) {
  return percent === null ? 'unknown' : percent < 25 ? 'green' : percent < 50 ? 'yellow' : percent < 75 ? 'turning' : 'red'
}

export function leafCaption(percent: number | null) {
  return percent === null ? '静候新的观测' : percent < 25 ? '青绿初章' : percent < 50 ? '金黄渐染' : percent < 75 ? '橘红入画' : '绯红正浓'
}
