import { Vector2, distance2d, vec2 } from 'simulationjsv2';

// remove when lib fixes angle function on vec2/vec3
export const vec2Angle = (a: Vector2, b: Vector2) => {
  const ax = a[0];
  const ay = a[1];
  const bx = b[0];
  const by = b[1];
  const mag1 = Math.sqrt(ax * ax + ay * ay);
  const mag2 = Math.sqrt(bx * bx + by * by);
  const mag = mag1 * mag2;
  const cosine = mag && vec2.dot(a, b) / mag;
  return Math.acos(cosine);
};

export const closestRoadPoint = (roadPoints: Vector2[], pos: Vector2) => {
  let point: Vector2 | null = null;
  let dist = Infinity;

  for (let i = 0; i < roadPoints.length; i++) {
    const newDist = distance2d(roadPoints[i], pos);
    if (newDist < dist) {
      dist = newDist;
      point = roadPoints[i];
    }
  }

  return point;
};

export const splineDistPoint = (roadPoints: Vector2[], from: Vector2, to: Vector2) => {
  let counting = false;
  let dist = 0;

  for (let i = 0; i < roadPoints.length - 1; i++) {
    if (roadPoints[i] === from || roadPoints[i] === to) counting = true;

    if (counting) {
      dist += distance2d(roadPoints[i], roadPoints[i + 1]);
    }
  }

  return dist;
};

export const getStartRoadPoint = (points: Vector2[]) => points[0];

export const getEndRoadPoint = (points: Vector2[]) => points[points.length - 1];
