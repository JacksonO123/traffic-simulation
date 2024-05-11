import { Vector2 } from 'simulationjsv2';
import { Car, Road } from '../engine/road';

export enum SP {
  START,
  END
}

export type IntersectionTurn = {
  from: number;
  to: number;
  road: Road;
};

export type Obstacle = {
  point: Vector2;
  isIntersection: boolean;
};

export type LaneObstacle = {
  obstacle: Car;
  behind: boolean;
};
