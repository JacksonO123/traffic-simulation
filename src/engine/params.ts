import { carWidth } from './constants';

export const brakeCapacity = 0.04;

const rawStopDistance = 35;
const rawBreakingDistance = 120;

export const brakingDistance = rawBreakingDistance + carWidth;
export const stopDistance = rawStopDistance + carWidth;

export const laneChangeAcceleration = 0.02;
export const laneChangeSpeedScale = 1.25;
export const acceleration = 0.005;
export const minSpeed = 0.02;
export const idleSpeed = 1.5;
export const intersectionTurnSpeed = 4;
