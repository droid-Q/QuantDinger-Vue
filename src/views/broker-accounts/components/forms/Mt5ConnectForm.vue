<template>
  <a-form layout="vertical" class="broker-form">
    <a-alert
      type="warning"
      show-icon
      class="form-alert"
      :message="$t('brokerAccounts.mt5.localTitle')"
      :description="$t('brokerAccounts.mt5.localHint')"
    />
    <a-row :gutter="12">
      <a-col :xs="24" :md="8">
        <a-form-item :label="$t('brokerAccounts.mt5.login')">
          <a-input v-model="form.login" placeholder="12345678" :disabled="disabled" />
        </a-form-item>
      </a-col>
      <a-col :xs="24" :md="8">
        <a-form-item :label="$t('brokerAccounts.mt5.password')">
          <a-input-password
            v-model="form.password"
            :placeholder="$t('brokerAccounts.mt5.passwordPh')"
            :disabled="disabled"
            autocomplete="new-password"
          />
        </a-form-item>
      </a-col>
      <a-col :xs="24" :md="8">
        <a-form-item :label="$t('brokerAccounts.mt5.server')">
          <a-input
            v-model="form.server"
            placeholder="CPTMarkets-Demo / CPTMarkets-Live"
            :disabled="disabled"
          />
          <div class="field-help">{{ $t('brokerAccounts.mt5.serverHint') }}</div>
        </a-form-item>
      </a-col>
    </a-row>
    <a-row :gutter="12">
      <a-col :xs="24" :md="12">
        <a-form-item :label="$t('brokerAccounts.mt5.pathOptional')">
          <a-input v-model="form.path" placeholder="C:\\Program Files\\MetaTrader 5\\terminal64.exe" :disabled="disabled" />
        </a-form-item>
      </a-col>
      <a-col :xs="24" :md="4">
        <a-form-item :label="$t('brokerAccounts.mt5.timeout')">
          <a-input-number v-model="form.timeout" :min="1000" :max="180000" :disabled="disabled" style="width: 100%" />
        </a-form-item>
      </a-col>
      <a-col :xs="12" :md="4">
        <a-form-item :label="$t('brokerAccounts.mt5.symbolPrefix')">
          <a-input v-model="form.symbolPrefix" placeholder="" :disabled="disabled" />
        </a-form-item>
      </a-col>
      <a-col :xs="12" :md="4">
        <a-form-item :label="$t('brokerAccounts.mt5.symbolSuffix')">
          <a-input v-model="form.symbolSuffix" placeholder=".m" :disabled="disabled" />
        </a-form-item>
      </a-col>
    </a-row>
    <div class="form-actions">
      <a-button type="primary" :loading="loading" :disabled="!canSubmit || disabled" @click="submit">
        <a-icon type="link" /> {{ $t('brokerAccounts.connect') }}
      </a-button>
    </div>
  </a-form>
</template>

<script>
export default {
  name: 'Mt5ConnectForm',
  props: {
    broker: { type: Object, required: true },
    disabled: { type: Boolean, default: false },
    loading: { type: Boolean, default: false }
  },
  data () {
    return {
      form: {
        login: '',
        password: '',
        server: '',
        path: '',
        timeout: 60000,
        symbolPrefix: '',
        symbolSuffix: ''
      }
    }
  },
  computed: {
    canSubmit () {
      return !!(
        String(this.form.login || '').trim() &&
        String(this.form.password || '').trim() &&
        String(this.form.server || '').trim()
      )
    }
  },
  methods: {
    payload () {
      return {
        broker: 'CPT Markets',
        login: String(this.form.login || '').trim(),
        password: String(this.form.password || '').trim(),
        server: String(this.form.server || '').trim(),
        path: String(this.form.path || '').trim(),
        timeout: Number(this.form.timeout || 60000),
        symbol_prefix: String(this.form.symbolPrefix || '').trim(),
        symbol_suffix: String(this.form.symbolSuffix || '').trim()
      }
    },
    submit () {
      if (!this.canSubmit) return
      this.$emit('submit', this.payload())
    }
  }
}
</script>

<style lang="less" scoped>
.broker-form {
  ::v-deep .ant-form-item-label > label { font-size: 12px; color: #595959; }
}
.form-alert {
  margin-bottom: 12px;
}
.field-help {
  margin-top: 4px;
  color: #8c8c8c;
  font-size: 12px;
  line-height: 1.4;
}
.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
