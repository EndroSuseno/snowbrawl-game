import crypto from 'node:crypto';
import type { WebSocket } from 'ws';
import type {
  ClientToServerMessage,
  GameEventPayload,
  Obstacle,
  PlayerSnapshot,
  PublicRoomSummary,
  QuestionTopic,
  RoomConfig,
  RoomPhase,
  RoomStatePayload,
  ServerToClientMessage,
  SnowballSnapshot,
} from '../src/shared/types.ts';
import { pickQuestion, toClientQuestion, type ServerQuestion } from './questions.ts';

export const ARENA_WIDTH = 1000;
export const ARENA_HEIGHT = 640;
const TICK_MS = 50; // 20 Hz server simulation
const PLAYER_SPEED_PX_PER_SEC = 185;
const SNOWBALL_SPEED_NORMAL = 520;
const SNOWBALL_SPEED_MEGA = 660;
const FREEZE_DURATION_MS = 2500;
const MAX_HP = 5;

const ALLOWED_EMOJIS = new Set([
  '🦸',
  '🐧',
  '🦊',
  '🐻‍❄️',
  '🦉',
  '🐺',
  '🦌',
  '🦭',
  '⛄',
  '🎿',
  '🏂',
]);

const CLASSMATE_BOT_NAMES = [
  'Aditya', 'Aisyah', 'Alif', 'Amanda', 'Andi', 'Anisa', 'Arif', 'Aulia',
  'Bagas', 'Bella', 'Bima', 'Budi', 'Cahya', 'Citra', 'Dani', 'Dina',
  'Eka', 'Fajar', 'Farah', 'Galih', 'Gita', 'Hafiz', 'Hana', 'Ilham',
  'Indah', 'Irfan', 'Kartika', 'Kevin', 'Lestari', 'Lukman', 'Maya', 'Nabila',
  'Naufal', 'Putri', 'Rafi', 'Rina', 'Rizky',
];

const BOT_EMOJIS = ['🐧', '🦊', '🐻‍❄️', '🦉', '🐺', '🦌', '🦭', '⛄', '🎿', '🏂'];

interface ServerPlayer {
  id: string;
  name: string;
  emoji: string;
  isBot: boolean;
  isHost: boolean;
  connected: boolean;
  x: number;
  y: number;
  inputVx: number;
  inputVy: number;
  moveTarget: { x: number; y: number } | null;
  botVx: number;
  botVy: number;
  hp: number;
  isEliminated: boolean;
  questionsAnswered: number;
  hitsLanded: number;
  score: number;
  combo: number;
  ammo: number;
  hasMegaShot: boolean;
  frozenUntil: number;
  isHiding: boolean;
  coverLabel: string | null;
  seekCoverActive: boolean;
  hideTimerMs: number;
  aiTimerMs: number;
  currentQuestion: ServerQuestion | null;
  answerLockedUntil: number;
  lastThrowAt: number;
}

interface ServerSnowball {
  id: string;
  shooterId: string;
  shooterName: string;
  targetId: string;
  x: number;
  y: number;
  speed: number;
  isMega: boolean;
}

interface GameRoom {
  code: string;
  name: string;
  phase: RoomPhase;
  hostId: string;
  durationSec: number;
  timeLeftSec: number;
  maxHumans: number;
  fillWithBots: boolean;
  targetTotalPlayers: number;
  topic: QuestionTopic;
  isPublic: boolean;
  obstacles: Obstacle[];
  players: Map<string, ServerPlayer>;
  snowballs: ServerSnowball[];
  tickTimer: ReturnType<typeof setInterval> | null;
  lastTickAt: number;
  secondAccumMs: number;
  emptySince: number | null;
}

interface ClientSession {
  playerId: string;
  ws: WebSocket;
  roomCode: string | null;
}

function sanitizeText(raw: unknown, fallback: string, maxLen: number): string {
  if (typeof raw !== 'string') return fallback;
  const cleaned = raw.replace(/[\u0000-\u001F\u007F<>]/g, '').trim();
  if (!cleaned) return fallback;
  return cleaned.slice(0, maxLen);
}

function sanitizeEmoji(raw: unknown): string {
  if (typeof raw === 'string' && ALLOWED_EMOJIS.has(raw)) {
    return raw;
  }
  return '🦸';
}

function generateRoomCode(existing: Map<string, GameRoom>): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  for (let attempt = 0; attempt < 20; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    if (!existing.has(code)) return code;
  }
  return crypto.randomBytes(3).toString('hex').toUpperCase();
}

