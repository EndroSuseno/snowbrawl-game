import { useState } from 'react';
import { Check, Copy, LogOut, Play, Users } from 'lucide-react';
import type { QuestionTopic, RoomConfig, RoomStatePayload } from '../shared/types.ts';

interface WaitingRoomViewProps {
  roomState: RoomStatePayload;
  myId: string;
  onUpdateConfig: (config: Partial<RoomConfig>) => void;
  onStartMatch: () => void;
  onLeaveRoom: () => void;
}

export function WaitingRoomView({
  roomState,
  myId,
  onUpdateConfig,
  onStartMatch,
  onLeaveRoom,
}: WaitingRoomViewProps) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const isHost = roomState.hostId === myId;
  const humanPlayers = roomState.players.filter((p) => !p.isBot);

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomState.code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  const copyInviteLink = async () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('room', roomState.code);
      await navigator.clipboard.writeText(url.toString());
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  const topicLabel = (t: QuestionTopic) => {
    switch (t) {
      case 'MATH':
        return 'Matematika';
      case 'SCIENCE':
        return 'IPA';
      case 'GENERAL':
        return 'Pengetahuan Umum';
      default:
        return 'Semua Mapel';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/80">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <span className="font-game text-xl font-bold text-white whitespace-nowrap">
            Mission to Win
          </span>

          <div className="hidden sm:flex items-center gap-2 text-sm text-slate-400">
            <span>Lobi Pertandingan</span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-200 font-medium truncate max-w-xs">{roomState.name}</span>
          </div>

          <button
            type="button"
            onClick={onLeaveRoom}
            className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            Keluar Room
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Room Code & Settings */}
        <section className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div>
            <div className="text-xs font-semibold text-slate-400 mb-1">
              Kode Room Undangan
            </div>
            <div className="flex items-center justify-between gap-3 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3">
              <span className="font-mono text-2xl font-bold tracking-widest text-sky-400 tabular-nums">
                {roomState.code}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={copyCode}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCode ? 'Tersalin' : 'Salin'}
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={copyInviteLink}
              className="mt-2.5 w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition cursor-pointer"
            >
              {copiedLink ? 'Link Undangan Tersalin!' : 'Salin Link Undangan Langsung'}
            </button>
          </div>

          <div className="pt-4 border-t border-slate-800 space-y-4">
            <h2 className="font-game text-lg font-bold text-white">
              Pengaturan Pertandingan
            </h2>

            {isHost ? (
              <div className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Durasi
                    </label>
                    <select
                      value={roomState.durationSec}
                      onChange={(e) =>
                        onUpdateConfig({ durationSec: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
                    >
                      <option value={180}>3 Menit</option>
                      <option value={300}>5 Menit</option>
                      <option value={480}>8 Menit</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">
                      Topik Soal
                    </label>
                    <select
                      value={roomState.topic}
                      onChange={(e) =>
                        onUpdateConfig({ topic: e.target.value as QuestionTopic })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white"
                    >
                      <option value="ALL">Semua Mapel</option>
                      <option value="MATH">Matematika</option>
                      <option value="SCIENCE">IPA</option>
                      <option value="GENERAL">Umum</option>
                    </select>
                  </div>
                </div>

                <label className="flex items-start gap-3 bg-slate-950 border border-slate-800 rounded-xl p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={roomState.fillWithBots}
                    onChange={(e) =>
                      onUpdateConfig({ fillWithBots: e.target.checked })
                    }
                    className="mt-0.5 w-4 h-4 accent-sky-500 rounded"
                  />
                  <div className="text-xs">
                    <div className="font-semibold text-slate-200">
                      Isi Kursi Kosong dengan Bot Teman Kelas
                    </div>
                    <div className="text-slate-400 mt-0.5">
                      Total {roomState.targetTotalPlayers} siswa di arena ({humanPlayers.length} online + bot pengisi).
                    </div>
                  </div>
                </label>

                {roomState.fillWithBots && (
                  <div className="flex items-center justify-between text-xs px-1">
                    <span className="text-slate-400">Target Total Siswa</span>
                    <select
                      value={roomState.targetTotalPlayers}
                      onChange={(e) =>
                        onUpdateConfig({ targetTotalPlayers: Number(e.target.value) })
                      }
                      className="px-2.5 py-1 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono"
                    >
                      <option value={12}>12 Siswa</option>
                      <option value={24}>24 Siswa</option>
                      <option value={38}>38 Siswa</option>
                    </select>
                  </div>
                )}

                <button
                  type="button"
                  onClick={onStartMatch}
                  disabled={!roomState.fillWithBots && humanPlayers.length < 2}
                  className="w-full py-3.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-game font-bold text-base flex items-center justify-center gap-2 transition cursor-pointer disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4 fill-current" />
                  Mulai Pertandingan
                </button>
                {!roomState.fillWithBots && humanPlayers.length < 2 && (
                  <p className="text-xs text-amber-400 text-center">
                    Butuh minimal 2 pemain online untuk mode PvP murni, atau aktifkan Bot Teman Kelas.
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-3 text-sm text-slate-300">
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Durasi</span>
                  <span className="font-semibold tabular-nums">
                    {Math.round(roomState.durationSec / 60)} Menit
                  </span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Topik Soal</span>
                  <span className="font-semibold">{topicLabel(roomState.topic)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">Mode Arena</span>
                  <span className="font-semibold">
                    {roomState.fillWithBots
                      ? `Online + Bot (${roomState.targetTotalPlayers} Siswa)`
                      : 'Murni Online PvP'}
                  </span>
                </div>
                <p className="text-xs text-sky-400 pt-2">
                  Menunggu host memulai pertandingan...
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Right: Connected Players Roster */}
        <section className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-400" />
              <h2 className="font-game text-xl font-bold text-white">
                Pemain Terhubung
              </h2>
            </div>
            <span className="text-xs font-mono text-slate-400 tabular-nums">
              {humanPlayers.length} / {roomState.targetTotalPlayers} Siswa
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {humanPlayers.map((p) => (
              <div
                key={p.id}
                className={`px-4 py-3 rounded-xl border flex items-center justify-between gap-3 ${
                  p.id === myId
                    ? 'bg-sky-950/50 border-sky-500/50'
                    : 'bg-slate-950 border-slate-800'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-2xl shrink-0">{p.emoji}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">
                      {p.name}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-1.5">
                      {p.isHost && <span className="text-amber-400">Host</span>}
                      {p.isHost && p.id === myId && <span aria-hidden="true">·</span>}
                      {p.id === myId && <span className="text-sky-400">Kamu</span>}
                      {!p.isHost && p.id !== myId && <span>Siap bertempur</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {roomState.fillWithBots && (
            <p className="text-xs text-slate-400 mt-5 pt-4 border-t border-slate-800">
              Saat pertandingan dimulai, {Math.max(0, roomState.targetTotalPlayers - humanPlayers.length)} bot teman kelas akan mengisi sisa kursi di Desa Alaska secara otomatis.
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
