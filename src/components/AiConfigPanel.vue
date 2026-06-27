<template>
  <div v-if="ai.showConfig" class="ai-cfg-overlay">
    <div class="ai-cfg-dialog">
      <div class="ai-cfg-header">
        <span>AI 助手配置</span>
        <button class="ai-cfg-close" @click="ai.showConfig = false" aria-label="关闭配置">×</button>
      </div>
      <div class="ai-cfg-body">
        <div class="ai-cfg-presets">
          <label>快速选择</label>
          <div class="ai-preset-grid">
            <button v-for="p in PRESETS" :key="p.name" class="ai-preset-btn"
                    :class="{ active: ai.config.apiUrl === p.url && ai.config.model === p.model }"
                    @click="applyPreset(p)">
              {{ p.name }}
              <span v-if="p.recommended" class="ai-preset-rec">推荐</span>
            </button>
          </div>
        </div>
        <div class="ai-cfg-field">
          <label>API 格式</label>
          <select class="ai-cfg-select" v-model="ai.config.provider">
            <option value="openai">OpenAI 兼容 (OpenAI / DeepSeek / 智谱 / 月之暗面 / Ollama / 小米 MiMo)</option>
            <option value="anthropic">Anthropic (Claude)</option>
          </select>
        </div>
        <div class="ai-cfg-field">
          <label>API 地址</label>
          <input type="text" v-model="ai.config.apiUrl" :placeholder="urlPlaceholder" />
        </div>
        <div class="ai-cfg-field">
          <label>API Key</label>
          <input type="password" v-model="ai.config.apiKey" placeholder="sk-..." />
        </div>
        <div class="ai-cfg-field">
          <label>模型</label>
          <div class="ai-model-row">
            <input type="text" v-model="ai.config.model" placeholder="gpt-4o" class="ai-model-input" />
            <button class="ai-model-list-btn" @click="fetchModels" :disabled="fetchingModels" :title="fetchTooltip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="14" height="14">
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/>
              </svg>
              {{ fetchingModels ? `获取中 ${fetchCountdown}s` : '获取列表' }}
            </button>
          </div>
          <div v-if="modelList.length > 0" class="ai-model-list">
            <div v-for="m in modelList" :key="m" class="ai-model-opt"
                 :class="{ active: ai.config.model === m }"
                 @click="ai.config.model = m; modelList = []; fetchResult = ''">
              {{ m }}
            </div>
          </div>
          <span v-if="fetchResult" class="ai-cfg-result" :class="{ ok: fetchOk }">{{ fetchResult }}</span>
          <div class="ai-cfg-hint">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" width="12" height="12"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>
            <span>max_tokens: {{ maxTokens }}，预估最大 <strong>{{ maxPages }}</strong></span>
          </div>
        </div>
        <div class="ai-cfg-test">
          <button class="ai-cfg-btn test" @click="doTest" :disabled="testing">
            {{ testing ? `测试中 ${testCountdown}s` : '测试连接' }}
          </button>
          <span v-if="testResult" class="ai-cfg-result" :class="{ ok: testOk }">{{ testResult }}</span>
        </div>
      </div>
      <div class="ai-cfg-footer">
        <button class="ai-cfg-btn cancel" @click="ai.showConfig = false">取消</button>
        <button class="ai-cfg-btn save" @click="doSave">保存</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { useAiStore } from '../stores/ai';
import { useAiChat } from '../composables/useAiChat';

const ai = useAiStore();
const { testConnection } = useAiChat();

const testing = ref(false);
const testResult = ref('');
const testOk = ref(false);
const testCountdown = ref(0);
let testTimer = 0;
const fetchingModels = ref(false);
const modelList = ref<string[]>([]);
const fetchCountdown = ref(0);
let fetchTimer = 0;
const fetchResult = ref('');
const fetchOk = ref(false);

onUnmounted(() => {
  clearInterval(testTimer);
  clearInterval(fetchTimer);
});

const fetchTooltip = computed(() => {
  if (!ai.config.apiKey) return '请先填写 API Key';
  if (ai.config.provider === 'anthropic') return 'Anthropic 不支持获取模型列表';
  return '从 API 获取可用模型列表';
});

