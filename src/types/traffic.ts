import { Vector2, Vector3 } from 'simulationjsv2';
import { Car, Road } from '../engine/road';

export type Origin = 'start' | 'end';

export enum ContinueState {
  CONTINUE,
  NO_PATH
}

export type ContinueData = {
  point: Vector2;
  path: Vector2[];
};

export type IntersectionTurn = {
  from: number;
  to: number;
  road: Road;
};

export type Obstacle = {
  point: Vector2 | Vector3;
  speed: number;
  isIntersection: boolean;
};

export type LaneObstacle = {
  obstacle: Car;
  behind: boolean;
};

export type EndpointDistances = {
  endStartDist: number;
  startEndDist: number;
  startStartDist: number;
  endEndDist: number;
};
