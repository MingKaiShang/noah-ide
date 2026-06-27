export interface ComponentAnimation {
  type: 'none'
    // Entrance
    | 'fadeIn' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'scaleIn'
    | 'rotateIn' | 'bounceIn' | 'blurIn' | 'swingIn'
    | 'flipIn' | 'zoomIn' | 'revealLeft' | 'revealUp' | 'typewriter' | 'lightSpeed' | 'fadeScale'
    // Loop
    | 'drift' | 'pulse' | 'float'
    | 'heartbeat' | 'shake' | 'morphColor'
    | 'glow' | 'spin' | 'bounce' | 'wobble' | 'flash' | 'wave';
  duration: number;
  delay: number;
  iterationCount: number | 'infinite';
  easing: string;
  stagger: number;
  direction: 'normal' | 'alternate';
}

export interface ComponentInstance {
  id: string;
  pageId: string;
  type: 'Text' | 'Image' | 'Rectangle' | 'MqttDisplay' | 'ChartLine'
      | 'AmbientOrb' | 'GradientText' | 'Container' | 'Badge' | 'IconBox'
      | 'Arrow' | 'Divider' | 'Step' | 'List' | 'Video' | 'Circle' | 'Table'
      | 'Effect'
      | 'QRCode' | 'PieChart' | 'BarChart'
      | 'RadarChart' | 'Countdown' | 'Tag' | 'Avatar' | 'Timeline'
      | 'Audio';
  position: { x: number; y: number };
  size: { width: number; height: number };
  props: Record<string, any>;
  animation?: ComponentAnimation;
}

export interface ProjectState {
  title: string;
  components: ComponentInstance[];
  selectedComponentId: string | null;
  mqttBrokerUrl: string;
  showGrid: boolean;
}

export interface ComponentDef {
  type: ComponentInstance['type'];
  label: string;
  category: string;
  icon: string;
  defaultProps: Record<string, any>;
  defaultSize: { width: number; height: number };
  defaultAnimation?: ComponentAnimation;
}

export type AnimLevel = 'basic' | 'advanced';

export const ANIMATION_PRESETS: { label: string; value: ComponentAnimation['type']; level: AnimLevel; defaultEasing: string }[] = [
  { label: '无', value: 'none', level: 'basic', defaultEasing: 'easeOutQuad' },
  // 初级入口动画
  { label: '淡入', value: 'fadeIn', level: 'basic', defaultEasing: 'easeOutQuad' },
  { label: '上滑', value: 'slideUp', level: 'basic', defaultEasing: 'easeOutQuad' },
  { label: '下滑', value: 'slideDown', level: 'basic', defaultEasing: 'easeOutQuad' },
  { label: '左滑', value: 'slideLeft', level: 'basic', defaultEasing: 'easeOutQuad' },
  { label: '右滑', value: 'slideRight', level: 'basic', defaultEasing: 'easeOutQuad' },
  { label: '缩放', value: 'scaleIn', level: 'basic', defaultEasing: 'easeOutQuad' },
  { label: '弹入', value: 'bounceIn', level: 'basic', defaultEasing: 'easeOutElastic(1,.5)' },
  // 高级入口动画
  { label: '旋转进入', value: 'rotateIn', level: 'advanced', defaultEasing: 'easeOutBack' },
  { label: '模糊进入', value: 'blurIn', level: 'advanced', defaultEasing: 'easeOutQuad' },
  { label: '摆入', value: 'swingIn', level: 'advanced', defaultEasing: 'spring(1,80,10,0)' },
  { label: '3D 翻转', value: 'flipIn', level: 'advanced', defaultEasing: 'easeOutBack' },
  { label: '远景缩放', value: 'zoomIn', level: 'advanced', defaultEasing: 'easeOutQuad' },
  { label: '左侧展开', value: 'revealLeft', level: 'advanced', defaultEasing: 'easeOutQuad' },
  { label: '底部展开', value: 'revealUp', level: 'advanced', defaultEasing: 'easeOutQuad' },
  { label: '打字效果', value: 'typewriter', level: 'advanced', defaultEasing: 'linear' },
  { label: '光速进入', value: 'lightSpeed', level: 'advanced', defaultEasing: 'easeOutQuad' },
  { label: '淡入缩放', value: 'fadeScale', level: 'advanced', defaultEasing: 'easeOutQuad' },
  // 初级循环动画
  { label: '脉冲', value: 'pulse', level: 'basic', defaultEasing: 'easeInOutQuad' },
  { label: '浮动', value: 'float', level: 'basic', defaultEasing: 'easeInOutQuad' },
  { label: '抖动', value: 'shake', level: 'basic', defaultEasing: 'easeInOutQuad' },
  { label: '旋转', value: 'spin', level: 'basic', defaultEasing: 'linear' },
  { label: '弹跳', value: 'bounce', level: 'basic', defaultEasing: 'easeInOutQuad' },
  { label: '闪烁', value: 'flash', level: 'basic', defaultEasing: 'linear' },
  // 高级循环动画
  { label: '漂移', value: 'drift', level: 'advanced', defaultEasing: 'easeInOutQuad' },
  { label: '心跳', value: 'heartbeat', level: 'advanced', defaultEasing: 'easeOutElastic(1,.3)' },
  { label: '色彩变换', value: 'morphColor', level: 'advanced', defaultEasing: 'linear' },
  { label: '发光', value: 'glow', level: 'advanced', defaultEasing: 'easeInOutQuad' },
  { label: '摇晃', value: 'wobble', level: 'advanced', defaultEasing: 'easeInOutQuad' },
  { label: '波浪', value: 'wave', level: 'advanced', defaultEasing: 'easeInOutQuad' },
];

