import {
  Color,
  Line2d,
  SceneCollection,
  Spline2d,
  Square,
  Vector2,
  cloneBuf,
  color,
  distance2d,
  vec2,
  vector2,
  vertex
} from 'simulationjsv2';
import { StartingPoint } from '../types/traffic';
import {
  acceleration,
  brakeCapacity,
  brakingDistance,
  carHeight,
  carWidth,
  idprScale,
  idleSpeed,
  laneChangeAcceleration,
  laneChangeStartDist,
  laneGap,
  minSpeed,
  stopDistance
} from '../constants';
import { RoadData, StepContext } from './data';

export const laneLines = new SceneCollection('lane-lines');

export class Car extends Square {
  private stepContext: StepContext;
  private maxSpeed: number;
  private speed: number;

  private roadData: RoadData;

  constructor(lane: number, startPoint: StartingPoint, color?: Color, loop = false, canChangeLane = true) {
    super(vector2(), carWidth, carHeight, color, 0, vector2(0.5, 0.5));

    this.maxSpeed = 0;
    this.speed = 0.1;

    this.roadData = new RoadData(lane, startPoint, loop, canChangeLane);

    this.stepContext = new StepContext();
  }

  getLane() {
    return this.roadData.getLane();
  }

  setLane(lane: number) {
    this.roadData.setLane(lane, this.speed);
  }

  isChangingLanes() {
    return this.roadData.isChangingLanes();
  }

  setMaxSpeed(speed: number) {
    this.maxSpeed = speed * idprScale;
  }

  setRoute(route: Road[]) {
    this.roadData.setRoute(route);
    this.routeUpdated();
  }

  addToRoute(road: Road) {
    this.roadData.addToRoute(road);
    this.routeUpdated();
  }

  private routeUpdated() {
    const startPoint = cloneBuf(this.roadData.getCurrentPoint());
    vec2.add(startPoint, this.roadData.getCurrentRoad().getSpline().getPos(), startPoint);

    const toPoint = cloneBuf(this.roadData.getLookAtPoint());
    vec2.add(toPoint, this.roadData.getCurrentRoad().getSpline().getPos(), toPoint);

    this.moveTo(startPoint);

    const pos = this.getPos();
    const rotation = Math.atan2(toPoint[1] - pos[1], toPoint[0] - pos[0]);

    this.rotateTo(rotation);
  }

  /**
   * @param num - value from 0 to 1 for where the car should start on the road
   */
  startAt(num: number) {
    this.roadData.startAt(num);

    const toPos = cloneBuf(this.roadData.getCurrentPoint());
    vec2.add(toPos, this.roadData.getCurrentRoad().getSpline().getPos(), toPos);

    const toPoint = cloneBuf(this.roadData.getLookAtPoint());
    vec2.add(toPoint, this.roadData.getCurrentRoad().getSpline().getPos(), toPoint);

    let rotation = Math.atan2(toPoint[1] - toPos[1], toPoint[0] - toPos[0]);

    this.moveTo(toPos);
    this.rotateTo(rotation);
  }

  getDirectionVector() {
    const vec = vector2(1);

    vec2.rotate(vec, vector2(), this.getRotation(), vec);

    return vec;
  }

  wantsLaneChange() {
    const obstaclesAhead = this.stepContext.getObstaclesAhead();

    if (obstaclesAhead.length > 0) {
      const minDist = distance2d(this.getPos(), obstaclesAhead[0].getPos());
      if (minDist < laneChangeStartDist && this.speed <= idleSpeed) return true;

      return false;
    }

    return false;
  }

  getCurrentRoad() {
    return this.roadData.getCurrentRoad();
  }

  private getTargetSpeed() {
    const road = this.roadData.getCurrentRoad();
    let res = Math.min(this.maxSpeed, road.getSpeedLimit());

    const obstaclesAhead = this.stepContext.getObstaclesAhead();

    if (obstaclesAhead.length > 0) {
      const dist = distance2d(this.getPos(), obstaclesAhead[0].getPos());
      const ratio = (dist - stopDistance) / brakingDistance;
      res = this.maxSpeed * ratio;
    }

    return res;
  }

  private stepToTargetSpeed(targetSpeed: number) {
    if (this.speed < targetSpeed) {
      const accelAmount = this.isChangingLanes() ? laneChangeAcceleration : acceleration;
      this.speed = Math.min(targetSpeed, this.speed + accelAmount);
    } else {
      this.speed = Math.max(targetSpeed, this.speed - brakeCapacity);
    }

    if (this.speed < minSpeed) this.speed = 0;
  }

