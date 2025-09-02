import { Vector2, cloneBuf, easeInOutQuad, vec2 } from 'simulationjsv2';
import { Car, Intersection, Road, TurnLane } from './road';
import { LaneObstacle, Obstacle, Origin } from '../types/traffic';
import { minLaneChangeSteps } from './constants';
import { checkLaneBounds } from '../utils/error';
import { inferRoadOrigins } from '../utils/utils';

class IntersectionState {
  private turnRoad: Road | null;
  private stopped: boolean;

  constructor() {
    this.turnRoad = null;
    this.stopped = false;
  }

  setHasStopped(stopped: boolean) {
    this.stopped = stopped;
  }

  hasStopped() {
    return this.stopped;
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
  private car: Car;
  private lane: number;
  private loop: boolean;

  private origins: Origin[];
  private route: Road[];
  private roadIndex: number;

  private roadPoints: Vector2[];
  private roadPointIndex: number;

  private intersectionState: IntersectionState;

  private canChangeLane: boolean;
  private changingFrom: number; // < 0 means not changing
  private laneChangePoints: Vector2[];
  private laneChangeIndex: number;

  constructor(car: Car, lane: number, loop = false, canChangeLane = true) {
    this.car = car;
    this.lane = lane;
    this.loop = loop;

    this.origins = [];
    this.route = [];
    this.roadIndex = 0;

    this.roadPoints = [];
    this.roadPointIndex = 0;

    this.intersectionState = new IntersectionState();

    this.canChangeLane = canChangeLane;
    this.changingFrom = -1;
    this.laneChangePoints = [];
    this.laneChangeIndex = 0;
  }

  getLane() {
    return this.lane;
  }

  isChangingLanes() {
    return this.changingFrom >= 0;
  }

  getChangingFrom() {
    return this.changingFrom;
  }

  /**
   * returns -1 if no target lane
   */
  getTargetLane() {
    if (this.isChangingLanes()) return this.lane;

    const nextRoad = this.route[this.roadIndex + 1];

    if (nextRoad instanceof Intersection) {
      const afterRoad = this.route[this.roadIndex + 2];
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

    return -1;
  }

  getStopped() {
    return this.intersectionState.hasStopped();
  }

  setHasStopped() {
    this.intersectionState.setHasStopped(true);
  }

  inIntersection() {
    const road = this.getCurrentRoad();
    return road instanceof Intersection;
  }

  getCurrentRoad() {
    return this.route[this.roadIndex];
  }

  getCurrentPoint() {
    if (this.isChangingLanes()) {
      return this.laneChangePoints[this.laneChangeIndex];
    }

    return this.roadPoints[this.roadPointIndex];
  }

  getCurrentSpline() {
    const road = this.getCurrentRoad();

    if (road instanceof Intersection) {
      return this.intersectionState.getTurnRoad()!.getSpline();
    }

    return road.getSpline();
  }

  getLookAtPoint() {
    const origin = this.getCurrentOrigin();
    const isStart = origin === 'start';
    const skip = 1;

    if (this.isChangingLanes()) {
      if (this.laneChangeIndex < this.laneChangePoints.length - skip) {
        return this.laneChangePoints[this.laneChangeIndex + skip];
      }

      return this.laneChangePoints[this.laneChangeIndex];
    }

    if (isStart) {
      if (this.roadPointIndex < this.roadPoints.length - skip) {
        return this.roadPoints[this.roadPointIndex + skip];
      }
    } else {
      return this.roadPoints[Math.max(this.roadPointIndex - skip, 0)];
    }

    return this.getCurrentPoint();
  }

  private resetLaneChange() {
    this.changingFrom = -1;
    this.laneChangePoints = [];
    this.laneChangeIndex = 0;
  }

  private interpolateLaneChange(numPoints: number, fromLane: number, toLane: number) {
    const origin = this.getCurrentOrigin();
    const isStart = origin === 'start';

    const res: Vector2[] = [];

    const laneFromPoints = this.getCurrentRoad().getRoadPoints(fromLane);
    const laneToPoints = this.getCurrentRoad().getRoadPoints(toLane);

    for (let i = 0; i < numPoints; i++) {
      const inc = isStart ? i : -i;
      const index = this.roadPointIndex + inc;
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

    const laneDist = Math.floor(Math.max(minLaneChangeSteps, dist));

    this.resetLaneChange();
    this.changingFrom = this.lane;

    this.laneChangePoints = this.interpolateLaneChange(
      laneDist,
      this.getAbsoluteLane(),
      this.getAbsoluteLane(lane)
    );

    this.lane = lane;
  }

  getAbsoluteLane(lane?: number) {
    if (this.route.length === 0) return this.lane;

    const origin = this.getCurrentOrigin();
    const road = this.getCurrentRoad();

    let relativeLane = this.lane;

    if (lane !== undefined) {
      checkLaneBounds(road, lane);
      relativeLane = lane;
    }

    if (road.isTwoWay() && origin === 'start') {
      return road.getNumLanes() - relativeLane - 1;
    }

    return relativeLane;
  }

  private routeUpdated() {
    this.roadIndex = 0;
    this.updateRoadOrigins();

    const origin = this.getCurrentOrigin();
    const isStart = origin === 'start';

    this.roadPoints = this.getLanePoints(this.getCurrentRoad(), this.getAbsoluteLane());
    this.roadPointIndex = isStart ? 0 : this.roadPoints.length - 1;
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
    this.updateRoadOrigins();
  }

  addToRoute(road: Road) {
    if (this.route.length === 0) {
      checkLaneBounds(road, this.lane);
    }

    this.route.push(road);
    this.updateRoadOrigins();

    if (this.route.length === 1) {
      this.routeUpdated();
    }
  }

  private updateRoadOrigins() {
    if (this.route.length === 0) {
      this.origins = [];
      return;
    }

    if (this.route.length === 1) {
      this.origins = ['start'];
      return;
    }

    let origins: Origin[] = inferRoadOrigins(this.route, 0);

    for (let i = 1; i < this.route.length - 1; i++) {
      const newOrigins = inferRoadOrigins(this.route, i);
      origins.push(newOrigins[1]);
    }

    this.origins = origins;
  }

  getRoadOrigins() {
    return this.origins;
  }

  getCurrentOrigin() {
    const index = this.getRoadIndex();
    return this.origins[index];
  }

  /**
   * @param num - value from 0 to 1 for where the car should start on the road
   * for debugging purposes
   */
  startAt(num: number) {
    const index = Math.floor(this.roadPoints.length * num);

    this.roadPointIndex = index;
  }

  atLastPoint() {
    const origin = this.getCurrentOrigin();
    const isStart = origin === 'start';

    if (this.roadIndex === this.route.length - 1) {
      if (
        (isStart && this.roadPointIndex === this.roadPoints.length - 1) ||
        (!isStart && this.roadPointIndex === 0)
      ) {
        return true;
      }
    }

    return false;
  }

  private getLanePoints(road: Road, lane: number) {
    const origin = this.getCurrentOrigin();
    const isStart = origin === 'start';

    if (road instanceof Intersection) {
      const prevRoad = this.route[this.roadIndex - 1];
      const nextRoad = this.route[this.roadIndex + 1];
      const intersectionPathRoad = road.getPath(prevRoad, nextRoad);

      if (!intersectionPathRoad) return [];

      const pathRoad = intersectionPathRoad.road;

      this.intersectionState.setTurnRoad(pathRoad);

      const res =
        pathRoad instanceof TurnLane
          ? pathRoad.getRoadPoints(0, isStart)
          : pathRoad.getRoadPoints(this.getAbsoluteLane(this.lane));

      return res;
    }

    this.intersectionState.clearIntersection();

    return road.getRoadPoints(lane);
  }

  getIntersectionState() {
    return this.intersectionState;
  }

  nextPoint() {
    const origin = this.getCurrentOrigin();
    const isStart = origin === 'start';
    const lane = this.getAbsoluteLane();

    if (this.isChangingLanes()) {
      this.laneChangeIndex++;

      if (this.laneChangeIndex >= this.laneChangePoints.length) {
        this.resetLaneChange();
      }
    }

    if (
      (isStart && this.roadPointIndex >= this.roadPoints.length - 1) ||
      (!isStart && this.roadPointIndex === 0)
    ) {
      if (this.getCurrentRoad() instanceof Intersection) {
        (this.getCurrentRoad() as Intersection).unregister(this.car);
      }

      if (this.roadIndex < this.route.length - 1) {
        this.roadIndex++;
      } else if (this.loop) {
        this.roadIndex = 0;
      }

      this.roadPoints = this.getLanePoints(this.getCurrentRoad(), lane);
      if (this.getCurrentOrigin() === 'start') {
        this.roadPointIndex = 0;
      } else {
        this.roadPointIndex = this.roadPoints.length - 1;
      }

      if (this.getCurrentRoad() instanceof Intersection) {
        (this.getCurrentRoad() as Intersection).register(this.car);
      }

      if (this.inIntersection() && this.intersectionState.hasStopped()) {
        this.intersectionState.setHasStopped(false);
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
  private laneObstacle: LaneObstacle | null;

  constructor() {
    this.obstaclesAhead = [];
    this.laneObstacle = null;
  }

  setObstaclesAhead(obstacles: Obstacle[]) {
    this.obstaclesAhead = obstacles;
  }

  setLaneObstacle(obstacle: LaneObstacle) {
    this.laneObstacle = obstacle;
  }

  clearLaneObstacle() {
    this.laneObstacle = null;
  }

  getObstaclesAhead() {
    return this.obstaclesAhead;
  }

  getLaneObstacle() {
    return this.laneObstacle;
  }
}
