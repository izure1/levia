/**
 * 텍스처 오브젝트 쉐이더 (image, video, sprite, text)
 * uFlipY: 1.0이면 Y축 반전 (Canvas 텍스처 업로드 시 필요)
 * uUVOffset, uUVScale: 스프라이트 시트 크로핑용
 */
export const textureVertex = /* glsl */ `
  attribute vec2 position;
  attribute vec2 uv;
  uniform mat4 uModelMatrix;
  uniform mat4 uProjectionMatrix;
  uniform float uFlipY;
  uniform vec2 uUVOffset;
  uniform vec2 uUVScale;
  varying vec2 vUV;

  void main() {
    float y = uFlipY > 0.5 ? 1.0 - uv.y : uv.y;
    vUV = uUVOffset + vec2(uv.x, y) * uUVScale;
    gl_Position = uProjectionMatrix * uModelMatrix * vec4(position, 0.0, 1.0);
  }
`

export const textureFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uTexture;
  uniform float uOpacity;
  varying vec2 vUV;

  void main() {
    vec4 color = texture2D(uTexture, vUV);
    gl_FragColor = vec4(color.rgb, color.a * uOpacity);
  }
`
