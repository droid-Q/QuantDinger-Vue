<template>
  <div class="backtest-page" :class="{ 'theme-dark': isDarkTheme }" data-testid="backtest-center">
    <section class="hero-card">
      <div>
        <div class="eyebrow">{{ $t('strategyV2.apiBadge') }}</div>
        <h1>{{ $t('backtest-center.title') }}</h1>
        <p>{{ $t('strategyV2.manifestHint') }}</p>
      </div>
      <div class="hero-actions">
        <span class="hero-stat"><strong>{{ sources.length }}</strong>{{ $t('strategyV2.backtest.sources') }}</span>
        <span class="hero-stat"><strong>{{ history.length }}</strong>{{ $t('strategyV2.backtest.runs') }}</span>
        <a-button icon="reload" :loading="historyLoading" @click="refreshPage">
          {{ $t('backtest-center.refreshHistory') }}
        </a-button>
      </div>
    </section>

    <div class="workspace-grid">
      <section class="panel config-panel">
        <div class="panel-heading">
          <div>
            <span class="step-badge">1</span>
            <h2>{{ $t('strategyV2.sourceTitle') }}</h2>
          </div>
          <a-tag v-if="manifest" color="green">{{ $t('strategyV2.backtest.ready') }}</a-tag>
        </div>
        <a-select
          v-model="form.sourceId"
          class="full-width"
          show-search
          option-filter-prop="children"
          data-testid="backtest-source-select"
          :placeholder="$t('backtest-center.strategyPlaceholder')"
          @change="selectSource"
        >
          <a-select-option v-for="item in sources" :key="item.id" :value="item.id">
            {{ item.name }} · {{ sourceTypeLabel(item) }}
          </a-select-option>
        </a-select>

        <div v-if="manifest" class="manifest-card">
          <div class="manifest-title">
            <a-icon type="safety-certificate" />
            {{ $t('strategyV2.manifestTitle') }}
          </div>
          <div class="manifest-grid">
            <div><span>{{ $t('strategyV2.strategyType') }}</span><strong>{{ strategyTypeLabel }}</strong></div>
            <div><span>{{ $t('strategyV2.frequency') }}</span><strong>{{ manifestFrequency }}</strong></div>
            <div><span>{{ $t('strategyV2.markets') }}</span><strong>{{ (manifest.markets || []).join(', ') || '-' }}</strong></div>
            <div><span>{{ $t('strategyV2.universe') }}</span><strong>{{ universeLabel }}</strong></div>
          </div>
        </div>

        <div class="panel-heading runtime-heading">
          <div>
            <span class="step-badge">2</span>
            <h2>{{ $t('strategyV2.runtimeTitle') }}</h2>
          </div>
        </div>
        <p class="section-hint">{{ $t('strategyV2.runtimeHint') }}</p>
        <a-form layout="vertical">
          <div class="form-grid">
            <a-form-item :label="$t('backtest-center.startDate')">
              <a-date-picker v-model="form.startDate" class="full-width" />
            </a-form-item>
            <a-form-item :label="$t('backtest-center.endDate')">
              <a-date-picker v-model="form.endDate" class="full-width" />
            </a-form-item>
            <a-form-item :label="$t('backtest-center.initialCapital')">
              <a-input-number v-model="form.initialCapital" :min="10" class="full-width" />
            </a-form-item>
            <a-form-item :label="$t('backtest-center.commission')">
              <a-input-number v-model="form.commission" :min="0" :max="1" :step="0.0001" class="full-width" />
            </a-form-item>
            <a-form-item :label="$t('backtest-center.slippage')">
              <a-input-number v-model="form.slippage" :min="0" :max="1" :step="0.0001" class="full-width" />
            </a-form-item>
            <a-form-item :label="$t('strategyV2.leverageEnabled')">
              <div class="switch-row">
                <a-switch v-model="form.leverageEnabled" :disabled="!leverageAllowed" />
                <span>{{ leverageAllowed ? $t('strategyV2.backtest.optional') : $t('strategyV2.codeOwned') }}</span>
              </div>
            </a-form-item>
            <a-form-item v-if="form.leverageEnabled" :label="$t('strategyV2.leverageMultiplier')">
              <a-input-number v-model="form.leverage" :min="1" :max="maxLeverage" :step="0.5" class="full-width" />
            </a-form-item>
          </div>

          <div v-if="paramDefinitions.length" class="params-section">
            <div class="subheading">
              <h3>{{ $t('backtest-center.codeParams') }}</h3>
              <span>{{ $t('strategyV2.backtest.paramCount', { count: paramDefinitions.length }) }}</span>
            </div>
            <div class="form-grid">
              <a-form-item v-for="item in paramDefinitions" :key="item.name" :label="parameterLabel(item)">
                <a-switch
                  v-if="item.type === 'boolean'"
                  :checked="Boolean(params[item.name])"
                  @change="value => setParam(item.name, value)"
                />
                <a-input-number
                  v-else
                  :value="params[item.name]"
                  :min="item.min"
                  :max="item.max"
                  :step="item.step || 1"
                  class="full-width"
                  @change="value => setParam(item.name, value)"
                />
              </a-form-item>
            </div>
          </div>

          <a-button
            type="primary"
            block
            icon="thunderbolt"
            data-testid="run-backtest"
            :disabled="!manifest"
            :loading="running"
            @click="run"
          >
            {{ $t('backtest-center.runBacktest') }}
          </a-button>
        </a-form>
      </section>

      <section class="panel result-panel">
        <div class="panel-heading">
          <div>
            <span class="step-badge">3</span>
            <h2>{{ $t('backtest-center.resultOverview') }}</h2>
          </div>
          <span v-if="selectedRun" class="run-id">#{{ selectedRun.id || selectedRun.runId }}</span>
        </div>

        <div v-if="running" class="result-running" data-testid="backtest-running" aria-live="polite">
          <div class="running-icon"><a-icon type="loading" /></div>
          <h3>{{ $t('strategyV2.backtest.runningTitle') }}</h3>
          <p>{{ $t('strategyV2.backtest.runningDesc') }}</p>
          <strong>{{ $t('strategyV2.backtest.elapsed', { seconds: runElapsedSeconds }) }}</strong>
          <div class="running-contract">
            <span><a-icon type="check-circle" />{{ $t('strategyV2.backtest.sourceCheck') }}</span>
            <span><a-icon type="database" />{{ $t('strategyV2.backtest.serverExecution') }}</span>
            <span><a-icon type="safety-certificate" />{{ $t('strategyV2.backtest.auditBeforeReturn') }}</span>
          </div>
        </div>

        <div v-else-if="!result" class="result-empty" data-testid="backtest-empty">
          <div class="empty-orbit"><a-icon type="line-chart" /></div>
          <h3>{{ manifest ? $t('strategyV2.backtest.readyTitle') : $t('strategyV2.backtest.selectTitle') }}</h3>
          <p>{{ manifest ? $t('strategyV2.backtest.readyDesc') : $t('backtest-center.emptyResult') }}</p>
          <div class="empty-checks">
            <span :class="{ done: manifest }"><a-icon :type="manifest ? 'check-circle' : 'clock-circle'" />{{ $t('strategyV2.backtest.sourceCheck') }}</span>
            <span><a-icon type="safety-certificate" />{{ $t('strategyV2.backtest.safeFill') }}</span>
            <span><a-icon type="database" />{{ $t('strategyV2.backtest.persisted') }}</span>
          </div>
        </div>

        <template v-else>
          <div class="result-trustbar" :class="resultTrustTone">
            <div>
              <a-icon :type="resultTrustIcon" />
              <strong>{{ resultStatusLabel }}</strong>
              <span>{{ resultStatusHint }}</span>
            </div>
            <div class="trust-badges">
              <a-tag :color="result.audit && result.audit.passed ? 'green' : 'red'">{{ auditLabel }}</a-tag>
              <a-tag color="blue">{{ provenanceLabel }}</a-tag>
            </div>
          </div>

          <div class="metrics-grid" data-testid="backtest-metrics">
            <div v-for="item in metrics" :key="item.key" class="metric-card">
              <span>{{ item.label }}</span>
              <strong :class="item.tone">{{ item.value }}</strong>
            </div>
          </div>

          <div v-if="equityPoints.length" class="chart-card">
            <div class="subheading">
              <div>
                <h3>{{ $t('strategyV2.backtest.equityCurve') }}</h3>
                <span class="benchmark-caption">{{ benchmarkCaption }}</span>
              </div>
              <span>{{ curveRange }}</span>
            </div>
            <div ref="equityChart" class="equity-chart" role="img" />
          </div>

          <div v-if="result.executionAssumptions" class="assumption-strip">
            <div><span>{{ $t('strategyV2.backtest.engine') }}</span><strong>{{ $t('strategyV2.backtest.engineV2') }}</strong></div>
            <div><span>{{ $t('strategyV2.backtest.fillRule') }}</span><strong>{{ $t('strategyV2.backtest.fillRuleNextOpen') }}</strong></div>
            <div><span>{{ $t('backtest-center.commission') }}</span><strong>{{ formatRate(result.executionAssumptions.commission) }}</strong></div>
            <div><span>{{ $t('backtest-center.slippage') }}</span><strong>{{ formatRate(result.executionAssumptions.slippage) }}</strong></div>
          </div>

          <a-tabs class="result-tabs" default-active-key="closed">
            <a-tab-pane key="closed" :tab="$t('strategyV2.backtest.closedTradesTab', { count: tradeRows.length })">
              <a-empty v-if="!tradeRows.length" :description="$t('strategyV2.backtest.noClosedTrades')" />
              <a-table
                v-else
                :columns="tradeColumns"
                :data-source="tradeRows"
                :row-key="(row, index) => row.id || index"
                size="small"
                :scroll="{ x: 880 }"
                :pagination="{ pageSize: 8 }"
              />
            </a-tab-pane>
            <a-tab-pane key="executions" :tab="$t('strategyV2.backtest.executionsTab', { count: executionRows.length })">
              <a-empty v-if="!executionRows.length" :description="$t('strategyV2.backtest.noExecutions')" />
              <a-table
                v-else
                :columns="executionColumns"
                :data-source="executionRows"
                :row-key="(row, index) => row.id || index"
                size="small"
                :scroll="{ x: 980 }"
                :pagination="{ pageSize: 8 }"
              />
            </a-tab-pane>
          </a-tabs>
        </template>
      </section>
    </div>

    <section class="panel history-panel" data-testid="backtest-history">
      <div class="history-title-row">
        <div>
          <h2>{{ $t('strategyV2.backtest.historyTitle') }}</h2>
          <p>{{ $t('strategyV2.backtest.historyDesc') }}</p>
        </div>
        <a-spin v-if="historyLoading" size="small" />
      </div>
      <a-empty v-if="!historyLoading && !history.length" :description="$t('strategyV2.backtest.noHistory')" />
      <div v-else class="run-grid">
        <button
          v-for="item in history"
          :key="item.id"
          type="button"
          class="run-card"
          :class="{ active: selectedRun && Number(selectedRun.id || selectedRun.runId) === Number(item.id) }"
          @click="openRun(item)"
        >
          <span class="run-card__top"><strong>{{ item.strategy_name || item.symbol }}</strong><em>#{{ item.id }}</em></span>
          <span class="run-card__meta">{{ item.market }} · {{ item.timeframe }} · {{ formatDate(item.created_at) }}</span>
          <span class="run-card__status" :class="`status-${item.result_status || 'unknown'}`">{{ historyStatusLabel(item) }}</span>
          <span class="run-card__metrics">
            <b :class="historyReturnTone(item)">{{ formatPercent(item.total_return) }}</b>
            <small>{{ $t('strategyV2.backtest.executions') }} {{ item.total_executions || 0 }} · {{ $t('strategyV2.backtest.closedTrades') }} {{ item.total_trades || 0 }}</small>
          </span>
        </button>
      </div>
    </section>
  </div>
