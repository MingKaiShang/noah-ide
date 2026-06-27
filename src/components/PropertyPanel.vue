<template>
  <div class="property-panel">
    <div v-if="!selected" class="empty-state">
      <p>请选中一个组件</p>
      <p class="hint">点击画布上的组件以编辑其属性</p>
    </div>
    <div v-else class="prop-content">
      <div class="prop-header">
        <span class="type-badge">{{ selected.type }}</span>
        <n-button size="small" type="error" quaternary @click="deleteComp">删除</n-button>
      </div>

      <n-divider>位置和大小</n-divider>
      <div class="prop-grid">
        <div class="prop-item">
          <label>X</label>
          <input type="number" class="num-input" :value="selected.position.x" @input="e => updatePos('x', Number((e.target as HTMLInputElement).value) || 0)" @wheel.prevent="onWheel($event, v => updatePos('x', v))" />
        </div>
        <div class="prop-item">
          <label>Y</label>
          <input type="number" class="num-input" :value="selected.position.y" @input="e => updatePos('y', Number((e.target as HTMLInputElement).value) || 0)" @wheel.prevent="onWheel($event, v => updatePos('y', v))" />
        </div>
        <div class="prop-item">
          <label>宽度</label>
          <input type="number" class="num-input" :value="selected.size.width" @input="e => updateSize('width', Math.max(1, Number((e.target as HTMLInputElement).value) || 1))" @wheel.prevent="onWheel($event, v => updateSize('width', Math.max(1, v)))" />
        </div>
        <div class="prop-item">
          <label>高度</label>
          <input type="number" class="num-input" :value="selected.size.height" @input="e => updateSize('height', Math.max(1, Number((e.target as HTMLInputElement).value) || 1))" @wheel.prevent="onWheel($event, v => updateSize('height', Math.max(1, v)))" />
        </div>
      </div>

      <n-divider>属性</n-divider>
      <div class="prop-list">
        <!-- Text -->
        <template v-if="selected.type === 'Text'">
          <div class="prop-item"><label>对齐</label><div class="align-row"><div class="align-group"><button v-for="v in ['flex-start','center','flex-end']" :key="v" class="align-btn" :class="{ active: selected.props.alignItems === v }" @click="updateProp('alignItems', v)">{{ v === 'flex-start' ? '△' : v === 'center' ? '□' : '▽' }}</button></div><div class="align-group"><button v-for="v in ['left','center','right']" :key="v" class="align-btn" :class="{ active: selected.props.textAlign === v }" @click="updateProp('textAlign', v)">{{ v === 'left' ? '◁' : v === 'center' ? '■' : '▷' }}</button></div></div></div>
          <div class="prop-item"><label>文本</label><textarea class="native-input native-textarea" :value="selected.props.text" rows="3" @input="e => updateProp('text', (e.target as HTMLTextAreaElement).value)"></textarea></div>
          <div class="prop-item"><label>字号</label><input type="number" class="num-input" :value="selected.props.fontSize" @input="e => updateProp('fontSize', Math.max(1, Number((e.target as HTMLInputElement).value) || 1))" @wheel.prevent="onWheel($event, v => updateProp('fontSize', Math.max(1, v)))" /></div>
          <div class="prop-item"><label>颜色</label><input type="color" class="color-swatch-sm" :value="selected.props.color" @input="e => updateProp('color', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>字重</label><select class="native-select" :value="selected.props.fontWeight" @change="e => updateProp('fontWeight', (e.target as HTMLSelectElement).value)"><option value="normal">正常</option><option value="bold">粗体</option><option value="300">300</option><option value="900">特粗</option></select></div>
          <div class="prop-item"><label>字体</label><select class="native-select" :value="selected.props.fontFamily" @change="e => updateProp('fontFamily', (e.target as HTMLSelectElement).value)"><optgroup v-for="cat in fontCats" :key="cat" :label="cat"><option v-for="f in fontOptions.filter(o => o.category === cat)" :key="f.value" :value="f.value">{{ f.label }}</option></optgroup></select></div>
          <div class="prop-item">
            <label>富文本</label>
            <label class="switch-label"><input type="checkbox" :checked="selected.props.richText" @change="e => { const v = (e.target as HTMLInputElement).checked; updateProp('richText', v); if (v && !selected.props.htmlContent) updateProp('htmlContent', selected.props.text); }" /><span class="switch-track"></span></label>
          </div>
          <template v-if="selected.props.richText">
            <div class="rich-toolbar">
              <button class="rt-btn" title="粗体" @click="execCmd('bold')"><b>B</b></button>
              <button class="rt-btn" title="斜体" @click="execCmd('italic')"><i>I</i></button>
              <button class="rt-btn" title="下划线" @click="execCmd('underline')"><u>U</u></button>
              <button class="rt-btn" title="删除线" @click="execCmd('strikeThrough')"><s>S</s></button>
              <button class="rt-btn" title="项目列表" @click="execCmd('insertUnorderedList')">•≡</button>
              <button class="rt-btn" title="编号列表" @click="execCmd('insertOrderedList')">1.</button>
              <button class="rt-btn" title="清除格式" @click="execCmd('removeFormat')">×</button>
            </div>
            <div class="prop-item" style="grid-column:1/-1;">
              <div class="rich-editor" contenteditable="true"
                   ref="richEditorRef"
                   @input="onRichInput"
                   @keydown="onRichKeydown"
                   v-html="richEditorContent"></div>
            </div>
          </template>
        </template>

        <!-- Image -->
        <template v-if="selected.type === 'Image'">
          <div class="prop-item"><label>图片URL</label><div class="url-row"><input class="native-input" :value="selected.props.src" @input="e => updateProp('src', (e.target as HTMLInputElement).value)" /><button class="pick-btn" @click="pickImageFile" title="选择本地图片">📁</button></div></div>
          <div class="prop-item"><label>替代文本</label><input class="native-input" :value="selected.props.alt" @input="e => updateProp('alt', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>圆角</label><input type="number" class="num-input" :value="selected.props.borderRadius" @input="e => updateProp('borderRadius', Math.max(0, Number((e.target as HTMLInputElement).value) || 0))" @wheel.prevent="onWheel($event, v => updateProp('borderRadius', Math.max(0, v)))" /></div>
          <div class="prop-item"><label>填充模式</label><select class="native-select" :value="selected.props.objectFit" @change="e => updateProp('objectFit', (e.target as HTMLSelectElement).value)"><option value="cover">覆盖</option><option value="contain">包含</option><option value="fill">拉伸</option></select></div>
        </template>

        <!-- Rectangle -->
        <template v-if="selected.type === 'Rectangle'">
          <div class="prop-item"><label>填充方式</label><input type="color" class="color-swatch-sm" :value="selected.props.fill" @input="e => updateProp('fill', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>边框颜色</label><input type="color" class="color-swatch-sm" :value="selected.props.stroke" @input="e => updateProp('stroke', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>边框宽度</label><input type="number" class="num-input" :value="selected.props.strokeWidth" @input="e => updateProp('strokeWidth', Math.max(0, Number((e.target as HTMLInputElement).value) || 0))" @wheel.prevent="onWheel($event, v => updateProp('strokeWidth', Math.max(0, v)))" /></div>
          <div class="prop-item"><label>圆角</label><input type="number" class="num-input" :value="selected.props.cornerRadius" @input="e => updateProp('cornerRadius', Math.max(0, Number((e.target as HTMLInputElement).value) || 0))" @wheel.prevent="onWheel($event, v => updateProp('cornerRadius', Math.max(0, v)))" /></div>
        </template>

        <!-- GradientText -->
        <template v-if="selected.type === 'GradientText'">
          <div class="prop-item"><label>对齐</label><div class="align-row"><div class="align-group"><button v-for="v in ['flex-start','center','flex-end']" :key="v" class="align-btn" :class="{ active: selected.props.alignItems === v }" @click="updateProp('alignItems', v)">{{ v === 'flex-start' ? '△' : v === 'center' ? '□' : '▽' }}</button></div><div class="align-group"><button v-for="v in ['left','center','right']" :key="v" class="align-btn" :class="{ active: selected.props.textAlign === v }" @click="updateProp('textAlign', v)">{{ v === 'left' ? '◁' : v === 'center' ? '■' : '▷' }}</button></div></div></div>
          <div class="prop-item"><label>文本</label><textarea class="native-input native-textarea" :value="selected.props.text" rows="2" @input="e => updateProp('text', (e.target as HTMLTextAreaElement).value)"></textarea></div>
          <div class="prop-item"><label>字号</label><input type="number" class="num-input" :value="selected.props.fontSize" @input="e => updateProp('fontSize', Math.max(1, Number((e.target as HTMLInputElement).value) || 1))" @wheel.prevent="onWheel($event, v => updateProp('fontSize', Math.max(1, v)))" /></div>
          <div class="prop-item"><label>字重</label><select class="native-select" :value="selected.props.fontWeight" @change="e => updateProp('fontWeight', (e.target as HTMLSelectElement).value)"><option value="normal">正常</option><option value="bold">粗体</option><option value="900">特粗</option></select></div>
          <div class="prop-item"><label>字体</label><select class="native-select" :value="selected.props.fontFamily" @change="e => updateProp('fontFamily', (e.target as HTMLSelectElement).value)"><optgroup v-for="cat in fontCats" :key="cat" :label="cat"><option v-for="f in fontOptions.filter(o => o.category === cat)" :key="f.value" :value="f.value">{{ f.label }}</option></optgroup></select></div>
          <div class="prop-item"><label>渐变起始色</label><input type="color" class="color-swatch-sm" :value="selected.props.gradientStart" @input="e => updateProp('gradientStart', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>渐变中间色</label><input type="color" class="color-swatch-sm" :value="selected.props.gradientMid" @input="e => updateProp('gradientMid', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>渐变结束色</label><input type="color" class="color-swatch-sm" :value="selected.props.gradientEnd" @input="e => updateProp('gradientEnd', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>渐变角度</label><input type="number" class="num-input" :value="selected.props.gradientAngle" @input="e => updateProp('gradientAngle', Number((e.target as HTMLInputElement).value) || 0)" @wheel.prevent="onWheel($event, v => updateProp('gradientAngle', v))" /></div>
          <div class="prop-item"><label>字间距</label><input type="number" class="num-input" step="0.5" :value="selected.props.letterSpacing" @input="e => updateProp('letterSpacing', Number((e.target as HTMLInputElement).value) || 0)" @wheel.prevent="onWheel($event, v => updateProp('letterSpacing', v), 0.5)" /></div>
        </template>

        <!-- Container -->
        <template v-if="selected.type === 'Container'">
          <div class="prop-item"><label>背景</label><div class="color-row"><input type="color" class="color-swatch-sm" :value="parseColor(selected.props.background)" @input="e => updateProp('background', toRgba((e.target as HTMLInputElement).value, getAlpha(selected.props.background)))" /><input type="number" class="num-input opacity-input" min="0" max="1" step="0.05" :value="Math.round(getAlpha(selected.props.background) * 100)" @input="e => updateProp('background', toRgba(parseColor(selected.props.background), Math.max(0, Math.min(100, Number((e.target as HTMLInputElement).value) || 0)) / 100))" @wheel.prevent="onWheel($event, v => updateProp('background', toRgba(parseColor(selected.props.background), Math.max(0, Math.min(100, v)) / 100)))" /><span class="opacity-suffix">%</span></div></div>
          <div class="prop-item"><label>边框颜色</label><div class="color-row"><input type="color" class="color-swatch-sm" :value="parseColor(selected.props.borderColor)" @input="e => updateProp('borderColor', toRgba((e.target as HTMLInputElement).value, getAlpha(selected.props.borderColor)))" /><input type="number" class="num-input opacity-input" min="0" max="1" step="0.05" :value="Math.round(getAlpha(selected.props.borderColor) * 100)" @input="e => updateProp('borderColor', toRgba(parseColor(selected.props.borderColor), Math.max(0, Math.min(100, Number((e.target as HTMLInputElement).value) || 0)) / 100))" @wheel.prevent="onWheel($event, v => updateProp('borderColor', toRgba(parseColor(selected.props.borderColor), Math.max(0, Math.min(100, v)) / 100)))" /><span class="opacity-suffix">%</span></div></div>
          <div class="prop-item"><label>边框宽度</label><input type="number" class="num-input" :value="selected.props.borderWidth" @input="e => updateProp('borderWidth', Math.max(0, Number((e.target as HTMLInputElement).value) || 0))" @wheel.prevent="onWheel($event, v => updateProp('borderWidth', Math.max(0, v)))" /></div>
          <div class="prop-item"><label>圆角</label><input type="number" class="num-input" :value="selected.props.cornerRadius" @input="e => updateProp('cornerRadius', Math.max(0, Number((e.target as HTMLInputElement).value) || 0))" @wheel.prevent="onWheel($event, v => updateProp('cornerRadius', Math.max(0, v)))" /></div>
          <div class="prop-item"><label>模糊</label><input type="number" class="num-input" :value="selected.props.blur" @input="e => updateProp('blur', Math.max(0, Number((e.target as HTMLInputElement).value) || 0))" @wheel.prevent="onWheel($event, v => updateProp('blur', Math.max(0, v)))" /></div>
          <div class="prop-item"><label>内边距</label><input type="number" class="num-input" :value="selected.props.padding" @input="e => updateProp('padding', Math.max(0, Number((e.target as HTMLInputElement).value) || 0))" @wheel.prevent="onWheel($event, v => updateProp('padding', Math.max(0, v)))" /></div>
        </template>

        <!-- Badge -->
        <template v-if="selected.type === 'Badge'">
          <div class="prop-item"><label>对齐</label><div class="align-row"><div class="align-group"><button v-for="v in ['flex-start','center','flex-end']" :key="v" class="align-btn" :class="{ active: selected.props.alignItems === v }" @click="updateProp('alignItems', v)">{{ v === 'flex-start' ? '△' : v === 'center' ? '□' : '▽' }}</button></div><div class="align-group"><button v-for="v in ['left','center','right']" :key="v" class="align-btn" :class="{ active: selected.props.textAlign === v }" @click="updateProp('textAlign', v)">{{ v === 'left' ? '◁' : v === 'center' ? '■' : '▷' }}</button></div></div></div>
          <div class="prop-item"><label>文字色</label><input class="native-input" :value="selected.props.text" @input="e => updateProp('text', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>字号</label><input type="number" class="num-input" :value="selected.props.fontSize" @input="e => updateProp('fontSize', Math.max(1, Number((e.target as HTMLInputElement).value) || 1))" @wheel.prevent="onWheel($event, v => updateProp('fontSize', Math.max(1, v)))" /></div>
          <div class="prop-item"><label>文字色颜色</label><input type="color" class="color-swatch-sm" :value="selected.props.color" @input="e => updateProp('color', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>背景</label><div class="color-row"><input type="color" class="color-swatch-sm" :value="parseColor(selected.props.background)" @input="e => updateProp('background', toRgba((e.target as HTMLInputElement).value, getAlpha(selected.props.background)))" /><input type="number" class="num-input opacity-input" min="0" max="1" step="0.05" :value="Math.round(getAlpha(selected.props.background) * 100)" @input="e => updateProp('background', toRgba(parseColor(selected.props.background), Math.max(0, Math.min(100, Number((e.target as HTMLInputElement).value) || 0)) / 100))" @wheel.prevent="onWheel($event, v => updateProp('background', toRgba(parseColor(selected.props.background), Math.max(0, Math.min(100, v)) / 100)))" /><span class="opacity-suffix">%</span></div></div>
          <div class="prop-item"><label>边框颜色</label><div class="color-row"><input type="color" class="color-swatch-sm" :value="parseColor(selected.props.borderColor)" @input="e => updateProp('borderColor', toRgba((e.target as HTMLInputElement).value, getAlpha(selected.props.borderColor)))" /><input type="number" class="num-input opacity-input" min="0" max="1" step="0.05" :value="Math.round(getAlpha(selected.props.borderColor) * 100)" @input="e => updateProp('borderColor', toRgba(parseColor(selected.props.borderColor), Math.max(0, Math.min(100, Number((e.target as HTMLInputElement).value) || 0)) / 100))" @wheel.prevent="onWheel($event, v => updateProp('borderColor', toRgba(parseColor(selected.props.borderColor), Math.max(0, Math.min(100, v)) / 100)))" /><span class="opacity-suffix">%</span></div></div>
          <div class="prop-item"><label>圆角</label><input type="number" class="num-input" :value="selected.props.borderRadius" @input="e => updateProp('borderRadius', Math.max(0, Number((e.target as HTMLInputElement).value) || 0))" @wheel.prevent="onWheel($event, v => updateProp('borderRadius', Math.max(0, v)))" /></div>
        </template>

        <!-- IconBox -->
        <template v-if="selected.type === 'IconBox'">
          <div class="prop-item"><label>图标颜色</label><input type="color" class="color-swatch-sm" :value="selected.props.iconColor" @input="e => updateProp('iconColor', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>图标大小</label><input type="number" class="num-input" :value="selected.props.iconSize" @input="e => updateProp('iconSize', Math.max(1, Number((e.target as HTMLInputElement).value) || 1))" @wheel.prevent="onWheel($event, v => updateProp('iconSize', Math.max(1, v)))" /></div>
          <div class="prop-item"><label>背景</label><div class="color-row"><input type="color" class="color-swatch-sm" :value="parseColor(selected.props.background)" @input="e => updateProp('background', toRgba((e.target as HTMLInputElement).value, getAlpha(selected.props.background)))" /><input type="number" class="num-input opacity-input" min="0" max="1" step="0.05" :value="Math.round(getAlpha(selected.props.background) * 100)" @input="e => updateProp('background', toRgba(parseColor(selected.props.background), Math.max(0, Math.min(100, Number((e.target as HTMLInputElement).value) || 0)) / 100))" @wheel.prevent="onWheel($event, v => updateProp('background', toRgba(parseColor(selected.props.background), Math.max(0, Math.min(100, v)) / 100)))" /><span class="opacity-suffix">%</span></div></div>
          <div class="prop-item"><label>圆角</label><input type="number" class="num-input" :value="selected.props.cornerRadius" @input="e => updateProp('cornerRadius', Math.max(0, Number((e.target as HTMLInputElement).value) || 0))" @wheel.prevent="onWheel($event, v => updateProp('cornerRadius', Math.max(0, v)))" /></div>
          <div class="prop-item">
            <label>图标</label>
            <div class="icon-actions">
              <button class="icon-btn-sm" @click="pickSvgFile">导入SVG文件</button>
              <button class="icon-btn-sm" @click="showIconLib = !showIconLib">图标库</button>
            </div>
          </div>
          <div v-if="showIconLib" class="icon-lib">
            <input class="icon-lib-search" type="text" v-model="iconSearch" placeholder="搜索图标..." />
            <div class="icon-lib-tabs">
              <span v-for="cat in ICON_LIB_CATS" :key="cat.name" class="icon-lib-tab"
                    :class="{ active: iconLibCat === cat.name }" @click="iconLibCat = cat.name; iconSearch = ''">
                {{ cat.name }} <span class="icon-lib-count">{{ cat.icons.length }}</span>
              </span>
            </div>
            <div class="icon-lib-grid">
              <div v-for="icon in filteredIcons" :key="icon.name" class="icon-lib-item"
                   :class="{ selected: selected.props.iconSvg === icon.svg }"
                   :title="icon.name" @click="updateProp('iconSvg', icon.svg)"
                   v-html="icon.svg"></div>
              <div v-if="filteredIcons.length === 0" class="icon-lib-empty">无匹配图标</div>
            </div>
          </div>
          <div class="prop-item"><label>SVG代码</label><textarea class="native-input native-textarea" :value="selected.props.iconSvg" rows="3" @input="e => updateProp('iconSvg', (e.target as HTMLTextAreaElement).value)"></textarea></div>
        </template>

        <!-- AmbientOrb -->
        <template v-if="selected.type === 'AmbientOrb'">
          <div class="prop-item"><label>颜色</label><input type="color" class="color-swatch-sm" :value="selected.props.color" @input="e => updateProp('color', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>透明度</label><input type="number" class="num-input" step="0.01" :value="selected.props.opacity" @input="e => updateProp('opacity', Math.max(0, Math.min(1, Number((e.target as HTMLInputElement).value) || 0)))" @wheel.prevent="onWheel($event, v => updateProp('opacity', Math.max(0, Math.min(1, v))), 0.01)" /></div>
          <div class="prop-item"><label>模糊度</label><input type="number" class="num-input" :value="selected.props.blur" @input="e => updateProp('blur', Math.max(0, Number((e.target as HTMLInputElement).value) || 0))" @wheel.prevent="onWheel($event, v => updateProp('blur', Math.max(0, v)))" /></div>
          <div class="prop-item"><label>动画</label><label class="switch-label"><input type="checkbox" :checked="selected.props.animate" @change="e => updateProp('animate', (e.target as HTMLInputElement).checked)" /><span class="switch-track"></span></label></div>
          <div class="prop-item"><label>动画时长(s)</label><input type="number" class="num-input" :value="selected.props.animDuration" @input="e => updateProp('animDuration', Math.max(1, Number((e.target as HTMLInputElement).value) || 1))" @wheel.prevent="onWheel($event, v => updateProp('animDuration', Math.max(1, v)))" /></div>
        </template>

        <!-- MqttDisplay -->
        <template v-if="selected.type === 'MqttDisplay'">
          <div class="prop-item"><label>样式</label><div class="preset-group"><button v-for="s in MQTT_STYLE_PRESETS" :key="s.value" class="preset-btn" :class="{ active: (selected.props.stylePreset || 'card') === s.value }" @click="updateProp('stylePreset', s.value)">{{ s.label }}</button></div></div>
          <div class="prop-item"><label>对齐</label><div class="align-row"><div class="align-group"><button v-for="v in ['flex-start','center','flex-end']" :key="v" class="align-btn" :class="{ active: selected.props.alignItems === v }" @click="updateProp('alignItems', v)">{{ v === 'flex-start' ? '△' : v === 'center' ? '□' : '▽' }}</button></div><div class="align-group"><button v-for="v in ['left','center','right']" :key="v" class="align-btn" :class="{ active: selected.props.textAlign === v }" @click="updateProp('textAlign', v)">{{ v === 'left' ? '◁' : v === 'center' ? '■' : '▷' }}</button></div></div></div>
          <div class="prop-item"><label>Broker URL</label><input class="native-input" :value="selected.props.brokerUrl" @input="e => updateProp('brokerUrl', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>用户名</label><input class="native-input" :value="selected.props.username" placeholder="可选" @input="e => updateProp('username', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>密码</label><input class="native-input" type="password" :value="selected.props.password" placeholder="可选" @input="e => updateProp('password', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>Topic</label><input class="native-input" :value="selected.props.topic" @input="e => updateProp('topic', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>取值Key</label><input class="native-input" :value="selected.props.valueKey" placeholder="如 mq4，留空显示原文" @input="e => updateProp('valueKey', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>标签</label><input class="native-input" :value="selected.props.label" @input="e => updateProp('label', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>单位</label><input class="native-input" :value="selected.props.unit" @input="e => updateProp('unit', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>小数位数</label><input type="number" class="num-input" :value="selected.props.decimalPlaces" placeholder="-1 保留原始值" @input="e => updateProp('decimalPlaces', Number((e.target as HTMLInputElement).value))" @wheel.prevent="onWheel($event, v => updateProp('decimalPlaces', v))" /></div>
          <div class="prop-item"><label>字号</label><input type="number" class="num-input" :value="selected.props.fontSize" @input="e => updateProp('fontSize', Math.max(1, Number((e.target as HTMLInputElement).value) || 1))" @wheel.prevent="onWheel($event, v => updateProp('fontSize', Math.max(1, v)))" /></div>
          <div class="prop-item"><label>颜色</label><input type="color" class="color-swatch-sm" :value="selected.props.color" @input="e => updateProp('color', (e.target as HTMLInputElement).value)" /></div>
        </template>

        <!-- ChartLine -->
        <template v-if="selected.type === 'ChartLine'">
          <div class="prop-item"><label>样式</label><div class="preset-group"><button v-for="s in CHART_STYLE_PRESETS" :key="s.value" class="preset-btn" :class="{ active: (selected.props.stylePreset || 'line') === s.value }" @click="updateProp('stylePreset', s.value)">{{ s.label }}</button></div></div>
          <div class="prop-item"><label>MQTT Topic</label><input class="native-input" :value="selected.props.mqttTopic" placeholder="留空使用静态数据" @input="e => updateProp('mqttTopic', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>取值 Key</label><input class="native-input" :value="selected.props.valueKey" placeholder="如 mq4，留空显示原文" @input="e => updateProp('valueKey', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>最大点数</label><input type="number" class="num-input" :value="selected.props.maxPoints" @input="e => updateProp('maxPoints', Math.max(2, Number((e.target as HTMLInputElement).value) || 20))" @wheel.prevent="onWheel($event, v => updateProp('maxPoints', Math.max(2, v)))" /></div>
          <div class="prop-item"><label>数据 (JSON数组)</label><textarea class="native-input native-textarea" :value="selected.props.data" rows="3" @input="e => updateProp('data', (e.target as HTMLTextAreaElement).value)"></textarea></div>
          <div class="prop-item"><label>线条颜色</label><input type="color" class="color-swatch-sm" :value="selected.props.color" @input="e => updateProp('color', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>标题</label><input class="native-input" :value="selected.props.title" @input="e => updateProp('title', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>Y轴名称</label><input class="native-input" :value="selected.props.yAxisName" @input="e => updateProp('yAxisName', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>线宽</label><input type="number" class="num-input" :value="selected.props.lineWidth" @input="e => updateProp('lineWidth', Math.max(1, Number((e.target as HTMLInputElement).value) || 1))" @wheel.prevent="onWheel($event, v => updateProp('lineWidth', Math.max(1, v)))" /></div>
        </template>

        <!-- List -->
        <template v-if="selected.type === 'List'">
          <div class="prop-item"><label>要点 (JSON数组)</label><textarea class="native-input native-textarea" :value="selected.props.items" rows="4" @input="e => updateProp('items', (e.target as HTMLTextAreaElement).value)"></textarea></div>
          <div class="prop-item"><label>符号样式</label><select class="native-select" :value="selected.props.bulletStyle" @change="e => updateProp('bulletStyle', (e.target as HTMLSelectElement).value)"><option value="disc">圆点</option><option value="circle">空心圆</option><option value="check">对勾</option><option value="arrow">箭头</option><option value="number">编号</option></select></div>
          <div class="prop-item"><label>字号</label><input type="number" class="num-input" :value="selected.props.fontSize" @input="e => updateProp('fontSize', Math.max(1, Number((e.target as HTMLInputElement).value) || 1))" @wheel.prevent="onWheel($event, v => updateProp('fontSize', Math.max(1, v)))" /></div>
          <div class="prop-item"><label>颜色</label><input type="color" class="color-swatch-sm" :value="selected.props.color" @input="e => updateProp('color', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>字体</label><select class="native-select" :value="selected.props.fontFamily" @change="e => updateProp('fontFamily', (e.target as HTMLSelectElement).value)"><optgroup v-for="cat in fontCats" :key="cat" :label="cat"><option v-for="f in fontOptions.filter(o => o.category === cat)" :key="f.value" :value="f.value">{{ f.label }}</option></optgroup></select></div>
          <div class="prop-item"><label>行间距</label><input type="number" class="num-input" :value="selected.props.lineSpacing" @input="e => updateProp('lineSpacing', Math.max(0, Number((e.target as HTMLInputElement).value) || 0))" @wheel.prevent="onWheel($event, v => updateProp('lineSpacing', Math.max(0, v)))" /></div>
        </template>

        <!-- Video -->
        <template v-if="selected.type === 'Video'">
          <div class="prop-item"><label>视频URL</label><div class="url-row"><input class="native-input" :value="selected.props.src" placeholder="视频地址" @input="e => updateProp('src', (e.target as HTMLInputElement).value)" /><button class="pick-btn" @click="pickVideoFile" title="选择本地视频">📁</button></div></div>
          <div class="prop-item"><label>填充模式</label><select class="native-select" :value="selected.props.objectFit" @change="e => updateProp('objectFit', (e.target as HTMLSelectElement).value)"><option value="cover">覆盖</option><option value="contain">包含</option><option value="fill">拉伸</option></select></div>
          <div class="prop-item"><label>圆角</label><input type="number" class="num-input" :value="selected.props.borderRadius" @input="e => updateProp('borderRadius', Math.max(0, Number((e.target as HTMLInputElement).value) || 0))" @wheel.prevent="onWheel($event, v => updateProp('borderRadius', Math.max(0, v)))" /></div>
          <div class="prop-item"><label>自动播放</label><label class="switch-label"><input type="checkbox" :checked="selected.props.autoplay" @change="e => updateProp('autoplay', (e.target as HTMLInputElement).checked)" /><span class="switch-track"></span></label></div>
          <div class="prop-item"><label>循环播放</label><label class="switch-label"><input type="checkbox" :checked="selected.props.loop" @change="e => updateProp('loop', (e.target as HTMLInputElement).checked)" /><span class="switch-track"></span></label></div>
          <div class="prop-item"><label>静音</label><label class="switch-label"><input type="checkbox" :checked="selected.props.muted" @change="e => updateProp('muted', (e.target as HTMLInputElement).checked)" /><span class="switch-track"></span></label></div>
          <div class="prop-item"><label>显示控件</label><label class="switch-label"><input type="checkbox" :checked="selected.props.controls" @change="e => updateProp('controls', (e.target as HTMLInputElement).checked)" /><span class="switch-track"></span></label></div>
          <div class="prop-item"><label>开始时间(秒)</label><input type="number" class="num-input" min="0" step="0.1" :value="selected.props.startTime || 0" @input="e => updateProp('startTime', Math.max(0, Number((e.target as HTMLInputElement).value) || 0))" @wheel.prevent="onWheel($event, v => updateProp('startTime', Math.max(0, v)), 0.1)" /></div>
          <div class="prop-item"><label>结束时间(秒)</label><input type="number" class="num-input" min="0" step="0.1" :value="selected.props.endTime || 0" placeholder="0=不限制" @input="e => updateProp('endTime', Math.max(0, Number((e.target as HTMLInputElement).value) || 0))" @wheel.prevent="onWheel($event, v => updateProp('endTime', Math.max(0, v)), 0.1)" /></div>
        </template>

        <!-- Audio -->
        <template v-if="selected.type === 'Audio'">
          <div class="prop-item"><label>音频URL</label><div class="url-row"><input class="native-input" :value="selected.props.src" placeholder="音频地址" @input="e => updateProp('src', (e.target as HTMLInputElement).value)" /><button class="pick-btn" @click="pickAudioFile" title="选择本地音频">🎵</button></div></div>
          <div class="prop-item"><label>自动播放</label><label class="switch-label"><input type="checkbox" :checked="selected.props.autoplay" @change="e => updateProp('autoplay', (e.target as HTMLInputElement).checked)" /><span class="switch-track"></span></label></div>
          <div class="prop-item"><label>循环播放</label><label class="switch-label"><input type="checkbox" :checked="selected.props.loop" @change="e => updateProp('loop', (e.target as HTMLInputElement).checked)" /><span class="switch-track"></span></label></div>
          <div class="prop-item"><label>静音</label><label class="switch-label"><input type="checkbox" :checked="selected.props.muted" @change="e => updateProp('muted', (e.target as HTMLInputElement).checked)" /><span class="switch-track"></span></label></div>
          <div class="prop-item"><label>显示控件</label><label class="switch-label"><input type="checkbox" :checked="selected.props.controls" @change="e => updateProp('controls', (e.target as HTMLInputElement).checked)" /><span class="switch-track"></span></label></div>
          <div class="prop-item"><label>音量</label><input type="number" class="num-input" min="0" max="1" step="0.1" :value="selected.props.volume" @input="e => updateProp('volume', Math.max(0, Math.min(1, Number((e.target as HTMLInputElement).value) || 1)))" @wheel.prevent="onWheel($event, v => updateProp('volume', Math.max(0, Math.min(1, v))), 0.1)" /></div>
        </template>

        <!-- Circle -->
        <template v-if="selected.type === 'Circle'">
          <div class="prop-item"><label>填充方式</label><input type="color" class="color-swatch-sm" :value="selected.props.fill" @input="e => updateProp('fill', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>边框颜色</label><input type="color" class="color-swatch-sm" :value="selected.props.stroke" @input="e => updateProp('stroke', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>边框宽度</label><input type="number" class="num-input" :value="selected.props.strokeWidth" @input="e => updateProp('strokeWidth', Math.max(0, Number((e.target as HTMLInputElement).value) || 0))" @wheel.prevent="onWheel($event, v => updateProp('strokeWidth', Math.max(0, v)))" /></div>
        </template>

        <!-- Table -->
        <template v-if="selected.type === 'Table'">
          <div class="prop-item">
            <label>表格数据</label>
            <div class="table-toolbar">
              <button class="table-tool-btn" @click="addTableRow" title="添加行">+ 行</button>
              <button class="table-tool-btn" @click="addTableCol" title="添加列">+ 列</button>
              <button class="table-tool-btn import-btn" @click="importExcel" title="导入 Excel">导入</button>
            </div>
            <div class="table-editor">
              <table class="table-edit-table">
                <thead><tr>
                  <th v-for="(h, ci) in tableHeaders" :key="'h'+ci" class="table-edit-th">
                    <input class="table-cell-input table-header-input" :value="h" @input="e => setTableHeader(ci, (e.target as HTMLInputElement).value)" />
                    <button class="col-del-btn" @click="removeTableCol(ci)" title="删除列">×</button>
                  </th>
                </tr></thead>
                <tbody>
                  <tr v-for="(row, ri) in tableData" :key="'r'+ri">
                    <td v-for="(cell, ci) in row" :key="'c'+ci" class="table-edit-td">
                      <input class="table-cell-input" :value="cell" @input="e => setTableCell(ri, ci, (e.target as HTMLInputElement).value)" />
                    </td>
                    <td class="row-del-td"><button class="row-del-btn" @click="removeTableRow(ri)" title="删除行">×</button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          <div class="prop-item"><label>字号</label><input type="number" class="num-input" :value="selected.props.fontSize" @input="e => updateProp('fontSize', Math.max(1, Number((e.target as HTMLInputElement).value) || 1))" @wheel.prevent="onWheel($event, v => updateProp('fontSize', Math.max(1, v)))" /></div>
          <div class="prop-item"><label>表头背景</label><input type="color" class="color-swatch-sm" :value="selected.props.headerBg" @input="e => updateProp('headerBg', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>表头文字颜色</label><input type="color" class="color-swatch-sm" :value="selected.props.headerColor" @input="e => updateProp('headerColor', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>文字颜色</label><input type="color" class="color-swatch-sm" :value="selected.props.textColor" @input="e => updateProp('textColor', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>边框颜色</label><input type="color" class="color-swatch-sm" :value="selected.props.borderColor" @input="e => updateProp('borderColor', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>合并单元格 (JSON)</label><textarea class="native-input native-textarea" :value="selected.props.mergedCells" rows="2" @input="e => updateProp('mergedCells', (e.target as HTMLTextAreaElement).value)" placeholder='[{"row":0,"col":0,"rowspan":2,"colspan":2}]'></textarea></div>
        </template>

        <!-- Effect -->
        <template v-if="selected.type === 'Effect'">
          <div class="prop-item">
            <label>特效分类</label>
            <div class="preset-group">
              <button v-for="cat in effectCategories" :key="cat" class="preset-btn"
                      :class="{ active: effectActiveCat === cat }" @click="effectActiveCat = cat">{{ cat }}</button>
            </div>
          </div>
          <div class="prop-item">
            <label>特效等级</label>
            <div class="preset-group">
              <button class="preset-btn" :class="{ active: effectLevel === 'basic' }" @click="effectLevel = 'basic'">初级</button>
              <button class="preset-btn" :class="{ active: effectLevel === 'advanced' }" @click="effectLevel = 'advanced'">高级</button>
            </div>
          </div>
          <div class="prop-item">
            <label>特效模板</label>
            <div class="effect-grid">
              <div v-for="tpl in effectTemplatesFiltered" :key="tpl.id" class="effect-tpl-btn"
                   :class="{ active: selected.props.effectId === tpl.id }"
                   @click="selectEffect(tpl.id)">
                <span class="effect-tpl-icon">{{ tpl.icon }}</span>
                <span class="effect-tpl-name">{{ tpl.name }}</span>
              </div>
            </div>
          </div>
          <template v-if="currentEffectTemplate">
            <div v-for="pd in currentEffectTemplate.paramDefs" :key="pd.key" class="prop-item">
              <label>{{ pd.label }}</label>
              <template v-if="pd.type === 'color'">
                <input type="color" class="color-swatch-sm" :value="effectParam(pd.key)" @input="e => setEffectParam(pd.key, (e.target as HTMLInputElement).value)" />
              </template>
              <template v-else-if="pd.type === 'range'">
                <input type="number" class="num-input" :step="pd.step || 1" :value="effectParam(pd.key)"
                       @input="e => setEffectParam(pd.key, Number((e.target as HTMLInputElement).value) || pd.default)"
                       @wheel.prevent="onWheel($event, v => setEffectParam(pd.key, v), pd.step || 1)" />
              </template>
              <template v-else-if="pd.type === 'select'">
                <template v-if="pd.key === 'text'">
                  <textarea class="native-input native-textarea" :value="effectParam(pd.key)" rows="2" @input="e => setEffectParam(pd.key, (e.target as HTMLTextAreaElement).value)"></textarea>
                </template>
                <template v-else>
                  <select class="native-select" :value="effectParam(pd.key)" @change="e => setEffectParam(pd.key, (e.target as HTMLSelectElement).value)">
                    <option v-for="opt in pd.options" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
                  </select>
                </template>
              </template>
              <template v-else-if="pd.type === 'boolean'">
                <label class="switch-label"><input type="checkbox" :checked="effectParam(pd.key)" @change="e => setEffectParam(pd.key, (e.target as HTMLInputElement).checked)" /><span class="switch-track"></span></label>
              </template>
              <template v-else>
                <input class="native-input" :value="effectParam(pd.key)" @input="e => setEffectParam(pd.key, (e.target as HTMLInputElement).value)" />
              </template>
            </div>
          </template>
        </template>

        <!-- Arrow -->
        <template v-if="selected.type === 'Arrow'">
          <div class="prop-item"><label>颜色</label><input type="color" class="color-swatch-sm" :value="selected.props.color" @input="e => updateProp('color', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>线宽</label><input type="number" class="num-input" :value="selected.props.strokeWidth" @input="e => updateProp('strokeWidth', Math.max(1, Number((e.target as HTMLInputElement).value) || 1))" @wheel.prevent="onWheel($event, v => updateProp('strokeWidth', Math.max(1, v)))" /></div>
          <div class="prop-item"><label>方向</label><select class="native-select" :value="selected.props.direction" @change="e => updateProp('direction', (e.target as HTMLSelectElement).value)"><option value="right">向右</option><option value="left">向左</option><option value="down">向下</option><option value="up">向上</option></select></div>
        </template>

        <!-- Divider -->
        <template v-if="selected.type === 'Divider'">
          <div class="prop-item"><label>颜色</label><input type="color" class="color-swatch-sm" :value="selected.props.color" @input="e => updateProp('color', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>粗细</label><input type="number" class="num-input" :value="selected.props.thickness" @input="e => updateProp('thickness', Math.max(1, Number((e.target as HTMLInputElement).value) || 1))" @wheel.prevent="onWheel($event, v => updateProp('thickness', Math.max(1, v)))" /></div>
          <div class="prop-item"><label>样式</label><select class="native-select" :value="selected.props.style" @change="e => updateProp('style', (e.target as HTMLSelectElement).value)"><option value="solid">实线</option><option value="dashed">虚线</option><option value="dotted">点线</option></select></div>
        </template>

        <!-- Step -->
        <template v-if="selected.type === 'Step'">
          <div class="prop-item"><label>垂直对齐</label><div class="align-group"><button v-for="v in ['flex-start','center','flex-end']" :key="v" class="align-btn" :class="{ active: selected.props.alignItems === v }" @click="updateProp('alignItems', v)">{{ v === 'flex-start' ? '△' : v === 'center' ? '□' : '▽' }}</button></div></div>
          <div class="prop-item"><label>序号</label><input type="number" class="num-input" :value="selected.props.number" @input="e => updateProp('number', Math.max(1, Number((e.target as HTMLInputElement).value) || 1))" @wheel.prevent="onWheel($event, v => updateProp('number', Math.max(1, v)))" /></div>
          <div class="prop-item"><label>标题</label><input class="native-input" :value="selected.props.text" @input="e => updateProp('text', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>描述</label><textarea class="native-input native-textarea" :value="selected.props.description" rows="2" @input="e => updateProp('description', (e.target as HTMLTextAreaElement).value)"></textarea></div>
          <div class="prop-item"><label>颜色</label><input type="color" class="color-swatch-sm" :value="selected.props.color" @input="e => updateProp('color', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>字号</label><input type="number" class="num-input" :value="selected.props.fontSize" @input="e => updateProp('fontSize', Math.max(1, Number((e.target as HTMLInputElement).value) || 1))" @wheel.prevent="onWheel($event, v => updateProp('fontSize', Math.max(1, v)))" /></div>
          <div class="prop-item"><label>文字色颜色</label><input type="color" class="color-swatch-sm" :value="selected.props.textColor" @input="e => updateProp('textColor', (e.target as HTMLInputElement).value)" /></div>
        </template>

        <!-- QRCode -->
        <template v-if="selected.type === 'QRCode'">
          <div class="prop-item"><label>文本/URL</label><textarea class="native-input native-textarea" :value="selected.props.text" rows="3" @input="e => updateProp('text', (e.target as HTMLTextAreaElement).value)"></textarea></div>
          <div class="prop-item"><label>前景色</label><input type="color" class="color-swatch-sm" :value="selected.props.darkColor" @input="e => updateProp('darkColor', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>背景色</label><input type="color" class="color-swatch-sm" :value="selected.props.lightColor" @input="e => updateProp('lightColor', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>容错级别</label><select class="native-select" :value="selected.props.level" @change="e => updateProp('level', (e.target as HTMLSelectElement).value)"><option value="L">L (低)</option><option value="M">M (中)</option><option value="Q">Q (较高)</option><option value="H">H (高)</option></select></div>
        </template>

        <!-- PieChart -->
        <template v-if="selected.type === 'PieChart'">
          <div class="prop-item"><label>样式</label><div class="preset-group"><button v-for="s in [{label:'默认',value:'default'},{label:'暗色',value:'dark'}]" :key="s.value" class="preset-btn" :class="{ active: (selected.props.stylePreset || 'default') === s.value }" @click="updateProp('stylePreset', s.value)">{{ s.label }}</button></div></div>
          <div class="prop-item">
            <label>数据项</label>
            <div class="chart-data-editor">
              <div v-for="(item, i) in chartDataList" :key="i" class="chart-data-row">
                <input class="chart-name-input" placeholder="名称" :value="item.name" @input="e => setChartDataItem(i, 'name', (e.target as HTMLInputElement).value)" />
                <input type="number" class="chart-val-input" placeholder="值" :value="item.value" @input="e => setChartDataItem(i, 'value', Number((e.target as HTMLInputElement).value) || 0)" @wheel.prevent="onWheel($event, v => setChartDataItem(i, 'value', Math.max(0, v)), 1)" />
                <button class="chart-del-btn" @click="removeChartData(i)">×</button>
              </div>
              <button class="chart-add-btn" @click="addChartData">+ 添加项</button>
            </div>
          </div>
          <div class="prop-item"><label>标题</label><input class="native-input" :value="selected.props.title" @input="e => updateProp('title', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>环形图</label><label class="switch-label"><input type="checkbox" :checked="selected.props.donut" @change="e => updateProp('donut', (e.target as HTMLInputElement).checked)" /><span class="switch-track"></span></label></div>
          <div class="prop-item"><label>显示标签</label><label class="switch-label"><input type="checkbox" :checked="selected.props.showLabel" @change="e => updateProp('showLabel', (e.target as HTMLInputElement).checked)" /><span class="switch-track"></span></label></div>
        </template>

        <!-- BarChart -->
        <template v-if="selected.type === 'BarChart'">
          <div class="prop-item"><label>样式</label><div class="preset-group"><button v-for="s in [{label:'默认',value:'default'},{label:'暗色',value:'dark'}]" :key="s.value" class="preset-btn" :class="{ active: (selected.props.stylePreset || 'default') === s.value }" @click="updateProp('stylePreset', s.value)">{{ s.label }}</button></div></div>
          <div class="prop-item">
            <label>数据项</label>
            <div class="chart-data-editor">
              <div v-for="(item, i) in chartDataList" :key="i" class="chart-data-row">
                <input class="chart-name-input" placeholder="名称" :value="item.name" @input="e => setChartDataItem(i, 'name', (e.target as HTMLInputElement).value)" />
                <input type="number" class="chart-val-input" placeholder="值" :value="item.value" @input="e => setChartDataItem(i, 'value', Number((e.target as HTMLInputElement).value) || 0)" @wheel.prevent="onWheel($event, v => setChartDataItem(i, 'value', Math.max(0, v)), 1)" />
                <button class="chart-del-btn" @click="removeChartData(i)">×</button>
              </div>
              <button class="chart-add-btn" @click="addChartData">+ 添加项</button>
            </div>
          </div>
          <div class="prop-item"><label>标题</label><input class="native-input" :value="selected.props.title" @input="e => updateProp('title', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>Y轴名称</label><input class="native-input" :value="selected.props.yAxisName" @input="e => updateProp('yAxisName', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>颜色</label><input type="color" class="color-swatch-sm" :value="selected.props.color" @input="e => updateProp('color', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>显示数值</label><label class="switch-label"><input type="checkbox" :checked="selected.props.showValue" @change="e => updateProp('showValue', (e.target as HTMLInputElement).checked)" /><span class="switch-track"></span></label></div>
        </template>

        <!-- RadarChart -->
        <template v-if="selected.type === 'RadarChart'">
          <div class="prop-item"><label>标题</label><input class="native-input" :value="selected.props.title" @input="e => updateProp('title', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>颜色</label><input type="color" class="color-swatch-sm" :value="selected.props.color" @input="e => updateProp('color', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>填充透明度</label><input type="number" class="num-input" step="0.05" min="0" max="1" :value="selected.props.fillOpacity" @input="e => updateProp('fillOpacity', Math.max(0, Math.min(1, Number((e.target as HTMLInputElement).value) || 0)))" @wheel.prevent="onWheel($event, v => updateProp('fillOpacity', Math.max(0, Math.min(1, v))), 0.05)" /></div>
          <div class="prop-item">
            <label>指标与数值</label>
            <div class="chart-data-editor">
              <div v-for="(ind, i) in radarIndicators" :key="i" class="chart-data-row">
                <input class="chart-name-input" placeholder="指标名称" :value="ind" @input="e => setRadarIndicator(i, (e.target as HTMLInputElement).value)" />
                <input type="number" class="chart-val-input" placeholder="值"
                  :value="radarDataRows[0]?.values[i] ?? 0"
                  @input="e => { const v = Number((e.target as HTMLInputElement).value) || 0; if (radarDataRows.length > 0) setRadarValue(0, i, v); }"
                  @wheel.prevent="onWheel($event, wv => { if (radarDataRows.length > 0) setRadarValue(0, i, Math.max(0, wv)); }, 1)" />
                <button class="chart-del-btn" @click="removeRadarIndicator(i)">×</button>
              </div>
              <button class="chart-add-btn" @click="addRadarIndicator">+ 添加指标</button>
            </div>
          </div>
        </template>

        <!-- Countdown -->
        <template v-if="selected.type === 'Countdown'">
          <div class="prop-item"><label>对齐</label><div class="align-row"><div class="align-group"><button v-for="v in ['flex-start','center','flex-end']" :key="v" class="align-btn" :class="{ active: selected.props.alignItems === v }" @click="updateProp('alignItems', v)">{{ v === 'flex-start' ? '△' : v === 'center' ? '□' : '▽' }}</button></div><div class="align-group"><button v-for="v in ['left','center','right']" :key="v" class="align-btn" :class="{ active: selected.props.textAlign === v }" @click="updateProp('textAlign', v)">{{ v === 'left' ? '◁' : v === 'center' ? '■' : '▷' }}</button></div></div></div>
          <div class="prop-item"><label>目标时间</label><input type="datetime-local" class="native-input" :value="selected.props.targetDate" @input="e => updateProp('targetDate', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>标签</label><input class="native-input" :value="selected.props.label" @input="e => updateProp('label', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>字号</label><input type="number" class="num-input" :value="selected.props.fontSize" @input="e => updateProp('fontSize', Math.max(1, Number((e.target as HTMLInputElement).value) || 1))" @wheel.prevent="onWheel($event, v => updateProp('fontSize', Math.max(1, v)))" /></div>
          <div class="prop-item"><label>颜色</label><input type="color" class="color-swatch-sm" :value="selected.props.color" @input="e => updateProp('color', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>显示天</label><label class="switch-label"><input type="checkbox" :checked="selected.props.showDays" @change="e => updateProp('showDays', (e.target as HTMLInputElement).checked)" /><span class="switch-track"></span></label></div>
          <div class="prop-item"><label>显示小时</label><label class="switch-label"><input type="checkbox" :checked="selected.props.showHours" @change="e => updateProp('showHours', (e.target as HTMLInputElement).checked)" /><span class="switch-track"></span></label></div>
          <div class="prop-item"><label>显示分钟</label><label class="switch-label"><input type="checkbox" :checked="selected.props.showMinutes" @change="e => updateProp('showMinutes', (e.target as HTMLInputElement).checked)" /><span class="switch-track"></span></label></div>
          <div class="prop-item"><label>显示秒</label><label class="switch-label"><input type="checkbox" :checked="selected.props.showSeconds" @change="e => updateProp('showSeconds', (e.target as HTMLInputElement).checked)" /><span class="switch-track"></span></label></div>
        </template>

        <!-- Tag -->
        <template v-if="selected.type === 'Tag'">
          <div class="prop-item"><label>对齐</label><div class="align-row"><div class="align-group"><button v-for="v in ['flex-start','center','flex-end']" :key="v" class="align-btn" :class="{ active: selected.props.alignItems === v }" @click="updateProp('alignItems', v)">{{ v === 'flex-start' ? '△' : v === 'center' ? '□' : '▽' }}</button></div><div class="align-group"><button v-for="v in ['left','center','right']" :key="v" class="align-btn" :class="{ active: selected.props.textAlign === v }" @click="updateProp('textAlign', v)">{{ v === 'left' ? '◁' : v === 'center' ? '■' : '▷' }}</button></div></div></div>
          <div class="prop-item"><label>文本</label><input class="native-input" :value="selected.props.text" @input="e => updateProp('text', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>文字色</label><input type="color" class="color-swatch-sm" :value="selected.props.color" @input="e => updateProp('color', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>背景色</label><div class="color-row"><input type="color" class="color-swatch-sm" :value="parseColor(selected.props.bgColor)" @input="e => updateProp('bgColor', toRgba((e.target as HTMLInputElement).value, getAlpha(selected.props.bgColor)))" /><input type="number" class="num-input opacity-input" min="0" max="1" step="0.05" :value="Math.round(getAlpha(selected.props.bgColor) * 100)" @input="e => updateProp('bgColor', toRgba(parseColor(selected.props.bgColor), Math.max(0, Math.min(100, Number((e.target as HTMLInputElement).value) || 0)) / 100))" @wheel.prevent="onWheel($event, v => updateProp('bgColor', toRgba(parseColor(selected.props.bgColor), Math.max(0, Math.min(100, v)) / 100)))" /><span class="opacity-suffix">%</span></div></div>
          <div class="prop-item"><label>字号</label><input type="number" class="num-input" :value="selected.props.fontSize" @input="e => updateProp('fontSize', Math.max(1, Number((e.target as HTMLInputElement).value) || 1))" @wheel.prevent="onWheel($event, v => updateProp('fontSize', Math.max(1, v)))" /></div>
          <div class="prop-item"><label>圆角</label><input type="number" class="num-input" :value="selected.props.borderRadius" @input="e => updateProp('borderRadius', Math.max(0, Number((e.target as HTMLInputElement).value) || 0))" @wheel.prevent="onWheel($event, v => updateProp('borderRadius', Math.max(0, v)))" /></div>
          <div class="prop-item"><label>可移除</label><label class="switch-label"><input type="checkbox" :checked="selected.props.removable" @change="e => updateProp('removable', (e.target as HTMLInputElement).checked)" /><span class="switch-track"></span></label></div>
        </template>

        <!-- Avatar -->
        <template v-if="selected.type === 'Avatar'">
          <div class="prop-item"><label>图片URL</label><div class="url-row"><input class="native-input" :value="selected.props.src" placeholder="留空显示文字" @input="e => updateProp('src', (e.target as HTMLInputElement).value)" /><button class="pick-btn" @click="pickImageFile" title="选择本地图片">📁</button></div></div>
          <div class="prop-item"><label>文字 (无图时)</label><input class="native-input" :value="selected.props.text" @input="e => updateProp('text', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>背景色</label><input type="color" class="color-swatch-sm" :value="selected.props.bgColor" @input="e => updateProp('bgColor', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>文字色</label><input type="color" class="color-swatch-sm" :value="selected.props.color" @input="e => updateProp('color', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>尺寸</label><input type="number" class="num-input" :value="selected.props.size" @input="e => updateProp('size', Math.max(16, Number((e.target as HTMLInputElement).value) || 16))" @wheel.prevent="onWheel($event, v => updateProp('size', Math.max(16, v)))" /></div>
          <div class="prop-item"><label>形状</label><select class="native-select" :value="selected.props.shape" @change="e => updateProp('shape', (e.target as HTMLSelectElement).value)"><option value="circle">圆形</option><option value="round">圆角</option><option value="square">方形</option></select></div>
        </template>

        <!-- Timeline -->
        <template v-if="selected.type === 'Timeline'">
          <div class="prop-item">
            <label>事件列表</label>
            <div class="chart-data-editor">
              <div v-for="(evt, i) in timelineEvents" :key="i" class="timeline-event-row">
                <div class="timeline-event-fields">
                  <input class="chart-name-input" placeholder="标题" :value="evt.title" @input="e => setTimelineField(i, 'title', (e.target as HTMLInputElement).value)" />
                  <input class="chart-name-input" placeholder="描述" :value="evt.desc" @input="e => setTimelineField(i, 'desc', (e.target as HTMLInputElement).value)" />
                  <div style="display:flex;gap:4px;align-items:center;">
                    <input class="chart-name-input" style="flex:1;" placeholder="时间" :value="evt.time" @input="e => setTimelineField(i, 'time', (e.target as HTMLInputElement).value)" />
                    <input type="color" class="color-swatch-sm" style="width:24px;height:24px;" :value="evt.color || '#6366F1'" @input="e => setTimelineField(i, 'color', (e.target as HTMLInputElement).value)" />
                  </div>
                </div>
                <button class="chart-del-btn" @click="removeTimelineEvent(i)">×</button>
              </div>
              <button class="chart-add-btn" @click="addTimelineEvent">+ 添加事件</button>
            </div>
          </div>
          <div class="prop-item"><label>连线颜色</label><input type="color" class="color-swatch-sm" :value="selected.props.lineColor" @input="e => updateProp('lineColor', (e.target as HTMLInputElement).value)" /></div>
          <div class="prop-item"><label>圆点大小</label><input type="number" class="num-input" :value="selected.props.dotSize" @input="e => updateProp('dotSize', Math.max(4, Number((e.target as HTMLInputElement).value) || 4))" @wheel.prevent="onWheel($event, v => updateProp('dotSize', Math.max(4, v)))" /></div>
          <div class="prop-item"><label>字号</label><input type="number" class="num-input" :value="selected.props.fontSize" @input="e => updateProp('fontSize', Math.max(1, Number((e.target as HTMLInputElement).value) || 1))" @wheel.prevent="onWheel($event, v => updateProp('fontSize', Math.max(1, v)))" /></div>
        </template>
      </div>
      <n-divider>动画</n-divider>
      <div class="prop-list">
        <div class="prop-item">
          <label>动画等级</label>
          <div class="preset-group">
            <button class="preset-btn" :class="{ active: animLevel === 'basic' }" @click="animLevel = 'basic'">初级</button>
            <button class="preset-btn" :class="{ active: animLevel === 'advanced' }" @click="animLevel = 'advanced'">高级</button>
          </div>
        </div>
        <div class="prop-item">
          <label>动画类型</label>
          <select class="native-select" :value="currentAnimation.type" @change="e => updateAnimation('type', (e.target as HTMLSelectElement).value)">
            <option v-for="opt in animationOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
          </select>
        </div>
        <template v-if="currentAnimation.type !== 'none'">
          <div class="prop-item"><label>持续时间 (秒)</label><input type="number" class="num-input" step="0.1" :value="currentAnimation.duration" @input="e => updateAnimation('duration', Math.max(0.1, Number((e.target as HTMLInputElement).value) || 0.1))" @wheel.prevent="onWheel($event, v => updateAnimation('duration', Math.max(0.1, +v.toFixed(1))), 0.1)" /></div>
          <div class="prop-item"><label>延迟 (秒)</label><input type="number" class="num-input" step="0.1" :value="currentAnimation.delay" @input="e => updateAnimation('delay', Math.max(0, Number((e.target as HTMLInputElement).value) || 0))" @wheel.prevent="onWheel($event, v => updateAnimation('delay', Math.max(0, +v.toFixed(1))), 0.1)" /></div>
          <div class="prop-item"><label>循环次数</label><input class="native-input" :value="String(currentAnimation.iterationCount)" placeholder="数字或 infinite" @input="e => updateAnimation('iterationCount', (e.target as HTMLInputElement).value === 'infinite' ? 'infinite' : Number((e.target as HTMLInputElement).value) || 1)" /></div>
          <div class="prop-item">
            <label>缓动函数</label>
            <select class="native-select" :value="currentAnimation.easing" @change="e => updateAnimation('easing', (e.target as HTMLSelectElement).value)">
              <option v-for="eo in easingOptions" :key="eo.value" :value="eo.value">{{ eo.label }}</option>
            </select>
          </div>
          <div v-if="isLoopAnimation" class="prop-item">
            <label>方向</label>
            <select class="native-select" :value="currentAnimation.direction" @change="e => updateAnimation('direction', (e.target as HTMLSelectElement).value)">
              <option value="normal">正常</option>
              <option value="alternate">交替</option>
            </select>
          </div>
          <div class="prop-item">
            <label>交错延迟 (ms)</label>
            <input type="number" class="num-input" step="50" min="0" :value="currentAnimation.stagger" @input="e => updateAnimation('stagger', Math.max(0, Number((e.target as HTMLInputElement).value) || 0))" @wheel.prevent="onWheel($event, v => updateAnimation('stagger', Math.max(0, v)), 50)" />
          </div>
          <div class="prop-item">
            <button class="preview-anim-btn" @click="previewAnimation">预览动画</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { NButton, NDivider } from 'naive-ui';
import { useProjectStore } from '../stores/project';
import { convertFileSrc } from '@tauri-apps/api/core';
import { ANIMATION_PRESETS, EASING_OPTIONS, LOOP_ANIMATION_TYPES, type ComponentAnimation, MQTT_STYLE_PRESETS, CHART_STYLE_PRESETS } from '../types/component';
import { FONT_PRESETS, FONT_CATEGORIES } from '../types/fontPresets';
import { EFFECT_TEMPLATES, EFFECT_CATEGORIES, getEffectTemplate } from '../types/effect';

const store = useProjectStore();
const selected = computed(() => store.selectedComponent);

function parseColor(val: string): string {
  const m = val.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (m) return '#' + [m[1], m[2], m[3]].map(n => parseInt(n).toString(16).padStart(2, '0')).join('');
  return val.startsWith('#') ? val : '#000000';
}
function getAlpha(val: string): number {
  const m = val.match(/rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)/);
  return m ? parseFloat(m[1]) : 1;
}
function toRgba(hex: string, opacity: number): string {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return opacity >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${opacity})`;
}

const fontOptions = FONT_PRESETS;
const fontCats = FONT_CATEGORIES;

const animLevel = ref<'basic' | 'advanced'>('basic');
const animationOptions = computed(() => ANIMATION_PRESETS.filter(p => p.level === animLevel.value || p.value === 'none').map(p => ({ label: p.label, value: p.value })));
const easingOptions = EASING_OPTIONS;
const isLoopAnimation = computed(() => {
  const t = currentAnimation.value.type;
  return (LOOP_ANIMATION_TYPES as string[]).includes(t);
});
function previewAnimation() {
  if (!selected.value) return;
  window.dispatchEvent(new CustomEvent('noah-preview-animation', { detail: { compId: selected.value.id } }));
}

// --- Icon Library ---
const showIconLib = ref(false);
const iconLibCat = ref('通用');
const iconSearch = ref('');

interface IconDef { name: string; svg: string; }
interface IconCat { name: string; icons: IconDef[]; }

function s(path: string, extra = ''): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${path}${extra}</svg>`;
}

const ICON_LIB_CATS: IconCat[] = [
  { name: '通用', icons: [
    { name: '主页', svg: s('<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>') },
    { name: '搜索', svg: s('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>') },
    { name: '设置', svg: s('<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>') },
    { name: '用户', svg: s('<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>') },
    { name: '邮件', svg: s('<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>') },
    { name: '电话', svg: s('<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>') },
    { name: '定位', svg: s('<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>') },
    { name: '日历', svg: s('<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>') },
    { name: '时钟', svg: s('<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>') },
    { name: '心形', svg: s('<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>') },
    { name: '星标', svg: s('<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>') },
    { name: '链接', svg: s('<path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>') },
    { name: '下载', svg: s('<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>') },
    { name: '上传', svg: s('<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>') },
    { name: '分享', svg: s('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>') },
  ]},
  { name: '箭头/方向', icons: [
    { name: '上', svg: s('<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>') },
    { name: '下', svg: s('<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>') },
    { name: '左', svg: s('<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>') },
    { name: '右', svg: s('<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>') },
    { name: 'Chevron上', svg: s('<polyline points="18 15 12 9 6 15"/>') },
    { name: 'Chevron下', svg: s('<polyline points="6 9 12 15 18 9"/>') },
    { name: 'Chevron左', svg: s('<polyline points="15 18 9 12 15 6"/>') },
    { name: 'Chevron右', svg: s('<polyline points="9 6 15 12 9 18"/>') },
    { name: '双Chevron左', svg: s('<polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/>') },
    { name: '双Chevron右', svg: s('<polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/>') },
    { name: '外部链接', svg: s('<path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>') },
    { name: '刷新', svg: s('<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>') },
  ]},
  { name: '媒体', icons: [
    { name: '播放', svg: s('<circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>') },
    { name: '暂停', svg: s('<circle cx="12" cy="12" r="10"/><line x1="10" y1="15" x2="10" y2="9"/><line x1="14" y1="15" x2="14" y2="9"/>') },
    { name: '停止', svg: s('<circle cx="12" cy="12" r="10"/><rect x="9" y="9" width="6" height="6"/>') },
    { name: '音量', svg: s('<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07"/>') },
    { name: '静音', svg: s('<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>') },
    { name: '相机', svg: s('<path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/>') },
    { name: '图片', svg: s('<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>') },
    { name: '视频', svg: s('<polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>') },
  ]},
  { name: '数据/图表', icons: [
    { name: '图表', svg: s('<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>') },
    { name: '饼图', svg: s('<path d="M21.21 15.89A10 10 0 118 2.83"/><path d="M22 12A10 10 0 0012 2v10z"/>') },
    { name: '趋势', svg: s('<polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>') },
    { name: '数据库', svg: s('<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>') },
    { name: '服务器', svg: s('<rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/>') },
    { name: '云', svg: s('<path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/>') },
    { name: 'WiFi', svg: s('<path d="M5 12.55a11 11 0 0114.08 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/>') },
    { name: '闪电', svg: s('<path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>') },
    { name: '芯片', svg: s('<rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><path d="M15 2v2M9 2v2M15 20v2M9 20v2M20 9h3M20 15h3M1 9h3M1 15h3"/>') },
  ]},
  { name: '形状/装饰', icons: [
    { name: '圆', svg: s('<circle cx="12" cy="12" r="10"/>') },
    { name: '方', svg: s('<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>') },
    { name: '三角', svg: s('<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>') },
    { name: '六边形', svg: s('<path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z"/>') },
    { name: '对勾', svg: s('<polyline points="20 6 9 17 4 12"/>') },
    { name: '叉号', svg: s('<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>') },
    { name: '加号', svg: s('<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>') },
    { name: '网格', svg: s('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>') },
    { name: '图层', svg: s('<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>') },
  ]},
  { name: '操作', icons: [
    { name: '编辑', svg: s('<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>') },
    { name: '删除', svg: s('<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>') },
    { name: '复制', svg: s('<rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>') },
    { name: '保存', svg: s('<path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>') },
    { name: '锁', svg: s('<rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>') },
    { name: '眼睛', svg: s('<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>') },
    { name: '过滤', svg: s('<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>') },
    { name: '排序', svg: s('<line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="14" y2="12"/><line x1="4" y1="18" x2="8" y2="18"/>') },
  ]},
];

const currentIcons = computed(() => {
  const cat = ICON_LIB_CATS.find(c => c.name === iconLibCat.value);
  return cat?.icons || [];
});

const filteredIcons = computed(() => {
  const q = iconSearch.value.trim().toLowerCase();
  if (!q) return currentIcons.value;
  return ICON_LIB_CATS.flatMap(c => c.icons).filter(i => i.name.toLowerCase().includes(q));
});

function cleanSvg(raw: string): string {
  let svg = raw.replace(/<\?xml[^?]*\?>/g, '').trim();
  if (!svg.includes('xmlns')) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
  svg = svg.replace(/\s+(width|height)="[^"]*"/g, '');
  if (!svg.includes('viewBox')) {
    const w = raw.match(/width="(\d+)"/)?.[1] || '24';
    const h = raw.match(/height="(\d+)"/)?.[1] || '24';
    svg = svg.replace('<svg', `<svg viewBox="0 0 ${w} ${h}"`);
  }
  return svg;
}

function pickSvgFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.svg,image/svg+xml';
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const svg = cleanSvg(reader.result as string);
      updateProp('iconSvg', svg);
    };
    reader.readAsText(file);
  };
  input.click();
}

const defaultAnimation: ComponentAnimation = { type: 'none', duration: 0.6, delay: 0, iterationCount: 1, easing: 'easeOutQuad', stagger: 0, direction: 'alternate' };


const currentAnimation = computed<ComponentAnimation>(() => {
  return selected.value?.animation || defaultAnimation;
});

function onWheel(e: WheelEvent, setter: (v: number) => void, step = 1) {
  const cur = Number((e.currentTarget as HTMLInputElement).value) || 0;
  setter(e.deltaY < 0 ? cur + step : cur - step);
}

function updatePos(axis: 'x' | 'y', val: number) {
  if (!selected.value) return;
  store.updateComponent(selected.value.id, { position: { ...selected.value.position, [axis]: val } });
}

function updateSize(dim: 'width' | 'height', val: number) {
  if (!selected.value) return;
  store.updateComponent(selected.value.id, { size: { ...selected.value.size, [dim]: val } });
}

function updateProp(key: string, val: any) {
  if (!selected.value) return;
  store.updateComponentProps(selected.value.id, { [key]: val });
}

function updateAnimation(key: keyof ComponentAnimation, val: any) {
  if (!selected.value) return;
  const anim = { ...(selected.value.animation || defaultAnimation), [key]: val };
  store.updateComponent(selected.value.id, { animation: anim });
}

// ── Table helpers ──
const tableHeaders = computed<string[]>(() => {
  if (!selected.value || selected.value.type !== 'Table') return [];
  try { return JSON.parse(selected.value.props.headers); } catch { return []; }
});
const tableData = computed<string[][]>(() => {
  if (!selected.value || selected.value.type !== 'Table') return [];
  try { return JSON.parse(selected.value.props.data); } catch { return []; }
});
function commitTable(newHeaders: string[], newData: string[][]) {
  updateProp('headers', JSON.stringify(newHeaders));
  updateProp('data', JSON.stringify(newData));
}
function setTableHeader(ci: number, val: string) {
  const h = [...tableHeaders.value]; h[ci] = val; commitTable(h, tableData.value);
}
function setTableCell(ri: number, ci: number, val: string) {
  const d = tableData.value.map(r => [...r]); d[ri][ci] = val; commitTable(tableHeaders.value, d);
}
function addTableRow() {
  const h = tableHeaders.value;
  const d = [...tableData.value, h.map(() => '')]; commitTable(h, d);
}
function addTableCol() {
  const h = [...tableHeaders.value, '新列'];
  const d = tableData.value.map(r => [...r, '']); commitTable(h, d);
}
function removeTableRow(ri: number) {
  const d = tableData.value.filter((_, i) => i !== ri); commitTable(tableHeaders.value, d);
}
function removeTableCol(ci: number) {
  const h = tableHeaders.value.filter((_, i) => i !== ci);
  const d = tableData.value.map(r => r.filter((_, i) => i !== ci)); commitTable(h, d);
}

function importExcel() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.xlsx,.xls,.csv';
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    // 动态加载 SheetJS
    if (!(window as any).XLSX) {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement('script');
        s.src = 'https://cdn.jsdelivr.net/npm/xlsx/dist/xlsx.full.min.js';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('加载 XLSX 库失败'));
        document.head.appendChild(s);
      });
    }
    const XLSX = (window as any).XLSX;
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target?.result, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (json.length === 0) return;
      const headers = json[0].map((c: any) => String(c));
      const data = json.slice(1).map((row: any[]) => {
        const r = headers.map(() => '');
        row.forEach((c: any, i: number) => { if (i < r.length) r[i] = String(c); });
        return r;
      });
      commitTable(headers, data);
      // 自动调整组件高度
      if (selected.value) {
        const rowH = selected.value.props.fontSize || 13;
        const newH = Math.max(80, (data.length + 1) * (rowH + 12) + 16);
        store.updateComponent(selected.value.id, { size: { ...selected.value.size, height: newH } });
      }
    };
    reader.readAsArrayBuffer(file);
  };
  input.click();
}

function deleteComp() {
  if (!selected.value) return;
  store.removeComponent(selected.value.id);
}

// ── Effect helpers ──
const effectCategories = EFFECT_CATEGORIES;
const effectActiveCat = ref(EFFECT_CATEGORIES[0] || '背景');
const effectLevel = ref<'basic' | 'advanced'>('basic');
const effectTemplatesFiltered = computed(() => EFFECT_TEMPLATES.filter(t => t.category === effectActiveCat.value && t.level === effectLevel.value));
const currentEffectTemplate = computed(() => {
  if (!selected.value || selected.value.type !== 'Effect') return undefined;
  return getEffectTemplate(selected.value.props.effectId || 'glass-card');
});
function effectParam(key: string): any {
  if (!selected.value || selected.value.type !== 'Effect') return undefined;
  const tpl = getEffectTemplate(selected.value.props.effectId || 'glass-card');
  if (!tpl) return undefined;
  const merged = { ...tpl.defaultParams, ...selected.value.props.params };
  return merged[key];
}
function setEffectParam(key: string, val: any) {
  if (!selected.value || selected.value.type !== 'Effect') return;
  const cur = { ...selected.value.props.params };
  cur[key] = val;
  updateProp('params', cur);
}
function selectEffect(id: string) {
  const tpl = getEffectTemplate(id);
  if (!tpl) return;
  updateProp('effectId', id);
  updateProp('params', { ...tpl.defaultParams });
}

function pickImageFile() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => updateProp('src', reader.result as string);
    reader.readAsDataURL(file);
  };
  input.click();
}

async function pickVideoFile() {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const selected = await open({ filters: [{ name: '视频文件', extensions: ['mp4', 'webm', 'ogg', 'mov', 'avi', 'mkv'] }] });
    if (!selected) return;
    const filePath = typeof selected === 'string' ? selected : selected.path;
    updateProp('filePath', filePath);
    // Read file content and create blob URL for reliable playback
    const { readFile } = await import('@tauri-apps/plugin-fs');
    const data = await readFile(filePath);
    const mime = getMediaMime(filePath);
    const blob = new Blob([data], { type: mime });
    updateProp('src', URL.createObjectURL(blob));
  } catch {
    // Browser fallback: use createObjectURL
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      updateProp('src', URL.createObjectURL(file));
    };
    input.click();
  }
}

async function pickAudioFile() {
  try {
    const { open } = await import('@tauri-apps/plugin-dialog');
    const selected = await open({ filters: [{ name: '音频文件', extensions: ['mp3', 'wav', 'ogg', 'aac', 'flac', 'm4a'] }] });
    if (!selected) return;
    const filePath = typeof selected === 'string' ? selected : selected.path;
    updateProp('filePath', filePath);
    const { readFile } = await import('@tauri-apps/plugin-fs');
    const data = await readFile(filePath);
    const mime = getMediaMime(filePath);
    const blob = new Blob([data], { type: mime });
    updateProp('src', URL.createObjectURL(blob));
  } catch {
    // Browser fallback
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      updateProp('src', URL.createObjectURL(file));
    };
    input.click();
  }
}

