import{b as n,l as s,m,p,q as c}from"./chunk-YQ4NL6LL.js";import{R as a}from"./chunk-F42GMYON.js";async function S(){let t=new Map(location.hash.replace(/^#/,"").split("&").map(e=>{let[r,o]=e.split("=");return o==null&&(o="1"),[decodeURIComponent(r),decodeURIComponent(o)]}));if(t.has("flags")){let e=new p(t.get("flags")),r=t.get("seed")??Math.floor(Math.random()*4294967296).toString(16),o=s(r),i=await a.loadBytes();return await m(i,o,e,new c("../js/")),window.rom}else{let e=await a.load();return window.rom=e,d(t.get("extend"))&&n(e),e}}function d(t){try{return JSON.parse(t)}catch{return t}}export{S as a};
