"use client";

import { useEffect, useState } from "react";
import { STOCK_OXIDES, oxideById, stockMolarMass, stockDesign, targetDose, balanceMass, pretty, acidInfo, concentration } from "../../lib/stocks.mjs";
import { NITRIC_ACID, nitricPreset, oxidePreset } from "../../lib/reagent-presets.mjs";
import { ConcentrationSeries, AcidPlanning } from "./StockPlanningTools";
import PreparationGuide from "./PreparationGuide";
import PreparationConclusion from "./PreparationConclusion";

export default function StockPreparationForm({form,setForm}) {
  const [toast,setToast]=useState(null);
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(null),4500);return ()=>clearTimeout(timer);},[toast]);
  const update=patch=>setForm(old=>({...old,...patch,...(Object.keys(patch).some(key=>["batchCount","designAliquotMl","designMol","designPercent","oxideId","massG","purity","productMolarMass","volumeMode","finalMl","designMode"].includes(key))?{finalVolumeConfirmed:false}:{})}));
  const transfer=(patch,message)=>{update(patch);setToast({message,id:Date.now()});};
  const field=(key,label,props={})=><label className="stock-field">{label}<input {...props} aria-label={label} value={form[key]??""} onChange={e=>update({[key]:e.target.value})}/></label>;
  const num={type:"number",min:"0",step:"any"};
  const oxide=oxideById(form.oxideId), design=stockDesign(form);
  // The provisional name only allows a preview before the final naming step.
  const preview={...form,name:form.name.trim()||"調製中"};
  const c=concentration(preview), acid=acidInfo(preview);
  const dose=targetDose(preview,form.designMol,form.designPercent);
  const acidMl=form.acidUnit==="g" ? Number(form.acidAmount)/Number(form.acidDensity) : Number(form.acidAmount);
  const roundedMass=balanceMass(design.massG);
  const plannedStock={...preview,massG:String(form.planningMassBasis==="theoretical"?design.massG:roundedMass)};
  return <>
    <PreparationGuide/>
    <div className="stock-toast-region" aria-live="polite" aria-atomic="true">{toast&&<div className="stock-toast" key={toast.id} role="status"><span aria-hidden="true">✓</span><span>{toast.message}</span><button type="button" aria-label="通知を閉じる" onClick={()=>setToast(null)}>×</button></div>}</div>
    <section className="stock-step" aria-labelledby="stock-step-acid">
      <h4 id="stock-step-acid"><span>1</span> 使用する硝酸</h4>
      <label className="stock-field">硝酸の製品<select aria-label="硝酸の製品" value={form.acidProduct||"manual"} onChange={e=>update(e.target.value===NITRIC_ACID.id?nitricPreset():{acidProduct:"manual",acidName:"硝酸（手入力）"})}>
        <option value={NITRIC_ACID.id}>{NITRIC_ACID.name}</option><option value="manual">硝酸（手入力・別製品）</option>
      </select></label>
      <p className="stock-caption">{form.acidMode==="weight"?`${form.acidPercent} w/w%` : form.acidMode==="molar"?`${form.acidMolarity} mol/L`:"60–61%"} · 密度 {form.acidDensity||"未設定"} g/mL。製品の値を初期入力しています。</p>
      <details className="stock-details"><summary>硝酸の特性・最初に投入した量の記録（任意）</summary>
      {form.acidProduct===NITRIC_ACID.id&&<p className="stock-caption">品番 {NITRIC_ACID.code} · {NITRIC_ACID.formula} · CAS {NITRIC_ACID.cas} · ラベル値を初期入力（ロットの実測値ではありません）。<a href={NITRIC_ACID.source} target="_blank" rel="noreferrer">製品情報</a></p>}
      <div className="stock-form-grid">
        {field("acidAmount","溶解時の硝酸投入量（実際の記録・任意）",{...num,placeholder:"未記録でも設計できます"})}
        <label className="stock-field">投入量の単位<select aria-label="投入量の単位" value={form.acidUnit} onChange={e=>update({acidUnit:e.target.value})}><option value="ml">mL</option><option value="g">g</option></select></label>
        <label className="stock-field">硝酸濃度の表し方<select aria-label="硝酸濃度の表し方" value={form.acidMode} onChange={e=>update({acidMode:e.target.value})}><option value="weight">質量濃度（w/w%）</option><option value="molar">モル濃度（mol/L）</option><option value="w60">60–61%（従来の範囲指定）</option></select></label>
        {form.acidMode==="weight"&&field("acidPercent","硝酸濃度（w/w%）",{...num,max:"100",required:true})}
        {form.acidMode==="molar"&&field("acidMolarity","硝酸濃度（mol/L）",{...num,required:true})}
        {field("acidDensity","硝酸の密度（g/mL）",num)}
        {field("acidMolarMass","HNO₃のモル質量（g/mol）",num)}
      </div>
      {Number(form.acidAmount)>0&&Number.isFinite(acidMl)&&acidMl>0&&<p className="stock-caption">投入量の体積換算：{pretty(acidMl)} mL {Number(form.acidDensity)>0?`／質量換算：${pretty(acidMl*Number(form.acidDensity))} g`:""}。これはストック調製全体の投入量であり、合成1回の5 mL上限とは別です。</p>}
      <p className="stock-caption">加熱・溶解前の投入量と、冷却後の最終定容体積は別々に記録します。投入量から最終遊離酸濃度・pHや溶解可否を推定しません。</p>
      </details>
    </section>

    <section className="stock-step" aria-labelledby="stock-step-oxide">
      <h4 id="stock-step-oxide"><span>2</span> 用いる酸化物</h4>
      <label className="stock-field">酸化物<select aria-label="酸化物" value={form.oxideId} onChange={e=>update(oxidePreset(e.target.value))}>{STOCK_OXIDES.map(o=><option key={o.id} value={o.id}>{o.formula}</option>)}</select></label>
      <p className="stock-caption">{form.manufacturer||"メーカー未記録"} · {form.productCode||"品番未確認"} · 表示純度 {form.reportedPurity?`${form.reportedPurity}%（記録用）`:"未確認"}</p>
      <details className="stock-details"><summary>酸化物の特性・純度・出典を確認／変更</summary>
      <div className="stock-form-grid">
        {field("manufacturer","酸化物メーカー",{maxLength:200})}
        {field("productCode","酸化物の製品番号",{maxLength:200,placeholder:"製品ラベルを確認"})}
        {field("reportedPurity","メーカー表示純度（%・記録用）",{...num,max:"100",placeholder:"未確認"})}
        {field("productMolarMass","製品のモル質量（g/mol）",{...num,placeholder:`標準値 ${pretty(oxide.molarMass)}`})}
      </div>
      <p className="stock-caption">Eu₂O₃：EUO01PB・99.9%・351.918 g/mol、Tm₂O₃：TMO01PB・99.9%・385.867 g/molは提供ラベルから入力。他の製品の純度・品番は未確認のため空欄です。計算に使うモル質量：{pretty(stockMolarMass(form))} g/mol。</p>
      <details className="stock-details"><summary>酸化物の製品特性・出典</summary><div className="stock-form-grid">
        {field("productGrade","製品グレード",{placeholder:"未確認"})}{field("productCas","酸化物CAS番号",{placeholder:"未確認"})}
        {field("productShape","形状",{placeholder:"未確認"})}{field("productSpecificGravity","酸化物の比重（記録用）",{placeholder:"未確認"})}
        {field("productMeltingPoint","融点（℃・記録用）",{placeholder:"未確認"})}
      </div><p>出典：{form.productSource||"未記録"}。酸化物の比重・融点は記録用であり、硝酸の体積換算や溶解条件には流用しません。</p>{form.catalogMolarMass&&<p>メーカー資料の分子量は{form.catalogMolarMass}、瓶ラベルは{form.labelMolarMass} g/molです。初期値は使用瓶のラベルを優先しています。別の値を採用する場合は「製品のモル質量」を編集し、理由を調製メモへ記録してください。</p>}{form.oxideId==="Tm2O3"&&<p>Tmのメーカー資料に「溶解性（不）」の記載がありますが、対象溶媒はこの資料では特定できません。硝酸での溶解可否とは解釈せず、全量溶解・残渣なしを実際に確認してください。</p>}</details>
      <details className="stock-details"><summary>純度表示と含量補正について</summary>
        <p>高純度化学研究所の表示純度は金属不純物を差し引いた値です。酸化物の質量含量とは同一ではないため、表示純度は自動補正に使いません。成績書等で酸化物含量が確認できた場合のみ、下欄を指定してください。</p>
        <p><a href="https://www.kojundo.net/ext/info.html" target="_blank" rel="noreferrer">メーカーの純度表示の説明</a></p>
        {field("purity","計算用の酸化物含量（%・任意）",{...num,max:"100",placeholder:"未入力：補正なし"})}
      </details>
      </details>
    </section>

    <section className="stock-step" aria-labelledby="stock-step-design">
      <h4 id="stock-step-design"><span>3</span> 目標濃度からストックを設計</h4>
      <details className="stock-details"><summary>計算方法・従来の入力方法を変更</summary>
      <label className="stock-field">登録方法<select aria-label="登録方法" value={form.designMode||"mass"} onChange={e=>update({designMode:e.target.value,finalMl:form.finalMl})}><option value="target">目標mol%と分取量から秤量値を計算</option><option value="mass">既知の実秤量値から登録（従来の方法）</option></select></label>
      {form.designMode==="target"&&<label className="stock-field">体積の決め方<select aria-label="体積の決め方" value={form.volumeMode||"manual"} onChange={e=>update({volumeMode:e.target.value,finalMl:form.finalMl})}><option value="batch">作る回数から自動計算</option><option value="manual">最終定容体積を指定（従来の方法）</option></select></label>}
      </details>
      <p className="stock-caption">あなたが決める条件</p>
      <div className="stock-form-grid">
        {field("designMol","合成の基準モル数（mol）",{...num,required:form.designMode==="target"})}
        {field("designPercent",`目標${oxide.element}濃度（mol%）`,{...num,max:"100",required:form.designMode==="target"})}
        {form.designMode==="target"&&field("designAliquotMl","目標濃度にするストック分取量（mL）",{...num,required:true})}
        {form.designMode==="target"&&form.volumeMode==="batch"?field("batchCount","何回分のストックを作る？（回）",{type:"number",min:"1",max:"1000000",step:"1",required:true}):field("finalMl","冷却後の最終定容体積（mL）",{...num,required:true,placeholder:"例：100"})}
      </div>
      {form.designMode==="target"&&form.volumeMode==="batch"&&<div className="stock-computed-volume"><span>アプリが計算：定容する目標体積</span><output aria-label="定容する目標体積">{form.finalMl?`${pretty(Number(form.finalMl))} mL`:"条件を入力してください"}</output><p>{form.designAliquotMl||"—"} mL／回 × {form.batchCount||"—"}回 = {form.finalMl||"—"} mL。最初に加える硝酸の量ではなく、冷却後に溶液全体を合わせる体積です。</p></div>}
      {form.designMode==="target"&&form.volumeMode==="batch"&&<p className="stock-caption">回数は指定した目標mol%での調製規模の目安です。別の濃度で使う場合や秤量値を丸めた場合は、分取量・使える回数が変わります。</p>}
      <p className="stock-caption">mol%は、合成の基準モル数に対する{oxide.element}原子の物質量の割合です（酸化物の質量%ではありません）。定容には選択した硝酸を使用。複数ストックを併用するときは、合計の分取量に上限を適用します。</p>
      {(form.designMode==="target"&&!design.error || form.designMode!=="target"&&Number(form.massG)>0)&&<PreparationConclusion form={form} onChange={update}/>}
      {form.designMode==="target"&&(design.error?<p className="stock-warning" role="alert">{design.error}</p>:<div className="stock-preview stock-design-result">
        <details className="stock-details"><summary>理論値・合成1回あたりの分取条件</summary><dl className="stock-metrics"><div><dt>酸化物の推奨秤量値</dt><dd>{pretty(design.massG,8)} g</dd></div><div><dt>設計した金属濃度</dt><dd>{pretty(design.concentration*1000)} mmol/L</dd></div><div><dt>このストックの分取量</dt><dd>{form.designAliquotMl} mL</dd></div><div><dt>他のストックを使わない場合の追加硝酸</dt><dd>{pretty(design.limitMl-Number(form.designAliquotMl))} mL</dd></div></dl></details>
        <div className="stock-balance-mass"><span>天秤の表示刻み 0.1 mg（0.0001 g）に丸めた目安</span><strong>{roundedMass.toFixed(4)} g</strong><small>理論値との差 {pretty((roundedMass/design.massG-1)*100,4)}%。最低秤量量や精度を保証する値ではありません。</small></div>
        <button type="button" className="secondary-button" disabled={roundedMass<=0} onClick={()=>transfer({massG:roundedMass.toFixed(4)},`${roundedMass.toFixed(4)} gを実秤量欄へ転記しました。実際に量った値を確認してください。`)}>0.1 mg刻みの目安を実秤量欄へ転記</button>
        <p className="stock-caption">転記後は、実際に天秤で量った値へ修正してください。天秤の最小表示0.0001 gと最低秤量量は異なります。</p>
        <details className="stock-details"><summary>推奨秤量値の計算過程・理論値の転記</summary><p>必要な{oxide.element} = {form.designMol} mol × {form.designPercent} ÷ 100 = {pretty(design.requiredMol)} mol</p><p>ストック金属濃度 = {pretty(design.requiredMol)} mol ÷ ({form.designAliquotMl} mL ÷ 1000) = {pretty(design.concentration)} mol/L</p><p>酸化物秤量値 = {pretty(design.concentration)} mol/L × ({form.finalMl} mL ÷ 1000) ÷ 金属原子数{oxide.metalAtoms} × {pretty(stockMolarMass(form))} g/mol ÷ {form.purity?`(${form.purity} ÷ 100)` : "1（含量補正なし）"} = {pretty(design.massG,8)} g</p><button type="button" className="secondary-button" onClick={()=>transfer({massG:design.massG.toPrecision(12)},"理論上の秤量値を転記しました。天秤の実秤量値に修正してください。")}>計算値を実秤量欄へ転記</button></details>
      </div>)}
      {form.designMode==="target"&&!design.error&&<>
        <details className="stock-details"><summary>調製前の濃度一覧・硝酸投入量の補助計算</summary>
        <label className="stock-field">調製前の計算に使う秤量値<select aria-label="調製前の計算に使う秤量値" value={form.planningMassBasis||"rounded"} onChange={e=>update({planningMassBasis:e.target.value})}><option value="rounded">0.1 mg刻みに丸めた目安</option><option value="theoretical">理論上の推奨秤量値</option></select></label>
        {roundedMass<=0&&form.planningMassBasis!=="theoretical"?<p className="stock-warning">丸めると0.0000 gになります。ストックの調製量を増やすなど、秤量設計を見直してください。</p>:<>
          <details className="stock-details"><summary>硝酸の理論必要量・投入計画</summary><AcidPlanning stock={plannedStock} multiplier={form.acidMultiplier} onMultiplierChange={value=>update({acidMultiplier:value})} onApply={patch=>transfer(patch,"硝酸の投入計画を記録欄へ転記しました。実際の投入量を確認してください。")}/></details>
          <h4>調製前の濃度別・分取量一覧</h4><p className="stock-caption">{form.planningMassBasis==="theoretical"?"理論値":"0.1 mg刻みの目安"} {pretty(Number(plannedStock.massG),8)} gで調製した場合の参考表です。実秤量後は下の確定値を確認してください。目標濃度の設計を変えずに、別のmol%を検索できます。</p>
          <ConcentrationSeries stock={plannedStock} targetMol={form.designMol} baseMl={form.designAliquotMl} queryPercent={form.queryPercent??"0.01"} onQueryChange={value=>update({queryPercent:value})}/>
        </>}
        </details>
      </>}
    </section>

    <section className="stock-step" aria-labelledby="stock-step-measured">
      <h4 id="stock-step-measured"><span>4</span> 実秤量値から分取量を確定</h4>
      {field("massG","酸化物の実秤量値（g）",{...num,required:true,placeholder:"実際に量った値"})}
      <p className="stock-caption">設計値と実秤量値は分けて扱います。保存・組成計算には、この実秤量値と冷却後の最終定容体積を使います。</p>
      {form.designMode==="target"&&form.volumeMode==="batch"&&<label className="stock-volume-confirm"><input type="checkbox" checked={Boolean(form.finalVolumeConfirmed)} onChange={e=>update({finalVolumeConfirmed:e.target.checked})}/><span>冷却後、選んだ硝酸で溶液全体を{form.finalMl||"計算された目標"} mLに定容したことを確認しました。</span></label>}
      {Number.isFinite(c)&&<>
        <p className="stock-delivered">{oxide.element}濃度：{pretty(c*1000)} mmol/L。目標 {form.designPercent} mol%の理論分取量：{pretty(dose.idealMl)} mL。</p>
        {dose.error?<p className="stock-warning" role="alert">{dose.error}</p>:<p className="stock-success">ピペット設定 {pretty(dose.settingMl)} mL ＋ 追加硝酸 {pretty(dose.additionalMl)} mL。設定後の{oxide.element}濃度 {pretty(dose.actualPercent)} mol%（他のストックなしの場合）。</p>}
        <details className="stock-details"><summary>濃度系列と追加硝酸量を確認</summary>
          <ConcentrationSeries stock={preview} targetMol={form.designMol} baseMl={form.designAliquotMl} queryPercent={form.queryPercent??"0.01"} onQueryChange={value=>update({queryPercent:value})}/>
        </details>
        <details className="stock-details"><summary>実秤量値に基づく硝酸投入計画</summary><AcidPlanning stock={preview} multiplier={form.acidMultiplier} onMultiplierChange={value=>update({acidMultiplier:value})} onApply={patch=>transfer(patch,"実秤量値に基づく硝酸投入計画を転記しました。")}/></details>
      </>}
    </section>

    <section className="stock-step" aria-labelledby="stock-step-record">
      <h4 id="stock-step-record"><span>5</span> 名前と調製記録をつけて登録</h4>
      <div className="stock-form-grid">
        {field("name","ストック名",{required:true,maxLength:100,placeholder:`例：${oxide.element}-stock-01`})}
        {field("date","調製日",{type:"date"})}{field("operator","調製者",{maxLength:200})}
        <label className="stock-field">溶解状態<select aria-label="溶解状態" value={form.status} onChange={e=>update({status:e.target.value})}><option value="unknown">未確認</option><option value="clear">全量溶解・残渣なしを確認</option><option value="precipitate">白濁・沈殿・残渣あり</option></select></label>
      </div>
      <details className="stock-details"><summary>ロット・容器・調製メモ（任意）</summary>
      <div className="stock-form-grid">{field("lot","試薬ロット",{maxLength:200})}{field("container","容器ID",{maxLength:200})}</div>
      <label className="stock-field">加熱・定容時の硝酸追加・確認事項<textarea aria-label="調製メモ" rows="3" maxLength={4000} value={form.notes} onChange={e=>update({notes:e.target.value})}/></label>
      </details>
      {acid.range&&<p className="stock-caption">溶解時の投入HNO₃：{pretty(acid.range[0]*1000)}{acid.range[0]!==acid.range[1]?`–${pretty(acid.range[1]*1000)}`:""} mmol。{acid.theoretical!==null&&`酸化物から求めた形式的な理論必要量：${pretty(acid.theoretical*1000)} mmol。`}これは実際の溶解条件や保存安定性の保証ではありません。</p>}
    </section>
  </>;
}
