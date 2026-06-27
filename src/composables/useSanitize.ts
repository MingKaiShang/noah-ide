export function escHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  const s = String(str);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function escJs(str: unknown): string {
  if (str === null || str === undefined) return '';
  const s = String(str);
  return s
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/</g, '\\x3C')
    .replace(/>/g, '\\x3E');
}

export function escAttr(str: unknown): string {
  return escHtml(String(str ?? ''));
}

/** Convert hex color (#RRGGBB) to rgba string with given opacity */
export function hexToRgba(hex: string, opacity: number): string {
  if (!hex || typeof hex !== 'string') return `rgba(0,0,0,${opacity})`;
  let h = hex.replace('#', '');
  if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (h.length < 6) return `rgba(0,0,0,${opacity})`;
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return `rgba(0,0,0,${opacity})`;
  return `rgba(${r},${g},${b},${opacity})`;
}

const SAFE_TAGS = new Set(['b','i','u','span','font','ul','ol','li','br','p','div','strong','em','s','sub','sup','h1','h2','h3','h4','h5','h6','hr','blockquote','pre','code','mark','small','del','ins']);
const SAFE_ATTRS = new Set(['style','class','color','face','size']);

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  return html.replace(/<[^>]*>/gi, (match) => {
    const closeMatch = match.match(/^<\/(\w+)/);
    if (closeMatch) {
      const tag = closeMatch[1].toLowerCase();
      return SAFE_TAGS.has(tag) ? match : '';
    }
    const openMatch = match.match(/^<(\w+)/);
    if (!openMatch) return '';
    const tag = openMatch[1].toLowerCase();
    if (!SAFE_TAGS.has(tag)) return '';
    const filtered = match.replace(/(\w+)\s*=\s*(?:"[^"]*"|'[^']*')/gi, (a, an) =>
      SAFE_ATTRS.has(an.toLowerCase()) ? a : ''
    );
    return filtered;
  });
}
