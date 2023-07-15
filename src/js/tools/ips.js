/* IPS module for Rom Patcher JS v20220417 - Marc Robledo 2016-2022 - http://www.marcrobledo.com/license */
/* File format specification: http://www.smwiki.net/wiki/IPS_file_format */



const IPS_MAGIC='PATCH';
const IPS_MAX_SIZE=0x1000000; //16 megabytes
const IPS_RECORD_RLE=0x0000;
const IPS_RECORD_SIMPLE=0x01;

function IPS(){
	this.records=[];
	this.truncate=false;
}
IPS.prototype.addSimpleRecord=function(o, d){
	this.records.push({offset:o, type:IPS_RECORD_SIMPLE, length:d.length, data:d})
}
IPS.prototype.addRLERecord=function(o, l, b){
	this.records.push({offset:o, type:IPS_RECORD_RLE, length:l, byte:b})
}
IPS.prototype.toString=function(){
	nSimpleRecords=0;
	nRLERecords=0;
	for(var i=0; i<this.records.length; i++){
		if(this.records[i].type===IPS_RECORD_RLE)
			nRLERecords++;
		else
			nSimpleRecords++;
	}
	var s='Simple records: '+nSimpleRecords;
	s+='\nRLE records: '+nRLERecords;
	s+='\nTotal records: '+this.records.length;
	if(this.truncate)
		s+='\nTruncate at: 0x'+this.truncate.toString(16);
	return s
}
IPS.prototype.export=function(fileName){
	var patchFileSize=5; //PATCH string
	for(var i=0; i<this.records.length; i++){
		if(this.records[i].type===IPS_RECORD_RLE)
			patchFileSize+=(3+2+2+1); //offset+0x0000+length+RLE byte to be written
		else
			patchFileSize+=(3+2+this.records[i].data.length); //offset+length+data
	}
	patchFileSize+=3; //EOF string
	if(this.truncate)
		patchFileSize+=3; //truncate

	let tempFile=new MarcFile(patchFileSize);
	tempFile.fileName=fileName+'.ips';
	tempFile.writeString(IPS_MAGIC);
	for(var i=0; i<this.records.length; i++){
		var rec=this.records[i];
		tempFile.writeU24(rec.offset);
		if(rec.type===IPS_RECORD_RLE){
			tempFile.writeU16(0x0000);
			tempFile.writeU16(rec.length);
			tempFile.writeU8(rec.byte);
		}else{
			tempFile.writeU16(rec.data.length);
			tempFile.writeBytes(rec.data);
		}
	}

	tempFile.writeString('EOF');
	if(rec.truncate)
		tempFile.writeU24(rec.truncate);


	return tempFile
}
IPS.prototype.apply=function(romFile){
	if(this.truncate){
		if(this.truncate>romFile.fileSize){ //expand (discussed here: https://github.com/marcrobledo/RomPatcher.js/pull/46)
			tempFile=new MarcFile(this.truncate);
			romFile.copyToFile(tempFile, 0, romFile.fileSize, 0);
		}else{ //truncate
			tempFile=romFile.slice(0, this.truncate);
		}
	}else{
		//calculate target ROM size, expanding it if any record offset is beyond target ROM size
		var newFileSize=romFile.fileSize;
		for(var i=0; i<this.records.length; i++){
			var rec=this.records[i];
			if(rec.type===IPS_RECORD_RLE){
				if(rec.offset+rec.length>newFileSize){
					newFileSize=rec.offset+rec.length;
				}
			}else{
				if(rec.offset+rec.data.length>newFileSize){
					newFileSize=rec.offset+rec.data.length;
				}
			}
		}

		if(newFileSize===romFile.fileSize){
			tempFile=romFile.slice(0, romFile.fileSize);
		}else{
			tempFile=new MarcFile(newFileSize);
			romFile.copyToFile(tempFile,0);
		}
	}


	romFile.seek(0);

	for(var i=0; i<this.records.length; i++){
		tempFile.seek(this.records[i].offset);
		if(this.records[i].type===IPS_RECORD_RLE){
			for(var j=0; j<this.records[i].length; j++)
				tempFile.writeU8(this.records[i].byte);
		}else{
			tempFile.writeBytes(this.records[i].data);
		} 
	}

	return tempFile
}




