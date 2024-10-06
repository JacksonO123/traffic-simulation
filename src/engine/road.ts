import {
  Color,
  EmptyElement,
  Simulation,
  Spline2d,
  Square,
  TraceLines2d,
  Vector2,
  Vector3,
  cloneBuf,
  color,
  continuousSplinePoint2d,
  distance2d,
  easeOutQuad,
  splinePoint2d,
  vec2,
  vector2,
  vector3,
  vector3FromVector2,
  vertex
} from 'simulationjsv2';
import { ContinueState, IntersectionTurn, LaneObstacle, Obstacle, SP } from '../types/traffic';
import {
  carHeight,
  carWidth,
  laneChangeStartDist,
  laneGap,
  laneColor,
  maxLaneChangeSteps,
  minStopDistance,
  minIntersectionDist,
  mergeSlowDownScale,
  mergeSpeedUpScale
} from './constants';
import { RoadData, StepContext } from './data';
import {
  acceleration,
  brakeCapacity,
  brakingDistance,
  intersectionTurnSpeed,
  laneChangeAcceleration,
  laneChangeSpeedScale,
  minSpeed,
  stopDistance
} from './params';
import { getEndRoadPoint, getStartRoadPoint } from '../utils/utils';

class LaneLines {
  private lineColor = color(0, 255, 255);
  private lines: TraceLines2d[][];
  private collection: EmptyElement;

  constructor() {
    this.lines = [];
    this.collection = new EmptyElement('lane-lines');
  }

  getCollection() {
    return this.collection;
  }

  addLines(pointsArr: Vector2[][]) {
    const traces: TraceLines2d[] = [];

    pointsArr.forEach((points) => {
      const trace = new TraceLines2d(this.lineColor);
      points.forEach((point) => trace.addPoint(point));
      traces.push(trace);
      this.collection.add(trace);
    });

    this.lines.push(traces);

    return this.lines.length - 1;
  }

  setLines(index: number, pointsArr: Vector2[][]) {
    if (index < 0 || index >= this.lines.length) return;

    const traces = this.lines[index];
    traces.forEach((trace) => trace.clear());

    pointsArr.forEach((points, index) => points.forEach((point) => traces[index].addPoint(point)));
  }
}

export const laneLines = new LaneLines();

export class Car extends Square {
  private stepContext: StepContext;
  private maxSpeed: number;
  private speed: number;
  private roadData: RoadData;

  constructor(lane: number, startPoint: SP, color?: Color, loop = false, canChangeLane = true) {
    // TODO check for correct center offset
    super(vector2(), carWidth, carHeight, color, 0);

    this.maxSpeed = 0;
    this.speed = 0.1;

    this.roadData = new RoadData(this, lane, startPoint, loop, canChangeLane);

    this.stepContext = new StepContext();
  }

  getLane() {
    return this.roadData.getLane();
  }

  getAbsoluteLane() {
    return this.roadData.getAbsoluteLane();
  }

  isStartPoint() {
    return this.roadData.isStartPoint();
  }

  setLane(lane: number) {
    let dist: number;
    const obstacles = this.stepContext.getObstaclesAhead();

    if (obstacles.length > 0) {
      dist = distance2d(this.getPos(), obstacles[0].point) * 0.8;
    } else {
      dist = maxLaneChangeSteps;
    }

    this.stepContext.clearLaneObstacle();
    this.roadData.setLane(lane, dist);
  }

  inIntersection() {
    return this.roadData.inIntersection();
  }

  getChangingFrom() {
    return this.roadData.getChangingFrom();
  }

  getRoute() {
    return this.roadData.getRoute();
  }

  getRoadIndex() {
    return this.roadData.getRoadIndex();
  }

  isChangingLanes() {
    return this.roadData.isChangingLanes();
  }

  setMaxSpeed(speed: number) {
    this.maxSpeed = speed;
  }

  setRoute(route: Road[]) {
    this.roadData.setRoute(route);
    this.routeUpdated();
  }

  addToRoute(road: Road) {
    this.roadData.addToRoute(road);
    this.routeUpdated();
  }

  getStartPoint() {
    return this.roadData.getStartPoint();
  }

  private routeUpdated() {
    const startPoint = vector3FromVector2(this.roadData.getCurrentPoint());
    vec2.add(startPoint, this.roadData.getCurrentSpline().getPos(), startPoint);

    const toPoint = cloneBuf(this.roadData.getLookAtPoint());
    vec2.add(toPoint, this.roadData.getCurrentSpline().getPos(), toPoint);

    this.moveTo(startPoint);

    const pos = this.getPos();
    const rotation = Math.atan2(toPoint[1] - pos[1], toPoint[0] - pos[0]);

    this.rotateTo(vector3(0, 0, rotation));
  }

