"use client";

import { useEffect, useRef, useState } from "react";

const TAU = Math.PI * 2;
const FLOATS_PER_PARTICLE = 10;

type Bloom = { x: number; y: number; z: number; scale: number; rx: number; ry: number; palette: number };

function seededRandom(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let value = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function mix(a: number[], b: number[], t: number) {
  return a.map((value, index) => value + (b[index] - value) * t);
}

function addParticle(target: number[], x: number, y: number, z: number, r: number, g: number, b: number, alpha: number, size: number, phase: number, type: number) {
  target.push(x, y, z, r, g, b, alpha, size, phase, type);
}

async function buildScene(mobile: boolean) {
  const response = await fetch("/rose-points.bin");
  if (!response.ok) throw new Error("玫瑰模型加载失败");
  const buffer = await response.arrayBuffer();
  const pointCount = new DataView(buffer).getUint32(0, true);
  const model = new Float32Array(buffer, 4, pointCount * 3);
  const random = seededRandom(8172026);
  const data: number[] = [];
  const deep = [.78, .08, .18], rose = [1, .36, .49], blush = [1, .76, .82], ivory = [1, .97, .94];
  const bloomTone = (palette: number, fold: number, sparkle = 0) => {
    if (palette === 0) return mix(deep, rose, .42 + fold * .42 + sparkle * .08);
    if (palette === 1) return mix(rose, blush, .34 + fold * .48 + sparkle * .10);
    return mix(blush, ivory, .58 + fold * .36 + sparkle * .06);
  };

  // Each entry is one complete rose. Centers are deliberately allowed to overlap,
  // so the red, pink and white flowers interlock instead of becoming color regions.
  const blooms: Bloom[] = [];
  for (let i = 0; i < 68; i++) {
    const paired = i > 8 && i % 4 === 0;
    let x: number, y: number, z: number;
    if (paired) {
      const neighbor = blooms[Math.floor(random() * blooms.length)];
      const angle = random() * TAU;
      const distance = 9 + random() * 15;
      x = neighbor.x + Math.cos(angle) * distance;
      y = neighbor.y + (random() - .5) * 13;
      z = neighbor.z + Math.sin(angle) * distance;
    } else {
      const angle = random() * TAU;
      let radius: number;
      if (i < 14) {
        radius = Math.sqrt(random()) * 42;
        y = 82 + random() * 49;
      } else if (i < 44) {
        radius = 28 + Math.sqrt(random()) * 48;
        y = 48 + random() * 58;
      } else {
        radius = 55 + Math.sqrt(random()) * 48;
        y = 13 + random() * 55;
      }
      x = Math.cos(angle) * radius + (random() - .5) * 13;
      z = Math.sin(angle) * radius * .86 + (random() - .5) * 13;
    }
    const pick = random();
    const palette = pick < .18 ? 0 : pick < .67 ? 1 : 2;
    blooms.push({ x, y, z, scale: .235 + random() * .085, rx: -.12 + random() * .27, ry: random() * TAU, palette });
  }
  const stride = mobile ? 12 : 5;
  blooms.forEach((bloom, bloomIndex) => {
    const cosY = Math.cos(bloom.ry), sinY = Math.sin(bloom.ry), cosX = Math.cos(bloom.rx), sinX = Math.sin(bloom.rx);
    for (let i = bloomIndex % stride; i < pointCount; i += stride) {
      const lx = model[i * 3] * bloom.scale, ly = model[i * 3 + 1] * bloom.scale, lz = model[i * 3 + 2] * bloom.scale;
      const x1 = lx * cosY - lz * sinY, z1 = lx * sinY + lz * cosY;
      const y1 = ly * cosX - z1 * sinX, z2 = ly * sinX + z1 * cosX;
      const x = x1 + bloom.x, y = y1 + bloom.y, z = z2 + bloom.z;
      const foldField = (Math.sin(lx * .10 + bloomIndex) + Math.sin(ly * .115 - lz * .045) + 2) * .25;
      const color = bloomTone(bloom.palette, foldField, random());
      const pearl = random() > .965;
      addParticle(data, x, y, z, pearl ? 1 : color[0], pearl ? .98 : color[1], pearl ? .96 : color[2], .74 + random() * .23, 1 + random() * 1.7, random() * TAU, 0);
    }
    const stemCount = mobile ? 90 : 230;
    for (let i = 0; i < stemCount; i++) {
      const t = random(), angle = random() * TAU, radius = .6 + random() * 1.6;
      addParticle(data, bloom.x * (1 - t) * .84 + Math.cos(angle) * radius, bloom.y - 34 - t * (bloom.y + 16), bloom.z * (1 - t) * .84 + Math.sin(angle) * radius, .24, .30, .22, .64, 1 + random() * 1.2, random() * TAU, 1);
    }
  });

  const cloudCount = mobile ? 10000 : 24000;
  for (let i = 0; i < cloudCount; i++) {
    const vertical = random() * 2 - 1, angle = random() * TAU, horizontal = Math.sqrt(1 - vertical * vertical);
    let x: number, y: number, z: number;
    if (random() < .82) {
      const bloom = blooms[Math.floor(random() * blooms.length)];
      const localRadius = (34 + random() * 11) * (bloom.scale / .28) * (.66 + Math.pow(random(), .58) * .39);
      const lobeNoise = 1 + Math.sin(angle * (3 + bloom.scale * 4) + vertical * 5 + bloom.x) * .11;
      x = bloom.x + Math.cos(angle) * horizontal * localRadius * lobeNoise;
      y = bloom.y + vertical * localRadius * .88 + (random() - .5) * 4;
      z = bloom.z + Math.sin(angle) * horizontal * localRadius * lobeNoise;
    } else {
      const radius = .67 + Math.pow(random(), .42) * .35;
      const irregular = 1 + Math.sin(angle * 2.7 + vertical * 5.4) * .13 + Math.sin(angle * 6.3 - vertical * 4.2) * .07 + (random() - .5) * .055;
      x = Math.cos(angle) * horizontal * 146 * radius * irregular + Math.sin(vertical * 6) * 7;
      y = 54 + vertical * 105 * radius + Math.sin(angle * 2.6 + .7) * (1 - Math.abs(vertical)) * 10;
      z = Math.sin(angle) * horizontal * 139 * radius * irregular + Math.cos(vertical * 5) * 5;
    }
    const nearest = blooms.reduce((best, bloom) => {
      const distance = (x - bloom.x) ** 2 + (y - bloom.y) ** 2 + (z - bloom.z) ** 2;
      return distance < best.distance ? { bloom, distance } : best;
    }, { bloom: blooms[0], distance: Infinity });
    const color = bloomTone(nearest.bloom.palette, .25 + random() * .58, random());
    addParticle(data, x, y, z, color[0], color[1], color[2], .16 + random() * .25, .62 + random() * 1.15, random() * TAU, 2);
  }

  const wispCount = mobile ? 7200 : 18000;
  for (let i = 0; i < wispCount; i++) {
    const vertical = random() * 2 - 1, angle = random() * TAU, horizontal = Math.sqrt(1 - vertical * vertical);
    const bloom = blooms[Math.floor(random() * blooms.length)];
    const radius = (42 + random() * 15) * (bloom.scale / .28) * (1.0 + Math.pow(random(), 2.0) * .42);
    const irregular = 1 + Math.sin(angle * 3.4 + vertical * 5 + bloom.y) * .13 + (random() - .5) * .06;
    const x = bloom.x + Math.cos(angle) * horizontal * radius * irregular;
    const y = bloom.y + vertical * radius * .90 + Math.sin(angle * 3) * 4;
    const z = bloom.z + Math.sin(angle) * horizontal * radius * irregular;
    const color = bloomTone(bloom.palette, .30 + random() * .60, random());
    addParticle(data, x, y, z, color[0], color[1], color[2], .09 + random() * .22, .48 + random() * 1.05, random() * TAU, 2);
  }

  const undergrowthCount = mobile ? 2400 : 6000;
  for (let i = 0; i < undergrowthCount; i++) {
    const angle = random() * TAU, radius = Math.pow(random(), .56) * 120;
    const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
    const y = -26 + (1 - radius / 120) * 34 + (random() - .5) * 28;
    const pale = random();
    addParticle(data, x, y, z, .38 + pale * .32, .42 + pale * .30, .34 + pale * .31, .18 + random() * .24, .7 + random() * 1.3, random() * TAU, 2);
  }

  blooms.forEach((bloom, branchIndex) => {
    const startAngle = random() * TAU;
    const startRadius = 2.5 + random() * 7;
    const startX = Math.cos(startAngle) * startRadius;
    const startZ = Math.sin(startAngle) * startRadius;
    const endAngle = startAngle + (random() - .5) * .8;
    const endRadius = 8 + random() * 19;
    const endX = Math.cos(endAngle) * endRadius;
    const endZ = Math.sin(endAngle) * endRadius;
    const branchCount = mobile ? 90 : 230;
    for (let i = 0; i < branchCount; i++) {
      const t = random();
      const bend = Math.sin(t * Math.PI) * (random() - .5) * 3.5;
      const x = startX + (endX - startX) * t + bend;
      const y = -50 - t * (125 + (branchIndex % 5) * 3 + random() * 5);
      const z = startZ + (endZ - startZ) * t + Math.cos(t * Math.PI) * bend;
      const warm = branchIndex % 4 === 0;
      addParticle(data, x, y, z, warm ? .40 : .22, warm ? .28 : .35, warm ? .19 : .22, .74 + random() * .20, .85 + random() * 1.15, random() * TAU, 1);
    }
  });

  const ribbonCount = mobile ? 4200 : 9800;
  for (let i = 0; i < ribbonCount; i++) {
    const angle = random() * TAU;
    const turn = i % 3;
    const radius = 12.2 + turn * .55 + (random() - .5) * 1.15 + Math.sin(angle * 6 + turn) * .38;
    const y = -53 + turn * 3.15 + (random() - .5) * 1.45 + Math.sin(angle * 4 + turn) * .28;
    const white = turn === 1 || Math.sin(angle * 5.1 + turn) > .72;
    const color = white ? mix(blush, ivory, .80 + random() * .18) : mix(rose, blush, .56 + random() * .18);
    addParticle(data, Math.cos(angle) * radius, y, Math.sin(angle) * radius, color[0], color[1], color[2], .90 + random() * .10, 1.05 + random() * 1.15, random() * TAU, 5);
  }

  const cube = 182, top = 196, bottom = -202;
  const corners = [[-cube, top, -cube], [cube, top, -cube], [cube, top, cube], [-cube, top, cube], [-cube, bottom, -cube], [cube, bottom, -cube], [cube, bottom, cube], [-cube, bottom, cube]];
  const edges = [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]];
  edges.forEach(([from, to]) => {
    const a = corners[from], b = corners[to], steps = mobile ? 120 : 240;
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      addParticle(data, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t, .92, .90, .88, .34, 1.05, random() * TAU, 6);
    }
  });

  for (let i = 0; i < (mobile ? 600 : 1600); i++) {
    const angle = random() * TAU, radius = 175 + random() * 120;
    addParticle(data, Math.cos(angle) * radius, (random() - .3) * 330, Math.sin(angle) * radius, 1, .62 + random() * .28, .66 + random() * .26, .10, .7 + random(), random() * TAU, 3);
  }
  return new Float32Array(data);
}

