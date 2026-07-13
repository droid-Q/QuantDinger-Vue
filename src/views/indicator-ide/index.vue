<template>
  <div class="indicator-ide" :class="{ 'theme-dark': isDarkTheme }">
    <!-- Main split panels -->
    <div class="ide-main">
      <div
        class="ide-code-rail"
        :class="{ 'is-open': codeDrawerVisible }"
        role="button"
        tabindex="0"
        :title="codeDrawerVisible ? $t('indicatorIde.hideCode') : $t('indicatorIde.showCode')"
        @click="toggleCodeDrawer"
        @keyup.enter="toggleCodeDrawer"
      >
        <a-icon type="code" class="ide-code-rail__icon" />
        <a-icon :type="codeDrawerVisible ? 'double-left' : 'double-right'" class="ide-code-rail__arrow" />
        <span class="ide-code-rail__label">{{ $t('indicatorIde.codeRailLabel') }}</span>
      </div>
      <!-- Left panel (collapsible drawer) -->
      <div v-show="codeDrawerVisible" ref="editorFullscreenEl" class="ide-left" :class="{ 'ide-panel--fullscreen': editorFullscreen }">
        <!-- Code Editor -->
        <div class="code-panel">
          <div class="panel-title">
            <div class="panel-title__leading">
              <a-icon type="code" />
              <a-tag v-if="codeDirty && !selectedIndicatorCodeHidden" color="orange" size="small">{{ $t('indicatorIde.modified') }}</a-tag>
            </div>
            <div class="panel-title__trailing">
              <div class="panel-title-actions" @click.stop>
                <div class="panel-title-icon-actions">
                  <a-tooltip :title="$t('dashboard.indicator.create')">
                    <a-button size="small" :loading="creatingIndicator" @click="handleCreateIndicator"><a-icon type="plus" /></a-button>
                  </a-tooltip>
                  <a-tooltip :title="$t('dashboard.indicator.action.delete')">
                    <a-button
                      size="small"
                      :disabled="!selectedIndicatorId"
                      :loading="deletingIndicator"
                      @click="handleDeleteIndicator"
                    ><a-icon type="delete" /></a-button>
                  </a-tooltip>
                  <a-tooltip :title="selectedIndicatorIsPurchased ? $t('indicatorIde.publishBlockedPurchased') : $t('dashboard.indicator.action.publish')">
                    <a-button size="small" :disabled="!selectedIndicatorId || selectedIndicatorIsPurchased" @click="handlePublishIndicator"><a-icon type="cloud-upload" /></a-button>
                  </a-tooltip>
                  <a-tooltip :title="$t('indicatorIde.saveAsNew')">
                    <a-button size="small" :disabled="!userId || selectedIndicatorCodeHidden || !currentCode" @click="openSaveAsIndicatorModal"><a-icon type="copy" /></a-button>
                  </a-tooltip>
                  <a-tooltip :title="editorFullscreen ? $t('indicatorIde.exitFullscreen') : $t('indicatorIde.fullscreenEditor')">
                    <a-button size="small" @click="toggleEditorFullscreen"><a-icon :type="editorFullscreen ? 'fullscreen-exit' : 'fullscreen'" /></a-button>
                  </a-tooltip>
                  <a-tooltip :title="chartIndicatorRunning ? $t('indicatorIde.stopIndicatorOnChart') : $t('indicatorIde.runIndicatorOnChart')">
                    <a-button
                      size="small"
                      :disabled="chartIndicatorToggleDisabled"
                      @click="toggleChartIndicatorRun"
                    >
                      <a-icon :type="chartIndicatorRunning ? 'pause-circle' : 'play-circle'" />
                    </a-button>
                  </a-tooltip>
                  <a-tooltip :title="$t('indicatorIde.codeVersionHistory')">
                    <a-button size="small" :disabled="!selectedIndicatorId" @click="openCodeVersionDrawer"><a-icon type="history" /></a-button>
                  </a-tooltip>
                </div>
                <a-tooltip :title="selectedIndicatorCodeHidden ? $t('indicatorIde.saveBlockedHiddenCode') : $t('indicatorIde.saveShortcutHint')">
                  <a-button
                    class="ide-save-button"
                    type="primary"
                    size="small"
                    :loading="savingIndicator"
                    :disabled="!selectedIndicatorId || !codeDirty || selectedIndicatorCodeHidden"
                    @click="saveIndicator"
                  >
                    {{ $t('indicatorIde.save') }}
                  </a-button>
                </a-tooltip>
              </div>
            </div>
          </div>
          <div class="code-panel-body">
            <div class="ide-guide-bar">
              <a-icon type="book" />
              <span>{{ $t('indicatorIde.devGuideTooltip') }}</span>
              <a href="https://www.quantdinger.com/docs-zh.html#strategy-overview" target="_blank" rel="noopener noreferrer" class="ide-guide-link" @click.stop>
                {{ $t('indicatorIde.devGuide') }} <a-icon type="arrow-right" />
              </a>
            </div>
            <div class="code-editor-wrapper">
              <div ref="codeEditor" class="code-editor-area"></div>
              <div v-if="selectedIndicatorCodeHidden" class="code-hidden-mask">
                <a-icon type="lock" />
                <strong>{{ $t('indicatorIde.hiddenCodeTitle') }}</strong>
                <span>{{ $t('indicatorIde.hiddenCodeDesc') }}</span>
              </div>
              <transition name="fade">
                <div
                  v-if="aiGenerating"
                  class="code-ai-overlay"
                >
                  <div class="code-ai-overlay-inner">
                    <a-icon type="loading" spin style="font-size: 22px; color: var(--primary-color, #1890ff);" />
                    <span>{{ $t('indicatorIde.generating') }}</span>
                    <div class="code-ai-overlay-dots">
                      <span class="dot dot1"></span><span class="dot dot2"></span><span class="dot dot3"></span>
                    </div>
                  </div>
                  <div class="code-ai-overlay-tip">{{ ideAiCurrentTip }}</div>
                </div>
              </transition>
            </div>

            <!-- Code quality (between editor and AI) -->
            <div class="code-quality-panel">
              <div class="code-quality-head">
                <span class="code-quality-title">{{ $t('indicatorIde.codeQualityTitle') }}</span>
                <a-button
                  type="link"
                  size="small"
                  class="code-quality-recheck"
                  :loading="codeQualityLoading"
                  @click="runCodeQualityCheck"
                >{{ $t('indicatorIde.codeQualityRecheck') }}</a-button>
              </div>
              <a-spin v-if="codeQualityLoading" size="small" class="code-quality-spin" />
              <ul v-else-if="sortedCodeQualityHints.length" class="code-quality-list">
                <li
                  v-for="(h, idx) in sortedCodeQualityHints"
                  :key="idx"
                  :class="qualityHintClass(h)"
                >{{ formatQualityHint(h) }}</li>
              </ul>
            </div>

            <div
              v-if="aiDebugSummary"
              class="ai-debug-card"
              :class="`ai-debug-card--${aiDebugState()}`"
            >
              <div class="ai-debug-card__header">
                <div class="ai-debug-card__badge">
                  <a-icon :type="aiDebugStateIcon()" />
                </div>
                <div class="ai-debug-card__headline">
                  <span class="ai-debug-card__tag">{{ $t('indicatorIde.aiQaTag') || 'AI QA' }}</span>
                  <span class="ai-debug-card__title">{{ aiDebugSummary.title }}</span>
                </div>
                <a-icon type="close" class="ai-debug-card__dismiss" @click="aiDebugSummary = null" />
              </div>
              <div class="ai-debug-card__chips">
                <span :class="['ai-debug-chip', `ai-debug-chip--${aiDebugState()}`]">{{ aiDebugStateLabel() }}</span>
                <span v-if="aiDebugSummary.fixed_messages.length" class="ai-debug-chip ai-debug-chip--success">
                  <a-icon type="check" style="font-size: 10px;" /> {{ aiDebugSummary.fixed_messages.length }} {{ $t('indicatorIde.fixed') || 'fixed' }}
                </span>
                <span v-if="aiDebugSummary.remaining_messages.length" class="ai-debug-chip ai-debug-chip--warning">
                  <a-icon type="eye" style="font-size: 10px;" /> {{ aiDebugSummary.remaining_messages.length }} {{ $t('indicatorIde.toWatch') || 'to review' }}
                </span>
              </div>
              <div v-if="aiDebugSummary.returned_text" class="ai-debug-card__body">
                {{ aiDebugSummary.returned_text }}
              </div>
              <div v-if="aiDebugSummary.fixed_messages.length" class="ai-debug-card__group ai-debug-card__group--fixed">
                <div class="ai-debug-card__group-label"><a-icon type="check-circle" /> {{ $t('indicatorIde.autoFixed') || 'Auto fixed' }}</div>
                <div v-for="(msg, idx) in aiDebugSummary.fixed_messages" :key="`fixed-${idx}`" class="ai-debug-card__item">
                  <span class="ai-debug-card__bullet ai-debug-card__bullet--green"></span>{{ msg }}
                </div>
              </div>
              <div v-if="aiDebugSummary.remaining_messages.length" class="ai-debug-card__group ai-debug-card__group--remaining">
                <div class="ai-debug-card__group-label"><a-icon type="warning" /> {{ $t('indicatorIde.needAttention') || 'Needs attention' }}</div>
                <div v-for="(msg, idx) in aiDebugSummary.remaining_messages" :key="`remaining-${idx}`" class="ai-debug-card__item">
                  <span class="ai-debug-card__bullet ai-debug-card__bullet--orange"></span>{{ msg }}
                </div>
              </div>
            </div>

            <!-- AI Generation Panel -->
            <div class="ai-gen-panel">
              <div class="ai-gen-header" @click="aiPanelExpanded = !aiPanelExpanded">
                <a-icon type="robot" />
                <span>{{ $t('indicatorIde.aiGenerate') }}</span>
                <a-icon :type="aiPanelExpanded ? 'up' : 'down'" style="margin-left: auto;" />
              </div>
              <div v-show="aiPanelExpanded" class="ai-gen-body">
                <div class="ai-helper-tip">{{ $t('indicatorIde.aiAssistHint') }}</div>
                <a-textarea
                  v-model="aiPrompt"
                  class="ai-prompt-input"
                  :placeholder="$t('indicatorIde.aiPromptPlaceholder')"
                  :rows="6"
                  :disabled="aiGenerating || selectedIndicatorCodeHidden"
                  style="resize: vertical;"
                  @pressEnter="handleAIGenerateEnterKey"
                />
                <a-button
                  type="primary"
                  size="small"
                  block
                  :loading="aiGenerating"
                  :disabled="selectedIndicatorCodeHidden"
                  @click="handleAIGenerate"
                  style="margin-top: 8px;"
                >
                  <a-icon v-if="!aiGenerating" type="robot" />
                  {{ aiGenerating ? $t('indicatorIde.generating') : $t('indicatorIde.generateCode') }}
                </a-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="ide-right ide-right--workspace">
            <div class="ide-workspace-pane ide-workspace-pane--chart">
              <div
                ref="chartFullscreenEl"
                class="ide-chart-fs-root"
                :class="{ 'ide-panel--fullscreen': chartFullscreen }"
              >
                <div class="ide-chart-fs-row">
                  <div class="chart-panel">
                    <div class="chart-panel-toolbar">
                      <div class="chart-panel-toolbar-top">
                        <span class="chart-panel-toolbar-title">{{ $t('indicatorIde.chartWindow') }}</span>
                        <div class="chart-panel-toolbar-top-actions">
                          <a-button
                            size="small"
                            class="chart-panel-action-btn chart-panel-signal-alert-btn"
                            :disabled="!selectedIndicatorId"
                            @click="openSignalAlertModal"
                          >
                            <a-icon type="bell" />
                            <span>通知</span>
                            <em>{{ runningSignalAlertCount }}</em>
                          </a-button>
                          <a-tooltip
                            placement="bottom"
                            :title="selectedIndicatorCodeHidden ? $t('indicatorIde.aiConvertHiddenBlocked') : $t('indicatorIde.aiConvertToStrategy')"
                          >
                            <span class="chart-panel-action-wrap">
                              <a-button
                                size="small"
                                type="primary"
                                class="chart-panel-action-btn chart-panel-convert-strategy-btn"
                                :disabled="!selectedIndicatorId || selectedIndicatorCodeHidden"
                                @click="handleCreateStrategyFromIndicator"
                              >
                                <a-icon type="deployment-unit" />
                                <span>{{ $t('indicatorIde.aiConvertToStrategy') }}</span>
                              </a-button>
                            </span>
                          </a-tooltip>
                          <a-tooltip placement="bottomLeft">
                            <template slot="title">
                              {{ quickTradeDrawerVisible ? $t('indicatorIde.hideQuickTrade') : $t('indicatorIde.showQuickTrade') }}
                            </template>
                            <a-button
                              class="chart-panel-qt-btn"
                              size="small"
                              :type="quickTradeDrawerVisible ? 'primary' : 'default'"
                              @click="toggleQuickTradeDrawer"
                            >
                              <a-icon type="thunderbolt" theme="filled" />
                              <span class="chart-panel-qt-label">{{ $t('quickTrade.title') }}</span>
                            </a-button>
                          </a-tooltip>
                          <a-tooltip :title="chartFullscreen ? $t('indicatorIde.exitFullscreen') : $t('indicatorIde.fullscreenChart')">
                            <a-button size="small" class="chart-panel-fs-btn" @click="toggleChartFullscreen"><a-icon :type="chartFullscreen ? 'fullscreen-exit' : 'fullscreen'" /></a-button>
                          </a-tooltip>
                        </div>
                      </div>
                      <div class="chart-panel-toolbar-controls">
                        <div class="ide-toolbar-group ide-toolbar-group--params">
                          <span class="ide-toolbar-label">{{ $t('indicatorIde.paramPanel.shortTitle') }}</span>
                          <a-button
                            size="small"
                            class="ide-param-trigger"
                            :type="currentIndicatorParamSpecs.length ? 'primary' : 'default'"
                            :disabled="!selectedIndicatorId"
                            @click="openIndicatorParamsDrawer"
                          >
                            <a-icon type="sliders" />
                            <span>{{ $t('indicatorIde.paramPanel.button') }}</span>
                            <em>{{ currentIndicatorParamSpecs.length }}</em>
                          </a-button>
                        </div>
                        <div class="ide-toolbar-group ide-toolbar-group--watchlist">
                          <span class="ide-toolbar-label">{{ $t('indicatorIde.toolbar.watchlist') }}</span>
                          <a-select
                            v-model="selectedWatchlistKey"
                            class="ide-toolbar-select ide-toolbar-select--watchlist chart-panel-watchlist-select"
                            :placeholder="$t('backtest-center.config.watchlistPlaceholder')"
                            size="small"
                            show-search
                            allow-clear
                            :filter-option="filterWatchlistOption"
                            :dropdown-class-name="isDarkTheme ? 'ide-watchlist-dropdown ide-watchlist-dropdown--dark' : 'ide-watchlist-dropdown'"
                            :get-popup-container="chartToolbarGetPopupContainer"
                            @change="handleWatchlistChange"
                          >
                            <a-select-option
                              v-for="w in watchlist"
                              :key="watchlistContextKey(w)"
                              :value="watchlistContextKey(w)"
                            >
                              <span class="wl-opt-tag" :class="'wl-mkt-' + (w.market || '').toLowerCase()">{{ marketLabel(w.market) }}</span>
                              <strong class="wl-opt-symbol">{{ w.symbol }}</strong>
                              <span v-if="w.name" class="wl-opt-name">{{ w.name }}</span>
                            </a-select-option>
                            <a-select-option key="__add__" value="__add__" class="add-option">
                              <div class="ide-watchlist-add-row">
                                <a-icon type="plus" /> {{ $t('backtest-center.config.addSymbol') }}
                              </div>
                            </a-select-option>
                          </a-select>
                        </div>
                        <div v-if="market === 'Crypto'" class="ide-toolbar-group ide-toolbar-group--venue">
                          <span class="ide-toolbar-label">{{ $t('marketContext.source') }}</span>
                          <div class="ide-market-context-controls">
                            <a-select
                              v-model="cryptoExchangeId"
                              size="small"
                              class="ide-toolbar-select ide-toolbar-select--exchange"
                              :get-popup-container="chartToolbarGetPopupContainer"
                              @change="handleCryptoExchangeChange"
                            >
                              <a-select-option v-for="exchangeId in cryptoExchangeIds" :key="exchangeId" :value="exchangeId">
                                {{ exchangeId.toUpperCase() }}
                              </a-select-option>
                            </a-select>
                            <a-select
                              v-model="cryptoMarketType"
                              size="small"
                              class="ide-toolbar-select ide-toolbar-select--market-type"
                              :get-popup-container="chartToolbarGetPopupContainer"
                              @change="handleCryptoMarketTypeChange"
                            >
                              <a-select-option value="spot">{{ $t('marketContext.spot') }}</a-select-option>
                              <a-select-option value="swap">{{ $t('marketContext.swap') }}</a-select-option>
                            </a-select>
                          </div>
                        </div>
                        <div class="ide-toolbar-group ide-toolbar-group--tf">
                          <span class="ide-toolbar-label">{{ $t('indicatorIde.toolbar.timeframe') }}</span>
                          <a-radio-group
                            v-model="timeframe"
                            button-style="solid"
                            size="small"
                            class="tf-group ide-tf-seg ide-tf-seg--chart"
                          >
                            <a-radio-button value="1m">1m</a-radio-button>
                            <a-radio-button value="5m">5m</a-radio-button>
                            <a-radio-button value="15m">15m</a-radio-button>
                            <a-radio-button value="30m">30m</a-radio-button>
                            <a-radio-button value="1H">1H</a-radio-button>
                            <a-radio-button value="4H">4H</a-radio-button>
                            <a-radio-button value="1D">1D</a-radio-button>
                            <a-radio-button value="1W">1W</a-radio-button>
                          </a-radio-group>
                        </div>
                        <div class="ide-toolbar-group ide-toolbar-group--indicator">
                          <span class="ide-toolbar-label">{{ $t('indicatorIde.toolbar.indicator') }}</span>
                          <a-dropdown
                            :trigger="['click']"
                            placement="bottomLeft"
                            :visible="indicatorDropdownVisible"
                            :get-popup-container="chartToolbarGetPopupContainer"
                            @visibleChange="onIndicatorDropdownVisibleChange"
                            :overlay-class-name="isDarkTheme ? 'ide-indicator-multiselect-dropdown ide-indicator-multiselect-dropdown--dark' : 'ide-indicator-multiselect-dropdown'"
                          >
                            <a-button
                              size="small"
                              class="ide-toolbar-select ide-toolbar-select--indicator ide-indicator-multiselect-trigger"
                              :loading="loadingIndicators"
                            >
                              <span class="ide-indicator-trigger-text">{{ indicatorToolbarSummary }}</span>
                              <a-icon type="down" />
                            </a-button>
                            <div slot="overlay" class="ide-indicator-overlay" @mousedown.stop @click.stop>
                              <div class="ide-indicator-overlay-hint">{{ $t('indicatorIde.chartPickHint') }}</div>
                              <a-spin v-if="loadingIndicators" size="small" style="padding: 12px;" />
                              <div v-else-if="!indicators.length" class="ide-indicator-overlay-empty">{{ $t('indicatorIde.noIndicatorsYet') }}</div>
                              <div v-else class="ide-indicator-overlay-list">
                                <div
                                  v-for="ind in indicators"
                                  :key="'ind-row-' + ind.id"
                                  class="ide-indicator-row"
                                >
                                  <a-checkbox
                                    :checked="(chartVisibleIndicatorIds || []).some(x => Number(x) === Number(ind.id))"
                                    @change="e => onChartIndicatorCheckChange(ind.id, e.target.checked)"
                                  />
                                  <span
                                    class="ide-indicator-name"
                                    :class="{ active: Number(selectedIndicatorId) === Number(ind.id) }"
                                    @click="selectEditorIndicator(ind.id)"
                                  >{{ indicatorDisplayName(ind) }}</span>
                                  <a-tag
                                    v-if="Number(ind.is_buy) === 1"
                                    color="purple"
                                    class="ide-indicator-purchased-tag"
                                  >{{ $t('indicatorIde.purchasedBadge') }}</a-tag>
                                </div>
                              </div>
                            </div>
                          </a-dropdown>
                        </div>
                      </div>
                    </div>
                    <div class="chart-panel-inner">
                      <kline-chart
                        ref="klineChart"
                        :symbol="symbol"
                        :market="market"
                        :exchange-id="cryptoExchangeId"
                        :market-type="cryptoMarketType"
                        :instrument-id="currentInstrumentId"
                        :timeframe="timeframe"
                        :theme="chartTheme"
                        :activeIndicators="activeIndicators"
                        :userId="userId"
                        :realtime-enabled="klineRealtimeEnabled"
                        @indicator-toggle="handleIndicatorToggle"
                        @indicators-updated="onChartIndicatorsUpdated"
                      />
                    </div>
                  </div>
                  <div v-show="quickTradeDrawerVisible" class="ide-quick-right ide-quick-right--chart-fs">
                    <div class="ide-quick-panel-head">
                      <span class="ide-quick-panel-head-title">
                        <a-icon type="thunderbolt" theme="filled" class="ide-quick-panel-head-icon" />
                        {{ $t('quickTrade.title') }}
                      </span>
                      <a-button type="link" size="small" class="ide-quick-panel-close" @click="closeQuickTradeDrawer">
                        <a-icon type="close" />
                      </a-button>
                    </div>
                    <div class="ide-quick-panel-body">
                      <quick-trade-panel
                        key="ide-embedded-qt"
                        embedded
                        embedded-ide
                        :visible="true"
                        :symbol="qtSymbol"
                        :preset-side="qtSide"
                        :preset-price="qtPrice"
                        source="indicator"
                        :market="market"
                        symbol-locked
                        :market-type="market === 'Crypto' ? cryptoMarketType : 'spot'"
                        :overlay-get-container="ideQtOverlayGetContainer"
                        @order-success="onQuickTradeSuccess"
                        @update:symbol="handleQuickTradeSymbolChange"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
      </div>

    </div>

    <!-- Add symbol modal -->
    <a-modal
      :title="$t('dashboard.analysis.modal.addStock.title')"
      :visible="showAddModal"
      @ok="handleAddStock"
      @cancel="showAddModal = false"
      :confirmLoading="addingStock"
      width="560px"
      :get-container="ideModalGetContainer"
      :wrap-class-name="isDarkTheme ? 'ide-modal-wrap ide-modal-wrap--dark' : 'ide-modal-wrap'"
    >
      <a-tabs v-model="addMarketTab" size="small" class="ide-add-market-tabs" @change="onAddMarketTabChange">
        <a-tab-pane
          v-for="m in ideAddMarketKeys"
          :key="m"
          :tab="$t('dashboard.indicator.market.' + m)"
        ></a-tab-pane>
      </a-tabs>
      <div v-if="addMarketTab === 'Crypto'" class="ide-add-source-row">
        <a-select v-model="cryptoExchangeId" style="width: 50%;" @change="onAddSourceChange">
          <a-select-option v-for="exchangeId in cryptoExchangeIds" :key="exchangeId" :value="exchangeId">
            {{ exchangeId.toUpperCase() }}
          </a-select-option>
        </a-select>
        <a-select v-model="cryptoMarketType" style="width: 50%;" @change="onAddSourceChange">
          <a-select-option value="spot">{{ $t('marketContext.spot') }}</a-select-option>
          <a-select-option value="swap">{{ $t('marketContext.swap') }}</a-select-option>
        </a-select>
      </div>
      <a-input-search
        v-model="addSearchKeyword"
        :placeholder="$t('backtest-center.config.symbolPlaceholder')"
        @search="doAddSearch"
        @change="onAddSearchInput"
        :loading="addSearching"
        size="large"
        allow-clear
        style="margin: 12px 0;"
      />
      <a-list
        v-if="addSearchResults.length > 0"
        size="small"
        :data-source="addSearchResults"
        style="max-height: 240px; overflow-y: auto;"
      >
        <a-list-item
          slot="renderItem"
          slot-scope="item"
          style="cursor: pointer;"
          :class="{ 'add-item-active': addSelectedItem && addSelectedItem.symbol === item.symbol }"
          @click="addSelectedItem = item"
        >
          <strong>{{ item.symbol }}</strong>
          <span v-if="item.name" style="color: #999; margin-left: 8px;">{{ item.name }}</span>
          <a-icon v-if="addSelectedItem && addSelectedItem.symbol === item.symbol" type="check-circle" theme="filled" style="color: #52c41a; margin-left: auto;" />
        </a-list-item>
      </a-list>
      <div v-if="addSearchResults.length === 0 && addSearchKeyword && addSearched" style="padding: 16px 0; text-align: center; color: #999;">
        {{ $t('backtest-center.config.noSearchResult') }}
      </div>
    </a-modal>

    <a-modal
      :title="$t('indicatorIde.paramPanel.title')"
      :visible="paramDrawerVisible"
      :width="760"
      :footer="null"
      centered
      :get-container="ideModalGetContainer"
      :wrap-class-name="isDarkTheme ? 'ide-modal-wrap ide-modal-wrap--dark ide-param-modal-wrap' : 'ide-modal-wrap ide-param-modal-wrap'"
      @cancel="paramDrawerVisible = false"
    >
      <div class="ide-param-drawer">
        <div class="ide-param-drawer__hero">
          <div>
            <span>{{ $t('indicatorIde.paramPanel.currentIndicator') }}</span>
            <strong>{{ selectedIndicatorDisplayName }}</strong>
          </div>
          <a-tag :color="selectedIndicatorCodeHidden ? 'gold' : 'green'">
            {{ selectedIndicatorCodeHidden ? $t('indicatorIde.paramPanel.hiddenSource') : $t('indicatorIde.paramPanel.visibleSource') }}
          </a-tag>
        </div>

        <a-empty
          v-if="!currentIndicatorParamSpecs.length"
          class="ide-param-empty"
          :description="$t('indicatorIde.paramPanel.noParams')"
        />

        <div v-else class="ide-param-list">
          <div
            v-for="spec in currentIndicatorParamSpecs"
            :key="spec.name"
            class="ide-param-item"
          >
            <div class="ide-param-item__head">
              <div>
                <strong>{{ spec.label || spec.name }}</strong>
                <code>{{ spec.name }}</code>
              </div>
              <a-tag size="small">{{ spec.type }}</a-tag>
            </div>
            <p v-if="spec.description" class="ide-param-item__desc">{{ spec.description }}</p>

            <a-switch
              v-if="spec.type === 'bool'"
              :checked="!!indicatorParamDraft[spec.name]"
              @change="val => onIndicatorParamDraftChange(spec, val)"
            />
            <a-select
              v-else-if="spec.values && spec.values.length"
              :value="indicatorParamDraft[spec.name]"
              size="small"
              class="ide-param-item__control"
              @change="val => onIndicatorParamDraftChange(spec, val)"
            >
              <a-select-option
                v-for="opt in spec.values"
                :key="String(opt)"
                :value="opt"
              >{{ opt }}</a-select-option>
            </a-select>
            <a-input-number
              v-else-if="spec.type === 'int' || spec.type === 'float'"
              :value="indicatorParamDraft[spec.name]"
              :min="spec.min"
              :max="spec.max"
              :step="spec.step || (spec.type === 'int' ? 1 : 0.1)"
              :precision="spec.type === 'int' ? 0 : undefined"
              class="ide-param-item__control"
              size="small"
              @change="val => onIndicatorParamDraftChange(spec, val)"
            />
            <a-input
              v-else
              :value="indicatorParamDraft[spec.name]"
              class="ide-param-item__control"
              size="small"
              @change="e => onIndicatorParamDraftChange(spec, e.target.value)"
            />

            <div class="ide-param-item__meta">
              <span>{{ $t('indicatorIde.paramPanel.defaultValue') }}: <b>{{ formatIndicatorParamValue(spec.defaultValue) }}</b></span>
              <span v-if="spec.rangeText">{{ spec.rangeText }}</span>
            </div>
          </div>
        </div>

        <div class="ide-param-drawer__footer">
          <a-button size="small" @click="resetIndicatorParamsToDeclared">
            <a-icon type="reload" />
            {{ $t('indicatorIde.paramPanel.reset') }}
          </a-button>
          <a-button
            size="small"
            :disabled="!currentIndicatorParamSpecs.length"
            @click="saveIndicatorParamDefaults"
          >
            <a-icon type="save" />
            {{ $t('indicatorIde.paramPanel.saveDefault') }}
          </a-button>
          <a-tooltip :title="selectedIndicatorCodeHidden ? $t('indicatorIde.paramPanel.writeBlockedHidden') : $t('indicatorIde.paramPanel.writeBackHint')">
            <a-button
              size="small"
              :disabled="!currentIndicatorParamSpecs.length || selectedIndicatorCodeHidden"
              @click="writeIndicatorParamsToCode"
            >
              <a-icon type="edit" />
              {{ $t('indicatorIde.paramPanel.writeBack') }}
            </a-button>
          </a-tooltip>
          <a-button
            type="primary"
            size="small"
            :disabled="!currentIndicatorParamSpecs.length"
            @click="applyIndicatorParams"
          >
            <a-icon type="play-circle" />
            {{ $t('indicatorIde.paramPanel.apply') }}
          </a-button>
        </div>
      </div>
    </a-modal>

    <a-modal
      title="信号通知"
      :visible="signalAlertModalVisible"
      :width="880"
      :footer="null"
      centered
      :get-container="ideModalGetContainer"
      :wrap-class-name="isDarkTheme ? 'ide-modal-wrap ide-modal-wrap--dark ide-signal-alert-modal-wrap' : 'ide-modal-wrap ide-signal-alert-modal-wrap'"
      @cancel="closeSignalAlertModal"
    >
      <div class="ide-signal-alert-modal">
        <a-tabs v-model="signalAlertActiveTab" class="ide-signal-alert-tabs">
          <a-tab-pane key="create" :tab="signalAlertEditingId ? '编辑条件' : '设置推送条件'">
            <div class="signal-alert-current-card">
              <div>
                <span>当前指标</span>
                <strong>{{ selectedIndicatorDisplayName }}</strong>
              </div>
              <a-tag :color="selectedIndicatorCodeHidden ? 'gold' : 'green'">
                {{ selectedIndicatorCodeHidden ? '源码隐藏' : '源码可见' }}
              </a-tag>
            </div>

            <div class="signal-alert-form-grid">
              <div class="signal-alert-field signal-alert-field--wide">
                <label>选择标的</label>
                <a-select
                  v-model="signalAlertForm.watchlistKey"
                  size="small"
                  show-search
                  :filter-option="filterWatchlistOption"
                  :get-popup-container="ideModalGetContainer"
                  @change="onSignalAlertWatchlistChange"
                >
                  <a-select-option
                    v-for="w in signalAlertWatchlistOptions"
                    :key="`${w.market}:${w.symbol}`"
                    :value="`${w.market}:${w.symbol}`"
                  >
                    <span class="wl-opt-tag" :class="'wl-mkt-' + (w.market || '').toLowerCase()">{{ marketLabel(w.market) }}</span>
                    <strong class="wl-opt-symbol">{{ w.symbol }}</strong>
                    <span v-if="w.name" class="wl-opt-name">{{ w.name }}</span>
                  </a-select-option>
                </a-select>
              </div>
              <div class="signal-alert-field">
                <label>K线周期</label>
                <a-select v-model="signalAlertForm.timeframe" size="small" :get-popup-container="ideModalGetContainer">
                  <a-select-option v-for="tf in signalAlertTimeframes" :key="tf" :value="tf">{{ tf }}</a-select-option>
                </a-select>
              </div>
            </div>

            <div class="signal-alert-block">
              <div class="signal-alert-block__head">
                <strong>触发信号</strong>
                <span>从指标代码的 output.signals 中识别；选择“全部信号”可监听任意信号。</span>
              </div>
              <a-checkbox-group v-model="signalAlertForm.signalKeys" class="signal-alert-check-grid">
                <a-checkbox
                  v-for="opt in signalAlertSignalOptions"
                  :key="opt.key"
                  :value="opt.key"
                >{{ opt.label }}</a-checkbox>
              </a-checkbox-group>
            </div>

            <div class="signal-alert-block">
              <div class="signal-alert-block__head">
                <strong>通知方式</strong>
                <span>站内通知会进入顶部铃铛；外部渠道需填写对应目标。</span>
              </div>
              <a-checkbox-group v-model="signalAlertForm.channels" class="signal-alert-channel-row">
                <a-checkbox value="browser">站内</a-checkbox>
                <a-checkbox value="email">邮件</a-checkbox>
                <a-checkbox value="telegram">Telegram</a-checkbox>
                <a-checkbox value="webhook">Webhook</a-checkbox>
              </a-checkbox-group>
              <div v-if="signalAlertForm.channels.includes('email')" class="signal-alert-target-row">
                <a-input v-model="signalAlertForm.email" size="small" placeholder="接收邮箱" />
              </div>
              <div v-if="signalAlertForm.channels.includes('telegram')" class="signal-alert-target-row signal-alert-target-row--split">
                <a-input v-model="signalAlertForm.telegramChatId" size="small" placeholder="Telegram Chat ID" />
                <a-input v-model="signalAlertForm.telegramBotToken" size="small" placeholder="Bot Token（可选，留空则使用系统配置）" />
              </div>
              <div v-if="signalAlertForm.channels.includes('webhook')" class="signal-alert-target-row">
                <a-input v-model="signalAlertForm.webhookUrl" size="small" placeholder="Webhook URL" />
              </div>
            </div>

            <div class="signal-alert-actions">
              <a-button size="small" @click="resetSignalAlertForm">重置</a-button>
              <a-button size="small" type="primary" :loading="signalAlertSaving" @click="submitSignalAlertTask">
                <a-icon type="check" />
                {{ signalAlertEditingId ? '保存修改' : '创建任务' }}
              </a-button>
            </div>
          </a-tab-pane>
          <a-tab-pane key="tasks" tab="进行中任务">
            <a-spin :spinning="signalAlertLoading">
              <a-empty v-if="!signalAlertTasks.length" description="暂无信号通知任务" />
              <div v-else class="signal-alert-task-list">
                <div
                  v-for="task in signalAlertTasks"
                  :key="task.id"
                  class="signal-alert-task-card"
                  :class="{ paused: task.status === 'paused' }"
                >
                  <div class="signal-alert-task-card__main">
                    <div class="signal-alert-task-card__title">
                      <strong>{{ task.indicator_name || selectedIndicatorDisplayName }}</strong>
                      <a-tag :color="task.status === 'running' ? 'green' : 'orange'">{{ task.status === 'running' ? '运行中' : '已暂停' }}</a-tag>
                    </div>
                    <div class="signal-alert-task-card__meta">
                      <span>{{ task.market }} · {{ task.symbol }} · {{ task.timeframe }}</span>
                      <span>触发 {{ task.trigger_count || 0 }} 次</span>
                      <span v-if="task.last_error" class="danger">错误：{{ task.last_error }}</span>
                    </div>
                    <div class="signal-alert-task-card__chips">
                      <a-tag v-for="key in (task.signal_keys || [])" :key="key">{{ signalAlertKeyLabel(key) }}</a-tag>
                      <a-tag v-for="ch in (task.channels || [])" :key="ch" color="blue">{{ signalAlertChannelLabel(ch) }}</a-tag>
                    </div>
                  </div>
                  <div class="signal-alert-task-card__actions">
                    <a-button size="small" @click="editSignalAlertTask(task)">编辑</a-button>
                    <a-button size="small" @click="toggleSignalAlertTask(task)">
                      {{ task.status === 'running' ? '暂停' : '恢复' }}
                    </a-button>
                    <a-button size="small" @click="testSignalAlertTask(task)">测试</a-button>
                    <a-button size="small" type="danger" ghost @click="deleteSignalAlertTask(task)">删除</a-button>
                  </div>
                </div>
              </div>
            </a-spin>
          </a-tab-pane>
        </a-tabs>
      </div>
    </a-modal>

    <a-drawer
      :title="$t('indicatorIde.codeVersionHistory')"
      :visible="showCodeVersionDrawer"
      :width="560"
      :get-container="ideModalGetContainer"
      :wrap-class-name="isDarkTheme ? 'ide-drawer-wrap ide-drawer-wrap--dark' : 'ide-drawer-wrap'"
      @close="showCodeVersionDrawer = false"
    >
      <div class="code-version-toolbar">
        <span>{{ selectedIndicatorDisplayName }}</span>
        <a-button size="small" icon="reload" :loading="codeVersionLoading" @click="loadCodeVersions">
          {{ $t('dashboard.indicator.backtest.historyRefresh') }}
        </a-button>
      </div>
      <a-spin :spinning="codeVersionLoading">
        <a-empty v-if="!codeVersions.length" :description="$t('indicatorIde.codeVersionEmpty')" />
        <div v-else class="code-version-list">
          <div v-for="item in codeVersions" :key="item.id" class="code-version-item">
            <div class="code-version-item__main">
              <strong>{{ $t('indicatorIde.codeVersionNo', { version: item.version_no }) }}</strong>
              <span>{{ formatCodeVersionTime(item.created_at) }}</span>
              <small>{{ item.name || selectedIndicatorObj && selectedIndicatorObj.name || '' }}</small>
            </div>
            <div class="code-version-item__actions">
              <a-button size="small" @click="previewCodeVersion(item)">{{ $t('indicatorIde.codeVersionPreview') }}</a-button>
              <a-button size="small" type="primary" :loading="restoringCodeVersionId === item.id" @click="confirmRestoreCodeVersion(item)">
                {{ $t('indicatorIde.codeVersionRestore') }}
              </a-button>
            </div>
          </div>
        </div>
      </a-spin>
      <div v-if="codeVersionPreview" class="code-version-preview">
        <div class="code-version-preview__head">
          <strong>{{ $t('indicatorIde.codeVersionPreviewTitle', { version: codeVersionPreview.version_no }) }}</strong>
          <a-button size="small" icon="close" @click="codeVersionPreview = null">{{ $t('indicatorIde.close') }}</a-button>
        </div>
        <pre>{{ codeVersionPreview.code }}</pre>
      </div>
    </a-drawer>
    <a-modal
      :title="publishIndicator && publishIndicator.publish_to_community ? $t('dashboard.indicator.publish.editTitle') : $t('dashboard.indicator.publish.title')"
      :visible="showPublishModal"
      :width="620"
      :confirmLoading="publishing"
      :okText="publishIndicator && publishIndicator.publish_to_community ? $t('dashboard.indicator.publish.update') : $t('dashboard.indicator.publish.confirm')"
      :cancelText="$t('dashboard.indicator.editor.cancel')"
      :get-container="ideModalGetContainer"
      :wrap-class-name="isDarkTheme ? 'ide-modal-wrap ide-modal-wrap--dark ide-publish-modal-wrap' : 'ide-modal-wrap ide-publish-modal-wrap'"
      @ok="handleConfirmPublish"
      @cancel="showPublishModal = false; publishIndicator = null"
    >
      <div class="publish-form publish-market-form">
        <div class="publish-summary-card">
          <div class="publish-summary-icon">
            <a-icon type="shop" />
          </div>
          <div class="publish-summary-main">
            <div class="publish-summary-label">{{ $t('dashboard.indicator.publish.title') }}</div>
            <div class="publish-summary-name">{{ publishIndicator && publishIndicator.name }}</div>
          </div>
          <a-tag class="publish-summary-tag" color="red">{{ $t('community.title') }}</a-tag>
        </div>

        <div class="publish-note">
          <a-icon type="info-circle" />
          <span>{{ $t('dashboard.indicator.publish.hint') }}</span>
        </div>

        <div class="publish-section">
          <div class="publish-section-title">{{ $t('dashboard.indicator.publish.pricingType') }}</div>
          <a-radio-group v-model="publishPricingType" class="publish-pricing-group">
            <a-radio-button value="free">
              <a-icon type="gift" />
              {{ $t('dashboard.indicator.publish.free') }}
            </a-radio-button>
            <a-radio-button value="paid">
              <a-icon type="pay-circle" />
              {{ $t('dashboard.indicator.publish.paid') }}
            </a-radio-button>
          </a-radio-group>
          <div v-if="publishPricingType === 'paid'" class="publish-price-box">
            <div class="field-label">{{ $t('dashboard.indicator.publish.price') }}</div>
            <a-input-number v-model="publishPrice" :min="0" :precision="2" class="publish-price-input" />
          </div>
        </div>

        <div class="publish-option-grid">
          <div class="publish-option-card" :class="{ active: publishVipFree }">
            <div class="publish-option-head">
              <span>{{ $t('dashboard.indicator.publish.vipFree') }}</span>
              <a-switch v-model="publishVipFree" />
            </div>
            <div class="publish-hint">{{ $t('dashboard.indicator.publish.vipFreeHint') }}</div>
          </div>
          <div class="publish-option-card" :class="{ active: publishCodeHidden }">
            <div class="publish-option-head">
              <span>{{ $t('dashboard.indicator.publish.hideCode') }}</span>
              <a-switch v-model="publishCodeHidden" />
            </div>
            <div class="publish-hint">{{ $t('dashboard.indicator.publish.hideCodeHint') }}</div>
          </div>
        </div>

        <div class="publish-section">
          <div class="publish-section-title">{{ $t('dashboard.indicator.publish.description') }}</div>
          <a-textarea
            v-model="publishDescription"
            :rows="4"
            class="publish-description-input"
            :placeholder="$t('dashboard.indicator.publish.descriptionPlaceholder')"
          />
        </div>

        <div v-if="publishIndicator && publishIndicator.publish_to_community" class="publish-unpublish-row">
          <a-button type="danger" ghost @click="handleUnpublish" :loading="unpublishing">
            {{ $t('dashboard.indicator.publish.unpublish') }}
          </a-button>
        </div>
      </div>
    </a-modal>
    <a-modal
      :title="$t('indicatorIde.saveAsModalTitle')"
      :visible="showSaveAsModal"
      :confirmLoading="savingAs"
      :okText="$t('indicatorIde.saveAsConfirm')"
      :cancelText="$t('dashboard.indicator.editor.cancel')"
      :get-container="ideModalGetContainer"
      :wrap-class-name="isDarkTheme ? 'ide-modal-wrap ide-modal-wrap--dark' : 'ide-modal-wrap'"
      @ok="confirmSaveAsIndicator"
      @cancel="showSaveAsModal = false"
    >
      <div class="field-label" style="margin-bottom: 8px;">{{ $t('indicatorIde.saveAsNameLabel') }}</div>
      <a-input
        v-model="saveAsName"
        :placeholder="$t('indicatorIde.saveAsNamePlaceholder')"
        @pressEnter="confirmSaveAsIndicator"
      />
    </a-modal>
  </div>
</template>

<script>
import CodeMirror from 'codemirror'
import 'codemirror/lib/codemirror.css'
import 'codemirror/mode/python/python'
import 'codemirror/theme/monokai.css'
import 'codemirror/theme/eclipse.css'
import 'codemirror/addon/edit/closebrackets'
import 'codemirror/addon/edit/matchbrackets'
import 'codemirror/addon/selection/active-line'
import * as echarts from 'echarts'
import moment from 'moment'
import storage from 'store'
import { ACCESS_TOKEN } from '@/store/mutation-types'
import { baseMixin } from '@/store/app-mixin'
import request from '@/utils/request'
import { formatBacktestTime } from '@/utils/userTime'
import { resolveExperimentIndicatorParams } from '@/utils/experimentOverrides'
import { loadEnabledMarketOptions, firstMarketValue } from '@/utils/marketModules'
import { CRYPTO_EXCHANGE_IDS, marketContextKey, normalizeExchangeId, normalizeMarketType } from '@/utils/marketContext'
import { getUserInfo } from '@/api/login'
import { getWatchlist, addWatchlist, searchSymbols } from '@/api/market'
import { getPublicSettingsConfig } from '@/api/settings'
import KlineChart from '@/views/indicator-analysis/components/KlineChart.vue'
import QuickTradePanel from '@/components/QuickTradePanel/QuickTradePanel'
import { Modal } from 'ant-design-vue'
import message from 'ant-design-vue/es/message'

const TF_MAX_DAYS = {
  '1m': 30,
  '5m': 180,
  '15m': 365,
  '30m': 365,
  '1H': 730,
  '4H': 1460,
  '1D': 3650,
  '1W': 7300
}

const DATE_PRESETS = [
  { key: '1m', label: '1M', days: 30 },
  { key: '3m', label: '3M', days: 90 },
  { key: '6m', label: '6M', days: 180 },
  { key: '1y', label: '1Y', days: 365 },
  { key: '2y', label: '2Y', days: 730 },
  { key: '3y', label: '3Y', days: 1095 }
]

function strategyDirectivesAlertStorageKey (userId) {
  const u = userId != null && userId !== '' ? String(userId) : '0'
  return `qd_ide_strategy_directives_alert_dismissed_${u}`
}

function ideUiCacheStorageKey (userId) {
  const u = userId != null && userId !== '' ? String(userId) : '0'
  return `qd_ide_ui_cache_v1_${u}`
}

function cryptoMarketSourceStorageKey (userId) {
  const u = userId != null && userId !== '' ? String(userId) : '0'
  return `qd_indicator_crypto_market_source_v1_${u}`
}

function ideSelectionStorageKey (userId) {
  const u = userId != null && userId !== '' ? String(userId) : '0'
  return `qd_indicator_ide_selection_v1_${u}`
}

function indicatorParamDefaultsStorageKey (userId) {
  const u = userId != null && userId !== '' ? String(userId) : '0'
  return `qd_indicator_param_defaults_v1_${u}`
}

export default {
  name: 'IndicatorIDE',
  mixins: [baseMixin],
  components: { KlineChart, QuickTradePanel },
  data () {
    return {
      userId: null,
      indicators: [],
      loadingIndicators: false,
      selectedIndicatorId: undefined,
      chartVisibleIndicatorIds: [],
      indicatorDropdownVisible: false,
      // The chart and backtest tabs use separate dropdown visibility state
      // while sharing the same selected indicators.
      backtestIndicatorDropdownVisible: false,
      editorFullscreen: false,
      chartFullscreen: false,
      currentCode: '',
      codeDirty: false,
      cmInstance: null,

      codeDrawerVisible: true,
      codePanelExpanded: true,
      paramsPanelExpanded: true,

      strategyDirectivesAlertDismissed: false,

      market: 'Crypto',
      symbol: 'BTC/USDT',
      timeframe: '1D',
      cryptoExchangeId: 'binance',
      cryptoMarketType: 'spot',
      currentInstrumentId: '',
      cryptoExchangeIds: CRYPTO_EXCHANGE_IDS,
      watchlist: [],
      selectedWatchlistKey: 'Crypto:BTC/USDT',

      initialCapital: 10000,
      leverage: 1,
      commission: 0.05,
      slippage: 0.05,
      tradeDirection: 'long',
      strictMode: true,
      // Tracks whether the last finished backtest ran on the full user
      // window ('full') or was pinned to the tuner's training window
      // ('train'). The result banner shows this so users always know
      // which segment they're looking at.
      lastBacktestRangeLabel: 'full',
      // Funding rate simulation (off by default). User may enter 0.10 (=10%/yr)
      // or 10 (auto-detected as percent). Charged every fundingIntervalHours.
      fundingRateAnnual: 0,
      fundingIntervalHours: 8,

      startDate: moment().subtract(6, 'months'),
      endDate: moment(),
      datePreset: '6m',

      running: false,
      runTip: '',
      hasResult: false,
      result: {},
      backtestRunId: null,

      activeIndicators: [],
      chartIndicatorRunning: true,
      quickTradeDrawerVisible: false,
      paramDrawerVisible: false,
      indicatorParamOverrides: {},
      indicatorParamDraft: {},
      signalAlertModalVisible: false,
      signalAlertActiveTab: 'create',
      signalAlertLoading: false,
      signalAlertSaving: false,
      signalAlertTasks: [],
      signalAlertEditingId: null,
      signalAlertTimeframes: ['1m', '5m', '15m', '30m', '1H', '4H', '1D', '1W'],
      signalAlertForm: {
        watchlistKey: 'Crypto:BTC/USDT',
        market: 'Crypto',
        symbol: 'BTC/USDT',
        symbolName: 'Bitcoin',
        timeframe: '1D',
        signalKeys: ['any'],
        channels: ['browser'],
        email: '',
        telegramChatId: '',
        telegramBotToken: '',
        webhookUrl: ''
      },

      // AI generation
      aiPanelExpanded: true,
      aiPrompt: '',
      aiGenerating: false,
      aiDebugSummary: null,
      ideAiTipIndex: 0,
      ideAiTipTimer: null,
      ideAiTips: [
        'Understanding your intent and mapping it to chart-only indicator logic...',
        'Periods, thresholds, switches, and visual preferences should be exposed with @param.',
        'Signals are generated as one-bar events by default so alerts do not repeat.',
        'Persistent regimes belong in plots, lamp rows, or sparse layers rather than repeated markers.',
        'Indicator code stays visual-only; backtest and live execution belong to Script Strategy.',
        'The generated output is checked for length alignment, sandbox safety, and stable pandas usage.'
      ],
      codeQualityHints: [],
      codeQualityLoading: false,

      aiOptimizing: false,
      experimentRunning: false,
      experimentRunKind: 'llm',
      /** Selected tuning method. 'ai' runs the LLM optimizer; the rest run structured sweeps. */
      structuredTuneMethod: 'grid',
      /** Sweep dimension keys the user has opted out of. Drives the
       *  "Tunable Dimensions" panel and shrinks parameterSpace at submit. */
      disabledSweepDims: [],
      experimentResult: null,
      experimentError: '',
      experimentSelectedCandidateName: '',
      experimentCurrentRound: 0,
      experimentMaxRounds: 3,
      experimentRoundScores: [],
      experimentGlobalBestScoreLive: 0,
      experimentAbortController: null,
      experimentLiveHint: '',
      lastAppliedExperimentCandidateName: '',
      lastAppliedExperimentChanges: [],

      // Quick Trade drawer reuse
      qtSymbol: 'BTC/USDT',
      qtSide: '',
      qtPrice: 0,

      creatingIndicator: false,
      savingIndicator: false,
      deletingIndicator: false,
      showPublishModal: false,
      showSaveAsModal: false,
      saveAsName: '',
      savingAs: false,
      publishIndicator: null,
      publishing: false,
      unpublishing: false,
      publishPricingType: 'free',
      publishPrice: 10,
      publishDescription: '',
      publishVipFree: false,
      publishCodeHidden: false,

      showAddModal: false,
      addingStock: false,
      addMarketTab: 'Crypto',
      addSearchKeyword: '',
      addSearchResults: [],
      addSelectedItem: null,
      addSearching: false,
      addSearched: false,
      addSearchTimer: null,

      showHistoryDrawer: false,
      historyIndicatorId: null,
      showCodeVersionDrawer: false,
      codeVersionLoading: false,
      codeVersions: [],
      codeVersionPreview: null,
      restoringCodeVersionId: null,

      ideAddMarketKeys: [],

      eqChartInstance: null,
      elapsedSec: 0,
      elapsedTimer: null,
      experimentScatterInstance: null,
      experimentRadarInstance: null,
      experimentConvergenceInstance: null,
      experimentOosMatrixInstance: null,
      experimentParamSensitivityInstance: null,
      experimentChartsResizeHandler: null,

      // Last successful backtest chart context key.
      backtestRunContextKey: null,
      // Cleanup key for deduplicating marker refreshes.
      backtestMarkerWatchKey: null,
      // Backtest executions should stay visible on the chart so users can
      // compare indicator signals with actual fills and risk exits.
      backtestMarkersVisible: true
    }
  },
  computed: {
    sortedCodeQualityHints () {
      const order = { error: 0, warn: 1, info: 2 }
      return [...(this.codeQualityHints || [])].sort(
        (a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9)
      )
    },
    ideAiCurrentTip () {
      return this.ideAiTips[this.ideAiTipIndex] || ''
    },
    isDarkTheme () {
      return this.navTheme === 'dark' || this.navTheme === 'realdark'
    },
    chartTheme () {
      return this.isDarkTheme ? 'dark' : 'light'
    },
    strategyDirectivesSummary () {
      const raw = this.parseStrategyAnnotationRaw(this.currentCode || '')
      const t = (k) => this.$t(`indicatorIde.strategyDirectives.fields.${k}`) || k
      const notSet = this.$t('indicatorIde.strategyDirectives.notSet') || '--'
      const fmtPct = (rawValue) => {
        const n = parseFloat(rawValue)
        if (!isFinite(n)) return notSet
        const pct = n > 1 && n <= 100 ? n : n * 100
        const fixed = Math.abs(pct) < 1 ? pct.toFixed(2) : pct.toFixed(1)
        return `${fixed}%`
      }
      const fmtBool = (rawValue) => {
        const on = ['true', '1', 'yes', 'on'].includes(String(rawValue || '').toLowerCase())
        return on
          ? this.$t('indicatorIde.strategyDirectives.on') || 'On'
          : this.$t('indicatorIde.strategyDirectives.off') || 'Off'
      }
      const fields = [
        { key: 'stopLossPct', formatter: fmtPct },
        { key: 'takeProfitPct', formatter: fmtPct },
        { key: 'entryPct', formatter: fmtPct },
        { key: 'trailingEnabled', formatter: fmtBool },
        { key: 'trailingStopPct', formatter: fmtPct },
        { key: 'trailingActivationPct', formatter: fmtPct }
      ]
      return fields.map(({ key, formatter }) => {
        const isSet = Object.prototype.hasOwnProperty.call(raw, key) && raw[key] != null && raw[key] !== ''
        return {
          key,
          label: t(key),
          isSet,
          rawValue: raw[key],
          display: isSet ? formatter(raw[key]) : notSet
        }
      })
    },
    ideQtOverlayGetContainer () {
      return (trigger) => this.chartToolbarGetPopupContainer(trigger)
    },
    klineRealtimeEnabled () {
      return !!(this.symbol && String(this.symbol).trim())
    },
    canRunBacktest () {
      return this.selectedIndicatorId && this.symbol && this.startDate && this.endDate
    },
    selectedIndicatorObj () {
      return this.selectedIndicatorId ? this.indicators.find(i => i.id === this.selectedIndicatorId) : null
    },
    selectedIndicatorIsPurchased () {
      const o = this.selectedIndicatorObj
      if (!o) return false
      return Number(o.is_buy) === 1
    },
    selectedIndicatorCodeHidden () {
      const o = this.selectedIndicatorObj
      if (!o) return false
      return this.isIndicatorCodeHidden(o)
    },
    selectedIndicatorParamCode () {
      const ind = this.selectedIndicatorObj
      if (!ind) return ''
      return this.getIndicatorExecutableCode(ind, undefined)
    },
    currentIndicatorParamSpecs () {
      return this.parseIndicatorParamSpecs(this.selectedIndicatorParamCode || '')
    },
    currentIndicatorParamValues () {
      const ind = this.selectedIndicatorObj
      if (!ind) return {}
      return this.resolveIndicatorRuntimeParams(ind, this.selectedIndicatorParamCode)
    },
    selectedIndicatorDisplayName () {
      return this.indicatorDisplayName(this.selectedIndicatorObj)
    },
    runningSignalAlertCount () {
      return (this.signalAlertTasks || []).filter(item => item && item.status === 'running').length
    },
    signalAlertWatchlistOptions () {
      const list = Array.isArray(this.watchlist) ? [...this.watchlist] : []
      const currentKey = `${this.market}:${this.symbol}`
      const exists = list.some(w => `${w.market}:${w.symbol}` === currentKey)
      if (!exists && this.symbol) {
        list.unshift({ market: this.market, symbol: this.symbol, name: this.qtSymbol === this.symbol ? '' : this.qtSymbol })
      }
      return list
    },
    signalAlertSignalOptions () {
      return this.extractSignalAlertOptions(this.selectedIndicatorParamCode || this.currentCode)
    },
    tfMaxDays () {
      return TF_MAX_DAYS[this.timeframe] || 3650
    },
    filteredDatePresets () {
      return DATE_PRESETS.filter(p => p.days <= this.tfMaxDays)
    },
    hasExperimentResult () {
      return !!(this.experimentResult && Array.isArray(this.experimentResult.rankedStrategies) && this.experimentResult.rankedStrategies.length)
    },
    experimentRankedStrategies () {
      return (this.experimentResult && this.experimentResult.rankedStrategies) || []
    },
    experimentAdjustedRankedStrategies () {
      return this.experimentRankedStrategies
        .map(item => this.withExperimentAdjustedScore(item))
        .sort((a, b) => ((b.score || {}).overallScore || 0) - ((a.score || {}).overallScore || 0))
        .map((item, idx) => ({ ...item, rank: idx + 1 }))
    },
    experimentSelectedCandidate () {
      const items = this.experimentAdjustedRankedStrategies
      if (!items.length) return null
      return items.find(item => item.name === this.experimentSelectedCandidateName) || items[0]
    },
    experimentSelectedCandidateCanApply () {
      const candidate = this.experimentSelectedCandidate
      return !!(candidate && candidate.overrides && Object.keys(candidate.overrides).length)
    },
    experimentBest () {
      return this.experimentAdjustedRankedStrategies[0] || (this.experimentResult && this.experimentResult.bestStrategyOutput) || null
    },
    experimentOosMeta () {
      return (this.experimentResult && this.experimentResult.oosValidation) || null
    },
    experimentScoringWeights () {
      return (this.experimentResult && this.experimentResult.scoringWeights) || null
    },
    experimentTopWeights () {
      const w = this.experimentScoringWeights
      if (!w) return []
      const labels = {
        return: this.$t('indicatorIde.totalReturn'),
        annual_return: this.$t('indicatorIde.scoreAnnualReturn'),
        sharpe: this.$t('indicatorIde.sharpeRatio'),
        profit_factor: this.$t('indicatorIde.profitFactor'),
        win_rate: this.$t('indicatorIde.winRate'),
        drawdown: this.$t('indicatorIde.maxDrawdown'),
        stability: this.$t('indicatorIde.stability')
      }
      return Object.entries(w)
        .map(([key, value]) => ({ key, label: labels[key] || key, value: Number(value || 0) }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 3)
    },
    tuneMethodOptions () {
      return [
        {
          value: 'grid',
          icon: 'appstore',
          label: this.$t('indicatorIde.structuredTuneGrid'),
          hint: this.$t('indicatorIde.structuredTuneGridHint'),
          badge: this.$t('indicatorIde.structuredTuneBadgeBasic')
        },
        {
          value: 'random',
          icon: 'sync',
          label: this.$t('indicatorIde.structuredTuneRandom'),
          hint: this.$t('indicatorIde.structuredTuneRandomHint'),
          badge: this.$t('indicatorIde.structuredTuneBadgeBasic')
        },
        {
          value: 'de',
          icon: 'branches',
          label: this.$t('indicatorIde.structuredTuneDe'),
          hint: this.$t('indicatorIde.structuredTuneDeHint'),
          badge: this.$t('indicatorIde.structuredTuneBadgePro')
        },
        {
          value: 'tpe',
          icon: 'bulb',
          label: this.$t('indicatorIde.structuredTuneTpe'),
          hint: this.$t('indicatorIde.structuredTuneTpeHint'),
          badge: this.$t('indicatorIde.structuredTuneBadgePro')
        },
        {
          value: 'ai',
          icon: 'experiment',
          label: this.$t('indicatorIde.tuneModeAi'),
          hint: this.$t('indicatorIde.aiTuneExplain'),
          badge: this.$t('indicatorIde.structuredTuneBadgePro')
        }
      ]
    },
    activeTuneMethodOption () {
      return this.tuneMethodOptions.find(opt => opt.value === this.structuredTuneMethod) || null
    },
    /**
     * Full list of dimensions the structured tuner could sweep, with metadata
     * for the "Tunable Dimensions" panel. Order matters: indicator @param
     * dimensions are appended after the four built-in risk/position knobs so
     * the UI groups them visually.
     *
     * Each item:
     *   { key, label, group, source, type, defaultValue, values, enabled }
     *
     * Sources:
     */
    experimentSweepDimensions () {
      const dims = []
      const disabled = new Set(this.disabledSweepDims || [])
      // `$t` returns the key itself when a translation is missing, so a plain
      // `$t(key) || fallback` never falls through. Use `$te` (translation
      // exists) to detect missing keys and substitute a readable English label
      const tr = (key, fallback) => (this.$te && this.$te(key)) ? this.$t(key) : fallback
      const fractionSeries = (ratio, fallbackValues, multipliers = [0.5, 1, 1.5], max = 1) => {
        const raw = Number(ratio || 0)
        if (raw <= 0) return fallbackValues
        const values = multipliers.map(m => Math.max(0, Math.min(max, Number((raw * m).toFixed(4)))))
        return Array.from(new Set(values)).sort((a, b) => a - b)
      }
      const ann = this.parseStrategyAnnotationRaw(this.currentCode || '')
      const slR = parseFloat(ann.stopLossPct)
      const tpR = parseFloat(ann.takeProfitPct)
      const enR = parseFloat(ann.entryPct)
      const stopLossValues = fractionSeries(!isNaN(slR) ? slR : 0, [0, 0.01, 0.02], [0.5, 1, 1.5], 1)
      const takeProfitValues = fractionSeries(!isNaN(tpR) ? tpR : 0, [0.03, 0.05, 0.08], [0.75, 1, 1.25], 5)
      let entryBase = !isNaN(enR) && enR > 0 ? enR : 1
      if (entryBase > 1 && entryBase <= 100) entryBase = entryBase / 100
      const entryPctValues = fractionSeries(entryBase, [0.25, 0.5, 1], [0.5, 1, 1.25], 1)
      const leverageBase = Math.max(1, Number(this.leverage || 1))
      const leverageValues = Array.from(new Set([
        Math.max(1, leverageBase - 1), leverageBase, Math.min(5, leverageBase + 1)
      ])).sort((a, b) => a - b)

      const pushDim = (entry) => {
        if (!entry.values || entry.values.length < 2) return
        dims.push({ ...entry, enabled: !disabled.has(entry.key) })
      }

      pushDim({ key: 'strategyConfig.risk.stopLossPct', label: tr('indicatorIde.stopLossPct', 'Stop Loss (%)'), group: 'risk', source: 'risk', type: 'float', values: stopLossValues })
      pushDim({ key: 'strategyConfig.risk.takeProfitPct', label: tr('indicatorIde.takeProfitPct', 'Take Profit (%)'), group: 'risk', source: 'risk', type: 'float', values: takeProfitValues })
      pushDim({ key: 'strategyConfig.position.entryPct', label: tr('indicatorIde.entryPct', 'Entry (%)'), group: 'position', source: 'position', type: 'float', values: entryPctValues })
      pushDim({ key: 'leverage', label: tr('indicatorIde.leverage', 'Leverage'), group: 'risk', source: 'leverage', type: 'int', values: leverageValues })

      // P4: only sweep trailing-stop knobs when the strategy actually enables
      // backtest never reads.
      const trailingEnabled = String(ann.trailingEnabled || '').toLowerCase() === 'true'
      if (trailingEnabled) {
        const trailingPctBase = parseFloat(ann.trailingStopPct)
        const activationBase = parseFloat(ann.trailingActivationPct)
        const trailingPctValues = fractionSeries(!isNaN(trailingPctBase) ? trailingPctBase : 0, [0.005, 0.01, 0.02], [0.5, 1, 1.5], 1)
        const activationValues = fractionSeries(!isNaN(activationBase) ? activationBase : 0, [0.003, 0.005, 0.01], [0.5, 1, 1.5], 1)
        pushDim({ key: 'strategyConfig.risk.trailing.pct', label: tr('indicatorIde.trailingStopPct', 'Trailing Stop (%)'), group: 'risk', source: 'risk', type: 'float', values: trailingPctValues })
        pushDim({ key: 'strategyConfig.risk.trailing.activationPct', label: tr('indicatorIde.trailingActivationPct', 'Trailing Activation (%)'), group: 'risk', source: 'risk', type: 'float', values: activationValues })
      }

      const paramMeta = this.parseIndicatorParamRanges(this.currentCode || '')
      for (const [name, meta] of Object.entries(paramMeta)) {
        if (!meta || !Array.isArray(meta.values) || meta.values.length < 2) continue
        pushDim({
          key: `indicator_params.${name}`,
          label: name,
          group: 'indicator',
          source: meta.source === 'declared' ? 'indicator_declared' : 'indicator_inferred',
          type: meta.type,
          defaultValue: meta.defaultValue,
          values: meta.values
        })
      }
      return dims
    },
    experimentEnabledSweepDimensions () {
      return this.experimentSweepDimensions.filter(d => d.enabled)
    },
    experimentParameterSpace () {
      const out = {}
      for (const d of this.experimentEnabledSweepDimensions) {
        out[d.key] = d.values
      }
      return out
    },
    /**
     *  heuristic. Capped at Number.MAX_SAFE_INTEGER style overflow by clamping
     *  to a sentinel so the UI label stays readable on absurd spaces. */
    experimentCartesianSize () {
      let prod = 1
      for (const d of this.experimentEnabledSweepDimensions) {
        prod *= d.values.length
        if (prod > 1e12) return Infinity
      }
      return prod
    },
    experimentAnalyticsCandidates () {
      const list = this.experimentAdjustedRankedStrategies || []
      return list.filter(c => c && c.score && c.result)
    },
    experimentHasAnalytics () {
      const analytics = this.experimentAnalytics || {}
      return this.experimentAnalyticsCandidates.length >= 2 ||
        ((analytics.convergence || []).length >= 2) ||
        ((analytics.parameterSensitivity || []).length > 0)
    },
    experimentAnalytics () {
      return (this.experimentResult && this.experimentResult.analytics) || {}
    },
    experimentAnalyticsSummary () {
      return this.experimentAnalytics.summary || {}
    },
    experimentScoreDistribution () {
      return this.experimentAnalytics.scoreDistribution || {}
    },
    experimentConvergenceData () {
      return this.experimentAnalytics.convergence || []
    },
    experimentOosMatrixData () {
      return this.experimentAnalytics.oosMatrix || []
    },
    experimentParameterSensitivityData () {
      return this.experimentAnalytics.parameterSensitivity || []
    },
    experimentOptimizerMethodLabel () {
      const summary = this.experimentAnalyticsSummary || {}
      const exp = (this.experimentResult && this.experimentResult.experiment) || {}
      return this.formatExperimentOptimizerMethod(summary.method || exp.method || this.structuredTuneMethod)
    },
    experimentDataAuditCards () {
      const summary = this.experimentAnalyticsSummary || {}
      const dist = this.experimentScoreDistribution || {}
      const evalCount = Number(summary.evaluationCount || this.experimentAnalyticsCandidates.length || 0)
      const dims = Number(summary.parameterCount || this.experimentEnabledSweepDimensions.length || 0)
      const std = dist.std == null ? '--' : Number(dist.std || 0).toFixed(2)
      const oosCount = Number(summary.oosCount || this.experimentOosMatrixData.length || 0)
      return [
        {
          key: 'optimizer',
          icon: 'deployment-unit',
          label: this.$t('indicatorIde.optimizerModel'),
          value: this.experimentOptimizerMethodLabel,
          hint: this.$t('indicatorIde.optimizerModelHint')
        },
        {
          key: 'budget',
          icon: 'database',
          label: this.$t('indicatorIde.evaluationBudget'),
          value: `${evalCount} / ${dims}`,
          hint: this.$t('indicatorIde.evaluationBudgetHint')
        },
        {
          key: 'distribution',
          icon: 'bar-chart',
          label: this.$t('indicatorIde.scoreDispersion'),
          value: std,
          hint: this.$t('indicatorIde.scoreDispersionHint')
        },
        {
          key: 'oos',
          icon: 'safety-certificate',
          label: this.$t('indicatorIde.oosAudit'),
          value: oosCount ? `${oosCount}` : '--',
          hint: this.$t('indicatorIde.oosAuditHint')
        }
      ]
    },
    experimentBestComponents () {
      const best = this.experimentBest
      if (!best || !best.score || !best.score.components) return null
      const c = best.score.components
      const labels = {
        returnScore: this.$t('indicatorIde.totalReturn'),
        sharpeScore: this.$t('indicatorIde.sharpeRatio'),
        profitFactorScore: this.$t('indicatorIde.profitFactor'),
        winRateScore: this.$t('indicatorIde.winRate'),
        drawdownScore: this.$t('indicatorIde.maxDrawdown'),
        stabilityScore: this.$t('indicatorIde.stability')
      }
      return Object.keys(labels)
        .filter(k => typeof c[k] === 'number')
        .map(k => ({ key: k, label: labels[k], value: Number(c[k] || 0) }))
    },
    experimentRegime () {
      return (this.experimentResult && this.experimentResult.regime) || null
    },
    experimentRegimeLabel () {
      const regime = this.experimentRegime
      return regime ? this.translateExperimentRegime(regime.regime || regime.label || '') : '--'
    },
    experimentRegimeConfidence () {
      const regime = this.experimentRegime
      return regime ? `${Math.round(Number(regime.confidence || 0) * 100)}%` : '--'
    },
    experimentPreferredFamilies () {
      return ((this.experimentResult && this.experimentResult.generatorHints && this.experimentResult.generatorHints.preferredFamilies) || [])
        .slice(0, 4)
        .map(key => ({ key, label: this.translateExperimentFamily(key) }))
    },
    experimentPromptHint () {
      const regimeLabel = this.experimentRegimeLabel
      const familyLabels = this.experimentPreferredFamilies.map(item => item.label)
      const mode = (this.experimentResult && this.experimentResult.experiment && this.experimentResult.experiment.mode) || ''
      if (!familyLabels.length) {
        if (mode === 'structured') return this.$t('indicatorIde.structuredTuneResultHint')
        return this.$t('indicatorIde.aiTuneCta')
      }
      return this.$t('indicatorIde.experimentPromptHint', {
        regime: regimeLabel,
        families: familyLabels.join(' / ')
      })
    },
    experimentBestScore () {
      const score = this.experimentBest && this.experimentBest.score
      return score ? (Number(score.overallScore || 0)).toFixed(2) : '--'
    },
    experimentBestGrade () {
      const score = this.experimentBest && this.experimentBest.score
      return score ? (score.grade || 'C') : '--'
    },
    experimentBestSummary () {
      const best = this.experimentBest || {}
      const summary = best.summary || best.result || {}
      return {
        totalReturn: summary.totalReturn == null ? '--' : this.fmtPct(summary.totalReturn),
        maxDrawdown: summary.maxDrawdown == null ? '--' : this.fmtPct(summary.maxDrawdown),
        sharpeRatio: summary.sharpeRatio == null ? '--' : Number(summary.sharpeRatio || 0).toFixed(2),
        totalTrades: summary.totalTrades == null ? '--' : String(summary.totalTrades)
      }
    },
    experimentBestOosSummary () {
      const best = this.experimentBest || {}
      const summary = best.oosSummary
      if (!summary) return null
      return {
        totalReturn: summary.totalReturn == null ? '--' : this.fmtPct(summary.totalReturn),
        maxDrawdown: summary.maxDrawdown == null ? '--' : this.fmtPct(summary.maxDrawdown),
        sharpeRatio: summary.sharpeRatio == null ? '--' : Number(summary.sharpeRatio || 0).toFixed(2),
        totalTrades: summary.totalTrades == null ? '--' : String(summary.totalTrades)
      }
    },
    experimentBestOosUnavailableText () {
      const best = this.experimentBest || {}
      if (best.oosError) {
        return this.$t('indicatorIde.oosFailed', { error: best.oosError })
      }
      return this.$t('indicatorIde.oosNotAvailable')
    },
    experimentBestOverfit () {
      return !!(this.experimentBest && this.experimentBest.oosOverfit)
    },
    experimentBestDegradePct () {
      const d = this.experimentBest && this.experimentBest.oosDegradation
      if (d == null || !isFinite(d)) return '--'
      return (Number(d) * 100).toFixed(1)
    },
    experimentFeatureMap () {
      const features = (this.experimentRegime && this.experimentRegime.features) || {}
      return {
        priceChangePct: features.priceChangePct == null ? '--' : this.fmtPct(features.priceChangePct),
        realizedVolPct: features.realizedVolPct == null ? '--' : this.fmtPct(features.realizedVolPct),
        atrPct: features.atrPct == null ? '--' : this.fmtPct(features.atrPct),
        directionalEfficiency: features.directionalEfficiency == null ? '--' : Number(features.directionalEfficiency || 0).toFixed(2)
      }
    },
    experimentBestOverrides () {
      const overrides = (this.experimentBest && this.experimentBest.overrides) || {}
      return Object.keys(overrides).map(key => ({
        key,
        label: `${this.humanizeExperimentKey(key)}: ${this.formatExperimentOverrideValue(key, overrides[key])}`
      }))
    },
    experimentSelectedOverrides () {
      const overrides = (this.experimentSelectedCandidate && this.experimentSelectedCandidate.overrides) || {}
      return Object.keys(overrides).map(key => ({
        key,
        label: `${this.humanizeExperimentKey(key)}: ${this.formatExperimentOverrideValue(key, overrides[key])}`
      }))
    },
    experimentSelectedSummary () {
      const result = (this.experimentSelectedCandidate && this.experimentSelectedCandidate.result) || {}
      const score = (this.experimentSelectedCandidate && this.experimentSelectedCandidate.score) || {}
      return [
        { label: this.$t('indicatorIde.score'), value: ((score.overallScore || 0)).toFixed(2) },
        { label: this.$t('indicatorIde.grade'), value: score.grade || '--' },
        { label: this.$t('indicatorIde.totalReturn'), value: this.fmtPct(result.totalReturn) },
        { label: this.$t('indicatorIde.maxDrawdown'), value: this.fmtPct(result.maxDrawdown) },
        { label: this.$t('indicatorIde.sharpeRatio'), value: ((result.sharpeRatio || 0)).toFixed(2) },
        { label: this.$t('indicatorIde.tradeCount'), value: String(result.totalTrades || 0) }
      ]
    },
    experimentSelectedChangeEntries () {
      return this.buildExperimentChangeEntries(this.experimentSelectedCandidate)
    },
    experimentSelectedChangedEntries () {
      return this.experimentSelectedChangeEntries.filter(item => item.changed)
    },
    experimentSelectedScoreComponents () {
      const components = ((this.experimentSelectedCandidate && this.experimentSelectedCandidate.score) || {}).components || {}
      return Object.keys(components).slice(0, 6).map(key => ({
        key,
        label: this.humanizeExperimentScoreKey(key),
        value: Number(components[key] || 0).toFixed(2)
      }))
    },
    experimentRoundsInfo () {
      return ((this.experimentResult && this.experimentResult.rounds) || []).map(r => ({
        round: r.round || 0,
        bestScore: r.bestScore || 0,
        globalBestScore: r.globalBestScore || 0,
        candidateCount: r.candidateCount || 0,
        elapsed: r.elapsed || 0,
        error: r.error || null
      }))
    },
    experimentProgressPct () {
      if (!this.experimentMaxRounds) return 0
      if (this.experimentRunKind !== 'llm') return 0
      if (this.experimentRunning && this.experimentCurrentRound < 1) {
        return 6
      }
      return Math.min(100, Math.round((this.experimentCurrentRound / this.experimentMaxRounds) * 100))
    },
    experimentSegmentList () {
      return (this.experimentRegime && this.experimentRegime.segments) || []
    },
    experimentCandidateCards () {
      return this.experimentAdjustedRankedStrategies.slice(0, 8)
    },
    experimentColumns () {
      return [
        { title: '#', dataIndex: 'rank', width: 50 },
        { title: this.$t('indicatorIde.strategyCandidate'), dataIndex: 'name', scopedSlots: { customRender: 'experimentName' }, width: 180 },
        { title: this.$t('indicatorIde.score'), dataIndex: 'score', scopedSlots: { customRender: 'experimentScore' }, width: 90 },
        { title: this.$t('indicatorIde.grade'), dataIndex: 'grade', scopedSlots: { customRender: 'experimentGrade' }, width: 80 },
        { title: this.$t('indicatorIde.totalReturn'), dataIndex: 'totalReturn', scopedSlots: { customRender: 'experimentReturn' }, width: 110 },
        { title: this.$t('indicatorIde.maxDrawdown'), dataIndex: 'maxDrawdown', scopedSlots: { customRender: 'experimentDrawdown' }, width: 110 },
        { title: this.$t('indicatorIde.sharpeRatio'), dataIndex: 'sharpeRatio', scopedSlots: { customRender: 'experimentSharpe' }, width: 90 },
        { title: this.$t('indicatorIde.tradeCount'), dataIndex: 'totalTrades', scopedSlots: { customRender: 'experimentTrades' }, width: 90 }
      ]
    },
    benchmarkSummaryCards () {
      const r = this.result || {}
      if (r.benchmarkReturn == null) return []
      return [
        { label: this.$t('indicatorIde.strategyReturn'), value: this.fmtPct(r.totalReturn), cls: (r.totalReturn || 0) >= 0 ? 'positive' : 'negative' },
        { label: this.$t('indicatorIde.spotReturn'), value: this.fmtPct(r.benchmarkReturn), cls: (r.benchmarkReturn || 0) >= 0 ? 'positive' : 'negative' },
        { label: this.$t('indicatorIde.alphaVsSpot'), value: this.fmtPct(r.alphaReturn), cls: (r.alphaReturn || 0) >= 0 ? 'positive' : 'negative' }
      ]
    },
    backtestInsight () {
      const r = this.result || {}
      if (!this.hasResult) return this.$t('indicatorIde.insightEmpty')
      const total = Number(r.totalReturn || 0)
      const alpha = r.alphaReturn != null ? Number(r.alphaReturn || 0) : null
      const drawdown = Math.abs(Number(r.maxDrawdown || 0))
      if (alpha != null && alpha > 0 && drawdown <= 15) return this.$t('indicatorIde.insightStrongAlpha')
      if (alpha != null && alpha > 0) return this.$t('indicatorIde.insightPositiveAlphaHighRisk')
      if (alpha != null && alpha <= 0 && total > 0) return this.$t('indicatorIde.insightPositiveButLagging')
      if (total <= 0) return this.$t('indicatorIde.insightNegativeReturn')
      return this.$t('indicatorIde.insightNeedMoreTrades')
    },
    backtestDiagnostics () {
      const r = this.result || {}
      const alpha = r.alphaReturn != null ? Number(r.alphaReturn || 0) : null
      const drawdown = Math.abs(Number(r.maxDrawdown || 0))
      const trades = Number(r.totalTrades || 0)
      const sharpe = Number(r.sharpeRatio || 0)
      return [
        {
          key: 'benchmark',
          icon: alpha != null && alpha >= 0 ? 'rise' : 'fall',
          tone: alpha == null ? 'neutral' : alpha >= 0 ? 'good' : 'warn',
          title: this.$t('indicatorIde.diagnosticBenchmarkTitle'),
          value: alpha == null ? '--' : this.fmtPct(alpha),
          desc: alpha == null ? this.$t('indicatorIde.diagnosticBenchmarkMissing') : (alpha >= 0 ? this.$t('indicatorIde.diagnosticBenchmarkGood') : this.$t('indicatorIde.diagnosticBenchmarkWarn'))
        },
        {
          key: 'drawdown',
          icon: 'warning',
          tone: drawdown <= 10 ? 'good' : drawdown <= 25 ? 'warn' : 'danger',
          title: this.$t('indicatorIde.diagnosticDrawdownTitle'),
          value: this.fmtPct(r.maxDrawdown),
          desc: drawdown <= 10 ? this.$t('indicatorIde.diagnosticDrawdownGood') : drawdown <= 25 ? this.$t('indicatorIde.diagnosticDrawdownWarn') : this.$t('indicatorIde.diagnosticDrawdownDanger')
        },
        {
          key: 'sample',
          icon: 'database',
          tone: trades >= 20 ? 'good' : trades >= 8 ? 'warn' : 'danger',
          title: this.$t('indicatorIde.diagnosticSampleTitle'),
          value: String(trades),
          desc: trades >= 20 ? this.$t('indicatorIde.diagnosticSampleGood') : trades >= 8 ? this.$t('indicatorIde.diagnosticSampleWarn') : this.$t('indicatorIde.diagnosticSampleDanger')
        },
        {
          key: 'quality',
          icon: 'sliders',
          tone: sharpe >= 1 ? 'good' : sharpe >= 0.4 ? 'warn' : 'danger',
          title: this.$t('indicatorIde.diagnosticSharpeTitle'),
          value: sharpe.toFixed(2),
          desc: sharpe >= 1 ? this.$t('indicatorIde.diagnosticSharpeGood') : sharpe >= 0.4 ? this.$t('indicatorIde.diagnosticSharpeWarn') : this.$t('indicatorIde.diagnosticSharpeDanger')
        }
      ]
    },
    tradePnlSummary () {
      const trades = Array.isArray((this.result || {}).trades) ? this.result.trades : []
      const pnls = trades
        .map(trade => Number((trade || {}).profit))
        .filter(value => Number.isFinite(value) && value !== 0)
      if (!pnls.length) {
        return null
      }
      const total = pnls.reduce((sum, value) => sum + value, 0)
      return {
        best: Math.max(...pnls),
        worst: Math.min(...pnls),
        average: total / pnls.length
      }
    },
    metricCards () {
      const r = this.result || {}
      const pnl = this.tradePnlSummary
      const pnlCls = value => value > 0 ? 'positive' : value < 0 ? 'negative' : ''
      return [
        { label: this.$t('indicatorIde.totalReturn'), value: this.fmtPct(r.totalReturn), cls: (r.totalReturn || 0) >= 0 ? 'positive' : 'negative' },
        { label: this.$t('indicatorIde.maxDrawdown'), value: this.fmtPct(r.maxDrawdown), cls: 'negative' },
        ...(r.benchmarkReturn != null
? [
          { label: this.$t('indicatorIde.alphaVsSpot'), value: this.fmtPct(r.alphaReturn), cls: (r.alphaReturn || 0) >= 0 ? 'positive' : 'negative' }
        ]
: []),
        { label: this.$t('indicatorIde.sharpeRatio'), value: (r.sharpeRatio || 0).toFixed(2), cls: (r.sharpeRatio || 0) >= 1 ? 'positive' : '' },
        { label: this.$t('indicatorIde.winRate'), value: this.fmtPct(r.winRate), cls: (r.winRate || 0) >= 50 ? 'positive' : '' },
        { label: this.$t('indicatorIde.profitFactor'), value: (r.profitFactor || 0).toFixed(2), cls: (r.profitFactor || 0) >= 1.5 ? 'positive' : '' },
        { label: this.$t('indicatorIde.tradeCount'), value: String(r.totalTrades || 0), cls: '' },
        { label: this.$t('indicatorIde.bestTrade'), value: pnl ? this.fmtMoney(pnl.best) : '--', cls: pnl ? pnlCls(pnl.best) : '' },
        { label: this.$t('indicatorIde.worstTrade'), value: pnl ? this.fmtMoney(pnl.worst) : '--', cls: pnl ? pnlCls(pnl.worst) : '' },
        { label: this.$t('indicatorIde.avgTradePnl'), value: pnl ? this.fmtMoney(pnl.average) : '--', cls: pnl ? pnlCls(pnl.average) : '' }
      ]
    },
    chartIndicatorToggleDisabled () {
      if (this.chartIndicatorRunning) return false
      if (!this.chartVisibleIndicatorIds.length) return true
      return !this.chartVisibleIndicatorIds.some((rawId) => {
        const id = Number(rawId)
        const ind = this.indicators.find(i => Number(i.id) === id)
        const code = this.getIndicatorExecutableCode(ind)
        return code && String(code).trim()
      })
    },
    indicatorToolbarSummary () {
      const ed = this.selectedIndicatorObj
      const edLabel = this.indicatorDisplayName(ed)
      const n = (this.chartVisibleIndicatorIds && this.chartVisibleIndicatorIds.length) || 0
      if (!this.indicators.length) return this.$t('indicatorIde.noIndicatorsYet')
      if (!n) return `${edLabel} · ${this.$t('indicatorIde.indicatorPickPlaceholder')}`
      return `${edLabel} · ${this.$t('indicatorIde.indicatorCountOnChart', { n })}`
    },
    pairedTrades () {
      const raw = (this.result && this.result.trades) || []
      const pairs = []
      let openTrade = null
      for (let i = 0; i < raw.length; i++) {
        const t = raw[i]
        const ty = (t.type || '').toLowerCase()
        if (ty.startsWith('open_') || ty === 'buy') {
          openTrade = t
        } else if (openTrade) {
          const direction = openTrade.type.includes('long') || openTrade.type === 'buy' ? 'long' : 'short'
          const entryTs = this.tradeTimeValue(openTrade.time)
          const exitTs = this.tradeTimeValue(t.time)
          pairs.push({
            type: direction,
            closeType: t.type || '',
            closeReason: t.reason || t.close_reason || '',
            entryDate: formatBacktestTime(openTrade.time, { fallback: '' }),
            exitDate: formatBacktestTime(t.time, { fallback: '' }),
            entryTs,
            exitTs,
            entryPrice: openTrade.price,
            exitPrice: t.price,
            profit: t.profit || 0,
            balance: t.balance != null ? t.balance : 0
          })
          openTrade = null
        }
      }
      return pairs
        .sort((a, b) => (b.exitTs || b.entryTs || 0) - (a.exitTs || a.entryTs || 0))
        .map((item, index) => ({ ...item, id: pairs.length - index }))
    },
    tradeColumns () {
      return [
        { title: '#', dataIndex: 'id', width: 50 },
        { title: this.$t('indicatorIde.type'), dataIndex: 'type', scopedSlots: { customRender: 'type' }, width: 80 },
        { title: this.$t('indicatorIde.exitTag'), dataIndex: 'closeType', scopedSlots: { customRender: 'exitTag' }, width: 108 },
        { title: this.$t('indicatorIde.profit'), dataIndex: 'profit', scopedSlots: { customRender: 'profit' }, width: 120 },
        { title: this.$t('indicatorIde.entryPrice'), dataIndex: 'entryPrice', scopedSlots: { customRender: 'price' }, width: 100 },
        { title: this.$t('indicatorIde.exitPrice'), dataIndex: 'exitPrice', scopedSlots: { customRender: 'price' }, width: 100 },
        { title: this.$t('indicatorIde.entry'), dataIndex: 'entryDate', width: 140 },
        { title: this.$t('indicatorIde.exit'), dataIndex: 'exitDate', width: 140 },
        { title: this.$t('indicatorIde.balance'), dataIndex: 'balance', scopedSlots: { customRender: 'money' }, width: 130 }
      ]
    },
    showBacktestMarkerLegend () {
      return this.shouldShowBacktestMarkersOnChart()
    }
  },
  created: async function () {
    await this.loadMarketModules()
    await this.loadUserId()
    await this.initializeCryptoMarketSource()
    this.loadIndicatorParamDefaults()
    this.loadStrategyDirectivesAlertDismissed()
    await this.loadIndicators()
    await this.loadWatchlist()
    this.restoreIdeUiState()
    this.restoreIdeSelectionPreference()
    this.applyIndicatorRouteSelection()
    this.autoSelectFirstIndicator()
    this.loadSignalAlertTasks()
    this.applyCopilotDraft()
  },
  mounted () {
    this._fullscreenListener = () => this.onGlobalFullscreenChange()
    this._saveShortcutListener = (event) => this.handleGlobalSaveShortcut(event)
    document.addEventListener('fullscreenchange', this._fullscreenListener)
    document.addEventListener('webkitfullscreenchange', this._fullscreenListener)
    window.addEventListener('keydown', this._saveShortcutListener)
    this.$nextTick(() => {
      this.initCodeMirror()
      this.ensureChartReady()
      this.applyIdeOverlayContainers()
    })
  },
  beforeDestroy () {
    if (this._persistIdeUiTimer) {
      clearTimeout(this._persistIdeUiTimer)
      this._persistIdeUiTimer = null
    }
    this.persistIdeUiState()
    if (this.cmInstance) {
      this.cmInstance.toTextArea()
      this.cmInstance = null
    }
    if (this.eqChartInstance) {
      this.eqChartInstance.dispose()
      this.eqChartInstance = null
    }
    this.disposeExperimentCharts()
    clearInterval(this.elapsedTimer)
    clearTimeout(this.addSearchTimer)
    if (this.ideAiTipTimer) clearInterval(this.ideAiTipTimer)
    if (this.experimentAbortController) {
      try { this.experimentAbortController.abort() } catch (_) {}
      this.experimentAbortController = null
    }
    window.removeEventListener('resize', this._onResize)
    if (this._fullscreenListener) {
      document.removeEventListener('fullscreenchange', this._fullscreenListener)
      document.removeEventListener('webkitfullscreenchange', this._fullscreenListener)
      this._fullscreenListener = null
    }
    if (this._saveShortcutListener) {
      window.removeEventListener('keydown', this._saveShortcutListener)
      this._saveShortcutListener = null
    }
    try {
      message.destroy()
      message.config({ getContainer: () => document.body })
    } catch (_) {}
  },
  methods: {
    toggleCodeDrawer () {
      this.codeDrawerVisible = !this.codeDrawerVisible
    },
    async loadMarketModules () {
      const options = await loadEnabledMarketOptions({ includeFeatures: ['research'] })
      this.ideAddMarketKeys = options.map(item => item.value)
      if (!this.ideAddMarketKeys.includes(this.addMarketTab)) {
        this.addMarketTab = firstMarketValue(options)
      }
      if (!this.ideAddMarketKeys.includes(this.market)) {
        this.market = this.addMarketTab || firstMarketValue(options)
      }
    },
    applyCopilotDraft () {
      const q = this.$route && this.$route.query ? this.$route.query : {}
      const targetTab = String(q.tab || '').toLowerCase()
      if (targetTab === 'backtest') {
        const nextQuery = { ...q }
        delete nextQuery.tab
        this.$router.replace({ path: '/indicator-ide', query: nextQuery }).catch(() => {})
      }
      let prompt = ''
      let code = ''
      try {
        prompt = q.aiPrompt ? decodeURIComponent(String(q.aiPrompt)) : ''
      } catch (_) {
        prompt = String(q.aiPrompt || '')
      }
      if (!prompt) {
        try {
          prompt = sessionStorage.getItem('qd_copilot_indicator_prompt') || ''
          if (prompt) sessionStorage.removeItem('qd_copilot_indicator_prompt')
        } catch (_) {}
      }
      try {
        code = sessionStorage.getItem('qd_copilot_indicator_code') || ''
        if (code) sessionStorage.removeItem('qd_copilot_indicator_code')
      } catch (_) {}
      if (code) {
        prompt = ''
        try { sessionStorage.removeItem('qd_copilot_indicator_prompt') } catch (_) {}
      }
      if (prompt) {
        this.aiPrompt = prompt
        this.aiPanelExpanded = true
        this.codeDrawerVisible = true
        this.codePanelExpanded = true
      }
      if (code) {
        this.currentCode = code
        this.codeDirty = true
        this.codeDrawerVisible = true
        this.codePanelExpanded = true
        this.$nextTick(() => {
          if (this.cmInstance) {
            this.cmInstance.setValue(code)
            this.cmInstance.refresh()
          }
          this.syncTradeUiFromStrategyCode(code, { silent: true })
        })
      }
    },
    // ===== Data loading =====
    async loadUserId () {
      try {
        const res = await getUserInfo()
        if (res && res.data) this.userId = res.data.id || res.data.user_id || 1
      } catch (_) {
        this.userId = 1
      }
    },

    loadStrategyDirectivesAlertDismissed () {
      try {
        const raw = storage.get(strategyDirectivesAlertStorageKey(this.userId))
        this.strategyDirectivesAlertDismissed =
          raw === true || raw === 1 || raw === '1' || raw === 'true'
      } catch (_) {
        this.strategyDirectivesAlertDismissed = false
      }
    },

    dismissStrategyDirectivesAlert () {
      this.strategyDirectivesAlertDismissed = true
      try {
        storage.set(strategyDirectivesAlertStorageKey(this.userId), '1')
      } catch (_) { /* ignore quota */ }
    },

    openStrategyDirectivesDocs () {
      const url = 'https://github.com/brokermr810/QuantDinger/blob/main/docs/INDICATOR_DEV_GUIDE_CN.md'
      try {
        window.open(url, '_blank', 'noopener')
      } catch (_) { /* ignore */ }
    },

    // Jump CodeMirror to the requested @strategy directive.
    jumpToStrategyDirectiveLine (key) {
      const cm = this.cmInstance
      if (!cm) return
      const code = String(this.currentCode || '')
      if (!code) return
      const lines = code.split('\n')
      const lineRe = key
        ? new RegExp('^\\s*#\\s*@strategy\\s+' + key + '\\b', 'i')
        : /^\s*#\s*@strategy\s+/i
      let target = -1
      for (let i = 0; i < lines.length; i++) {
        if (lineRe.test(lines[i])) { target = i; break }
      }
      if (target < 0 && key) {
        for (let i = 0; i < lines.length; i++) {
          if (/^\s*#\s*@strategy\s+/i.test(lines[i])) { target = i; break }
        }
      }
      if (target < 0) target = 0

      try {
        if (this.codeDrawerVisible === false) {
          this.codeDrawerVisible = true
        }
      } catch (_) { /* ignore */ }

      this.$nextTick(() => {
        try {
          cm.focus()
          cm.setCursor({ line: target, ch: 0 })
          if (typeof cm.scrollIntoView === 'function') {
            cm.scrollIntoView({ line: target, ch: 0 }, 80)
          }
        } catch (_) { /* ignore */ }
      })
    },

    restoreIdeUiState () {
      if (!this.userId) return
      try {
        const raw = storage.get(ideUiCacheStorageKey(this.userId))
        if (raw == null || raw === '') return
        const s = typeof raw === 'string' ? JSON.parse(raw) : raw
        if (!s || typeof s !== 'object') return
        let hadChartVisibleKey = false
        if (Array.isArray(s.activeIndicators)) {
          this.activeIndicators = this.normalizePersistedChartIndicators(s.activeIndicators)
        }
        if (Array.isArray(s.chartVisibleIndicatorIds)) {
          hadChartVisibleKey = true
          const valid = s.chartVisibleIndicatorIds
            .map(Number)
            .filter(id => !isNaN(id) && this.indicators.some(i => Number(i.id) === id))
          this.chartVisibleIndicatorIds = valid
        }
        if (s.timeframe && Object.prototype.hasOwnProperty.call(TF_MAX_DAYS, s.timeframe)) {
          this.timeframe = s.timeframe
        }
        if (s.market && s.symbol) {
          this.market = String(s.market)
          this.symbol = String(s.symbol)
          this.currentInstrumentId = this.market === 'Crypto'
            ? ''
            : String(s.instrument_id || s.instrumentId || '')
          this.qtSymbol = this.symbol
          this.selectedWatchlistKey = marketContextKey({
            market: this.market,
            symbol: this.symbol,
            exchange_id: this.cryptoExchangeId,
            market_type: this.cryptoMarketType,
            instrument_id: this.currentInstrumentId
          })
        } else if (s.selectedWatchlistKey && typeof s.selectedWatchlistKey === 'string') {
          const [m, sym] = s.selectedWatchlistKey.split(':')
          if (m && sym) {
            this.market = m
            this.symbol = sym
            this.qtSymbol = sym
            this.selectedWatchlistKey = s.selectedWatchlistKey
          }
        }
        if (s.selectedIndicatorId != null && s.selectedIndicatorId !== '') {
          const id = Number(s.selectedIndicatorId)
          if (!isNaN(id) && this.indicators.some(i => Number(i.id) === id)) {
            this.selectedIndicatorId = id
            this.onIndicatorChange(id)
          }
        }
        if (!hadChartVisibleKey && !this.chartVisibleIndicatorIds.length && this.selectedIndicatorId != null) {
          this.chartVisibleIndicatorIds = [Number(this.selectedIndicatorId)]
          this.syncSelectedIndicatorToChart()
        }
        if (s.commission != null && !isNaN(Number(s.commission))) {
          this.commission = Number(s.commission)
        }
        if (s.slippage != null && !isNaN(Number(s.slippage))) {
          this.slippage = Number(s.slippage)
        }
        if (typeof s.strictMode === 'boolean') {
          this.strictMode = s.strictMode
        } else if (typeof s.enableMtf === 'boolean') {
          this.strictMode = !s.enableMtf
        }
        this.reconcileIdeMarketFromWatchlist()
      } catch (_) { /* ignore corrupt cache */ }
    },

    schedulePersistIdeUiState () {
      if (this._persistIdeUiTimer) clearTimeout(this._persistIdeUiTimer)
      this._persistIdeUiTimer = setTimeout(() => {
        this._persistIdeUiTimer = null
        this.persistIdeUiState()
      }, 250)
    },

    persistIdeUiState () {
      if (!this.userId) return
      try {
        const payload = {
          timeframe: this.timeframe,
          activeIndicators: this.serializeChartIndicators(),
          strictMode: this.strictMode,
          commission: this.commission,
          slippage: this.slippage
        }
        storage.set(ideUiCacheStorageKey(this.userId), JSON.stringify(payload))
      } catch (_) { /* ignore quota */ }
    },
    restoreIdeSelectionPreference () {
      if (!this.userId) return
      try {
        const raw = storage.get(ideSelectionStorageKey(this.userId))
        if (raw == null || raw === '') return
        const saved = typeof raw === 'string' ? JSON.parse(raw) : raw
        if (!saved || typeof saved !== 'object') return

        const market = String(saved.market || '')
        const symbol = String(saved.symbol || '')
        const watchlistKey = marketContextKey({ market, symbol })
        const hasWatchlistItem = this.watchlist.some(item => this.watchlistContextKey(item) === watchlistKey)
        if (market && symbol && hasWatchlistItem) {
          this.market = market
          this.symbol = symbol
          this.qtSymbol = symbol
          this.selectedWatchlistKey = watchlistKey
          this.currentInstrumentId = market === 'Crypto' ? '' : String(saved.instrumentId || '')
        }

        const indicatorId = Number(saved.indicatorId)
        if (indicatorId && this.indicators.some(item => Number(item.id) === indicatorId)) {
          this.selectedIndicatorId = indicatorId
          const visibleIds = Array.isArray(saved.visibleIndicatorIds)
            ? saved.visibleIndicatorIds
              .map(Number)
              .filter(id => this.indicators.some(item => Number(item.id) === id))
            : []
          this.chartVisibleIndicatorIds = visibleIds.length ? visibleIds : [indicatorId]
          this.onIndicatorChange(indicatorId)
        }
      } catch (_) { /* ignore corrupt preference */ }
    },
    persistIdeSelectionPreference () {
      if (!this.userId) return
      try {
        storage.set(ideSelectionStorageKey(this.userId), JSON.stringify({
          market: this.market,
          symbol: this.symbol,
          instrumentId: this.currentInstrumentId,
          indicatorId: this.selectedIndicatorId,
          visibleIndicatorIds: this.chartVisibleIndicatorIds
        }))
      } catch (_) { /* ignore quota */ }
    },
    normalizePersistedChartIndicators (items) {
      if (!Array.isArray(items)) return []
      return items
        .filter(item => item && item.id && item.id !== 'selected-python-indicator' && item.type !== 'python' && !String(item.id).startsWith('ide-py-'))
        .map(item => ({
          id: item.id,
          instanceId: item.instanceId || `${item.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          name: item.name,
          shortName: item.shortName,
          type: item.type,
          visible: item.visible !== false,
          params: item.params && typeof item.params === 'object' ? { ...item.params } : {},
          style: item.style && typeof item.style === 'object'
            ? { color: item.style.color || '', lineWidth: Number(item.style.lineWidth || 2) }
            : { color: '', lineWidth: 2 }
        }))
    },
    serializeChartIndicators () {
      return this.normalizePersistedChartIndicators(this.activeIndicators)
    },

    async loadIndicators () {
      if (!this.userId) return
      this.loadingIndicators = true
      try {
        const res = await request({ url: '/api/indicator/getIndicators', method: 'get', params: { userid: this.userId } })
        if (res && res.data && Array.isArray(res.data)) {
          this.indicators = res.data.map(item => ({ ...item, type: 'python' }))
        }
      } catch (e) {
        console.warn('Load indicators failed:', e)
      } finally {
        this.loadingIndicators = false
        this.pruneChartVisibleIndicatorIds()
        this.applyIndicatorRouteSelection()
      }
    },
    applyIndicatorRouteSelection () {
      const query = this.$route && this.$route.query ? this.$route.query : {}
      const raw = query.indicator_id || query.indicatorId
      if (!raw) return
      const targetId = Number(raw)
      if (!targetId || !this.indicators.some(item => Number(item.id) === targetId)) return
      if (Number(this.selectedIndicatorId) === targetId) return
      this.selectedIndicatorId = targetId
      if (!this.chartVisibleIndicatorIds.some(id => Number(id) === targetId)) {
        this.chartVisibleIndicatorIds = [targetId]
      }
      this.onIndicatorChange(targetId)
    },
    pruneChartVisibleIndicatorIds () {
      const set = new Set(this.indicators.map(i => Number(i.id)))
      this.chartVisibleIndicatorIds = (this.chartVisibleIndicatorIds || []).filter(id => set.has(Number(id)))
    },
    async loadWatchlist () {
      if (!this.userId) return
      try {
        const res = await getWatchlist({ userid: this.userId })
        if (res && res.code === 1 && res.data) this.watchlist = res.data
        this.reconcileIdeMarketFromWatchlist()
      } catch (_) { /* silent */ }
    },

    reconcileIdeMarketFromWatchlist () {
      if (this.market && this.symbol) {
        this.selectedWatchlistKey = marketContextKey({ market: this.market, symbol: this.symbol })
      }
      const key = this.selectedWatchlistKey
      if (!key || key === '__add__') return
      const row = (this.watchlist || []).find(
        w => w && w.market && w.symbol && this.watchlistContextKey(w) === key
      )
      if (row) {
        this.market = String(row.market)
        this.symbol = String(row.symbol)
        this.qtSymbol = this.symbol
      }
    },

    autoSelectFirstIndicator () {
      if (this.indicators.length > 0 && !this.selectedIndicatorId) {
        this.selectedIndicatorId = this.indicators[0].id
        if (!this.chartVisibleIndicatorIds.length) {
          this.chartVisibleIndicatorIds = [Number(this.indicators[0].id)]
        }
        this.onIndicatorChange(this.indicators[0].id)
      }
    },
    ensureChartReady () {
      this.$nextTick(() => {
        setTimeout(() => {
          const chart = this.$refs.klineChart
          if (!chart || !this.symbol) return
          if (!chart.chartRef && typeof chart.initChart === 'function') {
            chart.initChart()
          }
          if (this.selectedIndicatorId) {
            this.syncSelectedIndicatorToChart()
          }
          if (this.shouldShowBacktestMarkersOnChart()) {
            this.renderBacktestSignals()
          }
        }, 300)
      })
    },

    // ===== CodeMirror =====
    initCodeMirror () {
      const el = this.$refs.codeEditor
      if (!el) return
      if (this.cmInstance) {
        this.cmInstance.toTextArea()
        this.cmInstance = null
      }
      const textarea = document.createElement('textarea')
      el.innerHTML = ''
      el.appendChild(textarea)
      this.cmInstance = CodeMirror.fromTextArea(textarea, {
        mode: 'python',
        theme: this.isDarkTheme ? 'monokai' : 'eclipse',
        lineNumbers: true,
        lineWrapping: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        styleActiveLine: true,
        tabSize: 4,
        indentUnit: 4,
        indentWithTabs: false,
        extraKeys: {
          'Ctrl-S': () => this.saveIndicatorFromShortcut(),
          'Cmd-S': () => this.saveIndicatorFromShortcut()
        }
      })
      this.cmInstance.setValue(this.currentCode)
      this.cmInstance.on('change', (cm) => {
        const val = cm.getValue()
        if (val !== this.currentCode) {
          this.currentCode = val
          this.codeDirty = true
        }
      })
      this.cmInstance.refresh()
      this.applyCodeMirrorReadOnly()
    },
    applyCodeMirrorReadOnly () {
      if (!this.cmInstance) return
      const ro = this.selectedIndicatorCodeHidden
      this.cmInstance.setOption('readOnly', ro)
      this.cmInstance.refresh()
    },
    castIndicatorParamValue (value, type) {
      const t = String(type || '').toLowerCase()
      if (t === 'bool') {
        return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase())
      }
      if (t === 'int') {
        const n = Number(value)
        return Number.isFinite(n) ? Math.round(n) : 0
      }
      if (t === 'float') {
        const n = Number(value)
        return Number.isFinite(n) ? n : 0
      }
      return value == null ? '' : String(value)
    },
    parseIndicatorParamSpecs (code) {
      if (!code || typeof code !== 'string') return []
      const paramRe = /^\s*#\s*@param\s+(\w+)\s+(int|float|bool|str|string)\s+(\S+)\s*(.*)$/i
      const rangeRe = /(?:^|\s)range\s*=\s*(-?\d+(?:\.\d+)?)\s*:\s*(-?\d+(?:\.\d+)?)\s*:\s*(-?\d+(?:\.\d+)?)/i
      const valuesRe = /(?:^|\s)values\s*=\s*([^\s]+)/i
      const out = []
      for (const rawLine of code.split('\n')) {
        const m = rawLine.match(paramRe)
        if (!m) continue
        const name = m[1]
        const type = String(m[2] || '').toLowerCase().replace('string', 'str')
        const rawDefault = m[3]
        const rest = String(m[4] || '').trim()
        const rangeMatch = rest.match(rangeRe)
        const valuesMatch = rest.match(valuesRe)
        const values = valuesMatch
          ? valuesMatch[1].split(',').map(v => v.trim()).filter(Boolean).map(v => this.castIndicatorParamValue(v, type))
          : null
        let min
        let max
        let step
        if (rangeMatch) {
          min = Number(rangeMatch[1])
          max = Number(rangeMatch[2])
          step = Number(rangeMatch[3])
        }
        const description = rest
          .replace(rangeRe, '')
          .replace(valuesRe, '')
          .trim()
        out.push({
          name,
          type,
          defaultValue: this.castIndicatorParamValue(rawDefault, type),
          rawDefault,
          description,
          label: description ? description.replace(/[，,。.;；:：].*$/, '').trim() : name,
          values,
          min: Number.isFinite(min) ? min : undefined,
          max: Number.isFinite(max) ? max : undefined,
          step: Number.isFinite(step) && step > 0 ? step : undefined,
          rangeText: Number.isFinite(min) && Number.isFinite(max)
            ? `${this.$t('indicatorIde.paramPanel.range')}: ${min} - ${max}${Number.isFinite(step) ? ` / ${step}` : ''}`
            : ''
        })
      }
      return out
    },
    normalizeIndicatorParamMap (params, specs = this.currentIndicatorParamSpecs) {
      const out = {}
      for (const spec of specs || []) {
        const hasValue = params && Object.prototype.hasOwnProperty.call(params, spec.name)
        out[spec.name] = this.castIndicatorParamValue(hasValue ? params[spec.name] : spec.defaultValue, spec.type)
      }
      return out
    },
    loadIndicatorParamDefaults () {
      if (!this.userId) return
      try {
        const raw = storage.get(indicatorParamDefaultsStorageKey(this.userId))
        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
        this.indicatorParamOverrides = parsed && typeof parsed === 'object' ? parsed : {}
      } catch (_) {
        this.indicatorParamOverrides = {}
      }
    },
    persistIndicatorParamDefaults () {
      if (!this.userId) return
      try {
        storage.set(indicatorParamDefaultsStorageKey(this.userId), JSON.stringify(this.indicatorParamOverrides || {}))
      } catch (_) { /* ignore quota */ }
    },
    resolveIndicatorRuntimeParams (indicator, code) {
      if (!indicator) return {}
      const specs = this.parseIndicatorParamSpecs(code || this.getIndicatorExecutableCode(indicator, undefined) || '')
      const defaults = {}
      specs.forEach(spec => { defaults[spec.name] = spec.defaultValue })
      const id = indicator.id != null ? String(indicator.id) : ''
      const saved = id && this.indicatorParamOverrides && this.indicatorParamOverrides[id]
        ? this.indicatorParamOverrides[id]
        : {}
      return this.normalizeIndicatorParamMap({ ...defaults, ...saved }, specs)
    },
    resetIndicatorParamDraft (preferCurrent = true) {
      const source = preferCurrent ? this.currentIndicatorParamValues : {}
      this.indicatorParamDraft = this.normalizeIndicatorParamMap(source)
    },
    openIndicatorParamsDrawer () {
      this.resetIndicatorParamDraft(true)
      this.paramDrawerVisible = true
    },
    onIndicatorParamDraftChange (spec, value) {
      const next = {
        ...this.indicatorParamDraft,
        [spec.name]: this.castIndicatorParamValue(value, spec.type)
      }
      this.indicatorParamDraft = this.normalizeIndicatorParamMap(next)
    },
    applyIndicatorParams () {
      if (!this.selectedIndicatorObj || !this.currentIndicatorParamSpecs.length) return
      const id = String(this.selectedIndicatorObj.id)
      const next = this.normalizeIndicatorParamMap(this.indicatorParamDraft)
      this.$set(this.indicatorParamOverrides, id, next)
      this.syncSelectedIndicatorToChart()
      this.$message.success(this.$t('indicatorIde.paramPanel.applySuccess'))
    },
    saveIndicatorParamDefaults () {
      if (!this.selectedIndicatorObj || !this.currentIndicatorParamSpecs.length) return
      const id = String(this.selectedIndicatorObj.id)
      const next = this.normalizeIndicatorParamMap(this.indicatorParamDraft)
      this.$set(this.indicatorParamOverrides, id, next)
      this.persistIndicatorParamDefaults()
      this.syncSelectedIndicatorToChart()
      this.$message.success(this.$t('indicatorIde.paramPanel.saveSuccess'))
    },
    resetIndicatorParamsToDeclared () {
      if (!this.selectedIndicatorObj) return
      const id = String(this.selectedIndicatorObj.id)
      const defaults = this.normalizeIndicatorParamMap({})
      this.indicatorParamDraft = defaults
      this.$delete(this.indicatorParamOverrides, id)
      this.persistIndicatorParamDefaults()
      this.syncSelectedIndicatorToChart()
    },
    writeIndicatorParamsToCode () {
      if (this.selectedIndicatorCodeHidden || !this.currentIndicatorParamSpecs.length) return
      const nextCode = this.applyIndicatorParamsToCode(this.currentCode || '', this.normalizeIndicatorParamMap(this.indicatorParamDraft))
      if (nextCode === this.currentCode) {
        this.$message.info(this.$t('indicatorIde.applyCandidateNoChanges'))
        return
      }
      this.currentCode = nextCode
      this.codeDirty = true
      if (this.cmInstance) this.cmInstance.setValue(nextCode)
      this.syncSelectedIndicatorToChart(nextCode)
      this.$message.success(this.$t('indicatorIde.paramPanel.writeSuccess'))
    },
    formatIndicatorParamValue (value) {
      if (typeof value === 'boolean') return value ? 'true' : 'false'
      if (value == null || value === '') return '--'
      return String(value)
    },
    extractSignalAlertOptions (code) {
      const raw = String(code || '')
      const options = [{ key: 'any', label: '全部信号' }]
      const seen = new Set(options.map(item => item.key))
      const add = (key, label) => {
        const k = String(key || '').trim()
        if (!k || seen.has(k)) return
        seen.add(k)
        options.push({ key: k, label })
      }
      const typeRe = /["']type["']\s*:\s*["']([^"']+)["']/g
      let m
      while ((m = typeRe.exec(raw))) {
        const type = String(m[1] || '').trim()
        if (type) add(`type:${type.toLowerCase()}`, `${type} 类信号`)
      }
      const textRe = /["']text["']\s*:\s*["']([^"']+)["']/g
      while ((m = textRe.exec(raw))) {
        const text = String(m[1] || '').trim()
        if (text) add(`text:${text.toLowerCase()}`, text)
      }
      const textDataLiteralRe = /["']textData["']\s*:\s*\[([^\]]{0,500})\]/g
      while ((m = textDataLiteralRe.exec(raw))) {
        const body = String(m[1] || '')
        const valueRe = /["']([^"']+)["']/g
        let vm
        while ((vm = valueRe.exec(body))) {
          const text = String(vm[1] || '').trim()
          if (text) add(`text:${text.toLowerCase()}`, text)
        }
      }
      if (options.length === 1) {
        add('type:buy', '买入/做多信号')
        add('type:sell', '卖出/离场信号')
        add('type:warning', '观察/提醒信号')
      }
      return options
    },
    signalAlertKeyLabel (key) {
      const found = this.signalAlertSignalOptions.find(item => item.key === key)
      if (found) return found.label
      const raw = String(key || '')
      if (raw === 'any') return '全部信号'
      return raw.replace(/^type:/, '类型：').replace(/^text:/, '文本：')
    },
    signalAlertChannelLabel (channel) {
      const map = { browser: '站内', email: '邮件', telegram: 'Telegram', webhook: 'Webhook' }
      return map[channel] || channel
    },
    resetSignalAlertForm () {
      const ind = this.selectedIndicatorObj || {}
      const current = this.signalAlertWatchlistOptions.find(w => `${w.market}:${w.symbol}` === `${this.market}:${this.symbol}`) || {}
      this.signalAlertEditingId = null
      this.signalAlertForm = {
        watchlistKey: `${this.market}:${this.symbol}`,
        market: this.market,
        symbol: this.symbol,
        symbolName: current.name || '',
        timeframe: this.timeframe,
        signalKeys: ['any'],
        channels: ['browser'],
        email: '',
        telegramChatId: '',
        telegramBotToken: '',
        webhookUrl: ''
      }
      if (!ind.id) return
      const opts = this.signalAlertSignalOptions
      if (opts && opts.length === 2 && opts[1].key !== 'any') {
        this.signalAlertForm.signalKeys = [opts[1].key]
      }
    },
    openSignalAlertModal () {
      if (!this.selectedIndicatorId) {
        this.$message.warning('请先选择指标')
        return
      }
      this.resetSignalAlertForm()
      this.signalAlertActiveTab = 'create'
      this.signalAlertModalVisible = true
      this.loadSignalAlertTasks()
    },
    closeSignalAlertModal () {
      this.signalAlertModalVisible = false
      this.signalAlertEditingId = null
    },
    onSignalAlertWatchlistChange (value) {
      const [market, ...symbolParts] = String(value || '').split(':')
      const symbol = symbolParts.join(':')
      const item = this.signalAlertWatchlistOptions.find(w => `${w.market}:${w.symbol}` === value) || {}
      this.signalAlertForm.market = market || this.market
      this.signalAlertForm.symbol = symbol || this.symbol
      this.signalAlertForm.symbolName = item.name || ''
    },
    buildSignalAlertPayload () {
      const form = this.signalAlertForm || {}
      const params = this.currentIndicatorParamValues || {}
      return {
        indicator_id: this.selectedIndicatorId,
        indicator_name: this.selectedIndicatorDisplayName,
        market: form.market || this.market,
        symbol: form.symbol || this.symbol,
        symbol_name: form.symbolName || '',
        timeframe: form.timeframe || this.timeframe,
        signal_keys: Array.isArray(form.signalKeys) && form.signalKeys.length ? form.signalKeys : ['any'],
        channels: Array.isArray(form.channels) && form.channels.length ? form.channels : ['browser'],
        targets: {
          email: form.email || '',
          telegram_chat_id: form.telegramChatId || '',
          telegram_bot_token: form.telegramBotToken || '',
          webhook_url: form.webhookUrl || ''
        },
        params
      }
    },
    async loadSignalAlertTasks () {
      this.signalAlertLoading = true
      try {
        const res = await request({
          url: '/api/indicator/signal-alerts',
          method: 'get'
        })
        if (res && res.code === 1) {
          this.signalAlertTasks = Array.isArray(res.data) ? res.data : []
        } else {
          this.$message.error((res && res.msg) || '信号通知任务加载失败')
        }
      } catch (e) {
        this.$message.error((e && e.message) || '信号通知任务加载失败')
      } finally {
        this.signalAlertLoading = false
      }
    },
    async submitSignalAlertTask () {
      if (!this.selectedIndicatorId) return
      const payload = this.buildSignalAlertPayload()
      if (!payload.symbol) {
        this.$message.warning('请选择标的')
        return
      }
      if (payload.channels.includes('webhook') && !payload.targets.webhook_url) {
        this.$message.warning('请填写 Webhook URL')
        return
      }
      this.signalAlertSaving = true
      try {
        const res = await request({
          url: this.signalAlertEditingId
            ? `/api/indicator/signal-alerts/${this.signalAlertEditingId}`
            : '/api/indicator/signal-alerts',
          method: this.signalAlertEditingId ? 'put' : 'post',
          data: payload
        })
        if (res && res.code === 1) {
          this.$message.success(this.signalAlertEditingId ? '信号通知已更新' : '信号通知已创建')
          this.signalAlertEditingId = null
          this.signalAlertActiveTab = 'tasks'
          await this.loadSignalAlertTasks()
        } else {
          this.$message.error((res && res.msg) || '保存信号通知失败')
        }
      } catch (e) {
        this.$message.error((e && e.message) || '保存信号通知失败')
      } finally {
        this.signalAlertSaving = false
      }
    },
    editSignalAlertTask (task) {
      if (!task) return
      this.signalAlertEditingId = task.id
      const key = `${task.market}:${task.symbol}`
      this.signalAlertForm = {
        watchlistKey: key,
        market: task.market || this.market,
        symbol: task.symbol || this.symbol,
        symbolName: task.symbol_name || '',
        timeframe: task.timeframe || this.timeframe,
        signalKeys: Array.isArray(task.signal_keys) && task.signal_keys.length ? [...task.signal_keys] : ['any'],
        channels: Array.isArray(task.channels) && task.channels.length ? [...task.channels] : ['browser'],
        email: (task.targets && task.targets.email) || '',
        telegramChatId: (task.targets && task.targets.telegram_chat_id) || '',
        telegramBotToken: (task.targets && task.targets.telegram_bot_token) || '',
        webhookUrl: (task.targets && task.targets.webhook_url) || ''
      }
      this.signalAlertActiveTab = 'create'
    },
    async toggleSignalAlertTask (task) {
      if (!task || !task.id) return
      const action = task.status === 'running' ? 'pause' : 'resume'
      try {
        const res = await request({
          url: `/api/indicator/signal-alerts/${task.id}/${action}`,
          method: 'post'
        })
        if (res && res.code === 1) {
          this.$message.success(action === 'pause' ? '已暂停' : '已恢复')
          await this.loadSignalAlertTasks()
        } else {
          this.$message.error((res && res.msg) || '操作失败')
        }
      } catch (e) {
        this.$message.error((e && e.message) || '操作失败')
      }
    },
    async testSignalAlertTask (task) {
      if (!task || !task.id) return
      try {
        const res = await request({
          url: `/api/indicator/signal-alerts/${task.id}/test`,
          method: 'post'
        })
        if (res && res.code === 1) {
          const triggered = res.data && res.data.triggered
          this.$message.info(triggered ? '测试执行完成，已发现信号' : '测试执行完成，当前最新K线未发现所选信号')
          await this.loadSignalAlertTasks()
        } else {
          this.$message.error((res && res.msg) || '测试失败')
        }
      } catch (e) {
        this.$message.error((e && e.message) || '测试失败')
      }
    },
    deleteSignalAlertTask (task) {
      if (!task || !task.id) return
      Modal.confirm({
        title: '删除信号通知任务？',
        content: `${task.symbol || ''} ${task.timeframe || ''} 的通知任务将停止。`,
        okText: '删除',
        cancelText: this.$t('dashboard.indicator.editor.cancel'),
        okType: 'danger',
        getContainer: () => this.resolveIdeFullscreenMountNode() || document.body,
        onOk: async () => {
          const res = await request({
            url: `/api/indicator/signal-alerts/${task.id}`,
            method: 'delete'
          })
          if (res && res.code === 1) {
            this.$message.success('已删除')
            await this.loadSignalAlertTasks()
          } else {
            this.$message.error((res && res.msg) || '删除失败')
          }
        }
      })
    },
    onIndicatorChange (id) {
      this.invalidateBacktestMarkersOnContextChange()
      const ind = this.indicators.find(i => Number(i.id) === Number(id))
      if (ind) {
        this.currentCode = ind.code || ''
        this.codeDirty = false
        if (this.cmInstance) {
          this.cmInstance.setValue(this.currentCode)
        }
        this.syncSelectedIndicatorToChart()
        this.syncTradeUiFromStrategyCode(ind.code || '', { silent: true })
        this.resetIndicatorParamDraft(true)
      } else {
        this.currentCode = ''
        this.codeDirty = false
        this.chartVisibleIndicatorIds = []
        if (this.cmInstance) {
          this.cmInstance.setValue('')
        }
        this.syncSelectedIndicatorToChart()
        this.indicatorParamDraft = {}
      }
      this.$nextTick(() => this.applyCodeMirrorReadOnly())
    },
    isIndicatorCodeHidden (indicator) {
      const o = indicator || {}
      return Number(o.code_hidden || 0) === 1 || (Number(o.is_buy || 0) === 1 && Number(o.is_encrypted || 0) === 1)
    },
    getIndicatorExecutableCode (indicator, codeOverride) {
      const ind = indicator || {}
      if (this.isIndicatorCodeHidden(ind)) {
        return String(ind.runtime_code || ind.runtimeCode || ind.run_code || '')
      }
      if (typeof codeOverride === 'string') return codeOverride
      if (Number(this.selectedIndicatorId) === Number(ind.id)) {
        return this.currentCode || ind.code || ''
      }
      return ind.code || ''
    },
    extractIndicatorNameFromCode (code) {
      const raw = String(code || '')
      if (!raw.trim()) return ''
      const assignment = raw.match(/^\s*my_indicator_name\s*=\s*(['"])(.*?)\1\s*$/m)
      if (assignment && assignment[2] && assignment[2].trim()) {
        return assignment[2].trim()
      }
      const outputName = raw.match(/['"]name['"]\s*:\s*(['"])(.*?)\1/)
      if (outputName && outputName[2] && outputName[2].trim()) {
        return outputName[2].trim()
      }
      return ''
    },
    indicatorDisplayName (indicator) {
      const ind = indicator || {}
      if (!ind.id && !ind.name) return '--'
      const code = this.getIndicatorExecutableCode(ind, undefined)
      const codeName = this.extractIndicatorNameFromCode(code)
      return codeName || ind.name || (`Indicator #${ind.id}`)
    },
    resolveIndicatorNameForSave (indicator, code) {
      const ind = indicator || {}
      const codeName = this.extractIndicatorNameFromCode(code)
      return codeName || ind.name || (ind.id ? `Indicator #${ind.id}` : 'New Indicator')
    },
    isIdePythonActiveItem (item) {
      if (!item) return false
      if (item.type === 'python') return true
      if (item.id === 'selected-python-indicator') return true
      if (String(item.id || '').startsWith('ide-py-')) return true
      return false
    },
    buildIdePythonIndicatorForChart (ind, codeForChart) {
      if (!ind) return null
      const chart = this.$refs.klineChart
      const code = codeForChart != null ? codeForChart : (ind.code || '')
      if (!code || !String(code).trim() || !chart || typeof chart.executePythonStrategy !== 'function') return null
      const chartId = `ide-py-${ind.id}`
      const runtimeParams = this.resolveIndicatorRuntimeParams(ind, code)
      return {
        ...ind,
        id: chartId,
        instanceId: chartId,
        originalId: ind.id,
        type: 'python',
        code,
        params: runtimeParams,
        calculate: async (klineData, params = {}) => {
          return chart.executePythonStrategy(code, klineData, { ...runtimeParams, ...(params || {}) }, {
            ...ind,
            originalId: ind.id,
            id: ind.id,
            userId: this.userId
          })
        }
      }
    },
    syncSelectedIndicatorToChart (codeOverride) {
      const nonPython = this.activeIndicators.filter(item => !this.isIdePythonActiveItem(item))
      const pythonBlocks = []
      if (this.chartIndicatorRunning) {
        const seen = new Set()
        for (const rawId of this.chartVisibleIndicatorIds || []) {
          const id = Number(rawId)
          if (isNaN(id) || seen.has(id)) continue
          seen.add(id)
          const ind = this.indicators.find(i => Number(i.id) === id)
          if (!ind) continue
          const code = this.getIndicatorExecutableCode(ind, Number(this.selectedIndicatorId) === id ? codeOverride : undefined)
          const built = this.buildIdePythonIndicatorForChart(ind, code)
          if (built) pythonBlocks.push(built)
        }
      }
      this.activeIndicators = [...nonPython, ...pythonBlocks]
      this.$nextTick(() => {
        const chart = this.$refs.klineChart
        if (chart && typeof chart.updateIndicators === 'function') {
          chart.updateIndicators()
        }
      })
    },
    toggleChartIndicatorRun () {
      if (!this.chartIndicatorRunning && this.chartIndicatorToggleDisabled) return
      if (!this.chartIndicatorRunning && !this.chartVisibleIndicatorIds.length && this.selectedIndicatorId != null) {
        this.chartVisibleIndicatorIds = [Number(this.selectedIndicatorId)]
      }
      this.chartIndicatorRunning = !this.chartIndicatorRunning
      this.syncSelectedIndicatorToChart()
    },
    onIndicatorDropdownVisibleChange (visible) {
      this.indicatorDropdownVisible = visible
    },
    onBacktestIndicatorDropdownVisibleChange (visible) {
      this.backtestIndicatorDropdownVisible = visible
    },
    onChartIndicatorCheckChange (rawId, checked) {
      const id = Number(rawId)
      if (isNaN(id)) return
      if (checked) {
        if (!this.chartVisibleIndicatorIds.includes(id)) {
          this.chartVisibleIndicatorIds = [...this.chartVisibleIndicatorIds, id]
        }
      } else {
        this.chartVisibleIndicatorIds = this.chartVisibleIndicatorIds.filter(x => Number(x) !== id)
      }
      this.syncSelectedIndicatorToChart()
      this.persistIdeSelectionPreference()
    },
    selectEditorIndicator (rawId) {
      this.indicatorDropdownVisible = false
      this.backtestIndicatorDropdownVisible = false
      this.selectedIndicatorId = rawId
      const id = Number(rawId)
      if (!isNaN(id)) {
        this.chartVisibleIndicatorIds = [id]
      }
      this.onIndicatorChange(rawId)
      this.persistIdeSelectionPreference()
    },
    resolveIdeFullscreenMountNode () {
      const fs = document.fullscreenElement || document.webkitFullscreenElement
      const ch = this.$refs.chartFullscreenEl
      const ed = this.$refs.editorFullscreenEl
      if (ch && fs === ch) return ch
      if (ed && fs === ed) return ed
      return null
    },
    ideModalGetContainer () {
      return this.resolveIdeFullscreenMountNode() || document.body
    },
    applyIdeOverlayContainers () {
      const mount = this.resolveIdeFullscreenMountNode()
      const target = mount || document.body
      try {
        message.destroy()
        message.config({ getContainer: () => target })
      } catch (_) {}
    },
    chartToolbarGetPopupContainer () {
      const fs = document.fullscreenElement || document.webkitFullscreenElement
      const ch = this.$refs.chartFullscreenEl
      if (ch && fs === ch) return ch
      if (this.chartFullscreen && ch) return ch
      return document.body
    },
    async toggleEditorFullscreen () {
      const el = this.$refs.editorFullscreenEl
      if (!el) return
      try {
        const fsEl = document.fullscreenElement || document.webkitFullscreenElement
        if (fsEl === el) {
          if (document.exitFullscreen) await document.exitFullscreen()
          else if (document.webkitExitFullscreen) await document.webkitExitFullscreen()
        } else if (el.requestFullscreen) await el.requestFullscreen()
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen()
      } catch (e) {
        console.warn('fullscreen', e)
      }
      this.$nextTick(() => this.onGlobalFullscreenChange())
    },
    async toggleChartFullscreen () {
      const el = this.$refs.chartFullscreenEl
      if (!el) return
      try {
        const fsEl = document.fullscreenElement || document.webkitFullscreenElement
        if (fsEl === el) {
          if (document.exitFullscreen) await document.exitFullscreen()
          else if (document.webkitExitFullscreen) await document.webkitExitFullscreen()
        } else if (el.requestFullscreen) await el.requestFullscreen()
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen()
      } catch (e) {
        console.warn('fullscreen', e)
      }
      this.$nextTick(() => this.onGlobalFullscreenChange())
    },
    onGlobalFullscreenChange () {
      const fs = document.fullscreenElement || document.webkitFullscreenElement
      const ed = this.$refs.editorFullscreenEl
      const ch = this.$refs.chartFullscreenEl
      this.editorFullscreen = !!(ed && fs === ed)
      this.chartFullscreen = !!(ch && fs === ch)
      this.applyIdeOverlayContainers()
      this.$nextTick(() => {
        if (this.cmInstance) this.cmInstance.refresh()
        const chart = this.$refs.klineChart
        const inst = chart && chart.chartRef
        if (inst && typeof inst.resize === 'function') {
          try { inst.resize() } catch (_) {}
        }
      })
    },
    handleIndicatorToggle ({ action, indicator }) {
      if (!indicator || (!indicator.id && !indicator.instanceId)) return
      const targetInstanceId = indicator.instanceId || indicator.id
      const parseIdeDbId = (s) => {
        const m = String(s || '').match(/^ide-py-(\d+)$/)
        return m ? Number(m[1]) : null
      }
      if (action === 'remove') {
        const dbId = parseIdeDbId(indicator.id) || parseIdeDbId(targetInstanceId)
        if (dbId != null && !isNaN(dbId)) {
          this.chartVisibleIndicatorIds = this.chartVisibleIndicatorIds.filter(x => Number(x) !== dbId)
        } else if (String(indicator.id) === 'selected-python-indicator' || String(targetInstanceId) === 'selected-python-indicator') {
          if (this.selectedIndicatorId != null) {
            this.chartVisibleIndicatorIds = this.chartVisibleIndicatorIds.filter(x => Number(x) !== Number(this.selectedIndicatorId))
          }
        }
      }
      if (action === 'add') {
        this.activeIndicators = [...this.activeIndicators, { ...indicator, instanceId: targetInstanceId, calculate: null }]
      } else if (action === 'update') {
        this.activeIndicators = this.activeIndicators.map(item => {
          if ((item.instanceId || item.id) !== targetInstanceId) return item
          return {
            ...item,
            ...indicator,
            instanceId: targetInstanceId,
            params: indicator.params && typeof indicator.params === 'object' ? { ...indicator.params } : (item.params || {}),
            style: indicator.style && typeof indicator.style === 'object'
              ? { color: indicator.style.color || '', lineWidth: Number(indicator.style.lineWidth || 2) }
              : (item.style || { color: '', lineWidth: 2 }),
            calculate: null
          }
        })
      } else if (action === 'remove') {
        this.activeIndicators = this.activeIndicators.filter(item => (item.instanceId || item.id) !== targetInstanceId)
      }
      this.syncSelectedIndicatorToChart()
    },

    // ===== Save =====
    openSaveAsIndicatorModal () {
      const base =
        (this.selectedIndicatorObj && this.selectedIndicatorObj.name) ||
        this.$t('indicatorIde.saveAsDefaultName')
      this.saveAsName = `${base}${this.$t('indicatorIde.nameCopySuffix')}`
      this.showSaveAsModal = true
    },
    async confirmSaveAsIndicator () {
      if (!this.userId) return
      const name = (this.saveAsName || '').trim()
      if (!name) {
        this.$message.warning(this.$t('indicatorIde.saveAsNameRequired'))
        return
      }
      const code = this.cmInstance ? this.cmInstance.getValue() : this.currentCode
      if (!code || !String(code).trim()) {
        this.$message.warning(this.$t('indicatorIde.saveAsNeedCode'))
        return
      }
      this.savingAs = true
      try {
        const res = await request({
          url: '/api/indicator/saveIndicator',
          method: 'post',
          data: { userid: this.userId, id: 0, code, name }
        })
        if (res && res.code === 1) {
          await this.loadIndicators()
          const newId = (res.data && res.data.id) || null
          let targetId = newId
          if (!targetId && this.indicators.length) {
            targetId = this.indicators.reduce((maxId, item) => Math.max(maxId, Number(item.id) || 0), 0)
          }
          if (targetId) {
            const tid = Number(targetId)
            if (!this.chartVisibleIndicatorIds.includes(tid)) {
              this.chartVisibleIndicatorIds = [...this.chartVisibleIndicatorIds, tid]
            }
            this.selectedIndicatorId = targetId
            this.onIndicatorChange(targetId)
            this.codeDirty = false
            this.showSaveAsModal = false
            this.$message.success(this.$t('indicatorIde.saveAsSuccess'))
          } else {
            this.$message.error(this.$t('indicatorIde.saveAsFailed'))
          }
        } else {
          this.$message.error((res && res.msg) || this.$t('indicatorIde.saveAsFailed'))
        }
      } catch (e) {
        this.$message.error(this.$t('indicatorIde.saveAsFailed') + ': ' + (e.message || ''))
      } finally {
        this.savingAs = false
      }
    },
    clearBacktestSignalOverlays (opts = {}) {
      const silent = !!(opts && opts.silent)
      const chart = this.$refs.klineChart
      if (!chart) {
        if (!silent) this.$message.info(this.$t('indicatorIde.clearSignalsNoChart'))
        return
      }
      if (typeof chart.clearBacktestOverlays === 'function') {
        chart.clearBacktestOverlays()
      }
      if (!silent) this.$message.success(this.$t('indicatorIde.clearSignalsDone'))
    },

    buildBacktestMarkerContextKey () {
      return [
        String(this.market || ''),
        String(this.symbol || ''),
        String(this.timeframe || ''),
        String(this.selectedIndicatorId || '')
      ].join('|')
    },

    shouldShowBacktestMarkersOnChart () {
      if (!this.backtestMarkersVisible) return false
      if (!this.hasResult || !this.result || !Array.isArray(this.result.trades) || !this.result.trades.length) {
        return false
      }
      if (!this.backtestRunContextKey) return false
      return this.buildBacktestMarkerContextKey() === this.backtestRunContextKey
    },

    stampBacktestMarkerContext () {
      this.backtestRunContextKey = this.buildBacktestMarkerContextKey()
      this.backtestMarkerWatchKey = this.backtestRunContextKey
    },

    invalidateBacktestMarkersOnContextChange () {
      const key = this.buildBacktestMarkerContextKey()
      if (key === this.backtestMarkerWatchKey) return
      this.backtestMarkerWatchKey = key
      this.backtestRunContextKey = null
      this.clearBacktestSignalOverlays({ silent: true })
    },

    getKlineChartInstance () {
      const chart = this.$refs.klineChart
      if (!chart) return null
      if (typeof chart.getChartInstance === 'function') return chart.getChartInstance()
      return chart.chartRef || null
    },

    onChartIndicatorsUpdated () {
      if (this.shouldShowBacktestMarkersOnChart()) {
        this.renderBacktestSignals()
      }
    },
    handleGlobalSaveShortcut (event) {
      if (!event || (!event.ctrlKey && !event.metaKey) || String(event.key || '').toLowerCase() !== 's') return
      if (this.$route && this.$route.path === '/strategy-ide' && this.$route.query && this.$route.query.tab === 'script') return
      event.preventDefault()
      this.saveIndicatorFromShortcut()
    },
    saveIndicatorFromShortcut () {
      if (!this.selectedIndicatorId || !this.userId) return
      if (this.selectedIndicatorCodeHidden) {
        this.$message.warning(this.$t('indicatorIde.saveBlockedHiddenCode'))
        return
      }
      if (!this.codeDirty) {
        this.$message.info(this.$t('indicatorIde.noChangesToSave'))
        return
      }
      this.saveIndicator()
    },

    async saveIndicator () {
      if (!this.selectedIndicatorId || !this.userId) return
      if (this.savingIndicator) return
      if (this.selectedIndicatorCodeHidden) {
        this.$message.warning(this.$t('indicatorIde.saveBlockedHiddenCode'))
        return
      }
      const indicator = this.selectedIndicatorObj || {}
      const code = this.cmInstance ? this.cmInstance.getValue() : this.currentCode
      const nextName = this.resolveIndicatorNameForSave(indicator, code)
      this.savingIndicator = true
      try {
        const res = await request({
          url: '/api/indicator/saveIndicator',
          method: 'post',
          data: {
            id: this.selectedIndicatorId,
            code,
            name: nextName,
            description: indicator.description || '',
            userid: this.userId
          }
        })
        if (res && res.code === 1) {
          this.currentCode = code
          this.codeDirty = false
          this.$message.success(this.$t('indicatorIde.saved'))
          const ind = this.indicators.find(i => i.id === this.selectedIndicatorId)
          if (ind) {
            ind.code = code
            ind.name = nextName
          }
          this.syncSelectedIndicatorToChart(code)
          if (this.showCodeVersionDrawer) this.loadCodeVersions()
        } else {
          const m = (res && res.msg) || ''
          if (m === 'purchased_asset_cannot_publish') {
            this.$message.warning(this.$t('indicatorIde.publishBlockedPurchased'))
          } else {
            this.$message.error(m || this.$t('indicatorIde.saveFailed'))
          }
        }
      } catch (e) {
        const data = e && e.response && e.response.data
        const m = (data && data.msg) || ''
        if (m === 'purchased_asset_cannot_publish') {
          this.$message.warning(this.$t('indicatorIde.publishBlockedPurchased'))
        } else {
          this.$message.error((e && e.message) || this.$t('indicatorIde.saveFailed'))
        }
      } finally {
        this.savingIndicator = false
      }
    },
    openCodeVersionDrawer () {
      if (!this.selectedIndicatorId) return
      this.showCodeVersionDrawer = true
      this.codeVersionPreview = null
      this.loadCodeVersions()
    },
    async loadCodeVersions () {
      if (!this.selectedIndicatorId) return
      this.codeVersionLoading = true
      try {
        const res = await request({
          url: '/api/indicator/versions',
          method: 'get',
          params: { indicatorId: this.selectedIndicatorId }
        })
        if (res && res.code === 1) {
          this.codeVersions = Array.isArray(res.data) ? res.data : []
        } else {
          this.$message.error((res && res.msg) || this.$t('indicatorIde.codeVersionLoadFailed'))
        }
      } catch (e) {
        this.$message.error((e && e.message) || this.$t('indicatorIde.codeVersionLoadFailed'))
      } finally {
        this.codeVersionLoading = false
      }
    },
    async previewCodeVersion (item) {
      if (!item || !item.id) return
      try {
        const res = await request({
          url: `/api/indicator/versions/${item.id}`,
          method: 'get'
        })
        if (res && res.code === 1) {
          this.codeVersionPreview = res.data || null
        } else {
          this.$message.error((res && res.msg) || this.$t('indicatorIde.codeVersionLoadFailed'))
        }
      } catch (e) {
        this.$message.error((e && e.message) || this.$t('indicatorIde.codeVersionLoadFailed'))
      }
    },
    confirmRestoreCodeVersion (item) {
      if (!item || !item.id) return
      Modal.confirm({
        title: this.$t('indicatorIde.codeVersionRestoreTitle'),
        content: this.$t('indicatorIde.codeVersionRestoreContent', { version: item.version_no }),
        okText: this.$t('indicatorIde.codeVersionRestore'),
        cancelText: this.$t('dashboard.indicator.editor.cancel'),
        getContainer: () => this.resolveIdeFullscreenMountNode() || document.body,
        onOk: () => this.restoreCodeVersion(item)
      })
    },
    async restoreCodeVersion (item) {
      if (!item || !item.id) return
      this.restoringCodeVersionId = item.id
      try {
        const res = await request({
          url: '/api/indicator/versions/restore',
          method: 'post',
          data: { versionId: item.id }
        })
        if (res && res.code === 1 && res.data) {
          const nextCode = res.data.code || ''
          this.currentCode = nextCode
          this.codeDirty = false
          if (this.cmInstance) {
            this.cmInstance.setValue(nextCode)
            this.cmInstance.refresh()
          }
          const ind = this.indicators.find(i => Number(i.id) === Number(this.selectedIndicatorId))
          if (ind) {
            ind.code = nextCode
            ind.name = res.data.name || ind.name
            ind.description = res.data.description || ind.description
          }
          this.syncSelectedIndicatorToChart(nextCode)
          this.syncTradeUiFromStrategyCode(nextCode, { silent: true })
          this.$message.success(this.$t('indicatorIde.codeVersionRestored'))
          await this.loadCodeVersions()
        } else {
          this.$message.error((res && res.msg) || this.$t('indicatorIde.codeVersionRestoreFailed'))
        }
      } catch (e) {
        this.$message.error((e && e.message) || this.$t('indicatorIde.codeVersionRestoreFailed'))
      } finally {
        this.restoringCodeVersionId = null
      }
    },
    formatCodeVersionTime (value) {
      if (!value) return '--'
      const m = moment(value)
      return m.isValid() ? m.format('YYYY-MM-DD HH:mm:ss') : String(value)
    },

    handleDeleteIndicator () {
      if (!this.selectedIndicatorId || !this.userId) return
      const ind = this.selectedIndicatorObj
      const name = (ind && ind.name) || ('#' + this.selectedIndicatorId)
      const h = this.$createElement
      const children = [
        h('p', { style: { margin: '0 0 8px' } }, [
          this.$t('dashboard.indicator.delete.confirmContent', { name })
        ])
      ]
      if (this.codeDirty) {
        children.push(
          h('p', { style: { margin: 0, color: '#fa8c16', fontSize: '13px' } }, [
            this.$t('indicatorIde.deleteUnsavedHint')
          ])
        )
      }
      Modal.confirm({
        title: this.$t('dashboard.indicator.delete.confirmTitle'),
        content: h('div', children),
        okText: this.$t('dashboard.indicator.delete.confirmOk'),
        cancelText: this.$t('dashboard.indicator.delete.confirmCancel'),
        okType: 'danger',
        getContainer: () => this.resolveIdeFullscreenMountNode() || document.body,
        onOk: () => this.confirmDeleteIndicator()
      })
    },

    async confirmDeleteIndicator () {
      if (!this.selectedIndicatorId || !this.userId) return
      const id = this.selectedIndicatorId
      this.deletingIndicator = true
      try {
        const res = await request({
          url: '/api/indicator/deleteIndicator',
          method: 'post',
          data: { id }
        })
        if (res && res.code === 1) {
          this.$message.success(this.$t('dashboard.indicator.delete.success'))
          this.chartVisibleIndicatorIds = this.chartVisibleIndicatorIds.filter(x => Number(x) !== Number(id))
          await this.loadIndicators()
          if (this.indicators.length > 0) {
            const first = this.indicators[0]
            this.selectedIndicatorId = first.id
            if (!this.chartVisibleIndicatorIds.length) {
              this.chartVisibleIndicatorIds = [Number(first.id)]
            }
            this.onIndicatorChange(first.id)
          } else {
            this.selectedIndicatorId = undefined
            this.chartVisibleIndicatorIds = []
            this.onIndicatorChange(undefined)
          }
        } else {
          this.$message.error((res && res.msg) || this.$t('dashboard.indicator.delete.failed'))
        }
      } catch (e) {
        const data = e && e.response && e.response.data
        this.$message.error((data && data.msg) || (e && e.message) || this.$t('dashboard.indicator.delete.failed'))
      } finally {
        this.deletingIndicator = false
      }
    },

    parseStrategyAnnotationRaw (code) {
      const lineRe = /^#\s*@strategy\s+(\w+)\s*:?\s*(\S+)/i
      const config = {}
      if (!code) return config
      for (const rawLine of code.split('\n')) {
        const line = rawLine.trim()
        const m = line.match(lineRe)
        if (m) config[m[1]] = m[2]
      }
      return config
    },
    parseIndicatorContractHeaders (code) {
      const pairRe = /\b(signal_form|exit_owner|flip_mode)\s*:?\s*(\S+)/ig
      const out = {}
      if (!code) return out
      for (const rawLine of code.split('\n')) {
        const line = rawLine.trim()
        if (!line.startsWith('#')) continue
        pairRe.lastIndex = 0
        let m
        while ((m = pairRe.exec(line.slice(1).trim())) !== null) {
          const key = String(m[1] || '').toLowerCase()
          const val = String(m[2] || '').trim()
          if (key === 'exit_owner') {
            const owner = val.toLowerCase()
            if (owner === 'indicator' || owner === 'engine') out.exit_owner = owner
          } else if (key === 'signal_form') {
            out.signal_form = val.toLowerCase()
          } else if (key === 'flip_mode') {
            out.flip_mode = val.toUpperCase()
          }
        }
      }
      return out
    },
    parseIndicatorParamRaw (code) {
      const lineRe = /^#\s*@param\s+(\w+)\s+(int|float|bool|str|string)\s+(\S+)/i
      const params = {}
      if (!code) return params
      for (const rawLine of code.split('\n')) {
        const line = rawLine.trim()
        const m = line.match(lineRe)
        if (!m) continue
        params[m[1]] = {
          type: String(m[2] || '').toLowerCase(),
          rawValue: m[3]
        }
      }
      return params
    },
    normalizeIndicatorParamValue (meta) {
      if (!meta || meta.rawValue == null) return undefined
      const type = String(meta.type || '').toLowerCase()
      const rawValue = meta.rawValue
      if (type === 'bool') {
        return ['true', '1', 'yes', 'on'].includes(String(rawValue).toLowerCase())
      }
      if (type === 'int' || type === 'float') {
        const num = Number(rawValue)
        return Number.isFinite(num) ? num : rawValue
      }
      return String(rawValue)
    },
    strategyConfigFromCode (code) {
      const raw = this.parseStrategyAnnotationRaw(code || '')
      const headers = this.parseIndicatorContractHeaders(code || '')
      const toFloat = (v) => { const f = parseFloat(v); return isNaN(f) ? null : f }
      const toBool = (v) => ['true', '1', 'yes', 'on'].includes(String(v).toLowerCase())

      const stopLossPct = toFloat(raw.stopLossPct) ?? 0
      const takeProfitPct = toFloat(raw.takeProfitPct) ?? 0
      let entryPct = toFloat(raw.entryPct)
      if (entryPct == null || entryPct === 0) {
        entryPct = 1.0
      } else if (entryPct > 1 && entryPct <= 100) {
        entryPct = entryPct / 100
      }
      entryPct = Math.max(0.01, Math.min(1, entryPct))

      const trailingEnabled = raw.trailingEnabled != null ? toBool(raw.trailingEnabled) : false
      const trailingPct = toFloat(raw.trailingStopPct) ?? 0
      const activationPct = toFloat(raw.trailingActivationPct) ?? 0

      const fundingRateAnnualNum = Number(this.fundingRateAnnual)
      const fundingIntervalNum = Number(this.fundingIntervalHours)

      const out = {
        risk: {
          stopLossPct,
          takeProfitPct,
          trailing: {
            enabled: trailingEnabled,
            pct: trailingPct,
            activationPct: activationPct
          }
        },
        position: { entryPct },
        execution: { signalTiming: 'next_bar_open' },
        scale: {
          trendAdd: { enabled: false },
          dcaAdd: { enabled: false },
          trendReduce: { enabled: false },
          adverseReduce: { enabled: false }
        },
        fees: {
          // Backend interprets >1.5 as percentage, <=1.5 as decimal. We pass
          // raw value the user typed. Defaults to 0 = no funding charge,
          // matching pre-existing backtest behaviour.
          fundingRateAnnual: Number.isFinite(fundingRateAnnualNum) ? fundingRateAnnualNum : 0,
          fundingIntervalHours: Number.isFinite(fundingIntervalNum) && fundingIntervalNum > 0
            ? fundingIntervalNum
            : 8
        }
      }
      if (headers.exit_owner) out.exitOwner = headers.exit_owner
      return out
    },
    buildBacktestStrategyConfig () {
      return this.strategyConfigFromCode(this.currentCode || '')
    },
    resolveBacktestMarketType () {
      const market = String(this.market || '').toLowerCase()
      if (market === 'crypto') return 'swap'
      return 'spot'
    },
    /**
     * Parse `@param` declarations into sweep metadata.
     *
     *   { paramName: { values: number[], source: 'declared'|'inferred',
     *                  type: 'int'|'float', defaultValue: number|null } }
     *
     * Resolution order per param:
     *                        produced by `autoInferParamSweep` (source = 'inferred')
     *
     * Step 3 is the P1 improvement: it means a plain `# @param rsi_len int 14`
     * doesn't have to also remember the `range=` suffix syntax.
     */
    parseIndicatorParamRanges (code) {
      const out = {}
      if (!code || typeof code !== 'string') return out
      const paramRe = /^\s*#\s*@param\s+(\w+)\s+(int|float|bool|str|string)\s+(\S+)\s*(.*)$/i
      const rangeRe = /range\s*=\s*(-?\d+(?:\.\d+)?)\s*:\s*(-?\d+(?:\.\d+)?)\s*:\s*(-?\d+(?:\.\d+)?)/i
      const valuesRe = /values\s*=\s*([^\s]+)/i
      for (const rawLine of code.split('\n')) {
        const line = rawLine.trim()
        const m = paramRe.exec(line)
        if (!m) continue
        const name = m[1]
        const type = (m[2] || '').toLowerCase()
        const defaultStrRaw = m[3]
        const desc = m[4] || ''
        if (type !== 'int' && type !== 'float') continue

        const defNum = Number(defaultStrRaw)
        const defaultValue = Number.isFinite(defNum) ? defNum : null

        const vm = valuesRe.exec(desc)
        if (vm) {
          const arr = []
          const seen = new Set()
          for (const tok of vm[1].split(',')) {
            const t = tok.trim()
            if (!t) continue
            const num = Number(t)
            if (Number.isFinite(num)) {
              const v = type === 'int' ? Math.round(num) : num
              if (!seen.has(v)) { seen.add(v); arr.push(v) }
            }
          }
          if (arr.length > 1) out[name] = { values: arr, source: 'declared', type, defaultValue }
          continue
        }
        const rm = rangeRe.exec(desc)
        if (rm) {
          const lo = Number(rm[1])
          const hi = Number(rm[2])
          const step = Number(rm[3])
          if (!Number.isFinite(lo) || !Number.isFinite(hi) || !Number.isFinite(step) || step === 0) continue
          if ((hi - lo) * step < 0) continue
          const arr = []
          const seen = new Set()
          let cursor = lo
          const maxCount = 64
          // step is intentionally a loop-invariant direction marker; ESLint's
          // no-unmodified-loop-condition can't see that `cursor` carries the
          // termination state, so we silence the rule here.
          // eslint-disable-next-line no-unmodified-loop-condition
          while ((step > 0 && cursor <= hi + 1e-9) || (step < 0 && cursor >= hi - 1e-9)) {
            const v = type === 'int' ? Math.round(cursor) : Number(cursor.toFixed(8))
            if (!seen.has(v)) { seen.add(v); arr.push(v) }
            cursor += step
            if (arr.length >= maxCount) break
          }
          if (arr.length > 1) out[name] = { values: arr, source: 'declared', type, defaultValue }
          continue
        }

        // Auto-infer (P1): generate ~5 candidates around the default. We pick
        // multiplicative factors instead of fixed offsets so the sweep adapts
        // a default of 100 produces [50,75,100,125,175].
        if (defaultValue == null) continue
        const inferred = this.autoInferParamSweep(type, defaultValue)
        if (inferred && inferred.length > 1) {
          out[name] = { values: inferred, source: 'inferred', type, defaultValue }
        }
      }
      return out
    },
    /**
     * Build a fractional sweep around a default value (P1 fallback for
     * @param declarations without an explicit range=/values= clause).
     *
     * default (1.75x vs 0.5x) because most technical indicator parameters are
     * lookback windows, and longer lookbacks are usually what users tune
     * toward in trending regimes. For very small int defaults the factors
     * deduplicated, sorted set so the search space stays well-formed.
     */
    autoInferParamSweep (type, defaultValue) {
      const def = Number(defaultValue)
      if (!Number.isFinite(def)) return []
      const factors = [0.5, 0.75, 1, 1.25, 1.75]
      if (type === 'int') {
        const arr = factors
          .map(f => Math.max(1, Math.round(def * f)))
          .filter(v => Number.isFinite(v))
        return Array.from(new Set(arr)).sort((a, b) => a - b)
      }
      // float
      const arr = factors
        .map(f => Number((def * f).toFixed(6)))
        .filter(v => Number.isFinite(v) && v >= 0)
      return Array.from(new Set(arr)).sort((a, b) => a - b)
    },
    /** Toggle whether a sweep dimension contributes to parameterSpace. */
    toggleSweepDimension (key) {
      const next = new Set(this.disabledSweepDims || [])
      if (next.has(key)) next.delete(key); else next.add(key)
      this.disabledSweepDims = Array.from(next)
    },
    isSweepDimDisabled (key) {
      return (this.disabledSweepDims || []).includes(key)
    },
    /** Render a sweep value list with at most ~6 visible entries followed by
     *  an ellipsis hint. We format ints natively and pin floats to 4 dp so
     *  the panel doesn't blow up from binary fractions like 0.029999999. */
    formatSweepValues (values) {
      if (!Array.isArray(values) || !values.length) return ''
      const cap = 6
      const fmt = (v) => Number.isInteger(v) ? String(v) : Number(v).toFixed(4).replace(/\.?0+$/, '')
      if (values.length <= cap) return values.map(fmt).join(', ')
      const head = values.slice(0, cap - 1).map(fmt)
      const tail = fmt(values[values.length - 1])
      return `${head.join(', ')}, ... ${tail}`
    },
    buildExperimentBase () {
      return null
    },
    buildExperimentPayload () {
      const base = this.buildExperimentBase()
      if (!base) return null
      return {
        base,
        maxRounds: 3,
        candidatesPerRound: 5,
        earlyStopScore: 82
      }
    },
    buildStructuredTunePayload () {
      const base = this.buildExperimentBase()
      if (!base) return null
      return {
        base,
        parameterSpace: this.experimentParameterSpace,
        evolution: {
          method: this.structuredTuneMethod,
          maxVariants: 48
        },
        includeBaseline: true
      }
    },
    _authTokenForFetch () {
      let token = storage.get(ACCESS_TOKEN)
      if (token && typeof token === 'object') {
        token = token.token || token.value || ''
      }
      return (typeof token === 'string' && token) ? token : ''
    },
    _parseSseEventBlock (block) {
      if (!block || !String(block).trim()) return null
      let eventName = 'message'
      const dataLines = []
      for (const line of String(block).split(/\r?\n/)) {
        if (!line) continue
        if (line.startsWith('event:')) eventName = line.slice(6).trim()
        else if (line.startsWith('data:')) dataLines.push(line.slice(5).replace(/^\s/, ''))
      }
      if (!dataLines.length) return null
      return { event: eventName, data: dataLines.join('\n') }
    },
    _applyExperimentProgress (p) {
      if (!p || typeof p !== 'object') return
      const kind = p.event
      if (kind === 'regime') {
        if (p.status === 'running') {
          this.experimentLiveHint = this.$t('indicatorIde.experimentHintRegime')
        }
        if (p.status === 'done') {
          this.experimentLiveHint = this.$t('indicatorIde.experimentHintRegimeDone')
        }
      } else if (kind === 'round_start') {
        const r = Number(p.round) || 0
        const mx = Number(p.maxRounds) || this.experimentMaxRounds
        this.experimentCurrentRound = r
        if (mx) this.experimentMaxRounds = mx
        this.experimentLiveHint = this.$t('indicatorIde.experimentHintRound', { n: r, max: this.experimentMaxRounds })
      } else if (kind === 'candidate_backtest') {
        const r = Number(p.round) || this.experimentCurrentRound || 1
        const i = Number(p.index) || 0
        const t = Number(p.total) || 0
        this.experimentLiveHint = this.$t('indicatorIde.experimentHintBacktest', { round: r, i, total: t })
      } else if (kind === 'round_done') {
        const bs = p.bestScore
        if (typeof bs === 'number' && !isNaN(bs)) {
          this.experimentRoundScores = [...this.experimentRoundScores, bs]
        }
        if (p.globalBestScore != null && !isNaN(Number(p.globalBestScore))) {
          this.experimentGlobalBestScoreLive = Number(p.globalBestScore)
        }
        this.experimentLiveHint = this.$t('indicatorIde.experimentHintRoundDone', {
          n: p.round || this.experimentCurrentRound,
          score: (p.bestScore != null ? Number(p.bestScore) : 0).toFixed(1)
        })
      }
    },
    async streamAiOptimizeWithSse (payload, signal) {
      const token = this._authTokenForFetch()
      const lang = storage.get('lang') || 'en-US'
      const response = await fetch('/api/experiment/ai-optimize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
          'Access-Token': token,
          token: token,
          'X-App-Lang': lang,
          'Accept-Language': lang,
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify(payload),
        credentials: 'include',
        signal
      })
      if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(text || `HTTP ${response.status}`)
      }
      if (!response.body || typeof response.body.getReader !== 'function') {
        throw new Error('No response stream')
      }
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let finalData = null
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split(/\r?\n\r?\n/)
        buffer = parts.pop() || ''
        for (const rawBlock of parts) {
          const evt = this._parseSseEventBlock(rawBlock)
          if (!evt) continue
          if (evt.event === 'done') {
            try {
              finalData = JSON.parse(evt.data)
            } catch (e) {
              throw new Error(this.$t('indicatorIde.aiExperimentFailed'))
            }
          } else if (evt.event === 'error') {
            let msg = this.$t('indicatorIde.aiExperimentFailed')
            try {
              const j = JSON.parse(evt.data)
              if (j && j.msg) msg = j.msg
            } catch (_) {}
            throw new Error(msg)
          } else if (evt.event === 'progress') {
            try {
              const p = JSON.parse(evt.data)
              this._applyExperimentProgress(p)
            } catch (_) {}
          }
        }
      }
      return finalData
    },
    handleRunCurrentMode () {
      if (this.structuredTuneMethod === 'ai') return this.handleRunAIExperiment()
      return this.handleRunStructuredTune()
    },
    async handleRunAIExperiment () {
      if (this.selectedIndicatorCodeHidden) {
        this.$message.warning(this.$t('indicatorIde.hiddenCodeCannotOptimize'))
        return
      }
      if (!this.currentCode || !this.symbol || !this.startDate || !this.endDate) {
        this.$message.warning(this.$t('indicatorIde.aiExperimentNeedBacktestParams'))
        return
      }
      this.syncTradeUiFromStrategyCode(this.currentCode || '', { silent: true })
      const payload = this.buildExperimentPayload()
      if (!payload) return

      if (this.experimentAbortController) {
        try { this.experimentAbortController.abort() } catch (_) {}
      }
      this.experimentAbortController = typeof AbortController !== 'undefined' ? new AbortController() : null
      const signal = this.experimentAbortController ? this.experimentAbortController.signal : undefined

      this.experimentRunKind = 'llm'
      this.experimentRunning = true
      this.experimentError = ''
      this.experimentResult = null
      this.experimentCurrentRound = 0
      this.experimentMaxRounds = payload.maxRounds || 3
      this.experimentRoundScores = []
      this.experimentGlobalBestScoreLive = 0
      this.experimentLiveHint = this.$t('indicatorIde.experimentHintStarting')
      this.elapsedSec = 0
      clearInterval(this.elapsedTimer)
      this.elapsedTimer = setInterval(() => { this.elapsedSec++ }, 1000)

      try {
        const data = await this.streamAiOptimizeWithSse(payload, signal)
        if (data && typeof data === 'object') {
          this.experimentResult = data
          this.experimentSelectedCandidateName = (((data || {}).bestStrategyOutput || {}).name) || ((((data || {}).rankedStrategies) || [])[0] || {}).name || ''
          this.$message.success(this.$t('indicatorIde.aiExperimentDone'))
        } else {
          throw new Error(this.$t('indicatorIde.aiExperimentFailed'))
        }
      } catch (e) {
        if (e && (e.name === 'AbortError' || String(e.message || '').includes('aborted'))) {
          this.$message.info(this.$t('indicatorIde.experimentAborted'))
        } else {
          this.experimentError = (e && e.message) || this.$t('indicatorIde.aiExperimentFailed')
          this.$message.error(this.experimentError)
        }
      } finally {
        this.experimentRunning = false
        this.experimentLiveHint = ''
        this.experimentAbortController = null
        clearInterval(this.elapsedTimer)
      }
    },
    async handleRunStructuredTune () {
      if (this.selectedIndicatorCodeHidden) {
        this.$message.warning(this.$t('indicatorIde.hiddenCodeCannotOptimize'))
        return
      }
      if (!this.currentCode || !this.symbol || !this.startDate || !this.endDate) {
        this.$message.warning(this.$t('indicatorIde.aiExperimentNeedBacktestParams'))
        return
      }
      this.syncTradeUiFromStrategyCode(this.currentCode || '', { silent: true })
      const payload = this.buildStructuredTunePayload()
      if (!payload) return

      this.experimentRunKind = 'structured'
      this.experimentRunning = true
      this.experimentError = ''
      this.experimentResult = null
      this.experimentCurrentRound = 0
      this.experimentMaxRounds = 1
      this.experimentRoundScores = []
      this.experimentGlobalBestScoreLive = 0
      this.elapsedSec = 0
      clearInterval(this.elapsedTimer)
      this.elapsedTimer = setInterval(() => { this.elapsedSec++ }, 1000)

      try {
        const response = await request({
          url: '/api/experiment/structured-tune',
          method: 'post',
          data: payload,
          timeout: 600000
        })
        if (response && response.code === 1 && response.data) {
          this.experimentResult = response.data
          this.experimentSelectedCandidateName = (((response.data || {}).bestStrategyOutput || {}).name) || ((((response.data || {}).rankedStrategies) || [])[0] || {}).name || ''
          this.$message.success(this.$t('indicatorIde.structuredTuneDone'))
        } else {
          throw new Error((response && response.msg) || this.$t('indicatorIde.structuredTuneFailed'))
        }
      } catch (e) {
        this.experimentError = e.message || this.$t('indicatorIde.structuredTuneFailed')
        this.$message.error(this.experimentError)
      } finally {
        this.experimentRunning = false
        clearInterval(this.elapsedTimer)
      }
    },
    replaceEditorCode (nextCode) {
      const val = nextCode == null ? '' : String(nextCode)
      this.currentCode = val
      if (this.cmInstance) {
        this.cmInstance.setValue(val)
        this.cmInstance.refresh()
      }
      this.codeDirty = true
    },
    // Strategy annotation keys accepted by the local parser.
    _strategyAnnotationKeysSet () {
      return new Set([
        'stopLossPct', 'takeProfitPct', 'entryPct',
        'trailingEnabled', 'trailingStopPct', 'trailingActivationPct'
      ])
    },
    formatStrategyAnnotationValue (key, value) {
      if (value === null || value === undefined) return null
      if (key === 'trailingEnabled') return value ? 'true' : 'false'
      const n = Number(value)
      if (!Number.isFinite(n)) return String(value)
      let s = n.toFixed(8).replace(/\.?0+$/, '')
      if (s === '' || s === '-') s = '0'
      return s
    },
    flattenExperimentOverrides (overrides) {
      const out = {}
      if (!overrides || typeof overrides !== 'object') return out
      const pathToAnn = {
        'strategyConfig.risk.stopLossPct': 'stopLossPct',
        'strategyConfig.risk.takeProfitPct': 'takeProfitPct',
        'strategyConfig.position.entryPct': 'entryPct',
        'strategyConfig.risk.trailing.pct': 'trailingStopPct',
        'strategyConfig.risk.trailing.activationPct': 'trailingActivationPct',
        'strategyConfig.risk.trailing.enabled': 'trailingEnabled'
      }
      const norm = k => String(k || '').replace(/strategy_config\./gi, 'strategyConfig.')
      Object.keys(overrides).forEach(k => {
        if (k === 'indicatorParams' || k === 'indicator_params' || k === 'riskParams') return
        if (k.startsWith('indicator_params.') || k.startsWith('indicatorParams.')) return
        if (k === 'leverage') {
          out.leverage = Number(overrides[k])
          return
        }
        const ann = pathToAnn[norm(k)]
        if (ann) {
          const v = overrides[k]
          out[ann] = ann === 'trailingEnabled' ? !!v : v
        }
      })
      const rp = overrides.riskParams
      if (rp && typeof rp === 'object') {
        if (rp.stopLossPct != null) out.stopLossPct = Number(rp.stopLossPct)
        if (rp.takeProfitPct != null) out.takeProfitPct = Number(rp.takeProfitPct)
        if (rp.entryPct != null) out.entryPct = Number(rp.entryPct)
        if (rp.leverage != null) out.leverage = Number(rp.leverage)
        const tr = rp.trailingStop || rp.trailing
        if (tr && typeof tr === 'object') {
          if (tr.enabled != null) out.trailingEnabled = !!tr.enabled
          if (tr.pct != null) out.trailingStopPct = Number(tr.pct)
          if (tr.activationPct != null) out.trailingActivationPct = Number(tr.activationPct)
        }
      }
      return out
    },
    buildCurrentExperimentComparableState (code) {
      const strategyConfig = this.strategyConfigFromCode(code || '')
      const indicatorParamsRaw = this.parseIndicatorParamRaw(code || '')
      const indicatorParams = {}
      Object.keys(indicatorParamsRaw).forEach(name => {
        indicatorParams[name] = this.normalizeIndicatorParamValue(indicatorParamsRaw[name])
      })
      return {
        stopLossPct: (((strategyConfig || {}).risk || {}).stopLossPct),
        takeProfitPct: (((strategyConfig || {}).risk || {}).takeProfitPct),
        entryPct: (((strategyConfig || {}).position || {}).entryPct),
        trailingEnabled: ((((strategyConfig || {}).risk || {}).trailing || {}).enabled),
        trailingStopPct: ((((strategyConfig || {}).risk || {}).trailing || {}).pct),
        trailingActivationPct: ((((strategyConfig || {}).risk || {}).trailing || {}).activationPct),
        leverage: Number(this.leverage || 1),
        indicatorParams
      }
    },
    isExperimentValueEqual (left, right) {
      if (typeof left === 'number' || typeof right === 'number') {
        const a = Number(left)
        const b = Number(right)
        if (Number.isFinite(a) && Number.isFinite(b)) return Math.abs(a - b) < 1e-10
      }
      if (typeof left === 'boolean' || typeof right === 'boolean') {
        return Boolean(left) === Boolean(right)
      }
      return String(left) === String(right)
    },
    formatExperimentDisplayValue (key, value, options = {}) {
      if (value === null || value === undefined || value === '') return '--'
      if (options.isIndicatorParam) {
        if (typeof value === 'boolean') return value ? 'true' : 'false'
        if (typeof value === 'number' && Number.isFinite(value)) return Number(value.toFixed(8)).toString()
        return String(value)
      }
      return this.formatExperimentOverrideValue(key, value)
    },
    buildExperimentChangeEntries (candidate, code = this.currentCode || '') {
      if (!candidate || !candidate.overrides || !Object.keys(candidate.overrides).length) return []
      const currentState = this.buildCurrentExperimentComparableState(code)
      const flatOverrides = this.flattenExperimentOverrides(candidate.overrides)
      const entries = []

      Object.keys(flatOverrides).forEach(key => {
        const nextValue = flatOverrides[key]
        const prevValue = currentState[key]
        entries.push({
          key: `base-${key}`,
          label: this.humanizeExperimentKey(key),
          fromLabel: this.formatExperimentDisplayValue(key, prevValue),
          toLabel: this.formatExperimentDisplayValue(key, nextValue),
          changed: !this.isExperimentValueEqual(prevValue, nextValue)
        })
      })

      const indicatorParams = resolveExperimentIndicatorParams(
        candidate.overrides,
        candidate.snapshot
      )
      if (indicatorParams && typeof indicatorParams === 'object' && Object.keys(indicatorParams).length) {
        Object.keys(indicatorParams).forEach(name => {
          const prevValue = (currentState.indicatorParams || {})[name]
          const nextValue = indicatorParams[name]
          entries.push({
            key: `indicator-${name}`,
            label: name,
            fromLabel: this.formatExperimentDisplayValue(name, prevValue, { isIndicatorParam: true }),
            toLabel: this.formatExperimentDisplayValue(name, nextValue, { isIndicatorParam: true }),
            changed: !this.isExperimentValueEqual(prevValue, nextValue)
          })
        })
      }

      return entries
    },
    summarizeExperimentChangeEntries (entries) {
      const changed = (entries || []).filter(item => item && item.changed)
      if (!changed.length) return ''
      const preview = changed.slice(0, 3).map(item => `${item.label} ${item.fromLabel} -> ${item.toLabel}`).join('; ')
      const moreCount = changed.length - 3
      return moreCount > 0
        ? `${preview} ${this.$t('indicatorIde.moreParams', { count: moreCount })}`
        : preview
    },
    applyStrategyAnnotationsToCode (code, flatMap) {
      const allowed = this._strategyAnnotationKeysSet()
      const keysWithValues = {}
      Object.keys(flatMap || {}).forEach(k => {
        if (!allowed.has(k)) return
        const v = flatMap[k]
        if (v === undefined || v === null) return
        keysWithValues[k] = v
      })
      if (!Object.keys(keysWithValues).length) return code || ''

      const lineRe = /^(\s*#\s*@strategy\s+)(\w+)(\s*:?\s*)(\S+)(\s*(.*))$/i
      const lines = (code || '').split('\n')
      const used = new Set()

      for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(lineRe)
        if (!m) continue
        const lineKey = m[2]
        const canonical = Object.keys(keysWithValues).find(
          kk => kk.toLowerCase() === lineKey.toLowerCase()
        )
        if (!canonical) continue
        const formatted = this.formatStrategyAnnotationValue(canonical, keysWithValues[canonical])
        if (formatted === null) continue
        lines[i] = `${m[1]}${canonical}${m[3]}${formatted}${m[5]}`
        used.add(canonical)
      }

      const toInsert = Object.keys(keysWithValues).filter(k => !used.has(k))
      if (toInsert.length) {
        let insertAt = 0
        for (let j = lines.length - 1; j >= 0; j--) {
          if (/^\s*#\s*@strategy\s+/i.test(lines[j])) {
            insertAt = j + 1
            break
          }
        }
        if (insertAt === 0) {
          for (let j = 0; j < lines.length; j++) {
            const t = (lines[j] || '').trim()
            if (t && !t.startsWith('#')) {
              insertAt = j
              break
            }
          }
        }
        const block = toInsert.map(k => {
          const v = this.formatStrategyAnnotationValue(k, keysWithValues[k])
          return `# @strategy ${k} ${v}`
        })
        lines.splice(insertAt, 0, ...block)
      }
      return lines.join('\n')
    },
    applyIndicatorParamsToCode (code, params) {
      if (!code || !params || typeof params !== 'object') return code
      const lineRe = /^(\s*#\s*@param\s+)(\w+)(\s+)(int|float|bool|str|string)(\s+)(\S+)(\s*(.*))$/i
      const lines = code.split('\n')
      let changed = false
      for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(lineRe)
        if (!m) continue
        const name = m[2]
        if (!Object.prototype.hasOwnProperty.call(params, name)) continue
        const val = params[name]
        const formatted = typeof val === 'boolean' ? (val ? 'true' : 'false') : String(val)
        lines[i] = `${m[1]}${name}${m[3]}${m[4]}${m[5]}${formatted}${m[7] || ''}`
        changed = true
      }
      return changed ? lines.join('\n') : code
    },
    applyExperimentOverridesToCode (code, overrides, snapshot) {
      const strat = this.flattenExperimentOverrides(overrides)
      let next = this.applyStrategyAnnotationsToCode(code, strat)
      const ip = resolveExperimentIndicatorParams(overrides, snapshot)
      if (ip && typeof ip === 'object' && Object.keys(ip).length) {
        next = this.applyIndicatorParamsToCode(next, ip)
      }
      return next
    },
    applyBestExperimentCandidate () {
      const best = this.experimentBest
      if (!best || !best.overrides || !Object.keys(best.overrides).length) {
        this.$message.warning(this.$t('indicatorIde.applyCandidateNoOverrides'))
        return
      }
      this.applyExperimentCandidate(best)
    },
    applyExperimentCandidate (candidate) {
      if (!candidate || !candidate.overrides || !Object.keys(candidate.overrides).length) {
        this.$message.warning(this.$t('indicatorIde.applyCandidateNoOverrides'))
        return
      }
      const prev = this.currentCode || ''
      const changeEntries = this.buildExperimentChangeEntries(candidate, prev)
      const changedEntries = changeEntries.filter(item => item.changed)
      const flatOverrides = this.flattenExperimentOverrides(candidate.overrides)
      const next = this.applyExperimentOverridesToCode(prev, candidate.overrides, candidate.snapshot)
      if (next === prev && !changedEntries.length) {
        this.$message.info(this.$t('indicatorIde.applyCandidateNoChanges'))
        return
      }
      if (next !== prev) {
        this.replaceEditorCode(next)
      }
      this.experimentSelectedCandidateName = candidate.name || this.experimentSelectedCandidateName
      if (flatOverrides.leverage != null) {
        const lv = Math.max(1, Math.min(125, Math.round(Number(flatOverrides.leverage))))
        if (Number.isFinite(lv)) this.leverage = lv
      }
      this.syncTradeUiFromStrategyCode(next, { silent: true })
      this.syncSelectedIndicatorToChart(next)
      this.lastAppliedExperimentCandidateName = candidate.name || ''
      this.lastAppliedExperimentChanges = changedEntries
      const summary = this.summarizeExperimentChangeEntries(changedEntries)
      this.$message.success(summary
        ? `${this.$t('indicatorIde.bestParamsAppliedCount', { count: changedEntries.length })} ${summary}`
        : this.$t('indicatorIde.bestParamsApplied'))
    },
    selectExperimentCandidate (candidate) {
      if (!candidate) return
      this.experimentSelectedCandidateName = candidate.name || ''
    },
    experimentRankingRowProps (record) {
      return {
        on: {
          click: () => this.selectExperimentCandidate(record)
        }
      }
    },
    experimentRankingRowClassName (record) {
      const selected = this.experimentSelectedCandidate && this.experimentSelectedCandidate.name
      return selected && record && record.name === selected ? 'experiment-ranking-row is-selected' : 'experiment-ranking-row'
    },
    async runBacktestWithExperimentCandidate (candidate, options = {}) {
      if (!candidate) return
      this.applyExperimentCandidate(candidate)
      await this.$nextTick()
      // When OOS validation is enabled, the tuner reported numbers come
      // from the training window only. Re-running the candidate on the
      // user's full window can look dramatically different (this is the
      // whole point of OOS validation -- to expose overfit candidates).
      // Default `mode` is 'train' so the headline number the user just
      // saw can be reproduced bar-for-bar; the caller can pass 'full'
      // to opt into "what does this look like on my full window?".
      const meta = this.experimentOosMeta || null
      const wantsTrain = (options.mode || 'train') === 'train'
      let dateRangeOverride = null
      if (wantsTrain && meta && meta.enabled && meta.trainStart && meta.trainEnd) {
        dateRangeOverride = { start: meta.trainStart, end: meta.trainEnd, label: 'train' }
      }
      this.runBacktest({ dateRangeOverride })
    },
    runBacktestWithExperimentBest (mode = 'train') {
      const best = this.experimentBest
      if (!best) return
      this.runBacktestWithExperimentCandidate(best, { mode })
    },
    handleCreateStrategyFromExperiment () {
      const candidate = this.experimentSelectedCandidate || this.experimentBest
      this.navigateToTradingAssistantWithDraft(candidate, { source: 'experiment_candidate' })
    },
    buildStrategyCreationDraft (candidate = null, options = {}) {
      const indicator = this.selectedIndicatorObj || {}
      const strategyConfig = candidate && candidate.snapshot && candidate.snapshot.strategy_config
        ? JSON.parse(JSON.stringify(candidate.snapshot.strategy_config))
        : this.buildBacktestStrategyConfig()
      const leverage = candidate && candidate.snapshot && candidate.snapshot.leverage != null
        ? Number(candidate.snapshot.leverage || 1)
        : Number(this.leverage || 1)
      const code = this.currentCode || indicator.code || ''
      const codeHidden = this.selectedIndicatorCodeHidden
      return {
        version: 'indicator-ide-strategy-draft-v1',
        createdAt: new Date().toISOString(),
        source: options.source || 'indicator_ide',
        indicator: {
          id: indicator.id || null,
          name: indicator.name || '',
          description: indicator.description || '',
          code: codeHidden ? '' : code,
          codeHidden
        },
        market: this.market,
        symbol: this.symbol,
        timeframe: this.timeframe,
        initialCapital: Number(this.initialCapital || 0),
        commission: Number(this.commission || 0) / 100,
        slippage: Number(this.slippage || 0) / 100,
        leverage,
        tradeDirection: this.tradeDirection,
        strictMode: !!this.strictMode,
        strategyConfig,
        experiment: candidate
          ? {
              candidateName: candidate.name || '',
              candidateSource: candidate.source || '',
              overrides: JSON.parse(JSON.stringify(candidate.overrides || {})),
              score: JSON.parse(JSON.stringify(candidate.score || {})),
              resultSummary: JSON.parse(JSON.stringify(candidate.result || {})),
              regime: JSON.parse(JSON.stringify(this.experimentRegime || {}))
            }
          : null
      }
    },
    persistStrategyCreationDraft (draft) {
      const key = `qd_strategy_creation_draft_${Date.now()}`
      try {
        window.sessionStorage.setItem(key, JSON.stringify(draft))
      } catch (e) {
        console.warn('Persist strategy creation draft failed:', e)
      }
      return key
    },
    navigateToTradingAssistantWithDraft (candidate = null, options = {}) {
      const indicator = this.selectedIndicatorObj
      if (!indicator) return
      if (!this.selectedIndicatorCodeHidden) {
        this.syncTradeUiFromStrategyCode(this.currentCode || indicator.code || '', { silent: true })
      }
      const draft = this.buildStrategyCreationDraft(candidate, options)
      const draftKey = this.persistStrategyCreationDraft(draft)
      const snapshot = candidate && candidate.snapshot ? candidate.snapshot : null
      this.$router.push({
        path: '/strategy-center',
        query: {
          mode: 'create',
          source: options.source || 'indicator_ide',
          indicator_id: String(indicator.id),
          indicator_name: indicator.name || '',
          indicator_desc: indicator.description || '',
          market: draft.market || '',
          symbol: draft.symbol || '',
          timeframe: draft.timeframe || '',
          leverage: String(draft.leverage || 1),
          trade_direction: draft.tradeDirection || 'long',
          draft_key: draftKey,
          draft_version: draft.version,
          candidate_name: candidate ? (candidate.name || '') : '',
          candidate_score: candidate && candidate.score ? String(candidate.score.overallScore || '') : '',
          strategy_config: snapshot ? encodeURIComponent(JSON.stringify(snapshot.strategy_config || {})) : ''
        }
      })
    },
    _normalizeOverrideKey (key) {
      return String(key || '')
        .replace(/strategy_config\./g, 'strategyConfig.')
        .replace(/risk_params/g, 'riskParams')
        .replace(/indicator_params/g, 'indicatorParams')
        .replace(/position_params/g, 'positionParams')
    },
    humanizeExperimentKey (key) {
      const n = this._normalizeOverrideKey(key)
      const leaf = String(n || '').split('.').pop()
      const map = {
        riskParams: this.$t('indicatorIde.riskParamsGroup'),
        indicatorParams: this.$t('indicatorIde.indicatorParamsGroup'),
        positionParams: this.$t('indicatorIde.positionParamsGroup'),
        stopLossPct: this.$t('indicatorIde.stopLoss'),
        takeProfitPct: this.$t('indicatorIde.takeProfit'),
        entryPct: this.$t('indicatorIde.entryPct'),
        trailingStopPct: this.$t('indicatorIde.trailingPct'),
        trailingActivationPct: this.$t('indicatorIde.activation'),
        trailingEnabled: this.$t('indicatorIde.trailing'),
        tradeDirection: this.$t('indicatorIde.direction'),
        'strategyConfig.risk.stopLossPct': this.$t('indicatorIde.stopLoss'),
        'strategyConfig.risk.takeProfitPct': this.$t('indicatorIde.takeProfit'),
        'strategyConfig.position.entryPct': this.$t('indicatorIde.entryPct'),
        'strategyConfig.risk.trailing.pct': this.$t('indicatorIde.trailingPct'),
        'strategyConfig.risk.trailing.activationPct': this.$t('indicatorIde.activation'),
        'strategyConfig.risk.trailing.enabled': this.$t('indicatorIde.trailing'),
        leverage: this.$t('indicatorIde.leverage'),
        commission: this.$t('indicatorIde.commission'),
        slippage: this.$t('indicatorIde.slippage')
      }
      const scopedMap = {
        'riskParams.stopLossPct': this.$t('indicatorIde.stopLoss'),
        'riskParams.takeProfitPct': this.$t('indicatorIde.takeProfit'),
        'riskParams.trailingStopPct': this.$t('indicatorIde.trailingPct'),
        'riskParams.trailingActivationPct': this.$t('indicatorIde.activation'),
        'riskParams.trailingEnabled': this.$t('indicatorIde.trailing'),
        'positionParams.entryPct': this.$t('indicatorIde.entryPct'),
        'positionParams.leverage': this.$t('indicatorIde.leverage')
      }
      if (map[n]) return map[n]
      if (scopedMap[n]) return scopedMap[n]
      if (n.startsWith('strategyConfig.risk.') || n.startsWith('riskParams.')) {
        return map[leaf] || this.humanizeExperimentParamName(leaf)
      }
      if (n.startsWith('strategyConfig.position.') || n.startsWith('positionParams.')) {
        return map[leaf] || this.humanizeExperimentParamName(leaf)
      }
      if (n.startsWith('indicatorParams.')) {
        return this.humanizeExperimentParamName(leaf)
      }
      return map[leaf] || this.humanizeExperimentParamName(n)
    },
    humanizeExperimentParamName (key) {
      const raw = String(key || '').trim()
      if (!raw) return '--'
      return raw
        .replace(/^(indicatorParams|riskParams|positionParams|strategyConfig)\./, '')
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[._-]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b([a-z])/g, m => m.toUpperCase())
    },
    humanizeExperimentScoreKey (key) {
      const map = {
        returnScore: this.$t('indicatorIde.scoreReturn'),
        annualReturnScore: this.$t('indicatorIde.scoreAnnualReturn'),
        sharpeScore: this.$t('indicatorIde.scoreSharpe'),
        profitFactorScore: this.$t('indicatorIde.scoreProfitFactor'),
        winRateScore: this.$t('indicatorIde.scoreWinRate'),
        drawdownScore: this.$t('indicatorIde.scoreDrawdown'),
        stabilityScore: this.$t('indicatorIde.scoreStability'),
        sampleSizeScore: this.$t('indicatorIde.scoreSampleSize'),
        regimeFitScore: this.$t('indicatorIde.scoreRegimeFit')
      }
      return map[key] || key
    },
    translateExperimentRegime (key) {
      const map = {
        bull_trend: this.$t('indicatorIde.regimeBullTrend'),
        bear_trend: this.$t('indicatorIde.regimeBearTrend'),
        range_compression: this.$t('indicatorIde.regimeRangeCompression'),
        high_volatility: this.$t('indicatorIde.regimeHighVolatility'),
        transition: this.$t('indicatorIde.regimeTransition'),
        'Bull Trend': this.$t('indicatorIde.regimeBullTrend'),
        'Bear Trend': this.$t('indicatorIde.regimeBearTrend'),
        'Range Compression': this.$t('indicatorIde.regimeRangeCompression'),
        'High Volatility': this.$t('indicatorIde.regimeHighVolatility'),
        Transition: this.$t('indicatorIde.regimeTransition')
      }
      return map[key] || key || '--'
    },
    translateExperimentFamily (key) {
      const map = {
        trend_following: this.$t('indicatorIde.familyTrendFollowing'),
        breakout: this.$t('indicatorIde.familyBreakout'),
        pullback_continuation: this.$t('indicatorIde.familyPullbackContinuation'),
        breakdown: this.$t('indicatorIde.familyBreakdown'),
        short_pullback: this.$t('indicatorIde.familyShortPullback'),
        mean_reversion: this.$t('indicatorIde.familyMeanReversion'),
        bollinger_reversion: this.$t('indicatorIde.familyBollingerReversion'),
        range_breakout_watch: this.$t('indicatorIde.familyRangeBreakoutWatch'),
        volatility_breakout: this.$t('indicatorIde.familyVolatilityBreakout'),
        reduced_risk_trend: this.$t('indicatorIde.familyReducedRiskTrend'),
        event_drive: this.$t('indicatorIde.familyEventDrive'),
        hybrid: this.$t('indicatorIde.familyHybrid'),
        wait_and_see: this.$t('indicatorIde.familyWaitAndSee'),
        confirmation_breakout: this.$t('indicatorIde.familyConfirmationBreakout')
      }
      return map[key] || key
    },
    formatExperimentSegmentLabel (segment) {
      if (!segment) return '--'
      return this.translateExperimentRegime(segment.regime || segment.label || '')
    },
    formatExperimentOverrideValue (key, value) {
      const n = this._normalizeOverrideKey(key)
      const leaf = String(n || '').split('.').pop()
      if (n === 'riskParams' || n === 'indicatorParams' || n === 'positionParams') {
        try {
          return JSON.stringify(value)
        } catch (_) {
          return String(value)
        }
      }
      if (leaf === 'trailingEnabled') return value ? 'true' : 'false'
      if (String(leaf).includes('Pct')) return `${(Number(value || 0) * 100).toFixed(2)}%`
      if (leaf === 'leverage') return `${Number(value || 0)}x`
      return String(value)
    },
    formatExperimentOptimizerMethod (method) {
      const map = {
        llm: this.$t('indicatorIde.optimizerMethodLlm'),
        grid: this.$t('indicatorIde.optimizerMethodGrid'),
        random: this.$t('indicatorIde.optimizerMethodRandom'),
        de: this.$t('indicatorIde.optimizerMethodDe'),
        tpe: this.$t('indicatorIde.optimizerMethodTpe')
      }
      return map[String(method || '').toLowerCase()] || String(method || '--')
    },
    clampExperimentScore (value) {
      const n = Number(value)
      if (!Number.isFinite(n)) return 0
      return Math.max(0, Math.min(100, n))
    },
    experimentGradeFromScore (score) {
      const s = Number(score || 0)
      if (s >= 80) return 'A'
      if (s >= 65) return 'B'
      if (s >= 40) return 'C'
      if (s >= 25) return 'D'
      return 'E'
    },
    experimentGradeColor (grade) {
      const g = String(grade || '').toUpperCase()
      if (g === 'A') return 'green'
      if (g === 'B') return 'cyan'
      if (g === 'C') return 'blue'
      if (g === 'D') return 'orange'
      return 'red'
    },
    computeExperimentAdjustedScore (candidate) {
      const score = (candidate && candidate.score) || {}
      const result = (candidate && candidate.result) || {}
      const oosScore = (candidate && candidate.oosScore) || null
      const oosSummary = (candidate && candidate.oosSummary) || {}
      const raw = this.clampExperimentScore(score.overallScore)
      const oosRequired = !!(this.experimentOosMeta && this.experimentOosMeta.enabled)
      if (oosRequired && !oosScore) {
        return this.clampExperimentScore(raw - 35)
      }
      const sharpe = Number(result.sharpeRatio || 0)
      const totalReturn = Number(result.totalReturn || 0)
      const drawdown = Math.abs(Number(result.maxDrawdown || 0))
      const oosReturn = Number(oosSummary.totalReturn == null ? totalReturn : oosSummary.totalReturn)
      const oosOverall = oosScore ? this.clampExperimentScore(oosScore.overallScore) : raw
      const degradation = Math.max(0, Number((candidate && candidate.oosDegradation) || 0))

      const sharpeBonus = Math.max(-5, Math.min(8, sharpe * 3))
      const returnBonus = Math.max(-6, Math.min(6, totalReturn / 5))
      const drawdownBonus = Math.max(-8, Math.min(5, (18 - drawdown) / 3.5))
      const oosQuality = (oosOverall - raw) * 0.12
      const oosReturnPenalty = oosReturn < 0 ? Math.min(8, Math.abs(oosReturn) * 1.4) : -Math.min(4, oosReturn / 8)
      const degradationPenalty = Math.min(28, degradation * 26)
      const overfitPenalty = candidate && candidate.oosOverfit ? 5 : 0

      return this.clampExperimentScore(
        raw +
        sharpeBonus +
        returnBonus +
        drawdownBonus +
        oosQuality -
        degradationPenalty -
        oosReturnPenalty -
        overfitPenalty
      )
    },
    withExperimentAdjustedScore (candidate) {
      if (!candidate) return candidate
      const adjusted = this.computeExperimentAdjustedScore(candidate)
      return {
        ...candidate,
        score: {
          ...(candidate.score || {}),
          rawOverallScore: Number(((candidate.score || {}).overallScore) || 0),
          overallScore: adjusted,
          grade: this.experimentGradeFromScore(adjusted)
        }
      }
    },
    formatExperimentSource (source) {
      if (!source) return '--'
      const map = {
        baseline: this.$t('indicatorIde.experimentSourceBaseline'),
        manual_variant: this.$t('indicatorIde.experimentSourceManual'),
        evolution_grid: this.$t('indicatorIde.experimentSourceGrid'),
        evolution_random: this.$t('indicatorIde.experimentSourceRandom'),
        evolution_de: this.$t('indicatorIde.experimentSourceDe'),
        evolution_tpe: this.$t('indicatorIde.experimentSourceTpe')
      }
      if (map[source]) return map[source]
      const aiMatch = String(source).match(/^ai_round_(\d+)$/)
      if (aiMatch) return `AI ${this.$t('indicatorIde.round')} ${aiMatch[1]}`
      return source
    },

    // ===== Backtest =====
    async runBacktest () {
      this.$message.info(this.$t('indicatorIde.indicatorBacktestRemoved'))
    },

    // ===== Render backtest buy/sell signals on K-line chart =====
    renderBacktestSignals (retry = 0) {
      if (!this.shouldShowBacktestMarkersOnChart()) {
        this.clearBacktestSignalOverlays({ silent: true })
        return
      }
      const trades = (this.result && this.result.trades) || []
      if (!trades.length) return
      const chart = this.$refs.klineChart
      if (!chart) {
        if (retry < 8) setTimeout(() => this.renderBacktestSignals(retry + 1), 250)
        return
      }
      const chartInstance = this.getKlineChartInstance()
      if (!chartInstance) {
        if (retry < 8) setTimeout(() => this.renderBacktestSignals(retry + 1), 250)
        return
      }

      this.clearBacktestSignalOverlays({ silent: true })

      const klineData = (typeof chartInstance.getDataList === 'function') ? chartInstance.getDataList() : []
      if (!klineData.length && retry < 8) {
        setTimeout(() => this.renderBacktestSignals(retry + 1), 250)
        return
      }
      const klineTimestamps = klineData.map(k => k.timestamp)
      const barByTs = new Map()
      klineData.forEach(bar => {
        if (bar && bar.timestamp != null) barByTs.set(bar.timestamp, bar)
      })

      const parseBackendTime = (raw) => {
        if (raw == null) return 0
        if (typeof raw === 'number') {
          return raw < 1e10 ? raw * 1000 : raw
        }
        let s = String(raw).trim()
        if (!s) return 0
        if (!s.includes('T')) s = s.replace(' ', 'T')
        if (!/:\d{2}$/.test(s) && /T\d{2}:\d{2}$/.test(s)) s += ':00'
        if (!s.endsWith('Z') && !/[+-]\d{2}:?\d{2}$/.test(s)) s += 'Z'
        const d = new Date(s)
        const t = d.getTime()
        return isNaN(t) ? 0 : t
      }

      const snapToBar = (ts) => {
        if (!ts || klineTimestamps.length === 0) return ts || 0
        let lo = 0; let hi = klineTimestamps.length - 1
        if (ts < klineTimestamps[0]) return klineTimestamps[0]
        if (ts >= klineTimestamps[hi]) return klineTimestamps[hi]
        while (lo < hi) {
          const mid = (lo + hi + 1) >> 1
          if (klineTimestamps[mid] <= ts) lo = mid
          else hi = mid - 1
        }
        return klineTimestamps[lo]
      }

      const barAnchorPrices = (ts, isBuy, fallbackPrice, markerStyle) => {
        const bar = barByTs.get(ts)
        const isDashed = markerStyle === 'dashed'
        if (!bar) {
          const p = Number(fallbackPrice) || 0
          const minGap = Math.max(Math.abs(p) * 0.01, 1e-8)
          const labelGap = minGap * (isDashed ? 2.2 : 1.55)
          return isBuy
            ? { label: p - labelGap, anchor: p - minGap * 0.35 }
            : { label: p + labelGap, anchor: p + minGap * 0.35 }
        }
        const high = Number(bar.high)
        const low = Number(bar.low)
        const close = Number(bar.close)
        const open = Number(bar.open)
        const ref = Number.isFinite(high) && Number.isFinite(low)
          ? (isBuy ? low : high)
          : (Number.isFinite(close) ? close : open)
        const span = Math.max(
          (Number.isFinite(high) && Number.isFinite(low)) ? (high - low) : 0,
          Math.abs(ref) * 0.001,
          1e-8
        )
        const gap = Math.max(span * 0.92, Math.abs(ref) * 0.010)
        const labelGap = gap * (isDashed ? 1.7 : 1.2)
        const anchorGap = gap * 0.22
        if (!Number.isFinite(ref) || ref <= 0) {
          const p = Number(fallbackPrice) || 0
          return { label: p, anchor: p }
        }
        return isBuy
          ? { label: ref - labelGap, anchor: ref - anchorGap }
          : { label: ref + labelGap, anchor: ref + anchorGap }
      }

      const markerLaneByTs = new Map()
      const nextMarkerLane = (timestamp) => {
        const key = String(timestamp || '')
        const current = markerLaneByTs.get(key) || 0
        markerLaneByTs.set(key, current + 1)
        return current % 4
      }

      const createSignalOverlay = ({ timestamp, labelPrice, anchorPrice, isBuy, markerStyle, text, shortText, color, lane }) => {
        if (!timestamp || !labelPrice) return
        const payload = {
          name: 'signalTag',
          points: [
            { timestamp, value: labelPrice },
            { timestamp, value: anchorPrice || labelPrice }
          ],
          extendData: {
            text: text || (isBuy ? 'B' : 'S'),
            color: color || (isBuy ? '#00E676' : '#FF5252'),
            side: isBuy ? 'buy' : 'sell',
            action: isBuy ? 'buy' : 'sell',
            price: labelPrice,
            markerStyle: markerStyle || 'solid',
            source: 'backtest',
            labelMode: 'compact',
            shortText: shortText || text || (isBuy ? 'L' : 'S'),
            lane: lane == null ? nextMarkerLane(timestamp) : lane,
            fontSize: 10
          },
          lock: true
        }
        if (typeof chart.addBacktestOverlay === 'function') {
          chart.addBacktestOverlay(payload)
        } else if (typeof chartInstance.createOverlay === 'function') {
          try { chartInstance.createOverlay(payload, 'candle_pane') } catch (_) {}
        }
      }

      for (const trade of trades) {
        const ty = String(trade.type || '').toLowerCase().replace(/-/g, '_')
        const meta = this.backtestTradeMarkerMeta(trade)
        const actionKey = this.backtestMarkerActionKey(ty)
        const known = actionKey !== 'other' ||
          ty.startsWith('open_') || ty.startsWith('close_') || ty.startsWith('add_') ||
          ty === 'buy' || ty === 'sell' || ty === 'liquidation'
        if (!known) continue

        const isBuy = meta.isBuy
        const isSell = !isBuy && (
          ty.startsWith('open_short') || ty === 'sell' || ty === 'add_short' ||
          ty.startsWith('close_long') || ty === 'liquidation'
        )
        if (!isBuy && !isSell) continue

        const execTs = snapToBar(parseBackendTime(trade.bar_time || trade.timestamp || trade.time))
        const signalTs = trade.signal_bar_time
          ? snapToBar(parseBackendTime(trade.signal_bar_time))
          : execTs
        const execPrice = Number(trade.price) || 0
        if (!execTs || !execPrice) continue

        const execAnchor = barAnchorPrices(execTs, isBuy, execPrice, 'solid')
        createSignalOverlay({
          timestamp: execTs,
          labelPrice: execAnchor.label,
          anchorPrice: execAnchor.anchor,
          isBuy,
          markerStyle: 'solid',
          text: meta.fillLabel,
          shortText: meta.shortFillLabel,
          color: meta.color
        })

        if (signalTs && signalTs !== execTs) {
          const sigAnchor = barAnchorPrices(signalTs, isBuy, execPrice, 'dashed')
          createSignalOverlay({
            timestamp: signalTs,
            labelPrice: sigAnchor.label,
            anchorPrice: sigAnchor.anchor,
            isBuy,
            markerStyle: 'dashed',
            text: meta.signalLabel,
            shortText: meta.shortSignalLabel,
            color: meta.color
          })
        }
      }
    },

    // ===== AI Code Generation =====
    handleAIGenerateEnterKey (e) {
      if (e.ctrlKey || e.metaKey) this.handleAIGenerate()
    },
    async handleAIGenerate () {
      if (this.selectedIndicatorCodeHidden) {
        this.$message.warning(this.$t('indicatorIde.saveBlockedHiddenCode'))
        return
      }
      if (!this.aiPrompt || !this.aiPrompt.trim()) {
        this.$message.warning(this.$t('indicatorIde.aiPromptRequired'))
        return
      }
      this.aiGenerating = true
      this.aiDebugSummary = null
      let existingCode = ''
      if (this.cmInstance) existingCode = this.cmInstance.getValue() || ''
      if (this.cmInstance) {
        this.cmInstance.setValue('# AI generating...\n')
        this.cmInstance.refresh()
      }
      let generatedCode = ''
      try {
        const url = '/api/indicator/aiGenerate'
        const token = storage.get(ACCESS_TOKEN)
        const lang = (this.$i18n && this.$i18n.locale) || 'en-US'
        const paramDefaults = this.parseIndicatorParamRaw(existingCode || this.currentCode || '')
        const requestBody = {
          prompt: this.aiPrompt.trim(),
          source: 'indicator_ide',
          context: {
            source: 'indicator_ide',
            market: this.market || '',
            symbol: this.symbol || '',
            timeframe: this.timeframe || '',
            indicatorId: this.selectedIndicatorId || '',
            indicatorName: this.selectedIndicatorDisplayName || '',
            indicatorDescription: (this.selectedIndicatorObj && this.selectedIndicatorObj.description) || '',
            paramDefaults
          }
        }
        if (existingCode.trim()) requestBody.existingCode = existingCode.trim()

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: token ? `Bearer ${token}` : '',
            'Access-Token': token || '',
            Token: token || '',
            'X-App-Lang': lang,
            'Accept-Language': lang
          },
          body: JSON.stringify(requestBody),
          credentials: 'include'
        })
        if (!response.ok) {
          const text = await response.text().catch(() => '')
          throw new Error(text || `HTTP error! status: ${response.status}`)
        }
        if (!response.body || typeof response.body.getReader !== 'function') {
          throw new Error('AI service did not return a readable stream')
        }
        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() || ''
          for (const line of lines) {
            if (!line.trim() || !line.startsWith('data: ')) continue
            const data = line.substring(6)
            if (data === '[DONE]') break
            try {
              const json = JSON.parse(data)
              if (json.error) {
                throw new Error(json.error)
              }
              if (json.debug && json.debug.human_summary) {
                this.aiDebugSummary = this.normalizeAiDebugSummary(json.debug.human_summary)
              }
              if (json.content) {
                generatedCode += json.content
                const cleanedCode = this.cleanMarkdownCodeBlocks(generatedCode)
                if (this.cmInstance) {
                  this.cmInstance.setValue(cleanedCode)
                  this.cmInstance.setCursor({ line: this.cmInstance.lineCount() - 1, ch: 0 })
                  this.cmInstance.refresh()
                }
              }
            } catch (err) {
              if (err instanceof Error && err.message) {
                throw err
              }
            }
          }
        }
        if (this.cmInstance && generatedCode) {
          const cleanedCode = this.cleanMarkdownCodeBlocks(generatedCode)
          this.cmInstance.setValue(cleanedCode)
          this.cmInstance.refresh()
          this.currentCode = cleanedCode
          this.codeDirty = true
          this.syncSelectedIndicatorToChart(cleanedCode)
          this.syncTradeUiFromStrategyCode(cleanedCode, { silent: true })
          this.$message.success(this.$t('indicatorIde.aiGenerateSuccess'))
          await this.fetchCodeQualityHints(cleanedCode)
          if (this.codeQualityHints.some(h => h.severity === 'error')) {
            this.aiPanelExpanded = true
            this.$message.warning(this.$t('indicatorIde.codeQualityHasErrors'))
          } else if (this.codeQualityHints.length) {
            this.aiPanelExpanded = true
            this.$message.info(this.$t('indicatorIde.codeQualityHasSuggestions'))
          }
        } else if (!generatedCode) {
          this.$message.warning(this.$t('indicatorIde.aiNoCode'))
        }
      } catch (error) {
        const errMsg = (error && error.message) || this.$t('indicatorIde.aiGenerateFailed')
        if (/insufficient|credit/i.test(errMsg)) {
          this.$message.warning(errMsg)
        } else {
          this.$message.error(errMsg)
        }
        if (generatedCode && this.cmInstance) {
          this.cmInstance.setValue(this.cleanMarkdownCodeBlocks(generatedCode))
        } else if (this.cmInstance) {
          this.cmInstance.setValue(existingCode || '')
          this.cmInstance.refresh()
        }
      } finally {
        this.aiGenerating = false
      }
    },
    normalizeAiDebugSummary (summary) {
      if (!summary || typeof summary !== 'object') return null
      const fixedMessages = Array.isArray(summary.fixed_messages) ? summary.fixed_messages.filter(Boolean) : []
      const remainingMessages = Array.isArray(summary.remaining_messages) ? summary.remaining_messages.filter(Boolean) : []
      const normalized = {
        title: summary.title ? String(summary.title) : '',
        returned_text: summary.returned_text ? String(summary.returned_text) : '',
        fixed_messages: fixedMessages,
        remaining_messages: remainingMessages
      }
      if (!normalized.title && !normalized.returned_text && !fixedMessages.length && !remainingMessages.length) {
        return null
      }
      return normalized
    },
    aiDebugAlertType (summary = this.aiDebugSummary) {
      if (!summary) return 'info'
      if ((summary.remaining_messages || []).length) return 'warning'
      if ((summary.fixed_messages || []).length) return 'success'
      return 'info'
    },
    aiDebugState (summary = this.aiDebugSummary) {
      return this.aiDebugAlertType(summary)
    },
    aiDebugStateIcon (summary = this.aiDebugSummary) {
      const state = this.aiDebugState(summary)
      if (state === 'warning') return 'exclamation-circle'
      if (state === 'success') return 'check-circle'
      return 'info-circle'
    },
    aiDebugStateLabel (summary = this.aiDebugSummary) {
      const state = this.aiDebugState(summary)
      if (state === 'warning') return this.$t('indicatorIde.aiQaStateWarning') || 'Needs review'
      if (state === 'success') return this.$t('indicatorIde.aiQaStateSuccess') || 'Auto fixed'
      return this.$t('indicatorIde.aiQaStatePassed') || 'QA passed'
    },
    aiDebugStateTagColor (summary = this.aiDebugSummary) {
      const state = this.aiDebugState(summary)
      if (state === 'warning') return 'orange'
      if (state === 'success') return 'green'
      return 'blue'
    },
    qualityHintClass (h) {
      const s = (h && h.severity) || 'info'
      return {
        'quality-hint--error': s === 'error',
        'quality-hint--warn': s === 'warn',
        'quality-hint--info': s === 'info'
      }
    },
    formatQualityHint (h) {
      if (!h || !h.code) return ''
      if (h.code === 'PARAM_DEFAULT_MISMATCH') {
        const items = Array.isArray(h.params && h.params.items) ? h.params.items : []
        const details = items
          .map(item => {
            const name = item && item.name ? item.name : '-'
            const declared = item && item.declared !== undefined ? item.declared : '-'
            const fallback = item && item.fallback !== undefined ? item.fallback : '-'
            return `${name}: @param=${declared}, params.get=${fallback}`
          })
          .join('; ')
        const key = 'indicatorIde.quality.PARAM_DEFAULT_MISMATCH'
        const msg = this.$t(key, { details })
        return msg === key ? `Parameter default mismatch${details ? `: ${details}` : ''}` : msg
      }
      const key = `indicatorIde.quality.${h.code}`
      const msg = this.$t(key, h.params || {})
      return msg === key ? String(h.code) : msg
    },
    async requestCodeQualityHints (code) {
      const c = (code != null ? String(code) : '').trim()
      if (!c) {
        return []
      }
      const res = await request({
        url: '/api/indicator/codeQualityHints',
        method: 'post',
        data: { code: c }
      })
      if (res && res.code === 1 && res.data && Array.isArray(res.data.hints)) {
        return res.data.hints
      }
      throw new Error((res && res.msg) || 'Code quality check failed')
    },
    async fetchCodeQualityHints (code) {
      const c = (code != null ? String(code) : '').trim()
      if (!c) {
        this.codeQualityHints = []
        return
      }
      this.codeQualityLoading = true
      try {
        this.codeQualityHints = await this.requestCodeQualityHints(c)
      } catch (e) {
        this.codeQualityHints = []
      } finally {
        this.codeQualityLoading = false
      }
    },
    async ensureCodeQualityBeforePublish (code, options = {}) {
      const c = (code != null ? String(code) : '').trim()
      if (!c) {
        this.codeQualityHints = [{ severity: 'error', code: 'EMPTY_CODE', params: {} }]
        this.codeDrawerVisible = true
        this.codePanelExpanded = true
        this.$message.error(this.$t('indicatorIde.publishQualityBlockedWithReason', { reason: this.formatQualityHint(this.codeQualityHints[0]) }))
        return false
      }
      this.codeQualityLoading = true
      try {
        this.codeQualityHints = await this.requestCodeQualityHints(c)
      } catch (e) {
        this.$message.error(this.$t('indicatorIde.publishQualityCheckFailed') + (e && e.message ? `: ${e.message}` : ''))
        return false
      } finally {
        this.codeQualityLoading = false
      }
      const blockers = (this.codeQualityHints || []).filter(h => {
        const severity = String((h && h.severity) || '').toLowerCase()
        return severity === 'error' || severity === 'fatal'
      })
      if (blockers.length) {
        this.codeDrawerVisible = true
        this.codePanelExpanded = true
        const reason = this.formatQualityHint(blockers[0])
        this.$message.error(reason
          ? this.$t('indicatorIde.publishQualityBlockedWithReason', { reason })
          : this.$t('indicatorIde.publishQualityBlocked'))
        return false
      }
      if (!options.silentSuccess) {
        this.$message.success(this.$t('indicatorIde.publishQualityPassed'))
      }
      return true
    },
    async runCodeQualityCheck () {
      const code = this.cmInstance ? (this.cmInstance.getValue() || '') : (this.currentCode || '')
      await this.fetchCodeQualityHints(code)
      if (!this.codeQualityHints.length) {
        this.$message.success(this.$t('indicatorIde.codeQualityAllGood'))
      }
    },
    cleanMarkdownCodeBlocks (code) {
      if (!code || typeof code !== 'string') return code
      let c = code.trim()
      if (!/```/.test(c)) return c
      c = c.replace(/^```[\w]*\s*\n?/i, '')
      if (c.startsWith('```')) c = c.replace(/^```\s*\n?/g, '')
      if (c.endsWith('```')) c = c.replace(/\n?```\s*$/g, '')
      c = c.replace(/^\s*```[\w]*\s*$/gm, '')
      c = c.replace(/^\s*```\s*$/gm, '')
      c = c.replace(/\n{3,}/g, '\n\n')
      return c.trim()
    },

    syncTradeUiFromStrategyCode () {
      // Runtime trade settings are owned by the backtest/live panels, not code annotations.
    },

    // ===== AI Optimize =====
    async handleAIOptimize () {
      this.$message.info(this.$t('indicatorIde.indicatorBacktestRemoved'))
    },

    // ===== Quick Trade =====
    isQuickTradeMarketSupported () {
      return ['Crypto', 'USStock'].includes(this.market)
    },
    toggleQuickTradeDrawer () {
      if (!this.quickTradeDrawerVisible && !this.isQuickTradeMarketSupported()) {
        this.$message.warning(this.$t('quickTrade.unsupportedMarket'))
        return
      }
      if (!this.quickTradeDrawerVisible) {
        this.qtSymbol = this.symbol || ''
        this.qtSide = ''
        this.qtPrice = 0
      }
      this.quickTradeDrawerVisible = !this.quickTradeDrawerVisible
    },
    closeQuickTradeDrawer () {
      this.quickTradeDrawerVisible = false
    },
    openQuickTrade () {
      if (!this.isQuickTradeMarketSupported()) {
        this.$message.warning(this.$t('quickTrade.unsupportedMarket'))
        return
      }
      this.qtSymbol = this.symbol || ''
      const trades = (this.result && this.result.trades) || []
      const latestTrade = trades.length ? trades[trades.length - 1] : null
      this.qtPrice = latestTrade && latestTrade.price ? Number(latestTrade.price) : 0
      this.qtSide = ''
      this.quickTradeDrawerVisible = true
    },
    onQuickTradeSuccess () {
      this.$message.success(this.$t('quickTrade.orderSuccess'))
    },
    handleQuickTradeSymbolChange (newSymbol) {
      if (newSymbol) {
        this.qtSymbol = newSymbol
      }
    },
    buildNewIndicatorStarterCode () {
      const label = moment().format('YYYY-MM-DD HH:mm')
      return (
        `my_indicator_name = "New Indicator ${label}"\n` +
        'my_indicator_description = "Chart-only indicator. Convert it to a script strategy before backtesting or live trading."\n\n' +
        '# @param fast_period int 10 Fast EMA period\n' +
        '# @param slow_period int 30 Slow EMA period\n\n' +
        'df = df.copy()\n' +
        'fast_period = int(params.get(\'fast_period\', 10))\n' +
        'slow_period = int(params.get(\'slow_period\', 30))\n\n' +
        'ema_fast = df[\'close\'].ewm(span=fast_period, adjust=False).mean()\n' +
        'ema_slow = df[\'close\'].ewm(span=slow_period, adjust=False).mean()\n\n' +
        'golden = (ema_fast > ema_slow) & (ema_fast.shift(1) <= ema_slow.shift(1))\n' +
        'death = (ema_fast < ema_slow) & (ema_fast.shift(1) >= ema_slow.shift(1))\n' +
        'buy_marks = [df[\'low\'].iloc[i] * 0.995 if bool(golden.fillna(False).iloc[i]) else None for i in range(len(df))]\n' +
        'sell_marks = [df[\'high\'].iloc[i] * 1.005 if bool(death.fillna(False).iloc[i]) else None for i in range(len(df))]\n\n' +
        'output = {\n' +
        '  \'name\': my_indicator_name,\n' +
        '  \'plots\': [\n' +
        '    {\'name\': \'EMA Fast\', \'data\': ema_fast.fillna(0).tolist(), \'color\': \'#52c41a\', \'overlay\': True},\n' +
        '    {\'name\': \'EMA Slow\', \'data\': ema_slow.fillna(0).tolist(), \'color\': \'#1890ff\', \'overlay\': True}\n' +
        '  ],\n' +
        '  \'signals\': [\n' +
        '    {\'type\': \'buy\', \'text\': \'Golden\', \'data\': buy_marks, \'color\': \'#52c41a\'},\n' +
        '    {\'type\': \'sell\', \'text\': \'Death\', \'data\': sell_marks, \'color\': \'#ff4d4f\'}\n' +
        '  ],\n' +
        '  \'layers\': []\n' +
        '}\n'
      )
    },
    async handleCreateIndicator () {
      if (!this.userId) {
        this.$message.error(this.$t('dashboard.indicator.error.pleaseLogin'))
        return
      }
      const proceed = () => this._createIndicatorInIde()
      if (this.codeDirty) {
        Modal.confirm({
          title: this.$t('indicatorIde.newIndicatorUnsavedTitle'),
          content: this.$t('indicatorIde.newIndicatorUnsavedContent'),
          okText: this.$t('indicatorIde.newIndicatorConfirmOk'),
          cancelText: this.$t('indicatorIde.newIndicatorConfirmCancel'),
          getContainer: () => this.resolveIdeFullscreenMountNode() || document.body,
          onOk: proceed
        })
      } else {
        await proceed()
      }
    },
    async _createIndicatorInIde () {
      const code = this.buildNewIndicatorStarterCode()
      this.creatingIndicator = true
      try {
        const res = await request({
          url: '/api/indicator/saveIndicator',
          method: 'post',
          data: {
            userid: this.userId,
            id: 0,
            code
          }
        })
        if (res && res.code === 1) {
          await this.loadIndicators()
          const newId = (res.data && res.data.id) || null
          let targetId = newId
          if (!targetId && this.indicators.length) {
            targetId = this.indicators.reduce((maxId, item) => Math.max(maxId, Number(item.id) || 0), 0)
          }
          if (targetId) {
            const tid = Number(targetId)
            if (!this.chartVisibleIndicatorIds.includes(tid)) {
              this.chartVisibleIndicatorIds = [...this.chartVisibleIndicatorIds, tid]
            }
            this.selectedIndicatorId = targetId
            this.currentCode = code
            this.codeDirty = false
            if (this.cmInstance) {
              this.cmInstance.setValue(code)
              this.cmInstance.refresh()
            }
            this.syncSelectedIndicatorToChart(code)
            this.syncTradeUiFromStrategyCode(code, { silent: true })
            const ind = this.indicators.find(i => i.id === targetId)
            if (ind) ind.code = code
            this.$message.success(this.$t('indicatorIde.newIndicatorCreated'))
          } else {
            this.$message.error(this.$t('indicatorIde.newIndicatorFailed'))
          }
        } else {
          this.$message.error((res && res.msg) || this.$t('indicatorIde.newIndicatorFailed'))
        }
      } catch (e) {
        this.$message.error(this.$t('indicatorIde.newIndicatorFailed') + ': ' + (e.message || ''))
      } finally {
        this.creatingIndicator = false
      }
    },
    async handlePublishIndicator () {
      if (!this.selectedIndicatorObj) return
      if (this.selectedIndicatorIsPurchased) {
        this.$message.warning(this.$t('indicatorIde.publishBlockedPurchased'))
        return
      }
      if (this.selectedIndicatorCodeHidden) {
        this.$message.warning(this.$t('indicatorIde.saveBlockedHiddenCode'))
        return
      }
      const indicator = this.selectedIndicatorObj || {}
      const code = this.cmInstance ? this.cmInstance.getValue() : (this.currentCode || indicator.code || '')
      if (!indicator.publish_to_community) {
        const qualityOk = await this.ensureCodeQualityBeforePublish(code)
        if (!qualityOk) return
      }
      if (this.codeDirty) {
        await this.saveIndicator()
      }
      const name = this.resolveIndicatorNameForSave(indicator, code)
      this.publishIndicator = { ...indicator, name, code }
      this.publishPricingType = indicator.pricing_type || 'free'
      this.publishPrice = indicator.price || 10
      this.publishDescription = indicator.description || ''
      this.publishVipFree = !!indicator.vip_free
      this.publishCodeHidden = !!indicator.is_encrypted
      this.showPublishModal = true
    },
    buildIndicatorToStrategyPrompt () {
      const indicator = this.selectedIndicatorObj || {}
      const codeHidden = this.selectedIndicatorCodeHidden
      const code = codeHidden ? '' : String(this.currentCode || indicator.code || '').trim()
      const target = [this.market, this.symbol].filter(Boolean).join(':') || this.symbol || ''
      const description = String(indicator.description || '').trim()
      const params = this.parseIndicatorParamRaw(code || '')
      const paramText = Object.keys(params || {}).length
        ? JSON.stringify(params, null, 2)
        : ''
      const lines = [
        `请把当前 QuantDinger 指标转写成可回测、可实盘的 Python ScriptStrategy 策略。`,
        target ? `目标标的：${target}` : '',
        `指标名称：${indicator.name || '未命名指标'}`,
        description ? `指标说明：${description}` : '',
        '',
        '边界规则：',
        '- 生成策略代码，不要生成图表指标代码。',
        '- 标的、投入金额、交易类型、杠杆倍数、交易方向由策略页/回测页/实盘页表单配置，代码里不要硬编码。',
        '- 手续费、滑点、资金费率等属于回测系统配置，代码里不要硬编码。',
        '- K线周期、入场、出场、止盈、止损、移动止盈、加仓/减仓、仓位管理由策略代码自己清晰实现。',
        '- 使用 QuantDinger ScriptStrategy 风格，明确 open_long/open_short、add/reduce、close、风控和日志。',
        '- 如果原指标只提供视觉信号，请把视觉信号转成明确的交易条件，并解释保守默认值。',
        '',
        paramText ? `指标参数：\n${paramText}` : '',
        code
          ? `指标源码：\n\`\`\`python\n${code}\n\`\`\``
          : '指标源码不可见：请只根据指标名称、说明和可见图表行为做保守转写，不要尝试还原隐藏源码。'
      ]
      return lines.filter(Boolean).join('\n')
    },
    buildIndicatorToStrategyContext () {
      const indicator = this.selectedIndicatorObj || {}
      const code = String(this.cmInstance ? this.cmInstance.getValue() : (this.currentCode || indicator.code || '')).trim()
      const params = this.parseIndicatorParamRaw(code || '')
      return {
        indicatorId: indicator.id || this.selectedIndicatorId || '',
        name: this.resolveIndicatorNameForSave(indicator, code),
        description: String(indicator.description || '').trim(),
        code,
        params,
        market: this.market || '',
        symbol: this.symbol || '',
        exchange_id: this.market === 'Crypto' ? this.cryptoExchangeId : '',
        market_type: this.market === 'Crypto' ? this.cryptoMarketType : 'spot',
        instrument_id: this.currentInstrumentId || '',
        timeframe: this.timeframe || '',
        codeHidden: !!this.selectedIndicatorCodeHidden
      }
    },
    handleCreateStrategyFromIndicator () {
      const indicator = this.selectedIndicatorObj
      if (!indicator) {
        this.$message.warning(this.$t('indicatorIde.selectIndicatorFirst') || 'Please select an indicator first.')
        return
      }
      if (this.selectedIndicatorCodeHidden) {
        this.$message.warning(this.$t('indicatorIde.aiConvertHiddenBlocked'))
        return
      }
      const context = this.buildIndicatorToStrategyContext()
      if (!context.code) {
        this.$message.warning(this.$t('indicatorIde.codeRequired') || 'Please write indicator code first.')
        return
      }
      const storageKey = `qd_indicator_to_strategy_${Date.now()}`
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(context))
      } catch (_) {}
      this.$router.push({
        path: '/strategy-ide',
        query: {
          tab: 'script',
          convert: 'indicator',
          convert_key: storageKey,
          market: this.market || '',
          symbol: this.symbol || '',
          exchange_id: this.market === 'Crypto' ? this.cryptoExchangeId : '',
          market_type: this.market === 'Crypto' ? this.cryptoMarketType : 'spot',
          timeframe: this.timeframe || '',
          source_indicator_id: String(indicator.id || '')
        }
      })
    },
    async handleConfirmPublish () {
      if (!this.userId || !this.publishIndicator) return
      const code = this.cmInstance ? this.cmInstance.getValue() : (this.currentCode || this.publishIndicator.code || '')
      const name = this.resolveIndicatorNameForSave(this.publishIndicator, code)
      this.publishing = true
      try {
        const qualityOk = await this.ensureCodeQualityBeforePublish(code, { silentSuccess: true })
        if (!qualityOk) return
        const res = await request({
          url: '/api/indicator/saveIndicator',
          method: 'post',
          data: {
            userid: this.userId,
            id: this.publishIndicator.id,
            code,
            name,
            description: this.publishDescription,
            publishToCommunity: true,
            pricingType: this.publishPricingType,
            price: this.publishPricingType === 'paid' ? this.publishPrice : 0,
            vipFree: this.publishPricingType === 'paid' ? this.publishVipFree : false,
            codeHidden: this.publishCodeHidden
          }
        })
        if (res && res.code === 1) {
          this.$message.success(this.$t('dashboard.indicator.publish.success'))
          const ind = this.indicators.find(i => Number(i.id) === Number(this.publishIndicator.id))
          if (ind) {
            ind.name = name
            ind.code = code
            ind.description = this.publishDescription
            ind.pricing_type = this.publishPricingType
            ind.price = this.publishPricingType === 'paid' ? this.publishPrice : 0
            ind.vip_free = this.publishPricingType === 'paid' ? this.publishVipFree : false
            ind.is_encrypted = this.publishCodeHidden ? 1 : 0
          }
          this.showPublishModal = false
          this.publishIndicator = null
          await this.loadIndicators()
        } else {
          this.$message.error((res && res.msg) || this.$t('dashboard.indicator.publish.failed'))
        }
      } catch (error) {
        this.$message.error(this.$t('dashboard.indicator.publish.failed') + ': ' + (error.message || ''))
      } finally {
        this.publishing = false
      }
    },
    async handleUnpublish () {
      if (!this.userId || !this.publishIndicator) return
      this.unpublishing = true
      try {
        const res = await request({
          url: '/api/indicator/saveIndicator',
          method: 'post',
          data: {
            userid: this.userId,
            id: this.publishIndicator.id,
            code: this.currentCode || this.publishIndicator.code,
            name: this.publishIndicator.name,
            description: this.publishIndicator.description,
            publishToCommunity: false,
            pricingType: 'free',
            price: 0,
            vipFree: false
          }
        })
        if (res && res.code === 1) {
          this.$message.success(this.$t('dashboard.indicator.publish.unpublishSuccess'))
          this.showPublishModal = false
          this.publishIndicator = null
          await this.loadIndicators()
        } else {
          this.$message.error((res && res.msg) || this.$t('dashboard.indicator.publish.unpublishFailed'))
        }
      } catch (error) {
        this.$message.error(this.$t('dashboard.indicator.publish.unpublishFailed'))
      } finally {
        this.unpublishing = false
      }
    },

    // ===== Equity chart =====
    renderEquityChart () {
      const r = this.result
      if (!r || !r.equityCurve || !r.equityCurve.length) return
      const dom = this.$refs.eqChart
      if (!dom) return
      if (this.eqChartInstance) this.eqChartInstance.dispose()
      this.eqChartInstance = echarts.init(dom)
      const dk = this.isDarkTheme
      const data = r.equityCurve
      const benchmarkData = Array.isArray(r.benchmarkCurve) ? r.benchmarkCurve : []
      const showBenchmark = benchmarkData.length > 1
      const isPositive = data.length > 1 && (data[data.length - 1].value || 0) >= (data[0].value || 0)
      const strategyLineColor = isPositive ? '#52c41a' : '#f5222d'
      const themeAccent = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#1677ff'
      const benchmarkLineColor = themeAccent
      const strategyName = this.$t('indicatorIde.strategyEquity')
      const benchmarkName = this.$t('indicatorIde.spotBenchmark')
      this.eqChartInstance.setOption({
        backgroundColor: 'transparent',
        color: showBenchmark ? [strategyLineColor, benchmarkLineColor] : [strategyLineColor],
        legend: showBenchmark
          ? {
              top: 0,
              right: 12,
              icon: 'roundRect',
              itemWidth: 18,
              itemHeight: 8,
              textStyle: { color: dk ? 'rgba(255,255,255,0.65)' : '#64748b', fontSize: 11 },
              data: [
                { name: strategyName, icon: 'roundRect', itemStyle: { color: strategyLineColor } },
                { name: benchmarkName, icon: 'roundRect', itemStyle: { color: benchmarkLineColor } }
              ]
            }
          : undefined,
        tooltip: {
          trigger: 'axis',
          backgroundColor: dk ? '#1f1f1f' : '#fff',
          borderColor: dk ? '#434343' : '#ddd',
          textStyle: { color: dk ? 'rgba(255,255,255,0.85)' : '#333', fontSize: 12 }
        },
        grid: { left: 60, right: 20, top: showBenchmark ? 34 : 15, bottom: 25 },
        xAxis: {
          type: 'category',
          data: data.map(d => d.time || ''),
          axisLabel: { color: dk ? 'rgba(255,255,255,0.35)' : '#999', fontSize: 10 },
          axisLine: { lineStyle: { color: dk ? '#303030' : '#e0e0e0' } }
        },
        yAxis: {
          type: 'value',
          axisLabel: {
            color: dk ? 'rgba(255,255,255,0.35)' : '#999',
            fontSize: 11,
            formatter: v => '$' + (v / 1000).toFixed(1) + 'k'
          },
          splitLine: { lineStyle: { color: dk ? 'rgba(255,255,255,0.06)' : '#f0f0f0', type: 'dashed' } }
        },
        series: [
          {
            name: strategyName,
            type: 'line',
            data: data.map(d => d.value || 0),
            smooth: 0.3,
            showSymbol: false,
            itemStyle: { color: strategyLineColor },
            lineStyle: { width: 2, color: strategyLineColor },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: isPositive ? 'rgba(82,196,26,0.2)' : 'rgba(245,34,45,0.2)' },
                { offset: 1, color: 'rgba(0,0,0,0)' }
              ])
            }
          },
          ...(showBenchmark
? [{
            name: benchmarkName,
            type: 'line',
            data: data.map((_, idx) => {
              const point = benchmarkData[idx]
              return point ? Number(point.value || 0) : null
            }),
            smooth: 0.25,
            showSymbol: false,
            connectNulls: true,
            itemStyle: { color: benchmarkLineColor },
            lineStyle: { width: 2, color: benchmarkLineColor, type: 'dashed' }
          }]
: [])
        ]
      })
      this._onResize = () => { if (this.eqChartInstance) this.eqChartInstance.resize() }
      window.addEventListener('resize', this._onResize)
    },

    // ===== Experiment analytics charts =====
    disposeExperimentCharts () {
      if (this.experimentScatterInstance) {
        try {
          this.experimentScatterInstance.dispose()
        } catch (_) {
          // Ignore chart disposal errors.
        }
        this.experimentScatterInstance = null
      }
      if (this.experimentRadarInstance) {
        try {
          this.experimentRadarInstance.dispose()
        } catch (_) {
          // Ignore chart disposal errors.
        }
        this.experimentRadarInstance = null
      }
      if (this.experimentConvergenceInstance) {
        try {
          this.experimentConvergenceInstance.dispose()
        } catch (_) {
          // Ignore chart disposal errors.
        }
        this.experimentConvergenceInstance = null
      }
      if (this.experimentOosMatrixInstance) {
        try {
          this.experimentOosMatrixInstance.dispose()
        } catch (_) {
          // Ignore chart disposal errors.
        }
        this.experimentOosMatrixInstance = null
      }
      if (this.experimentParamSensitivityInstance) {
        try {
          this.experimentParamSensitivityInstance.dispose()
        } catch (_) {
          // Ignore chart disposal errors.
        }
        this.experimentParamSensitivityInstance = null
      }
      if (this.experimentChartsResizeHandler) {
        window.removeEventListener('resize', this.experimentChartsResizeHandler)
        this.experimentChartsResizeHandler = null
      }
    },
    renderExperimentCharts () {
      if (!this.experimentHasAnalytics) {
        this.disposeExperimentCharts()
        return
      }
      this.$nextTick(() => {
        this.renderExperimentConvergence()
        this.renderExperimentOosMatrix()
        this.renderExperimentParamSensitivity()
        this.renderExperimentScatter()
        this.renderExperimentRadar()
        window.setTimeout(() => {
          if (this.experimentConvergenceInstance) this.experimentConvergenceInstance.resize()
          if (this.experimentOosMatrixInstance) this.experimentOosMatrixInstance.resize()
          if (this.experimentParamSensitivityInstance) this.experimentParamSensitivityInstance.resize()
          if (this.experimentScatterInstance) this.experimentScatterInstance.resize()
          if (this.experimentRadarInstance) this.experimentRadarInstance.resize()
        }, 80)
        if (!this.experimentChartsResizeHandler) {
          this.experimentChartsResizeHandler = () => {
            if (this.experimentConvergenceInstance) this.experimentConvergenceInstance.resize()
            if (this.experimentOosMatrixInstance) this.experimentOosMatrixInstance.resize()
            if (this.experimentParamSensitivityInstance) this.experimentParamSensitivityInstance.resize()
            if (this.experimentScatterInstance) this.experimentScatterInstance.resize()
            if (this.experimentRadarInstance) this.experimentRadarInstance.resize()
          }
          window.addEventListener('resize', this.experimentChartsResizeHandler)
        }
      })
    },
    setExperimentEmptyChart (instance, text) {
      if (!instance) return
      const dk = this.isDarkTheme
      instance.clear()
      instance.setOption({
        backgroundColor: 'transparent',
        title: {
          text,
          left: 'center',
          top: 'middle',
          textStyle: { color: dk ? 'rgba(255,255,255,0.45)' : '#999', fontSize: 12, fontWeight: 'normal' }
        }
      })
    },
    getExperimentTooltipPosition (point, params, dom, rect, size) {
      const viewWidth = (size && size.viewSize && size.viewSize[0]) || 0
      const viewHeight = (size && size.viewSize && size.viewSize[1]) || 0
      const boxWidth = (size && size.contentSize && size.contentSize[0]) || 220
      const boxHeight = (size && size.contentSize && size.contentSize[1]) || 120
      let x = point[0] + 14
      let y = point[1] - boxHeight / 2
      if (viewWidth && x + boxWidth + 8 > viewWidth) x = point[0] - boxWidth - 14
      if (x < 8) x = 8
      if (y < 8) y = 8
      if (viewHeight && y + boxHeight + 8 > viewHeight) y = Math.max(8, viewHeight - boxHeight - 8)
      return [x, y]
    },
    renderExperimentConvergence () {
      const dom = this.$refs.experimentConvergenceChart
      if (!dom) return
      if (this.experimentConvergenceInstance) {
        try {
          this.experimentConvergenceInstance.dispose()
        } catch (_) {
          // Ignore chart disposal errors.
        }
      }
      this.experimentConvergenceInstance = echarts.init(dom)
      const dk = this.isDarkTheme
      const rows = (this.experimentConvergenceData || []).filter(r => r && r.index != null)
      if (rows.length < 2) {
        this.setExperimentEmptyChart(this.experimentConvergenceInstance, this.$t('indicatorIde.analyticsNoConvergence'))
        return
      }
      const evalScores = rows.map(r => Number(r.score || 0))
      const bestScores = rows.map(r => Number(r.bestScore || r.score || 0))
      this.experimentConvergenceInstance.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          appendToBody: true,
          confine: true,
          borderWidth: 1,
          padding: [8, 10],
          extraCssText: 'z-index:3000;max-width:260px;white-space:normal;border-radius:8px;box-shadow:0 10px 28px rgba(15,23,42,0.18);pointer-events:none;',
          position: this.getExperimentTooltipPosition,
          backgroundColor: dk ? '#1f1f1f' : '#fff',
          borderColor: dk ? '#434343' : '#ddd',
          textStyle: { color: dk ? 'rgba(255,255,255,0.88)' : '#333', fontSize: 12, lineHeight: 18 },
          formatter: (params) => {
            const idx = (params && params[0] && params[0].dataIndex) || 0
            const row = rows[idx] || {}
            return `<div style="min-width:180px;">
              <div style="font-weight:600;margin-bottom:4px;">#${row.index} ${row.name || ''}</div>
              <div>${this.$t('indicatorIde.score')}: <b>${Number(row.score || 0).toFixed(2)}</b></div>
              <div>${this.$t('indicatorIde.analyticsBestSoFar')}: <b style="color:var(--primary-color, #1890ff);">${Number(row.bestScore || 0).toFixed(2)}</b></div>
              <div>${this.$t('indicatorIde.totalReturn')}: <b>${this.fmtPct(row.totalReturn)}</b></div>
            </div>`
          }
        },
        grid: { left: 34, right: 14, top: 12, bottom: 26, containLabel: true },
        xAxis: {
          type: 'category',
          data: rows.map(r => String(r.index)),
          axisLabel: { color: dk ? 'rgba(255,255,255,0.45)' : '#999', fontSize: 10 },
          axisLine: { lineStyle: { color: dk ? '#303030' : '#e0e0e0' } }
        },
        yAxis: {
          type: 'value',
          min: 0,
          max: Math.max(100, Math.ceil(Math.max(...bestScores, ...evalScores) / 10) * 10),
          axisLabel: { color: dk ? 'rgba(255,255,255,0.45)' : '#999', fontSize: 10 },
          splitLine: { lineStyle: { color: dk ? 'rgba(255,255,255,0.06)' : '#f0f0f0', type: 'dashed' } }
        },
        series: [
          {
            name: this.$t('indicatorIde.analyticsTrialScore'),
            type: 'bar',
            data: evalScores,
            barMaxWidth: 14,
            itemStyle: { color: dk ? 'rgba(88,166,255,0.35)' : 'rgba(24,144,255,0.22)' }
          },
          {
            name: this.$t('indicatorIde.analyticsBestSoFar'),
            type: 'line',
            data: bestScores,
            smooth: 0.25,
            symbol: 'circle',
            symbolSize: 5,
            lineStyle: { color: '#13c2c2', width: 2.5 },
            itemStyle: { color: '#13c2c2' },
            areaStyle: {
              color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                { offset: 0, color: 'rgba(19,194,194,0.18)' },
                { offset: 1, color: 'rgba(19,194,194,0)' }
              ])
            }
          }
        ]
      })
    },
    renderExperimentOosMatrix () {
      const dom = this.$refs.experimentOosMatrixChart
      if (!dom) return
      if (this.experimentOosMatrixInstance) {
        try {
          this.experimentOosMatrixInstance.dispose()
        } catch (_) {
          // Ignore chart disposal errors.
        }
      }
      this.experimentOosMatrixInstance = echarts.init(dom)
      const dk = this.isDarkTheme
      const rows = this.experimentOosMatrixData || []
      if (!rows.length) {
        this.setExperimentEmptyChart(this.experimentOosMatrixInstance, this.$t('indicatorIde.analyticsNoOosMatrix'))
        return
      }
      const points = rows.map((r, idx) => {
        const isScore = Number(r.isScore || 0)
        const oosScore = Number(r.oosScore || 0)
        const degrade = r.degradation == null ? 0 : Number(r.degradation || 0)
        return {
          name: r.name,
          value: [isScore, oosScore, Math.abs(degrade)],
          symbolSize: Math.max(12, Math.min(28, 14 + Math.abs(degrade) * 18)),
          itemStyle: {
            color: r.overfit ? '#f5222d' : (degrade > 0.2 ? '#fa8c16' : '#52c41a'),
            borderColor: dk ? 'rgba(255,255,255,0.35)' : '#fff',
            borderWidth: 1.5
          },
          _meta: { idx, isScore, oosScore, degrade, isReturn: r.isReturn, oosReturn: r.oosReturn, overfit: r.overfit }
        }
      })
      const maxScore = Math.max(60, ...points.map(p => Math.max(p.value[0], p.value[1]))) + 8
      this.experimentOosMatrixInstance.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'item',
          appendToBody: true,
          confine: true,
          borderWidth: 1,
          padding: [8, 10],
          extraCssText: 'z-index:3000;max-width:260px;white-space:normal;border-radius:8px;box-shadow:0 10px 28px rgba(15,23,42,0.18);pointer-events:none;',
          position: this.getExperimentTooltipPosition,
          backgroundColor: dk ? '#1f1f1f' : '#fff',
          borderColor: dk ? '#434343' : '#ddd',
          textStyle: { color: dk ? 'rgba(255,255,255,0.88)' : '#333', fontSize: 12, lineHeight: 18 },
          formatter: (p) => {
            const m = (p.data && p.data._meta) || {}
            return `<div style="min-width:170px;">
              <div style="font-weight:600;margin-bottom:4px;">${p.data.name || ''}</div>
              <div>IS ${this.$t('indicatorIde.score')}: <b>${m.isScore.toFixed(2)}</b></div>
              <div>OOS ${this.$t('indicatorIde.score')}: <b>${m.oosScore.toFixed(2)}</b></div>
              <div>${this.$t('indicatorIde.oosDegradation')}: <b>${(m.degrade * 100).toFixed(1)}%</b></div>
              <div>IS/OOS ${this.$t('indicatorIde.totalReturn')}: <b>${this.fmtPct(m.isReturn)} / ${this.fmtPct(m.oosReturn)}</b></div>
            </div>`
          }
        },
        grid: { left: 36, right: 18, top: 12, bottom: 30, containLabel: true },
        xAxis: {
          type: 'value',
          name: 'IS',
          min: 0,
          max: Math.ceil(maxScore),
          axisLabel: { color: dk ? 'rgba(255,255,255,0.45)' : '#999', fontSize: 10 },
          splitLine: { lineStyle: { color: dk ? 'rgba(255,255,255,0.06)' : '#f0f0f0', type: 'dashed' } }
        },
        yAxis: {
          type: 'value',
          name: 'OOS',
          min: 0,
          max: Math.ceil(maxScore),
          axisLabel: { color: dk ? 'rgba(255,255,255,0.45)' : '#999', fontSize: 10 },
          splitLine: { lineStyle: { color: dk ? 'rgba(255,255,255,0.06)' : '#f0f0f0', type: 'dashed' } }
        },
        series: [
          {
            type: 'line',
            data: [[0, 0], [Math.ceil(maxScore), Math.ceil(maxScore)]],
            silent: true,
            symbol: 'none',
            lineStyle: { color: dk ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.16)', type: 'dashed' }
          },
          {
            type: 'scatter',
            data: points,
            emphasis: { itemStyle: { shadowBlur: 14, shadowColor: 'rgba(24,144,255,0.45)' } }
          }
        ]
      })
    },
    renderExperimentParamSensitivity () {
      const dom = this.$refs.experimentParamSensitivityChart
      if (!dom) return
      if (this.experimentParamSensitivityInstance) {
        try {
          this.experimentParamSensitivityInstance.dispose()
        } catch (_) {
          // Ignore chart disposal errors.
        }
      }
      this.experimentParamSensitivityInstance = echarts.init(dom)
      const dk = this.isDarkTheme
      const rows = (this.experimentParameterSensitivityData || []).slice(0, 8)
      if (!rows.length) {
        this.setExperimentEmptyChart(this.experimentParamSensitivityInstance, this.$t('indicatorIde.analyticsNoParamSensitivity'))
        return
      }
      const plottedRows = rows.slice().reverse()
      const labels = plottedRows.map(r => this.humanizeExperimentKey(r.key))
      const effects = plottedRows.map(r => Number(r.effect || 0))
      if (!effects.some(v => Math.abs(v) > 0.0001)) {
        this.setExperimentEmptyChart(this.experimentParamSensitivityInstance, this.$t('indicatorIde.analyticsNoParamSensitivity'))
        return
      }
      const themeAccent = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#1677ff'
      this.experimentParamSensitivityInstance.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'axis',
          axisPointer: { type: 'shadow' },
          appendToBody: true,
          confine: true,
          borderWidth: 1,
          padding: [8, 10],
          extraCssText: 'z-index:3000;max-width:260px;white-space:normal;border-radius:8px;box-shadow:0 10px 28px rgba(15,23,42,0.18);pointer-events:none;',
          position: this.getExperimentTooltipPosition,
          backgroundColor: dk ? '#1f1f1f' : '#fff',
          borderColor: dk ? '#434343' : '#ddd',
          textStyle: { color: dk ? 'rgba(255,255,255,0.88)' : '#333', fontSize: 12, lineHeight: 18 },
          formatter: (params) => {
            const idx = (params && params[0] && params[0].dataIndex) || 0
            const row = plottedRows[idx] || {}
            const corr = row.correlation == null ? '--' : Number(row.correlation || 0).toFixed(2)
            return `<div style="min-width:190px;">
              <div style="font-weight:600;margin-bottom:4px;">${this.humanizeExperimentKey(row.key)}</div>
              <div>${this.$t('indicatorIde.analyticsScoreSpread')}: <b>${Number(row.effect || 0).toFixed(2)}</b></div>
              <div>${this.$t('indicatorIde.analyticsBestValue')}: <b>${this.formatExperimentOverrideValue(row.key, row.bestValue)}</b> (${Number(row.bestAvgScore || 0).toFixed(2)})</div>
              <div>${this.$t('indicatorIde.analyticsWorstValue')}: <b>${this.formatExperimentOverrideValue(row.key, row.worstValue)}</b> (${Number(row.worstAvgScore || 0).toFixed(2)})</div>
              <div>${this.$t('indicatorIde.analyticsCorrelation')}: <b>${corr}</b></div>
            </div>`
          }
        },
        grid: { left: 92, right: 22, top: 12, bottom: 24, containLabel: true },
        xAxis: {
          type: 'value',
          axisLabel: { color: dk ? 'rgba(255,255,255,0.45)' : '#999', fontSize: 10 },
          splitLine: { lineStyle: { color: dk ? 'rgba(255,255,255,0.06)' : '#f0f0f0', type: 'dashed' } }
        },
        yAxis: {
          type: 'category',
          data: labels,
          axisLabel: { color: dk ? 'rgba(255,255,255,0.7)' : '#555', fontSize: 10, width: 96, overflow: 'truncate' },
          axisLine: { show: false },
          axisTick: { show: false }
        },
        series: [{
          type: 'bar',
          data: effects,
          barMaxWidth: 16,
          itemStyle: {
            color: new echarts.graphic.LinearGradient(1, 0, 0, 0, [
              { offset: 0, color: themeAccent },
              { offset: 1, color: '#13c2c2' }
            ]),
            borderRadius: [0, 6, 6, 0]
          },
          label: {
            show: true,
            position: 'right',
            color: dk ? 'rgba(255,255,255,0.65)' : '#666',
            fontSize: 10,
            formatter: ({ value }) => Number(value || 0).toFixed(1)
          }
        }]
      })
    },
    renderExperimentScatter () {
      const dom = this.$refs.experimentScatterChart
      if (!dom) return
      if (this.experimentScatterInstance) {
        try {
          this.experimentScatterInstance.dispose()
        } catch (_) {
          // Ignore chart disposal errors.
        }
      }
      this.experimentScatterInstance = echarts.init(dom)
      const dk = this.isDarkTheme
      const list = this.experimentAnalyticsCandidates
      if (!list.length) {
        this.setExperimentEmptyChart(this.experimentScatterInstance, this.$t('indicatorIde.analyticsNoScatter'))
        return
      }
      const bestName = (this.experimentBest && this.experimentBest.name) || ''
      const selectedName = (this.experimentSelectedCandidate && this.experimentSelectedCandidate.name) || ''
      const themeAccent = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#1677ff'
      const themeRing = getComputedStyle(document.documentElement).getPropertyValue('--primary-color-ring').trim() || 'rgba(24, 144, 255, 0.35)'
      const points = list.map((c, idx) => {
        const r = c.result || {}
        const s = c.score || {}
        const ret = Number(r.totalReturn || 0)
        const dd = Math.abs(Number(r.maxDrawdown || 0))
        const score = Number(s.overallScore || 0)
        const isBest = c.name === bestName
        const isSel = c.name === selectedName && !isBest
        return {
          value: [dd, ret, score],
          name: c.name,
          itemStyle: {
            color: isBest ? '#f5a623' : (isSel ? themeAccent : (dk ? 'rgba(82, 196, 26, 0.7)' : 'rgba(82, 196, 26, 0.85)')),
            borderColor: isBest ? '#ffd591' : (isSel ? themeRing : 'transparent'),
            borderWidth: (isBest || isSel) ? 2 : 0,
            shadowBlur: isBest ? 12 : 0,
            shadowColor: 'rgba(245,166,35,0.45)'
          },
          symbolSize: Math.max(10, Math.min(34, 10 + score / 4)),
          _meta: { idx, isBest, isSel, ret, dd, score, sharpe: Number(r.sharpeRatio || 0), trades: Number(r.totalTrades || 0) }
        }
      })
      const xVals = points.map(p => p.value[0])
      const yVals = points.map(p => p.value[1])
      const xMax = Math.max(1, ...xVals) * 1.1
      const yMin = Math.min(0, ...yVals) * 1.15
      const yMax = Math.max(...yVals, 0) * 1.15 || 1
      this.experimentScatterInstance.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'item',
          appendToBody: true,
          confine: true,
          borderWidth: 1,
          padding: [8, 10],
          extraCssText: 'z-index:3000;max-width:260px;white-space:normal;border-radius:8px;box-shadow:0 10px 28px rgba(15,23,42,0.18);pointer-events:none;',
          position: this.getExperimentTooltipPosition,
          backgroundColor: dk ? '#1f1f1f' : '#fff',
          borderColor: dk ? '#434343' : '#ddd',
          textStyle: { color: dk ? 'rgba(255,255,255,0.88)' : '#333', fontSize: 12, lineHeight: 18 },
          formatter: (p) => {
            const m = (p.data && p.data._meta) || {}
            const translatedBestTag = m.isBest ? ` <span style="color:#f5a623;font-weight:600;">&#9733; ${this.$t('indicatorIde.analyticsRadarBest')}</span>` : ''
            return `<div style="min-width:160px;">
              <div style="font-weight:600; margin-bottom:4px;">${p.data.name}${translatedBestTag}</div>
              <div>${this.$t('indicatorIde.totalReturn')}: <b style="color:${m.ret >= 0 ? '#52c41a' : '#f5222d'};">${m.ret.toFixed(2)}%</b></div>
              <div>${this.$t('indicatorIde.maxDrawdown')}: <b style="color:#f5222d;">${m.dd.toFixed(2)}%</b></div>
              <div>${this.$t('indicatorIde.sharpeRatio')}: <b>${m.sharpe.toFixed(2)}</b></div>
              <div>${this.$t('indicatorIde.score')}: <b style="color:var(--primary-color, #1890ff);">${m.score.toFixed(1)}</b></div>
            </div>`
          }
        },
        grid: { left: 44, right: 18, top: 14, bottom: 36, containLabel: true },
        xAxis: {
          type: 'value',
          name: this.$t('indicatorIde.maxDrawdown') + ' (%)',
          nameLocation: 'middle',
          nameGap: 30,
          nameTextStyle: { color: dk ? 'rgba(255,255,255,0.55)' : '#666', fontSize: 11 },
          min: 0,
          max: Math.ceil(xMax),
          axisLabel: { color: dk ? 'rgba(255,255,255,0.45)' : '#999', fontSize: 10, formatter: v => v.toFixed(0) + '%' },
          axisLine: { lineStyle: { color: dk ? '#303030' : '#e0e0e0' } },
          splitLine: { lineStyle: { color: dk ? 'rgba(255,255,255,0.06)' : '#f0f0f0', type: 'dashed' } }
        },
        yAxis: {
          type: 'value',
          name: this.$t('indicatorIde.totalReturn') + ' (%)',
          nameLocation: 'middle',
          nameGap: 46,
          nameTextStyle: { color: dk ? 'rgba(255,255,255,0.55)' : '#666', fontSize: 11 },
          min: Math.floor(yMin),
          max: Math.ceil(yMax),
          axisLabel: { color: dk ? 'rgba(255,255,255,0.45)' : '#999', fontSize: 10, formatter: v => v.toFixed(0) + '%' },
          axisLine: { lineStyle: { color: dk ? '#303030' : '#e0e0e0' } },
          splitLine: { lineStyle: { color: dk ? 'rgba(255,255,255,0.06)' : '#f0f0f0', type: 'dashed' } }
        },
        series: [
          {
            type: 'scatter',
            data: points,
            emphasis: {
              focus: 'series',
              itemStyle: { shadowBlur: 16, shadowColor: 'rgba(24,144,255,0.55)' }
            },
            markLine: {
              silent: true,
              symbol: 'none',
              lineStyle: { color: dk ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.12)', type: 'dashed' },
              data: [{ yAxis: 0 }]
            }
          }
        ]
      })
      this.experimentScatterInstance.off('click')
      this.experimentScatterInstance.on('click', (p) => {
        const c = list[(p.data && p.data._meta && p.data._meta.idx) || 0]
        if (c) this.selectExperimentCandidate(c)
      })
    },
    renderExperimentRadar () {
      const dom = this.$refs.experimentRadarChart
      if (!dom) return
      if (this.experimentRadarInstance) {
        try {
          this.experimentRadarInstance.dispose()
        } catch (_) {
          // Ignore chart disposal errors.
        }
      }
      this.experimentRadarInstance = echarts.init(dom)
      const dk = this.isDarkTheme
      const comps = this.experimentBestComponents
      if (!comps || !comps.length) {
        this.setExperimentEmptyChart(this.experimentRadarInstance, this.$t('indicatorIde.analyticsNoRadar'))
        return
      }
      const themeAccent = getComputedStyle(document.documentElement).getPropertyValue('--primary-color').trim() || '#1677ff'
      const indicator = comps.map(c => ({ name: c.label, max: 100 }))
      const bestVals = comps.map(c => Math.max(0, Math.min(100, Number(c.value) || 0)))
      const list = this.experimentAnalyticsCandidates
      const avgVals = comps.map(c => {
        if (!list.length) return 0
        let sum = 0; let n = 0
        list.forEach(item => {
          const v = item && item.score && item.score.components && item.score.components[c.key]
          if (typeof v === 'number') { sum += v; n += 1 }
        })
        return n ? Math.max(0, Math.min(100, sum / n)) : 0
      })
      this.experimentRadarInstance.setOption({
        backgroundColor: 'transparent',
        tooltip: {
          trigger: 'item',
          appendToBody: true,
          confine: true,
          borderWidth: 1,
          padding: [8, 10],
          extraCssText: 'z-index:3000;max-width:260px;white-space:normal;border-radius:8px;box-shadow:0 10px 28px rgba(15,23,42,0.18);pointer-events:none;',
          position: this.getExperimentTooltipPosition,
          backgroundColor: dk ? '#1f1f1f' : '#fff',
          borderColor: dk ? '#434343' : '#ddd',
          textStyle: { color: dk ? 'rgba(255,255,255,0.88)' : '#333', fontSize: 12, lineHeight: 18 }
        },
        legend: {
          bottom: 4,
          itemWidth: 10,
          itemHeight: 10,
          textStyle: { color: dk ? 'rgba(255,255,255,0.65)' : '#666', fontSize: 11 },
          data: [this.$t('indicatorIde.analyticsRadarBest'), this.$t('indicatorIde.analyticsRadarAvg')]
        },
        radar: {
          indicator,
          radius: '66%',
          center: ['50%', '48%'],
          splitNumber: 4,
          axisName: {
            color: dk ? 'rgba(255,255,255,0.7)' : '#555',
            fontSize: 11,
            backgroundColor: 'transparent',
            padding: [2, 4]
          },
          splitLine: { lineStyle: { color: dk ? 'rgba(255,255,255,0.1)' : '#e8e8e8' } },
          splitArea: {
            areaStyle: {
              color: dk
                ? ['rgba(255,255,255,0.02)', 'rgba(255,255,255,0.04)']
                : ['#fafbfc', '#f5f7fa']
            }
          },
          axisLine: { lineStyle: { color: dk ? 'rgba(255,255,255,0.12)' : '#dcdfe6' } }
        },
        series: [{
          type: 'radar',
          symbol: 'circle',
          symbolSize: 5,
          emphasis: { focus: 'self' },
          data: [
            {
              name: this.$t('indicatorIde.analyticsRadarBest'),
              value: bestVals,
              lineStyle: { color: '#f5a623', width: 2 },
              itemStyle: { color: '#f5a623' },
              areaStyle: { color: 'rgba(245,166,35,0.22)' }
            },
            {
              name: this.$t('indicatorIde.analyticsRadarAvg'),
              value: avgVals,
              lineStyle: { color: themeAccent, width: 1.5, type: 'dashed' },
              itemStyle: { color: themeAccent },
              areaStyle: { color: 'rgba(24,144,255,0.12)' }
            }
          ]
        }]
      })
    },

    // ===== Watchlist =====
    watchlistContextKey (item) {
      return marketContextKey(item)
    },
    filterWatchlistOption (input, option) {
      const val = (option.componentOptions.propsData.value || '').toLowerCase()
      if (val === '__add__') return true
      return val.includes(input.toLowerCase())
    },
    handleWatchlistChange (val) {
      if (val === '__add__') {
        this.showAddModal = true
        this.$nextTick(() => { this.selectedWatchlistKey = undefined })
        return
      }
      if (val) {
        const row = (this.watchlist || []).find(
          w => w && w.market && w.symbol && this.watchlistContextKey(w) === val
        )
        if (row) {
          this.market = String(row.market)
          this.symbol = String(row.symbol)
        } else {
          const i = val.indexOf(':')
          if (i > 0) {
            this.market = val.slice(0, i)
            this.symbol = val.slice(i + 1)
          }
        }
        this.qtSymbol = this.symbol
      } else {
        this.market = ''
        this.symbol = ''
      }
      this.persistIdeSelectionPreference()
    },
    getMarketColor (m) {
      const colors = { Crypto: 'orange', USStock: 'blue', CNStock: 'magenta', HKStock: 'red', Forex: 'green', Futures: 'purple' }
      return colors[m] || 'default'
    },
    marketLabel (m) {
      if (!m) return ''
      const key = 'dashboard.indicator.market.' + m
      const t = this.$t(key)
      return t !== key ? t : m
    },
    handleCryptoExchangeChange (value) {
      this.cryptoExchangeId = this.normalizeCryptoExchange(value)
      this.currentInstrumentId = ''
      this.persistCryptoMarketSource()
    },
    handleCryptoMarketTypeChange (value) {
      this.cryptoMarketType = normalizeMarketType(value, 'Crypto')
      this.currentInstrumentId = ''
      this.persistCryptoMarketSource()
    },

    normalizeCryptoExchange (value) {
      const normalized = normalizeExchangeId(value)
      return CRYPTO_EXCHANGE_IDS.includes(normalized) ? normalized : 'binance'
    },
    async initializeCryptoMarketSource () {
      try {
        const raw = storage.get(cryptoMarketSourceStorageKey(this.userId))
        const cached = typeof raw === 'string' ? JSON.parse(raw) : raw
        if (cached && typeof cached === 'object') {
          const exchangeId = normalizeExchangeId(cached.exchangeId || cached.exchange_id)
          const marketType = normalizeMarketType(cached.marketType || cached.market_type, 'Crypto')
          if (CRYPTO_EXCHANGE_IDS.includes(exchangeId) && ['spot', 'swap'].includes(marketType)) {
            this.cryptoExchangeId = exchangeId
            this.cryptoMarketType = marketType
            return
          }
        }
      } catch (_) { /* ignore corrupt preference */ }

      let defaultExchange = 'binance'
      try {
        const res = await getPublicSettingsConfig()
        const value = res && res.code === 1 && res.data && res.data.ccxt_default_exchange
        defaultExchange = this.normalizeCryptoExchange(value)
      } catch (_) { /* keep fallback */ }
      this.cryptoExchangeId = defaultExchange
      this.cryptoMarketType = 'spot'
    },
    persistCryptoMarketSource () {
      if (!this.userId) return
      const exchangeId = this.normalizeCryptoExchange(this.cryptoExchangeId)
      const marketType = normalizeMarketType(this.cryptoMarketType, 'Crypto')
      this.cryptoExchangeId = exchangeId
      this.cryptoMarketType = marketType
      try {
        storage.set(cryptoMarketSourceStorageKey(this.userId), JSON.stringify({
          exchangeId,
          marketType
        }))
      } catch (_) { /* ignore quota */ }
    },

    // ===== Add symbol modal =====
    onAddMarketTabChange () {
      this.addSearchKeyword = ''
      this.addSearchResults = []
      this.addSelectedItem = null
      this.addSearched = false
    },
    onAddSourceChange () {
      this.persistCryptoMarketSource()
      this.addSearchResults = []
      this.addSelectedItem = null
      this.addSearched = false
      if (this.addSearchKeyword) this.doAddSearch()
    },
    onAddSearchInput () {
      clearTimeout(this.addSearchTimer)
      if (!this.addSearchKeyword) { this.addSearchResults = []; return }
      this.addSearchTimer = setTimeout(() => this.doAddSearch(), 400)
    },
    async doAddSearch () {
      if (!this.addSearchKeyword) return
      this.addSearching = true
      try {
        const res = await searchSymbols({
          market: this.addMarketTab,
          keyword: this.addSearchKeyword,
          limit: 20,
          exchange_id: this.addMarketTab === 'Crypto' ? this.cryptoExchangeId : undefined,
          market_type: this.addMarketTab === 'Crypto' ? this.cryptoMarketType : undefined
        })
        if (res && res.data && Array.isArray(res.data)) {
          this.addSearchResults = res.data
        } else {
          this.addSearchResults = []
        }
        this.addSearched = true
        if (this.addSearchResults.length === 0) {
          this.addSelectedItem = { market: this.addMarketTab, symbol: this.addSearchKeyword.trim().toUpperCase(), name: '' }
        }
      } catch (_) {
        this.addSelectedItem = { market: this.addMarketTab, symbol: this.addSearchKeyword.trim().toUpperCase(), name: '' }
      } finally {
        this.addSearching = false
      }
    },
    async handleAddStock () {
      const item = this.addSelectedItem
      if (!item || !item.symbol) {
        this.$message.warning(this.$t('backtest-center.config.symbolRequired'))
        return
      }
      this.addingStock = true
      try {
        const mkt = item.market || this.addMarketTab
        await addWatchlist({
          userid: this.userId,
          market: mkt,
          symbol: item.symbol,
          name: item.name || '',
          exchange_id: item.exchange_id || (mkt === 'Crypto' ? this.cryptoExchangeId : ''),
          market_type: item.market_type || (mkt === 'Crypto' ? this.cryptoMarketType : 'spot'),
          instrument_id: item.instrument_id || '',
          settle_currency: item.settle_currency || ''
        })
        this.$message.success(this.$t('backtest-center.config.addSuccess'))
        await this.loadWatchlist()
        this.selectedWatchlistKey = marketContextKey({
          market: mkt,
          symbol: item.symbol
        })
        this.market = mkt
        this.symbol = item.symbol
        this.showAddModal = false
      } catch (e) {
        this.$message.error(e.message || 'Failed')
      } finally {
        this.addingStock = false
      }
    },

    applyDatePreset (p) {
      this.datePreset = p.key
      this.startDate = moment().subtract(p.days, 'days')
      this.endDate = moment()
    },

    applyRunRecordToBacktestForm (run) {
      if (!run) return
      if (run.initial_capital != null && !isNaN(Number(run.initial_capital))) {
        this.initialCapital = Number(run.initial_capital)
      }
      if (run.commission != null && !isNaN(Number(run.commission))) {
        this.commission = Number(run.commission) * 100
      }
      if (run.slippage != null && !isNaN(Number(run.slippage))) {
        this.slippage = Number(run.slippage) * 100
      }
      const execCfg = (run.config_snapshot && run.config_snapshot.executionConfig) || {}
      const ea = (run.result && run.result.executionAssumptions) || {}
      if (typeof execCfg.strictMode === 'boolean') {
        this.strictMode = execCfg.strictMode
      } else if (typeof ea.strictMode === 'boolean') {
        this.strictMode = ea.strictMode
      }
      if (run.leverage != null) this.leverage = Math.max(1, parseInt(run.leverage, 10) || 1)
      if (run.trade_direction) this.tradeDirection = String(run.trade_direction)
    },

    applyBacktestRunToIde (run) {
      if (!run) return
      this.showHistoryDrawer = false

      const snap = run.config_snapshot || {}
      const runIndId = run.indicator_id != null ? Number(run.indicator_id) : (snap.indicatorId != null ? Number(snap.indicatorId) : null)
      if (runIndId && Number(this.selectedIndicatorId) !== runIndId) {
        const exists = this.indicators.some(i => Number(i.id) === runIndId)
        if (exists) {
          if (!this.chartVisibleIndicatorIds.some(x => Number(x) === runIndId)) {
            this.chartVisibleIndicatorIds = [...this.chartVisibleIndicatorIds, runIndId]
          }
          this.selectedIndicatorId = runIndId
          this.onIndicatorChange(runIndId)
          this.$message.info(this.$t('indicatorIde.historyRunSwitchedIndicator', { id: runIndId }))
        } else {
          this.$message.warning(this.$t('indicatorIde.historyRunIndicatorMissing', { id: runIndId }))
        }
      }

      if (run.market) this.market = String(run.market)
      if (run.symbol) {
        this.symbol = String(run.symbol)
        this.qtSymbol = String(run.symbol)
      }
      if (this.market && this.symbol) {
        this.selectedWatchlistKey = `${this.market}:${this.symbol}`
      }
      if (run.timeframe) this.timeframe = String(run.timeframe)

      const sd = run.start_date
      const ed = run.end_date
      if (sd) this.startDate = moment(String(sd).slice(0, 10), 'YYYY-MM-DD')
      if (ed) this.endDate = moment(String(ed).slice(0, 10), 'YYYY-MM-DD')

      this.applyRunRecordToBacktestForm(run)

      const res = run.result || {}
      const ok = run.status === 'success' && res && typeof res === 'object' && Object.keys(res).length > 0
      if (ok) {
        this.result = res
        this.hasResult = true
        this.backtestRunId = run.id
        this.stampBacktestMarkerContext()
      } else if (run.status === 'failed') {
        this.result = { ...(typeof res === 'object' ? res : {}), errorMessage: run.error_message || run.errorMessage }
        this.hasResult = true
        this.backtestRunId = run.id
      } else {
        this.result = typeof res === 'object' ? res : {}
        this.hasResult = Object.keys(this.result).length > 0
        this.backtestRunId = run.id
      }

      this.$nextTick(() => {
        setTimeout(() => {
          if (this.hasResult) {
            this.renderEquityChart()
            this.renderBacktestSignals()
          }
        }, 200)
      })
      this.ensureChartReady()
      this.$message.success(this.$t('indicatorIde.historyRunLoaded'))
    },

    // ===== Backtest paired trade: exit reason tag (TP/SL/liquidation/signal) =====
    backtestMarkerActionKey (typeRaw) {
      const ty = String(typeRaw || '').toLowerCase().replace(/-/g, '_')
      if (ty === 'liquidation') return 'liquidation'
      if (ty === 'open_long' || ty === 'buy') return 'openLong'
      if (ty === 'add_long') return 'addLong'
      if (ty === 'reduce_long') return 'reduceLong'
      if (ty === 'close_long_stop') return 'closeLongStop'
      if (ty === 'close_long_profit') return 'closeLongProfit'
      if (ty === 'close_long_trailing') return 'closeLongTrailing'
      if (ty === 'close_long') return 'closeLong'
      if (ty === 'open_short' || ty === 'sell') return 'openShort'
      if (ty === 'add_short') return 'addShort'
      if (ty === 'reduce_short') return 'reduceShort'
      if (ty === 'close_short_stop') return 'closeShortStop'
      if (ty === 'close_short_profit') return 'closeShortProfit'
      if (ty === 'close_short_trailing') return 'closeShortTrailing'
      if (ty === 'close_short') return 'closeShort'
      return 'other'
    },
    backtestTradeMarkerMeta (trade) {
      let ty = String((trade && trade.type) || '').toLowerCase().replace(/-/g, '_')
      const reason = String((trade && trade.reason) || '').toLowerCase()
      if (reason === 'reduce_position' && ty === 'close_long') ty = 'reduce_long'
      if (reason === 'reduce_position' && ty === 'close_short') ty = 'reduce_short'
      const actionKey = this.backtestMarkerActionKey(ty)
      const fillLabel = this.$t(`indicatorIde.backtestMarkerAction.${actionKey}`)
      const signalPrefix = this.$t('indicatorIde.backtestMarkerSignalPrefix')
      const signalLabel = `${signalPrefix}${fillLabel}`
      const isBuy = ty.startsWith('open_long') || ty === 'buy' || ty === 'add_long' || ty === 'close_short' || ty === 'reduce_short'
      const isSell = ty.startsWith('open_short') || ty === 'sell' || ty === 'add_short' ||
        ty.startsWith('close_long') || ty === 'reduce_long' || ty === 'liquidation'
      const colorByAction = {
        openLong: '#00C853',
        addLong: '#00E676',
        reduceLong: '#AB47BC',
        closeLong: '#EF5350',
        closeLongStop: '#FF6D00',
        closeLongProfit: '#29B6F6',
        closeLongTrailing: '#7E57C2',
        openShort: '#FF5252',
        addShort: '#FF8A80',
        reduceShort: '#AB47BC',
        closeShort: '#00C853',
        closeShortStop: '#FF6D00',
        closeShortProfit: '#29B6F6',
        closeShortTrailing: '#7E57C2',
        liquidation: '#D50000',
        other: '#78909C'
      }
      const shortLabelByAction = {
        openLong: 'OL',
        addLong: '+OL',
        reduceLong: '-OL',
        closeLong: 'XL',
        closeLongStop: 'SL',
        closeLongProfit: 'TP',
        closeLongTrailing: 'TR',
        openShort: 'OS',
        addShort: '+OS',
        reduceShort: '-OS',
        closeShort: 'XS',
        closeShortStop: 'SL',
        closeShortProfit: 'TP',
        closeShortTrailing: 'TR',
        liquidation: 'LQ',
        other: 'X'
      }
      const shortFillLabel = shortLabelByAction[actionKey] || (isBuy ? 'L' : 'S')
      return {
        isBuy: isBuy || !isSell,
        fillLabel,
        signalLabel,
        shortFillLabel,
        shortSignalLabel: `${shortFillLabel}?`,
        color: colorByAction[actionKey] || (isBuy ? '#00E676' : '#FF5252')
      }
    },
    exitTagLabel (record) {
      const ty = String(record.closeType || '').toLowerCase().replace(/-/g, '_')
      const reason = String(record.closeReason || '').toLowerCase()

      if (ty === 'liquidation' || reason.includes('liquidat')) {
        return this.$t('indicatorIde.exitTagLiquidation')
      }
      if (ty.includes('trailing') || reason.includes('trailing')) {
        return this.$t('indicatorIde.exitTagTrailing')
      }
      if (ty.endsWith('_stop') || reason.includes('server_stop_loss') || reason.includes('stop_loss')) {
        return this.$t('indicatorIde.exitTagStopLoss')
      }
      if (ty.includes('profit') || reason.includes('server_take_profit') || reason.includes('take_profit')) {
        return this.$t('indicatorIde.exitTagTakeProfit')
      }
      if (ty.startsWith('reduce_')) {
        return this.$t('indicatorIde.exitTagReduce')
      }
      if (ty.startsWith('add_')) {
        return this.$t('indicatorIde.exitTagAdd')
      }
      if (ty === 'close_long' || ty === 'close_short' || ty === 'sell' || ty === 'buy' || reason.includes('signal_exit')) {
        return this.$t('indicatorIde.exitTagSignal')
      }
      if (record.closeReason) {
        return String(record.closeReason)
      }
      return this.$t('indicatorIde.exitTagOther')
    },
    exitTagColor (record) {
      const ty = String(record.closeType || '').toLowerCase()
      const reason = String(record.closeReason || '').toLowerCase()
      if (ty === 'liquidation' || reason.includes('liquidat')) return 'red'
      if (ty.endsWith('_stop') || reason.includes('server_stop_loss') || reason.includes('stop_loss')) return 'volcano'
      if (ty.includes('profit') || reason.includes('server_take_profit') || reason.includes('take_profit')) return 'green'
      if (ty.includes('trailing') || reason.includes('trailing')) return 'blue'
      if (ty.startsWith('reduce_')) return 'purple'
      if (ty.startsWith('add_')) return 'cyan'
      if (ty === 'close_long' || ty === 'close_short' || ty === 'sell' || ty === 'buy') return 'geekblue'
      return 'default'
    },

    // ===== Format helpers =====
    fmtPct (v) {
      if (v == null || isNaN(v)) return '--'
      return (v >= 0 ? '+' : '') + Number(v).toFixed(2) + '%'
    },
    fmtMoney (v) {
      if (v == null || isNaN(v)) return '$0.00'
      const abs = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      return (v >= 0 ? '' : '-') + '$' + abs
    },
    fmtMoney2 (v) {
      if (v == null || isNaN(v)) return '0.00'
      return Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    },
    tradeTimeValue (value) {
      if (value == null || value === '') return 0
      if (value instanceof Date) return value.getTime()
      if (typeof value === 'number') return value
      const normalized = String(value).includes('T') ? String(value) : String(value).replace(' ', 'T')
      const parsed = new Date(normalized).getTime()
      return Number.isFinite(parsed) ? parsed : 0
    },
    fmtElapsed (s) {
      return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m ${s % 60}s`
    },
    fmtPrice (v) {
      if (v == null || isNaN(v)) return '--'
      return Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
    }
  },
  watch: {
    activeIndicators: {
      deep: true,
      handler () {
        this.schedulePersistIdeUiState()
      }
    },
    market () {
      this.invalidateBacktestMarkersOnContextChange()
      this.schedulePersistIdeUiState()
    },
    cryptoExchangeId () {
      this.invalidateBacktestMarkersOnContextChange()
      this.ensureChartReady()
      this.schedulePersistIdeUiState()
    },
    cryptoMarketType () {
      this.invalidateBacktestMarkersOnContextChange()
      this.ensureChartReady()
      this.schedulePersistIdeUiState()
    },
    selectedIndicatorId () {
      this.invalidateBacktestMarkersOnContextChange()
      this.schedulePersistIdeUiState()
    },
    '$route.query.indicator_id' () {
      this.applyIndicatorRouteSelection()
    },
    '$route.query.indicatorId' () {
      this.applyIndicatorRouteSelection()
    },
    chartVisibleIndicatorIds: {
      deep: true,
      handler () {
        this.schedulePersistIdeUiState()
      }
    },
    selectedWatchlistKey () {
      this.schedulePersistIdeUiState()
    },
    strictMode () {
      this.schedulePersistIdeUiState()
    },
    commission () {
      this.schedulePersistIdeUiState()
    },
    slippage () {
      this.schedulePersistIdeUiState()
    },
    userId () {
      this.loadStrategyDirectivesAlertDismissed()
    },
    selectedIndicatorIsPurchased () {
      this.$nextTick(() => this.applyCodeMirrorReadOnly())
    },
    selectedIndicatorCodeHidden () {
      this.$nextTick(() => this.applyCodeMirrorReadOnly())
    },
    isDarkTheme () {
      if (this.cmInstance) this.cmInstance.setOption('theme', this.isDarkTheme ? 'monokai' : 'eclipse')
      if (this.hasResult) this.$nextTick(() => this.renderEquityChart())
      if (this.experimentHasAnalytics) this.renderExperimentCharts()
    },
    '$i18n.locale' () {
      this.$nextTick(() => {
        if (this.hasResult) this.renderEquityChart()
        if (this.experimentHasAnalytics) this.renderExperimentCharts()
        this.ensureChartReady()
      })
    },
    experimentHasAnalytics (val) {
      if (val) this.renderExperimentCharts()
      else this.disposeExperimentCharts()
    },
    experimentResult () {
      if (this.experimentHasAnalytics) this.renderExperimentCharts()
    },
    experimentSelectedCandidate () {
      if (this.experimentHasAnalytics && this.experimentScatterInstance) {
        this.$nextTick(() => this.renderExperimentScatter())
      }
    },
    codeDrawerVisible () {
      this.$nextTick(() => {
        if (this.cmInstance) this.cmInstance.refresh()
        if (this.eqChartInstance) this.eqChartInstance.resize()
        this.ensureChartReady()
      })
    },
    quickTradeDrawerVisible () {
      this.$nextTick(() => this.ensureChartReady())
    },
    paramsPanelExpanded () {
      this.$nextTick(() => this.ensureChartReady())
    },
    symbol () {
      this.qtSymbol = this.symbol
      this.invalidateBacktestMarkersOnContextChange()
      this.ensureChartReady()
      this.schedulePersistIdeUiState()
    },
    timeframe () {
      this.invalidateBacktestMarkersOnContextChange()
      this.ensureChartReady()
      this.schedulePersistIdeUiState()
    },
    aiGenerating (val) {
      if (val) {
        this.ideAiTipIndex = 0
        this.ideAiTipTimer = setInterval(() => {
          this.ideAiTipIndex = (this.ideAiTipIndex + 1) % this.ideAiTips.length
        }, 3000)
      } else {
        if (this.ideAiTipTimer) {
          clearInterval(this.ideAiTipTimer)
          this.ideAiTipTimer = null
        }
      }
    }
  }
}
</script>

<style lang="less" scoped>
@primary-color: #1890ff;

.indicator-ide {
  display: flex;
  flex-direction: column;
  min-height: var(--ide-shell-height, calc(100vh - 64px));
  height: auto;
  width: 100%;
  padding: 0;
  background: #fff;
  box-sizing: border-box;
}

.chart-panel-toolbar-top-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}
.chart-panel-action-btn {
  height: 28px !important;
  padding: 0 12px !important;
  border-radius: 8px !important;
  display: inline-flex !important;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}
.chart-panel-convert-strategy-btn {
  min-width: 92px;
}
.chart-panel-signal-alert-btn {
  min-width: 78px;
  border-color: color-mix(in srgb, var(--primary-color, #1890ff) 36%, #d9d9d9) !important;
  color: var(--primary-color, @primary-color) !important;
  background: color-mix(in srgb, var(--primary-color, #1890ff) 9%, transparent) !important;
  em {
    min-width: 16px;
    height: 16px;
    line-height: 16px;
    border-radius: 999px;
    font-style: normal;
    font-size: 10px;
    text-align: center;
    color: #fff;
    background: var(--primary-color, @primary-color);
  }
  &:hover,
  &:focus {
    border-color: var(--primary-color, @primary-color) !important;
    color: var(--primary-color, @primary-color) !important;
  }
}
.chart-panel-qt-btn {
  border-radius: 8px !important;
  font-weight: 600;
  display: inline-flex !important;
  align-items: center;
  gap: 4px;
  height: 28px !important;
  padding: 0 10px !important;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.06);
}
.chart-panel-qt-label {
  font-size: 12px;
  letter-spacing: 0.02em;
  max-width: 88px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media (max-width: 1180px) {
  .chart-panel-action-btn {
    width: 28px;
    min-width: 28px !important;
    padding: 0 !important;
    justify-content: center;

    span {
      display: none;
    }
  }
  .chart-panel-convert-strategy-btn {
    min-width: 28px;
  }
  .chart-panel-signal-alert-btn {
    min-width: 28px;
    em {
      position: absolute;
      top: -5px;
      right: -5px;
      min-width: 14px;
      height: 14px;
      line-height: 14px;
      font-size: 9px;
    }
  }
}
.ide-toolbar-group {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 4px;
  min-width: 0;
  padding: 6px 10px 8px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(0, 0, 0, 0.05);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}
.ide-toolbar-label {
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #64748b;
  line-height: 1;
  white-space: nowrap;
}
.ide-toolbar-select {
  min-width: 0;
  ::v-deep .ant-select-selection {
    border-radius: 8px;
    border-color: #e2e8f0;
    box-shadow: none;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  ::v-deep .ant-select-selection:hover,
  ::v-deep .ant-select-focused .ant-select-selection {
    border-color: @primary-color;
    box-shadow: 0 0 0 2px rgba(24, 144, 255, 0.12);
  }
}
.ide-toolbar-select--watchlist {
  width: 220px;
  max-width: 36vw;
}
.ide-market-context-controls {
  display: flex;
  gap: 6px;
}
.ide-toolbar-select--exchange {
  width: 112px;
}
.ide-toolbar-select--market-type {
  width: 104px;
}
.ide-toolbar-select--indicator {
  width: 220px;
  max-width: 42vw;
}
.ide-indicator-multiselect-trigger {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  .ide-indicator-trigger-text {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-right: 6px;
    font-size: 12px;
    text-align: left;
  }
}
.ide-toolbar-group--indicator {
  flex-wrap: wrap;
  align-items: center;
  row-gap: 6px;
}
.ide-toolbar-group--params {
  min-width: 96px;
}
.ide-param-trigger {
  height: 30px !important;
  border-radius: 8px !important;
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 700;
  em {
    min-width: 18px;
    height: 18px;
    line-height: 18px;
    border-radius: 999px;
    font-style: normal;
    font-size: 11px;
    text-align: center;
    color: inherit;
    background: rgba(255, 255, 255, 0.22);
  }
  &.ant-btn-default em {
    color: var(--primary-color, @primary-color);
    background: color-mix(in srgb, var(--primary-color, #1890ff) 12%, transparent);
  }
}
.ide-signal-alert-modal {
  .ant-tabs-bar {
    margin-bottom: 14px;
    border-bottom-color: #edf0f5;
  }
  .ant-tabs-tab {
    font-weight: 700;
  }
  .ant-tabs-tab-active {
    color: var(--primary-color, @primary-color);
  }
  .ant-tabs-ink-bar {
    background: var(--primary-color, @primary-color);
  }
}
.signal-alert-current-card,
.signal-alert-block,
.signal-alert-field,
.signal-alert-task-card {
  border: 1px solid #e8edf3;
  border-radius: 10px;
  background: #fff;
}
.signal-alert-current-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  padding: 14px 16px;
  background:
    radial-gradient(circle at 10% 0%, color-mix(in srgb, var(--primary-color, #1890ff) 18%, transparent), transparent 38%),
    linear-gradient(135deg, color-mix(in srgb, var(--primary-color, #1890ff) 8%, #fff), #fff);
  span {
    display: block;
    margin-bottom: 4px;
    color: #7a8596;
    font-size: 12px;
  }
  strong {
    display: block;
    max-width: 560px;
    overflow: hidden;
    color: #111827;
    font-size: 15px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ant-tag {
    display: inline-flex;
    align-items: center;
    height: 28px;
    margin: 0;
    border-radius: 7px;
    font-weight: 700;
  }
}
.signal-alert-form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 170px;
  gap: 10px;
  margin-bottom: 12px;
}
.signal-alert-field {
  min-width: 0;
  padding: 10px 12px;
  label {
    display: block;
    margin-bottom: 7px;
    color: #475569;
    font-size: 12px;
    font-weight: 700;
  }
  .ant-select {
    width: 100%;
  }
}
.signal-alert-block {
  margin-bottom: 12px;
  padding: 13px 14px;
}
.signal-alert-block__head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 10px;
  strong {
    color: #111827;
    font-size: 14px;
  }
  span {
    color: #7a8596;
    font-size: 12px;
    line-height: 1.5;
    text-align: right;
  }
}
.signal-alert-check-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px 12px;
  width: 100%;
  .ant-checkbox-wrapper {
    margin: 0;
    overflow: hidden;
    color: #334155;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
.signal-alert-channel-row {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 18px;
  .ant-checkbox-wrapper {
    margin: 0;
    color: #334155;
    font-weight: 700;
  }
}
.signal-alert-target-row {
  margin-top: 10px;
}
.signal-alert-target-row--split {
  display: grid;
  grid-template-columns: 1fr 1.4fr;
  gap: 8px;
}
.signal-alert-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 2px;
}
.signal-alert-task-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 440px;
  overflow: auto;
  padding-right: 4px;
}
.signal-alert-task-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 13px 14px;
  transition: border-color 0.18s ease, background 0.18s ease;
  &.paused {
    opacity: 0.78;
  }
}
.signal-alert-task-card__main {
  min-width: 0;
}
.signal-alert-task-card__title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  strong {
    max-width: 420px;
    overflow: hidden;
    color: #111827;
    font-size: 14px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
.signal-alert-task-card__meta,
.signal-alert-task-card__chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  color: #7a8596;
  font-size: 12px;
}
.signal-alert-task-card__meta {
  margin-bottom: 6px;
  .danger {
    color: #ef4444;
  }
}
.signal-alert-task-card__actions {
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 6px;
}

@media (max-width: 860px) {
  .signal-alert-form-grid,
  .signal-alert-target-row--split {
    grid-template-columns: 1fr;
  }
  .signal-alert-check-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .signal-alert-task-card {
    align-items: stretch;
    flex-direction: column;
  }
}

.ide-signal-alert-modal-wrap.ide-modal-wrap--dark,
body.dark .ide-signal-alert-modal-wrap {
  .ant-modal-content {
    background: #141414;
    box-shadow: 0 18px 56px rgba(0, 0, 0, 0.62);
  }
  .ant-modal-header {
    background: #1f1f1f;
    border-bottom-color: #303030;
  }
  .ant-modal-title,
  .ant-modal-close {
    color: rgba(255, 255, 255, 0.88);
  }
  .ant-modal-body {
    background: #141414;
    color: rgba(255, 255, 255, 0.82);
  }
  .ide-signal-alert-modal {
    .ant-tabs-bar {
      border-bottom-color: #303030;
    }
    .ant-tabs-tab {
      color: rgba(255, 255, 255, 0.58);
    }
    .ant-tabs-tab-active {
      color: var(--primary-color, #ff4d4f);
    }
  }
  .signal-alert-current-card {
    background:
      radial-gradient(circle at 12% 0%, color-mix(in srgb, var(--primary-color, #ff4d4f) 24%, transparent), transparent 40%),
      linear-gradient(135deg, color-mix(in srgb, var(--primary-color, #ff4d4f) 12%, #202020), #171717);
    border-color: color-mix(in srgb, var(--primary-color, #ff4d4f) 30%, #303030);
    span {
      color: rgba(255, 255, 255, 0.5);
    }
    strong {
      color: rgba(255, 255, 255, 0.92);
    }
  }
  .signal-alert-block,
  .signal-alert-field,
  .signal-alert-task-card {
    background: #1f1f1f;
    border-color: #303030;
  }
  .signal-alert-field label,
  .signal-alert-block__head strong,
  .signal-alert-task-card__title strong {
    color: rgba(255, 255, 255, 0.88);
  }
  .signal-alert-block__head span,
  .signal-alert-task-card__meta,
  .signal-alert-task-card__chips {
    color: rgba(255, 255, 255, 0.5);
  }
  .signal-alert-check-grid .ant-checkbox-wrapper,
  .signal-alert-channel-row .ant-checkbox-wrapper {
    color: rgba(255, 255, 255, 0.76);
  }
  .ant-input,
  .ant-select-selection {
    background: #151515;
    border-color: #383838;
    color: rgba(255, 255, 255, 0.86);
  }
  .ant-select-arrow,
  .ant-select-selection__placeholder,
  .ant-input::placeholder {
    color: rgba(255, 255, 255, 0.4);
  }
  .ant-btn:not(.ant-btn-primary):not(.ant-btn-dangerous) {
    background: #1f1f1f;
    border-color: #3a3a3a;
    color: rgba(255, 255, 255, 0.72);
    &:hover,
    &:focus {
      border-color: var(--primary-color, #ff4d4f);
      color: var(--primary-color, #ff4d4f);
    }
  }
  .ant-empty-description {
    color: rgba(255, 255, 255, 0.45);
  }
}
.ide-purchased-hint {
  margin: 0 0 10px 0;
  border-radius: 8px;
}
.ide-watchlist-add-row {
  text-align: center;
  color: @primary-color;
  font-weight: 500;
}
.tf-group {
  flex-shrink: 0;
  ::v-deep .ant-radio-button-wrapper {
    padding: 0 9px;
    font-size: 12px;
    height: 30px;
    line-height: 28px;
    border-color: #e2e8f0;
    color: #475569;
  }
  ::v-deep .ant-radio-button-wrapper:first-child {
    border-radius: 8px 0 0 8px;
  }
  ::v-deep .ant-radio-button-wrapper:last-child {
    border-radius: 0 8px 8px 0;
  }
}
.ide-tf-seg {
  ::v-deep .ant-radio-button-wrapper-checked:not(.ant-radio-button-wrapper-disabled) {
    background: linear-gradient(135deg, var(--primary-color, #1890ff) 0%, var(--primary-color-active, #096dd9) 100%);
    border-color: var(--primary-color-active, #096dd9) !important;
    color: #fff !important;
    box-shadow: 0 1px 4px rgba(24, 144, 255, 0.35);
    z-index: 1;
  }
}

// ===== Main =====
.ide-main { display: flex; flex: 1 1 auto; overflow: visible; min-height: 0; align-items: stretch; }

.ide-code-rail {
  flex: 0 0 34px;
  width: 34px;
  min-width: 34px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  padding: 12px 0;
  gap: 8px;
  cursor: pointer;
  user-select: none;
  border-right: 1px solid #e2e8f0;
  background: linear-gradient(180deg, #f8fafc 0%, #eef2f7 100%);
  color: #475569;
  transition: background 0.2s, color 0.2s, box-shadow 0.2s;
  box-shadow: 2px 0 8px rgba(15, 23, 42, 0.04);
  &:hover {
    background: linear-gradient(180deg, color-mix(in srgb, var(--primary-color, #1890ff) 10%, #fff) 0%, color-mix(in srgb, var(--primary-color, #1890ff) 16%, #fff) 100%);
    color: var(--primary-color, @primary-color);
    box-shadow: 2px 0 12px color-mix(in srgb, var(--primary-color, #1890ff) 14%, transparent);
  }
  &:focus {
    outline: none;
    box-shadow: inset 0 0 0 2px var(--primary-color-ring, color-mix(in srgb, var(--primary-color, #1890ff) 35%, transparent));
  }
  &.is-open {
    background: linear-gradient(180deg, color-mix(in srgb, var(--primary-color, #1890ff) 12%, #fff) 0%, color-mix(in srgb, var(--primary-color, #1890ff) 20%, #fff) 100%);
    color: var(--primary-color, @primary-color);
    box-shadow: inset -2px 0 0 var(--primary-color, @primary-color);
  }
}
.ide-code-rail__icon {
  font-size: 16px;
  color: var(--primary-color, @primary-color);
}
.ide-code-rail__arrow {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-size: 12px;
  color: #64748b;
  background: rgba(15, 23, 42, 0.05);
  transition: color 0.2s, background 0.2s, transform 0.2s;
}
.ide-code-rail:hover .ide-code-rail__arrow,
.ide-code-rail.is-open .ide-code-rail__arrow {
  color: var(--primary-color, @primary-color);
  background: color-mix(in srgb, var(--primary-color, #1890ff) 14%, transparent);
}
.ide-code-rail__label {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.12em;
  line-height: 1.2;
  max-height: 120px;
  overflow: hidden;
}

.ide-left {
  width: 30%;
  min-width: 280px;
  max-width: 400px;
  height: calc(var(--ide-shell-height, calc(100vh - 64px)) - 8px);
  max-height: calc(var(--ide-shell-height, calc(100vh - 64px)) - 8px);
  display: flex;
  flex-direction: column;
  min-height: 0;
  border-right: 1px solid #eee;
  overflow: hidden;
  flex-shrink: 0;
  background: #fcfcfd;
  position: sticky;
  top: 0;
  align-self: flex-start;
  &.ide-panel--fullscreen {
    width: 100% !important;
    min-width: 0 !important;
    max-width: none !important;
    height: 100vh !important;
    max-height: 100vh !important;
    position: relative;
    top: auto;
    align-self: stretch;
    border-right: none;
  }
}

// ===== Code Panel =====
.code-panel {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  &.collapsed { flex: 0 0 auto; }
}
.code-panel-body { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
.code-editor-wrapper { flex: 1; position: relative; overflow: hidden; display: flex; flex-direction: column; }
.code-hidden-mask {
  position: absolute;
  inset: 0;
  z-index: 9;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 28px;
  text-align: center;
  color: rgba(15, 23, 42, 0.76);
  background:
    radial-gradient(circle at 50% 38%, color-mix(in srgb, var(--primary-color, #52c41a) 14%, transparent), transparent 34%),
    linear-gradient(135deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.92)),
    repeating-linear-gradient(45deg, rgba(15, 23, 42, 0.035) 0 8px, rgba(15, 23, 42, 0.01) 8px 16px);
  backdrop-filter: blur(4px);
  .anticon {
    width: 42px;
    height: 42px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    color: var(--primary-color, #52c41a);
    background: color-mix(in srgb, var(--primary-color, #52c41a) 14%, transparent);
    border: 1px solid color-mix(in srgb, var(--primary-color, #52c41a) 36%, transparent);
    box-shadow: 0 0 0 8px color-mix(in srgb, var(--primary-color, #52c41a) 6%, transparent);
    font-size: 20px;
  }
  strong {
    font-size: 15px;
    color: rgba(15, 23, 42, 0.88);
  }
  span {
    max-width: 280px;
    font-size: 12px;
    line-height: 1.7;
    color: rgba(71, 85, 105, 0.78);
  }
}

// ===== AI Loading Overlay on code editor =====
.code-ai-overlay {
  position: absolute;
  inset: 0;
  z-index: 10;
  background: rgba(255,255,255,0.82);
  backdrop-filter: blur(3px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.code-ai-overlay-inner {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--primary-color, #1890ff);
}
.code-ai-overlay-dots {
  display: flex; gap: 4px;
  .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--primary-color, #1890ff); animation: ide-dot-bounce 1.4s ease-in-out infinite; }
  .dot1 { animation-delay: 0s; }
  .dot2 { animation-delay: 0.2s; }
  .dot3 { animation-delay: 0.4s; }
}
.code-ai-overlay-tip {
  font-size: 11px;
  color: #8c8c8c;
  max-width: 220px;
  text-align: center;
  animation: tip-fade 3s ease-in-out infinite;
}
@keyframes ide-dot-bounce {
  0%, 80%, 100% { transform: scale(0.5); opacity: 0.3; }
  40% { transform: scale(1); opacity: 1; }
}
@keyframes tip-fade {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter, .fade-leave-to { opacity: 0; }

.panel-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  padding: 7px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #333;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
  user-select: none;
  transition: background 0.15s;
  &:hover { background: #f5f7fa; }
}
.panel-title__leading {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex: 0 0 auto;
  overflow: hidden;
}
.panel-title__trailing {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  justify-content: flex-end;
}
.panel-title-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 6px;
  flex: 1;
  min-width: 0;
  flex-wrap: wrap;
}
.panel-title-icon-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  flex-wrap: wrap;
  ::v-deep .ant-btn-sm {
    width: 26px;
    min-width: 26px;
    height: 26px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    font-size: 13px;
    border-color: #e0e0e0;
    &:hover { border-color: @primary-color; color: @primary-color; }
    &[disabled] { opacity: 0.35; }
  }
}
.panel-title-actions ::v-deep .ide-save-button {
  flex: 0 0 auto;
  min-width: 54px;
  height: 26px;
  padding: 0 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}
.code-version-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #64748b;
  span {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
.code-version-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.code-version-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  background: #fff;
}
.code-version-item__main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  strong { color: #0f172a; }
  span, small {
    color: #64748b;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
.code-version-item__actions {
  display: flex;
  gap: 6px;
  flex-shrink: 0;
}
.code-version-preview {
  margin-top: 16px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
  background: #0f172a;
}
.code-version-preview__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 10px;
  background: #f8fafc;
  border-bottom: 1px solid #e5e7eb;
  strong { color: #0f172a; }
}
.code-version-preview pre {
  max-height: 360px;
  margin: 0;
  padding: 12px;
  overflow: auto;
  color: #e2e8f0;
  font-size: 12px;
  line-height: 1.55;
  font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
  white-space: pre;
}
.ide-param-drawer {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-height: 100%;
}
.ide-param-drawer__hero {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border-radius: 10px;
  background:
    radial-gradient(circle at 14% 10%, color-mix(in srgb, var(--primary-color, #1890ff) 16%, transparent), transparent 34%),
    linear-gradient(135deg, color-mix(in srgb, var(--primary-color, #1890ff) 8%, #fff), #fff);
  border: 1px solid color-mix(in srgb, var(--primary-color, #1890ff) 18%, #e5e7eb);
  span {
    display: block;
    margin-bottom: 4px;
    font-size: 12px;
    color: #64748b;
  }
  strong {
    display: block;
    max-width: 260px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #111827;
  }
}
.ide-param-boundary {
  border-radius: 8px;
}
.ide-param-empty {
  margin: 32px 0;
}
.ide-param-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-bottom: 68px;
}
.ide-param-item {
  padding: 12px;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
}
.ide-param-item__head {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
  strong {
    display: block;
    max-width: 280px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: #111827;
    font-size: 13px;
  }
  code {
    display: inline-block;
    margin-top: 3px;
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 11px;
    color: var(--primary-color, @primary-color);
    background: color-mix(in srgb, var(--primary-color, #1890ff) 10%, transparent);
  }
}
.ide-param-item__desc {
  margin: 0 0 10px;
  color: #64748b;
  font-size: 12px;
  line-height: 1.5;
}
.ide-param-item__control {
  width: 100%;
}
.ide-param-item__meta {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-top: 8px;
  color: #94a3b8;
  font-size: 11px;
  b {
    color: #475569;
    font-weight: 700;
  }
}
.ide-param-drawer__footer {
  position: sticky;
  bottom: 0;
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  margin: auto -24px -24px;
  padding: 12px 24px;
  background: rgba(255, 255, 255, 0.94);
  border-top: 1px solid #e5e7eb;
  backdrop-filter: blur(10px);
}
.ide-guide-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  font-size: 11px;
  color: #8c8c8c;
  background: #f8f9fb;
  border-bottom: 1px solid #f0f0f0;
  flex-shrink: 0;
  > .anticon { color: #bfbfbf; font-size: 12px; }
}
.ide-guide-link {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-left: auto;
  padding: 1px 8px;
  font-size: 11px;
  font-weight: 500;
  color: var(--primary-color, #1890ff);
  background: rgba(24, 144, 255, 0.06);
  border: 1px solid rgba(24, 144, 255, 0.2);
  border-radius: 10px;
  text-decoration: none;
  transition: all 0.2s;
  white-space: nowrap;
  &:hover {
    color: #fff;
    background: var(--primary-color, #1890ff);
    border-color: var(--primary-color, #1890ff);
  }
}

// ===== Code Editor Scrollbar =====
.code-editor-area {
  flex: 1;
  overflow: auto;
  &::-webkit-scrollbar { width: 5px; height: 5px; }
  &::-webkit-scrollbar-thumb { background: #d0d0d0; border-radius: 3px; }
  &::-webkit-scrollbar-track { background: transparent; }
  ::v-deep .CodeMirror {
    height: 100%;
    font-size: 12px;
    font-family: 'Fira Code', 'Consolas', 'Monaco', monospace;
    line-height: 1.55;
  }
  ::v-deep .CodeMirror-vscrollbar,
  ::v-deep .CodeMirror-hscrollbar {
    &::-webkit-scrollbar { width: 5px; height: 5px; }
    &::-webkit-scrollbar-thumb { background: #c8c8c8; border-radius: 3px; }
    &::-webkit-scrollbar-track { background: transparent; }
  }
}

// ===== AI Panel =====
.ai-gen-panel { flex-shrink: 0; border-top: 1px solid #eee; }
.ai-gen-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 10px;
  font-size: 12px;
  font-weight: 600;
  color: #333;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s;
  &:hover { background: #f5f7fa; }
}
.ai-gen-body { padding: 8px 10px 10px; }
.ai-gen-body ::v-deep .ai-prompt-input textarea {
  min-height: 132px;
  line-height: 1.45;
}
.ai-helper-tip {
  margin-bottom: 6px;
  font-size: 11px;
  color: #8c8c8c;
  line-height: 1.5;
}
.ai-helper-links {
  margin-top: 6px;
  font-size: 11px;
}

.code-quality-panel {
  flex-shrink: 0;
  margin-top: 0;
  padding: 8px 10px 10px;
  border-top: 1px solid #eee;
}
.code-quality-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  margin-bottom: 6px;
}
.code-quality-title {
  font-size: 11px;
  font-weight: 600;
  color: #445066;
}
.code-quality-recheck { padding: 0 !important; height: auto !important; font-size: 11px !important; }
.code-quality-spin { display: block; margin: 8px 0; }
.code-quality-list {
  margin: 0;
  padding-left: 16px;
  font-size: 11px;
  line-height: 1.5;
  color: #595959;
}
.code-quality-list li { margin-bottom: 4px; }
.quality-hint--error { color: #cf1322; }
.quality-hint--warn { color: #d46b08; }
.quality-hint--info { color: var(--primary-color-active, #096dd9); }

.ai-debug-card {
  margin: 10px 10px 0;
  padding: 0;
  border: 1px solid #e6f4ff;
  border-radius: 10px;
  background: #fff;
  overflow: hidden;
  font-size: 12px;
}
.ai-debug-card--success { border-color: #b7eb8f; }
.ai-debug-card--warning { border-color: #ffd591; }

.ai-debug-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  background: linear-gradient(135deg, rgba(24, 144, 255, 0.06) 0%, transparent 100%);
  border-bottom: 1px solid rgba(0,0,0,0.04);
}
.ai-debug-card--success .ai-debug-card__header {
  background: linear-gradient(135deg, rgba(82, 196, 26, 0.06) 0%, transparent 100%);
}
.ai-debug-card--warning .ai-debug-card__header {
  background: linear-gradient(135deg, rgba(250, 140, 22, 0.06) 0%, transparent 100%);
}

.ai-debug-card__badge {
  width: 26px; height: 26px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 7px; flex-shrink: 0; font-size: 13px;
  background: rgba(24, 144, 255, 0.1); color: var(--primary-color, #1890ff);
}
.ai-debug-card--success .ai-debug-card__badge { background: rgba(82, 196, 26, 0.1); color: #389e0d; }
.ai-debug-card--warning .ai-debug-card__badge { background: rgba(250, 140, 22, 0.1); color: #d46b08; }

.ai-debug-card__headline {
  flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px;
}
.ai-debug-card__tag {
  font-size: 10px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;
  color: var(--primary-color, #1890ff); white-space: nowrap;
}
.ai-debug-card--success .ai-debug-card__tag { color: #389e0d; }
.ai-debug-card--warning .ai-debug-card__tag { color: #d46b08; }

.ai-debug-card__title {
  font-size: 12px; font-weight: 600; color: #262626;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.ai-debug-card__dismiss {
  flex-shrink: 0; cursor: pointer; font-size: 12px; color: #bfbfbf;
  padding: 2px; border-radius: 4px; transition: all 0.15s;
  &:hover { color: #595959; background: rgba(0,0,0,0.04); }
}

.ai-debug-card__chips {
  display: flex; flex-wrap: wrap; gap: 5px; padding: 8px 10px 0;
}
.ai-debug-chip {
  display: inline-flex; align-items: center; gap: 3px;
  padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600;
  background: rgba(24, 144, 255, 0.08); color: var(--primary-color, #1890ff);
}
.ai-debug-chip--success { background: rgba(82, 196, 26, 0.08); color: #389e0d; }
.ai-debug-chip--warning { background: rgba(250, 140, 22, 0.08); color: #d46b08; }
.ai-debug-chip--info { background: rgba(24, 144, 255, 0.08); color: var(--primary-color, #1890ff); }

.ai-debug-card__body {
  padding: 8px 10px 0; line-height: 1.6; color: #595959;
}

.ai-debug-card__group {
  padding: 6px 10px;
  &:last-child { padding-bottom: 10px; }
}
.ai-debug-card__group-label {
  font-size: 11px; font-weight: 600; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;
  color: #389e0d;
}
.ai-debug-card__group--remaining .ai-debug-card__group-label { color: #d46b08; }

.ai-debug-card__item {
  display: flex; align-items: baseline; gap: 6px;
  padding: 2px 0; font-size: 11px; line-height: 1.5; color: #595959;
}
.ai-debug-card__bullet {
  width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; margin-top: 5px;
}
.ai-debug-card__bullet--green { background: #52c41a; }
.ai-debug-card__bullet--orange { background: #fa8c16; }

// ===== Params =====
.params-scroll {
  flex: none;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: visible;
  padding: 10px 12px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-thumb { background: #d9d9d9; border-radius: 2px; }
}
.params-scroll--right { padding: 12px 16px 10px; min-width: 0; }

.param-section {
  margin-bottom: 0;
  padding: 12px 12px 12px;
  border-bottom: none;
  border-radius: 10px;
  background: #fff;
  border: 1px solid rgba(15, 23, 42, 0.06);
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.03);
  min-width: 0;
  min-height: 0;
  height: auto;
  max-height: none;
  overflow: hidden;
  ::v-deep .ant-row {
    align-items: flex-start;
  }
}

.params-layout {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.params-row-three {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
  width: 100%;
  min-width: 0;
  align-items: stretch;
}
.params-row-three > .param-section--top {
  align-self: stretch;
  min-height: 0;
  display: flex;
  flex-direction: column;
  height: 100%;
}
.params-row-full {
  width: 100%;
  min-width: 0;
  flex: 0 0 auto;
  box-sizing: border-box;
}
.params-row-full > .strategy-directives-card {
  width: 100%;
  box-sizing: border-box;
}

.strict-mode-card {
  padding: 10px 12px;
  margin-bottom: 12px;
  border-radius: 10px;
  border: 1px solid rgba(250, 140, 22, 0.22);
  background: linear-gradient(165deg, #fffaf5 0%, #fff 100%);
  transition: border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
  &--on {
    border-color: rgba(24, 144, 255, 0.28);
    background: linear-gradient(165deg, #f4f9ff 0%, #fff 100%);
    box-shadow: inset 0 0 0 1px rgba(24, 144, 255, 0.06);
  }
}
.strict-mode-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 6px;
}
.strict-mode-card__title {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  min-width: 0;
  font-size: 12px;
  font-weight: 700;
  color: #1e293b;
  ::v-deep .ant-tag {
    margin: 0;
    line-height: 18px;
    font-size: 10px;
    border-radius: 4px;
  }
}
.strict-mode-card__hint {
  margin: 0;
  font-size: 11px;
  line-height: 1.55;
  color: #64748b;
}
.strict-mode-direction {
  .param-label {
    margin-bottom: 6px;
  }
}

.direction-radio-group {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  width: 100%;
  min-width: 0;
  ::v-deep .ant-radio-button-wrapper {
    flex: none !important;
    min-width: 0 !important;
    text-align: center;
    height: auto;
    min-height: 34px;
    line-height: 1.25;
    padding: 6px 4px !important;
    font-size: 11px;
    font-weight: 500;
    border-radius: 8px !important;
    border: 1px solid #e8e8e8 !important;
    background: #fafafa;
    color: #8c8c8c;
    transition: all 0.2s ease;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    margin-left: 0 !important;
    &::before { display: none !important; }
    &:hover {
      color: #595959;
      border-color: #d0d0d0 !important;
    }
    .anticon { margin-right: 3px; }
  }
  ::v-deep .ant-radio-button-wrapper-checked {
    color: #fff !important;
    border-color: transparent !important;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12) !important;
    &[value="long"],
    &:nth-child(1) {
      background: linear-gradient(135deg, #52c41a, #73d13d) !important;
    }
    &[value="short"],
    &:nth-child(2) {
      background: linear-gradient(135deg, #f5222d, #ff4d4f) !important;
    }
    &[value="both"],
    &:nth-child(3) {
      background: linear-gradient(135deg, var(--primary-color, #1890ff), var(--primary-color-hover, #40a9ff)) !important;
    }
  }
}
.param-strategy-hint {
  margin-top: 10px;
  font-size: 11px;
  color: #8c8c8c;
  line-height: 1.5;
}
.strategy-directives-card {
  background: #fafbfc;
  border: 1px solid #eef0f3;
  border-radius: 8px;
  padding: 10px 12px;
  margin-top: 4px;
}
.strategy-directives-alert {
  margin-bottom: 10px;
  padding: 10px 30px 10px 48px !important;
  ::v-deep .ant-alert-message {
    font-size: 12px;
    font-weight: 600;
    padding-left: 0;
  }
  ::v-deep .ant-alert-description { font-size: 11.5px; line-height: 1.55; }
}
.strategy-directives-doc-link {
  display: inline-block;
  margin-top: 4px;
  color: var(--primary-color, #1890ff);
  font-size: 11.5px;
  cursor: pointer;
  &:hover { color: var(--primary-color-hover, #40a9ff); text-decoration: underline; }
}
.strategy-directives-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}
.strategy-directives-jump {
  font-size: 11px;
  color: var(--primary-color, #1890ff);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 3px;
  > .anticon { margin-right: 2px; }
  &:hover { color: var(--primary-color-hover, #40a9ff); }
}
.strategy-directives-empty {
  font-size: 11px;
  color: #8c8c8c;
  padding: 4px 0;
  font-style: italic;
}
.strategy-directives-list {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px 14px;
}
.strategy-directive-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11.5px;
  padding: 3px 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.15s;
  &:hover { background: rgba(24, 144, 255, 0.06); }
  &.is-set { color: #1f2937; }
}
.strategy-directive-label {
  color: #6b7280;
  margin-right: 8px;
  white-space: nowrap;
}
.strategy-directive-value {
  font-weight: 600;
  color: #1f2937;
  font-variant-numeric: tabular-nums;
  &.is-empty { color: #bfbfbf; font-weight: 400; font-style: italic; }
}
.param-label {
  font-size: 11px;
  font-weight: 700;
  color: #334155;
  margin-bottom: 8px;
  letter-spacing: 0.02em;
}
.field-label { font-size: 11px; color: #64748b; margin-bottom: 4px; font-weight: 600; }
.date-presets {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
  ::v-deep .ant-btn-sm {
    border-radius: 999px;
    padding: 0 12px;
    height: 28px;
    font-size: 12px;
    font-weight: 600;
    border-color: #e2e8f0;
    color: #475569;
  }
  ::v-deep .ant-btn-primary.ant-btn-sm {
    border-color: transparent;
    background: linear-gradient(135deg, var(--primary-color, #1890ff) 0%, var(--primary-color-active, #096dd9) 100%);
    box-shadow: 0 2px 6px rgba(24, 144, 255, 0.28);
  }
}

@media (max-width: 360px) {
  .direction-radio-group {
    grid-template-columns: 1fr;
  }
}

// ===== Right Panel =====
.ide-right {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
.ide-right--workspace {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  align-self: stretch;
  flex: 1 1 0;
  height: calc(var(--ide-shell-height, calc(100vh - 64px)) - 8px);
  max-height: calc(var(--ide-shell-height, calc(100vh - 64px)) - 8px);
}
.ide-workspace-pane--chart {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.ide-quick-right {
  width: 30%;
  min-width: 280px;
  max-width: 400px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid #e8e8e8;
  background: #f8fafc;
  overflow: hidden;
  min-height: 0;
  align-self: stretch;
}
.ide-quick-panel-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px 12px;
  background: linear-gradient(180deg, #ffffff 0%, #f1f5f9 100%);
  border-bottom: 1px solid rgba(15, 23, 42, 0.08);
}
.ide-quick-panel-head-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: 0.02em;
}
.ide-quick-panel-head-icon {
  font-size: 16px;
  color: @primary-color;
}
.ide-quick-panel-close {
  color: #64748b !important;
  padding: 0 4px !important;
  &:hover {
    color: #0f172a !important;
  }
}
.ide-quick-panel-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow-x: hidden;
  overflow-y: auto;
  padding: 0 0 8px;
  ::v-deep .quick-trade-panel-root {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  ::v-deep .quick-trade-embedded {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    overflow-x: hidden;
  }
  ::v-deep .qt-embedded-split--cols {
    flex-direction: column;
    padding-left: 12px;
    padding-right: 12px;
  }
  ::v-deep .qt-embedded-split--cols .qt-embedded-col-left,
  ::v-deep .qt-embedded-split--cols .qt-embedded-col-right {
    width: 100%;
    max-width: 100%;
    box-sizing: border-box;
    padding-left: 0;
    padding-right: 0;
    margin-left: 0;
  }
  ::v-deep .qt-embedded-split--cols .qt-embedded-col-right {
    border-left: none;
    border-top: 1px solid rgba(15, 23, 42, 0.08);
    padding-top: 12px;
  }
}

.ide-chart-fs-root {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: #fff;
  align-self: stretch;
  position: relative;
  z-index: 3;
  &.ide-panel--fullscreen {
    height: 100vh !important;
    max-height: 100vh !important;
    overflow: visible !important;
    z-index: 5;
    .ide-chart-fs-row {
      flex: 1;
      min-height: 0;
      overflow: visible;
    }
    .chart-panel {
      overflow: visible;
    }
    .chart-panel-inner {
      overflow: hidden;
      flex: 1;
      min-height: 0;
    }
  }
}
.ide-chart-fs-row {
  display: flex;
  flex-direction: row;
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  align-items: stretch;
}
.ide-quick-right--chart-fs {
  flex: 0 0 auto;
  width: 30%;
  min-width: 260px;
  max-width: 400px;
  align-self: stretch;
  border-left: 1px solid #e8e8e8;
  overflow: visible;
  position: relative;
  z-index: 2;
}
.chart-panel {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  background: #fff;
  .chart-panel-toolbar {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px 10px 10px;
    border-bottom: 1px solid #f0f0f0;
    background: #fafafa;
  }
  .chart-panel-toolbar-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-height: 28px;
  }
  .chart-panel-toolbar-controls {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-end;
    gap: 10px;
    min-width: 0;
    .ide-toolbar-group {
      flex: 0 1 auto;
      min-width: 0;
    }
    // Same fix as on the backtest tab: don't let the TF segmented control
    // grow past its 8-button natural width.
    .ide-toolbar-group--tf {
      flex: 0 0 auto;
      min-width: 0;
      max-width: 100%;
    }
    .ide-toolbar-group--indicator {
      flex: 1 1 240px;
      min-width: 200px;
      align-items: flex-start;
      .ide-toolbar-label {
        width: 100%;
        text-align: left;
        align-self: flex-start;
      }
      .ide-indicator-multiselect-trigger {
        width: 100%;
        max-width: none;
      }
    }
  }
  .chart-panel-watchlist-select {
    width: 100%;
    min-width: 260px;
    max-width: 380px;
  }
  .ide-tf-seg--chart {
    display: inline-flex;
    flex-wrap: nowrap;
    overflow-x: auto;
    width: auto;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 2px;
    ::v-deep .ant-radio-button-wrapper {
      flex-shrink: 0;
    }
  }
  .chart-panel-toolbar-title {
    font-size: 12px;
    font-weight: 600;
    color: #595959;
  }
  .chart-panel-fs-btn {
    width: 28px;
    height: 28px;
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }
  .chart-panel-inner {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  ::v-deep .chart-left,
  ::v-deep .chart-wrapper,
  ::v-deep .chart-content-area,
  ::v-deep .kline-chart-container {
    height: 100% !important;
    min-height: 0 !important;
  }
  ::v-deep .chart-left {
    width: 100% !important;
    flex: 1 1 100% !important;
    border-right: none !important;
  }
}

.result-panel {
  flex: 1 1 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: visible;
  padding: 0 18px 0;
  position: relative;
  z-index: 1;
}
.params-card {
  flex-shrink: 0;
  flex-grow: 0;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  margin: 12px 0 14px;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.05);
  overflow: hidden;
  min-height: 0;
}
.params-card-header,
.workbench-panel-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 46px;
  padding: 10px 16px;
  cursor: pointer;
  user-select: none;
  background: linear-gradient(135deg, var(--primary-color-soft, rgba(24, 144, 255, 0.08)) 0%, color-mix(in srgb, var(--primary-color, @primary-color) 4%, #fff) 100%);
  border-bottom: 1px solid var(--primary-color-ring, rgba(15, 23, 42, 0.08));
  transition: background 0.15s;
  &:hover {
    background: linear-gradient(135deg, var(--primary-color-soft-strong, rgba(24, 144, 255, 0.12)) 0%, color-mix(in srgb, var(--primary-color, @primary-color) 6%, #fff) 100%);
  }
}
.workbench-panel-header {
  cursor: default;
}
.params-card-title,
.workbench-panel-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  color: #1e293b;
  .anticon,
  ::v-deep .anticon {
    color: var(--primary-color, @primary-color);
    font-size: 15px;
  }
}
.workbench-panel-meta {
  min-width: 0;
  max-width: 58%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 11px;
  color: #64748b;
}
.params-card-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  ::v-deep .ant-btn-sm {
    border-radius: 8px;
    font-weight: 600;
  }
  ::v-deep .ant-btn-primary.ant-btn-sm {
    box-shadow: 0 2px 8px rgba(24, 144, 255, 0.28);
  }
  > .anticon {
    font-size: 14px;
    color: rgba(0, 0, 0, 0.4);
    cursor: pointer;
    padding: 4px;
    border-radius: 6px;
    transition: color 0.15s, background 0.15s;
    &:hover { color: var(--primary-color, #1890ff); background: var(--primary-color-soft, rgba(24, 144, 255, 0.08)); }
  }
}
.result-tabs {
  flex: 0 0 auto;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: visible;
  ::v-deep .ant-tabs {
    display: flex;
    flex-direction: column;
    flex: 0 0 auto;
    min-height: 0;
    overflow: visible;
  }
  ::v-deep .ant-tabs-bar {
    margin-bottom: 0;
    flex-shrink: 0;
    background: linear-gradient(180deg, #fafbfc 0%, #f1f5f9 100%);
    border: 1px solid #e8e8e8;
    border-bottom: none;
    border-radius: 10px 10px 0 0;
    padding: 8px 12px 0;
    z-index: 2;
  }
  ::v-deep .ant-tabs-tab {
    font-size: 13px;
    font-weight: 600;
    margin: 0 6px 0 0 !important;
    padding: 8px 14px !important;
    border-radius: 8px 8px 0 0 !important;
    transition: color 0.15s, background 0.15s;
  }
  ::v-deep .ant-tabs-tab-active {
    background: #fff !important;
    color: var(--primary-color, #1890ff) !important;
  }
  ::v-deep .ant-tabs-content {
    flex: 0 0 auto;
    min-height: auto;
    overflow: visible;
    display: flex;
    flex-direction: column;
    padding: 16px 20px 24px;
    background: linear-gradient(180deg, #fbfcff 0%, #f6f8fc 100%);
    border: 1px solid #e8e8e8;
    border-top: none;
    border-radius: 0 0 12px 12px;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
  }
}

.result-running {
  display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 180px; gap: 10px;
  .running-time { font-size: 24px; font-weight: 300; color: var(--primary-color, #1890ff); font-variant-numeric: tabular-nums; }
  .running-tip { font-size: 12px; color: #8c8c8c; }
}
.result-empty {
  display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 180px; gap: 10px;
  p { font-size: 12px; color: #8c8c8c; margin: 0; }
}
.result-data {
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(108px, 1fr));
    gap: 10px;
    margin-bottom: 16px;
  }
  .metric-card {
    background: linear-gradient(165deg, #ffffff 0%, #f8fafc 100%);
    border-radius: 10px;
    padding: 12px 8px;
    text-align: center;
    border: 1px solid rgba(15, 23, 42, 0.08);
    box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px var(--primary-color-soft, rgba(24, 144, 255, 0.1));
      border-color: var(--primary-color-ring, rgba(24, 144, 255, 0.22));
    }
    .metric-label { font-size: 10px; color: #64748b; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.35px; font-weight: 600; }
    .metric-value { font-size: 17px; font-weight: 700; font-variant-numeric: tabular-nums; color: #0f172a; line-height: 1.2; }
    &.positive .metric-value { color: #52c41a; }
    &.negative .metric-value { color: #f5222d; }
  }
}
.result-data--workbench {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.result-split-workbench {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(360px, 1fr);
  gap: 14px;
  align-items: start;
}
.result-split-panel {
  min-width: 0;
  border: 1px solid rgba(15, 23, 42, 0.1);
  border-radius: 8px;
  background: #fff;
  padding: 0;
  overflow: hidden;
  box-shadow: 0 10px 26px rgba(15, 23, 42, 0.05);
}
.workbench-panel-body {
  padding: 14px 16px 16px;
}
.result-split-panel--optimizer {
  position: sticky;
  top: 12px;
}
.result-split-panel--optimizer .experiment-panel,
.result-split-panel--optimizer .ide-tuning-launch {
  margin-bottom: 0;
}
.backtest-workbench {
  display: block;
}
.backtest-workbench-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.backtest-overview-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 14px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 8px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}
.backtest-overview-kicker {
  font-size: 11px;
  font-weight: 700;
  color: var(--primary-color, #1890ff);
  margin-bottom: 4px;
}
.backtest-overview-title {
  font-size: 16px;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.35;
}
.backtest-overview-desc {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.55;
  color: #64748b;
}
.backtest-overview-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.metrics-grid--workbench {
  grid-template-columns: repeat(auto-fit, minmax(118px, 1fr)) !important;
}
.backtest-quality-strip {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 8px;
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}
.backtest-quality-strip__title {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-right: 2px;
  font-size: 12px;
  font-weight: 700;
  color: #475569;
}
.backtest-quality-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 28px;
  padding: 5px 9px;
  border-radius: 999px;
  border: 1px solid rgba(100, 116, 139, 0.18);
  background: #fff;
  color: #475569;
  font-size: 11px;
  line-height: 1.2;
  cursor: default;
  strong {
    color: #0f172a;
    font-variant-numeric: tabular-nums;
  }
}
.backtest-quality-chip--good {
  border-color: rgba(22, 163, 74, 0.22);
  background: rgba(22, 163, 74, 0.08);
  color: #15803d;
  strong { color: #15803d; }
}
.backtest-quality-chip--warn {
  border-color: rgba(217, 119, 6, 0.24);
  background: rgba(217, 119, 6, 0.09);
  color: #b45309;
  strong { color: #b45309; }
}
.backtest-quality-chip--danger {
  border-color: rgba(220, 38, 38, 0.22);
  background: rgba(220, 38, 38, 0.08);
  color: #b91c1c;
  strong { color: #b91c1c; }
}
.backtest-quality-chip--neutral {
  border-color: rgba(100, 116, 139, 0.18);
  background: rgba(100, 116, 139, 0.08);
  color: #64748b;
}
.backtest-result-tabs {
  margin-top: 2px;
  ::v-deep .ant-tabs-bar {
    margin-bottom: 12px;
    border-bottom-color: #e5e7eb;
  }
  ::v-deep .ant-tabs-tab {
    font-weight: 600;
    padding: 8px 12px !important;
  }
}
.eq-section--hero {
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
}
.equity-chart--large {
  height: 260px;
}
.benchmark-summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}
.benchmark-summary-card {
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: #fff;
  span {
    display: block;
    font-size: 11px;
    color: #64748b;
    margin-bottom: 4px;
  }
  strong {
    font-size: 18px;
    font-weight: 800;
    color: #0f172a;
    font-variant-numeric: tabular-nums;
  }
  &.positive strong { color: #16a34a; }
  &.negative strong { color: #dc2626; }
}
.chart-focus-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px;
  border-radius: 8px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: #fff;
}
.chart-focus-icon {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: @primary-color;
  background: rgba(24, 144, 255, 0.08);
  flex-shrink: 0;
}
.chart-focus-body {
  flex: 1;
  min-width: 0;
}
.chart-focus-title {
  font-size: 14px;
  font-weight: 700;
  color: #0f172a;
}
.chart-focus-desc {
  margin-top: 3px;
  font-size: 12px;
  color: #64748b;
  line-height: 1.5;
}
.backtest-marker-legend--compact {
  margin: 10px 0 0;
}
.trades-section--workbench {
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
  overflow: hidden;
}
.trades-table ::v-deep .ant-table-content,
.trades-table ::v-deep .ant-table-scroll,
.trades-table ::v-deep .ant-table-body {
  overflow-x: auto !important;
}
.trades-table ::v-deep .ant-table-thead > tr > th,
.trades-table ::v-deep .ant-table-tbody > tr > td {
  white-space: nowrap;
}
.diagnostics-section {
  padding: 12px;
  border-radius: 8px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: #fff;
}
.diagnostic-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.diagnostic-card {
  display: flex;
  gap: 12px;
  padding: 14px;
  border-radius: 8px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: #fff;
}
.diagnostic-card-icon {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: rgba(100, 116, 139, 0.1);
  color: #64748b;
  flex-shrink: 0;
}
.diagnostic-card-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  span { font-size: 12px; color: #64748b; font-weight: 600; }
  strong { font-size: 18px; color: #0f172a; font-variant-numeric: tabular-nums; }
  small { font-size: 11px; line-height: 1.45; color: #94a3b8; }
}
.diagnostic-card--good .diagnostic-card-icon { color: #16a34a; background: rgba(22, 163, 74, 0.1); }
.diagnostic-card--warn .diagnostic-card-icon { color: #d97706; background: rgba(217, 119, 6, 0.12); }
.diagnostic-card--danger .diagnostic-card-icon { color: #dc2626; background: rgba(220, 38, 38, 0.1); }
.backtest-sidecar {
  display: flex;
  flex-direction: column;
  gap: 12px;
  position: sticky;
  top: 12px;
}
.backtest-sidecar-card {
  padding: 14px;
  border-radius: 8px;
  border: 1px solid rgba(15, 23, 42, 0.08);
  background: #fff;
}
.backtest-sidecar-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}
.backtest-sidecar-desc {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.55;
  color: #64748b;
}
.backtest-sidecar-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}
.ai-optimize-card {
  margin-top: 16px;
  margin-bottom: 8px;
}
.ai-optimize-card-inner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 10px;
  background: linear-gradient(135deg, rgba(24, 144, 255, 0.06) 0%, rgba(114, 46, 209, 0.04) 100%);
  border: 1px solid rgba(24, 144, 255, 0.15);
}
.ai-optimize-card-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: linear-gradient(135deg, var(--primary-color, #1890ff), #722ed1);
  color: #fff;
  font-size: 16px;
  flex-shrink: 0;
}
.ai-optimize-card-body {
  flex: 1;
  min-width: 0;
}
.ai-optimize-card-title {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  line-height: 1.3;
}
.ai-optimize-card-desc {
  font-size: 11px;
  color: #8c8c8c;
  margin-top: 2px;
  line-height: 1.4;
}
.eq-section { margin-bottom: 14px; }
.backtest-marker-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 16px;
  margin: 0 0 12px;
  padding: 8px 10px;
  border-radius: 8px;
  border: 1px dashed #d9e2ec;
  background: rgba(248, 250, 252, 0.9);
  font-size: 11px;
  color: #64748b;
}
.backtest-marker-legend__item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-weight: 600;
  color: #334155;
}
.backtest-marker-legend__hint {
  flex: 1 1 200px;
  min-width: 0;
  font-weight: 400;
  color: #94a3b8;
  line-height: 1.45;
}
.backtest-marker-legend__icon {
  display: inline-block;
  width: 18px;
  height: 12px;
  border-radius: 3px;
  flex-shrink: 0;
}
.backtest-marker-legend__icon--fill {
  background: #00e676;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.08);
}
.backtest-marker-legend__icon--signal {
  background: transparent;
  border: 1.5px dashed #00e676;
}
.eq-title, .trades-title {
  font-size: 13px; font-weight: 600; color: #333; margin-bottom: 8px; display: flex; align-items: center;
  .trades-count { font-weight: 400; font-size: 12px; color: #999; margin-left: 4px; }
}
.equity-chart { width: 100%; height: 200px; border-radius: 8px; }

.ide-tuning-launch {
  padding: 0;
}
.ide-tuning-launch-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
  padding: 12px 14px;
  border-radius: 6px;
  background: #fafbfc;
  border: 1px solid #e8eaee;
}
.ide-tuning-launch-icon {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: #f0f5ff;
  color: var(--primary-color, #1890ff);
  font-size: 16px;
  flex-shrink: 0;
  border: 1px solid #d6e4ff;
}
.ide-tuning-launch-title {
  font-size: 14px;
  font-weight: 700;
  color: #1e293b;
}
.ide-tuning-launch-subtitle {
  font-size: 11px;
  color: #8c8c8c;
  margin-top: 2px;
  line-height: 1.5;
}
.optimizer-workflow {
  margin-bottom: 16px;
}
.optimizer-workflow-step {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}
.optimizer-workflow-step--method {
  margin: 16px 0 10px;
  padding-top: 14px;
  border-top: 1px dashed #e5e7eb;
}
.optimizer-step-index {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--primary-color, #1890ff);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  flex-shrink: 0;
}
.optimizer-step-title {
  font-size: 13px;
  font-weight: 700;
  color: #0f172a;
}
.optimizer-step-desc {
  margin-top: 1px;
  font-size: 11px;
  color: #64748b;
  line-height: 1.45;
}
.ide-tuning-method-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(268px, 1fr));
  gap: 14px;
}
.ide-tuning-method-card {
  position: relative;
  padding: 16px 18px;
  border-radius: 6px;
  border: 1px solid #e8eaee;
  background: #fff;
  transition: border-color 0.15s ease;
  overflow: hidden;
  &:hover {
    border-color: var(--primary-color, #1890ff);
  }
}
.ide-tuning-method-card--ai {
  /* Same neutral styling as the structured card; no special gradients. */
}
.ide-tuning-method-cards--single {
  grid-template-columns: 1fr;
}
@media (max-width: 1280px) {
  .result-split-workbench {
    grid-template-columns: 1fr;
  }
  .result-split-panel--optimizer {
    position: static;
  }
}

@media (max-width: 900px) {
  .backtest-overview-head {
    flex-direction: column;
    align-items: stretch;
  }
  .backtest-overview-actions {
    width: 100%;
    flex-wrap: wrap;
  }
  .benchmark-summary-grid,
  .diagnostic-grid {
    grid-template-columns: 1fr;
  }
  .result-split-panel {
    padding: 10px;
  }
}
.ide-tuning-method-card-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.ide-tuning-method-icon {
  width: 24px; height: 24px; display: flex; align-items: center; justify-content: center;
  border-radius: 4px; font-size: 13px; flex-shrink: 0;
  color: #595959; background: #f5f5f5; border: 1px solid #e8e8e8;
}
.ide-tuning-method-name {
  font-size: 13px;
  font-weight: 600;
  color: #333;
}
.ide-tuning-method-desc {
  font-size: 11px;
  color: #8c8c8c;
  line-height: 1.6;
  margin-bottom: 10px;
}
.ide-tuning-method-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  padding-top: 4px;
  ::v-deep .ant-btn {
    border-radius: 8px;
    font-weight: 600;
  }
}

.ide-tune-method-badge {
  margin-left: auto;
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 3px;
  color: #595959;
  background: #f5f5f5;
  border: 1px solid #e8e8e8;
}

.ide-tune-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}
.ide-tune-pill {
  flex: 1 1 calc(50% - 6px);
  min-width: 110px;
  appearance: none;
  border: 1px solid #d9d9d9;
  background: #fff;
  border-radius: 4px;
  padding: 6px 10px;
  font-size: 12px;
  font-weight: 500;
  color: #595959;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease, background 0.15s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  i {
    font-size: 13px;
    margin-right: 6px;
    color: #8c8c8c;
    transition: color 0.15s ease;
  }
  &:hover:not(:disabled) {
    color: var(--primary-color, #1890ff);
    border-color: var(--primary-color, #1890ff);
    i { color: var(--primary-color, #1890ff); }
  }
  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
  &.active {
    color: #fff;
    border-color: var(--primary-color, #1890ff);
    background: var(--primary-color, #1890ff);
    i { color: #fff; }
  }
}
.ide-tune-pill-inner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.ide-tune-pill-label {
  white-space: nowrap;
}
.ide-tune-pills--five .ide-tune-pill {
  min-height: 42px;
}
.ide-tune-pill--ai {
  flex-basis: 100%;
}
.ide-tune-pill--ai:not(.active) {
  border-color: var(--primary-color-ring, rgba(24, 144, 255, 0.35));
  color: var(--primary-color, #1890ff);
  background: var(--primary-color-soft, rgba(24, 144, 255, 0.04));
}
.ide-tune-dimensions {
  margin-top: 10px;
  padding: 10px 12px;
  background: rgba(248, 250, 252, 0.7);
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.ide-tune-dimensions-summary {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 14px;
}
.ide-tune-dimensions-summary-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #334155;
  i {
    color: var(--primary-color, #1890ff);
    font-size: 13px;
  }
}
.ide-tune-dimensions-summary-stats {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  font-size: 11px;
}
.ide-tune-dim-stat {
  display: inline-flex;
  align-items: baseline;
  gap: 3px;
  color: #475569;
}
.ide-tune-dim-stat-cap {
  color: #94a3b8;
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
}
.ide-tune-dim-stat-num {
  font-weight: 700;
  color: #1e293b;
  font-variant-numeric: tabular-nums;
}
.ide-tune-dim-stat-sep,
.ide-tune-dim-stat-total {
  color: #64748b;
  font-variant-numeric: tabular-nums;
}
.ide-tune-dim-stat--cartesian .ide-tune-dim-stat-num {
  color: #d46b08;
}
.ide-tune-dim-stat--budget .ide-tune-dim-stat-num {
  color: var(--primary-color, #1890ff);
}
.ide-tune-dimensions-warning {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  padding: 6px 10px;
  background: linear-gradient(90deg, rgba(250, 173, 20, 0.1), rgba(250, 173, 20, 0.04));
  border: 1px solid rgba(250, 173, 20, 0.32);
  border-radius: 8px;
  color: #b45309;
  font-size: 11px;
  line-height: 1.5;
  i {
    color: #faad14;
    margin-top: 2px;
  }
}
.ide-tune-dimensions-empty {
  font-size: 11px;
  color: #94a3b8;
  font-style: italic;
  padding: 4px 2px;
}
.ide-tune-dimensions-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-height: 200px;
  overflow-y: auto;
  padding-right: 4px;
  margin: 0 -2px;
}
.ide-tune-dim-row {
  display: grid;
  grid-template-columns: 16px minmax(90px, 1fr) auto auto minmax(80px, 1.6fr);
  align-items: center;
  gap: 6px 8px;
  padding: 4px 6px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.15s ease;
  font-size: 11px;
  line-height: 1.4;
  &:hover {
    background: var(--primary-color-soft, rgba(24, 144, 255, 0.06));
  }
  &.is-disabled {
    opacity: 0.42;
    .ide-tune-dim-values,
    .ide-tune-dim-count {
      text-decoration: line-through;
    }
  }
}
.ide-tune-dim-check {
  margin: 0;
  cursor: pointer;
}
.ide-tune-dim-label {
  font-weight: 600;
  color: #1e293b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
.ide-tune-dim-badge {
  display: inline-block;
  font-size: 9px;
  font-weight: 600;
  letter-spacing: 0.3px;
  text-transform: uppercase;
  padding: 1px 6px;
  border-radius: 999px;
  white-space: nowrap;
}
.ide-tune-dim-badge--risk,
.ide-tune-dim-badge--leverage {
  background: var(--primary-color-soft, rgba(24, 144, 255, 0.1));
  color: var(--primary-color-active, #1d4ed8);
}
.ide-tune-dim-badge--position {
  background: rgba(82, 196, 26, 0.12);
  color: #15803d;
}
.ide-tune-dim-badge--indicator_declared {
  background: rgba(114, 46, 209, 0.12);
  color: #6b21a8;
}
.ide-tune-dim-badge--indicator_inferred {
  background: rgba(250, 173, 20, 0.14);
  color: #b45309;
}
.ide-tune-dim-count {
  font-size: 10px;
  font-weight: 700;
  color: #64748b;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.ide-tune-dim-values {
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace;
  font-size: 10.5px;
  color: #64748b;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ide-tune-dimensions-tip {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  font-size: 10.5px;
  color: #94a3b8;
  line-height: 1.55;
  i {
    margin-top: 2px;
    color: #fbbf24;
  }
  code {
    background: rgba(15, 23, 42, 0.06);
    padding: 0 4px;
    border-radius: 4px;
    font-family: 'SFMono-Regular', Consolas, monospace;
    font-size: 10px;
    color: #1e293b;
  }
}
.ide-tune-method-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid #f0f0f0;
}
.ide-tune-method-meta-hint {
  flex: 1;
  min-width: 0;
  font-size: 11px;
  line-height: 1.5;
  color: #8c8c8c;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.ide-tune-run-btn {
  flex-shrink: 0;
  font-weight: 500;
  min-width: 96px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #fff !important;

  span,
  i {
    color: inherit !important;
  }
}
.ide-tune-method-badge--ai {
  /* Same neutral badge as the structured one. */
}
.ide-tune-ai-feature-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 6px 0 2px;
}
.ide-tune-ai-feature {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: #595959;
  i {
    color: var(--primary-color, #1890ff);
    font-size: 13px;
    flex-shrink: 0;
  }
}
.ide-tune-method-meta--ai {
  /* Inherit base style. */
}
.ide-tune-run-btn--ai {
  /* Use the default Ant Design primary blue; no gradient, no glow. */
}

.experiment-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.experiment-stage-row,
.experiment-candidate-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
@media (max-width: 1280px) {
  .experiment-candidate-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (max-width: 960px) {
  .experiment-candidate-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.experiment-stage-card,
.experiment-candidate-card,
.experiment-detail-card,
.experiment-segment-card {
  border: 1px solid #ececec;
  border-radius: 10px;
  background: #fafbfc;
}
.experiment-stage-card {
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.experiment-stage-card.is-done {
  border-color: var(--primary-color-ring, rgba(24, 144, 255, 0.28));
  background: var(--primary-color-soft, rgba(24, 144, 255, 0.05));
}
.experiment-stage-index {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: #e6f4ff;
  color: var(--primary-color, #1890ff);
  font-size: 12px;
  font-weight: 700;
}
.experiment-stage-title {
  font-size: 12px;
  font-weight: 600;
  color: #333;
}
.structured-tune-row {
  width: 100%;
  ::v-deep .ant-radio-group {
    display: flex;
    width: 100%;
  }
  ::v-deep .ant-radio-button-wrapper {
    flex: 1;
    text-align: center;
    padding: 0 4px;
    font-size: 12px;
  }
}
.experiment-hero {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border: 1px solid #e8e8e8;
  border-radius: 10px;
  background: linear-gradient(135deg, #f7fbff 0%, #fafcff 100%);
}
.experiment-hero-main {
  flex: 1;
  min-width: 0;
}
.experiment-kicker {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.4px;
  color: #8c8c8c;
  margin-bottom: 4px;
}
.experiment-regime-title {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 20px;
  font-weight: 700;
  color: #1f1f1f;
}
.experiment-hint {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.6;
  color: #595959;
}
.experiment-family-tags {
  margin-top: 10px;
  ::v-deep .ant-tag {
    margin-bottom: 6px;
    border-radius: 999px;
  }
}
.experiment-weights-row {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #595959;
  .experiment-weights-label {
    margin-right: 4px;
  }
  ::v-deep .ant-tag {
    margin: 2px 0;
    border-radius: 4px;
  }
}
.experiment-best-score {
  width: 120px;
  flex-shrink: 0;
  text-align: right;
}
.experiment-score {
  font-size: 30px;
  line-height: 1.1;
  font-weight: 700;
  color: var(--primary-color, #1890ff);
}
.experiment-grade {
  margin-top: 4px;
  font-size: 13px;
  color: #8c8c8c;
}
.experiment-feature-grid {
  flex: 1;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}
.experiment-overview-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.6fr) minmax(320px, 0.9fr);
  gap: 12px;
}
.experiment-feature-card,
.experiment-best-card,
.experiment-ranking-card,
.experiment-segment-card,
.experiment-detail-card {
  border: 1px solid #ececec;
  border-radius: 10px;
  background: #fafbfc;
}
.experiment-feature-card {
  padding: 12px;
}
.experiment-section-title {
  font-size: 13px;
  font-weight: 600;
  color: #333;
  display: flex;
  align-items: center;
}
.experiment-best-card,
.experiment-ranking-card,
.experiment-segment-card,
.experiment-detail-card {
  padding: 14px;
}
.experiment-segment-list {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.experiment-segment-item {
  display: flex;
  gap: 10px;
}
.experiment-segment-dot {
  width: 10px;
  height: 10px;
  margin-top: 6px;
  border-radius: 999px;
  background: var(--primary-color, #1890ff);
  flex-shrink: 0;
}
.experiment-segment-content {
  flex: 1;
  min-width: 0;
}
.experiment-segment-title {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: #333;
  span {
    color: #8c8c8c;
    font-variant-numeric: tabular-nums;
  }
}
.experiment-segment-time {
  margin-top: 2px;
  font-size: 11px;
  color: #8c8c8c;
}
.experiment-best-summary {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
}
.experiment-best-metric {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
  padding: 8px 8px;
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 8px;
  span {
    font-size: 10px;
    line-height: 1.25;
    color: #8c8c8c;
  }
  strong {
    font-size: 14px;
    line-height: 1.25;
    color: #262626;
    font-variant-numeric: tabular-nums;
  }
}
.experiment-override-tags {
  margin-top: 12px;
  ::v-deep .ant-tag {
    margin-bottom: 6px;
    border-radius: 999px;
  }
}
.experiment-best-actions {
  margin-top: 14px;
  display: flex;
  justify-content: center;
  ::v-deep .ant-btn {
    width: 100%;
    min-width: 0;
    max-width: none;
    height: 36px;
    font-weight: 600;
  }
}
@media (max-width: 720px) {
  .experiment-best-actions ::v-deep .ant-btn {
    width: 100%;
    min-width: 0;
  }
}
.experiment-best-card.is-overfit {
  border-color: #ff7875;
  box-shadow: 0 0 0 1px rgba(245, 34, 45, 0.15);
}
.experiment-best-dual {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}
@media (max-width: 960px) {
  .experiment-best-dual {
    grid-template-columns: 1fr;
  }
}
.experiment-best-panel {
  background: #fafafa;
  border: 1px solid #ececec;
  border-radius: 10px;
  min-width: 0;
  padding: 9px 10px;
}
.experiment-best-panel.panel-overfit {
  background: #fff1f0;
  border-color: #ffa39e;
}
.experiment-best-panel.panel-disabled {
  opacity: 0.7;
}
.experiment-best-panel .experiment-best-summary {
  margin-top: 8px;
}
.experiment-best-panel-header {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}
.experiment-best-panel-title {
  font-size: 12px;
  font-weight: 600;
  color: #595959;
}
.experiment-best-panel-range {
  font-size: 11px;
  color: #8c8c8c;
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.2px;
}
.experiment-oos-banner {
  margin-bottom: 12px;
}
.experiment-best-degrade {
  margin-left: auto;
  font-size: 11px;
  color: #cf1322;
  font-variant-numeric: tabular-nums;
}
.experiment-best-oos-na {
  margin-top: 8px;
  font-size: 12px;
  color: #8c8c8c;
  font-style: italic;
}
.experiment-candidate-card {
  min-height: 150px;
  padding: 9px 10px;
  cursor: pointer;
  transition: all 0.15s;
  &:hover {
    border-color: rgba(24, 144, 255, 0.35);
    transform: translateY(-1px);
  }
  &.active {
    border-color: var(--primary-color, #1890ff);
    box-shadow: 0 0 0 2px var(--primary-color-soft, rgba(24, 144, 255, 0.08));
    background: var(--primary-color-soft, #f4faff);
  }
}
.experiment-candidate-header {
  display: flex;
  justify-content: space-between;
  gap: 6px;
}
.experiment-candidate-name {
  font-size: 12px;
  line-height: 1.25;
  font-weight: 700;
  color: #1f1f1f;
}
.experiment-candidate-source,
.experiment-detail-source {
  margin-top: 2px;
  font-size: 10px;
  color: #8c8c8c;
}
.experiment-candidate-score {
  margin-top: 8px;
  font-size: 22px;
  line-height: 1;
  font-weight: 700;
  color: var(--primary-color, @primary-color);
}
.experiment-candidate-stats {
  margin-top: 9px;
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 10px;
  color: #595959;
}
.experiment-candidate-oos {
  margin-top: 8px;
  padding: 5px 7px;
  border-radius: 8px;
  background: rgba(82, 196, 26, 0.06);
  border: 1px solid rgba(82, 196, 26, 0.18);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  font-size: 10px;
  line-height: 1.35;
  color: #2f6f1d;
  font-variant-numeric: tabular-nums;
  > span {
    display: inline-flex;
    align-items: center;
  }
  &.is-overfit {
    background: rgba(245, 34, 45, 0.06);
    border-color: rgba(245, 34, 45, 0.18);
    color: #c0392b;
  }
}

.experiment-lab {
  margin-top: 12px;
  padding: 14px;
  border: 1px solid var(--primary-color-ring, rgba(24, 144, 255, 0.18));
  border-radius: 12px;
  background: linear-gradient(180deg, color-mix(in srgb, var(--primary-color, @primary-color) 5%, #fff) 0%, color-mix(in srgb, var(--primary-color, @primary-color) 2%, #fff) 100%);
}
.experiment-lab-head {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
  margin-bottom: 12px;
}
.experiment-lab-subtitle {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.5;
  color: #697386;
}
.experiment-audit-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 12px;
}
.experiment-audit-card {
  display: flex;
  gap: 10px;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid #edf2f7;
  border-radius: 8px;
  background: #fff;
  i {
    margin-top: 2px;
    color: var(--primary-color, #1890ff);
  }
  div {
    min-width: 0;
  }
  span,
  small {
    display: block;
    color: #8c8c8c;
    font-size: 11px;
    line-height: 1.35;
  }
  strong {
    display: block;
    margin: 2px 0;
    color: #172033;
    font-size: 16px;
    line-height: 1.25;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}
@media (max-width: 1280px) {
  .experiment-audit-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 720px) {
  .experiment-lab-head {
    flex-direction: column;
  }
  .experiment-audit-grid {
    grid-template-columns: 1fr;
  }
}
.experiment-analytics {
  display: grid;
  grid-template-columns: 1.35fr 1fr;
  gap: 12px;
  margin-top: 12px;
}
.experiment-analytics--lab {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.experiment-analytics-card--wide {
  grid-column: span 2;
}
@media (max-width: 1200px) {
  .experiment-analytics {
    grid-template-columns: 1fr;
  }
  .experiment-analytics-card--wide {
    grid-column: span 1;
  }
}
.experiment-analytics-card {
  border: 1px solid #ececec;
  border-radius: 12px;
  background: linear-gradient(165deg, #ffffff 0%, #f9fbff 100%);
  padding: 12px 14px 8px;
  box-shadow: 0 2px 10px rgba(15, 23, 42, 0.04);
  display: flex;
  flex-direction: column;
  min-height: 268px;
  overflow: visible;
}
.experiment-analytics-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  min-width: 0;
  i {
    color: var(--primary-color, #1890ff);
    font-size: 14px;
    flex: 0 0 auto;
  }
}
.experiment-analytics-title {
  font-size: 13px;
  font-weight: 700;
  color: #1f1f1f;
  flex: 0 0 auto;
}
.experiment-analytics-sub {
  margin-left: auto;
  font-size: 11px;
  color: #8c8c8c;
  max-width: 56%;
  min-width: 0;
  overflow: hidden;
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.experiment-analytics-chart {
  flex: 1;
  width: 100%;
  min-height: 238px;
}
.experiment-detail-header {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  align-items: flex-start;
}
.experiment-detail-actions {
  display: flex;
  gap: 8px;
  ::v-deep .ant-btn {
    border-radius: 6px;
  }
}
.experiment-detail-metrics,
.experiment-component-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
  margin-top: 12px;
}
.experiment-detail-metric,
.experiment-component-card {
  padding: 10px 12px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #f0f0f0;
  span {
    display: block;
    font-size: 11px;
    color: #8c8c8c;
  }
  strong {
    display: block;
    margin-top: 4px;
    font-size: 15px;
    color: #262626;
    font-variant-numeric: tabular-nums;
  }
}
.experiment-detail-block {
  margin-top: 14px;
}
.experiment-detail-block-title {
  font-size: 12px;
  font-weight: 600;
  color: #595959;
}
.experiment-detail-block-hint {
  margin-top: 4px;
  font-size: 11px;
  color: #8c8c8c;
}
.experiment-change-list {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.experiment-change-list--applied {
  margin-top: 12px;
}
.experiment-change-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: #fff;
  border: 1px solid #f0f0f0;
}
.experiment-change-name {
  min-width: 0;
  font-size: 12px;
  font-weight: 600;
  color: #262626;
  word-break: break-word;
}
.experiment-change-values {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
}
.experiment-change-before {
  color: #8c8c8c;
}
.experiment-change-arrow {
  color: var(--primary-color, #1890ff);
  font-weight: 700;
}
.experiment-change-after {
  color: #262626;
  font-weight: 600;
}
.exp-table-name { font-weight: 600; }
.exp-table-source { font-size: 11px; color: #8c8c8c; }
.exp-table-score { font-weight: 700; color: var(--primary-color, #1890ff); }
.experiment-ranking-actions {
  display: flex;
  justify-content: flex-start;
  padding-top: 10px;
  border-top: 1px solid #f0f0f0;
}
.experiment-ranking-card ::v-deep .experiment-ranking-row {
  cursor: pointer;
}
.experiment-ranking-card ::v-deep .experiment-ranking-row:hover > td {
  background: var(--primary-color-soft, rgba(24, 144, 255, 0.06)) !important;
}
.experiment-ranking-card ::v-deep .experiment-ranking-row.is-selected > td {
  background: var(--primary-color-soft-strong, rgba(24, 144, 255, 0.12)) !important;
}

.experiment-progress-bar {
  padding: 16px;
  border: 1px solid #ececec;
  border-radius: 10px;
  background: #fafbfc;
}
.experiment-progress-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  font-size: 13px;
  font-weight: 600;
  .running-time { margin-left: auto; color: var(--primary-color, #1890ff); font-variant-numeric: tabular-nums; }
}
.experiment-live-hint {
  font-size: 12px;
  font-weight: 400;
  color: #8c8c8c;
  line-height: 1.45;
  margin: -4px 0 10px 28px;
}
.experiment-round-scores {
  margin-top: 8px;
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.experiment-round-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  background: #f0f0f0;
  color: #595959;
  &.best { background: #e6f7ff; color: var(--primary-color, #1890ff); }
}
.experiment-round-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.experiment-round-card {
  flex: 1;
  min-width: 120px;
  padding: 10px 14px;
  border: 1px solid #ececec;
  border-radius: 10px;
  background: #fafbfc;
  display: flex;
  align-items: center;
  gap: 10px;
  &.best { border-color: rgba(24, 144, 255, 0.35); background: #f4faff; }
}
.experiment-round-num {
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: rgba(24, 144, 255, 0.08);
  color: var(--primary-color, #1890ff);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 12px;
  flex-shrink: 0;
}
.experiment-round-score { font-size: 18px; font-weight: 700; color: var(--primary-color, #1890ff); }
.experiment-round-meta { font-size: 11px; color: #8c8c8c; }
.experiment-reasoning {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.5;
  color: #595959;
  font-style: italic;
}
.publish-form {
  .publish-hint {
    margin-top: 6px;
    font-size: 12px;
    color: #8c8c8c;
  }
}

.add-item-active { background: #e6f7ff !important; }

.date-presets ::v-deep .ant-btn-primary,
.date-presets ::v-deep .ant-btn-primary:hover,
.date-presets ::v-deep .ant-btn-primary:focus,
.date-presets ::v-deep .ant-btn-primary:active {
  color: #fff;
}

// ===== Watchlist option (selected value in toolbar) =====
::v-deep .wl-opt-tag {
  display: inline-block;
  font-size: 10px;
  font-weight: 600;
  line-height: 16px;
  padding: 0 4px;
  border-radius: 3px;
  color: #fff;
  margin-right: 4px;
  vertical-align: middle;
}
::v-deep .wl-mkt-crypto { background: #fa8c16; }
::v-deep .wl-mkt-usstock { background: var(--primary-color, #1890ff); }
::v-deep .wl-mkt-cnstock { background: #eb2f96; }
::v-deep .wl-mkt-hkstock { background: #f5222d; }
::v-deep .wl-mkt-forex { background: #52c41a; }
::v-deep .wl-mkt-futures { background: #722ed1; }
::v-deep .wl-opt-symbol { font-weight: 600; font-size: 12px; }
::v-deep .wl-opt-name { color: #8c8c8c; font-size: 10px; margin-left: 3px; }

// ===== Dark Theme =====
&.theme-dark {
  background: #141414;
  .ide-code-rail {
    border-right-color: #303030;
    background: linear-gradient(180deg, #1f1f1f 0%, #181818 100%);
    color: rgba(255, 255, 255, 0.5);
    box-shadow: 2px 0 14px rgba(0, 0, 0, 0.5);
    &:hover {
      background: linear-gradient(180deg, color-mix(in srgb, var(--primary-color, #1890ff) 18%, #1f1f1f) 0%, color-mix(in srgb, var(--primary-color, #1890ff) 8%, #181818) 100%);
      color: var(--primary-color, #1890ff);
    }
    &:focus {
      box-shadow: inset 0 0 0 2px var(--primary-color-ring, color-mix(in srgb, var(--primary-color, #1890ff) 38%, transparent));
    }
  }
  .ide-code-rail__icon {
    color: var(--primary-color, #1890ff);
  }
  .ide-code-rail__arrow {
    color: rgba(255, 255, 255, 0.56);
    background: rgba(255, 255, 255, 0.06);
  }
  .ide-code-rail:hover .ide-code-rail__arrow,
  .ide-code-rail.is-open .ide-code-rail__arrow {
    color: var(--primary-color, #1890ff);
    background: color-mix(in srgb, var(--primary-color, #1890ff) 16%, transparent);
  }
  .code-hidden-mask {
    color: rgba(255, 255, 255, 0.78);
    background:
      radial-gradient(circle at 50% 38%, color-mix(in srgb, var(--primary-color, #52c41a) 18%, transparent), transparent 34%),
      linear-gradient(135deg, rgba(5, 5, 5, 0.96), rgba(18, 18, 18, 0.94)),
      repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.035) 0 8px, rgba(255, 255, 255, 0.01) 8px 16px);
    strong {
      color: #ffffff;
    }
    span {
      color: rgba(255, 255, 255, 0.62);
    }
  }
  .code-version-toolbar {
    color: rgba(255, 255, 255, 0.58);
  }
  .code-version-item {
    background: #1f1f1f;
    border-color: #303030;
  }
  .code-version-item__main {
    strong { color: rgba(255, 255, 255, 0.88); }
    span, small { color: rgba(255, 255, 255, 0.52); }
  }
  .code-version-preview {
    border-color: #303030;
  }
  .code-version-preview__head {
    background: #1f1f1f;
    border-color: #303030;
    strong { color: rgba(255, 255, 255, 0.88); }
  }
  .ide-param-drawer__hero {
    background:
      radial-gradient(circle at 14% 10%, color-mix(in srgb, var(--primary-color, #1890ff) 22%, transparent), transparent 34%),
      linear-gradient(135deg, #1f1f1f, #171717);
    border-color: color-mix(in srgb, var(--primary-color, #1890ff) 24%, #303030);
    span { color: rgba(255, 255, 255, 0.48); }
    strong { color: rgba(255, 255, 255, 0.9); }
  }
  .ide-param-item {
    background: #1f1f1f;
    border-color: #303030;
    box-shadow: none;
  }
  .ide-param-item__head strong {
    color: rgba(255, 255, 255, 0.88);
  }
  .ide-param-item__desc {
    color: rgba(255, 255, 255, 0.56);
  }
  .ide-param-item__meta {
    color: rgba(255, 255, 255, 0.42);
    b { color: rgba(255, 255, 255, 0.78); }
  }
  .ide-param-drawer__footer {
    background: rgba(20, 20, 20, 0.94);
    border-color: #303030;
  }
  .ide-param-trigger.ant-btn-default {
    background: #262626;
    border-color: #434343;
    color: rgba(255, 255, 255, 0.82);
  }
  .ide-toolbar-group {
    background: rgba(255, 255, 255, 0.04);
    border-color: #363636;
    box-shadow: none;
  }
  .ide-toolbar-label { color: rgba(255, 255, 255, 0.45); }
  .tf-group ::v-deep .ant-radio-button-wrapper {
    background: #262626;
    border-color: #434343;
    color: rgba(255, 255, 255, 0.65);
  }
  .ide-left { background: #181818; border-right-color: #303030; }
  .ide-chart-fs-root {
    background: #141414;
    border-bottom-color: #303030;
  }
  .ide-quick-right--chart-fs {
    border-left-color: #303030;
  }
  .chart-panel {
    background: #141414;
    border-bottom-color: #303030;
    .chart-panel-toolbar {
      background: #1a1a1a;
      border-bottom-color: #303030;
    }
    .chart-panel-toolbar-title { color: rgba(255, 255, 255, 0.65); }
    .chart-panel-toolbar-controls .ide-toolbar-group {
      background: rgba(255, 255, 255, 0.04);
      border-color: #363636;
    }
    .chart-panel-toolbar-controls .ide-toolbar-label {
      color: rgba(255, 255, 255, 0.45);
    }
  }
  .chart-panel-qt-btn.ant-btn-default {
    background: #262626;
    border-color: #434343;
    color: rgba(255, 255, 255, 0.85);
    box-shadow: none;
    &:hover {
      border-color: var(--primary-color, #1890ff);
      color: var(--primary-color, #1890ff);
    }
  }
  .ide-quick-right {
    background: #141414;
    border-left-color: #303030;
  }
  .ide-quick-panel-head {
    background: linear-gradient(180deg, #1f1f1f 0%, #1a1a1a 100%);
    border-bottom-color: #303030;
  }
  .ide-quick-panel-head-title {
    color: rgba(255, 255, 255, 0.92);
  }
  .ide-quick-panel-head-icon {
    color: var(--primary-color, #1890ff);
  }
  .ide-quick-panel-close {
    color: rgba(255, 255, 255, 0.45) !important;
    &:hover {
      color: rgba(255, 255, 255, 0.88) !important;
    }
  }
  .ide-quick-panel-body {
    ::v-deep .qt-embedded-split--cols .qt-embedded-col-right {
      border-top-color: #303030;
    }
  }
  .ide-tuning-launch-header {
    background: #1f1f1f;
    border-color: #303030;
  }
  .ide-tuning-launch-icon {
    background: var(--primary-color-soft, rgba(24, 144, 255, 0.12));
    color: var(--primary-color, #1890ff);
    border-color: var(--primary-color-ring, rgba(24, 144, 255, 0.25));
  }
  .ide-tuning-launch-title { color: rgba(255, 255, 255, 0.88); }
  .ide-tuning-launch-subtitle { color: rgba(255, 255, 255, 0.45); }
  .ide-tuning-method-card {
    background: #1f1f1f;
    border-color: #303030;
    &:hover { border-color: var(--primary-color, #1890ff); }
  }
  .ide-tuning-method-card--ai {
    /* Inherit base dark card style. */
  }
  .ide-tuning-method-icon {
    color: rgba(255, 255, 255, 0.65);
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.1);
  }
  .ide-tune-method-badge {
    color: rgba(255, 255, 255, 0.65);
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.12);
  }
  .ide-tuning-method-name { color: rgba(255, 255, 255, 0.85); }
  .ide-tuning-method-desc { color: rgba(255, 255, 255, 0.45); }
  .ai-optimize-card-inner {
    background: linear-gradient(135deg, var(--primary-color-soft, rgba(24, 144, 255, 0.1)) 0%, rgba(114, 46, 209, 0.06) 100%);
    border-color: var(--primary-color-ring, rgba(24, 144, 255, 0.2));
  }
  .ai-optimize-card-title { color: rgba(255, 255, 255, 0.88); }
  .ai-optimize-card-desc { color: rgba(255, 255, 255, 0.45); }
  .panel-title { color: rgba(255,255,255,0.85); border-bottom-color: #303030; &:hover { background: rgba(255,255,255,0.04); } }
  .ai-gen-panel { border-top-color: #303030; }
  .ai-gen-header { color: rgba(255,255,255,0.85); &:hover { background: rgba(255,255,255,0.04); } }
  .code-ai-overlay { background: rgba(20,20,20,0.82); }
  .code-ai-overlay-inner { color: var(--primary-color, #1890ff); }
  .code-ai-overlay-dots .dot { background: var(--primary-color, #1890ff); }
  .code-ai-overlay-tip { color: rgba(255,255,255,0.45); }
  .params-scroll { &::-webkit-scrollbar-thumb { background: #434343; } }
  .param-section { border-bottom-color: #303030; }
  .param-label { color: rgba(255,255,255,0.78); }
  .field-label { color: rgba(255,255,255,0.58); }
  .result-tabs ::v-deep .ant-tabs-bar {
    background: linear-gradient(180deg, #1f1f1f 0%, #181818 100%);
    border-color: #303030;
    border-bottom: none;
  }
  .result-tabs ::v-deep .ant-tabs-tab {
    color: rgba(255, 255, 255, 0.55) !important;
  }
  .result-tabs ::v-deep .ant-tabs-tab-active {
    background: #1a1a1a !important;
    color: var(--primary-color, #1890ff) !important;
    border-color: #303030 !important;
  }
  .result-tabs ::v-deep .ant-tabs-content {
    background: linear-gradient(180deg, #1a1a1a 0%, #141414 100%);
    border-color: #303030;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
    &::-webkit-scrollbar-thumb { background: #434343; }
  }
  .result-split-panel,
  .backtest-overview-head,
  .eq-section--hero,
  .backtest-quality-strip,
  .backtest-quality-chip,
  .benchmark-summary-card,
  .trades-section--workbench,
  .diagnostics-section,
  .diagnostic-card {
    background: #1f1f1f;
    border-color: #303030;
  }
  .backtest-overview-title,
  .diagnostic-card-body strong,
  .backtest-quality-chip strong,
  .benchmark-summary-card strong,
  .optimizer-step-title {
    color: rgba(255, 255, 255, 0.88);
  }
  .backtest-quality-strip__title,
  .backtest-quality-chip {
    color: rgba(255, 255, 255, 0.62);
  }
  .backtest-quality-chip--good,
  .backtest-quality-chip--good strong { color: #3fb950; }
  .backtest-quality-chip--warn,
  .backtest-quality-chip--warn strong { color: #f59e0b; }
  .backtest-quality-chip--danger,
  .backtest-quality-chip--danger strong { color: #ff7b72; }
  .backtest-quality-chip--neutral,
  .backtest-quality-chip--neutral strong { color: rgba(255, 255, 255, 0.55); }
  .backtest-overview-desc,
  .optimizer-step-desc,
  .diagnostic-card-body small,
  .benchmark-summary-card span {
    color: rgba(255, 255, 255, 0.48);
  }
  .diagnostic-card-body span {
    color: rgba(255, 255, 255, 0.58);
  }
  .optimizer-workflow-step--method {
    border-top-color: #303030;
  }
  .params-card {
    background: #1f1f1f;
    border-color: #303030;
    box-shadow: 0 10px 26px rgba(0, 0, 0, 0.35);
  }
  .params-card-header,
  .workbench-panel-header {
    background: linear-gradient(135deg, var(--primary-color-soft, rgba(24, 144, 255, 0.12)) 0%, color-mix(in srgb, var(--primary-color, #1890ff) 4%, transparent) 100%);
    border-bottom-color: #303030;
    &:hover {
      background: linear-gradient(135deg, color-mix(in srgb, var(--primary-color, #1890ff) 16%, transparent) 0%, color-mix(in srgb, var(--primary-color, #1890ff) 6%, transparent) 100%);
    }
  }
  .workbench-panel-header:hover {
    background: linear-gradient(135deg, var(--primary-color-soft, rgba(24, 144, 255, 0.12)) 0%, color-mix(in srgb, var(--primary-color, #1890ff) 4%, transparent) 100%);
  }
  .params-card-title,
  .workbench-panel-title {
    color: rgba(255,255,255,0.88);
    .anticon,
    ::v-deep .anticon {
      color: var(--primary-color, #1890ff);
    }
  }
  .workbench-panel-meta { color: rgba(255, 255, 255, 0.45); }
  .workbench-panel-body { background: #1a1a1a; }
  .param-section {
    background: #1a1a1a;
    border-color: #333;
    box-shadow: none;
  }
  .param-label { color: rgba(255, 255, 255, 0.78); }
  .date-presets ::v-deep .ant-btn-sm {
    border-color: #434343;
    color: rgba(255, 255, 255, 0.65);
    background: #262626;
  }
  .date-presets ::v-deep .ant-btn-primary,
  .date-presets ::v-deep .ant-btn-primary:hover,
  .date-presets ::v-deep .ant-btn-primary:focus,
  .date-presets ::v-deep .ant-btn-primary:active {
    color: #fff;
  }
  .params-card-actions > .anticon {
    color: rgba(255, 255, 255, 0.55);
    &:hover { color: rgba(255, 255, 255, 0.88); }
  }
  .param-strategy-hint { color: rgba(255, 255, 255, 0.45); }
  .strategy-directives-card {
    background: #1a1a1a;
    border-color: #303030;
  }
  .strategy-directives-empty { color: rgba(255, 255, 255, 0.45); }
  .strategy-directive-row {
    &:hover { background: var(--primary-color-soft, rgba(24, 144, 255, 0.12)); }
    &.is-set { color: rgba(255, 255, 255, 0.88); }
  }
  .strategy-directive-label { color: rgba(255, 255, 255, 0.55); }
  .strategy-directive-value {
    color: rgba(255, 255, 255, 0.92);
    &.is-empty { color: rgba(255, 255, 255, 0.35); }
  }
  .strategy-directives-jump,
  .strategy-directives-doc-link {
    color: var(--primary-color, #1890ff);
    &:hover { color: var(--primary-color-hover, #40a9ff); }
  }
  .strategy-directives-alert {
    &.ant-alert-info {
      background: var(--primary-color-soft, rgba(24, 144, 255, 0.16)) !important;
      border-color: var(--primary-color-ring, rgba(24, 144, 255, 0.45)) !important;
    }
  }
  .strategy-directives-alert ::v-deep .ant-alert-message {
    color: rgba(255, 255, 255, 0.92) !important;
  }
  .strategy-directives-alert ::v-deep .ant-alert-description {
    color: rgba(255, 255, 255, 0.72) !important;
    div {
      color: rgba(255, 255, 255, 0.72) !important;
    }
  }
  .strategy-directives-alert ::v-deep .ant-alert-icon {
    color: var(--primary-color, #1890ff) !important;
  }
  .strategy-directives-alert ::v-deep .ant-alert-close-icon .anticon-close {
    color: rgba(255, 255, 255, 0.55) !important;
    &:hover { color: rgba(255, 255, 255, 0.88) !important; }
  }
  .strict-mode-card {
    border-color: rgba(250, 140, 22, 0.28);
    background: linear-gradient(165deg, rgba(250, 140, 22, 0.08) 0%, #1f1f1f 100%);
    &--on {
      border-color: var(--primary-color-ring, rgba(24, 144, 255, 0.35));
      background: linear-gradient(165deg, var(--primary-color-soft, rgba(24, 144, 255, 0.12)) 0%, #1f1f1f 100%);
      box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--primary-color, #1890ff) 8%, transparent);
    }
  }
  .strict-mode-card__title { color: rgba(255, 255, 255, 0.88); }
  .strict-mode-card__hint { color: rgba(255, 255, 255, 0.55); }
  .direction-radio-group ::v-deep .ant-radio-button-wrapper {
    background: #262626;
    border-color: #434343 !important;
    color: rgba(255, 255, 255, 0.55);
    &:hover {
      color: rgba(255, 255, 255, 0.85);
      border-color: #555 !important;
    }
  }
  .ide-guide-bar {
    background: #1a1a1a;
    border-bottom-color: #303030;
    color: rgba(255, 255, 255, 0.45);
    > .anticon { color: rgba(255, 255, 255, 0.3); }
  }
  .ide-guide-link {
    color: var(--primary-color, #1890ff);
    background: var(--primary-color-soft, rgba(24, 144, 255, 0.1));
    border-color: var(--primary-color-ring, rgba(24, 144, 255, 0.25));
    &:hover {
      color: #fff;
      background: var(--primary-color-active, #177ddc);
      border-color: var(--primary-color-active, #177ddc);
    }
  }
  .ai-helper-tip, .publish-form .publish-hint { color: rgba(255,255,255,0.45); }
  .code-quality-panel { border-top-color: #303030; }
  .code-quality-title { color: rgba(255,255,255,0.78); }
  .code-quality-list { color: rgba(255,255,255,0.55); }
  .ai-debug-card {
    border-color: #303030; background: #1f1f1f;
  }
  .ai-debug-card--success { border-color: rgba(82, 196, 26, 0.25); }
  .ai-debug-card--warning { border-color: rgba(250, 140, 22, 0.3); }
  .ai-debug-card__header { background: linear-gradient(135deg, color-mix(in srgb, var(--primary-color, #1890ff) 8%, transparent) 0%, transparent 100%); border-bottom-color: #303030; }
  .ai-debug-card--success .ai-debug-card__header { background: linear-gradient(135deg, rgba(82, 196, 26, 0.08) 0%, transparent 100%); }
  .ai-debug-card--warning .ai-debug-card__header { background: linear-gradient(135deg, rgba(250, 140, 22, 0.08) 0%, transparent 100%); }
  .ai-debug-card__badge { background: color-mix(in srgb, var(--primary-color, #1890ff) 15%, transparent); }
  .ai-debug-card--success .ai-debug-card__badge { background: rgba(82, 196, 26, 0.15); }
  .ai-debug-card--warning .ai-debug-card__badge { background: rgba(250, 140, 22, 0.15); }
  .ai-debug-card__title { color: rgba(255,255,255,0.9); }
  .ai-debug-card__dismiss { color: rgba(255,255,255,0.3); &:hover { color: rgba(255,255,255,0.7); background: rgba(255,255,255,0.06); } }
  .ai-debug-chip { background: var(--primary-color-soft, rgba(24, 144, 255, 0.12)); }
  .ai-debug-chip--success { background: rgba(82, 196, 26, 0.12); }
  .ai-debug-chip--warning { background: rgba(250, 140, 22, 0.12); }
  .ai-debug-card__body, .ai-debug-card__item { color: rgba(255,255,255,0.65); }
  .ai-debug-card__group-label { color: #73d13d; }
  .ai-debug-card__group--remaining .ai-debug-card__group-label { color: #ffa940; }
  .quality-hint--error { color: #ff7875; }
  .quality-hint--warn { color: #ffc069; }
  .quality-hint--info { color: #69c0ff; }
  .result-running { .running-time { color: var(--primary-color-active, #177ddc); } .running-tip { color: rgba(255,255,255,0.45); } }
  .result-empty { p { color: rgba(255,255,255,0.45); } }
  .result-data {
    .metric-card {
      background: linear-gradient(165deg, #262626 0%, #1a1a1a 100%);
      border-color: #363636;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
      &:hover {
        box-shadow: 0 6px 18px var(--primary-color-ring, rgba(24, 144, 255, 0.18));
        border-color: var(--primary-color-ring, rgba(24, 144, 255, 0.35));
      }
      .metric-label { color: rgba(255, 255, 255, 0.5); }
      .metric-value { color: rgba(255, 255, 255, 0.9); }
      &.positive .metric-value { color: #49aa19; }
      &.negative .metric-value { color: #d32029; }
    }
  }
  .experiment-hero,
  .experiment-feature-card,
  .experiment-best-card,
  .experiment-ranking-card,
  .experiment-stage-card,
  .experiment-candidate-card,
  .experiment-detail-card,
  .experiment-segment-card { background: #1f1f1f; border-color: #303030; }
  .experiment-regime-title,
  .experiment-section-title,
  .experiment-stage-title,
  .experiment-candidate-name,
  .experiment-segment-title { color: rgba(255,255,255,0.88); }
  .experiment-hint,
  .experiment-grade,
  .experiment-kicker,
  .experiment-candidate-source,
  .experiment-detail-source,
  .experiment-segment-time,
  .experiment-detail-block-title,
  .experiment-detail-block-hint,
  .experiment-change-before { color: rgba(255,255,255,0.45); }
  .experiment-segment-title span { color: rgba(255,255,255,0.45); }
  .experiment-stage-card.is-done { background: var(--primary-color-soft, rgba(23, 125, 220, 0.12)); border-color: var(--primary-color-ring, rgba(23, 125, 220, 0.3)); }
  .experiment-stage-index { background: var(--primary-color-soft-strong, rgba(23, 125, 220, 0.16)); color: var(--primary-color, #1890ff); }
  .experiment-detail-actions ::v-deep .ant-btn-default,
  .experiment-best-actions ::v-deep .ant-btn-default {
    background: #181818;
    border-color: #434343;
    color: rgba(255,255,255,0.72);
    &:hover {
      border-color: var(--primary-color-active, #177ddc);
      color: var(--primary-color-active, #177ddc);
    }
  }
  .experiment-best-metric {
    background: #181818;
    border-color: #303030;
    span { color: rgba(255,255,255,0.45); }
    strong { color: rgba(255,255,255,0.88); }
  }
  .experiment-best-card.is-overfit {
    border-color: #a8071a;
    box-shadow: 0 0 0 1px rgba(245, 34, 45, 0.25);
  }
  .experiment-best-panel {
    background: #141414;
    border-color: #303030;
  }
  .experiment-best-panel.panel-overfit {
    background: rgba(168, 7, 26, 0.12);
    border-color: #a8071a;
  }
  .experiment-best-panel-title { color: rgba(255,255,255,0.78); }
  .experiment-best-panel-range { color: rgba(255,255,255,0.45); }
  .experiment-best-degrade { color: #ff7875; }
  .experiment-best-oos-na { color: rgba(255,255,255,0.45); }
  .experiment-detail-metric,
  .experiment-component-card {
    background: #181818;
    border-color: #303030;
    span { color: rgba(255,255,255,0.45); }
    strong { color: rgba(255,255,255,0.88); }
  }
  .experiment-change-item {
    background: #181818;
    border-color: #303030;
  }
  .experiment-change-name,
  .experiment-change-after {
    color: rgba(255,255,255,0.88);
  }
  .experiment-change-arrow {
    color: var(--primary-color, #1890ff);
  }
  .experiment-candidate-card.active {
    border-color: var(--primary-color, #1890ff);
    box-shadow: 0 0 0 2px var(--primary-color-ring, rgba(23, 125, 220, 0.14));
    background: var(--primary-color-soft, rgba(23, 125, 220, 0.08));
  }
  .experiment-candidate-card:hover { border-color: var(--primary-color-ring, rgba(23, 125, 220, 0.45)); background: var(--primary-color-soft, rgba(23, 125, 220, 0.04)); }
  .experiment-candidate-score { color: var(--primary-color, #1890ff); }
  .experiment-candidate-stats { color: rgba(255,255,255,0.65); }
  .experiment-candidate-oos {
    background: linear-gradient(135deg, rgba(82, 196, 26, 0.14) 0%, var(--primary-color-soft, rgba(24, 144, 255, 0.1)) 100%);
    border-color: rgba(82, 196, 26, 0.3);
    color: #95de64;
    &.is-overfit {
      background: linear-gradient(135deg, rgba(245, 34, 45, 0.18) 0%, rgba(250, 140, 22, 0.1) 100%);
      border-color: rgba(245, 34, 45, 0.32);
      color: #ffa39e;
    }
  }
  .experiment-lab {
    background: linear-gradient(180deg, #1a1a1a 0%, #141414 100%);
    border-color: #303030;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
  }
  .experiment-lab-subtitle {
    color: rgba(255, 255, 255, 0.48);
  }
  .experiment-audit-card {
    background: #1f1f1f;
    border-color: #303030;
    i { color: var(--primary-color, #1890ff); }
    span,
    small { color: rgba(255, 255, 255, 0.48); }
    strong { color: rgba(255, 255, 255, 0.88); }
  }
  .experiment-analytics-card {
    background: linear-gradient(165deg, #1f1f1f 0%, #181818 100%);
    border-color: #303030;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.32);
  }
  .experiment-analytics-head i { color: var(--primary-color, #1890ff); }
  .experiment-analytics-title { color: rgba(255, 255, 255, 0.88); }
  .experiment-analytics-sub { color: rgba(255, 255, 255, 0.45); }

  .ide-tune-method-badge {
    color: #b37feb;
    background: linear-gradient(135deg, rgba(114, 46, 209, 0.22) 0%, rgba(82, 196, 26, 0.14) 100%);
    border-color: rgba(114, 46, 209, 0.35);
  }
  .ide-tune-method-badge--ai {
    /* Inherit the neutral badge style. */
  }
  .ide-tune-ai-feature {
    color: rgba(255, 255, 255, 0.75);
    i { color: var(--primary-color, #1890ff); }
  }
  .ide-tune-method-meta--ai {
    /* Inherit the base meta style. */
  }
  .ide-tune-run-btn--ai {
    /* Use the default Ant Design primary blue. */
  }
  .ide-tune-pill {
    background: #1f1f1f;
    border-color: #434343;
    color: rgba(255, 255, 255, 0.7);
    i { color: rgba(255, 255, 255, 0.4); }
    &:hover:not(:disabled) {
      color: var(--primary-color, #1890ff);
      border-color: var(--primary-color, #1890ff);
      i { color: var(--primary-color, #1890ff); }
    }
    &.active {
      color: #fff;
      background: var(--primary-color, #1890ff);
      border-color: var(--primary-color, #1890ff);
      i { color: #fff; }
    }
  }
  .ide-tune-pill--ai:not(.active) {
    background: var(--primary-color-soft, rgba(88, 166, 255, 0.08));
    border-color: var(--primary-color-ring, rgba(88, 166, 255, 0.32));
    color: var(--primary-color, #1890ff);
    i { color: var(--primary-color, #1890ff); }
  }
  .ide-tune-method-meta {
    border-top-color: rgba(255, 255, 255, 0.08);
  }
  .ide-tune-method-meta-hint {
    color: rgba(255, 255, 255, 0.55);
  }
  .ide-tune-dimensions {
    background: rgba(255, 255, 255, 0.03);
    border-color: rgba(255, 255, 255, 0.08);
  }
  .ide-tune-dimensions-summary-label {
    color: rgba(255, 255, 255, 0.85);
    i { color: var(--primary-color, #1890ff); }
  }
  .ide-tune-dim-stat { color: rgba(255, 255, 255, 0.6); }
  .ide-tune-dim-stat-cap { color: rgba(255, 255, 255, 0.4); }
  .ide-tune-dim-stat-num { color: rgba(255, 255, 255, 0.92); }
  .ide-tune-dim-stat-sep,
  .ide-tune-dim-stat-total { color: rgba(255, 255, 255, 0.55); }
  .ide-tune-dim-stat--cartesian .ide-tune-dim-stat-num { color: #ffa940; }
  .ide-tune-dim-stat--budget .ide-tune-dim-stat-num { color: var(--primary-color, #1890ff); }
  .ide-tune-dimensions-warning {
    background: linear-gradient(90deg, rgba(250, 173, 20, 0.14), rgba(250, 173, 20, 0.05));
    border-color: rgba(250, 173, 20, 0.35);
    color: #fbbf24;
    i { color: #fbbf24; }
  }
  .ide-tune-dimensions-empty { color: rgba(255, 255, 255, 0.4); }
  .ide-tune-dim-row {
    &:hover { background: var(--primary-color-soft, rgba(88, 166, 255, 0.08)); }
  }
  .ide-tune-dim-label { color: rgba(255, 255, 255, 0.92); }
  .ide-tune-dim-count { color: rgba(255, 255, 255, 0.55); }
  .ide-tune-dim-values { color: rgba(255, 255, 255, 0.5); }
  .ide-tune-dim-badge--risk,
  .ide-tune-dim-badge--leverage {
    background: var(--primary-color-soft-strong, rgba(88, 166, 255, 0.14));
    color: var(--primary-color, #1890ff);
  }
  .ide-tune-dim-badge--position {
    background: rgba(82, 196, 26, 0.16);
    color: #6fcf7f;
  }
  .ide-tune-dim-badge--indicator_declared {
    background: rgba(179, 127, 235, 0.18);
    color: #d3adf7;
  }
  .ide-tune-dim-badge--indicator_inferred {
    background: rgba(250, 173, 20, 0.18);
    color: #fbbf24;
  }
  .ide-tune-dimensions-tip {
    color: rgba(255, 255, 255, 0.4);
    i { color: #fbbf24; }
    code {
      background: rgba(255, 255, 255, 0.08);
      color: rgba(255, 255, 255, 0.88);
    }
  }
  .experiment-feature-card {
    .metric-label { color: rgba(255,255,255,0.45); }
    .metric-value { color: rgba(255,255,255,0.88); }
  }
  .experiment-score { color: var(--primary-color, #1890ff); }
  .experiment-best-summary .experiment-best-metric {
    border: 1px solid #303030;
  }
  .experiment-overview-grid {
    .experiment-feature-card { border-color: #303030; }
  }
  .experiment-segment-dot { background: var(--primary-color, #1890ff); }
  .exp-table-source { color: rgba(255,255,255,0.35); }
  .exp-table-score { color: var(--primary-color, #1890ff); }
  .exp-table-name { color: rgba(255,255,255,0.88); }
  .experiment-ranking-actions { border-top-color: #303030; }
  .experiment-ranking-card ::v-deep .ant-table-wrapper,
  .experiment-ranking-card ::v-deep .ant-table,
  .experiment-ranking-card ::v-deep .ant-table-content,
  .experiment-ranking-card ::v-deep .ant-table-scroll,
  .experiment-ranking-card ::v-deep .ant-table-body,
  .experiment-ranking-card ::v-deep .ant-table table {
    background: #1f1f1f !important;
    border-color: #303030 !important;
  }
  .experiment-ranking-card ::v-deep .ant-table-content,
  .experiment-ranking-card ::v-deep .ant-table-scroll {
    border: 1px solid #303030 !important;
  }
  .experiment-ranking-card ::v-deep .ant-table-thead > tr > th,
  .experiment-ranking-card ::v-deep .ant-table-tbody > tr > td {
    border-color: #303030 !important;
    border-right-color: #303030 !important;
    border-bottom-color: #303030 !important;
  }
  .experiment-ranking-card ::v-deep .ant-table-thead > tr > th:first-child,
  .experiment-ranking-card ::v-deep .ant-table-tbody > tr > td:first-child {
    border-left-color: #303030 !important;
  }
  .experiment-ranking-card ::v-deep .ant-table-thead > tr:first-child > th {
    border-top-color: #303030 !important;
  }
  .experiment-ranking-card ::v-deep .experiment-ranking-row:hover > td {
    background: var(--primary-color-soft, rgba(24, 144, 255, 0.08)) !important;
  }
  .experiment-ranking-card ::v-deep .experiment-ranking-row.is-selected > td {
    background: var(--primary-color-soft-strong, rgba(24, 144, 255, 0.16)) !important;
  }
  .experiment-progress-bar { background: #1f1f1f; border-color: #303030; color: rgba(255,255,255,0.85); }
  .experiment-progress-header {
    color: rgba(255,255,255,0.85);
    .running-time { color: var(--primary-color, #1890ff); }
    ::v-deep .ant-spin-dot-item { background-color: var(--primary-color, #1890ff); }
  }
  .experiment-live-hint { color: rgba(255,255,255,0.45); }
  .experiment-round-badge { background: #303030; color: rgba(255,255,255,0.65); &.best { background: var(--primary-color-soft-strong, rgba(23, 125, 220, 0.15)); color: var(--primary-color, #1890ff); } }
  .experiment-round-card { background: #1f1f1f; border-color: #303030; &.best { border-color: var(--primary-color-ring, rgba(23, 125, 220, 0.35)); background: var(--primary-color-soft, rgba(23, 125, 220, 0.06)); } }
  .experiment-round-num { background: var(--primary-color-soft-strong, rgba(23, 125, 220, 0.15)); color: var(--primary-color, #1890ff); }
  .experiment-round-score { color: var(--primary-color, #1890ff); }
  .experiment-round-meta { color: rgba(255,255,255,0.35); }
  .experiment-reasoning { color: rgba(255,255,255,0.45); }
  .eq-title, .trades-title { color: rgba(255,255,255,0.85); .trades-count { color: rgba(255,255,255,0.45); } }
  .trades-table ::v-deep .ant-table-wrapper,
  .trades-table ::v-deep .ant-table,
  .trades-table ::v-deep .ant-table-content,
  .trades-table ::v-deep .ant-table-scroll,
  .trades-table ::v-deep .ant-table-body,
  .trades-table ::v-deep .ant-table table {
    background: #1f1f1f !important;
    border-color: #303030 !important;
  }
  .trades-table ::v-deep .ant-table-content,
  .trades-table ::v-deep .ant-table-scroll {
    border: 1px solid #303030 !important;
  }
  .trades-table ::v-deep .ant-table-thead > tr > th,
  .trades-table ::v-deep .ant-table-tbody > tr > td {
    border-color: #303030 !important;
    border-right-color: #303030 !important;
    border-bottom-color: #303030 !important;
  }
  .trades-table ::v-deep .ant-table-thead > tr > th:first-child,
  .trades-table ::v-deep .ant-table-tbody > tr > td:first-child {
    border-left-color: #303030 !important;
  }
  .trades-table ::v-deep .ant-table-thead > tr:first-child > th {
    border-top-color: #303030 !important;
  }
  .backtest-marker-legend {
    border-color: #303030;
    background: rgba(31, 31, 31, 0.85);
  }
  .backtest-marker-legend__item { color: rgba(255, 255, 255, 0.82); }
  .backtest-marker-legend__hint { color: rgba(255, 255, 255, 0.45); }
  .panel-title-actions ::v-deep .ant-btn:not(.ant-btn-primary) {
    background: #1f1f1f;
    border-color: #434343;
    color: rgba(255, 255, 255, 0.65);
    &:hover:not([disabled]) {
      border-color: var(--primary-color-active, #177ddc);
      color: var(--primary-color-active, #177ddc);
    }
  }
  .code-editor-area {
    &::-webkit-scrollbar-thumb { background: #434343; }
    ::v-deep .CodeMirror-vscrollbar,
    ::v-deep .CodeMirror-hscrollbar {
      &::-webkit-scrollbar-thumb { background: #434343; }
    }
  }
  .result-panel {
    &::-webkit-scrollbar-thumb { background: #434343; }
  }

  ::v-deep .ant-tabs-bar { border-bottom-color: #303030; }
  ::v-deep .ant-tabs-tab { color: rgba(255,255,255,0.55); &:hover { color: rgba(255,255,255,0.85); } }
  ::v-deep .ant-tabs-tab-active { color: var(--primary-color-active, #177ddc) !important; }
  ::v-deep .ant-tabs-ink-bar { background: var(--primary-color-active, #177ddc); }
  ::v-deep .ant-select .ant-select-selection {
    background: #1f1f1f; border-color: #434343; color: rgba(255,255,255,0.85);
    .ant-select-arrow { color: rgba(255,255,255,0.45); }
    &:hover { border-color: var(--primary-color-active, #177ddc); }
  }
  ::v-deep .ant-select-selection__placeholder { color: rgba(255,255,255,0.35); }
  ::v-deep .ant-input, ::v-deep .ant-input-number { background: #1f1f1f; border-color: #434343; color: rgba(255,255,255,0.85); &:focus, &:hover { border-color: var(--primary-color-active, #177ddc); } }
  ::v-deep .ant-input-number-handler-wrap { background: #1f1f1f; border-left-color: #434343; }
  ::v-deep .ant-input-number-handler { color: rgba(255,255,255,0.45); &:hover { color: var(--primary-color-active, #177ddc); } }
  ::v-deep .ant-calendar-picker-input { background: #1f1f1f; border-color: #434343; color: rgba(255,255,255,0.85); }
  ::v-deep .ant-calendar-picker-icon { color: rgba(255,255,255,0.45); }
  ::v-deep .ant-radio-button-wrapper {
    background: #1f1f1f; border-color: #434343; color: rgba(255,255,255,0.65);
    &:hover { color: var(--primary-color-active, #177ddc); }
    &.ant-radio-button-wrapper-checked { background: var(--primary-color-active, #177ddc); border-color: var(--primary-color-active, #177ddc); color: #fff; }
  }
  ::v-deep .ant-checkbox-wrapper { color: rgba(255,255,255,0.85); }
  ::v-deep .ant-checkbox-inner { background: #1f1f1f; border-color: #434343; }
  ::v-deep .ant-btn-default { background: #1f1f1f; border-color: #434343; color: rgba(255,255,255,0.65); &:hover { border-color: var(--primary-color-active, #177ddc); color: var(--primary-color-active, #177ddc); } }
  ::v-deep .ant-table {
    background: transparent; color: rgba(255,255,255,0.85);
    .ant-table-thead > tr > th { background: rgba(255,255,255,0.04); color: rgba(255,255,255,0.65); border-bottom-color: #303030; }
    .ant-table-tbody > tr > td { border-bottom-color: #303030; }
    .ant-table-tbody > tr:hover > td { background: rgba(255,255,255,0.04); }
    .ant-table-placeholder { background: transparent; color: rgba(255,255,255,0.35); }
  }
  ::v-deep .ant-table-bordered {
    .ant-table-content,
    .ant-table-body,
    .ant-table-fixed-left table,
    .ant-table-fixed-right table {
      border-color: #303030;
    }
    .ant-table-thead > tr > th,
    .ant-table-tbody > tr > td {
      border-right-color: #303030;
    }
    .ant-table-tbody > tr > td {
      border-bottom-color: #303030;
    }
  }
  ::v-deep .ant-pagination {
    .ant-pagination-item { background: #1f1f1f; border-color: #434343; a { color: rgba(255,255,255,0.65); } &.ant-pagination-item-active { border-color: var(--primary-color-active, #177ddc); a { color: var(--primary-color-active, #177ddc); } } }
    .ant-pagination-prev, .ant-pagination-next { .ant-pagination-item-link { background: #1f1f1f; border-color: #434343; color: rgba(255,255,255,0.45); } }
  }
  ::v-deep .ant-empty-description { color: rgba(255,255,255,0.35); }
}
</style>

<style lang="less">
body.dark .indicator-ide .strategy-directives-alert.ant-alert-info {
  background: var(--primary-color-soft-strong, rgba(23, 125, 220, 0.16)) !important;
  border-color: var(--primary-color-ring, rgba(88, 166, 255, 0.45)) !important;
}
body.dark .indicator-ide .strategy-directives-alert .ant-alert-message {
  color: rgba(255, 255, 255, 0.92) !important;
}
body.dark .indicator-ide .strategy-directives-alert .ant-alert-description,
body.dark .indicator-ide .strategy-directives-alert .ant-alert-description div {
  color: rgba(255, 255, 255, 0.72) !important;
}
body.dark .indicator-ide .strategy-directives-alert .ant-alert-icon {
  color: var(--primary-color, #1890ff) !important;
}
body.dark .indicator-ide .strategy-directives-alert .ant-alert-close-icon .anticon-close {
  color: rgba(255, 255, 255, 0.55) !important;
}

body.dark .indicator-ide .result-tabs .ant-tabs-bar {
  background: linear-gradient(180deg, #1f1f1f 0%, #181818 100%) !important;
  border-color: #303030 !important;
}
body.dark .indicator-ide .result-tabs .ant-tabs-content {
  background: linear-gradient(180deg, #1a1a1a 0%, #141414 100%) !important;
  border-color: #303030 !important;
}
body.dark .indicator-ide .result-tabs .ant-tabs-tab {
  color: rgba(255, 255, 255, 0.55) !important;
}
body.dark .indicator-ide .result-tabs .ant-tabs-tab-active {
  color: var(--primary-color, #1890ff) !important;
  background: #1a1a1a !important;
}
body.dark .ide-drawer-wrap .ant-drawer-content,
body.dark .ide-drawer-wrap--dark .ant-drawer-content {
  background: #141414;
}
body.dark .ide-drawer-wrap .ant-drawer-header,
body.dark .ide-drawer-wrap--dark .ant-drawer-header {
  background: #1f1f1f;
  border-bottom-color: #303030;
}
body.dark .ide-drawer-wrap .ant-drawer-title,
body.dark .ide-drawer-wrap--dark .ant-drawer-title,
body.dark .ide-drawer-wrap .ant-drawer-close,
body.dark .ide-drawer-wrap--dark .ant-drawer-close {
  color: rgba(255, 255, 255, 0.88);
}
body.dark .ide-drawer-wrap .ant-drawer-body,
body.dark .ide-drawer-wrap--dark .ant-drawer-body {
  color: rgba(255, 255, 255, 0.82);
}
body.dark .ide-drawer-wrap .code-version-toolbar,
body.dark .ide-drawer-wrap--dark .code-version-toolbar {
  color: rgba(255, 255, 255, 0.58);
}
body.dark .ide-drawer-wrap .code-version-item,
body.dark .ide-drawer-wrap--dark .code-version-item {
  background: #1f1f1f;
  border-color: #303030;
}
body.dark .ide-drawer-wrap .code-version-item__main strong,
body.dark .ide-drawer-wrap--dark .code-version-item__main strong {
  color: rgba(255, 255, 255, 0.88);
}
body.dark .ide-drawer-wrap .code-version-item__main span,
body.dark .ide-drawer-wrap--dark .code-version-item__main span,
body.dark .ide-drawer-wrap .code-version-item__main small,
body.dark .ide-drawer-wrap--dark .code-version-item__main small {
  color: rgba(255, 255, 255, 0.52);
}
body.dark .ide-drawer-wrap .code-version-preview,
body.dark .ide-drawer-wrap--dark .code-version-preview {
  border-color: #303030;
}
body.dark .ide-drawer-wrap .code-version-preview__head,
body.dark .ide-drawer-wrap--dark .code-version-preview__head {
  background: #1f1f1f;
  border-color: #303030;
}
body.dark .ide-drawer-wrap .code-version-preview__head strong,
body.dark .ide-drawer-wrap--dark .code-version-preview__head strong {
  color: rgba(255, 255, 255, 0.88);
}
body.dark .ide-drawer-wrap .code-version-item .ant-btn:not(.ant-btn-primary),
body.dark .ide-drawer-wrap--dark .code-version-item .ant-btn:not(.ant-btn-primary),
body.dark .ide-drawer-wrap .code-version-preview__head .ant-btn:not(.ant-btn-primary),
body.dark .ide-drawer-wrap--dark .code-version-preview__head .ant-btn:not(.ant-btn-primary),
body.dark .ide-drawer-wrap .code-version-toolbar .ant-btn:not(.ant-btn-primary),
body.dark .ide-drawer-wrap--dark .code-version-toolbar .ant-btn:not(.ant-btn-primary) {
  background: #1f1f1f;
  border-color: #434343;
  color: rgba(255, 255, 255, 0.68);
}
body.dark .ide-drawer-wrap .code-version-item .ant-btn:not(.ant-btn-primary):hover,
body.dark .ide-drawer-wrap--dark .code-version-item .ant-btn:not(.ant-btn-primary):hover,
body.dark .ide-drawer-wrap .code-version-preview__head .ant-btn:not(.ant-btn-primary):hover,
body.dark .ide-drawer-wrap--dark .code-version-preview__head .ant-btn:not(.ant-btn-primary):hover,
body.dark .ide-drawer-wrap .code-version-toolbar .ant-btn:not(.ant-btn-primary):hover,
body.dark .ide-drawer-wrap--dark .code-version-toolbar .ant-btn:not(.ant-btn-primary):hover {
  border-color: var(--primary-color-active, #177ddc);
  color: var(--primary-color-active, #177ddc);
}

.ide-publish-modal-wrap {
  .ant-modal-content {
    overflow: hidden;
    border-radius: 10px;
    background: #fff;
  }
  .ant-modal-header {
    padding: 18px 24px;
    border-bottom: 1px solid #edf0f5;
    background: linear-gradient(180deg, #ffffff 0%, #fafbfc 100%);
  }
  .ant-modal-title {
    font-size: 17px;
    font-weight: 800;
    color: #1f2937;
  }
  .ant-modal-close-x {
    width: 58px;
    height: 58px;
    line-height: 58px;
  }
  .ant-modal-body {
    padding: 18px 24px 20px;
    background: #f6f7f9;
  }
  .ant-modal-footer {
    padding: 14px 24px;
    border-top: 1px solid #edf0f5;
    background: #fff;
    .ant-btn {
      min-width: 88px;
      height: 34px;
      border-radius: 6px;
      font-weight: 700;
    }
    .ant-btn-primary {
      background: var(--primary-color, #1890ff);
      border-color: var(--primary-color, #1890ff);
    }
  }
  .publish-market-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
  .publish-summary-card {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 74px;
    padding: 14px;
    border: 1px solid var(--primary-color-ring, rgba(24, 144, 255, 0.18));
    border-radius: 10px;
    background: linear-gradient(135deg, var(--primary-color-soft, rgba(24, 144, 255, 0.08)) 0%, #fff 72%);
  }
  .publish-summary-icon {
    width: 42px;
    height: 42px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: #fff;
    background: var(--primary-color, #1890ff);
    box-shadow: 0 10px 24px var(--primary-color-ring, rgba(24, 144, 255, 0.25));
    font-size: 18px;
  }
  .publish-summary-main {
    flex: 1;
    min-width: 0;
  }
  .publish-summary-label {
    margin-bottom: 3px;
    font-size: 12px;
    font-weight: 700;
    color: #6b7280;
  }
  .publish-summary-name {
    overflow: hidden;
    color: #111827;
    font-size: 16px;
    font-weight: 800;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .publish-summary-tag {
    margin: 0;
    height: 24px;
    line-height: 22px;
    border-radius: 999px;
    font-weight: 700;
  }
  .publish-note {
    display: flex;
    align-items: flex-start;
    gap: 9px;
    padding: 10px 12px;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #fff;
    color: #4b5563;
    font-size: 13px;
    line-height: 1.55;
    .anticon {
      margin-top: 3px;
      color: var(--primary-color, #1890ff);
    }
  }
  .publish-section {
    padding: 14px;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    background: #fff;
  }
  .publish-section-title {
    margin-bottom: 10px;
    color: #1f2937;
    font-size: 13px;
    font-weight: 800;
  }
  .publish-pricing-group {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    width: 100%;
    .ant-radio-button-wrapper {
      height: 40px;
      line-height: 38px;
      padding: 0 14px;
      border: 1px solid #dfe3ea;
      border-radius: 8px !important;
      color: #4b5563;
      text-align: center;
      font-weight: 700;
      background: #fafafa;
      box-shadow: none;
      &::before {
        display: none;
      }
      .anticon {
        margin-right: 6px;
      }
      &:hover {
        color: var(--primary-color, #1890ff);
        border-color: var(--primary-color, #1890ff);
      }
      &.ant-radio-button-wrapper-checked {
        color: #fff;
        border-color: var(--primary-color, #1890ff);
        background: var(--primary-color, #1890ff);
        box-shadow: 0 8px 18px var(--primary-color-ring, rgba(24, 144, 255, 0.25));
      }
    }
  }
  .publish-price-box {
    margin-top: 12px;
  }
  .publish-price-input {
    width: 100%;
  }
  .publish-option-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }
  .publish-option-card {
    min-height: 112px;
    padding: 13px;
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    background: #fff;
    transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
    &.active {
      border-color: var(--primary-color, #1890ff);
      background: linear-gradient(135deg, var(--primary-color-soft, rgba(24, 144, 255, 0.08)) 0%, #fff 76%);
      box-shadow: inset 0 0 0 1px var(--primary-color-ring, rgba(24, 144, 255, 0.12));
    }
  }
  .publish-option-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    margin-bottom: 8px;
    color: #1f2937;
    font-size: 13px;
    font-weight: 800;
  }
  .publish-hint {
    margin-top: 0;
    color: #6b7280;
    font-size: 12px;
    line-height: 1.55;
  }
  .publish-description-input {
    min-height: 104px;
    resize: vertical;
  }
  .publish-unpublish-row {
    display: flex;
    justify-content: flex-start;
  }
}

body.dark .ide-publish-modal-wrap,
.ide-publish-modal-wrap.ide-modal-wrap--dark {
  .ant-modal-content {
    background: #181818;
    box-shadow: 0 18px 54px rgba(0, 0, 0, 0.55);
  }
  .ant-modal-header {
    border-bottom-color: #2a2a2a;
    background: linear-gradient(180deg, #202020 0%, #181818 100%);
  }
  .ant-modal-title {
    color: rgba(255, 255, 255, 0.9);
  }
  .ant-modal-body {
    background: #141414;
  }
  .ant-modal-footer {
    border-top-color: #2a2a2a;
    background: #181818;
  }
  .publish-summary-card {
    border-color: var(--primary-color-ring, rgba(255, 77, 79, 0.32));
    background: linear-gradient(135deg, color-mix(in srgb, var(--primary-color, #ff4d4f) 18%, #221719) 0%, #1c1c1c 72%);
  }
  .publish-summary-label {
    color: rgba(255, 255, 255, 0.52);
  }
  .publish-summary-name,
  .publish-section-title,
  .publish-option-head {
    color: rgba(255, 255, 255, 0.9);
  }
  .publish-note,
  .publish-section,
  .publish-option-card {
    border-color: #303030;
    background: #1f1f1f;
  }
  .publish-note {
    color: rgba(255, 255, 255, 0.66);
  }
  .publish-option-card.active {
    border-color: var(--primary-color, #ff4d4f);
    background: linear-gradient(135deg, color-mix(in srgb, var(--primary-color, #ff4d4f) 16%, #201a1a) 0%, #1f1f1f 78%);
    box-shadow: inset 0 0 0 1px var(--primary-color-ring, rgba(255, 77, 79, 0.22));
  }
  .publish-hint {
    color: rgba(255, 255, 255, 0.48);
  }
  .publish-pricing-group {
    .ant-radio-button-wrapper {
      border-color: #383838;
      color: rgba(255, 255, 255, 0.68);
      background: #181818;
      &:hover {
        color: var(--primary-color, #ff4d4f);
        border-color: var(--primary-color, #ff4d4f);
      }
      &.ant-radio-button-wrapper-checked {
        color: #fff;
        border-color: var(--primary-color, #ff4d4f);
        background: var(--primary-color, #ff4d4f);
      }
    }
  }
  .ant-input,
  .ant-input-number {
    background: #181818;
    border-color: #383838;
    color: rgba(255, 255, 255, 0.86);
  }
  .ant-input-number-input {
    color: rgba(255, 255, 255, 0.86);
  }
}

.ide-param-modal-wrap {
  .ant-modal-content {
    overflow: hidden;
    border-radius: 12px;
  }
  .ant-modal-body {
    padding: 18px;
  }
  .ide-param-drawer {
    gap: 14px;
  }
  .ide-param-drawer__hero {
    border-radius: 10px;
    align-items: center;
    .ant-tag {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      height: 28px;
      line-height: 26px;
      margin: 0;
      padding: 0 10px;
      border-radius: 7px;
      font-size: 12px;
      font-weight: 700;
    }
  }
  .ide-param-list {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
    max-height: ~"min(54vh, 520px)";
    overflow: auto;
    padding: 0 2px 2px;
  }
  .ide-param-item {
    min-width: 0;
  }
  .ide-param-item__head strong {
    max-width: 220px;
  }
  .ide-param-item__head .ant-tag {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    align-self: flex-start;
    flex-shrink: 0;
    min-width: 34px;
    height: 24px;
    line-height: 22px;
    margin: 0;
    padding: 0 8px;
    border-radius: 6px;
    font-size: 11px;
    font-weight: 700;
  }
  .ide-param-drawer__footer {
    position: static;
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
    margin: 2px 0 0;
    padding: 0;
    background: transparent;
    border-top: 0;
    backdrop-filter: none;
    .ant-btn {
      width: 100%;
      height: 32px;
      padding: 0 8px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }
}

@media (max-width: 860px) {
  .ide-param-modal-wrap {
    .ant-modal {
      max-width: calc(100vw - 24px);
    }
    .ide-param-list {
      grid-template-columns: 1fr;
      max-height: 56vh;
    }
    .ide-param-drawer__footer {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }
}

.ide-param-drawer-wrap.ide-drawer-wrap--dark,
.ide-param-modal-wrap.ide-modal-wrap--dark,
body.dark .ide-param-drawer-wrap,
body.dark .ide-param-modal-wrap {
  .ant-drawer-content {
    background: #141414;
  }
  .ant-modal-content {
    background: #141414;
    box-shadow: 0 18px 56px rgba(0, 0, 0, 0.62);
  }
  .ant-drawer-wrapper-body,
  .ant-drawer-body,
  .ant-modal-body {
    background: #141414;
    color: rgba(255, 255, 255, 0.82);
  }
  .ant-drawer-header,
  .ant-modal-header {
    background: #1f1f1f;
    border-bottom-color: #303030;
  }
  .ant-drawer-title,
  .ant-modal-title,
  .ant-drawer-close,
  .ant-modal-close {
    color: rgba(255, 255, 255, 0.88);
  }
  .ant-modal-close:hover {
    color: rgba(255, 255, 255, 0.92);
  }
  .ide-param-drawer__hero {
    background:
      radial-gradient(circle at 14% 8%, color-mix(in srgb, var(--primary-color, #1890ff) 22%, transparent), transparent 36%),
      linear-gradient(135deg, color-mix(in srgb, var(--primary-color, #1890ff) 8%, #202020), #151515);
    border-color: color-mix(in srgb, var(--primary-color, #1890ff) 26%, #303030);
    span { color: rgba(255, 255, 255, 0.48); }
    strong { color: rgba(255, 255, 255, 0.92); }
  }
  .ide-param-boundary.ant-alert-info {
    background: color-mix(in srgb, var(--primary-color, #1890ff) 11%, #181818);
    border-color: color-mix(in srgb, var(--primary-color, #1890ff) 28%, #303030);
    .ant-alert-message {
      color: rgba(255, 255, 255, 0.78);
    }
    .ant-alert-icon {
      color: var(--primary-color, #1890ff);
    }
  }
  .ide-param-empty .ant-empty-description {
    color: rgba(255, 255, 255, 0.45);
  }
  .ide-param-item {
    background: #1f1f1f;
    border-color: #303030;
    box-shadow: none;
  }
  .ide-param-item__head {
    strong { color: rgba(255, 255, 255, 0.9); }
    code {
      color: var(--primary-color, #1890ff);
      background: color-mix(in srgb, var(--primary-color, #1890ff) 16%, transparent);
    }
  }
  .ide-param-item__desc {
    color: rgba(255, 255, 255, 0.58);
  }
  .ide-param-item__meta {
    color: rgba(255, 255, 255, 0.42);
    b { color: rgba(255, 255, 255, 0.78); }
  }
  .ant-tag {
    background: rgba(255, 255, 255, 0.06);
    border-color: rgba(255, 255, 255, 0.12);
    color: rgba(255, 255, 255, 0.72);
  }
  .ant-input,
  .ant-input-number,
  .ant-select-selection {
    background: #141414;
    border-color: #3a3a3a;
    color: rgba(255, 255, 255, 0.86);
    &:hover,
    &:focus {
      border-color: var(--primary-color, #1890ff);
    }
  }
  .ant-input-number-input {
    color: rgba(255, 255, 255, 0.86);
  }
  .ant-input-number-handler-wrap {
    background: #1f1f1f;
    border-left-color: #3a3a3a;
  }
  .ant-input-number-handler {
    border-color: #3a3a3a;
    color: rgba(255, 255, 255, 0.45);
    &:hover {
      color: var(--primary-color, #1890ff);
    }
  }
  .ant-select-arrow,
  .ant-select-selection__placeholder {
    color: rgba(255, 255, 255, 0.45);
  }
  .ant-switch {
    background-color: rgba(255, 255, 255, 0.22);
  }
  .ant-switch-checked {
    background-color: var(--primary-color, #1890ff);
  }
  .ide-param-drawer__footer {
    background: transparent;
    border-top-color: transparent;
  }
  .ant-btn:not(.ant-btn-primary) {
    background: #1f1f1f;
    border-color: #3a3a3a;
    color: rgba(255, 255, 255, 0.72);
    &:hover,
    &:focus {
      border-color: var(--primary-color, #1890ff);
      color: var(--primary-color, #1890ff);
    }
  }
  .ant-btn-primary {
    background: var(--primary-color, #1890ff);
    border-color: var(--primary-color, #1890ff);
    color: #fff;
  }
  .ant-btn[disabled],
  .ant-btn[disabled]:hover,
  .ant-btn[disabled]:focus {
    background: #181818;
    border-color: #303030;
    color: rgba(255, 255, 255, 0.28);
  }
}

/* ===== Watchlist dropdown ===== */
.ide-watchlist-dropdown {
  .ant-select-dropdown-menu-item {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    font-size: 13px;
  }
  .wl-opt-tag {
    display: inline-block;
    font-size: 10px;
    font-weight: 600;
    line-height: 18px;
    padding: 0 6px;
    border-radius: 3px;
    flex-shrink: 0;
    color: #fff;
    letter-spacing: 0.3px;
  }
  .wl-mkt-crypto { background: #fa8c16; }
  .wl-mkt-usstock { background: var(--primary-color, #1890ff); }
  .wl-mkt-cnstock { background: #eb2f96; }
  .wl-mkt-hkstock { background: #f5222d; }
  .wl-mkt-forex { background: #52c41a; }
  .wl-mkt-futures { background: #722ed1; }
  .wl-opt-symbol {
    font-weight: 600;
    font-size: 13px;
    color: #333;
  }
  .wl-opt-name {
    color: #8c8c8c;
    font-size: 11px;
    flex-shrink: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .ant-select-dropdown-menu-item-selected {
    background: #e6f7ff;
    .wl-opt-symbol { color: var(--primary-color, #1890ff); }
  }
  .ant-select-dropdown-menu-item-active:not(.ant-select-dropdown-menu-item-selected) {
    background: #f5f5f5;
  }
}
.ide-indicator-multiselect-dropdown {
  z-index: 10050 !important;
  .ant-dropdown-menu {
    padding: 0;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  }
}
.ide-indicator-overlay {
  min-width: 260px;
  max-width: 420px;
  max-height: 320px;
  overflow: auto;
  padding: 8px 0;
  background: #fff;
}
.ide-indicator-overlay-hint {
  padding: 0 12px 8px;
  font-size: 11px;
  color: #8c8c8c;
  line-height: 1.4;
}
.ide-indicator-overlay-empty {
  padding: 12px;
  font-size: 12px;
  color: #8c8c8c;
}
.ide-indicator-overlay-list {
  padding: 0 4px;
}
.ide-indicator-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 8px;
  border-radius: 6px;
  &:hover {
    background: #f5f5f5;
  }
}
.ide-indicator-name {
  flex: 1;
  min-width: 0;
  font-size: 12px;
  cursor: pointer;
  color: #262626;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  &.active {
    color: var(--primary-color, #1890ff);
    font-weight: 600;
  }
}
.ide-indicator-purchased-tag {
  margin-left: 0;
  font-size: 10px;
  line-height: 16px;
  padding: 0 4px;
  flex-shrink: 0;
}
.ide-indicator-multiselect-dropdown--dark {
  .ant-dropdown-menu {
    background: #1f1f1f;
    border: 1px solid #363636;
  }
  .ide-indicator-overlay {
    background: #1f1f1f;
  }
  .ide-indicator-overlay-hint,
  .ide-indicator-overlay-empty {
    color: rgba(255, 255, 255, 0.45);
  }
  .ide-indicator-row:hover {
    background: rgba(255, 255, 255, 0.06);
  }
  .ide-indicator-name {
    color: rgba(255, 255, 255, 0.85);
    &.active {
      color: var(--primary-color, #1890ff);
    }
  }
}

.ide-watchlist-dropdown--dark {
  background: #1f1f1f;
  .ant-select-dropdown-menu-item {
    color: rgba(255,255,255,0.85);
  }
  .wl-opt-symbol { color: rgba(255,255,255,0.88); }
  .wl-opt-name { color: rgba(255,255,255,0.45); }
  .ant-select-dropdown-menu-item-selected {
    background: var(--primary-color-soft, rgba(24, 144, 255, 0.2));
    .wl-opt-symbol { color: var(--primary-color-active, #177ddc); }
  }
  .ant-select-dropdown-menu-item-active:not(.ant-select-dropdown-menu-item-selected) {
    background: rgba(255,255,255,0.06);
  }
}

.ide-modal-wrap--dark {
  .ant-modal-content { background: #1f1f1f; box-shadow: 0 8px 32px rgba(0,0,0,0.55); }
  .ant-modal-header { background: #1f1f1f; border-bottom-color: #303030; }
  .ant-modal-title { color: rgba(255,255,255,0.88); }
  .ant-modal-close { color: rgba(255,255,255,0.55); &:hover { color: rgba(255,255,255,0.88); } }
  .ant-modal-body { background: #1f1f1f; color: rgba(255,255,255,0.85); }
  .ant-modal-footer { background: #1f1f1f; border-top-color: #303030; }
  .ant-tabs-bar { border-bottom-color: #303030; }
  .ant-tabs-tab { color: rgba(255,255,255,0.55); &:hover { color: rgba(255,255,255,0.85); } }
  .ant-tabs-tab-active { color: var(--primary-color-active, #177ddc) !important; }
  .ant-input-search .ant-input { background: #1f1f1f; border-color: #434343; color: rgba(255,255,255,0.88); &:hover, &:focus { border-color: var(--primary-color-active, #177ddc); } }
  .ant-input-search-icon { color: rgba(255,255,255,0.45); }
  .ant-list-item { color: rgba(255,255,255,0.85); border-bottom-color: #303030; }
  .ant-list-item:hover { background: rgba(255,255,255,0.04); }
  .ant-input, .ant-input-number { background: #1f1f1f; border-color: #434343; color: rgba(255,255,255,0.85); &:focus, &:hover { border-color: var(--primary-color-active, #177ddc); } }
  .ant-input-number-handler-wrap { background: #1f1f1f; border-left-color: #434343; }
  .ant-input-number-handler { color: rgba(255,255,255,0.45); &:hover { color: var(--primary-color-active, #177ddc); } }
  .ant-radio-wrapper { color: rgba(255,255,255,0.85); }
  .ant-radio-inner { background: #1f1f1f; border-color: #434343; }
  .ant-radio-checked .ant-radio-inner { border-color: var(--primary-color-active, #177ddc); &::after { background-color: var(--primary-color-active, #177ddc); } }
  .ant-select-selection { background: #1f1f1f; border-color: #434343; color: rgba(255,255,255,0.85); }
  .ant-switch { background-color: rgba(255,255,255,0.2); }
  .ant-switch-checked { background-color: var(--primary-color-active, #177ddc); }
  .ant-alert-info { background: var(--primary-color-soft, rgba(24, 144, 255, 0.1)); border-color: var(--primary-color-ring, rgba(24, 144, 255, 0.3)); }
  .ant-alert-message { color: rgba(255,255,255,0.85); }
  .ant-alert-info .ant-alert-icon { color: var(--primary-color-active, #177ddc); }
  .ant-btn-default { background: #1f1f1f; border-color: #434343; color: rgba(255,255,255,0.65); &:hover { border-color: var(--primary-color-active, #177ddc); color: var(--primary-color-active, #177ddc); } }
  .ant-btn-primary { background: var(--primary-color-active, #177ddc); border-color: var(--primary-color-active, #177ddc); }
  .ant-btn-danger.ant-btn-background-ghost { border-color: #d32029; color: #d32029; &:hover { border-color: #ff4d4f; color: #ff4d4f; } }
  .field-label { color: rgba(255,255,255,0.58); }
  .publish-hint { color: rgba(255,255,255,0.45); }
  .editor-content { color: rgba(255,255,255,0.85); }
  .ant-row { color: rgba(255,255,255,0.85); }
}
</style>

<style lang="less">
.ide-add-source-row {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.ant-select-dropdown.ide-qt-select-dropdown {
  z-index: 10060 !important;
}
.ant-modal-wrap.profile-exchange-modal {
  z-index: 10070 !important;
}
.ant-select-dropdown.profile-exchange-select-dropdown,
.ant-select-dropdown.profile-exchange-select-dropdown-dark {
  z-index: 10080 !important;
}

@supports selector(:has(*)) {
  .ant-layout-content:has(.indicator-ide),
  .ant-pro-basicLayout-content:has(.indicator-ide) {
    margin: 0 !important;
    padding: 0 !important;
  }
}
</style>
