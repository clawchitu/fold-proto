// Generator for 第十二行 (章皮 · per-chapter skins) → Letterfold Paper States.dc.html + skins-preview.html
// Reuses gen-ch4.js helpers (phone / FIB / figA / thread4 / creaseW / lean4 / cap) the same way gen-v2c1.js does; glue copied from gen-v2c1.js.
// Runs inside the Claude Design project 「Letterfold 视觉方向设计」 (readFile / saveFile / log are provided there); this is a copy for the record. Spec: docs/design-skins.md §6.
const AF=(async()=>{}).constructor;
const PN='#F7F4EE',P2='#F3EDE2',PL='#F6F3EC',RULE='#545C76',GLUEC='#E8B848',DROPC='#8A5A14';
const LINE='#4A433B',DOOR='#3A3835',DRESS='#AE9D7C',DRESSHC='#D8CFBD',LAMP='#FFD08A',TB='#857868',TS='#5A4A36',STT='#9A8D7B',STB='#7D7163';
const hx=n=>'#'+n.map(v=>Math.round(v).toString(16).padStart(2,'0')).join('').toUpperCase();
const rgb=h=>{const n=parseInt(h.slice(1),16);return [n>>16,(n>>8)&255,n&255];};
const blend=(fg,bg,a)=>{const f=rgb(fg),b=rgb(bg);return hx(f.map((v,i)=>v*a+b[i]*(1-a)));};
const mix=p=>blend('#8A7A62',p,.25);
let gid=0;
const DROP=(col,w,fill='none')=>`<path d="M40 33.5 C 37.6 37.4, 33.8 41.6, 33.8 45.8 A 6.2 6.2 0 0 0 46.2 45.8 C 46.2 41.6, 42.4 37.4, 40 33.5 Z" fill="${fill}" stroke="${col}" stroke-width="${w}" stroke-linejoin="round"/>`;
const glue=hc=>{const i=++gid;return hc
 ?`<defs><pattern id="kgd${i}" width="9" height="9" patternUnits="userSpaceOnUse"><circle cx="4.5" cy="4.5" r="1.25" fill="#000"/></pattern></defs><ellipse cx="40" cy="43.5" rx="23.2" ry="19.2" fill="url(#kgd${i})"/>${DROP('#000',2.6,'#fff')}`
 :`<defs><radialGradient id="kgg${i}" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="${GLUEC}" stop-opacity=".62"/><stop offset=".66" stop-color="${GLUEC}" stop-opacity=".6"/><stop offset="1" stop-color="${GLUEC}" stop-opacity=".22"/></radialGradient><clipPath id="kgc${i}"><ellipse cx="40" cy="43.5" rx="23.2" ry="19.2"/></clipPath></defs><ellipse cx="40" cy="43.5" rx="23.2" ry="19.2" fill="url(#kgg${i})"/><g clip-path="url(#kgc${i})"><ellipse cx="40" cy="40" rx="25" ry="20" fill="none" stroke="#9C6812" stroke-opacity=".34" stroke-width="5"/></g><ellipse cx="27.5" cy="37" rx="4.6" ry="2.2" transform="rotate(-28 27.5 37)" fill="#FFFDF4" fill-opacity=".9"/>${DROP(DROPC,1.6)}`;};
