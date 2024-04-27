import { Simulation, Camera, vector3, colorf } from 'simulationjsv2';
import { onMount } from '@jacksonotto/pulse';
import './Traffic.css';
import { TrafficEngine } from '../engine/engine';
// import { init } from '../utils/init3';
// import { init } from '../utils/init4';
import { init } from '../utils/init2';

const Traffic = () => {
  const canvasId = 'simulation';

  const start = () => {
    const canvas = new Simulation(canvasId, new Camera(vector3()), true);

    canvas.start();
    canvas.fitElement();
    canvas.setBackground(colorf(0));

    const engine = new TrafficEngine();

    init(engine, canvas);

    engine.start();
  };

  onMount(() => {
    start();
  });

  return (
    <canvas
      class="simulation"
      id={canvasId}
    />
  );
};

export default Traffic;
