import { carWidth } from './constants';

export const brakeCapacity = 0.04;

const rawStopDistance = 35 * devicePixelRatio;
const rawBreakingDistance = 120 * devicePixelRatio;

export const brakingDistance = rawBreakingDistance + carWidth * devicePixelRatio;
export const stopDistance = rawStopDistance + carWidth * devicePixelRatio;

export const laneChangeAcceleration = 0.02;
export const laneChangeSpeedScale = 1.25;
export const acceleration = 0.005 * devicePixelRatio;
export const minSpeed = 0.02;
export const idleSpeed = 1.5;
export const intersectionTurnSpeed = 4;
