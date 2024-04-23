import {
  Simulation,
  Spline2d,
  color,
  colorf,
  continuousSplinePoint2d,
  splinePoint2d,
  vector2,
  vertex
} from 'simulationjsv2';
import { SP } from '../types/traffic';
import { TrafficEngine } from '../engine/engine';
import { Car, Road, laneLines } from '../engine/road';
import { carHeight } from '../constants';

export const init = (engine: TrafficEngine, canvas: Simulation) => {
  const roadSpline = new Spline2d(
    vertex(100, -75, 0, colorf(75)),
    [
      splinePoint2d(vertex(500, -400), vector2(400), vector2(-400)),
      continuousSplinePoint2d(vertex(500, -800), vector2(400))
    ],
    100
  );

  canvas.add(roadSpline);

  const road = new Road(roadSpline, 3, 12, carHeight, false);

  canvas.add(laneLines.getCollection());

  const car = new Car(1, SP.START, color(0, 123, 255));
  canvas.add(car);
  car.addToRoute(road);
  car.setMaxSpeed(12);
  engine.addCar(car);

  // const car2 = new Car(0, SP.START, color(255), false, false);
  // canvas.add(car2);
  // car2.addToRoute(road);
  // car2.startAt(0.5);
  // car2.setMaxSpeed(1);
  // engine.addCar(car2);

  // const car3 = new Car(1, SP.START, color(255));
  // canvas.add(car3);
  // car3.addToRoute(road);
  // car3.startAt(0.5);
  // car3.setMaxSpeed(1);
  // engine.addCar(car3);

  // const car4 = new Car(2, SP.START, color(255), false, false);
  // canvas.add(car4);
  // car4.addToRoute(road);
  // car4.startAt(0.5);
  // car4.setMaxSpeed(1);
  // engine.addCar(car4);

  const car2 = new Car(1, SP.START, color(255), false, false);
  canvas.add(car2);
  car2.addToRoute(road);
  car2.startAt(0.4);
  car2.setMaxSpeed(1);
  engine.addCar(car2);

  const car3 = new Car(0, SP.START, color(255));
  canvas.add(car3);
  car3.addToRoute(road);
  car3.startAt(0.55);
  car3.setMaxSpeed(1);
  engine.addCar(car3);

  const car5 = new Car(2, SP.START, color(255));
  canvas.add(car5);
  car5.addToRoute(road);
  car5.startAt(0.45);
  car5.setMaxSpeed(1);
  engine.addCar(car5);

  const car4 = new Car(1, SP.START, color(255), false, false);
  canvas.add(car4);
  car4.addToRoute(road);
  car4.startAt(0.7);
  car4.setMaxSpeed(1);
  engine.addCar(car4);
};
