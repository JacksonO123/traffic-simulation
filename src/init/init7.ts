import { Simulation, Spline2d, color, splinePoint2d, vector2, vertex } from 'simulationjsv2';
import { SP } from '../types/traffic';
import { TrafficEngine } from '../engine/engine';
import { Car, Road, TrafficLight, laneLines, speedLines } from '../engine/road';
import { carHeight, laneColor } from '../engine/constants';

export const init = (engine: TrafficEngine, canvas: Simulation) => {
  const roadSpline = new Spline2d(
    vertex(100, -400, 0, laneColor),
    [splinePoint2d(vertex(300, 0), vector2(1), vector2(-100, 0))],
    100
  );

  const roadSpline2 = new Spline2d(vertex(0, 0, 0, laneColor), [
    splinePoint2d(vertex(300, 0), vector2(1), vector2())
  ]);

  canvas.add(roadSpline);
  canvas.add(roadSpline2);

  const road = new Road(roadSpline, 4, 20, carHeight, true);
  const road2 = new Road(roadSpline2, 4, 20, carHeight, true);
  const intersection = new TrafficLight(vector2(700, -400), 4, carHeight, true);

  intersection.addPaths(canvas);
  intersection.connectRoadEnd(road, 3, 200);
  intersection.connectRoadStart(road2, 1);

  canvas.add(laneLines.getCollection());
  canvas.add(speedLines);

  const dir = SP.START;
  // const dir = SP.END;

  const car = new Car(1, dir, color(0, 123, 255));
  canvas.add(car);
  car.setRoute([road, intersection, road2]);
  // car.setRoute([road]);
  // car.setMaxSpeed(1);
  // car.setMaxSpeed(6);
  car.setMaxSpeed(3);
  engine.addCar(car);

  const car2 = new Car(0, SP.END, color(0, 123, 255));
  canvas.add(car2);
  car2.setRoute([road, intersection, road2]);
  // car2.setRoute([road]);
  // car2.setMaxSpeed(1);
  // car2.setMaxSpeed(6);
  car2.setMaxSpeed(3);
  // car2.startAt(0);
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
