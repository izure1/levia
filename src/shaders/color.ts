/**
 * 단색 도형(rectangle, ellipse) 쉐이더
 * uRadius > 0 이면 SDF 기반 원형 클리핑 (ellipse)
 * uRadius = 0 이면 단순 rectangle
 */
export const colorVertex = /* glsl */ `
  attribute vec2 position;
  uniform mat4 uModelMatrix;
  uniform mat4 uProjectionMatrix;

  void main() {
    gl_Position = uProjectionMatrix * uModelMatrix * vec4(position, 0.0, 1.0);
  }
`

export const colorFragment = /* glsl */ `
  precision highp float;
  uniform vec4 uColor;
  uniform float uOpacity;
  uniform float uRadius;    // 0 = rectangle, 1 = ellipse (SDF)
  uniform vec2 uSize;       // 도형 픽셀 크기 (w, h)

  void main() {
    // ellipse: SDF 기반 원형 클리핑
    if (uRadius > 0.5) {
      // fragment 좌표는 uv로 대신 계산
      // (fragment 좌표를 NDC → [-0.5, 0.5] 로 매핑하기 위해 vUV 사용)
      // ellipse 는 별도 uv 기반 SDF 사용 — ellipseVertex/ellipseFragment 에서 처리
    }
    gl_FragColor = vec4(uColor.rgb, uColor.a * uOpacity);
  }
`

// Ellipse 전용 — UV 기반 SDF 원형 클리핑
export const ellipseVertex = /* glsl */ `
  attribute vec2 position;
  attribute vec2 uv;
  uniform mat4 uModelMatrix;
  uniform mat4 uProjectionMatrix;
  varying vec2 vUV;

  void main() {
    vUV = uv;
    gl_Position = uProjectionMatrix * uModelMatrix * vec4(position, 0.0, 1.0);
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
    gl_FragColor = vec4(uColor.rgb, uColor.a * uOpacity);
  }
`
