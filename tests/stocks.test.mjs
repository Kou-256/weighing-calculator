import test from "node:test";
import assert from "node:assert/strict";
import { concentration, dosePlan, liquidBudget, acidInfo, acidDispensing, validVolume, validateBackup, OXIDES, csvCell } from "../src/lib/stocks.mjs";

const stock=(patch={})=>({id:"test-bi",name:"Bi reference",oxideId:"Bi2O3",massG:"0.1000",finalMl:"100.00",purity:"",status:"clear",acidMode:"w60",acidUnit:"ml",acidAmount:"",acidDensity:"",...patch});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);

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