export function parseIPSFile(file){
	var patchFile=new IPS();
	file.seek(5);

	while(!file.isEOF()){
		var offset=file.readU24();

		if(offset===0x454f46){ /* EOF */
			if(file.isEOF()){
				break;
			}else if((file.offset+3)===file.fileSize){
				patchFile.truncate=file.readU24();
				break;
			}
		}

		var length=file.readU16();

		if(length===IPS_RECORD_RLE){
			patchFile.addRLERecord(offset, file.readU16(), file.readU8());
		}else{
			patchFile.addSimpleRecord(offset, file.readBytes(length));
		}
	}
	return patchFile;
}


export function createIPSFromFiles(original, modified){
	var patch=new IPS();

	if(modified.fileSize<original.fileSize){
		patch.truncate=modified.fileSize;
	}

	//solucion: guardar startOffset y endOffset (ir mirando de 6 en 6 hacia atrás)
	var previousRecord={type:0xdeadbeef,startOffset:0,length:0};
	while(!modified.isEOF()){
		var b1=original.isEOF()?0x00:original.readU8();
		var b2=modified.readU8();

		if(b1!==b2){
			var RLEmode=true;
			var differentData=[];
			var startOffset=modified.offset-1;

			while(b1!==b2 && differentData.length<0xffff){
				differentData.push(b2);
				if(b2!==differentData[0])
					RLEmode=false;

				if(modified.isEOF() || differentData.length===0xffff)
					break;

				b1=original.isEOF()?0x00:original.readU8();
				b2=modified.readU8();
			}


			//check if this record is near the previous one
			var distance=startOffset-(previousRecord.offset+previousRecord.length);
			if(
				previousRecord.type===IPS_RECORD_SIMPLE &&
				distance<6 && (previousRecord.length+distance+differentData.length)<0xffff
			){
				if(RLEmode && differentData.length>6){
					// separate a potential RLE record
					original.seek(startOffset);
					modified.seek(startOffset);
					previousRecord={type:0xdeadbeef,startOffset:0,length:0};
				}else{
					// merge both records
					while(distance--){
						previousRecord.data.push(modified._u8array[previousRecord.offset+previousRecord.length]);
						previousRecord.length++;
					}
					previousRecord.data=previousRecord.data.concat(differentData);
					previousRecord.length=previousRecord.data.length;
				}
			}else{
				if(startOffset>=IPS_MAX_SIZE){
					throw new Error('files are too big for IPS format');
					return null;
				}

				if(RLEmode && differentData.length>2){
					patch.addRLERecord(startOffset, differentData.length, differentData[0]);
				}else{
					patch.addSimpleRecord(startOffset, differentData);
				}
				previousRecord=patch.records[patch.records.length-1];
			}
		}
	}




	if(modified.fileSize>original.fileSize){
		var lastRecord=patch.records[patch.records.length-1];
		var lastOffset=lastRecord.offset+lastRecord.length;

		if(lastOffset<modified.fileSize){
			patch.addSimpleRecord(modified.fileSize-1, [0x00]);
		}
	}


	return patch
}

