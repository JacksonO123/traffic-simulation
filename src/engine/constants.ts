import { colorf } from 'simulationjsv2';

export const dprScale = 2 / devicePixelRatio;
export const idprScale = 1 / dprScale;
export const fps60Delay = 1000 / 60;

export const laneGap = 8;

export const carWidth = 50;
export const carHeight = 25;

// minimum distance needed for car to stop at a point
export const minStopDistance = (carWidth / 2) * devicePixelRatio;
// used when scaling stop distance with speed ratio
export const followDistScale = 5;

export const laneChangeStartDist = 200 * devicePixelRatio;
export const minLaneChangeSteps = 120;
export const maxLaneChangeSteps = 300;
const laneChangeX = carWidth;
const laneChangeY = carHeight + laneGap;
export const laneChangeMinDist =
  Math.sqrt(laneChangeX * laneChangeX + laneChangeY * laneChangeY) * dprScale * 2;
export const laneChangeMinFrontDist = laneChangeMinDist * 2;
// distance from intersection when cars cannot change lanes
export const minIntersectionDist = 300;

// at what angle should the car speed up or slow down
// for changing lanes when another car is in the target lane
export const speedUpCutoffRotation = Math.PI / 4;
export const mergeSlowDownScale = 0.5;
export const mergeSpeedUpScale = 1.25;

export const laneColor = colorf(75);

export const intersectionRegisterDist = 125;
