import { cloneBuf, distance2d, vec2 } from 'simulationjsv2';
import { Car } from './road';
import {
  brakingDistance,
  fps60Delay,
  laneChangeMinDist,
  laneChangeMinFrontDist,
  stopDistance
} from '../constants';

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
    const res: Car[] = [];

    for (let i = 0; i < this.cars.length; i++) {
      if (this.cars[i] === car) continue;
      if (this.cars[i].getLane() !== car.getLane()) continue;

      const dist = distance2d(car.getPos(), this.cars[i].getPos());

      if (dist > brakingDistance + stopDistance) {
        continue;
      }

      const directionVec = car.getDirectionVector();
      const posVec = cloneBuf(this.cars[i].getPos());
      vec2.sub(posVec, car.getPos(), posVec);

      const dot = vec2.dot(directionVec, posVec);

      if (dot > 0) {
        let insertIndex = 0;

        for (let j = 0; j < res.length; j++) {
          const sortDist = distance2d(car.getPos(), res[j].getPos());
          if (dist < sortDist) {
            insertIndex = j;
            break;
          }
        }

        res.splice(insertIndex, 0, this.cars[i]);
      }
    }

    return res;
  }

  // private getCarsInDistance(car: Car, dist: number) {
  //   const res: Car[] = [];

  //   for (let i = 0; i < this.cars.length; i++) {
  //     if (car === this.cars[i]) continue;

  //     const carDist = distance2d(car.getPos(), this.cars[i].getPos());

  //     if (carDist < dist) {
  //       res.push(this.cars[i]);
  //     }
  //   }

  //   return res;
  // }

  private getCarsInLane(car: Car, lane: number) {
    const res: Car[] = [];

    for (let i = 0; i < this.cars.length; i++) {
      if (car === this.cars[i]) continue;
      if (this.cars[i].getLane() !== lane) continue;

      res.push(this.cars[i]);
    }

    return res;
  }

  private checkLaneAvailability(car: Car, toLane: number): [boolean, number] {
    const pos = car.getPos();
    const cars = this.getCarsInLane(car, toLane).sort((a, b) => {
      const distA = distance2d(pos, a.getPos());
      const distB = distance2d(pos, b.getPos());

      return distA - distB;
    });

    if (cars.length === 0) {
      return [true, Infinity];
    }

    const dist = distance2d(car.getPos(), cars[0].getPos());
    const directionVec = car.getDirectionVector();
    const posVec = cloneBuf(cars[0].getPos());
    vec2.sub(posVec, car.getPos(), posVec);
    const dot = vec2.dot(directionVec, posVec);

    if (dot > 0) {
      if (dist <= laneChangeMinFrontDist) {
        return [false, dist];
      }
    } else {
      if (dist <= laneChangeMinDist) {
        return [false, dist];
      }
    }

    return [true, dist];
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
      if (this.cars[i].wantsLaneChange()) {
        const toLane = this.getLaneChange(this.cars[i]);

        if (toLane > -1) {
          this.cars[i].setLane(toLane);
        }
      }

      const nearbyCars = this.getObstaclesAhead(this.cars[i]);

      this.cars[i].setObstaclesAhead(nearbyCars);
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