</template>

<script>
import * as echarts from 'echarts'
import moment from 'moment'
import { mapState } from 'vuex'
import {
  compileScriptSource,
  getScriptSourceDetail,
  getScriptSourceList,
  getStrategyBacktestHistory,
  getStrategyBacktestRun,
  runStrategyBacktest
} from '@/api/strategy'

export default {
  name: 'BacktestCenter',
  data () {
    return {
      sources: [],
      history: [],
      source: null,
      manifest: null,
      params: {},
      result: null,
      selectedRun: null,
      running: false,
      runElapsedSeconds: 0,
      runTimer: null,
      historyLoading: false,
      equityChart: null,
      chartResizeObserver: null,
      form: {
        sourceId: null,
        startDate: moment().subtract(1, 'year'),
        endDate: moment(),
        initialCapital: 10000,
        commission: 0.0005,
        slippage: 0.0005,
        leverageEnabled: false,
        leverage: 1
      }
    }
  },
  computed: {
    ...mapState({ navTheme: state => state.app.theme }),
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    leverageAllowed () {
      return Boolean(this.manifest && this.manifest.leverageAllowed)
    },
    maxLeverage () {
      return Number((this.manifest && this.manifest.maxLeverage) || 1)
    },
    manifestFrequency () {
      const subscriptions = (this.manifest && this.manifest.subscriptions) || []
      return (this.manifest && this.manifest.primaryFrequency) || (subscriptions[0] && subscriptions[0].frequency) || '-'
    },
    strategyTypeLabel () {
      const type = String((this.manifest && this.manifest.strategyType) || 'cta')
      return this.$t(type === 'portfolio' ? 'strategyV2.portfolio' : 'strategyV2.cta')
    },
    universeLabel () {
      const universe = (this.manifest && this.manifest.universe) || {}
      if (universe.reference) return universe.reference
      return this.$t('strategyV2.symbolCount', { count: (universe.instruments || []).length })
    },
    paramDefinitions () {
      const schema = this.parseObject(this.source && this.source.param_schema)
      return Array.isArray(schema.params) ? schema.params : []
    },
    metrics () {
      if (!this.result) return []
      return [
        { key: 'return', label: this.$t('backtest-center.metrics.totalReturn'), value: this.formatPercent(this.result.totalReturn), tone: Number(this.result.totalReturn) >= 0 ? 'positive' : 'negative' },
        { key: 'benchmark', label: this.$t('strategyV2.backtest.benchmarkReturn'), value: this.result.benchmarkStatus === 'available' ? this.formatPercent(this.result.benchmarkTotalReturn) : '-', tone: Number(this.result.benchmarkTotalReturn) >= 0 ? 'positive' : 'negative' },
        { key: 'excess', label: this.$t('strategyV2.backtest.excessReturn'), value: this.result.benchmarkStatus === 'available' ? this.formatPercent(this.result.excessReturn) : '-', tone: Number(this.result.excessReturn) >= 0 ? 'positive' : 'negative' },
        { key: 'drawdown', label: this.$t('backtest-center.metrics.maxDrawdown'), value: this.formatPercent(this.result.maxDrawdown), tone: 'negative' },
        { key: 'executions', label: this.$t('strategyV2.backtest.executions'), value: Number(this.result.totalExecutions || 0), tone: '' },
        { key: 'trades', label: this.$t('strategyV2.backtest.closedTrades'), value: Number(this.result.totalTrades || 0), tone: '' },
        { key: 'win', label: this.$t('backtest-center.metrics.winRate'), value: this.formatPercent(this.result.winRate, false), tone: '' },
        { key: 'sharpe', label: this.$t('backtest-center.metrics.sharpe'), value: this.formatNumber(this.result.sharpeRatio), tone: '' }
      ]
    },
    equityPoints () {
      return (this.result && this.result.equityCurve) || []
    },
    executionRows () {
      return (this.result && (this.result.executions || this.result.rawTrades)) || []
    },
    tradeRows () {
      return (this.result && (this.result.closedTrades || this.result.trades)) || []
    },
    tradeColumns () {
      return [
        { title: this.$t('backtest-center.symbol'), dataIndex: 'symbol', key: 'symbol', width: 150 },
        { title: this.$t('strategyV2.backtest.side'), dataIndex: 'side', key: 'side', width: 80 },
        { title: this.$t('backtest-center.quantity'), dataIndex: 'quantity', key: 'quantity', customRender: value => this.formatNumber(value, 4) },
        { title: this.$t('backtest-center.price'), dataIndex: 'exit_price', key: 'exit_price', customRender: value => this.formatNumber(value, 4) },
        { title: this.$t('strategyV2.totalProfit'), dataIndex: 'profit', key: 'profit', customRender: value => this.formatNumber(value) },
        { title: this.$t('strategyV2.backtest.reason'), dataIndex: 'close_reason', key: 'close_reason', width: 150 }
      ]
    },
    executionColumns () {
      return [
        { title: this.$t('strategyV2.backtest.signalTime'), dataIndex: 'signal_time', key: 'signal_time', width: 160, customRender: value => this.formatDate(value) },
        { title: this.$t('strategyV2.backtest.fillTime'), dataIndex: 'time', key: 'time', width: 160, customRender: value => this.formatDate(value) },
        { title: this.$t('backtest-center.symbol'), dataIndex: 'symbol', key: 'symbol', width: 160 },
        { title: this.$t('strategyV2.backtest.side'), dataIndex: 'side', key: 'side', width: 70 },
        { title: this.$t('backtest-center.quantity'), dataIndex: 'quantity', key: 'quantity', customRender: value => this.formatNumber(value, 6) },
        { title: this.$t('backtest-center.price'), dataIndex: 'price', key: 'price', customRender: value => this.formatNumber(value, 4) },
        { title: this.$t('backtest-center.commission'), dataIndex: 'commission', key: 'commission', customRender: value => this.formatNumber(value, 4) },
        { title: this.$t('strategyV2.backtest.reason'), dataIndex: 'reason', key: 'reason', width: 150 }
      ]
    },
    resultTrustTone () {
      if (!this.result || (this.result.audit && !this.result.audit.passed)) return 'is-error'
      if (this.result.resultStatus === 'no_signals' || this.result.resultStatus === 'open_position_only') return 'is-warning'
      return 'is-success'
    },
    resultTrustIcon () {
      return this.resultTrustTone === 'is-success' ? 'check-circle' : this.resultTrustTone === 'is-warning' ? 'exclamation-circle' : 'close-circle'
    },
    resultStatusLabel () {
      return this.$t(`strategyV2.backtest.status.${(this.result && this.result.resultStatus) || 'unknown'}`)
    },
    resultStatusHint () {
      return this.$t(`strategyV2.backtest.status.${(this.result && this.result.resultStatus) || 'unknown'}Hint`)
    },
    auditLabel () {
      return this.$t(this.result && this.result.audit && this.result.audit.passed ? 'strategyV2.backtest.auditPassed' : 'strategyV2.backtest.auditFailed')
    },
    provenanceLabel () {
      const provenance = (this.result && this.result.dataProvenance) || {}
      return this.$t(provenance.kind === 'market' ? 'strategyV2.backtest.marketData' : 'strategyV2.backtest.fixtureData')
    },
    benchmarkCaption () {
      if (!this.result || this.result.benchmarkStatus !== 'available') return this.$t('strategyV2.backtest.benchmarkUnavailable')
      const benchmark = this.result.benchmark || {}
      return this.$t('strategyV2.backtest.comparedWith', { symbol: benchmark.symbol || '-' })
    },
    curveRange () {
      const curve = (this.result && this.result.equityCurve) || []
      if (!curve.length) return ''
      return `${this.formatNumber(curve[0].value)} → ${this.formatNumber(curve[curve.length - 1].value)}`
    }
  },
  watch: {
    result () {
      this.$nextTick(this.renderEquityChart)
    },
    isDarkTheme () {
      this.$nextTick(this.renderEquityChart)
    }
  },
  async mounted () {
    await this.refreshPage()
    const routeSourceId = Number(this.$route.query.sourceId)
    const sourceId = routeSourceId || (this.sources[0] && Number(this.sources[0].id))
    if (sourceId) {
      this.form.sourceId = sourceId
      await this.selectSource(sourceId)
    }
    window.addEventListener('resize', this.resizeEquityChart)
  },
  beforeDestroy () {
    window.removeEventListener('resize', this.resizeEquityChart)
    this.stopRunTimer()
    if (this.chartResizeObserver) this.chartResizeObserver.disconnect()
    if (this.equityChart) this.equityChart.dispose()
  },
  methods: {
    renderEquityChart () {
      if (!this.$refs.equityChart || !this.equityPoints.length) {
        if (this.equityChart) this.equityChart.clear()
        return
      }
      if (!this.equityChart) {
        this.equityChart = echarts.init(this.$refs.equityChart)
        if (typeof ResizeObserver !== 'undefined') {
          this.chartResizeObserver = new ResizeObserver(this.resizeEquityChart)
          this.chartResizeObserver.observe(this.$refs.equityChart)
        }
      }
      const strategyData = this.equityPoints.map(item => [moment(item.time).valueOf(), Number(item.value)])
      const benchmarkData = ((this.result && this.result.benchmarkCurve) || []).map(item => [moment(item.time).valueOf(), Number(item.value)])
      const textColor = this.isDarkTheme ? '#a3a3a3' : '#64748b'
      const gridColor = this.isDarkTheme ? '#292929' : '#e9eef4'
      const strategyName = this.$t('strategyV2.backtest.strategyEquity')
      const benchmarkName = this.$t('strategyV2.backtest.spotBenchmark')
      const valueLabel = this.$t('strategyV2.backtest.equityValue')
      const series = [{
        name: strategyName,
        type: 'line',
        data: strategyData,
        showSymbol: false,
        smooth: false,
        sampling: 'lttb',
        lineStyle: { width: 2.2 },
        areaStyle: { opacity: 0.08 },
        emphasis: { focus: 'series' }
      }]
      if (benchmarkData.length) {
        series.push({
          name: benchmarkName,
          type: 'line',
          data: benchmarkData,
          showSymbol: false,
          smooth: false,
          sampling: 'lttb',
          lineStyle: { width: 1.7, type: 'dashed' },
          emphasis: { focus: 'series' }
        })
      }
      this.equityChart.setOption({
        animationDuration: 350,
        color: ['#52c41a', '#f5a623'],
        grid: { left: 12, right: 18, top: 46, bottom: 58, containLabel: true },
        legend: { top: 4, left: 4, textStyle: { color: textColor }, data: benchmarkData.length ? [strategyName, benchmarkName] : [strategyName] },
        tooltip: {
          trigger: 'axis',
          confine: true,
          backgroundColor: this.isDarkTheme ? 'rgba(15,15,15,.97)' : 'rgba(255,255,255,.98)',
          borderColor: this.isDarkTheme ? '#383838' : '#d9e0e8',
          textStyle: { color: this.isDarkTheme ? '#f8fafc' : '#17233d' },
          axisPointer: { type: 'cross', snap: true, label: { backgroundColor: '#334155' } },
          formatter: params => {
            if (!params || !params.length) return ''
            const timestamp = params[0].value[0]
            const rows = params.map(item => `${item.marker}${item.seriesName}<b>${this.formatNumber(item.value[1])}</b>`).join('<br>')
            return `<div class="backtest-tooltip"><strong>${moment(timestamp).format('YYYY-MM-DD HH:mm')}</strong><span>${valueLabel}</span><br>${rows}</div>`
          }
        },
        axisPointer: { link: [{ xAxisIndex: 'all' }] },
        xAxis: {
          type: 'time',
          boundaryGap: false,
          axisLine: { lineStyle: { color: gridColor } },
          axisLabel: { color: textColor, formatter: value => moment(value).format('YYYY-MM-DD') },
          splitLine: { show: false },
          axisPointer: { show: true }
        },
        yAxis: {
          type: 'value',
          scale: true,
          axisLabel: { color: textColor, formatter: value => Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 }) },
          splitLine: { lineStyle: { color: gridColor, type: 'dashed' } },
          axisPointer: { show: true, label: { formatter: params => this.formatNumber(params.value) } }
        },
        dataZoom: [
          { type: 'inside', xAxisIndex: 0, filterMode: 'none', zoomOnMouseWheel: true, moveOnMouseMove: true },
          { type: 'slider', xAxisIndex: 0, height: 22, bottom: 7, borderColor: 'transparent', backgroundColor: this.isDarkTheme ? '#0d0d0d' : '#f1f5f9', fillerColor: this.isDarkTheme ? 'rgba(82,196,26,.18)' : 'rgba(82,196,26,.12)', textStyle: { color: textColor }, showDetail: false }
        ],
        series
      }, true)
    },
    resizeEquityChart () {
      if (this.equityChart) this.equityChart.resize()
    },
    parseObject (value) {
      if (value && typeof value === 'object' && !Array.isArray(value)) return value
      if (typeof value !== 'string' || !value.trim()) return {}
      try { return JSON.parse(value) } catch (error) { return {} }
    },
    async refreshPage () {
      await Promise.all([this.loadSources(), this.loadHistory()])
    },
    async loadSources () {
      const response = await getScriptSourceList()
      this.sources = (response.data && response.data.items) || []
    },
    async loadHistory () {
      this.historyLoading = true
      try {
        const response = await getStrategyBacktestHistory({ limit: 24 })
        this.history = Array.isArray(response.data) ? response.data : []
      } finally {
        this.historyLoading = false
      }
    },
    async selectSource (sourceId) {
      this.result = null
      this.selectedRun = null
      this.form.leverageEnabled = false
      this.form.leverage = 1
      const response = await getScriptSourceDetail(sourceId)
      this.source = response.data
      const compiled = await compileScriptSource({ sourceId })
      this.manifest = compiled.data && compiled.data.manifest
      this.params = this.paramDefinitions.reduce((output, item) => {
        output[item.name] = item.default
        return output
      }, {})
    },
    sourceTypeLabel (item) {
      if (String(item.template_key || '').startsWith('robot_v2_')) return this.$t('strategyV2.robot')
      return this.$t(item.asset_type === 'portfolio_strategy' ? 'strategyV2.portfolio' : 'strategyV2.cta')
    },
    parameterLabel (item) {
      if (!item.labelKey) return item.name
      const label = this.$t(item.labelKey)
      return label === item.labelKey ? item.name : label
    },
    setParam (name, value) {
      this.params = { ...this.params, [name]: value }
    },
    startRunTimer () {
      this.stopRunTimer()
      this.runElapsedSeconds = 0
      const startedAt = Date.now()
      this.runTimer = window.setInterval(() => {
        this.runElapsedSeconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
      }, 1000)
    },
    stopRunTimer () {
      if (this.runTimer) window.clearInterval(this.runTimer)
      this.runTimer = null
    },
    async run () {
      if (!this.form.sourceId) {
        this.$message.warning(this.$t('strategyV2.sourceContractRequired'))
        return
      }
      this.running = true
      this.result = null
      this.selectedRun = null
      this.startRunTimer()
      try {
        const response = await runStrategyBacktest({
          sourceId: this.form.sourceId,
          startDate: this.form.startDate.format('YYYY-MM-DD'),
          endDate: this.form.endDate.format('YYYY-MM-DD'),
          initialCapital: this.form.initialCapital,
          commission: this.form.commission,
          slippage: this.form.slippage,
          leverageEnabled: this.form.leverageEnabled,
          leverage: this.form.leverageEnabled ? this.form.leverage : 1,
          params: this.params
        })
        this.result = response.data
        this.selectedRun = { id: response.data && response.data.runId }
        await this.loadHistory()
      } catch (error) {
        this.$message.error((error && error.backendMessage) || this.$t('strategyV2.backtest.runFailed'))
      } finally {
        this.stopRunTimer()
        this.running = false
      }
    },
    async openRun (item) {
      const response = await getStrategyBacktestRun(item.id)
      const run = response.data || {}
      this.selectedRun = run
      this.result = run.result || null
      if (run.source_id && Number(this.form.sourceId) !== Number(run.source_id)) {
        this.form.sourceId = Number(run.source_id)
        const detail = await getScriptSourceDetail(run.source_id)
        this.source = detail.data
        const compiled = await compileScriptSource({ sourceId: run.source_id })
        this.manifest = compiled.data && compiled.data.manifest
        this.params = run.params || {}
      }
    },
    formatPercent (value, signed = true) {
      const number = Number(value || 0)
      return `${signed && number > 0 ? '+' : ''}${number.toFixed(2)}%`
    },
    formatRate (value) {
      return `${(Number(value || 0) * 100).toFixed(3)}%`
    },
    formatNumber (value, digits = 2) {
      const number = Number(value || 0)
      if (!Number.isFinite(number)) return '∞'
      return number.toLocaleString(undefined, { minimumFractionDigits: digits, maximumFractionDigits: digits })
    },
    formatDate (value) {
      return value ? moment(value).format('YYYY-MM-DD HH:mm') : '-'
    },
    historyStatusLabel (item) {
      return this.$t(`strategyV2.backtest.status.${item.result_status || 'unknown'}`)
    },
    historyReturnTone (item) {
      if (item.result_status === 'no_signals') return 'neutral'
      return Number(item.total_return) >= 0 ? 'positive' : 'negative'
    }
  }
}
</script>

