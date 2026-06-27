import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface AiMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface AiConfig {
  provider: 'openai' | 'anthropic';
  apiUrl: string;
  apiKey: string;
  model: string;
}

export interface ChatHistory {
  id: string;
  title: string;
  messages: AiMessage[];
  createdAt: number;
  updatedAt: number;
}

const DEFAULT_CONFIG: AiConfig = {
  provider: 'openai',
  apiUrl: 'https://api.openai.com/v1/chat/completions',
  apiKey: '',
  model: 'gpt-4o',
};

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export const useAiStore = defineStore('ai', () => {
  const config = ref<AiConfig>(loadConfig());
  const messages = ref<AiMessage[]>([]);
  const streaming = ref(false);
  const showConfig = ref(false);
  const continuationStatus = ref('');

  // Chat history
  const histories = ref<ChatHistory[]>([]);
  const currentHistoryId = ref<string | null>(null);
  const showHistoryPanel = ref(false);

  function loadConfig(): AiConfig {
    try {
      const saved = localStorage.getItem('noah-ai-config');
      if (saved) return { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
    } catch {}
    return { ...DEFAULT_CONFIG };
  }

  function saveConfig() {
    localStorage.setItem('noah-ai-config', JSON.stringify(config.value));
  }

  function addUserMessage(content: string) {
    messages.value.push({ role: 'user', content, timestamp: Date.now() });
  }

  function addAssistantMessage(content: string) {
    messages.value.push({ role: 'assistant', content, timestamp: Date.now() });
  }

  function updateLastAssistant(content: string) {
    const last = messages.value[messages.value.length - 1];
    if (last?.role === 'assistant') last.content = content;
  }

  function clearMessages() {
    // Discard current conversation without saving
    messages.value = [];
    currentHistoryId.value = null;
  }

  // ── Chat History ──

  function loadHistories() {
    try {
      const saved = localStorage.getItem('noah-ai-histories');
      if (saved) histories.value = JSON.parse(saved);
    } catch {}
  }

  function saveHistoriesToStorage() {
    localStorage.setItem('noah-ai-histories', JSON.stringify(histories.value));
  }

  function getHistoryTitle(): string {
    if (messages.value.length === 0) return '新对话';
    const firstUserMsg = messages.value.find(m => m.role === 'user');
    if (firstUserMsg) {
      const text = firstUserMsg.content.replace(/<[^>]*>/g, '').trim();
      return text.length > 30 ? text.slice(0, 30) + '...' : text;
    }
    return '新对话';
  }

  function saveCurrentHistory() {
    if (messages.value.length === 0) return;

    const title = getHistoryTitle();
    const clonedMessages = JSON.parse(JSON.stringify(messages.value));

    if (currentHistoryId.value) {
      const existing = histories.value.find(h => h.id === currentHistoryId.value);
      if (existing) {
        existing.messages = clonedMessages;
        existing.title = title;
        existing.updatedAt = Date.now();
        saveHistoriesToStorage();
        return;
      }
    }

    const history: ChatHistory = {
      id: generateId(),
      title,
      messages: clonedMessages,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    histories.value.unshift(history);
    currentHistoryId.value = history.id;
    saveHistoriesToStorage();
  }

  function loadHistory(id: string) {
    const history = histories.value.find(h => h.id === id);
    if (!history) return;
    // Save current conversation first
    if (messages.value.length > 0) saveCurrentHistory();
    messages.value = JSON.parse(JSON.stringify(history.messages));
    currentHistoryId.value = id;
    showHistoryPanel.value = false;
  }

  function deleteHistory(id: string) {
    histories.value = histories.value.filter(h => h.id !== id);
    if (currentHistoryId.value === id) currentHistoryId.value = null;
    saveHistoriesToStorage();
  }

  function newChat() {
    if (messages.value.length > 0) saveCurrentHistory();
    messages.value = [];
    currentHistoryId.value = null;
    showHistoryPanel.value = false;
  }

  return {
    config, messages, streaming, showConfig, continuationStatus,
    histories, currentHistoryId, showHistoryPanel,
    saveConfig, addUserMessage, addAssistantMessage,
    updateLastAssistant, clearMessages,
    loadHistories, saveCurrentHistory, loadHistory,
    deleteHistory, newChat,
  };
});
