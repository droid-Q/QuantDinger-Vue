import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const componentPath = fileURLToPath(
  new URL('../../src/views/backtest-center/index.vue', import.meta.url)
)
const source = fs.readFileSync(componentPath, 'utf8')

test('backtest center compiles a source manifest before accepting runtime controls', () => {
  assert.match(source, /compileScriptSource\(\{ sourceId \}\)/)
  assert.match(source, /this\.manifest = compiled\.data && compiled\.data\.manifest/)
  assert.match(source, /return Boolean\(this\.manifest && this\.manifest\.leverageAllowed\)/)
})

test('backtest center submits only the Strategy API V2 request contract', () => {
  assert.match(source, /runStrategyBacktest\(\{[\s\S]*?sourceId: this\.form\.sourceId[\s\S]*?startDate:[\s\S]*?endDate:[\s\S]*?params: this\.params/)
  assert.doesNotMatch(source, /strategy_config|script_params|strict_mode|strategy_code/)
})
