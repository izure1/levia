// src/Loader.ts
var Loader = class {
  listeners = {};
  assets = {};
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return this;
  }
  off(event, callback) {
    const list = this.listeners[event];
    if (!list) return this;
    const idx = list.indexOf(callback);
    if (idx !== -1) list.splice(idx, 1);
    return this;
  }
  emit(event, payload) {
    const list = this.listeners[event];
    list?.forEach((cb) => cb(payload));
  }
  async load(assets) {
    this.emit("load", { assets });
    const entries = Object.entries(assets);
    await Promise.all(
      entries.map(([key, src]) => {
        this.emit("loading", { key, src });
        return this.loadAsset(key, src);
      })
    );
    this.emit("complete", { assets: this.assets });
    return this.assets;
  }
  loadAsset(key, src) {
    return new Promise((resolve) => {
      const ext = src.split(".").pop()?.toLowerCase() ?? "";
      const isVideo = ["mp4", "webm", "ogg"].includes(ext);
      if (isVideo) {
        const video = document.createElement("video");
        video.src = src;
        video.onloadeddata = () => {
          this.assets[key] = video;
          this.emit("loaded", { key, asset: video });
          resolve();
        };
        video.onerror = () => {
          const error = new Error(`Failed to load video: ${src}`);
          this.emit("error", { key, src, error });
          resolve();
        };
      } else {
        const image = new Image();
        image.src = src;
        image.onload = () => {
          this.assets[key] = image;
          this.emit("loaded", { key, asset: image });
          resolve();
        };
        image.onerror = () => {
          const error = new Error(`Failed to load image: ${src}`);
          this.emit("error", { key, src, error });
          resolve();
        };
      }
    });
  }
};

// src/utils/uuid.ts
function v4() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = bytes[6] & 15 | 64;
  bytes[8] = bytes[8] & 63 | 128;
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0"));
  return [
    hex.slice(0, 4).join(""),
    hex.slice(4, 6).join(""),
    hex.slice(6, 8).join(""),
    hex.slice(8, 10).join(""),
    hex.slice(10, 16).join("")
  ].join("-");
}

// src/LveObject.ts
function makeVec3(partial) {
  return {
    x: partial?.x ?? 0,
    y: partial?.y ?? 0,
    z: partial?.z ?? 0
  };
}
function makeStyle(partial) {
  return {
    color: partial?.color,
    opacity: partial?.opacity ?? 1,
    width: partial?.width,
    height: partial?.height,
    blur: partial?.blur,
    borderColor: partial?.borderColor,
    borderWidth: partial?.borderWidth,
    fontSize: partial?.fontSize,
    fontFamily: partial?.fontFamily,
    fontWeight: partial?.fontWeight,
    fontStyle: partial?.fontStyle ?? "normal",
    textAlign: partial?.textAlign ?? "left",
    lineHeight: partial?.lineHeight ?? 1,
    display: partial?.display ?? "block",
    pointerEvents: partial?.pointerEvents ?? true,
    margin: partial?.margin,
    shadowColor: partial?.shadowColor,
    shadowBlur: partial?.shadowBlur,
    shadowOffsetX: partial?.shadowOffsetX,
    shadowOffsetY: partial?.shadowOffsetY,
    zIndex: partial?.zIndex ?? 0,
    blendMode: partial?.blendMode
  };
}
var LveObject = class {
  attribute;
  dataset;
  style;
  transform;
  constructor(type, options) {
    this.attribute = {
      type,
      id: v4(),
      name: options?.attribute?.name ?? "",
      className: options?.attribute?.className ?? "",
      src: options?.attribute?.src,
      text: options?.attribute?.text,
      loop: options?.attribute?.loop ?? false,
      physics: options?.attribute?.physics ?? null,
      density: options?.attribute?.density,
      friction: options?.attribute?.friction,
      restitution: options?.attribute?.restitution,
      fixedRotation: options?.attribute?.fixedRotation,
      gravityScale: options?.attribute?.gravityScale
    };
    this.dataset = Object.assign({}, options?.dataset);
    this.style = makeStyle(options?.style);
    this.transform = {
      position: makeVec3(options?.transform?.position),
      rotation: makeVec3(options?.transform?.rotation),
      scale: {
        x: options?.transform?.scale?.x ?? 1,
        y: options?.transform?.scale?.y ?? 1,
        z: options?.transform?.scale?.z ?? 1
      }
    };
  }
  setDataset(key, value) {
    this.dataset[key] = value;
  }
  getDataset(key) {
    return this.dataset[key];
  }
};

