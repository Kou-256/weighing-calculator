export const NOTEBOOK_VERSION = '2026-11-03.1';

// A transcription of the supplied record, not a validated synthesis protocol.
export const STEPS = [
  { id: 'weigh', day: 1, title: '秤量・仕込み', minutes: '', equipment: 'balance', text: '薬包紙と精密電子天秤で原料を秤量し、100 mLビーカーへ移す。原料と秤量値は「条件・秤量」で記録。純水40 g、硝酸5 mL、中サイズの撹拌子を加える。', check: '原文は純水40 gをメスシリンダーで測定と記載。質量gと体積mLを区別して実測を記録する。硝酸の製品・濃度、投入順序・取扱いは研究室の承認手順で確認する。' },
  { id: 'evaporate1', day: 1, title: '加熱・撹拌して蒸発', minutes: 960, equipment: 'stirrer', text: '原記録：100 ℃・400 rpmで加熱撹拌し、16時間後に蒸発を確認。', check: '16時間は観察された経過時間。乾燥の完了や次工程への移行を時間だけで判定しない。長時間運転は研究室の運転規則に従う。' },
  { id: 'citrate', day: 2, title: 'クエン酸水和物・純水を添加', minutes: '', equipment: 'stirrer', text: '付着した撹拌子を確認。クエン酸水和物3.3622 g（原記録の実作業目安：約3.36 g）と純水40 gを加える。大きめの匙を使用。', check: '原文の「ラップで蓋・輪ゴムで固定」は材質・耐熱性・ガスの逃げ道が未確認。加熱条件と被覆方法は担当者に確認する。' },
  { id: 'complex', day: 2, title: '錯形成の待機・色を観察', minutes: 300, equipment: 'stirrer', text: '原記録：添加から5時間後に青色を確認。色・状態を写真とメモに残す。', check: 'この工程の温度・回転数は原文に記載なし。前工程の設定を自動継承しない。' },
  { id: 'pg', day: 2, title: 'プロピレングリコール添加', minutes: '', equipment: 'pipette', text: '原記録ではプロピレングリコール1.2 mLを定量ピペットで添加。', check: '既存計算ツールの基準量は1.17 mL。今回のマニュアル値1.2 mLとの違いを確認し、実際の添加量をメモに残す。' },
  { id: 'evaporate2', day: 2, title: '再加熱・蒸発', minutes: 1080, equipment: 'stirrer', text: '原記録：ラップを外し、18時間後に蒸発を確認。外観を記録する。', check: '温度・回転数は原文に記載なし。18時間は実績の目安で、完了判定は状態を確認する。' },
  { id: 'furnacePrep', day: 3, title: '撹拌子を取り出し、仮焼き準備', minutes: '', equipment: 'furnace', text: 'ピンセットで撹拌子を取り出す。使用する炉と容器を記録する。', check: '原文の「ビーカー下にアルミホイルのカップ」は耐熱性・容器適合性が未確認。使用可能な容器・配置を装置管理者に確認する。' },
  { id: 'precalcine', day: 3, title: '350 ℃で仮焼き', minutes: 95, equipment: 'furnace', text: '記録上の条件：350 ℃、昇温35分＋保持60分。原記録では右側の大きい炉を推奨。装置の現状は使用時に確認する。' },
  { id: 'cool1', day: 3, title: '仮焼き後の冷却', minutes: '', equipment: 'furnace', text: '炉内温度と冷却方法、取り出した時刻を記録する。', check: '原記録では1時間後も約200 ℃。冷却時間は未確定として扱う。高温で扉を開けた操作は標準手順に採用せず、承認された冷却・取り出し条件を確認する。' },
  { id: 'grind', day: 3, title: '前駆体の回収・粉砕', minutes: 5, equipment: 'mortar', text: '前駆体を匙で回収し、白い乳鉢へ移す。原記録：5分間よくすりつぶして粉末状にし、焼成用容器へ移す。粒子の状態を記録する。' },
  { id: 'calcine', day: 3, title: '850 ℃で本焼成', minutes: 445, equipment: 'furnace', text: '記録上の条件：850 ℃、昇温85分＋保持6時間。原記録では銀色の炉を使用、左側の青い小型炉は故障。現在の稼働状況を確認する。' },
  { id: 'cool2', day: 4, title: '冷却・試料回収', minutes: '', equipment: 'furnace', text: '本焼成後、承認された温度まで冷却して取り出す。冷却条件・回収量を記録する。' },
  { id: 'uv', day: 4, title: '発光確認・試験管へ移す', minutes: '', equipment: 'uv', text: '原記録では254 nm・365 nmで4試料とも発光。試料を薬包紙経由で適合する試験管へ移す。照射条件と写真を記録する。' },
  { id: 'naoh1', day: 4, title: 'NaOH洗浄 1回目', minutes: 30, equipment: 'centrifuge', text: '原記録：0.1 mol/L NaOH水溶液を試料ごとに約10 mL（5 mL＋5 mL）添加し、蓋をして分散。8000 rpm・30分の遠心分離。', check: '濃度の記録：NaOH 4 g／最終液量1 Lで約0.1 mol/L。装置・ローター・容器の適合性、質量バランスを確認。廃液は研究室の分別ルールで回収する。' },
  { id: 'naoh2', day: 4, title: 'NaOH洗浄 2回目', minutes: 30, equipment: 'centrifuge', text: '上清を所定の廃液へ回収し、同じNaOH洗浄・遠心分離をもう一度行う。実際の添加量と条件を記録する。' },
  { id: 'water1', day: 4, title: '純水洗浄 1回目', minutes: 30, equipment: 'centrifuge', text: '上清を回収し、純水約10 mLを添加・分散。原記録と同じ条件で遠心分離する。' },
  { id: 'water2', day: 4, title: '純水洗浄 2回目', minutes: 30, equipment: 'centrifuge', text: '純水洗浄をもう一度行い、上清を回収。30分×4回で遠心運転だけで計120分。添加・分散・移し替えの時間は別途必要。' },
  { id: 'dry', day: 4, title: '乾燥', minutes: '', equipment: 'stirrer', text: '原記録：アルミホイルの試験管立てを使用し、100 ℃・0 rpmで乾燥。乾燥終了時刻と状態を記録する。', check: '乾燥時間は未記載。試験管・支持具の耐熱性と使用可能な乾燥方法を担当者に確認する。' },
  { id: 'finish', day: 5, title: '保管・ラベル作成', minutes: '', equipment: 'label', text: '乾燥後、透明なスクリュー管に移す。試料ID・組成・作製日を記載したラベルを貼り、保管場所を記録する。' },
  { id: 'result', day: 5, title: '発光撮影・結果の記録', minutes: '', equipment: 'uv', text: '原記録：レーザー照射で発光を確認して撮影。試料の区分は5%・10%・15%・20%。対象元素・濃度の定義は記載なしのため、条件欄で確認して記録する。' },
];

