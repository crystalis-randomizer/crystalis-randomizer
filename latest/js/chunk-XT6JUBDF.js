import{b as n,m as s,n as m,q as i}from"./chunk-AXGSPDJU.js";import{O as a}from"./chunk-OCKFEL4Z.js";async function R(){let t=new Map(location.hash.replace(/^#/,"").split("&").map(e=>{let[r,o]=e.split("=");return o==null&&(o="1"),[decodeURIComponent(r),decodeURIComponent(o)]}));if(t.has("flags")){let e=new i(t.get("flags")),r=t.get("seed")??Math.floor(Math.random()*4294967296).toString(16),o=s(r),p=await a.loadBytes(),{BundleReader:c}=await import("./bundlereader-37D66URB.js");return await m(p,o,e,new c),window.rom}else{let e=await a.load();return window.rom=e,d(t.get("extend"))&&n(e),e}}function d(t){try{return JSON.parse(t)}catch{return t}}export{R as a};