const EXT={};
/* ---- gen-ch4 helpers, patched (base fix on lean tiles + hooks) ---- */
let src=await readFile('tools/gen-ch4.js');
const ix=k=>{const i=src.indexOf(k);if(i<0)throw new Error('anchor '+k);return i;};
src=src.slice(0,ix('/* 2 teach 4-1 */'))+src.slice(ix('/* 5 map */'),ix('/* 7 a11y */'));
const pt=(a,b)=>{const n=src.split(a).length-1;if(n!==1)throw new Error('patch x'+n+': '+a.slice(0,70));src=src.replace(a,()=>b);};
pt("TILE='#E6DED0'","TILE=EXT.TILE||'#E6DED0'");
pt("fib=.1}={})=>`<div style=\"","fib=.1}={})=>`<div data-phone=\"1\" style=\"");
pt("fill=\"${hc?'#fff':LIT}\" stroke=\"${hc?'#000':EDGE}\"","fill=\"${hc?'#fff':LIT}\" stroke=\"${hc?'#000':'#857868'}\"");
pt("transform=\"translate(0 ${R(1.2*k0)})\" fill=\"rgba(60,45,30,.42)\"","transform=\"translate(0 ${R(1*k0)})\" fill=\"#5A4A36\" fill-opacity=\".28\"");
pt("fill=\"${hc?'#fff':TILE}\" stroke=\"${hc?'#000':EDGE}\"","fill=\"${hc?'#fff':TILE}\" stroke=\"${hc?'#000':'#857868'}\"");
pt("for(const kk in m){if(kk[0]!=='T'||m[kk]!=='x')continue;const pts=","for(const kk in m){if(kk[0]!=='T'||m[kk]!=='x'||(o.noSil||[]).includes(kk))continue;const pts=");
pt("if(o.thread){const wp=","if(o.extra)h+=o.extra({loL,loU,Lp,Up,P,Q,k0,m});if(o.thread){const wp=");
pt("const lampPt=o.rcv?","const lampPt=o.lampPt?o.lampPt(Up):o.rcv?");
src+=`\nreturn {R,close,lean4,phone,cap,sub,pill,badge,svgAbs,card0,fromMap,thread4,creaseW,figA,FIB,FLAG,DIMPLE,sil,cr,L,s,SANS,SONG,THR,LIT,RIM,P3,P4,AGED,SHADE};`;
const P3v='#F1E9D8';EXT.TILE=mix(P3v);
const X=await new AF('readFile','saveFile','log','EXT',src)(readFile,saveFile,()=>{},EXT);
const {R,close,phone,cap,sub,pill,badge,svgAbs,figA,FIB,FLAG,DIMPLE,sil,cr,SONG,THR,LIT,P4}=X;
let s=X.s;
/* ---- rule-object art · 80-unit cell, k = units per pt ---- */
const C={sg:'',hh:''};
const DUN='M14 27 Q14 18 23 18 H57 Q66 18 66 27 V61 Q66 66 61 66 H19 Q14 66 14 61 Z';
const BOLL='M25 20 H55 Q58 20 58.6 23 L66 62 Q66.6 66 62 66 H18 Q13.4 66 14 62 L21.4 23 Q22 20 25 20 Z';
const ZHEN='M24 38 H56 Q64 38 64 46 V66 Q64 74 56 74 H24 Q16 74 16 66 V46 Q16 38 24 38 Z';
const LION='M12 68 V27 C 9.5 25.5, 8.6 20.5, 11.2 18.6 C 12 21.6, 13.4 23.4, 16 24 L36 24 Q38.5 20.6 41 23.4 Q44.2 19.4 47 22.8 Q49.6 19 52.6 22.4 Q55 18.4 57.6 19.2 L58.4 15.6 L60.8 18.2 Q62.6 17.6 64.4 18.2 L66.6 15.4 L67.2 19.4 Q69.4 21.4 68 26 V68 Z';
const stoneA=(d,groove)=>(k,hc)=>hc
 ?`<path d="${d}" fill="#fff"/><path d="${d}" fill="url(#${C.hh})" stroke="#000" stroke-width="${R(3*k)}" stroke-linejoin="round"/>${groove?`<path d="M21.5 30.5 H58.5" stroke="#000" stroke-width="${R(2*k)}"/>`:''}`
 :`<path d="${d}" fill="url(#${C.sg})" stroke="${TS}" stroke-opacity=".7" stroke-width="${R(k)}" stroke-linejoin="round"/>${groove?`<path d="M21.5 30.5 H58.5" stroke="${TS}" stroke-opacity=".85" stroke-width="${R(1.2*k)}"/>`:''}`;
