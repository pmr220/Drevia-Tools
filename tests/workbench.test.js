'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const math=require('../invoice-math'),core=require('../workbench-core');
test('percentage discount precedes tax and matches fixed amount',()=>{
 const input={items:[{qty:3,rate:100}],discount:'10',discountMode:'percent',taxRate:'18'};
 assert.deepEqual(math.calculate(input),math.calculate({...input,discountMode:'amount',discount:'30'}));
 assert.equal(math.calculate(input).total,31860);
});
test('discount limits cannot produce negative total and fractional quantities work',()=>{
 assert.equal(math.calculate({items:[{qty:1.5,rate:12.5}],discountMode:'percent',discount:'200',taxRate:'18'}).total,0);
 assert.equal(math.calculate({items:[{qty:1.5,rate:12.5}],discountMode:'amount',discount:'0',taxRate:'0'}).total,1875);
});
test('booklet order folds correctly and pads missing pages',()=>{
 assert.deepEqual(core.booklet(8),[[8,1],[2,7],[6,3],[4,5]]);
 assert.deepEqual(core.booklet(5),[[null,1],[2,null],[null,3],[4,5]]);
 for(let n=1;n<=200;n++){const pages=core.booklet(n).flat().filter(Boolean).sort((a,b)=>a-b);assert.deepEqual(pages,Array.from({length:n},(_,i)=>i+1));}
});
test('SHA-256 known vector and duplicate bytes regardless of name',async()=>{
 const hash=await core.hash(new TextEncoder().encode('abc'));
 assert.equal(hash,'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
 assert.deepEqual(core.duplicates([{name:'one',size:3,sha256:hash},{name:'two',size:3,sha256:hash},{name:'three',size:4,sha256:hash}]),[[0,1]]);
});
test('encrypted pack round-trips bytes and rejects wrong password and tampering',async()=>{
 const plain=new TextEncoder().encode('PK sample zip payload'),password='test-only long passphrase';
 const sealed=await core.seal(plain,password),other=await core.seal(plain,password);
 assert.notDeepEqual(sealed,other);
 assert.deepEqual(new Uint8Array(await core.unlock(sealed,password)),plain);
 await assert.rejects(core.unlock(sealed,'incorrect passphrase'),/Wrong password/);
 sealed[sealed.length-1]^=1;
 await assert.rejects(core.unlock(sealed,password),/damaged pack/);
 await assert.rejects(core.unlock(new Uint8Array(60),password),/Drevia/);
});
