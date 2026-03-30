import {
  Renderer as OGLRenderer,
  Camera,
  Transform,
  Geometry,
  Program,
  Mesh,
  Texture,
} from 'ogl'
import type { OGLRenderingContext } from 'ogl'
import { colorVertex, colorFragment, ellipseVertex, ellipseFragment } from './shaders/color.js'
import { textureVertex, textureFragment } from './shaders/texture.js'
import { instancedVertex, instancedFragment } from './shaders/instanced.js'
import { parseTextMarkup } from './utils/textMarkup.js'

import type { LveObject } from './LveObject.js'
import type { Camera as LveCamera } from './objects/Camera.js'
import type { Sprite } from './objects/Sprite.js'
import type { LveImage } from './objects/LveImage.js'
import type { LveVideo } from './objects/LveVideo.js'
import type { Particle } from './objects/Particle.js'
import type { LoadedAssets } from './types.js'

// ─── Quad 지오메트리 헬퍼 ────────────────────────────────────────────────────

function createQuadGeometry(gl: OGLRenderingContext) {
  return new Geometry(gl, {
    position: {
      size: 2,
      data: new Float32Array([
        -0.5, -0.5,
        0.5, -0.5,
        0.5, 0.5,
        -0.5, 0.5,
      ]),
    },
    uv: {
      size: 2,
      data: new Float32Array([
        0, 0,
        1, 0,
        1, 1,
        0, 1,
      ]),
    },
    index: {
      data: new Uint16Array([0, 1, 2, 0, 2, 3]),
    },
  })
}

// ─── 색상 파싱 헬퍼 ──────────────────────────────────────────────────────────

function parseCSSColor(color: string): [number, number, number, number] {
  // hex #rrggbb 또는 #rrggbbaa
  if (color.startsWith('#')) {
    const hex = color.slice(1)
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16) / 255
      const g = parseInt(hex[1] + hex[1], 16) / 255
      const b = parseInt(hex[2] + hex[2], 16) / 255
      return [r, g, b, 1]
    }
    if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16) / 255
      const g = parseInt(hex.slice(2, 4), 16) / 255
      const b = parseInt(hex.slice(4, 6), 16) / 255
      const a = hex.length >= 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1
      return [r, g, b, a]
    }
  }
  // rgb(r, g, b) 또는 rgba(r, g, b, a)
  const rgbMatch = color.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)(?:\s*,\s*([\d.]+))?\s*\)/)
  if (rgbMatch) {
    return [
      parseInt(rgbMatch[1]) / 255,
      parseInt(rgbMatch[2]) / 255,
      parseInt(rgbMatch[3]) / 255,
      rgbMatch[4] != null ? parseFloat(rgbMatch[4]) : 1,
    ]
  }
  // hsl(h, s%, l%) 또는 hsla(h, s%, l%, a)
  const hslMatch = color.match(/hsla?\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%(?:\s*,\s*([\d.]+))?\s*\)/)
  if (hslMatch) {
    const h = parseFloat(hslMatch[1]) / 360
    const s = parseFloat(hslMatch[2]) / 100
    const l = parseFloat(hslMatch[3]) / 100
    const a = hslMatch[4] != null ? parseFloat(hslMatch[4]) : 1
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    if (s === 0) return [l, l, l, a]
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    return [hue2rgb(p, q, h + 1 / 3), hue2rgb(p, q, h), hue2rgb(p, q, h - 1 / 3), a]
  }
  return [1, 1, 1, 1]
}

// ─── 텍스처 캐시 키 ──────────────────────────────────────────────────────────

// 텍스트 오브젝트의 Offscreen Canvas → Texture 캐시
interface TextTextureEntry {
  texture: Texture
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  lastText: string
  mesh: Mesh
}

// ─── Renderer ────────────────────────────────────────────────────────────────

export class Renderer {
  private ogl: OGLRenderer
  private gl: OGLRenderingContext
  private camera: Camera
  private scene: Transform

  // 공용 지오메트리 (quad)
  private quadGeo!: Geometry