export const EQUIPMENT = [
  { id: 'balance', title: '精密電子天秤・秤量', text: ['薬包紙を使用。秤量前に装置の水平・ゼロ点・使用可能な秤量範囲を確認する。', '計算値と実測値を区別して記録する。原料一覧は秤量計算ツールから取り込める。'] },
  { id: 'stirrer', title: 'マグネチックスターラー', text: ['原記録の1日目：100 ℃・400 rpm、中サイズの撹拌子。乾燥時：100 ℃・0 rpm。', '2日目の温度・回転数は未記載。実際の設定を各工程のメモに残す。設定温度と試料温度は区別する。', '長時間運転、蒸発後の加熱、被覆・容器の適合性は研究室の承認手順に従う。'] },
  { id: 'pipette', title: 'ピペット・液量の測定', text: ['原記録：硝酸5 mL、プロピレングリコール1.2 mLに大きい定量ピペットを使用。洗浄液10 mLは5 mLを2回。', '設定範囲、薬品への適合性、校正を確認。純水40 gは質量の指定であり、メスシリンダーのmL読取値と区別して記録する。'] },
  { id: 'furnace', title: '電気炉・プログラム設定', text: ['装置型番未記録。以下は原記録のボタン表記で、機種の取扱説明書との照合が必要。炉の選択は現在の管理状況を優先する。', '電源と表示を確認 → End表示なら原記録では電源ボタン長押し → パターンボタン長押し → ▲▼で1または2を選択・確定。', '仮焼きの記録：SV1＝350 ℃、T1＝0.35、SV2＝350 ℃、T2＝1.00、SV3は未設定。昇温35分、保持1時間。', '本焼成の記録：SV1＝850 ℃、T1＝1.25、SV2＝850 ℃、T2＝6.00。昇温85分、保持6時間。', 'Tの表記は原記録では時.分（0.35＝35分、1.25＝85分）。小数時間と解釈しない。実機の時間単位・開始温度・昇温速度・終了後の動作を確認する。', '原記録：運転ボタン長押しで開始。PVは測定温度、SVは設定温度。冷却・扉の開放・取り出しは装置管理者の承認手順に従う。'] },
  { id: 'mortar', title: '乳鉢・乳棒', text: ['原記録：白い乳鉢で5分間粉砕。試料間の混入を防ぎ、清浄な道具を使用する。', '原文の洗浄液は成分不明。洗浄・すすぎ・乾燥は研究室で確認された方法を使う。'] },
  { id: 'centrifuge', title: '遠心分離機', text: ['原記録：Speed（原文Spped）で8000 rpm、Timeで30分を設定。', '偶数本にするだけでは不十分。対応する容器・ローターの許容回転数を確認し、対向位置の容器を同じ種類・同じ質量で釣り合わせる。', '完全停止を確認してから開ける。4回の運転で計120分。rpmと相対遠心力RCFは異なり、換算にはローター半径が必要。'], source: ['Eppendorf：遠心分離機の安全', 'https://www.eppendorf.com/ca-en/lab-academy/life-science/cell-biology/centrifuge-safety/'] },
  { id: 'uv', title: 'UV・レーザーによる発光観察', text: ['原記録：254 nm・365 nm、およびレーザーで発光観察。波長・照射時間・撮影条件を記録する。', '光源に適合する遮光設備・保護具を使用し、直接光や反射光を目・皮膚へ当てない。装置の承認された観察方法に従う。'] },
  { id: 'label', title: 'ラベル作成（TEPRA SPC10）', text: ['原記録：TEPRA SPC10 → ファイルを開く → katolab → TEPRA → 橋詰。', '現在の保存場所・テンプレートを確認し、試料ID・組成・作製日を付ける。'] },
  { id: 'clean', title: '器具洗浄・未確認事項', text: ['原文には匙・乳鉢等の超音波洗浄、メラミンスポンジ（原文メラニン）、緑色の液体、希釈ハイターでの加熱洗浄、および2日間に分けた反復の記述がある。洗浄液の成分・濃度や反復対象が未確定のため、実行手順には採用していない。', '酸・酸性残留物と塩素系漂白剤を混ぜない。成分不明の洗浄液は使用しない。漂白剤の加熱洗浄はここでは推奨しない。器具洗浄と廃液処理は研究室の承認手順を確認する。'], source: ['カナダ運輸省：漂白剤と酸の混合禁止', 'https://tc.canada.ca/en/dangerous-goods/canutec/articles/improper-mixing-common-household-cleaning-products'] },
];

