<template>
  <div class="executor-page" :class="{ 'theme-dark': isDarkTheme, 'is-embedded': embedded }">
    <header v-if="!embedded" class="executor-header">
      <div>
        <div class="executor-kicker">{{ t('executorStrategies.kicker') }}</div>
        <h1>{{ t('executorStrategies.title') }}</h1>
        <p>{{ t('executorStrategies.subtitle') }}</p>
      </div>
      <div class="executor-header-actions">
        <a-button icon="reload" :loading="loadingTemplates" @click="loadTemplates">{{ t('executorStrategies.reload') }}</a-button>
        <a-button type="primary" icon="plus" :loading="creating" @click="createStrategy">{{ t('executorStrategies.create') }}</a-button>
      </div>
    </header>

    <main class="executor-workbench">
      <aside class="executor-catalog">
        <div class="panel-title panel-title--between">
          <span><a-icon type="appstore" />{{ t('executorStrategies.catalog') }}</span>
          <span v-if="embedded" class="safe-mode-pill">
            <a-icon type="safety-certificate" />
            {{ t('executorStrategies.signal') }}
          </span>
        </div>
        <button
          v-for="item in executorCatalog"
          :key="item.key"
          type="button"
          class="catalog-item"
          :data-testid="`robot-template-${item.key}`"
          :class="{ active: form.executor_type === item.key, disabled: item.disabled }"
          :disabled="item.disabled"
          @click="selectExecutor(item.key)"
        >
          <span class="catalog-icon"><a-icon :type="item.icon" /></span>
          <span class="catalog-copy">
            <strong>{{ t(item.titleKey) }}</strong>
            <small>{{ t(item.descKey) }}</small>
          </span>
          <a-tag :color="item.disabled ? 'default' : 'green'">{{ t(item.badgeKey) }}</a-tag>
        </button>
      </aside>

      <section class="executor-config-panel">
        <div class="panel-title panel-title--between">
          <span><a-icon type="setting" />{{ t('executorStrategies.config') }}</span>
          <a-tag color="green">{{ executorTypeText(form.executor_type) }}</a-tag>
        </div>

        <div class="executor-config-scroll">
          <div class="section-title">{{ t('executorStrategies.section.market') }}</div>
          <div class="field-grid">
            <div class="field-block">
              <label>{{ t('executorStrategies.symbol') }}</label>
              <a-select
                v-model="form.symbol"
                show-search
                option-filter-prop="children"
                :loading="loadingWatchlist"
                :not-found-content="t('executorStrategies.watchlistEmpty')">
                <a-select-option
                  v-for="item in watchlistOptions"
                  :key="`${item.market}:${item.symbol}`"
                  :value="item.symbol">
                  {{ item.symbol }}<span v-if="item.name"> · {{ item.name }}</span>
                </a-select-option>
              </a-select>
            </div>
            <div v-if="!embedded" class="field-block">
              <label>{{ t('executorStrategies.executionMode') }}</label>
              <a-radio-group v-model="form.execution_mode" button-style="solid">
                <a-radio-button value="signal">{{ t('executorStrategies.signal') }}</a-radio-button>
                <a-radio-button value="live">{{ t('executorStrategies.live') }}</a-radio-button>
              </a-radio-group>
            </div>
          </div>

          <div class="field-grid">
            <div class="field-block">
              <label>{{ t('executorStrategies.side') }}</label>
              <a-radio-group v-model="form.side" button-style="solid" @change="handleSideChange">
                <a-radio-button value="long">{{ t('executorStrategies.long') }}</a-radio-button>
                <a-radio-button value="short" :disabled="form.market_type === 'spot'">{{ t('executorStrategies.short') }}</a-radio-button>
                <a-radio-button
                  v-if="form.executor_type === 'grid'"
                  value="neutral"
                  :disabled="form.market_type === 'spot'">
                  {{ t('executorStrategies.neutral') }}
                </a-radio-button>
              </a-radio-group>
            </div>
            <div class="field-block">
              <label>{{ t('executorStrategies.marketType') }}</label>
              <a-select v-model="form.market_type" @change="handleMarketTypeChange">
                <a-select-option value="swap">{{ t('executorStrategies.swap') }}</a-select-option>
                <a-select-option value="spot">{{ t('executorStrategies.spot') }}</a-select-option>
              </a-select>
            </div>
          </div>

          <div v-if="!embedded && form.execution_mode === 'live'" class="executor-live-account">
            <div class="field-block">
              <label>{{ t('trading-assistant.form.savedCredential') }}</label>
              <div class="executor-live-account__row">
                <a-select
                  v-model="form.credential_id"
                  allow-clear
                  show-search
                  option-filter-prop="children"
                  :loading="loadingCredentials"
                  :placeholder="t('trading-assistant.placeholders.selectSavedCredential')">
                  <a-select-option
                    v-for="credential in cryptoCredentials"
                    :key="credential.id"
                    :value="credential.id">
                    {{ credentialLabel(credential) }}
                  </a-select-option>
                </a-select>
                <a-button icon="bank" @click="$router.push('/broker-accounts')">
                  {{ t('menu.dashboard.brokerAccounts') }}
                </a-button>
              </div>
            </div>
            <a-alert
              v-if="!loadingCredentials && !cryptoCredentials.length"
              type="warning"
              show-icon
              :message="t('trading-assistant.noCredentialForLive.title')"
              :description="t('trading-assistant.noCredentialForLive.desc')" />
          </div>

          <div class="section-title">{{ t('executorStrategies.section.capitalRisk') }}</div>
          <div class="field-grid">
            <div class="field-block">
              <label>{{ t('executorStrategies.initialCapital') }}</label>
              <a-input-number v-model="form.initial_capital" :min="10" :step="100" :precision="2" style="width: 100%" />
            </div>
            <div class="field-block">
              <label>{{ t('executorStrategies.leverage') }}</label>
              <a-input-number v-model="form.leverage" :min="1" :max="form.market_type === 'spot' ? 1 : 125" :disabled="form.market_type === 'spot'" style="width: 100%" />
            </div>
          </div>

          <div class="field-grid">
            <div class="field-block">
              <label>{{ t('executorStrategies.takeProfitPct') }}</label>
              <a-input-number
                v-model="takeProfitPctDisplay"
                :min="0"
                :max="100"
                :step="0.1"
                :precision="3"
                style="width: 100%"
                @change="value => setRatio('take_profit_pct', value)" />
            </div>
            <div class="field-block">
              <label>{{ t('executorStrategies.hardStopPct') }}</label>
              <a-input-number
                v-model="hardStopPctDisplay"
                :min="0"
                :max="100"
                :step="0.1"
                :precision="3"
                style="width: 100%"
                @change="value => setRatio('hard_stop_pct', value)" />
            </div>
          </div>

          <div class="section-title">{{ t('executorStrategies.section.executor') }}</div>
          <div v-if="form.executor_type === 'grid'" class="executor-specific">
            <div class="field-grid">
              <div class="field-block">
                <label>{{ t('executorStrategies.startPrice') }}</label>
                <a-input-number v-model="form.start_price" :min="0" :step="100" :precision="4" style="width: 100%" />
              </div>
              <div class="field-block">
                <label>{{ t('executorStrategies.endPrice') }}</label>
                <a-input-number v-model="form.end_price" :min="0" :step="100" :precision="4" style="width: 100%" />
              </div>
            </div>
            <div class="field-grid field-grid--three">
              <div class="field-block">
                <label>{{ t('executorStrategies.totalAmount') }}</label>
                <a-input-number v-model="form.total_amount_quote" :min="0" :step="100" :precision="2" style="width: 100%" />
              </div>
              <div class="field-block">
                <label>{{ t('executorStrategies.gridCount') }}</label>
                <a-input-number v-model="form.grid_count" :min="1" :max="200" style="width: 100%" />
              </div>
              <div class="field-block">
                <label>
                  {{ t('executorStrategies.initialPositionPct') }}
                  <a-tooltip :title="t('executorStrategies.initialPositionHint')"><a-icon type="info-circle" /></a-tooltip>
                </label>
                <a-input-number
                  v-model="initialPositionPctDisplay"
                  :min="0"
                  :max="100"
                  :step="5"
                  :precision="1"
                  :disabled="form.side === 'neutral'"
                  style="width: 100%"
                  @change="value => setRatio('initial_position_pct', value)" />
              </div>
            </div>
            <div class="field-grid">
              <div class="field-block">
                <label>{{ t('executorStrategies.maxOpenOrders') }}</label>
                <a-input-number v-model="form.max_open_orders" :min="1" :max="50" style="width: 100%" />
              </div>
              <div class="field-block">
                <label>{{ t('executorStrategies.minSpread') }}</label>
                <a-input-number
                  v-model="minSpreadPctDisplay"
                  :min="0"
                  :max="20"
                  :step="0.01"
                  :precision="3"
                  style="width: 100%"
                  @change="value => setRatio('min_spread_between_orders', value)" />
              </div>
            </div>
            <div class="field-block">
              <label>{{ t('executorStrategies.gridMode') }}</label>
              <a-radio-group v-model="form.grid_mode" button-style="solid">
                <a-radio-button value="arithmetic">{{ t('executorStrategies.arithmetic') }}</a-radio-button>
                <a-radio-button value="geometric">{{ t('executorStrategies.geometric') }}</a-radio-button>
              </a-radio-group>
            </div>
          </div>

          <div v-else-if="form.executor_type === 'layered_martingale'" class="executor-specific">
            <div class="field-grid">
              <div class="field-block">
                <label>{{ t('executorStrategies.entryPrice') }}</label>
                <a-input-number v-model="form.entry_price" :min="0" :step="100" :precision="4" style="width: 100%" />
              </div>
              <div class="field-block">
                <label>{{ t('executorStrategies.layerCount') }}</label>
                <a-input-number v-model="form.layer_count" :min="1" :max="20" style="width: 100%" />
              </div>
            </div>
            <div class="field-grid">
              <div class="field-block">
                <label>{{ t('executorStrategies.ordersPerLayer') }}</label>
                <a-input-number v-model="form.orders_per_layer" :min="1" :max="10" style="width: 100%" />
              </div>
              <div class="field-block">
                <label>{{ t('executorStrategies.baseOrder') }}</label>
                <a-input-number v-model="form.base_order_size" :min="0" :step="10" :precision="2" style="width: 100%" />
              </div>
            </div>
            <div class="field-grid">
              <div class="field-block">
                <label>{{ t('executorStrategies.volumeMultiplier') }}</label>
                <a-input-number
                  v-model="form.volume_multiplier"
                  :min="1"
                  :max="10"
                  :step="0.1"
                  :precision="3"
                  style="width: 100%" />
              </div>
              <div class="field-block">
                <label>{{ t('executorStrategies.intraSpacing1') }}</label>
                <a-input-number
                  v-model="intraSpacing1PctDisplay"
                  :min="0"
                  :max="100"
                  :step="0.1"
                  :precision="3"
                  style="width: 100%"
                  @change="value => setRatio('intra_spacing_1_pct', value)" />
              </div>
            </div>
            <div class="field-grid">
              <div class="field-block">
                <label>{{ t('executorStrategies.intraSpacing2') }}</label>
                <a-input-number
                  v-model="intraSpacing2PctDisplay"
                  :min="0"
                  :max="100"
                  :step="0.1"
                  :precision="3"
                  style="width: 100%"
                  @change="value => setRatio('intra_spacing_2_pct', value)" />
              </div>
              <div class="field-block">
                <label>{{ t('executorStrategies.interSpacing1') }}</label>
                <a-input-number
                  v-model="interSpacing1PctDisplay"
                  :min="0"
                  :max="100"
                  :step="0.1"
                  :precision="3"
                  style="width: 100%"
                  @change="value => setRatio('inter_spacing_1_pct', value)" />
              </div>
            </div>
            <div class="field-grid">
              <div class="field-block">
                <label>{{ t('executorStrategies.interSpacing2') }}</label>
                <a-input-number
                  v-model="interSpacing2PctDisplay"
                  :min="0"
                  :max="100"
                  :step="0.1"
                  :precision="3"
                  style="width: 100%"
                  @change="value => setRatio('inter_spacing_2_pct', value)" />
              </div>
              <div class="field-block">
                <label>{{ t('executorStrategies.interSpacing3') }}</label>
                <a-input-number
                  v-model="interSpacing3PctDisplay"
                  :min="0"
                  :max="100"
                  :step="0.1"
                  :precision="3"
                  style="width: 100%"
                  @change="value => setRatio('inter_spacing_3_pct', value)" />
              </div>
            </div>
            <div class="field-block">
              <label>{{ t('executorStrategies.interSpacing4') }}</label>
              <a-input-number
                v-model="interSpacing4PctDisplay"
                :min="0"
                :max="100"
                :step="0.1"
                :precision="3"
                style="width: 100%"
                @change="value => setRatio('inter_spacing_4_pct', value)" />
            </div>
          </div>

          <div v-else class="executor-specific">
            <div class="field-grid">
              <div class="field-block">
                <label>{{ t('executorStrategies.entryPrice') }}</label>
                <a-input-number v-model="form.entry_price" :min="0" :step="100" :precision="4" style="width: 100%" />
              </div>
              <div class="field-block">
                <label>{{ t('executorStrategies.maxLayers') }}</label>
                <a-input-number v-model="form.max_layers" :min="1" :max="20" style="width: 100%" />
              </div>
            </div>
            <div class="field-grid">
              <div class="field-block">
                <label>{{ t('executorStrategies.baseOrder') }}</label>
                <a-input-number v-model="form.base_order_size" :min="0" :step="10" :precision="2" style="width: 100%" />
              </div>
              <div class="field-block">
                <label>{{ t('executorStrategies.safetyOrder') }}</label>
                <a-input-number v-model="form.safety_order_size" :min="0" :step="10" :precision="2" style="width: 100%" />
              </div>
            </div>
            <div class="field-grid">
              <div class="field-block">
                <label>{{ t('executorStrategies.priceDeviationPct') }}</label>
                <a-input-number
                  v-model="priceDeviationPctDisplay"
                  :min="0"
                  :max="100"
                  :step="0.1"
                  :precision="3"
                  style="width: 100%"
                  @change="value => setRatio('price_deviation_pct', value)" />
              </div>
              <div class="field-block">
                <label>{{ t('executorStrategies.volumeMultiplier') }}</label>
                <a-input-number
                  v-model="form.volume_multiplier"
                  :min="1"
                  :max="10"
                  :step="0.1"
                  :precision="3"
                  style="width: 100%" />
              </div>
            </div>
            <div class="field-block">
              <label>{{ t('executorStrategies.stepMultiplier') }}</label>
              <a-input-number
                v-model="form.step_multiplier"
                :min="1"
                :max="10"
                :step="0.1"
                :precision="3"
                style="width: 100%" />
            </div>
          </div>

          <a-collapse class="advanced-collapse" :bordered="false">
            <a-collapse-panel key="advanced" :header="t('executorStrategies.advanced')">
              <div class="field-grid">
                <div class="field-block">
                  <label>{{ t('executorStrategies.samplingInterval') }}</label>
                  <a-select v-model="form.timeframe">
                    <a-select-option value="1m">1m</a-select-option>
                    <a-select-option value="5m">5m</a-select-option>
                    <a-select-option value="15m">15m</a-select-option>
                    <a-select-option value="1H">1H</a-select-option>
                  </a-select>
                </div>
                <div class="field-block">
                  <label>{{ t('executorStrategies.name') }}</label>
                  <a-input v-model="form.strategy_name" :placeholder="t('executorStrategies.namePlaceholder')" />
                </div>
              </div>
            </a-collapse-panel>
          </a-collapse>
        </div>

        <div class="config-actions">
          <a-button icon="eye" :loading="previewing" @click="refreshPreview">{{ t('executorStrategies.preview') }}</a-button>
          <a-button type="primary" icon="code" :loading="creating" :disabled="!canCreate" @click="createStrategy">
            {{ t(embedded ? 'executorStrategies.generateCode' : 'executorStrategies.create') }}
          </a-button>
        </div>
      </section>

      <section class="executor-preview-panel">
        <div class="panel-title panel-title--between">
          <span><a-icon type="profile" />{{ t('executorStrategies.previewTitle') }}</span>
          <a-tag v-if="preview.executor_type" color="green">{{ executorTypeText(preview.executor_type) }}</a-tag>
        </div>

        <div class="summary-grid">
          <div class="summary-cell">
            <span>{{ t('executorStrategies.summary.levels') }}</span>
            <strong>{{ summary.level_count || 0 }}</strong>
          </div>
          <div class="summary-cell">
            <span>{{ t('executorStrategies.summary.amount') }}</span>
            <strong>{{ fmtMoney(summary.total_amount_quote) }}</strong>
          </div>
          <div class="summary-cell">
            <span>{{ t('executorStrategies.summary.first') }}</span>
            <strong>{{ fmtPrice(summary.first_price) }}</strong>
          </div>
          <div class="summary-cell">
            <span>{{ t('executorStrategies.summary.last') }}</span>
            <strong>{{ fmtPrice(summary.last_price) }}</strong>
          </div>
        </div>

        <a-alert
          v-if="previewWarnings.length"
          class="warning-strip"
          type="warning"
          show-icon
          :message="previewWarnings.join(' / ')"
        />

        <a-table
          class="executor-level-table"
          size="small"
          :columns="columns"
          :data-source="levels"
          :pagination="{ pageSize: 12, size: 'small' }"
          row-key="level"
          :scroll="{ x: 860 }"
        >
          <template slot="level" slot-scope="text">
            <span class="mono">#{{ text }}</span>
          </template>
          <template slot="action" slot-scope="text">
            <a-tag :color="text === 'add' ? 'blue' : 'green'">{{ actionText(text) }}</a-tag>
          </template>
          <template slot="side" slot-scope="text">
            <a-tag :color="text === 'short' ? 'red' : 'green'">{{ sideText(text) }}</a-tag>
          </template>
          <template slot="money" slot-scope="text">
            <span class="mono">{{ fmtMoney(text) }}</span>
          </template>
          <template slot="price" slot-scope="text">
            <span class="mono">{{ fmtPrice(text) }}</span>
          </template>
          <template slot="pct" slot-scope="text">
            <span class="mono">{{ fmtPct(text) }}</span>
          </template>
        </a-table>

        <div class="executor-notes">
          <div>
            <a-icon type="safety-certificate" />
            <span>{{ t('executorStrategies.note.stateMachine') }}</span>
          </div>
          <div>
            <a-icon type="branches" />
            <span>{{ t('executorStrategies.note.sharedRuntime') }}</span>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import {
  createExecutorStrategy,
  generateExecutorStrategy,
  getExecutorTemplates,
  previewExecutorStrategy
} from '@/api/strategy'
import { listExchangeCredentials } from '@/api/credentials'
import { getWatchlist } from '@/api/market'
import { getExchangeDisplayName, isCryptoExchangeCredential } from '@/utils/exchangeCredential'

