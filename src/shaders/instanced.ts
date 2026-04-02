/**
 * 파티클 및 텍스처 Instanced 렌더링 쉐이더
 * Renderer.ts에서 자동 배칭(Auto-Batching)에 사용됩니다.
 */
export const instancedVertex = /* glsl */ `
  attribute vec2 position;
  attribute vec2 uv;

  // instanced attributes (4x4 Model Matrix split into 4 vec4s)
  attribute vec4 instanceMat0;
  attribute vec4 instanceMat1;
  attribute vec4 instanceMat2;
  attribute vec4 instanceMat3;
  
  // x: opacity, y: flipY
  attribute vec2 instanceOpacityFlip;
  
  // x: uvOffsetX, y: uvOffsetY, z: uvScaleX, w: uvScaleY
  attribute vec4 instanceUVParams;
  
  // x: TR, y: BR, z: TL, w: BL
  attribute vec4 instanceBorderRadius;

  uniform mat4 uViewMatrix;
  uniform mat4 uProjectionMatrix;

  varying vec2 vUV;
  varying float vOpacity;
  varying vec2 vSize;
  varying vec4 vBorderRadius;
  varying vec2 vLocalUV;

  void main() {
    float flipY = instanceOpacityFlip.y;
    vec2 finalUV = uv;
    if (flipY > 0.0) {
      finalUV.y = 1.0 - finalUV.y;
    }
    
    // UV Offset & Scale
    vUV = finalUV * instanceUVParams.zw + instanceUVParams.xy;
    vLocalUV = uv;
    vOpacity = instanceOpacityFlip.x;
    vBorderRadius = instanceBorderRadius;
    
    float w = length(instanceMat0.xyz);
    float h = length(instanceMat1.xyz);
    vSize = vec2(w, h);
    
    mat4 modelMat = mat4(
      instanceMat0,
      instanceMat1,
      instanceMat2,
      instanceMat3
    );

    vec4 worldPos = modelMat * vec4(position, 0.0, 1.0);
    gl_Position = uProjectionMatrix * uViewMatrix * worldPos;
  }
`

export const instancedFragment = /* glsl */ `
  precision highp float;
  uniform sampler2D uTexture;
  varying vec2 vUV;
  varying float vOpacity;
  varying vec2 vSize;
  varying vec4 vBorderRadius;
  varying vec2 vLocalUV;

  float sdRoundedBox(vec2 p, vec2 b, vec4 r) {
    r.xy = (p.x > 0.0) ? r.xy : r.zw;
    r.x  = (p.y > 0.0) ? r.x  : r.y;
    vec2 q = abs(p) - b + r.x;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r.x;
  }

  void main() {
    float maxRad = max(max(vBorderRadius.x, vBorderRadius.y), max(vBorderRadius.z, vBorderRadius.w));
    if (maxRad > 0.0) {
      vec2 p = (vLocalUV - 0.5) * vSize;
      float d = sdRoundedBox(p, vSize * 0.5, vBorderRadius);
      if (d > 0.0) discard;
    }

    vec4 color = texture2D(uTexture, vUV);
    gl_FragColor = vec4(color.rgb, color.a * vOpacity);
  }
`
