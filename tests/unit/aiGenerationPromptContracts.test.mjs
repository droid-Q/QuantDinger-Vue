import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const read = relativePath => fs.readFileSync(
  fileURLToPath(new URL(relativePath, import.meta.url)),
  'utf8'
)

const strategyIde = read('../../src/views/strategy-ide/index.vue')
const copilot = read('../../src/views/ai-analysis/components/CopilotWorkbench.vue')
const overrides = read('../../src/locales/copilot-overrides.js')

test('indicator conversion prompt protects direction, edge, execution, and risk semantics', () => {
  assert.match(strategyIde, /classify every marker as long entry, long exit, short entry, short exit/)
  assert.match(strategyIde, /For edge\(A \| B\), compare the complete previous composite/)
  assert.match(strategyIde, /The strategy source owns its universe, markets, subscriptions, frequency/)
  assert.match(strategyIde, /Orders from handle_data are filled by the engine on the next available bar open/)
  assert.match(strategyIde, /attach explicit protection rules to entries/)
})

test('copilot builds workflow-specific artifact rules instead of mixing indicator and strategy rules', () => {
  assert.match(copilot, /const artifactRules = isIndicatorWorkflow/)
  assert.match(copilot, /\.\.\.artifactRules/)
  assert.match(copilot, /Timeframe remains owned by the run panel/)
})

test('English prompt overrides identify the indicator workflow as chart-only', () => {
  assert.match(
    overrides,
    /"aiAssetAnalysis\.copilot\.nativeStrategyPrompt\.workflowIndicator": "QuantDinger Chart Indicator"/
  )
  assert.doesNotMatch(
    overrides,
    /"aiAssetAnalysis\.copilot\.nativeStrategyPrompt\.workflowIndicator": "QuantDinger Python Strategy API V2"/
  )
})
