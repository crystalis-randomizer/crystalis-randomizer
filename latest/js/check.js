window.global=window;var i=document.getElementById("pick-file");i.addEventListener("change",()=>{let d=i.files[0],c=new FileReader;c.addEventListener("loadend",()=>{let e=new Uint8Array(c.result).slice(16);document.getElementById("filename").textContent=d.name;let n=t(e,161748,12).replace(/\s+$/,"").toLowerCase();document.getElementById("hash").textContent=n;let o=t(e,161772,8).trim().toLowerCase();document.getElementById("seed").textContent=o;let s=t(e,161791,23)+t(e,161792,23);t(e,161839,23).trim()&&(s+=t(e,161839,23)+t(e,161840,23)),document.getElementById("flags").textContent=s;let r=(t(e,161925,4)+t(e,161926,4)).toLowerCase();document.getElementById("checksum").textContent=r;let a=`flags=${s.replace(/ /g,"")}&seed=${o}&crc=${r}`;document.getElementById("query").textContent=a;let l=`https://crystalisrandomizer.com/${/\./.test(n)?n:`sha/${n}`}/#${a}`,m=document.getElementById("permalink");m.href=l,m.textContent=l}),c.readAsArrayBuffer(d)});var t=(d,c,e)=>{let n=[];for(let o=0;o<e;o++)n.push(String.fromCharCode(d[c+2*o]));return n.join("")};