  /**
   * @param num - value from 0 to 1 for where the car should start on the road
   */
  startAt(num: number) {
    this.roadData.startAt(num);

    const toPos = vector3FromVector2(this.roadData.getCurrentPoint());
    vec2.add(toPos, this.roadData.getCurrentSpline().getPos(), toPos);

    const toPoint = cloneBuf(this.roadData.getLookAtPoint());
    vec2.add(toPoint, this.roadData.getCurrentSpline().getPos(), toPoint);

    const rotation = Math.atan2(toPoint[1] - toPos[1], toPoint[0] - toPos[0]);

    this.moveTo(toPos);
    this.rotateTo(vector3(0, 0, rotation));
  }

  getDirectionVector() {
    const vec = vector2(1);

    vec2.rotate(vec, vector2(), this.getRotation()[2], vec);

    return vec;
  }

  wantsLaneChange(): [boolean, number | null] {
    const road = this.roadData.getCurrentRoad();
    let numLanes = road.getNumLanes();

    if (road.isTwoWay()) {
      numLanes /= 2;
    }

    if (numLanes === 1) return [false, null];

    const targetLane = this.roadData.getTargetLane();
    if (targetLane === this.getLane()) return [false, null];
    if (targetLane !== -1) {
      return [true, targetLane];
    }

    const obstacles = this.stepContext.getObstaclesAhead();

    if (obstacles.length > 0) {
      const minDist = distance2d(this.getPos(), obstacles[0].point);
      const minSpeed = 3;
      const maxLaneChangeSpeed = Math.max(minSpeed, obstacles[0].speed * laneChangeSpeedScale);

      if (minDist < laneChangeStartDist && this.speed <= maxLaneChangeSpeed && !obstacles[0].isIntersection) {
        if (obstacles[0].isIntersection) {
          return [minDist > minIntersectionDist, null];
        } else {
          return [true, null];
        }
      }
    }

    return [false, null];
  }

  getCurrentRoad() {
    return this.roadData.getCurrentRoad();
  }

  getIntersectionState() {
    return this.roadData.getIntersectionState();
  }

  getSpeed() {
    return this.speed;
  }

  /**
   * If car is stationary
   */
  isStopped() {
    return this.getSpeed() < minSpeed;
  }

  /**
   * For external state tracking
   * is true if car has stopped in the past and state has not been cleared
   */
  hasStopped() {
    return this.roadData.getStopped();
  }

  setHasStopped() {
    this.roadData.setHasStopped();
  }

  private getTargetSpeed() {
    const road = this.roadData.getCurrentRoad();
    let targetSpeed = Math.min(this.maxSpeed, road.getSpeedLimit());

    const obstacles = this.stepContext.getObstaclesAhead();

    if (obstacles.length > 0) {
      const dist = distance2d(this.getPos(), obstacles[0].point);
      const stopDist = obstacles[0].isIntersection ? minStopDistance : stopDistance;
      const ratio = easeOutQuad((dist - stopDist) / brakingDistance);
      const speedRatio = (obstacles[0].speed - this.speed) / this.maxSpeed;

      targetSpeed = this.maxSpeed * ratio;
      targetSpeed += this.maxSpeed * speedRatio;
    }

    const laneObstacle = this.stepContext.getLaneObstacle();
    if (laneObstacle) {
      let newTarget = laneObstacle.obstacle.getSpeed();
      const scale = laneObstacle.behind ? mergeSlowDownScale : mergeSpeedUpScale;
      newTarget *= scale;

      targetSpeed = Math.min(targetSpeed, newTarget);
    }

    return targetSpeed;
  }

  private stepToTargetSpeed(currentSpeed: number, targetSpeed: number) {
    let res = 0;

    if (currentSpeed < targetSpeed) {
      const accelAmount = this.isChangingLanes() ? laneChangeAcceleration : acceleration;
      res = Math.min(targetSpeed, currentSpeed + accelAmount);
    } else {
      res = Math.max(targetSpeed, currentSpeed - brakeCapacity);

      if (res < minSpeed) {
        const obstacles = this.stepContext.getObstaclesAhead();
        if (obstacles.length > 0 && obstacles[0].isIntersection) {
          this.roadData.setHasStopped();
        }

        res = 0;
      }
    }

    return res;
  }

