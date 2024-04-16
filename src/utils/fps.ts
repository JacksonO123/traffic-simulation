export const sampleFrameDiffs = (frames = 30) => {
  return new Promise<number>((resolve) => {
    let sampledFrames = 0;
    let startAbsolute = 0;
    let start = 0;
    let totalDiffs = 0;

    const sample = () => {
      const now = performance.now();
      const diff = now - start;
      totalDiffs += diff;
      start = now;

      if (sampledFrames < frames) {
        sampledFrames++;
        requestAnimationFrame(sample);
      } else {
        const avg = totalDiffs / frames;

        resolve(avg);
      }
    };

    const startSample = () => {
      startAbsolute = performance.now();
      start = performance.now();
      window.requestAnimationFrame(sample);
    };

    window.requestAnimationFrame(startSample);
  });
};