/* MODDED VERSION OF MarcFile.js v20230202 - Marc Robledo 2014-2023 - http://www.marcrobledo.com/license */
export function MarcFile(source, onLoad){	
	if(typeof source==='object' && source.files) /* get first file only if source is input with multiple files */
		source=source.files[0];

	this.littleEndian=false;
	this.offset=0;
	this._lastRead=null;

	if(typeof source==='object' && source.name && source.size){ /* source is file */
		if(typeof window.FileReader!=='function')
			throw new Error('Incompatible Browser');

		this.fileName=source.name;
		this.fileType=source.type;
		this.fileSize=source.size;

		this._fileReader=new FileReader();
		this._fileReader.marcFile=this;
		this._fileReader.addEventListener('load',function(){
			this.marcFile._u8array=new Uint8Array(this.result);
			this.marcFile._dataView=new DataView(this.result);

			if(onLoad)
				onLoad.call();
		},false);

		this._fileReader.readAsArrayBuffer(source);



	}else if(typeof source==='object' && typeof source.fileName==='string' && typeof source.littleEndian==='boolean'){ /* source is MarcFile */
		this.fileName=source.fileName;
		this.fileType=source.fileType;
		this.fileSize=source.fileSize;

		var ab=new ArrayBuffer(source);
		this._u8array=new Uint8Array(this.fileType);
		this._dataView=new DataView(this.fileType);
		
		source.copyToFile(this, 0);
		if(onLoad)
			onLoad.call();



	}else if(typeof source==='object' && typeof source.byteLength==='number'){ /* source is ArrayBuffer or TypedArray */
		this.fileName='file.bin';
		this.fileType='application/octet-stream';
		this.fileSize=source.byteLength;

		if(typeof source.buffer !== 'undefined')
			source=source.buffer;
		this._u8array=new Uint8Array(source);
		this._dataView=new DataView(source);

		if(onLoad)
			onLoad.call();



	}else if(typeof source==='number'){ /* source is integer (new empty file) */
		this.fileName='file.bin';
		this.fileType='application/octet-stream';
		this.fileSize=source;

		var ab=new ArrayBuffer(source);
		this._u8array=new Uint8Array(ab);
		this._dataView=new DataView(ab);

		if(onLoad)
			onLoad.call();
	}else{
		throw new Error('Invalid source');
	}
}
MarcFile.IS_MACHINE_LITTLE_ENDIAN=(function(){	/* https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DataView#Endianness */
	var buffer=new ArrayBuffer(2);
	new DataView(buffer).setInt16(0, 256, true /* littleEndian */);
	// Int16Array uses the platform's endianness.
	return new Int16Array(buffer)[0] === 256;
})();



MarcFile.prototype.seek=function(offset){
	this.offset=offset;
}
MarcFile.prototype.skip=function(nBytes){
	this.offset+=nBytes;
}
MarcFile.prototype.isEOF=function(){
	return !(this.offset<this.fileSize)
}

MarcFile.prototype.slice=function(offset, len){
	len=len || (this.fileSize-offset);

	var newFile;

	if(typeof this._u8array.buffer.slice!=='undefined'){
		newFile=new MarcFile(0);
		newFile.fileSize=len;
		newFile._u8array=new Uint8Array(this._u8array.buffer.slice(offset, offset+len));
	}else{
		newFile=new MarcFile(len);
		this.copyToFile(newFile, offset, len, 0);
	}
	newFile.fileName=this.fileName;
	newFile.fileType=this.fileType;
	newFile.littleEndian=this.littleEndian;
	return newFile;
}


MarcFile.prototype.copyToFile=function(target, offsetSource, len, offsetTarget){
	if(typeof offsetTarget==='undefined')
		offsetTarget=offsetSource;

	len=len || (this.fileSize-offsetSource);

	for(var i=0; i<len; i++){
		target._u8array[offsetTarget+i]=this._u8array[offsetSource+i];
	}
}


MarcFile.prototype.save=function(){
	var blob;
	try{
		blob=new Blob([this._u8array],{type:this.fileType});
	}catch(e){
		//old browser, use BlobBuilder
		window.BlobBuilder=window.BlobBuilder || window.WebKitBlobBuilder || window.MozBlobBuilder || window.MSBlobBuilder;
		if(e.name==='InvalidStateError' && window.BlobBuilder){
			var bb=new BlobBuilder();
			bb.append(this._u8array.buffer);
			blob=bb.getBlob(this.fileType);
		}else{
			throw new Error('Incompatible Browser');
			return false;
		}
	}
	saveAs(blob,this.fileName);
}


