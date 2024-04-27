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
import { Car, Road, StopSignIntersection, laneLines, testLines } from '../engine/road';
import { carHeight, laneColor } from '../engine/constants';

export const init = (engine: TrafficEngine, canvas: Simulation) => {
  const roadSpline = new Spline2d(
    vertex(100, -75, 0, laneColor),
    [
      splinePoint2d(vertex(500, -400), vector2(400), vector2(100, 200)),
      continuousSplinePoint2d(vertex(), vector2())
    ],
    100
  );

  const roadSpline2 = new Spline2d(vertex(0, 0, 0, laneColor), [
    splinePoint2d(vertex(250, -100), vector2(100), vector2(0, 100)),
    continuousSplinePoint2d(vertex(0, -200), vector2(100))
  ]);

  canvas.add(roadSpline);
  canvas.add(roadSpline2);

  const road = new Road(roadSpline, 2, 20, carHeight, true);
  const road2 = new Road(roadSpline2, 2, 20, carHeight, true);
  const intersection = new StopSignIntersection(vector2(100, -600), 2, carHeight, true);

  intersection.addPaths(canvas);
  intersection.connectRoadEnd(road, 0, 200);
  intersection.connectRoadStart(road2, 1);

  canvas.add(laneLines.getCollection());

  canvas.add(testLines);

  const car = new Car(0, SP.END, color(0, 123, 255));
  canvas.add(car);
  car.setRoute([road, intersection, road2]);
  car.setMaxSpeed(1);
  engine.addCar(car);

  let pressing = false;

  document.addEventListener('keydown', () => {
    pressing = !pressing;

    if (pressing) {
      car.setMaxSpeed(8);
    } else {
      car.setMaxSpeed(1);
    }
  });
};
