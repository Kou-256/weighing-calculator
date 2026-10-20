"use client";

import { oxideById, targetDose, aliquotRepeats, acidRequirement, pretty } from "../../lib/stocks.mjs";

export function ConcentrationSeries({stock,targetMol,baseMl,queryPercent,onQueryChange}) {
  const element=oxideById(stock.oxideId).element;
  const series=[...new Set([.01,.02,.03,.04,.1,Number(queryPercent)])].filter(x=>x>0&&x<=100).sort((a,b)=>a-b);
  const query=targetDose(stock,targetMol,queryPercent);
  return <div className="stock-design-result">
    <label className="stock-field">調べたい{element}濃度（mol%）<input aria-label={`調べたい${element}濃度（mol%）`} type="number" min="0" max="100" step="any" value={queryPercent??"0.01"} onChange={e=>onQueryChange(e.target.value)}/></label>
    <p className={query.error?"stock-warning":"stock-delivered"}>{query.error||`${queryPercent} mol%：理論 ${pretty(query.idealMl)} mL → ピペット設定 ${pretty(query.settingMl)} mL、追加硝酸 ${pretty(query.additionalMl)} mL。設定後 ${pretty(query.actualPercent)} mol%。`}</p>
    <p className="stock-caption">基準分取量 {baseMl||"未設定"} mL。表の回数はピペット設定量の合計に基づきます。「倍率」は理論分取量÷基準分取量です。合成量 {targetMol} mol、上限 {pretty(5*Number(targetMol)/.004)} mL。他のストックを併用する場合はその分を差し引いてください。</p>
    <div className="stock-series-wrap"><table className="stock-series" aria-label={`${element}濃度別の分取量一覧`}><thead><tr><th>目標 mol%</th><th>理論 mL</th><th>設定 mL</th><th>基準の倍率</th><th>分取操作の例</th><th>追加硝酸 mL</th><th>設定後 mol%</th></tr></thead><tbody>{series.map(x=>{
      const row=targetDose(stock,targetMol,x), repeat=aliquotRepeats(row.settingMl,baseMl);
      const operations=repeat.error?repeat.error:!repeat.feasible?"端数が機器範囲外：合計設定量を直接分取":[repeat.count>0?`${baseMl} mL × ${repeat.count}回`:"",repeat.remainderMl>0?`${pretty(repeat.remainderMl)} mL × 1回`:""].filter(Boolean).join(" ＋ ");
      return <tr key={x}><th>{x}</th><td>{pretty(row.idealMl)}</td>{row.error?<td colSpan="5" className="stock-series-error">{row.error}</td>:<><td>{pretty(row.settingMl)}</td><td>{Number(baseMl)>0?pretty(row.idealMl/Number(baseMl),4):"—"}倍</td><td>{operations}</td><td>{pretty(row.additionalMl)}</td><td>{pretty(row.actualPercent)}</td></>}</tr>;
    })}</tbody></table></div>
    <p className="stock-caption">表は全量溶解・定量移送を前提とする計算値です。ピペットの繰返し操作による実験誤差を保証するものではありません。横にスクロールして全項目を確認できます。</p>
  </div>;
}

export function AcidPlanning({stock,multiplier,onMultiplierChange,onApply}) {
  const theoretical=acidRequirement(stock), plan=acidRequirement(stock,multiplier);
  return <div className="stock-acid-plan stock-design-result">
    <h4>溶解時の硝酸投入量を計算</h4>
    {theoretical.error?<p className="stock-warning">{theoretical.error}</p>:<>
      <dl className="stock-metrics"><div><dt>反応式上の理論必要量（1倍）</dt><dd>{pretty(theoretical.ml)} mL</dd></div><div><dt>硝酸溶液の質量換算</dt><dd>{theoretical.grams===null?"密度未設定":`${pretty(theoretical.grams)} g`}</dd></div></dl>
      {theoretical.minMl!==theoretical.ml&&<p className="stock-caption">60–61%の理論範囲：{pretty(theoretical.minMl)}–{pretty(theoretical.ml)} mL。投入計画には低濃度側（60%）を使用します。</p>}
      <label className="stock-field">理論必要量に対する投入倍率（確認済みの条件）<input aria-label="硝酸投入倍率" type="number" min="1" step="any" placeholder="実験で確認済みの倍率を指定" value={multiplier??""} onChange={e=>onMultiplierChange(e.target.value)}/></label>
      {multiplier!==""&&multiplier!=null&&(plan.error?<p className="stock-warning" role="alert">{plan.error}</p>:<>
        <p className="stock-delivered">指定条件での投入計画：{pretty(plan.ml)} mL{plan.grams!==null?`（${pretty(plan.grams)} g）`:""} ／ 理論必要量の{pretty(plan.factor)}倍</p>
        <button type="button" className="secondary-button" disabled={stock.acidUnit==="g"&&plan.grams===null} onClick={()=>onApply({acidAmount:String(stock.acidUnit==="g"?plan.grams:plan.ml)})}>投入計画を「溶解時の硝酸投入量」へ転記</button>
        {plan.ml>=Number(stock.finalMl)&&<p className="stock-warning">投入計画が最終定容体積以上です。溶解・定容の手順や体積設計を見直してください。</p>}
      </>)}
      <p className="stock-warning">理論必要量は溶解に十分な実用量ではありません。必要な過剰量は自動決定しません。指定倍率は実験で確認してください。冷却後の定容には別途硝酸を追加しますが、その追加量を体積差だけから厳密に算出することはできません。</p>
    </>}
  </div>;
}
