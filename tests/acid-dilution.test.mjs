import test from "node:test";
import assert from "node:assert/strict";
import { acidDilution } from "../src/lib/acid-dilution.mjs";
import { NITRIC_ACID } from "../src/lib/reagent-presets.mjs";

const form=(patch={})=>({mode:"mass",sourcePercent:NITRIC_ACID.percent,sourceDensity:NITRIC_ACID.density,molarMass:NITRIC_ACID.molarMass,sourceAmount:"5",sourceUnit:"ml",targetPercent:"10",waterDensity:"1",targetMolarity:"1",finalMl:"100",...patch});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-10,`${a} != ${b}`);

test("60 w/w% nitric 5 mL to 10 w/w% needs 34.5 g pure water",()=>{
  const f=form(),p=acidDilution(f);assert.equal(p.error,"");
  close(p.sourceMass,6.9);close(p.sourceMl,5);close(p.finalMass,41.4);close(p.waterMass,34.5);close(p.waterMlApprox,34.5);
  close(p.sourceMass*.6,p.finalMass*.1);assert.equal(p.finalMl,undefined);
  assert.equal(f.sourceAmount,"5");
});
test("mass input is equivalent and pure-water density changes only the approximate volume",()=>{
  const p=acidDilution(form({sourceAmount:"6.9",sourceUnit:"g",waterDensity:"0.9982"}));
  close(p.sourceMl,5);close(p.waterMass,34.5);close(p.waterMlApprox,34.5/.9982);close(p.finalMass,41.4);
});
test("molar dilution conserves HNO3 moles and does not claim an exact water volume",()=>{
  const p=acidDilution(form({mode:"molar"}));assert.equal(p.error,"");
  close(p.sourceMolarity,1.38*.6*1000/63.01);close(p.sourceMl,7.609903381642512);
  close(p.sourceMolarity*p.sourceMl/1000,.1);close(p.finalMl,100);
  assert.equal(p.waterMass,undefined);assert.equal(p.waterMlApprox,undefined);
  const twice=acidDilution(form({mode:"molar",finalMl:"200"}));close(twice.sourceMl,2*p.sourceMl);
});
test("same concentration is allowed, concentration increase by dilution is rejected",()=>{
  const p=acidDilution(form({targetPercent:"60"}));close(p.waterMass,0);close(p.finalMass,6.9);
  assert.match(acidDilution(form({targetPercent:"61"})).error,/濃い/);
  assert.match(acidDilution(form({mode:"molar",targetMolarity:"14"})).error,/高い/);
});
test("rejects blank, negative, nonfinite and overflowing dilution inputs",()=>{
  for(const patch of [{sourcePercent:""},{sourcePercent:"101"},{sourceDensity:"0"},{molarMass:"NaN"},{sourceAmount:"-1"},{targetPercent:""},{waterDensity:"0"},{sourceUnit:"bad"},{mode:"bad"},{mode:"molar",targetMolarity:"0"},{mode:"molar",finalMl:"Infinity"},{sourceAmount:"1e308",sourceDensity:"10"}]) assert.ok(acidDilution(form(patch)).error,JSON.stringify(patch));
});
test("stock transfer preserves concentration units and never invents diluted-acid density",()=>{
  const weight=acidDilution(form()).acidPatch;
  assert.equal(weight.acidMode,"weight");assert.equal(weight.acidPercent,"10");assert.equal(weight.acidDensity,"");assert.equal(weight.acidUnit,"g");
  const molar=acidDilution(form({mode:"molar"})).acidPatch;
  assert.equal(molar.acidMode,"molar");assert.equal(molar.acidMolarity,"1");assert.equal(molar.acidDensity,"");assert.equal(molar.acidUnit,"ml");
  for(const patch of [weight,molar]){assert.equal(patch.massG,undefined);assert.equal(patch.oxideId,undefined);assert.equal(patch.finalMl,undefined);}
});
