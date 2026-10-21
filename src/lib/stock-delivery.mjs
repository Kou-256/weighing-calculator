import { dosePlan, oxideById, validVolume } from "./stocks.mjs";

export const deliveryKey=(setNumber,material)=>`${setNumber}:${material}`;

// Legacy material-wide selections remain defaults until a set is edited.
export function getDelivery(data,material,setNumber) {
  return data.delivery?.[deliveryKey(setNumber,material)] ?? data.delivery?.[material] ?? {};
}

export function updateDelivery(data,material,setNumber,patch) {
  return {...data,delivery:{...data.delivery,[deliveryKey(setNumber,material)]:{...getDelivery(data,material,setNumber),...patch}}};
}

export function stockLine(data,material,requiredMol,setNumber,targetMol,experiment={}) {
  if(material === "Y₂O₃") return null;
  const delivery=getDelivery(data,material,setNumber);
  if(delivery.mode!=="stock")return null;
  const stock=data.stocks.find(s=>s.id===delivery.stockId);
  const plan=dosePlan(stock,requiredMol,delivery.pipette||"auto");
  if(plan.idealUl/1000>5*Number(targetMol)/.004+1e-9) plan.error="理論分取量が添加液量の上限を超えています。濃いストックまたは粉末への切替が必要です。";
  if(stock && oxideById(stock.oxideId)?.element!==material.replace("₂O₃","")) plan.error="ストックの金属元素が試薬と一致しません。";
  const signature=JSON.stringify([stock?.id,stock?.massG,stock?.finalMl,stock?.purity,stock?.productMolarMass,requiredMol,Number(targetMol),plan.pipette?.id,experiment]);
  const key=deliveryKey(setNumber,material);
  const draft=data.drafts[key]?.signature===signature ? data.drafts[key] : null;
  const entered=draft?.value;
  const actualUl=entered!==undefined && entered!=="" ? Number(entered) : plan.settingUl;
  const invalid=Boolean(plan.error)||entered===""||!validVolume(actualUl,plan.pipette);
  return {material,requiredMol,stock,plan,signature,key,draft,actualUl,invalid,experiment};
}

export function setStockLines(data,masses,materials,setNumber,targetMol,experiment={}) {
  return Object.entries(masses).filter(([material])=>material!=="V₂O₅").map(([material,mass])=>stockLine(data,material,mass/materials[material]*2,setNumber,targetMol,experiment)).filter(Boolean);
}
