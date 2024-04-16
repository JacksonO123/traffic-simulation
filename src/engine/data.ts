import { Vector2, cloneBuf, easeInOutQuad, vec2 } from 'simulationjsv2';
import { Car, Road } from './road';
import { SP } from '../types/traffic';
import { minLaneChangeSteps } from '../constants';
import { checkLaneBounds } from '../utils/error';

export class RoadData {
  private startPoint: SP;
  private lane: number;
  private loop: boolean;

  private route: Road[];
  private roadIndex: number;

  private roadPoints: Vector2[];
  private roadPointIndex: number;

  private canChangeLane: boolean;
  private changingLanes: boolean;
  private laneChangePoints: Vector2[];
  private laneChangeIndex: number;

  constructor(lane: number, startPoint: SP, loop = false, canChangeLane = true) {
    this.startPoint = startPoint;
    this.lane = lane;
    this.loop = loop;

    this.route = [];
    this.roadIndex = 0;

    this.roadPoints = [];
    this.roadPointIndex = 0;

    this.canChangeLane = canChangeLane;
    this.changingLanes = false;
    this.laneChangePoints = [];
    this.laneChangeIndex = 0;
  }

  getLane() {
    return this.lane;
  }

  isChangingLanes() {
    return this.changingLanes;
  }

  getCurrentRoad() {
    return this.route[this.roadIndex];
  }

  getCurrentPoint() {
    if (this.changingLanes) {
      return this.laneChangePoints[this.laneChangeIndex];
    }

    return this.roadPoints[this.roadPointIndex];
  }

  private isStartPoint() {
    return this.startPoint === SP.START;
  }

  getLookAtPoint() {
    const isStart = this.isStartPoint();

    if (this.changingLanes) {
      if (isStart) {
        if (this.laneChangeIndex < this.laneChangePoints.length - 1) {
          return this.laneChangePoints[this.laneChangeIndex + 1];
        }
      } else {
        return this.laneChangePoints[Math.max(this.laneChangeIndex - 1, 0)];
      }

      return this.laneChangePoints[this.laneChangeIndex];
    }

    if (isStart) {
      if (this.roadPointIndex < this.roadPoints.length - 1) {
        return this.roadPoints[this.roadPointIndex + 1];
      }
    } else {
      return this.roadPoints[Math.max(this.roadPointIndex - 1, 0)];
    }

    return this.getCurrentPoint();
  }

  private resetLaneChange(changing: boolean) {
    this.changingLanes = changing;
    this.laneChangePoints = [];
    this.laneChangeIndex = 0;
  }

  private interpolateLaneChange(numPoints: number, fromLane: number, toLane: number) {
    const res: Vector2[] = [];

    const laneFromPoints = this.getCurrentRoad().getRoadPoints(fromLane);
    const laneToPoints = this.getCurrentRoad().getRoadPoints(toLane);

    for (let i = 0; i < numPoints; i++) {
      const index = i + this.roadPointIndex;
      const ratio = easeInOutQuad(i / numPoints);

      const fromPoints = laneFromPoints[index];

      if (fromPoints === undefined) continue;

      const vec = cloneBuf(laneToPoints[index]);
      vec2.sub(vec, fromPoints, vec);
      vec2.scale(vec, ratio, vec);
      vec2.add(vec, fromPoints, vec);

      res.push(vec);
    }

    return res;
  }

  setLane(lane: number, currentSpeed: number) {
    if (!this.canChangeLane) return;

    const road = this.getCurrentRoad();

    checkLaneBounds(road, lane);

    this.roadPoints = road.getRoadPoints(this.getAbsoluteLane(lane));

    const laneDist = Math.max(minLaneChangeSteps, 150 * Math.log(currentSpeed));

    this.resetLaneChange(true);
    this.laneChangePoints = this.interpolateLaneChange(
      laneDist,
      this.getAbsoluteLane(),
      this.getAbsoluteLane(lane)
    );

    this.lane = this.getAbsoluteLane(lane);
  }

  private getAbsoluteLane(lane?: number) {
    if (this.route.length === 0) return this.lane;

    const road = this.getCurrentRoad();

    let relativeLane = this.lane;

    if (lane !== undefined) {
      checkLaneBounds(road, lane);
      relativeLane = lane;
    }

    if (road.isTwoWay() && this.isStartPoint()) {
      return road.getNumLanes() - 1 - relativeLane;
    }

    return relativeLane;
  }

  private routeUpdated() {
    const road = this.getCurrentRoad();

    if (this.isStartPoint()) {
      this.roadIndex = 0;
      this.roadPointIndex = 0;
      this.roadPoints = road.getRoadPoints(this.getAbsoluteLane());
    } else {
      this.roadIndex = this.route.length - 1;
      this.roadPoints = road.getRoadPoints(this.getAbsoluteLane());
      this.roadPointIndex = this.roadPoints.length - 1;
    }
  }

  setRoute(route: Road[]) {
    if (route.length > 0) {
      checkLaneBounds(route[0], this.lane);
    }

    this.route = route;
    this.routeUpdated();
  }

  addToRoute(road: Road) {
    const isStart = this.isStartPoint();

    if (this.route.length === 0) {
      checkLaneBounds(road, this.lane);
    }

    if (isStart) {
      this.route.push(road);
    } else {
      this.route.unshift(road);
    }

    if (this.route.length === 1) {
      this.routeUpdated();
    }
  }

  /**
   * @param num - value from 0 to 1 for where the car should start on the road
   */
  startAt(num: number) {
    const index = Math.floor(this.roadPoints.length * num);

    this.roadPointIndex = index;
  }

  atLastPoint() {
    const isStart = this.isStartPoint();

    if (isStart) {
      if (this.roadPointIndex === this.roadPoints.length - 1) {
        return true;
      }
    } else {
      if (this.roadPointIndex === 0) {
        return true;
      }
    }

    return false;
  }

  nextPoint() {
    const isStart = this.isStartPoint();
    const road = this.getCurrentRoad();
    const lane = this.getAbsoluteLane();

    if (this.changingLanes) {
      this.laneChangeIndex++;

      if (this.laneChangeIndex >= this.laneChangePoints.length) {
        this.resetLaneChange(false);
      }
    }

    if (this.roadPointIndex >= this.roadPoints.length) {
      if (isStart) {
        if (this.roadIndex < this.route.length - 1) {
          this.roadIndex++;

          this.roadPointIndex = 0;
          this.roadPoints = road.getRoadPoints(lane);
        } else if (this.loop) {
          this.roadIndex = 0;

          this.roadPointIndex = 0;
          this.roadPoints = road.getRoadPoints(lane);
        }
      } else {
        if (this.roadIndex > 0) {
          this.roadIndex--;

          this.roadPoints = road.getRoadPoints(lane);
          this.roadPointIndex = this.roadPoints.length - 1;
        } else if (this.loop) {
          this.roadIndex = this.route.length - 1;

          this.roadPoints = road.getRoadPoints(lane);
          this.roadPointIndex = this.roadPoints.length - 1;
        }
      }

      return;
    }

    if (isStart) {
      this.roadPointIndex++;
    } else {
      if (this.roadPointIndex > 0) {
        this.roadPointIndex--;
      }
    }
  }
}

export class StepContext {
  private obstaclesAhead: Car[];

  constructor() {
    this.obstaclesAhead = [];
  }

  setObstaclesAhead(obstacles: Car[]) {
    this.obstaclesAhead = obstacles;
  }

  getObstaclesAhead() {
    return this.obstaclesAhead;
  }
}
