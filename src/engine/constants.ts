import { colorf } from 'simulationjsv2';

export const fps60Delay = 1000 / 60;

export const laneGap = 16;

export const carWidth = 100;
export const carHeight = 50;

// minimum distance needed for car to stop at a point
export const minStopDistance = carWidth / 2;
// used when scaling stop distance with speed ratio
export const followDistScale = 5;

export const laneChangeStartDist = 400;
export const minLaneChangeSteps = 120;
export const maxLaneChangeSteps = 300;
const laneChangeX = carWidth;
const laneChangeY = carHeight + laneGap;
export const laneChangeMinDist =
  Math.sqrt(laneChangeX * laneChangeX + laneChangeY * laneChangeY) / (2 * devicePixelRatio);
export const laneChangeMinFrontDist = laneChangeMinDist * 2;
// distance from intersection when cars cannot change lanes
export const minIntersectionDist = 300;

// at what angle should the car speed up or slow down
// for changing lanes when another car is in the target lane
export const speedUpCutoffRotation = Math.PI / 4;
export const mergeSlowDownScale = 0.6;
export const mergeSpeedUpScale = 1.25;

export const laneColor = colorf(75);

export const intersectionRegisterDist = 125;
