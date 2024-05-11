import { colorf } from 'simulationjsv2';

export const dprScale = 2 / devicePixelRatio;
export const idprScale = 1 / dprScale;
export const fps60Delay = 1000 / 60;

export const laneGap = 8;

export const carWidth = 50;
export const carHeight = 25;

// minimum distance needed for car to stop at a point
export const minStopDistance = (carWidth / 2) * devicePixelRatio;

export const laneChangeStartDist = 150 * devicePixelRatio;
export const minLaneChangeSteps = 200;
export const maxLaneChangeSteps = 400;
const laneChangeX = carWidth;
const laneChangeY = carHeight + laneGap;
export const laneChangeMinDist =
  (2 * Math.sqrt(laneChangeX * laneChangeX + laneChangeY * laneChangeY)) / dprScale;
export const laneChangeMinFrontDist = laneChangeMinDist * 3;
// distance from intersection when cars cannot change lanes
export const minIntersectionDist = 300;

// at what angle should the car speed up or slow down
// for changing lanes when another car is in the target lane
export const speedUpCutoffRotation = Math.PI / 3;
export const mergeSlowDownScale = 0.8;
export const mergeSpeedUpScale = 1.2;

export const laneColor = colorf(75);