  // 프로그램 캐시
  private colorProgram!: Program
  private ellipseProgram!: Program
  private textureProgram!: Program
  private instancedProgram!: Program

  // Placeholder 색상 Program (에러 표시)
  private placeholderProgram!: Program

  // 공유 메쉬 (매 프레임 객체 생성 방지)
  private colorMesh!: Mesh
  private ellipseMesh!: Mesh
  private textureMesh!: Mesh
  private placeholderMesh!: Mesh

  // 오브젝트별 Mesh 캐시
  private meshCache = new Map<string, Mesh>()

  // 텍스트 텍스처 캐시 (id → TextTextureEntry)
  private textCache = new Map<string, TextTextureEntry>()

  // 에셋 텍스처 캐시 (src → Texture)
  private assetTextureCache = new Map<string, Texture>()

  // 비디오 텍스처 캐시 (src → Texture) — 매 프레임 업데이트 필요
  private videoTextureCache = new Map<string, Texture>()

  constructor(canvas: HTMLCanvasElement) {
    this.ogl = new OGLRenderer({
      canvas,
      width: canvas.width,
      height: canvas.height,
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
    })
    this.gl = this.ogl.gl

    // 직교 투영 카메라: 화면 픽셀 좌표계 (0,0 = center)
    this.camera = new Camera(this.gl, {
      left: -canvas.width / 2,
      right: canvas.width / 2,
      bottom: -canvas.height / 2,
      top: canvas.height / 2,
      near: -1000,
      far: 1000,
    })
    this.camera.position.z = 1
    this.camera.lookAt([0, 0, 0])

    this.scene = new Transform()

    this.quadGeo = createQuadGeometry(this.gl)
    this._initPrograms()
  }

  get width() { return this.ogl.width }
  get height() { return this.ogl.height }

  setSize(w: number, h: number) {
    this.ogl.setSize(w, h)
    // 직교 카메라 재설정
    const cam = this.camera as any
    cam.left = -w / 2
    cam.right = w / 2
    cam.bottom = -h / 2
    cam.top = h / 2
    this.camera.orthographic({ left: -w / 2, right: w / 2, bottom: -h / 2, top: h / 2, near: -1000, far: 1000 })
  }

  // ─── 프로그램 초기화 ─────────────────────────────────────────────────────

