import{b as O,d as T}from"./chunk-PIDEUWOP.js";var z={};T(z,{MarcFile:()=>s,createIPSFromFiles:()=>A,parseIPSFile:()=>N});function c(){this.records=[],this.truncate=!1}function N(t){var e=new c;for(t.seek(5);!t.isEOF();){var i=t.readU24();if(i===4542278){if(t.isEOF())break;if(t.offset+3===t.fileSize){e.truncate=t.readU24();break}}var r=t.readU16();r===0?e.addRLERecord(i,t.readU16(),t.readU8()):e.addSimpleRecord(i,t.readBytes(r))}return e}function A(t,e){var i=new c;e.fileSize<t.fileSize&&(i.truncate=e.fileSize);for(var r={type:3735928559,startOffset:0,length:0};!e.isEOF();){var f=t.isEOF()?0:t.readU8(),u=e.readU8();if(f!==u){for(var w=!0,n=[],d=e.offset-1;f!==u&&n.length<65535&&(n.push(u),u!==n[0]&&(w=!1),!(e.isEOF()||n.length===65535));)f=t.isEOF()?0:t.readU8(),u=e.readU8();var R=d-(r.offset+r.length);if(r.type===1&&R<6&&r.length+R+n.length<65535)if(w&&n.length>6)t.seek(d),e.seek(d),r={type:3735928559,startOffset:0,length:0};else{for(;R--;)r.data.push(e._u8array[r.offset+r.length]),r.length++;r.data=r.data.concat(n),r.length=r.data.length}else{if(d>=16777216)throw new Error("files are too big for IPS format");w&&n.length>2?i.addRLERecord(d,n.length,n[0]):i.addSimpleRecord(d,n),r=i.records[i.records.length-1]}}}if(e.fileSize>t.fileSize){var S=i.records[i.records.length-1],v=S.offset+S.length;v<e.fileSize&&i.addSimpleRecord(e.fileSize-1,[0])}return i}function s(t,e){if(typeof t=="object"&&t.files&&(t=t.files[0]),this.littleEndian=!1,this.offset=0,this._lastRead=null,typeof t=="object"&&t.name&&t.size){if(typeof window.FileReader!="function")throw new Error("Incompatible Browser");this.fileName=t.name,this.fileType=t.type,this.fileSize=t.size,this._fileReader=new FileReader,this._fileReader.marcFile=this,this._fileReader.addEventListener("load",function(){this.marcFile._u8array=new Uint8Array(this.result),this.marcFile._dataView=new DataView(this.result),e&&e.call()},!1),this._fileReader.readAsArrayBuffer(t)}else if(typeof t=="object"&&typeof t.fileName=="string"&&typeof t.littleEndian=="boolean"){this.fileName=t.fileName,this.fileType=t.fileType,this.fileSize=t.fileSize;var i=new ArrayBuffer(t);this._u8array=new Uint8Array(this.fileType),this._dataView=new DataView(this.fileType),t.copyToFile(this,0),e&&e.call()}else if(typeof t=="object"&&typeof t.byteLength=="number")this.fileName="file.bin",this.fileType="application/octet-stream",this.fileSize=t.byteLength,typeof t.buffer<"u"&&(t=t.buffer),this._u8array=new Uint8Array(t),this._dataView=new DataView(t),e&&e.call();else if(typeof t=="number"){this.fileName="file.bin",this.fileType="application/octet-stream",this.fileSize=t;var i=new ArrayBuffer(t);this._u8array=new Uint8Array(i),this._dataView=new DataView(i),e&&e.call()}else throw new Error("Invalid source")}var F,x,L=O(()=>{F="PATCH";c.prototype.addSimpleRecord=function(t,e){this.records.push({offset:t,type:1,length:e.length,data:e})};c.prototype.addRLERecord=function(t,e,i){this.records.push({offset:t,type:0,length:e,byte:i})};c.prototype.toString=function(){nSimpleRecords=0,nRLERecords=0;for(var t=0;t<this.records.length;t++)this.records[t].type===0?nRLERecords++:nSimpleRecords++;var e="Simple records: "+nSimpleRecords;return e+=`
RLE records: `+nRLERecords,e+=`
Total records: `+this.records.length,this.truncate&&(e+=`
Truncate at: 0x`+this.truncate.toString(16)),e};c.prototype.export=function(t){for(var e=5,i=0;i<this.records.length;i++)this.records[i].type===0?e+=8:e+=5+this.records[i].data.length;e+=3,this.truncate&&(e+=3);let r=new s(e);r.fileName=t+".ips",r.writeString(F);for(var i=0;i<this.records.length;i++){var f=this.records[i];r.writeU24(f.offset),f.type===0?(r.writeU16(0),r.writeU16(f.length),r.writeU8(f.byte)):(r.writeU16(f.data.length),r.writeBytes(f.data))}return r.writeString("EOF"),f.truncate&&r.writeU24(f.truncate),r};c.prototype.apply=function(t){if(this.truncate)this.truncate>t.fileSize?(tempFile=new s(this.truncate),t.copyToFile(tempFile,0,t.fileSize,0)):tempFile=t.slice(0,this.truncate);else{for(var e=t.fileSize,i=0;i<this.records.length;i++){var r=this.records[i];r.type===0?r.offset+r.length>e&&(e=r.offset+r.length):r.offset+r.data.length>e&&(e=r.offset+r.data.length)}e===t.fileSize?tempFile=t.slice(0,t.fileSize):(tempFile=new s(e),t.copyToFile(tempFile,0))}t.seek(0);for(var i=0;i<this.records.length;i++)if(tempFile.seek(this.records[i].offset),this.records[i].type===0)for(var f=0;f<this.records[i].length;f++)tempFile.writeU8(this.records[i].byte);else tempFile.writeBytes(this.records[i].data);return tempFile};s.IS_MACHINE_LITTLE_ENDIAN=function(){var t=new ArrayBuffer(2);return new DataView(t).setInt16(0,256,!0),new Int16Array(t)[0]===256}();s.prototype.seek=function(t){this.offset=t};s.prototype.skip=function(t){this.offset+=t};s.prototype.isEOF=function(){return!(this.offset<this.fileSize)};s.prototype.slice=function(t,e){e=e||this.fileSize-t;var i;return typeof this._u8array.buffer.slice<"u"?(i=new s(0),i.fileSize=e,i._u8array=new Uint8Array(this._u8array.buffer.slice(t,t+e))):(i=new s(e),this.copyToFile(i,t,e,0)),i.fileName=this.fileName,i.fileType=this.fileType,i.littleEndian=this.littleEndian,i};s.prototype.copyToFile=function(t,e,i,r){typeof r>"u"&&(r=e),i=i||this.fileSize-e;for(var f=0;f<i;f++)t._u8array[r+f]=this._u8array[e+f]};s.prototype.save=function(){var t;try{t=new Blob([this._u8array],{type:this.fileType})}catch(i){if(window.BlobBuilder=window.BlobBuilder||window.WebKitBlobBuilder||window.MozBlobBuilder||window.MSBlobBuilder,i.name==="InvalidStateError"&&window.BlobBuilder){var e=new BlobBuilder;e.append(this._u8array.buffer),t=e.getBlob(this.fileType)}else throw new Error("Incompatible Browser")}x(t,this.fileName)};s.prototype.getExtension=function(){var t=this.fileName?this.fileName.toLowerCase().match(/\.(\w+)$/):"";return t?t[1]:""};s.prototype.readU8=function(){return this._lastRead=this._u8array[this.offset],this.offset++,this._lastRead};s.prototype.readU16=function(){return this.littleEndian?this._lastRead=this._u8array[this.offset]+(this._u8array[this.offset+1]<<8):this._lastRead=(this._u8array[this.offset]<<8)+this._u8array[this.offset+1],this.offset+=2,this._lastRead>>>0};s.prototype.readU24=function(){return this.littleEndian?this._lastRead=this._u8array[this.offset]+(this._u8array[this.offset+1]<<8)+(this._u8array[this.offset+2]<<16):this._lastRead=(this._u8array[this.offset]<<16)+(this._u8array[this.offset+1]<<8)+this._u8array[this.offset+2],this.offset+=3,this._lastRead>>>0};s.prototype.readU32=function(){return this.littleEndian?this._lastRead=this._u8array[this.offset]+(this._u8array[this.offset+1]<<8)+(this._u8array[this.offset+2]<<16)+(this._u8array[this.offset+3]<<24):this._lastRead=(this._u8array[this.offset]<<24)+(this._u8array[this.offset+1]<<16)+(this._u8array[this.offset+2]<<8)+this._u8array[this.offset+3],this.offset+=4,this._lastRead>>>0};s.prototype.readBytes=function(t){this._lastRead=new Array(t);for(var e=0;e<t;e++)this._lastRead[e]=this._u8array[this.offset+e];return this.offset+=t,this._lastRead};s.prototype.readString=function(t){this._lastRead="";for(var e=0;e<t&&this.offset+e<this.fileSize&&this._u8array[this.offset+e]>0;e++)this._lastRead=this._lastRead+String.fromCharCode(this._u8array[this.offset+e]);return this.offset+=t,this._lastRead};s.prototype.writeU8=function(t){this._u8array[this.offset]=t,this.offset++};s.prototype.writeU16=function(t){this.littleEndian?(this._u8array[this.offset]=t&255,this._u8array[this.offset+1]=t>>8):(this._u8array[this.offset]=t>>8,this._u8array[this.offset+1]=t&255),this.offset+=2};s.prototype.writeU24=function(t){this.littleEndian?(this._u8array[this.offset]=t&255,this._u8array[this.offset+1]=(t&65280)>>8,this._u8array[this.offset+2]=(t&16711680)>>16):(this._u8array[this.offset]=(t&16711680)>>16,this._u8array[this.offset+1]=(t&65280)>>8,this._u8array[this.offset+2]=t&255),this.offset+=3};s.prototype.writeU32=function(t){this.littleEndian?(this._u8array[this.offset]=t&255,this._u8array[this.offset+1]=(t&65280)>>8,this._u8array[this.offset+2]=(t&16711680)>>16,this._u8array[this.offset+3]=(t&4278190080)>>24):(this._u8array[this.offset]=(t&4278190080)>>24,this._u8array[this.offset+1]=(t&16711680)>>16,this._u8array[this.offset+2]=(t&65280)>>8,this._u8array[this.offset+3]=t&255),this.offset+=4};s.prototype.writeBytes=function(t){for(var e=0;e<t.length;e++)this._u8array[this.offset+e]=t[e];this.offset+=t.length};s.prototype.writeString=function(t,e){e=e||t.length;for(var i=0;i<t.length&&i<e;i++)this._u8array[this.offset+i]=t.charCodeAt(i);for(;i<e;i++)this._u8array[this.offset+i]=0;this.offset+=e};x=x||function(t){"use strict";if(!(t===void 0||typeof navigator<"u"&&/MSIE [1-9]\./.test(navigator.userAgent))){var e=t.document,i=function(){return t.URL||t.webkitURL||t},r=e.createElementNS("http://www.w3.org/1999/xhtml","a"),f="download"in r,u=/constructor/i.test(t.HTMLElement)||t.safari,w=/CriOS\/[\d]+/.test(navigator.userAgent),n=t.setImmediate||t.setTimeout,d=function(a){n(function(){throw a},0)},R=function(a){setTimeout(function(){typeof a=="string"?i().revokeObjectURL(a):a.remove()},4e4)},S=function(a){return/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(a.type)?new Blob(["\uFEFF",a],{type:a.type}):a},v=function(a,_,E){E||(a=S(a));var p,h=this,b=a.type==="application/octet-stream",g=function(){(function(l,y,U){for(var I=(y=[].concat(y)).length;I--;){var m=l["on"+y[I]];if(typeof m=="function")try{m.call(l,U||l)}catch(B){d(B)}}})(h,"writestart progress write writeend".split(" "))};if(h.readyState=h.INIT,f)return p=i().createObjectURL(a),void n(function(){var l,y;r.href=p,r.download=_,l=r,y=new MouseEvent("click"),l.dispatchEvent(y),g(),R(p),h.readyState=h.DONE},0);(function(){if((w||b&&u)&&t.FileReader){var l=new FileReader;return l.onloadend=function(){var y=w?l.result:l.result.replace(/^data:[^;]*;/,"data:attachment/file;");t.open(y,"_blank")||(t.location.href=y),y=void 0,h.readyState=h.DONE,g()},l.readAsDataURL(a),h.readyState=h.INIT}p||(p=i().createObjectURL(a)),b?t.location.href=p:t.open(p,"_blank")||(t.location.href=p),h.readyState=h.DONE,g(),R(p)})()},o=v.prototype;return typeof navigator<"u"&&navigator.msSaveOrOpenBlob?function(a,_,E){return _=_||a.name||"download",E||(a=S(a)),navigator.msSaveOrOpenBlob(a,_)}:(o.abort=function(){},o.readyState=o.INIT=0,o.WRITING=1,o.DONE=2,o.error=o.onwritestart=o.onprogress=o.onwrite=o.onabort=o.onerror=o.onwriteend=null,function(a,_,E){return new v(a,_||a.name||"download",E)})}}(typeof self<"u"&&self||typeof window<"u"&&window||void 0)});export{N as a,A as b,s as c,z as d,L as e};
