/**
 * 단색 도형(rectangle, ellipse) 쉐이더
 * uRadius > 0 이면 SDF 기반 원형 클리핑 (ellipse)
 * uRadius = 0 이면 단순 rectangle
 */
export const colorVertex = /* glsl */ `
  attribute vec2 position;
  attribute vec2 uv;
  uniform mat4 uModelMatrix;
  uniform mat4 uViewMatrix;
  uniform mat4 uProjectionMatrix;
  varying vec2 vUV;

  void main() {
    vUV = uv;
    gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(position, 0.0, 1.0);
  }
`

export const colorFragment = /* glsl */ `
  precision highp float;
  uniform vec4 uColor;
  uniform float uOpacity;
  uniform float uRadius;    // 0 = rectangle, 1 = ellipse (SDF) -- kept for legacy fallback or direct ellipse mapping
  uniform vec4 uBorderRadius; // [TR, BR, TL, BL]
  uniform vec2 uSize;       // 도형 픽셀 크기 (w, h)
  varying vec2 vUV;

  float sdRoundedBox(vec2 p, vec2 b, vec4 r) {
    r.xy = (p.x > 0.0) ? r.xy : r.zw;
    r.x  = (p.y > 0.0) ? r.x  : r.y;
    vec2 q = abs(p) - b + r.x;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r.x;
  }

  void main() {
    vec2 p = (vUV - 0.5) * uSize;
    if (uRadius > 0.5) {
      // 타원은 ellipseFragment 에서 별도로 처리되나 혹시 모를 폴백 대비
    } else {
      float d = sdRoundedBox(p, uSize * 0.5, uBorderRadius);
      if (d > 0.0) discard;
    }
    gl_FragColor = vec4(uColor.rgb * uColor.a * uOpacity, uColor.a * uOpacity);
  }
`

// Ellipse 전용 — UV 기반 SDF 원형 클리핑
export const ellipseVertex = /* glsl */ `
  attribute vec2 position;
  attribute vec2 uv;
  uniform mat4 uModelMatrix;
  uniform mat4 uViewMatrix;
  uniform mat4 uProjectionMatrix;
  varying vec2 vUV;

  void main() {
    vUV = uv;
    gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(position, 0.0, 1.0);
  }
`

export const ellipseFragment = /* glsl */ `
  precision highp float;
  uniform vec4 uColor;
  uniform float uOpacity;
  varying vec2 vUV;

  void main() {
    // vUV 범위: [0, 1] → [-1, 1] 로 변환 후 SDF
    vec2 p = vUV * 2.0 - 1.0;
    float d = dot(p, p);  // p.x^2 + p.y^2
    if (d > 1.0) discard;
    gl_FragColor = vec4(uColor.rgb * uColor.a * uOpacity, uColor.a * uOpacity);
  }
`