function compileShader(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("无法创建着色器");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) || "着色器编译失败");
  return shader;
}

function createProgram(gl: WebGLRenderingContext) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, `
    precision highp float;
    attribute vec3 aPosition;
    attribute vec4 aColor;
    attribute float aSize;
    attribute float aPhase;
    attribute float aType;
    uniform float uTime;
    uniform float uRotationX;
    uniform float uRotationY;
    uniform float uZoom;
    uniform float uAspect;
    uniform float uDpr;
    varying vec4 vColor;
    void main() {
      vec3 p = aPosition;
      if (aType < .5) {
        float breath = 1.0 + sin(uTime * .9 + aPhase) * .006;
        p.xz *= breath;
        p.y = 70.0 + (p.y - 70.0) * breath;
      }
      if (aType > 2.5 && aType < 3.5) {
        p.y += mod(uTime * 7.0 + aPhase * 18.0, 34.0) - 17.0;
        p.x += sin(uTime * .55 + aPhase) * 3.5;
      }
      if (aType > 1.5 && aType < 2.5) {
        p.x += sin(uTime * .42 + aPhase) * 1.35;
        p.y += cos(uTime * .36 + aPhase * 1.7) * .9;
        p.z += sin(uTime * .31 + aPhase * .8) * 1.15;
      }
      float cy = cos(uRotationY), sy = sin(uRotationY);
      float cx = cos(uRotationX), sx = sin(uRotationX);
      vec3 q = vec3(p.x * cy - p.z * sy, p.y, p.x * sy + p.z * cy);
      q = vec3(q.x, q.y * cx - q.z * sx, q.y * sx + q.z * cx);
      float perspective = 2.8 / (3.35 + q.z * .0034);
      vec2 clip = vec2(q.x * .0040 / uAspect, q.y * .0040) * perspective * uZoom;
      clip.y -= .035;
      gl_Position = vec4(clip, clamp(q.z * .0031, -.88, .88), 1.0);
      gl_PointSize = min(13.0 * uDpr, max(1.2, aSize * uDpr * perspective * uZoom));
      float depthLight = clamp(.92 - q.z * .0011, .56, 1.14);
      float pulse = .88 + max(0.0, sin(uTime * 1.25 + aPhase)) * .12;
      vColor = vec4(aColor.rgb * depthLight, aColor.a * pulse);
    }
  `);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, `
    precision mediump float;
    varying vec4 vColor;
    void main() {
      vec2 delta = gl_PointCoord - vec2(.5);
      float distanceFromCenter = length(delta) * 2.0;
      if (distanceFromCenter > 1.0) discard;
      float soft = smoothstep(1.0, .12, distanceFromCenter);
      float core = smoothstep(.48, 0.0, distanceFromCenter) * .38;
      gl_FragColor = vec4(vColor.rgb, vColor.a * (soft + core));
    }
  `);
  const program = gl.createProgram();
  if (!program) throw new Error("无法创建 WebGL 程序");
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "WebGL 程序链接失败");
  return program;
}

