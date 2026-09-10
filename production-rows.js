/* Full-width, self-contained production rows for alchemy, forging, and brewing. */
renderAlchemyProduction=function(inner){
  const max=productionMaxTier(),tier=Math.max(1,Math.min(max,9,state.craftingTier||1)),unlocked=tier<=max;
  const tierText=['一','二','三','四','五','六','七','八','九'][tier-1],need=pillNeeds[tier-1];
  const rows=pillTypes.map(([key,name,,,herbName])=>{
    const herb=lootAmount(herbName),sand=lootAmount('丹砂'),can=unlocked&&herb>=need[0]&&sand>=need[1];
    return `<article class="production-row"><div class="production-row-item"><img src="assets/qstyle-v2/production/pills/${key}-t${tier}.png" alt=""><b>${tierText}階${name}</b></div><div class="production-row-action"><span>${herbName} ${herb}/${need[0]}</span><span>丹砂 ${sand}/${need[1]}</span><button data-craft-pill="${key}" ${can?'':'disabled'}>${unlocked?'煉製一顆':'境界不足'}</button></div></article>`;
  }).join('');
  inner.innerHTML=`<section class="production-workshop production-row-workshop"><div class="production-tier-tabs">${Array.from({length:9},(_,i)=>`<button data-craft-tier="${i+1}" class="${tier===i+1?'active':''} ${i+1>max?'tier-locked':''}">${i+1}階${i+1>max?'・未達境界':''}</button>`).join('')}</div><div class="production-row-list">${rows}</div></section>`;
  bindProductionControls('alchemy');
  $$('[data-craft-pill]').forEach(button=>button.onclick=()=>{const type=pillTypes.find(x=>x[0]===button.dataset.craftPill),herbName=type[4];if(button.disabled)return;if(!canStoreItem(`pill-${type[0]}-t${tier}`,1))return toast('儲物袋容量不足');spendLoot(herbName,need[0]);spendLoot('丹砂',need[1]);state[`pillCount_${type[0]}_${tier}`]=(state[`pillCount_${type[0]}_${tier}`]||0)+1;toast(`煉成${tierText}階${type[1]}`);save();renderAlchemyProduction(inner)});
};

renderForgeProduction=function(inner){
  const max=productionMaxTier(),tier=Math.max(1,Math.min(max,9,state.craftingTier||1)),unlocked=tier<=max,quality=state.craftingQuality==='rare'?'rare':'normal',need=forgeNeeds[tier-1];
  const rows=equipmentSlots.map(([key,name,,,materialKey])=>{const main=state[`mainlineMaterial_${materialKey}`]||0,tm=lootAmount(tierMaterials[tier-1]),soul=lootAmount('器靈精魄'),can=unlocked&&main>=need[0]&&tm>=need[1]&&(quality==='normal'||soul>=need[2]),materialName=mainlineMaterials.find(x=>x[1]===materialKey)?.[0]||materialKey;return `<article class="production-row"><div class="production-row-item"><img src="assets/qstyle-v2/production/equipment/${key}-t${tier}.png" alt=""><b>${quality==='rare'?'極品':'凡品'}・${equipmentSets[tier-1]}${name}</b></div><div class="production-row-action"><span>${materialName} ${main}/${need[0]}</span><span>${tierMaterials[tier-1]} ${tm}/${need[1]}</span>${quality==='rare'?`<span>器靈精魄 ${soul}/${need[2]}</span>`:''}<button data-craft-equipment="${key}" ${can?'':'disabled'}>${unlocked?'製作裝備':'境界不足'}</button></div></article>`}).join('');
  inner.innerHTML=`<section class="production-workshop production-row-workshop">${weavingPanelHtml()}<div class="production-tier-tabs">${Array.from({length:9},(_,i)=>`<button data-craft-tier="${i+1}" class="${tier===i+1?'active':''} ${i+1>max?'tier-locked':''}">${i+1}階${i+1>max?'・未達境界':''}</button>`).join('')}</div><div class="quality-choice production-quality-tabs"><button data-craft-quality="normal" class="${quality==='normal'?'active':''}">凡品</button><button data-craft-quality="rare" class="${quality==='rare'?'active':''}">極品</button></div><div class="production-row-list">${rows}</div></section>`;
  bindProductionControls('forge');bindWeavingControls(inner);
  $$('[data-craft-quality]').forEach(button=>button.onclick=()=>{state.craftingQuality=button.dataset.craftQuality;renderForgeProduction(inner)});
  $$('[data-craft-equipment]').forEach(button=>button.onclick=()=>{if(button.disabled)return;state.craftingSlot=button.dataset.craftEquipment;craftEquipment()});
};

renderBrewProduction=function(inner){
  const quality=state.craftingBrewQuality==='rare'?'rare':'normal',meta=brewQualities[quality],daily=brewCraftState(),base=state[`brewBase_${quality}`]||0,remaining=Math.max(0,3-daily[quality]);
  const rows=brewTypes.map(([key,name,,effect,herbName])=>{const herb=lootAmount(herbName),can=remaining>0&&base>=1&&herb>=meta.herb;return `<article class="production-row"><div class="production-row-item"><img src="assets/qstyle-v2/production/brews/${key}-${quality}.webp" alt=""><b>${meta.name}・${name}</b></div><div class="production-row-action"><span>${meta.name}原釀 ${base}/1</span><span>${herbName} ${herb}/${meta.herb}</span><small>${effect}永久白值＋${meta.gain}</small><button data-craft-brew="${key}" ${can?'':'disabled'}>${remaining?'釀製一瓶':'今日已達上限'}</button></div></article>`}).join('');
  inner.innerHTML=`<section class="production-workshop production-row-workshop brew-workshop"><div class="quality-choice production-quality-tabs"><button data-brew-quality="normal" class="${quality==='normal'?'active':''}">凡品・今日 ${daily.normal}／3</button><button data-brew-quality="rare" class="${quality==='rare'?'active':''}">極品・今日 ${daily.rare}／3</button></div><div class="production-row-list">${rows}</div></section>`;
  $$('[data-brew-quality]').forEach(button=>button.onclick=()=>{state.craftingBrewQuality=button.dataset.brewQuality;renderBrewProduction(inner)});
  $$('[data-craft-brew]').forEach(button=>button.onclick=()=>{const type=brewTypes.find(x=>x[0]===button.dataset.craftBrew),record=brewCraftState();if(button.disabled)return;if(!canStoreItem(`brew-${type[0]}-${quality}`))return toast('儲物袋已滿');state[`brewBase_${quality}`]--;spendLoot(type[4],meta.herb);state[`brewCount_${type[0]}_${quality}`]=(state[`brewCount_${type[0]}_${quality}`]||0)+1;record[quality]++;save();renderBrewProduction(inner);render();toast(`釀成${meta.name}・${type[1]}`)});
};