<style lang="less" scoped>
.backtest-page { min-height: 100%; padding: 18px 22px 28px; background: #f4f6f8; color: #182230; }
.hero-card, .panel { border: 1px solid #e4e9ef; border-radius: 12px; background: #fff; box-shadow: 0 10px 30px rgba(15, 35, 60, 0.055); }
.hero-card { display: flex; justify-content: space-between; align-items: center; gap: 22px; padding: 18px 22px; margin-bottom: 14px; }
.hero-card h1 { margin: 2px 0 4px; font-size: 24px; color: #17233d; }
.hero-card p, .section-hint, .history-title-row p { margin: 0; color: #718096; line-height: 1.55; }
.eyebrow { color: #52c41a; font-weight: 800; font-size: 11px; letter-spacing: 0.1em; text-transform: uppercase; }
.hero-actions { display: flex; align-items: center; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
.hero-stat { display: inline-flex; align-items: baseline; gap: 5px; padding: 7px 10px; border-radius: 8px; color: #718096; background: #f7f9fb; font-size: 12px; }
.hero-stat strong { color: #25364f; font-size: 16px; }
.workspace-grid { display: grid; grid-template-columns: minmax(340px, 420px) minmax(620px, 1fr); gap: 14px; align-items: start; }
.panel { padding: 18px; }
.config-panel { position: sticky; top: 74px; }
.panel-heading, .panel-heading > div, .subheading, .history-title-row, .history-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.panel-heading > div { justify-content: flex-start; }
.panel-heading h2, .history-title-row h2 { margin: 0; color: #17233d; font-size: 17px; }
.step-badge { display: inline-flex; width: 22px; height: 22px; align-items: center; justify-content: center; border-radius: 7px; color: #397d16; background: #f0f9e8; font-size: 11px; font-weight: 800; }
.runtime-heading { margin-top: 22px; }
.full-width { width: 100%; }
.manifest-card { margin-top: 12px; padding: 13px; border: 1px solid #dfe8f1; border-radius: 9px; background: #f8fbff; }
.manifest-title { display: flex; align-items: center; gap: 7px; margin-bottom: 10px; color: #315c85; font-weight: 700; }
.manifest-grid, .metrics-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.manifest-grid div, .metric-card { display: flex; flex-direction: column; gap: 3px; }
.manifest-grid span, .metric-card span, .assumption-strip span { color: #7c8ca1; font-size: 11px; }
.manifest-grid strong { color: #23344d; overflow-wrap: anywhere; }
.section-hint { margin: 7px 0 10px; font-size: 12px; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 12px; }
.switch-row { display: flex; align-items: center; gap: 8px; min-height: 32px; color: #7c8ca1; font-size: 11px; }
.params-section { margin: 2px 0 14px; padding-top: 12px; border-top: 1px solid #eef2f6; }
.subheading h3 { margin: 0; color: #26364c; font-size: 14px; }
.subheading span { color: #7c8ca1; font-size: 11px; }
.metrics-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.metric-card { padding: 13px; border: 1px solid #edf0f4; border-radius: 9px; background: #f7f9fc; }
.metric-card strong { font-size: 20px; color: #20324a; }
.positive { color: #16a34a !important; }
.negative { color: #dc2626 !important; }
.neutral { color: #94a3b8 !important; }
.run-id { color: #8a97aa; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }
.result-empty { min-height: 390px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 30px; text-align: center; }
.result-running { min-height: 390px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; padding: 30px; text-align: center; color: #718096; }
.result-running h3 { margin: 4px 0 0; color: #17233d; font-size: 18px; }
.result-running p { max-width: 620px; margin: 0; line-height: 1.6; }
.result-running > strong { color: #3f7f1f; font-variant-numeric: tabular-nums; }
.running-icon { display: inline-flex; width: 64px; height: 64px; align-items: center; justify-content: center; border: 1px solid #d9f7be; border-radius: 22px; color: #52c41a; background: #f6ffed; font-size: 27px; }
.running-contract { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 7px; }
.running-contract span { display: inline-flex; align-items: center; gap: 6px; padding: 6px 9px; border: 1px solid #e4e9ef; border-radius: 999px; color: #64748b; font-size: 11px; }
.empty-orbit { display: inline-flex; width: 68px; height: 68px; align-items: center; justify-content: center; border: 1px solid #dce8d5; border-radius: 22px; color: #52c41a; background: #f6ffed; font-size: 28px; transform: rotate(-4deg); }
.result-empty h3 { margin: 17px 0 5px; color: #23344d; font-size: 17px; }
.result-empty p { max-width: 480px; margin: 0; color: #7c8ca1; }
.empty-checks { display: flex; justify-content: center; gap: 9px; flex-wrap: wrap; margin-top: 20px; }
.empty-checks span { display: inline-flex; align-items: center; gap: 5px; padding: 6px 9px; border: 1px solid #e7ebf0; border-radius: 999px; color: #7c8ca1; font-size: 11px; }
.empty-checks span.done { color: #3f7f1f; border-color: #d9f7be; background: #f6ffed; }
.result-trustbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 12px; padding: 10px 12px; border: 1px solid; border-radius: 9px; }
.result-trustbar > div:first-child { display: flex; min-width: 0; align-items: center; gap: 8px; }
.result-trustbar strong { white-space: nowrap; }
.result-trustbar span { overflow: hidden; color: #64748b; font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.result-trustbar.is-success { border-color: #b7eb8f; background: #f6ffed; color: #3f8600; }
.result-trustbar.is-warning { border-color: #ffe58f; background: #fffbe6; color: #ad6800; }
.result-trustbar.is-error { border-color: #ffccc7; background: #fff2f0; color: #cf1322; }
.trust-badges { display: flex; flex: none; }
.chart-card { margin-top: 14px; padding: 14px; border: 1px solid #edf0f4; border-radius: 9px; }
.subheading > div { min-width: 0; }
.benchmark-caption { display: block; margin-top: 3px; }
.equity-chart { display: block; width: 100%; height: 360px; margin-top: 8px; }
.assumption-strip { display: grid; grid-template-columns: 1fr 1.8fr 0.8fr 0.8fr; gap: 8px; margin-top: 12px; }
.assumption-strip div { min-width: 0; padding: 9px 10px; border-radius: 8px; background: #f8fafc; }
.assumption-strip strong { display: block; overflow: hidden; margin-top: 2px; color: #334155; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.result-tabs { margin-top: 14px; }
.history-header { margin: 16px 0 9px; }
.history-header h3 { margin: 0; color: #26364c; }
.history-title-row { align-items: flex-start; }
.history-title-row p { margin-top: 4px; font-size: 12px; }
.history-panel { margin-top: 14px; }
.run-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 9px; margin-top: 14px; }
.run-card { display: flex; min-width: 0; flex-direction: column; gap: 6px; padding: 11px; border: 1px solid #e6eaf0; border-radius: 9px; background: #fafbfc; color: inherit; text-align: left; cursor: pointer; transition: 0.16s ease; }
.run-card:hover, .run-card.active { border-color: #85ce62; background: #fbfff8; transform: translateY(-1px); }
.run-card__top, .run-card__metrics { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.run-card__top strong { min-width: 0; overflow: hidden; color: #2a3b52; text-overflow: ellipsis; white-space: nowrap; }
.run-card__top em { color: #9aa5b5; font-style: normal; font-size: 11px; }
.run-card__meta { overflow: hidden; color: #8491a4; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.run-card__status { width: fit-content; padding: 2px 6px; border-radius: 999px; color: #4d7c0f; background: #ecfccb; font-size: 9px; }
.run-card__status.status-no_signals, .run-card__status.status-open_position_only { color: #a16207; background: #fef3c7; }
.run-card__status.status-unknown { color: #64748b; background: #e2e8f0; }
.run-card__metrics b { font-size: 15px; }
.run-card__metrics small { color: #8491a4; }
.theme-dark.backtest-page { background: #080808; color: rgba(255, 255, 255, 0.88); }
.theme-dark .hero-card, .theme-dark .panel { border-color: rgba(255, 255, 255, 0.1); background: #111; box-shadow: 0 12px 34px rgba(0, 0, 0, 0.28); }
.theme-dark .hero-card h1, .theme-dark .panel-heading h2, .theme-dark .history-title-row h2, .theme-dark .subheading h3, .theme-dark .history-header h3, .theme-dark .result-empty h3, .theme-dark .result-running h3 { color: #f3f4f6; }
.theme-dark .hero-stat, .theme-dark .metric-card, .theme-dark .assumption-strip div, .theme-dark .run-card { border-color: rgba(255, 255, 255, 0.1); background: #0d0d0d; }
.theme-dark .hero-stat strong, .theme-dark .manifest-grid strong, .theme-dark .metric-card strong, .theme-dark .assumption-strip strong, .theme-dark .run-card__top strong { color: #e5e7eb; }
.theme-dark .manifest-card { border-color: rgba(255, 255, 255, 0.1); background: #0d0d0d; }
.theme-dark .manifest-title { color: #73d13d; }
.theme-dark .chart-card { border-color: rgba(255, 255, 255, 0.1); }
.theme-dark .result-trustbar.is-success { border-color: #315d22; background: #13200f; color: #73d13d; }
.theme-dark .result-trustbar.is-warning { border-color: #664d03; background: #211b08; color: #ffc53d; }
.theme-dark .result-trustbar.is-error { border-color: #6b2525; background: #251111; color: #ff7875; }
.theme-dark .result-trustbar span { color: rgba(255, 255, 255, 0.52); }
.theme-dark .run-card:hover, .theme-dark .run-card.active { border-color: #52c41a; background: #15230f; }
.theme-dark .result-running > strong { color: #73d13d; }
.theme-dark .running-icon { border-color: rgba(82, 196, 26, 0.38); background: #10190c; }
.theme-dark .running-contract span { border-color: rgba(255, 255, 255, 0.1); color: rgba(255, 255, 255, 0.58); background: #0d0d0d; }
.theme-dark /deep/ .ant-form-item-label > label, .theme-dark /deep/ .ant-table { color: rgba(255, 255, 255, 0.72); }
.theme-dark /deep/ .ant-table-thead > tr > th { border-color: rgba(255, 255, 255, 0.1); background: #0d0d0d; color: rgba(255, 255, 255, 0.68); }
.theme-dark /deep/ .ant-table-tbody > tr > td { border-color: rgba(255, 255, 255, 0.08); background: #111; color: rgba(255, 255, 255, 0.72); }
@media (max-width: 1380px) { .run-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); } }
@media (max-width: 1100px) { .workspace-grid { grid-template-columns: 1fr; } .config-panel { position: static; } .run-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 720px) { .backtest-page { padding: 12px; } .hero-card { align-items: flex-start; flex-direction: column; } .hero-actions { justify-content: flex-start; } .form-grid, .manifest-grid, .metrics-grid, .assumption-strip, .run-grid { grid-template-columns: 1fr; } }
</style>
