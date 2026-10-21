import test from "node:test";
import assert from "node:assert/strict";
import { getDelivery, updateDelivery, stockLine, setStockLines } from "../src/lib/stock-delivery.mjs";
import { liquidBudget, validateBackup } from "../src/lib/stocks.mjs";

const eu={id:"eu-a",name:"Eu A",oxideId:"Eu2O3",massG:"0.01407672",finalMl:"100",purity:"",status:"clear",productMolarMass:"351.918",acidMode:"w60",acidUnit:"ml",acidAmount:"",acidDensity:""};
const data=()=>({schema:1,stocks:[eu,{...eu,id:"eu-b",name:"Eu B",massG:"0.02815344"}],records:[],delivery:{},drafts:{}});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
const line=(d,set)=>stockLine(d,"Eu₂O₃",4e-7,set,.004);

test("same Eu can be stock in set 1 and powder in set 2",()=>{
  const original=data();
  const d=updateDelivery(original,"Eu₂O₃",1,{mode:"stock",stockId:eu.id});
  close(line(d,1).actualUl,500);assert.equal(line(d,2),null);
  assert.equal(original.delivery["1:Eu₂O₃"],undefined);
  const switched=updateDelivery(d,"Eu₂O₃",2,{mode:"stock",stockId:"eu-b"});
  close(line(switched,1).actualUl,500);close(line(switched,2).actualUl,250);
  const powder=updateDelivery(switched,"Eu₂O₃",1,{mode:"powder"});
  assert.equal(line(powder,1),null);close(line(powder,2).actualUl,250);
});

test("material-wide legacy selections are preserved as defaults, not rewritten",()=>{
  const d={...data(),delivery:{"Eu₂O₃":{mode:"stock",stockId:eu.id,pipette:"micro"}}};
  close(line(d,1).actualUl,500);close(line(d,2).actualUl,500);
  const edited=updateDelivery(d,"Eu₂O₃",2,{mode:"powder"});
  close(line(edited,1).actualUl,500);assert.equal(line(edited,2),null);
  assert.deepEqual(edited.delivery["Eu₂O₃"],d.delivery["Eu₂O₃"]);
  assert.equal(getDelivery(edited,"Eu₂O₃",2).stockId,eu.id);
  const restored=updateDelivery(edited,"Eu₂O₃",2,{mode:"stock"});
  close(line(restored,2).actualUl,500);assert.equal(getDelivery(restored,"Eu₂O₃",2).pipette,"micro");
  assert.ok(validateBackup(JSON.parse(JSON.stringify(edited))));
});

test("pipette selection and actual aliquot drafts are isolated per set",()=>{
  let d=updateDelivery(data(),"Eu₂O₃",1,{mode:"stock",stockId:eu.id});
  d=updateDelivery(d,"Eu₂O₃",2,{mode:"stock",stockId:eu.id});
  const first=line(d,1);
  d={...d,drafts:{[first.key]:{signature:first.signature,value:"600"}}};
  close(line(d,1).actualUl,600);close(line(d,2).actualUl,500);
  const changed=updateDelivery(d,"Eu₂O₃",1,{pipette:"large"});
  assert.equal(line(changed,1).invalid,true);assert.equal(line(changed,2).invalid,false);
  assert.equal(line(changed,2).plan.pipette.id,"micro");
  const powder=updateDelivery(d,"Eu₂O₃",1,{mode:"powder"});
  const restored=updateDelivery(powder,"Eu₂O₃",1,{mode:"stock"});
  close(line(restored,1).actualUl,600);assert.equal(restored.drafts,d.drafts);
  assert.equal(restored.records,d.records);assert.equal(restored.stocks,d.stocks);
});

test("set calculations and acid budgets use only that set's selected stocks",()=>{
  const d=updateDelivery(data(),"Eu₂O₃",2,{mode:"stock",stockId:eu.id});
  const masses={"V₂O₅":.36376,"Y₂O₃":.4517,"Eu₂O₃":351.918*4e-7/2};
  const materials={"V₂O₅":181.88,"Y₂O₃":225.8982,"Eu₂O₃":351.918};
  const powder=setStockLines(d,masses,materials,1,.004);
  const stock=setStockLines(d,masses,materials,2,.004);
  assert.equal(powder.length,0);assert.equal(stock.length,1);assert.equal(stock[0].key,"2:Eu₂O₃");
  close(liquidBudget(.004,powder.map(l=>l.actualUl)).remainingMl,5);
  close(liquidBudget(.004,stock.map(l=>l.actualUl)).remainingMl,4.5);
});

test("existing powder-only, stock validation and volume-limit checks remain active",()=>{
  let d=updateDelivery(data(),"Eu₂O₃",1,{mode:"stock",stockId:eu.id});
  assert.match(stockLine(d,"Eu₂O₃",4.08e-6,1,.004).plan.error,/上限/);
  d=updateDelivery(d,"Y₂O₃",1,{mode:"stock",stockId:eu.id});
  assert.equal(stockLine(d,"Y₂O₃",4e-7,1,.004),null);
  d=updateDelivery(d,"Tm₂O₃",1,{mode:"stock",stockId:eu.id});
  assert.match(stockLine(d,"Tm₂O₃",4e-7,1,.004).plan.error,/一致/);
  const unconfirmed={...d,stocks:[{...eu,status:"unknown"}]};
  assert.equal(line(unconfirmed,1).invalid,true);
  assert.equal(line(unconfirmed,2),null);
});
