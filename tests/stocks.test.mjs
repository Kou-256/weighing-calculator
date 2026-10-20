import test from "node:test";
import assert from "node:assert/strict";
import { concentration, dosePlan, liquidBudget, acidInfo, acidDispensing, validVolume, validateBackup, OXIDES, STOCK_OXIDES, csvCell, stockDesign, targetDose, stockMolarMass, balanceMass, acidRequirement, aliquotRepeats, resolveStockForm, preparationError } from "../src/lib/stocks.mjs";
import { nitricPreset, oxidePreset } from "../src/lib/reagent-presets.mjs";

const stock=(patch={})=>({id:"test-bi",name:"Bi reference",oxideId:"Bi2O3",massG:"0.1000",finalMl:"100.00",purity:"",status:"clear",acidMode:"w60",acidUnit:"ml",acidAmount:"",acidDensity:"",...patch});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test("Y2O3 is powder-only, while historical backups remain readable",()=>{
  assert.equal(STOCK_OXIDES.some(oxide=>oxide.id==="Y2O3"),false);
  const oldStock=stock({oxideId:"Y2O3"});
  assert.match(dosePlan(oldStock,4e-6).error,/粉末秤量のみ/);
  assert.ok(validateBackup({schema:1,stocks:[oldStock],records:[]}));
});

test("Bi stock: 0.1 g / 100 mL, 0.1% in 0.004 mol",()=>{
  const s=stock();close(concentration(s),2*0.1/465.959/0.1);
  const plan=dosePlan(s,0.004*0.1/100);
  close(plan.idealUl,931.918);assert.equal(plan.settingUl,932);assert.equal(plan.pipette.id,"micro");
  close(plan.deliveredMol,concentration(s)*932/1e6);
});
test("oxide metal atom counts, including higher oxides",()=>{
  for(const id of ["Tm2O3","Eu2O3","Er2O3","Dy2O3","Sc2O3","Lu2O3","CeO2","Pr6O11","Tb4O7"]){
    const o=OXIDES.find(x=>x.id===id);assert.ok(o);close(concentration(stock({oxideId:id,massG:String(o.molarMass),finalMl:"1000"})),o.metalAtoms);
  }
});
test("purity uses oxide assay only when supplied",()=>close(concentration(stock({purity:"99"})),concentration(stock())*.99));
test("unverified and precipitated stocks cannot be dispensed",()=>{
  assert.match(dosePlan(stock({status:"unknown"}),4e-6).error,/確認/);
  assert.match(dosePlan(stock({status:"precipitate"}),4e-6).error,/白濁/);
  assert.match(dosePlan(stock({archived:true}),4e-6).error,/停止/);
});
test("pipette ranges and independent 1 / 10 uL increments",()=>{
  const s=stock();const c=concentration(s);
  assert.ok(dosePlan(s,c*99/1e6).error);
  assert.equal(dosePlan(s,c*100/1e6).settingUl,100);
  assert.equal(dosePlan(s,c*1234/1e6).settingUl,1230);
  assert.ok(dosePlan(s,c*10001/1e6).error);
  assert.equal(dosePlan(s,0).settingUl,0);
  assert.equal(validVolume(1234,{min:1000,max:10000,step:10}),false);
});
test("combined budget, actual volume, over-limit and unresolved plans",()=>{
  close(liquidBudget(.004,[800,300,400]).remainingMl,3.5);
  close(liquidBudget(.002,[1000]).remainingMl,1.5);
  close(liquidBudget(.008,[1000]).limitMl,10);
  assert.equal(liquidBudget(.004,[3000,2010]).over,true);
  assert.equal(liquidBudget(.004,[NaN]).unresolved,true);
  close(liquidBudget(.004,[5000]).remainingMl,0);
});
test("nitric acid range uses density only when necessary",()=>{
  const s=stock({acidAmount:"1",acidUnit:"g"});
  const info=acidInfo(s);close(info.range[0],.6/63.0128);close(info.range[1],.61/63.0128);close(info.theoretical,6*.1/465.959);
  assert.equal(acidInfo(stock({acidAmount:"1"})).range,null);
  close(acidInfo(stock({acidAmount:"1",acidDensity:"1.37"})).range[0],1.37*.6/63.0128);
  close(acidInfo(stock({acidMode:"molar",acidMolarity:"10",acidAmount:"1"})).range[0],.01);
  assert.equal(acidInfo(stock({oxideId:"CeO2"})).theoretical,null);
});
test("additional acid settings combine pipettes without exceeding limit",()=>{
  for(const ml of [0,.1,.101,.5,1,1.005,1.1,3.818,4.068,5,9.999,10.001,15.123]){
    const p=acidDispensing(ml);assert.ok(p);assert.ok(p.differenceMl<=1e-9);
    assert.ok(Math.abs(p.totalMl-ml)<.001001);
    for(const part of p.parts) assert.ok(validVolume(part.ul,part.id==="micro"?{min:100,max:1000,step:1}:{min:1000,max:10000,step:10}));
  }
  assert.equal(acidDispensing(.05),null);assert.equal(acidDispensing(-.1),null);
});
test("invalid backup and duplicate IDs rejected before merging",()=>{
  assert.equal(validateBackup({schema:1,stocks:[stock()],records:[]}).stocks.length,1);
  assert.throws(()=>validateBackup({schema:1,stocks:[stock(),stock()],records:[]}));
  assert.throws(()=>validateBackup({schema:1,stocks:[stock({massG:"0"})],records:[]}));
  assert.throws(()=>validateBackup({schema:1,stocks:[],records:[{id:"bad"}]}));
});
test("CSV escapes user-entered names and spreadsheet formulas",()=>{
  assert.equal(csvCell('Bi,"test"'),'"Bi,""test"""');
  assert.equal(csvCell("=SUM(A1)"),'"\'=SUM(A1)"');
});

