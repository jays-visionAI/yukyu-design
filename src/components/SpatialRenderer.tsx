import { useEffect, useRef } from 'react';
import type { StudioRoom } from '../data/studio';

interface SpatialRendererProps {
  room: StudioRoom;
  concept: string;
  generated: boolean;
}

/**
 * SpatialRenderer — 닥꽁노트 제안서 스타일의 공간별 2D 스케치 렌더러
 *
 * · 평면 데이터(StudioRoom)의 가로/세로 비율을 유지하면서 캔버스에 그립니다.
 * · 선택한 인테리어 컨셉(warm / modern / calm)에 따라
 *   바닥, 벽, 가구의 명도 단계만 다르게 적용합니다 (모노 톤 유지).
 * · "generated" 상태일 때 가구 실루엣과 머티리얼 텍스처 라인이 함께 표시됩니다.
 */
const PALETTES: Record<string, { floor: string; wall: string; accent: string; furniture: string; line: string }> = {
  warm: { floor: '#c4a583', wall: '#f5ecdf', accent: '#8b6244', furniture: '#5a4030', line: '#3a2a1f' },
  modern: { floor: '#a7a9aa', wall: '#f4f4f2', accent: '#727b82', furniture: '#2a2d31', line: '#161618' },
  calm: { floor: '#c1ad94', wall: '#eee7dc', accent: '#a08f7b', furniture: '#776b60', line: '#3d3631' },
};

const FURNITURE_PLAN: Record<string, Array<{ kind: string; width: number; depth: number; offsetX: number; offsetY: number; label: string }>> = {
  living: [
    { kind: 'sofa', width: 0.45, depth: 0.18, offsetX: 0.05, offsetY: 0.7, label: '소파' },
    { kind: 'table', width: 0.22, depth: 0.12, offsetX: 0.18, offsetY: 0.65, label: '테이블' },
    { kind: 'tv', width: 0.5, depth: 0.04, offsetX: 0.05, offsetY: 0.05, label: 'TV' },
  ],
  kitchen: [
    { kind: 'counter', width: 0.35, depth: 0.6, offsetX: 0.55, offsetY: 0.05, label: '싱크대' },
    { kind: 'island', width: 0.4, depth: 0.18, offsetX: 0.1, offsetY: 0.5, label: '아일랜드' },
    { kind: 'fridge', width: 0.15, depth: 0.18, offsetX: 0.05, offsetY: 0.05, label: '냉장고' },
  ],
  bedroom: [
    { kind: 'bed', width: 0.35, depth: 0.5, offsetX: 0.3, offsetY: 0.05, label: '침대' },
    { kind: 'nightstand', width: 0.12, depth: 0.12, offsetX: 0.05, offsetY: 0.05, label: '협탁' },
    { kind: 'wardrobe', width: 0.5, depth: 0.12, offsetX: 0.05, offsetY: 0.85, label: '衣柜' },
  ],
  bathroom: [
    { kind: 'sink', width: 0.18, depth: 0.12, offsetX: 0.05, offsetY: 0.05, label: '세면대' },
    { kind: 'toilet', width: 0.12, depth: 0.18, offsetX: 0.05, offsetY: 0.55, label: '변기' },
    { kind: 'tub', width: 0.4, depth: 0.22, offsetX: 0.55, offsetY: 0.05, label: '욕조' },
  ],
  utility: [
    { kind: 'washer', width: 0.22, depth: 0.28, offsetX: 0.05, offsetY: 0.05, label: '세탁기' },
    { kind: 'dryer', width: 0.22, depth: 0.28, offsetX: 0.05, offsetY: 0.4, label: '건조기' },
    { kind: 'shelf', width: 0.45, depth: 0.12, offsetX: 0.5, offsetY: 0.05, label: '수납장' },
  ],
};

