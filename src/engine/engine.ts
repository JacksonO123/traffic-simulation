import { cloneBuf, distance2d, vec2 } from 'simulationjsv2';
import { Car } from './road';
import { brakingDistance, fps60Delay, stopDistance } from '../constants';

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

  private getCarsAhead(car: Car) {
    const res: Car[] = [];

    for (let i = 0; i < this.cars.length; i++) {
      if (this.cars[i] === car) continue;
      if (this.cars[i].getLane() !== car.getLane()) continue;

      const dist = distance2d(car.getPos(), this.cars[i].getPos());

      if (dist > brakingDistance + stopDistance) continue;

      const directionVec = car.getDirectionVector();
      const posVec = cloneBuf(this.cars[i].getPos());
      vec2.sub(posVec, car.getPos(), posVec);

      const dot = vec2.dot(directionVec, posVec);

      if (dot > 0) {
        let insertIndex = 0;

        for (let j = 0; j < res.length; j++) {
          const sortDist = distance2d(car.getPos(), res[j].getPos());
          if (dist < sortDist) break;
        }

        res.splice(insertIndex, 0, this.cars[i]);
      }
    }

    return res;
  }

  private getLaneChange(_car: Car) {
    return 1;
  }

  tick(scale: number) {
    for (let i = 0; i < this.cars.length; i++) {
      if (this.cars[i].wantsLaneChange()) {
        const toLane = this.getLaneChange(this.cars[i]);

        if (toLane > -1) {
          this.cars[i].setLane(toLane);
        }
      }

      const nearbyCars = this.getCarsAhead(this.cars[i]);

      this.cars[i].setCarsAhead(nearbyCars);
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