  travel(scale: number) {
    let toPos = cloneBuf(this.roadData.getCurrentPoint());
    let toLookAt = cloneBuf(this.roadData.getLookAtPoint());

    let splinePos = this.roadData.getCurrentSpline().getPos();

    vec2.add(toPos, splinePos, toPos);
    vec2.add(toLookAt, splinePos, toLookAt);

    let pos = cloneBuf(this.getPos());
    let rotation = Math.atan2(toLookAt[1] - pos[1], toLookAt[0] - pos[0]);

    const targetSpeed = this.getTargetSpeed();
    this.speed = this.stepToTargetSpeed(this.speed, targetSpeed);

    let toTravel = this.speed * scale;
    let dist = distance2d(pos, toPos);

    const moveCar = (amount: number) => {
      if (isNaN(rotation)) return;

      const velocity = vector3(amount);
      vec2.rotate(velocity, vector2(), rotation, velocity);

      this.rotateTo(vector3(0, 0, rotation));
      this.move(velocity);
    };

    while (toTravel > 0) {
      if (dist > toTravel) {
        moveCar(toTravel);
        break;
      } else {
        moveCar(dist);
        toTravel -= dist;

        if (this.roadData.atLastPoint()) break;

        this.roadData.nextPoint();

        splinePos = this.roadData.getCurrentSpline().getPos();

        pos = cloneBuf(this.getPos());
        toPos = cloneBuf(this.roadData.getCurrentPoint());
        toLookAt = cloneBuf(this.roadData.getLookAtPoint());

        vec2.add(toPos, splinePos, toPos);
        vec2.add(toLookAt, splinePos, toLookAt);

        rotation = Math.atan2(toLookAt[1] - pos[1], toLookAt[0] - pos[0]);
        dist = distance2d(pos, toPos);

        // const next = cloneBuf(toPos);
        // vec2.scale(next, 1 / devicePixelRatio, next);

        // const ratio = this.speed / this.maxSpeed;
        // const lineColor =
        //   ratio > 1 ? color(245, 110, 255) : interpolateColors([color(255), color(0, 255)], ratio);
      }
    }
  }

  setObstaclesAhead(obstacles: Obstacle[]) {
    this.stepContext.setObstaclesAhead(obstacles);
  }

  /**
   * You are expected to clear lane obstacle later in time if called
   */
  setLaneObstacle(obstacle: LaneObstacle) {
    this.stepContext.setLaneObstacle(obstacle);
  }
}

export class Road {
  private spline: Spline2d;
  private roadPoints: Vector2[][];
  private lanes: number;
  private laneWidth: number;
  private speedLimit: number;
  private twoWay: boolean;
  private laneLineIndex: number;

  constructor(
    roadSpline: Spline2d | null,
    numLanes: number,
    speedLimit: number,
    laneWidth: number,
    twoWay: boolean
  ) {
    this.spline = roadSpline || new Spline2d(vertex(), []);
    this.lanes = numLanes;
    this.laneWidth = laneWidth;
    this.roadPoints = [];
    this.speedLimit = speedLimit;
    this.laneLineIndex = -1;

    if (twoWay && numLanes % 2 === 1) {
      throw new Error('Expected even number of lanes for two way road');
    }

    this.twoWay = twoWay;

    this.setWidthToLanes();

    this.updateRoadPoints(this.spline.getLength());
  }

  laneInRange(lane: number) {
    let maxNum = this.lanes;

    if (this.isTwoWay()) maxNum /= 2;

    return lane >= 0 && lane < maxNum;
  }

  private updateRoadPoints(detail: number) {
    this.roadPoints = [];
    const pointsArr: Vector2[][] = [];

    for (let lane = 0; lane < this.lanes; lane++) {
      const arr: Vector2[] = [];

      for (let j = 0; j < detail; j++) {
        const [pos, tangent] = this.spline.interpolateSlope(j / detail);

        const maxScale = (this.lanes - 1) / 2;
        const scale = maxScale - lane;
        const indexDistance = lane - (this.lanes - 1) / 2;

        const normal = vector2(-tangent[1], tangent[0]);
        vec2.normalize(normal, normal);
        vec2.scale(normal, this.laneWidth * scale - indexDistance * laneGap, normal);
        vec2.add(pos, normal, pos);

        arr.push(pos);
      }

      pointsArr.push(arr);

      this.roadPoints.push(arr);
    }

    const splinePos = this.spline.getPos();
    const lanePoints = pointsArr.map((points) =>
      points.map((point) => vec2.add(point, splinePos) as Vector2)
    );
    if (this.laneLineIndex !== -1) {
      laneLines.setLines(this.laneLineIndex, lanePoints);
    } else {
      this.laneLineIndex = laneLines.addLines(lanePoints);
    }
  }