function buildWrapMesh() {
  const data: number[] = [];
  const segments = 36;
  const rings = [
    { y: -2, radius: 90, alpha: .19 },
    { y: -16, radius: 68, alpha: .24 },
    { y: -34, radius: 42, alpha: .30 },
    { y: -50, radius: 13.5, alpha: .42 },
    { y: -104, radius: 27, alpha: .36 },
    { y: -170, radius: 34, alpha: .30 },
  ];
  const vertex = (ringIndex: number, segmentIndex: number) => {
    const ring = rings[ringIndex];
    const angle = segmentIndex / segments * TAU;
    const tied = ringIndex === 3;
    const fold = tied ? .5 : (Math.sin(angle * 7 + ringIndex * .8) * 4.8 + Math.sin(angle * 13 - ringIndex) * 2.1) * (ring.radius / 90);
    const radius = ring.radius + fold;
    const crinkle = ringIndex === 0 ? Math.sin(angle * 3.2) * 9 + Math.sin(angle * 8.1) * 4 : Math.sin(angle * 5 + ringIndex) * 1.4;
    const highlight = .5 + .5 * Math.sin(angle * 7 + ringIndex * .9);
    return [Math.cos(angle) * radius, ring.y + crinkle, Math.sin(angle) * radius, .93 + highlight * .07, .63 + highlight * .18, .73 + highlight * .16, ring.alpha] as const;
  };
  const push = (value: readonly number[]) => data.push(...value);
  for (let ring = 0; ring < rings.length - 1; ring++) {
    for (let segment = 0; segment < segments; segment++) {
      const next = (segment + 1) % segments;
      const a = vertex(ring, segment), b = vertex(ring, next), c = vertex(ring + 1, segment), d = vertex(ring + 1, next);
      push(a); push(c); push(b);
      push(b); push(c); push(d);
    }
  }
  return new Float32Array(data);
}

