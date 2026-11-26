import type { ClientQuestion, QuestionTopic } from '../src/shared/types.ts';

export interface ServerQuestion {
  id: string;
  topic: Exclude<QuestionTopic, 'ALL'>;
  prompt: string;
  options: string[];
  answer: number;
}

export const QUESTION_BANK: ServerQuestion[] = [
  {
    id: 'q1',
    topic: 'MATH',
    prompt: 'Berapakah hasil dari 15 × 4 + 12?',
    options: ['62', '72', '82', '68'],
    answer: 1,
  },
  {
    id: 'q2',
    topic: 'SCIENCE',
    prompt: 'Planet terbesar di tata surya kita adalah...',
    options: ['Saturnus', 'Bumi', 'Jupiter', 'Neptunus'],
    answer: 2,
  },
  {
    id: 'q3',
    topic: 'GENERAL',
    prompt: 'Ibu kota negara Jepang adalah...',
    options: ['Seoul', 'Beijing', 'Kyoto', 'Tokyo'],
    answer: 3,
  },
  {
    id: 'q4',
    topic: 'SCIENCE',
    prompt: 'Gas yang dibutuhkan tumbuhan untuk fotosintesis adalah...',
    options: ['Oksigen', 'Karbon Dioksida', 'Nitrogen', 'Hidrogen'],
    answer: 1,
  },
  {
    id: 'q5',
    topic: 'MATH',
    prompt: 'Hasil dari 144 ÷ 12 + 9 adalah...',
    options: ['21', '19', '23', '20'],
    answer: 0,
  },
  {
    id: 'q6',
    topic: 'SCIENCE',
    prompt: 'Alat pernapasan utama pada ikan adalah...',
    options: ['Paru-paru', 'Trakea', 'Insang', 'Kulit'],
    answer: 2,
  },
  {
    id: 'q7',
    topic: 'GENERAL',
    prompt: 'Sila ke-3 Pancasila dilambangkan dengan gambar...',
    options: ['Bintang', 'Rantai', 'Pohon Beringin', 'Kepala Banteng'],
    answer: 2,
  },
  {
    id: 'q8',
    topic: 'SCIENCE',
    prompt: 'Perubahan wujud benda dari cair menjadi gas disebut...',
    options: ['Membeku', 'Menguap', 'Menyublim', 'Mengkristal'],
    answer: 1,
  },
  {
    id: 'q9',
    topic: 'MATH',
    prompt: 'Sebuah persegi memiliki sisi 9 cm. Berapakah luasnya?',
    options: ['36 cm²', '81 cm²', '18 cm²', '72 cm²'],
    answer: 1,
  },
  {
    id: 'q10',
    topic: 'GENERAL',
    prompt: 'Gunung tertinggi di dunia adalah...',
    options: ['Gunung Semeru', 'Gunung Fuji', 'Gunung Everest', 'Gunung Kilimanjaro'],
    answer: 2,
  },
  {
    id: 'q11',
    topic: 'SCIENCE',
    prompt: 'Bagian tumbuhan yang berfungsi menyerap air dari tanah adalah...',
    options: ['Daun', 'Batang', 'Bunga', 'Akar'],
    answer: 3,
  },
  {
    id: 'q12',
    topic: 'MATH',
    prompt: 'Hasil dari 25% dari 200 adalah...',
    options: ['25', '40', '50', '75'],
    answer: 2,
  },
  {
    id: 'q13',
    topic: 'GENERAL',
    prompt: 'Benua terluas di dunia adalah benua...',
    options: ['Afrika', 'Amerika', 'Asia', 'Eropa'],
    answer: 2,
  },
  {
    id: 'q14',
    topic: 'SCIENCE',
    prompt: 'Hewan pemakan tumbuhan dan daging disebut...',
    options: ['Herbivora', 'Karnivora', 'Omnivora', 'Insektivora'],
    answer: 2,
  },
  {
    id: 'q15',
    topic: 'MATH',
    prompt: 'Sudut yang besarnya tepat 90 derajat disebut sudut...',
    options: ['Lancip', 'Tumpul', 'Siku-siku', 'Lurus'],
    answer: 2,
  },
  {
    id: 'q16',
    topic: 'MATH',
    prompt: 'Hasil dari 8² + 6² adalah...',
    options: ['80', '100', '120', '96'],
    answer: 1,
  },
  {
    id: 'q17',
    topic: 'MATH',
    prompt: 'Keliling lingkaran dengan diameter 14 cm (π = 22/7) adalah...',
    options: ['22 cm', '44 cm', '88 cm', '154 cm'],
    answer: 1,
  },
  {
    id: 'q18',
    topic: 'MATH',
    prompt: 'Jika 3x - 7 = 14, maka nilai x adalah...',
    options: ['5', '6', '7', '8'],
    answer: 2,
  },
  {
    id: 'q19',
    topic: 'MATH',
    prompt: 'Bilangan prima terkecil yang lebih besar dari 10 adalah...',
    options: ['11', '12', '13', '15'],
    answer: 0,
  },
  {
    id: 'q20',
    topic: 'SCIENCE',
    prompt: 'Satuan internasional (SI) untuk gaya adalah...',
    options: ['Joule', 'Watt', 'Newton', 'Pascal'],
    answer: 2,
  },
  {
    id: 'q21',
    topic: 'SCIENCE',
    prompt: 'Bagian sel yang berfungsi sebagai pusat kendali sel adalah...',
    options: ['Mitokondria', 'Ribosom', 'Nukleus', 'Vakuola'],
    answer: 2,
  },
  {
    id: 'q22',
    topic: 'SCIENCE',
    prompt: 'Vitamin yang paling banyak membantu kesehatan mata adalah...',
    options: ['Vitamin A', 'Vitamin B12', 'Vitamin C', 'Vitamin D'],
    answer: 0,
  },
  {
    id: 'q23',
    topic: 'SCIENCE',
    prompt: 'Bumi berputar pada porosnya menyebabkan terjadinya...',
    options: ['Pergantian musim', 'Siang dan malam', 'Gerhana bulan', 'Pasang surut tahunan'],
    answer: 1,
  },
  {
    id: 'q24',
    topic: 'GENERAL',
    prompt: 'Negara bagian AS tempat Desa Alaska berada memiliki julukan...',
    options: ['Sunshine State', 'The Last Frontier', 'Lone Star State', 'Golden State'],
    answer: 1,
  },
  {
    id: 'q25',
    topic: 'GENERAL',
    prompt: 'Proklamasi Kemerdekaan Indonesia dibacakan pada tanggal...',
    options: ['17 Agustus 1945', '18 Agustus 1945', '28 Oktober 1928', '1 Juni 1945'],
    answer: 0,
  },
  {
    id: 'q26',
    topic: 'GENERAL',
    prompt: 'Samudra terluas di permukaan Bumi adalah...',
    options: ['Samudra Atlantik', 'Samudra Hindia', 'Samudra Pasifik', 'Samudra Arktik'],
    answer: 2,
  },
  {
    id: 'q27',
    topic: 'GENERAL',
    prompt: 'Rumah tradisional berbentuk kubah es khas suku Inuit disebut...',
    options: ['Yurt', 'Igloo', 'Tipi', 'Chalet'],
    answer: 1,
  },
  {
    id: 'q28',
    topic: 'MATH',
    prompt: 'Sebuah segitiga memiliki alas 12 cm dan tinggi 8 cm. Luasnya adalah...',
    options: ['96 cm²', '48 cm²', '20 cm²', '36 cm²'],
    answer: 1,
  },
  {
    id: 'q29',
    topic: 'SCIENCE',
    prompt: 'Logam yang berwujud cair pada suhu ruang adalah...',
    options: ['Besi', 'Tembaga', 'Raksa', 'Aluminium'],
    answer: 2,
  },
  {
    id: 'q30',
    topic: 'GENERAL',
    prompt: 'Lagu kebangsaan Indonesia Raya diciptakan oleh...',
    options: ['W.R. Supratman', 'Ismail Marzuki', 'H. Mutahar', 'C. Simanjuntak'],
    answer: 0,
  },
];

export function pickQuestion(topic: QuestionTopic, excludeId?: string): ServerQuestion {
  const pool =
    topic === 'ALL'
      ? QUESTION_BANK
      : QUESTION_BANK.filter((q) => q.topic === topic);

  const filtered = pool.length > 1 && excludeId ? pool.filter((q) => q.id !== excludeId) : pool;
  const idx = Math.floor(Math.random() * filtered.length);
  return filtered[idx] ?? QUESTION_BANK[0];
}

export function toClientQuestion(q: ServerQuestion): ClientQuestion {
  return {
    id: q.id,
    topic: q.topic,
    prompt: q.prompt,
    options: q.options,
  };
}
