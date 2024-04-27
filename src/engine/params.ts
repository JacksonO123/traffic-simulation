import { carWidth } from './constants';

export const brakeCapacity = 1;

const rawStopDistance = 35 * devicePixelRatio;
const rawBreakingDistance = 200 * devicePixelRatio;

export const brakingDistance = rawBreakingDistance + carWidth * devicePixelRatio;
export const stopDistance = rawStopDistance + carWidth * devicePixelRatio;

export const laneChangeAcceleration = 0.02;
export const maxLaneChangeSpeed = 10;
export const acceleration = 0.1;
export const minSpeed = 0.02;
export const idleSpeed = 1.5;