const fenceA=(k,hc)=>{const f=hc?'#000':DOOR,nd=hc?'#fff':'#D8CFBD';return `<rect x="13" y="12" width="7" height="56" rx="2" fill="${f}"/><rect x="60" y="12" width="7" height="56" rx="2" fill="${f}"/><rect x="10" y="9" width="60" height="6" rx="2" fill="${f}"/><rect x="13" y="65" width="54" height="3" fill="${f}"/><rect x="20" y="37" width="40" height="5" rx="1.5" fill="${f}"/><path d="M13 30H20M13 52H20M60 30H67M60 52H67M30 9V15M50 9V15" stroke="${nd}" stroke-width="${R(1.2*k)}"/>`;};
const moonA=(k,hc)=>hc?`<circle cx="40" cy="40" r="26" fill="none" stroke="#000" stroke-width="${R(3*k)}"/><rect x="37" y="14" width="6" height="52" fill="#000"/>`:`<path d="M11.5 40 a28.5 28.5 0 1 0 57 0 a28.5 28.5 0 1 0 -57 0 Z M17.2 40 a22.8 22.8 0 1 0 45.6 0 a22.8 22.8 0 1 0 -45.6 0 Z" fill="${DOOR}" fill-rule="evenodd"/><rect x="37" y="17" width="6" height="46" fill="${DOOR}"/>`;
const sluiceA=(k,hc)=>{const f=hc?'#000':DOOR,l=hc?'#fff':'#D8CFBD',w=R(1.2*k);return `<rect x="13" y="13" width="54" height="54" fill="none" stroke="${f}" stroke-width="${R((hc?3:2.6)*k)}"/><rect x="32" y="13" width="16" height="54" fill="${f}"/><path d="M32 23H48M32 31H48M32 39H48" stroke="${l}" stroke-width="${w}"/><path d="M36 46 H40 A6 6 0 0 1 40 58 H36 Z" fill="none" stroke="${l}" stroke-width="${w}"/>`;};
const bambooKey=(k,hc)=>{const l=hc?'#000':LINE,r=hc?'#000':THR;return `<circle cx="22" cy="40" r="6" fill="none" stroke="${r}" stroke-width="${R(2.6*k)}"/><rect x="28.5" y="37.8" width="33" height="4.4" rx="1.2" fill="${l}"/><rect x="41" y="35.4" width="2.6" height="9.2" rx=".8" fill="${l}"/><rect x="52" y="35.4" width="2.6" height="9.2" rx=".8" fill="${l}"/>`;};
const ironKey=(k,hc)=>{const l=hc?'#000':LINE;return `<circle cx="22" cy="38" r="6" fill="none" stroke="${l}" stroke-width="${R(2.6*k)}"/><rect x="28.5" y="35.8" width="32" height="4.4" rx="1" fill="${l}"/><rect x="51" y="40" width="9.5" height="8" fill="${l}"/>`;};
const tokenKey=(k,hc)=>{const l=hc?'#000':LINE,r=hc?'#000':THR;return `<path d="M20 20V33.5" stroke="${l}" stroke-width="1.6" stroke-linecap="round"/><circle cx="20" cy="40" r="6.5" fill="none" stroke="${r}" stroke-width="3"/><rect x="26" y="38" width="20" height="4" rx="1" fill="${l}"/><path d="M45 31 H51 A9 9 0 0 1 51 49 H45 Z" fill="${l}"/><path d="M49.5 34.5V45.5" stroke="${hc?'#fff':'#D8CFBD'}" stroke-width="1.6"/>`;};
const flagA=(k,hc)=>hc?sil(FLAG,'#000'):FLAG;
const lanternA=(k,hc)=>{const b=hc?'#000':'#17120E',w=R(1.4*k);return `<path d="M40 9V16" stroke="${b}" stroke-width="${w}"/><rect x="34" y="15" width="12" height="3.4" rx="1" fill="${b}"/><ellipse cx="40" cy="28" rx="9.5" ry="9.6" fill="${hc?'#000':LAMP}" stroke="${b}" stroke-width="${w}"/><path d="M36 18.8 Q31.5 28 36 37.2 M44 18.8 Q48.5 28 44 37.2 M40 18.4 V37.6" fill="none" stroke="${hc?'#fff':b}" stroke-width="${R(1.2*k)}"/><rect x="34" y="37.4" width="12" height="3.4" rx="1" fill="${b}"/><path d="M40 41V47" stroke="${b}" stroke-width="${w}"/>`;};
const envF=(k,hc)=>{const l=hc?'#000':LINE;return `<rect x="27" y="14" width="26" height="36" rx="1.5" fill="${hc?'#000':'#FBF9F5'}" stroke="${l}" stroke-width="${R(1.4*k)}"/><path d="M27.5 14.5 L40 27 L52.5 14.5" fill="none" stroke="${hc?'#fff':l}" stroke-width="${R(1.2*k)}" stroke-linejoin="round"/>`;};
const envB=(k,hc)=>{const l=hc?'#000':LINE,w=R(1.2*k);return `<rect x="27" y="14" width="26" height="36" rx="1.5" fill="${hc?'#000':'#FBF9F5'}" stroke="${l}" stroke-width="${R(1.4*k)}"/><path d="M27.5 14.5 H52.5 L40 30 Z" fill="${hc?'#fff':'#E4DCCB'}" stroke="${hc?'#fff':l}" stroke-width="${w}" stroke-linejoin="round"/><path d="M27.5 49.5 L40 37 L52.5 49.5" fill="none" stroke="${hc?'#fff':l}" stroke-width="${w}"/>`;};
const inkA=(k,hc)=>{const b=hc?'#000':'#17120E';return `<path d="M21 47 C 18 37, 28 30, 39 32 C 49 29, 61 35, 59 45 C 64 53, 54 62, 43 59 C 33 64, 19 59, 21 47 Z" fill="${b}"/><circle cx="64" cy="30" r="3.2" fill="${b}"/><circle cx="67.5" cy="38" r="1.8" fill="${b}"/><circle cx="17" cy="31" r="2.3" fill="${b}"/>${hc?'':'<ellipse cx="34" cy="40" rx="4.5" ry="1.8" fill="#FFFDF4" fill-opacity=".45" transform="rotate(-18 34 40)"/>'}`;};
const tabA=(top,k,hc)=>`${hc?'':`<path d="M4 ${top?77:3}H76" stroke="#FFFDF8" stroke-width="${R(2*k)}"/>`}<path d="${top?'M14 70 L40 18 L66 70':'M14 10 L40 62 L66 10'}" fill="none" stroke="${hc?'#000':LINE}" stroke-width="${R((hc?3:1.6)*k)}" stroke-linejoin="round" stroke-linecap="round"/>`;
/* ---- margin dressing (phone px) ---- */
const willow=(x,y,c)=>{let lv='';[[5,3,4,50],[11,1.5,11,60],[17,2.5,18,42]].forEach(([a,b,e,l],j)=>{for(let t=10;t<l-2;t+=11){const xx=x+a+(e-a)*t/l,yy=y+b+t,sg=(t/11+j)%2?1:-1;lv+=`<ellipse cx="${R(xx+sg*1.8)}" cy="${R(yy)}" rx="2.8" ry=".9" transform="rotate(${sg*62} ${R(xx+sg*1.8)} ${R(yy)})" fill="${c}"/>`;}});
 return `<g fill="none" stroke="${c}" stroke-linecap="round"><path d="M${x} ${y+4} Q${x+11} ${y-1} ${x+22} ${y+3}" stroke-width="1.4"/><path d="M${x+5} ${y+3} C${x+3} ${y+20} ${x+6} ${y+36} ${x+4} ${y+50}" stroke-width="1"/><path d="M${x+11} ${y+1.5} C${x+10} ${y+22} ${x+13} ${y+42} ${x+11} ${y+60}" stroke-width="1"/><path d="M${x+17} ${y+2.5} C${x+18} ${y+18} ${x+16} ${y+30} ${x+18} ${y+42}" stroke-width="1"/></g>${lv}`;};
