import {
  Simulation,
  Spline2d,
  color,
  continuousSplinePoint2d,
  splinePoint2d,
  vector2,
  vertex
} from 'simulationjsv2';
import { TrafficEngine } from '../engine/engine';
import { Car, Road, StopSign, laneLines } from '../engine/road';
import { carHeight, laneColor } from '../engine/constants';

export const init = (engine: TrafficEngine, canvas: Simulation) => {
  const roadSpline = new Spline2d(
    vertex(100, -150, 0, laneColor),
    [
      splinePoint2d(vertex(1000, -400), vector2(800), vector2(200, 400)),
      continuousSplinePoint2d(vertex(), vector2())
    ],
    100
  );

  const roadSpline2 = new Spline2d(vertex(0, 0, 0, laneColor), [
    splinePoint2d(vertex(500, -200), vector2(200), vector2(0, 200)),
    continuousSplinePoint2d(vertex(0, -400), vector2(200))
  ]);

  canvas.add(roadSpline);
  canvas.add(roadSpline2);

  // const road = new Road(roadSpline, 2, 20, carHeight, false);
  // const road2 = new Road(roadSpline2, 2, 20, carHeight, false);
  // const intersection = new StopSignIntersection(vector2(500, -600), 2, carHeight, false);

  const road = new Road(roadSpline, 4, 20, carHeight, true);
  const road2 = new Road(roadSpline2, 4, 20, carHeight, true);
  const intersection = new StopSign(vector2(1000, -1200), 4, carHeight, true);

  intersection.addPaths(canvas);
  intersection.connectRoadEnd(road, 0, 200);
  intersection.connectRoadStart(road2, 1);

  canvas.add(laneLines.getCollection());

  const car = new Car(1, color(0, 123, 255));
  canvas.add(car);
  car.setRoute([road2, intersection, road]);
  // car.setRoute([road]);
  // car.setMaxSpeed(1);
  // car.setMaxSpeed(6);
  car.setMaxSpeed(3);
  engine.addCar(car);

  let pressing = false;

  document.addEventListener('keydown', () => {
    pressing = !pressing;

    if (pressing) {
      car.setMaxSpeed(6);
    } else {
      car.setMaxSpeed(1);
    }
  });
};
