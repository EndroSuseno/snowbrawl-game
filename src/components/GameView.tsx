import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LogOut, Snowflake, Volume2, VolumeX } from 'lucide-react';
import type {
  ClientQuestion,
  GameEventPayload,
  RoomStatePayload,
} from '../shared/types.ts';
import type { QuizFeedback } from '../hooks/useMultiplayerSocket.ts';
import { soundFX } from '../utils/sound.ts';
import { ArenaCanvas } from './ArenaCanvas.tsx';
import { PodiumModal } from './PodiumModal.tsx';

interface GameViewProps {
  roomState: RoomStatePayload;
  myId: string;
  currentQuestion: ClientQuestion | null;
  quizFeedback: QuizFeedback | null;
  killFeed: string;
  pendingEvents: GameEventPayload[];
  onEventsConsumed: () => void;
  onMoveInput: (vx: number, vy: number) => void;
  onMoveTo: (x: number, y: number) => void;
  onToggleCover: () => void;
  onAnswerQuiz: (questionId: string, selectedIndex: number) => void;
  onThrowSnowball: (targetId: string) => void;
  onRematch: () => void;
  onLeaveRoom: () => void;
}

export function GameView({
  roomState,
  myId,
  currentQuestion,
  quizFeedback,
  killFeed,
  pendingEvents,
  onEventsConsumed,
  onMoveInput,
  onMoveTo,
  onToggleCover,
  onAnswerQuiz,
  onThrowSnowball,
  onRematch,
  onLeaveRoom,
}: GameViewProps) {
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [selectedAnswerIdx, setSelectedAnswerIdx] = useState<number | null>(null);
  const [muted, setMuted] = useState(soundFX.muted);
  const [spectatingDismissed, setSpectatingDismissed] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const pressedKeysRef = useRef<Set<string>>(new Set());
  const lastMoveVecRef = useRef<{ vx: number; vy: number }>({ vx: 0, vy: 0 });

  const me = useMemo(
    () => roomState.players.find((p) => p.id === myId) ?? null,
    [roomState.players, myId],
  );

  const aliveEnemies = useMemo(
    () =>
      roomState.players
        .filter((p) => p.id !== myId && !p.isEliminated)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [roomState.players, myId],
  );

  // Reset selected answer highlight whenever a new question arrives
  useEffect(() => {
    setSelectedAnswerIdx(null);
  }, [currentQuestion?.id]);

  // Keep local clock ticking smoothly when frozen or locked
  useEffect(() => {
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // Clear selected target if eliminated
  useEffect(() => {
    if (
      selectedTargetId &&
      !aliveEnemies.some((enemy) => enemy.id === selectedTargetId)
    ) {
      setSelectedTargetId(null);
    }
  }, [aliveEnemies, selectedTargetId]);

  const isFrozen = Boolean(me && !me.isEliminated && nowMs < me.frozenUntil);
  const frozenRemainingSec = me
    ? Math.max(1, Math.ceil((me.frozenUntil - nowMs) / 1000))
    : 0;
  const isQuizLocked = Boolean(
    quizFeedback && nowMs < quizFeedback.lockedUntil,
  );

  const handleThrow = useCallback(() => {
    if (!me || me.isEliminated || me.ammo <= 0 || isFrozen) return;
    let targetId = selectedTargetId;
    if (!targetId || !aliveEnemies.some((e) => e.id === targetId)) {
      if (aliveEnemies.length === 0) return;
      targetId =
        aliveEnemies[Math.floor(Math.random() * aliveEnemies.length)].id;
      setSelectedTargetId(targetId);
    }
    onThrowSnowball(targetId);
  }, [me, isFrozen, selectedTargetId, aliveEnemies, onThrowSnowball]);

  const handleOptionClick = useCallback(
    (idx: number) => {
      if (
        !currentQuestion ||
        !me ||
        me.isEliminated ||
        isFrozen ||
        isQuizLocked ||
        selectedAnswerIdx !== null
      ) {
        return;
      }
      setSelectedAnswerIdx(idx);
      onAnswerQuiz(currentQuestion.id, idx);
    },
    [currentQuestion, me, isFrozen, isQuizLocked, selectedAnswerIdx, onAnswerQuiz],
  );

  // Keyboard shortcuts: WASD / Arrows to move, 1-4 to answer, Space to throw
  useEffect(() => {
    const computeVector = () => {
      const keys = pressedKeysRef.current;
      let vx = 0;
      let vy = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) vx -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) vx += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) vy -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) vy += 1;

      if (
        vx !== lastMoveVecRef.current.vx ||
        vy !== lastMoveVecRef.current.vy
      ) {
        lastMoveVecRef.current = { vx, vy };
        onMoveInput(vx, vy);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (
        [
          'KeyW',
          'KeyA',
          'KeyS',
          'KeyD',
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
        ].includes(e.code)
      ) {
        if (e.code.startsWith('Arrow')) e.preventDefault();
        pressedKeysRef.current.add(e.code);
        computeVector();
        return;
      }

      if (e.code === 'Digit1') handleOptionClick(0);
      else if (e.code === 'Digit2') handleOptionClick(1);
      else if (e.code === 'Digit3') handleOptionClick(2);
      else if (e.code === 'Digit4') handleOptionClick(3);
      else if (e.code === 'Space') {
        e.preventDefault();
        handleThrow();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (pressedKeysRef.current.has(e.code)) {
        pressedKeysRef.current.delete(e.code);
        computeVector();
      }
    };

    const onBlur = () => {
      if (pressedKeysRef.current.size > 0) {
        pressedKeysRef.current.clear();
        computeVector();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [onMoveInput, handleOptionClick, handleThrow]);

  const toggleMute = () => {
    soundFX.muted = !muted;
    setMuted(soundFX.muted);
  };

  const minutes = Math.floor(Math.max(0, roomState.timeLeftSec) / 60);
  const seconds = Math.max(0, roomState.timeLeftSec) % 60;
  const formattedTimer = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const letters = ['A', 'B', 'C', 'D'];

  const topicLabel = (t?: string) => {
    switch (t) {
      case 'MATH':
        return 'Matematika';
      case 'SCIENCE':
        return 'IPA';
      case 'GENERAL':
        return 'Pengetahuan Umum';
      default:
        return 'Misi Pertanyaan';
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100 select-none">
      {/* Top HUD Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex items-center justify-between gap-4 sticky top-0 z-20">
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-sky-600 flex items-center justify-center text-white">
            <Snowflake className="w-4 h-4" />
          </div>
          <span className="font-game font-bold text-base sm:text-lg text-white whitespace-nowrap">
            Mission to Win
          </span>
          <span className="hidden sm:inline text-xs font-mono text-sky-400">
            · {roomState.code}
          </span>
        </div>

        {/* Center Live Event Feed */}
        <div className="hidden lg:flex items-center justify-center flex-1 max-w-md mx-2 min-w-0">
          <div
            key={killFeed}
            className="kill-feed-item bg-slate-950 border border-slate-800 px-4 py-1.5 rounded-full text-xs font-medium text-sky-200 truncate max-w-full"
          >
            {killFeed}
          </div>
        </div>

        {/* Right HUD Stats & Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div
            className="bg-slate-950 px-2.5 py-1.5 rounded-xl border border-slate-800 flex items-center gap-0.5 text-xs sm:text-sm"
            title="Sisa Nyawa (5x Kena = Tereliminasi)"
          >
            {Array.from({ length: me?.maxHp ?? 5 }).map((_, i) => (
              <span key={i}>{me && i < me.hp ? '❤️' : '🖤'}</span>
            ))}
          </div>

          <div className="bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-1.5">
            <span className="text-xs text-slate-400">Skor</span>
            <span className="font-mono font-bold text-sky-400 text-sm tabular-nums">
              {me?.score ?? 0}
            </span>
          </div>

          <div className="bg-rose-950/60 border border-rose-500/40 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <span className="font-mono font-bold text-rose-300 text-sm tabular-nums">
              {formattedTimer}
            </span>
          </div>

          <button
            type="button"
            onClick={toggleMute}
            aria-label={muted ? 'Nyalakan suara' : 'Matikan suara'}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition cursor-pointer"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={onLeaveRoom}
            aria-label="Keluar dari room"
            className="p-2 rounded-xl bg-slate-800 hover:bg-rose-600 text-slate-200 hover:text-white transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Split Screen: Left Control Panel, Right Alaska Arena */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Control Panel */}
        <section className="w-full lg:w-[420px] xl:w-[450px] bg-slate-900 border-b lg:border-b-0 lg:border-r border-slate-800 p-4 flex flex-col justify-between gap-4 relative z-10">
          {/* Frozen Overlay */}
          {isFrozen && (
            <div className="absolute inset-0 z-30 frozen-overlay flex flex-col items-center justify-center p-6 text-center text-slate-900">
              <div className="text-5xl mb-3 animate-bounce">🥶</div>
              <h3 className="font-game text-2xl font-bold text-slate-900 mb-1">
                Kamu Tertembak!
              </h3>
              <p className="text-sm font-semibold text-slate-800 mb-3">
                Membeku sementara (Sisa {me?.hp ?? 0}/5 Nyawa)
              </p>
              <div className="bg-white/90 px-4 py-1.5 rounded-full font-game font-bold text-sky-700 text-base tabular-nums">
                Cair dalam {frozenRemainingSec} detik...
              </div>
            </div>
          )}

          {/* Game Over Overlay (when eliminated) */}
          {me?.isEliminated && !spectatingDismissed && (
            <div className="absolute inset-0 z-40 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center">
              <div className="text-5xl mb-3">💀</div>
              <h3 className="font-game text-2xl font-bold text-rose-500 mb-1">
                Kamu Tereliminasi
              </h3>
              <p className="text-sm text-slate-300 mb-4">
                Nyawamu sudah habis (5x terkena lemparan salju).
              </p>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 w-full max-w-xs mb-5 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Soal Dijawab Benar</span>
                  <span className="font-mono font-bold text-emerald-400 tabular-nums">
                    {me.questionsAnswered}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Lawan Tertembak</span>
                  <span className="font-mono font-bold text-sky-400 tabular-nums">
                    {me.hitsLanded}
                  </span>
                </div>
                <div className="flex justify-between border-t border-slate-800 pt-2">
                  <span className="text-slate-200 font-semibold">Total Skor</span>
                  <span className="font-mono font-bold text-amber-400 tabular-nums">
                    {me.score}
                  </span>
                </div>
              </div>
              <div className="flex gap-2.5 w-full max-w-xs">
                <button
                  type="button"
                  onClick={() => setSpectatingDismissed(true)}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition cursor-pointer"
                >
                  Tonton Arena
                </button>
                <button
                  type="button"
                  onClick={onLeaveRoom}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs transition cursor-pointer"
                >
                  Keluar Room
                </button>
              </div>
            </div>
          )}

          {/* Ammo & Stats Bar */}
          <div className="bg-slate-950 rounded-2xl p-3.5 border border-slate-800 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0 transition ${
                  !me || me.ammo <= 0 || me.isEliminated
                    ? 'bg-slate-900 border-2 border-dashed border-slate-700'
                    : me.hasMegaShot
                      ? 'bg-amber-400/20 border-2 border-amber-400'
                      : 'bg-sky-500/20 border-2 border-sky-400'
                }`}
              >
                {!me || me.ammo <= 0 || me.isEliminated
                  ? '💨'
                  : me.hasMegaShot
                    ? '☄️'
                    : '⚪'}
              </div>
              <div className="min-w-0">
                <div className="text-xs text-slate-400 font-medium">
                  Peluru Salju
                </div>
                <div
                  className={`font-game font-bold text-sm truncate ${
                    !me || me.ammo <= 0 || me.isEliminated
                      ? 'text-slate-400'
                      : me.hasMegaShot
                        ? 'text-amber-300'
                        : 'text-sky-300'
                  }`}
                >
                  {!me || me.ammo <= 0 || me.isEliminated
                    ? '0 Peluru (Jawab soal = +3)'
                    : me.hasMegaShot
                      ? `${me.ammo} Peluru · MEGA SHOT`
                      : `${me.ammo} Peluru Siap`}
                </div>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div className="text-xs text-slate-400 font-medium">Statistik</div>
              <div className="font-mono font-bold text-xs text-amber-400 tabular-nums">
                {me?.questionsAnswered ?? 0} Soal · {me?.hitsLanded ?? 0} Hit
              </div>
            </div>
          </div>

          {/* Quiz Question Box */}
          <div className="flex-1 flex flex-col justify-center bg-slate-950/70 rounded-2xl p-4 border border-slate-800">
            <div className="flex items-center justify-between gap-2 mb-2.5">
              <span className="text-xs font-semibold text-sky-400">
                {topicLabel(currentQuestion?.topic)}
              </span>

              {quizFeedback && (
                <span
                  className={`text-xs font-bold ${
                    quizFeedback.correct ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {quizFeedback.correct
                    ? quizFeedback.hasMegaShot
                      ? 'Benar! +3 Peluru & Mega Shot'
                      : 'Benar! +3 Peluru'
                    : 'Salah! Tunggu 1,5 detik'}
                </span>
              )}
            </div>

            <h2 className="text-base sm:text-lg font-bold text-white mb-4 leading-snug">
              {me?.isEliminated
                ? 'Kamu sedang menonton sisa pertandingan.'
                : currentQuestion
                  ? currentQuestion.prompt
                  : 'Menyiapkan soal...'}
            </h2>

            {!me?.isEliminated && currentQuestion && (
              <div className="grid grid-cols-1 gap-2.5">
                {currentQuestion.options.map((optText, idx) => {
                  const isPicked = selectedAnswerIdx === idx;
                  const showResult = quizFeedback !== null;
                  const isCorrectOption = showResult && quizFeedback.correctIndex === idx;
                  const isWrongPicked = showResult && isPicked && !quizFeedback.correct;

                  let btnClass =
                    'bg-slate-900 hover:bg-slate-800 border-slate-800 hover:border-sky-500/60 text-slate-100';
                  if (isCorrectOption) {
                    btnClass =
                      'bg-emerald-600/25 border-emerald-400 text-emerald-200';
                  } else if (isWrongPicked) {
                    btnClass = 'bg-rose-600/25 border-rose-400 text-rose-200';
                  }

                  return (
                    <button
                      key={`${currentQuestion.id}_${idx}`}
                      type="button"
                      disabled={isFrozen || isQuizLocked || selectedAnswerIdx !== null}
                      onClick={() => handleOptionClick(idx)}
                      className={`w-full text-left px-3.5 py-2.5 rounded-xl border text-sm font-medium transition flex items-center gap-3 cursor-pointer disabled:cursor-default ${btnClass}`}
                    >
                      <span className="w-6 h-6 rounded-lg bg-slate-800 text-sky-300 font-mono font-bold text-xs flex items-center justify-center shrink-0">
                        {letters[idx]}
                      </span>
                      <span className="flex-1">{optText}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Hide & Throw Action Panel */}
          <div className="bg-slate-950 rounded-2xl p-3.5 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-400">
                Aksi & Persembunyian
              </span>
              <button
                type="button"
                disabled={!me || me.isEliminated || isFrozen}
                onClick={onToggleCover}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition cursor-pointer disabled:opacity-50 ${
                  me?.seekCoverActive
                    ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                    : me?.isHiding
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-900 hover:bg-slate-800 text-emerald-300 border-slate-700'
                }`}
              >
                {me?.seekCoverActive
                  ? 'Berlari ke Tempat Sembunyi...'
                  : me?.isHiding
                    ? `Berlindung: ${me.coverLabel ?? 'Objek'}`
                    : 'Cari Tempat Sembunyi'}
              </button>
            </div>

            <div className="flex gap-2">
              <select
                value={selectedTargetId ?? ''}
                onChange={(e) => setSelectedTargetId(e.target.value || null)}
                aria-label="Pilih target tembakan"
                className="flex-1 min-w-0 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-medium text-white focus:outline-none focus:border-sky-400"
              >
                <option value="">-- Klik lawan di arena / pilih --</option>
                {aliveEnemies.map((enemy) => (
                  <option key={enemy.id} value={enemy.id}>
                    {enemy.emoji} {enemy.name} ({enemy.hp}❤️)
                    {enemy.isHiding ? ' 🛡️' : ''}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={
                  !me ||
                  me.isEliminated ||
                  me.ammo <= 0 ||
                  isFrozen ||
                  aliveEnemies.length === 0
                }
                onClick={handleThrow}
                className="px-5 py-2.5 rounded-xl font-game font-bold text-sm bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 text-white transition cursor-pointer disabled:cursor-not-allowed whitespace-nowrap shrink-0"
              >
                Tembak ❄️
              </button>
            </div>
          </div>
        </section>

        {/* Right Arena Canvas */}
        <section className="flex-1 flex flex-col min-h-[380px] lg:min-h-0">
          <ArenaCanvas
            roomState={roomState}
            myId={myId}
            selectedTargetId={selectedTargetId}
            pendingEvents={pendingEvents}
            onEventsConsumed={onEventsConsumed}
            onSelectTarget={setSelectedTargetId}
            onMoveTo={onMoveTo}
          />
        </section>
      </main>

      {/* End of Match Podium */}
      {roomState.phase === 'ENDED' && (
        <PodiumModal
          roomState={roomState}
          myId={myId}
          onRematch={onRematch}
          onLeaveRoom={onLeaveRoom}
        />
      )}
    </div>
  );
}
