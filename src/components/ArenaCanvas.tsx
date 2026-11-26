import { useEffect, useRef } from 'react';
import type {
  GameEventPayload,
  Obstacle,
  PlayerSnapshot,
  RoomStatePayload,
  SnowballSnapshot,
} from '../shared/types.ts';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  alpha: number;
}

interface Snowflake {
  x: number;
  y: number;
  r: number;
  speedY: number;
  drift: number;
}

interface ArenaCanvasProps {
  roomState: RoomStatePayload;
  myId: string;
  selectedTargetId: string | null;
  pendingEvents: GameEventPayload[];
  onEventsConsumed: () => void;
  onSelectTarget: (targetId: string) => void;
  onMoveTo: (x: number, y: number) => void;
}

export function ArenaCanvas({
  roomState,
  myId,
  selectedTargetId,
  pendingEvents,
  onEventsConsumed,
  onSelectTarget,
  onMoveTo,
}: ArenaCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const stateRef = useRef(roomState);
  stateRef.current = roomState;
  const myIdRef = useRef(myId);
  myIdRef.current = myId;
  const selectedTargetRef = useRef(selectedTargetId);
  selectedTargetRef.current = selectedTargetId;

  const interpPlayersRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const interpSnowballsRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const particlesRef = useRef<Particle[]>([]);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const snowflakesRef = useRef<Snowflake[]>([]);

  // Spawn particles and floating texts from server game events
  useEffect(() => {
    if (pendingEvents.length === 0) return;

    for (const ev of pendingEvents) {
      if (typeof ev.x === 'number' && typeof ev.y === 'number') {
        if (ev.kind === 'hit' || ev.kind === 'shield' || ev.kind === 'eliminated') {
          const count = ev.isMega ? 24 : 12;
          for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 1 + Math.random() * (ev.isMega ? 4.8 : 2.8);
            particlesRef.current.push({
              x: ev.x,
              y: ev.y,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              radius: ev.isMega ? 4 : 2.5,
              color: ev.isMega ? '#fbbf24' : '#ffffff',
              alpha: 1,
            });
          }
        }
        if (ev.floatingText) {
          floatingTextsRef.current.push({
            x: ev.x,
            y: ev.y - 24,
            text: ev.floatingText,
            color: ev.floatingColor ?? '#0284c7',
            alpha: 1,
          });
        }
      }
    }

    onEventsConsumed();
  }, [pendingEvents, onEventsConsumed]);

  // Initialize snowflakes once
  useEffect(() => {
    const flakes: Snowflake[] = [];
    for (let i = 0; i < 45; i++) {
      flakes.push({
        x: Math.random() * 1000,
        y: Math.random() * 640,
        r: 1.5 + Math.random() * 2.2,
        speedY: 0.45 + Math.random() * 0.75,
        drift: (Math.random() - 0.5) * 0.35,
      });
    }
    snowflakesRef.current = flakes;
  }, []);

  // Main 60 FPS canvas render & resize loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = wrapper.getBoundingClientRect();
      canvas.width = Math.max(300, Math.floor(rect.width * dpr));
      canvas.height = Math.max(260, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };

    handleResize();
    const ro = new ResizeObserver(handleResize);
    ro.observe(wrapper);

    let rafId = 0;

    const drawObstacle = (obs: Obstacle, sx: number, sy: number) => {
      const x = obs.x * sx;
      const y = obs.y * sy;
      const r = obs.radius * Math.min(sx, sy);

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(x, y + r * 0.45, r * 0.9, r * 0.35, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.14)';
      ctx.fill();

      if (obs.type === 'igloo') {
        ctx.beginPath();
        ctx.arc(x, y + 8 * sy, r * 0.85, Math.PI, 0);
        ctx.fillStyle = '#f0f9ff';
        ctx.fill();
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = '#7dd3fc';
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x - r * 0.75, y - 4 * sy);
        ctx.lineTo(x + r * 0.75, y - 4 * sy);
        ctx.moveTo(x - r * 0.55, y - 16 * sy);
        ctx.lineTo(x + r * 0.55, y - 16 * sy);
        ctx.strokeStyle = '#bae6fd';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(x, y + 8 * sy, Math.max(7, 12 * Math.min(sx, sy)), Math.PI, 0);
        ctx.fillStyle = '#0369a1';
        ctx.fill();
      } else if (obs.type === 'pine') {
        ctx.fillStyle = '#78350f';
        ctx.fillRect(x - 5 * sx, y + 6 * sy, 10 * sx, 14 * sy);

        const tiers = [
          { yOff: 8, width: 28, height: 24 },
          { yOff: -6, width: 22, height: 22 },
          { yOff: -20, width: 16, height: 20 },
        ];
        tiers.forEach((t) => {
          const tw = t.width * sx;
          const th = t.height * sy;
          const ty = y + t.yOff * sy;
          ctx.beginPath();
          ctx.moveTo(x, ty - th);
          ctx.lineTo(x - tw, ty);
          ctx.lineTo(x + tw, ty);
          ctx.closePath();
          ctx.fillStyle = '#15803d';
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(x, ty - th);
          ctx.lineTo(x - tw * 0.45, ty - th * 0.45);
          ctx.lineTo(x + tw * 0.45, ty - th * 0.45);
          ctx.closePath();
          ctx.fillStyle = '#ffffff';
          ctx.fill();
        });
      } else if (obs.type === 'woodpile') {
        const logs = [
          { dx: -12, dy: 8 },
          { dx: 0, dy: 8 },
          { dx: 12, dy: 8 },
          { dx: -6, dy: -2 },
          { dx: 6, dy: -2 },
          { dx: 0, dy: -12 },
        ];
        const s = Math.min(sx, sy);
        logs.forEach((l) => {
          ctx.beginPath();
          ctx.arc(x + l.dx * sx, y + l.dy * sy, 7.5 * s, 0, Math.PI * 2);
          ctx.fillStyle = '#92400e';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(x + l.dx * sx, y + l.dy * sy, 4.5 * s, 0, Math.PI * 2);
          ctx.fillStyle = '#fde68a';
          ctx.fill();
        });
        ctx.beginPath();
        ctx.arc(x, y - 16 * sy, 9 * s, Math.PI, 0);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      } else if (obs.type === 'snowmound') {
        ctx.beginPath();
        ctx.arc(x, y + 10 * sy, r * 0.95, Math.PI, 0);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#bae6fd';
        ctx.stroke();
      }
      ctx.restore();
    };

    const drawPlayer = (
      p: PlayerSnapshot,
      px: number,
      py: number,
      sx: number,
      sy: number,
      now: number,
      isHidingBehind: boolean,
    ) => {
      const isMe = p.id === myIdRef.current;
      const isFrozen = now < p.frozenUntil;
      const isSelected = p.id === selectedTargetRef.current;
      const scale = Math.max(0.75, Math.min(1.25, Math.min(sx, sy)));

      ctx.save();
      if (isHidingBehind) {
        ctx.globalAlpha = 0.72;
      }

      if (isSelected) {
        ctx.beginPath();
        ctx.arc(px, py, 24 * scale, 0, Math.PI * 2);
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 3]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      const avatarRadius = (isMe ? 19 : 15) * scale;
      ctx.beginPath();
      ctx.arc(px, py, avatarRadius, 0, Math.PI * 2);
      if (isFrozen) {
        ctx.fillStyle = '#38bdf8';
      } else if (isMe) {
        ctx.fillStyle = '#0284c7';
      } else {
        ctx.fillStyle = '#ffffff';
      }
      ctx.fill();
      ctx.lineWidth = isMe ? 3 : 2;
      ctx.strokeStyle = isFrozen ? '#0369a1' : isMe ? '#fbbf24' : '#94a3b8';
      ctx.stroke();

      ctx.font = `${Math.round((isMe ? 20 : 16) * scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(isFrozen ? '🥶' : p.emoji, px, py + 1);

      if (p.ammo > 0 && !isFrozen) {
        ctx.beginPath();
        ctx.arc(
          px + 13 * scale,
          py - 8 * scale,
          (p.hasMegaShot ? 7 : 5) * scale,
          0,
          Math.PI * 2,
        );
        ctx.fillStyle = p.hasMegaShot ? '#fbbf24' : '#ffffff';
        ctx.fill();
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      const fontSize = Math.max(10, Math.round((isMe ? 11 : 10) * scale));
      ctx.font = `${isMe ? '700' : '600'} ${fontSize}px "Plus Jakarta Sans", sans-serif`;
      const label = p.isHiding ? `🛡️ ${p.name}` : p.name;
      const textWidth = ctx.measureText(label).width;

      ctx.fillStyle = isMe
        ? 'rgba(2, 132, 199, 0.94)'
        : p.isHiding
          ? 'rgba(5, 150, 105, 0.92)'
          : 'rgba(15, 23, 42, 0.8)';
      ctx.beginPath();
      ctx.roundRect(
        px - textWidth / 2 - 6,
        py + 18 * scale,
        textWidth + 12,
        16,
        6,
      );
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.fillText(label, px, py + 18 * scale + 8);

      // 5 HP dots
      const dotSpacing = 6;
      const startX = px - ((p.maxHp - 1) * dotSpacing) / 2;
      for (let i = 0; i < p.maxHp; i++) {
        ctx.beginPath();
        ctx.arc(startX + i * dotSpacing, py + 18 * scale + 21, 2.2, 0, Math.PI * 2);
        ctx.fillStyle = i < p.hp ? '#ef4444' : 'rgba(15, 23, 42, 0.35)';
        ctx.fill();
      }

      ctx.restore();
    };

    const renderFrame = () => {
      const st = stateRef.current;
      const w = canvas.width;
      const h = canvas.height;
      const sx = w / st.arenaWidth;
      const sy = h / st.arenaHeight;
      const now = Date.now();

      // Interpolate players smoothly
      const interpP = interpPlayersRef.current;
      const activeIds = new Set<string>();
      for (const p of st.players) {
        activeIds.add(p.id);
        const cur = interpP.get(p.id);
        if (!cur) {
          interpP.set(p.id, { x: p.x, y: p.y });
        } else {
          cur.x += (p.x - cur.x) * 0.32;
          cur.y += (p.y - cur.y) * 0.32;
        }
      }
      for (const id of interpP.keys()) {
        if (!activeIds.has(id)) interpP.delete(id);
      }

      // Interpolate snowballs
      const interpS = interpSnowballsRef.current;
      const activeSbIds = new Set<string>();
      for (const sb of st.snowballs) {
        activeSbIds.add(sb.id);
        const cur = interpS.get(sb.id);
        if (!cur) {
          interpS.set(sb.id, { x: sb.x, y: sb.y });
        } else {
          cur.x += (sb.x - cur.x) * 0.48;
          cur.y += (sb.y - cur.y) * 0.48;
        }
      }
      for (const id of interpS.keys()) {
        if (!activeSbIds.has(id)) interpS.delete(id);
      }

      // 1. Alaska Sky & Snow Background
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, '#bae6fd');
      grad.addColorStop(0.24, '#e0f2fe');
      grad.addColorStop(1, '#f8fafc');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Mountains
      const mBase = 75 * sy;
      ctx.fillStyle = '#93c5fd';
      ctx.beginPath();
      ctx.moveTo(0, mBase);
      ctx.lineTo(w * 0.15, 25 * sy);
      ctx.lineTo(w * 0.32, mBase);
      ctx.lineTo(w * 0.52, 18 * sy);
      ctx.lineTo(w * 0.72, mBase);
      ctx.lineTo(w * 0.88, 30 * sy);
      ctx.lineTo(w, mBase);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(w * 0.15, 25 * sy);
      ctx.lineTo(w * 0.11, 40 * sy);
      ctx.lineTo(w * 0.19, 40 * sy);
      ctx.closePath();
      ctx.moveTo(w * 0.52, 18 * sy);
      ctx.lineTo(w * 0.47, 36 * sy);
      ctx.lineTo(w * 0.57, 36 * sy);
      ctx.closePath();
      ctx.moveTo(w * 0.88, 30 * sy);
      ctx.lineTo(w * 0.84, 44 * sy);
      ctx.lineTo(w * 0.92, 44 * sy);
      ctx.closePath();
      ctx.fill();

      // 2. Hiding Players (behind obstacles)
      for (const p of st.players) {
        if (p.isEliminated || !p.isHiding) continue;
        const pos = interpP.get(p.id) ?? p;
        drawPlayer(p, pos.x * sx, pos.y * sy, sx, sy, now, true);
      }

      // 3. Obstacles
      for (const obs of st.obstacles) {
        drawObstacle(obs, sx, sy);
      }

      // 4. Open-Area Players
      for (const p of st.players) {
        if (p.isEliminated || p.isHiding) continue;
        const pos = interpP.get(p.id) ?? p;
        drawPlayer(p, pos.x * sx, pos.y * sy, sx, sy, now, false);
      }

      // 5. Snowballs
      for (const sb of st.snowballs as SnowballSnapshot[]) {
        const pos = interpS.get(sb.id) ?? sb;
        const s = Math.min(sx, sy);
        ctx.beginPath();
        ctx.arc(pos.x * sx, pos.y * sy, (sb.isMega ? 10 : 6) * s, 0, Math.PI * 2);
        ctx.fillStyle = sb.isMega ? '#fef08a' : '#ffffff';
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = sb.isMega ? '#f59e0b' : '#0284c7';
        ctx.stroke();
      }

      // 6. Particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const pt = particles[i];
        pt.x += pt.vx;
        pt.y += pt.vy;
        pt.alpha -= 0.03;
        if (pt.alpha <= 0) {
          particles.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = pt.alpha;
        ctx.beginPath();
        ctx.arc(pt.x * sx, pt.y * sy, pt.radius, 0, Math.PI * 2);
        ctx.fillStyle = pt.color;
        ctx.fill();
        ctx.restore();
      }

      // 7. Snowfall
      ctx.fillStyle = 'rgba(255, 255, 255, 0.72)';
      for (const sf of snowflakesRef.current) {
        sf.y += sf.speedY;
        sf.x += sf.drift;
        if (sf.y > st.arenaHeight) {
          sf.y = -5;
          sf.x = Math.random() * st.arenaWidth;
        }
        ctx.beginPath();
        ctx.arc(sf.x * sx, sf.y * sy, sf.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // 8. Floating Texts
      const fts = floatingTextsRef.current;
      for (let i = fts.length - 1; i >= 0; i--) {
        const ft = fts[i];
        ft.y -= 0.85;
        ft.alpha -= 0.02;
        if (ft.alpha <= 0) {
          fts.splice(i, 1);
          continue;
        }
        ctx.save();
        ctx.globalAlpha = ft.alpha;
        ctx.font = '700 14px "Plus Jakarta Sans", sans-serif';
        ctx.textAlign = 'center';
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, ft.x * sx, ft.y * sy);
        ctx.restore();
      }

      rafId = requestAnimationFrame(renderFrame);
    };

    rafId = requestAnimationFrame(renderFrame);

    return () => {
      cancelAnimationFrame(rafId);
      ro.disconnect();
    };
  }, []);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * roomState.arenaWidth;
    const clickY = ((e.clientY - rect.top) / rect.height) * roomState.arenaHeight;

    let closestId: string | null = null;
    let minDist = 34;

    for (const p of roomState.players) {
      if (p.id === myId || p.isEliminated) continue;
      const pos = interpPlayersRef.current.get(p.id) ?? p;
      const d = Math.hypot(pos.x - clickX, pos.y - clickY);
      if (d < minDist) {
        minDist = d;
        closestId = p.id;
      }
    }

    if (closestId) {
      onSelectTarget(closestId);
    } else {
      onMoveTo(clickX, clickY);
    }
  };

  const aliveCount = roomState.players.filter((p) => !p.isEliminated).length;
  const totalCount = roomState.players.length;
  const top3 = [...roomState.players]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div ref={wrapperRef} className="relative w-full h-full min-h-[380px] overflow-hidden bg-sky-100">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="block w-full h-full cursor-crosshair"
      />

      {/* Top-Left Alive Counter */}
      <div className="absolute top-3 left-3 bg-slate-900/85 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl text-xs font-semibold pointer-events-none border border-slate-700/60 tabular-nums">
        Desa Alaska · {aliveCount}/{totalCount} Bertahan
      </div>

      {/* Top-Right Mini Leaderboard */}
      <div className="absolute top-3 right-3 bg-slate-900/85 backdrop-blur-sm text-white p-2.5 rounded-xl border border-slate-700/80 text-xs w-52 pointer-events-none shadow-lg">
        <div className="font-game font-bold text-amber-400 mb-1.5 flex items-center justify-between">
          <span>TOP 3 SKOR</span>
          <span className="text-[11px] text-slate-400 font-sans font-normal">Soal+Hit</span>
        </div>
        <div className="space-y-1">
          {top3.map((p, idx) => (
            <div
              key={p.id}
              className={`flex items-center justify-between ${
                p.id === myId ? 'text-sky-300 font-bold' : 'text-slate-200'
              } ${p.isEliminated ? 'opacity-50 line-through' : ''}`}
            >
              <span className="truncate pr-1">
                {medals[idx]} {p.name}
              </span>
              <span className="font-mono font-bold text-amber-300 shrink-0 tabular-nums">
                {p.score}{' '}
                <span className="text-[10px] text-slate-400 font-normal">
                  ({p.questionsAnswered}+{p.hitsLanded})
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Legend */}
      <div className="absolute bottom-3 left-3 right-3 flex justify-center pointer-events-none">
        <div className="bg-slate-900/80 backdrop-blur-sm text-sky-100 px-3.5 py-1 rounded-full text-[11px] font-medium text-center">
          Klik lawan untuk membidik · Klik salju atau WASD/Panah untuk berjalan · Berlindung di balik objek
        </div>
      </div>
    </div>
  );
}
