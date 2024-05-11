import { Vector2, vec2 } from 'simulationjsv2';

// remove when lib fixes angle function on vec2/vec3
export function vec2Angle(a: Vector2, b: Vector2) {
  const ax = a[0];
  const ay = a[1];
  const bx = b[0];
  const by = b[1];
  const mag1 = Math.sqrt(ax * ax + ay * ay);
  const mag2 = Math.sqrt(bx * bx + by * by);
  const mag = mag1 * mag2;
  const cosine = mag && vec2.dot(a, b) / mag;
  return Math.acos(cosine);
}