const railing=(x,y,c)=>`<g fill="none" stroke="${c}" stroke-width="1.2" stroke-linejoin="round">${[0,45.5,91].map(d=>`<path d="M${x+d} ${y+18}V${y+3.5}Q${x+d+2.5} ${y} ${x+d+5} ${y+3.5}V${y+18}Z"/>`).join('')}<path d="M${x+5} ${y+7}H${x+45.5}M${x+50.5} ${y+7}H${x+91}M${x+5} ${y+13.5}H${x+45.5}M${x+50.5} ${y+13.5}H${x+91}"/></g>`;
const reeds=(x,y,c)=>{let h='';[[0,34,-3,1],[5,27,2,0],[10,38,-1,1],[15,23,3,0],[20,31,1,1]].forEach(([dx,ht,b,pl])=>{const x0=x+dx,xt=x0+b*1.5,yt=y-ht;h+=`<path d="M${x0} ${y} Q${x0+b} ${y-ht/2} ${xt} ${yt}" fill="none" stroke="${c}" stroke-width="1.1" stroke-linecap="round"/>`;if(pl)h+=`<ellipse cx="${xt}" cy="${yt-3}" rx="1.7" ry="4.6" transform="rotate(${b*4} ${xt} ${yt-3})" fill="${c}"/>`;});
 return h+`<path d="M${x+3} ${y} q-6 -8 -9 -16 M${x+17} ${y} q7 -6 11 -14" fill="none" stroke="${c}" stroke-width="1" stroke-linecap="round"/>`;};
const boat=(x,y,c)=>`<g fill="none" stroke="${c}" stroke-width="1.2" stroke-linejoin="round" stroke-linecap="round"><path d="M${x} ${y+8} Q${x+10} ${y+20} ${x+50} ${y+20}"/><path d="M${x+4} ${y+11} H${x+50}"/><path d="M${x+20} ${y+11} V${y+1} Q${x+34} ${y-7} ${x+50} ${y-7}"/><path d="M${x+27} ${y+11} V${y-2.5}M${x+36} ${y+11} V${y-5}M${x+45} ${y+11} V${y-6.5}" stroke-width=".8"/><path d="M${x+8} ${y+26} q5 -2.4 10 0 t10 0 t10 0" stroke-width="1"/></g>`;
const envCorner=(x,y,c)=>`<g fill="none" stroke="${c}" stroke-width="1.2" stroke-linejoin="round"><path d="M${x} ${y+34} V${y} H${x+34} Z" fill="#FBF9F5"/><path d="M${x} ${y} L${x+13} ${y+13}" /><path d="M${x+5} ${y+5} H${x+24}" stroke-width=".8" stroke-dasharray="2 2"/></g>`;
const envBackMini=(x,y,c)=>`<g transform="rotate(6 ${x+20} ${y+13})" fill="none" stroke="${c}" stroke-width="1.2" stroke-linejoin="round"><rect x="${x}" y="${y}" width="40" height="26" rx="1.5" fill="#FBF9F5"/><path d="M${x+.5} ${y+.5} H${x+39.5} L${x+20} ${y+14} Z" fill="#EEE8DC"/><path d="M${x+.5} ${y+25.5} L${x+16} ${y+14} M${x+39.5} ${y+25.5} L${x+24} ${y+14}" stroke-width=".9"/></g>`;
const postmark=(cx,cy,c)=>`<g fill="none" stroke="${c}"><circle cx="${cx}" cy="${cy}" r="11" stroke-width="1.2"/><circle cx="${cx}" cy="${cy}" r="7.5" stroke-width=".8" stroke-dasharray="2 2"/><path d="M${cx+15} ${cy-4} q3 -2.4 6 0 t6 0 t6 0 M${cx+15} ${cy+2} q3 -2.4 6 0 t6 0 t6 0" stroke-width="1"/></g>`;
/* ---- skins ---- */
const SK={
 ch1:{stone:stoneA(DUN),goal:flagA},
 ch2:{stone:stoneA(DUN),door:fenceA,key:bambooKey,goal:flagA},
 ch4:{stone:stoneA(BOLL,true),door:moonA,key:ironKey,rcv:true},
 ch5:{stone:stoneA(ZHEN),goal:envF},
 dark:{stone:stoneA(ZHEN),door:sluiceA,key:tokenKey,goal:envB}};