export default function SpatialRenderer({ room, concept, generated }: SpatialRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      const scale = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.round(rect.width * scale);
      canvas.height = Math.round(rect.height * scale);
      ctx.setTransform(scale, 0, 0, scale, 0, 0);

      const width = rect.width;
      const height = rect.height;
      const palette = PALETTES[concept] ?? PALETTES.warm;

      // 배경: 모노톤 3단계 그라디언트 (검정→회색→흰)
      const bg = ctx.createLinearGradient(0, 0, 0, height);
      bg.addColorStop(0, '#f8f8f8');
      bg.addColorStop(0.6, '#e6e6e8');
      bg.addColorStop(1, '#c7c7ca');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, width, height);

      // 평면 영역: aspect-ratio를 유지하며 가운데 정렬
      const pad = Math.max(16, Math.min(width, height) * 0.08);
      const usableW = width - pad * 2;
      const usableH = height - pad * 2;
      const unit = Math.min(usableW / room.width, usableH / room.depth);
      const ox = (width - room.width * unit) / 2;
      const oy = (height - room.depth * unit) / 2;
      const roomW = room.width * unit;
      const roomH = room.depth * unit;

      // 바닥
      ctx.fillStyle = palette.floor;
      ctx.fillRect(ox, oy, roomW, roomH);

      // 격자 라인 (제안서 도면 무늬)
      ctx.strokeStyle = 'rgba(0,0,0,0.06)';
      ctx.lineWidth = 1;
      const gridStep = unit * 0.5;
      for (let x = ox + gridStep; x < ox + roomW; x += gridStep) {
        ctx.beginPath();
        ctx.moveTo(x, oy);
        ctx.lineTo(x, oy + roomH);
        ctx.stroke();
      }
      for (let y = oy + gridStep; y < oy + roomH; y += gridStep) {
        ctx.beginPath();
        ctx.moveTo(ox, y);
        ctx.lineTo(ox + roomW, y);
        ctx.stroke();
      }

      // 벽
      ctx.strokeStyle = palette.line;
      ctx.lineWidth = Math.max(4, unit * 0.1);
      ctx.strokeRect(ox, oy, roomW, roomH);

      // 치수 표시 (제안서 도면풍)
      ctx.fillStyle = palette.line;
      ctx.font = '600 10px Pretendard, sans-serif';
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'left';
      ctx.fillText(`${room.width.toFixed(1)} m`, ox + 6, oy - 12);
      ctx.save();
      ctx.translate(ox - 14, oy + roomH / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText(`${room.depth.toFixed(1)} m`, 0, 0);
      ctx.restore();

      // 가구 (generated 일 때만)
      const plan = FURNITURE_PLAN[room.kind] ?? [];
      if (generated) {
        plan.forEach((piece) => {
          const px = ox + piece.offsetX * roomW;
          const py = oy + piece.offsetY * roomH;
          const pw = piece.width * roomW;
          const ph = piece.depth * roomH;

          // 그림자
          ctx.fillStyle = 'rgba(0,0,0,0.18)';
          ctx.fillRect(px + 2, py + 3, pw, ph);

          // 본체
          ctx.fillStyle = palette.furniture;
          ctx.fillRect(px, py, pw, ph);

          // 윤곽선
          ctx.strokeStyle = palette.line;
          ctx.lineWidth = 1;
          ctx.strokeRect(px, py, pw, ph);

          // 라벨 (너무 작으면 생략)
          if (pw > 36 && ph > 16) {
            ctx.fillStyle = '#fff';
            ctx.font = '600 9px Pretendard, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(piece.label, px + pw / 2, py + ph / 2);
          }
        });
      } else {
        // 미생성 시: 가구 위치를 점선 윤곽으로만 표시
        plan.forEach((piece) => {
          const px = ox + piece.offsetX * roomW;
          const py = oy + piece.offsetY * roomH;
          const pw = piece.width * roomW;
          const ph = piece.depth * roomH;
          ctx.setLineDash([3, 3]);
          ctx.strokeStyle = 'rgba(0,0,0,0.35)';
          ctx.lineWidth = 1;
          ctx.strokeRect(px, py, pw, ph);
          ctx.setLineDash([]);
        });
      }

      // 상단 라벨
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.font = '600 10px Pretendard, sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'top';
      ctx.fillText(generated ? 'CONCEPT PREVIEW' : 'PLAN VIEW', width - pad, pad);
    };

    render();
    const observer = new ResizeObserver(render);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [room, concept, generated]);

  return (
    <div className="spatial-renderer">
      <canvas ref={canvasRef} aria-label={`${room.name} ${generated ? '컨셉 렌더링' : '평면도'}`} />
    </div>
  );
}
