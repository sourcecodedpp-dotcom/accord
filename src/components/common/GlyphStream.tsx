"use client";

import React, { forwardRef, useEffect, useImperativeHandle, useRef, useSyncExternalStore } from "react";

// Math & Color Utilities for GlyphStream
const h = 2 * Math.PI;
const c = 1 / 120;
const u = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const d = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';
const p = { r: 82, g: 39, b: 255, a: 1 };
const m = { r: 255, g: 159, b: 252, a: 1 };
const f = (e: number, t: number, a: number) => Math.min(a, Math.max(t, e));
const y = (e: any, t: number) => Number.isFinite(e) ? e : t;
const x = (e: number, t: number, a: number) => {
  const n = f((a - e) / (t - e), 0, 1);
  return n * n * (3 - 2 * n);
};
const g = new Float64Array(2);
const b = (e: number, t: number, a: number, n: number, r: number, l: number) => {
  const i = t + (n * n * (a - e) - 2 * r * n * t) * l;
  g[0] = e + i * l;
  g[1] = i;
};

let v: CanvasRenderingContext2D | null = null;
const w = (e: string, t: any) => {
  if (typeof document === "undefined" || !e || (typeof CSS !== "undefined" && typeof CSS.supports === "function" && !CSS.supports("color", e))) return t;
  if (!v) {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    v = canvas.getContext("2d", { willReadFrequently: true });
  }
  if (!v) return t;
  v.clearRect(0, 0, 1, 1);
  v.fillStyle = "#000";
  v.fillStyle = e;
  v.fillRect(0, 0, 1, 1);
  const data = v.getImageData(0, 0, 1, 1).data;
  return { r: data[0], g: data[1], b: data[2], a: data[3] / 255 };
};

const M = (e: number) => {
  const t = e / 255;
  return t <= 0.04045 ? t / 12.92 : Math.pow((t + 0.055) / 1.055, 2.4);
};

const S = (e: number) => {
  const t = f(e, 0, 1);
  return Math.round((t <= 0.0031308 ? 12.92 * t : 1.055 * Math.pow(t, 1 / 2.4) - 0.055) * 255);
};

const F = (e: any) => {
  const t = M(e.r), a = M(e.g), n = M(e.b);
  const r = Math.cbrt(0.4122214708 * t + 0.5363325363 * a + 0.0514459929 * n);
  const l = Math.cbrt(0.2119034982 * t + 0.6806995451 * a + 0.1073969566 * n);
  const i = Math.cbrt(0.0883024619 * t + 0.2817188376 * a + 0.6299787005 * n);
  return [
    0.2104542553 * r + 0.793617785 * l - 0.0040720468 * i,
    1.9779984951 * r - 2.428592205 * l + 0.4505937099 * i,
    0.0259040371 * r + 0.7827717662 * l - 0.808675766 * i
  ];
};

const A = (e: any) => {
  const t = Math.pow(e[0] + 0.3963377774 * e[1] + 0.2158037573 * e[2], 3);
  const a = Math.pow(e[0] - 0.1055613458 * e[1] - 0.0638541728 * e[2], 3);
  const n = Math.pow(e[0] - 0.0894841775 * e[1] - 1.291485548 * e[2], 3);
  return {
    r: S(4.0767416621 * t - 3.3077115913 * a + 0.2309699292 * n),
    g: S(-1.2684380046 * t + 2.6097574011 * a - 0.3413193965 * n),
    b: S(-0.0041960863 * t - 0.7034186147 * a + 1.707614701 * n)
  };
};

const C = (e: any) => {
  if (typeof window === "undefined") return () => {};
  const t = window.matchMedia("(prefers-reduced-motion: reduce)");
  t.addEventListener("change", e);
  return () => t.removeEventListener("change", e);
};