const defs=(u,k)=>{C.sg='ksg'+u;C.hh='khh'+u;return `<defs><linearGradient id="${C.sg}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${STT}"/><stop offset="1" stop-color="${STB}"/></linearGradient><pattern id="${C.hh}" width="${R(5*k)}" height="${R(5*k)}" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M${R(2.5*k)} 0V${R(5*k)}" stroke="#000" stroke-width="${R(1.8*k)}"/></pattern></defs>`;};
/* ---- flat 180° renderer ---- */
function flatSk(rows,sk,o={}){const n=rows.length,hc=!!o.hc,paper=hc?'#FFFFFF':o.paper,face=mix(paper);
 const c=n<=4?72:n===5?63:55,g=4,st=c+g,ox=(352-(n*c+(n-1)*g))/2,vi=(352-(4*c+3*g))/2,sc=c/80,k=80/c,u=++gid;
 const m={};rows.forEach((rw,r)=>[...rw].forEach((ch,col)=>{m[(col>3?'T':'B')+col+'_'+r]=ch;}));
 const kO=kk=>kk[0]==='B'?3-(+kk[1]):(+kk[1])-4,rO=kk=>+kk.split('_')[1];
 const pos=kk=>{const x=20.5+ox+rO(kk)*st,q=kO(kk);return kk[0]==='T'?[x,464-vi-q*st-c]:[x,464+vi+q*st];};
 const old=paper===P4,edge=old?['#E3DBCC','#D8CFBE','#CCC2AF']:['#E2DED5','#D6D1C6','#C9C3B7'];
 const pg=top=>`<div style="position:absolute;left:20.5px;top:${top?112:464}px;width:352px;height:352px;border-radius:${top?'5px 5px 1px 1px':'1px 1px 5px 5px'};background:${hc?'#fff':`linear-gradient(${top?0:180}deg,rgba(70,50,30,.11),rgba(70,50,30,0) 20%),${paper}`};box-shadow:${hc?'0 0 0 2px #000':(top?edge.map((e,i)=>`0 -${i+1}px 0 ${e}`).join(','):edge.map((e,i)=>`0 ${i+1}px 0 ${e}`).join(',')+',0 22px 30px -16px rgba(50,40,30,.34)')};overflow:hidden">${hc?'':FIB(o.fib??.06)}</div>`;
 let sv=defs(u,k)+X.creaseW([20.5,464],[372.5,464],0,hc);
 if(o.rule&&!hc){const gx0=20.5+ox-g/2,gx1=gx0+n*st;let d='';for(const top of [1,0]){const y0=top?464-vi-4*st+g/2:464+vi-g/2;for(let j=0;j<=n;j++)d+=`M${R(gx0+j*st)} ${R(y0)}V${R(y0+4*st)}`;for(let j=0;j<=4;j++)d+=`M${R(gx0)} ${R(y0+j*st)}H${R(gx1)}`;}sv+=`<path d="${d}" fill="none" stroke="${RULE}" stroke-opacity=".16" stroke-width="1"/>`;}
 let ob='';const G=(p,x)=>`<g transform="translate(${R(p[0])} ${R(p[1])}) scale(${R(sc,10000)})">${x}</g>`;
 for(const kk in m){const ch=m[kk];if(ch==='-')continue;const p=pos(kk);
  sv+=hc?`<rect x="${R(p[0]+1.5)}" y="${R(p[1]+1.5)}" width="${c-3}" height="${c-3}" rx="3" fill="#fff" stroke="#000" stroke-width="3"/>`
   :`<rect x="${R(p[0])}" y="${R(p[1]+1)}" width="${c}" height="${c}" rx="3" fill="${TS}" fill-opacity=".28"/><rect x="${R(p[0]+.5)}" y="${R(p[1]+.5)}" width="${c-1}" height="${c-1}" rx="3" fill="${face}" stroke="${TB}" stroke-width="1"/>`;
  if(ch==='S')ob+=G(p,hc?`<circle cx="40" cy="57.6" r="6" fill="none" stroke="#000" stroke-width="${R(2*k)}"/>`:DIMPLE);
  if(ch==='x')ob+=G(p,sk.stone(k,hc));
  if(ch==='D')ob+=G(p,sk.door(k,hc));
  if(ch==='k')ob+=G(p,sk.key(k,hc));
  if(ch==='p')ob+=G(p,tabA(kk[0]==='T',k,hc));
  if(ch==='i')ob+=G(p,inkA(k,hc));
  if(ch==='g')ob+=G(p,glue(hc));
  if(ch==='G'){if(hc)ob+=`<rect x="${R(p[0]+8)}" y="${R(p[1]+8)}" width="${c-16}" height="${c-16}" rx="2" fill="none" stroke="#000" stroke-width="2"/>`;
   ob+=G(p,sk.rcv?figA('r',true,{sc,paper,...(hc?{sil:'#000'}:{})}):sk.goal(k,hc));}}
 sv+=ob;
 if(o.dress)sv+=o.dress(hc?DRESSHC:DRESS,{pos,c,vi,ox});
 const cp=kk=>{const p=pos(kk);return [p[0]+c/2,p[1]+.72*c];};
 if(o.thread)sv+=X.thread4(o.thread.map(cp),{hc,tail:true});
 if(o.fig){const p=pos(o.fig.at);sv+=G(p,figA('s',o.fig.flip,{sc,paper,...(hc?{sil:'#000'}:{})}));}
 return {html:pg(1)+pg(0)+svgAbs(close(sv)),face,c};}
