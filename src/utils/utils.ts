import {
  Circle,
  Vector2,
  Vector2m,
  cloneBuf,
  color,
  distance2d,
  vec2,
  vector2,
  vector2FromVector3
} from 'simulationjsv2';
import { EndpointDistances, Origin } from '../types/traffic';
import { Intersection, Road, TurnLane } from '../engine/road';

// remove when lib fixes angle function on vec2/vec3
export const vec2Angle = (a: Vector2m, b: Vector2m) => {
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

export const getEndpointDistances = (road1: Road, road2: Road): EndpointDistances => {
  const road1Spline = road1.getSpline();
  const road2Spline = road2.getSpline();
  const road1Pos = vector2FromVector3(road1Spline.getPos());
  const road2Pos = vector2FromVector3(road2Spline.getPos());

  let road1Start: Vector2;
  let road1End: Vector2;

  if (road1 instanceof TurnLane) {
    const roadPoints = road1.getRoadPoints(0);
    road1Start = cloneBuf(roadPoints[0]);
    road1End = cloneBuf(roadPoints[roadPoints.length - 1]);
  } else {
    road1Start = road1Spline.interpolate(0);
    road1End = road1Spline.interpolate(1);
  }
  vec2.add(road1Pos, road1Start, road1Start);
  vec2.add(road1Pos, road1End, road1End);

  let road2Start: Vector2;
  let road2End: Vector2;

  if (road2 instanceof TurnLane) {
    const roadPoints = road2.getRoadPoints(0);
    road2Start = cloneBuf(roadPoints[0]);
    road2End = cloneBuf(roadPoints[roadPoints.length - 1]);
  } else {
    road2Start = road2Spline.interpolate(0);
    road2End = road2Spline.interpolate(1);
  }
  vec2.add(road2Pos, road2Start, road2Start);
  vec2.add(road2Pos, road2End, road2End);

  const circ1 = new Circle(road1Start, 4, color(0, 255));
  const circ2 = new Circle(road1End, 4, color(0, 255));
  const circ3 = new Circle(road2Start, 4, color(255, 120, 255));
  const circ4 = new Circle(road2End, 4, color(255, 120, 255));
  window.canvas.add(circ1);
  window.canvas.add(circ2);
  window.canvas.add(circ3);
  window.canvas.add(circ4);

  const endStartDist = distance2d(road1End, road2Start);
  const startEndDist = distance2d(road1Start, road2End);
  const endEndDist = distance2d(road1End, road2End);
  const startStartDist = distance2d(road1Start, road2Start);

  return {
    startEndDist: startEndDist,
    endStartDist: endStartDist,
    startStartDist: startStartDist,
    endEndDist: endEndDist
  };
};

export const computeClosestEndpoints = (
  dist1: number,
  dist2: number,
  min: number,
  origins: Origin[],
  res1: Origin,
  res2: Origin
): [number, Origin[]] => {
  if (dist1 >= min && dist2 >= min) {
    return [min, origins];
  }

  const opRes1: Origin = res1 === 'start' ? 'end' : 'start';
  const opRes2: Origin = res2 === 'start' ? 'end' : 'start';

  if (dist1 <= dist2) {
    return [min < dist1 ? min : dist1, [res1, res2]];
  } else {
    return [min < dist2 ? min : dist2, [opRes1, opRes2]];
  }
};

export const inferRoadOrigins = (route: Road[], current: number): Origin[] => {
  let origins: Origin[] = [];

  let road1 = route[current];
  let road2 = route[current + 1];

  if (road1 instanceof Intersection) {
    if (current === 0) {
      throw new Error('Cannot start path on intersection');
    }

    const turnLane = road1.getPath(route[current - 1], road2);
    if (turnLane === null) {
      throw new Error(
        'No valid connection between roads [${current - 1} and ${current + 1}] on intersection'
      );
    }

    road1 = turnLane.road;
    road1.getSpline().fill(color(255));
  }

  if (road2 instanceof Intersection) {
    if (current + 2 >= route.length) {
      throw new Error('Route does not contain exit from intersection');
    }

    const turnLane = road2.getPath(route[current], route[current + 2]);
    if (turnLane === null) {
      throw new Error('No valid connection between roads [${current} and ${current + 2}] on intersection');
    }

    road2 = turnLane.road;
  }

  const distances = getEndpointDistances(road1, road2);
  let min = Infinity;

  [min, origins] = computeClosestEndpoints(
    distances.endStartDist,
    distances.startEndDist,
    min,
    origins,
    'start',
    'start'
  );
  [min, origins] = computeClosestEndpoints(
    distances.endEndDist,
    distances.startStartDist,
    min,
    origins,
    'start',
    'end'
  );

  return origins;
};
