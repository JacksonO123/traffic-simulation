import { Simulation, Spline2d, color, colorf, splinePoint2d, vector2, vertex } from 'simulationjsv2';
import { TrafficEngine } from '../engine/engine';
import { Car, Road, laneLines } from '../engine/road';
import { carHeight } from '../constants';

export const init = (engine: TrafficEngine, canvas: Simulation) => {
  const roadSpline1 = new Spline2d(
    vertex(400, -75, 0, colorf(75)),
    [splinePoint2d(vertex(500, -400), vector2(400), vector2(-400))],
    100
  );

  const roadSpline2 = new Spline2d(
    vertex(900, -475, 0, colorf(75)),
    [splinePoint2d(vertex(400, -375), vector2(400), vector2(200))],
    100
  );

  const roadSpline3 = new Spline2d(
    vertex(1300, -850, 0, colorf(75)),
    [splinePoint2d(vertex(-900, 775), vector2(-600), vector2(-800))],
    100
  );

  canvas.add(roadSpline1);
  canvas.add(roadSpline2);
  canvas.add(roadSpline3);

  const road1 = new Road(roadSpline1, 3, 20, carHeight);
  const road2 = new Road(roadSpline2, 3, 20, carHeight);
  const road3 = new Road(roadSpline3, 3, 20, carHeight);

  canvas.add(laneLines);

  const car = new Car(0, 'start', color(0, 123, 255), true);
  canvas.add(car);
  car.addToRoute(road1);
  car.addToRoute(road2);
  car.addToRoute(road3);
  car.setMaxSpeed(4);
  engine.addCar(car);

  // const car2 = new Car(0, 'start', color(255));
  // canvas.add(car2);
  // car2.addToRoute(road1);
  // car2.startAt(0.5);
  // // car2.setMaxSpeed(1);
  // engine.addCar(car2);

  // setTimeout(() => {
  //   car2.setMaxSpeed(10);
  // }, 4000);

  // setTimeout(() => {
  //   car.setLane(1);
  // }, 2000);
};
