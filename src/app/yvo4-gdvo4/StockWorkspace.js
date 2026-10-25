"use client";

import React from "react";
import { STOCK_OXIDES, PIPETTES, oxideById, stockMolarMass, stockDesign, targetDose, resolveStockForm, preparationError, preparationSummary, pretty, stockError, concentration, acidInfo, liquidBudget, acidDispensing, csvCell, downloadFile, validateBackup } from "../../lib/stocks.mjs";
import { nitricPreset, oxidePreset } from "../../lib/reagent-presets.mjs";
import StockPreparationForm from "./StockPreparationForm";
import { getDelivery, updateDelivery } from "../../lib/stock-delivery.mjs";
export { stockLine, setStockLines } from "../../lib/stock-delivery.mjs";

const STORAGE="weighing_stocks_v1";
const StockContext=React.createContext(null);
const emptyData=()=>({schema:1,stocks:[],records:[],delivery:{},drafts:{}});
const newForm=()=>({name:"",...oxidePreset("Eu2O3"),massG:"",finalMl:"100",volumeMode:"minimum",batchCount:"200",finalVolumeConfirmed:false,designMode:"target",designMol:"0.004",designPercent:"0.01",designAliquotMl:"0.5",date:new Date().toLocaleDateString("sv-SE"),lot:"",container:"",operator:"",status:"unknown",...nitricPreset(),acidAmount:"",acidUnit:"ml",notes:""});
const revisionForm=stock=>({...newForm(),...Object.fromEntries(Object.keys(oxidePreset(stock.oxideId)).filter(key=>key!=="oxideId"&&key!=="purity").map(key=>[key,""])),...stock,volumeMode:stock.volumeMode||"manual",finalVolumeConfirmed:false,designMode:stock.designMode||"mass",acidProduct:stock.acidProduct||"manual",acidName:stock.acidName||"硝酸（従来記録）",name:`${stock.name}（新版）`});
const uid=()=>crypto.randomUUID();

export function StockProvider({children}) {
  const [data,setData]=React.useState(emptyData);
  const [ready,setReady]=React.useState(false);
  const [storageError,setStorageError]=React.useState("");
  React.useEffect(()=>{
    try {
      const saved=localStorage.getItem(STORAGE);
      if(saved) {const parsed=validateBackup(JSON.parse(saved));setData({...emptyData(),...parsed});}
    } catch {setStorageError("保存した台帳を読み込めません。既存データは上書きしていません。JSONバックアップを確認してください。");return;}
    setReady(true);
  },[]);
  React.useEffect(()=>{
    if(!ready)return;
    try {localStorage.setItem(STORAGE,JSON.stringify(data));setStorageError("");}
    catch {setStorageError("ブラウザに保存できません。容量・設定を確認し、JSONバックアップを保存してください。");}
  },[data,ready]);
  return <StockContext.Provider value={{data,setData,ready,storageError,recover:()=>{setStorageError("");setReady(true);}}}>{children}</StockContext.Provider>;
}
export const useStocks=()=>React.useContext(StockContext);

export function DeliverySelector({material,element,setNumber}) {
  const {data,setData}=useStocks();
  if(element === "Y") return null;
  const selected=getDelivery(data,material,setNumber);
  const matching=data.stocks.filter(s=>oxideById(s.oxideId)?.element===element&&!s.archived);
  const update=(patch)=>setData(old=>updateDelivery(old,material,setNumber,patch));
  return <div className="delivery-selector">
    <label>添加方法
      <select aria-label={`セット ${setNumber} ${material} 添加方法`} value={selected.mode||"powder"} onChange={e=>update({mode:e.target.value})}>
        <option value="powder">粉末を秤量</option><option value="stock">ストックから分取</option>
      </select>
    </label>
    {selected.mode==="stock" && <label>使用ストック
      <select aria-label={`セット ${setNumber} ${material} 使用ストック`} value={selected.stockId||""} onChange={e=>update({stockId:e.target.value})}>
        <option value="">選択してください</option>
        {matching.map(s=><option key={s.id} value={s.id}>{s.name} · {pretty(concentration(s)*1000)} mmol/L</option>)}
      </select>
    </label>}
    {selected.mode==="stock" && !matching.length && <p className="stock-warning">「ストック溶液」で{element}の台帳を登録してください。</p>}
  </div>;
}

