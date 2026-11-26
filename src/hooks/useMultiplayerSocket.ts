import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ClientQuestion,
  ClientToServerMessage,
  GameEventPayload,
  PublicRoomSummary,
  RoomConfig,
  RoomStatePayload,
  ServerToClientMessage,
} from '../shared/types.ts';
import { soundFX } from '../utils/sound.ts';

export interface QuizFeedback {
  correct: boolean;
  correctIndex: number;
  ammoAdded: number;
  hasMegaShot: boolean;
  lockedUntil: number;
}

export function useMultiplayerSocket(
  onVisualEvent?: (event: GameEventPayload) => void,
) {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onVisualEventRef = useRef(onVisualEvent);
  onVisualEventRef.current = onVisualEvent;

  const [connected, setConnected] = useState(false);
  const [myId, setMyId] = useState<string | null>(null);
  const [publicRooms, setPublicRooms] = useState<PublicRoomSummary[]>([]);
  const [roomState, setRoomState] = useState<RoomStatePayload | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<ClientQuestion | null>(null);
  const [quizFeedback, setQuizFeedback] = useState<QuizFeedback | null>(null);
  const [killFeed, setKillFeed] = useState<string>(
    'Selamat datang di Desa Alaska! Jawab soal untuk mendapat +3 peluru salju.',
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const sendMessage = useCallback((msg: ClientToServerMessage) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }, []);

  useEffect(() => {
    let unmounted = false;
    let attempt = 0;

    function connect() {
      if (unmounted) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const url = `${protocol}//${window.location.host}/ws`;
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        if (unmounted) {
          ws.close();
          return;
        }
        attempt = 0;
        setConnected(true);
        setErrorMsg(null);
      };

      ws.onmessage = (ev) => {
        let msg: ServerToClientMessage;
        try {
          msg = JSON.parse(ev.data) as ServerToClientMessage;
        } catch {
          return;
        }

        switch (msg.type) {
          case 'welcome':
            setMyId(msg.playerId);
            setPublicRooms(msg.rooms);
            break;

          case 'lobby:rooms':
            setPublicRooms(msg.rooms);
            break;

          case 'room:joined':
            setMyId(msg.playerId);
            setRoomState(msg.state);
            setCurrentQuestion(msg.question);
            setQuizFeedback(null);
            setErrorMsg(null);
            setKillFeed(
              `Bergabung ke ${msg.state.name}. Jawab soal untuk mendapat +3 peluru!`,
            );
            break;

          case 'room:state':
            setRoomState((prev) => {
              if (prev?.phase === 'PLAYING' && msg.state.phase === 'ENDED') {
                soundFX.play('victory');
              }
              return msg.state;
            });
            if (msg.state.phase === 'WAITING') {
              setCurrentQuestion(null);
              setQuizFeedback(null);
            }
            break;

          case 'room:tick':
            setRoomState((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                serverNow: msg.serverNow,
                timeLeftSec: msg.timeLeftSec,
                phase: msg.phase,
                players: msg.players,
                snowballs: msg.snowballs,
              };
            });
            break;

          case 'quiz:question':
            setCurrentQuestion(msg.question);
            setQuizFeedback(null);
            break;

          case 'quiz:result':
            soundFX.play(msg.correct ? 'correct' : 'wrong');
            setQuizFeedback({
              correct: msg.correct,
              correctIndex: msg.correctIndex,
              ammoAdded: msg.ammoAdded,
              hasMegaShot: msg.hasMegaShot,
              lockedUntil: Date.now() + msg.lockedMs,
            });
            break;

          case 'game:event':
            if (msg.event.message) {
              setKillFeed(msg.event.message);
            }
            if (msg.event.sound) {
              soundFX.play(msg.event.sound);
            }
            if (onVisualEventRef.current) {
              onVisualEventRef.current(msg.event);
            }
            break;

          case 'error':
            setErrorMsg(msg.message);
            break;
        }
      };

      ws.onclose = () => {
        if (unmounted) return;
        setConnected(false);
        setRoomState(null);
        const delay = Math.min(5000, 800 * Math.pow(1.5, attempt));
        attempt += 1;
        reconnectTimerRef.current = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      unmounted = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const refreshRooms = useCallback(() => {
    sendMessage({ type: 'lobby:list' });
  }, [sendMessage]);

  const createRoom = useCallback(
    (playerName: string, emoji: string, config: RoomConfig) => {
      soundFX.unlock();
      sendMessage({ type: 'room:create', playerName, emoji, config });
    },
    [sendMessage],
  );

  const joinRoom = useCallback(
    (code: string, playerName: string, emoji: string) => {
      soundFX.unlock();
      sendMessage({ type: 'room:join', code: code.trim().toUpperCase(), playerName, emoji });
    },
    [sendMessage],
  );

  const leaveRoom = useCallback(() => {
    sendMessage({ type: 'room:leave' });
    setRoomState(null);
    setCurrentQuestion(null);
    setQuizFeedback(null);
  }, [sendMessage]);

  const updateRoomConfig = useCallback(
    (config: Partial<RoomConfig>) => {
      sendMessage({ type: 'room:update_config', config });
    },
    [sendMessage],
  );

  const startMatch = useCallback(() => {
    soundFX.unlock();
    sendMessage({ type: 'room:start' });
  }, [sendMessage]);

  const rematch = useCallback(() => {
    sendMessage({ type: 'room:rematch' });
  }, [sendMessage]);

  const sendMoveInput = useCallback(
    (vx: number, vy: number) => {
      sendMessage({ type: 'player:move_input', vx, vy });
    },
    [sendMessage],
  );

  const sendMoveTo = useCallback(
    (x: number, y: number) => {
      sendMessage({ type: 'player:move_to', x, y });
    },
    [sendMessage],
  );

  const toggleCover = useCallback(() => {
    sendMessage({ type: 'player:toggle_cover' });
  }, [sendMessage]);

  const answerQuiz = useCallback(
    (questionId: string, selectedIndex: number) => {
      soundFX.unlock();
      sendMessage({ type: 'quiz:answer', questionId, selectedIndex });
    },
    [sendMessage],
  );

  const throwSnowball = useCallback(
    (targetId: string) => {
      soundFX.unlock();
      sendMessage({ type: 'player:throw', targetId });
    },
    [sendMessage],
  );

  return {
    connected,
    myId,
    publicRooms,
    roomState,
    currentQuestion,
    quizFeedback,
    killFeed,
    errorMsg,
    clearError: () => setErrorMsg(null),
    refreshRooms,
    createRoom,
    joinRoom,
    leaveRoom,
    updateRoomConfig,
    startMatch,
    rematch,
    sendMoveInput,
    sendMoveTo,
    toggleCover,
    answerQuiz,
    throwSnowball,
  };
}
