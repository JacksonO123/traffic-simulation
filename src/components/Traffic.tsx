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
import { Road, laneLines } from '../engine/road';
import { TrafficEngine } from '../engine/engine';
import { init } from '../utils/init2';
import { carHeight } from '../constants';

const Traffic = () => {
  const canvasId = 'simulation';

  onMount(() => {
    const canvas = new Simulation(canvasId, new Camera(vector3()), true);

    canvas.start();
    canvas.fitElement();
    canvas.setBackground(colorf(0));

    const roadSpline = new Spline2d(
      vertex(100, -75, 0, colorf(75)),
      [
        splinePoint2d(vertex(500, -400), vector2(400), vector2(-400)),
        continuousSplinePoint2d(vertex(500, -800), vector2(400))
      ],
      100
    );

    canvas.add(roadSpline);

    const road = new Road(roadSpline, 3, carHeight);

    canvas.add(laneLines);

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
