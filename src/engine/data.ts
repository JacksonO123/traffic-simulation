import { Vector2, cloneBuf, easeInOutQuad, vec2 } from 'simulationjsv2';
import { Intersection, Road, TurnLane } from './road';
import { Obstacle, SP } from '../types/traffic';
import { minLaneChangeSteps } from './constants';
import { checkLaneBounds } from '../utils/error';

class IntersectionState {
  private turnRoad: Road | null;

  constructor() {
    this.turnRoad = null;
  }

  getTurnRoad() {
    return this.turnRoad;
  }

  setTurnRoad(road: Road) {
    this.turnRoad = road;
  }

  clearIntersection() {
    this.turnRoad = null;
  }
}

export class RoadData {
  private startPoint: SP;
  private lane: number;
  private loop: boolean;

  private route: Road[];
  private roadIndex: number;

  private roadPoints: Vector2[];
  private roadPointIndex: number;

  private intersectionState: IntersectionState;
  private hasStopped: boolean;

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

    this.intersectionState = new IntersectionState();
    this.hasStopped = false;

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

  getTargetLane() {
    if (this.isChangingLanes()) return this.lane;

    const isStart = this.isStartPoint();
    const nextRoad = this.route[this.roadIndex + (isStart ? 1 : -1)];

    if (nextRoad instanceof Intersection) {
      const afterRoad = this.route[this.roadIndex + (isStart ? 2 : -2)];
      const path = nextRoad.getPath(this.getCurrentRoad(), afterRoad);

      if (path && path instanceof TurnLane) {
        let toLane = path.getLane();
        const diff = Math.abs(this.lane - toLane);

        if (diff > 1) {
          if (toLane > this.lane) toLane = this.lane + 1;
          else toLane = this.lane - 1;
        }

        return toLane;
      }
    }

    return this.lane;
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

  isStartPoint() {
    return this.startPoint === SP.START;
  }

  getStartPoint() {
    return this.startPoint;
  }

  getStopped() {
    return this.hasStopped;
  }

  setStopped(stopped: boolean) {
    this.hasStopped = stopped;
  }

  getCurrentSpline() {
    const road = this.getCurrentRoad();

    if (road instanceof Intersection) {
      return this.intersectionState.getTurnRoad()!.getSpline();
    }

    return road.getSpline();
  }

  getLookAtPoint() {
    const isStart = this.isStartPoint();

    if (this.changingLanes) {
      if (this.laneChangeIndex < this.laneChangePoints.length - 1) {
        return this.laneChangePoints[this.laneChangeIndex + 1];
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
    const isStart = this.isStartPoint();

    const res: Vector2[] = [];

    // TODO getLanePoints (maybe)
    const laneFromPoints = this.getCurrentRoad().getRoadPoints(fromLane);
    const laneToPoints = this.getCurrentRoad().getRoadPoints(toLane);

    for (let i = 0; i < numPoints; i++) {
      const index = isStart ? i + this.roadPointIndex : this.roadPointIndex - i;
      const ratio = easeInOutQuad(i / numPoints);

      const fromPoint = laneFromPoints[index];

      if (fromPoint === undefined) continue;

      const vec = cloneBuf(laneToPoints[index]);
      vec2.sub(vec, fromPoint, vec);
      vec2.scale(vec, ratio, vec);
      vec2.add(vec, fromPoint, vec);

      res.push(vec);
    }

    return res;
  }

  setLane(lane: number, dist: number) {
    if (!this.canChangeLane) return;

    const road = this.getCurrentRoad();

    checkLaneBounds(road, lane);

    this.roadPoints = this.getLanePoints(road, this.getAbsoluteLane(lane));

    const distScale = 1.15;
    const laneDist = Math.floor(Math.max(minLaneChangeSteps, dist * distScale));

    this.resetLaneChange(true);
    this.laneChangePoints = this.interpolateLaneChange(
      laneDist,
      this.getAbsoluteLane(),
      this.getAbsoluteLane(lane)
    );

    this.lane = this.getAbsoluteLane(lane);
  }

  getAbsoluteLane(lane?: number) {
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
    const isStart = this.isStartPoint();

    if (isStart) {
      this.roadIndex = 0;
      this.roadPointIndex = 0;
      this.roadPoints = this.getLanePoints(this.getCurrentRoad(), this.getAbsoluteLane());
    } else {
      this.roadIndex = this.route.length - 1;
      this.roadPoints = this.getLanePoints(this.getCurrentRoad(), this.getAbsoluteLane());
      this.roadPointIndex = this.roadPoints.length - 1;
    }
  }

  getRoute() {
    return this.route;
  }

  getRoadIndex() {
    return this.roadIndex;
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
      if (this.roadIndex === this.route.length - 1 && this.roadPointIndex === this.roadPoints.length - 1) {
        return true;
      }
    } else {
      if (this.roadIndex === 0 && this.roadPointIndex === 0) {
        return true;
      }
    }

    return false;
  }

  private getLanePoints(road: Road, lane: number) {
    if (road instanceof Intersection) {
      const isStart = this.isStartPoint();

      const prevRoad = this.route[this.roadIndex - 1];
      const nextRoad = this.route[this.roadIndex + 1];
      const pathRoad = isStart ? road.getPath(prevRoad, nextRoad) : road.getPath(nextRoad, prevRoad);

      if (pathRoad) {
        this.intersectionState.setTurnRoad(pathRoad);

        const res =
          pathRoad instanceof TurnLane ? pathRoad.getRoadPoints(0, isStart) : pathRoad.getRoadPoints(0);

        return res;
      }

      return [];
    }

    this.intersectionState.clearIntersection();

    return road.getRoadPoints(lane);
  }

  getIntersectionState() {
    return this.intersectionState;
  }

  nextPoint() {
    const isStart = this.isStartPoint();
    const lane = this.getAbsoluteLane();

    if (this.changingLanes) {
      this.laneChangeIndex++;

      if (this.laneChangeIndex >= this.laneChangePoints.length) {
        this.resetLaneChange(false);
      }
    }

    if (
      (isStart && this.roadPointIndex >= this.roadPoints.length - 1) ||
      (!isStart && this.roadPointIndex === 0)
    ) {
      if (isStart) {
        if (this.roadIndex < this.route.length - 1) {
          this.roadIndex++;

          this.roadPointIndex = 0;
          this.roadPoints = this.getLanePoints(this.getCurrentRoad(), lane);
        } else if (this.loop) {
          this.roadIndex = 0;

          this.roadPointIndex = 0;
          this.roadPoints = this.getLanePoints(this.getCurrentRoad(), lane);
        }
      } else {
        if (this.roadIndex > 0) {
          this.roadIndex--;

          this.roadPoints = this.getLanePoints(this.getCurrentRoad(), lane);
          this.roadPointIndex = this.roadPoints.length - 1;
        } else if (this.loop) {
          this.roadIndex = this.route.length - 1;

          this.roadPoints = this.getLanePoints(this.getCurrentRoad(), lane);
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
  private obstaclesAhead: Obstacle[];

  constructor() {
    this.obstaclesAhead = [];
  }

  setObstaclesAhead(obstacles: Obstacle[]) {
    this.obstaclesAhead = obstacles;
  }

  getObstaclesAhead() {
    return this.obstaclesAhead;
  }
}