const k = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const createEngine = ((e,t,a)=>{let n,r=t.getContext("2d");if(!r){let e=()=>void 0;return{sync:e,splash:e,clear:e,replay:e,destroy:e}}let l=e.ownerDocument,i=l.defaultView??window,o=i.matchMedia("(pointer: fine)"),s=(n=0x2c9277b5,()=>{let e=n=n+0x6d2b79f5>>>0;return e=Math.imul(e^e>>>15,1|e),(((e^=e+Math.imul(e^e>>>7,61|e))^e>>>14)>>>0)/0x100000000}),v=0,M=0,S=!1,C=!0,k=!1,j=!0,E=1,L=1,R=0,I=0,z=0,T=0,$=1,D=14,N=0,U=0,B=0,P=0,G=new Float32Array(0),q=new Float32Array(0),H=new Float32Array(0),X=new Int32Array(0),Y=new Int32Array(0),W=new Uint16Array(0),O=new Uint8Array(0),V=new Int32Array(0),K=new Uint16Array(0),_=new Float32Array(0),Z=new Int32Array(513),J=new Int32Array(513),Q=new Int32Array(0),ee=0,et=0,ea=-1,en=-1,er="",el=Array(512).fill("rgba(0,0,0,0)"),ei=null,eo="",es=1,eh=1,ec=1,eu="none",ed=0,ep=1,em=-1,ef=0,ey=new Float32Array(1800),ex=new Float32Array(1800),eg=new Float32Array(1800),eb=new Float32Array(1800),ev=new Float32Array(1800),ew=new Float32Array(1800),eM=new Float32Array(1800),eS=new Float32Array(1800),eF=new Float64Array(1800),eA=new Float32Array(1800),eC=new Float32Array(1800),ek=new Float32Array(1800),ej=new Int32Array(1800),eE=new Int32Array(1800),eL=0,eR=0,eI=new Float32Array(600),ez=new Float32Array(600),eT=new Float32Array(600),e$=new Float32Array(600),eD=new Float32Array(600),eN=new Float32Array(600),eU=new Float64Array(600),eB=new Float32Array(600),eP=new Float32Array(600),eG=new Int32Array(600),eq=0,eH=0,eX={x:0,y:0,vx:0,vy:0,on:!1,carry:0,arc:0,stroke:0,phase:0},eY={x:0,y:0,clientX:0,clientY:0,inside:!1,seen:!1,leftAt:-1e9},eW={x:0,y:0,at:0,live:!1},eO={clock:0,phase:40*s(),ox:0,oy:0,offsetAt:0,nextSplash:0},eV={on:!1,t0:0,duration:1.5,ax:0,ay:0,bx:0,by:0,cx:0,cy:0,ex:0,ey:0,finish:!1},eK=e=>(eL-eR+e+1800)%1800,e_=e=>(eq-eH+e+600)%600,eZ=()=>{let e=a.current;return e.interactive&&!e.disabled&&!e.reduced&&o.matches},eJ=()=>3*D*f(y(a.current.thickness,.7),.2,3),eQ=()=>Math.max(2,.42*D),e0=()=>{let n=e.getBoundingClientRect(),r=Math.max(1,n.width),l=Math.max(1,n.height),o=Math.round(f(y(a.current.cellSize,14),6,64)),s=Math.max(1,Math.ceil(Math.min(r,Math.max(1,i.innerWidth)))),h=Math.max(1,Math.ceil(Math.min(l,Math.max(1,i.innerHeight)))),c=Math.floor(f(-n.left,0,Math.max(0,r-s))),u=Math.floor(f(-n.top,0,Math.max(0,l-h))),d=f(i.devicePixelRatio||1,1,2),p=o!==D||Math.abs(r-E)>.5||Math.abs(l-L)>.5||!N,m=s!==z||h!==T||d!==$,x=c!==R||u!==I;if(E=r,L=l,z=s,T=h,R=c,I=u,d!==$&&(eo=""),$=d,p){o!==D&&(eo=""),N=Math.ceil(E/(D=o))+1,U=Math.ceil(L/D)+1,B=Math.floor((E-N*D)/2),P=Math.floor((L-U*D)/2);let e=N*U;G=new Float32Array(e),q=new Float32Array(e),H=new Float32Array(e),X=new Int32Array(e),Y=new Int32Array(e),W=new Uint16Array(e),O=new Uint8Array(e),ee=0,et=0,ea=-1,en=-1}return m&&(t.width=Math.max(1,Math.round(z*$)),t.height=Math.max(1,Math.round(T*$)),t.style.width=`${z}px`,t.style.height=`${T}px`,j=!0),(m||x)&&(t.style.transform=`translate3d(${R}px, ${I}px, 0)`),p||m||x},e1=()=>{let t=a.current,n="",r=t=>{let a=(t??"").trim();return a&&"currentcolor"!==a.toLowerCase()?a:(n||(n=i.getComputedStyle(e).color),n)},o=Array.isArray(t.colors)?t.colors:[],s=r(o[0]),h=r(o[1]??o[0]),c=r(t.glyphColor),x=f(y(t.sheen,.45),0,1),g=`${s}|${h}|${x}`;if(g!==er){er=g;let e=w(s,p),t=w(h,m),a=F(e),n=F(t);for(let r=0;r<32;r++){let l=r/31,i=e.a+(t.a-e.a)*l;for(let e=0;e<4;e++){let t=e/3*x,o=[a[0]+(n[0]-a[0])*l,a[1]+(n[1]-a[1])*l,a[2]+(n[2]-a[2])*l];o[0]+=(1-o[0])*t*.55,o[1]*=1-.35*t,o[2]*=1-.35*t;let s=A(o);for(let t=0;t<4;t++){let a=(t+1)/4*i;el[(4*r+e)*4+t]=`rgba(${s.r},${s.g},${s.b},${a.toFixed(3)})`}}}}let b=Array.from(t.characters||u).filter(e=>e.trim().length>0),v=b.length?b:Array.from(u),M=f(y(t.glyphScale,.62),0,1),S=t.fontFamily?.trim()||d,C=`${v.join("")}|${D}|${$}|${M}|${S}|${c}`;if(C===eo)return;eo=C,ec=v.length,es=Math.max(4,Math.ceil(D*$)),eh=Math.min(16,v.length);let k=Math.ceil(v.length/eh),j=ei??l.createElement("canvas");j.width=eh*es,j.height=k*es;let E=j.getContext("2d");if(ei=j,!E||(E.clearRect(0,0,j.width,j.height),M<=0))return;let L=w(c,{r:255,g:255,b:255,a:1});E.fillStyle=`rgba(${L.r},${L.g},${L.b},${L.a})`,E.font=`500 ${Math.max(1,D*M*$)}px ${S}`,E.textAlign="center",E.textBaseline="alphabetic",v.forEach((e,t)=>{let a=E.measureText(e),n=a.actualBoundingBoxAscent||D*M*$*.72,r=a.actualBoundingBoxDescent||0,l=(t%eh+.5)*es,i=Math.floor(t/eh)*es+es/2+(n-r)/2;E.fillText(e,l,i)})},e5=(e,t,n,r,l,i)=>{let o=a.current,h=eL;eL=(eL+1)%1800,eR<1800&&(eR+=1);let c=.5+.62*x(40,900,l)-.18*x(1400,2800,l),u=1.6*(eJ()*c*(.94+.12*s())),d=l>1?-r/l:0,p=l>1?n/l:0,m=(s()-.5)*D*.32,g=.62*f(y(o.momentum,.7),0,1),b=(s()-.5)*l*.05;ey[h]=e+d*m,ex[h]=t+p*m,eg[h]=n*g+d*b,eb[h]=r*g+p*b,eM[h]=.35*eQ()/(.16155*u),eS[h]=u,eF[h]=i,eA[h]=1.35*f(y(a.current.trailLength,.85),.1,6)*(.92+.16*s()),eC[h]=eX.arc,ek[h]=eX.phase,ej[h]=eX.stroke,eE[h]=ep++},e2=(e,t,a,n,r,l,i,o,s)=>{let h=eq;eq=(eq+1)%600,eH<600&&(eH+=1),eI[h]=e,ez[h]=t,eT[h]=a,e$[h]=n,eD[h]=l,eN[h]=1.6*r,eU[h]=s,eB[h]=i,eP[h]=o,eG[h]=ep++},e3=(e,t,n,r)=>{let l=a.current;if(l.disabled||l.reduced)return;let i=f(y(l.splashSize,1.2),.2,3)*r,o=Math.sqrt(D/14),c=Math.round(10+6*i),u=s()*h;for(let a=0;a<c;a++){let r=u+a/c*h+(s()-.5)*.5,l=(380+260*s())*Math.sqrt(i)*o;e2(e,t,Math.cos(r)*l,Math.sin(r)*l,D*(.8+.5*s())*Math.sqrt(i),1.54*(.9+.3*s()),.75+.45*s(),3.6,n)}for(let a=0;a<Math.round(4+3*i);a++){let a=s()*h,r=(650+250*s())*Math.sqrt(i)*o;e2(e,t,Math.cos(a)*r,Math.sin(a)*r,.55*D,1.54,.55+.25*s(),3.2,n)}e2(e,t,0,0,2.4*D*Math.sqrt(i),1.54,.38,0,n),tt()},e6=e=>{let t=a.current,n=.37*z,r=.31*T,l=1.05*e*f(760/Math.max(1,Math.hypot(1.24*n,.88*r)),.8,4.5)*f(y(t.autoplaySpeed,1),.1,4)+eO.phase,i=Math.exp(-(e-eO.offsetAt)/.75);return{x:R+z/2+n*(.64*Math.sin(.83*l+.3)+.36*Math.sin(1.97*l+1.7))+eO.ox*i,y:I+T/2+r*(.6*Math.sin(1.13*l+2.1)+.4*Math.sin(.51*l+.4))+eO.oy*i}},e8=e=>{eV.on=!0,eV.t0=e,eV.duration=1.6,eV.ax=R-3*D,eV.ay=I+.66*T,eV.bx=R+.32*z,eV.by=I+.12*T,eV.cx=R+.54*z,eV.cy=I+.98*T,eV.ex=R+.8*z,eV.ey=I+.4*T,eV.finish=!0},e4=(e,t)=>{eX.x=e,eX.y=t,eX.vx=0,eX.vy=0,eX.carry=0,eX.on=!0,eX.stroke=ed+=1,eX.phase=s()*h},e9=(e,t)=>{let n,r,l,i,o,s,h,c=a.current,u="pointer"===eu?{x:eY.x,y:eY.y}:"script"===eu?(i=(l=1-(r=(n=f((t-eV.t0)/eV.duration,0,1))<.5?4*n*n*n:1-Math.pow(2-2*n,3)/2))*l*l,o=3*l*l*r,s=3*l*r*r,h=r*r*r,{x:i*eV.ax+o*eV.bx+s*eV.cx+h*eV.ex,y:i*eV.ay+o*eV.by+s*eV.cy+h*eV.ey}):"ghost"===eu?e6(eO.clock):null;if(!u||!eX.on)return;let d=46-37*f(y(c.smoothing,.45),0,1),p=1-.55*f(y(c.wobble,.35),0,1),m=eX.x,x=eX.y;b(eX.x,eX.vx,u.x,d,p,e),eX.x=g[0],eX.vx=g[1],b(eX.y,eX.vy,u.y,d,p,e),eX.y=g[0],eX.vy=g[1];let v=eX.x-m,w=eX.y-x,M=Math.hypot(v,w),S=Math.hypot(eX.vx,eX.vy);if(M<=0||S<14){eX.carry=Math.min(eX.carry,eQ());return}let F=eQ(),A=F-eX.carry;for(;A<=M;){let e=A/M;eX.arc+=F,e5(m+v*e,x+w*e,eX.vx,eX.vy,S,t),A+=F}eX.carry=M-(A-F)},e7=(e,t)=>{let n=a.current,r=Math.exp(-e*(1.2+8.8*f(y(n.viscosity,.15),0,1))),l=95*f(y(n.tension,.15),0,1);for(;eR>0;){let e=eK(0);if(t-eF[e]<eA[e])break;eR-=1}for(let e=0;e<eR;e++){let t=eK(e),a=e>0?eK(e-1):-1,n=e<eR-1?eK(e+1):-1,r=a>=0&&ej[a]===ej[t],i=n>=0&&ej[n]===ej[t],o=0,s=0;r&&i?(o=l*(ey[a]+ey[n]-2*ey[t]),s=l*(ex[a]+ex[n]-2*ex[t])):i&&(o=.45*l*(ey[n]-ey[t]),s=.45*l*(ex[n]-ex[t])),ev[t]=o,ew[t]=s}for(let t=0;t<eR;t++){let a=eK(t);eg[a]=(eg[a]+ev[a]*e)*r,eb[a]=(eb[a]+ew[a]*e)*r,ey[a]+=eg[a]*e,ex[a]+=eb[a]*e}for(;eH>0;){let e=e_(0);if(t-eU[e]<eB[e])break;eH-=1}for(let t=0;t<eH;t++){let a=e_(t),n=Math.exp(-e*eP[a]);eT[a]*=n,e$[a]*=n,eI[a]+=eT[a]*e,ez[a]+=e$[a]*e}},te=(e,t,a,n,r,l)=>{if(n<=5e-4)return;let i=a*a,o=1/i,s=Math.max(0,Math.floor((e-a-B)/D)),h=Math.min(N-1,Math.floor((e+a-B)/D)),c=Math.max(0,Math.floor((t-a-P)/D)),u=Math.min(U-1,Math.floor((t+a-P)/D));if(!(s>h)&&!(c>u)){s<ee&&(ee=s),h>ea&&(ea=h),c<et&&(et=c),u>en&&(en=u);for(let a=c;a<=u;a++){let c=P+(a+.5)*D-t,u=c*c;if(u>=i)continue;let d=a*N;for(let t=s;t<=h;t++){let a=B+(t+.5)*D-e,s=a*a+u;if(s>=i)continue;let h=1-s*o,c=n*h*h*h,p=d+t;G[p]+=c,q[p]+=c*r,c>H[p]&&(H[p]=c,X[p]=l)}}}},tt=()=>{S||!C||v||(v=i.requestAnimationFrame(ta))};function ta(e){let n;if(v=0,S)return;let l=a.current,o=M?f((e-M)/1e3,0,.05):1/60;M=e;let u=performance.now()/1e3,d=(n=a.current).disabled||n.reduced?"none":eZ()&&eY.inside?"pointer":eV.on?"script":!n.autoplay||!k||eZ()&&eY.seen&&u-eY.leftAt<Math.max(0,y(n.idleDelay,1.5))?"none":"ghost";d!==eu&&((e,t)=>{let a=eu;if(eu=e,"none"===e){eX.on=!1;return}if("pointer"===e){eV.on=!1,"none"!==a&&eX.on||e4(eY.x,eY.y);return}if("script"===e)return e4(eV.ax,eV.ay);eO.clock=0,eO.offsetAt=0,eO.ox=0,eO.oy=0;let n=e6(0),r="none"===a||!eX.on,l=r?em>=0&&t-em<.6?R-3*D:f(eX.x,R,R+z):eX.x,i=r?em>=0&&t-em<.6?n.y:f(eX.y,I,I+T):eX.y;eO.ox=l-n.x,eO.oy=i-n.y,eO.nextSplash=2.4+1.6*s(),r&&e4(l,i)})(d,u),"ghost"===eu&&(eO.clock+=o,l.splash&&eO.clock>=eO.nextSplash&&(eO.nextSplash=eO.clock+2.6+1.8*s(),e3(eX.x,eX.y,u,.85)));let p=o,m=u-o;for(;p>1e-6;){let e=Math.min(c,p);p-=e,m+=e,e9(e,m),e7(e,m)}"script"===eu&&u-eV.t0>=eV.duration&&(eV.on=!1,eV.finish&&l.splash&&e3(eX.x,eX.y,u,.7));let g=(e=>{let t=.95*f(y(a.current.breakup,.9),0,1),n=h/Math.max(2*D,3.6*eJ()),r=ee,l=ea,i=et,o=en;ee=N,et=U,ea=-1,en=-1;for(let a=0;a<eR;a++){let r=eK(a),l=(e-eF[r])/eA[r];if(l>=1||l<0)continue;let i=Math.pow(1-l,1.4)*(1+.35*Math.exp(-(e-eF[r])/.09)),o=.62*Math.sin(eC[r]*n+ek[r])+.38*Math.sin(eC[r]*n*1.73+2.3*ek[r]),s=Math.max(0,1+t*x(.3,.8,l)*o);te(ey[r],ex[r],eS[r],eM[r]*i*s,l,eE[r])}for(let t=0;t<eH;t++){let a=e_(t),n=(e-eU[a])/eB[a];n>=1||n<0||te(eI[a],ez[a],eN[a],eD[a]*(1-x(.3,1,n)),.1+.9*n,eG[a])}return{prevC0:r,prevC1:l,prevR0:i,prevR1:o}})(u),b=((e,n)=>{let l=a.current,i=f(y(l.edgeSoftness,.6),0,1),o=.35*(1-.62*i),h=.35*(1+.55*i),c=f(y(l.sheen,.45),0,1)>0,u=Math.max(0,y(l.scramble,8)),d=f(y(l.cellGap,2),0,.6*D),p=Math.max(1,D-d),m=f(y(l.cellRadius,3),0,p/2),g=f(y(l.glyphScale,.62),0,1)>0&&ec>0,b=Math.max(ee,Math.floor((R-B)/D)),v=Math.min(ea,Math.floor((R+z-B)/D)),w=Math.max(et,Math.floor((I-P)/D)),M=Math.min(en,Math.floor((I+T-P)/D)),S=0;if(Z.fill(0),b<=v&&w<=M){(e=>{if(V.length>=e)return;let t=Math.max(e,2*V.length,256);V=new Int32Array(t),K=new Uint16Array(t),_=new Float32Array(t)})((v-b+1)*(M-w+1));for(let e=w;e<=M;e++){let t=e*N;for(let a=b;a<=v;a++){let r=t+a,l=G[r];if(l<=o){O[r]=0;continue}let i=h>o?f((l-o)/(h-o),0,1):1,d=q[r]/l,p=Math.round(31*Math.pow(f(d,0,1),.85)),m=0;if(c&&a>0&&a<N-1&&e>0&&e<U-1){let e=G[r+1]-G[r-1],t=G[r+N]-G[r-N],a=Math.hypot(e,t);a>1e-6&&(m=Math.round(3*f((.55*e+.835*t)/a*(1-x(.35,1.1199999999999999,l)),0,1)))}let y=(4*p+m)*4+Math.min(3,Math.floor(4*Math.pow(i,.8)));O[r]?X[r]!==Y[r]?Math.abs(X[r]-Y[r])>=3&&(W[r]=(W[r]+1+Math.floor(3*s()))%ec,Y[r]=X[r]):u>0&&s()<u*n*Math.pow(1-f(d,0,1),3)&&(W[r]=Math.floor(s()*ec)):(W[r]=Math.floor(s()*ec),Y[r]=X[r]),O[r]=1,V[S]=r,K[S]=y,_[S]=i,Z[y+1]+=1,S+=1}}}if(r.setTransform(1,0,0,1,0,0),!S)return j||(r.clearRect(0,0,t.width,t.height),j=!0),0;j=!1,r.clearRect(0,0,t.width,t.height),r.setTransform($,0,0,$,-R*$,-I*$);for(let e=1;e<Z.length;e++)Z[e]+=Z[e-1];Q.length<S&&(Q=new Int32Array(Math.max(S,2*Q.length,256))),J.set(Z);for(let e=0;e<S;e++)Q[J[K[e]]++]=e;let F="function"==typeof r.roundRect&&m>.1,A=0;for(;A<S;){let e=K[Q[A]];for(r.fillStyle=el[e],r.beginPath();A<S&&K[Q[A]]===e;){let e=Q[A],t=V[e],a=.8+.2*_[e],n=p*a,l=t%N,i=(t-l)/N,o=B+(l+.5)*D-n/2,s=P+(i+.5)*D-n/2;F?r.roundRect(o,s,n,n,Math.min(m*a,n/2)):r.rect(o,s,n,n),A+=1}r.fill()}if(g&&ei){for(let e=0;e<S;e++){let t=_[e];if(t<.45)continue;let a=.8+.2*t;r.globalAlpha=x(.45,.95,t);let n=V[e],l=n%N,i=(n-l)/N,o=W[n]%ec,s=D*a;r.drawImage(ei,o%eh*es,Math.floor(o/eh)*es,es,es,B+(l+.5)*D-s/2,P+(i+.5)*D-s/2,s,s)}r.globalAlpha=1}return S})(0,o),w=Math.min(g.prevC0,ee),F=Math.max(g.prevC1,ea),A=Math.min(g.prevR0,et),C=Math.max(g.prevR1,en);for(let e=Math.max(0,A);e<=Math.min(U-1,C);e++){let t=e*N;for(let a=Math.max(0,w);a<=Math.min(N-1,F);a++){let n=t+a;(e<et||e>en||a<ee||a>ea)&&(O[n]=0)}}for(let e=et;e<=en;e++){let t=e*N;for(let e=ee;e<=ea;e++){let a=t+e;G[a]=0,q[a]=0,H[a]=0}}if("none"!==eu||eR>0||eH>0||b>0)return void tt();let E=eY.leftAt+Math.max(0,y(l.idleDelay,1.5));l.autoplay&&!l.reduced&&!l.disabled&&k&&eY.seen&&!eY.inside&&E>u&&(ef&&i.clearTimeout(ef),ef=i.setTimeout(()=>{ef=0,tt()},(E-u)*1e3+20))}let tn=(t,a)=>{let n=e.getBoundingClientRect();eY.clientX=t,eY.clientY=a,eY.x=t-n.left,eY.y=a-n.top},tr=e=>{"touch"!==e.pointerType&&eZ()&&(tn(e.clientX,e.clientY),eY.inside=!0,eY.seen=!0,tt())},tl=e=>{"touch"!==e.pointerType&&eY.inside&&(eY.inside=!1,eY.leftAt=performance.now()/1e3,tt())},ti=e=>{let t=a.current;if(t.splash&&!t.disabled&&!t.reduced){if("touch"===e.pointerType){eW.x=e.clientX,eW.y=e.clientY,eW.at=performance.now()/1e3,eW.live=!0;return}eZ()&&0===e.button&&(tn(e.clientX,e.clientY),e3(eY.x,eY.y,performance.now()/1e3,1))}},to=t=>{if("touch"!==t.pointerType||!eW.live||(eW.live=!1,Math.hypot(t.clientX-eW.x,t.clientY-eW.y)>10||performance.now()/1e3-eW.at>.35))return;let a=e.getBoundingClientRect();e3(t.clientX-a.left,t.clientY-a.top,performance.now()/1e3,1)},ts=()=>{eY.inside&&(eY.inside=!1,eY.leftAt=performance.now()/1e3),eW.live=!1,tt()},th=()=>{let e=e0();eY.inside&&tn(eY.clientX,eY.clientY),(e||eY.inside)&&tt()},tc=()=>{e0(),e1(),tt()},tu=()=>{eo="",e1(),tt()};e.addEventListener("pointermove",tr,{passive:!0}),e.addEventListener("pointerover",tr,{passive:!0}),e.addEventListener("pointerleave",tl),e.addEventListener("pointercancel",tl),e.addEventListener("pointerdown",ti,{passive:!0}),i.addEventListener("pointerup",to,{passive:!0}),i.addEventListener("blur",ts),i.addEventListener("resize",tc,{passive:!0}),i.addEventListener("scroll",th,{passive:!0,capture:!0}),o.addEventListener("change",ts),l.fonts?.addEventListener?.("loadingdone",tu);let td="undefined"==typeof ResizeObserver?null:new ResizeObserver(tc);td?.observe(e);let tp=()=>{if(k)return;k=!0,em=performance.now()/1e3;let e=a.current;!e.intro||e.autoplay||e.reduced||e.disabled||e8(em)},tm="undefined"==typeof IntersectionObserver?null:new IntersectionObserver(([e])=>{(C=e.isIntersecting)?(M=0,e0(),tp(),tt()):v&&(i.cancelAnimationFrame(v),v=0)});return tm?.observe(e),e0(),e1(),tm||tp(),tt(),{sync:()=>{e0(),e1(),tt()},splash:(e,t)=>{e3("number"==typeof e&&Number.isFinite(e)?e:"none"!==eu?eX.x:R+z/2,"number"==typeof t&&Number.isFinite(t)?t:"none"!==eu?eX.y:I+T/2,performance.now()/1e3,1)},clear:()=>{eR=0,eH=0,eX.on=!1,eu="none",eV.on=!1,tt()},replay:()=>{let e=a.current;e.reduced||e.disabled||(em=performance.now()/1e3,e.autoplay?(eu="none",eX.on=!1):e8(em),tt())},destroy:()=>{S=!0,v&&i.cancelAnimationFrame(v),ef&&i.clearTimeout(ef),tm?.disconnect(),td?.disconnect(),e.removeEventListener("pointermove",tr),e.removeEventListener("pointerover",tr),e.removeEventListener("pointerleave",tl),e.removeEventListener("pointercancel",tl),e.removeEventListener("pointerdown",ti),i.removeEventListener("pointerup",to),i.removeEventListener("blur",ts),i.removeEventListener("resize",tc),i.removeEventListener("scroll",th,{capture:!0}),o.removeEventListener("change",ts),l.fonts?.removeEventListener?.("loadingdone",tu)}}});

