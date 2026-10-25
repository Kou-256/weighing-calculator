// Pure nitric acid + water only; not a free-acid model for dissolved metal stocks.
export function acidDilution(form) {
  const percent=Number(form.sourcePercent), density=Number(form.sourceDensity), mw=Number(form.molarMass);
  if(![percent,density,mw].every(n=>Number.isFinite(n)&&n>0)||percent>100) return {error:"原液の濃度（0超〜100 w/w%）・密度・モル質量を確認してください。"};
  const sourceMolarity=density*percent*10/mw;
  if(!Number.isFinite(sourceMolarity)||sourceMolarity<=0) return {error:"原液の条件が計算可能な範囲を超えています。"};
  if(form.mode==="mass") {
    const amount=Number(form.sourceAmount), targetPercent=Number(form.targetPercent), waterDensity=Number(form.waterDensity);
    if(![amount,targetPercent,waterDensity].every(n=>Number.isFinite(n)&&n>0)) return {error:"原液量・目標w/w%・純水の換算密度は0より大きい値を指定してください。"};
    if(!["ml","g"].includes(form.sourceUnit)) return {error:"原液量の単位を選択してください。"};
    if(targetPercent>percent) return {error:"原液より濃い硝酸は、純水による希釈では作れません。"};
    const sourceMass=form.sourceUnit==="g"?amount:amount*density;
    const sourceMl=sourceMass/density;
    const finalMass=sourceMass*percent/targetPercent;
    const waterMass=finalMass-sourceMass;
    const waterMlApprox=waterMass/waterDensity;
    if(![sourceMass,sourceMl,finalMass,waterMass,waterMlApprox].every(Number.isFinite)||sourceMass<=0||finalMass<sourceMass) return {error:"質量・体積が計算可能な範囲を超えています。"};
    return {error:"",mode:"mass",sourceMolarity,sourceMass,sourceMl,finalMass,waterMass,waterMlApprox,targetPercent,
      acidPatch:{acidProduct:"manual",acidName:`希硝酸 ${targetPercent} w/w%`,acidMode:"weight",acidPercent:String(targetPercent),acidDensity:"",acidMolarMass:String(mw),acidMolarity:"",acidUnit:"g"}};
  }
  if(form.mode==="molar") {
    const targetMolarity=Number(form.targetMolarity), finalMl=Number(form.finalMl);
    if(![targetMolarity,finalMl].every(n=>Number.isFinite(n)&&n>0)) return {error:"目標mol/L・冷却後の最終体積は0より大きい値を指定してください。"};
    if(targetMolarity>sourceMolarity) return {error:"原液より高いモル濃度は、純水による希釈では作れません。"};
    const sourceMl=targetMolarity*finalMl/sourceMolarity;
    const sourceMass=sourceMl*density;
    if(![sourceMl,sourceMass].every(n=>Number.isFinite(n)&&n>0)) return {error:"体積・質量が計算可能な範囲を超えています。"};
    return {error:"",mode:"molar",sourceMolarity,sourceMass,sourceMl,finalMl,targetMolarity,
      acidPatch:{acidProduct:"manual",acidName:`希硝酸 ${targetMolarity} mol/L`,acidMode:"molar",acidMolarity:String(targetMolarity),acidDensity:"",acidMolarMass:String(mw),acidPercent:"",acidUnit:"ml"}};
  }
  return {error:"希釈の計算方法を選択してください。"};
}
