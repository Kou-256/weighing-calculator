"use client";

import { oxideById, preparationSummary, pretty } from "../../lib/stocks.mjs";

export default function PreparationConclusion({form,onChange}) {
  const summary=preparationSummary(form);
  if(summary.error) return <p className="stock-warning">{summary.error}</p>;
  const formula=oxideById(form.oxideId).formula;
  const massText=summary.massBasis==="actual"?pretty(summary.massG,8):summary.massG.toFixed(4);
  const recordedMl=form.acidUnit==="g"?Number(form.acidAmount)/Number(form.acidDensity):Number(form.acidAmount);
  const entered=form.initialAcidMl??(Number.isFinite(recordedMl)&&recordedMl>0?String(recordedMl):"");
  return <section className="preparation-conclusion" aria-label="今回の調製まとめ">
    <h4>今回の調製まとめ</h4>
    <p className="stock-caption">{summary.massBasis==="actual"?"入力した実秤量値に基づく計画です。":"0.1 mg刻みの秤量目安に基づく計画です。実際に量った値は下の欄へ入力してください。"}</p>
    <ol className="conclusion-steps">
      <li><span>最初に使う硝酸</span><strong>{summary.initialMl===null?"未確定":`${pretty(summary.initialMl)} mL`}</strong><small>{summary.initialMl===null?"下で初期投入量を指定してください。":summary.acidSource==="factor"?"指定倍率から求めた投入計画（溶解の保証ではありません）":"ユーザー指定の初期投入量（溶解条件は別途確認）"}</small></li>
      <li><span>量り取る{formula}</span><strong>{massText} g</strong><small>{summary.massBasis==="actual"?"実秤量値を採用":"天秤0.1 mg刻みの目安"}</small></li>
      <li><span>冷却後、同じ硝酸で合わせる全体量</span><strong>{pretty(summary.finalMl)} mL</strong><small>硝酸を{pretty(summary.finalMl)} mL追加する、という意味ではありません。</small></li>
    </ol>
    <div className="conclusion-acid-setting">
      <label className="stock-field">初期硝酸量の指定方法<select aria-label="初期硝酸量の指定方法" value={form.initialAcidMode||"volume"} onChange={e=>onChange({initialAcidMode:e.target.value})}><option value="volume">確認済みの投入量をmLで指定</option><option value="factor">理論必要量 × 確認済みの倍率</option></select></label>
      {(form.initialAcidMode||"volume")==="volume"?<label className="stock-field">最初に使う硝酸量（mL）<input aria-label="最初に使う硝酸量（mL）" type="number" min="0" step="any" placeholder="実験条件を確認して指定" value={entered} onChange={e=>onChange({initialAcidMl:e.target.value})}/></label>:<label className="stock-field">初期硝酸の計画倍率<input aria-label="初期硝酸の計画倍率" type="number" min="1" step="any" placeholder="実験で確認済みの倍率" value={form.acidMultiplier??""} onChange={e=>onChange({acidMultiplier:e.target.value})}/></label>}
    </div>
    {summary.acidError?<p className="stock-warning">{summary.acidError} 硝酸の初期投入量だけは、濃度計算から実用量を自動決定できません。</p>:summary.warning?<p className="stock-warning" role="alert">{summary.warning}</p>:<p className="conclusion-sentence">投入計画：硝酸 {pretty(summary.initialMl)} mL、{formula} {massText} g。冷却後、同じ硝酸で溶液全体を {pretty(summary.finalMl)} mLに合わせます。</p>}
    <p className="stock-caption">これは投入計画の整理です。入力した量・倍率での溶解可否は別途確認が必要です。定容時の追加硝酸量や硝酸の使用総量を、最終体積との差だけで求めることはしません。</p>
  </section>;
}
