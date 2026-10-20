// Stock concentrations are mol of metal / L, never mol of oxide / L.
const elements = [
  ["Sc", 44.9559], ["Y", 88.9059], ["La", 138.9055], ["Ce", 140.116],
  ["Pr", 140.9077], ["Nd", 144.242], ["Sm", 150.36], ["Eu", 151.964],
  ["Gd", 157.25], ["Tb", 158.9254], ["Dy", 162.5], ["Ho", 164.9303],
  ["Er", 167.259], ["Tm", 168.9342], ["Yb", 173.045], ["Lu", 174.9668], ["Bi", 208.9804],
];
// Preserve existing molar masses for existing M2O3 calculations.
const existingMasses = { Y:225.8982, La:325.8092, Ce:328.2382, Pr:329.8082, Nd:336.4782,
  Sm:348.7182, Eu:351.926, Gd:362.4982, Tb:365.8678, Dy:372.9982,
  Ho:377.8586, Er:382.5176, Tm:385.8672, Yb:394.0782, Bi:465.959 };
export const OXIDES = elements.map(([element, atomicMass]) => ({
  id:`${element}2O3`, element, formula:`${element}₂O₃`, metalAtoms:2,
  molarMass:existingMasses[element] || 2*atomicMass + 3*15.9994,
  acidCoefficient:6,
})).concat([
  {id:"CeO2",element:"Ce",formula:"CeO₂",metalAtoms:1,molarMass:172.1148,acidCoefficient:null},
  {id:"Pr6O11",element:"Pr",formula:"Pr₆O₁₁",metalAtoms:6,molarMass:1021.4396,acidCoefficient:null},
  {id:"Tb4O7",element:"Tb",formula:"Tb₄O₇",metalAtoms:4,molarMass:747.6974,acidCoefficient:null},
]);
// Keep Y2O3 metadata for reading historical backups, not for new stock use.
export const STOCK_OXIDES = OXIDES.filter(oxide => oxide.id !== "Y2O3");
export const PIPETTES = [
  {id:"micro",name:"100–1000 µL（1 µL刻み）",min:100,max:1000,step:1},
  {id:"large",name:"1–10 mL（0.01 mL刻み）",min:1000,max:10000,step:10},
];
export const oxideById = id => OXIDES.find(x=>x.id===id);
export const stockMolarMass = stock => stock.productMolarMass!=="" && stock.productMolarMass!=null ? Number(stock.productMolarMass) : oxideById(stock.oxideId)?.molarMass;
// Minimum-count design: keep the initial acid fixed; round only the proposed mass up.
// The final volume is a concentration target, not a prediction of the liquid's physical volume.
export function minimumStockPlan(form) {
  const count=Number(form.batchCount), aliquot=Number(form.designAliquotMl);
  if(!Number.isInteger(count)||count<1||count>1000000) return {error:"分取回数は1〜1000000の整数で指定してください。"};
  const design=stockDesign({...form,finalMl:String(count*aliquot)});
  if(design.error) return {error:design.error};
  if((form.initialAcidMode||"volume")!=="volume") return {error:"指定回数以上を確保する方式では、初期硝酸量をmLで指定してください。"};
  const recordedMl=form.acidUnit==="g"?Number(form.acidAmount)/Number(form.acidDensity):Number(form.acidAmount);
  const initialMl=Number(form.initialAcidMl??(recordedMl>0&&Number.isFinite(recordedMl)?recordedMl:""));
  if(!Number.isFinite(initialMl)||initialMl<=0) return {error:"手順1で、固定する初期硝酸量（mL）を入力してください。"};
  const mlPerGram=count*aliquot/design.massG;
  const acidTicks=initialMl/mlPerGram*10000;
  const countTicks=design.massG*10000;
  // Equality with the initial acid volume is intentionally excluded; leave room for make-up.
  const ticks=Math.max(Math.ceil(countTicks-1e-9),Math.floor(acidTicks)+1);
  if(!Number.isSafeInteger(ticks)||ticks<=0||!Number.isFinite(mlPerGram)||mlPerGram<=0) return {error:"計算可能な範囲を超えています。桁数を確認してください。"};
  const recommendedMassG=ticks/10000;
  const hasActual=form.massG!==""&&form.massG!=null;
  const massG=hasActual?Number(form.massG):recommendedMassG;
  const finalMl=massG*mlPerGram;
  if(!Number.isFinite(massG)||massG<=0||!Number.isFinite(finalMl)||finalMl<=0) return {error:"実秤量値は0より大きい有限の値を入力してください。"};
  const fullCount=Math.floor(finalMl/aliquot+1e-9);
  if(!Number.isSafeInteger(fullCount)) return {error:"分取回数が計算可能な範囲を超えています。"};
  const remainderMl=Math.max(0,finalMl-fullCount*aliquot);
  const warning=finalMl<=initialMl?"実秤量値から求めた最終体積が初期硝酸量以下です。硝酸の追加だけでは定容できません。質量・調製計画を確認してください。":fullCount<count?"実秤量値では指定回数を確保できません。質量・調製計画を確認してください。":"";
  return {error:"",warning,initialMl,requiredMassG:design.massG,recommendedMassG,massG,finalMl,mlPerGram,fullCount,remainderMl,requestedCount:count,design};
}
export function resolveStockForm(form) {
  if(form.volumeMode==="minimum"&&form.designMode==="target") {
    const plan=minimumStockPlan(form);
    return {...form,finalMl:plan.error?"":String(plan.finalMl)};
  }
  if(form.volumeMode!=="batch" || form.designMode!=="target") return form;
  const count=Number(form.batchCount), aliquot=Number(form.designAliquotMl);
  const finalMl=Number.isInteger(count)&&count>=1&&count<=1000000&&Number.isFinite(aliquot)&&aliquot>0 ? count*aliquot : NaN;
  return {...form,finalMl:Number.isFinite(finalMl)&&finalMl>0?String(finalMl):""};
}
export function preparationError(form) {
  if(form.volumeMode==="minimum"&&form.designMode==="target") {
    const plan=minimumStockPlan(form);
    if(plan.error||plan.warning) return plan.error||plan.warning;
    if(!form.finalVolumeConfirmed) return "冷却後、実秤量値から計算した目標体積に定容したことを確認してください。";
  }
  if(form.volumeMode==="batch"&&form.designMode==="target") {
    const count=Number(form.batchCount);
    if(!Number.isInteger(count)||count<1||count>1000000) return "作る回数は1〜1000000の整数で指定してください。";
    if(!form.finalVolumeConfirmed) return "冷却後、表示された目標体積に定容したことを確認してください。計算値は実測体積ではありません。";
  }
  return "";
}
export const pretty = (n, places=6) => {
  if (!Number.isFinite(Number(n))) return "—";
  if (Number(n)!==0 && Math.abs(Number(n)) < 10**-places) return Number(n).toExponential(3);
  return Number(Number(n).toFixed(places)).toString();
};
export function stockError(stock) {
  if (!stock || !oxideById(stock.oxideId)) return "酸化物を選択してください。";
  if (typeof stock.name!=="string" || !stock.name.trim() || stock.name.length>100) return "ストック名を入力してください（100文字以内）。";
  for (const [key,label] of [["massG","酸化物の実秤量値"],["finalMl","最終定容体積"]]) {
    if (!Number.isFinite(Number(stock[key])) || Number(stock[key])<=0) return `${label}は0より大きい値を入力してください。`;
  }
  if (stock.purity!=="" && stock.purity!=null && (!Number.isFinite(Number(stock.purity)) || Number(stock.purity)<=0 || Number(stock.purity)>100)) return "酸化物含量は0超〜100%で入力してください。";
  if (!Number.isFinite(Number(stock.massG)/Number(stock.finalMl)) || Number(stock.massG)/Number(stock.finalMl)===0) return "質量・体積の桁数を確認してください。";
  if (!["unknown","clear","precipitate"].includes(stock.status)) return "溶解状態を選択してください。";
  const optional = ["acidAmount","acidMolarity","acidDensity","acidMolarMass","productMolarMass"];
  for (const key of optional) if (stock[key]!=="" && stock[key]!=null && (!Number.isFinite(Number(stock[key])) || Number(stock[key])<=0)) return "投入量・濃度・密度・モル質量は0より大きい数値にしてください。";
  if (!["ml","g"].includes(stock.acidUnit)) return "硝酸投入量の単位が不正です。";
  if (!["w60","molar","weight"].includes(stock.acidMode)) return "硝酸濃度の指定が不正です。";
  if(stock.acidMode==="weight" && (!Number.isFinite(Number(stock.acidPercent)) || Number(stock.acidPercent)<=0 || Number(stock.acidPercent)>100)) return "硝酸の質量濃度は0超〜100%で入力してください。";
  if(stock.reportedPurity!=="" && stock.reportedPurity!=null && (!Number.isFinite(Number(stock.reportedPurity)) || Number(stock.reportedPurity)<=0 || Number(stock.reportedPurity)>100)) return "メーカー表示純度は0超〜100%で入力してください。";
  return "";
}
export function concentration(stock) {
  if (stockError(stock)) return NaN;
  const oxide=oxideById(stock.oxideId);
  const purity=stock.purity==="" || stock.purity==null ? 1 : Number(stock.purity)/100;
  return Number(stock.massG)*purity/stockMolarMass(stock)*oxide.metalAtoms/(Number(stock.finalMl)/1000);
}
export function acidInfo(stock) {
  const oxide=oxideById(stock.oxideId);
  const purity=stock.purity==="" || stock.purity==null ? 1 : Number(stock.purity)/100;
  const theoretical=oxide?.acidCoefficient && Number(stock.massG)>0 ? Number(stock.massG)*purity/stockMolarMass(stock)*oxide.acidCoefficient : null;
  let range=null;
  const amount=Number(stock.acidAmount), density=Number(stock.acidDensity);
  if (amount>0 && stock.acidMode==="molar" && Number(stock.acidMolarity)>0) {
    const ml=stock.acidUnit==="ml" ? amount : density>0 ? amount/density : null;
    if(ml!==null) range=[Number(stock.acidMolarity)*ml/1000,Number(stock.acidMolarity)*ml/1000];
  } else if (amount>0 && stock.acidMode==="weight" && Number(stock.acidPercent)>0 && Number(stock.acidPercent)<=100) {
    const grams=stock.acidUnit==="g" ? amount : density>0 ? amount*density : null;
    const mw=Number(stock.acidMolarMass)||63.0128;
    if(grams!==null) range=[grams*Number(stock.acidPercent)/100/mw,grams*Number(stock.acidPercent)/100/mw];
  } else if (amount>0 && stock.acidMode==="w60") {
    const grams=stock.acidUnit==="g" ? amount : density>0 ? amount*density : null;
    if(grams!==null) range=[grams*0.60/63.0128,grams*0.61/63.0128];
  }
  return {theoretical,range};
}
export function stockDesign(form) {
  const oxide=oxideById(form.oxideId);
  const n=Number(form.designMol), percent=Number(form.designPercent), aliquot=Number(form.designAliquotMl), finalMl=Number(form.finalMl);
  const assay=form.purity==="" || form.purity==null ? 1 : Number(form.purity)/100;
  if(!oxide || oxide.id==="Y2O3") return {error:"ストックに使用する酸化物を選択してください。"};
  if(![n,percent,aliquot,finalMl,stockMolarMass(form),assay].every(v=>Number.isFinite(v)&&v>0) || percent>100 || assay>1) return {error:"合成量・目標mol%・分取量・最終定容体積を0より大きい値で入力してください（mol%・含量は100以下）。"};
  const limitMl=5*n/.004;
  const requiredMol=n*percent/100;
  const c=requiredMol/(aliquot/1000);
  const massG=c*(finalMl/1000)/oxide.metalAtoms*stockMolarMass(form)/assay;
  if(![limitMl,requiredMol,c,massG].every(v=>Number.isFinite(v)&&v>0)) return {error:"数値が計算可能な範囲を超えています。桁数を確認してください。"};
  const pipette=PIPETTES.find(p=>validVolume(aliquot*1000,p));
  const error=aliquot>limitMl+1e-9 ? `分取量が添加液量の上限${pretty(limitMl)} mLを超えています。` : !pipette ? "分取量は100–1000 µL（1 µL刻み）または1–10 mL（0.01 mL刻み）で指定してください。" : "";
  return {error,massG,concentration:c,requiredMol,limitMl,pipette};
}
export function balanceMass(massG) {
  if(!Number.isFinite(Number(massG)) || Number(massG)<=0) return NaN;
  return Math.round(Number(massG)*10000)/10000;
}
export function preparationSummary(input) {
  const form=resolveStockForm(input), design=stockDesign(form);
  const minimum=form.volumeMode==="minimum"&&form.designMode==="target"?minimumStockPlan(form):null;
  if(minimum?.error) return {error:minimum.error,ready:false};
  const hasActual=form.massG!=="" && form.massG!=null;
  const massG=hasActual?Number(form.massG):minimum?minimum.recommendedMassG:balanceMass(design.massG);
  const finalMl=Number(form.finalMl);
  if(!Number.isFinite(massG)||massG<=0||!Number.isFinite(finalMl)||finalMl<=0) return {error:"秤量値・調製条件を確認してください。",ready:false};
  const stock={...form,name:form.name?.trim()||"調製計画",massG:String(massG)};
  if(stockError(stock)) return {error:"試薬特性・秤量値の入力を確認してください。",ready:false};
  const mode=form.initialAcidMode||"volume";
  if(!["volume","factor"].includes(mode)) return {error:"初期硝酸量の指定方法を確認してください。",ready:false};
  const factorPlan=mode==="factor"?acidRequirement(stock,form.acidMultiplier):null;
  const recordedMl=form.acidUnit==="g"?Number(form.acidAmount)/Number(form.acidDensity):Number(form.acidAmount);
  const entered=form.initialAcidMl??(Number.isFinite(recordedMl)&&recordedMl>0?String(recordedMl):"");
  const initialMl=mode==="factor"?(factorPlan.error?NaN:factorPlan.ml):Number(entered);
  const acidError=mode==="factor"?factorPlan.error||"":!Number.isFinite(initialMl)||initialMl<=0?"初期硝酸量が未確定です。確認済みの量を指定してください。":"";
  const theoretical=acidRequirement(stock);
  let warning=minimum?.warning||"";
  if(!acidError&&initialMl>=finalMl) warning="初期投入量が仕上がりの目標体積以上です。調製条件・体積設計を確認してください。";
  else if(!acidError&&!theoretical.error&&initialMl<theoretical.ml-1e-12) warning="指定した初期硝酸量は反応式上の理論必要量を下回ります。条件を確認してください。";
  return {massG,finalMl,initialMl:Number.isFinite(initialMl)&&initialMl>0?initialMl:null,massBasis:hasActual?"actual":"rounded",acidSource:mode,acidError,warning,ready:!acidError&&!warning,...(minimum?{fullCount:minimum.fullCount,remainderMl:minimum.remainderMl,requestedCount:minimum.requestedCount}:{})};
}
// Formal stoichiometry only. No empirical dissolution excess is inferred.
export function acidRequirement(stock, multiplier=1) {
  const theoretical=acidInfo(stock).theoretical, factor=Number(multiplier);
  if(theoretical===null || !Number.isFinite(theoretical) || theoretical<=0) return {error:"この酸化物・秤量値では硝酸の理論必要量を計算できません。"};
  if(!Number.isFinite(factor)||factor<1) return {error:"投入計画の倍率は、確認済みの条件に基づき1以上で指定してください。"};
  // Use one mL to retain the legacy 60–61% range and avoid duplicating conversions.
  const perMl=acidInfo({...stock,acidAmount:"1",acidUnit:"ml"}).range;
  if(!perMl || !perMl.every(v=>Number.isFinite(v)&&v>0)) return {error:"硝酸濃度と、体積換算に必要な密度を確認してください。"};
  const mol=theoretical*factor;
  const ml=mol/perMl[0], minMl=mol/perMl[1];
  const density=Number(stock.acidDensity);
  if(!Number.isFinite(ml)||ml<=0) return {error:"計算可能な範囲を超えています。"};
  return {theoreticalMol:theoretical,mol,ml,minMl,grams:density>0?ml*density:null,factor};
}
export function aliquotRepeats(totalMl, baseMl) {
  const total=Number(totalMl)*1000, base=Number(baseMl)*1000;
  const pipette=PIPETTES.find(p=>validVolume(base,p));
  if(!Number.isFinite(total)||total<=0||!pipette) return {error:"基準分取量をピペットの容量・刻みに合わせて指定してください。"};
  const count=Math.floor((total+1e-7)/base);
  const remainderUl=Number((total-count*base).toFixed(7));
  const remainderPipe=remainderUl>1e-7?PIPETTES.find(p=>validVolume(remainderUl,p)):null;
  return {count,remainderMl:Math.max(0,remainderUl)/1000,ratio:total/base,pipette,feasible:remainderUl<=1e-7||Boolean(remainderPipe),remainderPipe};
}
// Includes the unrounded ideal volume: rounding must never conceal a budget overrun.
export function targetDose(stock, targetMol, percent) {
  const n=Number(targetMol), x=Number(percent), c=concentration(stock);
  if(!Number.isFinite(c)||c<=0||!Number.isFinite(n)||n<=0||!Number.isFinite(x)||x<=0||x>100) return {error:"濃度・合成量・目標mol%を確認してください。"};
  const requiredMol=n*x/100, idealMl=requiredMol/c*1000, limitMl=5*n/.004;
  const plan=dosePlan({...stock,status:"clear",archived:false},requiredMol);
  const settingMl=plan.settingUl/1000;
  const over=idealMl>limitMl+1e-9 || settingMl>limitMl+1e-9;
  return {idealMl,limitMl,settingMl,over,actualPercent:c*settingMl/1000/n*100,additionalMl:limitMl-settingMl,error:over?`上限${pretty(limitMl)} mLを超えます。`:plan.error||""};
}
export function dosePlan(stock, requiredMol, pipetteId="auto") {
  if (!Number.isFinite(requiredMol)||requiredMol<0) return {error:"必要物質量が不正です。"};
  if (!stock || stockError(stock)) return {error:"使用するストックを登録・選択してください。"};
  if (stock.oxideId === "Y2O3") return {error:"Y₂O₃は粉末秤量のみ対応しています。"};
  const c=concentration(stock);
  const idealUl=requiredMol/c*1e6;
  if(requiredMol===0) return {idealUl:0,settingUl:0,deliveredMol:0,errorPercent:0,pipette:null,concentration:c};
  if(stock.archived) return {error:"このストックは使用停止中です。"};
  if(stock.status!=="clear") return {error:stock.status==="precipitate" ? "白濁・沈殿あり：均一な濃度を前提とする分取は確定できません。" : "全量溶解・残渣なしの確認が必要です。"};
  const pipette=pipetteId==="auto" ? PIPETTES.find(p=>idealUl>=p.min-1e-9&&idealUl<=p.max+1e-9) : PIPETTES.find(p=>p.id===pipetteId);
  if(!pipette || idealUl<pipette.min-1e-9 || idealUl>pipette.max+1e-9) return {idealUl,concentration:c,error:idealUl<100 ? "100 µL未満です。希釈ストックまたは別濃度の登録を検討してください。" : "選択したピペットの範囲外です。濃度またはピペットを変更してください。"};
  const settingUl=Math.round(idealUl/pipette.step)*pipette.step;
  const deliveredMol=c*settingUl/1e6;
  return {idealUl,settingUl,deliveredMol,errorPercent:(deliveredMol/requiredMol-1)*100,pipette,concentration:c};
}
export function validVolume(ul,pipette) {
  return Number.isFinite(ul) && ((!pipette && ul===0) || (pipette && ul>=pipette.min && ul<=pipette.max && Math.abs(ul/pipette.step-Math.round(ul/pipette.step))<1e-7));
}
export function liquidBudget(targetMol,volumesUl) {
  const limitMl=5*Number(targetMol)/0.004;
  const unresolved=volumesUl.some(v=>!Number.isFinite(v)||v<0);
  const usedMl=volumesUl.filter(Number.isFinite).reduce((a,b)=>a+b,0)/1000;
  const remainingMl=limitMl-usedMl;
  return {limitMl,usedMl,remainingMl,unresolved,over:remainingMl < -1e-9};
}
export function acidDispensing(ml) {
  if(ml<0 || !Number.isFinite(ml)) return null;
  if(Math.abs(ml)<1e-9) return {parts:[],totalMl:0,differenceMl:0};
  let remaining=ml*1000;
  const parts=[];
  // Larger acid additions can be dispensed in multiple <=10 mL portions.
  while(remaining>10000 && parts.length<100) {
    const portion=remaining-10000<100 ? 9900 : 10000;
    parts.push({ul:portion,id:"large"});remaining-=portion;
  }
  if(remaining>10000) return null;
  if(remaining>0 && remaining<100-1e-7) return null;
  if(remaining>1000+1e-7 && Math.abs(remaining/10-Math.round(remaining/10))>1e-7) {
    // Leave >=100 uL for the small pipette to retain 1 uL resolution.
    const largePart=Math.floor((remaining-100+1e-7)/10)*10;
    if(largePart>=1000) {parts.push({ul:largePart,id:"large"});remaining-=largePart;}
    else {parts.push({ul:500,id:"micro"});remaining-=500;}
  }
  if(remaining>1e-7) {
    const p=remaining<=1000+1e-7 ? PIPETTES[0] : PIPETTES[1];
    // Never propose an acid setting that takes the total above the upper limit.
    parts.push({ul:Math.floor((remaining+1e-7)/p.step)*p.step,id:p.id});
  }
  const totalMl=parts.reduce((sum,p)=>sum+p.ul,0)/1000;
  return {parts,totalMl,differenceMl:Number((totalMl-ml).toFixed(9))};
}
export function csvCell(value) {
  const str=String(value??"");
  const safe=/^[=+\-@\t\r]/.test(str)?`'${str}`:str;
  return `"${safe.replaceAll('"','""')}"`;
}
export function downloadFile(name,content,type) {
  const url=URL.createObjectURL(new Blob([content],{type}));
  const a=document.createElement("a");a.href=url;a.download=name;a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
export function validateBackup(data) {
  if(!data || data.schema!==1 || !Array.isArray(data.stocks)||!Array.isArray(data.records)||data.stocks.length>500||data.records.length>10000) throw new Error("対応するストック台帳JSONではありません。");
  const ids=new Set();
  for(const stock of data.stocks) {
    if(typeof stock.id!=="string"||stock.id.length>100||ids.has(stock.id)||stockError(stock)) throw new Error("台帳の酸化物・数値・IDに不正な値があります。");
    ids.add(stock.id);
    for(const key of ["notes","date","lot","container","operator","manufacturer","productCode","productSource","productGrade","productCas","productShape","productSpecificGravity","productMeltingPoint","catalogMolarMass","labelMolarMass","acidName","acidProduct"]) if(stock[key]!=null && (typeof stock[key]!=="string"||stock[key].length>4000)) throw new Error("台帳の記録項目が不正です。");
  }
  for(const record of data.records) {
    if(!record || typeof record.id!=="string" || record.id.length>100 || !record.stock || stockError(record.stock) || !Number.isFinite(record.actualUl)||record.actualUl<0 || !Number.isFinite(record.requiredMol)||record.requiredMol<0 || !Number.isFinite(record.targetMol)||record.targetMol<=0 || typeof record.material!=="string"||record.material.length>100 || typeof record.at!=="string" || record.at.length>100) throw new Error("使用履歴の形式が不正です。");
  }
  return data;
}