function getMediaMime(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase() || '';
  const map: Record<string, string> = {
    mp4: 'video/mp4', webm: 'video/webm', ogv: 'video/ogg', mov: 'video/quicktime',
    avi: 'video/x-msvideo', mkv: 'video/x-matroska',
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', aac: 'audio/aac',
    flac: 'audio/flac', m4a: 'audio/mp4',
  };
  return map[ext] || 'application/octet-stream';
}

// ── Rich text editor ──
const richEditorRef = ref<HTMLDivElement | null>(null);
const richEditorContent = computed(() => {
  if (!selected.value || selected.value.type !== 'Text') return '';
  return selected.value.props.htmlContent || selected.value.props.text || '';
});

function execCmd(command: string, value?: string) {
  document.execCommand(command, false, value);
  richEditorRef.value?.focus();
}

function onRichInput() {
  if (!selected.value || selected.value.type !== 'Text') return;
  const html = richEditorRef.value?.innerHTML || '';
  updateProp('htmlContent', html);
}

function onRichKeydown(e: KeyboardEvent) {
  if (e.key === 'Tab') {
    e.preventDefault();
    document.execCommand('insertHTML', false, '&nbsp;&nbsp;&nbsp;&nbsp;');
  }
}

// ── Chart visual editors ──
const chartDataList = computed<{ name: string; value: number }[]>(() => {
  if (!selected.value) return [];
  try { return JSON.parse(selected.value.props.data); } catch { return []; }
});
function commitChartData(list: { name: string; value: number }[]) {
  updateProp('data', JSON.stringify(list));
}
function addChartData() {
  commitChartData([...chartDataList.value, { name: '新项', value: 0 }]);
}
function removeChartData(i: number) {
  commitChartData(chartDataList.value.filter((_, idx) => idx !== i));
}
function setChartDataItem(i: number, key: 'name' | 'value', val: any) {
  const list = [...chartDataList.value];
  list[i] = { ...list[i], [key]: val };
  commitChartData(list);
}

