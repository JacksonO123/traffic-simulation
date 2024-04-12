export const carWidth = 50;
export const carHeight = 25;

export const brakeCapacity = 1;

const rawStopDistance = 35 * devicePixelRatio;
const rawBreakingDistance = 200 * devicePixelRatio;

export const brakingDistance = rawBreakingDistance + carWidth * devicePixelRatio;
export const stopDistance = rawStopDistance + carWidth * devicePixelRatio;

export const laneChangeAcceleration = 0.02;
export const acceleration = 0.1;

export const minLaneChangeSteps = 150;

export const minSpeed = 0.0002;
export const idleSpeed = 1.5;

export const fps60Delay = 1000 / 60;
