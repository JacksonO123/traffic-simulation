import {
  Simulation,
  Spline2d,
  color,
  continuousSplinePoint2d,
  splinePoint2d,
  vector2,
  vertex
} from 'simulationjsv2';
import { SP } from '../types/traffic';
import { TrafficEngine } from '../engine/engine';
import { Car, Road, StopSignIntersection, laneLines } from '../engine/road';
import { carHeight, laneColor } from '../constants';

export const init = (engine: TrafficEngine, canvas: Simulation) => {
  const roadSpline = new Spline2d(
    vertex(100, -75, 0, laneColor),
    [
      splinePoint2d(vertex(500, -400), vector2(400), vector2(100, 200)),
      continuousSplinePoint2d(vertex(600, -775), vector2())
    ],
    100
  );

  canvas.add(roadSpline);

  const road = new Road(roadSpline, 3, 20, carHeight, false);

  const intersection = new StopSignIntersection(vector2(100, -600), 3, carHeight, false);
  intersection.addPaths(canvas);

  intersection.connectRoadEnd(road, 0, 200);

  canvas.add(laneLines.getCollection());

  const car = new Car(1, SP.START, color(0, 123, 255));
  canvas.add(car);
  car.addToRoute(road);
  car.setMaxSpeed(8);
  engine.addCar(car);
};