const PRESETS = [
  { name: 'DeepSeek', provider: 'openai' as const, url: 'https://api.deepseek.com/v1/chat/completions', model: 'deepseek-v4-flash', recommended: true },
  { name: 'OpenAI', provider: 'openai' as const, url: 'https://api.openai.com/v1/chat/completions', model: 'gpt-4o' },
  { name: 'Claude', provider: 'anthropic' as const, url: 'https://api.anthropic.com/v1/messages', model: 'claude-sonnet-4-20250514' },
  { name: '通义千问', provider: 'openai' as const, url: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', model: 'qwen-plus' },
  { name: '智谱 GLM', provider: 'openai' as const, url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions', model: 'glm-4' },
  { name: 'Kimi', provider: 'openai' as const, url: 'https://api.moonshot.cn/v1/chat/completions', model: 'moonshot-v1-8k' },
  { name: '小米 MiMo', provider: 'openai' as const, url: 'https://token-plan-cn.xiaomimimo.com/v1', model: 'mimo-v2-flash' },
];

function getActivePresetName(): string | null {
  const p = PRESETS.find(p => ai.config.apiUrl === p.url && ai.config.model === p.model);
  return p?.name || null;
}

function loadPresetConfigs(): Record<string, { apiUrl: string; apiKey: string; model: string }> {
  try {
    const saved = localStorage.getItem('noah-preset-configs');
    if (saved) return JSON.parse(saved);
  } catch {}
  return {};
}

function savePresetConfigs(configs: Record<string, any>) {
  localStorage.setItem('noah-preset-configs', JSON.stringify(configs));
}

function applyPreset(p: typeof PRESETS[number]) {
  // Save current preset's config before switching
  const currentName = getActivePresetName();
  if (currentName) {
    const all = loadPresetConfigs();
    all[currentName] = { apiUrl: ai.config.apiUrl, apiKey: ai.config.apiKey, model: ai.config.model };
    savePresetConfigs(all);
  }
  // Apply preset defaults
  ai.config.provider = p.provider;
  ai.config.apiUrl = p.url;
  ai.config.model = p.model;
  // Restore saved config for this preset if exists
  const all = loadPresetConfigs();
  const saved = all[p.name];
  if (saved) {
    ai.config.apiUrl = saved.apiUrl;
    ai.config.apiKey = saved.apiKey;
    ai.config.model = saved.model;
  }
}

const urlPlaceholder = computed(() =>
  ai.config.provider === 'anthropic'
    ? 'https://api.anthropic.com/v1/messages'
    : 'https://api.openai.com/v1/chat/completions'
);

const maxTokens = computed(() => {
  const url = ai.config.apiUrl.toLowerCase();
  if (url.includes('openai.com')) return 16384;
  if (url.includes('anthropic.com')) return 8192;
  if (url.includes('deepseek.com')) return 65536;
  if (url.includes('moonshot.cn')) return 32768;
  if (url.includes('dashscope') || url.includes('bigmodel.cn')) return 8192;
  if (url.includes('token-plan-cn.xiaomimimo.com')) return 16384;
  return 16384;
});

const maxPages = computed(() => {
  const t = maxTokens.value;
  if (t >= 32768) return `约 20~30 页`;
  if (t >= 16384) return `约 10~20 页`;
  if (t >= 8192) return `约 8~15 页`;
  return `约 1~5 页`;
});

function friendlyApiError(msg: string): string {
  const m = msg.toLowerCase();
  // Strip reqwest wrapper "error sending request for url (https://...)" — with or without trailing colon
  const stripped = msg.replace(/^error sending request for url \([^)]+\):?\s*/i, '').trim();
  const real = (stripped && stripped !== msg) ? stripped : m;
  const r = real.toLowerCase();
  if (r.includes('dns')) return 'DNS 解析失败，请检查 API 地址';
  if (r.includes('refused') || r.includes('connection reset')) return '连接被拒绝，请确认 API 地址';
  if (r.includes('timeout') || r.includes('timed out')) return '连接超时';
  if (r.includes('404') || r.includes('not found')) return '该服务商不支持获取模型列表';
  if (r.includes('403') || r.includes('forbidden')) return '无权限获取模型列表';
  if (r.includes('401') || r.includes('unauthorized')) return 'API Key 无效';
  if (r.includes('error sending request')) return '无法获取模型列表，请检查 API 地址和网络连接';
  return `获取失败: ${real.slice(0, 80)}`;
}

async function fetchModels() {
  if (!ai.config.apiKey || ai.config.provider === 'anthropic') return;
  fetchingModels.value = true;
  fetchResult.value = '';
  fetchOk.value = false;
  modelList.value = [];
  fetchCountdown.value = 8;
  fetchTimer = window.setInterval(() => {
    fetchCountdown.value = Math.max(0, fetchCountdown.value - 1);
  }, 1000);
  try {
    // Derive models URL from the current API URL
    let baseUrl = ai.config.apiUrl.replace(/\/chat\/completions\/?$/, '');
    if (!baseUrl.endsWith('/')) baseUrl += '/';
    const modelsUrl = `${baseUrl}models`;

    const res = await invoke('http_request', {
      req: {
        url: modelsUrl,
        method: 'GET',
        headers: { Authorization: `Bearer ${ai.config.apiKey}` },
        timeout_secs: 8,
      },
    }) as { status: number; body: string };

    clearInterval(fetchTimer);

    if (res.status >= 200 && res.status < 300) {
      const data = JSON.parse(res.body);
      const models: string[] = (data.data || [])
        .map((m: any) => m.id)
        .filter((id: string) => !id.startsWith('ft:') && !id.includes('-instruct'))
        .sort();
      if (models.length > 0) {
        modelList.value = models;
        fetchResult.value = `找到 ${models.length} 个模型，点击选择`;
        fetchOk.value = true;
      } else {
        fetchResult.value = '该服务商不支持获取模型列表';
      }
    } else if (res.status === 404) {
      fetchResult.value = '该服务商不支持获取模型列表';
    } else if (res.status === 401 || res.status === 403) {
      fetchResult.value = 'API Key 无效或无权限';
    } else if (res.status === 429) {
      fetchResult.value = '请求频率过高或 API 额度已用完，请稍后重试或检查账户余额';
    } else if (res.status >= 500) {
      fetchResult.value = '服务器内部错误，请稍后重试';
    } else {
      fetchResult.value = `请求失败 (HTTP ${res.status})`;
    }
  } catch (e: any) {
    clearInterval(fetchTimer);
    const err = e?.message || e || '未知错误';
    fetchResult.value = friendlyApiError(err);
  }
  fetchingModels.value = false;
}

async function doTest() {
  testing.value = true;
  testResult.value = '';
  testCountdown.value = 10;
  testTimer = window.setInterval(() => {
    testCountdown.value = Math.max(0, testCountdown.value - 1);
  }, 1000);
  const result = await testConnection();
  clearInterval(testTimer);
  testResult.value = result;
  testOk.value = result.startsWith('连接成功');
  testing.value = false;
}

function doSave() {
  const name = getActivePresetName();
  if (name) {
    const all = loadPresetConfigs();
    all[name] = { apiUrl: ai.config.apiUrl, apiKey: ai.config.apiKey, model: ai.config.model };
    savePresetConfigs(all);
  }
  ai.saveConfig();
  ai.showConfig = false;
}
</script>

<style scoped>
.ai-cfg-overlay {
  position: fixed; inset: 0; z-index: 100000;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  animation: ai-overlay-in 0.2s ease;
}
@keyframes ai-overlay-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.ai-cfg-dialog {
  width: 460px; max-width: 90vw; background: #fff;
  border-radius: 14px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.08);
  display: flex; flex-direction: column;
  animation: ai-dialog-in 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}
