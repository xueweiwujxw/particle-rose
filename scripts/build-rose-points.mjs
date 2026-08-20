import { readFileSync, writeFileSync } from "node:fs";

const source = readFileSync(new URL("../source-assets/rose-source.obj", import.meta.url), "utf8");
const vertices = [];
const faces = [];
let objectName = "";

for (const line of source.split(/\r?\n/)) {
  if (line.startsWith("o ")) objectName = line.slice(2).trim();
  else if (line.startsWith("v ")) {
    const [, x, y, z] = line.trim().split(/\s+/);
    vertices.push([Number(x), Number(y), Number(z)]);
  } else if (objectName === "rose" && line.startsWith("f ")) {
    const indices = line.trim().slice(2).split(/\s+/).map((entry) => Number(entry.split("/")[0]) - 1);
    for (let i = 1; i < indices.length - 1; i++) faces.push([indices[0], indices[i], indices[i + 1]]);
  }
}

const triangles = [];
let totalArea = 0;
let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
for (const [ia, ib, ic] of faces) {
  const a = vertices[ia], b = vertices[ib], c = vertices[ic];
  const ab = [b[0]-a[0], b[1]-a[1], b[2]-a[2]];
  const ac = [c[0]-a[0], c[1]-a[1], c[2]-a[2]];
  const nx = ab[1]*ac[2]-ab[2]*ac[1], ny = ab[2]*ac[0]-ab[0]*ac[2], nz = ab[0]*ac[1]-ab[1]*ac[0];
  const normalLength = Math.hypot(nx, ny, nz);
  const area = normalLength * 0.5;
  if (area < 1e-8) continue;
  totalArea += area;
  triangles.push({ a, b, c, nx:nx/normalLength, ny:ny/normalLength, nz:nz/normalLength, cumulative:totalArea });
  for (const v of [a,b,c]) { minX=Math.min(minX,v[0]); minY=Math.min(minY,v[1]); minZ=Math.min(minZ,v[2]); maxX=Math.max(maxX,v[0]); maxY=Math.max(maxY,v[1]); maxZ=Math.max(maxZ,v[2]); }
}

let seed = 20260819;
const random = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let v = Math.imul(seed ^ (seed >>> 15), 1 | seed); v = (v + Math.imul(v ^ (v >>> 7), 61 | v)) ^ v; return ((v ^ (v >>> 14)) >>> 0) / 4294967296; };
const normalRandom = () => Math.sqrt(-2*Math.log(Math.max(1e-7,random()))) * Math.cos(TAU*random());
const TAU = Math.PI * 2;
const count = 30000;
const data = new Float32Array(count * 3);
const center = [(minX+maxX)/2, (minY+maxY)/2, (minZ+maxZ)/2];
const scale = 248 / Math.max(maxX-minX, maxY-minY, maxZ-minZ);

for (let i = 0; i < count; i++) {
  const target = random() * totalArea;
  let low = 0, high = triangles.length - 1;
  while (low < high) { const mid = (low + high) >> 1; if (triangles[mid].cumulative < target) low = mid + 1; else high = mid; }
  const t = triangles[low];
  let u = random(), v = random();
  if (u + v > 1) { u = 1-u; v = 1-v; }
  const w = 1-u-v;
  const haze = random() < 0.34 ? normalRandom() * (1.3 + random()*2.7) : normalRandom() * 0.28;
  data[i*3] = ((t.a[0]*w+t.b[0]*u+t.c[0]*v-center[0]) + t.nx*haze) * scale;
  data[i*3+1] = ((t.a[1]*w+t.b[1]*u+t.c[1]*v-center[1]) + t.ny*haze) * scale;
  data[i*3+2] = ((t.a[2]*w+t.b[2]*u+t.c[2]*v-center[2]) + t.nz*haze) * scale;
}

const output = Buffer.allocUnsafe(4 + data.byteLength);
output.writeUInt32LE(count, 0);
Buffer.from(data.buffer).copy(output, 4);
writeFileSync(new URL("../public/rose-points.bin", import.meta.url), output);
console.log(`wrote ${count} rose particles from ${triangles.length} triangles`);