export function StockDose({line,budget,targetMol,setNumber}) {
  const {data,setData,ready,storageError}=useStocks();
  const [notice,setNotice]=React.useState("");
  const {stock,plan,signature,key,draft,actualUl,requiredMol,material}=line;
  const selection=getDelivery(data,material,setNumber);
  const setVolume=value=>{setNotice("");setData(old=>({...old,drafts:{...old.drafts,[key]:{signature,value}}}));};
  const setPipette=value=>setData(old=>updateDelivery(old,material,setNumber,{pipette:value}));
  const actualMol=plan.concentration*actualUl/1e6;
  const latest=[...data.records].reverse().find(r=>r.signature===signature && r.setNumber===setNumber && r.material===material && r.actualUl===actualUl);
  const confirm=()=>{
    if(line.invalid||budget.over||budget.unresolved||!ready||storageError)return;
    if(data.records.length>=10000){setNotice("履歴上限10000件に達しました。JSONバックアップを保存してください。");return;}
    setData(old=>({...old,records:[...old.records,{id:uid(),at:new Date().toISOString(),stock:{...stock},material,setNumber,targetMol:Number(targetMol),requiredMol,actualUl,actualMol,signature,experiment:line.experiment,limitMl:budget.limitMl,totalStockMl:budget.usedMl,additionalAcidMl:budget.remainingMl,pipette:plan.pipette?.id||null}]}));
    setNotice("使用履歴に保存しました。同じ値で再度保存するときは次の実験として新しい記録になります。");
  };
  return <div className="stock-dose">
    <div className="stock-dose-title"><strong>ストックから分取</strong><span>{stock ? `${stock.name} · ${oxideById(stock.oxideId)?.formula}` : "未選択"}</span></div>
    {stock && <p className="stock-caption">上段のg値は{material}換算の必要量です。使用ストックの原料は{oxideById(stock.oxideId)?.formula}で、金属の物質量を基準に分取量を計算します。</p>}
    {plan.idealUl!==undefined && <dl className="stock-metrics">
      <div><dt>理論分取量</dt><dd>{pretty(plan.idealUl,3)} µL</dd></div>
      <div><dt>必要金属量</dt><dd>{pretty(requiredMol*1e6)} µmol</dd></div>
    </dl>}
    <label className="stock-field">使用ピペット
      <select aria-label={`セット ${setNumber} ${material} ピペット`} value={selection.pipette||"auto"} onChange={e=>setPipette(e.target.value)}>
        <option value="auto">容量範囲から自動選択</option>{PIPETTES.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
      </select>
    </label>
    {plan.error ? <p className="stock-warning" role="alert">{plan.error}</p> : <>
      <div className="stock-volume-control">
        <label>分取体積（µL）<input aria-label={`セット ${setNumber} ${material} 分取体積`} type="number" min={requiredMol===0?0:plan.pipette?.min} max={plan.pipette?.max} step={plan.pipette?.step||1} value={draft?.value??plan.settingUl} onChange={e=>setVolume(e.target.value)}/></label>
        <button type="button" className="secondary-button" onClick={()=>setVolume(String(plan.settingUl))}>設定値を使う</button>
      </div>
      <p className="stock-caption">使用機器：{plan.pipette?.name||"分取不要"}。理論値を機器の刻みに丸めた設定値：{pretty(plan.settingUl)} µL。体積は実際に分取した値へ変更できます。</p>
      {line.invalid ? <p className="stock-warning">容量範囲・設定刻みに合う体積を入力してください。</p> : <p className="stock-delivered">添加金属量 {pretty(actualMol*1e6)} µmol · 目標との差 {pretty(requiredMol ? (actualMol/requiredMol-1)*100 : 0,4)}%</p>}
      <details className="stock-details"><summary>分取量の計算過程</summary>
        <p>金属濃度 = {pretty(concentration(stock)*1000)} mmol/L</p>
        <p>{pretty(requiredMol*1e6)} µmol ÷ {pretty(concentration(stock)*1000)} mmol/L × 1000 = {pretty(plan.idealUl,3)} µL</p>
        <p>設定値 {pretty(plan.settingUl)} µLでの目標との差：{pretty(plan.errorPercent,4)}%</p>
      </details>
      <button type="button" className="primary-button stock-save-use" disabled={line.invalid||budget.over||budget.unresolved||!ready||Boolean(storageError)||requiredMol===0} onClick={confirm}>添加完了を履歴に保存</button>
      {latest && <p className="stock-caption">同じ条件の保存記録：{new Date(latest.at).toLocaleString("ja-JP")}</p>}
      {notice && <p role="status" className="stock-success">{notice}</p>}
    </>}
  </div>;
}

export function StockBudget({budget}) {
  const dispensing=acidDispensing(budget.remainingMl);
  return <div className={`stock-budget ${budget.over||budget.unresolved?"has-warning":""}`}>
    <div className="stock-dose-title"><h4>添加液量と追加硝酸</h4><span>液量管理（酸濃度は別途確認）</span></div>
    <dl className="stock-metrics">
      <div><dt>添加液量の上限</dt><dd>{pretty(budget.limitMl)} mL</dd></div>
      <div><dt>ストック合計</dt><dd>{budget.unresolved?"未確定":`${pretty(budget.usedMl)} mL`}</dd></div>
      <div><dt>追加硝酸（理論値）</dt><dd>{budget.unresolved?"未確定":`${pretty(budget.remainingMl)} mL`}</dd></div>
    </dl>
    {budget.over && <p className="stock-warning" role="alert">上限を{pretty(-budget.remainingMl)} mL超えています。濃いストックまたは粉末への切替が必要です。</p>}
    {budget.unresolved && <p className="stock-warning" role="alert">ストック・溶解状態・分取体積を確認してください。追加硝酸量と添加完了は確定できません。</p>}
    {!budget.over&&!budget.unresolved && <>
      {dispensing ? <p className="stock-caption">追加硝酸の設定例：{dispensing.parts.length ? dispensing.parts.map((p,i)=><React.Fragment key={i}>{i?" + ":""}{pretty(p.ul)} µL（{p.id==="micro"?"100–1000 µL機":"1–10 mL機"}）</React.Fragment>):"追加なし"}。添加液量の設定合計 {pretty(budget.usedMl+dispensing.totalMl)} mL（上限との差 {pretty(dispensing.differenceMl)} mL）。</p> : <p className="stock-warning">残り量は登録ピペットで設定できません。分取計画を見直してください。</p>}
      {dispensing && dispensing.differenceMl>1e-9 && <p className="stock-warning">硝酸の刻みへの丸めで上限を超えます。この設定例では実行せず、体積配分を調整してください。</p>}
    </>}
    <details className="stock-details"><summary>液量の計算条件</summary><p>上限 = 5 mL × 目標モル数 ÷ 0.004 mol。追加硝酸 = 上限 − 全ストックの分取体積合計。これは添加する液量の管理値で、混合後の実測体積や純HNO₃量ではありません。</p><p>希硝酸のストックを使うと、同じ液量でもHNO₃量・持ち込む水量が変わります。従来の濃硝酸レシピと同じ条件になるとはみなさず、使用する追加硝酸の濃度と全体の水量は実験レシピに従って確認してください。</p></details>
  </div>;
}

export function StockManager({acidTransfer}) {
  const {data,setData,ready,storageError,recover}=useStocks();
  const [draftForm,setForm]=React.useState(newForm);
  const form=resolveStockForm(draftForm);
  const [parentId,setParentId]=React.useState(null);
  const [message,setMessage]=React.useState("");
  const [problem,setProblem]=React.useState("");
  React.useEffect(()=>{
    if(!acidTransfer)return;
    setForm(old=>({...old,...acidTransfer,finalVolumeConfirmed:false}));
    setProblem("");setMessage("希硝酸の条件を登録フォームへ転記しました。使用する初期量を指定し、実際に調製した酸の条件を確認してください。台帳はまだ変更していません。");
  },[acidTransfer]);
  const [testId,setTestId]=React.useState("");
  const [testUl,setTestUl]=React.useState("100");
  const fileRef=React.useRef(null);
  const availableStocks=data.stocks.filter(s=>s.oxideId!=="Y2O3");
  const design=form.designMode==="target"?stockDesign(form):null;
  const target=targetDose({...form,name:form.name.trim()||"調製中"},form.designMol,form.designPercent);
  const formError=stockError(form) || design?.error || (form.designMode==="target"?target.error:"");
  const c=concentration(form),acid=acidInfo(form);
  const testStock=data.stocks.find(s=>s.id===testId);
  const importBackup=async event=>{
    const file=event.target.files?.[0];if(!file)return;
    try {
      if(file.size>10000000)throw new Error("JSONは10 MB以下にしてください。");
      const incoming=validateBackup(JSON.parse(await file.text()));
      if(data.stocks.length+incoming.stocks.length>500 || data.records.length+incoming.records.length>10000) throw new Error("読み込み後の件数が上限（ストック500件・履歴10000件）を超えます。");
      const incomingStocks=incoming.stocks.map(s=>({...s,id:uid(),importedFrom:s.id}));
      const incomingRecords=incoming.records.map(r=>({...r,id:uid(),importedFrom:r.id}));
      setData(old=>({...old,stocks:[...old.stocks,...incomingStocks],records:[...old.records,...incomingRecords]}));
      if(!ready)recover();
      setMessage(`ストック${incomingStocks.length}件・履歴${incomingRecords.length}件を追加しました。既存の台帳は保持しています。`);setProblem("");
    }catch(error){setProblem(error.message);}
    event.target.value="";
  };
  const save=event=>{
    event.preventDefault();setProblem("");setMessage("");
    if(formError){setProblem(formError);return;}
    const preparationProblem=preparationError(form);
    if(preparationProblem){setProblem(preparationProblem);return;}
    if(!STOCK_OXIDES.some(oxide=>oxide.id===form.oxideId)){setProblem("Y₂O₃は粉末秤量のみ対応しています。");return;}
    if(!ready||storageError){setProblem("保存先を確認してください。台帳を読み込めない場合はJSONバックアップを確認してください。");return;}
    if(data.stocks.length>=500){setProblem("ストックの登録上限は500件です。バックアップを保存して台帳を整理してください。");return;}
    const stock={...form,preparationPlan:preparationSummary(form),name:form.name.trim(),id:uid(),createdAt:new Date().toISOString(),parentId,archived:false};
    setData(old=>({...old,stocks:[...old.stocks,stock]}));
    setMessage(`${stock.name}を登録しました。`);setForm(newForm());setParentId(null);
  };
  return <section className="section-block stock-workspace" aria-labelledby="stock-title">
    <div className="section-heading"><div><h2 id="stock-title">ストック溶液</h2><p>酸化物を硝酸に溶解し、冷却後に定容した溶液を管理します。</p></div></div>
    <div className="stock-toolbar">
      <button type="button" className="secondary-button" onClick={()=>downloadFile("weighing-stocks.json",JSON.stringify({schema:1,stocks:data.stocks,records:data.records},null,2),"application/json")}>JSONバックアップ</button>
      <button type="button" className="secondary-button" onClick={()=>fileRef.current?.click()}>JSONを読み込む</button>
      <input type="file" accept=".json,application/json" ref={fileRef} hidden onChange={importBackup}/>
    </div>
    <p className="stock-caption">このブラウザ内に保存します。端末間の自動同期はありません。通常の入力リセットでは台帳・使用履歴を消しません。</p>
    {storageError&&<p className="stock-warning" role="alert">{storageError}</p>}
    {problem&&<p className="stock-warning" role="alert">{problem}</p>}
    {message&&<p className="stock-success" role="status">{message}</p>}
    <form onSubmit={save} className="stock-create">
      <h3>{parentId?"新しい版として登録":"新しいストックを登録"}</h3>
      <StockPreparationForm form={form} setForm={setForm} transferNotice={acidTransfer}/>
      {!formError && <div className="stock-preview">
        <dl className="stock-metrics"><div><dt>{oxideById(form.oxideId).element}として</dt><dd>{pretty(c*1000)} mmol/L</dd></div><div><dt>{oxideById(form.oxideId).formula}換算</dt><dd>{pretty(Number(form.massG)*(form.purity?Number(form.purity)/100:1)*1000/Number(form.finalMl))} mg/mL</dd></div></dl>
        <details className="stock-details"><summary>濃度・硝酸理論量の計算過程</summary>
          <p>{pretty(Number(form.massG))} g × {form.purity?`${form.purity}% ÷ 100`:"1（純度補正なし）"} ÷ {pretty(stockMolarMass(form))} g/mol × 金属原子数{oxideById(form.oxideId).metalAtoms} ÷ ({form.finalMl} mL ÷ 1000) = {pretty(c)} mol/L（金属基準）</p>
          <p>{acid.theoretical!==null ? `M₂O₃ + 6HNO₃ → 2M(NO₃)₃ + 3H₂Oの形式的な理論量：${pretty(acid.theoretical*1000)} mmol HNO₃。` : "この酸化物の硝酸理論量は未設定です。M₂O₃の反応式を流用しません。"}</p>
          <p>{acid.range ? `溶解時に投入したHNO₃：${pretty(acid.range[0]*1000)}–${pretty(acid.range[1]*1000)} mmol。` : "投入HNO₃量の換算には硝酸投入量・濃度、必要な場合は密度を入力してください。"}</p>
          {acid.range&&acid.theoretical!==null&&<p>理論量に対する倍率：{pretty(acid.range[0]/acid.theoretical,3)}–{pretty(acid.range[1]/acid.theoretical,3)}倍。酸不足でも溶解可能性を自動判定しません。</p>}
          <p>計算値は全量溶解・定量移送を前提とします。実際の溶解条件、沈殿の有無、保存安定性は別途確認してください。</p>
        </details>
      </div>}
      <button className="primary-button" type="submit" disabled={!ready||Boolean(storageError)}>ストックを登録</button>
      {parentId&&<button type="button" className="text-button" onClick={()=>{setForm(newForm());setParentId(null);}}>編集を取り消す</button>}
    </form>
    <div className="stock-ledger"><h3>登録したストック <span className="stock-count">{availableStocks.length}</span></h3>
      {!availableStocks.length&&<p className="stock-empty">まだストックがありません。実秤量値と最終定容体積から登録してください。</p>}
      {availableStocks.map(s=><article key={s.id} className={`stock-card ${s.archived?"is-archived":""}`}>
        <div className="stock-dose-title"><h4>{s.name}</h4><span>{oxideById(s.oxideId).formula}</span></div>
        <p className="stock-card-concentration">{pretty(concentration(s)*1000)} <small>mmol/L（金属基準）</small></p>
        <p className="stock-caption">{s.massG} g → {s.finalMl} mL · {s.date||"日付未登録"} · {s.purity?`酸化物含量${s.purity}%`:"純度補正なし"}</p>
        {s.preparationPlan&&<p className="stock-caption">登録時の初期硝酸投入計画：{s.preparationPlan.initialMl===null||s.preparationPlan.initialMl==null?"未確定":`${pretty(s.preparationPlan.initialMl)} mL（${s.preparationPlan.acidSource==="factor"?"指定倍率から算出":"ユーザー指定"}）`}。実際の投入記録とは別に保持します。</p>}
        <p className={s.status==="clear"?"stock-success":"stock-warning"}>{s.archived?"使用停止 · ":""}{s.status==="clear"?"全量溶解・残渣なしを確認":s.status==="precipitate"?"白濁・沈殿・残渣あり":"溶解状態未確認"}</p>
        <details className="stock-details"><summary>調製記録を表示</summary><p>ロット：{s.lot||"—"}／容器：{s.container||"—"}／調製者：{s.operator||"—"}</p><p>酸化物：{s.manufacturer||"メーカー未記録"}／{s.productCode||"品番未記録"}／表示純度 {s.reportedPurity?`${s.reportedPurity}%（記録用）`:"未確認"}／計算モル質量 {pretty(stockMolarMass(s))} g/mol</p><p>溶解・定容用：{s.acidName||"60–61%硝酸（従来記録）"} · 溶解時投入 {s.acidAmount||"未記録"} {s.acidAmount?s.acidUnit:""} · 濃度 {s.acidMode==="weight"?`${s.acidPercent} w/w%`:s.acidMode==="molar"?`${s.acidMolarity} mol/L`:"60–61 w/w%"} · 密度 {s.acidDensity||"未記録"} g/mL</p>{s.designMode==="target"&&<p>設計条件：{s.designMol} mol合成、{oxideById(s.oxideId).element} {s.designPercent} mol%／分取 {s.designAliquotMl} mL。</p>}<p className="stock-notes">{s.notes||"メモなし"}</p><p>台帳ID：{s.id}</p></details>
        <div className="stock-toolbar"><button type="button" className="text-button" onClick={()=>{setForm(revisionForm(s));setParentId(s.id);setMessage("上のフォームで変更し、新しい版として登録してください。旧版と使用履歴は保持します。");}}>複製・新しい版を作成</button><button type="button" className="text-button" onClick={()=>setData(old=>({...old,stocks:old.stocks.map(item=>item.id===s.id?{...item,archived:!item.archived}:item)}))}>{s.archived?"使用を再開":"使用を停止"}</button></div>
      </article>)}
    </div>
    <section className="stock-aliquot-test"><h3>分取体積から添加量を確認</h3><div className="stock-form-grid"><label className="stock-field">ストック<select value={testId} onChange={e=>setTestId(e.target.value)}><option value="">選択してください</option>{availableStocks.filter(s=>!s.archived).map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label><label className="stock-field">分取体積（µL）<input type="number" min="0" step="any" value={testUl} onChange={e=>setTestUl(e.target.value)}/></label></div>
      {testStock && Number.isFinite(Number(testUl)) && Number(testUl)>=0 && <p className="stock-delivered">{oxideById(testStock.oxideId).element}として {pretty(concentration(testStock)*Number(testUl))} µmol · {oxideById(testStock.oxideId).formula}換算 {pretty(concentration(testStock)*Number(testUl)/1e6/oxideById(testStock.oxideId).metalAtoms*stockMolarMass(testStock)*1000)} mg{testStock.status!=="clear"?"（溶解未確認の参考値）":""}</p>}
    </section>
    <section className="stock-history"><h3>使用履歴 <span className="stock-count">{data.records.length}</span></h3>
      <button type="button" className="secondary-button" disabled={!data.records.length} onClick={()=>{const rows=[["日時","ストック","酸化物","セット","目標mol","必要金属mol","分取µL","添加金属mol","濃度mol/L","追加硝酸mL"],...data.records.map(r=>[r.at,r.stock.name,oxideById(r.stock.oxideId).formula,r.setNumber,r.targetMol,r.requiredMol,r.actualUl,r.actualMol,concentration(r.stock),r.additionalAcidMl])];downloadFile("stock-usage.csv","\uFEFF"+rows.map(row=>row.map(csvCell).join(",")).join("\r\n"),"text/csv;charset=utf-8");}}>履歴CSV出力</button>
      {!data.records.length&&<p className="stock-empty">結果画面の「添加完了を履歴に保存」で記録が追加されます。</p>}
      {[...data.records].reverse().slice(0,30).map(r=><div key={r.id} className="stock-history-row"><strong>{r.stock.name} · セット{r.setNumber}</strong><span>{pretty(r.actualUl)} µL · {new Date(r.at).toLocaleString("ja-JP")}</span><small>使用時濃度 {pretty(concentration(r.stock)*1000)} mmol/L · 目標 {pretty(r.targetMol)} mol</small></div>)}
      {data.records.length>30&&<p className="stock-caption">最新30件を表示しています。全履歴はJSON・CSVに含まれます。</p>}
    </section>
    <p className="stock-caption">天秤：SHIMADZU AY220、最大220 g・最小表示0.1 mg。最小表示は精度を保証する最低秤量量ではありません。ストックはScとLa〜Lu（Pmを除く）、Biを登録できます。Y₂O₃は粉末秤量のみ対応します。Ce・Pr・Tbは試薬の化学式を確認してください。</p>
  </section>;
}

export { liquidBudget };