// src/objects/Camera.ts
var Camera = class extends LveObject {
  constructor(options) {
    super("camera", options);
  }
};

// src/objects/Rectangle.ts
var Rectangle = class extends LveObject {
  borderRadius;
  constructor(options) {
    super("rectangle", options);
    this.borderRadius = options?.style?.borderRadius ?? 0;
  }
};

// src/objects/Ellipse.ts
var Ellipse = class extends LveObject {
  constructor(options) {
    super("ellipse", options);
  }
};

// src/objects/Text.ts
var Text = class extends LveObject {
  constructor(options) {
    super("text", options);
  }
};

// src/objects/LveImage.ts
var LveImage = class extends LveObject {
  constructor(options) {
    super("image", options);
  }
};

// src/objects/LveVideo.ts
var LveVideo = class extends LveObject {
  constructor(options) {
    super("video", options);
  }
};

// src/objects/Sprite.ts
var Sprite = class extends LveObject {
  /** 현재 재생 중인 클립 이름 */
  _clipName = null;
  /** 현재 클립 정보 (Renderer에서 직접 참조) */
  _clip = null;
  /** 현재 프레임 인덱스 (clip.start 기준 절대 인덱스) */
  _currentFrame = 0;
  /** 마지막 프레임 변경 시각 (rAF timestamp) */
  _lastFrameTime = 0;
  /** 재생 중 여부 */
  _playing = false;
  constructor(options) {
    super("sprite", options);
  }
  /**
   * 지정한 이름의 애니메이션 클립을 재생합니다.
   * SpriteManager 인스턴스와 연동됩니다.
   */
  play(name, manager2) {
    const clip = manager2.get(name);
    if (!clip) {
      console.warn(`[Sprite] \uD074\uB9BD '${name}'\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.`);
      return;
    }
    if (this._clipName === name && this._playing) return;
    this._clipName = name;
    this._clip = clip;
    this._currentFrame = clip.start;
    this._lastFrameTime = 0;
    this._playing = true;
  }
  /** 애니메이션을 정지합니다. */
  stop() {
    this._playing = false;
  }
  /**
   * Renderer에서 매 프레임 호출하여 현재 프레임 인덱스를 업데이트합니다.
   */
  tick(timestamp) {
    if (!this._playing || !this._clip) return;
    const { frameRate, start, end, loop } = this._clip;
    const interval = 1e3 / frameRate;
    if (this._lastFrameTime === 0) {
      this._lastFrameTime = timestamp;
      return;
    }
    if (timestamp - this._lastFrameTime >= interval) {
      this._currentFrame++;
      this._lastFrameTime = timestamp;
      if (this._currentFrame >= end) {
        if (loop) {
          this._currentFrame = start;
        } else {
          this._currentFrame = end - 1;
          this._playing = false;
        }
      }
    }
  }
};

// src/objects/Particle.ts
var Particle = class extends LveObject {
  constructor(options) {
    super("particle", options);
  }
};

// src/SpriteManager.ts
var SpriteManager = class {
  clips = /* @__PURE__ */ new Map();
  /**
   * 애니메이션 클립을 등록합니다.
   */
  create(options) {
    this.clips.set(options.name, { ...options });
    return this;
  }
  /**
   * 이름으로 클립을 조회합니다.
   */
  get(name) {
    return this.clips.get(name);
  }
};

// src/utils/textMarkup.ts
function parseAttrs(attrStr) {
  const style = {};
  const re = /(\w+)=["']([^"']*)["']/g;
  let m;
  while ((m = re.exec(attrStr)) !== null) {
    const [, key, val] = m;
    switch (key) {
      case "fontSize":
        style.fontSize = parseFloat(val);
        break;
      case "fontWeight":
        style.fontWeight = val;
        break;
      case "fontStyle":
        style.fontStyle = val;
        break;
      case "color":
        style.color = val;
        break;
      case "borderColor":
        style.borderColor = val;
        break;
      case "borderWidth":
        style.borderWidth = parseFloat(val);
        break;
    }
  }
  return style;
}
var OPEN_RE = /<style([^>]*)>/;
var CLOSE_RE = /<\/style>/;
var TOKEN_RE = /(<style[^>]*>|<\/style>)/g;
function parseTextMarkup(raw, baseStyle) {
  const spans = [];
  const stack = [baseStyle];
  const tokens = raw.split(TOKEN_RE);
  for (const token of tokens) {
    if (!token) continue;
    if (OPEN_RE.test(token)) {
      const attrMatch = token.match(OPEN_RE);
      const attrs = attrMatch ? parseAttrs(attrMatch[1]) : {};
      const parent = stack[stack.length - 1];
      stack.push({ ...parent, ...attrs });
    } else if (CLOSE_RE.test(token)) {
      if (stack.length > 1) stack.pop();
    } else {
      if (token) {
        spans.push({ text: token, style: { ...stack[stack.length - 1] } });
      }
    }
  }
  return spans;
}

