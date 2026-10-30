import React, { useEffect, useRef } from 'react';
import { VisualizerMode, useAudioPlayer } from '../context/AudioPlayerContext';

interface AudioVisualizerCanvasProps {
  mode?: VisualizerMode;
  height?: number;
}

export const AudioVisualizerCanvas: React.FC<AudioVisualizerCanvasProps> = ({
  mode = 'wave',
  height = 140,
}) => {
  const { isPlaying, analyserNode } = useAudioPlayer();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const phaseRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let isRunning = true;
    const bufferLength = analyserNode ? analyserNode.frequencyBinCount : 64;
    const dataArray = new Uint8Array(bufferLength);

    const render = () => {
      if (!isRunning) return;

      const width = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, width, h);

      let avgFrequency = 0;
      if (analyserNode && isPlaying) {
        analyserNode.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        avgFrequency = sum / bufferLength;
      }

      // If simulated (e.g. cross-origin CORS audio stream), create lively responsive animation
      if (avgFrequency === 0 && isPlaying) {
        avgFrequency = 50 + Math.sin(phaseRef.current * 2) * 25 + Math.cos(phaseRef.current * 3.5) * 15;
      }

      phaseRef.current += isPlaying ? 0.05 : 0.01;

      if (mode === 'bars') {
        // Frequency Spectrum Bars
        const barCount = 48;
        const barWidth = (width / barCount) - 3;
        const centerY = h / 2;

        for (let i = 0; i < barCount; i++) {
          let barHeight = 6;
          if (isPlaying) {
            if (analyserNode && dataArray[i]) {
              barHeight = Math.max(6, (dataArray[i] / 255) * (h * 0.85));
            } else {
              const waveVal = Math.sin(phaseRef.current * 3 + i * 0.28) * 0.5 + 0.5;
              const secondary = Math.cos(phaseRef.current * 2 + i * 0.15) * 0.5 + 0.5;
              barHeight = Math.max(6, (waveVal * 0.6 + secondary * 0.4) * (h * 0.8));
            }
          }

          const x = i * (barWidth + 3);
          const y = centerY - barHeight / 2;

          // Gradient color: Cyan -> Indigo -> Rose
          const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
          gradient.addColorStop(0, '#06b6d4');
          gradient.addColorStop(0.5, '#6366f1');
          gradient.addColorStop(1, '#ec4899');

          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.roundRect ? ctx.roundRect(x, y, barWidth, barHeight, 3) : ctx.rect(x, y, barWidth, barHeight);
          ctx.fill();
        }
      } else if (mode === 'circle') {
        // Circular Pulsing Visualizer
        const centerX = width / 2;
        const centerY = h / 2;
        const baseRadius = Math.min(centerX, centerY) * 0.45;
        const points = 36;

        ctx.beginPath();
        for (let i = 0; i <= points; i++) {
          const angle = (i / points) * Math.PI * 2;
          let waveAmp = isPlaying ? (Math.sin(phaseRef.current * 4 + i * 0.8) * 12 + (avgFrequency / 255) * 20) : 2;
          const r = baseRadius + waveAmp;
          const x = centerX + Math.cos(angle) * r;
          const y = centerY + Math.sin(angle) * r;

          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();

        const grad = ctx.createRadialGradient(centerX, centerY, 5, centerX, centerY, baseRadius + 30);
        grad.addColorStop(0, 'rgba(6, 182, 212, 0.4)');
        grad.addColorStop(0.6, 'rgba(99, 102, 241, 0.25)');
        grad.addColorStop(1, 'rgba(236, 72, 153, 0)');
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.strokeStyle = '#06b6d4';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      } else {
        // 'wave' Mode - Fluid Layered Harmonic Sine Waves
        const centerY = h / 2;
        const layers = [
          { color: 'rgba(6, 182, 212, 0.85)', freq: 0.02, speed: 1.2, ampFactor: 0.38 },
          { color: 'rgba(99, 102, 241, 0.65)', freq: 0.028, speed: 1.6, ampFactor: 0.28 },
          { color: 'rgba(236, 72, 153, 0.5)', freq: 0.035, speed: 0.8, ampFactor: 0.2 },
        ];

        layers.forEach(({ color, freq, speed, ampFactor }) => {
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.lineWidth = 2.5;
          ctx.lineCap = 'round';

          const maxAmp = isPlaying ? Math.max(8, (avgFrequency / 100) * (h * ampFactor) + 12) : 4;

          for (let x = 0; x <= width; x += 3) {
            const envelope = Math.sin((Math.PI * x) / width);
            const y = centerY + Math.sin(x * freq + phaseRef.current * speed) * maxAmp * envelope;

            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();
        });
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      isRunning = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, analyserNode, mode]);

  return (
    <div className="w-full relative overflow-hidden rounded-2xl bg-stone-950/80 border border-stone-800/80 p-2 shadow-inner">
      <canvas
        ref={canvasRef}
        width={720}
        height={height}
        className="w-full h-full block"
      />
    </div>
  );
};
