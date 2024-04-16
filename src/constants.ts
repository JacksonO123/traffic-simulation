export const dprScale = 2 / devicePixelRatio;
export const idprScale = 1 / dprScale;

export const laneGap = 8;

export const carWidth = 50;
export const carHeight = 25;

export const brakeCapacity = 1;

const rawStopDistance = 35 * devicePixelRatio;
const rawBreakingDistance = 200 * devicePixelRatio;

export const brakingDistance = rawBreakingDistance + carWidth * devicePixelRatio;
export const stopDistance = rawStopDistance + carWidth * devicePixelRatio;

export const laneChangeAcceleration = 0.02;
export const acceleration = 0.1;

export const laneChangeStartDist = 125 * devicePixelRatio;
export const minLaneChangeSteps = 200;
const laneChangeX = carWidth;
const laneChangeY = carHeight + laneGap;
export const laneChangeMinDist =
  (2 * Math.sqrt(laneChangeX * laneChangeX + laneChangeY * laneChangeY)) / dprScale;
export const laneChangeMinFrontDist = laneChangeMinDist * 3;

export const minSpeed = 0.0002;
export const idleSpeed = 1.5;

export const fps60Delay = 1000 / 60;