// src/Renderer.ts
var Renderer = class {
  canvas;
  ctx;
  constructor(canvas) {
    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("[Renderer] Failed to get 2D context from canvas.");
    this.ctx = ctx;
  }
  get width() {
    return this.canvas.width;
  }
  get height() {
    return this.canvas.height;
  }
  render(objects, assets = {}, timestamp = 0) {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.width, this.height);
    let camera2 = null;
    for (const obj of objects) {
      if (obj.attribute.type === "camera") {
        camera2 = obj;
        break;
      }
    }
    const camX = camera2?.transform.position.x ?? 0;
    const camY = camera2?.transform.position.y ?? 0;
    const camZ = camera2?.transform.position.z ?? 0;
    const renderables = Array.from(objects).filter((o) => o.attribute.type !== "camera" && o.style.display !== "none").sort((a, b) => {
      const zdiff = a.transform.position.z - b.transform.position.z;
      return zdiff !== 0 ? zdiff : a.style.zIndex - b.style.zIndex;
    });
    for (const obj of renderables) {
      this.drawObject(ctx, obj, camX, camY, camZ, assets, timestamp);
    }
  }
  drawObject(ctx, obj, camX, camY, camZ, assets = {}, timestamp = 0) {
    const { style, transform } = obj;
    const depth = transform.position.z - camZ;
    if (depth <= 0) return;
    const focalLength = 500;
    const perspectiveScale = focalLength / depth;
    const screenX = this.width / 2 + (transform.position.x - camX) * perspectiveScale * transform.scale.x;
    const screenY = this.height / 2 + (transform.position.y - camY) * perspectiveScale * transform.scale.y;
    const w = (style.width ?? 0) * perspectiveScale * transform.scale.x;
    const h = (style.height ?? 0) * perspectiveScale * transform.scale.y;
    ctx.save();
    ctx.globalAlpha = style.opacity;
    if (style.blendMode) ctx.globalCompositeOperation = style.blendMode;
    if (transform.rotation.z !== 0) {
      ctx.translate(screenX, screenY);
      ctx.rotate(transform.rotation.z * Math.PI / 180);
      ctx.translate(-screenX, -screenY);
    }
    if (style.shadowColor) {
      ctx.shadowColor = style.shadowColor;
      ctx.shadowBlur = style.shadowBlur ?? 0;
      ctx.shadowOffsetX = style.shadowOffsetX ?? 0;
      ctx.shadowOffsetY = style.shadowOffsetY ?? 0;
    }
    const type = obj.attribute.type;
    if (type === "rectangle") {
      this.drawRectangle(ctx, obj, screenX, screenY, w, h);
    } else if (type === "ellipse") {
      this.drawEllipse(ctx, obj, screenX, screenY, w, h);
    } else if (type === "text") {
      this.drawText(ctx, obj, screenX, screenY, perspectiveScale);
    } else if (type === "image" || type === "video" || type === "particle") {
      this.drawAsset(ctx, obj, screenX, screenY, w, h, assets);
    } else if (type === "sprite") {
      this.drawSprite(ctx, obj, screenX, screenY, w, h, assets, timestamp);
    }
    ctx.restore();
  }
  drawRectangle(ctx, obj, x, y, w, h) {
    const { style } = obj;
    const rx = x - w / 2;
    const ry = y - h / 2;
    const br = obj.borderRadius ?? 0;
    ctx.beginPath();
    if (br > 0 && ctx.roundRect) {
      ctx.roundRect(rx, ry, w, h, br);
    } else {
      ctx.rect(rx, ry, w, h);
    }
    if (style.color) {
      ctx.fillStyle = style.color;
      ctx.fill();
    }
    if (style.blur && style.blur > 0) {
      ctx.filter = `blur(${style.blur}px)`;
    }
    if (style.borderColor && style.borderWidth) {
      ctx.strokeStyle = style.borderColor;
      ctx.lineWidth = style.borderWidth;
      ctx.stroke();
    }
  }
  drawEllipse(ctx, obj, x, y, w, h) {
    const { style } = obj;
    ctx.beginPath();
    ctx.ellipse(x, y, w / 2, h / 2, 0, 0, Math.PI * 2);
    if (style.color) {
      ctx.fillStyle = style.color;
      ctx.fill();
    }
    if (style.borderColor && style.borderWidth) {
      ctx.strokeStyle = style.borderColor;
      ctx.lineWidth = style.borderWidth;
      ctx.stroke();
    }
  }
  drawText(ctx, obj, x, y, perspectiveScale) {
    const { style, attribute } = obj;
    const baseFontSize = (style.fontSize ?? 16) * perspectiveScale;
    const fontFamily = style.fontFamily ?? "sans-serif";
    const baseFontWeight = style.fontWeight ?? "normal";
    const baseFontStyle = style.fontStyle ?? "normal";
    const baseColor = style.color ?? "#000000";
    const lineHeightMul = style.lineHeight ?? 1;
    const textAlign = style.textAlign ?? "left";
    const rawText = attribute.text ?? "";
    const maxW = style.width == null ? null : style.width * perspectiveScale;
    const maxH = style.height == null ? null : style.height * perspectiveScale;
    const spans = parseTextMarkup(rawText, {
      fontSize: baseFontSize,
      fontWeight: baseFontWeight,
      fontStyle: baseFontStyle,
      color: baseColor
    });
    const renderLines = [];
    const logicalLines = [[]];
    for (const span of spans) {
      const parts = span.text.split("\n");
      parts.forEach((p, i) => {
        if (i > 0) logicalLines.push([]);
        if (p) logicalLines[logicalLines.length - 1].push({ text: p, span });
      });
    }
    const spaceRe = /(\S+|\s+)/g;
    for (const logLine of logicalLines) {
      let curLine = [];
      let curW = 0;
      let curH = baseFontSize * lineHeightMul;
      const flushLine = () => {
        if (curLine.length > 0 || renderLines.length === 0) {
          renderLines.push({ tokens: curLine, lineH: curH });
        }
        curLine = [];
        curW = 0;
        curH = baseFontSize * lineHeightMul;
      };
      if (logLine.length === 0) {
        renderLines.push({ tokens: [], lineH: baseFontSize * lineHeightMul });
        continue;
      }
      for (const token of logLine) {
        const fs = token.span.style.fontSize ?? baseFontSize;
        const fw = token.span.style.fontWeight ?? baseFontWeight;
        const fi = token.span.style.fontStyle ?? baseFontStyle;
        curH = Math.max(curH, fs * lineHeightMul);
        ctx.font = `${fi} ${fw} ${fs}px ${fontFamily}`;
        if (maxW === null) {
          curLine.push(token);
        } else {
          const words = token.text.match(spaceRe) ?? [token.text];
          for (const word of words) {
            const wordW = ctx.measureText(word).width;
            if (curW > 0 && curW + wordW > maxW) {
              flushLine();
            }
            curLine.push({ text: word, span: token.span });
            curW += wordW;
          }
        }
      }
      flushLine();
    }
    const measuredWidths = renderLines.map((rl) => {
      let w = 0;
      for (const tok of rl.tokens) {
        const fs = tok.span.style.fontSize ?? baseFontSize;
        const fw = tok.span.style.fontWeight ?? baseFontWeight;
        const fi = tok.span.style.fontStyle ?? baseFontStyle;
        ctx.font = `${fi} ${fw} ${fs}px ${fontFamily}`;
        w += ctx.measureText(tok.text).width;
      }
      return w;
    });
    const containerW = maxW ?? Math.max(...measuredWidths, 0);
    if (maxW !== null || maxH !== null) {
      const totalH = renderLines.reduce((s, r) => s + r.lineH, 0);
      const clipW = maxW ?? containerW;
      const clipH = maxH ?? totalH;
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, clipW, clipH);
      ctx.clip();
    }
    let curY = y;
    for (let li = 0; li < renderLines.length; li++) {
      const rl = renderLines[li];
      const lineW = measuredWidths[li];
      let lineStartX;
      if (textAlign === "center") {
        lineStartX = x + (containerW - lineW) / 2;
      } else if (textAlign === "right") {
        lineStartX = x + containerW - lineW;
      } else {
        lineStartX = x;
      }
      let penX = lineStartX;
      const baseline = curY + rl.lineH * 0.8;
      for (const tok of rl.tokens) {
        const fs = tok.span.style.fontSize ?? baseFontSize;
        const fw = tok.span.style.fontWeight ?? baseFontWeight;
        const fi = tok.span.style.fontStyle ?? baseFontStyle;
        const fc = tok.span.style.color ?? baseColor;
        const bc = tok.span.style.borderColor;
        const bw = tok.span.style.borderWidth ?? 1;
        ctx.font = `${fi} ${fw} ${fs}px ${fontFamily}`;
        ctx.fillStyle = fc;
        ctx.fillText(tok.text, penX, baseline);
        if (bc) {
          ctx.strokeStyle = bc;
          ctx.lineWidth = bw;
          ctx.strokeText(tok.text, penX, baseline);
        }
        penX += ctx.measureText(tok.text).width;
      }
      curY += rl.lineH;
    }
    if (maxW !== null || maxH !== null) {
      ctx.restore();
    }
  }
  // ─── 에셋 드로잉 (image / video / particle) ───────────────
  drawAsset(ctx, obj, x, y, w, h, assets) {
    const src = obj.attribute.src;
    const asset = src ? assets[src] : void 0;
    if (!asset) {
      this.drawPlaceholder(ctx, x, y, w || 60, h || 60);
      return;
    }
    const natW = asset instanceof HTMLImageElement ? asset.naturalWidth : asset.videoWidth;
    const natH = asset instanceof HTMLImageElement ? asset.naturalHeight : asset.videoHeight;
    const drawW = w || natW;
    const drawH = h || natH;
    ctx.drawImage(asset, x - drawW / 2, y - drawH / 2, drawW, drawH);
    if (obj.style.borderColor && obj.style.borderWidth) {
      ctx.strokeStyle = obj.style.borderColor;
      ctx.lineWidth = obj.style.borderWidth;
      ctx.strokeRect(x - drawW / 2, y - drawH / 2, drawW, drawH);
    }
  }
  // ─── 스프라이트 시트 드로잉 ───────────────────────────────
  drawSprite(ctx, sprite, x, y, w, h, assets, timestamp) {
    sprite.tick(timestamp);
    const clip = sprite._clip;
    const src = clip?.src ?? sprite.attribute.src;
    if (!src) return;
    const asset = assets[src];
    if (!asset || !(asset instanceof HTMLImageElement)) {
      this.drawPlaceholder(ctx, x, y, w || 60, h || 60);
      return;
    }
    if (!clip) {
      const drawW2 = w || asset.naturalWidth;
      const drawH2 = h || asset.naturalHeight;
      ctx.drawImage(asset, x - drawW2 / 2, y - drawH2 / 2, drawW2, drawH2);
      return;
    }
    const { frameWidth, frameHeight } = clip;
    const sheetCols = Math.floor(asset.naturalWidth / frameWidth);
    const frameIdx = sprite._currentFrame;
    const col = frameIdx % sheetCols;
    const row = Math.floor(frameIdx / sheetCols);
    const sx = col * frameWidth;
    const sy = row * frameHeight;
    const drawW = w || frameWidth;
    const drawH = h || frameHeight;
    ctx.drawImage(
      asset,
      sx,
      sy,
      frameWidth,
      frameHeight,
      x - drawW / 2,
      y - drawH / 2,
      drawW,
      drawH
    );
  }
  // ─── 에셋 미로드 시 placeholder ──────────────────────────
  drawPlaceholder(ctx, x, y, w, h) {
    ctx.strokeStyle = "#ff006688";
    ctx.lineWidth = 1;
    ctx.strokeRect(x - w / 2, y - h / 2, w, h);
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y - h / 2);
    ctx.lineTo(x + w / 2, y + h / 2);
    ctx.moveTo(x + w / 2, y - h / 2);
    ctx.lineTo(x - w / 2, y + h / 2);
    ctx.stroke();
  }
};

