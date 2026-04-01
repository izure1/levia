/**
 * <style> 마크업 파서 — 스택 기반 구현
 *
 * 지원 속성: fontSize, fontWeight, fontStyle, color, borderColor, borderWidth
 * 중첩 가능하며 부모 스타일을 상속합니다.
 */

export interface TextSpanStyle {
  fontSize?: number
  fontWeight?: string | number
  fontStyle?: 'normal' | 'italic'
  color?: string
  borderColor?: string
  borderWidth?: number
  letterSpacing?: number
  lineHeight?: number
}

export interface TextSpan {
  text: string
  style: TextSpanStyle
}

// ─── 속성값 파싱 ───────────────────────────────────────────

function parseAttrs(attrStr: string): TextSpanStyle {
  const style: TextSpanStyle = {}
  const re = /(\w+)=["']([^"']*)["']/g
  let m: RegExpExecArray | null
  while ((m = re.exec(attrStr)) != null) {
    const [, key, val] = m
    switch (key) {
      case 'fontSize': style.fontSize = parseFloat(val); break
      case 'fontWeight': style.fontWeight = val; break
      case 'fontStyle': style.fontStyle = val as 'normal' | 'italic'; break
      case 'color': style.color = val; break
      case 'borderColor': style.borderColor = val; break
      case 'borderWidth': style.borderWidth = parseFloat(val); break
      case 'letterSpacing': style.letterSpacing = parseFloat(val); break
      case 'lineHeight': style.lineHeight = parseFloat(val); break
    }
  }
  return style
}

// ─── 스택 기반 파서 ────────────────────────────────────────
// 정규식 재귀 대신, 문자열을 앞에서부터 읽으며 열기/닫기 태그를 스택으로 처리합니다.
// 이를 통해 중첩 태그를 정확히 처리할 수 있습니다.

const OPEN_RE = /<style([^>]*)>/
const CLOSE_RE = /<\/style>/
const TOKEN_RE = /(<style[^>]*>|<\/style>)/g

export function parseTextMarkup(raw: string, baseStyle: TextSpanStyle): TextSpan[] {
  const spans: TextSpan[] = []
  // 스타일 스택: 현재 활성 스타일은 스택의 최상단
  const stack: TextSpanStyle[] = [baseStyle]

  // <style> / </style> 토큰과 평문 텍스트로 분리
  const tokens = raw.split(TOKEN_RE)

  for (const token of tokens) {
    if (!token) continue

    if (OPEN_RE.test(token)) {
      // 열기 태그: 현재 스타일을 상속하여 새 스타일 push
      const attrMatch = token.match(OPEN_RE)
      const attrs = attrMatch ? parseAttrs(attrMatch[1]) : {}
      const parent = stack[stack.length - 1]
      stack.push({ ...parent, ...attrs })
    } else if (CLOSE_RE.test(token)) {
      // 닫기 태그: 스택 pop (최소 1개는 유지)
      if (stack.length > 1) stack.pop()
    } else {
      // 평문 텍스트: 현재 스타일 적용
      if (token) {
        spans.push({ text: token, style: { ...stack[stack.length - 1] } })
      }
    }
  }

  return spans
}