MarcFile.prototype.getExtension=function(){
	var ext=this.fileName? this.fileName.toLowerCase().match(/\.(\w+)$/) : '';

	return ext? ext[1] : '';
}


MarcFile.prototype.readU8=function(){
	this._lastRead=this._u8array[this.offset];

	this.offset++;
	return this._lastRead
}
MarcFile.prototype.readU16=function(){
	if(this.littleEndian)
		this._lastRead=this._u8array[this.offset] + (this._u8array[this.offset+1] << 8);
	else
		this._lastRead=(this._u8array[this.offset] << 8) + this._u8array[this.offset+1];

	this.offset+=2;
	return this._lastRead >>> 0
}
MarcFile.prototype.readU24=function(){
	if(this.littleEndian)
		this._lastRead=this._u8array[this.offset] + (this._u8array[this.offset+1] << 8) + (this._u8array[this.offset+2] << 16);
	else
		this._lastRead=(this._u8array[this.offset] << 16) + (this._u8array[this.offset+1] << 8) + this._u8array[this.offset+2];

	this.offset+=3;
	return this._lastRead >>> 0
}
MarcFile.prototype.readU32=function(){
	if(this.littleEndian)
		this._lastRead=this._u8array[this.offset] + (this._u8array[this.offset+1] << 8) + (this._u8array[this.offset+2] << 16) + (this._u8array[this.offset+3] << 24);
	else
		this._lastRead=(this._u8array[this.offset] << 24) + (this._u8array[this.offset+1] << 16) + (this._u8array[this.offset+2] << 8) + this._u8array[this.offset+3];

	this.offset+=4;
	return this._lastRead >>> 0
}



MarcFile.prototype.readBytes=function(len){
	this._lastRead=new Array(len);
	for(var i=0; i<len; i++){
		this._lastRead[i]=this._u8array[this.offset+i];
	}

	this.offset+=len;
	return this._lastRead
}

MarcFile.prototype.readString=function(len){
	this._lastRead='';
	for(var i=0;i<len && (this.offset+i)<this.fileSize && this._u8array[this.offset+i]>0;i++)
		this._lastRead=this._lastRead+String.fromCharCode(this._u8array[this.offset+i]);

	this.offset+=len;
	return this._lastRead
}

MarcFile.prototype.writeU8=function(u8){
	this._u8array[this.offset]=u8;

	this.offset++;
}
MarcFile.prototype.writeU16=function(u16){
	if(this.littleEndian){
		this._u8array[this.offset]=u16 & 0xff;
		this._u8array[this.offset+1]=u16 >> 8;
	}else{
		this._u8array[this.offset]=u16 >> 8;
		this._u8array[this.offset+1]=u16 & 0xff;
	}

	this.offset+=2;
}
MarcFile.prototype.writeU24=function(u24){
	if(this.littleEndian){
		this._u8array[this.offset]=u24 & 0x0000ff;
		this._u8array[this.offset+1]=(u24 & 0x00ff00) >> 8;
		this._u8array[this.offset+2]=(u24 & 0xff0000) >> 16;
	}else{
		this._u8array[this.offset]=(u24 & 0xff0000) >> 16;
		this._u8array[this.offset+1]=(u24 & 0x00ff00) >> 8;
		this._u8array[this.offset+2]=u24 & 0x0000ff;
	}

	this.offset+=3;
}
MarcFile.prototype.writeU32=function(u32){
	if(this.littleEndian){
		this._u8array[this.offset]=u32 & 0x000000ff;
		this._u8array[this.offset+1]=(u32 & 0x0000ff00) >> 8;
		this._u8array[this.offset+2]=(u32 & 0x00ff0000) >> 16;
		this._u8array[this.offset+3]=(u32 & 0xff000000) >> 24;
	}else{
		this._u8array[this.offset]=(u32 & 0xff000000) >> 24;
		this._u8array[this.offset+1]=(u32 & 0x00ff0000) >> 16;
		this._u8array[this.offset+2]=(u32 & 0x0000ff00) >> 8;
		this._u8array[this.offset+3]=u32 & 0x000000ff;
	}

	this.offset+=4;
}