// src/World.ts
var World = class {
  renderer;
  objects = /* @__PURE__ */ new Set();
  rafId = null;
  /** 모든 Loader에서 로드된 에셋의 통합 맵 */
  _assets = {};
  constructor(canvas) {
    const canvasEl = canvas ?? this.createCanvas();
    this.renderer = new Renderer(canvasEl);
  }
  createCanvas() {
    const canvas = document.createElement("canvas");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    canvas.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;";
    document.body.appendChild(canvas);
    window.addEventListener("resize", () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    });
    return canvas;
  }
  /**
   * 스프라이트 애니메이션 클립을 관리하는 SpriteManager를 생성합니다.
   */
  createSpriteManager() {
    return new SpriteManager();
  }
  /**
   * 에셋 로더를 생성합니다. 로드 완료 시 World 내부 에셋 맵에 자동으로 병합됩니다.
   */
  createLoader() {
    const loader2 = new Loader();
    loader2.on("complete", ({ assets }) => {
      Object.assign(this._assets, assets);
    });
    return loader2;
  }
  createCamera(options) {
    const cam = new Camera(options);
    this.objects.add(cam);
    return cam;
  }
  createRectangle(options) {
    const rect = new Rectangle(options);
    this.objects.add(rect);
    return rect;
  }
  createEllipse(options) {
    const el = new Ellipse(options);
    this.objects.add(el);
    return el;
  }
  createText(options) {
    const text = new Text(options);
    this.objects.add(text);
    return text;
  }
  createImage(options) {
    const img = new LveImage(options);
    this.objects.add(img);
    return img;
  }
  createVideo(options) {
    const video = new LveVideo(options);
    this.objects.add(video);
    return video;
  }
  createSprite(options) {
    const sprite = new Sprite(options);
    this.objects.add(sprite);
    return sprite;
  }
  createParticle(options) {
    const particle = new Particle(options);
    this.objects.add(particle);
    return particle;
  }
  removeObject(obj) {
    this.objects.delete(obj);
  }
  start() {
    if (this.rafId !== null) return;
    const loop = (timestamp) => {
      this.renderer.render(this.objects, this._assets, timestamp);
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  }
  stop() {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }
};