  recomputePoints() {
    this.updateRoadPoints(this.spline.getLength());
  }

  getLaneStartPoint(lane: number) {
    if (this.twoWay) {
      if (lane + 1 > this.lanes / 2) return SP.START;
    }

    return SP.END;
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

  isTwoWay() {
    return this.twoWay;
  }
}

export class TurnLane extends Road {
  private connectedLane: number;

  constructor(roadSpline: Spline2d, laneWidth: number, lane: number) {
    super(roadSpline, 1, intersectionTurnSpeed, laneWidth, false);

    this.connectedLane = lane;
  }

  getRoadPoints(_: number, isStart = false) {
    const res = [...super.getRoadPoints(0)];

    if (!isStart) {
      res.reverse();
    }

    return res;
  }

  getLane() {
    return this.connectedLane;
  }
}

export abstract class Intersection extends Road {
  protected roadAttachments: Map<number, Road>;
  protected pathLanes: IntersectionTurn[];
  protected registeredCars: Car[];

  constructor(numLanes: number, laneWidth: number, twoWay: boolean) {
    const speedLimit = 5;
    super(null, numLanes, speedLimit, laneWidth, twoWay);

    this.roadAttachments = new Map();
    this.pathLanes = [];
    this.registeredCars = [];
  }

  getPath(from: Road, to: Road) {
    let fromSide = -1;
    let toSide = -1;

    Array.from(this.roadAttachments.entries()).forEach(([key, value]) => {
      if (value === from) {
        fromSide = key;
      } else if (value === to) {
        toSide = key;
      }
    });

    if (fromSide === -1 || toSide === -1) return null;

    for (let i = 0; i < this.pathLanes.length; i++) {
      const turnLane = this.pathLanes[i];
      if (turnLane.from === fromSide && turnLane.to === toSide) {
        return turnLane.road;
      }
    }

    return null;
  }

  getSide(road: Road) {
    const entries = Array.from(this.roadAttachments.entries());

    for (let i = 0; i < entries.length; i++) {
      if (entries[i][1] === road) {
        return entries[i][0];
      }
    }

    return -1;
  }

  isRegistered(car: Car) {
    return this.registeredCars.includes(car);
  }

  register(car: Car) {
    this.registeredCars.push(car);
  }

  unregister(car: Car) {
    this.registeredCars = this.registeredCars.filter((item) => item !== car);
  }

  abstract canContinue(
    car: Car,
    obstacles: Obstacle[],
    prevRoad: Road,
    nextRoad: Road
  ): Vector2 | ContinueState;
}

export class TrafficLight extends Intersection {
  private pos: Vector3;
  private intersectionLength: number;
  private paths: Road[];

  private xScales = [0, 0.5, 0, -0.5];
  private xControlSigns = [0, 1, 0, -1];
  private yScales = [0.5, 0, -0.5, 0];
  private yControlSigns = [1, 0, -1, 0];