export const LOOP_ANIMATION_TYPES: ComponentAnimation['type'][] = [
  'drift', 'pulse', 'float', 'heartbeat', 'shake', 'morphColor',
  'glow', 'spin', 'bounce', 'wobble', 'flash', 'wave',
];

export const EASING_OPTIONS: { label: string; value: string }[] = [
  { label: '平滑 (Quad)', value: 'easeInOutQuad' },
  { label: '快速出 (Quad)', value: 'easeOutQuad' },
  { label: '快速入 (Quad)', value: 'easeInQuad' },
  { label: '平滑 (Cubic)', value: 'easeInOutCubic' },
  { label: '快速出 (Cubic)', value: 'easeOutCubic' },
  { label: '回弹 (Back)', value: 'easeInOutBack' },
  { label: '弹跳 (Bounce)', value: 'easeOutBounce' },
  { label: '弹性 (Elastic)', value: 'easeOutElastic(1,.6)' },
  { label: '物理弹簧', value: 'spring(1,80,10,0)' },
  { label: '物理弹簧-软', value: 'spring(1,50,8,0)' },
  { label: '物理弹簧-硬', value: 'spring(1,120,14,0)' },
  { label: '线性', value: 'linear' },
];

export const COMPONENT_DEFS: ComponentDef[] = [
  // ── 基础 ──
  {
    type: 'Text', label: '文本', category: '基础', icon: 'T',
    defaultProps: { text: '文本内容', fontSize: 16, color: '#333333', fontWeight: 'normal', fontFamily: 'sans-serif', textAlign: 'left', alignItems: 'center', richText: false, htmlContent: '' },
    defaultSize: { width: 200, height: 30 }
  },
  {
    type: 'Image', label: '图片', category: '基础', icon: 'I',
    defaultProps: { src: 'https://via.placeholder.com/200x150', alt: '图片', objectFit: 'cover', borderRadius: 4 },
    defaultSize: { width: 200, height: 150 }
  },
  {
    type: 'Rectangle', label: '矩形', category: '基础', icon: 'R',
    defaultProps: { fill: '#ecf0f1', stroke: '#bdc3c7', strokeWidth: 1, cornerRadius: 0 },
    defaultSize: { width: 200, height: 150 }
  },
  // ── 展示 ──
  {
    type: 'GradientText', label: '渐变文字', category: '展示', icon: 'G',
    defaultProps: {
      text: '渐变文字', fontSize: 36, fontWeight: 'bold', fontFamily: 'sans-serif',
      gradientStart: '#6366F1', gradientMid: '#8B5CF6', gradientEnd: '#06B6D4',
      gradientAngle: 135, letterSpacing: -1, textAlign: 'left', alignItems: 'center'
    },
    defaultSize: { width: 300, height: 50 }
  },
  {
    type: 'Container', label: '容器', category: '展示', icon: 'C',
    defaultProps: {
      background: 'rgba(30,41,59,0.55)', borderColor: 'rgba(148,163,184,0.12)',
      borderWidth: 1, cornerRadius: 12, blur: 10, padding: 20,
      overflow: 'hidden'
    },
    defaultSize: { width: 300, height: 200 }
  },
  {
    type: 'Badge', label: '标签', category: '展示', icon: 'Ba',
    defaultProps: {
      text: '标签', fontSize: 12, color: '#6366F1',
      background: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.35)',
      borderRadius: 100, paddingX: 16, paddingY: 5, textAlign: 'center', alignItems: 'center'
    },
    defaultSize: { width: 80, height: 28 }
  },
  {
    type: 'IconBox', label: '图标', category: '展示', icon: 'Ic',
    defaultProps: {
      iconSvg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>',
      iconColor: '#6366F1', iconSize: 20,
      background: 'rgba(99,102,241,0.15)', cornerRadius: 10
    },
    defaultSize: { width: 40, height: 40 }
  },
  // ── 形状 ──
  {
    type: 'Arrow', label: '箭头', category: '形状', icon: '→',
    defaultProps: { color: '#6366F1', strokeWidth: 3, direction: 'right' },
    defaultSize: { width: 120, height: 40 }
  },
  {
    type: 'Divider', label: '分割线', category: '形状', icon: '—',
    defaultProps: { color: '#d1d5db', thickness: 1, style: 'solid' },
    defaultSize: { width: 300, height: 2 }
  },
  {
    type: 'Step', label: '步骤', category: '展示', icon: '①',
    defaultProps: {
      number: 1, text: '步骤标题', description: '步骤描述',
      color: '#6366F1', fontSize: 14, textColor: '#333', alignItems: 'center'
    },
    defaultSize: { width: 200, height: 60 }
  },
  // ── 背景 ──
  {
    type: 'AmbientOrb', label: '光晕', category: '背景', icon: 'O',
    defaultProps: {
      color: '#6366F1', opacity: 0.07, blur: 100,
      animate: true, animDuration: 20, animDirection: 'alternate'
    },
    defaultSize: { width: 500, height: 500 },
    defaultAnimation: { type: 'drift', duration: 20, delay: 0, iterationCount: 'infinite', easing: 'easeInOutQuad', stagger: 0, direction: 'alternate' }
  },
  // ── 数据 ──
  {
    type: 'MqttDisplay', label: 'MQTT', category: '数据', icon: 'M',
    defaultProps: { brokerUrl: 'ws://broker.emqx.io:8083/mqtt', username: '', password: '', topic: 'test/noah', valueKey: '', unit: '', label: '传感器', fontSize: 24, color: '#333333', decimalPlaces: -1, textAlign: 'center', alignItems: 'center', stylePreset: 'card' },
    defaultSize: { width: 220, height: 80 }
  },
  {
    type: 'ChartLine', label: '折线图', category: '图表', icon: 'Ch',
    defaultProps: { data: '[1,2,3,4,5,6,7]', color: '#42a5f5', title: '折线图', yAxisName: '值', lineWidth: 2, mqttTopic: '', valueKey: '', maxPoints: 20, stylePreset: 'line' },
    defaultSize: { width: 400, height: 250 }
  },
  // ── 列表 & 媒体 ──
  {
    type: 'List', label: '列表', category: '展示', icon: 'L',
    defaultProps: {
      items: '["要点一","要点二","要点三"]', fontSize: 16, color: '#333333',
      bulletStyle: 'disc', lineSpacing: 8, fontFamily: 'sans-serif'
    },
    defaultSize: { width: 250, height: 120 }
  },
  {
    type: 'Video', label: '视频', category: '基础', icon: 'V',
    defaultProps: { src: '', filePath: '', objectFit: 'cover', autoplay: true, loop: true, muted: true, controls: true, borderRadius: 8, startTime: 0, endTime: 0 },
    defaultSize: { width: 400, height: 225 }
  },
  {
    type: 'Audio', label: '音频', category: '基础', icon: '♪',
    defaultProps: { src: '', filePath: '', autoplay: false, loop: false, controls: true, muted: false, volume: 1 },
    defaultSize: { width: 300, height: 50 }
  },
  {
    type: 'Circle', label: '圆形', category: '形状', icon: '●',
    defaultProps: { fill: '#ecf0f1', stroke: '#bdc3c7', strokeWidth: 1 },
    defaultSize: { width: 100, height: 100 }
  },
  {
    type: 'Table', label: '表格', category: '展示', icon: '⊞',
    defaultProps: {
      headers: '["名称","值","状态"]', data: '[["项目A","100","正常"],["项目B","200","警告"],["项目C","50","正常"]]',
      fontSize: 13, headerBg: '#f1f5f9', borderColor: '#e2e8f0', textColor: '#333', headerColor: '#1e293b',
      mergedCells: ''
    },
    defaultSize: { width: 350, height: 150 }
  },
  // ── 特效 ──
  {
    type: 'Effect', label: '特效', category: '特效', icon: '✦',
    defaultProps: { effectId: 'glass-card', params: {}, customCode: '' },
    defaultSize: { width: 400, height: 300 }
  },
  // ── 新增组件 ──
  {
    type: 'QRCode', label: '二维码', category: '展示', icon: '▦',
    defaultProps: { text: 'https://example.com', size: 160, darkColor: '#1a1a1a', lightColor: '#ffffff', level: 'M' },
    defaultSize: { width: 200, height: 200 }
  },
  {
    type: 'PieChart', label: '饼图', category: '图表', icon: '◉',
    defaultProps: {
      data: '[{"name":"分类A","value":35},{"name":"分类B","value":25},{"name":"分类C","value":20},{"name":"分类D","value":15}]',
      color: '#6366F1', title: '饼图', donut: false,
      showLabel: true, stylePreset: 'default'
    },
    defaultSize: { width: 300, height: 300 }
  },
  {
    type: 'BarChart', label: '柱状图', category: '图表', icon: '▇',
    defaultProps: {
      data: '[{"name":"一月","value":120},{"name":"二月","value":200},{"name":"三月","value":150},{"name":"四月","value":80},{"name":"五月","value":70}]',
      color: '#6366F1', title: '柱状图', yAxisName: '值', barMaxWidth: 40,
      showValue: false, stylePreset: 'default'
    },
    defaultSize: { width: 400, height: 250 }
  },
  {
    type: 'RadarChart', label: '雷达图', category: '图表', icon: '⬡',
    defaultProps: {
      indicators: '["速度","力量","技巧","耐力","智力","防御"]',
      data: '[{"name":"当前","value":[85,70,90,65,80,75]}]',
      color: '#6366F1', title: '雷达图', fillOpacity: 0.15,
      showLabel: true
    },
    defaultSize: { width: 300, height: 300 }
  },
  {
    type: 'Countdown', label: '倒计时', category: '展示', icon: '⏱',
    defaultProps: {
      targetDate: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
      label: '倒计时', fontSize: 24, color: '#6366F1',
      showDays: true, showHours: true, showMinutes: true, showSeconds: true,
      textAlign: 'center', alignItems: 'center'
    },
    defaultSize: { width: 300, height: 80 }
  },
  {
    type: 'Tag', label: '标签', category: '展示', icon: '🏷',
    defaultProps: {
      text: '标签', color: '#6366F1', bgColor: 'rgba(99,102,241,0.12)',
      fontSize: 12, borderRadius: 4, removable: false,
      textAlign: 'center', alignItems: 'center'
    },
    defaultSize: { width: 80, height: 28 }
  },
  {
    type: 'Avatar', label: '头像', category: '展示', icon: '◎',
    defaultProps: {
      src: '', text: 'U', bgColor: '#6366F1', color: '#ffffff',
      size: 48, shape: 'circle', fontSize: 20
    },
    defaultSize: { width: 60, height: 60 }
  },
  {
    type: 'Timeline', label: '时间轴', category: '展示', icon: '≡',
    defaultProps: {
      items: '[{"title":"事件一","desc":"描述内容","time":"2024-01","color":"#6366F1"},{"title":"事件二","desc":"描述内容","time":"2024-02","color":"#8B5CF6"},{"title":"事件三","desc":"描述内容","time":"2024-03","color":"#06B6D4"}]',
      lineColor: '#e2e8f0', dotSize: 10, fontSize: 13
    },
    defaultSize: { width: 250, height: 200 }
  },
];

export const CHART_STYLE_PRESETS_EXT: StylePreset[] = [
  { label: '默认', value: 'default' },
  { label: '暗色', value: 'dark' },
  { label: '极简', value: 'minimal' },
  { label: '渐变', value: 'gradient' },
];

export interface StylePreset { label: string; value: string; }

export const MQTT_STYLE_PRESETS: StylePreset[] = [
  { label: '卡片', value: 'card' },
  { label: '简约', value: 'minimal' },
  { label: '暗色', value: 'dark' },
  { label: '渐变', value: 'gradient' },
  { label: '仪表盘', value: 'dashboard' },
  { label: '纯数值', value: 'valueOnly' },
];

export const CHART_STYLE_PRESETS: StylePreset[] = [
  { label: '折线', value: 'line' },
  { label: '面积', value: 'area' },
  { label: '柱状', value: 'bar' },
  { label: '暗色', value: 'dark' },
  { label: '极简', value: 'minimal' },
];
