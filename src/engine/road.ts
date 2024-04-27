import {
  Color,
  Line2d,
  SceneCollection,
  Simulation,
  Spline2d,
  Square,
  Vector2,
  Vector3,
  cloneBuf,
  color,
  continuousSplinePoint2d,
  distance2d,
  splinePoint2d,
  vec2,
  vector2,
  vector2FromVector3,
  vector3FromVector2,
  vertex
} from 'simulationjsv2';
import { IntersectionTurn, Obstacle, SP } from '../types/traffic';
import {
  carHeight,
  carWidth,
  idprScale,
  laneChangeStartDist,
  laneGap,
  laneColor,
  dprScale,
  maxLaneChangeSteps,
  minStopDistance
} from './constants';
import { RoadData, StepContext } from './data';
import {
  acceleration,
  brakeCapacity,
  brakingDistance,
  laneChangeAcceleration,
  maxLaneChangeSpeed,
  minSpeed,
  stopDistance
} from './params';

export const testLines = new SceneCollection('test');

class LaneLines {
  private lines: Line2d[][];
  private lineCollection: SceneCollection;

  constructor() {
    this.lines = [];
    this.lineCollection = new SceneCollection('lane-lines');
  }

  getCollection() {
    return this.lineCollection;
  }

  addLines(lines: Line2d[]) {
    this.lines.push(lines);

    this.updateCollection();

    return this.lines.length - 1;
  }

  setLines(index: number, lines: Line2d[]) {
    if (index < 0 || index >= this.lines.length) return;

    this.lines[index] = lines;

    this.updateCollection();
  }

  private updateCollection() {
    const newScene = this.lines.flat();
    this.lineCollection.setScene(newScene);
  }
}

export const laneLines = new LaneLines();

export class Car extends Square {
  private stepContext: StepContext;
  private maxSpeed: number;
  private speed: number;

  private roadData: RoadData;

