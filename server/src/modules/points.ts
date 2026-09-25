import type { Db } from '../db/index.js'
import { levelForPoints, levelText, nextLevel, pointsForPayFen } from '../lib/points.js'
import { withTransaction } from '../db/tx.js'

export interface MemberProfile {
  id: number
  phone: string
  maskedPhone: string
  nickname: string
  points: number
  level: string
  levelText: string
  nextLevel: string | null
  nextLevelText: string | null
  pointsToNextLevel: number
  createdAt: string
}

/** 会员资料序列化（含等级进度） */
export function serializeMember(db: Db, member: {
  id: number
  phone: string
  nickname: string
  points: number
  level: string
  created_at: string
}): MemberProfile {
  const next = nextLevel(member.points)
  return {
    id: member.id,
    phone: member.phone,
    maskedPhone: `${member.phone.slice(0, 3)}****${member.phone.slice(7)}`,
    nickname: member.nickname,
    points: member.points,
    level: member.level,
    levelText: levelText(member.level),
    nextLevel: next?.level.key ?? null,
    nextLevelText: next?.level.name ?? null,
    pointsToNextLevel: next?.pointsToGo ?? 0,
    createdAt: member.created_at,
  }
}

/**
 * 支付成功后发放积分：每 1 元实付积 1 分，并自动更新等级。
 * 返回本次发放的积分数；实付不足 1 元时为 0。
 */
export function grantPointsForOrder(db: Db, memberId: number, orderId: number, payFen: number): number {
  const points = pointsForPayFen(payFen)
  if (points <= 0) {
    return 0
  }
  const now = new Date().toISOString()
  withTransaction(db, () => {
    db.prepare('UPDATE members SET points = points + ? WHERE id = ?').run(points, memberId)
    const row = db.prepare('SELECT points FROM members WHERE id = ?').get(memberId) as unknown as
      | { points: number }
      | undefined
    const level = levelForPoints(row?.points ?? 0)
    db.prepare('UPDATE members SET level = ? WHERE id = ?').run(level, memberId)
    db.prepare(
      'INSERT INTO points_logs (member_id, change, reason, order_id, created_at) VALUES (?, ?, ?, ?, ?)',
    ).run(memberId, points, '消费积分', orderId, now)
  })
  return points
}
