/**
 * 파티클 Instanced 렌더링 쉐이더
 * 각 인스턴스는 position(vec2), scale(float), opacity(float) 속성을 가집니다.
 */
export const instancedVertex = /* glsl */ `
  attribute vec2 position;
  attribute vec2 uv;

  // instanced attributes
  attribute vec2 instancePosition;
  attribute float instanceScale;
  attribute float instanceOpacity;

  uniform mat4 uProjectionMatrix;
  uniform mat4 uViewMatrix;

  varying vec2 vUV;
  varying float vOpacity;

  void main() {
    vUV = uv;
    vOpacity = instanceOpacity;
    vec2 worldPos = position * instanceScale + instancePosition;
    gl_Position = uProjectionMatrix * uViewMatrix * vec4(worldPos, 0.0, 1.0);
  }
`

export const instancedFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uTexture;
  uniform float uOpacity;
  varying vec2 vUV;
  varying float vOpacity;

  void main() {
    vec4 color = texture2D(uTexture, vUV);
    gl_FragColor = vec4(color.rgb, color.a * uOpacity * vOpacity);
  }
`