function createWrapProgram(gl: WebGLRenderingContext) {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, `
    precision highp float;
    attribute vec3 aPosition;
    attribute vec4 aColor;
    uniform float uTime;
    uniform float uRotationX;
    uniform float uRotationY;
    uniform float uZoom;
    uniform float uAspect;
    varying vec4 vColor;
    varying vec3 vPosition;
    void main() {
      float cy = cos(uRotationY), sy = sin(uRotationY);
      float cx = cos(uRotationX), sx = sin(uRotationX);
      vec3 q = vec3(aPosition.x * cy - aPosition.z * sy, aPosition.y, aPosition.x * sy + aPosition.z * cy);
      q = vec3(q.x, q.y * cx - q.z * sx, q.y * sx + q.z * cx);
      float perspective = 2.8 / (3.35 + q.z * .0034);
      vec2 clip = vec2(q.x * .0040 / uAspect, q.y * .0040) * perspective * uZoom;
      clip.y -= .035;
      gl_Position = vec4(clip, clamp(q.z * .0031, -.88, .88), 1.0);
      vColor = aColor;
      vPosition = q;
    }
  `);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, `
    precision mediump float;
    uniform float uTime;
    varying vec4 vColor;
    varying vec3 vPosition;
    void main() {
      float ridge = pow(max(0.0, sin(vPosition.x * .085 + vPosition.y * .034 - uTime * .18)), 14.0);
      float sheen = pow(max(0.0, cos(vPosition.z * .065 - vPosition.y * .022)), 18.0);
      vec3 plastic = vColor.rgb + vec3(.26, .22, .24) * ridge + vec3(.32) * sheen;
      gl_FragColor = vec4(plastic, min(.62, vColor.a + ridge * .18 + sheen * .12));
    }
  `);
  const program = gl.createProgram();
  if (!program) throw new Error("无法创建包装材质程序");
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) || "包装材质程序链接失败");
  return program;
}