function createAlaskaObstacles(): Obstacle[] {
  return [
    { id: 'obs_igloo_1', type: 'igloo', label: 'Igloo Utara', x: ARENA_WIDTH * 0.22, y: ARENA_HEIGHT * 0.28, radius: 46 },
    { id: 'obs_igloo_2', type: 'igloo', label: 'Igloo Selatan', x: ARENA_WIDTH * 0.78, y: ARENA_HEIGHT * 0.72, radius: 46 },
    { id: 'obs_pine_1', type: 'pine', label: 'Pohon Pinus Barat', x: ARENA_WIDTH * 0.16, y: ARENA_HEIGHT * 0.70, radius: 36 },
    { id: 'obs_pine_2', type: 'pine', label: 'Pohon Pinus Utara', x: ARENA_WIDTH * 0.50, y: ARENA_HEIGHT * 0.22, radius: 38 },
    { id: 'obs_pine_3', type: 'pine', label: 'Pohon Pinus Timur', x: ARENA_WIDTH * 0.82, y: ARENA_HEIGHT * 0.26, radius: 36 },
    { id: 'obs_pine_4', type: 'pine', label: 'Pohon Pinus Selatan', x: ARENA_WIDTH * 0.48, y: ARENA_HEIGHT * 0.78, radius: 38 },
    { id: 'obs_wood_1', type: 'woodpile', label: 'Tumpukan Kayu Barat', x: ARENA_WIDTH * 0.34, y: ARENA_HEIGHT * 0.52, radius: 34 },
    { id: 'obs_wood_2', type: 'woodpile', label: 'Tumpukan Kayu Timur', x: ARENA_WIDTH * 0.68, y: ARENA_HEIGHT * 0.48, radius: 34 },
    { id: 'obs_mound_1', type: 'snowmound', label: 'Gundukan Salju Kiri', x: ARENA_WIDTH * 0.36, y: ARENA_HEIGHT * 0.25, radius: 36 },
    { id: 'obs_mound_2', type: 'snowmound', label: 'Gundukan Salju Kanan', x: ARENA_WIDTH * 0.64, y: ARENA_HEIGHT * 0.75, radius: 36 },
    { id: 'obs_mound_3', type: 'snowmound', label: 'Gundukan Salju Tengah', x: ARENA_WIDTH * 0.50, y: ARENA_HEIGHT * 0.50, radius: 38 },
  ];
}

function randomSpawnPos(): { x: number; y: number } {
  return {
    x: 60 + Math.random() * (ARENA_WIDTH - 120),
    y: 85 + Math.random() * (ARENA_HEIGHT - 140),
  };
}

function toPlayerSnapshot(p: ServerPlayer): PlayerSnapshot {
  return {
    id: p.id,
    name: p.name,
    emoji: p.emoji,
    isBot: p.isBot,
    isHost: p.isHost,
    connected: p.connected,
    x: Math.round(p.x * 10) / 10,
    y: Math.round(p.y * 10) / 10,
    hp: p.hp,
    maxHp: MAX_HP,
    isEliminated: p.isEliminated,
    questionsAnswered: p.questionsAnswered,
    hitsLanded: p.hitsLanded,
    score: p.score,
    combo: p.combo,
    ammo: p.ammo,
    hasMegaShot: p.hasMegaShot,
    frozenUntil: p.frozenUntil,
    isHiding: p.isHiding,
    coverLabel: p.coverLabel,
    seekCoverActive: p.seekCoverActive,
  };
}

function toSnowballSnapshot(sb: ServerSnowball): SnowballSnapshot {
  return {
    id: sb.id,
    shooterId: sb.shooterId,
    shooterName: sb.shooterName,
    targetId: sb.targetId,
    x: Math.round(sb.x * 10) / 10,
    y: Math.round(sb.y * 10) / 10,
    isMega: sb.isMega,
  };
}

