import{a as Q,b as Me,c as Y,d as $,e as x,f as ee,j as I,k as D,l as P,m as ne,n as ae,o as z,p as Ae,q as se,r as F,s as k,t as re,u as ie,v as H,w as oe,x as Oe}from"./chunk-MWSBQPBU.js";import{a as N,b as K,c as Z,ra as te,sa as Ue}from"./chunk-YJZP2HXN.js";var de={};K(de,{MarcFile:()=>h,createIPSFromFiles:()=>Pe,parseIPSFile:()=>De});function R(){this.records=[],this.truncate=!1}function De(e){var t=new R;for(e.seek(5);!e.isEOF();){var n=e.readU24();if(n===4542278){if(e.isEOF())break;if(e.offset+3===e.fileSize){t.truncate=e.readU24();break}}var a=e.readU16();a===0?t.addRLERecord(n,e.readU16(),e.readU8()):t.addSimpleRecord(n,e.readBytes(a))}return t}function Pe(e,t){var n=new R;t.fileSize<e.fileSize&&(n.truncate=t.fileSize);for(var a={type:3735928559,startOffset:0,length:0};!t.isEOF();){var s=e.isEOF()?0:e.readU8(),o=t.readU8();if(s!==o){for(var l=!0,i=[],c=t.offset-1;s!==o&&i.length<65535&&(i.push(o),o!==i[0]&&(l=!1),!(t.isEOF()||i.length===65535));)s=e.isEOF()?0:e.readU8(),o=t.readU8();var m=c-(a.offset+a.length);if(a.type===1&&m<6&&a.length+m+i.length<65535)if(l&&i.length>6)e.seek(c),t.seek(c),a={type:3735928559,startOffset:0,length:0};else{for(;m--;)a.data.push(t._u8array[a.offset+a.length]),a.length++;a.data=a.data.concat(i),a.length=a.data.length}else{if(c>=16777216)throw new Error("files are too big for IPS format");l&&i.length>2?n.addRLERecord(c,i.length,i[0]):n.addSimpleRecord(c,i),a=n.records[n.records.length-1]}}}if(t.fileSize>e.fileSize){var p=n.records[n.records.length-1],u=p.offset+p.length;u<t.fileSize&&n.addSimpleRecord(t.fileSize-1,[0])}return n}function h(e,t){if(typeof e=="object"&&e.files&&(e=e.files[0]),this.littleEndian=!1,this.offset=0,this._lastRead=null,typeof e=="object"&&e.name&&e.size){if(typeof window.FileReader!="function")throw new Error("Incompatible Browser");this.fileName=e.name,this.fileType=e.type,this.fileSize=e.size,this._fileReader=new FileReader,this._fileReader.marcFile=this,this._fileReader.addEventListener("load",function(){this.marcFile._u8array=new Uint8Array(this.result),this.marcFile._dataView=new DataView(this.result),t&&t.call()},!1),this._fileReader.readAsArrayBuffer(e)}else if(typeof e=="object"&&typeof e.fileName=="string"&&typeof e.littleEndian=="boolean"){this.fileName=e.fileName,this.fileType=e.fileType,this.fileSize=e.fileSize;var n=new ArrayBuffer(e);this._u8array=new Uint8Array(this.fileType),this._dataView=new DataView(this.fileType),e.copyToFile(this,0),t&&t.call()}else if(typeof e=="object"&&typeof e.byteLength=="number")this.fileName="file.bin",this.fileType="application/octet-stream",this.fileSize=e.byteLength,typeof e.buffer<"u"&&(e=e.buffer),this._u8array=new Uint8Array(e),this._dataView=new DataView(e),t&&t.call();else if(typeof e=="number"){this.fileName="file.bin",this.fileType="application/octet-stream",this.fileSize=e;var n=new ArrayBuffer(e);this._u8array=new Uint8Array(n),this._dataView=new DataView(n),t&&t.call()}else throw new Error("Invalid source")}var $e,le,ce=N(()=>{$e="PATCH";R.prototype.addSimpleRecord=function(e,t){this.records.push({offset:e,type:1,length:t.length,data:t})};R.prototype.addRLERecord=function(e,t,n){this.records.push({offset:e,type:0,length:t,byte:n})};R.prototype.toString=function(){nSimpleRecords=0,nRLERecords=0;for(var e=0;e<this.records.length;e++)this.records[e].type===0?nRLERecords++:nSimpleRecords++;var t="Simple records: "+nSimpleRecords;return t+=`
RLE records: `+nRLERecords,t+=`
Total records: `+this.records.length,this.truncate&&(t+=`
Truncate at: 0x`+this.truncate.toString(16)),t};R.prototype.export=function(e){for(var t=5,n=0;n<this.records.length;n++)this.records[n].type===0?t+=3+2+2+1:t+=3+2+this.records[n].data.length;t+=3,this.truncate&&(t+=3);let a=new h(t);a.fileName=e+".ips",a.writeString($e);for(var n=0;n<this.records.length;n++){var s=this.records[n];a.writeU24(s.offset),s.type===0?(a.writeU16(0),a.writeU16(s.length),a.writeU8(s.byte)):(a.writeU16(s.data.length),a.writeBytes(s.data))}return a.writeString("EOF"),s.truncate&&a.writeU24(s.truncate),a};R.prototype.apply=function(e){if(this.truncate)this.truncate>e.fileSize?(tempFile=new h(this.truncate),e.copyToFile(tempFile,0,e.fileSize,0)):tempFile=e.slice(0,this.truncate);else{for(var t=e.fileSize,n=0;n<this.records.length;n++){var a=this.records[n];a.type===0?a.offset+a.length>t&&(t=a.offset+a.length):a.offset+a.data.length>t&&(t=a.offset+a.data.length)}t===e.fileSize?tempFile=e.slice(0,e.fileSize):(tempFile=new h(t),e.copyToFile(tempFile,0))}e.seek(0);for(var n=0;n<this.records.length;n++)if(tempFile.seek(this.records[n].offset),this.records[n].type===0)for(var s=0;s<this.records[n].length;s++)tempFile.writeU8(this.records[n].byte);else tempFile.writeBytes(this.records[n].data);return tempFile};h.IS_MACHINE_LITTLE_ENDIAN=function(){var e=new ArrayBuffer(2);return new DataView(e).setInt16(0,256,!0),new Int16Array(e)[0]===256}();h.prototype.seek=function(e){this.offset=e};h.prototype.skip=function(e){this.offset+=e};h.prototype.isEOF=function(){return!(this.offset<this.fileSize)};h.prototype.slice=function(e,t){t=t||this.fileSize-e;var n;return typeof this._u8array.buffer.slice<"u"?(n=new h(0),n.fileSize=t,n._u8array=new Uint8Array(this._u8array.buffer.slice(e,e+t))):(n=new h(t),this.copyToFile(n,e,t,0)),n.fileName=this.fileName,n.fileType=this.fileType,n.littleEndian=this.littleEndian,n};h.prototype.copyToFile=function(e,t,n,a){typeof a>"u"&&(a=t),n=n||this.fileSize-t;for(var s=0;s<n;s++)e._u8array[a+s]=this._u8array[t+s]};h.prototype.save=function(){var e;try{e=new Blob([this._u8array],{type:this.fileType})}catch(n){if(window.BlobBuilder=window.BlobBuilder||window.WebKitBlobBuilder||window.MozBlobBuilder||window.MSBlobBuilder,n.name==="InvalidStateError"&&window.BlobBuilder){var t=new BlobBuilder;t.append(this._u8array.buffer),e=t.getBlob(this.fileType)}else throw new Error("Incompatible Browser")}le(e,this.fileName)};h.prototype.getExtension=function(){var e=this.fileName?this.fileName.toLowerCase().match(/\.(\w+)$/):"";return e?e[1]:""};h.prototype.readU8=function(){return this._lastRead=this._u8array[this.offset],this.offset++,this._lastRead};h.prototype.readU16=function(){return this.littleEndian?this._lastRead=this._u8array[this.offset]+(this._u8array[this.offset+1]<<8):this._lastRead=(this._u8array[this.offset]<<8)+this._u8array[this.offset+1],this.offset+=2,this._lastRead>>>0};h.prototype.readU24=function(){return this.littleEndian?this._lastRead=this._u8array[this.offset]+(this._u8array[this.offset+1]<<8)+(this._u8array[this.offset+2]<<16):this._lastRead=(this._u8array[this.offset]<<16)+(this._u8array[this.offset+1]<<8)+this._u8array[this.offset+2],this.offset+=3,this._lastRead>>>0};h.prototype.readU32=function(){return this.littleEndian?this._lastRead=this._u8array[this.offset]+(this._u8array[this.offset+1]<<8)+(this._u8array[this.offset+2]<<16)+(this._u8array[this.offset+3]<<24):this._lastRead=(this._u8array[this.offset]<<24)+(this._u8array[this.offset+1]<<16)+(this._u8array[this.offset+2]<<8)+this._u8array[this.offset+3],this.offset+=4,this._lastRead>>>0};h.prototype.readBytes=function(e){this._lastRead=new Array(e);for(var t=0;t<e;t++)this._lastRead[t]=this._u8array[this.offset+t];return this.offset+=e,this._lastRead};h.prototype.readString=function(e){this._lastRead="";for(var t=0;t<e&&this.offset+t<this.fileSize&&this._u8array[this.offset+t]>0;t++)this._lastRead=this._lastRead+String.fromCharCode(this._u8array[this.offset+t]);return this.offset+=e,this._lastRead};h.prototype.writeU8=function(e){this._u8array[this.offset]=e,this.offset++};h.prototype.writeU16=function(e){this.littleEndian?(this._u8array[this.offset]=e&255,this._u8array[this.offset+1]=e>>8):(this._u8array[this.offset]=e>>8,this._u8array[this.offset+1]=e&255),this.offset+=2};h.prototype.writeU24=function(e){this.littleEndian?(this._u8array[this.offset]=e&255,this._u8array[this.offset+1]=(e&65280)>>8,this._u8array[this.offset+2]=(e&16711680)>>16):(this._u8array[this.offset]=(e&16711680)>>16,this._u8array[this.offset+1]=(e&65280)>>8,this._u8array[this.offset+2]=e&255),this.offset+=3};h.prototype.writeU32=function(e){this.littleEndian?(this._u8array[this.offset]=e&255,this._u8array[this.offset+1]=(e&65280)>>8,this._u8array[this.offset+2]=(e&16711680)>>16,this._u8array[this.offset+3]=(e&4278190080)>>24):(this._u8array[this.offset]=(e&4278190080)>>24,this._u8array[this.offset+1]=(e&16711680)>>16,this._u8array[this.offset+2]=(e&65280)>>8,this._u8array[this.offset+3]=e&255),this.offset+=4};h.prototype.writeBytes=function(e){for(var t=0;t<e.length;t++)this._u8array[this.offset+t]=e[t];this.offset+=e.length};h.prototype.writeString=function(e,t){t=t||e.length;for(var n=0;n<e.length&&n<t;n++)this._u8array[this.offset+n]=e.charCodeAt(n);for(;n<t;n++)this._u8array[this.offset+n]=0;this.offset+=t};le=le||function(e){"use strict";if(!(e===void 0||typeof navigator<"u"&&/MSIE [1-9]\./.test(navigator.userAgent))){var t=e.document,n=function(){return e.URL||e.webkitURL||e},a=t.createElementNS("http://www.w3.org/1999/xhtml","a"),s="download"in a,o=/constructor/i.test(e.HTMLElement)||e.safari,l=/CriOS\/[\d]+/.test(navigator.userAgent),i=e.setImmediate||e.setTimeout,c=function(r){i(function(){throw r},0)},m=function(r){setTimeout(function(){typeof r=="string"?n().revokeObjectURL(r):r.remove()},4e4)},p=function(r){return/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(r.type)?new Blob([String.fromCharCode(65279),r],{type:r.type}):r},u=function(r,f,g){g||(r=p(r));var w,S=this,W=r.type==="application/octet-stream",O=function(){(function(E,b,Ne){for(var X=(b=[].concat(b)).length;X--;){var G=E["on"+b[X]];if(typeof G=="function")try{G.call(E,Ne||E)}catch(Fe){c(Fe)}}})(S,"writestart progress write writeend".split(" "))};if(S.readyState=S.INIT,s)return w=n().createObjectURL(r),void i(function(){var E,b;a.href=w,a.download=f,E=a,b=new MouseEvent("click"),E.dispatchEvent(b),O(),m(w),S.readyState=S.DONE},0);(function(){if((l||W&&o)&&e.FileReader){var E=new FileReader;return E.onloadend=function(){var b=l?E.result:E.result.replace(/^data:[^;]*;/,"data:attachment/file;");e.open(b,"_blank")||(e.location.href=b),b=void 0,S.readyState=S.DONE,O()},E.readAsDataURL(r),S.readyState=S.INIT}w||(w=n().createObjectURL(r)),W?e.location.href=w:e.open(w,"_blank")||(e.location.href=w),S.readyState=S.DONE,O(),m(w)})()},d=u.prototype;return typeof navigator<"u"&&navigator.msSaveOrOpenBlob?function(r,f,g){return f=f||r.name||"download",g||(r=p(r)),navigator.msSaveOrOpenBlob(r,f)}:(d.abort=function(){},d.readyState=d.INIT=0,d.WRITING=1,d.DONE=2,d.error=d.onwritestart=d.onprogress=d.onwrite=d.onabort=d.onerror=d.onwriteend=null,function(r,f,g){return new u(r,f||r.name||"download",g)})}}(typeof self<"u"&&self||typeof window<"u"&&window||void 0)});function fe(e){let t=!0;for(let{name:n,flagString:a,description:s}of Y.all()){let o=document.createElement("h2");o.textContent=n,e.appendChild(o);let l=document.createElement("p");l.innerHTML=s,e.appendChild(l);let i=document.createElement("a");i.textContent=a,i.classList.add("button"),i.classList.add("preset-flags"),i.dataset.flags=a,a.length>48&&i.classList.add("small"),t&&(i.dataset.defaultPreset="true"),t=!1,e.appendChild(i)}}function pe(e){for(let{name:t,description:n,flags:a}of $.all()){let s=document.createElement("h2");if(s.textContent=t,e.appendChild(s),n){let l=document.createElement("p");l.innerHTML=n,e.appendChild(l)}let o=document.createElement("div");o.classList.add("flag-list"),e.appendChild(o);for(let l of a.values()){let{flag:i,opts:{hard:c,name:m,text:p}}=l,u=document.createElement("div");if(u.textContent=`${i}: ${m}`,u.classList.add("checkbox"),c&&u.classList.add("hard"),p){let d=document.createElement("div");d.classList.add("flag-body"),d.innerHTML=p,u.appendChild(d)}o.appendChild(u)}}}async function me(e){let t=k.get("simea");for(let n of t.values()){let a=document.createElement("div");he(a,"",await n),e.appendChild(a)}}function he(e,t,n){e.className="flex-row",e.style.width="100%";let a=document.createElement("input");a.type="radio",a.name="simea-replacement",a.id=`simea-replacement-${n.name}`,a.value=n.name,a.style.display="none",n.name=="Simea"&&(a.checked=!0),e.appendChild(a);let s=document.createElement("label");s.style.position="relative",s.className="sprite-replacement",s.htmlFor=`simea-replacement-${n.name}`;let o=document.createElement("img");o.width=112,o.height=98,o.style.float="left",se(n.nssdata).then(p=>o.src=p),s.appendChild(o);let l=document.createElement("div");if(l.textContent=n.name,l.className="title",s.appendChild(l),n.description){let p=document.createElement("div");p.innerHTML=n.description,p.className="desc",s.appendChild(p)}let i=document.createElement("div");if(i.style.position="absolute",i.style.top="0",i.style.right="0",i.style.margin="3px",t!=""){let p=document.createElement("div");p.textContent="X",p.className="button",p.onclick=function(){let u=window.localStorage.getItem("simea-replacement"),d=window.localStorage.getItem("simea-replacement-custom")||"{}",r=JSON.parse(d,B.addMapRestorement);if(delete r[t],window.localStorage.setItem("simea-replacement-custom",JSON.stringify(r,B.addMapReplacement)),n.name==u){let f=document.getElementsByName("simea-replacement");for(let g of f){let w=g;w.value=="Simea"&&(w.checked=!0)}}M()},i.appendChild(p)}let c=document.createElement("div");c.className="button";let m=document.getElementById("download-icon")?.cloneNode(!0);m.setAttribute("id",`download-icon-${n.name}`),m.style.display="flex",c.appendChild(m),c.className="button",c.onclick=function(){let p=B.rom.slice(),u=B.rom.slice();F.applyPatch(n,u.subarray(16),!1);let d=new j.MarcFile(p),r=new j.MarcFile(u);j.createIPSFromFiles(d,r).export(n.name).save()},i.appendChild(c),s.appendChild(i),e.appendChild(s)}function ue(e,t){for(let{name:n,description:a,flags:s}of $.all()){let o=!1,l=document.createElement("h2");l.textContent=n;let i=a?document.createElement("p"):null;i&&(i.innerHTML=a);let c=document.createElement("div");c.classList.add("flag-list");for(let m of s.values()){let{flag:p,opts:{hard:u,name:d,text:r}}=m;if(!t.check(m))continue;o=!0;let f=document.createElement("div");if(f.textContent=`${p}: ${d}`,f.classList.add("checkbox"),u&&f.classList.add("hard"),r){let g=document.createElement("div");g.classList.add("flag-body"),g.innerHTML=r,f.appendChild(g)}c.appendChild(f)}o&&(e.appendChild(l),i&&e.appendChild(i),e.appendChild(c))}}var j,B,M,ye=N(()=>{ie();ee();j=(ce(),Z(de)),B=(we(),Z(ge));M=()=>{let e=window.localStorage.getItem("simea-replacement"),t=window.localStorage.getItem("simea-replacement-custom")||"{}",n=JSON.parse(t,B.addMapRestorement),a=document.getElementById("simea-sprite-custom");a.innerHTML="";for(let[s,o]of Object.entries(n)){let l=o;k.get("simea").set(l.name,Promise.resolve(l)),he(a,s,l);let c=document.getElementById(`simea-replacement-${l.name}`);c.addEventListener("change",m=>{window.localStorage.setItem("simea-replacement",m.target.value)}),c.value==e&&(c.checked=!0)}}});var U,Se=N(()=>{U=class{constructor(){this.tasks=0,this.completed=0}addTasks(t){this.tasks+=t}addCompleted(t){this.completed+=t}value(){return this.tasks&&this.completed/this.tasks}}});var ge={};K(ge,{addMapReplacement:()=>ke,addMapRestorement:()=>Be,download:()=>Te,rom:()=>T});function C(e,...t){(window.ga||(()=>{}))("gtag_UA_131783670_1."+e,...t)}async function xe(e){let t=e.target,n=`${P}: ${y}`,a=new Date().getTime();for(;t;){if(t.tagName==="H1"&&t.parentElement.classList.contains("expandable")){t.parentElement.classList.toggle("expanded");break}else if(t.id==="preset-apply"){C("send","event","custom-preset"),y=new x(document.getElementById("flagstring").value),L();break}else if(t.id==="new-seed"){C("send","event","Main","new-seed"),v=Math.floor(Math.random()*4294967296).toString(16),L();break}else if(t.id==="generate"){C("send","event","Main","generate",n);let s=H(v),[o,l]=await ve(s);if(C("send","timing","Main","generate",new Date().getTime()-a,n),!o)break;let i=q.replace(/\.nes|$/,["_",s.toString(16).padStart(8,0),"_",l.toString(16).padStart(8,0),".nes"].join(""));Te(o,i);break}else if(t.id==="spoiler"){C("send","event","Main","spoiler",n),await ve(H(v)),C("send","timing","Main","spoiler",new Date().getTime()-a,n);break}t=t.parentElement}}function V(e,t){return[...e].sort((n,a)=>{let s=t(n),o=t(a);return s<o?-1:s>o?1:0})}function ke(e,t){return t instanceof Map?{dataType:"Map",value:Array.from(t.entries())}:t}function Be(e,t){return typeof t=="object"&&t!==null&&t.dataType==="Map"?new Map(t.value):t}var y,v,T,q,He,J,_e,je,Ve,Re,qe,A,Ee,ve,_,be,L,Ce,Le,Ie,Te,we=N(()=>{Oe();ye();Ae();Me();Ue();ee();Se();ie();He=!1,J=!1;window.global=window;_e=typeof CR_PERMALINK=="boolean"&&CR_PERMALINK;je=()=>{He=!0,Le(),Ie(),A(!1),Ce(),window.addEventListener("popstate",e=>{A(!1)}),document.body.addEventListener("click",xe),Re()},Ve=()=>{if(_e&&document.body.classList.add("permalink"),document.getElementById("race")==null){je(),ue(document.getElementById("flags"),y);for(let e of[...document.getElementsByClassName("checkbox")])be(e);for(let e of document.querySelectorAll('.flag-list > input[type="checkbox"]'))e.checked=!0,e.disabled=!0;return}fe(document.getElementById("presets")),pe(document.getElementById("select-options")),me(document.getElementById("simea-sprite-options")).then(()=>{Ie()}),Le(),A(!0),y||document.querySelector("[data-default-preset]").click();for(let e of[...document.getElementsByClassName("checkbox")])be(e);if(L(),qe(),document.body.addEventListener("click",xe),window.addEventListener("popstate",e=>{e.state?(y=new x(e.state.flags),v=e.state.seed):A(!0)}),J){let e=document.createElement("section");e.classList.add("expandable");let t=document.createElement("h1");t.textContent="Debug",e.appendChild(t);let n=document.createElement("div");n.id="debug",e.appendChild(n),document.querySelector("main").appendChild(e)}Re()},Re=()=>{if(ne!=="latest"){let e=_e?"":"Current version: ";for(let t of document.getElementsByClassName("version"))t.textContent=`${e}${P} (${ae.toDateString()})`}if(z){let e=document.querySelector("nav"),t=document.createElement("a");t.textContent="Older",t.href=`/sha/${z}`,t.style.float="right",e.appendChild(t)}document.body.classList.add("js-works"),document.body.classList.remove("js-broken"),I=="rc"?(document.body.classList.add("release-candidate"),document.body.classList.add("versioned")):I=="stable"&&document.body.classList.add("versioned")},qe=()=>{let e=document.getElementById("seed"),t=()=>{v=e.value,L()};e.addEventListener("keyup",t),e.addEventListener("change",t)},A=e=>{for(let t of location.hash.substring(1).split("&")){let[n,a]=t.split("=");a=decodeURIComponent(a),n==="flags"&&(y=new x(a)),n==="seed"&&(v=decodeURIComponent(a)),n==="race"&&document.body.classList.add("race"),n==="debug"&&(J=!0);for(let s of document.querySelectorAll("[data-flags]"))s.addEventListener("click",()=>{y=new x(s.dataset.flags),D=="unstable"&&y.set("Ds",!0),L()})}};Ee=(e,t,n)=>{let a=[];for(let s=0;s<n;s++)a.push(String.fromCharCode(e[t+2*s]));return a.join("")},ve=async e=>{for(let d of document.getElementsByClassName("seed-out"))d.textContent=e.toString(16).padStart(8,"0");let t=document.getElementById("progress"),n=new U,a=T.slice(),s=!1,o=new x(String(y));document.body.classList.add("shuffling");let l=y.check("Ds")?{}:void 0,i=()=>{s||(t.value=n.value(),setTimeout(i,120))};i();let c,m,p=document.querySelector('input[name="simea-replacement"]:checked').value,u=await k.get("simea").get(p);try{[c,m]=await oe(a,e,o,[u],l,n)}catch(d){let r=d.name==="UsageError";document.body.classList.add(r?"invalid":"failure");let f=document.getElementById(r?"invalid-text":"error-text");throw f.textContent=r?d.message:d.stack,f.parentElement.parentElement.scrollIntoViewIfNeeded(),document.getElementById("checksum").textContent="SHUFFLE FAILED!",d}if(m<0)return document.getElementById("checksum").textContent=`SHUFFLE FAILED! ${m}`,[null,null];if(s=!0,document.body.classList.remove("shuffling"),l&&l.spoiler){let d=l.spoiler;d.flags&&_("spoiler-flags",[d.flags]),_("spoiler-items",V(d.slots.filter(r=>r),r=>r.item)),_("spoiler-route",d.route),_("spoiler-mazes",V(d.mazes,r=>r.location).map(({name:r,maze:f})=>`${r}:
${f}`)),_("spoiler-trades",d.trades.map(({item:r,npc:f})=>`${f}: ${r}`).sort()),_("spoiler-item-names",d.unidentifiedItems.map(({oldName:r,newName:f})=>`${f}: ${r}`).sort()),_("spoiler-walls",V(d.walls,r=>r.location).map(({location:r,oldElement:f,newElement:g})=>`${r}${f===3?" (iron)":""}: ${["wind","fire","water","thunder"][g]}`)),_("spoiler-wild-warps",d.wildWarps.map(({name:r})=>r)),_("spoiler-houses",d.houses.map(({house:r,town:f})=>`${r}: ${f}`.replace(/\s*-\s*/g," ")))}return document.getElementById("checksum").textContent=Ee(c,161941,4)+Ee(c,161942,4),[c,m]};_=(e,t)=>{let n=document.getElementById(e);for(;n.children.length;)n.lastChild.remove();for(let a of t){let s=document.createElement("li");s.textContent=a,n.appendChild(s)}n.previousElementSibling.classList.toggle("empty-spoiler",!t.length)},be=e=>{let t=e.getElementsByClassName("flag-body")[0];t&&t.remove();let[n,a]=e.textContent.split(/:\s*/),s=document.createElement("input");s.type="checkbox",s.id=`flag-${n}`,s.dataset.flag=n,s.dataset.mode="false",e.parentElement.insertBefore(s,e);let o=document.createElement("label");o.textContent=n,o.htmlFor=s.id,e.parentElement.insertBefore(o,e);let l=document.createElement("div");e.parentElement.insertBefore(l,e);let i=document.createElement("label");i.textContent=a,i.htmlFor=s.id,l.appendChild(i),t&&l.appendChild(t),e.classList.contains("hard")&&(o.classList.add("hard"),i.classList.add("hard"),i.textContent+=" *"),e.remove(),s.addEventListener("change",()=>{window.FLAGS=y;let c=y.toggle(n);c?c===!0?(s.checked=!0,o.textContent=n):(s.checked=!0,o.textContent=`${n[0]}${c}${n.substring(1)}`):(s.checked=!1,o.textContent=n),L()})},L=()=>{document.body.classList.remove("failure"),document.body.classList.remove("invalid");for(let n of document.querySelectorAll("input[data-flag]")){let a=n.dataset.flag,s=y.get(a);n.checked=s!==!1;let o=typeof s=="boolean"?"":s;n.nextElementSibling.textContent=`${a[0]}${o}${a.substring(1)}`}let e=String(y).replace(/ /g,"");document.getElementById("seed").value=v||"";let t=["#flags=",e];if(v&&t.push("&seed=",encodeURIComponent(v)),J&&t.push("&debug"),history.replaceState({flags:String(y),seed:v},"",String(window.location).replace(/#.*/,"")+t.join("")),I=="stable"||I=="rc"){let n=v||Math.floor(Math.random()*4294967296).toString(16),a=D,s=e;document.getElementById("race").href=`/${a}/race#flags=${s}&seed=${n}`}Ce()},Ce=()=>{let e=String(y);document.body.classList.toggle("spoiled",y.check("Ds")),document.body.classList.toggle("debug-mode",/D/.test(e));for(let t of document.getElementsByClassName("flagstring-out"))t.textContent=e},Le=()=>{let e=window.localStorage.getItem("name"),t=window.localStorage.getItem("rom"),n=document.getElementById("pick-file"),a=()=>{document.body.classList.add("rom-uploaded"),document.body.classList.toggle("rom-broken",Q(T)!=te)};e&&t&&(q=e,T=Uint8Array.from(new Array(t.length/2).fill(0).map((s,o)=>Number.parseInt(t[2*o]+t[2*o+1],16))),a()),n.addEventListener("change",()=>{let s=n.files[0],o=new FileReader;o.addEventListener("loadend",()=>{let l=new Uint8Array(o.result),i=16+(l[6]&4?512:0)+(l[4]<<14)+(l[5]<<13),c=l.slice(0,i),m=Array.from(c,p=>p.toString(16).padStart(2,0)).join("");T=c,window.localStorage.setItem("rom",m),window.localStorage.setItem("name",s.name),a(),q=s.name}),o.readAsArrayBuffer(s)})},Ie=()=>{let e=window.localStorage.getItem("simea-replacement"),t=document.getElementsByName("simea-replacement");for(let a of t)a.value==e&&(a.checked=!0);t.forEach(a=>{a.addEventListener("change",s=>{window.localStorage.setItem("simea-replacement",s.target.value)})}),M();let n=document.getElementById("upload-sprite");n.addEventListener("change",()=>{let a=n.files[0],s=new FileReader;s.addEventListener("loadend",()=>{let o=window.localStorage.getItem("simea-replacement-custom")||"{}",l=JSON.parse(o,Be),i=s.result,c=a.name.replace(/\.[^/.]+$/,"").replaceAll(/_/g," ");F.init(c,"simea",re(a.name,i),`Loaded on ${new Date().toLocaleString()}`).then(m=>{l[c]=m,window.localStorage.setItem("simea-replacement-custom",JSON.stringify(l,ke)),M()}),n.value=""}),s.readAsText(a)})};Te=(e,t)=>{let n=document.createElement("a");document.body.appendChild(n),n.style="display: none";let a=new Blob([e],{type:"octet/stream"}),s=window.URL.createObjectURL(a);n.href=s,n.download=t,n.click(),window.URL.revokeObjectURL(s),n.remove()};Ve()});we();export{ke as addMapReplacement,Be as addMapRestorement,Te as download,T as rom};