MarcFile.prototype.writeBytes=function(a){
	for(var i=0;i<a.length;i++)
		this._u8array[this.offset+i]=a[i]

	this.offset+=a.length;
}

MarcFile.prototype.writeString=function(str,len){
	len=len || str.length;
	for(var i=0;i<str.length && i<len;i++)
		this._u8array[this.offset+i]=str.charCodeAt(i);

	for(;i<len;i++)
		this._u8array[this.offset+i]=0x00;

	this.offset+=len;
}

/* FileSaver.js (source: http://purl.eligrey.com/github/FileSaver.js/blob/master/src/FileSaver.js)
 * A saveAs() FileSaver implementation.
 * 1.3.8
 * 2018-03-22 14:03:47
 *
 * By Eli Grey, https://eligrey.com
 * License: MIT
 *   See https://github.com/eligrey/FileSaver.js/blob/master/LICENSE.md
 */
var saveAs=saveAs||function(c){"use strict";if(!(void 0===c||"undefined"!=typeof navigator&&/MSIE [1-9]\./.test(navigator.userAgent))){var t=c.document,f=function(){return c.URL||c.webkitURL||c},s=t.createElementNS("http://www.w3.org/1999/xhtml","a"),d="download"in s,u=/constructor/i.test(c.HTMLElement)||c.safari,l=/CriOS\/[\d]+/.test(navigator.userAgent),p=c.setImmediate||c.setTimeout,v=function(t){p(function(){throw t},0)},w=function(t){setTimeout(function(){"string"==typeof t?f().revokeObjectURL(t):t.remove()},4e4)},m=function(t){return/^\s*(?:text\/\S*|application\/xml|\S*\/\S*\+xml)\s*;.*charset\s*=\s*utf-8/i.test(t.type)?new Blob([String.fromCharCode(65279),t],{type:t.type}):t},r=function(t,n,e){e||(t=m(t));var r,o=this,a="application/octet-stream"===t.type,i=function(){!function(t,e,n){for(var r=(e=[].concat(e)).length;r--;){var o=t["on"+e[r]];if("function"==typeof o)try{o.call(t,n||t)}catch(t){v(t)}}}(o,"writestart progress write writeend".split(" "))};if(o.readyState=o.INIT,d)return r=f().createObjectURL(t),void p(function(){var t,e;s.href=r,s.download=n,t=s,e=new MouseEvent("click"),t.dispatchEvent(e),i(),w(r),o.readyState=o.DONE},0);!function(){if((l||a&&u)&&c.FileReader){var e=new FileReader;return e.onloadend=function(){var t=l?e.result:e.result.replace(/^data:[^;]*;/,"data:attachment/file;");c.open(t,"_blank")||(c.location.href=t),t=void 0,o.readyState=o.DONE,i()},e.readAsDataURL(t),o.readyState=o.INIT}r||(r=f().createObjectURL(t)),a?c.location.href=r:c.open(r,"_blank")||(c.location.href=r);o.readyState=o.DONE,i(),w(r)}()},e=r.prototype;return"undefined"!=typeof navigator&&navigator.msSaveOrOpenBlob?function(t,e,n){return e=e||t.name||"download",n||(t=m(t)),navigator.msSaveOrOpenBlob(t,e)}:(e.abort=function(){},e.readyState=e.INIT=0,e.WRITING=1,e.DONE=2,e.error=e.onwritestart=e.onprogress=e.onwrite=e.onabort=e.onerror=e.onwriteend=null,function(t,e,n){return new r(t,e||t.name||"download",n)})}}("undefined"!=typeof self&&self||"undefined"!=typeof window&&window||this);