// ── Radar visual editor ──
const radarIndicators = computed<string[]>(() => {
  if (!selected.value) return [];
  try { return JSON.parse(selected.value.props.indicators); } catch { return []; }
});
function commitRadarIndicators(list: string[]) {
  updateProp('indicators', JSON.stringify(list));
}
function addRadarIndicator() {
  commitRadarIndicators([...radarIndicators.value, '新指标']);
}
function removeRadarIndicator(i: number) {
  const inds = radarIndicators.value.filter((_, idx) => idx !== i);
  commitRadarIndicators(inds);
  // Also remove the corresponding value from each data row
  const rows = radarDataRows.value.map(r => ({ ...r, values: r.values.filter((_, idx) => idx !== i) }));
  commitRadarData(rows);
}
function setRadarIndicator(i: number, val: string) {
  const list = [...radarIndicators.value];
  list[i] = val;
  commitRadarIndicators(list);
}

interface RadarDataRow { name: string; values: number[]; }
const radarDataRows = computed<RadarDataRow[]>(() => {
  if (!selected.value) return [];
  try { return JSON.parse(selected.value.props.data).map((d: any) => ({ name: d.name || '', values: d.value || [] })); } catch { return []; }
});
function commitRadarData(rows: RadarDataRow[]) {
  updateProp('data', JSON.stringify(rows.map(r => ({ name: r.name, value: r.values }))));
}
function addRadarRow() {
  const vals = radarIndicators.value.map(() => 50);
  commitRadarData([...radarDataRows.value, { name: '数据集', values: vals }]);
}
function removeRadarRow(ri: number) {
  commitRadarData(radarDataRows.value.filter((_, idx) => idx !== ri));
}
function setRadarValue(ri: number, vi: number, val: number) {
  const rows = radarDataRows.value.map(r => ({ ...r, values: [...r.values] }));
  rows[ri].values[vi] = val;
  commitRadarData(rows);
}

