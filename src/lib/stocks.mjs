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
export const PIPETTES = [
  {id:"micro",name:"100–1000 µL（1 µL刻み）",min:100,max:1000,step:1},
  {id:"large",name:"1–10 mL（0.01 mL刻み）",min:1000,max:10000,step:10},
];
export const oxideById = id => OXIDES.find(x=>x.id===id);
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
  const optional = ["acidAmount","acidMolarity","acidDensity"];
  for (const key of optional) if (stock[key]!=="" && stock[key]!=null && (!Number.isFinite(Number(stock[key])) || Number(stock[key])<=0)) return "硝酸の入力値は0より大きい数値にしてください。";
  if (!["ml","g"].includes(stock.acidUnit)) return "硝酸投入量の単位が不正です。";
  if (!["w60","molar"].includes(stock.acidMode)) return "硝酸濃度の指定が不正です。";
  return "";
}
export function concentration(stock) {
  if (stockError(stock)) return NaN;
  const oxide=oxideById(stock.oxideId);
  const purity=stock.purity==="" || stock.purity==null ? 1 : Number(stock.purity)/100;
  return Number(stock.massG)*purity/oxide.molarMass*oxide.metalAtoms/(Number(stock.finalMl)/1000);
}
export function acidInfo(stock) {
  const oxide=oxideById(stock.oxideId);
  const purity=stock.purity==="" || stock.purity==null ? 1 : Number(stock.purity)/100;
  const theoretical=oxide?.acidCoefficient ? Number(stock.massG)*purity/oxide.molarMass*oxide.acidCoefficient : null;
  let range=null;
  const amount=Number(stock.acidAmount), density=Number(stock.acidDensity);
  if (amount>0 && stock.acidMode==="molar" && Number(stock.acidMolarity)>0) {
    const ml=stock.acidUnit==="ml" ? amount : density>0 ? amount/density : null;
    if(ml!==null) range=[Number(stock.acidMolarity)*ml/1000,Number(stock.acidMolarity)*ml/1000];
  } else if (amount>0 && stock.acidMode==="w60") {
    const grams=stock.acidUnit==="g" ? amount : density>0 ? amount*density : null;
    if(grams!==null) range=[grams*0.60/63.0128,grams*0.61/63.0128];
  }
  return {theoretical,range};
}
export function dosePlan(stock, requiredMol, pipetteId="auto") {
  if (!Number.isFinite(requiredMol)||requiredMol<0) return {error:"必要物質量が不正です。"};
  if (!stock || stockError(stock)) return {error:"使用するストックを登録・選択してください。"};
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
    for(const key of ["notes","date","lot","container","operator"]) if(stock[key]!=null && (typeof stock[key]!=="string"||stock[key].length>4000)) throw new Error("台帳の記録項目が不正です。");
  }
  for(const record of data.records) {
    if(!record || typeof record.id!=="string" || record.id.length>100 || !record.stock || stockError(record.stock) || !Number.isFinite(record.actualUl)||record.actualUl<0 || !Number.isFinite(record.requiredMol)||record.requiredMol<0 || !Number.isFinite(record.targetMol)||record.targetMol<=0 || typeof record.material!=="string"||record.material.length>100 || typeof record.at!=="string" || record.at.length>100) throw new Error("使用履歴の形式が不正です。");
  }
  return data;
}
