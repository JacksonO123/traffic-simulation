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

  const road = new Road(roadSpline, 3, 20, carHeight);

  canvas.add(laneLines);

  const car = new Car(0, 'start', color(0, 123, 255));
  canvas.add(car);
  car.addToRoute(road);
  car.setMaxSpeed(8);
  engine.addCar(car);

  const car2 = new Car(0, 'start', color(255));
  canvas.add(car2);
  car2.addToRoute(road);
  car2.startAt(0.5);
  // car2.setMaxSpeed(2);
  engine.addCar(car2);

  // setTimeout(() => {
  //   car2.setMaxSpeed(10);
  // }, 4000);

  // setTimeout(() => {
  //   car.setLane(1);
  // }, 2000);
};