  travel(scale: number) {
    let toPos = cloneBuf(this.roadData.getCurrentPoint());
    let toLookAt = cloneBuf(this.roadData.getLookAtPoint());

    const splinePos = this.roadData.getCurrentRoad().getSpline().getPos();

    vec2.add(toPos, splinePos, toPos);
    vec2.add(toLookAt, splinePos, toLookAt);

    let pos = this.getPos();
    let rotation = Math.atan2(toLookAt[1] - pos[1], toLookAt[0] - pos[0]);

    const targetSpeed = this.getTargetSpeed();
    this.stepToTargetSpeed(targetSpeed);

    let toTravel = this.speed * scale;
    let dist = distance2d(pos, toPos);

    const moveCar = (amount: number) => {
      if (isNaN(rotation)) return;

      const velocity = vector2(amount);
      vec2.rotate(velocity, vector2(), rotation, velocity);

      this.rotateTo(rotation);
      this.move(velocity);
    };

    while (toTravel > 0) {
      if (dist > toTravel) {
        moveCar(toTravel);
        break;
      } else {
        moveCar(dist);
        toTravel -= dist;

        this.roadData.nextPoint();

        pos = this.getPos();
        toPos = cloneBuf(this.roadData.getCurrentPoint());
        toLookAt = cloneBuf(this.roadData.getLookAtPoint());

        vec2.add(toPos, splinePos, toPos);
        vec2.add(toLookAt, splinePos, toLookAt);

        rotation = Math.atan2(toLookAt[1] - pos[1], toLookAt[0] - pos[0]);
        dist = distance2d(pos, toPos);
      }
    }
  }

  setObstaclesAhead(cars: Car[]) {
    this.stepContext.setObstaclesAhead(cars);
  }
}

export class Road {
  private spline: Spline2d;
  private roadPoints: Vector2[][];
  private lanes: number;
  private laneWidth: number;
  private speedLimit: number;

  constructor(roadSpline: Spline2d, numLanes: number, speedLimit: number, laneWidth: number) {
    this.spline = roadSpline;
    this.lanes = numLanes;
    this.laneWidth = laneWidth;
    this.roadPoints = [];
    this.speedLimit = speedLimit;

    this.setWidthToLanes();
    const scale = 2 / devicePixelRatio;
    this.updateRoadPoints(this.spline.getLength() * scale);
  }

  private createLaneLine(points: Vector2[]) {
    const skip = 20;

    const addLine = (toIndex: number, fromIndex?: number) => {
      const pos = cloneBuf(points[fromIndex ? fromIndex : toIndex - skip]);
      vec2.add(pos, this.spline.getPos(), pos);

      const diff = cloneBuf(points[toIndex]);
      vec2.add(diff, this.spline.getPos(), diff);
      vec2.scale(diff, 1 / devicePixelRatio, diff);

      const line = new Line2d(
        vertex(pos[0], pos[1], pos[2], color(0, 255, 255)),
        vertex(diff[0], diff[1], diff[2])
      );
      laneLines.add(line);
    };

    let i = skip;
    for (; i < points.length; i += skip) {
      addLine(i);
    }

    i -= skip;

    if (i < points.length - 1) {
      addLine(points.length - 1, i);
    }
  }

  private updateRoadPoints(detail: number) {
    for (let lane = 0; lane < this.lanes; lane++) {
      const arr: Vector2[] = [];

      for (let j = 0; j < detail; j++) {
        const [pos, tangent] = this.spline.interpolateSlope(j / detail);

        const maxScale = (this.lanes - 1) / 2;
        const scale = maxScale - lane;
        const indexDistance = lane - (this.lanes - 1) / 2;

        const normal = vector2(-tangent[1], tangent[0]);
        vec2.normalize(normal, normal);
        vec2.scale(normal, (this.laneWidth * scale - indexDistance * laneGap) * devicePixelRatio, normal);
        vec2.add(pos, normal, pos);

        arr.push(pos);
      }

      this.createLaneLine(arr);

      this.roadPoints.push(arr);
    }
  }

  getSpline() {
    return this.spline;
  }

  getRoadPoints(lane: number) {
    return this.roadPoints[lane];
  }

  private setWidthToLanes() {
    this.spline.setThickness(this.lanes * this.laneWidth + (this.lanes + 1) * laneGap);
  }

  getNumLanes() {
    return this.lanes;
  }

  getSpeedLimit() {
    return this.speedLimit;
  }
}
