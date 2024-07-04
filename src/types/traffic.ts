import { Vector2 } from 'simulationjsv2';
import { Car, Road } from '../engine/road';

export enum SP {
  START,
  END
}

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
  point: Vector2;
  speed: number;
  isIntersection: boolean;
};

export type LaneObstacle = {
  obstacle: Car;
  behind: boolean;
};
