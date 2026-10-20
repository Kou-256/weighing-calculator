"use client";

import { oxideById, preparationSummary, stockDesign, pretty } from "../../lib/stocks.mjs";

export default function PreparationConclusion({form}) {
  const summary=preparationSummary(form);
  const design=stockDesign(form);
  if(summary.error) return <p className="stock-warning">{summary.error}</p>;
  const formula=oxideById(form.oxideId).formula;
  const massText=summary.massBasis==="actual"?pretty(summary.massG,8):summary.massG.toFixed(4);
  return <section className="preparation-conclusion" aria-label="今回の調製まとめ">
    <h4>計算結果：今回の調製まとめ</h4>
    <p className="stock-caption">{summary.massBasis==="actual"?"入力した実秤量値に基づく計画です。":"0.1 mg刻みの秤量目安に基づく計画です。実際に量った値は下の欄へ入力してください。"}</p>
    <ol className="conclusion-steps">
      <li><span>最初に使う硝酸（入力値）</span><strong>{summary.initialMl===null?"未入力":`${pretty(summary.initialMl)} mL`}</strong><small>{summary.initialMl===null?"手順1で初期投入量を指定してください。":summary.acidSource==="factor"?"指定倍率から求めた投入計画（溶解の保証ではありません）":"ユーザー指定の初期投入量（溶解条件は別途確認）"}</small></li>
      {form.designMode==="target"&&!design.error&&<li><span>{formula}の理論秤量値（計算結果）</span><strong>{pretty(design.massG,8)} g</strong><small>目標 {form.designPercent} mol%・1回 {form.designAliquotMl} mL{form.volumeMode==="batch"?`・${form.batchCount}回分`:""}。{summary.massBasis==="actual"?"次の行は入力済みの実秤量値です。":"天秤に合わせた目安は次の行です。"}</small></li>}
      <li><span>量り取る{formula}</span><strong>{massText} g</strong><small>{summary.massBasis==="actual"?"実秤量値を採用":"天秤0.1 mg刻みの目安"}</small></li>
      <li><span>冷却後、同じ硝酸で合わせる全体量</span><strong>{pretty(summary.finalMl)} mL</strong><small>硝酸を{pretty(summary.finalMl)} mL追加する、という意味ではありません。</small></li>
    </ol>
    {summary.acidError?<p className="stock-warning">{summary.acidError} 硝酸の初期投入量だけは、濃度計算から実用量を自動決定できません。</p>:summary.warning?<p className="stock-warning" role="alert">{summary.warning}</p>:<p className="conclusion-sentence">投入計画：硝酸 {pretty(summary.initialMl)} mL、{formula} {massText} g。冷却後、同じ硝酸で溶液全体を {pretty(summary.finalMl)} mLに合わせます。</p>}
    <p className="stock-caption">これは投入計画の整理です。入力した量・倍率での溶解可否は別途確認が必要です。定容時の追加硝酸量や硝酸の使用総量を、最終体積との差だけで求めることはしません。</p>
  </section>;
}