export default {
  name: 'ExecutorStrategies',
  props: {
    embedded: { type: Boolean, default: false }
  },
  data () {
    return {
      loadingTemplates: false,
      loadingCredentials: false,
      loadingWatchlist: false,
      previewing: false,
      previewRequestId: 0,
      creating: false,
      templates: [],
      credentials: [],
      watchlist: [],
      preview: {},
      form: this.defaultForm()
    }
  },
  computed: {
    ...mapState({
      navTheme: state => state.app.theme
    }),
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    userId () {
      const user = this.$store && this.$store.state && this.$store.state.user
      return (user && (user.id || user.userId || user.user_id || (user.info && (user.info.id || user.info.user_id)))) || 1
    },
    watchlistOptions () {
      const rows = (this.watchlist || []).filter(item => {
        const market = String((item && item.market) || '').toLowerCase()
        return item && item.symbol && (market === 'crypto' || String(item.symbol).includes('/'))
      })
      if (this.form.symbol && !rows.some(item => item.symbol === this.form.symbol)) {
        rows.unshift({ market: 'Crypto', symbol: this.form.symbol, name: '' })
      }
      return rows
    },
    executorCatalog () {
      return [
        { key: 'grid', icon: 'border', titleKey: 'executorStrategies.type.grid', descKey: 'executorStrategies.catalog.grid', badgeKey: 'executorStrategies.supported' },
        { key: 'dca', icon: 'ordered-list', titleKey: 'executorStrategies.type.dca', descKey: 'executorStrategies.catalog.dca', badgeKey: 'executorStrategies.supported' },
        { key: 'martingale', icon: 'rise', titleKey: 'executorStrategies.type.martingale', descKey: 'executorStrategies.catalog.martingale', badgeKey: 'executorStrategies.supported' },
        { key: 'layered_martingale', icon: 'partition', titleKey: 'executorStrategies.type.layered_martingale', descKey: 'executorStrategies.catalog.layered_martingale', badgeKey: 'executorStrategies.supported' }
      ]
    },
    summary () {
      return (this.preview && this.preview.summary) || {}
    },
    levels () {
      return (this.preview && this.preview.levels) || []
    },
    previewWarnings () {
      return ((this.preview && this.preview.warnings) || []).map(item => this.warningText(item))
    },
    cryptoCredentials () {
      return (this.credentials || []).filter(isCryptoExchangeCredential)
    },
    selectedCredential () {
      return this.cryptoCredentials.find(item => String(item.id) === String(this.form.credential_id || '')) || null
    },
    canCreate () {
      const hasSymbol = Boolean(String(this.form.symbol || '').trim())
      const hasLiveCredential = this.form.execution_mode !== 'live' || Boolean(this.selectedCredential)
      return hasSymbol && hasLiveCredential
    },
    takeProfitPctDisplay: {
      get () { return Number(this.form.take_profit_pct || 0) * 100 },
      set (value) { this.setRatio('take_profit_pct', value) }
    },
    priceDeviationPctDisplay: {
      get () { return Number(this.form.price_deviation_pct || 0) * 100 },
      set (value) { this.setRatio('price_deviation_pct', value) }
    },
    hardStopPctDisplay: {
      get () { return Number(this.form.hard_stop_pct || 0) * 100 },
      set (value) { this.setRatio('hard_stop_pct', value) }
    },
    minSpreadPctDisplay: {
      get () { return Number(this.form.min_spread_between_orders || 0) * 100 },
      set (value) { this.setRatio('min_spread_between_orders', value) }
    },
    initialPositionPctDisplay: {
      get () { return Number(this.form.initial_position_pct || 0) * 100 },
      set (value) { this.setRatio('initial_position_pct', value) }
    },
    intraSpacing1PctDisplay: {
      get () { return Number(this.form.intra_spacing_1_pct || 0) * 100 },
      set (value) { this.setRatio('intra_spacing_1_pct', value) }
    },
    intraSpacing2PctDisplay: {
      get () { return Number(this.form.intra_spacing_2_pct || 0) * 100 },
      set (value) { this.setRatio('intra_spacing_2_pct', value) }
    },
    interSpacing1PctDisplay: {
      get () { return Number(this.form.inter_spacing_1_pct || 0) * 100 },
      set (value) { this.setRatio('inter_spacing_1_pct', value) }
    },
    interSpacing2PctDisplay: {
      get () { return Number(this.form.inter_spacing_2_pct || 0) * 100 },
      set (value) { this.setRatio('inter_spacing_2_pct', value) }
    },
    interSpacing3PctDisplay: {
      get () { return Number(this.form.inter_spacing_3_pct || 0) * 100 },
      set (value) { this.setRatio('inter_spacing_3_pct', value) }
    },
    interSpacing4PctDisplay: {
      get () { return Number(this.form.inter_spacing_4_pct || 0) * 100 },
      set (value) { this.setRatio('inter_spacing_4_pct', value) }
    },
    columns () {
      return [
        { title: this.t('executorStrategies.table.level'), dataIndex: 'level', scopedSlots: { customRender: 'level' }, width: 80 },
        { title: this.t('executorStrategies.table.layer'), dataIndex: 'layer_index', width: 90 },
        { title: this.t('executorStrategies.table.order'), dataIndex: 'order_index', width: 90 },
        { title: this.t('executorStrategies.table.action'), dataIndex: 'action', scopedSlots: { customRender: 'action' }, width: 110 },
        { title: this.t('executorStrategies.table.side'), dataIndex: 'side', scopedSlots: { customRender: 'side' }, width: 100 },
        { title: this.t('executorStrategies.table.price'), dataIndex: 'price', scopedSlots: { customRender: 'price' }, width: 140 },
        { title: this.t('executorStrategies.table.amount'), dataIndex: 'amount_quote', scopedSlots: { customRender: 'money' }, width: 140 },
        { title: this.t('executorStrategies.table.takeProfit'), dataIndex: 'take_profit_price', scopedSlots: { customRender: 'price' }, width: 150 },
        { title: this.t('executorStrategies.table.trigger'), dataIndex: 'trigger_pct', scopedSlots: { customRender: 'pct' }, width: 130 }
      ]
    }
  },
  watch: {
    form: {
      deep: true,
      handler () {
        window.clearTimeout(this._previewTimer)
        this._previewTimer = window.setTimeout(() => this.refreshPreview(), 260)
      }
    }
  },
  mounted () {
    this.loadTemplates()
    this.loadCredentials()
    this.loadWatchlist()
    this.refreshPreview()
  },
  beforeDestroy () {
    window.clearTimeout(this._previewTimer)
  },
  methods: {
    t (key) {
      return this.$t(key)
    },
    defaultForm () {
      return {
        executor_type: 'grid',
        strategy_name: '',
        credential_id: undefined,
        symbol: 'BTC/USDT',
        timeframe: '1m',
        side: 'long',
        market_type: 'swap',
        execution_mode: 'signal',
        leverage: 1,
        initial_capital: 1000,
        start_price: 98000,
        end_price: 102000,
        limit_price: 97000,
        grid_count: 8,
        max_open_orders: 4,
        grid_mode: 'arithmetic',
        total_amount_quote: 800,
        initial_position_pct: 0.2,
        min_spread_between_orders: 0.0005,
        entry_price: 100000,
        base_order_size: 100,
        safety_order_size: 120,
        max_layers: 5,
        layer_count: 5,
        orders_per_layer: 3,
        price_deviation_pct: 0.015,
        intra_spacing_1_pct: 0.005,
        intra_spacing_2_pct: 0.008,
        inter_spacing_1_pct: 0.012,
        inter_spacing_2_pct: 0.015,
        inter_spacing_3_pct: 0.018,
        inter_spacing_4_pct: 0.022,
        step_multiplier: 1.2,
        volume_multiplier: 1.15,
        take_profit_pct: 0.004,
        hard_stop_pct: 0.12,
        max_entry_drift_pct: 0.03
      }
    },
    async loadTemplates () {
      this.loadingTemplates = true
      try {
        const res = await getExecutorTemplates()
        const data = res && (res.data || res)
        this.templates = ((data && data.items) || (data && data.data && data.data.items) || [])
      } finally {
        this.loadingTemplates = false
      }
    },
    async loadCredentials () {
      this.loadingCredentials = true
      try {
        const res = await listExchangeCredentials()
        this.credentials = res && res.code === 1 && res.data ? (res.data.items || []) : []
      } catch (error) {
        this.credentials = []
      } finally {
        this.loadingCredentials = false
      }
    },
    async loadWatchlist () {
      this.loadingWatchlist = true
      try {
        const res = await getWatchlist({ userid: this.userId })
        this.watchlist = res && Array.isArray(res.data) ? res.data : []
      } catch (error) {
        this.watchlist = []
      } finally {
        this.loadingWatchlist = false
      }
    },
    credentialLabel (credential) {
      const exchange = getExchangeDisplayName(credential && credential.exchange_id)
      const name = String((credential && credential.name) || '').trim()
      const hint = String((credential && credential.api_key_hint) || '').trim()
      return [exchange, name, hint].filter(Boolean).join(' · ')
    },
    templateForType (type) {
      return (this.templates || []).find(item => item.executor_type === type)
    },
    selectExecutor (type) {
      if (!['grid', 'dca', 'martingale', 'layered_martingale'].includes(type)) return
      this.form.executor_type = type
      if (type !== 'grid' && this.form.side === 'neutral') this.form.side = 'long'
      this.applyTypeDefaults()
    },
    applyTypeDefaults () {
      const template = this.templateForType(this.form.executor_type)
      if (template && template.defaults) {
        this.form = {
          ...this.form,
          ...template.defaults,
          executor_type: this.form.executor_type,
          strategy_name: this.form.strategy_name,
          symbol: this.form.symbol,
          timeframe: this.form.timeframe || '1m'
        }
      }
      if (this.form.executor_type === 'martingale') {
        this.form.volume_multiplier = Math.max(Number(this.form.volume_multiplier || 1), 1.5)
      }
      if (this.form.executor_type === 'layered_martingale') {
        this.form.volume_multiplier = Math.max(Number(this.form.volume_multiplier || 1), 1.8)
      }
    },
    handleMarketTypeChange () {
      if (this.form.market_type === 'spot') {
        this.form.side = 'long'
        this.form.leverage = 1
      }
    },
    handleSideChange () {
      if (this.form.side === 'neutral') {
        this.form.initial_position_pct = 0
      } else if (this.form.executor_type === 'grid' && Number(this.form.initial_position_pct || 0) === 0) {
        this.form.initial_position_pct = 0.2
      }
    },
    setRatio (field, value) {
      this.form[field] = Number(value || 0) / 100
    },
    payload () {
      const credential = this.form.execution_mode === 'live' ? this.selectedCredential : null
      return {
        ...this.form,
        exchange_config: credential
          ? { credential_id: credential.id, exchange_id: credential.exchange_id }
          : {}
      }
    },
    async refreshPreview () {
      const requestId = ++this.previewRequestId
      this.previewing = true
      try {
        const res = await previewExecutorStrategy(this.payload())
        const body = res && (res.data || res)
        if (requestId !== this.previewRequestId) return
        this.preview = body && body.data ? body.data : body
      } catch (err) {
        if (requestId !== this.previewRequestId) return
        this.preview = { levels: [], summary: {}, warnings: ['preview_failed'] }
      } finally {
        if (requestId === this.previewRequestId) this.previewing = false
      }
    },
    async createStrategy () {
      if (!this.canCreate) {
        this.$message.warning(this.t('trading-assistant.noCredentialForLive.title'))
        return
      }
      this.creating = true
      try {
        if (this.embedded) {
          const res = await generateExecutorStrategy({
            ...this.payload(),
            execution_mode: 'signal',
            exchange_config: {}
          })
          const body = res && (res.data || res)
          const generated = body && body.data ? body.data : body
          if (!generated || !generated.code) {
            throw new Error((body && body.msg) || this.t('executorStrategies.createFailed'))
          }
          this.$emit('generated', generated)
          return
        }
        const res = await createExecutorStrategy(this.payload())
        const body = res && (res.data || res)
        if (body && Number(body.code) === 0) {
          throw new Error(body.msg || this.t('executorStrategies.createFailed'))
        }
        const strategyId = Number(body && body.id)
        this.$message.success(this.t('executorStrategies.createSuccess'))
        this.$router.push({
          path: '/strategy-center',
          query: {
            tab: 'strategy',
            ...(strategyId ? { strategyId: String(strategyId) } : {})
          }
        })
      } catch (err) {
        this.$message.error((err && err.message) || this.t('executorStrategies.createFailed'))
      } finally {
        this.creating = false
      }
    },
    executorTypeText (value) {
      return this.t(`executorStrategies.type.${value || 'grid'}`)
    },
    sideText (value) {
      if (value === 'neutral') return this.t('executorStrategies.neutral')
      return value === 'short' ? this.t('executorStrategies.short') : this.t('executorStrategies.long')
    },
    actionText (value) {
      return value === 'add' ? this.t('executorStrategies.action.add') : this.t('executorStrategies.action.open')
    },
    warningText (value) {
      const key = `executorStrategies.warning.${value}`
      const translated = this.t(key)
      return translated === key ? String(value || '') : translated
    },
    fmtMoney (value) {
      const number = Number(value || 0)
      return number.toLocaleString(undefined, { maximumFractionDigits: 2 })
    },
    fmtPrice (value) {
      const number = Number(value || 0)
      return number.toLocaleString(undefined, { maximumFractionDigits: 8 })
    },
    fmtPct (value) {
      return `${(Number(value || 0) * 100).toFixed(2)}%`
    }
  }
}
</script>

