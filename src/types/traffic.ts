import { Car } from '../engine/road';

export enum SP {
  START,
  END
}

export type StepContext = {
  carsInFront: Car[];
};