  constructor(lane: number, startPoint: SP, color?: Color, loop = false, canChangeLane = true) {
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
    let dist: number;
    const obstacles = this.stepContext.getObstaclesAhead();

    if (obstacles.length > 0) {
      dist = distance2d(this.getPos(), obstacles[0].point);
    } else {
      dist = maxLaneChangeSteps;
    }

    this.roadData.setLane(lane, dist);
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

  getStartPoint() {
    return this.roadData.getStartPoint();
  }

  private routeUpdated() {
    const startPoint = cloneBuf(this.roadData.getCurrentPoint());
    vec2.add(startPoint, this.roadData.getCurrentSpline().getPos(), startPoint);

    const toPoint = cloneBuf(this.roadData.getLookAtPoint());
    vec2.add(toPoint, this.roadData.getCurrentSpline().getPos(), toPoint);

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
    vec2.add(toPos, this.roadData.getCurrentSpline().getPos(), toPos);

    const toPoint = cloneBuf(this.roadData.getLookAtPoint());
    vec2.add(toPoint, this.roadData.getCurrentSpline().getPos(), toPoint);

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
    const road = this.roadData.getCurrentRoad();
    // TODO: test this
    if (road.getNumLanes() === 1) return false;

    const obstacles = this.stepContext.getObstaclesAhead();

    if (obstacles.length > 0) {
      const minDist = distance2d(this.getPos(), obstacles[0].point);
      // if (minDist > minIntersectionDist && minDist < laneChangeStartDist && this.speed <= maxLaneChangeSpeed)
      if (minDist < laneChangeStartDist && this.speed <= maxLaneChangeSpeed) return true;

      return false;
    }

    return false;
  }

  getCurrentRoad() {
    return this.roadData.getCurrentRoad();
  }

  getIntersectionState() {
    return this.roadData.getIntersectionState();
  }

  getStopped() {
    return this.roadData.getStopped();
  }

  setStopped(stopped: boolean) {
    this.roadData.setStopped(stopped);
  }

  private getTargetSpeed() {
    const road = this.roadData.getCurrentRoad();
    let res = Math.min(this.maxSpeed, road.getSpeedLimit());

    const obstacles = this.stepContext.getObstaclesAhead();

    if (obstacles.length > 0) {
      const dist = distance2d(this.getPos(), obstacles[0].point);
      const stopDist = !obstacles[0].isIntersection ? stopDistance : minStopDistance;
      const ratio = (dist - stopDist) / brakingDistance;
      res = this.maxSpeed * ratio;
    }

    return res;
  }

  private stepToTargetSpeed(currentSpeed: number, targetSpeed: number) {
    let res = 0;

    if (currentSpeed < targetSpeed) {
      const accelAmount = this.isChangingLanes() ? laneChangeAcceleration : acceleration;
      res = Math.min(targetSpeed, currentSpeed + accelAmount);
    } else {
      res = Math.max(targetSpeed, currentSpeed - brakeCapacity);
    }

    if (res < minSpeed) {
      const obstacles = this.stepContext.getObstaclesAhead();
      if (obstacles.length > 0 && obstacles[0].isIntersection) {
        this.roadData.setStopped(true);
      }

      res = 0;
    }

    return res;
  }

  travel(scale: number) {
    let toPos = cloneBuf(this.roadData.getCurrentPoint());
    let toLookAt = cloneBuf(this.roadData.getLookAtPoint());

    let splinePos = this.roadData.getCurrentSpline().getPos();

    vec2.add(toPos, splinePos, toPos);
    vec2.add(toLookAt, splinePos, toLookAt);

    let pos = this.getPos();
    let rotation = Math.atan2(toLookAt[1] - pos[1], toLookAt[0] - pos[0]);

    const targetSpeed = this.getTargetSpeed();
    this.speed = this.stepToTargetSpeed(this.speed, targetSpeed);

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

        if (this.roadData.atLastPoint()) break;

        this.roadData.nextPoint();

        splinePos = this.roadData.getCurrentSpline().getPos();

        pos = this.getPos();
        toPos = cloneBuf(this.roadData.getCurrentPoint());
        toLookAt = cloneBuf(this.roadData.getLookAtPoint());

        vec2.add(toPos, splinePos, toPos);
        vec2.add(toLookAt, splinePos, toLookAt);

        rotation = Math.atan2(toLookAt[1] - pos[1], toLookAt[0] - pos[0]);
        dist = distance2d(pos, toPos);

        const next = cloneBuf(toPos);
        vec2.scale(next, 1 / devicePixelRatio, next);

        const line = new Line2d(vertex(pos[0], pos[1], 0, color(255)), vertex(next[0], next[1]));
        testLines.add(line);
      }
    }
  }

  setObstaclesAhead(obstacles: Obstacle[]) {
    this.stepContext.setObstaclesAhead(obstacles);
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

    this.updateRoadPoints(this.spline.getLength() * dprScale);
  }

  private createLaneLine(points: Vector2[]) {
    const lines: Line2d[] = [];
    const skip = 20;

    const splinePos = this.spline.getPos();

    const addLine = (toIndex: number, fromIndex?: number) => {
      const pos = cloneBuf(points[fromIndex ? fromIndex : toIndex - skip]);
      vec2.add(pos, splinePos, pos);

      const diff = cloneBuf(points[toIndex]);
      vec2.add(diff, splinePos, diff);
      vec2.scale(diff, 1 / devicePixelRatio, diff);

      const line = new Line2d(
        vertex(pos[0], pos[1], pos[2], color(0, 255, 255)),
        vertex(diff[0], diff[1], diff[2])
      );

      lines.push(line);
    };

    let i = skip;
    for (; i < points.length; i += skip) {
      addLine(i);
    }

    i -= skip;

    if (i < points.length - 1) {
      addLine(points.length - 1, i);
    }

    return lines;
  }

  private updateRoadPoints(detail: number) {
    this.roadPoints = [];
    let lines: Line2d[] = [];

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

      const newLines = this.createLaneLine(arr);
      lines = lines.concat(newLines);

      this.roadPoints.push(arr);
    }

    if (this.laneLineIndex !== -1) {
      laneLines.setLines(this.laneLineIndex, lines);
    } else {
      this.laneLineIndex = laneLines.addLines(lines);
    }
  }

  recomputePoints() {
    this.updateRoadPoints(this.spline.getLength() * dprScale);
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

export abstract class Intersection extends Road {
  protected roadAttachments: Map<number, Road>;
  protected pathLanes: IntersectionTurn[];

  constructor(numLanes: number, laneWidth: number, twoWay: boolean) {
    const speedLimit = 5;
    super(null, numLanes, speedLimit, laneWidth, twoWay);

    this.roadAttachments = new Map();
    this.pathLanes = [];
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
}

export class StopSignIntersection extends Intersection {
  private pos: Vector3;
  private intersectionLength: number;
  private paths: Road[];

  private xScales = [0, 0.5, 0, 0.5];
  private xControlSigns = [0, 1, 0, -1];
  private yScales = [0.5, 0, -0.5, 0];
  private yControlSigns = [1, 0, -1, 0];

  constructor(pos: Vector2, numLanes: number, laneWidth: number, twoWay: boolean) {
    super(numLanes, laneWidth, twoWay);

    this.pos = vector3FromVector2(pos);
    this.intersectionLength = laneWidth * numLanes + laneGap * (numLanes + 1);

    const turnControlScale = 12;

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
          vector2(0, -turnControlScale),
          vector2(turnControlScale)
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
          vector2(-turnControlScale),
          vector2(0, -turnControlScale)
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
          vector2(0, turnControlScale),
          vector2(-turnControlScale)
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
          vector2(turnControlScale),
          vector2(0, turnControlScale)
        )
      ]
    );

    const turnSpline5 = new Spline2d(
      vertex(
        this.pos[0] - this.intersectionLength / 2 + laneWidth / 2 + laneGap,
        this.pos[1] + this.intersectionLength / 2,
        0,
        laneColor
      ),
      [
        splinePoint2d(
          vertex(
            this.intersectionLength / 2 + laneWidth / 2 + laneGap / 2,
            -this.intersectionLength / 2 - laneWidth / 2 - laneGap / 2
          ),
          vector2(0, -turnControlScale * 3),
          vector2(-turnControlScale * 3)
        )
      ]
    );

    const turnSpline6 = new Spline2d(
      vertex(
        this.pos[0] + this.intersectionLength / 2,
        this.pos[1] + this.intersectionLength / 2 - laneWidth / 2 - laneGap,
        0,
        laneColor
      ),
      [
        splinePoint2d(
          vertex(
            -this.intersectionLength / 2 - laneWidth / 2 - laneGap / 2,
            -this.intersectionLength / 2 - laneWidth / 2 - laneGap / 2
          ),
          vector2(-turnControlScale * 3),
          vector2(0, turnControlScale * 3)
        )
      ]
    );

    const turnSpline7 = new Spline2d(
      vertex(
        this.pos[0] + this.intersectionLength / 2 - laneWidth / 2 - laneGap,
        this.pos[1] - this.intersectionLength / 2,
        0,
        laneColor
      ),
      [
        splinePoint2d(
          vertex(
            -this.intersectionLength / 2 - laneWidth / 2 - laneGap / 2,
            this.intersectionLength / 2 + laneWidth / 2 + laneGap / 2
          ),
          vector2(0, turnControlScale * 3),
          vector2(turnControlScale * 3)
        )
      ]
    );

    const turnSpline8 = new Spline2d(
      vertex(
        this.pos[0] - this.intersectionLength / 2,
        this.pos[1] - this.intersectionLength / 2 + laneWidth / 2 + laneGap,
        0,
        laneColor
      ),
      [
        splinePoint2d(
          vertex(
            this.intersectionLength / 2 + laneWidth / 2 + laneGap / 2,
            this.intersectionLength / 2 + laneWidth / 2 + laneGap / 2
          ),
          vector2(turnControlScale * 3),
          vector2(0, -turnControlScale * 3)
        )
      ]
    );

    const speedLimit = this.getSpeedLimit();

    const road1 = new Road(roadSpline1, numLanes, speedLimit, laneWidth, twoWay);
    const road2 = new Road(roadSpline2, numLanes, speedLimit, laneWidth, twoWay);

    const turn1 = new Road(turnSpline1, 1, speedLimit, laneWidth, false);
    const turn2 = new Road(turnSpline2, 1, speedLimit, laneWidth, false);
    const turn3 = new Road(turnSpline3, 1, speedLimit, laneWidth, false);
    const turn4 = new Road(turnSpline4, 1, speedLimit, laneWidth, false);
    const turn5 = new Road(turnSpline5, 1, speedLimit, laneWidth, false);
    const turn6 = new Road(turnSpline6, 1, speedLimit, laneWidth, false);
    const turn7 = new Road(turnSpline7, 1, speedLimit, laneWidth, false);
    const turn8 = new Road(turnSpline8, 1, speedLimit, laneWidth, false);

    const pathLanes: IntersectionTurn[] = [];

    const appendPathLane = (lane: Road, from: number, to: number) => {
      pathLanes.push({
        road: lane,
        from,
        to
      });
    };

    appendPathLane(road1, 0, 2);
    appendPathLane(road2, 3, 1);

    appendPathLane(turn1, 0, 3);
    appendPathLane(turn2, 1, 0);
    appendPathLane(turn3, 2, 1);
    appendPathLane(turn4, 3, 2);

    appendPathLane(turn5, 0, 1);
    appendPathLane(turn6, 1, 2);
    appendPathLane(turn7, 2, 3);
    appendPathLane(turn8, 3, 0);

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

    const pos = vector2FromVector3(this.pos);
    vec2.scale(pos, 2, pos);
    pos[0] += (this.intersectionLength / 2) * devicePixelRatio;

    spline.moveTo(pos);

    road.recomputePoints();
  }
}
