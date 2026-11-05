(function(){
var DOW=['월','화','수','목','금','토','일'];
var RESET=':root{color-scheme:light;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif;background:#fafafa}img{max-width:100%}[hidden]{display:none!important}';
var state;
try{state=JSON.parse(document.getElementById('state').textContent)}catch(e){state={}}
function normalize(){
  if(!Array.isArray(state.habits))state.habits=[];
  if(!state.checks||typeof state.checks!=='object')state.checks={};
  if(!state.counts||typeof state.counts!=='object')state.counts={};
  if(!state.focus||typeof state.focus!=='object')state.focus={};
  delete state.groups;state.habits.forEach(function(h){delete h.group});
  if(!state.rest||typeof state.rest!=='object')state.rest={};
  state.habits.forEach(function(hb,i){if(!hb.created)hb.created=todayKey;if(hb.kind!=='count')hb.kind='daily';if(!hb.color)hb.color=PAL[i%PAL.length];if(hb.emoji==null)hb.emoji=suggestEmoji(hb.name);if(hb.mode!=='timer'&&hb.mode!=='mini')hb.mode=hb.mini?'mini':'timer'});
}
var art=null,mode='pending',timer=null,just=null,armed=null,statusEl;

function pad(n){return (n<10?'0':'')+n}
function ymd(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
function addDays(d,n){return new Date(d.getFullYear(),d.getMonth(),d.getDate()+n)}
function mondayOf(d){return addDays(d,-((d.getDay()+6)%7))}
var PAL=['#3fbf95','#f27a6e','#4a90e8','#f59a4a','#e8b93a','#7cbf4f','#5ab3e0','#35a868','#f2c230','#e85d6a','#8a6ef0','#3b6fe5','#26b7c9','#ec6fa0'];
function nextColor(){var used={};state.habits.forEach(function(h){used[h.color]=1});for(var i=0;i<PAL.length;i++)if(!used[PAL[i]])return PAL[i];return PAL[state.habits.length%PAL.length]}
var EMO_RULES=[[/일본어|중국어|영어|외국어|단어|회화/,'🗣️'],[/독서|책|읽기/,'📚'],[/공부|강의|문제|듀오링고|말해보카/,'📖'],[/물/,'💧'],[/스트레칭|요가|필라테스/,'🧘'],[/달리기|러닝|조깅/,'🏃'],[/걷기|산책|만보/,'🚶'],[/운동|헬스|팔굽혀|스쿼트/,'💪'],[/일기|글쓰기|회고/,'📝'],[/명상|호흡/,'🌿'],[/이불|정리|청소|설거지|빨래/,'🧹'],[/환기/,'🪟'],[/영양제|비타민|유산균|약/,'💊'],[/기상|일찍 일어/,'🌅'],[/취침|수면|일찍 자/,'😴'],[/가계부|무지출|돈|저축/,'💰'],[/식단|식사|아침|점심|저녁|밥/,'🍽️'],[/포트폴리오|디자인|기획|피그마/,'🎨'],[/체중|몸무게/,'⚖️'],[/혈압/,'🩺'],[/휴대폰|스마트폰|SNS|유튜브/,'📵'],[/기록/,'📝']];
function suggestEmoji(name){name=String(name||'');for(var i=0;i<EMO_RULES.length;i++)if(EMO_RULES[i][0].test(name))return EMO_RULES[i][1];return '✅'}
function cntOf(hb,wk){return +((state.counts[wk]||{})[hb.id])||0}
function allTotal(){var t=0;Object.keys(state.checks).forEach(function(k){Object.keys(state.checks[k]).forEach(function(id){if(findHabit(id))t++})});Object.keys(state.counts).forEach(function(w){Object.keys(state.counts[w]).forEach(function(id){if(findHabit(id))t+=+state.counts[w][id]||0})});return t}
function bestStreak(){var best=0;state.habits.forEach(function(hb){if(hb.kind==='count')return;var ks=Object.keys(state.checks).filter(function(k){return isOn(k,hb.id)}).sort(),run=0,prev=null;ks.forEach(function(k){var d=new Date(k+'T00:00:00');run=(prev&&Math.round((d-prev)/864e5)===1)?run+1:1;prev=d;if(run>best)best=run})});return best}
var newKind='daily';
function kindSeg(name,cur,attr){return '<div class="mode" role="radiogroup" aria-label="기록 방식"><span>기록 방식</span><div class="seg">'+[['daily','매일 칸'],['count','주 횟수']].map(function(o){return '<label><input type="radio" name="'+name+'" value="'+o[0]+'"'+attr+(cur===o[0]?' checked':'')+'>'+o[1]+'</label>'}).join('')+'</div></div>'}
function colorRow(name,cur,attr){return '<div class="mode" role="radiogroup" aria-label="색"><span>색</span><div class="swrow">'+PAL.map(function(c,i){return '<label class="swl" style="--sw:'+c+'"><input type="radio" name="'+name+'" value="'+c+'"'+attr+(cur===c?' checked':'')+' aria-label="색 '+(i+1)+'"></label>'}).join('')+'</div></div>'}
var now=new Date(),todayKey=ymd(now),thisMon=mondayOf(now),view=thisMon;
normalize();
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function lsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}
function weekDays(){var a=[];for(var i=0;i<7;i++)a.push(addDays(view,i));return a}
function isMini(k,id){var v=state.checks[k]&&state.checks[k][id];return typeof v==='string'&&v.charAt(0)==='m'}
function rotOf(k,id){return parseFloat(String(state.checks[k][id]).replace('m',''))||0}
function tenSet(hb){var ks=Object.keys(state.checks).filter(function(k){return isOn(k,hb.id)}).sort(),o={};ks.forEach(function(k,i){if((i+1)%5===0)o[k]=1});return o}
function isTimer(hb){return hb.mode!=='mini'}
function isOn(k,id){return !!(state.checks[k]&&state.checks[k][id]!=null)}
function countFor(hb,days){if(hb.kind==='count')return cntOf(hb,ymd(days[0]));return days.filter(function(d){return isOn(ymd(d),hb.id)}).length}
function md(d){return (d.getMonth()+1)+'월 '+d.getDate()+'일'}
var WDN=['월','화','수','목','금','토','일'];
function startOf(hb){var s=hb.created||todayKey;Object.keys(state.checks).forEach(function(k){if(state.checks[k][hb.id]!=null&&k<s)s=k});return s}
function counted(k,id,st){return k>=st&&(k<todayKey||(k===todayKey&&isOn(k,id)))}
function weekStats(hb,mon){
  var st=startOf(hb),kept=0,el=0,remain=0,i,k;
  for(i=0;i<7;i++){k=ymd(addDays(mon,i));if(isOn(k,hb.id))kept++;if(counted(k,hb.id,st))el++;if(k>=todayKey&&!isOn(k,hb.id))remain++}
  var sun=ymd(addDays(mon,6));
  if(hb.kind==='count'){kept=cntOf(hb,ymd(mon));el=sun<todayKey&&st<=ymd(mon)?Math.max(kept,hb.goal):kept}
  return {kept:kept,missed:Math.max(0,el-kept),full:sun<todayKey&&st<=ymd(mon),active:st<=sun&&ymd(mon)<=todayKey,remain:remain};
}
function sm(d){return (d.getMonth()+1)+'/'+d.getDate()}
function renderAnalysis(){
  var n=state.habits.length;if(!n)return '';
  var W=4,weeks=[],w;for(w=W-1;w>=0;w--)weeks.push(addDays(thisMon,-7*w));
  var tk=0,tm=0,fw=0,mw=0;
  var rows=state.habits.map(function(hb){
    var ws=weeks.map(function(m){return weekStats(hb,m)}),kept=0,missed=0,fk=0,fc=0,met=0;
    ws.forEach(function(s){kept+=s.kept;missed+=s.missed;if(s.full){fc++;fk+=s.kept;if(s.kept>=hb.goal)met++}});
    var st=startOf(hb),wd=WDN.map(function(){return {k:0,e:0}});
    if(hb.kind!=='count')weeks.forEach(function(m){for(var i=0;i<7;i++){var k=ymd(addDays(m,i));if(counted(k,hb.id,st)){wd[i].e++;if(isOn(k,hb.id))wd[i].k++}}});
    tk+=kept;tm+=missed;fw+=fc;mw+=met;
    var r={hb:hb,kept:kept,missed:missed,fc:fc,avg:fc?fk/fc:null,met:met,wd:wd,cur:ws[W-1],acts:'',adv:''};
    var weak=[],strong=[];wd.forEach(function(x,i){if(x.e>=2&&x.k/x.e<.4)weak.push(WDN[i]);if(x.e>=2&&x.k/x.e>=.6)strong.push(WDN[i])});
    var weakTxt=weak.length>=4&&strong.length?' 주로 '+strong.join('·')+'요일에만 하고 있어요.':weak.length?' '+weak.join('·')+'요일에 자주 빠져요.':'';
    var goal=hb.goal;
    if(!fc){
      r.st='new';r.label='기록 모으는 중';r.rank=2;
      var need=goal-r.cur.kept;
      r.adv=need<=0?'이번 주 목표 달성':need<=r.cur.remain?'목표까지 '+need+'일 · 남은 날 '+r.cur.remain+'일':'이번 주는 목표에 '+(need-r.cur.remain)+'일 모자라요';
      
    }else{
      var rate=r.avg/goal,avg1=Math.round(r.avg*10)/10,low=Math.max(1,Math.round(r.avg));
      if(rate>=1){
        r.st='ok';r.label='잘 지키는 중';r.rank=3;
        if(r.avg>=goal+1&&goal<7){var up=Math.min(7,Math.round(r.avg));r.adv='주 평균 '+avg1+'일 · 목표보다 많이 하고 있어요';r.acts+='<button type="button" class="btn sm" data-setgoal="'+hb.id+'|'+up+'">목표를 주 '+up+'일로 올리기</button>'}
        else r.adv='목표대로 지키고 있어요';
      }else if(rate>=.7){
        r.st='warn';r.label='조금 아쉬워요';r.rank=1;
        r.adv='주 평균 '+avg1+'일 · 목표에 조금 못 미쳐요.'+(weakTxt||'');
        if(low<goal)r.acts+='<button type="button" class="btn sm" data-setgoal="'+hb.id+'|'+low+'">목표를 주 '+low+'일로 낮추기</button>';
        if(hb.kind==='count'){}
        else if(isTimer(hb)){}
        else if(!hb.mini){var sw=suggestMini(hb.name);r.acts+='<button type="button" class="btn sm" data-setmini="'+hb.id+'|'+esc(sw)+'">최소 버전 정하기: '+esc(sw)+'</button>'}
      }else{
        r.st='crit';r.label='점검 필요';r.rank=0;
        r.adv='목표의 '+Math.round(rate*100)+'% · 주 평균 '+avg1+'일 / 목표 '+goal+'일.'+weakTxt;
        if(low<goal)r.acts+='<button type="button" class="btn sm" data-setgoal="'+hb.id+'|'+low+'">목표를 주 '+low+'일로 낮추기</button>';
        if(hb.kind==='count'){}
        else if(isTimer(hb)){}
        else if(!hb.mini){var sc=suggestMini(hb.name);r.acts+='<button type="button" class="btn sm" data-setmini="'+hb.id+'|'+esc(sc)+'">최소 버전 정하기: '+esc(sc)+'</button>'}
        else{r.acts+='<button type="button" class="btn sm" data-rename="'+hb.id+'">최소 버전 더 작게 고치기</button>'}
      }
    }
    return r;
  });
  var h='<section class="analysis" aria-labelledby="ana-h"><div class="ahead"><h2 id="ana-h">최근 4주 분석</h2><span>'+sm(weeks[0])+' – 오늘</span></div>';
  h+='<div class="stats"><div class="stat"><span>지킨 날</span><b>'+tk+'</b>일</div><div class="stat"><span>못 지킨 날</span><b>'+tm+'</b>일</div><div class="stat"><span>지킨 비율</span><b>'+(tk+tm?Math.round(tk/(tk+tm)*100):0)+'</b>%</div><div class="stat"><span>주간 목표 달성</span><b>'+mw+'</b>/ '+fw+'회</div></div>';
  // weekly chart: share of weekly goal days filled, across all habits
  var cols=[];
  weeks.forEach(function(m,i){
    var kept=0,goal=0,act=false;
    state.habits.forEach(function(hb){var s=weekStats(hb,m);if(s.active){act=true;kept+=s.kept;goal+=hb.goal}});
    if(act)cols.push({m:m,kept:kept,goal:goal,pct:goal?Math.round(kept/goal*100):0,cur:i===W-1});
  });
  var tipOf=function(c){return sm(c.m)+'–'+sm(addDays(c.m,6))+' · 도장 '+c.kept+'개 / 목표 '+c.goal+'일 · '+c.pct+'%'+(c.cur?' (진행 중)':'')};
  var last=cols[cols.length-1];
  h+='<div><h3 class="ah3">주별 목표 채움률</h3><div class="plot" role="img" aria-label="'+esc(cols.map(tipOf).join(', '))+'"><div class="goalline"><span>목표 100%</span></div>';
  cols.forEach(function(c){h+='<div class="col'+(c.cur?' cur':'')+'" tabindex="0" data-tip="'+esc(tipOf(c))+'">'+(c.cur?'<span class="vl">'+c.pct+'%</span>':'')+'<div class="fill" style="height:'+Math.min(100,c.pct)+'%"></div></div>'});
  h+='</div><div class="xrow">';
  cols.forEach(function(c){h+='<span>'+(c.cur?'이번 주':sm(c.m)+' 주')+'</span>'});
  h+='</div><p class="readout" id="readout" data-def="'+esc(tipOf(last))+'">'+esc(tipOf(last))+'</p></div>';
  rows.sort(function(a,b){return a.rank-b.rank});
  h+='<div><h3 class="ah3">습관별 점검</h3><div class="hcards">';
  rows.forEach(function(r){
    h+='<div class="hcard"><div class="hhead"><b>'+esc(r.hb.name)+'</b><span class="chip '+r.st+'">'+({ok:'✓ ',warn:'△ ',crit:'! ',new:'… '})[r.st]+r.label+'</span></div>';
    h+='<p class="hline">지킨 날 <b>'+r.kept+'</b>일 · 못 지킨 날 <b>'+r.missed+'</b>일 · 목표 주 '+r.hb.goal+'일'+(r.fc?' · 목표 달성 '+r.met+'/'+r.fc+'주':'')+'</p>';
    h+=r.hb.kind==='count'?'':'<div class="wd" aria-label="요일별 지킨 비율">';
    if(r.hb.kind!=='count')r.wd.forEach(function(x,i){var p=x.e?Math.round(x.k/x.e*100):null;
      h+='<div title="'+WDN[i]+'요일 '+(x.e?x.k+'/'+x.e+'일':'기록 없음')+'">'+WDN[i]+'<span class="wdc'+(p==null?' none':'')+'" style="--a:'+(p==null?0:Math.max(6,p))+'%"></span>'+(p==null?'–':x.k+'/'+x.e)+'</div>'});
    h+=(r.hb.kind==='count'?'':'</div>')+'<p class="advice">'+esc(r.adv)+'</p>'+(r.acts?'<div class="acts">'+r.acts+'</div>':'')+'</div>';
  });
  h+='</div></div></section>';
  return h;
}
var MINI_RULES=[
 [/스트레칭/,'스트레칭 1분'],[/운동|헬스|팔굽혀|스쿼트|요가|필라테스/,'팔굽혀펴기 1번'],[/달리기|러닝|조깅/,'운동화 신고 현관 나가기'],
 [/걷기|산책|만보/,'집 앞 5분 걷기'],[/물/,'물 한 컵 마시기'],[/(일본어|중국어|영어|외국어)/,'$1 단어 1개 보기'],
 [/독서|책|읽기/,'책 1쪽 읽기'],[/공부|강의|문제/,'책 펴고 한 문제 풀기'],[/일기|글쓰기|기록|회고/,'한 줄 쓰기'],
 [/명상|호흡/,'숨 세 번 깊게 쉬기'],[/정리|청소|설거지|빨래/,'물건 1개 제자리에 두기'],[/영양제|비타민/,'영양제 식탁에 꺼내 두기'],
 [/기상|일찍 일어|아침/,'알람 울리면 바로 일어나 앉기'],[/취침|수면|일찍 자/,'정한 시간에 휴대폰 내려놓기'],[/휴대폰|스마트폰|폰|SNS|유튜브/,'휴대폰 다른 방에 5분 두기']];
function suggestMini(name){
  name=String(name||'').trim();if(!name)return '';
  for(var i=0;i<MINI_RULES.length;i++){var m=name.match(MINI_RULES[i][0]);if(m)return MINI_RULES[i][1].replace('$1',m[1]||'')}
  if(/\d+\s*분/.test(name))return name.replace(/\d+\s*분/,'1분');
  if(/\d+\s*(개|쪽|페이지|번|회|문제)/.test(name))return name.replace(/\d+\s*(개|쪽|페이지|번|회|문제)/,'1$1');
  return name+' 딱 1분만';
}
var newMode='timer';
function modeSeg(name,cur,attr){return '<div class="mode" role="radiogroup" aria-label="최소 기준"><span>최소 기준</span><div class="seg">'+[['timer','▶ 5분만'],['mini','최소 습관']].map(function(o){return '<label><input type="radio" name="'+name+'" value="'+o[0]+'"'+attr+(cur===o[0]?' checked':'')+'>'+o[1]+'</label>'}).join('')+'</div></div>'}
function goalOpts(sel){var o='';for(var i=1;i<=7;i++)o+='<option value="'+i+'"'+(i===sel?' selected':'')+'>'+i+'</option>';return o}

function render(){
  var app=document.getElementById('app'),days=weekDays(),n=state.habits.length,total=0,met=0,gsum=0,gmet=0;
  state.habits.forEach(function(hb){var c=countFor(hb,days);total+=c;gsum+=hb.goal;gmet+=Math.min(c,hb.goal);if(c>=hb.goal)met++});
  var diff=Math.round((view-thisMon)/6048e5),wk=ymd(view);
  var tag=diff===0?'이번 주':diff===-1?'지난주':diff===1?'다음 주':'';
  var yr=view.getFullYear()!==now.getFullYear()?view.getFullYear()+'년 ':'';
  var h='<header><h1>도장 해빗 트래커</h1><p class="sub"><span class="status" id="status"></span>'+notiBtn()+'</p></header>';
  h+=tabbar();
  if(tab==='today'){
  h+=renderHero()+renderNudge();
  h+='<div class="nav"><button class="btn icon" type="button" data-nav="-1" aria-label="이전 주">‹</button><div class="range">'+yr+md(days[0])+' – '+md(days[6])+(tag?'<span class="tag">'+tag+'</span>':'')+'</div>'
   +(diff!==0?'<button class="btn" type="button" data-nav="0">이번 주로</button>':'')+'<button class="btn icon" type="button" data-nav="1" aria-label="다음 주">›</button></div>';
  h+='<div class="card">';
  if(!n){h+='<p class="empty">아직 습관이 없어요.</p>'}
  else{
    h+='<div class="gridwrap"><table class="week"><colgroup><col class="c-name">'+'<col>'.repeat(7)+'</colgroup><thead><tr><th scope="col" class="corner">습관</th>';
    days.forEach(function(d,i){var k=ymd(d);h+='<th scope="col"'+(k===todayKey?' class="today"':'')+'>'+DOW[i]+'<b>'+d.getDate()+'</b></th>'});
    h+='</tr></thead><tbody>';
    ordered().forEach(function(hb){
      var c=countFor(hb,days),ok=c>=hb.goal,cnt=hb.kind==='count',tens=cnt?{}:tenSet(hb);
      var due=diff===0&&isDue(hb),foc=diff===0&&focusId()===hb.id;
      h+='<tr class="'+(due?'due ':'')+(foc?'focus':'')+'" style="--c:'+hb.color+'"><th scope="row"><span class="hn">'+(diff===0&&!cnt?'<button type="button" class="star" data-star="'+hb.id+'" aria-pressed="'+foc+'" aria-label="'+esc(hb.name)+(foc?' 오늘 꼭 할 한 가지에서 빼기':' 오늘 꼭 할 한 가지로 정하기')+'">'+(foc?'★':'☆')+'</button>':'')+esc(hb.name)+'</span>'
        +(cnt?'<span class="hm">주 '+hb.goal+'회 기록</span>':isTimer(hb)?'<span class="hm">최소 · 5분 타이머</span>':hb.mini?'<span class="hm">최소 · '+esc(hb.mini)+'</span>':'')
        +(hb.desc?'<span class="hm hd">'+esc(hb.desc)+'</span>':'')+(hb.time&&!cnt?'<span class="ht">⏰ '+hb.time+(due?' · 확인할 시간':'')+'</span>':'')+'<span class="hc'+(ok?' met':'')+'">'+c+'/'+hb.goal+(ok?' 달성':'')+'</span>'
        +(!cnt&&isTimer(hb)&&diff===0&&!isOn(todayKey,hb.id)?'<button type="button" class="go" data-go="'+hb.id+'" aria-label="'+esc(hb.name)+' 5분만 시작하기">▶ 5분만</button>':'')+'</th>';
      if(cnt){
        var pct=Math.min(100,Math.round(c/hb.goal*100)),fu=view>thisMon;
        h+='<td colspan="7" class="cntcell"><div class="cbar"><button type="button" class="cb" data-cnt="'+hb.id+'|-1" aria-label="'+esc(hb.name)+' 횟수 빼기"'+(c?'':' disabled')+'>−</button>'
          +'<div class="ctrack" role="img" aria-label="'+esc(hb.name)+' 이번 주 '+c+'회 / 목표 '+hb.goal+'회"><i style="width:'+pct+'%"></i><span>'+c+' / '+hb.goal+'</span></div>'
          +'<button type="button" class="cb" data-cnt="'+hb.id+'|1" aria-label="'+esc(hb.name)+' 횟수 더하기"'+(fu||c>=14?' disabled':'')+'>+</button></div></td>';
      }else days.forEach(function(d){
        var k=ymd(d),on=isOn(k,hb.id),fut=k>todayKey,mn=on&&isMini(k,hb.id),tn=on&&tens[k];
        h+='<td'+(k===todayKey?' class="today"':'')+'><button type="button" class="slot'+(on?(tn?' s-ten':mn?' s-mini':' s-full'):'')+'" data-h="'+hb.id+'" data-k="'+k+'" aria-pressed="'+on+'" aria-label="'+esc(hb.name)+' '+md(d)+(on?(tn?' 5번째 기록':mn?' 최소만 함':' 목표만큼 함'):'')+'"'+(fut&&!on?' disabled':'')+'>'
          +(tn?'<span class="stamp ten"></span>':'')+(on&&isBack(k,hb.id)?'<span class="bk" aria-hidden="true">↺</span><span class="sr"> 복귀 도장</span>':'')+'</button></td>';
      });
      h+='</tr>';
    });
    h+='</tbody></table></div><div class="legend"><span><i class="sw s-mini"></i>최소만 함</span><span><i class="sw s-full"></i>목표만큼 함</span><span><i class="stamp ten"></i>5번째 기록</span><span><i class="bkl">↺</i>복귀 도장</span></div>';
  }
  h+='</div>';
  }
  if(tab==='look'&&n){
    var rate=gsum?Math.round(gmet/gsum*100):0;
    h+='<div class="kpis"><div class="kpi k1"><b>'+rate+'<small>%</small></b><span>'+(diff===0?'이번 주':'이 주')+' 달성률</span></div>'
      +'<div class="kpi k2"><b>'+met+'<small>/'+n+'</small></b><span>목표 채운 습관</span></div>'
      +'</div>';
  }
  if(tab==='look')h+=n?renderAnalysis():'<p class="lookempty">아직 돌아볼 기록이 없어요.</p>';
  if(tab==='manage'){
  var mopen=true;
  h+='<details class="manage" id="manage"'+(mopen?' open':'')+'><summary>습관 목록</summary><div class="mbody">';
  ordered().forEach(function(hb){
    var sg=suggestMini(hb.name),cnt=hb.kind==='count';
    h+='<div class="mitem" style="--c:'+hb.color+'"><div class="mrow"><input type="text" id="name-'+hb.id+'" data-name="'+hb.id+'" value="'+esc(hb.name)+'" maxlength="30" aria-label="습관 이름">'
     +'<label class="goal">주 <select id="goal-'+hb.id+'" data-goal="'+hb.id+'">'+goalOpts(hb.goal)+'</select>'+(cnt?'회':'일')+'</label>'
     +'<button type="button" class="btn del'+(armed===hb.id?' armed':'')+'" data-del="'+hb.id+'">'+(armed===hb.id?'한 번 더 누르면 삭제':'삭제')+'</button></div>'
     +colorRow('color-'+hb.id,hb.color,' data-color="'+hb.id+'"')
     +kindSeg('kind-'+hb.id,hb.kind,' data-kind="'+hb.id+'"')
     +(cnt?'':modeSeg('mode-'+hb.id,hb.mode,' data-mode="'+hb.id+'"'))
     +(cnt||isTimer(hb)?'':'<div class="mini"><label for="mini-'+hb.id+'">최소 습관</label><input type="text" id="mini-'+hb.id+'" data-mini="'+hb.id+'" value="'+esc(hb.mini||'')+'" maxlength="30" placeholder="예: '+esc(sg)+'">'
     +(!hb.mini&&sg?'<button type="button" class="chipbtn" data-setmini="'+hb.id+'|'+esc(sg)+'">추천 넣기</button>':'')+'</div>')+(cnt?'':'<div class="mini"><label for="time-'+hb.id+'">확인 시간</label><input type="time" id="time-'+hb.id+'" data-time="'+hb.id+'" value="'+(hb.time||'')+'">'+(hb.time?'<button type="button" class="chipbtn" data-notime="'+hb.id+'">시간 없애기</button>':'')+'</div>')+'<div class="mini"><label for="desc-'+hb.id+'">설명</label><input type="text" id="desc-'+hb.id+'" data-desc="'+hb.id+'" value="'+esc(hb.desc||'')+'" maxlength="60" placeholder="어떻게 하는지 한 줄"></div>'+'</div>';
  });
  h+='<form class="add" id="addform" style="--c:'+nextColor()+'"><div class="addrow"><input type="text" id="newname" maxlength="30" placeholder="새 습관 이름 (예: 영어 단어 20개)" aria-label="새 습관 이름">'
   +'<label class="goal">주 <select id="newgoal">'+goalOpts(3)+'</select><span id="newunit">'+(newKind==='count'?'회':'일')+'</span></label><button class="btn primary" type="submit">추가</button></div>'
   +kindSeg('newkind',newKind,'')
   +'<div id="newmoderow"'+(newKind==='count'?' hidden':'')+'>'+modeSeg('newmode',newMode,'')+'</div>'
   +'<div class="mini" id="newminirow"'+(newMode==='mini'&&newKind!=='count'?'':' hidden')+'><label for="newmini">최소 습관</label><input type="text" id="newmini" maxlength="30" placeholder="습관 이름을 쓰면 추천이 채워져요"></div></form>';
  h+='</div></details>';
  }
  if(pick)closePicker();
  app.innerHTML=h;
  dueSig=dueKey();
  statusEl=document.getElementById('status');setStatus();
  if(tmr&&!findHabit(tmr.id)){tmr=null;renderTimer()}
  if(just&&isBack(just.k,just.id))showBack(just.k,just.id);
  if(just){var b=document.querySelector('.slot[data-k="'+just.k+'"][data-h="'+just.id+'"]');if(b){b.classList.add('just');burst(b)}just=null}
}


function ordered(){return state.habits.slice()}
function curHM(){var d=new Date();return pad(d.getHours())+':'+pad(d.getMinutes())}
function isDue(hb){return hb.kind!=='count'&&!!hb.time&&hb.time<=curHM()&&!isOn(todayKey,hb.id)&&hb.created<=todayKey}
function focusOf(){return state.focus[todayKey]||null}
function focusId(){var f=focusOf();return f&&f.id&&findHabit(f.id)?f.id:null}
function trimFocus(){var ks=Object.keys(state.focus).sort();while(ks.length>60)delete state.focus[ks.shift()]}
var heroPress=false,dueSig='';
function dueKey(){return todayKey+'|'+state.habits.filter(isDue).map(function(h){return h.id}).join(',')}
function burst(b){
  try{if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)return}catch(e){}
  var r=b.getBoundingClientRect();if(!r.width)return;
  var c=getComputedStyle(b).getPropertyValue('--c').trim()||getComputedStyle(document.documentElement).getPropertyValue('--blush').trim();
  var ten=b.classList.contains('s-ten'),mini=b.classList.contains('s-mini'),n=ten?16:mini?7:10,base=ten?50:mini?24:34;
  var fx=document.createElement('div');fx.className='fx'+(ten?' big':'');fx.setAttribute('aria-hidden','true');
  fx.style.left=(r.left+r.width/2)+'px';fx.style.top=(r.top+r.height/2)+'px';fx.style.setProperty('--c',c);
  var h='<i class="ring"></i>'+(ten?'<i class="ring r2"></i>':'');
  for(var i=0;i<n;i++){var a=(360/n)*i+Math.random()*24-12,d=base+Math.random()*14,cl=i%3===0?' sq':i%3===1?' ln':'';
    h+='<i class="pt'+cl+'" style="--a:'+a.toFixed(0)+'deg;--d:'+d.toFixed(0)+'px;--s:'+(.6+Math.random()*.7).toFixed(2)+'"></i>'}
  if(ten)h+='<b class="fxlab">5번째 기록!</b>';
  fx.innerHTML=h;document.body.appendChild(fx);
  var cd=b.closest('.card');if(cd){cd.classList.remove('thud');void cd.offsetWidth;cd.classList.add('thud')}
  try{navigator.vibrate&&navigator.vibrate(ten?[25,40,35]:mini?10:18)}catch(e){}
  setTimeout(function(){fx.remove()},ten?1500:950);
}
function stampToday(id,kind){var hb=findHabit(id);if(!hb)return;var on=isOn(todayKey,id),rr=on?rotOf(todayKey,id):Math.round(Math.random()*36-18);(state.checks[todayKey]=state.checks[todayKey]||{})[id]=kind==='mini'?'m'+rr:rr;just={k:todayKey,id:id};if(focusId()===id)heroPress=true;render();save(400)}
function renderHero(){
  var f=focusOf(),hb=f&&f.id?findHabit(f.id):null,h;
  if(!f||(f.id&&!hb)){
    return '<section class="hero" aria-labelledby="hero-l"><span class="hlab" id="hero-l">오늘 꼭 할 한 가지</span><p class="htxt">오늘 이것만은 해낸다면?</p>'
      +'<form class="hform" id="focusform"><input type="text" id="focusin" maxlength="40" placeholder="예: 포트폴리오 표지 마무리" aria-label="오늘 꼭 할 한 가지"><button class="btn primary" type="submit">정하기</button></form>'
      +'</section>';
  }
  var name=hb?hb.name:f.text,done=hb?isOn(todayKey,hb.id):!!f.done,mn=hb&&done&&isMini(todayKey,hb.id);
  h='<section class="hero'+(done?' done':'')+'" aria-labelledby="hero-l"><span class="hlab" id="hero-l">오늘 꼭 할 한 가지</span><p class="htxt">'+esc(name)+'</p>';
  if(hb&&hb.desc)h+='<p class="hsub">'+esc(hb.desc)+'</p>';
  h+='<p class="hsub"><b>'+(done?(mn?'최소 완료':'완료'):(hb&&hb.time?hb.time+' 확인':''))+'</b></p><div class="hacts">';
  if(!done){
    if(hb){h+='<button type="button" class="btn primary" data-quick="'+hb.id+'|full">해냈어요</button><button type="button" class="btn" data-quick="'+hb.id+'|mini">최소만 했어요</button>'+(hb.kind!=='count'&&isTimer(hb)?'<button type="button" class="btn" data-go="'+hb.id+'">▶ 5분만 시작</button>':'')}
    else h+='<button type="button" class="btn primary" data-fdone="1">해냈어요</button>';
  }else if(!hb)h+='<button type="button" class="btn" data-fdone="0">아직이에요</button>';
  else if(mn)h+='<button type="button" class="btn" data-quick="'+hb.id+'|full">목표만큼 함으로 바꾸기</button>';
  h+='<button type="button" class="btn link" data-fclear="1">다른 걸로 바꾸기</button></div>';
  if(done)h+='<span class="stamp big'+(heroPress?' press':'')+'" role="img" aria-label="해냈어요 도장"></span>';
  heroPress=false;
  return h+'</section>';
}

function dn(k){var p=k.split('-');return Math.round(Date.UTC(+p[0],p[1]-1,+p[2])/864e5)}
function restNeed(hb){return Math.max(2,Math.ceil(7/(hb.goal||1)))}
function prevOn(id,k){var b=null;Object.keys(state.checks).forEach(function(x){if(x<k&&isOn(x,id)&&(!b||x>b))b=x});return b}
function restInfo(hb,k){var p=prevOn(hb.id,k),c=hb.created||k,base=p?dn(p):dn(c)-1;return {n:Math.max(0,dn(k)-base-1),first:!p}}
function isBack(k,id){var hb=findHabit(id);if(!hb||hb.kind==='count'||!isOn(k,id))return false;return restInfo(hb,k).n>=restNeed(hb)}
var REST_DAYS=5; // 이 일수 이상 연속으로 못 하면 '쉬고 있는 습관'으로 보고 더 작게 다시 계획하자고 제안
function isResting(hb){if(hb.kind==='count'||isOn(todayKey,hb.id)||(hb.created||todayKey)>todayKey)return false;if((state.rest[todayKey]||[]).indexOf(hb.id)>=0)return false;return restInfo(hb,todayKey).n>=REST_DAYS}
function shrinkMini(t){
  t=String(t||'').trim();if(!t)return '';
  var m=t.match(/(\d+)\s*분/);if(m)return +m[1]>1?t.replace(m[0],'1분'):t.replace(m[0],'30초');
  m=t.match(/(\d+)\s*(개|쪽|페이지|번|회|문제|줄|장|컵|잔)/);if(m&&+m[1]>1)return t.replace(m[0],'1'+m[2]);
  if(/만 해도 OK$/.test(t))return '';
  return (t+'만 해도 OK').slice(0,30);
}
function renderRest(){
  var rs=ordered().filter(isResting);if(!rs.length)return '';
  var h='<section class="restbox" aria-labelledby="rest-h"><div class="dh"><b id="rest-h">쉬고 있는 습관</b></div>';
  rs.forEach(function(hb){
    var r=restInfo(hb,todayKey),cur=hb.mini||suggestMini(hb.name),sm=hb.mode==='mini'?shrinkMini(cur):'',g=hb.goal>1?Math.max(1,Math.ceil(hb.goal/2)):0;
    h+='<div class="rrow" style="--c:'+hb.color+'"><span class="rn"><i class="hic" aria-hidden="true">'+esc(hb.emoji||hb.name.charAt(0))+'</i><span class="rtx"><b>'+esc(hb.name)+'</b><small>'+(r.first?'아직 첫 도장 전이에요':r.n+'일 쉬었어요')+'</small></span></span>'
      +'<div class="racts">'
      +(isTimer(hb)?'<button type="button" class="btn sm primary" data-go="'+hb.id+'">▶ 5분만 해 보기</button>':'<button type="button" class="btn sm primary" data-quick="'+hb.id+'|mini">오늘 최소로 한 번만</button>')
      +(sm&&sm!==cur?'<button type="button" class="btn sm" data-setmini="'+hb.id+'|'+esc(sm)+'">더 작게: '+esc(sm)+'</button>':'')
      +(g&&g<hb.goal?'<button type="button" class="btn sm" data-setgoal="'+hb.id+'|'+g+'">목표 주 '+hb.goal+'일 → '+g+'일</button>':'')
      +'<button type="button" class="btn sm link" data-rest="'+hb.id+'">오늘은 쉴게요</button></div></div>';
  });
  return h+'</section>';
}
var backShown={};
function showBack(k,id){
  var hb=findHabit(id);if(!hb||backShown[k+id])return;backShown[k+id]=1;
  var r=restInfo(hb,k),el=document.getElementById('backtoast');
  if(!el){el=document.createElement('div');el.id='backtoast';el.className='btoast';el.setAttribute('role','status');document.body.appendChild(el)}
  el.innerHTML='<span class="bkbig" aria-hidden="true">↺</span><div><b>복귀 도장</b><span>'+esc(hb.name)+' · '+(r.first?r.n+'일 만에 첫 도장':r.n+'일 만에 복귀')+'</span></div><button type="button" class="btn sm" data-backx="1">닫기</button>';
  el.hidden=false;el.style.animation='none';void el.offsetWidth;el.style.animation='';
  clearTimeout(el._t);el._t=setTimeout(function(){el.hidden=true},6500);
}

function renderDue(){
  var ds=ordered().filter(isDue);if(!ds.length)return '';
  var h='<section class="duebox" aria-labelledby="due-h"><div class="dh"><b id="due-h">확인할 시간</b></div>';
  ds.forEach(function(hb){h+='<div class="drow" style="--c:'+hb.color+'"><span class="dn"><i class="dot"></i>'+esc(hb.name)+'<small>'+hb.time+'</small></span><span class="dacts"><button type="button" class="btn sm" data-quick="'+hb.id+'|mini">최소만</button><button type="button" class="btn sm primary" data-quick="'+hb.id+'|full">했어요</button></span>'+(hb.desc?'<span class="dd">'+esc(hb.desc)+'</span>':'')+'</div>'});
  return h+'</section>';
}


var TABS=[['today','오늘'],['look','돌아보기'],['manage','습관 관리']];
var tab=(function(){var v=lsGet('ht-tab');return v==='look'||v==='manage'?v:'today'})(),nudgeIdx=0;
function tabbar(){return '<nav class="tabs" role="tablist" aria-label="화면">'+TABS.map(function(t){return '<button type="button" class="tab" role="tab" data-tab="'+t[0]+'" aria-selected="'+(tab===t[0])+'">'+t[1]+'</button>'}).join('')+'</nav>'}
function nudgeItems(){var a=[];ordered().forEach(function(hb){if(isDue(hb))a.push({t:'due',hb:hb})});ordered().forEach(function(hb){if(isResting(hb))a.push({t:'rest',hb:hb})});return a}
function renderNudge(){
  var it=nudgeItems();if(!it.length)return '';
  nudgeIdx=nudgeIdx%it.length;var x=it[nudgeIdx],hb=x.hb,h;
  h='<section class="nudge'+(x.t==='due'?' due':'')+'" aria-labelledby="nudge-h" aria-live="polite"><div class="nhead"><b id="nudge-h">'+(x.t==='due'?'확인할 시간':'쉬고 있는 습관')+'</b>'
    +(it.length>1?'<span class="nnav">'+(nudgeIdx+1)+' / '+it.length+'<button type="button" class="btn icon nbtn" data-nudge="1" aria-label="다음 챙길 것 보기">›</button></span>':'<span class="nnav">'+''+'</span>')+'</div>';
  if(x.t==='due'){
    h+='<div class="rrow" style="--c:'+hb.color+'"><span class="rn"><i class="hic" aria-hidden="true">'+esc(hb.emoji||hb.name.charAt(0))+'</i><span class="rtx"><b>'+esc(hb.name)+'</b><small>'+hb.time+'</small></span></span>'
      +(hb.desc?'<p class="rmsg">'+esc(hb.desc)+'</p>':'')
      +'<div class="racts"><button type="button" class="btn sm primary" data-quick="'+hb.id+'|full">했어요</button><button type="button" class="btn sm" data-quick="'+hb.id+'|mini">최소만</button></div></div>';
  }else{
    var r=restInfo(hb,todayKey),cur=hb.mini||suggestMini(hb.name),sm=hb.mode==='mini'?shrinkMini(cur):'',g=hb.goal>1?Math.max(1,Math.ceil(hb.goal/2)):0;
    h+='<div class="rrow" style="--c:'+hb.color+'"><span class="rn"><i class="hic" aria-hidden="true">'+esc(hb.emoji||hb.name.charAt(0))+'</i><span class="rtx"><b>'+esc(hb.name)+'</b><small>'+(r.first?'아직 첫 도장 전이에요':r.n+'일 쉬었어요')+'</small></span></span>'
      +'<div class="racts">'
      +(isTimer(hb)?'<button type="button" class="btn sm primary" data-go="'+hb.id+'">▶ 5분만 해 보기</button>':'<button type="button" class="btn sm primary" data-quick="'+hb.id+'|mini">오늘 최소로 한 번만</button>')
      +(sm&&sm!==cur?'<button type="button" class="btn sm" data-setmini="'+hb.id+'|'+esc(sm)+'">더 작게: '+esc(sm)+'</button>':'')
      +(g&&g<hb.goal?'<button type="button" class="btn sm" data-setgoal="'+hb.id+'|'+g+'">목표 주 '+hb.goal+'일 → '+g+'일</button>':'')
      +'<button type="button" class="btn sm link" data-rest="'+hb.id+'">오늘은 쉴게요</button></div></div>';
  }
  return h+'</section>';
}

function setStatus(msg){
  if(!statusEl)return;
  statusEl.textContent=msg||(mode==='artifact'?'자동 저장':mode==='local'?'이 기기에만 저장돼요':mode==='readonly'?'보기 전용':'');
}

function buildDoc(){
  var css=document.getElementById('css').textContent,js=document.getElementById('app-js').textContent;
  var fonts=document.querySelector('link[rel="stylesheet"]').getAttribute('href');
  var s=JSON.stringify(state).replace(/</g,'\\u003c');
  return '<!doctype html><html><head><meta charset=utf8><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><style>'+RESET+'</style></head><body>'
   +'<title>도장 해빗 트래커</title>\n<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="stylesheet" href="'+fonts.replace(/&/g,'&amp;')+'">\n'
   +'<style id="css">'+css+'</style>\n<div class="wrap" id="app"></div>\n'
   +'<script type="application/json" id="state">'+s+'<\/script>\n'
   +'<script id="app-js">'+js+'<\/script></body></html>';
}

function save(delay){
  if(mode==='local'){lsSet('ht-state',JSON.stringify(state));setStatus('저장됨 (이 기기)');return}
  if(mode!=='artifact')return;
  clearTimeout(timer);setStatus('저장 대기 중…');
  timer=setTimeout(function(){
    setStatus('저장 중…');
    art.publish(buildDoc()).catch(function(e){
      var code=e&&e.code;
      if(code==='not_granted'||code==='not_writer'){mode='readonly';setStatus()}
      else if(code==='conflict')setStatus('다른 화면의 변경이 먼저 저장됐어요');
      else setStatus('저장하지 못했어요. 잠시 후 다시 눌러 주세요');
    });
  },delay);
}

function findHabit(id){return state.habits.find(function(x){return x.id===id})}
var FIVE=5*60*1000,tmr=null,tick=null,actx=null;
function chime(){try{if(!actx)return;[0,.28].forEach(function(t,i){var o=actx.createOscillator(),g=actx.createGain(),at=actx.currentTime+t;o.frequency.value=i?880:660;g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(.18,at+.02);g.gain.exponentialRampToValueAtTime(.0001,at+.45);o.connect(g);g.connect(actx.destination);o.start(at);o.stop(at+.5)})}catch(e){}}
function tleft(){return tmr?(tmr.paused?tmr.left:Math.max(0,tmr.end-Date.now())):0}
function fmt(ms){var t=Math.ceil(ms/1000);return Math.floor(t/60)+':'+pad(t%60)}
function startTimer(id){
  try{var C=window.AudioContext||window.webkitAudioContext;if(C&&!actx)actx=new C();if(actx&&actx.state==='suspended')actx.resume()}catch(e){}
  tmr={id:id,end:Date.now()+FIVE,paused:false,left:FIVE,phase:'run'};runTick();renderTimer();
}
function runTick(){clearInterval(tick);tick=setInterval(function(){
  if(!tmr||tmr.phase!=='run'||tmr.paused)return;
  var l=tleft(),el=document.getElementById('ttime'),pr=document.getElementById('tprog');
  if(el)el.textContent=fmt(l);if(pr)pr.style.width=((1-l/FIVE)*100).toFixed(1)+'%';
  if(l<=0){tmr.phase='done';clearInterval(tick);chime();try{navigator.vibrate&&navigator.vibrate([120,80,120])}catch(e){}if(!isOn(todayKey,tmr.id)){(state.checks[todayKey]=state.checks[todayKey]||{})[tmr.id]='m'+Math.round(Math.random()*36-18);just={k:todayKey,id:tmr.id};tmr.auto=true;view=thisMon;render();save(400)}renderTimer()}
},250)}
function renderTimer(){
  var bar=document.getElementById('timerbar');
  if(!bar){bar=document.createElement('div');bar.id='timerbar';bar.className='timerbar';bar.setAttribute('role','region');bar.setAttribute('aria-label','5분 타이머');document.body.appendChild(bar)}
  var hb=tmr&&findHabit(tmr.id);
  if(!tmr||!hb){tmr=null;clearInterval(tick);bar.hidden=true;bar.innerHTML='';document.body.classList.remove('timing');return}
  bar.hidden=false;document.body.classList.add('timing');
  var stamped=isOn(todayKey,hb.id),mini='',h;
  if(tmr.phase==='run'){
    var l=tleft();
    h='<div class="tprogw"><i id="tprog" style="width:'+((1-l/FIVE)*100).toFixed(1)+'%"></i></div><div class="tin"><div class="tinfo"><b>'+esc(hb.name)+'</b>'+mini+'</div>'
      +'<div class="ttime" id="ttime" aria-live="off">'+fmt(l)+'</div><div class="tbtns"><button type="button" class="btn" data-t="pause">'+(tmr.paused?'계속':'잠깐 멈춤')+'</button><button type="button" class="btn" data-t="stop">그만두기</button></div></div>';
  }else{
    var done=tmr.phase==='done';
    h='<div class="tin" aria-live="polite"><div class="tinfo"><b>'+(done?'5분 완료':'타이머 종료')+'</b><span class="tmsg">'+esc(hb.name)+(done?(tmr.auto?' · 최소 도장을 찍었어요':''):' · 5분을 채우면 최소 도장')+'</span></div>'
      +'<div class="tbtns">'+(stamped?(isMini(todayKey,hb.id)?'<button type="button" class="btn primary" data-t="upgrade">목표만큼 함으로 바꾸기</button>':''):'')+'<button type="button" class="btn" data-t="again">5분 더</button><button type="button" class="btn" data-t="close">닫기</button></div></div>';
  }
  bar.innerHTML=h;
}


var pick=null;
function closePicker(refocus){var el=document.getElementById('picker');if(el)el.remove();var was=pick;pick=null;document.querySelectorAll('.slot.picking').forEach(function(x){x.classList.remove('picking')});if(refocus&&was){var sb=document.querySelector('.slot[data-k="'+was.k+'"][data-h="'+was.id+'"]');if(sb)sb.focus({preventScroll:true})}}
function openPicker(b){
  closePicker();
  var k=b.dataset.k,id=b.dataset.h,hb=findHabit(id);if(!hb)return;
  pick={k:k,id:id};b.classList.add('picking');
  var on=isOn(k,id),mn=isMini(k,id),d=new Date(k+'T00:00:00');
  var el=document.createElement('div');el.id='picker';el.className='picker';el.setAttribute('role','dialog');el.setAttribute('aria-label',hb.name+' '+md(d)+' 도장 고르기');
  el.innerHTML='<div class="ph">'+esc(hb.name)+' · '+md(d)+'</div>'
    +'<button type="button" class="pbtn'+(on&&mn?' cur':'')+'" data-pick="mini"><span class="sw s-mini" style="--c:'+hb.color+'"></span>최소만 했어요</button>'
    +'<button type="button" class="pbtn'+(on&&!mn?' cur':'')+'" data-pick="full"><span class="sw s-full" style="--c:'+hb.color+'"></span>목표만큼 했어요</button>'
    +(on?'<button type="button" class="pbtn clear" data-pick="clear"><i>✕</i>도장 지우기</button>':'');
  document.body.appendChild(el);
  var r=b.getBoundingClientRect(),w=el.offsetWidth,hgt=el.offsetHeight,vw=document.documentElement.clientWidth;
  var left=Math.min(Math.max(8,r.left+r.width/2-w/2),vw-w-8),top=r.bottom+6;
  if(top+hgt>window.innerHeight-8&&r.top-hgt-6>8)top=r.top-hgt-6;
  el.style.left=(left+window.scrollX)+'px';el.style.top=(top+window.scrollY)+'px';
  var f=el.querySelector('.pbtn.cur')||el.querySelector('.pbtn');if(f)f.focus({preventScroll:true});
}
document.addEventListener('keydown',function(e){if(e.key==='Escape'&&pick)closePicker(true)});
window.addEventListener('resize',function(){if(pick)closePicker()});
document.addEventListener('click',function(e){
  var t=e.target;if(!t.closest)return;
  var pk=t.closest('[data-pick]');
  if(pk&&pick){
    var k=pick.k,id=pick.id,v=pk.dataset.pick,rr=isOn(k,id)?rotOf(k,id):Math.round(Math.random()*36-18),was=isOn(k,id)?(isMini(k,id)?'mini':'full'):'';
    if(v==='clear'){delete state.checks[k][id];if(!Object.keys(state.checks[k]).length)delete state.checks[k]}
    else{(state.checks[k]=state.checks[k]||{})[id]=v==='mini'?'m'+rr:rr;if(v!==was)just={k:k,id:id}}
    closePicker();armed=null;render();
    var nb=document.querySelector('.slot[data-k="'+k+'"][data-h="'+id+'"]');if(nb)nb.focus({preventScroll:true});
    if(v!==was)save(800);return;
  }
  if(pick&&!t.closest('#picker')&&!t.closest('.slot'))closePicker();
  var tb2=t.closest('[data-tab]');if(tb2){tab=tb2.dataset.tab;lsSet('ht-tab',tab);armed=null;render();var nt2=document.querySelector('[data-tab="'+tab+'"]');if(nt2)nt2.focus({preventScroll:true});window.scrollTo({top:0});return}
  var ng=t.closest('[data-nudge]');if(ng){nudgeIdx++;render();var nn=document.querySelector('[data-nudge]');if(nn)nn.focus({preventScroll:true});return}
  var bx=t.closest('[data-backx]');if(bx){var bt=document.getElementById('backtoast');if(bt)bt.hidden=true;return}
  var rst=t.closest('[data-rest]');if(rst){var ra=state.rest[todayKey]=state.rest[todayKey]||[];if(ra.indexOf(rst.dataset.rest)<0)ra.push(rst.dataset.rest);var rk=Object.keys(state.rest).sort();while(rk.length>30)delete state.rest[rk.shift()];render();save(400);return}
  var qk=t.closest('[data-quick]');if(qk){var qp=qk.dataset.quick.split('|');stampToday(qp[0],qp[1]);return}
  var sb2=t.closest('[data-star]');if(sb2){var sid2=sb2.dataset.star;if(focusId()===sid2)delete state.focus[todayKey];else state.focus[todayKey]={id:sid2};trimFocus();render();var ns2=document.querySelector('[data-star="'+sid2+'"]');if(ns2)ns2.focus({preventScroll:true});save(400);return}
  var fd=t.closest('[data-fdone]');if(fd){var ff=state.focus[todayKey];if(ff){ff.done=fd.dataset.fdone==='1';heroPress=ff.done;render();save(400)}return}
  var fcl=t.closest('[data-fclear]');if(fcl){delete state.focus[todayKey];render();var fi=document.getElementById('focusin');if(fi)fi.focus();save(400);return}
  var nt=t.closest('[data-notime]');if(nt){var nth=findHabit(nt.dataset.notime);if(nth){delete nth.time;render();save(400)}return}
  var cb=t.closest('[data-cnt]');
  if(cb){var cp=cb.dataset.cnt.split('|'),ch=findHabit(cp[0]);if(ch){var w=ymd(view),cc=state.counts[w]=state.counts[w]||{},nv2=Math.max(0,Math.min(14,(+cc[ch.id]||0)+(+cp[1])));if(nv2)cc[ch.id]=nv2;else delete cc[ch.id];if(!Object.keys(cc).length)delete state.counts[w];render();var nb2=document.querySelector('[data-cnt="'+cb.dataset.cnt+'"]');if(nb2&&!nb2.disabled)nb2.focus({preventScroll:true});save(800)}return}
  var go=t.closest('[data-go]');
  if(go){startTimer(go.dataset.go);return}
  var tb=t.closest('[data-t]');
  if(tb&&tmr){
    var act=tb.dataset.t;
    if(act==='pause'){if(tmr.paused){tmr.end=Date.now()+tmr.left;tmr.paused=false}else{tmr.left=tleft();tmr.paused=true}renderTimer()}
    else if(act==='stop'){tmr.phase='stopped';clearInterval(tick);renderTimer()}
    else if(act==='again'){startTimer(tmr.id)}
    else if(act==='close'){tmr=null;renderTimer()}
    else if(act==='upgrade'){if(isMini(todayKey,tmr.id)){state.checks[todayKey][tmr.id]=rotOf(todayKey,tmr.id);just={k:todayKey,id:tmr.id};save(400)}tmr=null;render();renderTimer()}
    else if(act==='stamp'||act==='ministamp'){var sid=tmr.id;if(!isOn(todayKey,sid)){var rr=Math.round(Math.random()*36-18);(state.checks[todayKey]=state.checks[todayKey]||{})[sid]=act==='ministamp'?'m'+rr:rr;just={k:todayKey,id:sid};view=thisMon;save(400)}tmr=null;render();renderTimer()}
    return;
  }
  var b=t.closest('.slot');
  if(b){
    if(b.disabled)return;
    var k=b.dataset.k,id=b.dataset.h;
    if(pick&&pick.k===k&&pick.id===id){closePicker(true);return}
    openPicker(b);return;
  }
  var nv=t.closest('[data-nav]');
  if(nv){var s=+nv.dataset.nav;view=s===0?thisMon:addDays(view,7*s);armed=null;render();return}
  var sg=t.closest('[data-setgoal]');
  if(sg){var pr=sg.dataset.setgoal.split('|'),gh=findHabit(pr[0]);if(gh){gh.goal=+pr[1];render();save(400)}return}
  var smn=t.closest('[data-setmini]');
  if(smn){var mp=smn.dataset.setmini,ix=mp.indexOf('|'),mh=findHabit(mp.slice(0,ix));if(mh){mh.mini=mp.slice(ix+1);mh.mode='mini';render();save(400)}return}
  var rn=t.closest('[data-rename]');
  if(rn){var md2=document.getElementById('manage');if(md2){md2.open=true;lsSet('ht-manage','1')}var ni2=document.getElementById('mini-'+rn.dataset.rename);if(ni2){ni2.focus();ni2.select();ni2.scrollIntoView({block:'center'})}return}
  var del=t.closest('[data-del]');
  if(del){
    var hid=del.dataset.del;
    if(armed!==hid){armed=hid;render();var again=document.querySelector('[data-del="'+hid+'"]');if(again)again.focus();return}
    state.habits=state.habits.filter(function(x){return x.id!==hid});
    Object.keys(state.checks).forEach(function(k){delete state.checks[k][hid];if(!Object.keys(state.checks[k]).length)delete state.checks[k]});
    Object.keys(state.counts).forEach(function(w){delete state.counts[w][hid];if(!Object.keys(state.counts[w]).length)delete state.counts[w]});
    armed=null;render();save(400);
  }
});
document.addEventListener('change',function(e){
  var t=e.target,hb;
  if(t.dataset&&t.dataset.time){hb=findHabit(t.dataset.time);if(!hb)return;if(t.value)hb.time=t.value;else delete hb.time;render();save(400);return}
  if(t.dataset&&t.dataset.desc){hb=findHabit(t.dataset.desc);if(!hb)return;var dv=t.value.trim().slice(0,60);if(dv===(hb.desc||''))return;if(dv)hb.desc=dv;else delete hb.desc;render();save(400);return}
  if(t.name==='newkind'){newKind=t.value;var mr=document.getElementById('newmoderow'),nr0=document.getElementById('newminirow'),un=document.getElementById('newunit');if(mr)mr.hidden=newKind==='count';if(nr0)nr0.hidden=newKind==='count'||newMode!=='mini';if(un)un.textContent=newKind==='count'?'회':'일';return}
  if(t.dataset&&t.dataset.kind){hb=findHabit(t.dataset.kind);if(!hb)return;hb.kind=t.value;render();save(400);var fk=document.querySelector('input[name="kind-'+hb.id+'"]:checked');if(fk)fk.focus();return}
  if(t.dataset&&t.dataset.color){hb=findHabit(t.dataset.color);if(!hb)return;hb.color=t.value;render();save(400);var fc=document.querySelector('input[name="color-'+hb.id+'"]:checked');if(fc)fc.focus();return}
  if(t.dataset&&t.dataset.emoji){hb=findHabit(t.dataset.emoji);if(!hb)return;var ev=Array.from(t.value.trim()).slice(0,4).join('');if(ev===(hb.emoji||''))return;hb.emoji=ev;render();save(400);return}
  if(t.name==='newmode'){newMode=t.value;var nr=document.getElementById('newminirow');if(nr){nr.hidden=newMode!=='mini'||newKind==='count';if(newMode==='mini'){var nmi=document.getElementById('newmini'),nn=document.getElementById('newname');if(nmi&&!nmi.value&&nn)nmi.value=suggestMini(nn.value)}}return}
  if(t.dataset&&t.dataset.mode){hb=findHabit(t.dataset.mode);if(!hb)return;hb.mode=t.value;if(hb.mode==='mini'&&!hb.mini){var sm2=suggestMini(hb.name);if(sm2)hb.mini=sm2}render();save(400);var fm=document.getElementById(hb.mode==='mini'?'mini-'+hb.id:'mode-'+hb.id);if(fm)fm.focus();return}
  if(t.dataset&&t.dataset.name){hb=findHabit(t.dataset.name);if(!hb)return;var v=t.value.trim().slice(0,30);if(!v){t.value=hb.name;return}if(v===hb.name)return;hb.name=v;render();save(400)}
  else if(t.dataset&&t.dataset.mini){hb=findHabit(t.dataset.mini);if(!hb)return;var mv=t.value.trim().slice(0,30);if(mv===(hb.mini||''))return;if(mv)hb.mini=mv;else delete hb.mini;render();save(400)}
  else if(t.dataset&&t.dataset.goal){hb=findHabit(t.dataset.goal);if(!hb)return;hb.goal=+t.value;render();save(400)}
});
document.addEventListener('submit',function(e){
  if(e.target.id==='focusform'){e.preventDefault();var fin=document.getElementById('focusin'),fv=fin.value.trim().slice(0,40);if(!fv){fin.focus();return}state.focus[todayKey]={text:fv};trimFocus();render();save(400);return}
  if(e.target.id!=='addform')return;
  e.preventDefault();
  var inp=document.getElementById('newname'),v=inp.value.trim().slice(0,30);
  if(!v){inp.placeholder='습관 이름을 입력해 주세요';inp.focus();return}
  var nm=document.getElementById('newmini').value.trim().slice(0,30),nh={id:'h'+Date.now().toString(36),created:todayKey,name:v,goal:+document.getElementById('newgoal').value||3};
  nh.color=nextColor();nh.kind=newKind;
  nh.mode=newMode;if(newMode==='mini'&&newKind!=='count'){nm=nm||suggestMini(v);if(nm)nh.mini=nm}state.habits.push(nh);miniDirty=false;emoDirty=false;
  armed=null;render();var ni=document.getElementById('newname');if(ni)ni.focus();save(400);
});
var miniDirty=false,emoDirty=false;
document.addEventListener('input',function(e){
  if(e.target.id==='newname'){var mi=document.getElementById('newmini');if(mi&&!miniDirty)mi.value=suggestMini(e.target.value);var ne2=document.getElementById('newemoji');if(ne2&&!emoDirty)ne2.value=e.target.value.trim()?suggestEmoji(e.target.value):''}
  else if(e.target.id==='newemoji'){emoDirty=e.target.value.trim()!==''}
  else if(e.target.id==='newmini'){miniDirty=e.target.value.trim()!==''}
});
function readout(c){var r=document.getElementById('readout');if(r)r.textContent=c?c.dataset.tip:r.dataset.def}
document.addEventListener('mouseover',function(e){var c=e.target.closest&&e.target.closest('.col');if(c)readout(c)});
document.addEventListener('mouseout',function(e){var c=e.target.closest&&e.target.closest('.plot');if(c&&!c.contains(e.relatedTarget))readout(null)});
document.addEventListener('focusin',function(e){if(e.target.classList&&e.target.classList.contains('col'))readout(e.target)});
document.addEventListener('toggle',function(e){if(e.target.id==='manage')lsSet('ht-manage',e.target.open?'1':'0')},true);

/* ── 쉬는 습관 팝업 & 알림 ─────────────────────────────
   - 습관을 REST_DAYS(5)일 연속 못 하면, 하루에 한 번 팝업으로 '더 작게 다시 계획하기'를 제안
   - 브라우저 알림 권한을 허용하면, 앱이 열려 있는 동안 팝업·확인 시간 알림을 함께 보냄
   - 앱을 완전히 닫은 상태의 알림은 푸시 서버가 필요해 지원하지 않음 */
function canNotify(){return 'Notification' in window}
function notiBtn(){
  if(!canNotify()||Notification.permission!=='default')return '';
  if(!state.habits.some(function(hb){return hb.time||isResting(hb)}))return '';
  return '<button type="button" class="btn sm notibtn" data-noti="1">🔔 알림 켜기</button>';
}
function notify(title,body,tag){
  if(!canNotify()||Notification.permission!=='granted')return;
  try{var n=new Notification(title,{body:body,tag:tag});n.onclick=function(){window.focus();n.close()}}
  catch(e){ // 일부 모바일 브라우저는 서비스 워커를 통해서만 알림을 띄울 수 있음
    if(navigator.serviceWorker&&navigator.serviceWorker.ready)navigator.serviceWorker.ready.then(function(r){r.showNotification(title,{body:body,tag:tag})}).catch(function(){});
  }
}
function notified(key){var o={};try{o=JSON.parse(lsGet('ht-notified')||'{}')}catch(e){}if(o.d!==todayKey)o={d:todayKey,k:[]};if(o.k.indexOf(key)>=0)return true;o.k.push(key);lsSet('ht-notified',JSON.stringify(o));return false}
function restActs(hb){
  var cur=hb.mini||suggestMini(hb.name),sm=hb.mode==='mini'?shrinkMini(cur):'',g=hb.goal>1?Math.max(1,Math.ceil(hb.goal/2)):0;
  return (isTimer(hb)?'<button type="button" class="btn sm primary" data-go="'+hb.id+'">▶ 5분만 해 보기</button>':'<button type="button" class="btn sm primary" data-quick="'+hb.id+'|mini">오늘 최소로 한 번만</button>')
    +(sm&&sm!==cur?'<button type="button" class="btn sm" data-setmini="'+hb.id+'|'+esc(sm)+'">더 작게: '+esc(sm)+'</button>':'')
    +(g&&g<hb.goal?'<button type="button" class="btn sm" data-setgoal="'+hb.id+'|'+g+'">목표 주 '+hb.goal+'일 → '+g+'일</button>':'')
    +'<button type="button" class="btn sm link" data-rest="'+hb.id+'">오늘은 쉴게요</button>';
}
function closeRestPop(){var d=document.getElementById('restpop');if(d){if(d.open&&d.close)d.close();d.remove()}}
function openRestPop(rs){
  closeRestPop();
  var d=document.createElement('dialog');d.id='restpop';d.className='restpop';d.setAttribute('aria-labelledby','restpop-h');
  var h='<div class="rphead"><span class="rpic" aria-hidden="true">🌱</span><div><b id="restpop-h">더 작게 다시 시작해 볼까요?</b>'
    +'<p>며칠 쉬었어도 괜찮아요. 부담을 줄여서 다시 이어가 봐요.</p></div></div>';
  rs.forEach(function(hb){
    var r=restInfo(hb,todayKey);
    h+='<div class="rprow" style="--c:'+hb.color+'"><div class="rpname"><i class="hic" aria-hidden="true">'+esc(hb.emoji||hb.name.charAt(0))+'</i><span><b>'+esc(hb.name)+'</b><small>'+(r.first?'아직 첫 도장 전이에요':r.n+'일 쉬었어요')+'</small></span></div>'
      +'<div class="rpacts">'+restActs(hb)+'</div></div>';
  });
  h+='<div class="rpfoot">'+(canNotify()&&Notification.permission==='default'?'<button type="button" class="btn sm" data-noti="1">🔔 알림도 받을래요</button>':'<span></span>')
    +'<button type="button" class="btn sm" data-rpclose="1">나중에 할게요</button></div>';
  d.innerHTML=h;document.body.appendChild(d);
  d.addEventListener('click',function(e){
    if(e.target===d){closeRestPop();return} // 바깥(배경) 클릭 시 닫기
    var b=e.target.closest&&e.target.closest('[data-rpclose],[data-quick],[data-go],[data-setmini],[data-setgoal],[data-rest]');
    if(b)setTimeout(closeRestPop,0); // 버튼 동작은 기존 클릭 처리기가 수행한 뒤 팝업만 닫음
  });
  d.addEventListener('close',function(){setTimeout(closeRestPop,0)});
  if(d.showModal)d.showModal();else d.setAttribute('open','');
  var f=d.querySelector('.rpacts .btn');if(f)f.focus();
}
function checkAlerts(){
  var rs=ordered().filter(isResting);
  if(rs.length&&lsGet('ht-restpop')!==todayKey&&!tmr&&!pick){
    lsSet('ht-restpop',todayKey);openRestPop(rs);
    if(!notified('rest'))notify('더 작게 다시 시작해 볼까요?',rs.map(function(hb){return hb.name}).join(', ')+' · 며칠 쉬었어도 괜찮아요','rest');
  }
  ordered().filter(isDue).forEach(function(hb){if(!notified('due-'+hb.id))notify('⏰ '+hb.name,'확인할 시간이에요 ('+hb.time+')','due-'+hb.id)});
}
document.addEventListener('click',function(e){
  var nb=e.target.closest&&e.target.closest('[data-noti]');if(!nb||!canNotify())return;
  Notification.requestPermission().then(function(){render();var d=document.querySelector('#restpop [data-noti]');if(d)d.replaceWith(document.createElement('span'));checkAlerts()});
});
setInterval(checkAlerts,30000);

render();
setInterval(function(){var n2=new Date(),k2=ymd(n2);if(k2!==todayKey){var wasThis=+view===+thisMon;now=n2;todayKey=k2;thisMon=mondayOf(n2);if(wasThis)view=thisMon;dueSig=''}if(dueKey()===dueSig)return;var ae=document.activeElement;if(pick||(ae&&ae.matches&&ae.matches('input,select,textarea')))return;render()},30000);
(window.claude&&window.claude.use?window.claude.use('artifact'):Promise.resolve(null)).then(function(a){
  if(a){art=a;mode='artifact'}
  else{
    mode='local';
    var saved=lsGet('ht-state');
    if(saved){try{state=JSON.parse(saved);normalize();render();checkAlerts();return}catch(e){}}
  }
  setStatus();checkAlerts();
}).catch(function(){mode='local';setStatus();checkAlerts()});
})();
