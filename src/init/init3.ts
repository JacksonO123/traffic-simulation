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

export const init = (engine: TrafficEngine, canvas: Simulation) => {
  const roadSpline = new Spline2d(vertex(400, -150, 0, colorf(75)), [
    splinePoint2d(vertex(1000, -500), vector2(600), vector2(-800)),
    continuousSplinePoint2d(vertex(1000, -1200), vector2(800))
  ]);

  const tempSpline = new Spline2d(vertex(0, -150, 0, color(255)), [
    splinePoint2d(vertex(400), vector2(1), vector2(-1))
  ]);
  canvas.add(tempSpline);
  const tempRoad = new Road(tempSpline, 4, 20, carHeight, true);

  canvas.add(roadSpline);

  const road = new Road(roadSpline, 4, 20, carHeight, true);

  canvas.add(laneLines.getCollection());

  const car = new Car(0, color(0, 123, 255));
  canvas.add(car);
  // car.setRoute([road, tempRoad]);
  car.setRoute([tempRoad, road]);
  // car.addToRoute(road);
  car.setMaxSpeed(8);
  // car.startAt(0.8);
  engine.addCar(car);

  setTimeout(() => {
    car.setLane(1);
  }, 1000);
};
