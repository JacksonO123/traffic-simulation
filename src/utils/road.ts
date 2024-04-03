import { Color, Spline2d, Square, Vector2, cloneBuf, distance2d, vec2, vector2 } from 'simulationjsv2';
import { StartingPoint } from '../types/road';

export class Car extends Square {
  private speed: number;
  private lane;
  private currentRoad: number;
  private route: Road[];
  private startPoint: StartingPoint;
  private currentPoint: Vector2;
  private pointIndex: number;
  private roadPoints: Vector2[];

  constructor(lane: number, startPoint: StartingPoint, color?: Color) {
    const width = 50;
    const height = 25;

    super(vector2(), width, height, color, 0, vector2(0.5, 0.5));

    this.speed = 0;
    this.lane = lane;
    this.route = [];
    this.startPoint = startPoint;
    this.currentRoad = 0;
    this.currentPoint = vector2();
    this.pointIndex = 0;
    this.roadPoints = [];
  }

  getLane() {
    return this.lane;
  }

  setSpeed(speed: number) {
    this.speed = speed;
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
  }

  addToRoute(road: Road) {
    if (this.startPoint === 'start') {
      this.route.push(road);
    } else {
      this.route.unshift(road);
    }

    console.log(this.route.length);
    if (this.route.length === 1) {
      this.routeUpdated();

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

  travel() {
    let toPoint = cloneBuf(this.currentPoint);
    vec2.add(toPoint, this.route[this.currentRoad].getSpline().getPos(), toPoint);

    let toTravel = this.speed;

    let pos = this.getPos();
    let rotation = Math.atan2(toPoint[1] - pos[1], toPoint[0] - pos[0]);

    let dist = distance2d(pos, toPoint);

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
        toPoint = cloneBuf(this.currentPoint);
        vec2.add(toPoint, this.route[this.currentRoad].getSpline().getPos(), toPoint);
        rotation = Math.atan2(toPoint[1] - pos[1], toPoint[0] - pos[0]);
        dist = distance2d(pos, toPoint);
      }
    }
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