const PH=(inner,code,bg,fib=.05)=>phone(inner,{code,bg,fib,top:true});
/* ---- maps ---- */
const MP={1:['----....','---x.-..','---.-.-.','---xG.-S'],2:['..kppD..','.-..---.','S---.--.','x.G----.'],3:['...--.--','.-.S----','.-.-----','.--.----','.---..Gx'],4:['.--..--x','D--..-Gk','-.-..Sx-','-.-x.---','-.-.-.--'],5:['G--x---x','--..S.--','---..--.','x---i..g','.------.','.-------'],6:['..----x-','.-D--k--','.x---.G-','-.-S---.','---.--.-','g.-.---x']};
const f2=v=>v.toFixed(2);
/* s1 */
const r1=flatSk(MP[1],SK.ch1,{paper:PN,thread:['T7_3','T7_2','T7_1','T6_1'],fig:{at:'T6_1'},dress:(cl)=>willow(22.5,712,cl)});
/* s2 */
const r2=flatSk(MP[2],SK.ch2,{paper:P2,thread:['B0_2','B0_1','B0_0','B1_0'],fig:{at:'B1_0'},dress:(cl)=>railing(148.5,116,cl)});
/* s3 · lean 130° (fold angle 50°), backlit, lamp on */
const L3=X.fromMap(MP[3]);
const up3=(f,kk,art,by=66)=>{const q=f.loU(kk,40,40),w=f.loU(kk,80,40)[0]-f.loU(kk,0,40)[0];return `<g transform="translate(${R(q[0])} ${R(q[1])}) scale(${R(w/80,1000)}) translate(-40 -${by})">${art(80/w)}</g>`;};
const lionLit=k=>`<path d="${LION}" fill="none" stroke="#F0A23C" stroke-width="${R(3*k)}" stroke-linejoin="round"/><path d="${LION}" fill="#17120E" fill-opacity=".95"/>`;
const LAMP3=[347,290];const lampDress=f=>{const b=f.Up(...LAMP3),sc2=f.Up(LAMP3[0]+1,LAMP3[1])[0]-b[0];return `<g transform="translate(${R(b[0])} ${R(b[1])}) scale(${R(sc2,1000)})" fill="none" stroke="${DRESS}" stroke-linecap="round"><path d="M3.6 -24 V8" stroke-width="1.6"/><path d="M3.6 -18 H-1 V-12" stroke-width="1"/><rect x="-4" y="-12" width="6" height="1.4" fill="${DRESS}" stroke="none"/><ellipse cx="-1" cy="-5.6" rx="3.4" ry="5" fill="${LAMP}" stroke-width="1"/><rect x="-4" y="-.6" width="6" height="1.4" fill="${DRESS}" stroke="none"/><path d="M-1 .8 V3" stroke-width="1"/></g>`;};
const lean3=X.lean4({lv:L3,a:50,W:300,cx:196.5,yc:350,paper:P3v,lampK:.9,noSil:['T7_4'],lampPt:Up=>Up(LAMP3[0]-1,LAMP3[1]-6),
 extra:f=>lampDress(f)+up3(f,'T7_4',lionLit,68)+up3(f,'T6_4',k=>lanternA(k,false),47),
 thread:['B3_1','B2_1','B2_0','B1_0','B0_0','B0_1','B0_2','B0_3','B0_4','B1_4'],fig:{at:'B1_4'}});
/* s4 / s7 */
const d4=(cl)=>reeds(66,808,cl)+boat(278,126,cl);
const r4=flatSk(MP[4],SK.ch4,{paper:P4,fib:.14,thread:['T5_2','T4_2','T4_1'],fig:{at:'T4_1'},dress:d4});
const r7=flatSk(MP[4],SK.ch4,{hc:true,thread:['T5_2','T4_2','T4_1'],fig:{at:'T4_1'},dress:d4});
/* s5 / s6 */
const r5=flatSk(MP[5],SK.ch5,{paper:PL,rule:true,thread:['T4_1','B3_1','B2_1'],fig:{at:'B2_1'},dress:(cl)=>envCorner(66,126,cl)+postmark(196.5,788,cl)});
const r6=flatSk(MP[6],SK.dark,{paper:PL,rule:true,thread:['B3_3','B3_4'],fig:{at:'B3_4'},dress:(cl)=>envBackMini(284,128,cl)});
/* ---- outside-phone strips ---- */
const lab=t=>`<span style="font:500 13px/1.35 ui-monospace,Menlo,monospace;color:#2A241F">${t}</span>`;
const before=blend('#3C2D1E',PN,.075),fN=mix(PN);
const strip=(()=>{const pan=(bf)=>{let h=`<rect width="176" height="92" rx="8" fill="${PN}"/>`;[[1,0,1],[1,1,0]].forEach((rw,j)=>rw.forEach((v,i)=>{if(!v)return;const x=14+i*52,y=8+j*40;
  h+=bf?`<rect x="${x}" y="${y}" width="48" height="36" rx="3" fill="#3C2D1E" fill-opacity=".075"/><path d="M${x+3} ${y+.6}H${x+45}" stroke="#fff" stroke-opacity=".8"/>`:`<rect x="${x}" y="${y+1}" width="48" height="36" rx="3" fill="${TS}" fill-opacity=".28"/><rect x="${x+.5}" y="${y+.5}" width="47" height="35" rx="3" fill="${fN}" stroke="${TB}"/>`;}));
  return `<svg width="176" height="92" style="display:block;box-shadow:0 0 0 .5px rgba(60,45,30,.2);border-radius:8px">${close(h)}</svg>`;};
 return `<div style="display:flex;gap:16px;padding:0 11px">${[[1,`before · 7.5% 叠纸 · ${f2(cr(before,PN))}:1`],[0,`after · ${fN} + 1 pt ${TB} · 边 ${f2(cr(TB,PN))}:1`]].map(([b,t])=>`<div style="display:flex;flex-direction:column;gap:8px;width:176px">${pan(b)}${lab(t)}</div>`).join('')}</div>`;})();