<style lang="less" scoped>
.executor-page {
  min-height: calc(100vh - 64px);
  padding: 16px 20px;
  background: #f4f6f8;
  color: #1f2933;
  overflow-x: hidden;
}

.executor-page.is-embedded {
  min-height: 0;
  padding: 0;
  background: transparent;
}

.executor-header {
  display: flex;
  justify-content: space-between;
  gap: 18px;
  align-items: flex-start;
  margin-bottom: 10px;
}

.executor-kicker {
  color: #52c41a;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
}

.executor-header h1 {
  margin: 2px 0 3px;
  font-size: 24px;
  font-weight: 800;
}

.executor-header p {
  margin: 0;
  color: #667085;
}

.executor-header-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.executor-workbench {
  display: grid;
  grid-template-columns: minmax(360px, 430px) minmax(0, 1fr);
  gap: 12px;
  align-items: start;
}

.executor-catalog {
  grid-column-start: 1;
  grid-column-end: -1;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.executor-catalog .panel-title {
  grid-column-start: 1;
  grid-column-end: -1;
  margin-bottom: 2px;
}

.executor-catalog,
.executor-config-panel,
.executor-preview-panel {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.05);
}

.panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 9px;
  font-size: 15px;
  font-weight: 800;
}

.panel-title--between {
  justify-content: space-between;
}