  constructor(pos: Vector2, numLanes: number, laneWidth: number, twoWay: boolean) {
    super(numLanes, laneWidth, twoWay);

    this.pos = vector3FromVector2(pos);
    this.intersectionLength = laneWidth * numLanes + laneGap * (numLanes + 1);

    const smallTurnScale = 22;
    const turnControlScale = 2 * smallTurnScale * (numLanes / 2) + laneGap;

    const roadSpline1 = new Spline2d(
      vertex(this.pos[0] - this.intersectionLength / 2, this.pos[1], 0, laneColor),
      [splinePoint2d(vertex(this.intersectionLength), vector2(1), vector2(-1))]
    );

    const roadSpline2 = new Spline2d(
      vertex(this.pos[0], this.pos[1] + this.intersectionLength / 2, 0, laneColor),
      [splinePoint2d(vertex(0, -this.intersectionLength), vector2(0, -1), vector2(0, 1))]
    );

    const turnSpline1 = new Spline2d(
      vertex(
        this.pos[0] - this.intersectionLength / 2 + laneWidth / 2 + laneGap,
        this.pos[1] + this.intersectionLength / 2,
        0,
        laneColor
      ),
      [
        splinePoint2d(
          vertex(-laneWidth / 2 - laneGap, -laneWidth / 2 - laneGap),
          vector2(0, -smallTurnScale),
          vector2(smallTurnScale)
        )
      ]
    );

    const turnSpline2 = new Spline2d(
      vertex(
        this.pos[0] + this.intersectionLength / 2,
        this.pos[1] + this.intersectionLength / 2 - laneWidth / 2 - laneGap,
        0,
        laneColor
      ),
      [
        splinePoint2d(
          vertex(-laneWidth / 2 - laneGap, laneWidth / 2 + laneGap),
          vector2(-smallTurnScale),
          vector2(0, -smallTurnScale)
        )
      ]
    );

    const turnSpline3 = new Spline2d(
      vertex(
        this.pos[0] + this.intersectionLength / 2 - laneWidth / 2 - laneGap,
        this.pos[1] - this.intersectionLength / 2,
        0,
        laneColor
      ),
      [
        splinePoint2d(
          vertex(laneWidth / 2 + laneGap, laneWidth / 2 + laneGap),
          vector2(0, smallTurnScale),
          vector2(-smallTurnScale)
        )
      ]
    );

    const turnSpline4 = new Spline2d(
      vertex(
        this.pos[0] - this.intersectionLength / 2,
        this.pos[1] - this.intersectionLength / 2 + laneWidth / 2 + laneGap,
        0,
        laneColor
      ),
      [
        splinePoint2d(
          vertex(laneWidth / 2 + laneGap, -laneWidth / 2 - laneGap),
          vector2(smallTurnScale),
          vector2(0, smallTurnScale)
        )
      ]
    );

    const turnSpline5 = new Spline2d(
      vertex(
        this.pos[0] - (laneWidth + laneGap) / 2,
        this.pos[1] + this.intersectionLength / 2,
        0,
        laneColor
      ),
      [
        splinePoint2d(
          vertex(
            this.intersectionLength / 2 + (laneWidth + laneGap) / 2,
            -this.intersectionLength / 2 - (laneWidth + laneGap) / 2
          ),
          vector2(0, -turnControlScale),
          vector2(-turnControlScale)
        )
      ]
    );

    const turnSpline6 = new Spline2d(
      vertex(
        this.pos[0] + this.intersectionLength / 2,
        this.pos[1] + (laneWidth + laneGap) / 2,
        0,
        laneColor
      ),
      [
        splinePoint2d(
          vertex(
            -this.intersectionLength / 2 - (laneWidth + laneGap) / 2,
            -this.intersectionLength / 2 - (laneWidth + laneGap) / 2
          ),
          vector2(-turnControlScale),
          vector2(0, turnControlScale)
        )
      ]
    );

    const turnSpline7 = new Spline2d(
      vertex(
        this.pos[0] + (laneWidth + laneGap) / 2,
        this.pos[1] - this.intersectionLength / 2,
        0,
        laneColor
      ),
      [
        splinePoint2d(
          vertex(
            -this.intersectionLength / 2 - (laneWidth + laneGap) / 2,
            this.intersectionLength / 2 + (laneWidth + laneGap) / 2
          ),
          vector2(0, turnControlScale),
          vector2(turnControlScale)
        )
      ]
    );

    const turnSpline8 = new Spline2d(
      vertex(
        this.pos[0] - this.intersectionLength / 2,
        this.pos[1] - (laneWidth + laneGap) / 2,
        0,
        laneColor
      ),
      [
        splinePoint2d(
          vertex(
            this.intersectionLength / 2 + (laneWidth + laneGap) / 2,
            this.intersectionLength / 2 + (laneWidth + laneGap) / 2
          ),
          vector2(turnControlScale),
          vector2(0, -turnControlScale)
        )
      ]
    );

    const speedLimit = this.getSpeedLimit();
    const leftmostLane = twoWay ? numLanes / 2 - 1 : numLanes - 1;

    const road1 = new Road(roadSpline1, numLanes, speedLimit, laneWidth, twoWay);
    const road2 = new Road(roadSpline2, numLanes, speedLimit, laneWidth, twoWay);

    const turn1 = new TurnLane(turnSpline1, laneWidth, 0);
    const turn2 = new TurnLane(turnSpline2, laneWidth, 0);
    const turn3 = new TurnLane(turnSpline3, laneWidth, 0);
    const turn4 = new TurnLane(turnSpline4, laneWidth, 0);
    const turn5 = new TurnLane(turnSpline5, laneWidth, leftmostLane);
    const turn6 = new TurnLane(turnSpline6, laneWidth, leftmostLane);
    const turn7 = new TurnLane(turnSpline7, laneWidth, leftmostLane);
    const turn8 = new TurnLane(turnSpline8, laneWidth, leftmostLane);

    const pathLanes: IntersectionTurn[] = [];

    const appendPathLane = (lane: Road, from: number, to: number) => {
      pathLanes.push({
        road: lane,
        from,
        to
      });
    };

    appendPathLane(road1, 3, 1);
    appendPathLane(road1, 1, 3);
    appendPathLane(road2, 0, 2);
    appendPathLane(road2, 2, 0);

    appendPathLane(turn1, 0, 3);
    appendPathLane(turn2, 1, 0);
    appendPathLane(turn3, 2, 1);
    appendPathLane(turn4, 3, 2);

    if (twoWay) {
      appendPathLane(turn5, 0, 1);
      appendPathLane(turn6, 1, 2);
      appendPathLane(turn7, 2, 3);
      appendPathLane(turn8, 3, 0);
    } else {
      appendPathLane(turn1, 3, 0);
      appendPathLane(turn2, 0, 1);
      appendPathLane(turn3, 1, 2);
      appendPathLane(turn4, 2, 3);
    }

    // this.paths = [road1, road2, turn1, turn2, turn3, turn4, turn5, turn6, turn7, turn8];
    this.paths = [road1, road2, turn1, turn2, turn3, turn4, turn5, turn6, turn7, turn8];
    this.pathLanes = pathLanes;
  }

