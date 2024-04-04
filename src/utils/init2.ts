import { Simulation, color } from 'simulationjsv2';
import { TrafficEngine } from './engine';
import { Car, Road } from './road';

export const init = (engine: TrafficEngine, canvas: Simulation, road: Road) => {
  const car = new Car(0, 'start', color(0, 123, 255));
  canvas.add(car);
  car.addToRoute(road);
  car.setMaxSpeed(5);
  engine.addCar(car);

  const car2 = new Car(0, 'start', color(255));
  canvas.add(car2);
  car2.addToRoute(road);
  car2.startAt(0.5);
  engine.addCar(car2);

  setTimeout(() => {
    car2.setMaxSpeed(10);
  }, 4000);
};
