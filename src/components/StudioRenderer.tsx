import { useEffect, useRef } from 'react';
import type { StudioPlan } from '../data/studio';

interface StudioRendererProps {
  plan: StudioPlan;
  concept: string;
  generated: boolean;
  label: string;
}

const PALETTES: Record<string, { floor: string; wall: string; accent: string; furniture: string }> = {
  warm: { floor: '#b98757', wall: '#f5ecdf', accent: '#c99b6b', furniture: '#8b6244' },
  modern: { floor: '#a7a9aa', wall: '#f4f4f2', accent: '#727b82', furniture: '#424a50' },
  calm: { floor: '#c1ad94', wall: '#eee7dc', accent: '#a08f7b', furniture: '#776b60' },
};

const ROOM_FURNITURE: Record<string, { width: number; depth: number }> = {
  living: { width: 2.3, depth: 0.9 },
  kitchen: { width: 2.5, depth: 0.75 },
  bedroom: { width: 1.8, depth: 2.1 },
  bathroom: { width: 0.9, depth: 0.65 },
  utility: { width: 0.8, depth: 0.8 },
};

export default function StudioRenderer({ plan, concept, generated, label }: StudioRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const scale = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.round(rect.width * scale);
      canvas.height = Math.round(rect.height * scale);
      context.setTransform(scale, 0, 0, scale, 0, 0);

      const width = rect.width;
      const height = rect.height;
      const palette = PALETTES[concept] ?? PALETTES.warm;
      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, '#f8f3ec');
      gradient.addColorStop(0.55, palette.wall);
      gradient.addColorStop(1, palette.accent);
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      context.save();
      const margin = Math.max(36, width * 0.08);
      const usableWidth = width - margin * 2;
      const usableHeight = height - margin * 1.8;
      const unitScale = Math.min(usableWidth / plan.width, usableHeight / plan.depth);
      const ox = (width - plan.width * unitScale) / 2;
      const oy = margin * 0.85;
      const skew = generated ? 0.22 : 0.12;
      context.transform(1, skew, -0.5, 0.78, height * 0.36, -height * 0.03);

      plan.rooms.forEach((room) => {
        const x = ox + room.x * unitScale;
        const y = oy + room.z * unitScale;
        const roomWidth = room.width * unitScale;
        const roomDepth = room.depth * unitScale;

        context.fillStyle = room.kind === 'bathroom' ? '#d5ddd9' : palette.floor;
        context.globalAlpha = generated ? 1 : 0.78;
        context.fillRect(x, y, roomWidth, roomDepth);
        context.globalAlpha = 1;
        context.strokeStyle = palette.wall;
        context.lineWidth = Math.max(5, unitScale * 0.12);
        context.strokeRect(x, y, roomWidth, roomDepth);

        if (generated) {
          const furniture = ROOM_FURNITURE[room.kind];
          const furnitureWidth = Math.min(furniture.width * unitScale, roomWidth * 0.65);
          const furnitureDepth = Math.min(furniture.depth * unitScale, roomDepth * 0.55);
          context.fillStyle = palette.furniture;
          context.shadowColor = 'rgba(20, 25, 28, .28)';
          context.shadowBlur = 10;
          context.shadowOffsetY = 6;
          context.fillRect(
            x + (roomWidth - furnitureWidth) / 2,
            y + (roomDepth - furnitureDepth) / 2,
            furnitureWidth,
            furnitureDepth
          );
          context.shadowColor = 'transparent';
        }
      });
      context.restore();

      const vignette = context.createLinearGradient(0, 0, 0, height);
      vignette.addColorStop(0, 'rgba(15,22,28,.14)');
      vignette.addColorStop(0.55, 'rgba(15,22,28,0)');
      vignette.addColorStop(1, 'rgba(15,22,28,.38)');
      context.fillStyle = vignette;
      context.fillRect(0, 0, width, height);
    };

    render();
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [plan, concept, generated]);

  return (
    <div className="studio-renderer">
      <canvas ref={canvasRef} aria-label={`${label} ${generated ? '자동 생성 3D 렌더링' : '표준 평면 미리보기'}`} />
      <div className="studio-renderer__top">
        <strong>{generated ? '생성 완료 · 자동 3D 컨셉 시안' : '표준 평면 미리보기'}</strong>
        <span>{generated ? 'HIGH QUALITY PREVIEW' : 'UNIT PLAN'}</span>
      </div>
    </div>
  );
}
