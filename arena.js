(()=>{
'use strict';
const arenaChannel=leaderboardConfig.sessionKey.includes('release')?'formal':'test';
let opponentPool=[],opponentFetchedAt=0,opponentOffset=0,currentView='opponents',busy=false;
const $a=s=>document.querySelector(s),$$a=s=>[...document.querySelectorAll(s)];
function eligible(){return (state.spiritLevel||0)>=40||(state.swordLevel||0)>=40||(state.bodyLevel||0)>=16}
function highestRealm(){return [{name:'練氣',text:realmName(state.spiritLevel||0,spiritRealms),n:(state.spiritLevel||0)/10},{name:'淬劍',text:realmName(state.swordLevel||0,swordRealms),n:(state.swordLevel||0)/10},{name:'煉體',text:bodyRealmName(state.bodyLevel||0),n:(state.bodyLevel||0)/4}].sort((a,b)=>b.n-a.n)[0]}
function snapshot(){
  // Capture the same five effective values used by the character panel.
  // Comprehension and fortune are not combat attributes; learned bonuses to
  // spiritualPower remain part of the displayed spiritualPower value.
  const core=Object.fromEntries(['rootBone','trueQi','physique','agility','spiritualPower'].map(k=>[k,effectiveCore(k)]));
  const base_core=Object.fromEntries(['rootBone','trueQi','physique','agility','spiritualPower'].map(k=>[k,Math.max(0,Number(state.serverBaseCore?.[k])||0)+(['rootBone','trueQi','physique','agility'].includes(k)?Math.max(0,Number(state.serverPermanentAttributeBonuses?.[k])||0)+Math.max(0,Number(state.serverAscensionAllocations?.[k])||0):0)]));
  const component_core=Object.fromEntries(['rootBone','trueQi','physique','agility','spiritualPower'].map(k=>[k,base_core[k]+swordPathBonus(k)+equippedAttributeBonus(k)]));
  const book_core=Object.fromEntries(['rootBone','trueQi','physique','agility','spiritualPower'].map(k=>[k,component_core[k]+(state.learnedArts||[]).filter(art=>art.source==='book').reduce((sum,art)=>sum+(artKinds[art.kind]?.attribute===k?artTotalEffect(art):0)+(k==='spiritualPower'?artSecondarySpiritualPower(art):0),0)]));
  const sect_core=Object.fromEntries(['rootBone','trueQi','physique','agility','spiritualPower'].map(k=>[k,book_core[k]+(state.learnedArts||[]).filter(art=>art.sourceSect&&art.kind!=='sectSkill').reduce((sum,art)=>sum+(artKinds[art.kind]?.attribute===k?artTotalEffect(art):0)+(k==='spiritualPower'?artSecondarySpiritualPower(art):0),0)]));
  const stats=battlePlayerStats(),best=highestRealm(),marks=swordPathMarkCounts(),realm=swordRealmProfile();
  const moves=equippedCombatTechniques().slice(0,2).map((m,i)=>{
    const move={...m};
    move.balanceMultiplier=i===1?1+(m.embryo?Math.min(.5,marks.balance*.05):0)+(stats.alignmentSecondMove||0):1;
    move.damageMultiplier=m.embryo?(1+realm.damage+realm.techniqueDamage)*(1+swordNurtureTechniqueBonus(m))*(1+Math.min(.2,marks.evil*.02)):1;
    move.accuracyBonus=(m.accuracyBonus||0)+(m.embryo?realm.accuracy:0);
    move.armorPierce=Math.min(.8,(m.armorPierce||0)+(m.embryo?realm.armorPierce:0));
    move.attributeDamage=m.kind==='sectSkill'&&Object.hasOwn(core,m.attribute)?core[m.attribute]*(m.attributeMultiplier||0):0;
    move.lifeSteal=(m.lifeSteal||0)+(typeof potentialSkillLifeSteal==='function'?potentialSkillLifeSteal():0);
    return move;
  });
  return {schema_version:3,eligible:eligible(),highest_realm:`${best.name}・${best.text}`,
    progression:{spirit_level:Math.max(0,Math.floor(state.spiritLevel||0)),sword_level:Math.max(0,Math.floor(state.swordLevel||0)),body_level:Math.max(0,Math.floor(state.bodyLevel||0))},active_path:state.activePath||state.firstPath||'',base_core,component_core,book_core,sect_core,core,
    combat_power:Math.round(Object.entries(combatPowerWeights).reduce((n,[k,w])=>n+core[k]*w,0)),
    gender:state.gender,sword_embryo:state.swordEmbryo||'',sword_name:state.swordName||'',sword_nurture_level:state.swordNurtureLevel||0,sword_intent_type:state.swordIntentType||'',moves,stats,captured_at:Date.now()};
}
async function rpc(name,body={}){let session=await ensureLeaderboardSession(),response=await fetch(`${leaderboardConfig.url}/rest/v1/rpc/${name}`,{method:'POST',headers:leaderboardHeaders(session.access_token),body:JSON.stringify(body)});if(response.status===401){session=await ensureLeaderboardSession(true);response=await fetch(`${leaderboardConfig.url}/rest/v1/rpc/${name}`,{method:'POST',headers:leaderboardHeaders(session.access_token),body:JSON.stringify(body)})}const data=await response.json().catch(()=>null);if(!response.ok)throw new Error(data?.message||'問道臺暫時無法連線');return data}
let profileSync=null;
async function syncProfile(){if(!eligible()||!state.name)return null;if(profileSync)return profileSync;profileSync=rpc('arena_sync_profile',{p_channel:arenaChannel,p_name:state.name,p_snapshot:snapshot()});try{return await profileSync}finally{profileSync=null}}
window.syncSwordTrialProfile=()=>state.name?rpc('arena_sync_profile',{p_channel:arenaChannel,p_name:state.name,p_snapshot:snapshot()}):Promise.reject(new Error('角色尚未建立'));
function modal(){let box=$a('#wendaoArenaModal');if(box)return box;box=document.createElement('div');box.id='wendaoArenaModal';box.className='wendao-arena-modal';box.innerHTML=`<section class="wendao-arena-window"><button class="wendao-arena-close" aria-label="關閉">×</button><header><small>凡間論道・每週競鋒</small><h2>問道臺</h2><p>不借法寶，只以修為、裝備與招式論道</p></header><nav class="wendao-arena-tabs"><button data-arena-view="opponents" class="active">對手</button><button data-arena-view="ranking">排行</button><button data-arena-view="history">戰錄</button></nav><div id="wendaoArenaContent"></div></section>`;document.body.appendChild(box);box.querySelector('.wendao-arena-close').onclick=()=>box.remove();box.onclick=e=>{if(e.target===box)box.remove()};box.querySelectorAll('[data-arena-view]').forEach(b=>b.onclick=()=>renderView(b.dataset.arenaView));return box}
async function claimRewards(){const rows=await rpc('arena_claim_rewards',{p_channel:arenaChannel});for(const r of rows||[]){const id=`arena-week-${arenaChannel}-${r.week_start}`;if(mailbox().some(m=>m.id===id))continue;mailbox().unshift({id,subject:`問道臺每週結算・第${r.rank}名`,sender:'問道臺執事',body:`道友於上週問道臺位列第${r.rank}名，獎勵已隨信奉上。`,sentAt:gameNow(),read:false,claimed:false,attachments:[{type:'item',key:'reputationspiritStone10000Count',name:'一萬靈石',image:itemCatalog.reputationspiritStone10000.image,amount:r.stone_bundle_count}]})}if((rows||[]).length){renderMailButton();save()}}
async function open(){if(!eligible())return toast('三路修行任一路達第五境一階後開放問道臺');if(normalizeAscension().currentRealm==='immortal')return toast('問道臺設於凡間，請先返回凡間');modal();try{await syncProfile();await claimRewards();await renderView('opponents')}catch(e){$a('#wendaoArenaContent').innerHTML=`<p class="arena-empty">${escapeLeaderboardText(e.message)}</p>`}}
async function loadOpponents(force=false){if(force||gameNow()-opponentFetchedAt>=300000||!opponentPool.length){opponentPool=await rpc('arena_opponents',{p_channel:arenaChannel})||[];opponentFetchedAt=gameNow();opponentOffset=0}else opponentOffset+=3;return Array.from({length:Math.min(3,opponentPool.length)},(_,i)=>opponentPool[(opponentOffset+i)%opponentPool.length])}
function opponentRealm(snapshot){if(snapshot.highest_path&&Number.isFinite(Number(snapshot.highest_level))){const level=Number(snapshot.highest_level);return snapshot.highest_path==='body'?bodyRealmName(level):realmName(level,snapshot.highest_path==='sword'?swordRealms:spiritRealms)}return snapshot.highest_realm||'凡境未明'}
function opponentCard(row){const s=row.snapshot||{},moves=(s.moves||[]).slice(0,2);return `<article class="arena-opponent"><div><small>積分 ${row.score}</small><b>${escapeLeaderboardText(row.player_name)}</b><span>${escapeLeaderboardText(opponentRealm(s))}</span></div><strong>戰力 ${formatCombatPower(s.combat_power||0)}</strong><p>${moves.length?moves.map(m=>escapeLeaderboardText(m.name)).join('・'):'未配置招式'}</p><button data-arena-challenge="${row.user_id}">挑戰</button></article>`}
async function renderView(view=currentView,force=false){currentView=view;const box=modal(),content=box.querySelector('#wendaoArenaContent');box.querySelectorAll('[data-arena-view]').forEach(b=>b.classList.toggle('active',b.dataset.arenaView===view));content.innerHTML='<p class="arena-loading">正在展開問道名冊……</p>';try{if(view==='opponents'){const [status,opponents]=await Promise.all([rpc('arena_status',{p_channel:arenaChannel}),loadOpponents(force)]);content.innerHTML=`<section class="arena-status"><span><small>目前積分</small><b>${status.score}</b></span><span><small>本週名次</small><b>${status.rank||'未上榜'}</b></span><span><small>今日可戰</small><b>${status.free_remaining+status.bought_available} / 10</b></span></section><div class="arena-purchase"><button data-arena-buy="stone" ${status.stone_bought>=5?'disabled':''}>5000靈石・挑戰1次<small>今日 ${status.stone_bought}/5</small></button><button data-arena-buy="jade" ${status.jade_bought>=5?'disabled':''}>10靈玉・挑戰1次<small>今日 ${status.jade_bought}/5</small></button><button id="arenaRefresh">刷新對手<small>名冊每5分鐘更新</small></button></div><div class="arena-opponents">${opponents.length?opponents.map(opponentCard).join(''):'<p class="arena-empty">目前沒有可挑戰的修士；待其他玩家進入問道臺後便會出現。</p>'}</div>`;content.querySelectorAll('[data-arena-challenge]').forEach(b=>b.onclick=()=>challenge(b.dataset.arenaChallenge));content.querySelectorAll('[data-arena-buy]').forEach(b=>b.onclick=()=>buy(b.dataset.arenaBuy));$a('#arenaRefresh').onclick=()=>renderView('opponents',gameNow()-opponentFetchedAt>=300000)}else if(view==='ranking'){const [status,rows]=await Promise.all([rpc('arena_status',{p_channel:arenaChannel}),rpc('arena_rankings',{p_channel:arenaChannel})]);content.innerHTML=`<div class="arena-own-rank">我的名次：${status.rank||'未上榜'}・積分 ${status.score}</div><div class="arena-ranking">${(rows||[]).map(r=>`<article><strong>${r.rank}</strong><b>${escapeLeaderboardText(r.player_name)}</b><span>${r.score}分</span></article>`).join('')||'<p class="arena-empty">本週尚無戰績</p>'}</div>`}else{const rows=await rpc('arena_history',{p_channel:arenaChannel}),uid=readLeaderboardSession()?.user?.id;content.innerHTML=`<div class="arena-history">${(rows||[]).map(r=>{const mine=r.was_challenger,won=r.winner_id===uid,foe=mine?r.defender_name:r.challenger_name,d=mine?r.challenger_delta:r.defender_delta;return `<article class="${won?'won':'lost'}"><b>${won?'勝':'敗'}・${escapeLeaderboardText(foe)}</b><span>${d>=0?'+':''}${d}分</span><small>${new Date(r.created_at).toLocaleString()}</small></article>`}).join('')||'<p class="arena-empty">尚無對戰紀錄</p>'}</div>`}}catch(e){content.innerHTML=`<p class="arena-empty">${escapeLeaderboardText(e.message)}</p>`}}
function updateArenaPurchaseState(status){const values=$a('.arena-status')?.querySelectorAll('b');if(values?.[2])values[2].textContent=`${status.free_remaining+status.bought_available} / 10`;const stone=$a('#spiritStoneAmount'),jade=$a('#spiritJadeAmount');if(stone)stone.textContent=formatLargeNumber(state.spiritStone);if(jade)jade.textContent=formatLargeNumber(state.spiritJade)}
async function buy(kind,{preserveView=false}={}){if(busy)return null;const price=kind==='stone'?5000:10,key=kind==='stone'?'spiritStone':'spiritJade',label=kind==='stone'?'靈石':'靈玉';if(state[key]<price){toast(`${label}不足`);return null}busy=true;try{const receipt=await rpc('arena_buy_attempt',{p_kind:kind,p_channel:arenaChannel,p_request_id:crypto.randomUUID()});if(receipt.wallet){serverResourceWalletRevision=Number(receipt.wallet.revision)||serverResourceWalletRevision;applyServerWalletSnapshot(receipt.wallet.resources)}if(receipt.jade){state.spiritJade=Math.max(0,Number(receipt.jade.balance)||0);serverJadeRevision=Number(receipt.jade.revision)||serverJadeRevision}save();toast('問道臺挑戰次數 +1');if(preserveView){const status=await rpc('arena_status',{p_channel:arenaChannel});updateArenaPurchaseState(status);return status}render();await renderView('opponents');return null}catch(e){toast(e.message);return null}finally{busy=false}}
const arenaChallengeRequestIds=new Map();
async function challenge(userId){if(busy)return;busy=true;const requestId=arenaChallengeRequestIds.get(userId)||crypto.randomUUID();arenaChallengeRequestIds.set(userId,requestId);try{await syncProfile();const data=await rpc('arena_begin_challenge',{p_channel:arenaChannel,p_defender:userId,p_request_id:requestId});arenaChallengeRequestIds.delete(userId);modal().remove();startBattle(data)}catch(e){toast(e.message)}finally{busy=false}}
function startBattle(data){const s=data.opponent||{},t=s.battle_stats||s.stats||{},maxHp=Math.max(125,Number(t.maxHp)||125),player=data.challenger.stats;clearTimeout(battleTimer);startBgm('battle');battle={active:true,resolved:false,mode:'arena',arenaMatchId:data.match_id,arenaOpponentSnapshot:s,arenaPlayerSnapshot:data.challenger,enemyMoveIndex:0,round:1,completedRounds:0,playerMoveIndex:0,player:{...player,hp:player.maxHp},enemy:{...t,maxHp,hp:maxHp,attack:Math.max(1,Number(t.attack)||1),defense:Math.max(0,Number(t.defense)||0),evasion:Math.max(0,Number(t.evasion)||0),accuracy:Math.max(0,Number(t.accuracy)||0),crit:Math.max(0,Number(t.crit)||0),name:data.opponent_name||'無名修士',race:'human'},logs:[]};$a('#battleModal').classList.remove('hidden');$a('#battleStage').classList.remove('hidden');$a('#battleResult').classList.add('hidden');$a('#playerSilhouette').className=`battle-silhouette ${state.gender==='女'?'silhouette-player-female':'silhouette-player-male'}`;$a('#enemySilhouette').className=`battle-silhouette arena-enemy ${s.gender==='女'?'silhouette-player-female':'silhouette-player-male'} ${s.sword_embryo?'has-arena-sword':''}`;$a('#battlePlayerName').textContent=state.name;$a('#battleEnemyName').textContent=battle.enemy.name;$a('.battle-arena').classList.add('wendao-battle');$a('.battle-arena').style.backgroundImage="linear-gradient(#f6fff344,#d9eee033),url('assets/qstyle-v2/wendao-arena-battle-bg-v1.png')";$a('#battleLog').innerHTML=`<p><b>問道臺</b>・雙方法寶均不生效・對手招式：${(s.moves||[]).map(m=>escapeLeaderboardText(m.name)).join('、')||'凝念馭元'}</p>`;syncBattleWeapon();updateBattleUi();battleTimer=setTimeout(playerBattleTurn,700)}
async function submit(won,id){try{const r=await rpc('arena_finish_match',{p_match:id,p_won:won});if(typeof r.won==='boolean'&&r.won!==won){const seal=$a('#battleResultSeal'),title=$a('#battleResultTitle'),text=$a('#battleResultText');if(seal){seal.textContent=r.won?'勝':'敗';seal.classList.toggle('defeat',!r.won)}if(title)title.textContent=r.won?'問道臺裁定勝利':'問道臺裁定落敗';if(text)text.textContent='本場積分以伺服器裁定為準。'}toast(`問道臺積分 ${r.delta>=0?'+':''}${r.delta}・目前 ${r.score}`);opponentFetchedAt=0;await syncProfile()}catch(e){toast(e.message)}}
const originalArtifact=activeBattleArtifact;activeBattleArtifact=function(){return battle?.mode==='arena'?'':originalArtifact()};
// Both combatants use the same snapshot-only engine. No local character
// state, artifact or displayed combat-power value participates in damage.
function arenaHit(attacker,defender,move,core,random=Math.random){
  const mult=(move.kind==='sectSkill'?(move.basePercent||0)/100:(move.min??.8)+random()*((move.max??1)-(move.min??.8)))*(move.balanceMultiplier||1)*(move.damageMultiplier||1);
  const attack=move.kind==='body'?(attacker.bodyAttack||attacker.attack):move.embryo?attacker.attack:(attacker.qiAttack||attacker.attack);
  const accuracy=Math.max(attacker.accuracy||0,move.kind==='body'?((core.rootBone||0)+(core.physique||0))*1.5:0)*(1+(move.accuracyBonus||0));
  const defense=Math.max(0,defender.defense*(1-(move.armorPierce||0))),critical=Math.min(.75,(attacker.crit||0)+(move.critBonus||0));
  const parts=[],hits=Math.max(1,move.hits||1);
  function hit(scale){
    const dodge=Math.min(.35,defender.evasion/(defender.evasion+accuracy*4+1000));
    if(random()<dodge)return {damage:0,dodged:true,crit:false};
    const crit=random()<critical,pressure=Math.max(160,attack*.8),mitigation=Math.max(.15,pressure/(pressure+defense));
    const raw=attack*scale*mitigation+(move.kind==='sectSkill'?(move.attributeDamage||0)*(move.balanceMultiplier||1):0);
    return {damage:Math.max(1,Math.round(raw*(crit?1.5:1)*(1-(defender.damageReduction||0)))),dodged:false,crit};
  }
  for(let i=0;i<hits;i++)parts.push(hit(mult/hits));
  const repeated=!!move.repeatChance&&random()<move.repeatChance;
  if(repeated)parts.push(hit(mult*(move.repeatScale||.5)));
  const landed=parts.filter(p=>!p.dodged);
  return {damage:parts.reduce((n,p)=>n+p.damage,0),dodged:!landed.length,crit:landed.some(p=>p.crit),parts,hits:landed.length,repeated};
}
function arenaTurn(side){
  if(!battle?.active||battle.mode!=='arena')return;
  const foe=side==='player'?'enemy':'player',s=side==='player'?battle.arenaPlayerSnapshot:battle.arenaOpponentSnapshot;
  const index=side==='player'?battle.playerMoveIndex++:battle.enemyMoveIndex++;
  const move=s.moves[index%s.moves.length],actor=battle[side],target=battle[foe];
  const hit=arenaHit(actor,target,move,s.core);
  target.hp=Math.max(0,target.hp-hit.damage);
  if(!hit.dodged){
    actor.hp=Math.min(actor.maxHp,actor.hp+Math.max(0,Math.round(hit.damage*(move.lifeSteal||0))));
    if(move.guardBonus)actor.damageReduction=Math.max(actor.damageReduction||0,move.guardBonus);
  }
  animateBattleStrike(side==='player'?'#playerSilhouette':'#enemySilhouette',side==='player'?'#enemySilhouette':'#playerSilhouette',hit,move);
  appendBattleLog(hit.dodged?`${target.name||state.name}避開了${move.name}。`:`${actor.name||state.name}使出${move.name}，造成 ${formatBattleNumber(hit.damage)} 傷害。`,side);
  if(side==='enemy')battle.completedRounds++;
  updateBattleUi();
  if(target.hp<=0){battleTimer=setTimeout(()=>finishBattle(side==='player','氣血耗盡，本次問道結束。'),650);return}
  if(side==='enemy')battle.round++;
  battleTimer=setTimeout(side==='player'?enemyBattleTurn:playerBattleTurn,950);
}
const originalPlayerTurn=playerBattleTurn;playerBattleTurn=function(){return battle?.mode==='arena'?arenaTurn('player'):originalPlayerTurn()};
const originalEnemyTurn=enemyBattleTurn;enemyBattleTurn=function(){return battle?.mode==='arena'?arenaTurn('enemy'):originalEnemyTurn()};
const originalFinish=finishBattle;finishBattle=function(won,reason){const id=battle?.mode==='arena'&&!battle.resolved?battle.arenaMatchId:null;originalFinish(won,reason);if(id)submit(won,id)};
const originalForceEnd=forceEndBattle;forceEndBattle=function(){if(battle?.mode==='arena'&&battle.completedRounds>=3)return finishBattle(false,'你主動認輸，本次問道落敗。');return originalForceEnd()};
const originalClose=closeBattle;closeBattle=function(){const arena=battle?.mode==='arena';originalClose();$a('.battle-arena')?.classList.remove('wendao-battle');if(arena)setTimeout(open,100)};
const originalRender=render;render=function(...args){const value=originalRender(...args),button=$a('#wendaoArenaButton');if(button)button.classList.toggle('hidden',!eligible()||normalizeAscension().currentRealm==='immortal');return value};
async function openArenaPurchase(){
  $a('.arena-buy-modal')?.remove();
  const layer=document.createElement('div');layer.className='arena-buy-modal';
  layer.style.cssText='position:fixed;inset:0;z-index:10050;display:grid;place-items:center;background:#10231dcc;padding:18px';
  layer.innerHTML='<div class="arena-buy-window"><button class="arena-buy-close" aria-label="關閉">×</button><h3>購買挑戰次數</h3><p>讀取今日次數中……</p><button data-arena-buy="stone" disabled>5000靈石・增加1次</button><button data-arena-buy="jade" disabled>10靈玉・增加1次</button></div>';
  document.body.appendChild(layer);layer.querySelector('.arena-buy-close').onclick=()=>layer.remove();
  layer.onclick=e=>{if(e.target===layer)layer.remove()};
  async function refresh(providedStatus=null){const status=providedStatus||await rpc('arena_status',{p_channel:arenaChannel});if(!layer.isConnected)return;layer.querySelector('p').textContent=`今日可戰 ${status.free_remaining+status.bought_available} / 10`;layer.querySelectorAll('[data-arena-buy]').forEach(b=>{const k=b.dataset.arenaBuy,n=status[k+'_bought']||0;b.disabled=n>=5;b.textContent=`${k==='stone'?'5000靈石':'10靈玉'}・增加1次（今日 ${n}/5）`})}
  layer.querySelectorAll('[data-arena-buy]').forEach(b=>b.onclick=async()=>{if(busy)return;b.disabled=true;const status=await buy(b.dataset.arenaBuy,{preserveView:true});if(layer.isConnected)await refresh(status).catch(e=>toast(e.message))});
  await refresh().catch(e=>{layer.querySelector('p').textContent=e.message});
}
function decorateArenaActions(){const wrap=$a('.arena-purchase');if(!wrap)return;const refresh=wrap.querySelector('#arenaRefresh'),buyButtons=[...wrap.querySelectorAll('[data-arena-buy]')];if(!refresh||wrap.dataset.compact)return;wrap.dataset.compact='true';refresh.innerHTML='刷新對手';refresh.className='arena-refresh-button';buyButtons.forEach(button=>button.remove());const buyButton=document.createElement('button');buyButton.className='arena-buy-button';buyButton.textContent='購買次數';buyButton.onclick=openArenaPurchase;wrap.append(refresh,buyButton);const count=$a('.arena-status span:nth-child(3) b');if(count)count.textContent=count.textContent.replace(/\s*\/\s*20/,' / 10')}
const originalRenderView=renderView;renderView=async function(...args){const result=await originalRenderView(...args);if(currentView==='opponents')decorateArenaActions();return result}
$a('#wendaoArenaButton').onclick=open;
function refreshArenaSnapshot(){if(document.visibilityState!=='hidden')syncProfile().catch(()=>{})}
window.addEventListener('load',refreshArenaSnapshot);
document.addEventListener('visibilitychange',refreshArenaSnapshot);
setInterval(()=>{refreshArenaSnapshot();if($a('#wendaoArenaModal')&&currentView==='opponents'&&!busy)renderView('opponents',true)},300000);
render();
})();
