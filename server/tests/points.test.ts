import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  levelForPoints,
  levelText,
  nextLevel,
  pointsForPayFen,
} from '../src/lib/points.js'

test('每 1 元积 1 分，向下取整', () => {
  assert.equal(pointsForPayFen(0), 0)
  assert.equal(pointsForPayFen(99), 0)
  assert.equal(pointsForPayFen(100), 1)
  assert.equal(pointsForPayFen(6999), 69)
  assert.equal(pointsForPayFen(7000), 70)
  assert.equal(pointsForPayFen(-100), 0)
})

test('等级阈值：银卡 0、金卡 500、黑卡 2000', () => {
  assert.equal(levelForPoints(0), 'silver')
  assert.equal(levelForPoints(499), 'silver')
  assert.equal(levelForPoints(500), 'gold')
  assert.equal(levelForPoints(1999), 'gold')
  assert.equal(levelForPoints(2000), 'black')
  assert.equal(levelForPoints(99999), 'black')
  assert.equal(levelText('silver'), '银卡')
  assert.equal(levelText('gold'), '金卡')
  assert.equal(levelText('black'), '黑卡')
})

test('下一等级与差额', () => {
  assert.deepEqual(nextLevel(0), { level: { key: 'gold', name: '金卡', minPoints: 500 }, pointsToGo: 500 })
  assert.equal(nextLevel(499)?.level.key, 'gold')
  assert.equal(nextLevel(499)?.pointsToGo, 1)
  assert.equal(nextLevel(500)?.level.key, 'black')
  assert.equal(nextLevel(500)?.pointsToGo, 1500)
  assert.equal(nextLevel(2000), null)
})
