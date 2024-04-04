import { Car } from '../utils/road';

export type StartingPoint = 'start' | 'end';

export type StepContext = {
  nearbyCars: Car[];
};
