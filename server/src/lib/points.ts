/** 积分与会员等级（纯逻辑） */

export type MemberLevel = 'silver' | 'gold' | 'black'

export interface LevelDef {
  key: MemberLevel
  name: string
  minPoints: number
}

/** 等级定义：银卡 0 分、金卡 500 分、黑卡 2000 分 */
export const LEVELS: LevelDef[] = [
  { key: 'silver', name: '银卡', minPoints: 0 },
  { key: 'gold', name: '金卡', minPoints: 500 },
  { key: 'black', name: '黑卡', minPoints: 2000 },
]

export function levelText(level: string): string {
  return LEVELS.find((item) => item.key === level)?.name ?? level
}

/** 根据积分计算等级（自动升级；积分只增不减，等级不会下降） */
export function levelForPoints(points: number): MemberLevel {
  let current: MemberLevel = 'silver'
  for (const level of LEVELS) {
    if (points >= level.minPoints) {
      current = level.key
    }
  }
  return current
}

/** 下一等级信息；已是最高等级时 next 为 null */
export function nextLevel(points: number): { level: LevelDef; pointsToGo: number } | null {
  const currentIndex = LEVELS.findIndex((level) => level.key === levelForPoints(points))
  const next = LEVELS[currentIndex + 1]
  if (!next) {
    return null
  }
  return { level: next, pointsToGo: Math.max(0, next.minPoints - points) }
}

/** 每消费 1 元（100 分）积 1 分，向下取整 */
export function pointsForPayFen(payFen: number): number {
  if (!Number.isFinite(payFen) || payFen <= 0) {
    return 0
  }
  return Math.floor(payFen / 100)
}
