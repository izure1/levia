/**
 * 알파채널 경계 기반 Border + Outline 셰이더
 *
 * image/sprite 객체에서 style.borderColor, style.outlineColor 를
 * 이미지 사각형이 아닌 알파채널 외곽에 렌더링합니다.
 *
 * 동작 방식:
 *   - 확장 쿼드(expanded quad) 전체에서 실행됩니다.
 *     expandedW = drawW + 2 * (borderWidth + outlineWidth)
 *   - 불투명 픽셀(이미지 내부): discard → 별도 texture 패스에서 렌더됨
 *   - border 범위 내 픽셀: borderColor 렌더
 *   - outline 범위 내 픽셀: outlineColor 렌더
 *   - 범위 초과: discard
 *
 * 제한:
 *   - MAX_RADIUS = 16 → borderWidth + outlineWidth 합계 최대 16 world units
 *     더 큰 값이 필요하면 MAX_RADIUS 상수를 수정하십시오 (성능 비례 증가)
 */

// 최대 탐색 반경 (world units). borderWidth + outlineWidth 합이 이 값을 초과하면 잘립니다.
const MAX_RADIUS = 16

export const alphaOutlineVertex = /* glsl */ `
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

export const alphaOutlineFragment = /* glsl */ `
  precision highp float;

  uniform sampler2D uTexture;
  uniform float uOpacity;
  uniform float uAlphaThreshold;

  uniform vec2 uUVOffset;
  uniform vec2 uUVScale;

  // 확장 쿼드 → 이미지 UV 변환 파라미터
  uniform vec2 uImageOffset; // 확장 쿼드 UV에서 이미지 시작점 (pad/expandedW)
  uniform vec2 uImageScale;  // 확장 쿼드 UV에서 이미지가 차지하는 비율 (drawW/expandedW)

  // 이미지 UV 공간에서 1 world pixel 크기 = vec2(1/drawW, 1/drawH)
  uniform vec2 uTexelStep;

  uniform float uBorderWidth;  // world pixels
  uniform vec4  uBorderColor;  // premultiplied-ready RGBA
  uniform float uOutlineWidth; // world pixels
  uniform vec4  uOutlineColor; // premultiplied-ready RGBA

  varying vec2 vUV;

  #define MAX_RADIUS ${MAX_RADIUS}

  void main() {
    // 1. 확장 쿼드 UV → 이미지 UV 변환
    vec2 imageUV = (vUV - uImageOffset) / uImageScale;
    bool inImage = imageUV.x >= 0.0 && imageUV.x <= 1.0
                && imageUV.y >= 0.0 && imageUV.y <= 1.0;

    // 2. 이미지 내 불투명 픽셀은 main texture 패스에서 렌더됨 → 여기선 제외
    if (inImage) {
      vec2 texUV = imageUV * uUVScale + uUVOffset;
      if (texture2D(uTexture, texUV).a > uAlphaThreshold) {
        discard;
      }
    }

    // 3. 인접 픽셀 탐색: 불투명 픽셀까지의 최소 거리(world pixels)
    float searchR = uBorderWidth + uOutlineWidth;
    float minDist = 99999.0;

    for (int dx = -MAX_RADIUS; dx <= MAX_RADIUS; dx++) {
      for (int dy = -MAX_RADIUS; dy <= MAX_RADIUS; dy++) {
        float d = length(vec2(float(dx), float(dy)));
        if (d > searchR) continue;
        vec2 sUV = imageUV + vec2(float(dx), float(dy)) * uTexelStep;
        if (sUV.x < 0.0 || sUV.x > 1.0 || sUV.y < 0.0 || sUV.y > 1.0) continue;
        
        vec2 sTexUV = sUV * uUVScale + uUVOffset;
        if (texture2D(uTexture, sTexUV).a > uAlphaThreshold) {
          if (d < minDist) minDist = d;
        }
      }
    }

    if (minDist > searchR) {
      discard;
    }

    // 4. 거리 구간별 색상 결정 (border → outline 순서)
    if (uBorderWidth > 0.0 && minDist <= uBorderWidth) {
      float a = uBorderColor.a * uOpacity;
      gl_FragColor = vec4(uBorderColor.rgb * a, a);
    } else if (uOutlineWidth > 0.0 && minDist <= searchR) {
      float a = uOutlineColor.a * uOpacity;
      gl_FragColor = vec4(uOutlineColor.rgb * a, a);
    } else {
      discard;
    }
  }
`