export function localDateTime(date = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function validDateTime(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return false;
  const d = new Date(value);
  return Number.isFinite(d.getTime()) && localDateTime(d) === value;
}

export const NOTEBOOK_HOSTS = {
  yvo4: { formula: 'YVO₄', filePrefix: 'YVO4' },
  gdvo4: { formula: 'GdVO₄', filePrefix: 'GdVO4' },
};

export function noteHost(note) {
  if (note?.snapshot) return String(note.snapshot.compound || '').replaceAll('₄', '4') === 'GdVO4' ? 'gdvo4' : 'yvo4';
  return Object.hasOwn(NOTEBOOK_HOSTS, note?.host) ? note.host : 'yvo4';
}

export function createNote(name, snapshot = null, start = localDateTime(), host = 'yvo4') {
  return {
    id: crypto.randomUUID(), name, start, createdAt: new Date().toISOString(),
    host: noteHost({ host, snapshot }),
    protocolVersion: NOTEBOOK_VERSION, sample: '', operator: '', composition: '', memo: '', snapshot,
    steps: STEPS.map(step => ({ ...step, plannedStart: '', actualStart: '', actualEnd: '', done: false, memo: '', photos: [] })),
  };
}

export function schedule(note) {
  let cursor = validDateTime(note.start) ? note.start : '';
  return note.steps.map(step => {
    const start = step.actualStart || step.plannedStart || cursor;
    const minutes = step.minutes === '' ? null : Number(step.minutes);
    const end = validDateTime(start) && minutes !== null && Number.isFinite(minutes) && minutes >= 0 && minutes <= 525600
      ? localDateTime(new Date(new Date(start).getTime() + minutes * 60000)) : '';
    cursor = step.actualEnd || end;
    return { start, end };
  });
}

export function validateNotebook(data) {
  const fail = () => { throw new Error('実験ノートの形式が不正です。対応するバックアップを選択してください。'); };
  const str = (s, max = 20000) => typeof s === 'string' && s.length <= max;
  const date = s => s === '' || validDateTime(s);
  if (!data || data.schema !== 1 || !Array.isArray(data.notes) || data.notes.length > 500) fail();
  const ids = new Set();
  const photoIds = new Set();
  for (const note of data.notes) {
    if (!note || !str(note.id, 100) || !note.id || ids.has(note.id)) fail();
    ids.add(note.id);
    if (note.host !== undefined && (!Object.hasOwn(NOTEBOOK_HOSTS, note.host) || (note.snapshot && note.host !== noteHost(note)))) fail();
    if (!['name', 'sample', 'operator', 'composition', 'memo', 'protocolVersion', 'createdAt'].every(k => str(note[k])) || !date(note.start)) fail();
    if (note.deletedAt !== undefined && (typeof note.deletedAt !== 'string' || !Number.isFinite(Date.parse(note.deletedAt)))) fail();
    if (!Array.isArray(note.steps) || note.steps.length !== STEPS.length) fail();
    if (note.snapshot !== null) {
      const s = note.snapshot;
      if (!s || !str(s.compound, 100) || !Number.isFinite(Number(s.targetMol)) || Number(s.targetMol) <= 0 || !Number.isInteger(s.setNumber) || s.setNumber < 1 || s.setNumber > 20 || !validDateTime(s.capturedAt) || !s.concentrations || typeof s.concentrations !== 'object' || Array.isArray(s.concentrations) || !Array.isArray(s.materials) || s.materials.length > 50 || JSON.stringify(s).length > 100000) fail();
      for (const [key, value] of Object.entries(s.concentrations)) if (!str(key, 100) || !Number.isFinite(value)) fail();
      for (const row of s.materials) {
        if (!row || !str(row.material, 100) || !Number.isFinite(row.calculated) || row.calculated < 0 || !str(row.measured, 100) || !['ストック', '粉末'].includes(row.method) || !str(row.stockName, 20000) || (row.actualUl !== null && !Number.isFinite(row.actualUl))) fail();
      }
      if (s.liquidBudget != null && (typeof s.liquidBudget !== 'object' || !Number.isFinite(s.liquidBudget.limitMl) || typeof s.liquidBudget.unresolved !== 'boolean' || typeof s.liquidBudget.over !== 'boolean')) fail();
    }
    for (const [i, step] of note.steps.entries()) {
      if (!step || step.id !== STEPS[i].id || !str(step.title) || !str(step.text) || !str(step.check || '') || !str(step.equipment, 100) || !Number.isInteger(step.day) || step.day < 1 || step.day > 5 || !str(step.memo) || typeof step.done !== 'boolean') fail();
      if (![step.plannedStart, step.actualStart, step.actualEnd].every(date)) fail();
      if (step.actualStart && step.actualEnd && step.actualEnd < step.actualStart) fail();
      if (step.minutes !== '' && (!['string', 'number'].includes(typeof step.minutes) || !Number.isFinite(Number(step.minutes)) || Number(step.minutes) < 0 || Number(step.minutes) > 525600)) fail();
      if (!Array.isArray(step.photos) || step.photos.length > 100) fail();
      for (const photo of step.photos) {
        if (!photo || !str(photo.id, 100) || !photo.id || photoIds.has(photo.id) || !str(photo.name, 500) || !str(photo.caption) || !['image/jpeg', 'image/png', 'image/webp'].includes(photo.type) || !Number.isFinite(photo.size) || photo.size <= 0 || photo.size > 20 * 1024 * 1024) fail();
        photoIds.add(photo.id);
      }
    }
  }
  return data;
}
