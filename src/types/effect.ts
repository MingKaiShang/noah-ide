export interface EffectParamDef {
  key: string;
  label: string;
  type: 'color' | 'range' | 'select' | 'number' | 'boolean';
  min?: number;
  max?: number;
  step?: number;
  options?: { label: string; value: any }[];
  default: any;
}

export type EffectLevel = 'basic' | 'advanced';

export interface EffectTemplate {
  id: string;
  name: string;
  level: EffectLevel;
  category: string;
  icon: string;
  defaultParams: Record<string, any>;
  paramDefs: EffectParamDef[];
  generateHTML: (params: Record<string, any>) => string;
}

// ── Template Registry ──

export const EFFECT_TEMPLATES: EffectTemplate[] = [
  // ── 玻璃拟态卡片 ──
  {
    id: 'glass-card',
    name: '玻璃卡片', level: 'basic',
    category: '背景',
    icon: '◇',
    defaultParams: { blur: 12, opacity: 0.15, borderColor: '#ffffff', bgColor: '#6366f1', borderRadius: 16 },
    paramDefs: [
      { key: 'blur', label: '模糊度', type: 'range', min: 0, max: 40, step: 1, default: 12 },
      { key: 'opacity', label: '透明度', type: 'range', min: 0, max: 1, step: 0.01, default: 0.15 },
      { key: 'bgColor', label: '背景色', type: 'color', default: '#6366f1' },
      { key: 'borderColor', label: '边框色', type: 'color', default: '#ffffff' },
      { key: 'borderRadius', label: '圆角', type: 'range', min: 0, max: 50, step: 1, default: 16 },
    ],
    generateHTML(p) {
      const bgR = parseInt(p.bgColor.slice(1, 3), 16);
      const bgG = parseInt(p.bgColor.slice(3, 5), 16);
      const bgB = parseInt(p.bgColor.slice(5, 7), 16);
      return `<div style="width:100%;height:100%;background:rgba(${bgR},${bgG},${bgB},${p.opacity});backdrop-filter:blur(${p.blur}px);-webkit-backdrop-filter:blur(${p.blur}px);border:1px solid ${p.borderColor}40;border-radius:${p.borderRadius}px;box-shadow:0 8px 32px rgba(0,0,0,0.1);"></div>`;
    },
  },

  // ── 粒子星空 ──
  {
    id: 'particles',
    name: '粒子星空', level: 'advanced',
    category: '背景',
    icon: '✦',
    defaultParams: { count: 60, color: '#ffffff', speed: 1, size: 2, bgColor: '#0f172a' },
    paramDefs: [
      { key: 'count', label: '粒子数量', type: 'range', min: 10, max: 200, step: 5, default: 60 },
      { key: 'color', label: '粒子颜色', type: 'color', default: '#ffffff' },
      { key: 'speed', label: '移动速度', type: 'range', min: 0.1, max: 3, step: 0.1, default: 1 },
      { key: 'size', label: '粒子大小', type: 'range', min: 1, max: 6, step: 0.5, default: 2 },
      { key: 'bgColor', label: '背景色', type: 'color', default: '#0f172a' },
    ],
    generateHTML(p) {
      const id = 'p' + Math.random().toString(36).slice(2, 8);
      const c = parseInt(p.color.slice(1, 3), 16) + ',' + parseInt(p.color.slice(3, 5), 16) + ',' + parseInt(p.color.slice(5, 7), 16);
      return `<canvas id="${id}" style="width:100%;height:100%;display:block;border-radius:8px;"></canvas><script>(function(){var cv=document.getElementById('${id}');if(!cv)return;var ctx=cv.getContext('2d');var W,H;var pts=[];var spd=${p.speed};var sz=${p.size};var cnt=${p.count};function resize(){W=cv.width=cv.offsetWidth;H=cv.height=cv.offsetHeight;pts=[];for(var i=0;i<cnt;i++)pts.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-0.5)*spd,vy:(Math.random()-0.5)*spd});}resize();window.addEventListener('resize',resize);function draw(){ctx.fillStyle='${p.bgColor}';ctx.fillRect(0,0,W,H);ctx.fillStyle='rgba(${c},0.8)';for(var i=0;i<pts.length;i++){var q=pts[i];q.x+=q.vx;q.y+=q.vy;if(q.x<0)q.x=W;if(q.x>W)q.x=0;if(q.y<0)q.y=H;if(q.y>H)q.y=0;ctx.beginPath();ctx.arc(q.x,q.y,sz,0,6.28);ctx.fill();}requestAnimationFrame(draw);}draw();})();</script>`;
    },
  },

  // ── 渐变网格 ──
  {
    id: 'gradient-mesh',
    name: '渐变网格', level: 'basic',
    category: '背景',
    icon: '◈',
    defaultParams: { color1: '#6366f1', color2: '#ec4899', color3: '#06b6d4', color4: '#8b5cf6', speed: 8 },
    paramDefs: [
      { key: 'color1', label: '颜色 1', type: 'color', default: '#6366f1' },
      { key: 'color2', label: '颜色 2', type: 'color', default: '#ec4899' },
      { key: 'color3', label: '颜色 3', type: 'color', default: '#06b6d4' },
      { key: 'color4', label: '颜色 4', type: 'color', default: '#8b5cf6' },
      { key: 'speed', label: '动画速度 (秒)', type: 'range', min: 2, max: 30, step: 1, default: 8 },
    ],
    generateHTML(p) {
      return `<div style="width:100%;height:100%;background:${p.color1};background-image:radial-gradient(at 20% 30%,${p.color1} 0,transparent 50%),radial-gradient(at 80% 20%,${p.color2} 0,transparent 50%),radial-gradient(at 50% 80%,${p.color3} 0,transparent 50%),radial-gradient(at 10% 70%,${p.color4} 0,transparent 50%);background-size:200% 200%;animation:meshMove ${p.speed}s ease-in-out infinite alternate;border-radius:8px;"></div><style>@keyframes meshMove{0%{background-position:0% 0%}100%{background-position:100% 100%}}</style>`;
    },
  },

  // ── 动态波浪 ──
  {
    id: 'waves',
    name: '动态波浪', level: 'basic',
    category: '背景',
    icon: '≈',
    defaultParams: { color1: '#6366f1', color2: '#818cf8', color3: '#a5b4fc', speed: 3, amplitude: 30 },
    paramDefs: [
      { key: 'color1', label: '波浪色 1', type: 'color', default: '#6366f1' },
      { key: 'color2', label: '波浪色 2', type: 'color', default: '#818cf8' },
      { key: 'color3', label: '波浪色 3', type: 'color', default: '#a5b4fc' },
      { key: 'speed', label: '速度 (秒)', type: 'range', min: 1, max: 10, step: 0.5, default: 3 },
      { key: 'amplitude', label: '波浪高度', type: 'range', min: 10, max: 80, step: 5, default: 30 },
    ],
    generateHTML(p) {
      const amp = p.amplitude;
      const sp = p.speed;
      return `<div style="width:100%;height:100%;overflow:hidden;position:relative;border-radius:8px;background:#0f172a;"><svg style="position:absolute;bottom:0;width:200%;height:${amp * 3}px;" viewBox="0 0 1440 ${amp * 3}" preserveAspectRatio="none"><path fill="${p.color1}" fill-opacity="0.6" d="M0,${amp} C360,${amp * 2.5} 720,0 1080,${amp} C1260,${amp * 1.5} 1350,${amp * 0.5} 1440,${amp} L1440,${amp * 3} L0,${amp * 3}Z" style="animation:wave1 ${sp}s ease-in-out infinite alternate;"/><path fill="${p.color2}" fill-opacity="0.5" d="M0,${amp * 1.2} C360,${amp * 0.3} 720,${amp * 2} 1080,${amp * 0.8} C1260,${amp * 0.4} 1350,${amp * 1.5} 1440,${amp * 1.2} L1440,${amp * 3} L0,${amp * 3}Z" style="animation:wave2 ${sp * 1.3}s ease-in-out infinite alternate;"/><path fill="${p.color3}" fill-opacity="0.4" d="M0,${amp * 1.5} C360,${amp * 2} 720,${amp * 0.5} 1080,${amp * 1.8} C1260,${amp * 1} 1350,${amp * 2} 1440,${amp * 1.5} L1440,${amp * 3} L0,${amp * 3}Z" style="animation:wave3 ${sp * 0.8}s ease-in-out infinite alternate;"/></svg><style>@keyframes wave1{0%{transform:translateX(0)}100%{transform:translateX(-25%)}}@keyframes wave2{0%{transform:translateX(-25%)}100%{transform:translateX(0)}}@keyframes wave3{0%{transform:translateX(-10%)}100%{transform:translateX(-35%)}}</style></div>`;
    },
  },

  // ── 霓虹发光 ──
  {
    id: 'neon-glow',
    name: '霓虹发光', level: 'basic',
    category: '装饰',
    icon: '◎',
    defaultParams: { text: 'NOAH', color: '#6366f1', intensity: 3, fontSize: 48, bgColor: '#0f172a' },
    paramDefs: [
      { key: 'text', label: '文字', type: 'select', default: 'NOAH', options: [] },
      { key: 'color', label: '发光色', type: 'color', default: '#6366f1' },
      { key: 'intensity', label: '发光强度', type: 'range', min: 1, max: 8, step: 0.5, default: 3 },
      { key: 'fontSize', label: '字号', type: 'range', min: 16, max: 120, step: 2, default: 48 },
      { key: 'bgColor', label: '背景色', type: 'color', default: '#0f172a' },
    ],
    generateHTML(p) {
      const i = p.intensity;
      const id = 'n' + Math.random().toString(36).slice(2, 8);
      return `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${p.bgColor};border-radius:8px;"><span id="${id}" style="font-size:${p.fontSize}px;font-weight:bold;color:${p.color};text-shadow:0 0 ${i * 2}px ${p.color},0 0 ${i * 5}px ${p.color},0 0 ${i * 10}px ${p.color},0 0 ${i * 20}px ${p.color};animation:neonPulse 2s ease-in-out infinite alternate;font-family:monospace;">${p.text}</span></div><style>@keyframes neonPulse{0%{filter:brightness(1);text-shadow:0 0 ${i * 2}px ${p.color},0 0 ${i * 5}px ${p.color},0 0 ${i * 10}px ${p.color}}100%{filter:brightness(1.3);text-shadow:0 0 ${i * 3}px ${p.color},0 0 ${i * 8}px ${p.color},0 0 ${i * 15}px ${p.color},0 0 ${i * 25}px ${p.color}}}</style>`;
    },
  },

  // ── 打字机效果 ──
  {
    id: 'typewriter',
    name: '打字机', level: 'basic',
    category: '文字',
    icon: '▮',
    defaultParams: { text: 'Hello, NOAH!', speed: 100, cursorColor: '#6366f1', textColor: '#1e293b', fontSize: 24 },
    paramDefs: [
      { key: 'text', label: '文字内容', type: 'select', default: 'Hello, NOAH!', options: [] },
      { key: 'speed', label: '打字速度 (ms)', type: 'range', min: 30, max: 300, step: 10, default: 100 },
      { key: 'fontSize', label: '字号', type: 'range', min: 12, max: 72, step: 2, default: 24 },
      { key: 'textColor', label: '文字色', type: 'color', default: '#1e293b' },
      { key: 'cursorColor', label: '光标色', type: 'color', default: '#6366f1' },
    ],
    generateHTML(p) {
      const id = 'tw' + Math.random().toString(36).slice(2, 8);
      const escaped = p.text.replace(/'/g, "\\'").replace(/"/g, '&quot;');
      return `<div style="width:100%;height:100%;display:flex;align-items:center;padding:16px;box-sizing:border-box;"><span id="${id}" style="font-size:${p.fontSize}px;color:${p.textColor};font-family:monospace;border-right:2px solid ${p.cursorColor};padding-right:4px;animation:cursorBlink 0.8s step-end infinite;"></span></div><style>@keyframes cursorBlink{0%,100%{border-color:${p.cursorColor}}50%{border-color:transparent}}</style><script>(function(){var el=document.getElementById('${id}');if(!el)return;var txt='${escaped}';var i=0;var spd=${p.speed};function type(){if(i<=txt.length){el.textContent=txt.slice(0,i);i++;setTimeout(type,spd);}}setTimeout(type,500);})();</script>`;
    },
  },

  // ── 代码雨 ──
  {
    id: 'code-rain',
    name: '代码雨', level: 'advanced',
    category: '背景',
    icon: '⌇',
    defaultParams: { color: '#00ff41', speed: 1, density: 14, bgColor: '#0a0a0a' },
    paramDefs: [
      { key: 'color', label: '文字色', type: 'color', default: '#00ff41' },
      { key: 'speed', label: '下落速度', type: 'range', min: 0.3, max: 3, step: 0.1, default: 1 },
      { key: 'density', label: '列密度', type: 'range', min: 5, max: 30, step: 1, default: 14 },
      { key: 'bgColor', label: '背景色', type: 'color', default: '#0a0a0a' },
    ],
    generateHTML(p) {
      const id = 'cr' + Math.random().toString(36).slice(2, 8);
      const c = parseInt(p.color.slice(1, 3), 16) + ',' + parseInt(p.color.slice(3, 5), 16) + ',' + parseInt(p.color.slice(5, 7), 16);
      return `<canvas id="${id}" style="width:100%;height:100%;display:block;border-radius:8px;"></canvas><script>(function(){var cv=document.getElementById('${id}');if(!cv)return;var ctx=cv.getContext('2d');var W,H,cols,drops;var spd=${p.speed};var chars='アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF';function init(){W=cv.width=cv.offsetWidth;H=cv.height=cv.offsetHeight;cols=Math.floor(W/(14*${p.density}/14));drops=[];for(var i=0;i<cols;i++)drops[i]=Math.random()*-100;}init();window.addEventListener('resize',init);function draw(){ctx.fillStyle='rgba(${parseInt(p.bgColor.slice(1,3),16)},${parseInt(p.bgColor.slice(3,5),16)},${parseInt(p.bgColor.slice(5,7),16)},0.05)';ctx.fillRect(0,0,W,H);ctx.fillStyle='rgba(${c},1)';ctx.font='14px monospace';for(var i=0;i<drops.length;i++){var ch=chars[Math.floor(Math.random()*chars.length)];ctx.fillText(ch,i*(14*${p.density}/14),drops[i]*16);if(drops[i]*16>H&&Math.random()>0.975)drops[i]=0;drops[i]+=spd;}requestAnimationFrame(draw);}draw();})();</script>`;
    },
  },

  // ── 故障文字 ──
  {
    id: 'glitch-text',
    name: '故障文字', level: 'advanced',
    category: '文字',
    icon: 'ẍ',
    defaultParams: { text: 'GLITCH', color1: '#ff0040', color2: '#00fff9', fontSize: 56, speed: 3 },
    paramDefs: [
      { key: 'text', label: '文字', type: 'select', default: 'GLITCH', options: [] },
      { key: 'color1', label: '偏移色 1', type: 'color', default: '#ff0040' },
      { key: 'color2', label: '偏移色 2', type: 'color', default: '#00fff9' },
      { key: 'fontSize', label: '字号', type: 'range', min: 16, max: 120, step: 2, default: 56 },
      { key: 'speed', label: '闪烁速度', type: 'range', min: 1, max: 10, step: 0.5, default: 3 },
    ],
    generateHTML(p) {
      const sp = p.speed;
      return `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#0f172a;border-radius:8px;overflow:hidden;"><span style="font-size:${p.fontSize}px;font-weight:900;color:#fff;font-family:monospace;position:relative;animation:glitchMain ${sp}s infinite;">${p.text}<span style="position:absolute;left:2px;top:0;color:${p.color1};clip-path:polygon(0 0,100% 0,100% 45%,0 45%);animation:glitchTop ${sp * 0.8}s infinite;">${p.text}</span><span style="position:absolute;left:-2px;top:0;color:${p.color2};clip-path:polygon(0 55%,100% 55%,100% 100%,0 100%);animation:glitchBot ${sp * 1.2}s infinite;">${p.text}</span></span></div><style>@keyframes glitchMain{0%,90%,100%{transform:none}91%{transform:translate(2px,-1px)}93%{transform:translate(-2px,1px)}95%{transform:translate(1px,2px)}97%{transform:translate(-1px,-2px)}}@keyframes glitchTop{0%,85%,100%{transform:none;opacity:1}86%{transform:translate(-4px,0);opacity:0.8}89%{transform:translate(4px,0);opacity:1}}@keyframes glitchBot{0%,80%,100%{transform:none;opacity:1}82%{transform:translate(4px,0);opacity:0.8}84%{transform:translate(-4px,0);opacity:1}}</style>`;
    },
  },
  // ── 极光 ──
  {
    id: 'aurora',
    name: '极光', level: 'advanced',
    category: '晚上特效',
    icon: '🌈',
    defaultParams: { color1: '#00ff87', color2: '#60efff', color3: '#a855f7', speed: 1, intensity: 1, bgColor: '#020617' },
    paramDefs: [
      { key: 'color1', label: '极光色 1', type: 'color', default: '#00ff87' },
      { key: 'color2', label: '极光色 2', type: 'color', default: '#60efff' },
      { key: 'color3', label: '极光色 3', type: 'color', default: '#a855f7' },
      { key: 'speed', label: '流动速度', type: 'range', min: 0.5, max: 5, step: 0.1, default: 1 },
      { key: 'intensity', label: '强度', type: 'range', min: 0.3, max: 2, step: 0.1, default: 1 },
      { key: 'bgColor', label: '背景色', type: 'color', default: '#020617' },
    ],
    generateHTML(p) {
      const id = 'au' + Math.random().toString(36).slice(2, 8);
      const i = p.intensity;
      const sp = p.speed;
      return `<div style="width:100%;height:100%;background:${p.bgColor};overflow:hidden;position:relative;border-radius:8px;"><canvas id="${id}" style="width:100%;height:100%;display:block;"></canvas><script>(function(){var cv=document.getElementById('${id}');if(!cv)return;var ctx=cv.getContext('2d');var W,H,t=0;function resize(){W=cv.width=cv.offsetWidth;H=cv.height=cv.offsetHeight;}resize();window.addEventListener('resize',resize);function draw(){t+=0.005*${sp};ctx.fillStyle='${p.bgColor}';ctx.fillRect(0,0,W,H);for(var k=0;k<3;k++){var cols=[['${p.color1}','${p.color2}'],['${p.color2}','${p.color3}'],['${p.color3}','${p.color1}']];var col=cols[k];ctx.globalAlpha=${i}*0.3;ctx.beginPath();ctx.moveTo(0,H);for(var x=0;x<=W;x+=4){var y=H*0.3+Math.sin(x*0.008+t+k*2)*H*0.15+Math.sin(x*0.015+t*1.3+k*3)*H*0.08+Math.sin(x*0.003+t*0.7)*H*0.1;ctx.lineTo(x,y);}ctx.lineTo(W,H);ctx.closePath();var grad=ctx.createLinearGradient(0,0,W,0);grad.addColorStop(0,col[0]);grad.addColorStop(0.5,col[1]);grad.addColorStop(1,col[0]);ctx.fillStyle=grad;ctx.fill();ctx.globalAlpha=1;}ctx.globalAlpha=${i}*0.6;for(var k=0;k<6;k++){ctx.beginPath();var by=H*0.2+Math.sin(t*0.8+k*1.2)*H*0.1;for(var x=0;x<=W;x+=2){var y=by+Math.sin(x*0.01+t*1.5+k)*H*0.1+Math.sin(x*0.02+t*2.3+k*2)*H*0.05;ctx.lineTo(x,y);}ctx.strokeStyle='rgba(255,255,255,0.08)';ctx.lineWidth=1+Math.sin(t+k)*0.5;ctx.stroke();}ctx.globalAlpha=1;requestAnimationFrame(draw);}draw();})();</script></div>`;
    },
  },

  // ── 深邃星空 ──
  {
    id: 'deep-stars',
    name: '深邃星空', level: 'advanced',
    category: '晚上特效',
    icon: '★',
    defaultParams: { starCount: 200, twinkleSpeed: 1, shootingStar: true, nebulaColor: '#6366f1', bgColor: '#050510' },
    paramDefs: [
      { key: 'starCount', label: '星星数量', type: 'range', min: 50, max: 500, step: 10, default: 200 },
      { key: 'twinkleSpeed', label: '闪烁速度', type: 'range', min: 0.3, max: 3, step: 0.1, default: 1 },
      { key: 'shootingStar', label: '流星', type: 'boolean', default: true },
      { key: 'nebulaColor', label: '星云色', type: 'color', default: '#6366f1' },
      { key: 'bgColor', label: '背景色', type: 'color', default: '#050510' },
    ],
    generateHTML(p) {
      const id = 'ds' + Math.random().toString(36).slice(2, 8);
      return `<canvas id="${id}" style="width:100%;height:100%;display:block;border-radius:8px;"></canvas><script>(function(){var cv=document.getElementById('${id}');if(!cv)return;var ctx=cv.getContext('2d');var W,H,stars=[],shooting=null,spd=${p.twinkleSpeed},cnt=${p.starCount};var nc='${p.nebulaColor}';function init(){W=cv.width=cv.offsetWidth;H=cv.height=cv.offsetHeight;stars=[];for(var i=0;i<cnt;i++)stars.push({x:Math.random()*W,y:Math.random()*H,r:0.5+Math.random()*2,o:0.3+Math.random()*0.7,p:Math.random()*Math.PI*2,s:0.5+Math.random()*spd});}init();window.addEventListener('resize',init);var ncR=parseInt(nc.slice(1,3),16),ncG=parseInt(nc.slice(3,5),16),ncB=parseInt(nc.slice(5,7),16);function drawShoot(){if(!shooting)return;ctx.strokeStyle='rgba(255,255,255,0.8)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(shooting.x,shooting.y);ctx.lineTo(shooting.x-shooting.vx*8,shooting.y-shooting.vy*8);ctx.stroke();ctx.fillStyle='rgba(255,255,255,0.9)';ctx.beginPath();ctx.arc(shooting.x,shooting.y,2,0,6.28);ctx.fill();shooting.x+=shooting.vx;shooting.y+=shooting.vy;if(shooting.x<0||shooting.x>W||shooting.y<0||shooting.y>H)shooting=null;}function draw(){ctx.fillStyle='${p.bgColor}';ctx.fillRect(0,0,W,H);ctx.fillStyle='rgba('+ncR+','+ncG+','+ncB+',0.03)';for(var i=0;i<3;i++){ctx.beginPath();ctx.arc(W*0.3+Math.sin(Date.now()*0.0001+i*2)*W*0.2,H*0.3+Math.cos(Date.now()*0.00015+i*2)*H*0.2,Math.min(W,H)*0.25,0,6.28);ctx.fill();}for(var i=0;i<stars.length;i++){var s=stars[i];s.p+=0.02*s.s;var alpha=s.o*(0.5+0.5*Math.sin(s.p));ctx.fillStyle='rgba(255,255,255,'+alpha+')';ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,6.28);ctx.fill();}if(${p.shootingStar}&&Math.random()<0.002){shooting={x:Math.random()*W*0.8,y:Math.random()*H*0.3,vx:4+Math.random()*6,vy:2+Math.random()*4};}drawShoot();requestAnimationFrame(draw);}draw();})();</script>`;
    },
  },

  // ── 星云 ──
  {
    id: 'nebula',
    name: '星云', level: 'advanced',
    category: '晚上特效',
    icon: '🌀',
    defaultParams: { color1: '#8b5cf6', color2: '#ec4899', color3: '#06b6d4', speed: 1, density: 1, bgColor: '#050510' },
    paramDefs: [
      { key: 'color1', label: '星云色 1', type: 'color', default: '#8b5cf6' },
      { key: 'color2', label: '星云色 2', type: 'color', default: '#ec4899' },
      { key: 'color3', label: '星云色 3', type: 'color', default: '#06b6d4' },
      { key: 'speed', label: '旋转速度', type: 'range', min: 0.1, max: 3, step: 0.1, default: 1 },
      { key: 'density', label: '密度', type: 'range', min: 0.5, max: 2, step: 0.1, default: 1 },
      { key: 'bgColor', label: '背景色', type: 'color', default: '#050510' },
    ],
    generateHTML(p) {
      const id = 'nb' + Math.random().toString(36).slice(2, 8);
      const sp = p.speed;
      const d = p.density;
      return `<canvas id="${id}" style="width:100%;height:100%;display:block;border-radius:8px;"></canvas><script>(function(){var cv=document.getElementById('${id}');if(!cv)return;var ctx=cv.getContext('2d');var W,H,t=0;var c1='${p.color1}',c2='${p.color2}',c3='${p.color3}';function resize(){W=cv.width=cv.offsetWidth;H=cv.height=cv.offsetHeight;}resize();window.addEventListener('resize',resize);function draw(){t+=0.003*${sp};ctx.fillStyle='${p.bgColor}';ctx.fillRect(0,0,W,H);var cx=W*0.5,cy=H*0.5;for(var r=0;r<12;r++){var angle=t+r*0.8;var rad=Math.min(W,H)*(0.15+r*0.06*${d});var px=cx+Math.cos(angle)*rad;var py=cy+Math.sin(angle)*rad;var grad=ctx.createRadialGradient(px,py,0,px,py,rad*0.5);var mix=(r%3)/2;if(r%3===0){grad.addColorStop(0,c1);grad.addColorStop(1,c1+'00')}else if(r%3===1){grad.addColorStop(0,c2);grad.addColorStop(1,c2+'00')}else{grad.addColorStop(0,c3);grad.addColorStop(1,c3+'00')}ctx.globalAlpha=0.3+0.1*Math.sin(r+t);ctx.fillStyle=grad;ctx.beginPath();ctx.arc(px,py,rad*0.5,0,6.28);ctx.fill();}ctx.globalAlpha=1;for(var i=0;i<80*${d};i++){var a=Math.random()*Math.PI*2;var r2=Math.random()*Math.min(W,H)*0.4;var px2=cx+Math.cos(a+t*0.5+r2*0.01)*r2;var py2=cy+Math.sin(a+t*0.5+r2*0.01)*r2;var s=0.3+Math.random()*1.5;ctx.fillStyle='rgba(255,255,255,'+(0.1+Math.random()*0.6)+')';ctx.beginPath();ctx.arc(px2,py2,s,0,6.28);ctx.fill();}requestAnimationFrame(draw);}draw();})();</script>`;
    },
  },

  // ── 萤火虫 ──
  {
    id: 'fireflies',
    name: '萤火虫', level: 'advanced',
    category: '晚上特效',
    icon: '✨',
    defaultParams: { count: 30, color: '#a7f3d0', glowSize: 3, speed: 0.5, bgColor: '#061a15' },
    paramDefs: [
      { key: 'count', label: '萤火虫数量', type: 'range', min: 5, max: 80, step: 2, default: 30 },
      { key: 'color', label: '发光颜色', type: 'color', default: '#a7f3d0' },
      { key: 'glowSize', label: '发光大小', type: 'range', min: 1, max: 8, step: 0.5, default: 3 },
      { key: 'speed', label: '飞行速度', type: 'range', min: 0.1, max: 2, step: 0.1, default: 0.5 },
      { key: 'bgColor', label: '背景色', type: 'color', default: '#061a15' },
    ],
    generateHTML(p) {
      const id = 'ff' + Math.random().toString(36).slice(2, 8);
      const c = p.color;
      const cR = parseInt(c.slice(1,3),16), cG = parseInt(c.slice(3,5),16), cB = parseInt(c.slice(5,7),16);
      return `<canvas id="${id}" style="width:100%;height:100%;display:block;border-radius:8px;"></canvas><script>(function(){var cv=document.getElementById('${id}');if(!cv)return;var ctx=cv.getContext('2d');var W,H,flies=[];var cnt=${p.count},spd=${p.speed},gs=${p.glowSize};function init(){W=cv.width=cv.offsetWidth;H=cv.height=cv.offsetHeight;flies=[];for(var i=0;i<cnt;i++)flies.push({x:Math.random()*W,y:Math.random()*H,vx:(Math.random()-0.5)*0.5*spd,vy:(Math.random()-0.5)*0.5*spd,phase:Math.random()*6.28,bright:0.3+Math.random()*0.7,tx:Math.random()*W,ty:Math.random()*H,changeTimer:0});}init();window.addEventListener('resize',init);function draw(){ctx.fillStyle='${p.bgColor}';ctx.fillRect(0,0,W,H);for(var i=0;i<flies.length;i++){var f=flies[i];f.changeTimer+=0.01;if(f.changeTimer>1){f.tx=Math.random()*W;f.ty=Math.random()*H;f.changeTimer=0;}var dx=f.tx-f.x,dy=f.ty-f.y;var dist=Math.sqrt(dx*dx+dy*dy);if(dist>1){f.vx+=dx/dist*0.02*spd;f.vy+=dy/dist*0.02*spd;}f.vx*=0.98;f.vy*=0.98;f.x+=f.vx;f.y+=f.vy;f.x=Math.max(0,Math.min(W,f.x));f.y=Math.max(0,Math.min(H,f.y));var glow=gs*(1+0.5*Math.sin(f.phase+Date.now()*0.003));var alpha=f.bright*(0.5+0.5*Math.sin(f.phase+Date.now()*0.002));var grad=ctx.createRadialGradient(f.x,f.y,0,f.x,f.y,glow*6);grad.addColorStop(0,'rgba(${cR},${cG},${cB},'+alpha+')');grad.addColorStop(0.3,'rgba(${cR},${cG},${cB},'+alpha*0.3+')');grad.addColorStop(1,'rgba(${cR},${cG},${cB},0)');ctx.fillStyle=grad;ctx.beginPath();ctx.arc(f.x,f.y,glow*6,0,6.28);ctx.fill();ctx.fillStyle='rgba(255,255,255,'+alpha*0.9+')';ctx.beginPath();ctx.arc(f.x,f.y,glow*0.6,0,6.28);ctx.fill();}requestAnimationFrame(draw);}draw();})();</script>`;
    },
  },

  // ── 雷电风暴 ──
  {
    id: 'lightning',
    name: '雷电风暴', level: 'advanced',
    category: '晚上特效',
    icon: '⚡',
    defaultParams: { flashIntensity: 2, flashInterval: 3, boltCount: 3, bgColor: '#0a0a10' },
    paramDefs: [
      { key: 'flashIntensity', label: '闪电强度', type: 'range', min: 0.5, max: 4, step: 0.5, default: 2 },
      { key: 'flashInterval', label: '闪电间隔 (秒)', type: 'range', min: 1, max: 8, step: 0.5, default: 3 },
      { key: 'boltCount', label: '闪电数量', type: 'range', min: 1, max: 6, step: 1, default: 3 },
      { key: 'bgColor', label: '背景色', type: 'color', default: '#0a0a10' },
    ],
    generateHTML(p) {
      const id = 'lt' + Math.random().toString(36).slice(2, 8);
      return `<canvas id="${id}" style="width:100%;height:100%;display:block;border-radius:8px;"></canvas><script>(function(){var cv=document.getElementById('${id}');if(!cv)return;var ctx=cv.getContext('2d');var W,H,flashTimer=0,flashAlpha=0;var fi=${p.flashIntensity},interval=${p.flashInterval},bc=${p.boltCount};function resize(){W=cv.width=cv.offsetWidth;H=cv.height=cv.offsetHeight;}resize();window.addEventListener('resize',resize);function generateBolt(sx,sy,ex,ey){var segments=[{x:sx,y:sy}];var dx=ex-sx,dy=ey-sy;var segLen=Math.sqrt(dx*dx+dy*dy);var numSegs=Math.max(8,Math.floor(segLen/10));for(var i=1;i<numSegs;i++){var t=i/numSegs;var x=sx+dx*t+(Math.random()-0.5)*20;var y=sy+dy*t+(Math.random()-0.5)*10;segments.push({x:x,y:y});}segments.push({x:ex,y:ey});return segments;}function drawBolt(segments,alpha){ctx.beginPath();ctx.moveTo(segments[0].x,segments[0].y);for(var i=1;i<segments.length;i++)ctx.lineTo(segments[i].x,segments[i].y);ctx.strokeStyle='rgba(200,220,255,'+alpha+')';ctx.lineWidth=2+Math.random();ctx.stroke();ctx.beginPath();ctx.moveTo(segments[0].x,segments[0].y);for(var i=1;i<segments.length;i++)ctx.lineTo(segments[i].x,segments[i].y);ctx.strokeStyle='rgba(255,255,255,'+alpha*0.5+')';ctx.lineWidth=5+Math.random()*3;ctx.stroke();}var bolts=[];function draw(){flashTimer+=1/60;ctx.fillStyle='${p.bgColor}';ctx.fillRect(0,0,W,H);if(flashAlpha>0){ctx.fillStyle='rgba(255,255,255,'+flashAlpha+')';ctx.fillRect(0,0,W,H);flashAlpha-=0.02;}if(flashTimer>interval&&Math.random()<0.3){flashTimer=0;flashAlpha=0.15*fi;bolts=[];for(var b=0;b<bc;b++){var sx=50+Math.random()*(W-100);var sy=10+Math.random()*20;var ex=sx+(Math.random()-0.5)*100;var ey=H*0.6+Math.random()*H*0.4;bolts.push(generateBolt(sx,sy,ex,ey));}}for(var i=0;i<bolts.length;i++){drawBolt(bolts[i],0.3+Math.random()*0.7);}requestAnimationFrame(draw);}draw();})();</script>`;
    },
  },

  // ── 月光夜景 ──
  {
    id: 'moonlight',
    name: '月光夜景', level: 'advanced',
    category: '晚上特效',
    icon: '🌙',
    defaultParams: { moonColor: '#fef3c7', moonSize: 40, clouds: true, starCount: 100, bgColor: '#0c1222' },
    paramDefs: [
      { key: 'moonColor', label: '月光色', type: 'color', default: '#fef3c7' },
      { key: 'moonSize', label: '月亮大小', type: 'range', min: 20, max: 80, step: 2, default: 40 },
      { key: 'clouds', label: '云朵', type: 'boolean', default: true },
      { key: 'starCount', label: '星星数量', type: 'range', min: 30, max: 300, step: 10, default: 100 },
      { key: 'bgColor', label: '背景色', type: 'color', default: '#0c1222' },
    ],
    generateHTML(p) {
      const id = 'ml' + Math.random().toString(36).slice(2, 8);
      const ms = p.moonSize;
      const mc = p.moonColor;
      return `<canvas id="${id}" style="width:100%;height:100%;display:block;border-radius:8px;"></canvas><script>(function(){var cv=document.getElementById('${id}');if(!cv)return;var ctx=cv.getContext('2d');var W,H,stars=[];var ms=${ms},cnt=${p.starCount};var mc='${mc}';var mcR=parseInt(mc.slice(1,3),16),mcG=parseInt(mc.slice(3,5),16),mcB=parseInt(mc.slice(5,7),16);function init(){W=cv.width=cv.offsetWidth;H=cv.height=cv.offsetHeight;stars=[];for(var i=0;i<cnt;i++)stars.push({x:Math.random()*W,y:Math.random()*H,r:0.3+Math.random()*1.5,o:0.3+Math.random()*0.7,p:Math.random()*6.28,s:0.3+Math.random()});}init();window.addEventListener('resize',init);var t=0;function draw(){t+=0.003;ctx.fillStyle='${p.bgColor}';ctx.fillRect(0,0,W,H);ctx.fillStyle='rgba('+mcR+','+mcG+','+mcB+',0.03)';ctx.beginPath();ctx.arc(W*0.75,H*0.2,ms*3,0,6.28);ctx.fill();ctx.fillStyle='rgba('+mcR+','+mcG+','+mcB+',0.06)';ctx.beginPath();ctx.arc(W*0.75,H*0.2,ms*2,0,6.28);ctx.fill();for(var i=0;i<stars.length;i++){var s=stars[i];var alpha=s.o*(0.5+0.5*Math.sin(s.p+t*s.s));ctx.fillStyle='rgba(255,255,255,'+alpha+')';ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,6.28);ctx.fill();}ctx.fillStyle='${mc}';ctx.shadowColor='${mc}';ctx.shadowBlur=ms*0.5;ctx.beginPath();ctx.arc(W*0.75,H*0.2,ms,0,6.28);ctx.fill();ctx.shadowBlur=0;ctx.globalAlpha=0.15;ctx.fillStyle='rgba(255,255,255,0.15)';ctx.beginPath();ctx.arc(W*0.73,H*0.18,ms*0.85,0,6.28);ctx.fill();ctx.globalAlpha=1;if(${p.clouds}){ctx.globalAlpha=0.12;for(var i=0;i<3;i++){var cx=W*0.5+Math.sin(t*0.2+i*2)*W*0.3;var cy=H*0.08+i*30+Math.sin(t*0.1+i)*15;var cw=160+Math.sin(t*0.15+i)*40;ctx.fillStyle='rgba(255,255,255,0.12)';ctx.beginPath();ctx.ellipse(cx,cy,cw,12+Math.sin(t*0.1+i)*5,0,0,6.28);ctx.fill();}ctx.globalAlpha=1;}requestAnimationFrame(draw);}draw();})();</script>`;
    },
  },

  // ── 银河漩涡 ──
  {
    id: 'galaxy',
    name: '银河漩涡', level: 'advanced',
    category: '晚上特效',
    icon: '🌌',
    defaultParams: { color1: '#8b5cf6', color2: '#ec4899', color3: '#38bdf8', speed: 0.5, density: 1, bgColor: '#030712' },
    paramDefs: [
      { key: 'color1', label: '银河色 1', type: 'color', default: '#8b5cf6' },
      { key: 'color2', label: '银河色 2', type: 'color', default: '#ec4899' },
      { key: 'color3', label: '银河色 3', type: 'color', default: '#38bdf8' },
      { key: 'speed', label: '旋转速度', type: 'range', min: 0.1, max: 2, step: 0.1, default: 0.5 },
      { key: 'density', label: '恒星密度', type: 'range', min: 0.3, max: 2, step: 0.1, default: 1 },
      { key: 'bgColor', label: '背景色', type: 'color', default: '#030712' },
    ],
    generateHTML(p) {
      const id = 'gl' + Math.random().toString(36).slice(2, 8);
      return `<canvas id="${id}" style="width:100%;height:100%;display:block;border-radius:8px;"></canvas><script>(function(){var cv=document.getElementById('${id}');if(!cv)return;var ctx=cv.getContext('2d');var W,H;var c1='${p.color1}',c2='${p.color2}',c3='${p.color3}';var spd=${p.speed},den=${p.density};var c1R=parseInt(c1.slice(1,3),16),c1G=parseInt(c1.slice(3,5),16),c1B=parseInt(c1.slice(5,7),16);var c2R=parseInt(c2.slice(1,3),16),c2G=parseInt(c2.slice(3,5),16),c2B=parseInt(c2.slice(5,7),16);var c3R=parseInt(c3.slice(1,3),16),c3G=parseInt(c3.slice(3,5),16),c3B=parseInt(c3.slice(5,7),16);function resize(){W=cv.width=cv.offsetWidth;H=cv.height=cv.offsetHeight;}resize();window.addEventListener('resize',resize);var t=0;function draw(){t+=0.005*spd;ctx.fillStyle='${p.bgColor}';ctx.fillRect(0,0,W,H);var cx=W*0.5,cy=H*0.5;ctx.globalAlpha=0.6;for(var i=0;i<200*den;i++){var dist=Math.random()*Math.min(W,H)*0.45;var angle=Math.random()*6.28+dist*0.015*3+t;var px=cx+Math.cos(angle)*dist;var py=cy+Math.sin(angle)*dist;var n=Math.floor(Math.random()*3);var col;if(n===0)col='rgba('+c1R+','+c1G+','+c1B+','+(0.2+Math.random()*0.6)+')';else if(n===1)col='rgba('+c2R+','+c2G+','+c2B+','+(0.2+Math.random()*0.6)+')';else col='rgba('+c3R+','+c3G+','+c3B+','+(0.2+Math.random()*0.6)+')';ctx.fillStyle=col;var sz=0.5+Math.random()*2;ctx.beginPath();ctx.arc(px,py,sz,0,6.28);ctx.fill();}ctx.globalAlpha=1;var coreGrad=ctx.createRadialGradient(cx,cy,0,cx,cy,Math.min(W,H)*0.12);coreGrad.addColorStop(0,'rgba(255,255,255,0.3)');coreGrad.addColorStop(0.5,'rgba(255,255,255,0.05)');coreGrad.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=coreGrad;ctx.beginPath();ctx.arc(cx,cy,Math.min(W,H)*0.12,0,6.28);ctx.fill();requestAnimationFrame(draw);}draw();})();</script>`;
    },
  },

  // ── 雾霭森林 ──
  {
    id: 'misty-forest',
    name: '雾霭森林', level: 'advanced',
    category: '晚上特效',
    icon: '🌫️',
    defaultParams: { fogColor: '#94a3b8', fogDensity: 0.5, speed: 0.5, silhouette: true, bgColor: '#0f172a' },
    paramDefs: [
      { key: 'fogColor', label: '雾气颜色', type: 'color', default: '#94a3b8' },
      { key: 'fogDensity', label: '雾气密度', type: 'range', min: 0.1, max: 1, step: 0.05, default: 0.5 },
      { key: 'speed', label: '飘动速度', type: 'range', min: 0.1, max: 2, step: 0.1, default: 0.5 },
      { key: 'silhouette', label: '树木剪影', type: 'boolean', default: true },
      { key: 'bgColor', label: '背景色', type: 'color', default: '#0f172a' },
    ],
    generateHTML(p) {
      const id = 'mf' + Math.random().toString(36).slice(2, 8);
      const fc = p.fogColor;
      return `<canvas id="${id}" style="width:100%;height:100%;display:block;border-radius:8px;"></canvas><script>(function(){var cv=document.getElementById('${id}');if(!cv)return;var ctx=cv.getContext('2d');var W,H;var fd=${p.fogDensity},spd=${p.speed};var fc='${fc}';var fcR=parseInt(fc.slice(1,3),16),fcG=parseInt(fc.slice(3,5),16),fcB=parseInt(fc.slice(5,7),16);function resize(){W=cv.width=cv.offsetWidth;H=cv.height=cv.offsetHeight;}resize();window.addEventListener('resize',resize);var t=0;function drawTrees(){if(!${p.silhouette})return;ctx.fillStyle='#0a0a12';for(var i=0;i<12;i++){var tx=i/12*W+Math.sin(i*3)*10;var th=H*0.25+Math.sin(i*2)*H*0.1;var tw=20+Math.sin(i*5)*10;ctx.beginPath();ctx.moveTo(tx-tw/2,H);ctx.lineTo(tx-tw/4,H-th*0.6);ctx.lineTo(tx-tw*0.7,H-th);ctx.lineTo(tx-tw*0.2,H-th*0.9);ctx.lineTo(tx,H-th*1.1);ctx.lineTo(tx+tw*0.2,H-th*0.9);ctx.lineTo(tx+tw*0.7,H-th);ctx.lineTo(tx+tw/4,H-th*0.6);ctx.lineTo(tx+tw/2,H);ctx.closePath();ctx.fill();}}function draw(){t+=0.002*spd;ctx.fillStyle='${p.bgColor}';ctx.fillRect(0,0,W,H);drawTrees();ctx.globalAlpha=fd*0.4;for(var i=0;i<5;i++){var fx=Math.sin(t+i*1.5)*W*0.3+W*0.5;var fy=H*0.5+Math.sin(t*0.7+i*2)*H*0.2;var fw=W*0.5+Math.sin(t*0.3+i)*W*0.2;var grad=ctx.createRadialGradient(fx,fy,0,fx,fy,fw);grad.addColorStop(0,'rgba('+fcR+','+fcG+','+fcB+',0.6)');grad.addColorStop(0.5,'rgba('+fcR+','+fcG+','+fcB+',0.2)');grad.addColorStop(1,'rgba('+fcR+','+fcG+','+fcB+',0)');ctx.fillStyle=grad;ctx.beginPath();ctx.ellipse(fx,fy,fw,fw*0.3,0,0,6.28);ctx.fill();}ctx.globalAlpha=1;requestAnimationFrame(draw);}draw();})();</script>`;
    },
  },
  // ── 日出 ──
  {
    id: 'sunrise',
    name: '日出', level: 'basic', category: '自然', icon: '🌅',
    defaultParams: { sunColor: '#ff6b35', sky1: '#1a0a2e', sky2: '#ff6b35', sky3: '#ffd93d', speed: 1 },
    paramDefs: [
      { key: 'sunColor', label: '太阳色', type: 'color', default: '#ff6b35' },
      { key: 'sky1', label: '天空色 1', type: 'color', default: '#1a0a2e' },
      { key: 'sky2', label: '天空色 2', type: 'color', default: '#ff6b35' },
      { key: 'sky3', label: '天空色 3', type: 'color', default: '#ffd93d' },
      { key: 'speed', label: '速度', type: 'range', min: 0.3, max: 3, step: 0.1, default: 1 },
    ],
    generateHTML(p) {
      const id = 'sr' + Math.random().toString(36).slice(2, 8);
      return `<canvas id="${id}" style="width:100%;height:100%;display:block;border-radius:8px;"></canvas><script>(function(){var cv=document.getElementById('${id}');if(!cv)return;var ctx=cv.getContext('2d');var W,H,t=0;var sp=${p.speed};var cols=['${p.sky1}','${p.sky2}','${p.sky3}'];var sunC='${p.sunColor}';function resize(){W=cv.width=cv.offsetWidth;H=cv.height=cv.offsetHeight;}resize();window.addEventListener('resize',resize);function draw(){t+=0.003*sp;ctx.fillStyle=cols[0];ctx.fillRect(0,0,W,H);var grd=ctx.createLinearGradient(0,0,0,H);grd.addColorStop(0,cols[0]);grd.addColorStop(0.4+0.1*Math.sin(t),cols[1]);grd.addColorStop(0.8,cols[2]);ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);var sunY=H*0.9-H*0.6*Math.abs(Math.sin(t*0.5));ctx.shadowColor=sunC;ctx.shadowBlur=80;ctx.fillStyle=sunC;ctx.beginPath();ctx.arc(W*0.5,sunY,H*0.08,0,6.28);ctx.fill();ctx.shadowBlur=0;ctx.fillStyle='rgba(255,255,255,0.1)';for(var i=0;i<6;i++){var a=t*0.3+i*1.05;ctx.beginPath();ctx.ellipse(W*0.5+Math.cos(a)*H*0.4,sunY+Math.sin(a)*H*0.15,H*0.3,H*0.03,a,0,6.28);ctx.fill();}ctx.globalAlpha=0.15;for(var i=0;i<4;i++){var cx=W*(0.2+Math.sin(t*0.1+i*1.8)*0.3);var cy=H*0.15+i*H*0.08+Math.sin(t*0.05+i)*5;ctx.fillStyle='rgba(255,255,255,0.15)';ctx.beginPath();ctx.ellipse(cx,cy,80+Math.sin(t*0.08+i)*20,8,0,0,6.28);ctx.fill();}ctx.globalAlpha=1;requestAnimationFrame(draw);}draw();})();</script>`;
    },
  },

  // ── 下雨 ──
  {
    id: 'rain',
    name: '下雨', level: 'basic', category: '自然', icon: '🌧️',
    defaultParams: { density: 150, speed: 1, wind: 0.3, bgColor: '#1a1a2e' },
    paramDefs: [
      { key: 'density', label: '雨量', type: 'range', min: 30, max: 400, step: 10, default: 150 },
      { key: 'speed', label: '速度', type: 'range', min: 0.3, max: 3, step: 0.1, default: 1 },
      { key: 'wind', label: '风向', type: 'range', min: -1, max: 1, step: 0.05, default: 0.3 },
      { key: 'bgColor', label: '背景色', type: 'color', default: '#1a1a2e' },
    ],
    generateHTML(p) {
      const id = 'rn' + Math.random().toString(36).slice(2, 8);
      return `<canvas id="${id}" style="width:100%;height:100%;display:block;border-radius:8px;"></canvas><script>(function(){var cv=document.getElementById('${id}');if(!cv)return;var ctx=cv.getContext('2d');var W,H,drops=[];var d=${p.density},sp=${p.speed},wd=${p.wind};function resize(){W=cv.width=cv.offsetWidth;H=cv.height=cv.offsetHeight;drops=[];for(var i=0;i<d;i++)drops.push({x:Math.random()*W,y:Math.random()*-H,len:10+Math.random()*20,spd:3+Math.random()*8*sp});}resize();window.addEventListener('resize',resize);function draw(){ctx.fillStyle='${p.bgColor}';ctx.fillRect(0,0,W,H);ctx.strokeStyle='rgba(180,210,255,0.4)';ctx.lineWidth=1.5;for(var i=0;i<drops.length;i++){var dr=drops[i];dr.x+=wd*dr.spd*0.3;dr.y+=dr.spd;dr.x+=dr.spd*wd;if(dr.y>H+20||dr.x<-20||dr.x>W+20){dr.y=-20-dr.len;dr.x=Math.random()*W;dr.spd=3+Math.random()*8*sp;}ctx.beginPath();ctx.moveTo(dr.x,dr.y);ctx.lineTo(dr.x+wd*3,dr.y-dr.len);ctx.stroke();}requestAnimationFrame(draw);}draw();})();</script>`;
    },
  },

  // ── 下雪 ──
  {
    id: 'snow',
    name: '下雪', level: 'basic', category: '自然', icon: '❄️',
    defaultParams: { density: 80, speed: 0.5, wind: 0.2, size: 3, bgColor: '#1e293b' },
    paramDefs: [
      { key: 'density', label: '雪量', type: 'range', min: 20, max: 300, step: 10, default: 80 },
      { key: 'speed', label: '速度', type: 'range', min: 0.1, max: 2, step: 0.1, default: 0.5 },
      { key: 'wind', label: '风向', type: 'range', min: -0.5, max: 0.5, step: 0.05, default: 0.2 },
      { key: 'size', label: '雪花大小', type: 'range', min: 1, max: 6, step: 0.5, default: 3 },
      { key: 'bgColor', label: '背景色', type: 'color', default: '#1e293b' },
    ],
    generateHTML(p) {
      const id = 'sn' + Math.random().toString(36).slice(2, 8);
      return `<canvas id="${id}" style="width:100%;height:100%;display:block;border-radius:8px;"></canvas><script>(function(){var cv=document.getElementById('${id}');if(!cv)return;var ctx=cv.getContext('2d');var W,H,flakes=[];var sz=${p.size},sp=${p.speed},wd=${p.wind},cnt=${p.density};function resize(){W=cv.width=cv.offsetWidth;H=cv.height=cv.offsetHeight;flakes=[];for(var i=0;i<cnt;i++)flakes.push({x:Math.random()*W,y:Math.random()*H,r:0.5+Math.random()*sz,s:0.3+Math.random()*sp*2,o:0.3+Math.random()*0.7,w:Math.random()*6.28,wa:0.01+Math.random()*0.03,wy:Math.random()*H});}resize();window.addEventListener('resize',resize);function draw(){ctx.fillStyle='${p.bgColor}';ctx.fillRect(0,0,W,H);for(var i=0;i<flakes.length;i++){var f=flakes[i];f.w+=f.wa;f.x+=Math.sin(f.w)*0.5+wd;f.y+=f.s*sp;if(f.y>H+10){f.y=-10;f.x=Math.random()*W;f.s=0.3+Math.random()*sp*2;}ctx.globalAlpha=f.o;ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(f.x,f.y,f.r,0,6.28);ctx.fill();}ctx.globalAlpha=1;requestAnimationFrame(draw);}draw();})();</script>`;
    },
  },

  // ── 云海 ──
  {
    id: 'cloud-sea',
    name: '云海', level: 'basic', category: '自然', icon: '☁️',
    defaultParams: { cloudColor: '#ffffff', layers: 3, speed: 0.5, density: 1, bgColor: '#38bdf8' },
    paramDefs: [
      { key: 'cloudColor', label: '云朵色', type: 'color', default: '#ffffff' },
      { key: 'layers', label: '云层数', type: 'range', min: 1, max: 5, step: 1, default: 3 },
      { key: 'speed', label: '速度', type: 'range', min: 0.1, max: 2, step: 0.1, default: 0.5 },
      { key: 'density', label: '云量', type: 'range', min: 0.3, max: 2, step: 0.1, default: 1 },
      { key: 'bgColor', label: '天空色', type: 'color', default: '#38bdf8' },
    ],
    generateHTML(p) {
      const id = 'cs' + Math.random().toString(36).slice(2, 8);
      const cc = p.cloudColor;
      return `<canvas id="${id}" style="width:100%;height:100%;display:block;border-radius:8px;"></canvas><script>(function(){var cv=document.getElementById('${id}');if(!cv)return;var ctx=cv.getContext('2d');var W,H,clouds=[];var sp=${p.speed},ly=${p.layers},dn=${p.density};function resize(){W=cv.width=cv.offsetWidth;H=cv.height=cv.offsetHeight;clouds=[];for(var l=0;l<ly;l++){var n=4+Math.floor(6*dn);for(var i=0;i<n;i++){clouds.push({l:l,x:Math.random()*(W+200)-100,y:H*0.2+l*H*0.2+Math.random()*H*0.15,w:120+Math.random()*200*dn,h:30+Math.random()*40,s:(0.2+(l+1)*0.2)*sp,o:0.5-Math.abs(l-ly/2)*0.15})}}}resize();window.addEventListener('resize',resize);var t=0;function draw(){t+=0.005;ctx.fillStyle='${p.bgColor}';ctx.fillRect(0,0,W,H);var grd=ctx.createLinearGradient(0,0,0,H);grd.addColorStop(0,'${p.bgColor}');grd.addColorStop(1,'rgba(255,255,255,0.2)');ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);for(var i=0;i<clouds.length;i++){var c=clouds[i];c.x+=c.s;if(c.x>W+200)c.x=-200-c.w;ctx.globalAlpha=c.o;ctx.fillStyle='${cc}';ctx.beginPath();ctx.ellipse(c.x,c.y,c.w,c.h,0,0,6.28);ctx.fill();ctx.beginPath();ctx.ellipse(c.x-c.w*0.3,c.y-c.h*0.3,c.w*0.6,c.h*0.7,0,0,6.28);ctx.fill();ctx.beginPath();ctx.ellipse(c.x+c.w*0.3,c.y-c.h*0.2,c.w*0.5,c.h*0.6,0,0,6.28);ctx.fill();}ctx.globalAlpha=1;requestAnimationFrame(draw);}draw();})();</script>`;
    },
  },

  // ── 全息投影 ──
  {
    id: 'hologram',
    name: '全息投影', level: 'advanced', category: '科技', icon: '📡',
    defaultParams: { color: '#00f0ff', speed: 1, intensity: 1, bgColor: '#050a15' },
    paramDefs: [
      { key: 'color', label: '全息色', type: 'color', default: '#00f0ff' },
      { key: 'speed', label: '速度', type: 'range', min: 0.3, max: 3, step: 0.1, default: 1 },
      { key: 'intensity', label: '强度', type: 'range', min: 0.3, max: 2, step: 0.1, default: 1 },
      { key: 'bgColor', label: '背景色', type: 'color', default: '#050a15' },
    ],
    generateHTML(p) {
      const id = 'ho' + Math.random().toString(36).slice(2, 8);
      const c = p.color;
      return `<canvas id="${id}" style="width:100%;height:100%;display:block;border-radius:8px;"></canvas><script>(function(){var cv=document.getElementById('${id}');if(!cv)return;var ctx=cv.getContext('2d');var W,H,t=0;var cl='${c}',sp=${p.speed},in=${p.intensity};var cR=parseInt(cl.slice(1,3),16),cG=parseInt(cl.slice(3,5),16),cB=parseInt(cl.slice(5,7),16);function resize(){W=cv.width=cv.offsetWidth;H=cv.height=cv.offsetHeight;}resize();window.addEventListener('resize',resize);function draw(){t+=0.02*sp;ctx.fillStyle='${p.bgColor}';ctx.fillRect(0,0,W,H);ctx.globalAlpha=0.15*in;for(var i=0;i<12;i++){var a=t+i*0.52;var r=Math.min(W,H)*0.35;ctx.strokeStyle='rgba('+cR+','+cG+','+cB+',1)';ctx.lineWidth=1;ctx.beginPath();ctx.arc(W*0.5+Math.cos(a)*r,H*0.5+Math.sin(a)*r,r*0.5,0,6.28);ctx.stroke();}ctx.globalAlpha=0.3*in;for(var i=0;i<20;i++){var a=t+i*0.3;var x=W*0.5+Math.cos(a)*Math.min(W,H)*0.4;var y=H*0.5+Math.sin(a*0.7)*H*0.3;ctx.fillStyle='rgba('+cR+','+cG+','+cB+','+(0.1+Math.random()*0.5)+')';ctx.beginPath();ctx.arc(x,y,1+Math.random()*2,0,6.28);ctx.fill();}ctx.fillStyle='rgba('+cR+','+cG+','+cB+','+(0.04*in)+')';ctx.fillRect(0,0,W,H);for(var i=0;i<40;i++){var y=i/40*H;var v=Math.sin(y*0.05+t*3+Math.random())*H*0.02;ctx.fillStyle='rgba('+cR+','+cG+','+cB+','+(0.02*in)+')';ctx.fillRect(0,y,W,1);}ctx.globalAlpha=1;requestAnimationFrame(draw);}draw();})();</script>`;
    },
  },

  // ── 科技网格 ──
  {
    id: 'tech-grid',
    name: '科技网格', level: 'advanced', category: '科技', icon: '▦',
    defaultParams: { color: '#06b6d4', speed: 0.5, intensity: 1, bgColor: '#020617' },
    paramDefs: [
      { key: 'color', label: '网格色', type: 'color', default: '#06b6d4' },
      { key: 'speed', label: '速度', type: 'range', min: 0.1, max: 2, step: 0.1, default: 0.5 },
      { key: 'intensity', label: '亮度', type: 'range', min: 0.3, max: 2, step: 0.1, default: 1 },
      { key: 'bgColor', label: '背景色', type: 'color', default: '#020617' },
    ],
    generateHTML(p) {
      const id = 'tg' + Math.random().toString(36).slice(2, 8);
      const c = p.color;
      return `<canvas id="${id}" style="width:100%;height:100%;display:block;border-radius:8px;"></canvas><script>(function(){var cv=document.getElementById('${id}');if(!cv)return;var ctx=cv.getContext('2d');var W,H,t=0;var sp=${p.speed},in=${p.intensity};var cR=parseInt('${c}'.slice(1,3),16),cG=parseInt('${c}'.slice(3,5),16),cB=parseInt('${c}'.slice(5,7),16);function resize(){W=cv.width=cv.offsetWidth;H=cv.height=cv.offsetHeight;}resize();window.addEventListener('resize',resize);function draw(){t+=0.005*sp;ctx.fillStyle='${p.bgColor}';ctx.fillRect(0,0,W,H);ctx.globalAlpha=0.3*in;ctx.strokeStyle='rgba('+cR+','+cG+','+cB+',1)';ctx.lineWidth=1;var gs=40;for(var x=0;x<W;x+=gs){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}for(var y=0;y<H;y+=gs){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}ctx.globalAlpha=0.5*in;ctx.lineWidth=2;var cp={x:W*0.3+Math.sin(t*0.5)*W*0.2,y:H*0.5};for(var i=0;i<12;i++){var a=t+i*0.52;var r=30+i*15;ctx.strokeStyle='rgba('+cR+','+cG+','+cB+','+(0.5-i/24)+')';ctx.beginPath();ctx.arc(cp.x,cp.y,r,0,6.28);ctx.stroke();}ctx.globalAlpha=0.8*in;for(var i=0;i<30;i++){var a=t+i*0.2;var r=Math.min(W,H)*0.35;ctx.fillStyle='rgba('+cR+','+cG+','+cB+','+(0.3+Math.random()*0.7)+')';var px=cp.x+Math.cos(a)*r;var py=cp.y+Math.sin(a)*r;ctx.beginPath();ctx.arc(px,py,1.5+Math.random()*2,0,6.28);ctx.fill();}ctx.globalAlpha=1;requestAnimationFrame(draw);}draw();})();</script>`;
    },
  },

  // ── 脉冲波 ──
  {
    id: 'pulse-wave',
    name: '脉冲波', level: 'basic', category: '科技', icon: '〰️',
    defaultParams: { color: '#6366f1', speed: 1, bgColor: '#0f172a' },
    paramDefs: [
      { key: 'color', label: '脉冲色', type: 'color', default: '#6366f1' },
      { key: 'speed', label: '速度', type: 'range', min: 0.3, max: 3, step: 0.1, default: 1 },
      { key: 'bgColor', label: '背景色', type: 'color', default: '#0f172a' },
    ],
    generateHTML(p) {
      const id = 'pw' + Math.random().toString(36).slice(2, 8);
      const c = p.color;
      return `<canvas id="${id}" style="width:100%;height:100%;display:block;border-radius:8px;"></canvas><script>(function(){var cv=document.getElementById('${id}');if(!cv)return;var ctx=cv.getContext('2d');var W,H,t=0;var sp=${p.speed};var cR=parseInt('${c}'.slice(1,3),16),cG=parseInt('${c}'.slice(3,5),16),cB=parseInt('${c}'.slice(5,7),16);var rings=[];for(var i=0;i<6;i++)rings.push({p:i/6,sp:0.5+Math.random()*0.5});function resize(){W=cv.width=cv.offsetWidth;H=cv.height=cv.offsetHeight;}resize();window.addEventListener('resize',resize);function draw(){t+=0.008*sp;ctx.fillStyle='${p.bgColor}';ctx.fillRect(0,0,W,H);var cx=W*0.5,cy=H*0.5;for(var r=0;r<rings.length;r++){var ri=rings[r];ri.p+=ri.sp*0.02*sp;if(ri.p>1)ri.p=0;var prog=ri.p;var radius=Math.min(W,H)*0.5*prog;var alpha=(1-prog)*0.6;ctx.beginPath();ctx.arc(cx,cy,radius,0,6.28);ctx.strokeStyle='rgba('+cR+','+cG+','+cB+','+alpha+')';ctx.lineWidth=2+6*prog;ctx.stroke();if(prog<0.15){var inner=ctx.createRadialGradient(cx,cy,0,cx,cy,radius);inner.addColorStop(0,'rgba('+cR+','+cG+','+cB+','+(0.2*(1-prog*7))+')');inner.addColorStop(1,'rgba('+cR+','+cG+','+cB+',0)');ctx.fillStyle=inner;ctx.beginPath();ctx.arc(cx,cy,radius,0,6.28);ctx.fill();}}requestAnimationFrame(draw);}draw();})();</script>`;
    },
  },

  // ── 五彩纸屑 ──
  {
    id: 'confetti',
    name: '五彩纸屑', level: 'basic', category: '粒子', icon: '🎊',
    defaultParams: { count: 80, speed: 1, color1: '#ff6b6b', color2: '#feca57', color3: '#48dbfb', bgColor: '#0f172a' },
    paramDefs: [
      { key: 'count', label: '数量', type: 'range', min: 20, max: 200, step: 10, default: 80 },
      { key: 'speed', label: '速度', type: 'range', min: 0.3, max: 2, step: 0.1, default: 1 },
      { key: 'color1', label: '颜色 1', type: 'color', default: '#ff6b6b' },
      { key: 'color2', label: '颜色 2', type: 'color', default: '#feca57' },
      { key: 'color3', label: '颜色 3', type: 'color', default: '#48dbfb' },
      { key: 'bgColor', label: '背景色', type: 'color', default: '#0f172a' },
    ],
    generateHTML(p) {
      const id = 'cf' + Math.random().toString(36).slice(2, 8);
      const cols = [p.color1, p.color2, p.color3];
      return `<canvas id="${id}" style="width:100%;height:100%;display:block;border-radius:8px;"></canvas><script>(function(){var cv=document.getElementById('${id}');if(!cv)return;var ctx=cv.getContext('2d');var W,H,parts=[];var sp=${p.speed},cnt=${p.count};var cls=['${p.color1}','${p.color2}','${p.color3}'];function resize(){W=cv.width=cv.offsetWidth;H=cv.height=cv.offsetHeight;parts=[];for(var i=0;i<cnt;i++)parts.push({x:Math.random()*W,y:Math.random()*-H,w:4+Math.random()*8,h:3+Math.random()*6,r:0,s:1+Math.random()*3*sp,c:cls[Math.floor(Math.random()*3)],rot:Math.random()*6.28,rs:0.02+Math.random()*0.05});}resize();window.addEventListener('resize',resize);function draw(){ctx.fillStyle='${p.bgColor}';ctx.fillRect(0,0,W,H);for(var i=0;i<parts.length;i++){var p=parts[i];p.y+=p.s*sp;p.x+=Math.sin(p.r)*0.5;p.rot+=p.rs;if(p.y>H+20){p.y=-20;p.x=Math.random()*W;p.s=1+Math.random()*3*sp;}ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);ctx.fillStyle=p.c;ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h);ctx.restore();}requestAnimationFrame(draw);}draw();})();</script>`;
    },
  },

  // ── 光柱 ──
  {
    id: 'light-beams',
    name: '光柱', level: 'advanced', category: '装饰', icon: '☀️',
    defaultParams: { color: '#fef3c7', count: 5, speed: 0.3, opacity: 0.12, bgColor: '#0f172a' },
    paramDefs: [
      { key: 'color', label: '光色', type: 'color', default: '#fef3c7' },
      { key: 'count', label: '光柱数', type: 'range', min: 2, max: 12, step: 1, default: 5 },
      { key: 'speed', label: '速度', type: 'range', min: 0.1, max: 2, step: 0.1, default: 0.3 },
      { key: 'opacity', label: '透明度', type: 'range', min: 0.03, max: 0.4, step: 0.01, default: 0.12 },
      { key: 'bgColor', label: '背景色', type: 'color', default: '#0f172a' },
    ],
    generateHTML(p) {
      const id = 'lb' + Math.random().toString(36).slice(2, 8);
      const c = p.color;
      return `<canvas id="${id}" style="width:100%;height:100%;display:block;border-radius:8px;"></canvas><script>(function(){var cv=document.getElementById('${id}');if(!cv)return;var ctx=cv.getContext('2d');var W,H,t=0;var sp=${p.speed},op=${p.opacity},cnt=${p.count};var cR=parseInt('${c}'.slice(1,3),16),cG=parseInt('${c}'.slice(3,5),16),cB=parseInt('${c}'.slice(5,7),16);function resize(){W=cv.width=cv.offsetWidth;H=cv.height=cv.offsetHeight;}resize();window.addEventListener('resize',resize);function draw(){t+=0.003*sp;ctx.fillStyle='${p.bgColor}';ctx.fillRect(0,0,W,H);for(var i=0;i<cnt;i++){var bx=W*(0.1+(i+0.5)/cnt)+Math.sin(t+i*1.2)*W*0.08;var bw=W*0.04+Math.sin(t*0.7+i*0.8)*W*0.02;var grad=ctx.createLinearGradient(0,0,0,H);grad.addColorStop(0,'rgba('+cR+','+cG+','+cB+','+(op*2)+')');grad.addColorStop(0.3,'rgba('+cR+','+cG+','+cB+','+op+')');grad.addColorStop(1,'rgba('+cR+','+cG+','+cB+',0)');ctx.fillStyle=grad;ctx.beginPath();ctx.moveTo(bx-bw/2,0);ctx.lineTo(bx+bw/2,0);ctx.lineTo(bx+bw/2+bw*2,H);ctx.lineTo(bx-bw/2-bw*2,H);ctx.closePath();ctx.fill();}requestAnimationFrame(draw);}draw();})();</script>`;
    },
  },

  // ── 泡泡 ──
  {
    id: 'bubbles',
    name: '泡泡', level: 'basic', category: '粒子', icon: '🫧',
    defaultParams: { count: 25, speed: 0.3, size: 5, color: '#ffffff', bgColor: '#0c1929' },
    paramDefs: [
      { key: 'count', label: '数量', type: 'range', min: 5, max: 60, step: 2, default: 25 },
      { key: 'speed', label: '上升速度', type: 'range', min: 0.1, max: 2, step: 0.1, default: 0.3 },
      { key: 'size', label: '大小', type: 'range', min: 2, max: 10, step: 0.5, default: 5 },
      { key: 'color', label: '颜色', type: 'color', default: '#ffffff' },
      { key: 'bgColor', label: '背景色', type: 'color', default: '#0c1929' },
    ],
    generateHTML(p) {
      const id = 'bb' + Math.random().toString(36).slice(2, 8);
      return `<canvas id="${id}" style="width:100%;height:100%;display:block;border-radius:8px;"></canvas><script>(function(){var cv=document.getElementById('${id}');if(!cv)return;var ctx=cv.getContext('2d');var W,H,bubbles=[];var sp=${p.speed},sz=${p.size},cnt=${p.count};var c='${p.color}';var cR=parseInt(c.slice(1,3),16),cG=parseInt(c.slice(3,5),16),cB=parseInt(c.slice(5,7),16);function resize(){W=cv.width=cv.offsetWidth;H=cv.height=cv.offsetHeight;bubbles=[];for(var i=0;i<cnt;i++)bubbles.push({x:Math.random()*W,y:Math.random()*H,r:2+Math.random()*sz,s:0.2+Math.random()*sp,o:0.15+Math.random()*0.35,w:Math.random()*6.28,ws:0.01+Math.random()*0.02});}resize();window.addEventListener('resize',resize);function draw(){ctx.fillStyle='${p.bgColor}';ctx.fillRect(0,0,W,H);for(var i=0;i<bubbles.length;i++){var b=bubbles[i];b.w+=b.ws;b.x+=Math.sin(b.w)*0.3;b.y-=b.s*sp;if(b.y<-b.r*2){b.y=H+b.r*2;b.x=Math.random()*W;b.s=0.2+Math.random()*sp;}ctx.strokeStyle='rgba('+cR+','+cG+','+cB+','+b.o+')';ctx.lineWidth=1;ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,6.28);ctx.stroke();ctx.fillStyle='rgba('+cR+','+cG+','+cB+','+(b.o*0.3)+')';ctx.fill();ctx.fillStyle='rgba(255,255,255,'+(b.o*0.5)+')';ctx.beginPath();ctx.arc(b.x-b.r*0.3,b.y-b.r*0.3,b.r*0.25,0,6.28);ctx.fill();}requestAnimationFrame(draw);}draw();})();</script>`;
    },
  },

  // ── 黄昏 ──
  {
    id: 'twilight',
    name: '黄昏', level: 'advanced', category: '自然', icon: '🌆',
    defaultParams: { color1: '#ff6b35', color2: '#c44569', color3: '#574b90', stars: true, speed: 0.3, bgColor: '#1a0a2e' },
    paramDefs: [
      { key: 'color1', label: '晚霞色 1', type: 'color', default: '#ff6b35' },
      { key: 'color2', label: '晚霞色 2', type: 'color', default: '#c44569' },
      { key: 'color3', label: '晚霞色 3', type: 'color', default: '#574b90' },
      { key: 'stars', label: '星星', type: 'boolean', default: true },
      { key: 'speed', label: '速度', type: 'range', min: 0.1, max: 2, step: 0.1, default: 0.3 },
      { key: 'bgColor', label: '底色', type: 'color', default: '#1a0a2e' },
    ],
    generateHTML(p) {
      const id = 'tw' + Math.random().toString(36).slice(2, 8);
      return `<canvas id="${id}" style="width:100%;height:100%;display:block;border-radius:8px;"></canvas><script>(function(){var cv=document.getElementById('${id}');if(!cv)return;var ctx=cv.getContext('2d');var W,H,t=0;var sp=${p.speed};var c1='${p.color1}',c2='${p.color2}',c3='${p.color3}';function resize(){W=cv.width=cv.offsetWidth;H=cv.height=cv.offsetHeight;}resize();window.addEventListener('resize',resize);function draw(){t+=0.002*sp;ctx.fillStyle='${p.bgColor}';ctx.fillRect(0,0,W,H);var grd=ctx.createLinearGradient(0,0,0,H);grd.addColorStop(0,c3);grd.addColorStop(0.3,c2);grd.addColorStop(0.6,c1);grd.addColorStop(0.8,'#ffd93d');grd.addColorStop(1,'#ff6b35');ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);if(${p.stars}){for(var i=0;i<60;i++){var x=Math.random()*W,y=Math.random()*H*0.4;var alpha=(1-y/(H*0.4))*Math.random()*0.8;ctx.fillStyle='rgba(255,255,255,'+alpha+')';ctx.beginPath();ctx.arc(x,y,0.5+Math.random()*1.5,0,6.28);ctx.fill();}}ctx.fillStyle='rgba(255,200,100,0.03)';ctx.beginPath();ctx.arc(W*0.3+Math.sin(t)*W*0.1,H*0.7+Math.cos(t*0.7)*H*0.05,Math.min(W,H)*0.18,0,6.28);ctx.fill();ctx.shadowBlur=0;var green=ctx.createLinearGradient(0,H*0.7,0,H);green.addColorStop(0,'rgba(0,0,0,0)');green.addColorStop(1,'rgba(0,20,10,0.6)');ctx.fillStyle=green;ctx.fillRect(0,H*0.7,W,H*0.3);requestAnimationFrame(draw);}draw();})();</script>`;
    },
  },
];

export const EFFECT_CATEGORIES = [...new Set(EFFECT_TEMPLATES.map(t => t.category))];

export function getEffectTemplate(id: string): EffectTemplate | undefined {
  return EFFECT_TEMPLATES.find(t => t.id === id);
}