.panel-title--between > span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.safe-mode-pill {
  padding: 4px 8px;
  border: 1px solid #d9f7be;
  border-radius: 999px;
  color: #3f7f1f;
  background: #f6ffed;
  font-size: 10px;
  font-weight: 700;
}

.catalog-item {
  width: 100%;
  display: grid;
  grid-template-columns: 30px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  min-height: 54px;
  padding: 7px 9px;
  margin-bottom: 0;
  border: 1px solid #edf0f3;
  border-radius: 8px;
  background: #f8fafc;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.16s, background 0.16s;
}

.catalog-item.active {
  border-color: #52c41a;
  background: #f6ffed;
}

.catalog-item.disabled {
  opacity: 0.58;
  cursor: not-allowed;
}

.catalog-icon {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: #fff;
  color: #52c41a;
}

.catalog-copy {
  min-width: 0;
}

.catalog-copy strong,
.catalog-copy small {
  display: block;
}

.catalog-copy small {
  overflow: hidden;
  margin-top: 1px;
  color: #667085;
  line-height: 1.25;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.executor-config-panel,
.executor-preview-panel {
  height: calc(100vh - 246px);
  min-height: 620px;
  overflow: auto;
}

.executor-config-panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.executor-config-scroll {
  min-height: 0;
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
  scrollbar-width: thin;
}

.section-title {
  margin: 10px 0 6px;
  color: #52c41a;
  font-size: 12px;
  font-weight: 800;
  text-transform: uppercase;
}

.field-block {
  margin-bottom: 8px;
}

.field-block label {
  display: block;
  margin-bottom: 4px;
  color: #475467;
  font-size: 12px;
  font-weight: 700;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.field-grid--three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.executor-live-account {
  margin: 4px 0 16px;
  padding: 14px;
  border: 1px solid #ffe0b2;
  border-radius: 10px;
  background: #fffaf2;
}

.executor-live-account__row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 10px;
}

.advanced-collapse {
  margin-top: 6px;
  background: transparent;
}

.advanced-collapse /deep/ .ant-collapse-item {
  border: 0;
}

.advanced-collapse /deep/ .ant-collapse-header {
  padding: 8px 0 !important;
  color: #667085 !important;
  font-weight: 700;
}

.config-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding-top: 12px;
  z-index: 2;
  margin: 0 -12px -12px;
  padding: 10px 12px;
  border-top: 1px solid #e5e7eb;
  background: #fff;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.summary-cell {
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 12px;
  background: #f8fafc;
}

