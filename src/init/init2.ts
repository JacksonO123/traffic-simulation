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
import { Car, Road, debugCollection, laneLines } from '../engine/road';
import { carHeight } from '../engine/constants';

export const init = (engine: TrafficEngine, canvas: Simulation) => {
  const roadSpline = new Spline2d(
    vertex(100, -150, 0, colorf(75)),
    [
      splinePoint2d(vertex(1000, -600), vector2(800), vector2(-800)),
      continuousSplinePoint2d(vertex(1100, -1300), vector2(800))
    ],
    100
  );

  canvas.add(roadSpline);

  const road = new Road(roadSpline, 3, 15, carHeight, false);

  canvas.add(laneLines.getCollection());
  canvas.add(debugCollection);

  // const points = road.getRoadPoints(1);
  // points.forEach((point) => {
  //   const pos = vec2.add(point, road.getSpline().getPos()) as Vector2;
  //   vec2.scale(pos, 1 / devicePixelRatio, pos);
  //   const circle = new Circle(pos, 2, colorf(255));
  //   canvas.add(circle);
  // });

  const car = new Car(1, color(0, 123, 255));
  canvas.add(car);
  car.addToRoute(road);
  car.setMaxSpeed(5);
  engine.addCar(car);

  const carSpeed = 1;

  const car2 = new Car(1, color(255), false, false);
  canvas.add(car2);
  car2.addToRoute(road);
  car2.startAt(0.4);
  car2.setMaxSpeed(carSpeed);
  engine.addCar(car2);

  const car3 = new Car(0, color(255));
  canvas.add(car3);
  car3.addToRoute(road);
  car3.startAt(0.55);
  car3.setMaxSpeed(carSpeed);
  engine.addCar(car3);

  const car5 = new Car(2, color(255));
  canvas.add(car5);
  car5.addToRoute(road);
  car5.startAt(0.45);
  car5.setMaxSpeed(carSpeed);
  engine.addCar(car5);

  const car4 = new Car(1, color(255), false, false);
  canvas.add(car4);
  car4.addToRoute(road);
  car4.startAt(0.7);
  car4.setMaxSpeed(carSpeed);
  engine.addCar(car4);
};