  addPaths(canvas: Simulation) {
    for (let i = 0; i < this.paths.length; i++) {
      canvas.add(this.paths[i].getSpline() as Spline2d);
    }
  }

  /**
   * @param intersectionSide - numbers 0 through 3 clockwise representing the side of the intersection starting at the top
   */
  connectRoadEnd(road: Road, intersectionSide: number, controlScale: number) {
    if (intersectionSide < 0 || intersectionSide >= 4) return;

    if (this.roadAttachments.has(intersectionSide)) {
      throw new Error(`Intersection already has road on side ${intersectionSide}`);
    }

    this.roadAttachments.set(intersectionSide, road);

    const spline = road.getSpline();

    const x = this.xScales[intersectionSide] * this.intersectionLength + this.pos[0];
    const y = this.yScales[intersectionSide] * this.intersectionLength + this.pos[1];

    const newPoint = continuousSplinePoint2d(
      vertex(x, y),
      vector2(
        this.xControlSigns[intersectionSide] * controlScale,
        this.yControlSigns[intersectionSide] * controlScale
      )
    );

    spline.updatePointAbsolute(1, newPoint);

    road.recomputePoints();
  }

  /**
   * @param intersectionSide - numbers 0 through 3 clockwise representing the side of the intersection starting at the top
   */
  connectRoadStart(road: Road, intersectionSide: number) {
    if (intersectionSide < 0 || intersectionSide >= 4) return;

    if (this.roadAttachments.has(intersectionSide)) {
      throw new Error(`Intersection already has road on side ${intersectionSide}`);
    }
    this.roadAttachments.set(intersectionSide, road);

    const spline = road.getSpline();

    const pos = this.pos;
    pos[0] += this.xScales[intersectionSide] * this.intersectionLength;
    pos[1] += this.yScales[intersectionSide] * this.intersectionLength;

    spline.moveTo(pos);

    road.recomputePoints();
  }

  canContinue(car: Car, obstacles: Obstacle[], prevRoad: Road, nextRoad: Road): Vector2 | ContinueState {
    const path = this.getPath(prevRoad, nextRoad);

    if (path == null) {
      return ContinueState.NO_PATH;
    }

    const points =
      path instanceof TurnLane
        ? path.getRoadPoints(car.getAbsoluteLane(), car.isStartPoint())
        : path.getRoadPoints(car.getAbsoluteLane());

    if (points.length > 0) {
      const point = cloneBuf(car.isStartPoint() ? getStartRoadPoint(points) : getEndRoadPoint(points));
      vec2.add(path.getSpline().getPos(), point, point);
      const dist = distance2d(car.getPos(), point);

      if (
        dist <= brakingDistance + stopDistance &&
        (obstacles.length === 0 || dist < distance2d(car.getPos(), obstacles[0].point))
      ) {
        if (car.hasStopped()) {
          const queueIndex = this.registeredCars.indexOf(car);
          if (queueIndex > 0) return point;
        } else {
          return point;
        }
      }
    }

    return ContinueState.CONTINUE;
  }
}
