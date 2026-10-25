"use client";

import { useState } from "react";
import { acidDilution } from "../../lib/acid-dilution.mjs";
import { NITRIC_ACID } from "../../lib/reagent-presets.mjs";
import { pretty } from "../../lib/stocks.mjs";

const initialForm=()=>({product:NITRIC_ACID.id,sourcePercent:NITRIC_ACID.percent,sourceDensity:NITRIC_ACID.density,molarMass:NITRIC_ACID.molarMass,mode:"mass",sourceAmount:"5",sourceUnit:"ml",targetPercent:"10",waterDensity:"1",targetMolarity:"1",finalMl:"100"});

export default function AcidDilutionCalculator({onUseAcid}) {
  const [form,setForm]=useState(initialForm);
  const update=patch=>setForm(old=>({...old,...patch}));
  const result=acidDilution(form);
  const numberField=(key,label,extra={})=><label className="stock-field">{label}<input type="number" min="0" step="any" {...extra} aria-label={label} value={form[key]} onChange={e=>update({[key]:e.target.value})}/></label>;
  return <section className="section-block acid-calculator" aria-labelledby="acid-calculator-title">
    <div className="section-heading"><div><h2 id="acid-calculator-title">希硝酸の計算</h2><p>濃硝酸と純水から、使いたい濃度の硝酸を調製するための計算です。</p></div></div>
    <p className="stock-warning">酸だけの希釈計算です。Eu₂O₃・Bi₂O₃などを溶かした後のストックには、反応で硝酸が消費されるため、そのまま適用できません。遊離硝酸濃度・pH・溶解可否は推定しません。</p>
    <section className="stock-step" aria-labelledby="dilution-source-title"><h3 id="dilution-source-title">1. 原液を選ぶ</h3>
      <label className="stock-field">希釈に使う硝酸<select aria-label="希釈に使う硝酸" value={form.product} onChange={e=>update(e.target.value===NITRIC_ACID.id?{product:e.target.value,sourcePercent:NITRIC_ACID.percent,sourceDensity:NITRIC_ACID.density,molarMass:NITRIC_ACID.molarMass}:{product:"manual"})}><option value={NITRIC_ACID.id}>{NITRIC_ACID.name}</option><option value="manual">別の硝酸・手入力</option></select></label>
      <p className="stock-caption">原液：{form.sourcePercent||"—"} w/w%・密度 {form.sourceDensity||"—"} g/mL。{!result.error?`換算モル濃度 約${pretty(result.sourceMolarity)} mol/L。`:""}プリセットは公称値で、ロットの測定値ではありません。</p>
      <details className="stock-details"><summary>原液の濃度・密度などを変更</summary><div className="stock-form-grid">{numberField("sourcePercent","原液の硝酸濃度（w/w%）",{max:"100"})}{numberField("sourceDensity","原液の密度（g/mL）")}{numberField("molarMass","希釈計算用HNO₃モル質量（g/mol）")}</div><a href={NITRIC_ACID.source} target="_blank" rel="noreferrer">ナカライテスク製品情報</a></details>
    </section>
    <section className="stock-step" aria-labelledby="dilution-target-title"><h3 id="dilution-target-title">2. 作りたい条件を入力</h3>
      <label className="stock-field">希硝酸の計算方法<select aria-label="希硝酸の計算方法" value={form.mode} onChange={e=>update({mode:e.target.value})}><option value="mass">使う原液量と目標w/w%から、必要な純水量を計算</option><option value="molar">目標mol/Lと作る体積から、必要な原液量を計算</option></select></label>
      <div className="stock-form-grid">{form.mode==="mass"?<>
        {numberField("sourceAmount","希釈する原液の量")}
        <label className="stock-field">希釈する原液量の単位<select aria-label="希釈する原液量の単位" value={form.sourceUnit} onChange={e=>update({sourceUnit:e.target.value})}><option value="ml">mL</option><option value="g">g</option></select></label>
        {numberField("targetPercent","作りたい硝酸濃度（w/w%）",{max:"100"})}
      </>:<>{numberField("targetMolarity","作りたい硝酸濃度（mol/L）")}{numberField("finalMl","希硝酸の冷却後の最終体積（mL）")}</>}</div>
      <p className="stock-caption">w/w%は「溶液100 g中のHNO₃のg数」です。v/v%（原液の体積割合）や元素のmol%とは異なります。</p>
    </section>
    {result.error?<p className="stock-warning" role="alert">{result.error}</p>:<section className="preparation-conclusion" aria-label="希硝酸の計算結果"><h3>必要な原液と純水</h3>
      <dl className="stock-metrics"><div><dt>使う硝酸原液</dt><dd>{pretty(result.sourceMl)} mL</dd><small>{pretty(result.sourceMass)} g相当</small></div><div><dt>{form.mode==="mass"?"必要な純水（質量が基準）":"純水の使い方"}</dt><dd>{form.mode==="mass"?`${pretty(result.waterMass)} g`:`冷却後に全量 ${pretty(result.finalMl)} mLまで定容`}</dd>{form.mode==="mass"&&<small>体積換算の目安：約{pretty(result.waterMlApprox)} mL</small>}</div></dl>
      <p className="conclusion-sentence">{form.mode==="mass"?`計算結果：${form.sourcePercent} w/w%の硝酸原液 ${pretty(result.sourceMl)} mL（${pretty(result.sourceMass)} g）と純水 ${pretty(result.waterMass)} gで、${form.targetPercent} w/w%の硝酸を合計 ${pretty(result.finalMass)} g調製する計画です。`:`計算結果：硝酸原液 ${pretty(result.sourceMl)} mLを用い、純水で希釈・冷却後、溶液全体を ${pretty(result.finalMl)} mLに合わせると、${form.targetMolarity} mol/Lになります（原液の入力値に基づく理論値）。`}</p>
      <p className="stock-caption">{form.mode==="mass"?"仕上がりの体積は自動算出しません。混合時の体積変化と希硝酸の密度が必要です。":"純水の正確な添加mLは、最終体積−原液体積では求めません。冷却後に標線まで合わせてください。原液体積に純水を足した単純和が最終体積になるとは限りません。"}</p>
      <button type="button" className="primary-button" onClick={()=>onUseAcid({...result.acidPatch,acidAmount:"",initialAcidMl:"",initialAcidMode:"volume"})}>この希硝酸の条件をストック登録へ転記</button>
      <p className="stock-caption">登録フォームの硝酸の入力だけを置き換えます。酸化物・質量などの入力と保存済み台帳は保持します。希硝酸の密度は推定せず空欄にします。{form.mode==="mass"?"密度未設定の間は、投入実績をgで記録してください。":"mol/L指定・mLでの投入記録に対応します。"}</p>
    </section>}
    <details className="stock-details"><summary>計算式・純水の体積換算</summary><p>原液のHNO₃質量 = 原液質量 × 原液w/w% ÷ 100。仕上がり質量 = HNO₃質量 ÷ (目標w/w% ÷ 100)。必要な純水質量 = 仕上がり質量 − 原液質量。</p><p>原液mol/L = 密度 × 原液w/w% × 10 ÷ HNO₃モル質量。必要な原液mL = 目標mol/L × 最終mL ÷ 原液mol/L。</p>{numberField("waterDensity","純水の換算密度（g/mL・概算用）")}<p>体積の目安 = 純水質量 ÷ 純水密度。初期値1 g/mLは簡便な近似です。温度や必要精度に合わせて変更し、精密なw/w%調製には質量を使用してください。蒸発・移送損失は含みません。</p></details>
    <div className="stock-step"><h3>取り扱いと酸化物ストックの注意</h3><p>希釈は発熱します。濃硝酸へ純水を直接注がず、適量の純水側へ酸を少量ずつ加え、冷却してから定容します。実際の操作は製品SDS・研究室の手順に従い、ドラフトと適切な保護具を使用してください。</p><p>Biを含む硝酸溶液は、希釈に伴う加水分解・白濁・沈殿に注意が必要です。Euを含め、酸化物の溶解・保存に適した最低硝酸濃度は自動設定しません。酸化物を溶かした後は、全量溶解と保存中の状態を確認してください。</p><details className="stock-details"><summary>参考資料</summary><p><a href="https://www.cdc.gov/niosh/npg/npgd0447.html" target="_blank" rel="noreferrer">CDC/NIOSH：硝酸の危険性</a>／<a href="https://inchem.org/documents/icsc/icsc/eics0183.htm" target="_blank" rel="noreferrer">ILO/WHO ICSC：希釈時の注意（70%超の硝酸の資料）</a>／<a href="https://pubs.acs.org/doi/10.1021/acsreagents.4058.20250401" target="_blank" rel="noreferrer">ACS：硝酸ビスマスと水の関係</a></p></details></div>
  </section>;
}
