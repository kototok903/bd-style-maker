import snapshotUrl from "@/features/preview/fixture/discord-snapshot.html?url";

let snapshot: Promise<string> | undefined;
export function loadFixture() {
  snapshot ??= fetch(snapshotUrl)
    .then((response) => {
      if (!response.ok)
        throw new Error("Discord preview snapshot could not be loaded.");
      return response.text();
    })
    .catch((error) => {
      snapshot = undefined;
      throw error;
    });
  return snapshot;
}

export function fixtureDocument(
  token: string,
  external: boolean,
  html: string,
): string {
  const sources = external ? "https:" : "";
  const head = `<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${token}'; style-src 'unsafe-inline' ${sources}; img-src data: ${sources}; font-src data: ${sources}; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'"><style>[hidden]{display:none!important}html,body{margin:0;width:100%;height:100%}body[data-inspect=true] [data-element]:hover{outline:2px solid var(--brand-500,#a7b7ff)!important;outline-offset:-2px;cursor:crosshair!important}</style>`;
  const script = `<script nonce="${token}">
(()=>{let port=null,revision=-1,inspect=false,rules=[],positioned=false;const source=document.getElementById('theme-source');let native=false,resourceState='loading',notifyApplied=()=>{};source.onload=()=>resourceStatus('loaded');source.onerror=()=>resourceStatus('failed');function resourceStatus(status){resourceState=status;if(port&&native)port.postMessage({type:'resources',revision,status});notifyApplied();}
function sample(selector,pseudo){const e=document.querySelector(selector);if(!e)return null;const c=getComputedStyle(e,pseudo);return {background:c.backgroundColor,color:c.color,font:c.fontFamily,radius:c.borderRadius,border:c.borderWidth,gap:c.gap,content:c.content};}
window.addEventListener('message',e=>{if(e.source!==parent||e.data?.type!=='bd-init'||e.data.token!=='${token}'||!e.ports[0]||port)return;port=e.ports[0];port.onmessage=e=>{const m=e.data;if(m?.type!=='update'||typeof m.css!=='string'||m.css.length>10000000||!Number.isSafeInteger(m.revision)||m.revision<revision)return;revision=m.revision;if(source.textContent!==m.css){native=!!m.native;resourceState='loading';source.textContent=m.css;}else if(native){resourceStatus(resourceState);}
for(const el of document.querySelectorAll('.theme-dark,.theme-light')){el.classList.toggle('theme-light',!!m.light);el.classList.toggle('theme-dark',!m.light);el.classList.toggle('theme-darker',!m.light);el.classList.toggle('images-dark',!m.light);}
inspect=!!m.inspect;document.body.dataset.inspect=String(inspect);rules=Array.isArray(m.rules)?m.rules.slice(0,3000):[];

notifyApplied=()=>{const matches=[];for(const rule of rules){if(typeof rule.selector!=='string'||typeof rule.id!=='string')continue;try{if(document.querySelector(rule.selector))matches.push(rule.id);}catch{}}
requestAnimationFrame(()=>{if(!positioned){const scroller=document.querySelector('.scroller__36d07'),first=document.querySelector('.messageListItem__5126c');if(scroller&&first){scroller.scrollTop=Math.max(0,first.offsetTop-20);positioned=true;}}port.postMessage({type:'applied',revision,matches,samples:{body:sample('body'),channels:sample('.sidebarList__5e434'),chat:sample('.chatContent_f75fb0'),message:sample('.message__5126c'),input:sample('.channelTextArea_f75fb0'),label:sample('.sidebarList__5e434','::after')}});});};notifyApplied();};port.start();port.postMessage({type:'ready'});});
document.addEventListener('click',e=>{if(e.target.closest('a,form'))e.preventDefault();if(!inspect||!port)return;e.preventDefault();e.stopPropagation();const el=e.target.closest('[data-element]');if(!el)return;let selector=el.dataset.selector;for(const rule of rules){try{if(rule.selector!==':root'&&rule.selector!=='body'&&el.matches(rule.selector)){selector=rule.selector;break;}}catch{}}port.postMessage({type:'selected',name:el.dataset.element,selector});},true);
})();</script>`;
  return html
    .replace("<!--BD_HEAD-->", head)
    .replace("<!--BD_SCRIPT-->", script);
}
