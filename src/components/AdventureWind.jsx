import { useEffect, useRef } from 'react';

export default function AdventureWind() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const ctx = canvas.getContext('2d');
    let width = 0;
    let height = 0;
    let time = 0;
    let frameId = 0;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const resize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = -60; i < 60; i += 1) {
        const alpha = 0.06 + Math.abs(i) * 0.0012;
        ctx.strokeStyle = `rgba(255, 248, 230, ${alpha})`;
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(0, height * 0.42);

        for (let j = 0; j < width; j += 10) {
          ctx.lineTo(
            10 * Math.sin(i / 10) + j + 0.008 * j * j,
            Math.floor(
              height * 0.42
              + (j / 2) * Math.sin(j / 50 - time / 50 - i / 118)
              + i * 0.9 * Math.sin(j / 25 - (i + time) / 65),
            ),
          );
        }

        ctx.stroke();
      }
    };

    const tick = () => {
      if (!reducedMotion) {
        time += 1.6;
      }
      draw();
      if (!reducedMotion) {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    resize();
    window.addEventListener('resize', resize);
    tick();

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="adventure-wind__canvas" aria-hidden="true" />;
}
