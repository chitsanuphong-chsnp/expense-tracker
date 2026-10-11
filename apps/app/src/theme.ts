// Dark mode: the light design stays the source of truth; tone() maps its colors to a soft navy dark palette.
export type ThemeMode='system'|'light'|'dark';
let dark=false;
export const isDark=()=>dark;
export function setDark(value:boolean){dark=value;}

function parse(color:string){
  let h=(color==='white'?'#ffffff':color).replace('#','');
  if(h.length===3||h.length===4)h=h.split('').map(x=>x+x).join('');
  const n=parseInt(h.slice(0,6),16),r=((n>>16)&255)/255,g=((n>>8)&255)/255,b=(n&255)/255,alpha=h.length===8?h.slice(6):'';
  const max=Math.max(r,g,b),min=Math.min(r,g,b),l=(max+min)/2,d=max-min;
  const s=d===0?0:d/(1-Math.abs(2*l-1));
  let hue=0;if(d){hue=max===r?((g-b)/d)%6:max===g?(b-r)/d+2:(r-g)/d+4;hue*=60;if(hue<0)hue+=360;}
  return {h:hue,s,l,alpha};
}
function hex(h:number,s:number,l:number,alpha:string){
  const c=(1-Math.abs(2*l-1))*s,x=c*(1-Math.abs((h/60)%2-1)),m=l-c/2;
  const [r,g,b]=h<60?[c,x,0]:h<120?[x,c,0]:h<180?[0,c,x]:h<240?[0,x,c]:h<300?[x,0,c]:[c,0,x];
  return '#'+[r,g,b].map(v=>Math.round((v+m)*255).toString(16).padStart(2,'0')).join('')+alpha;
}
// Dark palette: charcoal surfaces (#161920 cards on a #0c0e13 page). Light tints become that slate with a hint of
// their hue (not darkened color, which turns amber/green muddy); dark ink turns light; accents get brighter.
const card=[22,25,32];
function mixHint(h:number,amount:number,lift:number,alpha:string){
  const accent=hex(h,0.62,0.58,'').slice(1),a=[0,2,4].map(i=>parseInt(accent.slice(i,i+2),16));
  return '#'+card.map((c,i)=>Math.round(Math.min(255,c+lift+(a[i]-c)*amount)).toString(16).padStart(2,'0')).join('')+alpha;
}
export function tone(color:string):string{
  if(!dark||!(color==='white'||/^#[0-9a-fA-F]{3,8}$/.test(color)))return color;
  const {h,s,l,alpha}=parse(color);
  if(l>=0.8)return s<0.25?mixHint(225,0,Math.round((1-l)*80),alpha):mixHint(h,0.1,Math.round((1-l)*40),alpha);
  if(l<=0.35)return hex(h,Math.min(s,0.18),0.9-l*0.2,alpha);
  return hex(h,Math.min(s,0.75),Math.min(0.76,l+0.16),alpha);
}
// Text and icon colors: very light ones sit on gradients and stay as they are.
export function toneText(color:string):string{
  if(!dark||color==='white')return color;
  return /^#[0-9a-fA-F]{3,8}$/.test(color)&&parse(color).l>0.75?color:tone(color);
}
// Pale chart bars would glare on dark cards: use a calm indigo instead.
export function barColor(color:string){return dark?'#3a3f63':color;}