@keyframes ai-dialog-in {
  from { opacity: 0; transform: scale(0.95) translateY(8px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}
.ai-cfg-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-bottom: 1px solid #f1f5f9;
  font-size: 15px; font-weight: 600; color: #1e293b;
}
.ai-cfg-close {
  width: 28px; height: 28px; border: none; border-radius: 50%;
  background: #f1f5f9; cursor: pointer; font-size: 16px; color: #94a3b8;
  display: flex; align-items: center; justify-content: center;
  transition: all 0.15s ease;
}
.ai-cfg-close:hover { background: #fee2e2; color: #ef4444; }
.ai-cfg-close:focus-visible { outline: 2px solid #6366f1; outline-offset: 1px; }
.ai-cfg-body {
  padding: 20px; display: flex; flex-direction: column; gap: 16px;
}
/* ── Presets ── */
.ai-cfg-presets { display: flex; flex-direction: column; gap: 6px; }
.ai-cfg-presets label {
  font-size: 12px; color: #64748b; font-weight: 500;
  letter-spacing: 0.02em;
}
.ai-preset-grid {
  display: flex; flex-wrap: wrap; gap: 6px;
}
.ai-preset-btn {
  padding: 5px 14px; border: 1px solid #e2e8f0; border-radius: 20px;
  background: #f8fafc; color: #475569; cursor: pointer;
  font-size: 12px; font-weight: 500;
  transition: all 0.15s;
}
.ai-preset-btn:hover {
  border-color: #6366f1; color: #6366f1; background: #f5f3ff;
}
.ai-preset-btn.active {
  border-color: #6366f1; background: #6366f1; color: #fff;
}
.ai-preset-rec {
  font-size: 9px; background: #f59e0b; color: #fff;
  border-radius: 8px; padding: 1px 6px; margin-left: 4px;
  font-weight: 700; vertical-align: middle;
  line-height: 1.6;
}

.ai-cfg-field { display: flex; flex-direction: column; gap: 6px; }

/* ── Model input row ── */
.ai-model-row { display: flex; gap: 6px; }
.ai-model-input { flex: 1; }
.ai-model-list-btn {
  display: flex; align-items: center; gap: 4px;
  padding: 0 12px; border: 1px solid #e2e8f0; border-radius: 8px;
  background: #f1f5f9; color: #475569; cursor: pointer;
  font-size: 11px; font-weight: 500; white-space: nowrap;
  transition: all 0.15s;
  flex-shrink: 0;
}
.ai-model-list-btn:hover:not(:disabled) { background: #e2e8f0; color: #1e293b; }
.ai-model-list-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Model list dropdown ── */
.ai-model-list {
  max-height: 200px; overflow-y: auto;
  border: 1px solid #e2e8f0; border-radius: 8px;
  background: #fff; box-shadow: 0 4px 16px rgba(0,0,0,0.08);
}
.ai-model-opt {
  padding: 7px 12px; font-size: 13px; cursor: pointer;
  color: #334155; font-family: 'Cascadia Code', 'Fira Code', monospace;
  transition: background 0.1s;
}
.ai-model-opt:hover { background: #f1f5f9; color: #6366f1; }
.ai-model-opt.active { background: #f5f3ff; color: #6366f1; font-weight: 600; }
.ai-cfg-field label {
  font-size: 12px; color: #64748b; font-weight: 500;
  letter-spacing: 0.02em;
}
.ai-cfg-field input {
  padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 8px;
  font-size: 13px; outline: none;
  font-family: 'Cascadia Code', 'Fira Code', monospace;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.ai-cfg-field input:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}
.ai-cfg-select {
  padding: 9px 12px; border: 1px solid #e2e8f0; border-radius: 8px;
  font-size: 13px; outline: none; background: #fff; color: #333;
  cursor: pointer; appearance: auto;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.ai-cfg-select:focus {
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.12);
}
.ai-cfg-hint {
  display: flex; align-items: center; gap: 5px;
  font-size: 11px; color: #94a3b8;
  padding: 4px 0 0 2px;
}
.ai-cfg-hint strong { color: #64748b; }
.ai-cfg-test { display: flex; align-items: center; gap: 10px; }
.ai-cfg-result {
  font-size: 12px; color: #ef4444;
  animation: ai-fade-in 0.3s ease;
}
.ai-cfg-result.ok { color: #22c55e; }
.ai-cfg-footer {
  display: flex; justify-content: flex-end; gap: 8px;
  padding: 14px 20px; border-top: 1px solid #f1f5f9;
}
.ai-cfg-btn {
  padding: 8px 20px; border-radius: 8px; border: 1px solid #e2e8f0;
  cursor: pointer; font-size: 13px; font-weight: 500;
  transition: all 0.2s ease;
}
.ai-cfg-btn:focus-visible { outline: 2px solid #6366f1; outline-offset: 2px; }
.ai-cfg-btn.cancel { background: #fff; color: #64748b; }
.ai-cfg-btn.cancel:hover { background: #f8fafc; color: #475569; }
.ai-cfg-btn.save {
  background: linear-gradient(135deg, #6366f1 0%, #818cf8 100%);
  color: #fff; border-color: transparent;
  box-shadow: 0 2px 6px rgba(99, 102, 241, 0.3);
}
.ai-cfg-btn.save:hover {
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
  transform: translateY(-1px);
}
.ai-cfg-btn.save:active { transform: translateY(0); }
.ai-cfg-btn.test { background: #f1f5f9; color: #475569; }
.ai-cfg-btn.test:hover { background: #e2e8f0; }
.ai-cfg-btn.test:disabled { opacity: 0.5; cursor: not-allowed; }

@keyframes ai-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .ai-cfg-overlay,
  .ai-cfg-dialog,
  .ai-cfg-result {
    animation: none;
  }
  .ai-cfg-btn,
  .ai-cfg-close,
  .ai-cfg-field input {
    transition: none;
  }
}
</style>
