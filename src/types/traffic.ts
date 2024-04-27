import { Vector2 } from 'simulationjsv2';
import { Road } from '../engine/road';

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
