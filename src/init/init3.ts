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
import { carHeight } from '../engine/constants';
import { SP } from '../types/traffic';

export const init = (engine: TrafficEngine, canvas: Simulation) => {
  const roadSpline = new Spline2d(
    vertex(100, -150, 0, colorf(75)),
    [
      splinePoint2d(vertex(1000, -500), vector2(600), vector2(-800)),
      continuousSplinePoint2d(vertex(1000, -1200), vector2(800))
    ],
    100
  );

  canvas.add(roadSpline);

  const road = new Road(roadSpline, 4, 20, carHeight, true);

  canvas.add(laneLines.getCollection());

  const car = new Car(0, SP.END, color(0, 123, 255));
  canvas.add(car);
  car.addToRoute(road);
  car.setMaxSpeed(8);
  engine.addCar(car);

  setTimeout(() => {
    car.setLane(1);
  }, 1000);
};