export class SnowbrawlGameServer {
  private rooms = new Map<string, GameRoom>();
  private sessions = new Map<string, ClientSession>();
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [code, room] of this.rooms.entries()) {
        if (room.emptySince !== null && now - room.emptySince > 60_000) {
          if (room.tickTimer) clearInterval(room.tickTimer);
          this.rooms.delete(code);
        }
      }
    }, 15_000);
  }

  public dispose() {
    clearInterval(this.cleanupInterval);
    for (const room of this.rooms.values()) {
      if (room.tickTimer) clearInterval(room.tickTimer);
    }
  }

  public getPublicRooms(): PublicRoomSummary[] {
    const list: PublicRoomSummary[] = [];
    for (const room of this.rooms.values()) {
      if (!room.isPublic) continue;
      const players = Array.from(room.players.values());
      const humanCount = players.filter((p) => !p.isBot && p.connected).length;
      if (humanCount === 0) continue;
      const host = room.players.get(room.hostId);
      list.push({
        code: room.code,
        name: room.name,
        hostName: host?.name ?? 'Host',
        phase: room.phase,
        humanCount,
        totalPlayers: players.length,
        maxHumans: room.maxHumans,
        fillWithBots: room.fillWithBots,
        topic: room.topic,
        durationSec: room.durationSec,
      });
    }
    return list;
  }

  public handleConnection(ws: WebSocket) {
    const playerId = `p_${crypto.randomUUID().slice(0, 8)}`;
    const session: ClientSession = {
      playerId,
      ws,
      roomCode: null,
    };
    this.sessions.set(playerId, session);

    this.send(ws, {
      type: 'welcome',
      playerId,
      rooms: this.getPublicRooms(),
    });

    ws.on('message', (raw) => {
      let msg: ClientToServerMessage;
      try {
        const text = typeof raw === 'string' ? raw : raw.toString('utf8');
        if (text.length > 8192) return;
        msg = JSON.parse(text) as ClientToServerMessage;
      } catch {
        this.send(ws, { type: 'error', message: 'Format pesan tidak valid.' });
        return;
      }
      this.handleMessage(session, msg);
    });

    ws.on('close', () => {
      this.handleDisconnect(session);
    });
  }

  private send(ws: WebSocket, msg: ServerToClientMessage) {
    if (ws.readyState === 1) {
      ws.send(JSON.stringify(msg));
    }
  }

  private broadcastRoom(room: GameRoom, msg: ServerToClientMessage) {
    const payload = JSON.stringify(msg);
    for (const player of room.players.values()) {
      if (player.isBot || !player.connected) continue;
      const sess = this.sessions.get(player.id);
      if (sess && sess.ws.readyState === 1) {
        sess.ws.send(payload);
      }
    }
  }

  private broadcastLobbyList() {
    const rooms = this.getPublicRooms();
    const payload = JSON.stringify({ type: 'lobby:rooms', rooms } satisfies ServerToClientMessage);
    for (const sess of this.sessions.values()) {
      if (sess.roomCode === null && sess.ws.readyState === 1) {
        sess.ws.send(payload);
      }
    }
  }

  private buildRoomState(room: GameRoom): RoomStatePayload {
    return {
      code: room.code,
      name: room.name,
      phase: room.phase,
      hostId: room.hostId,
      timeLeftSec: room.timeLeftSec,
      durationSec: room.durationSec,
      serverNow: Date.now(),
      arenaWidth: ARENA_WIDTH,
      arenaHeight: ARENA_HEIGHT,
      topic: room.topic,
      fillWithBots: room.fillWithBots,
      targetTotalPlayers: room.targetTotalPlayers,
      isPublic: room.isPublic,
      obstacles: room.obstacles,
      players: Array.from(room.players.values()).map(toPlayerSnapshot),
      snowballs: room.snowballs.map(toSnowballSnapshot),
    };
  }

  private createHumanPlayer(
    id: string,
    name: string,
    emoji: string,
    isHost: boolean,
  ): ServerPlayer {
    const spawn = randomSpawnPos();
    return {
      id,
      name,
      emoji,
      isBot: false,
      isHost,
      connected: true,
      x: spawn.x,
      y: spawn.y,
      inputVx: 0,
      inputVy: 0,
      moveTarget: null,
      botVx: 0,
      botVy: 0,
      hp: MAX_HP,
      isEliminated: false,
      questionsAnswered: 0,
      hitsLanded: 0,
      score: 0,
      combo: 0,
      ammo: 0,
      hasMegaShot: false,
      frozenUntil: 0,
      isHiding: false,
      coverLabel: null,
      seekCoverActive: false,
      hideTimerMs: 0,
      aiTimerMs: 0,
      currentQuestion: null,
      answerLockedUntil: 0,
      lastThrowAt: 0,
    };
  }

  private handleMessage(session: ClientSession, msg: ClientToServerMessage) {
    if (!msg || typeof msg.type !== 'string') return;

    switch (msg.type) {
      case 'lobby:list': {
        this.send(session.ws, {
          type: 'lobby:rooms',
          rooms: this.getPublicRooms(),
        });
        break;
      }

      case 'room:create': {
        this.leaveCurrentRoom(session);
        const code = generateRoomCode(this.rooms);
        const cfg: Partial<RoomConfig> = msg.config ?? {};
        const durationSec = [180, 300, 480].includes(Number(cfg.durationSec))
          ? Number(cfg.durationSec)
          : 300;
        const maxHumans = Math.max(2, Math.min(38, Number(cfg.maxHumans) || 38));
        const fillWithBots = Boolean(cfg.fillWithBots);
        const targetTotalPlayers = Math.max(
          2,
          Math.min(38, Number(cfg.targetTotalPlayers) || 38),
        );
        const topic: QuestionTopic =
          cfg.topic === 'MATH' || cfg.topic === 'SCIENCE' || cfg.topic === 'GENERAL'
            ? cfg.topic
            : 'ALL';
        const isPublic = cfg.isPublic !== false;
        const roomName = sanitizeText(cfg.name, `Arena Alaska ${code}`, 28);
        const playerName = sanitizeText(msg.playerName, 'Siswa', 16);
        const emoji = sanitizeEmoji(msg.emoji);

        const hostPlayer = this.createHumanPlayer(session.playerId, playerName, emoji, true);
        const room: GameRoom = {
          code,
          name: roomName,
          phase: 'WAITING',
          hostId: session.playerId,
          durationSec,
          timeLeftSec: durationSec,
          maxHumans,
          fillWithBots,
          targetTotalPlayers,
          topic,
          isPublic,
          obstacles: createAlaskaObstacles(),
          players: new Map([[session.playerId, hostPlayer]]),
          snowballs: [],
          tickTimer: null,
          lastTickAt: Date.now(),
          secondAccumMs: 0,
          emptySince: null,
        };

        this.rooms.set(code, room);
        session.roomCode = code;

        this.send(session.ws, {
          type: 'room:joined',
          playerId: session.playerId,
          state: this.buildRoomState(room),
          question: null,
        });
        this.broadcastLobbyList();
        break;
      }

      case 'room:join': {
        const code = sanitizeText(msg.code, '', 10).toUpperCase();
        const room = this.rooms.get(code);
        if (!room) {
          this.send(session.ws, {
            type: 'error',
            message: `Room "${code}" tidak ditemukan atau sudah selesai.`,
          });
          return;
        }

        const humanCount = Array.from(room.players.values()).filter((p) => !p.isBot).length;
        if (humanCount >= room.maxHumans) {
          this.send(session.ws, {
            type: 'error',
            message: 'Room sudah penuh!',
          });
          return;
        }

        this.leaveCurrentRoom(session);

        const playerName = sanitizeText(msg.playerName, 'Siswa', 16);
        const emoji = sanitizeEmoji(msg.emoji);
        const player = this.createHumanPlayer(session.playerId, playerName, emoji, false);

        if (room.phase === 'PLAYING') {
          // Late joiner enters alive with full HP and immediately gets a question!
          player.currentQuestion = pickQuestion(room.topic);
        }

        room.players.set(session.playerId, player);
        room.emptySince = null;
        session.roomCode = code;

        this.send(session.ws, {
          type: 'room:joined',
          playerId: session.playerId,
          state: this.buildRoomState(room),
          question: player.currentQuestion ? toClientQuestion(player.currentQuestion) : null,
        });

        this.broadcastRoom(room, {
          type: 'room:state',
          state: this.buildRoomState(room),
        });

        if (room.phase === 'PLAYING') {
          this.broadcastRoom(room, {
            type: 'game:event',
            event: {
              id: crypto.randomUUID(),
              kind: 'info',
              message: `❄️ ${player.name} bergabung ke Desa Alaska!`,
            },
          });
        }
        this.broadcastLobbyList();
        break;
      }

      case 'room:leave': {
        this.leaveCurrentRoom(session);
        this.send(session.ws, {
          type: 'lobby:rooms',
          rooms: this.getPublicRooms(),
        });
        break;
      }

      case 'room:update_config': {
        const room = this.getRoomForSession(session);
        if (!room || room.hostId !== session.playerId || room.phase !== 'WAITING') return;
        const cfg = msg.config ?? {};
        if (typeof cfg.durationSec === 'number' && [180, 300, 480].includes(cfg.durationSec)) {
          room.durationSec = cfg.durationSec;
          room.timeLeftSec = cfg.durationSec;
        }
        if (typeof cfg.fillWithBots === 'boolean') {
          room.fillWithBots = cfg.fillWithBots;
        }
        if (typeof cfg.targetTotalPlayers === 'number') {
          room.targetTotalPlayers = Math.max(2, Math.min(38, Math.floor(cfg.targetTotalPlayers)));
        }
        if (cfg.topic === 'ALL' || cfg.topic === 'MATH' || cfg.topic === 'SCIENCE' || cfg.topic === 'GENERAL') {
          room.topic = cfg.topic;
        }
        if (typeof cfg.isPublic === 'boolean') {
          room.isPublic = cfg.isPublic;
        }
        this.broadcastRoom(room, {
          type: 'room:state',
          state: this.buildRoomState(room),
        });
        this.broadcastLobbyList();
        break;
      }

      case 'room:start': {
        const room = this.getRoomForSession(session);
        if (!room || room.hostId !== session.playerId || room.phase !== 'WAITING') return;
        this.startMatch(room);
        break;
      }

      case 'room:rematch': {
        const room = this.getRoomForSession(session);
        if (!room || room.hostId !== session.playerId || room.phase !== 'ENDED') return;
        this.resetRoomToWaiting(room);
        break;
      }

      case 'player:move_input': {
        const room = this.getRoomForSession(session);
        if (!room || room.phase !== 'PLAYING') return;
        const player = room.players.get(session.playerId);
        if (!player || player.isEliminated) return;
        const vx = typeof msg.vx === 'number' && Number.isFinite(msg.vx) ? Math.max(-1, Math.min(1, msg.vx)) : 0;
        const vy = typeof msg.vy === 'number' && Number.isFinite(msg.vy) ? Math.max(-1, Math.min(1, msg.vy)) : 0;
        player.inputVx = vx;
        player.inputVy = vy;
        if (vx !== 0 || vy !== 0) {
          player.moveTarget = null;
          player.seekCoverActive = false;
        }
        break;
      }

      case 'player:move_to': {
        const room = this.getRoomForSession(session);
        if (!room || room.phase !== 'PLAYING') return;
        const player = room.players.get(session.playerId);
        if (!player || player.isEliminated) return;
        if (
          typeof msg.x !== 'number' ||
          typeof msg.y !== 'number' ||
          !Number.isFinite(msg.x) ||
          !Number.isFinite(msg.y)
        ) {
          return;
        }
        player.moveTarget = {
          x: Math.max(35, Math.min(ARENA_WIDTH - 35, msg.x)),
          y: Math.max(70, Math.min(ARENA_HEIGHT - 35, msg.y)),
        };
        player.seekCoverActive = false;
        break;
      }

      case 'player:toggle_cover': {
        const room = this.getRoomForSession(session);
        if (!room || room.phase !== 'PLAYING') return;
        const player = room.players.get(session.playerId);
        if (!player || player.isEliminated) return;
        player.seekCoverActive = !player.seekCoverActive;
        if (player.seekCoverActive) {
          player.moveTarget = null;
        }
        break;
      }

      case 'quiz:answer': {
        const room = this.getRoomForSession(session);
        if (!room || room.phase !== 'PLAYING') return;
        const player = room.players.get(session.playerId);
        if (!player || player.isEliminated) return;
        const now = Date.now();
        if (now < player.frozenUntil || now < player.answerLockedUntil) return;
        if (!player.currentQuestion || player.currentQuestion.id !== msg.questionId) return;
        if (typeof msg.selectedIndex !== 'number' || !Number.isInteger(msg.selectedIndex)) return;

        const isCorrect = msg.selectedIndex === player.currentQuestion.answer;
        const correctIndex = player.currentQuestion.answer;

        if (isCorrect) {
          player.questionsAnswered += 1;
          player.score += 1;
          player.combo += 1;
          player.ammo += 3;
          if (player.combo >= 3) {
            player.hasMegaShot = true;
          }
          player.answerLockedUntil = now + 450;

          this.send(session.ws, {
            type: 'quiz:result',
            correct: true,
            correctIndex,
            ammoAdded: 3,
            hasMegaShot: player.hasMegaShot,
            lockedMs: 450,
          });
        } else {
          player.combo = 0;
          player.hasMegaShot = false;
          player.answerLockedUntil = now + 1500;

          this.send(session.ws, {
            type: 'quiz:result',
            correct: false,
            correctIndex,
            ammoAdded: 0,
            hasMegaShot: false,
            lockedMs: 1500,
          });
        }

        const nextQ = pickQuestion(room.topic, player.currentQuestion.id);
        player.currentQuestion = nextQ;
        const delayMs = isCorrect ? 450 : 1500;
        const expectedQId = nextQ.id;

        setTimeout(() => {
          if (room.phase !== 'PLAYING') return;
          const p = room.players.get(session.playerId);
          if (!p || p.isEliminated || p.currentQuestion?.id !== expectedQId) return;
          const s = this.sessions.get(session.playerId);
          if (s) {
            this.send(s.ws, {
              type: 'quiz:question',
              question: toClientQuestion(nextQ),
            });
          }
        }, delayMs);
        break;
      }

      case 'player:throw': {
        const room = this.getRoomForSession(session);
        if (!room || room.phase !== 'PLAYING') return;
        const shooter = room.players.get(session.playerId);
        if (!shooter || shooter.isEliminated || shooter.ammo <= 0) return;

        const now = Date.now();
        if (now < shooter.frozenUntil) return;
        if (now - shooter.lastThrowAt < 250) return;

        const target = room.players.get(msg.targetId);
        if (!target || target.id === shooter.id || target.isEliminated) return;

        shooter.lastThrowAt = now;
        const isMega = shooter.hasMegaShot;
        this.spawnSnowball(room, shooter, target, isMega);
        shooter.ammo -= 1;
        if (isMega) {
          shooter.hasMegaShot = false;
          shooter.combo = 0;
        }
        break;
      }
    }
  }

  private getRoomForSession(session: ClientSession): GameRoom | null {
    if (!session.roomCode) return null;
    return this.rooms.get(session.roomCode) ?? null;
  }

  private leaveCurrentRoom(session: ClientSession) {
    if (!session.roomCode) return;
    const room = this.rooms.get(session.roomCode);
    session.roomCode = null;
    if (!room) return;

    const leaving = room.players.get(session.playerId);
    room.players.delete(session.playerId);

    const remainingHumans = Array.from(room.players.values()).filter((p) => !p.isBot && p.connected);
    if (remainingHumans.length === 0) {
      room.emptySince = Date.now();
      if (room.tickTimer) {
        clearInterval(room.tickTimer);
        room.tickTimer = null;
      }
    } else {
      if (room.hostId === session.playerId) {
        const nextHost = remainingHumans[0];
        nextHost.isHost = true;
        room.hostId = nextHost.id;
      }
      this.broadcastRoom(room, {
        type: 'room:state',
        state: this.buildRoomState(room),
      });
      if (leaving && room.phase === 'PLAYING') {
        this.broadcastRoom(room, {
          type: 'game:event',
          event: {
            id: crypto.randomUUID(),
            kind: 'info',
            message: `${leaving.name} keluar dari arena.`,
          },
        });
      }
    }
    this.broadcastLobbyList();
  }

  private handleDisconnect(session: ClientSession) {
    this.leaveCurrentRoom(session);
    this.sessions.delete(session.playerId);
  }

  private startMatch(room: GameRoom) {
    if (room.tickTimer) {
      clearInterval(room.tickTimer);
      room.tickTimer = null;
    }

    // Remove any leftover bots first
    for (const [id, p] of room.players.entries()) {
      if (p.isBot) room.players.delete(id);
    }

    // Reset all human players
    for (const p of room.players.values()) {
      const spawn = randomSpawnPos();
      p.x = spawn.x;
      p.y = spawn.y;
      p.inputVx = 0;
      p.inputVy = 0;
      p.moveTarget = null;
      p.hp = MAX_HP;
      p.isEliminated = false;
      p.questionsAnswered = 0;
      p.hitsLanded = 0;
      p.score = 0;
      p.combo = 0;
      p.ammo = 0;
      p.hasMegaShot = false;
      p.frozenUntil = 0;
      p.isHiding = false;
      p.coverLabel = null;
      p.seekCoverActive = false;
      p.answerLockedUntil = 0;
      p.currentQuestion = pickQuestion(room.topic);
    }

    // Optionally add classroom AI classmates if host toggled fillWithBots
    if (room.fillWithBots) {
      const humanCount = room.players.size;
      const botsNeeded = Math.max(0, Math.min(37, room.targetTotalPlayers - humanCount));
      for (let i = 0; i < botsNeeded; i++) {
        const spawn = randomSpawnPos();
        const botId = `bot_${i}_${crypto.randomUUID().slice(0, 4)}`;
        const bot: ServerPlayer = {
          id: botId,
          name: CLASSMATE_BOT_NAMES[i % CLASSMATE_BOT_NAMES.length],
          emoji: BOT_EMOJIS[i % BOT_EMOJIS.length],
          isBot: true,
          isHost: false,
          connected: true,
          x: spawn.x,
          y: spawn.y,
          inputVx: 0,
          inputVy: 0,
          moveTarget: null,
          botVx: (Math.random() - 0.5) * 95,
          botVy: (Math.random() - 0.5) * 95,
          hp: MAX_HP,
          isEliminated: false,
          questionsAnswered: 0,
          hitsLanded: 0,
          score: 0,
          combo: 0,
          ammo: Math.random() > 0.65 ? 3 : 0,
          hasMegaShot: false,
          frozenUntil: 0,
          isHiding: false,
          coverLabel: null,
          seekCoverActive: false,
          hideTimerMs: 0,
          aiTimerMs: 1200 + Math.random() * 3200,
          currentQuestion: null,
          answerLockedUntil: 0,
          lastThrowAt: 0,
        };
        room.players.set(botId, bot);
      }
    }

    room.phase = 'PLAYING';
    room.timeLeftSec = room.durationSec;
    room.snowballs = [];
    room.lastTickAt = Date.now();
    room.secondAccumMs = 0;

    const fullState = this.buildRoomState(room);
    for (const player of room.players.values()) {
      if (player.isBot) continue;
      const sess = this.sessions.get(player.id);
      if (sess) {
        this.send(sess.ws, {
          type: 'room:state',
          state: fullState,
        });
        if (player.currentQuestion) {
          this.send(sess.ws, {
            type: 'quiz:question',
            question: toClientQuestion(player.currentQuestion),
          });
        }
      }
    }

    this.broadcastRoom(room, {
      type: 'game:event',
      event: {
        id: crypto.randomUUID(),
        kind: 'info',
        message: 'Pertandingan dimulai! Jawab soal untuk mendapat +3 peluru salju!',
      },
    });
    this.broadcastLobbyList();

    room.tickTimer = setInterval(() => {
      this.tickRoom(room);
    }, TICK_MS);
  }

  private resetRoomToWaiting(room: GameRoom) {
    if (room.tickTimer) {
      clearInterval(room.tickTimer);
      room.tickTimer = null;
    }

    for (const [id, p] of room.players.entries()) {
      if (p.isBot) {
        room.players.delete(id);
      } else {
        const spawn = randomSpawnPos();
        p.x = spawn.x;
        p.y = spawn.y;
        p.hp = MAX_HP;
        p.isEliminated = false;
        p.questionsAnswered = 0;
        p.hitsLanded = 0;
        p.score = 0;
        p.combo = 0;
        p.ammo = 0;
        p.hasMegaShot = false;
        p.frozenUntil = 0;
        p.isHiding = false;
        p.coverLabel = null;
        p.seekCoverActive = false;
        p.currentQuestion = null;
      }
    }

    room.phase = 'WAITING';
    room.timeLeftSec = room.durationSec;
    room.snowballs = [];

    this.broadcastRoom(room, {
      type: 'room:state',
      state: this.buildRoomState(room),
    });
    this.broadcastLobbyList();
  }

  private spawnSnowball(
    room: GameRoom,
    shooter: ServerPlayer,
    target: ServerPlayer,
    isMega: boolean,
  ) {
    shooter.isHiding = false;
    shooter.coverLabel = null;
    shooter.seekCoverActive = false;

    room.snowballs.push({
      id: crypto.randomUUID().slice(0, 8),
      shooterId: shooter.id,
      shooterName: shooter.name,
      targetId: target.id,
      x: shooter.x,
      y: shooter.y,
      speed: isMega ? SNOWBALL_SPEED_MEGA : SNOWBALL_SPEED_NORMAL,
      isMega,
    });

    this.broadcastRoom(room, {
      type: 'game:event',
      event: {
        id: crypto.randomUUID(),
        kind: isMega ? 'mega' : 'info',
        message: isMega
          ? `${shooter.name} meluncurkan MEGA SNOWBALL ke ${target.name}!`
          : '',
        shooterId: shooter.id,
        targetId: target.id,
        isMega,
        sound: 'throw',
      },
    });
  }

  private tickRoom(room: GameRoom) {
    if (room.phase !== 'PLAYING') return;

    const now = Date.now();
    const dtMs = Math.min(200, now - room.lastTickAt);
    const dtSec = dtMs / 1000;
    room.lastTickAt = now;

    // Countdown match timer
    room.secondAccumMs += dtMs;
    if (room.secondAccumMs >= 1000) {
      room.secondAccumMs -= 1000;
      room.timeLeftSec = Math.max(0, room.timeLeftSec - 1);
      if (room.timeLeftSec <= 0) {
        this.endMatch(room);
        return;
      }
    }

    // Update players & bots
    const allPlayers = Array.from(room.players.values());
    for (const p of allPlayers) {
      if (p.isEliminated || now < p.frozenUntil) continue;

      if (!p.isBot) {
        // Human movement
        if (p.seekCoverActive) {
          let nearestObs: Obstacle | null = null;
          let minDist = Infinity;
          for (const obs of room.obstacles) {
            const d = Math.hypot(obs.x - p.x, obs.y - p.y);
            if (d < minDist) {
              minDist = d;
              nearestObs = obs;
            }
          }
          if (nearestObs) {
            if (minDist > nearestObs.radius * 0.4) {
              const angle = Math.atan2(nearestObs.y - p.y, nearestObs.x - p.x);
              p.x += Math.cos(angle) * PLAYER_SPEED_PX_PER_SEC * dtSec;
              p.y += Math.sin(angle) * PLAYER_SPEED_PX_PER_SEC * dtSec;
              p.isHiding = false;
              p.coverLabel = null;
            } else {
              p.isHiding = true;
              p.coverLabel = nearestObs.label;
              p.seekCoverActive = false;
            }
          }
        } else if (p.inputVx !== 0 || p.inputVy !== 0) {
          const mag = Math.hypot(p.inputVx, p.inputVy) || 1;
          p.x += (p.inputVx / mag) * PLAYER_SPEED_PX_PER_SEC * dtSec;
          p.y += (p.inputVy / mag) * PLAYER_SPEED_PX_PER_SEC * dtSec;
          this.updateHumanCoverProximity(room, p);
        } else if (p.moveTarget) {
          const dx = p.moveTarget.x - p.x;
          const dy = p.moveTarget.y - p.y;
          const dist = Math.hypot(dx, dy);
          const step = PLAYER_SPEED_PX_PER_SEC * dtSec;
          if (dist <= step) {
            p.x = p.moveTarget.x;
            p.y = p.moveTarget.y;
            p.moveTarget = null;
          } else {
            p.x += (dx / dist) * step;
            p.y += (dy / dist) * step;
          }
          this.updateHumanCoverProximity(room, p);
        } else {
          this.updateHumanCoverProximity(room, p);
        }

        p.x = Math.max(30, Math.min(ARENA_WIDTH - 30, p.x));
        p.y = Math.max(68, Math.min(ARENA_HEIGHT - 30, p.y));
      } else {
        // AI Bot movement & decision making
        if (!p.isHiding) {
          p.x += p.botVx * dtSec;
          p.y += p.botVy * dtSec;
          if (p.x < 30 || p.x > ARENA_WIDTH - 30) {
            p.botVx *= -1;
            p.x = Math.max(30, Math.min(ARENA_WIDTH - 30, p.x));
          }
          if (p.y < 68 || p.y > ARENA_HEIGHT - 30) {
            p.botVy *= -1;
            p.y = Math.max(68, Math.min(ARENA_HEIGHT - 30, p.y));
          }
          for (const obs of room.obstacles) {
            const dist = Math.hypot(p.x - obs.x, p.y - obs.y);
            if (dist < obs.radius * 0.65 && Math.random() < 0.02) {
              p.isHiding = true;
              p.coverLabel = obs.label;
              p.hideTimerMs = 3500 + Math.random() * 4000;
              break;
            }
          }
        } else {
          p.hideTimerMs -= dtMs;
          if (p.hideTimerMs <= 0) {
            p.isHiding = false;
            p.coverLabel = null;
            p.botVx = (Math.random() - 0.5) * 110;
            p.botVy = (Math.random() - 0.5) * 110;
          }
        }

        p.aiTimerMs -= dtMs;
        if (p.aiTimerMs <= 0) {
          p.aiTimerMs = 2800 + Math.random() * 4200;
          if (!p.isHiding) {
            p.botVx = (Math.random() - 0.5) * 110;
            p.botVy = (Math.random() - 0.5) * 110;
          }
          if (Math.random() < 0.42) {
            p.questionsAnswered += 1;
            p.score += 1;
            p.combo += 1;
            p.ammo += 3;
            if (p.combo >= 3) p.hasMegaShot = true;
          }
          if (p.ammo > 0 && Math.random() < 0.52) {
            const candidates = allPlayers.filter(
              (other) => other.id !== p.id && !other.isEliminated,
            );
            if (candidates.length > 0) {
              const target = candidates[Math.floor(Math.random() * candidates.length)];
              const useMega = p.hasMegaShot;
              this.spawnSnowball(room, p, target, useMega);
              p.ammo -= 1;
              if (useMega) {
                p.hasMegaShot = false;
                p.combo = 0;
              }
            }
          }
        }
      }
    }

    // Update snowballs
    for (let i = room.snowballs.length - 1; i >= 0; i--) {
      const sb = room.snowballs[i];
      const target = room.players.get(sb.targetId);
      if (!target || target.isEliminated) {
        room.snowballs.splice(i, 1);
        continue;
      }

      const dx = target.x - sb.x;
      const dy = target.y - sb.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 22) {
        const shooter = room.players.get(sb.shooterId);
        if (target.isHiding && !sb.isMega) {
          this.broadcastRoom(room, {
            type: 'game:event',
            event: {
              id: crypto.randomUUID(),
              kind: 'shield',
              message: `${target.name} terlindung di balik ${target.coverLabel ?? 'persembunyian'}!`,
              x: target.x,
              y: target.y,
              floatingText: 'Terlindung!',
              floatingColor: '#059669',
              shooterId: sb.shooterId,
              targetId: target.id,
              isMega: false,
              sound: 'shield',
            },
          });
        } else {
          const brokeCover = target.isHiding && sb.isMega;
          if (brokeCover) {
            target.isHiding = false;
            target.coverLabel = null;
          }

          target.hp = Math.max(0, target.hp - 1);
          target.frozenUntil = now + FREEZE_DURATION_MS;
          target.combo = 0;
          target.hasMegaShot = false;
          target.moveTarget = null;
          target.seekCoverActive = false;

          if (shooter) {
            shooter.hitsLanded += 1;
            shooter.score += 1;
          }

          if (target.hp <= 0) {
            target.isEliminated = true;
            this.broadcastRoom(room, {
              type: 'game:event',
              event: {
                id: crypto.randomUUID(),
                kind: 'eliminated',
                message: `${target.name} tereliminasi oleh ${sb.shooterName}!`,
                x: target.x,
                y: target.y,
                floatingText: 'ELIMINATED!',
                floatingColor: '#e11d48',
                shooterId: sb.shooterId,
                targetId: target.id,
                isMega: sb.isMega,
                sound: 'eliminated',
              },
            });
          } else {
            this.broadcastRoom(room, {
              type: 'game:event',
              event: {
                id: crypto.randomUUID(),
                kind: 'hit',
                message: brokeCover
                  ? `MEGA SNOWBALL! ${sb.shooterName} menjebol persembunyian ${target.name}!`
                  : `${sb.shooterName} menembak ${target.name}! (${target.hp}/${MAX_HP} nyawa)`,
                x: target.x,
                y: target.y,
                floatingText: brokeCover ? 'PERSEMBUNYIAN JEBOL!' : `-1 Nyawa (${target.hp}/5)`,
                floatingColor: brokeCover ? '#d97706' : '#0284c7',
                shooterId: sb.shooterId,
                targetId: target.id,
                isMega: sb.isMega,
                sound: 'hit',
              },
            });
          }
        }

        room.snowballs.splice(i, 1);
      } else {
        const step = sb.speed * dtSec;
        sb.x += (dx / dist) * step;
        sb.y += (dy / dist) * step;
      }
    }

    // Check last-player-standing end condition (when room has >= 2 players)
    const aliveCount = allPlayers.filter((p) => !p.isEliminated).length;
    if (allPlayers.length >= 2 && aliveCount <= 1) {
      this.endMatch(room);
      return;
    }

    this.broadcastRoom(room, {
      type: 'room:tick',
      serverNow: now,
      timeLeftSec: room.timeLeftSec,
      phase: room.phase,
      players: allPlayers.map(toPlayerSnapshot),
      snowballs: room.snowballs.map(toSnowballSnapshot),
    });
  }

  private updateHumanCoverProximity(room: GameRoom, player: ServerPlayer) {
    let inObstacle: Obstacle | null = null;
    for (const obs of room.obstacles) {
      const dist = Math.hypot(player.x - obs.x, player.y - obs.y);
      if (dist < obs.radius * 0.72) {
        inObstacle = obs;
        break;
      }
    }
    if (inObstacle) {
      player.isHiding = true;
      player.coverLabel = inObstacle.label;
    } else {
      player.isHiding = false;
      player.coverLabel = null;
    }
  }

  private endMatch(room: GameRoom) {
    if (room.tickTimer) {
      clearInterval(room.tickTimer);
      room.tickTimer = null;
    }
    room.phase = 'ENDED';
    this.broadcastRoom(room, {
      type: 'room:state',
      state: this.buildRoomState(room),
    });
    this.broadcastLobbyList();
  }
}
