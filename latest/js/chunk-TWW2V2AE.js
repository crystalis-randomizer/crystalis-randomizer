import{e as n,f as i,g as l,h as s,i as d,v as m,w as p,x as h}from"./chunk-ML3CLHV5.js";import{qa as a,sa as f}from"./chunk-LRD4X76J.js";h();i();d();l();f();async function M(){let e=new Map(location.hash.replace(/^#/,"").split("&").map(t=>{let[r,o]=t.split("=");return o==null&&(o="1"),[decodeURIComponent(r),decodeURIComponent(o)]}));if(e.has("flags")){let t=new n(e.get("flags")),r=e.get("seed")??Math.floor(Math.random()*4294967296).toString(16),o=m(r),c=await a.loadBytes();return await p(c,o,t),window.rom}else{let t=await a.load();return window.rom=t,u(e.get("extend"))&&s(t),t}}function u(e){try{return JSON.parse(e)}catch{return e}}export{M as a};
