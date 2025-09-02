import { Simulation, Camera, vector3, colorf } from 'simulationjsv2';
import { createSignal, onMount } from '@jacksonotto/pulse';
import './Traffic.css';
import { init as init2 } from '../init/init2';
import { init as init3 } from '../init/init3';
import { init as init4 } from '../init/init4';
import { init as init5 } from '../init/init5';
import { init as init6 } from '../init/init6';
import { init as init7 } from '../init/init7';
import { TrafficEngine } from '../engine/engine';

const Traffic = () => {
  const canvasId = 'simulation';
  const initFns = [init2, init3, init4, init5, init6, init7];
  const [currentScene, setCurrentScene] = createSignal(-1);
  const engine = new TrafficEngine();
  let canvas: Simulation | null = null;

  const start = () => {
    canvas = new Simulation(canvasId, new Camera(vector3()), true);
    window.canvas = canvas;

    canvas.start();
    canvas.fitElement();
    canvas.setBackground(colorf(0));
  };

  const renderInit = (index: number) => {
    if (!canvas) return;
    if (index < 0 || index >= initFns.length) return;
    if (index === currentScene()) return;

    localStorage.setItem('init-index', index + '');

    setCurrentScene(index);
    restartScene();
  };

  const restartScene = () => {
    if (!canvas) return;

    canvas.empty();
    engine.empty();
    initFns[currentScene()](engine, canvas);
    engine.start();
  };

  onMount(() => {
    start();
    const lastScene = localStorage.getItem('init-index');
    renderInit(lastScene ? +lastScene : 0);
  });

  return (
    <div class="wrapper">
      <div class="tabs">
        {initFns.map((_, index) =>
          currentScene() === index ? (
            <button
              class="restart"
              onClick={restartScene}
            >
              Restart
            </button>
          ) : (
            <button onClick={() => renderInit(index)}>Init {index}</button>
          )
        )}
      </div>
      <canvas
        class="simulation"
        id={canvasId}
      />
    </div>
  );
};

export default Traffic;
