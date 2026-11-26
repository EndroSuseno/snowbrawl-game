export type RoomPhase = 'WAITING' | 'PLAYING' | 'ENDED';

export type QuestionTopic = 'ALL' | 'MATH' | 'SCIENCE' | 'GENERAL';

export type ObstacleType = 'igloo' | 'pine' | 'woodpile' | 'snowmound';

export interface Obstacle {
  id: string;
  type: ObstacleType;
  label: string;
  x: number;
  y: number;
  radius: number;
}

export interface PlayerSnapshot {
  id: string;
  name: string;
  emoji: string;
  isBot: boolean;
  isHost: boolean;
  connected: boolean;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
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
}

export interface SnowballSnapshot {
  id: string;
  shooterId: string;
  shooterName: string;
  targetId: string;
  x: number;
  y: number;
  isMega: boolean;
}

export interface ClientQuestion {
  id: string;
  topic: Exclude<QuestionTopic, 'ALL'>;
  prompt: string;
  options: string[];
}

export interface PublicRoomSummary {
  code: string;
  name: string;
  hostName: string;
  phase: RoomPhase;
  humanCount: number;
  totalPlayers: number;
  maxHumans: number;
  fillWithBots: boolean;
  topic: QuestionTopic;
  durationSec: number;
}

export interface RoomConfig {
  name: string;
  durationSec: number;
  maxHumans: number;
  fillWithBots: boolean;
  targetTotalPlayers: number;
  topic: QuestionTopic;
  isPublic: boolean;
}

export interface GameEventPayload {
  id: string;
  kind: 'hit' | 'shield' | 'eliminated' | 'mega' | 'info';
  message: string;
  x?: number;
  y?: number;
  floatingText?: string;
  floatingColor?: string;
  shooterId?: string;
  targetId?: string;
  isMega?: boolean;
  sound?: 'hit' | 'shield' | 'throw' | 'eliminated';
}

export interface RoomStatePayload {
  code: string;
  name: string;
  phase: RoomPhase;
  hostId: string;
  timeLeftSec: number;
  durationSec: number;
  serverNow: number;
  arenaWidth: number;
  arenaHeight: number;
  topic: QuestionTopic;
  fillWithBots: boolean;
  targetTotalPlayers: number;
  isPublic: boolean;
  obstacles: Obstacle[];
  players: PlayerSnapshot[];
  snowballs: SnowballSnapshot[];
}

export type ClientToServerMessage =
  | {
      type: 'lobby:list';
    }
  | {
      type: 'room:create';
      playerName: string;
      emoji: string;
      config: RoomConfig;
    }
  | {
      type: 'room:join';
      code: string;
      playerName: string;
      emoji: string;
    }
  | {
      type: 'room:leave';
    }
  | {
      type: 'room:update_config';
      config: Partial<RoomConfig>;
    }
  | {
      type: 'room:start';
    }
  | {
      type: 'room:rematch';
    }
  | {
      type: 'player:move_input';
      vx: number;
      vy: number;
    }
  | {
      type: 'player:move_to';
      x: number;
      y: number;
    }
  | {
      type: 'player:toggle_cover';
    }
  | {
      type: 'quiz:answer';
      questionId: string;
      selectedIndex: number;
    }
  | {
      type: 'player:throw';
      targetId: string;
    };

export type ServerToClientMessage =
  | {
      type: 'welcome';
      playerId: string;
      rooms: PublicRoomSummary[];
    }
  | {
      type: 'lobby:rooms';
      rooms: PublicRoomSummary[];
    }
  | {
      type: 'room:joined';
      playerId: string;
      state: RoomStatePayload;
      question: ClientQuestion | null;
    }
  | {
      type: 'room:state';
      state: RoomStatePayload;
    }
  | {
      type: 'room:tick';
      serverNow: number;
      timeLeftSec: number;
      phase: RoomPhase;
      players: PlayerSnapshot[];
      snowballs: SnowballSnapshot[];
    }
  | {
      type: 'quiz:question';
      question: ClientQuestion;
    }
  | {
      type: 'quiz:result';
      correct: boolean;
      correctIndex: number;
      ammoAdded: number;
      hasMegaShot: boolean;
      lockedMs: number;
    }
  | {
      type: 'game:event';
      event: GameEventPayload;
    }
  | {
      type: 'error';
      message: string;
    };
