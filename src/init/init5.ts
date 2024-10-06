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
import { Car, Road, TrafficLight, laneLines } from '../engine/road';
import { carHeight, laneColor } from '../engine/constants';

export const init = (engine: TrafficEngine, canvas: Simulation) => {
  const roadSpline = new Spline2d(
    vertex(100, -150, 0, laneColor),
    [
      splinePoint2d(vertex(1000), vector2(800), vector2(-400, 100)),
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

  const road = new Road(roadSpline, 4, 20, carHeight, true);
  const road2 = new Road(roadSpline2, 4, 20, carHeight, true);
  const intersection = new TrafficLight(vector2(1200, -1000), 4, carHeight, true);

  intersection.addPaths(canvas);
  intersection.connectRoadEnd(road, 0, 200);
  intersection.connectRoadStart(road2, 1);

  canvas.add(laneLines.getCollection());

  // const dir = SP.START;
  const dir = SP.END;

  const car = new Car(1, dir, color(0, 123, 255));
  canvas.add(car);
  car.setRoute([road, intersection, road2]);
  // car.setRoute([road]);
  // car.setMaxSpeed(1);
  // car.setMaxSpeed(6);
  car.setMaxSpeed(3);
  car.startAt(0.95);
  engine.addCar(car);

  const car2 = new Car(0, dir, color(0, 123, 255));
  canvas.add(car2);
  car2.setRoute([road, intersection, road2]);
  // car2.setRoute([road]);
  // car2.setMaxSpeed(1);
  // car2.setMaxSpeed(6);
  car2.setMaxSpeed(3);
  engine.addCar(car2);

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