function drawStaticFallback(canvas: HTMLCanvasElement, scene: Float32Array) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const width = canvas.clientWidth, height = canvas.clientHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
  canvas.width = width * dpr; canvas.height = height * dpr;
  context.scale(dpr, dpr);
  context.fillStyle = "#07080a"; context.fillRect(0, 0, width, height);
  const scale = Math.min(width, height) / 520;
  const map = (x: number, y: number) => [width * .5 + x * scale, height * .52 - y * scale] as const;
  const tie = map(0, -50), leftTop = map(-88, -2), rightTop = map(88, -2), leftBottom = map(-34, -170), rightBottom = map(34, -170);
  context.fillStyle = "rgba(255,184,207,.16)";
  context.strokeStyle = "rgba(255,230,236,.52)";
  context.lineWidth = 1;
  context.beginPath(); context.moveTo(...tie); context.lineTo(...leftTop); context.quadraticCurveTo(...map(-64, -82), ...leftBottom); context.quadraticCurveTo(...map(-16, -118), ...tie); context.fill(); context.stroke();
  context.beginPath(); context.moveTo(...tie); context.lineTo(...rightTop); context.quadraticCurveTo(...map(64, -82), ...rightBottom); context.quadraticCurveTo(...map(16, -118), ...tie); context.fill(); context.stroke();
  context.fillStyle = "rgba(255,220,229,.10)";
  context.beginPath(); context.moveTo(...map(-54, -12)); context.quadraticCurveTo(...map(0, -28), ...map(57, -10)); context.lineTo(...rightBottom); context.quadraticCurveTo(...map(0, -126), ...leftBottom); context.closePath(); context.fill();
  context.strokeStyle = "rgba(255,238,242,.32)";
  for (let i = -3; i <= 3; i++) {
    const top = map(i * 28, -1 + Math.sin(i * 1.7) * 8), bottom = map(i * 8, -168);
    context.beginPath(); context.moveTo(...top); context.quadraticCurveTo(...tie, ...bottom); context.stroke();
  }
  for (let i = 0; i < scene.length; i += FLOATS_PER_PARTICLE * 3) {
    const x = scene[i], y = scene[i + 1], z = scene[i + 2];
    const perspective = 2.8 / (3.35 + z * .0034);
    const sx = width * .5 + x * scale * perspective;
    const sy = height * .52 - y * scale * perspective;
    const r = Math.round(scene[i + 3] * 255), g = Math.round(scene[i + 4] * 255), b = Math.round(scene[i + 5] * 255);
    context.fillStyle = `rgba(${r},${g},${b},${Math.min(.8, scene[i + 6])})`;
    context.fillRect(sx, sy, Math.max(1, scene[i + 7] * .65), Math.max(1, scene[i + 7] * .65));
  }
}