const hcCell=(art,goal)=>{gid++;const k=80/52;const d=defs(gid,k);return `<svg width="52" height="52" style="display:block;flex:none">${close(`${d}<rect x="1.5" y="1.5" width="49" height="49" rx="3" fill="#fff" stroke="#000" stroke-width="3"/>${goal?'<rect x="7" y="7" width="38" height="38" rx="2" fill="none" stroke="#000" stroke-width="2"/>':''}<g transform="scale(.65)">${art(k,true)}</g>`)}</svg>`;};
const lItem=(cells,t)=>`<div style="display:flex;flex-direction:column;gap:8px;align-items:flex-start"><div style="display:flex;gap:4px">${cells}</div><span style="font:500 13px/1.2 ${SONG};color:#1F1B17">${t}</span></div>`;
const lGrp=(t,items)=>`<div style="display:flex;flex-direction:column;gap:10px"><span style="font:600 11px/1 ui-monospace,Menlo,monospace;letter-spacing:.1em;color:#4A433B">${t}</span><div style="display:flex;gap:12px 14px;flex-wrap:wrap">${items}</div></div>`;
const legend=`<div style="display:flex;flex-direction:column;gap:18px;padding:16px 14px;margin:0 11px;box-sizing:border-box;width:393px;border-radius:12px;background:#fff;box-shadow:0 0 0 1px #000">${lGrp('石 · 45° 斜线 1.8/5 + 3 pt 轮廓',lItem(hcCell(stoneA(DUN)),'石墩')+lItem(hcCell(stoneA(LION)),'石狮')+lItem(hcCell(stoneA(BOLL,true)),'缆桩')+lItem(hcCell(stoneA(ZHEN)),'镇石'))}${lGrp('门 + 钥',lItem(hcCell(fenceA)+hcCell(bambooKey),'篱门 + 竹钥')+lItem(hcCell(moonA)+hcCell(ironKey),'月洞门 + 铁钥')+lItem(hcCell(sluiceA)+hcCell(tokenKey),'闸 + 符'))}${lGrp('终点 · 双框 2 pt 内缩 8',lItem(hcCell(flagA,1),'朱旗')+lItem(hcCell(lanternA,1),'灯笼')+lItem(hcCell(envF,1),'信封'))}</div>`;
/* ---- frames ---- */
const frm=(id,label,ph,b,title,note,pills='',extra='')=>`<div data-skin="${id}" style="display:flex;flex-direction:column;gap:16px;width:max-content">${sub(label)}<div data-screen-label="${b} ${title}" style="display:flex;flex-direction:column;gap:22px;width:415px;flex:none">${ph}${cap(b,title,note,pills)}${extra}</div></div>`;
const crs=(p,face)=>`格边 ${f2(cr(TB,p))}:1 · 石 ${f2(cr(STT,p))}–${f2(cr(STB,p))}:1 · 门框 ${f2(cr(DOOR,face))}:1 · 饰 ${f2(cr(DRESS,p))}:1`;
const F=[
 frm(1,'(1) skin-ch1 · 1-2 对页 · 180°',PH(r1.html,'1-2','#E4E1DA'),'12-1','skin-ch1 · 石墩 · 朱旗 · 柳',`新纸 ${PN}，格面 ${r1.face}。石墩 52×48（65% 格），无开口。柳三条垂丝 22×60，在下页左外角，离页角 44 pt。${crs(PN,r1.face)}。4 行关卡格子 72 pt（原 80），给饰带让出 26 pt 页边。`,pill('180°'),strip),
 frm(2,'(2) skin-ch2 · 2-4 门桥 · 180°',PH(r2.html,'2-4','#E6E0D6'),'12-2','skin-ch2 · 篱门 · 竹钥 · 纸桥 · 石墩 · 朱旗',`纸 ${P2}，格面 ${r2.face}。篱门：两根竹柱 + 顶梁（节痕）+ 中间横闩，仍是闭合门框 + 一道杠。竹钥：朱环 + 两节竹杆（59%×18%）。纸桥两格 V 折跨中缝成对。桥栏 18×96 在上页外缘正中。${crs(P2,r2.face)}。`,pill('180°')),
 frm(3,'(3) skin-ch3 · 3-5 回程 · 130° · 背光',PH(svgAbs(lean3.svg),'3-5','#E8E1D4'),'12-3','skin-ch3 · 石狮 · 灯笼 · 挂灯',`上页背光：石狮 = 黑剪影纸花（块身 70% 格）；终点灯笼直立在格心偏上。石狮（7,4）的影子 round(4·cos 50°)=3 → 落在下页（1,4）缺口，整格 + 交叉线不变，纸人踩上去。挂灯 + 竖杆在上页侧边页边（远角往中缝 44 pt 外，格外），灯晕从这里起。石狮：右端圆头 + 两耳，三簇鬃向后，左端短尾，顶部特征 ≤20% 高，暖色 1.5 pt 亮边。下页格面 ${EXT.TILE} + 1 pt 边。`,pill('130°')+pill('灯亮')),
 frm(4,'(4) skin-ch4 · 4-6 两人 · 180° · 旧纸',PH(r4.html,'4-6','#E8E1D4',.1),'12-4','skin-ch4 · 缆桩 · 月洞门 · 铁钥 · 收信人',`旧纸 ${P4}，格面 ${r4.face}。缆桩上窄下宽、近顶一道绳槽。月洞门外径 72% 格、内外比 32/40 + 竖杠。铁钥环 + 杆 + 方齿，墨 ${LINE}（不用朱）。终点是收信人（发髻 + 提灯）。芦苇在下页外缘左，半只渡船在上页外缘右。${crs(P4,r4.face)}。`,pill('180°')),
 frm(5,'(5) skin-ch5 · 5-7 两灯 · 180° · 信笺',PH(r5.html,'5-7','#E4E1DA'),'12-5','skin-ch5 · 镇石 · 墨池 · 胶 · 信封',`信笺 ${PL}，格面 ${r5.face}。印格线改画在格缝正中（16%），与 1 pt 格边隔 2 pt，不再叠线。镇石宽扁（60%×45%）坐在格下半；墨池不规则湿团 + 三点溅墨；胶不变；终点竖立信封 + 封口 V 线。上页外角露一只信封角，下页外缘正中一枚 Ø22 邮戳圈（无字）。${crs(PL,r5.face)}。`,pill('180°')),
 frm(6,'(6) skin-dark · 暗二 · 180° · 信笺',PH(r6.html,'暗二','#E4E1DA'),'12-6','skin-dark · 闸 · 符 · 镇石 · 信封背',`闸：方框 + 竖闸板（三道横线 + 半枚符刻）。符：吊绳 + 朱环 + 半符（56%×30%）。终点信封背面（封舌三角）。上页外缘右一只翻面信封。6 行格子 55 pt，细节线 ≥ 1.2 pt。${crs(PL,r6.face)}。`,pill('180°')),
 frm(7,'(7) skin-hc · 4-6 两人 · 高对比',phone(r7.html,{code:'4-6',bg:'#FFFFFF',fib:0}),'12-7','skin-hc · 4-6 · 高对比',`白纸，格框 3 pt 黑；缆桩 = 45° 斜线 + 3 pt 轮廓（保留绳槽）；月洞门 3 pt 圆 + 实心杠；铁钥实心剪影；终点双框 + 收信人剪影。格内无装饰，页边饰 ${DRESSHC}。朱线 4 pt #8E2419 衬 8 pt 白。`,pill('高对比'),legend)];
