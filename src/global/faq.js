// Shared Ownership FAQ page: animated accordions, expand/collapse all, numbered section nav with scroll spy,
// and search with highlighting. Hooks: .faq_groups, details.faq_item, [faq-toggle-all], [faq-nav-list], [faq-search].
// Its CSS stays in the page's embed (adds html.faq-js styles). Was: inline in that embed.
/* eslint-disable */
function init(){
var root=document.documentElement,wrap=document.querySelector('.faq_groups');
if(!wrap||wrap.hasAttribute('data-faq-ready'))return;
wrap.setAttribute('data-faq-ready','');root.classList.add('faq-js');
var ease='cubic-bezier(.23,1,.32,1)',reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
var navbar=document.querySelector('.navbar');
function offset(){var b=navbar?navbar.getBoundingClientRect().bottom:0;return Math.max(0,Math.round(b))+24;}
function setOffset(){root.style.setProperty('--faq-offset',offset()+'px');}
setOffset();window.addEventListener('resize',setOffset);
function goTo(el,smooth){var top=el.getBoundingClientRect().top+window.pageYOffset-offset();window.scrollTo({top:Math.max(0,top),behavior:smooth&&!reduce.matches?'smooth':'auto'});}
var groups=[].slice.call(wrap.querySelectorAll('.faq_group'));
var items=[].slice.call(wrap.querySelectorAll('details.faq_item'));
var toggleBtn=document.querySelector('[faq-toggle-all]');
var toggleLabel=toggleBtn&&(toggleBtn.querySelector('.button-text')||toggleBtn);
function setItem(d,open,animate){
 var a=d.querySelector('.faq_answer');if(!a)return;var cur=null;
 if(d._anim){var cs=getComputedStyle(a);cur={h:a.getBoundingClientRect().height,pb:cs.paddingBottom,o:cs.opacity};d._anim.cancel();d._anim=null;}
 if(!cur&&open===d.classList.contains('is-open')){d.open=open;return;}
 d.classList.toggle('is-open',open);
 if(!animate||reduce.matches||!a.animate){d.open=open;return;}
 if(open){
  d.open=true;var end=a.getBoundingClientRect().height,pb=getComputedStyle(a).paddingBottom;
  var an=a.animate([{height:(cur?cur.h:0)+'px',paddingBottom:cur?cur.pb:'0px',opacity:cur?cur.o:0},{height:end+'px',paddingBottom:pb,opacity:1}],{duration:600,easing:ease});
  d._anim=an;an.onfinish=function(){if(d._anim===an)d._anim=null;};
 }else{
  var fh=cur?cur.h:a.getBoundingClientRect().height,fp=cur?cur.pb:getComputedStyle(a).paddingBottom;
  var an2=a.animate([{height:fh+'px',paddingBottom:fp,opacity:cur?cur.o:1},{height:'0px',paddingBottom:'0px',opacity:0}],{duration:450,easing:ease,fill:'forwards'});
  d._anim=an2;an2.onfinish=function(){if(d._anim===an2){d.open=false;d._anim=null;}an2.cancel();};
 }
}
function isShown(d){return !d.hidden&&!d.closest('.faq_group').hidden;}
function visible(){return items.filter(isShown);}
function join(){
 wrap.querySelectorAll('.calc-faq_list').forEach(function(list){
  var row=[].slice.call(list.querySelectorAll('details.faq_item')).filter(isShown);
  row.forEach(function(d,i){
   var o=d.classList.contains('is-open');
   d.classList.toggle('is-join-prev',o&&i>0&&row[i-1].classList.contains('is-open'));
   d.classList.toggle('is-join-next',o&&i<row.length-1&&row[i+1].classList.contains('is-open'));
  });
 });
}
function updateToggle(){join();if(!toggleBtn)return;var v=visible();var all=v.length>0&&v.every(function(d){return d.classList.contains('is-open');});toggleLabel.textContent=all?'Collapse all questions':'Expand all questions';toggleBtn.setAttribute('aria-expanded',all?'true':'false');}
items.forEach(function(d){
 var s=d.querySelector('summary');if(!s)return;if(d.open)d.classList.add('is-open');
 s.addEventListener('click',function(e){e.preventDefault();setItem(d,!d.classList.contains('is-open'),true);updateToggle();});
});
if(toggleBtn)toggleBtn.addEventListener('click',function(){var v=visible();var all=v.length>0&&v.every(function(d){return d.classList.contains('is-open');});v.forEach(function(d){setItem(d,!all,true);});updateToggle();});
var list=document.querySelector('[faq-nav-list]'),links=[],active=-1,lockUntil=0;
function slug(t){return t.toLowerCase().replace(/&/g,' ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}
function setActive(i){if(i===active)return;active=i;links.forEach(function(l,j){l.classList.toggle('is-active',j===i);if(j===i)l.setAttribute('aria-current','true');else l.removeAttribute('aria-current');});}
groups.forEach(function(g,i){
 var h=g.querySelector('h2'),title=h?h.textContent.trim():'Section '+(i+1),num=(i<9?'0':'')+(i+1);
 if(h)h.setAttribute('data-num',num);
 if(!g.id)g.id=slug(title);if(!list)return;
 var a=document.createElement('a');a.className='faq_nav-link';a.href='#'+g.id;
 var n=document.createElement('span');n.className='faq_nav-num';n.setAttribute('aria-hidden','true');n.textContent=num;
 var t=document.createElement('span');t.className='faq_nav-text';t.textContent=title;
 a.appendChild(n);a.appendChild(t);
 a.addEventListener('click',function(e){e.preventDefault();e.stopPropagation();setActive(i);lockUntil=Date.now()+1200;goTo(g,true);if(history.replaceState)history.replaceState(null,'','#'+g.id);});
 list.appendChild(a);links.push(a);
});
function spy(){if(Date.now()<lockUntil)return;var line=offset()+60,idx=-1;groups.forEach(function(g,i){if(!g.hidden&&g.getBoundingClientRect().top<=line)idx=i;});if(idx<0){for(var k=0;k<groups.length;k++){if(!groups[k].hidden){idx=k;break;}}}setActive(idx);}
var ticking=false;window.addEventListener('scroll',function(){if(!ticking){ticking=true;requestAnimationFrame(function(){ticking=false;spy();});}},{passive:true});
var input=document.querySelector('[faq-search]'),results=null,empty=null,ph=null,hl=!!(window.CSS&&CSS.highlights&&window.Highlight);
function syncPh(){if(ph)ph.hidden=!!input.value;}
function norm(s){return s.toLowerCase().replace(/\s+/g,' ');}
function collect(d,terms,ranges){var w=document.createTreeWalker(d,NodeFilter.SHOW_TEXT),n;while((n=w.nextNode())){var low=n.nodeValue.toLowerCase();terms.forEach(function(t){var i=0;while(t&&(i=low.indexOf(t,i))>-1){var r=new Range();r.setStart(n,i);r.setEnd(n,i+t.length);ranges.push(r);i+=t.length;}});}}
function run(){
 var raw=input.value.trim(),q=norm(raw),terms=q?q.split(' '):[],count=0,ranges=[];
 items.forEach(function(d){
  if(!q){d.hidden=false;if(d._searchOpened){d._searchOpened=false;setItem(d,false,false);}return;}
  var txt=norm(d.textContent),m=terms.every(function(t){return txt.indexOf(t)>-1;});
  d.hidden=!m;
  if(m){count++;if(!d.classList.contains('is-open')){d._searchOpened=true;setItem(d,true,false);}if(hl)collect(d,terms,ranges);}
 });
 groups.forEach(function(g,i){var any=!q||!!g.querySelector('details.faq_item:not([hidden])');g.hidden=!any;if(links[i])links[i].classList.toggle('is-empty',!any);});
 empty.hidden=!q||count>0;
 results.textContent=q&&count?count+(count===1?' question matches':' questions match')+' "'+raw+'"':'';results.hidden=!results.textContent;
 if(hl){if(ranges.length)CSS.highlights.set('faq-match',new Highlight(...ranges));else CSS.highlights.delete('faq-match');}
 updateToggle();lockUntil=0;spy();
}
if(input){
 var phText=input.getAttribute('placeholder');
 if(phText){ph=document.createElement('span');ph.className='faq_search-ph';ph.setAttribute('aria-hidden','true');ph.textContent=phText;input.removeAttribute('placeholder');input.insertAdjacentElement('afterend',ph);syncPh();}
 results=document.createElement('p');results.className='faq_results';results.setAttribute('aria-live','polite');results.hidden=true;
 (input.closest('.faq_search')||input).insertAdjacentElement('afterend',results);
 empty=document.createElement('div');empty.className='faq_empty';empty.hidden=true;
 empty.innerHTML='<p class="faq_empty-title">No questions match your search.</p><p>Try a different word, or <a href="/contact-us">speak to our team</a>.</p>';
 wrap.insertBefore(empty,wrap.firstChild);
 var timer;input.addEventListener('input',function(){syncPh();clearTimeout(timer);timer=setTimeout(run,120);});
 input.addEventListener('keydown',function(e){if(e.key==='Escape'&&input.value){input.value='';syncPh();run();}});
}
updateToggle();spy();
function hashTarget(){if(!location.hash)return null;var t=document.getElementById(decodeURIComponent(location.hash.slice(1)));return t&&groups.indexOf(t)>-1?t:null;}
function hashGo(){var t=hashTarget();if(t){goTo(t,false);setActive(groups.indexOf(t));}}
if(hashTarget()){hashGo();if(document.readyState==='complete')setTimeout(hashGo,450);else window.addEventListener('load',function(){setTimeout(hashGo,450);});}
}

export default function faq() {
  init();
}
