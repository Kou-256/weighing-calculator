// Product-label values are starting values, not lot-specific certificates.
export const NITRIC_ACID = {
  id: "nacalai-24413-15", name: "ナカライテスク 硝酸(S.G.＝1.38)",
  code: "24413-15", formula: "HNO₃", cas: "7697-37-2",
  percent: "60", density: "1.38", molarMass: "63.01",
  source: "https://www.e-nacalai.jp/ec2/EC-srchdetl.cfm?jump=EC-srchdetl&syohin=2441315&syubetsu=3",
};
export const OXIDE_PRODUCTS = [
  {id:"kojundo-EUO01PB",oxideId:"Eu2O3",code:"EUO01PB",purity:"99.9",molarMass:"351.918",grade:"3N",cas:"1308-96-9",shape:"粉末",specificGravity:"7.42",meltingPoint:"2050",catalogMolarMass:"351.93",source:"製品ラベル写真・提供されたメーカー製品資料"},
  {id:"kojundo-TMO01PB",oxideId:"Tm2O3",code:"TMO01PB",purity:"99.9",molarMass:"385.867",grade:"3N",cas:"12036-44-1",shape:"粉末",specificGravity:"8.6",meltingPoint:"2425",catalogMolarMass:"385.87",source:"製品ラベル写真・提供されたメーカー製品資料"},
];
export function nitricPreset() {
  return {acidProduct:NITRIC_ACID.id,acidName:NITRIC_ACID.name,acidMode:"weight",acidPercent:NITRIC_ACID.percent,acidDensity:NITRIC_ACID.density,acidMolarMass:NITRIC_ACID.molarMass,acidMolarity:""};
}
export function oxidePreset(oxideId) {
  const product=OXIDE_PRODUCTS.find(p=>p.oxideId===oxideId);
  return {oxideId,manufacturer:"高純度化学研究所",productCode:product?.code||"",reportedPurity:product?.purity||"",productMolarMass:product?.molarMass||"",labelMolarMass:product?.molarMass||"",productGrade:product?.grade||"",productCas:product?.cas||"",productShape:product?.shape||"",productSpecificGravity:product?.specificGravity||"",productMeltingPoint:product?.meltingPoint||"",catalogMolarMass:product?.catalogMolarMass||"",productSource:product?.source||"製品特性は未確認",purity:""};
}
