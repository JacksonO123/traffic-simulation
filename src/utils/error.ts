import { Road } from '../engine/road';

export const laneRangeError = (range: number) =>
  new Error(`Invalid lane, expected lane in the range [ 0, ${range} ]`);

export const checkLaneBounds = (road: Road, lane: number) => {
  if (road.isTwoWay()) {
    if (lane >= road.getNumLanes() / 2 || lane < 0) throw laneRangeError(road.getNumLanes() / 2);
  } else {
    if (lane > road.getNumLanes() || lane < 0) throw laneRangeError(road.getNumLanes());
  }
};
