import { Vector2, cloneBuf, distance2d, vec2 } from 'simulationjsv2';
import { Car, Intersection } from './road';
import {
  fps60Delay,
  intersectionRegisterDist,
  laneChangeMinDist,
  laneChangeMinFrontDist,
  speedUpCutoffRotation
} from './constants';
import { ContinueState, LaneObstacle, Obstacle, SP } from '../types/traffic';
import { brakingDistance, stopDistance } from './params';
import { closestRoadPoint, splineDistPoint, vec2Angle } from '../utils/utils';

export class TrafficEngine {
  private cars: Car[];
  private animationId: number | null;

  constructor() {
    this.cars = [];
    this.animationId = null;
  }

  setCars(cars: Car[]) {
    this.cars = [...cars];
  }

  addCar(car: Car) {
    this.cars.push(car);
  }

  private getObstaclesAhead(car: Car) {
    const res: Obstacle[] = [];

    for (let i = 0; i < this.cars.length; i++) {
      if (this.cars[i] === car) continue;

      if (this.cars[i].getLane() !== car.getLane()) {
        if (this.cars[i].isChangingLanes()) {
          if (this.cars[i].getChangingFrom() !== car.getLane()) continue;
        } else {
          continue;
        }

        continue;
      }

      const dist = distance2d(car.getPos(), this.cars[i].getPos());

      if (dist > brakingDistance + stopDistance) {
        continue;
      }

      const directionVec = car.getDirectionVector();
      const posVec = cloneBuf(this.cars[i].getPos());
      vec2.sub(posVec, car.getPos(), posVec);

      const dot = vec2.dot(directionVec, posVec);

      if (dot < 0) continue;

      let insertIndex = 0;

      for (let j = 0; j < res.length; j++) {
        const sortDist = distance2d(car.getPos(), res[j].point);
        if (dist < sortDist) {
          insertIndex = j;
          break;
        }
      }

      res.splice(insertIndex, 0, {
        point: this.cars[i].getPos(),
        speed: this.cars[i].getSpeed(),
        isIntersection: false
      });
    }

    const route = [...car.getRoute()];
    const index = car.getRoadIndex();
    const nextRoad = route[index + (car.getStartPoint() === SP.START ? 1 : -1)];

    if (nextRoad instanceof Intersection) {
      const roadAfter = route[index + (car.getStartPoint() === SP.START ? 2 : -2)];
      const point = nextRoad.canContinue(car, res, route[index], roadAfter);

      if (point === ContinueState.CONTINUE || point === ContinueState.NO_PATH) {
        return res;
      } else {
        const path = route[index].getRoadPoints(car.getAbsoluteLane());
        const splinePos = route[index].getSpline().getPos();
        const carPos = vec2.sub(car.getPos(), splinePos) as Vector2;
        const closestPoint = closestRoadPoint(path, carPos)!;
        const dist = splineDistPoint(path, closestPoint, point);

        if (dist <= intersectionRegisterDist && !nextRoad.isRegistered(car)) {
          nextRoad.register(car);
        }

        res.unshift({ point, speed: 0, isIntersection: true });
      }
    }

    return res;
  }

  private getCarsInLane(car: Car, lane: number) {
    const res: Car[] = [];

    for (let i = 0; i < this.cars.length; i++) {
      if (car === this.cars[i]) continue;
      if (this.cars[i].getLane() !== lane) continue;

      res.push(this.cars[i]);
    }

    return res;
  }

  private checkLaneAvailability(car: Car, toLane: number): [boolean, number, LaneObstacle | null] {
    const road = car.getCurrentRoad();

    if (!road.laneInRange(toLane)) return [false, 0, null];

    const pos = car.getPos();
    const cars = this.getCarsInLane(car, toLane).sort((a, b) => {
      const distA = distance2d(pos, a.getPos());
      const distB = distance2d(pos, b.getPos());

      return distA - distB;
    });

    if (cars.length === 0) {
      return [true, Infinity, null];
    }

    const dist = distance2d(car.getPos(), cars[0].getPos());
    const directionVec = car.getDirectionVector();
    const posVec = cloneBuf(car.getPos());
    vec2.sub(posVec, cars[0].getPos(), posVec);
    const dot = vec2.dot(directionVec, posVec);
    const angle = Math.abs(vec2Angle(directionVec, posVec) - Math.PI / 2);
    const behind = angle < speedUpCutoffRotation;

    const obstaleInfo = { obstacle: cars[0], behind };

    if (dot > 0) {
      if (dist <= laneChangeMinFrontDist) {
        return [false, dist, obstaleInfo];
      }
    } else {
      if (dist <= laneChangeMinDist) {
        return [false, dist, obstaleInfo];
      }
    }

    return [true, dist, null];
  }

  private getLaneChange(car: Car) {
    const lane = car.getLane();
    const road = car.getCurrentRoad();
    const numLanes = road.getNumLanes();

    let toLane = lane;
    let mergeDist = 0;

    if (lane > 0) {
      const [canMerge, dist] = this.checkLaneAvailability(car, lane - 1);

      if (canMerge) {
        toLane = lane - 1;
        mergeDist = dist;
      }
    }

    if (lane < numLanes - 1) {
      const [canMerge, dist] = this.checkLaneAvailability(car, lane + 1);

      if (canMerge && dist > mergeDist) {
        toLane = lane + 1;
      }
    }

    return toLane;
  }

  tick(scale: number) {
    for (let i = 0; i < this.cars.length; i++) {
      if (!this.cars[i].inIntersection()) {
        const [wantsChange, targetLane] = this.cars[i].wantsLaneChange();

        if (wantsChange) {
          let toLane: number = -1;

          if (targetLane === null) {
            toLane = this.getLaneChange(this.cars[i]);
          } else {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const [canChange, _, obstacle] = this.checkLaneAvailability(this.cars[i], targetLane);

            if (canChange) {
              toLane = targetLane;
            } else if (obstacle !== null) {
              this.cars[i].setLaneObstacle(obstacle);
            }
          }

          if (toLane > -1) {
            this.cars[i].setLane(toLane);
          }
        }
      }

      const obstaclesAhead = this.getObstaclesAhead(this.cars[i]);

      this.cars[i].setObstaclesAhead(obstaclesAhead);
      this.cars[i].travel(scale);
    }
  }

  start() {
    let start = performance.now() - 10;

    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    const run = () => {
      const now = performance.now();
      const diff = now - start;
      const scale = diff / fps60Delay;
      start = now;

      this.tick(scale);

      this.animationId = requestAnimationFrame(run);
    };

    run();
  }

  stop() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}