.summary-cell span {
  display: block;
  color: #667085;
  font-size: 12px;
  font-weight: 700;
}

.summary-cell strong {
  display: block;
  margin-top: 4px;
  font-size: 18px;
}

.warning-strip {
  margin-bottom: 14px;
}

.executor-level-table {
  margin-top: 4px;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.executor-notes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 16px;
}

.executor-notes div {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  border: 1px solid #d9f7be;
  border-radius: 8px;
  padding: 12px;
  color: #3f6212;
  background: #f6ffed;
}

.theme-dark.executor-page {
  background: #0e0f11;
  color: #f3f4f6;
}

.theme-dark .executor-header h1,
.theme-dark .panel-title,
.theme-dark .catalog-copy strong,
.theme-dark .summary-cell strong {
  color: #f3f4f6;
}

.theme-dark .executor-header p,
.theme-dark .field-block label,
.theme-dark .summary-cell span,
.theme-dark .catalog-copy small {
  color: #9aa4b2;
}

.theme-dark .executor-catalog,
.theme-dark .executor-config-panel,
.theme-dark .executor-preview-panel {
  background: #17191c;
  border-color: #262a2f;
  box-shadow: none;
}

.theme-dark .catalog-item,
.theme-dark .summary-cell {
  background: #111315;
  border-color: #2a2f35;
}