  private _initPrograms() {
    const gl = this.gl

    this.colorProgram = new Program(gl, {
      vertex: colorVertex,
      fragment: colorFragment,
      uniforms: {
        uColor: { value: [1, 1, 1, 1] },
        uOpacity: { value: 1 },
        uRadius: { value: 0 },
        uSize: { value: [1, 1] },
        uModelMatrix: { value: new Float32Array(16) },
        uProjectionMatrix: { value: new Float32Array(16) },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })

    this.ellipseProgram = new Program(gl, {
      vertex: ellipseVertex,
      fragment: ellipseFragment,
      uniforms: {
        uColor: { value: [1, 1, 1, 1] },
        uOpacity: { value: 1 },
        uModelMatrix: { value: new Float32Array(16) },
        uProjectionMatrix: { value: new Float32Array(16) },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })

    this.textureProgram = new Program(gl, {
      vertex: textureVertex,
      fragment: textureFragment,
      uniforms: {
        uTexture: { value: null },
        uOpacity: { value: 1 },
        uFlipY: { value: 0 },
        uUVOffset: { value: [0, 0] },
        uUVScale: { value: [1, 1] },
        uModelMatrix: { value: new Float32Array(16) },
        uProjectionMatrix: { value: new Float32Array(16) },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })

    this.instancedProgram = new Program(gl, {
      vertex: instancedVertex,
      fragment: instancedFragment,
      uniforms: {
        uTexture: { value: null },
        uOpacity: { value: 1 },
        uProjectionMatrix: { value: new Float32Array(16) },
        uViewMatrix: { value: new Float32Array(16) },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })

    // placeholder: 분홍 반투명
    this.placeholderProgram = new Program(gl, {
      vertex: colorVertex,
      fragment: colorFragment,
      uniforms: {
        uColor: { value: [1, 0.2, 0.4, 0.5] },
        uOpacity: { value: 1 },
        uRadius: { value: 0 },
        uSize: { value: [1, 1] },
        uModelMatrix: { value: new Float32Array(16) },
        uProjectionMatrix: { value: new Float32Array(16) },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
    })

    // ─── 공유 메쉬 초기화 ──────────────────────────────────────────────
    this.colorMesh = new Mesh(gl, { geometry: this.quadGeo, program: this.colorProgram })
    this.ellipseMesh = new Mesh(gl, { geometry: this.quadGeo, program: this.ellipseProgram })
    this.textureMesh = new Mesh(gl, { geometry: this.quadGeo, program: this.textureProgram })
    this.placeholderMesh = new Mesh(gl, { geometry: this.quadGeo, program: this.placeholderProgram })
  }

  // ─── 공개 렌더 메서드 ────────────────────────────────────────────────────

  render(objects: Set<LveObject>, assets: LoadedAssets = {}, timestamp: number = 0) {
    // Camera 찾기
    let lveCamera: LveCamera | null = null
    for (const obj of objects) {
      if (obj.attribute.type === 'camera') {
        lveCamera = obj as LveCamera
        break
      }
    }

    const camX = lveCamera?.transform.position.x ?? 0
    const camY = lveCamera?.transform.position.y ?? 0
    const camZ = lveCamera?.transform.position.z ?? 0

    // z 기준 오름차순 정렬
    const renderables = Array.from(objects)
      .filter(o => o.attribute.type !== 'camera' && o.style.display !== 'none')
      .sort((a, b) => {
        const zdiff = a.transform.position.z - b.transform.position.z
        return zdiff !== 0 ? zdiff : a.style.zIndex - b.style.zIndex
      })

    // 화면 클리어
    this.gl.clearColor(0, 0, 0, 0)
    this.gl.clear(this.gl.COLOR_BUFFER_BIT)
    this.gl.enable(this.gl.BLEND)
    this.gl.blendFuncSeparate(
      this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA,
      this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA,
    )

    for (const obj of renderables) {
      this._drawObject(obj, camX, camY, camZ, assets, timestamp)
    }
  }

  // ─── 내부 오브젝트 렌더 ──────────────────────────────────────────────────

  private _drawObject(
    obj: LveObject,
    camX: number,
    camY: number,
    camZ: number,
    assets: LoadedAssets,
    timestamp: number,
  ) {
    const { style, transform } = obj

    const depth = transform.position.z - camZ
    if (depth < 0) return

    const focalLength = 500
    // depth=0이면 원근 투영 없이 1:1 스케일
    const perspectiveScale = depth === 0 ? 1 : focalLength / depth

    const screenX = (transform.position.x - camX) * perspectiveScale * transform.scale.x
    const screenY = (transform.position.y - camY) * perspectiveScale * transform.scale.y // WebGL은 Y 반전 (X) -> Lve4는 양수가 위로가야함

    const w = (style.width ?? 0) * perspectiveScale * transform.scale.x
    const h = (style.height ?? 0) * perspectiveScale * transform.scale.y
    const rotation = transform.rotation.z

    const type = obj.attribute.type

    if (type === 'rectangle') {
      this._drawRectangle(obj, screenX, screenY, w, h, rotation)
    } else if (type === 'ellipse') {
      this._drawEllipse(obj, screenX, screenY, w, h, rotation)
    } else if (type === 'text') {
      this._drawText(obj, screenX, screenY, perspectiveScale, rotation, timestamp)
    } else if (type === 'image') {
      this._drawAsset(obj as LveImage, screenX, screenY, w, h, rotation, assets)
    } else if (type === 'video') {
      this._drawVideo(obj as LveVideo, screenX, screenY, w, h, rotation, assets)
    } else if (type === 'sprite') {
      this._drawSprite(obj as Sprite, screenX, screenY, w, h, rotation, assets, timestamp)
    } else if (type === 'particle') {
      this._drawParticle(obj as Particle, screenX, screenY, w, h, perspectiveScale, assets, timestamp)
    }
  }

  // ─── 모델 행렬 헬퍼 ─────────────────────────────────────────────────────

  /**
   * 2D 직교 렌더링용 모델 행렬을 Float32Array(16)으로 반환합니다.
   * column-major 순서 (WebGL 표준)
   */
  private _makeModelMatrix(x: number, y: number, w: number, h: number, rotDeg: number): Float32Array {
    const cos = Math.cos((rotDeg * Math.PI) / 180)
    const sin = Math.sin((rotDeg * Math.PI) / 180)
    const m = new Float32Array(16)
    // [0]  [4]  [8]  [12]
    // [1]  [5]  [9]  [13]
    // [2]  [6]  [10] [14]
    // [3]  [7]  [11] [15]
    m[0] = cos * w; m[4] = -sin * h; m[8] = 0; m[12] = x
    m[1] = sin * w; m[5] = cos * h; m[9] = 0; m[13] = y
    m[2] = 0; m[6] = 0; m[10] = 1; m[14] = 0
    m[3] = 0; m[7] = 0; m[11] = 0; m[15] = 1
    return m
  }

  /** ogl 카메라의 projectionMatrix를 Float32Array로 반환 */
  private _projMatrix(): Float32Array {
    return this.camera.projectionMatrix as unknown as Float32Array
  }

  // ─── Program uniform 드로우 헬퍼 ─────────────────────────────────────────

  private _drawColorMesh(
    program: Program,
    x: number, y: number, w: number, h: number, rotDeg: number,
    color: string, opacity: number,
  ) {
    const [r, g, b, a] = parseCSSColor(color)
    program.uniforms['uColor'].value = [r, g, b, a]
    program.uniforms['uOpacity'].value = opacity
    program.uniforms['uModelMatrix'].value = this._makeModelMatrix(x, y, w, h, rotDeg)
    program.uniforms['uProjectionMatrix'].value = this._projMatrix()

    this.colorMesh.draw({ camera: this.camera })
  }

  private _drawTextureMesh(
    texture: Texture,
    x: number, y: number, w: number, h: number, rotDeg: number,
    opacity: number,
    flipY = false,
    uvOffset: [number, number] = [0, 0],
    uvScale: [number, number] = [1, 1],
  ) {
    const prog = this.textureProgram
    prog.uniforms['uTexture'].value = texture
    prog.uniforms['uOpacity'].value = opacity
    prog.uniforms['uFlipY'].value = flipY ? 1 : 0
    prog.uniforms['uUVOffset'].value = uvOffset
    prog.uniforms['uUVScale'].value = uvScale
    prog.uniforms['uModelMatrix'].value = this._makeModelMatrix(x, y, w, h, rotDeg)
    prog.uniforms['uProjectionMatrix'].value = this._projMatrix()

    this.textureMesh.draw({ camera: this.camera })
  }

  // ─── Rectangle ──────────────────────────────────────────────────────────

  private _drawRectangle(obj: LveObject, x: number, y: number, w: number, h: number, rot: number) {
    const { style } = obj
    if (!style.color && !style.borderColor) return

    // 테두리 먼저 그리기 (더 큰 사각형)
    if (style.borderColor && (style.borderWidth ?? 0) > 0) {
      const bw = style.borderWidth!
      this._drawColorMesh(this.colorProgram, x, y, w + bw * 2, h + bw * 2, rot, style.borderColor, style.opacity)
    }

    // 본체 그리기
    if (style.color) {
      this._drawColorMesh(this.colorProgram, x, y, w, h, rot, style.color, style.opacity)
    }
  }

  // ─── Ellipse ────────────────────────────────────────────────────────────

  private _drawEllipse(obj: LveObject, x: number, y: number, w: number, h: number, rot: number) {
    const { style } = obj
    if (!style.color && !style.borderColor) return

    const drawEllipse = (ew: number, eh: number, color: string) => {
      const [r, g, b, a] = parseCSSColor(color)
      this.ellipseProgram.uniforms['uColor'].value = [r, g, b, a]
      this.ellipseProgram.uniforms['uOpacity'].value = style.opacity
      this.ellipseProgram.uniforms['uModelMatrix'].value = this._makeModelMatrix(x, y, ew, eh, rot)
      this.ellipseProgram.uniforms['uProjectionMatrix'].value = this._projMatrix()
      this.ellipseMesh.draw({ camera: this.camera })
    }

    // 테두리 먼저 그리기 (더 큰 타원)
    if (style.borderColor && (style.borderWidth ?? 0) > 0) {
      const bw = style.borderWidth!
      drawEllipse(w + bw * 2, h + bw * 2, style.borderColor)
    }

    // 본체 그리기
    if (style.color) {
      drawEllipse(w, h, style.color)
    }
  }

  // ─── Text (Offscreen Canvas → Texture) ──────────────────────────────────

  private _drawText(obj: LveObject, x: number, y: number, perspectiveScale: number, rot: number, _timestamp: number) {
    const { style, attribute } = obj
    const id = obj.attribute.id
    const rawText = attribute.text ?? ''

    // 2x supersampling: z 애니메이션 중 canvas 재생성 없이 화질 확보
    const RENDER_SCALE = 2
    const baseFontSize = (style.fontSize ?? 16) * RENDER_SCALE
    const maxW = style.width != null ? style.width * RENDER_SCALE : null
    const maxH = style.height != null ? style.height * RENDER_SCALE : null

    // 캐시 키: perspectiveScale 미포함 (draw 시점에만 적용)
    let entry = this.textCache.get(id)
    const textKey = [
      rawText,
      style.fontSize,
      style.color,
      style.fontFamily,
      style.fontWeight,
      style.fontStyle,
      style.lineHeight,
      style.textAlign,
      maxW,
      maxH,
      style.shadowColor ?? '',
      style.shadowBlur ?? 0,
      style.shadowOffsetX ?? 0,
      style.shadowOffsetY ?? 0,
    ].join('|')

    let needRender = !entry || entry.lastText !== textKey

    if (!entry) {
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')!
      const texture = new Texture(this.gl, { image: canvas, generateMipmaps: false })
      const mesh = new Mesh(this.gl, { geometry: this.quadGeo, program: this.textureProgram })
      entry = { texture, canvas, ctx, lastText: '', mesh }
      this.textCache.set(id, entry)
    }

    if (needRender) {
      this._renderTextToCanvas(entry, rawText, style, baseFontSize, maxW, maxH)
      entry.lastText = textKey
    }

    const cw = entry.canvas.width
    const ch = entry.canvas.height
    if (cw === 0 || ch === 0) return

    // 실제 월드 크기 기록 (RENDER_SCALE 역산, scale 반영)
    obj._renderedSize = {
      w: (cw / RENDER_SCALE) * obj.transform.scale.x,
      h: (ch / RENDER_SCALE) * obj.transform.scale.y,
    }

    // canvas는 RENDER_SCALE 기준, 표시는 perspectiveScale 기준으로 보정
    const displayScale = perspectiveScale / RENDER_SCALE
    this._drawTextureMesh(entry.texture, x, y, cw * displayScale, ch * displayScale, rot, style.opacity, false)
  }

  private _renderTextToCanvas(
    entry: TextTextureEntry,
    rawText: string,
    style: LveObject['style'],
    baseFontSize: number,
    maxW: number | null,
    maxH: number | null,
  ) {
    const { canvas, ctx } = entry
    const fontFamily = style.fontFamily ?? 'sans-serif'
    const baseFontWeight = style.fontWeight ?? 'normal'
    const baseFontStyle = style.fontStyle ?? 'normal'
    const baseColor = style.color ?? '#000000'
    const lineHeightMul = style.lineHeight ?? 1
    const textAlign = style.textAlign ?? 'left'

    const spans = parseTextMarkup(rawText, {
      fontSize: baseFontSize,
      fontWeight: baseFontWeight,
      fontStyle: baseFontStyle,
      color: baseColor,
    })

    // shadow 지원: Canvas 2D에서 그대로 구현
    const shadowColor = style.shadowColor
    const shadowBlur = style.shadowBlur ?? 0
    const shadowOffsetX = style.shadowOffsetX ?? 0
    const shadowOffsetY = style.shadowOffsetY ?? 0

    // ── 논리 줄 → word-wrap 렌더 줄 계산 ─────────────────────────────
    interface RenderToken { text: string; span: ReturnType<typeof parseTextMarkup>[number] }
    interface RenderLine { tokens: RenderToken[]; lineH: number }

    const spaceRe = /(\S+|\s+)/g
    const renderLines: RenderLine[] = []
    const logicalLines: RenderToken[][] = [[]]

    for (const span of spans) {
      const parts = span.text.split('\n')
      parts.forEach((p, i) => {
        if (i > 0) logicalLines.push([])
        if (p) logicalLines[logicalLines.length - 1].push({ text: p, span })
      })
    }

    // sizes-only canvas for measuring
    canvas.width = 2
    canvas.height = 2

    for (const logLine of logicalLines) {
      let curLine: RenderToken[] = []
      let curW = 0
      let curH = baseFontSize * lineHeightMul

      const flushLine = () => {
        if (curLine.length > 0 || renderLines.length === 0) {
          renderLines.push({ tokens: curLine, lineH: curH })
        }
        curLine = []
        curW = 0
        curH = baseFontSize * lineHeightMul
      }

      if (logLine.length === 0) {
        renderLines.push({ tokens: [], lineH: baseFontSize * lineHeightMul })
        continue
      }

      for (const token of logLine) {
        const fs = token.span.style.fontSize ?? baseFontSize
        const fw = token.span.style.fontWeight ?? baseFontWeight
        const fi = token.span.style.fontStyle ?? baseFontStyle
        curH = Math.max(curH, fs * lineHeightMul)
        ctx.font = `${fi} ${fw} ${fs}px ${fontFamily}`

        if (maxW === null) {
          curLine.push(token)
        } else {
          const words = token.text.match(spaceRe) ?? [token.text]
          for (const word of words) {
            const wordW = ctx.measureText(word).width
            if (curW > 0 && curW + wordW > maxW) flushLine()
            curLine.push({ text: word, span: token.span })
            curW += wordW
          }
        }
      }
      flushLine()
    }

    const measuredWidths = renderLines.map(rl => {
      let w = 0
      for (const tok of rl.tokens) {
        const fs = tok.span.style.fontSize ?? baseFontSize
        const fw = tok.span.style.fontWeight ?? baseFontWeight
        const fi = tok.span.style.fontStyle ?? baseFontStyle
        ctx.font = `${fi} ${fw} ${fs}px ${fontFamily}`
        w += ctx.measureText(tok.text).width
      }
      return w
    })

    const containerW = maxW ?? Math.max(...measuredWidths, 0)
    const totalH = renderLines.reduce((s, r) => s + r.lineH, 0)

    const canvasW = Math.ceil(maxW ?? containerW) + shadowBlur * 2 + Math.abs(shadowOffsetX)
    const canvasH = Math.ceil(maxH ?? totalH) + shadowBlur * 2 + Math.abs(shadowOffsetY)

    canvas.width = canvasW
    canvas.height = canvasH
    ctx.clearRect(0, 0, canvasW, canvasH)

    if (shadowColor) {
      ctx.shadowColor = shadowColor
      ctx.shadowBlur = shadowBlur
      ctx.shadowOffsetX = shadowOffsetX
      ctx.shadowOffsetY = shadowOffsetY
    }

    const originX = shadowBlur + Math.max(0, shadowOffsetX) / 2
    const originY = shadowBlur + Math.max(0, shadowOffsetY) / 2

    let curY = originY
    for (let li = 0; li < renderLines.length; li++) {
      const rl = renderLines[li]
      const lineW = measuredWidths[li]
      let lineStartX: number
      if (textAlign === 'center') lineStartX = originX + (containerW - lineW) / 2
      else if (textAlign === 'right') lineStartX = originX + containerW - lineW
      else lineStartX = originX

      let penX = lineStartX
      const baseline = curY + rl.lineH * 0.8

      for (const tok of rl.tokens) {
        const fs = tok.span.style.fontSize ?? baseFontSize
        const fw = tok.span.style.fontWeight ?? baseFontWeight
        const fi = tok.span.style.fontStyle ?? baseFontStyle
        const fc = tok.span.style.color ?? baseColor
        const bc = tok.span.style.borderColor
        const bw = tok.span.style.borderWidth ?? 1

        ctx.font = `${fi} ${fw} ${fs}px ${fontFamily}`
        ctx.fillStyle = fc
        ctx.fillText(tok.text, penX, baseline)

        if (bc) {
          ctx.strokeStyle = bc
          ctx.lineWidth = bw as number
          ctx.strokeText(tok.text, penX, baseline)
        }
        penX += ctx.measureText(tok.text).width
      }
      curY += rl.lineH
    }

    // Texture 업데이트
    entry.texture.image = canvas
    entry.texture.needsUpdate = true
  }

  // ─── Image ──────────────────────────────────────────────────────────────

  private _drawAsset(obj: LveImage, x: number, y: number, w: number, h: number, rot: number, assets: LoadedAssets) {
    const src = obj._src
    const asset = src ? assets[src] : undefined
    if (!asset || !(asset instanceof HTMLImageElement)) {
      this._drawPlaceholder(x, y, w || 60, h || 60, rot)
      return
    }

    const drawW = w || asset.naturalWidth
    const drawH = h || asset.naturalHeight

    // 실제 월드 크기 기록: w/h는 perspectiveScale*scale이 반영된 screen 크기이므로 scale로만 역산
    obj._renderedSize = {
      w: drawW / obj.transform.scale.x,
      h: drawH / obj.transform.scale.y,
    }

    const texture = this._getOrCreateAssetTexture(src!, asset)

    this._drawTextureMesh(texture, x, y, drawW, drawH, rot, obj.style.opacity, false)
  }

  // ─── Video ──────────────────────────────────────────────────────────────

  private _drawVideo(obj: LveVideo, x: number, y: number, w: number, h: number, rot: number, assets: LoadedAssets) {
    const src = obj._src
    const asset = src ? assets[src] : undefined
    if (!asset || !(asset instanceof HTMLVideoElement)) {
      this._drawPlaceholder(x, y, w || 60, h || 60, rot)
      return
    }

    const clip = obj._clip

    if (obj._playing) {
      if (clip) {
        asset.loop = clip.loop
        if (asset.paused && clip.start != null) asset.currentTime = clip.start / 1000
      }
      if (asset.paused) asset.play().catch(() => { })
    } else {
      if (!asset.paused) asset.pause()
    }

    if (clip?.end != null && asset.currentTime >= clip.end / 1000) {
      if (clip.loop) {
        asset.currentTime = (clip.start ?? 0) / 1000
        obj._onRepeat()
      } else {
        asset.pause()
        obj._onEnded()
      }
    }

    const drawW = w || asset.videoWidth
    const drawH = h || asset.videoHeight

    // 실제 월드 크기 기록 (scale로만 역산)
    obj._renderedSize = {
      w: drawW / obj.transform.scale.x,
      h: drawH / obj.transform.scale.y,
    }

    // 비디오 텍스처는 매 프레임 업데이트
    let tex = this.videoTextureCache.get(src!)
    if (!tex) {
      tex = new Texture(this.gl, { image: asset, generateMipmaps: false })
      this.videoTextureCache.set(src!, tex)
    }
    tex.image = asset
    tex.needsUpdate = true

    this._drawTextureMesh(tex, x, y, drawW, drawH, rot, obj.style.opacity)
  }

  // ─── Sprite ─────────────────────────────────────────────────────────────

  private _drawSprite(sprite: Sprite, x: number, y: number, w: number, h: number, rot: number, assets: LoadedAssets, timestamp: number) {
    sprite.tick(timestamp)

    const clip = sprite._clip
    const src = clip?.src
    if (!src) return

    const asset = assets[src]
    if (!asset || !(asset instanceof HTMLImageElement)) {
      this._drawPlaceholder(x, y, w || 60, h || 60, rot)
      return
    }

    const texture = this._getOrCreateAssetTexture(src, asset)

    if (!clip) {
      const drawW = w || asset.naturalWidth
      const drawH = h || asset.naturalHeight
      this._drawTextureMesh(texture, x, y, drawW, drawH, rot, sprite.style.opacity)
      return
    }

    const { frameWidth, frameHeight } = clip
    const sheetCols = Math.floor(asset.naturalWidth / frameWidth)
    const frameIdx = sprite._currentFrame
    const col = frameIdx % sheetCols
    const row = Math.floor(frameIdx / sheetCols)
    const uvOffsetX = (col * frameWidth) / asset.naturalWidth
    const uvOffsetY = (row * frameHeight) / asset.naturalHeight
    const uvScaleX = frameWidth / asset.naturalWidth
    const uvScaleY = frameHeight / asset.naturalHeight

    const drawW = w || frameWidth
    const drawH = h || frameHeight

    this._drawTextureMesh(
      texture,
      x, y, drawW, drawH, rot,
      sprite.style.opacity,
      false,
      [uvOffsetX, uvOffsetY],
      [uvScaleX, uvScaleY],
    )
  }

  // ─── Particle (Instanced) ────────────────────────────────────────────────

  private _drawParticle(
    obj: Particle,
    emX: number, emY: number,
    w: number, h: number,
    perspectiveScale: number,
    assets: LoadedAssets,
    timestamp: number,
  ) {
    obj.tick(timestamp)

    const clip = obj._clip
    if (!clip) return

    const asset = assets[clip.src]
    if (!asset || !(asset instanceof HTMLImageElement)) {
      this._drawPlaceholder(emX, emY, w || 30, h || 30, 0)
      return
    }

    const instances = obj._instances
    if (instances.length === 0) return

    const natW = asset.naturalWidth
    const natH = asset.naturalHeight
    // w/h는 이미 perspectiveScale이 반영된 픽셀 크기
    const baseW = w || natW
    const baseH = h || natH

    const texture = this._getOrCreateAssetTexture(clip.src, asset)

    // 블렌드 모드 설정
    const blendMode = obj.style.blendMode ?? 'lighter'
    if (blendMode === 'lighter') {
      this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE)
    }

    for (const inst of instances) {
      const age = timestamp - inst.born
      const t = Math.min(age / inst.lifespan, 1)
      const scale = 1 - t
      const opacity = 1 - t
      if (opacity <= 0 || scale <= 0) continue

      // 에미터 위치 + 인스턴스 상대 오프셋 (Y는 Canvas 2D → WebGL 반전)
      const ix = emX + inst.x * perspectiveScale
      const iy = emY - inst.y * perspectiveScale

      const iw = baseW * scale
      const ih = baseH * scale

      this._drawTextureMesh(
        texture,
        ix, iy, iw, ih,
        0,
        obj.style.opacity * opacity,
      )
    }

    // 블렌드 복원
    this.gl.blendFuncSeparate(
      this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA,
      this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA,
    )
  }

  // ─── Placeholder ────────────────────────────────────────────────────────

  private _drawPlaceholder(x: number, y: number, w: number, h: number, rot: number) {
    this.placeholderProgram.uniforms['uModelMatrix'].value = this._makeModelMatrix(x, y, w, h, rot)
    this.placeholderProgram.uniforms['uProjectionMatrix'].value = this._projMatrix()
    this.placeholderMesh.draw({ camera: this.camera })
  }

  // ─── Texture 캐시 ────────────────────────────────────────────────────────

  private _getOrCreateAssetTexture(src: string, asset: HTMLImageElement): Texture {
    let tex = this.assetTextureCache.get(src)
    if (!tex) {
      tex = new Texture(this.gl, { image: asset, generateMipmaps: false })
      this.assetTextureCache.set(src, tex)
    }
    return tex
  }
}