/* ---- assemble ---- */
const head=`<div style="display:flex;align-items:baseline;gap:12px;margin:88px 0 10px"><span style="font:600 11px/1 ui-monospace,Menlo,monospace;padding:4px 8px;background:#1F1B17;color:#F7F4EE;border-radius:4px">第十二行</span><span style="font:600 18px/1.2 ${SONG};color:#1F1B17">章皮 · per-chapter skins</span></div><div style="font-size:15px;line-height:1.6;color:#4A433B;max-width:1300px;margin:0 0 26px;text-wrap:pretty">底层修正（七帧通用）：路格 = 纸色叠 25% #8A7A62（新纸 #DCD6CB · 旧纸 #D6CBB6 · 终章 #D3C7AE · 信笺 #DBD5CA），1 pt 全边 ${TB}，去掉左上白高光，保留下缘 1 pt ${TS} 28%；缺口不画格。石头 ${STT} → ${STB} 渐变 + 1 pt ${TS} 70% 轮廓；背光页石头仍是黑剪影。线稿 skin.line ${LINE} · 门框 ${DOOR} · 页边饰 dress.ink ${DRESS}（≤2.5:1，只在格外页边，离中缝和 44 pt 页角远）· 高对比饰 ${DRESSHC} · 灯 ${LAMP}。朱色只用于旗、钥环、朱线、印。手机竖放、中缝横向：上页 = 右页列 4–7，下页 = 左页列 0–3。</div>`;
const block=`<div data-gen="row12">${head}<div style="display:flex;gap:40px;align-items:flex-start;flex-wrap:wrap;max-width:3600px">${F.join('')}</div><i data-gen-end="row12"></i></div>`;
const SRC='Letterfold Paper States.dc.html',END11='<i data-gen-end="row11"></i></div>',END12='<i data-gen-end="row12"></i></div>';
const gs=s.indexOf('<div data-gen="row12">');
if(gs>=0){const ge=s.indexOf(END12,gs)+END12.length;s=s.slice(0,gs)+block+s.slice(ge);}
else{const ai=s.indexOf(END11);if(ai<0)throw new Error('row11 end not found');const at=ai+END11.length;s=s.slice(0,at)+block+s.slice(at);}
await saveFile(SRC,s);
const prev=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Letterfold · 章皮 预览</title><style>body{margin:0;background:#E7E3DC;-webkit-font-smoothing:antialiased;font-family:-apple-system,'PingFang SC',system-ui,sans-serif;color:#2A2520}</style></head><body>${X.L[10]}<div style="padding:40px;width:max-content">${block}</div><script>const q=new URLSearchParams(location.search),sel=q.get('s');if(sel){const t=document.querySelector('[data-skin="'+sel+'"]');if(t){let el=t;while(el&&!el.hasAttribute('data-gen')){const p=el.parentElement;[...p.children].forEach(ch=>{if(ch!==el)ch.style.display='none'});el=p;}el&&[...el.children].forEach(ch=>{if(!ch.contains(t))ch.style.display='none'});}}if(q.get('z'))document.body.style.zoom=q.get('z');const ph=q.get('phone');if(sel&&ph){const t=document.querySelector('[data-skin="'+sel+'"]');const p=t?t.querySelector('[data-phone]'):null;if(p){const defs=document.body.firstElementChild;const cl=p.cloneNode(true);cl.style.margin='0';cl.style.borderRadius='0';cl.style.boxShadow='none';document.body.innerHTML='';document.body.appendChild(defs);document.body.appendChild(cl);document.documentElement.style.background='transparent';document.body.style.background='transparent';document.body.style.width='393px';document.body.style.height='852px';document.body.style.overflow='hidden';}}</script></body></html>`;
await saveFile('skins-preview.html',prev);
log('ok',block.length,'tile/paper',f2(cr(TB,PN)),'dress',f2(cr(DRESS,PN)),'faces',r1.face,r2.face,EXT.TILE,r4.face,r5.face);
