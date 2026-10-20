"use client";

import { useState } from "react";

const STEPS=[
  {title:"溶かす",description:"硝酸投入量は、最初に酸化物を溶かすために加えた硝酸の量。必要な過剰量は実験条件で決まるため、自動では断定しません。"},
  {title:"冷却して定容",description:"冷却・定量移送した後、選んだ硝酸を追加して、溶液全体を計算された目標体積に合わせます。最初の硝酸投入量と同じ値である必要はありません。"},
  {title:"分取する",description:"できたストックから必要量だけを分取します。合成1回あたりの全ストック＋追加硝酸が5 mL（0.004 mol合成時）以内になるよう計算します。"},
];
export default function PreparationGuide() {
  const [step,setStep]=useState(1);
  return <div className="preparation-guide">
    <h4>初期硝酸量は固定、指定回数以上を確保</h4>
    <p className="stock-caption">合成量・目標mol%・1回の分取量を設定し、最初に使う硝酸量と確保したい回数を入力。0.1 mg刻みで秤量目安を切り上げ、その質量から冷却後に同じ硝酸で合わせる全体量を逆算します。従来の体積固定方式も選べます。</p>
    <div className="preparation-steps" aria-label="ストック調製の図解">
      {STEPS.map((s,i)=><button key={s.title} type="button" aria-pressed={step===i} onClick={()=>setStep(i)}>
        <svg viewBox="0 0 100 100" aria-hidden="true" className={step===i?"is-playing":""}>
          {i===0?<><path d="M27 20v56q0 10 10 10h30q10 0 10-10V20"/><path className="guide-liquid" d="M28 60h48v16q0 9-9 9H37q-9 0-9-9Z"/><circle className="guide-bubble" cx="46" cy="70" r="3"/><circle className="guide-bubble guide-delay" cx="60" cy="64" r="2"/></>:i===1?<><path d="M43 12h14v31l22 36q5 9-8 9H29q-13 0-8-9l22-36Z"/><path className="guide-liquid" d="M34 60h32l13 21q1 6-8 6H29q-9 0-8-6Z"/><path className="guide-mark" d="M39 53h22"/><path className="guide-drop" d="M51 25q-10 12 0 12t0-12Z"/></>:<><path d="M30 13h40l-8 23H38Z"/><path d="M46 36v30l4 9 4-9V36"/><path className="guide-drop" d="M50 78q-8 11 0 11t0-11Z"/><path d="M26 80v12h48V80"/></>}
        </svg><span>{i+1}. {s.title}</span>
      </button>)}
    </div>
    <p className="guide-explanation" key={step}>{STEPS[step].description}</p>
    <details className="stock-details"><summary>なぜ最終体積のほうが大きくてもよい？</summary><p>例：最初に硝酸10 mLで溶かし、冷却後に硝酸を追加して溶液全体を100 mLにする場合、投入量は10 mL、最終体積は100 mLです。これは用語の説明であり、推奨レシピではありません。</p><p>加熱損失・溶質・混合による体積変化があるため、投入量から冷却後の実体積や追加すべき硝酸量を単純な差で求めることはできません。ここで自動計算するのは「合わせる目標体積」です。</p></details>
  </div>;
}