export default function WebGLBouquet() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef({ x: -.34, y: -.08 });
  const zoomRef = useRef(1);
  const autoRotateRef = useRef(true);
  const draggingRef = useRef(false);
  const pointerRef = useRef({ x: 0, y: 0 });
  const [autoRotate, setAutoRotate] = useState(true);
  const [hint, setHint] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => { autoRotateRef.current = autoRotate; }, [autoRotate]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const mobile = window.innerWidth < 760;
    let animationFrame = 0;
    let disposed = false;
    let gl: WebGLRenderingContext | null = null;
    const start = async () => {
      const scene = await buildScene(mobile);
      const wrapScene = buildWrapMesh();
      if (disposed) return;
      gl = canvas.getContext("webgl", { alpha: false, antialias: false, depth: true, powerPreference: "high-performance" });
      if (!gl) {
        drawStaticFallback(canvas, scene);
        setReady(true);
        return;
      }
      const program = createProgram(gl);
      const wrapProgram = createWrapProgram(gl);
      const particleBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, scene, gl.STATIC_DRAW);
      const wrapBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, wrapBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, wrapScene, gl.STATIC_DRAW);
      const stride = FLOATS_PER_PARTICLE * 4;
      const attributes = [
        ["aPosition", 3, 0], ["aColor", 4, 3 * 4], ["aSize", 1, 7 * 4], ["aPhase", 1, 8 * 4], ["aType", 1, 9 * 4],
      ] as const;
      const bindParticles = () => {
        gl!.useProgram(program);
        gl!.bindBuffer(gl!.ARRAY_BUFFER, particleBuffer);
        attributes.forEach(([name, size, offset]) => {
          const location = gl!.getAttribLocation(program, name);
          gl!.enableVertexAttribArray(location);
          gl!.vertexAttribPointer(location, size, gl!.FLOAT, false, stride, offset);
        });
      };
      const bindWrap = () => {
        gl!.useProgram(wrapProgram);
        gl!.bindBuffer(gl!.ARRAY_BUFFER, wrapBuffer);
        const position = gl!.getAttribLocation(wrapProgram, "aPosition");
        const color = gl!.getAttribLocation(wrapProgram, "aColor");
        gl!.enableVertexAttribArray(position);
        gl!.vertexAttribPointer(position, 3, gl!.FLOAT, false, 7 * 4, 0);
        gl!.enableVertexAttribArray(color);
        gl!.vertexAttribPointer(color, 4, gl!.FLOAT, false, 7 * 4, 3 * 4);
      };
      const uniforms = {
        time: gl.getUniformLocation(program, "uTime"), rotationX: gl.getUniformLocation(program, "uRotationX"), rotationY: gl.getUniformLocation(program, "uRotationY"), zoom: gl.getUniformLocation(program, "uZoom"), aspect: gl.getUniformLocation(program, "uAspect"), dpr: gl.getUniformLocation(program, "uDpr"),
      };
      const wrapUniforms = {
        time: gl.getUniformLocation(wrapProgram, "uTime"), rotationX: gl.getUniformLocation(wrapProgram, "uRotationX"), rotationY: gl.getUniformLocation(wrapProgram, "uRotationY"), zoom: gl.getUniformLocation(wrapProgram, "uZoom"), aspect: gl.getUniformLocation(wrapProgram, "uAspect"),
      };
      gl.clearColor(.027, .031, .038, 1);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      const resize = () => {
        const dpr = Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.6);
        const width = Math.round(canvas.clientWidth * dpr), height = Math.round(canvas.clientHeight * dpr);
        if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; gl!.viewport(0, 0, width, height); }
      };
      const render = (milliseconds: number) => {
        if (disposed || !gl) return;
        resize();
        if (autoRotateRef.current && !draggingRef.current) rotationRef.current.y += .00072;
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        bindWrap();
        gl.depthMask(false);
        gl.uniform1f(wrapUniforms.time, milliseconds * .001);
        gl.uniform1f(wrapUniforms.rotationX, rotationRef.current.x);
        gl.uniform1f(wrapUniforms.rotationY, rotationRef.current.y);
        gl.uniform1f(wrapUniforms.zoom, zoomRef.current * (mobile ? .92 : 1));
        gl.uniform1f(wrapUniforms.aspect, canvas.width / canvas.height);
        gl.drawArrays(gl.TRIANGLES, 0, wrapScene.length / 7);
        gl.depthMask(true);
        bindParticles();
        gl.uniform1f(uniforms.time, milliseconds * .001);
        gl.uniform1f(uniforms.rotationX, rotationRef.current.x);
        gl.uniform1f(uniforms.rotationY, rotationRef.current.y);
        gl.uniform1f(uniforms.zoom, zoomRef.current * (mobile ? .92 : 1));
        gl.uniform1f(uniforms.aspect, canvas.width / canvas.height);
        gl.uniform1f(uniforms.dpr, Math.min(window.devicePixelRatio || 1, mobile ? 1.25 : 1.6));
        gl.drawArrays(gl.POINTS, 0, scene.length / FLOATS_PER_PARTICLE);
        animationFrame = requestAnimationFrame(render);
      };
      setReady(true);
      animationFrame = requestAnimationFrame(render);
    };
    start().catch(() => setReady(true));

    const pointerDown = (event: PointerEvent) => { draggingRef.current = true; pointerRef.current = { x: event.clientX, y: event.clientY }; canvas.setPointerCapture(event.pointerId); setHint(false); };
    const pointerMove = (event: PointerEvent) => {
      if (!draggingRef.current) return;
      rotationRef.current.y += (event.clientX - pointerRef.current.x) * .006;
      rotationRef.current.x = Math.max(-.85, Math.min(.5, rotationRef.current.x - (event.clientY - pointerRef.current.y) * .005));
      pointerRef.current = { x: event.clientX, y: event.clientY };
    };
    const pointerUp = () => { draggingRef.current = false; };
    const wheel = (event: WheelEvent) => { event.preventDefault(); zoomRef.current = Math.max(.68, Math.min(1.5, zoomRef.current * Math.exp(-event.deltaY * .001))); setHint(false); };
    canvas.addEventListener("pointerdown", pointerDown); canvas.addEventListener("pointermove", pointerMove); canvas.addEventListener("pointerup", pointerUp); canvas.addEventListener("pointercancel", pointerUp); canvas.addEventListener("wheel", wheel, { passive: false });
    return () => {
      disposed = true; cancelAnimationFrame(animationFrame);
      canvas.removeEventListener("pointerdown", pointerDown); canvas.removeEventListener("pointermove", pointerMove); canvas.removeEventListener("pointerup", pointerUp); canvas.removeEventListener("pointercancel", pointerUp); canvas.removeEventListener("wheel", wheel);
      gl?.getExtension("WEBGL_lose_context")?.loseContext();
    };
  }, []);

  const reset = () => { rotationRef.current = { x: -.34, y: -.08 }; zoomRef.current = 1; };
  return <main className={`experience ${ready ? "is-ready" : ""}`}>
    <canvas ref={canvasRef} className="rose-canvas" aria-label="可旋转的 GPU 粒子玫瑰花束" />
    <div className="scene-frame" aria-hidden="true" />
    <header className="topbar"><span className="brand"><span className="brand-mark">✦</span>PARTICLE BOUQUET</span><span className="edition">GPU PARTICLE STUDY · 2026</span></header>
    <div className={`gesture-hint ${hint ? "visible" : ""}`} aria-hidden="true"><span className="mouse-icon" />拖拽旋转 · 滚轮缩放</div>
    <nav className="controls" aria-label="画面控制"><button type="button" onClick={() => setAutoRotate(value => !value)}><span className={`status ${autoRotate ? "active" : ""}`} />{autoRotate ? "停止自转" : "继续自转"}</button><button type="button" onClick={reset}>重置视角</button></nav>
    <div className="loading" aria-live="polite">正在生成花束<span>···</span></div>
    <footer><span>68 INTERLOCKING ROSES · PLEATED PLASTIC WRAP · GPU RENDERED</span><span>MOVE TO DISCOVER</span></footer>
  </main>;
}