const designForm=(patch={})=>stock({...nitricPreset(),...oxidePreset("Eu2O3"),designMol:"0.004",designPercent:"0.01",designAliquotMl:"0.5",...patch});
test("label presets auto-populate verified values, never infer other product grades",()=>{
  assert.equal(nitricPreset().acidPercent,"60");assert.equal(nitricPreset().acidDensity,"1.38");
  assert.equal(oxidePreset("Eu2O3").reportedPurity,"99.9");
  assert.equal(oxidePreset("Tm2O3").productMolarMass,"385.867");
  assert.equal(oxidePreset("Eu2O3").productSpecificGravity,"7.42");
  assert.equal(oxidePreset("Eu2O3").catalogMolarMass,"351.93");
  assert.equal(oxidePreset("Tm2O3").productMeltingPoint,"2425");
  assert.equal(oxidePreset("Dy2O3").reportedPurity,"");
  assert.equal(oxidePreset("Eu2O3").purity,"");
  const s=designForm();close(stockMolarMass(s),351.918);
  close(concentration(s),.1/351.918*2/.1);
});
test("60 w/w% nitric converts mL and g equivalently using 1.38 density",()=>{
  const byMl=acidInfo(designForm({acidAmount:"10"}));
  const byG=acidInfo(designForm({acidAmount:"13.8",acidUnit:"g"}));
  close(byMl.range[0],13.8*.6/63.01);close(byMl.range[1],byMl.range[0]);close(byG.range[0],byMl.range[0]);
});
test("inverse Eu stock design reproduces the requested concentration series",()=>{
  const form=designForm(), plan=stockDesign(form);
  assert.equal(plan.error,"");close(plan.massG,.01407672);close(plan.concentration,.0008);
  const s={...form,massG:String(plan.massG)};
  for(const [x,v] of [[.01,.5],[.02,1],[.03,1.5],[.04,2],[.1,5]]){
    const row=targetDose(s,.004,x);assert.equal(row.error,"");close(row.idealMl,v);close(row.settingMl,v);close(row.additionalMl,5-v);close(row.actualPercent,x);
  }
  assert.match(targetDose(s,.004,.1001).error,/上限/);
  assert.match(targetDose(s,.004,.100001).error,/上限/); // cannot round down to hide overrun
  assert.match(stockDesign({...form,designAliquotMl:"5.01"}).error,/上限/);
});
test("actual weighed mass changes aliquot and delivered mol%, independently of planned mass",()=>{
  const s=designForm({massG:"0.0141"});
  const dose=targetDose(s,.004,.01);
  assert.notEqual(dose.idealMl,.5);assert.notEqual(dose.actualPercent,.01);
  close(dose.idealMl,.004*.01/100/concentration(s)*1000);
  close(stockDesign(s).massG,.01407672);
  close(stockDesign(designForm({purity:"99"})).massG,.01407672/.99);
});
test("stock design validates increments and scales the liquid budget",()=>{
  assert.match(stockDesign(designForm({designAliquotMl:"0.050"})).error,/ピペット|分取量/);
  assert.match(stockDesign(designForm({designAliquotMl:"1.005"})).error,/刻み/);
  assert.match(stockDesign(designForm({designPercent:"NaN"})).error,/入力/);
  assert.match(stockDesign(designForm({designMol:"1e308"})).error,/範囲/);
  close(stockDesign(designForm({designMol:"0.008",designAliquotMl:"10"})).limitMl,10);
  assert.match(stockDesign(designForm({designMol:"0.002",designAliquotMl:"3"})).error,/上限/);
});
test("extended product records retain validation and legacy backup compatibility",()=>{
  assert.ok(validateBackup({schema:1,stocks:[designForm()],records:[]}));
  assert.throws(()=>validateBackup({schema:1,stocks:[designForm({acidPercent:"101"})],records:[]}));
  assert.throws(()=>validateBackup({schema:1,stocks:[designForm({productMolarMass:"0"})],records:[]}));
  assert.throws(()=>validateBackup({schema:1,stocks:[designForm({reportedPurity:"Infinity"})],records:[]}));
});
test("balance target is rounded to 0.1 mg without changing the theoretical mass",()=>{
  const mass=stockDesign(designForm()).massG;
  close(mass,.01407672);close(balanceMass(mass),.0141);
  assert.equal(balanceMass(.00001),0);assert.ok(Number.isNaN(balanceMass(-1)));
});
test("acid volume is derived from oxide stoichiometry and selected acid properties",()=>{
  const form=designForm({massG:"0.0141"});
  const theoretical=acidRequirement(form);
  close(theoretical.ml,(.0141/351.918*6)/(1.38*.6/63.01));
  close(theoretical.grams,theoretical.ml*1.38);
  close(acidRequirement(form,10).ml,theoretical.ml*10);
  assert.match(acidRequirement(form,"").error,/倍率/);
  assert.match(acidRequirement(form,.5).error,/倍率/);
  assert.match(acidRequirement({...form,oxideId:"CeO2"}).error,/理論/);
  assert.match(acidRequirement({...form,acidDensity:""}).error,/密度/);
});
test("acid planning retains concentration ranges and molarity-based input",()=>{
  const f=designForm({acidMode:"w60"}), p=acidRequirement(f);
  close(p.ml/p.minMl,61/60);
  const molar=acidRequirement({...f,acidMode:"molar",acidMolarity:"10",acidDensity:""});
  close(molar.ml,molar.theoreticalMol/10*1000);assert.equal(molar.grams,null);
});
test("aliquot counts reproduce 1, 2 and 10 repetitions of 0.5 mL",()=>{
  for(const count of [1,2,10]){
    const p=aliquotRepeats(.5*count,.5);assert.equal(p.count,count);assert.equal(p.remainderMl,0);assert.equal(p.feasible,true);
  }
  const p=aliquotRepeats(4.99,.5);assert.equal(p.count,9);close(p.remainderMl,.49);assert.equal(p.feasible,true);
  assert.equal(aliquotRepeats(1.05,.5).feasible,false);
  assert.match(aliquotRepeats(.5,.05).error,/基準/);
});
test("automatic final volume is a target based on aliquot times batch count, not acid input",()=>{
  const form=designForm({designMode:"target",volumeMode:"batch",batchCount:"200",acidAmount:"10"});
  close(Number(resolveStockForm(form).finalMl),100);
  close(Number(resolveStockForm({...form,acidAmount:"1"}).finalMl),100);
  close(Number(resolveStockForm({...form,batchCount:"40"}).finalMl),20);
  close(stockDesign(resolveStockForm({...form,batchCount:"40"})).massG,.002815344);
  for(const batchCount of ["", "0", "-1", "2.5", "Infinity", "1000001"]){
    assert.equal(resolveStockForm({...form,batchCount}).finalMl,"");
    assert.match(preparationError({...form,batchCount}),/回数/);
  }
});
test("automatic preparation requires real final-volume confirmation; legacy methods remain valid",()=>{
  const form=designForm({designMode:"target",volumeMode:"batch",batchCount:"200"});
  assert.match(preparationError(form),/定容/);
  assert.equal(preparationError({...form,finalVolumeConfirmed:true}),"");
  const manual={...form,volumeMode:"manual",finalMl:"75"};
  assert.equal(resolveStockForm(manual),manual);assert.equal(preparationError(manual),"");
  const old=stock();assert.equal(resolveStockForm(old),old);assert.equal(preparationError(old),"");
  assert.ok(validateBackup({schema:1,stocks:[old],records:[]}));
});