// ── Timeline visual editor ──
interface TimelineEvent { title: string; desc: string; time: string; color: string; }
const timelineEvents = computed<TimelineEvent[]>(() => {
  if (!selected.value) return [];
  try { return JSON.parse(selected.value.props.items); } catch { return []; }
});
function commitTimelineEvents(list: TimelineEvent[]) {
  updateProp('items', JSON.stringify(list));
}
function addTimelineEvent() {
  commitTimelineEvents([...timelineEvents.value, { title: '新事件', desc: '', time: '', color: '#6366F1' }]);
}
function removeTimelineEvent(i: number) {
  commitTimelineEvents(timelineEvents.value.filter((_, idx) => idx !== i));
}
function setTimelineField(i: number, key: keyof TimelineEvent, val: string) {
  const list = timelineEvents.value.map(e => ({ ...e }));
  (list[i] as any)[key] = val;
  commitTimelineEvents(list);
}
</script>

<style scoped>
.property-panel {
  width: 100%; height: 100%; background: #f5f5f5; border-left: 1px solid #e8e8e8;
  display: flex; flex-direction: column; flex-shrink: 0;
  overflow-y: auto; overflow-x: hidden;
  scrollbar-width: none; -ms-overflow-style: none;
}
.property-panel::-webkit-scrollbar { display: none; }
.empty-state {
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  height: 100%; color: #999;
}
.empty-state p { margin: 4px 0; }
.hint { font-size: 12px; }
.prop-content { padding: 12px; }
.prop-header {
  display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;
}
.type-badge {
  background: #3498db; color: white; padding: 3px 10px; border-radius: 4px;
  font-size: 13px; font-weight: 500;
}
.prop-grid {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
}
.prop-list { display: flex; flex-direction: column; gap: 10px; }
.prop-item { display: flex; flex-direction: column; gap: 4px; }
.prop-item label { font-size: 12px; color: #666; font-weight: 500; }
.native-input, .num-input {
  width: 100%; padding: 5px 8px; border: 1px solid #e0e0e0; border-radius: 4px;
  font-size: 13px; outline: none; background: #fff; color: #333;
  box-sizing: border-box;
}
.native-input:focus, .num-input:focus { border-color: #3498db; }
.num-input { -moz-appearance: textfield; }
.num-input::-webkit-inner-spin-button,
.num-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.native-textarea { resize: vertical; font-family: inherit; line-height: 1.5; }
.native-select {
  width: 100%; padding: 5px 8px; border: 1px solid #e0e0e0; border-radius: 4px;
  font-size: 13px; outline: none; background: #fff; color: #333;
  box-sizing: border-box; cursor: pointer; appearance: auto;
}
.native-select:focus { border-color: #3498db; }
.color-swatch-sm {
  width: 100%; height: 30px; border: 1px solid #e0e0e0; border-radius: 4px;
  padding: 2px; cursor: pointer; background: #fff; box-sizing: border-box;
}
.color-row { display: flex; gap: 4px; align-items: center; }
.color-row .color-swatch-sm { flex: 1; min-width: 0; }
.opacity-input { width: 48px !important; flex-shrink: 0; text-align: center; }
.opacity-suffix { font-size: 12px; color: #999; flex-shrink: 0; }
.align-row { display: flex; gap: 8px; }
.align-group { display: flex; gap: 2px; }
.align-btn {
  width: 28px; height: 28px; border: 1px solid #e0e0e0; border-radius: 4px;
  background: #fff; cursor: pointer; font-size: 13px; color: #666;
  display: flex; align-items: center; justify-content: center;
}
.align-btn:hover { border-color: #3498db; color: #3498db; }
.align-btn.active { background: #3498db; border-color: #3498db; color: #fff; }
.preset-group { display: flex; gap: 2px; flex-wrap: wrap; }
.preset-btn {
  padding: 4px 10px; border: 1px solid #e0e0e0; border-radius: 4px;
  background: #fff; cursor: pointer; font-size: 12px; color: #666;
}
.preset-btn:hover { border-color: #3498db; color: #3498db; }
.preset-btn.active { background: #3498db; border-color: #3498db; color: #fff; }
.url-row { display: flex; gap: 4px; }
.url-row .native-input { flex: 1; min-width: 0; }
.pick-btn {
  width: 32px; height: 30px; border: 1px solid #e0e0e0; border-radius: 4px;
  background: #fff; cursor: pointer; font-size: 14px; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
}
.pick-btn:hover { border-color: #3498db; background: #f0f7ff; }
.switch-label { display: inline-flex; align-items: center; cursor: pointer; }
.switch-label input { display: none; }
.switch-track {
  width: 36px; height: 20px; background: #ccc; border-radius: 10px; position: relative;
  transition: background 0.2s;
}
.switch-track::after {
  content: ''; position: absolute; top: 2px; left: 2px; width: 16px; height: 16px;
  background: #fff; border-radius: 50%; transition: transform 0.2s;
}
.switch-label input:checked + .switch-track { background: #3498db; }
.switch-label input:checked + .switch-track::after { transform: translateX(16px); }
.table-toolbar { display: flex; gap: 4px; margin-bottom: 6px; }
.table-tool-btn {
  padding: 3px 10px; border: 1px solid #e0e0e0; border-radius: 4px;
  background: #fff; cursor: pointer; font-size: 12px; color: #666;
}
.table-tool-btn:hover { border-color: #3498db; color: #3498db; }
.import-btn { color: #6366f1; border-color: rgba(99,102,241,0.35); }
.import-btn:hover { background: rgba(99,102,241,0.08); }
.table-editor { overflow: auto; max-height: 260px; border: 1px solid #e0e0e0; border-radius: 4px; }
.table-edit-table { width: 100%; border-collapse: collapse; }
.table-edit-th {
  position: relative; padding: 0; background: #f8fafc; border-bottom: 1px solid #e2e8f0;
  min-width: 60px;
}
.table-edit-td { padding: 0; border-bottom: 1px solid #f1f5f9; }
.table-cell-input {
  width: 100%; border: none; padding: 4px 6px; font-size: 12px; outline: none;
  background: transparent; box-sizing: border-box; color: #333;
}
.table-cell-input:focus { background: #eff6ff; }
.table-header-input { font-weight: 600; color: #1e293b; }
.col-del-btn, .row-del-btn {
  position: absolute; right: 2px; top: 50%; transform: translateY(-50%);
  width: 16px; height: 16px; border: none; border-radius: 50%;
  background: #fee2e2; color: #ef4444; cursor: pointer; font-size: 11px;
  display: none; align-items: center; justify-content: center; line-height: 1;
}
.table-edit-th:hover .col-del-btn { display: flex; }
.row-del-td { padding: 0 2px; width: 22px; }
.row-del-btn { position: static; transform: none; display: none; }
tr:hover .row-del-btn { display: flex; }

/* ── Icon Library ── */
.icon-lib { display: flex; flex-direction: column; gap: 6px; margin-top: 8px; }
.icon-lib-search {
  width: 100%; padding: 5px 8px; border: 1px solid #e0e0e0; border-radius: 4px;
  font-size: 12px; outline: none; background: #fff; color: #333; box-sizing: border-box;
}
.icon-lib-search:focus { border-color: #3498db; }
.icon-lib-tabs { display: flex; gap: 2px; flex-wrap: wrap; }
.icon-lib-tab {
  padding: 3px 8px; border: 1px solid #e0e0e0; border-radius: 3px;
  background: #fff; cursor: pointer; font-size: 11px; color: #666;
  white-space: nowrap;
}
.icon-lib-tab:hover { border-color: #3498db; color: #3498db; }
.icon-lib-tab.active { background: #3498db; border-color: #3498db; color: #fff; }
.icon-lib-count { font-size: 11px; color: #999; }
.icon-lib-grid {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px;
  max-height: 180px; overflow-y: auto; scrollbar-width: none;
}
.icon-lib-grid::-webkit-scrollbar { display: none; }
.icon-lib-item {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 6px 2px; border: 1px solid transparent; border-radius: 4px;
  cursor: pointer; transition: border-color 0.15s, background 0.15s;
}
.icon-lib-item:hover { border-color: #3498db; background: #f0f7ff; }
.icon-lib-item svg { width: 22px; height: 22px; color: #444; }
.icon-lib-item span { font-size: 10px; color: #888; line-height: 1; }
.icon-lib-empty { font-size: 12px; color: #bbb; text-align: center; padding: 12px 0; }
.icon-actions { display: flex; gap: 4px; margin-top: 4px; }
.icon-btn-sm {
  padding: 3px 8px; border: 1px solid #e0e0e0; border-radius: 4px;
  background: #fff; cursor: pointer; font-size: 12px; color: #666;
  transition: border-color 0.15s, color 0.15s;
}
.icon-btn-sm:hover { border-color: #3498db; color: #3498db; }

/* ── Animation Preview Button ── */
.preview-anim-btn {
  width: 100%; padding: 7px 0; border: 1px solid rgba(99,102,241,0.35);
  border-radius: 6px; background: rgba(99,102,241,0.08); color: #6366f1;
  font-size: 13px; font-weight: 500; cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}
.preview-anim-btn:hover {
  background: rgba(99,102,241,0.16); border-color: #6366f1;
}

/* ── Effect Template Grid ── */
.effect-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px;
}
.effect-tpl-btn {
  display: flex; flex-direction: column; align-items: center; gap: 2px;
  padding: 6px 2px; border: 1px solid #e0e0e0; border-radius: 4px;
  background: #fff; cursor: pointer; transition: all 0.15s;
}
.effect-tpl-btn:hover { border-color: #3498db; background: #f0f7ff; }
.effect-tpl-btn.active { border-color: #6366f1; background: rgba(99,102,241,0.1); }
.effect-tpl-icon { font-size: 16px; }
.effect-tpl-name { font-size: 10px; color: #666; }

/* ── Chart visual editors ── */
.chart-data-editor {
  display: flex; flex-direction: column; gap: 4px; margin: 4px 0;
}
.chart-data-row {
  display: flex; gap: 4px; align-items: center;
}
.chart-name-input {
  flex: 1; min-width: 0; padding: 4px 6px; border: 1px solid #e0e0e0; border-radius: 3px;
  font-size: 12px; outline: none; background: #fff; color: #333; box-sizing: border-box;
}
.chart-name-input:focus { border-color: #3498db; }
.chart-val-input {
  width: 60px; padding: 4px 6px; border: 1px solid #e0e0e0; border-radius: 3px;
  font-size: 12px; outline: none; background: #fff; color: #333; text-align: right;
  -moz-appearance: textfield;
}
.chart-val-input::-webkit-inner-spin-button,
.chart-val-input::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.chart-val-input:focus { border-color: #3498db; }
.chart-val-input-sm {
  width: 44px; padding: 3px 4px; border: 1px solid #e0e0e0; border-radius: 3px;
  font-size: 11px; outline: none; background: #fff; color: #333; text-align: right;
  -moz-appearance: textfield;
}
.chart-val-input-sm::-webkit-inner-spin-button,
.chart-val-input-sm::-webkit-outer-spin-button { -webkit-appearance: none; margin: 0; }
.chart-val-input-sm:focus { border-color: #3498db; }
.chart-del-btn {
  width: 20px; height: 20px; border: none; border-radius: 50%; background: #fee2e2;
  color: #ef4444; cursor: pointer; font-size: 12px; display: flex; align-items: center;
  justify-content: center; flex-shrink: 0; line-height: 1;
}
.chart-del-btn:hover { background: #fecaca; }
.chart-add-btn {
  padding: 4px 10px; border: 1px dashed #d0d0d0; border-radius: 4px;
  background: transparent; cursor: pointer; font-size: 12px; color: #888;
  text-align: center; width: 100%;
}
.chart-add-btn:hover { border-color: #3498db; color: #3498db; background: #f0f7ff; }
.radar-ds-name {
  font-size: 11px; color: #555; font-weight: 500; min-width: 36px;
  padding: 4px 0; flex-shrink: 0;
}
.timeline-event-row {
  display: flex; gap: 4px; align-items: flex-start; padding: 6px;
  border: 1px solid #eee; border-radius: 4px; background: #fafafa;
}
.timeline-event-fields {
  flex: 1; display: flex; flex-direction: column; gap: 4px;
}

/* ── Rich Text Editor ── */
.rich-toolbar {
  display: flex; gap: 2px; flex-wrap: wrap; padding: 4px;
  background: #f8f9fa; border: 1px solid #e0e0e0; border-radius: 4px 4px 0 0;
}
.rt-btn {
  width: 28px; height: 26px; border: 1px solid transparent; border-radius: 3px;
  background: transparent; cursor: pointer; font-size: 12px; color: #555;
  display: flex; align-items: center; justify-content: center;
}
.rt-btn:hover { background: #e8e8e8; border-color: #ddd; }
.rt-btn b, .rt-btn i, .rt-btn u, .rt-btn s { font-size: 13px; }
.rich-editor {
  min-height: 80px; max-height: 200px; overflow-y: auto;
  padding: 8px; border: 1px solid #e0e0e0; border-top: none;
  border-radius: 0 0 4px 4px; background: #fff; font-size: 13px;
  color: #333; line-height: 1.6; outline: none; cursor: text;
}
.rich-editor:focus { border-color: #3498db; }
</style>