// example/test-asset/main.ts
var world = new World();
var camera = world.createCamera();
camera.transform.position.z = -100;
var loader = world.createLoader();
var manager = world.createSpriteManager();
await loader.load({
  "logo": "../asset/image/logo.png",
  "sprite": "../asset/image/sprite.png"
});
manager.create({
  name: "play",
  src: "sprite",
  frameWidth: 44,
  frameHeight: 40,
  frameRate: 10,
  loop: true,
  start: 0,
  end: 10
});
function label(text, x, y, z) {
  world.createText({
    attribute: { text },
    style: { color: "#888", fontSize: 13, fontFamily: "monospace" },
    transform: { position: { x, y, z } }
  });
}
label("\u2460 LveImage \u2014 logo.png (auto size)", -500, -250, 300);
world.createImage({
  attribute: { src: "logo" },
  transform: { position: { x: -380, y: -160, z: 300 } }
});
label("\u2461 LveImage \u2014 logo.png (200\xD7200)", -500, 20, 300);
world.createImage({
  attribute: { src: "logo" },
  style: { width: 200, height: 200 },
  transform: { position: { x: -400, y: 120, z: 300 } }
});
label("\u2462 Placeholder (no src)", -500, 250, 300);
world.createImage({
  style: { width: 80, height: 80 },
  transform: { position: { x: -460, y: 310, z: 300 } }
});
label("\u2463 Sprite \u2014 sprite.png (10fps, 44\xD740)", 80, -250, 300);
var spr = world.createSprite({
  attribute: { src: "sprite" },
  style: { width: 132, height: 120 },
  // 3× 확대
  transform: { position: { x: 180, y: -160, z: 300 } }
});
spr.play("play", manager);
label("\u2464 Sprite \uC6D0\uACBD (z=600)", 80, 60, 300);
var sprFar = world.createSprite({
  attribute: { src: "sprite" },
  style: { width: 132, height: 120 },
  transform: { position: { x: 180, y: 160, z: 600 } }
});
sprFar.play("play", manager);
window.addEventListener("mousemove", (e) => {
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight / 2;
  camera.transform.position.x = (e.clientX - cx) * 0.1;
  camera.transform.position.y = (e.clientY - cy) * 0.1;
});
world.start();
//# sourceMappingURL=main.js.map
