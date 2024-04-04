import { Color, Spline2d, Square, Vector2, cloneBuf, distance2d, vec2, vector2 } from 'simulationjsv2';
import { StartingPoint } from '../types/traffic';
import { StepContext } from '../types/traffic';
import {
  acceleration,
  brakeCapacity,
  brakingDistance,
  carHeight,
  carWidth,
  stopDistance
} from '../constants';

export class Car extends Square {
  private stepContext: StepContext;
  private maxSpeed: number;
  private speed: number;
  private lane;

  private route: Road[];
  private currentRoad: number;

  private roadPoints: Vector2[];
  private currentPoint: Vector2;
  private pointIndex: number;

  private startPoint: StartingPoint;

  constructor(lane: number, startPoint: StartingPoint, color?: Color) {
    super(vector2(), carWidth, carHeight, color, 0, vector2(0.5, 0.5));

    this.maxSpeed = 0;
    this.speed = 0;
    this.lane = lane;
    this.route = [];
    this.startPoint = startPoint;
    this.currentRoad = 0;
    this.currentPoint = vector2();
    this.pointIndex = 0;
    this.roadPoints = [];

    this.stepContext = {
      carsInFront: []
    };
  }

  getLane() {
    return this.lane;
  }

  setMaxSpeed(speed: number) {
    this.maxSpeed = speed;
  }

  setRoute(route: Road[]) {
    this.route = route;

    this.routeUpdated();
  }

  private routeUpdated() {
    if (this.startPoint === 'start') {
      this.currentRoad = 0;
      this.pointIndex = 0;
      this.roadPoints = this.route[this.currentRoad].getRoadPoints(this.lane);
      this.currentPoint = this.roadPoints[this.pointIndex];
    } else {
      this.currentRoad = this.route.length - 1;
      this.roadPoints = this.route[this.currentRoad].getRoadPoints(this.lane);
      this.pointIndex = this.roadPoints.length - 1;
      this.currentPoint = this.roadPoints[this.pointIndex];
    }

    const startPoint = cloneBuf(this.currentPoint);
    vec2.add(startPoint, this.route[this.currentRoad].getSpline().getPos(), startPoint);

    this.nextPoint();

    const toPoint = cloneBuf(this.currentPoint);
    vec2.add(toPoint, this.route[this.currentRoad].getSpline().getPos(), toPoint);

    this.moveTo(startPoint);

    const pos = this.getPos();
    const rotation = Math.atan2(toPoint[1] - pos[1], toPoint[0] - pos[0]);

    this.rotateTo(rotation);
  }

  addToRoute(road: Road) {
    if (this.startPoint === 'start') {
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

    this.pointIndex = index;
    this.currentPoint = this.roadPoints[this.pointIndex];

    const toPos = cloneBuf(this.currentPoint);
    vec2.add(toPos, this.route[this.currentRoad].getSpline().getPos(), toPos);

    this.nextPoint();

    const toPoint = cloneBuf(this.currentPoint);
    vec2.add(toPoint, this.route[this.currentRoad].getSpline().getPos(), toPoint);

    let rotation = Math.atan2(toPoint[1] - toPos[1], toPoint[0] - toPos[0]);

    this.moveTo(toPos);
    this.rotateTo(rotation);
  }

  private nextPoint() {
    if (this.pointIndex >= this.roadPoints.length) return;

    if (this.startPoint === 'start') {
      this.pointIndex++;
    } else {
      this.pointIndex--;
    }

    this.currentPoint = this.roadPoints[this.pointIndex];
  }

  private getLookAtPoint() {
    if (this.pointIndex < this.roadPoints.length - 1) {
      return this.roadPoints[this.pointIndex + 1];
    }

    return this.currentPoint;
  }

  getDirectionVector() {
    const vec = vector2(1);

    vec2.rotate(vec, vector2(), this.getRotation(), vec);

    return vec;
  }

  private getTargetSpeed() {
    let res = this.maxSpeed;

    if (this.stepContext.carsInFront.length > 0) {
      const dist = distance2d(this.getPos(), this.stepContext.carsInFront[0].getPos());
      const ratio = (dist - stopDistance) / brakingDistance;
      res = this.maxSpeed * ratio;
    }

    return res;
  }

  private stepToTargetSpeed(targetSpeed: number) {
    if (this.speed < targetSpeed) {
      this.speed = Math.min(targetSpeed, this.speed + acceleration);
    } else {
      this.speed = Math.max(targetSpeed, this.speed - brakeCapacity);
    }
  }

  travel() {
    let toPos = cloneBuf(this.currentPoint);
    let toLookAt = cloneBuf(this.getLookAtPoint());
    vec2.add(toPos, this.route[this.currentRoad].getSpline().getPos(), toPos);
    vec2.add(toLookAt, this.route[this.currentRoad].getSpline().getPos(), toLookAt);

    let pos = this.getPos();
    let rotation = Math.atan2(toLookAt[1] - pos[1], toLookAt[0] - pos[0]);

    const targetSpeed = this.getTargetSpeed();
    this.stepToTargetSpeed(targetSpeed);

    let toTravel = this.speed;

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

        this.nextPoint();

        pos = this.getPos();
        toPos = cloneBuf(this.currentPoint);
        toLookAt = cloneBuf(this.getLookAtPoint());

        vec2.add(toPos, this.route[this.currentRoad].getSpline().getPos(), toPos);
        vec2.add(toLookAt, this.route[this.currentRoad].getSpline().getPos(), toLookAt);

        rotation = Math.atan2(toLookAt[1] - pos[1], toLookAt[0] - pos[0]);
        dist = distance2d(pos, toPos);
      }
    }
  }

  setNearbyCars(cars: Car[]) {
    this.stepContext.carsInFront = cars;
  }
}

export class Road {
  private spline: Spline2d;
  private roadPoints: Vector2[][];
  private lanes: number;
  private laneWidth: number;
  private laneGap = 8;

  constructor(roadSpline: Spline2d, numLanes: number, laneWidth: number) {
    this.spline = roadSpline;
    this.lanes = numLanes;
    this.laneWidth = laneWidth;
    this.roadPoints = [];

    this.setWidthToLanes();
    this.updateRoadPoints(this.spline.getLength());
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
        vec2.scale(
          normal,
          (this.laneWidth * scale - indexDistance * this.laneGap) * devicePixelRatio,
          normal
        );
        vec2.add(pos, normal, pos);

        arr.push(pos);
      }

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
    this.spline.setThickness(this.lanes * this.laneWidth + (this.lanes + 1) * this.laneGap);
  }

  getNumLanes() {
    return this.lanes;
  }
}
