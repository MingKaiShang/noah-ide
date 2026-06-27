import { useProjectStore } from '../stores/project';
import { onMounted, onUnmounted } from 'vue';

export function useHistory() {
  const store = useProjectStore();

  function handleKeydown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
      e.preventDefault();
      store.undo();
    }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
      e.preventDefault();
      store.redo();
    }
    if (e.key === 'Delete' && store.selectedComponentId) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      e.preventDefault();
      store.removeComponent(store.selectedComponentId);
    }
  }

  onMounted(() => { window.addEventListener('keydown', handleKeydown); });
  onUnmounted(() => { window.removeEventListener('keydown', handleKeydown); });

  return { undo: store.undo, redo: store.redo };
}
