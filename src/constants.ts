export const carWidth = 50;
export const carHeight = 25;

export const brakeCapacity = 1;

const rawStopDistance = 35 * devicePixelRatio;
const rawBreakingDistance = 200 * devicePixelRatio;

export const brakingDistance = rawBreakingDistance + carWidth * devicePixelRatio;
export const stopDistance = rawStopDistance + carWidth * devicePixelRatio;

export const acceleration = 0.05;

export const laneChangeSteps = 200 * devicePixelRatio;
