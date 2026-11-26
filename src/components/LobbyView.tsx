import { useEffect, useState } from 'react';
import { RefreshCw, Shield, Snowflake, Users, Wifi, WifiOff } from 'lucide-react';
import type { PublicRoomSummary, QuestionTopic, RoomConfig } from '../shared/types.ts';

const AVATARS = ['🦸', '🐧', '🦊', '🐻‍❄️', '🦉', '🐺', '🦌', '🦭', '⛄', '🎿', '🏂'];

interface LobbyViewProps {
  connected: boolean;
  publicRooms: PublicRoomSummary[];
  errorMsg: string | null;
  onClearError: () => void;
  onRefreshRooms: () => void;
  onCreateRoom: (playerName: string, emoji: string, config: RoomConfig) => void;
  onJoinRoom: (code: string, playerName: string, emoji: string) => void;
}

export function LobbyView({
  connected,
  publicRooms,
  errorMsg,
  onClearError,
  onRefreshRooms,
  onCreateRoom,
  onJoinRoom,
}: LobbyViewProps) {
  const [playerName, setPlayerName] = useState('Siswa Alaska');
  const [emoji, setEmoji] = useState('🦸');
  const [joinCode, setJoinCode] = useState('');
  const [activeTab, setActiveTab] = useState<'join' | 'create'>('join');

  // Create room config
  const [roomName, setRoomName] = useState('Kelas Desa Alaska');
  const [durationSec, setDurationSec] = useState(300);
  const [topic, setTopic] = useState<QuestionTopic>('ALL');
  const [fillWithBots, setFillWithBots] = useState(true);
  const [targetTotalPlayers, setTargetTotalPlayers] = useState(38);
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get('room');
    if (codeFromUrl) {
      setJoinCode(codeFromUrl.toUpperCase().slice(0, 6));
      setActiveTab('join');
    }
  }, []);

  const safeName = playerName.trim() || 'Siswa';

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    onJoinRoom(joinCode.trim().toUpperCase(), safeName, emoji);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onCreateRoom(safeName, emoji, {
      name: roomName.trim() || 'Kelas Desa Alaska',
      durationSec,
      maxHumans: 38,
      fillWithBots,
      targetTotalPlayers,
      topic,
      isPublic,
    });
  };

  const topicLabel = (t: QuestionTopic) => {
    switch (t) {
      case 'MATH':
        return 'Matematika';
      case 'SCIENCE':
        return 'IPA';
      case 'GENERAL':
        return 'Umum';
      default:
        return 'Semua Mapel';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Bar: Clean 3-zone contract */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between gap-8">
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center text-white">
              <Snowflake className="w-5 h-5" />
            </div>
            <span className="font-game text-xl font-bold tracking-tight text-white whitespace-nowrap">
              Mission to Win
            </span>
          </div>

          <div className="hidden md:flex items-center gap-3 text-sm text-slate-400">
            <span>Desa Alaska</span>
            <span aria-hidden="true">·</span>
            <span>Petak Umpet Salju Multiplayer</span>
            <span aria-hidden="true">·</span>
            <span>Kuis Interaktif Real-Time</span>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium shrink-0">
            {connected ? (
              <span className="flex items-center gap-1.5 text-emerald-400 whitespace-nowrap">
                <Wifi className="w-4 h-4" />
                Server Online
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-400 whitespace-nowrap">
                <WifiOff className="w-4 h-4" />
                Menghubungkan...
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Player Identity & Join/Create Controls */}
        <section className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
          <div>
            <h1 className="font-game text-2xl sm:text-3xl font-bold text-white text-balance">
              Snowbrawl Arena Online
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Jawab soal untuk mengisi peluru salju, sembunyi di balik bangunan Desa Alaska, dan tembak lawan secara real-time.
            </p>
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="bg-rose-950/70 border border-rose-500/40 rounded-xl p-3 text-sm text-rose-200 flex items-center justify-between gap-3"
            >
              <span>{errorMsg}</span>
              <button
                type="button"
                onClick={onClearError}
                className="text-xs font-semibold text-rose-300 hover:text-white px-2 py-1 rounded cursor-pointer shrink-0"
              >
                Tutup
              </button>
            </div>
          )}

          {/* Player Name & Avatar */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            <div>
              <label
                htmlFor="lobby-player-name"
                className="block text-xs font-semibold text-slate-300 mb-1.5"
              >
                Nama Pemain
              </label>
              <input
                id="lobby-player-name"
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                maxLength={16}
                placeholder="Masukkan namamu..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm font-medium focus:outline-none focus:border-sky-400 transition"
              />
            </div>

            <div>
              <span className="block text-xs font-semibold text-slate-300 mb-2">
                Pilih Karakter
              </span>
              <div className="flex flex-wrap gap-1.5">
                {AVATARS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setEmoji(av)}
                    className={`w-10 h-10 rounded-xl text-lg flex items-center justify-center transition cursor-pointer border ${
                      emoji === av
                        ? 'bg-sky-600/25 border-sky-400 scale-105'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-600'
                    }`}
                    aria-label={`Pilih avatar ${av}`}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Segmented Mode Switch: Join vs Create */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab('join')}
              className={`py-2 px-3 rounded-lg text-sm font-semibold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'join'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Gabung Room
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('create')}
              className={`py-2 px-3 rounded-lg text-sm font-semibold transition cursor-pointer whitespace-nowrap ${
                activeTab === 'create'
                  ? 'bg-sky-600 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Buat Room Baru
            </button>
          </div>

          {activeTab === 'join' ? (
            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="join-room-code"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Kode Room (6 Karakter)
                </label>
                <input
                  id="join-room-code"
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  placeholder="Contoh: ALSK42"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white font-mono tracking-widest uppercase text-base focus:outline-none focus:border-sky-400 transition"
                />
              </div>

              <button
                type="submit"
                disabled={!connected || joinCode.trim().length < 4}
                className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-game font-bold text-base transition cursor-pointer disabled:cursor-not-allowed"
              >
                Masuk ke Room
              </button>
            </form>
          ) : (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="create-room-name"
                  className="block text-xs font-semibold text-slate-300 mb-1.5"
                >
                  Nama Room
                </label>
                <input
                  id="create-room-name"
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  maxLength={28}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-400 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="create-duration"
                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                  >
                    Durasi
                  </label>
                  <select
                    id="create-duration"
                    value={durationSec}
                    onChange={(e) => setDurationSec(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-400"
                  >
                    <option value={180}>3 Menit</option>
                    <option value={300}>5 Menit</option>
                    <option value={480}>8 Menit</option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="create-topic"
                    className="block text-xs font-semibold text-slate-300 mb-1.5"
                  >
                    Topik Soal
                  </label>
                  <select
                    id="create-topic"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value as QuestionTopic)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-400"
                  >
                    <option value="ALL">Semua Mapel</option>
                    <option value="MATH">Matematika</option>
                    <option value="SCIENCE">IPA</option>
                    <option value="GENERAL">Pengetahuan Umum</option>
                  </select>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={fillWithBots}
                    onChange={(e) => setFillWithBots(e.target.checked)}
                    className="mt-0.5 w-4 h-4 accent-sky-500 rounded"
                  />
                  <div>
                    <div className="text-sm font-semibold text-slate-200">
                      Isi Kursi Kosong dengan Bot Teman Kelas
                    </div>
                    <div className="text-xs text-slate-400">
                      Aktifkan agar arena tetap ramai (hingga {targetTotalPlayers} siswa) saat bermain solo atau berdua. Nonaktifkan untuk murni PvP antar pemain online.
                    </div>
                  </div>
                </label>

                {fillWithBots && (
                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                    <span className="text-slate-400">Total Target Siswa di Arena</span>
                    <select
                      value={targetTotalPlayers}
                      onChange={(e) => setTargetTotalPlayers(Number(e.target.value))}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-white font-mono"
                    >
                      <option value={12}>12 Siswa</option>
                      <option value={24}>24 Siswa</option>
                      <option value={38}>38 Siswa</option>
                    </select>
                  </div>
                )}

                <label className="flex items-center gap-3 pt-2 border-t border-slate-800/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublic}
                    onChange={(e) => setIsPublic(e.target.checked)}
                    className="w-4 h-4 accent-sky-500 rounded"
                  />
                  <span className="text-xs font-medium text-slate-300">
                    Tampilkan room di daftar publik
                  </span>
                </label>
              </div>

              <button
                type="submit"
                disabled={!connected}
                className="w-full py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-game font-bold text-base transition cursor-pointer disabled:cursor-not-allowed"
              >
                Buat & Masuk Room
              </button>
            </form>
          )}
        </section>

        {/* Right Column: Live Public Rooms + Rules */}
        <section className="lg:col-span-7 space-y-6">
          {/* Active Public Rooms */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h2 className="font-game text-xl font-bold text-white">
                  Room Publik Aktif
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Klik salah satu room di bawah untuk langsung bergabung bersama pemain lain.
                </p>
              </div>
              <button
                type="button"
                onClick={onRefreshRooms}
                disabled={!connected}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer whitespace-nowrap shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Segarkan
              </button>
            </div>

            {publicRooms.length === 0 ? (
              <div className="py-10 text-center border border-dashed border-slate-800 rounded-xl">
                <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-sm font-medium text-slate-300">
                  Belum ada room publik yang aktif saat ini.
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Pilih tab &ldquo;Buat Room Baru&rdquo; di sebelah kiri untuk memulai pertandingan dan bagikan kodenya ke temanmu.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {publicRooms.map((room) => (
                  <div
                    key={room.code}
                    className="py-3.5 first:pt-0 last:pb-0 flex flex-wrap items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5">
                        <span className="font-semibold text-white truncate">
                          {room.name}
                        </span>
                        <span className="font-mono text-xs text-sky-400 tabular-nums">
                          {room.code}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-2">
                        <span>Host: {room.hostName}</span>
                        <span aria-hidden="true">·</span>
                        <span>{topicLabel(room.topic)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{Math.round(room.durationSec / 60)} Menit</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">
                          {room.humanCount} Online{room.fillWithBots ? ' + Bot Kelas' : ''}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            room.phase === 'PLAYING' ? 'text-amber-400' : 'text-emerald-400'
                          }
                        >
                          {room.phase === 'PLAYING' ? 'Sedang Berlangsung' : 'Menunggu Pemain'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => onJoinRoom(room.code, safeName, emoji)}
                      disabled={!connected || room.phase === 'ENDED'}
                      className="px-4 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:bg-slate-800 disabled:text-slate-500 text-white text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0"
                    >
                      Gabung
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Rules Summary */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="w-4 h-4 text-sky-400" />
              <h2 className="font-game text-lg font-bold text-white">
                Aturan Pertempuran Desa Alaska
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-300">
              <div className="space-y-1">
                <div className="font-semibold text-white">1. Nyawa & Eliminasi</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Setiap pemain memiliki 5 nyawa. Tertembak membekukan gerakan selama 2,5 detik. Kehabisan 5 nyawa berarti tereliminasi.
                </p>
              </div>
              <div className="space-y-1">
                <div className="font-semibold text-white">2. Kuis & Mega Snowball</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  1 jawaban benar memberi +1 skor dan +3 peluru salju. 3x benar berturut-turut membuka Mega Snowball penembus persembunyian.
                </p>
              </div>
              <div className="space-y-1">
                <div className="font-semibold text-white">3. Petak Umpet & Gerak</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Gunakan WASD/Panah, klik area kosong di peta, atau tombol Cari Tempat Sembunyi untuk berlindung di balik Igloo, Pinus, Kayu, atau Salju.
                </p>
              </div>
              <div className="space-y-1">
                <div className="font-semibold text-white">4. Penentuan Juara</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Pemenang ditentukan dari total skor tertinggi (Soal Dijawab Benar + Tembakan Mengenai Lawan) saat waktu habis atau tersisa 1 pemenang.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
