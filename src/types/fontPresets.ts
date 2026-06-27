export interface FontPreset {
  label: string;
  value: string;       // CSS font-family
  importUrl?: string;  // Google Fonts @import URL
  category: string;
}

export const FONT_PRESETS: FontPreset[] = [
  // 系统
  { label: '系统默认', value: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif', category: '系统' },
  { label: '无衬线体', value: 'sans-serif', category: '系统' },
  { label: '衬线体', value: 'serif', category: '系统' },
  { label: '等宽字体', value: 'monospace', category: '系统' },
  // 中文
  { label: '思源黑体', value: '"Noto Sans SC", sans-serif', importUrl: 'https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;500;700&display=swap', category: '中文' },
  { label: '思源宋体', value: '"Noto Serif SC", serif', importUrl: 'https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;700&display=swap', category: '中文' },
  { label: '霞鹜文楷', value: '"LXGW WenKai", serif', importUrl: 'https://fonts.googleapis.com/css2?family=LXGW+WenKai:wght@300;400;700&display=swap', category: '中文' },
  // 西文
  { label: 'Inter', value: '"Inter", sans-serif', importUrl: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap', category: '西文' },
  { label: 'Roboto', value: '"Roboto", sans-serif', importUrl: 'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap', category: '西文' },
  { label: 'Poppins', value: '"Poppins", sans-serif', importUrl: 'https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap', category: '西文' },
  { label: 'DM Sans', value: '"DM Sans", sans-serif', importUrl: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;700&display=swap', category: '西文' },
  { label: 'Space Grotesk', value: '"Space Grotesk", sans-serif', importUrl: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;700&display=swap', category: '西文' },
  { label: 'Montserrat', value: '"Montserrat", sans-serif', importUrl: 'https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap', category: '西文' },
  { label: 'Playfair Display', value: '"Playfair Display", serif', importUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&display=swap', category: '西文' },
  { label: 'JetBrains Mono', value: '"JetBrains Mono", monospace', importUrl: 'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&display=swap', category: '西文' },
];

export const FONT_CATEGORIES = ['系统', '中文', '西文'];
