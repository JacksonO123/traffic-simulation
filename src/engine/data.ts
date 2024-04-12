import { Vector2, cloneBuf, easeInOutQuad, vec2 } from 'simulationjsv2';
import { Road } from './road';
import { StartingPoint } from '../types/traffic';
import { minLaneChangeSteps } from '../constants';

export class RoadData {
  private startPoint: StartingPoint;
  private lane: number;
  private loop: boolean;

  private route: Road[];
  private roadIndex: number;

  private roadPoints: Vector2[];
  private roadPointIndex: number;

  private changingLanes: boolean;
  private laneChangePoints: Vector2[];
  private laneChangeIndex: number;

  constructor(lane: number, startPoint: StartingPoint, loop = false) {
    this.startPoint = startPoint;
    this.lane = lane;
    this.loop = loop;

    this.route = [];
    this.roadIndex = 0;

    this.roadPoints = [];
    this.roadPointIndex = 0;

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

  getLookAtPoint() {
    if (this.changingLanes) {
      if (this.startPoint === 'start') {
        if (this.laneChangeIndex < this.laneChangePoints.length - 1) {
          return this.laneChangePoints[this.laneChangeIndex + 1];
        }
      } else {
        return this.laneChangePoints[Math.max(this.laneChangeIndex - 1, 0)];
      }

      return this.laneChangePoints[this.laneChangeIndex];
    }

    if (this.startPoint === 'start') {
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

      const vec = cloneBuf(laneToPoints[index]);
      vec2.sub(vec, laneFromPoints[index], vec);
      vec2.scale(vec, ratio, vec);
      vec2.add(vec, laneFromPoints[index], vec);

      res.push(vec);
    }

    return res;
  }

  setLane(lane: number, currentSpeed: number) {
    this.roadPoints = this.getCurrentRoad().getRoadPoints(lane);

    const laneDist = Math.max(minLaneChangeSteps, 4 * Math.log(currentSpeed));

    this.resetLaneChange(true);
    this.laneChangePoints = this.interpolateLaneChange(laneDist, this.lane, lane);

    this.lane = lane;
  }

  private routeUpdated() {
    if (this.startPoint === 'start') {
      this.roadIndex = 0;
      this.roadPointIndex = 0;
      this.roadPoints = this.getCurrentRoad().getRoadPoints(this.lane);
    } else {
      this.roadIndex = this.route.length - 1;
      this.roadPoints = this.getCurrentRoad().getRoadPoints(this.lane);
      this.roadPointIndex = this.roadPoints.length - 1;
    }
  }

  setRoute(route: Road[]) {
    this.route = route;
    this.routeUpdated();
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

    this.roadPointIndex = index;
  }

  nextPoint() {
    if (this.changingLanes) {
      this.laneChangeIndex++;

      if (this.laneChangeIndex >= this.laneChangePoints.length) {
        this.resetLaneChange(false);
      }
    }

    if (this.roadPointIndex >= this.roadPoints.length) {
      if (this.startPoint === 'start') {
        if (this.roadIndex < this.route.length - 1) {
          this.roadIndex++;

          this.roadPointIndex = 0;
          this.roadPoints = this.getCurrentRoad().getRoadPoints(this.lane);
        } else if (this.loop) {
          this.roadIndex = 0;

          this.roadPointIndex = 0;
          this.roadPoints = this.getCurrentRoad().getRoadPoints(this.lane);
        }
      } else {
        if (this.roadIndex > 0) {
          this.roadIndex--;

          this.roadPoints = this.getCurrentRoad().getRoadPoints(this.lane);
          this.roadPointIndex = this.roadPoints.length - 1;
        } else if (this.loop) {
          this.roadIndex = this.route.length - 1;

          this.roadPoints = this.getCurrentRoad().getRoadPoints(this.lane);
          this.roadPointIndex = this.roadPoints.length - 1;
        }
      }

      return;
    }

    if (this.startPoint === 'start') {
      this.roadPointIndex++;
    } else {
      this.roadPointIndex--;
    }
  }
}
