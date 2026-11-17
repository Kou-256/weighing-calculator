// Flat vector diagrams identify the task; operating conditions live in the note.
const actions = {
  weigh: '原料を量り、ビーカーに仕込む',
  evaporate1: '加熱・撹拌し、蒸発した状態を確認する',
  citrate: 'クエン酸水和物と純水を加える',
  complex: '色と状態を観察して記録する',
  pg: 'プロピレングリコールを量り取って加える',
  evaporate2: '再び加熱し、蒸発した状態を確認する',
  furnacePrep: '撹拌子を取り出し、炉と容器を確認する',
  precalcine: '仮焼きの設定を確認して運転する',
  cool1: '炉内温度と冷却条件を確認する',
  grind: '前駆体を回収し、乳鉢で粉砕する',
  calcine: '本焼成の設定を確認して運転する',
  cool2: '取り出せる温度を確認して試料を回収する',
  uv: '発光を観察し、試験管に移す',
  naoh1: 'NaOH水溶液で分散し、遠心分離する',
  naoh2: 'NaOH洗浄・遠心分離をもう一度行う',
  water1: '純水で分散し、遠心分離する',
  water2: '純水洗浄・遠心分離をもう一度行う',
  dry: '乾燥させ、終了時の状態を確認する',
  finish: '容器に移し、ラベルを付けて保管する',
  result: '発光を撮影し、条件と結果を記録する',
};

export const stepAction = step => actions[step.id] || step.title;

export default function StepVisual({ step, compact = false }) {
  const kind = step.equipment;
  const cooling = ['cool1', 'cool2'].includes(step.id);
  let drawing;
  if (kind === 'balance') drawing = <>
    <path className="nb-vector-fill" d="M29 74h102l10 34H19z" /><rect x="47" y="82" width="66" height="17" rx="4" />
    <path d="M44 68h72M80 68V49M58 49h44l-7-16H65z" /><path className="nb-vector-accent" d="m71 37 5-8 8 4 5-6 6 10" />
    <path d="M62 91h10m6 0h8m6 0h6" />
  </>;
  else if (kind === 'furnace') drawing = <>
    <rect className="nb-vector-fill" x="30" y="23" width="100" height="86" rx="12" /><rect x="43" y="35" width="68" height="56" rx="5" /><path d="M119 49v25M49 109v6m62-6v6M45 100h19" />
    {cooling ? <path className="nb-vector-accent" d="M62 46v31m-8-8 8 8 8-8m20-23v31m-8-8 8 8 8-8" /> : <><path className="nb-vector-accent" d="M58 78c-9-9 9-14 0-24m20 24c-9-9 9-14 0-24m20 24c-9-9 9-14 0-24" /><path d="M59 84h40" /></>}
  </>;
  else if (kind === 'mortar') drawing = <>
    <path className="nb-vector-fill" d="M26 64h108c-5 30-27 43-54 43S31 94 26 64Z" /><path d="M34 72h92M58 109h44" />
    <path className="nb-vector-fill" d="m86 66 26-43a8 8 0 0 1 14 8L99 74" /><path className="nb-vector-accent" d="m53 83 5-3m12 8 4-4m9 9 5-3" />
  </>;
  else if (kind === 'centrifuge') drawing = <>
    <rect className="nb-vector-fill" x="27" y="30" width="106" height="79" rx="15" /><circle cx="80" cy="64" r="25" /><circle cx="80" cy="64" r="6" />
    <path className="nb-vector-accent" d="m66 47 7 9m14 16 7 9m-31-3 10-7m14-14 10-7" /><path d="M54 99h21m20 0h10" />
  </>;
  else if (kind === 'pipette') drawing = <>
    <path className="nb-vector-fill" d="m53 28 10-10 25 25-10 10zM64 47l-8 8 33 33 9-9" /><path d="m91 87 10 10 8-1 1-8-10-10M99 96l7 7" />
    <path className="nb-vector-accent" d="M110 108c0 9 12 9 12 0l-6-10Z" /><path d="M106 116h25M49 42l9-9" />
  </>;
  else if (kind === 'uv') drawing = <>
    <path className="nb-vector-fill" d="M24 25h34v24H24zM35 49v55M24 108h40" /><path className="nb-vector-accent" d="m59 34 25 13m-25-4 21 19" />
    <path className="nb-vector-fill" d="M91 58h35v47a8 8 0 0 1-8 8H99a8 8 0 0 1-8-8Z" /><path className="nb-vector-accent" d="M96 91h25m-12-20v11m-5-6h10m17-20v8m-4-4h8" />
  </>;
  else if (kind === 'label') drawing = <>
    <path className="nb-vector-fill" d="M43 41h42v62a10 10 0 0 1-10 10H53a10 10 0 0 1-10-10Z" /><rect x="40" y="29" width="48" height="14" rx="4" />
    <rect x="49" y="65" width="30" height="24" rx="3" /><path className="nb-vector-accent" d="m54 77 5 5 12-12" /><path d="M104 53h27m-27 12h21m-21 12h25" />
  </>;
  else drawing = <>
    <path className="nb-vector-fill" d="M49 30h62l-7 8v47a8 8 0 0 1-8 8H64a8 8 0 0 1-8-8V38z" /><path className="nb-vector-liquid" d="M57 64q12-5 24 0t22 0v20a8 8 0 0 1-8 8H65a8 8 0 0 1-8-8Z" />
    <path d="M89 44h14M95 54h8M95 75h8" /><rect className="nb-vector-fill" x="33" y="96" width="94" height="20" rx="6" /><circle cx="111" cy="106" r="3" />
    {step.id === 'citrate' ? <path className="nb-vector-accent" d="m73 15 5 4m9-8-1 5m10 5-3 3" /> : step.id === 'complex' ? <><circle className="nb-vector-accent" cx="71" cy="73" r="2" /><circle className="nb-vector-accent" cx="85" cy="80" r="2" /></> : <path className="nb-vector-accent" d="M66 20c-6-5 6-8 0-13m14 13c-6-5 6-8 0-13m14 13c-6-5 6-8 0-13" />}
    {step.id !== 'dry' && <path className="nb-vector-accent" d="M71 83h18" />}
  </>;
  return <svg className={compact ? 'nb-task-vector nb-task-vector-small' : 'nb-task-vector'} viewBox="0 0 160 136" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{drawing}</svg>;
}
