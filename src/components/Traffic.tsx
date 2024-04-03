import {
  Simulation,
  Camera,
  Spline2d,
  vector2,
  vector3,
  splinePoint2d,
  vertex,
  color,
  continuousSplinePoint2d,
  frameLoop,
  colorf
} from 'simulationjsv2';
import { onMount } from '@jacksonotto/pulse';
import './Traffic.css';
import { Car, Road } from '../utils/road';

const Traffic = () => {
  const canvasId = 'simulation';

  onMount(() => {
    const canvas = new Simulation(canvasId, new Camera(vector3()), true);

    canvas.start();
    canvas.fitElement();
    canvas.setBackground(colorf(0));

    const roadSpline = new Spline2d(
      vertex(100, -100, 0, colorf(255)),
      [
        splinePoint2d(vertex(500, -400), vector2(400), vector2(-400)),
        continuousSplinePoint2d(vertex(500, -800), vector2(400))
      ],
      100
    );

    roadSpline.setWireframe(true);
    canvas.add(roadSpline);

    const road = new Road(roadSpline, 3, 25);

    const car = new Car(0, 'start', color(0, 123, 255));
    canvas.add(car);
    car.addToRoute(road);
    car.setSpeed(10);

    const car2 = new Car(1, 'start', color(255));
    canvas.add(car2);
    car2.addToRoute(road);
    car2.setSpeed(8);

    const car3 = new Car(2, 'start', color(0, 255));
    canvas.add(car3);
    car3.addToRoute(road);
    car3.setSpeed(6);

    frameLoop(() => {
      car.travel();
      car2.travel();
      car3.travel();
    })();
  });

  return (
    <canvas
      class="simulation"
      id={canvasId}
    />
  );
};

export default Traffic;
