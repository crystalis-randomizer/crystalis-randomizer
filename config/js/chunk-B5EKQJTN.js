var w=class i{constructor(t,s,h,r,o){if(this.root=t&&t.root?t.root:t,this.data=t?t.data:new Uint32Array(r*o),s==null)throw new Error("bad x");this.x=s,this.y=h,this.w=r,this.h=o}static create(t,s){return new i(null,0,0,t,s)}fill(t){if(this.root)for(let s=0;s<this.h;s++){let h=(this.y+s)*this.root.w+this.x;this.data.subarray(h,h+this.w).fill(t)}else this.data.fill(t|4278190080);return this}draw(t,s,h){if(t<0||t>=this.w||s<0||s>=this.h)return;let r=this.root?this.root.w:this.w;this.data[(this.y+s)*r+this.x+t]=h|4278190080}shift(t,s,h=this.w-t,r=this.h-s){return a(this,this.x+t,this.y+s,h,r),new i(this,this.x+t,this.y+s,h,r)}},a=(i,t,s,h=1,r=1)=>{if(t<i.x||t>=i.x+i.w||s<i.y||s>=i.y+i.h||t+h>i.x+i.w||h<1||s+r>i.y+i.h||r<1)throw new Error(`Out of bounds: ${[t,s,h,r]} vs ${[i.x,i.y,i.w,i.h]}`)};export{w as a};
