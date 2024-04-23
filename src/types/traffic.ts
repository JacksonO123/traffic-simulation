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
