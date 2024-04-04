import {
  Simulation,
  Camera,
  Spline2d,
  vector2,
  vector3,
  splinePoint2d,
  vertex,
  continuousSplinePoint2d,
  colorf
} from 'simulationjsv2';
import { onMount } from '@jacksonotto/pulse';
import './Traffic.css';
import { Road } from '../utils/road';
import { TrafficEngine } from '../utils/engine';
import { init } from '../utils/init2';

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

    const engine = new TrafficEngine();

    init(engine, canvas, road);

    engine.start();
  });

  return (
    <canvas
      class="simulation"
      id={canvasId}
    />
  );
};

export default Traffic;
