import { Simulation, color } from 'simulationjsv2';
import { TrafficEngine } from '../engine/engine';
import { Car, Road } from '../engine/road';
import { SP } from '../types/traffic';

export const init = (engine: TrafficEngine, canvas: Simulation, road: Road) => {
  const car = new Car(0, SP.START, color(0, 123, 255));
  canvas.add(car);
  car.addToRoute(road);
  car.setMaxSpeed(10);
  engine.addCar(car);

  const car2 = new Car(1, SP.START, color(255));
  canvas.add(car2);
  car2.addToRoute(road);
  car2.setMaxSpeed(8);
  engine.addCar(car2);

  const car3 = new Car(2, SP.START, color(0, 255));
  canvas.add(car3);
  car3.addToRoute(road);
  car3.setMaxSpeed(6);
  engine.addCar(car3);
};
