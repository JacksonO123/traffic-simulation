import { Car } from '../engine/road';

export type StartingPoint = 'start' | 'end';

export type StepContext = {
  carsInFront: Car[];
};
