const locale = {
  'executorStrategies.section.capitalRisk': 'Strategy risk',
  'executorStrategies.baseOrder': 'Initial allocation weight',
  'executorStrategies.safetyOrder': 'Add-on allocation weight',
  'executorStrategies.summary.amount': 'Allocated weight',
  'executorStrategies.table.amount': 'Weight',
  'executorStrategies.dynamicAnchor': 'Anchor price levels at launch',
  'executorStrategies.dynamicAnchorHint': 'Price levels stay relative to the latest launch price. Capital and leverage are configured separately for each run.',
  'executorStrategies.lowerOffsetPct': 'Lower range distance (%)',
  'executorStrategies.upperOffsetPct': 'Upper range distance (%)',
  'trading-assistant.tradeReason.user_stop_and_close': 'Manually paused and closed',
  'trading-assistant.tradeReason.robot_take_profit': 'Robot take-profit exit',
  'trading-assistant.tradeReason.robot_hard_stop': 'Robot stop-loss exit',
  'trading-assistant.tradeReason.grid_initial': 'Grid initial entry',
  'trading-assistant.tradeReason.grid_level': 'Grid level entry',
  'trading-assistant.tradeReason.robot_level': 'Robot level entry'
}

const enUSFallback = locale

const zhCN = {
  ...enUSFallback,
  'executorStrategies.section.capitalRisk': '策略风控',
  'executorStrategies.baseOrder': '首单分配权重',
  'executorStrategies.safetyOrder': '补仓分配权重',
  'executorStrategies.summary.amount': '分配权重',
  'executorStrategies.table.amount': '权重',
  'executorStrategies.dynamicAnchor': '启动时按最新价格锚定',
  'executorStrategies.dynamicAnchorHint': '价格层级按启动时的最新价相对计算；资金和杠杆在每次运行时单独设置。',
  'executorStrategies.lowerOffsetPct': '下轨距离 (%)',
  'executorStrategies.upperOffsetPct': '上轨距离 (%)',
  'trading-assistant.tradeReason.user_stop_and_close': '手动暂停并平仓',
  'trading-assistant.tradeReason.robot_take_profit': '机器人止盈平仓',
  'trading-assistant.tradeReason.robot_hard_stop': '机器人止损平仓',
  'trading-assistant.tradeReason.grid_initial': '网格初始建仓',
  'trading-assistant.tradeReason.grid_level': '网格层级加仓',
  'trading-assistant.tradeReason.robot_level': '机器人层级加仓'
}

const zhTW = {
  ...enUSFallback,
  'executorStrategies.section.capitalRisk': '策略風控',
  'executorStrategies.baseOrder': '首單分配權重',
  'executorStrategies.safetyOrder': '補倉分配權重',
  'executorStrategies.summary.amount': '分配權重',
  'executorStrategies.table.amount': '權重',
  'executorStrategies.dynamicAnchor': '啟動時按最新價格錨定',
  'executorStrategies.dynamicAnchorHint': '價格層級按啟動時的最新價相對計算；資金和槓桿在每次運行時單獨設定。',
  'executorStrategies.lowerOffsetPct': '下軌距離 (%)',
  'executorStrategies.upperOffsetPct': '上軌距離 (%)',
  'trading-assistant.tradeReason.user_stop_and_close': '手動暫停並平倉',
  'trading-assistant.tradeReason.robot_take_profit': '機器人止盈平倉',
  'trading-assistant.tradeReason.robot_hard_stop': '機器人止損平倉',
  'trading-assistant.tradeReason.grid_initial': '網格初始建倉',
  'trading-assistant.tradeReason.grid_level': '網格層級加倉',
  'trading-assistant.tradeReason.robot_level': '機器人層級加倉'
}

export default {
  'en-US': locale,
  'ar-SA': enUSFallback,
  'de-DE': enUSFallback,
  'fr-FR': enUSFallback,
  'ja-JP': enUSFallback,
  'ko-KR': enUSFallback,
  'ru-RU': enUSFallback,
  'th-TH': enUSFallback,
  'vi-VN': enUSFallback,
  'zh-CN': zhCN,
  'zh-TW': zhTW
}