.theme-dark .catalog-item.active {
  background: #15230f;
  border-color: #52c41a;
}

.theme-dark .catalog-icon {
  background: #0f1113;
}

.theme-dark .executor-notes div {
  color: #b7eb8f;
  background: #15230f;
  border-color: #274916;
}

.theme-dark .config-actions {
  border-color: #262a2f;
  background: #17191c;
}

.theme-dark .safe-mode-pill {
  border-color: #274916;
  color: #b7eb8f;
  background: #15230f;
}

@media (max-width: 1500px) {
  .executor-workbench {
    grid-template-columns: minmax(340px, 410px) minmax(0, 1fr);
  }
}

@media (max-width: 980px) {
  .executor-workbench {
    grid-template-columns: minmax(0, 1fr) !important;
  }

  .executor-catalog {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .executor-catalog .panel-title {
    grid-column-start: 1;
    grid-column-end: -1;
  }

  .catalog-item {
    min-width: 0;
    margin-bottom: 0;
  }

  .executor-config-panel,
  .executor-preview-panel {
    height: auto;
    min-height: 0;
    overflow: visible;
  }

}

@media (max-width: 720px) {
  .executor-page {
    padding: 14px;
  }

  .executor-header {
    flex-direction: column;
  }

  .field-grid,
  .summary-grid,
  .executor-notes {
    grid-template-columns: 1fr;
  }
}
</style>