export interface GlyphStreamProps {
  colors?: string[];
  glyphColor?: string;
  characters?: string;
  fontFamily?: string;
  cellSize?: number;
  cellGap?: number;
  cellRadius?: number;
  glyphScale?: number;
  thickness?: number;
  trailLength?: number;
  smoothing?: number;
  wobble?: number;
  momentum?: number;
  viscosity?: number;
  tension?: number;
  breakup?: number;
  edgeSoftness?: number;
  sheen?: number;
  scramble?: number;
  splash?: boolean;
  splashSize?: number;
  autoplay?: boolean;
  autoplaySpeed?: number;
  idleDelay?: number;
  intro?: boolean;
  interactive?: boolean;
  disabled?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export interface GlyphStreamRef {
  splash: (x?: number, y?: number) => void;
  clear: () => void;
  replay: () => void;
}

export const GlyphStream = forwardRef<GlyphStreamRef, GlyphStreamProps>(function GlyphStream({
  colors = ["#0f172a", "#3b82f6"],
  glyphColor = "rgba(255, 255, 255, 0.9)",
  characters = "010101010101",
  fontFamily = d,
  cellSize = 10,
  cellGap = 1.5,
  cellRadius = 2,
  glyphScale = 0.5,
  thickness = 0.6,
  trailLength = 0.7,
  smoothing = 0.45,
  wobble = 0.25,
  momentum = 0.7,
  viscosity = 0.15,
  tension = 0.15,
  breakup = 0.85,
  edgeSoftness = 0.5,
  sheen = 0.4,
  scramble = 8,
  splash = true,
  splashSize = 1.1,
  autoplay = true,
  autoplaySpeed = 0.8,
  idleDelay = 1.5,
  intro = true,
  interactive = true,
  disabled = false,
  className = "",
  style,
  children
}, ref) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<any>(null);

  const reducedMotion = useSyncExternalStore(C, k, () => false);

  const config = {
    colors,
    glyphColor,
    characters,
    fontFamily,
    cellSize,
    cellGap,
    cellRadius,
    glyphScale,
    thickness,
    trailLength,
    smoothing,
    wobble,
    momentum,
    viscosity,
    tension,
    breakup,
    edgeSoftness,
    sheen,
    scramble,
    splash,
    splashSize,
    autoplay,
    autoplaySpeed,
    idleDelay,
    intro,
    interactive,
    disabled,
    reduced: reducedMotion
  };

  const configRef = useRef(config);

  useEffect(() => {
    configRef.current = config;
    engineRef.current?.sync();
  });

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const engine = createEngine(container, canvas, configRef);
    engineRef.current = engine;

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  useImperativeHandle(ref, () => ({
    splash: (x?: number, y?: number) => engineRef.current?.splash(x, y),
    clear: () => engineRef.current?.clear(),
    replay: () => engineRef.current?.replay()
  }), []);

  return (
    <div
      ref={containerRef}
      className={`relative isolate w-full overflow-hidden ${className}`}
      style={style}
    >
      {children && (
        <div className="relative z-10 h-full w-full pointer-events-none">
          {children}
        </div>
      )}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          overflow: "hidden",
          pointerEvents: "none",
          zIndex: 5
        }}
      >
        <canvas
          ref={canvasRef}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: 0,
            height: 0,
            display: "block"
          }}
        />
      </div>
    </div>
  );
});

GlyphStream.displayName = "GlyphStream";
