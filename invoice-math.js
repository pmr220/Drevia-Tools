'use strict';
const InvoiceMath=(()=>{
 const cents=n=>Math.round((Number(n)+Number.EPSILON)*100);
 function calculate(d){
  let subtotal=0;
  const rows=d.items.map(i=>{const amount=cents(i.qty*i.rate);subtotal+=amount;return {...i,amount};});
  const value=Math.max(0,Number(d.discount)||0);
  const discount=Math.min(subtotal,d.discountMode==='percent'?Math.round(subtotal*Math.min(100,value)/100):cents(value));
  const tax=Math.round((subtotal-discount)*Math.min(100,Math.max(0,Number(d.taxRate)||0))/100);
  return {rows,subtotal,discount,tax,total:subtotal-discount+tax};
 }
 return {calculate};
})();
if(typeof module!=='undefined')module.exports=InvoiceMath;
