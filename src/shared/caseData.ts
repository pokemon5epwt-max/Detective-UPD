import type { CaseData } from './types';

export const HOENN_CASE_DATA: CaseData = {
  caseId: 'case_devon_prototype',
  title: 'Sabotase Prototipe Dermaga Rustboro',
  location: 'Koridor Barat Hoenn · 3 Lokasi TKP',
  briefing:
    'Pukul 23:14 semalam, kotak pelindung prototipe Devon Sea-Sonar Core dipecahkan dan isinya raib. Sisir 3 TKP (Lab Riset, Dermaga Selatan, dan Bengkel Ekspedisi), interogasi empat saksi, lalu tentukan pelaku utama beserta Pokémon pendampingnya.',
  crimeSceneTimeSeconds: 210,
  boardTimeSeconds: 150,
  verdictTimeSeconds: 60,
  solutionCulpritId: 'kaya',
  solutionPokemonId: 'swellow',
  solutionExplanation:
    'Kaya Vance memotong sekring lab memakai tang berisolasi dari bengkelnya, membuka lemari kaca dengan pemotong berlian presisi, lalu menyembunyikan inti Sea-Sonar dalam kapsul ekspedisi sebelum membawanya kabur bersama Swellow melalui perahu di Dermaga Selatan.',
  scenes: [
    {
      sceneId: 'scene_lab',
      title: 'TKP 1 · Lab Riset Pesisir',
      subtitle: 'Lokasi pembobolan kotak prototipe Devon',
    },
    {
      sceneId: 'scene_dock',
      title: 'TKP 2 · Dermaga Selatan',
      subtitle: 'Jalur pelarian kapal & log kargo malam hari',
    },
    {
      sceneId: 'scene_workshop',
      title: 'TKP 3 · Bengkel Ekspedisi',
      subtitle: 'Bengkel mekanik dermaga & ruang peralatan',
    },
  ],
  clues: [
    // TKP 1: Lab Riset Pesisir (6 clues)
    {
      clueID: 'clue_pedestal',
      scene: 'scene_lab',
      name: 'Kotak Kaca Prototipe Pecah',
      description:
        'Bingkai pengunci kaca dipotong presisi sebelum pecah dari dalam. Pelaku tahu mekanisme keamanan lab dan hanya mengincar ruang inti Sea-Sonar.',
      type: 'PHYSICAL',
      linkedSuspectIDs: ['elias', 'kaya'],
      hotspot: { x: 165, y: 70, width: 370, height: 395 },
      found: false,
    },
    {
      clueID: 'clue_blueprints',
      scene: 'scene_lab',
      name: 'Cetak Biru & Peta Dermaga',
      description:
        'Peta jalur pelabuhan Slateport terlipat di atas cetak biru jaringan kabel lab. Terdapat catatan tulisan tangan mengenai kode akses darurat.',
      type: 'DOCUMENT',
      linkedSuspectIDs: ['elias', 'brine'],
      hotspot: { x: 635, y: 405, width: 545, height: 215 },
      found: false,
    },
    {
      clueID: 'clue_fusebox',
      scene: 'scene_lab',
      name: 'Panel Sekring Hangus',
      description:
        'Sekring utama dipaksa korslet menggunakan tang pemotong berisolasi mekanik tepat pukul 23:14 sehingga kamera dan alarm pintu mati.',
      type: 'RESIDUE',
      linkedSuspectIDs: ['elias', 'kaya'],
      hotspot: { x: 1585, y: 125, width: 300, height: 395 },
      found: false,
    },
    {
      clueID: 'clue_capsule',
      scene: 'scene_lab',
      name: 'Kapsul Energi Retak',
      description:
        'Tabung transportasi merah-putih dengan nomor seri gudang selatan Slateport. Catatan bengkel menyebut tabung ini pernah diserahkan ke kru mekanik Kaya.',
      type: 'OBJECT',
      linkedSuspectIDs: ['kaya', 'brine'],
      hotspot: { x: 825, y: 645, width: 260, height: 240 },
      found: false,
    },
    {
      clueID: 'clue_feather',
      scene: 'scene_lab',
      name: 'Bulu Merah Mengilap',
      description:
        'Bulu sayap aerodinamis berwarna merah tua dengan tepi keras—tertinggal di bawah jendela pecah akibat manuver terbang cepat Pokémon tipe Flying.',
      type: 'POKEMON_TRACE',
      linkedSuspectIDs: ['kaya', 'kaito'],
      hotspot: { x: 1200, y: 785, width: 325, height: 155 },
      found: false,
    },
    {
      clueID: 'clue_bootprints',
      scene: 'scene_lab',
      name: 'Jejak Sepatu Lumpur & Minyak',
      description:
        'Jejak sol bot kerja lapangan yang tercampur oli mesin kapal dermaga, mengarah dari lemari kaca ke bawah meja dan jendela sisi laut.',
      type: 'PHYSICAL',
      linkedSuspectIDs: ['brine', 'kaya'],
      hotspot: { x: 85, y: 735, width: 560, height: 295 },
      found: false,
      unlocksTraitId: 'trait_boots',
    },

    // TKP 2: Dermaga Selatan Slateport (4 clues)
    {
      clueID: 'clue_dock_rope',
      scene: 'scene_dock',
      name: 'Tali Pengikat Terputus',
      description:
        'Tali tambat tebal dipotong bersih menggunakan tang pemotong kabel mekanik, bukan pisau nelayan, untuk melepaskan sekoci secara senyap.',
      type: 'PHYSICAL',
      linkedSuspectIDs: ['brine', 'kaya'],
      hotspot: { x: 50, y: 640, width: 440, height: 320 },
      found: false,
    },
    {
      clueID: 'clue_manifest',
      scene: 'scene_dock',
      name: 'Buku Log Manifest Dermaga',
      description:
        'Catatan tulisan tangan pukul 23:25 mencatat keluar-masuknya kargo ringan dari bengkel selatan tanpa tanda tangan Kapten Brine.',
      type: 'DOCUMENT',
      linkedSuspectIDs: ['brine', 'kaya'],
      hotspot: { x: 750, y: 555, width: 420, height: 255 },
      found: false,
    },
    {
      clueID: 'clue_grease_drum',
      scene: 'scene_dock',
      name: 'Drum Pelumas Winch Bocor',
      description:
        'Genangan pelumas katrol berwarna hitam pekat di samping drum—komposisi kimianya identik dengan oli di jejak sepatu TKP Lab.',
      type: 'RESIDUE',
      linkedSuspectIDs: ['kaya', 'brine'],
      hotspot: { x: 1475, y: 265, width: 300, height: 380 },
      found: false,
    },
    {
      clueID: 'clue_scratched_hull',
      scene: 'scene_dock',
      name: 'Goresan Lambung Perahu Kayu',
      description:
        'Bekas benturan logam silinder dan goresan cakar burung di bibir perahu kayu—dipakai memindahkan barang curian ke laut terbuka.',
      type: 'PHYSICAL',
      linkedSuspectIDs: ['brine', 'kaya'],
      hotspot: { x: 1330, y: 650, width: 580, height: 400 },
      found: false,
    },

    // TKP 3: Bengkel Ekspedisi Dermaga (4 clues)
    {
      clueID: 'clue_glass_cutter',
      scene: 'scene_workshop',
      name: 'Pemotong Kaca Berlian',
      description:
        'Alat potong kaca presisi tergeletak di atas cetak biru bangunan lab Devon—lebar matanya cocok dengan goresan lemari kaca TKP Lab.',
      type: 'OBJECT',
      linkedSuspectIDs: ['kaya', 'elias'],
      hotspot: { x: 130, y: 475, width: 410, height: 140 },
      found: false,
      unlocksTraitId: 'trait_blueprint',
    },
    {
      clueID: 'clue_muddy_boots',
      scene: 'scene_workshop',
      name: 'Sepatu Bot Berlumpur Oli',
      description:
        'Sepatu kerja di samping loker terbuka yang masih basah oleh lumpur pesisir dan pelumas winch—ukuran tapaknya cocok 100% dengan jejak di Lab.',
      type: 'PHYSICAL',
      linkedSuspectIDs: ['kaya'],
      hotspot: { x: 440, y: 730, width: 255, height: 240 },
      found: false,
      unlocksTraitId: 'trait_boots',
    },
    {
      clueID: 'clue_insulated_pliers',
      scene: 'scene_workshop',
      name: 'Tang Pemotong Berisolasi Hangus',
      description:
        'Tang bergagang merah di meja tengah memiliki noda gosong listrik baru di ujung rahangnya—alat yang memutus panel sekring pukul 23:14.',
      type: 'RESIDUE',
      linkedSuspectIDs: ['kaya'],
      hotspot: { x: 1160, y: 500, width: 270, height: 140 },
      found: false,
      unlocksTraitId: 'trait_pliers',
    },
    {
      clueID: 'clue_perch_feathers',
      scene: 'scene_workshop',
      name: 'Tenggeran Burung & Bulu Merah',
      description:
        'Nampan tenggeran kayu penuh bulu sayap merah tajam yang identik dengan bulu temuan di TKP Lab—tempat bertengger Swellow milik Kaya.',
      type: 'POKEMON_TRACE',
      linkedSuspectIDs: ['kaya'],
      hotspot: { x: 1500, y: 575, width: 400, height: 390 },
      found: false,
      unlocksTraitId: 'trait_red_wing',
    },
  ],
  suspects: [
    {
      suspectID: 'elias',
      name: 'Elias Thorne',
      role: 'Asisten Peneliti Lab',
      affiliation: 'Divisi Riset Pesisir',
      alibiSummary: 'Mengaku lembur di lantai dua sejak pukul 22:30 hingga listrik padam.',
      pokemonPartnerId: 'magnemite',
      pokemonPartnerName: 'Magnemite',
      startNodeId: 'elias_start',
      traits: [
        'Sepatu laboratorium bersih (tanpa oli)',
        'Memiliki akses cetak biru kabel lab',
        'Tidak memiliki tang bengkel kapal',
        'Partner Magnemite (Electric / Steel)',
      ],
    },
    {
      suspectID: 'brine',
      name: 'Kapten Brine',
      role: 'Kepala Dermaga Selatan',
      affiliation: 'Otoritas Pelabuhan Slateport',
      alibiSummary: 'Mengaku memeriksa manifest kapal kargo di dermaga selatan bersama krunya.',
      pokemonPartnerId: 'pelipper',
      pokemonPartnerName: 'Pelipper',
      startNodeId: 'brine_start',
      traits: [
        'Memakai sepatu bot kerja dermaga beroli',
        'Mengenal jadwal kargo pelabuhan',
        'Tidak memakai tang isolasi presisi',
        'Partner Pelipper (bulu putih keabuan)',
      ],
    },
    {
      suspectID: 'kaito',
      name: 'Penjaga Kaito',
      role: 'Arsiparis Kuil',
      affiliation: 'Penjaga Tradisi Mt. Pyre',
      alibiSummary: 'Datang ke kota membawa arsip kompas kuno, menginap di penginapan pelabuhan.',
      pokemonPartnerId: 'vulpix',
      pokemonPartnerName: 'Vulpix',
      startNodeId: 'kaito_start',
      traits: [
        'Memakai sandal perjalanan penginapan',
        'Membawa arsip kompas (tanpa cetak biru)',
        'Tidak memakai alat pemotong mekanik',
        'Partner Vulpix (ekor cokelat kemerahan)',
      ],
    },
    {
      suspectID: 'kaya',
      name: 'Kaya Vance',
      role: 'Mekanik Eks-Ekspedisi',
      affiliation: 'Bengkel Dermaga Independen',
      alibiSummary: 'Mengaku berada di bengkel memperbaiki katrol perahu saat listrik lab padam.',
      pokemonPartnerId: 'swellow',
      pokemonPartnerName: 'Swellow',
      startNodeId: 'kaya_start',
      traits: [
        'Memakai sepatu bot bernoda oli winch',
        'Meminjam salinan cetak biru kabel lab',
        'Memiliki tang pemotong berisolasi',
        'Partner Swellow (bulu sayap merah tajam)',
      ],
    },
  ],
  pokemonOptions: [
    {
      pokemonId: 'magnemite',
      name: 'Magnemite',
      elementType: 'Electric / Steel',
      traitHint: 'Mampu memicu gangguan arus listrik dan menempel pada panel logam.',
    },
    {
      pokemonId: 'pelipper',
      name: 'Pelipper',
      elementType: 'Water / Flying',
      traitHint: 'Paruh besar untuk membawa barang, bulu putih keabu-abuan.',
    },
    {
      pokemonId: 'vulpix',
      name: 'Vulpix',
      elementType: 'Fire',
      traitHint: 'Meninggalkan bara api dan enam helai ekor cokelat kemerahan.',
    },
    {
      pokemonId: 'swellow',
      name: 'Swellow',
      elementType: 'Normal / Flying',
      traitHint: 'Terbang berkecepatan tinggi melalui celah sempit; bulu dada merah tajam.',
    },
  ],
  killerTraits: [
    {
      traitId: 'trait_boots',
      label: 'Memakai sepatu bot kerja bernoda oli winch dermaga',
      shortTag: 'Sepatu Bot Oli',
    },
    {
      traitId: 'trait_blueprint',
      label: 'Memiliki akses salinan cetak biru kabel laboratorium',
      shortTag: 'Akses Cetak Biru',
    },
    {
      traitId: 'trait_pliers',
      label: 'Menggunakan tang pemotong berisolasi bengkel kapal',
      shortTag: 'Tang Berisolasi',
    },
    {
      traitId: 'trait_red_wing',
      label: 'Didampingi Pokémon Flying berbulu sayap merah tajam',
      shortTag: 'Bulu Sayap Merah',
    },
  ],
  dialogueNodes: {
    elias_start: {
      nodeId: 'elias_start',
      speaker: 'Elias Thorne',
      text: 'Aku bersumpah tidak menyentuh prototipe itu! Saat lampu padam pukul 23:14, aku sedang menyusun laporan di ruang arsip lantai atas.',
      choices: [
        {
          id: 'elias_q1',
          label: 'Tanyakan siapa saja yang punya kode akses ruang lab.',
          nextNodeId: 'elias_access',
        },
        {
          id: 'elias_q2',
          label: '[Bukti: Cetak Biru] Mengapa peta Slateport ada di mejamu?',
          nextNodeId: 'elias_blueprints',
          requiredClueId: 'clue_blueprints',
          unlocksHint:
            'Elias mengonfirmasi seseorang meminjam salinan cetak biru kabel lab tiga hari lalu.',
          unlocksTraitId: 'trait_blueprint',
        },
        {
          id: 'elias_q3',
          label: '[Bukti: Panel Sekring] Apakah Magnemite milikmu yang memutus listrik?',
          nextNodeId: 'elias_fuse',
          requiredClueId: 'clue_fusebox',
          unlocksHint:
            'Panel sekring tidak rusak oleh listrik Pokémon, melainkan dipotong paksa dengan tang mekanik.',
          unlocksTraitId: 'trait_pliers',
        },
      ],
    },
    elias_access: {
      nodeId: 'elias_access',
      speaker: 'Elias Thorne',
      text: 'Hanya staf lab dan tim mekanik kontraktor yang memperbaiki pendingin dermaga minggu lalu. Aku sempat lupa menyimpan berkas cetak biru di meja utama.',
      choices: [
        { id: 'elias_back_1', label: 'Kembali ke pertanyaan awal Elias', nextNodeId: 'elias_start' },
      ],
    },
    elias_blueprints: {
      nodeId: 'elias_blueprints',
      speaker: 'Elias Thorne',
      text: 'Tunggu—itu peta jalur pengiriman suku cadang dari bengkel Kaya! Tiga hari lalu dia meminjam cetak biru kabel ventilasi dengan alasan mengukur daya pompa.',
      choices: [
        { id: 'elias_back_2', label: 'Catat keterangan ini & kembali', nextNodeId: 'elias_start' },
      ],
    },
    elias_fuse: {
      nodeId: 'elias_fuse',
      speaker: 'Elias Thorne',
      text: 'Bukan Magnemite! Lihat bekas jepitan di kabel tembaganya—itu bekas tang isolasi bengkel kapal, bukan serangan Electric.',
      choices: [
        { id: 'elias_back_3', label: 'Catat keterangan ini & kembali', nextNodeId: 'elias_start' },
      ],
    },

    brine_start: {
      nodeId: 'brine_start',
      speaker: 'Kapten Brine',
      text: 'Aku menjaga dermaga selatan sampai tengah malam. Tidak ada kapal asing merapat, tapi aku melihat bayangan terbang cepat ke arah tebing mercusuar.',
      choices: [
        {
          id: 'brine_q1',
          label: 'Tanyakan tentang suara atau aktivitas di sekitar dermaga.',
          nextNodeId: 'brine_dock',
        },
        {
          id: 'brine_q2',
          label: '[Bukti: Kapsul Energi] Kenali tabung bernomor seri ini?',
          nextNodeId: 'brine_capsule',
          requiredClueId: 'clue_capsule',
          unlocksHint:
            'Kapten Brine memastikan kapsul gudang selatan diserahkan ke bengkel Kaya bulan lalu.',
        },
        {
          id: 'brine_q3',
          label: '[Bukti: Log Dermaga] Ada catatan perahu keluar pukul 23:25 tanpa tanda tangan Anda.',
          nextNodeId: 'brine_manifest',
          requiredClueId: 'clue_manifest',
          unlocksHint:
            'Log Dermaga membuktikan sekoci di dekat bengkel Kaya dipakai melarikan kargo pukul 23:25.',
        },
      ],
    },
    brine_dock: {
      nodeId: 'brine_dock',
      speaker: 'Kapten Brine',
      text: 'Pelipper milikku gelisah sekitar pukul 23:20 karena ada burung kecil berwarna gelap melintas sangat rendah membawa benda silinder berat.',
      choices: [
        { id: 'brine_back_1', label: 'Kembali ke pertanyaan awal Brine', nextNodeId: 'brine_start' },
      ],
    },
    brine_capsule: {
      nodeId: 'brine_capsule',
      speaker: 'Kapten Brine',
      text: 'Itu tabung kargo lama gudang selatan! Barang itu sudah dihapus dari daftar dan kuserahkan ke bengkel Kaya Vance untuk dijadikan suku cadang katrol.',
      choices: [
        { id: 'brine_back_2', label: 'Catat keterangan ini & kembali', nextNodeId: 'brine_start' },
      ],
    },
    brine_manifest: {
      nodeId: 'brine_manifest',
      speaker: 'Kapten Brine',
      text: 'Demi laut Hoenn! Seseorang memotong tali sekoci nomor 4 dan memalsukan baris log dermaga saat aku mengecek mercusuar barat!',
      choices: [
        { id: 'brine_back_3', label: 'Catat keterangan ini & kembali', nextNodeId: 'brine_start' },
      ],
    },

    kaito_start: {
      nodeId: 'kaito_start',
      speaker: 'Penjaga Kaito',
      text: 'Aku hanya singgah menyerahkan catatan pasang surut kuno untuk Dr. Cozmo. Keributan di laboratorium ini bukan urusanku.',
      choices: [
        {
          id: 'kaito_q1',
          label: 'Tanyakan apakah Anda melihat orang keluar masuk lab.',
          nextNodeId: 'kaito_witness',
        },
        {
          id: 'kaito_q2',
          label: '[Bukti: Bulu Merah] Apakah bulu merah ini milik Vulpix Anda?',
          nextNodeId: 'kaito_feather',
          requiredClueId: 'clue_feather',
          unlocksHint:
            'Bulu merah tajam berasal dari sayap Pokémon Flying (Swellow), bukan bulu ekor Vulpix atau Pelipper.',
          unlocksTraitId: 'trait_red_wing',
        },
      ],
    },
    kaito_witness: {
      nodeId: 'kaito_witness',
      speaker: 'Penjaga Kaito',
      text: 'Dari beranda penginapan, aku melihat seseorang memakai jaket kerja gelap berjalan cepat ke arah gudang dengan koper peralatan sekitar pukul 23:05.',
      choices: [
        { id: 'kaito_back_1', label: 'Kembali ke pertanyaan awal Kaito', nextNodeId: 'kaito_start' },
      ],
    },
    kaito_feather: {
      nodeId: 'kaito_feather',
      speaker: 'Penjaga Kaito',
      text: 'Vulpix tidak memiliki bulu sayap berbatang keras seperti ini. Ini jelas bulu sayap primer dari burung pemburu cepat seperti Swellow.',
      choices: [
        { id: 'kaito_back_2', label: 'Catat keterangan ini & kembali', nextNodeId: 'kaito_start' },
      ],
    },

    kaya_start: {
      nodeId: 'kaya_start',
      speaker: 'Kaya Vance',
      text: 'Aku sibuk memperbaiki katrol perahu di bengkel sepanjang malam! Lagi pula, buat apa aku mencuri alat sonar laut yang bahkan belum selesai dirakit?',
      choices: [
        {
          id: 'kaya_q1',
          label: 'Tanyakan pekerjaan perbaikan apa yang Anda lakukan di lab minggu lalu.',
          nextNodeId: 'kaya_work',
        },
        {
          id: 'kaya_q2',
          label: '[Bukti: Pemotong Kaca] Mengapa pemotong kaca berlian & cetak biru lab ada di bengkelmu?',
          nextNodeId: 'kaya_glass',
          requiredClueId: 'clue_glass_cutter',
          unlocksHint:
            'Kaya memiliki pemotong kaca berlian di atas cetak biru lab yang cocok dengan potongan lemari kaca TKP 1.',
        },
        {
          id: 'kaya_q3',
          label: '[Bukti: Tang Hangus] Ujung tang berisolasi di mejamu terbakar korsleting listrik.',
          nextNodeId: 'kaya_pliers',
          requiredClueId: 'clue_insulated_pliers',
          unlocksHint:
            'Tang berisolasi milik Kaya terbukti baru digunakan memutus sekring panel listrik Lab pukul 23:14.',
        },
        {
          id: 'kaya_q4',
          label: '[Bukti: Kapsul Energi] Bagaimana kapsul bengkelmu bisa tertinggal di bawah meja lab?',
          nextNodeId: 'kaya_confront',
          requiredClueId: 'clue_capsule',
          unlocksHint:
            'Kaya terpojok: ia menolak menjelaskan kenapa kapsul bengkelnya tertinggal di bawah meja lab.',
        },
      ],
    },
    kaya_work: {
      nodeId: 'kaya_work',
      speaker: 'Kaya Vance',
      text: 'Cuma memasang saluran pendingin di bawah lemari kaca. Aku hafal betul struktur kunci ruang lab karena desainnya mirip brankas kapal.',
      choices: [
        { id: 'kaya_back_1', label: 'Kembali ke pertanyaan awal Kaya', nextNodeId: 'kaya_start' },
      ],
    },
    kaya_glass: {
      nodeId: 'kaya_glass',
      speaker: 'Kaya Vance',
      text: 'Heh... alat itu cuma kupakai memotong kaca lampu kapal! Cetak biru itu... mungkin tertinggal di tas peralatanku sejak minggu lalu.',
      choices: [
        { id: 'kaya_back_2', label: 'Catat reaksi ini & kembali', nextNodeId: 'kaya_start' },
      ],
    },
    kaya_pliers: {
      nodeId: 'kaya_pliers',
      speaker: 'Kaya Vance',
      text: 'Sial... tang itu sempat korslet saat aku memperbaiki panel sekoci malam tadi, bukan di laboratorium! Kalian tidak punya bukti langsung!',
      choices: [
        { id: 'kaya_back_3', label: 'Catat bantahan panik & kembali', nextNodeId: 'kaya_start' },
      ],
    },
    kaya_confront: {
      nodeId: 'kaya_confront',
      speaker: 'Kaya Vance',
      text: 'Kapsul itu pasti dicuri orang lain dari bengkelku! Dan Swellow-ku cuma terbang patroli di sekitar atap—jangan sembarangan menuduh sebelum ada bukti vonis!',
      choices: [
        { id: 'kaya_back_4', label: 'Catat alibi terpojok & kembali', nextNodeId: 'kaya_start' },
      ],
    },
  },
};

export function createFreshCaseData(): CaseData {
  return JSON.parse(JSON.stringify(HOENN_CASE_DATA)) as CaseData;
}
