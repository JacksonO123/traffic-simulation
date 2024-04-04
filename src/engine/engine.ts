import { cloneBuf, distance2d, vec2 } from 'simulationjsv2';
import { Car } from './road';
import { brakingDistance, stopDistance } from '../constants';

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

  tick() {
    for (let i = 0; i < this.cars.length; i++) {
      const nearbyCars = this.getCarsAhead(this.cars[i]);

      this.cars[i].setNearbyCars(nearbyCars);
      this.cars[i].travel();
    }
  }

  start() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    const run = () => {
      this.tick();
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
