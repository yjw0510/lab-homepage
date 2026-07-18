export type Vec3 = [number, number, number];

export function subtractVec3(a: number[], b: number[]): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

export function dotVec3(a: number[], b: number[]): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function lengthVec3(a: number[]): number {
  return Math.hypot(a[0], a[1], a[2]);
}

export function normalizeVec3(a: number[]): Vec3 {
  const length = lengthVec3(a) || 1;
  return [a[0] / length, a[1] / length, a[2] / length];
}

export function scaleVec3(a: number[], scalar: number): Vec3 {
  return [a[0] * scalar, a[1] * scalar, a[2] * scalar];
}

export function addVec3(a: number[], b: number[]): Vec3 {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

export function crossVec3(a: number[], b: number[]): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
}
