import type { RoomStatePayload } from '../shared/types.ts';

interface PodiumModalProps {
  roomState: RoomStatePayload;
  myId: string;
  onRematch: () => void;
  onLeaveRoom: () => void;
}

export function PodiumModal({
  roomState,
  myId,
  onRematch,
  onLeaveRoom,
}: PodiumModalProps) {
  const isHost = roomState.hostId === myId;
  const sorted = [...roomState.players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return Number(a.isEliminated) - Number(b.isEliminated);
  });
  const top5 = sorted.slice(0, 5);
  const myRank = sorted.findIndex((p) => p.id === myId) + 1;
  const me = sorted.find((p) => p.id === myId);
  const medals = ['JUARA 1', 'JUARA 2', 'JUARA 3', 'PERINGKAT 4', 'PERINGKAT 5'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
      <div className="bg-slate-900 border border-amber-400/50 rounded-2xl max-w-lg w-full p-6 sm:p-8 text-center shadow-2xl">
        <div className="text-4xl mb-2">🏆</div>
        <h2 className="font-game text-2xl sm:text-3xl font-bold text-amber-400 mb-1">
          Pertandingan Selesai
        </h2>
        <p className="text-slate-300 text-sm mb-5">
          Peringkat berdasarkan total Soal Benar + Lawan Tertembak
        </p>

        <div className="space-y-2.5 mb-5 text-left max-h-[340px] overflow-y-auto pr-1">
          {top5.map((p, idx) => (
            <div
              key={p.id}
              className={`flex items-center justify-between p-3 rounded-xl border ${
                idx === 0
                  ? 'bg-amber-500/15 border-amber-400/50'
                  : p.id === myId
                    ? 'bg-sky-950/60 border-sky-500/50'
                    : 'bg-slate-950 border-slate-800'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <span
                  className={`font-game font-bold text-[11px] px-2.5 py-1 rounded-lg shrink-0 ${
                    idx === 0
                      ? 'bg-amber-400 text-slate-950'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {medals[idx]}
                </span>
                <div className="min-w-0">
                  <div
                    className={`font-semibold text-sm truncate ${
                      p.id === myId ? 'text-sky-300' : 'text-white'
                    }`}
                  >
                    {p.emoji} {p.name} {p.isEliminated ? '(Tereliminasi)' : ''}
                  </div>
                  <div className="text-xs text-slate-400 tabular-nums">
                    {p.questionsAnswered} Soal Benar · {p.hitsLanded} Lawan Tertembak
                  </div>
                </div>
              </div>
              <div className="font-mono font-bold text-amber-400 text-sm shrink-0 tabular-nums">
                {p.score} Poin
              </div>
            </div>
          ))}
        </div>

        {me && myRank > 5 && (
          <div className="mb-5 p-3 rounded-xl bg-sky-950/50 border border-sky-500/40 flex items-center justify-between text-xs">
            <span className="text-sky-200 font-semibold">
              Peringkatmu: #{myRank} dari {sorted.length} pemain
            </span>
            <span className="font-mono font-bold text-amber-300 tabular-nums">
              {me.score} Poin ({me.questionsAnswered}Q + {me.hitsLanded}H)
            </span>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          {isHost ? (
            <button
              type="button"
              onClick={onRematch}
              className="flex-1 py-3 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-game font-bold text-base transition cursor-pointer"
            >
              Main Lagi di Room Ini
            </button>
          ) : (
            <div className="flex-1 py-3 px-4 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium flex items-center justify-center">
              Menunggu host memulai ronde baru...
            </div>
          )}
          <button
            type="button"
            onClick={onLeaveRoom}
            className="py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition cursor-pointer"
          >
            Lobi Utama
          </button>
        </div>
      </div>
    </div>
  );
}
