const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
window.WENDAO_BUILD='20260911-84';
const qStyleMode=true;
const leaderboardConfig={url:'https://oxzuunzhsbvumxxbezev.supabase.co',publishableKey:'sb_publishable_u2rmM6v1-AdjRLMZSVetRw_MgjeWSL3',sessionKey:'wendao-supabase-session-release-v1',gameVersion:'v1.0.0',limit:50};
let leaderboardSyncTimer=0,leaderboardSyncInFlight=false,leaderboardKnownPower=null,leaderboardKnownName='',leaderboardKnownAscensionKey='';
let jadeGrantSyncInFlight=false,currentPlayerUid='';
const accountRecoveryConfig={codeKey:'wendao-recovery-code-release-v1',boundUidKey:'wendao-bound-player-uid-release-v1',transferNoticeKey:'wendao-account-transfer-notice'};
let recoveryBackupTimer=0,recoveryBackupInFlight=false,accountOwnershipCheckInFlight=false;

const spiritRealms = ['聽息','引霞','凝曜','靈胎','化念','歸流','照虛','踏霄','遊穹','蛻凡','玄闕','天衡','玉宸','羅穹','神庭','寂空','渡厄','渾天','近聖','證聖','長明','道尊','天序'];
const bodyRealms = ['塵軀','納勁','纏筋','玉骨','鳴髓','曜身','擎嶽','撼霄','鎮陸','渡星','寰甲','無量'];
const swordRealms = ['啟鋒','藏芒','養刃','聽劍','凝魄','御鋒','劍罡','心劍','劍域','裂空','星痕','月魄','日輪','萬刃','無鋒','歸一','斬界','太初','道鋒','劫劍','無極','劍尊','天劍'];
const maxSpiritLevel=spiritRealms.length*10-1,maxBodyLevel=bodyRealms.length*10-1,maxSwordLevel=swordRealms.length*10-1,mortalSwordMaxLevel=89,swordTrialMaxStage=90;
const mortalBodyMaxLevel=89;
const noviceCultivationNeed=300n;
const realmGrowthMultipliers=[1.20,1.80,2.50,3.30,4.20,5.20,6.30,7.50,8.80,10.20,11.70,13.30,15.00,16.80,18.70,20.70,22.80,25.00,27.30,29.70,32.20,34.80,37.50];
const realmEfficiencyMultipliers=(()=>{const values=[3,4.5,6.9,10.5,15.6,22.5,33,48,69,99];while(values.length<spiritRealms.length)values.push(Math.round(values.at(-1)*2.3));return values})();
const spiritRootRanks = ['廢品','凡品','下品','中品','良品','超品','上品','極品','完美','先天','凡仙','仙品','歸元','天心','三清','六禦','玄門','全真','淨明','天道'];
const sectRanks = ['外門弟子','內門弟子','親傳弟子','供奉','護法'];
const sectPromotionCosts = [300,900,2000,4500];
const sectSalary = [300,750,1500,2700,4500];
const pathOpeningCosts={sword:{key:'meteorIron',amount:30,label:'隕鐵'},body:{key:'food',amount:120,label:'食物'}};
const sectCatalog = [
  {star:1,need:0,realm:'聽息',good:['青竹門','清溪派','松風堂','白石觀'],evil:['黑風寨','赤蛇幫','斷刃堂']},
  {star:2,need:10,realm:'引霞',good:['靈泉宗','丹楓谷','御風門','碧水宮','玄木派'],evil:['血衣樓','噬魂堂','鬼藤谷','幽燈教']},
  {star:3,need:20,realm:'凝曜',good:['青鸞劍宗','百草仙門','紫陽宮','天河書院','鎮岳宗'],evil:['九煞宗','玄屍門','萬毒谷','奪魄宮','赤煉魔宗']},
  {star:4,need:30,realm:'靈胎',good:['太虛劍派','五雷天宗','蓬萊仙宮','星辰道門','乾元宗'],evil:['黃泉殿','萬妖天府','焚心魔教']},
  {star:5,need:40,realm:'化念',good:['神霄天宮','滄海龍門','玄天劍庭','終南紫府'],evil:['冥獄魔都','合歡天宗','幽冥血海']},
  {star:6,need:50,realm:'歸流',good:['萬壽仙山','梵天聖宗','六道玄宮','歸墟仙門'],evil:['太古魔殿','吞天妖庭','絕情天宮']},
  {star:7,need:60,realm:'照虛',good:['無上劍閣','蒼穹道統','玉虛仙府'],evil:['昆吾魔山','十方邪樓','彼岸花宮']},
  {star:8,need:70,realm:'踏霄',good:['昊天聖宮','須彌神山','太初龍院'],evil:['玄陰帝谷','葬月魔宗','燭龍神庭']},
  {star:9,need:80,realm:'遊穹',good:['太上白玉京','諸天星羅神宗','九霄凌天仙宮'],evil:['永劫輪迴殿','無極天魔聖宗','太古神夢天宮']}
];
const sectTaskBlueprints=[
  ['sweep',1,10,100,5],['cook',2,12,150,6],['herb',3,14,220,7],['escort',4,16,320,8],
  ['gate',5,18,460,9],['vein',6,20,650,10],['demon',7,22,900,12],['array',8,24,1250,14],
  ['realm',9,26,1700,17],['diplomacy',11,28,2300,21],['rift',13,30,3100,25],['skyward',15,34,4200,30],
  ['domain',17,38,5700,36],['voidward',19,42,7700,43],['worldaxis',21,46,10400,51],['heavenorder',23,50,14000,60]
];
const sectTaskVariants={
  spirit:[
    ['引氣滌塵','引一縷清氣洗去殿前塵垢，熟悉門中靈息。'],['溫養藥圃','調動元息溫養藥圃，照料門中常用靈植。'],['梳理靈脈','沿山巡察支脈，使紊亂靈氣重歸正途。'],['護持聚靈陣','穩住聚靈陣眼，避免門人修行時靈息逆衝。'],
    ['巡察地脈','巡行門派疆域，查明地脈異動與靈潮缺口。'],['修補護宗禁制','以神念勾連陣紋，修補護宗禁制的細微裂痕。'],['調和五行陣眼','平衡五行氣機，使各處陣眼循環不息。'],['鎮守靈泉','日夜調息鎮守靈泉，防止泉眼枯竭或暴湧。'],
    ['維繫護山大陣','統合諸峰靈流，長期維繫護山大陣。'],['平復靈潮逆湧','深入地脈樞紐，將逆湧靈潮導回山河。'],['重整山河氣脈','跨域梳理破碎氣脈，重續門派山河根基。'],['封鎮天外罡風','以浩瀚元息結陣，封鎮侵入凡間的天外罡風。'],
    ['護持跨域法壇','維持跨域法壇運轉，護送門中修士往返諸地。'],['推演護界大陣','推演護界陣圖，補全宗門傳承中的失落環節。'],['鎮守天地樞機','坐鎮天地樞機，調度萬里靈流不使崩散。'],['重定凡界靈序','以畢生道行重定凡界靈序，為後世守住修行根本。']
  ],
  sword:[
    ['擦拭兵閣','整肅兵閣劍器，從每一道鋒芒中磨礪劍心。'],['運送劍材','護送鑄劍材料入山，辨識靈材與鋒刃氣性。'],['巡守劍坪','巡守門中劍坪，阻止失控劍氣傷及同門。'],['護送門人','仗劍護送低階門人往返坊市，保全門中物資。'],
    ['清剿山妖','清剿宗門附近山妖，以實戰磨亮本命劍鋒。'],['鎮守劍塚','鎮守歷代殘劍沉眠之地，平息暴走劍意。'],['追緝邪修','追緝侵擾門派疆域之人，以劍斷其後路。'],['破除外敵劍陣','尋出敵陣鋒眼，一劍破開盤踞多年的殺局。'],
    ['守衛宗門疆界','巡弋廣闊疆界，使宵小不敢踏近山門。'],['斬滅地脈妖禍','循妖氣深入地脈，以劍斬斷禍亂根源。'],['巡弋萬里劍關','御劍巡守萬里劍關，擋下跨域來敵。'],['截斷天外魔鋒','迎擊天外魔鋒，在其墜入凡間前將之斬碎。'],
    ['鎮守跨域劍門','一人一劍鎮住跨域劍門，護持往來門人。'],['斬平虛空亂流','深入界隙，以不滅劍光斬平虛空亂流。'],['護持九域劍陣','統御九域劍陣，令萬劍各歸其位。'],['一劍靖定凡天','以通天劍意巡守凡界，使諸天鋒禍止於界外。']
  ],
  body:[
    ['搬運門中物資','以肩背搬運門中物資，打牢最初肉身根基。'],['修葺演武場','搬石夯土修葺演武場，在勞作中鍛鍊筋骨。'],['開鑿山道','徒手開鑿險峻山道，為門人打通往來之途。'],['護送門人','以肉身擋在隊伍最前，護送門人與物資返山。'],
    ['鎮守山門','立於山門之前，以強橫體魄震懾來犯之敵。'],['搬移地脈巨石','移開壓住地脈的巨石，使山中靈流恢復。'],['抵禦獸潮','迎面承受獸潮衝擊，守住門派外圍村鎮。'],['鎮壓地脈震動','以肉身為樁鎮住地脈，阻止山門傾覆。'],
    ['駐守宗門秘境','長期駐守危險秘境，以金身承受異力侵蝕。'],['扛築護宗天柱','扛起護宗天柱，使崩裂陣基重新合攏。'],['鎮守萬里邊關','以不倒之身鎮守邊關，擋下連年征戰。'],['承接天外罡風','登臨天穹，以血肉承接足以裂山的罡風。'],
    ['肉身鎮壓界門','立身界門中央，鎮住兩界交錯的撕扯。'],['平定虛空震盪','踏入虛空裂隙，以雙拳平定界壁震盪。'],['托舉護界神山','托起傾覆神山，重立宗門護界根基。'],['金身鎮守凡天','以不滅金身鎮守凡天，為後世扛下界外災劫。']
  ]
};
const sectTasks=sectTaskBlueprints.map(([id,realm,gain,stone,prestige],index)=>({id,realm,gain,stone,prestige,variants:{spirit:sectTaskVariants.spirit[index],sword:sectTaskVariants.sword[index],body:sectTaskVariants.body[index]}}));
const originProfiles = {
  '家族子弟':{trueQi:5,rootBone:5,physique:5,agility:5,spiritualPower:5,comprehension:5,fortune:5},
  '流浪孤兒':{trueQi:3,rootBone:4,physique:4,agility:4,spiritualPower:7,comprehension:3,fortune:10},
  '亡命草寇':{trueQi:3,rootBone:8,physique:8,agility:6,spiritualPower:3,comprehension:0,fortune:5},
  '深山獵戶':{trueQi:1,rootBone:6,physique:7,agility:7,spiritualPower:4,comprehension:2,fortune:8},
  '寒窗學子':{trueQi:6,rootBone:4,physique:2,agility:4,spiritualPower:10,comprehension:6,fortune:3}
};
const originDescriptions = {
  '家族子弟':'出身修真世家，自幼耳濡目染，各方面根基較為均衡。',
  '流浪孤兒':'自幼漂泊無依，於困境中磨練心志，與天地締結的天契格外深厚。',
  '亡命草寇':'久經凶險與搏殺，命骨與玄軀格外強韌，卻不擅長靜心參悟。',
  '深山獵戶':'生長於群山荒野，身手矯健、感知敏銳，擅長把握稍縱即逝的機會。',
  '寒窗學子':'多年寒窗養成通透心性，道悟與銳識出眾，但肉身根基較為薄弱。'
};
const itemCatalog = {
  mendingSilk:{name:'補天絲',image:'assets/qstyle-v2/mending-silk-cutout.png',description:'以洞府織天台將靈木纖維與空間陣紋編合而成，纖韌無比，是提升儲物袋品階的專用材料。',count:'mendingSilk',usable:false,giftable:false},
  testCultivationPill:{name:'修為丹',image:'assets/qstyle-v2/tribulation-pills/pill-01.png',description:'測試用臨時道具。使用後立即獲得 10 億修為。',count:'testCultivationPillCount',usable:true,giftable:false,sellPrice:1,cultivationBundle:1000000000},
  testSpiritStoneTenMillion:{name:'一千萬靈石',image:'assets/qstyle-v2/spirit-stone.png',description:'測試用臨時道具。使用後立即獲得 1,000 萬靈石。',count:'testSpiritStoneTenMillionCount',usable:true,giftable:false,sellPrice:1,resourceBundle:{resource:'spiritStone',label:'靈石',amount:10000000}},
  spiritMedicine:{name:'靈藥',image:'assets/qstyle-v2/spirit-medicine-v1.png',description:'蘊含溫和藥力的靈藥。使用後恢復 100 體力，恢復量可超過體力上限並完整保留。',count:'spiritMedicineCount',usable:true,giftable:false,sellPrice:1,staminaRestore:100},
  righteousQiPill:{name:'正氣丹',image:'assets/qstyle-v2/righteous-qi-pill-v1.png',description:'以清正道韻凝炼的測試丹藥。每顆使用後增加 1 點正氣。',count:'righteousQiPillCount',usable:true,giftable:false,sellPrice:1,moralGain:{key:'righteousness',label:'正氣',amount:1}},
  evilQiPill:{name:'邪氣丹',image:'assets/qstyle-v2/evil-qi-pill-v1.png',description:'以陰煞氣機凝炼的測試丹藥。每顆使用後增加 1 點邪氣。',count:'evilQiPillCount',usable:true,giftable:false,sellPrice:1,moralGain:{key:'evilQi',label:'邪氣',amount:1}}
};
itemCatalog.xisuiFamaoPill={name:'洗髓伐毛丹',image:'assets/qstyle-v2/production/pills/xisui-famao-v1.png',description:'極罕見的洗髓靈丹，可重塑經脈、拓展藥性承受極限。每服用一顆，所有丹藥與靈釀的個別服用上限永久＋1。',count:'xisuiFamaoPillCount',usable:true,giftable:false,sellPrice:1,dosageLimitGain:1};
itemCatalog.renameProtagonistJade={name:'易名玉牒',image:'assets/qstyle-v2/production/identity/rename-protagonist-jade-v1.png',description:'以本命精血重書名諱的玉牒。使用後可修改主角姓名；確認新姓名後才會消耗，每次只能使用一枚。',count:'renameProtagonistJadeCount',usable:true,giftable:false,sellPrice:1,identityAction:'protagonistName',singleUseOnly:true};
itemCatalog.genderRebirthMirror={name:'陰陽轉生鏡',image:'assets/qstyle-v2/production/identity/gender-rebirth-mirror-v1.png',description:'倒轉陰陽、重塑此身的玄妙寶鏡。使用後轉換主角性別；已有道侶或進行中的命定因緣也會同步轉換。每次只能使用一面。',count:'genderRebirthMirrorCount',usable:true,giftable:false,sellPrice:1,identityAction:'gender',singleUseOnly:true};
itemCatalog.renamePartnerCovenant={name:'同心更名契',image:'assets/qstyle-v2/production/identity/rename-partner-covenant-v1.png',description:'由兩心因緣共證的新名契書。結為道侶後使用，可修改道侶姓名；確認新姓名後才會消耗，每次只能使用一份。',count:'renamePartnerCovenantCount',usable:true,giftable:false,sellPrice:1,identityAction:'partnerName',singleUseOnly:true};
itemCatalog.swordEmbryoReversionElixir={name:'歸元鑄胚露',image:'assets/qstyle-v2/production/sword/sword-embryo-reversion-elixir-v1.png',description:'以歸元靈液洗去本命劍胚原形，再依心念重鑄。使用後可重新選擇本命劍胚；淬劍境界、養劍階數、試劍進度、劍意與劍名皆會保留，每次只能使用一瓶。',count:'swordEmbryoReversionElixirCount',usable:true,giftable:false,sellPrice:1,swordEmbryoReversion:true,singleUseOnly:true};
itemCatalog.divineRoamingManual={name:'神念遠遊訣',image:'assets/qstyle-v2/mainline/item-divine-roaming-manual.png',description:'記載分化神念、遠遊諸境之法的特殊秘訣。購得時即開通神念遠遊；此物是開通憑證，不屬於功法且不可使用。',count:'divineRoamingManualCount',usable:false,giftable:false,sellPrice:1};
itemCatalog.mindEmbodimentManual={name:'意念入體訣',image:'assets/qstyle-v2/mainline/item-mind-embodiment-manual.png',description:'記載凝聚意念、內觀己身之法的特殊秘訣。使用後可提前習得「意念入體」，開啟人物詳細屬性；若已於化念一層自動習得，本書便會失效。',count:'mindEmbodimentManualCount',usable:true,giftable:false,sellPrice:1};
const sectInvitationItems=[];
sectCatalog.forEach(group=>[...group.good.map(name=>({name,faction:'正'})),...group.evil.map(name=>({name,faction:'邪'}))].forEach(entry=>{
  const index=sectInvitationItems.length+1,id=`sectInvitation${index}`,count=`sectInvitationCount${index}`,tier=['一','二','三','四','五','六','七','八','九'][group.star-1];
  const item={name:`${entry.name}信物`,image:'assets/qstyle-v2/sect-invitation-token.png',description:`${tier}星門派・${entry.name}所授信物。當你無門無派時使用，可消耗一枚信物直接拜入${tier}星門派・${entry.name}。`,count,usable:true,giftable:false,sellPrice:1,sectInvitation:{name:entry.name,faction:entry.faction,star:group.star}};
  itemCatalog[id]=item;sectInvitationItems.push({id,item,...item.sectInvitation});
}));
const reputationResourceItems=[];
[[100,1,2],[1000,3,4],[10000,5,5]].forEach(([amount,minFloor,maxFloor])=>[
  ['spiritStone','靈石','assets/qstyle-v2/spirit-stone.png'],['wood','木材','assets/qstyle-v2/wood-cutout.png'],['meteorIron','隕鐵','assets/qstyle-v2/meteor-iron-cutout.png']
].forEach(([resource,label,image])=>{
  const amountName={100:'一百',1000:'一千',10000:'一萬'}[amount],id=`reputation${resource}${amount}`,count=`${id}Count`,item={name:`${amountName}${label}`,image,description:`凝練封存的${label}物資。使用後立即獲得 ${formatLargeNumber(amount)} ${label}。`,count,usable:true,giftable:false,sellPrice:1,resourceBundle:{resource,label,amount}};
  itemCatalog[id]=item;reputationResourceItems.push({id,item,minFloor,maxFloor});
}));
const marketResourceItems=[];
const marketResourcePrices={100:{wood:180,food:120,meteorIron:260},1000:{wood:1500,food:1000,meteorIron:2200},10000:{wood:12000,food:8000,meteorIron:18000}};
[[1,100],[2,100],[3,1000],[4,1000],[5,10000]].forEach(([floor,amount])=>[
  ['wood','木材','assets/qstyle-v2/wood-cutout.png'],['food','食物','assets/qstyle-v2/food-cutout.png'],['meteorIron','隕鐵','assets/qstyle-v2/meteor-iron-cutout.png']
].forEach(([resource,label,image])=>{
  const amountName={100:'一百',1000:'一千',10000:'一萬'}[amount],itemId=`market${resource}${amount}`,offerId=`${itemId}Floor${floor}`;
  if(!itemCatalog[itemId])itemCatalog[itemId]={name:`${amountName}${label}`,image,description:`坊市封裝的${label}物資。使用後立即獲得 ${formatLargeNumber(amount)} ${label}。`,count:`${itemId}Count`,usable:true,giftable:false,sellPrice:1,resourceBundle:{resource,label,amount}};
  marketResourceItems.push({id:offerId,itemId,floor,price:marketResourcePrices[amount][resource]});
}));
const marketCultivationCaskets=[
  {id:'marketCultivationCasket1',floor:1,tier:'一',gain:106200,price:300},
  {id:'marketCultivationCasket2',floor:2,tier:'二',gain:248400,price:900},
  {id:'marketCultivationCasket3',floor:3,tier:'三',gain:531000,price:2500},
  {id:'marketCultivationCasket4',floor:4,tier:'四',gain:1135800,price:6500},
  {id:'marketCultivationCasket5',floor:5,tier:'五',gain:1632600,price:10000}
];
marketCultivationCaskets.forEach(entry=>itemCatalog[entry.id]={name:`${entry.tier}階聚靈丹匣`,image:'assets/qstyle-v2/production/spirit-gathering-casket-v1.png',description:`封存對應境界十層純白修煉效率十年份的靈氣。使用後固定獲得 ${formatLargeNumber(entry.gain)} 修為，不受任何修煉加成影響。`,count:`${entry.id}Count`,usable:true,giftable:false,sellPrice:1,cultivationBundle:entry.gain});
const tribulationPillDefaults={};
spiritRealms.slice(1).forEach((realm,index)=>{
  const realmIndex=index+1,key=`tribPill${realmIndex}`;
  tribulationPillDefaults[key]=0;
  itemCatalog[key]={name:`${realm}丹`,image:`assets/qstyle-v2/tribulation-pills/pill-${String(realmIndex).padStart(2,'0')}.png`,description:`蘊含${realm}境道韻的渡劫丹藥。僅在突破${realm}境層次時使用，每顆可增加 5% 渡劫成功率。`,count:key,usable:false,giftable:false,sellPrice:1};
});
const artKinds={secret:{tab:'玄錄',attribute:'trueQi',label:'元息'},formula:{tab:'命篇',attribute:'rootBone',label:'命骨'},sutra:{tab:'體典',attribute:'physique',label:'玄軀'},escape:{tab:'行章',attribute:'agility',label:'游影'},ultimate:{tab:'悟卷',attribute:'comprehension',label:'道悟'},fragment:{tab:'天箋',attribute:'fortune',label:'天契'},sectSkill:{tab:'門派招式',attribute:null,label:'招式'}};
const sectSkillCatalog={
  '斷刃堂':{name:'破嶽沉星',basePercent:120,attribute:'trueQi',attributeLabel:'元息',attributeMultiplier:2,fx:'mountain-star'},
  '御風門':{name:'踏虛無痕',basePercent:100,attribute:'agility',attributeLabel:'游影',attributeMultiplier:3,fx:'void-step'},
  '鎮岳宗':{name:'玄關鎮岳',basePercent:110,attribute:'physique',attributeLabel:'玄軀',attributeMultiplier:2,fx:'mountain-seal'},
  '焚心魔教':{name:'焚天一氣',basePercent:100,attribute:'trueQi',attributeLabel:'元息',attributeMultiplier:3,fx:'heaven-flame'},
  '幽冥血海':{name:'血海鎮天',basePercent:80,attribute:'rootBone',attributeLabel:'命骨',attributeMultiplier:3,fx:'blood-sea'},
  '萬壽仙山':{name:'照骨歸元',basePercent:110,attribute:'rootBone',attributeLabel:'命骨',attributeMultiplier:2,fx:'bone-wheel'},
  '蒼穹道統':{name:'太虛崩滅',basePercent:80,attribute:'trueQi',attributeLabel:'元息',attributeMultiplier:4,fx:'void-collapse'},
  '燭龍神庭':{name:'九鎮伏龍',basePercent:80,attribute:'physique',attributeLabel:'玄軀',attributeMultiplier:4,fx:'dragon-seal'},
  '諸天星羅神宗':{name:'流光逐月',basePercent:70,attribute:'agility',attributeLabel:'游影',attributeMultiplier:4,fx:'moonlight'}
};
const sectTechniqueOverrides={
  '松風堂':[['松風玄錄','secret','water'],['松風體典','sutra','earth'],['松風行章','escape','wood']],
  '白石觀':[['白石玄錄','secret','water'],['白石體典','sutra','earth'],['白石行章','escape','wood']],
  '赤蛇幫':[['赤蛇玄錄','secret','metal'],['赤蛇體典','sutra','water'],['赤蛇行章','escape','earth']],
  '斷刃堂':[['斷刃玄錄','secret','water'],['斷刃命篇','formula','wood'],['破嶽沉星','sectSkill','none']],
  '御風門':[['御風命篇','formula','fire'],['御風行章','escape','wood'],['踏虛無痕','sectSkill','none']],
  '青鸞劍宗':[['青鸞玄錄','secret','fire'],['青鸞體典','sutra','water'],['青鸞行章','escape','wood']],
  '百草仙門':[['百草仙體典','sutra','metal'],['百草仙玄錄','secret','earth'],['百草仙行章','escape','fire']],
  '天河書院':[['天河書體典','sutra','wood'],['天河書玄錄','secret','metal'],['天河書行章','escape','earth']],
  '鎮岳宗':[['鎮岳玄錄','secret','water'],['鎮岳命篇','formula','metal'],['玄關鎮岳','sectSkill','none']],
  '焚心魔教':[['焚心魔玄錄','secret','water'],['焚心魔命篇','formula','water'],['焚天一氣','sectSkill','none']],
  '滄海龍門':[['滄海龍體典','sutra','water'],['滄海龍玄錄','secret','fire'],['滄海龍行章','escape','earth']],
  '玄天劍庭':[['玄天劍玄錄','secret','fire'],['玄天劍行章','escape','earth'],['玄天劍命篇','formula','metal']],
  '終南紫府':[['終南紫行章','escape','fire'],['終南紫玄錄','secret','earth'],['終南紫命篇','formula','metal']],
  '幽冥血海':[['幽冥血玄錄','secret','metal'],['幽冥血命篇','formula','wood'],['血海鎮天','sectSkill','none']],
  '萬壽仙山':[['萬壽仙命篇','formula','water'],['萬壽仙行章','escape','earth'],['照骨歸元','sectSkill','none']],
  '蒼穹道統':[['蒼穹道統玄錄','secret','metal'],['蒼穹道統命篇','formula','wood'],['太虛崩滅','sectSkill','none']],
  '十方邪樓':[['十方邪行章','escape','fire'],['十方邪玄錄','secret','wood'],['十方邪命篇','formula','earth']],
  '彼岸花宮':[['彼岸花玄錄','secret','wood'],['彼岸花行章','escape','earth'],['彼岸花命篇','formula','water']],
  '燭龍神庭':[['燭龍神行章','escape','water'],['燭龍神命篇','formula','wood'],['九鎮伏龍','sectSkill','none']],
  '太上白玉京':[['太上白玉京行章','escape','water'],['太上白玉京玄錄','secret','water'],['太上白玉京命篇','formula','water']],
  '諸天星羅神宗':[['諸天星羅玄錄','secret','earth'],['諸天星羅命篇','formula','earth'],['流光逐月','sectSkill','none']],
  '永劫輪迴殿':[['永劫輪迴玄錄','secret','water'],['永劫輪迴行章','escape','water'],['永劫輪迴命篇','formula','water']]
};
const artMainTabs=[['sect','門派功法'],['books','功法書'],['moves','招式']];
const artBookTabs=[['secret','玄錄'],['formula','命篇'],['sutra','體典'],['escape','行章'],['ultimate','悟卷'],['fragment','天箋']];
const artElements=[['metal','金','metalRoot'],['wood','木','woodRoot'],['water','水','waterRoot'],['fire','火','fireRoot'],['earth','土','earthRoot']];
const artTierMax=[120,260,520,900,1400,2050,2933,3352,4800];
const techniqueBookKinds={secret:'xuanlu',formula:'mingpian',sutra:'tidian',escape:'xingzhang'};
const techniqueBookTierWords=[['清微','流雲'],['靈霄','玄真'],['星華','紫府'],['天罡','地脈'],['太玄','九曜'],['洞虛','萬象'],['無量','諸天'],['太初','鴻蒙'],['混元','天道']];
const techniqueBookElementWords={metal:['庚金','玄鋒'],wood:['青木','建木'],water:['滄溟','玄水'],fire:['離火','炎陽'],earth:['坤元','厚土']};
const techniqueBooks=[],techniqueBookDefaults={};
Object.entries(techniqueBookKinds).forEach(([kind,assetPrefix])=>{
  for(let tier=1;tier<=9;tier++)artElements.forEach(([element,elementName],elementIndex)=>{
    for(let variant=0;variant<2;variant++){
      const id=`artbook-${kind}-t${tier}-${element}-${variant+1}`,count=`artBook_${kind}_${tier}_${element}_${variant+1}`;
      const name=`${techniqueBookTierWords[tier-1][variant]}${techniqueBookElementWords[element][variant]}${artKinds[kind].tab}`;
      const book={id,count,name,kind,element,elementName,tier,level:1,source:'book'};
      techniqueBooks.push(book);techniqueBookDefaults[count]=0;
      itemCatalog[id]={name,image:`assets/qstyle-v2/art-books/${assetPrefix}-${String(tier).padStart(2,'0')}.png`,description:`${elementName}行・${['一','二','三','四','五','六','七','八','九'][tier-1]}階${artKinds[kind].tab}。使用後習得「${name}」，增加${artKinds[kind].label}${kind==='ultimate'?'，並額外增加主效果25%的銳識':''}；同名功法僅能習得一次。`,count,usable:true,giftable:false,sellPrice:1,techniqueBook:book};
    }
  });
});
const treasureTechniqueBookSpecs=[
  {id:'treasure-taiyang-lianshen-wujuan',count:'treasureTaiyangLianshenWujuanCount',name:'太陽煉神悟卷',kind:'ultimate',image:'assets/qstyle-v2/art-books/treasure-taiyang-lianshen-wujuan.png'},
  {id:'treasure-chixiao-dingming-tianjian',count:'treasureChixiaoDingmingTianjianCount',name:'赤霄定命天箋',kind:'fragment',image:'assets/qstyle-v2/art-books/treasure-chixiao-dingming-tianjian.png'}
];
treasureTechniqueBookSpecs.forEach(spec=>{
  const book={id:spec.id,count:spec.count,name:spec.name,kind:spec.kind,element:'fire',elementName:'火',tier:9,level:1,source:'book',exclusiveMarket:'treasure'};
  techniqueBooks.push(book);techniqueBookDefaults[spec.count]=0;
  itemCatalog[spec.id]={name:spec.name,image:spec.image,description:`火行・九階${artKinds[spec.kind].tab}。使用後習得「${spec.name}」，增加${artKinds[spec.kind].label}${spec.kind==='ultimate'?'，並額外增加主效果25%的銳識':''}；同名功法僅能習得一次。`,count:spec.count,usable:true,giftable:false,sellPrice:1,techniqueBook:book};
});
const startingTechniques=[
  {id:'origin',name:'凝念馭元',kind:'spirit',min:.8,max:1,description:'凝神引動體內元息，化為一道氣芒直擊對手。'},
  {id:'body-origin',name:'沉肩震步',kind:'body',unlockLevel:0,min:.9,max:1.05,guardBonus:.05,effect:'命中後本場減傷至少提升至 5%',description:'沉肩踏地，以命骨與玄軀推動全身，近身震開對手。'}
];
const bodyTechniqueCatalog=[
  {id:'body-jade-break',name:'玉骨崩拳',kind:'body',unlockLevel:30,min:1.25,max:1.45,armorPierce:.2,effect:'拳勁貫骨・無視 20% 防禦',description:'玉骨鳴震，勁力凝於一拳貫入護體罡氣，從內部崩開防勢。'},
  {id:'body-mountain-crush',name:'擎嶽鎮天',kind:'body',unlockLevel:60,min:1.6,max:1.8,hits:2,guardBonus:.08,effect:'兩段鎮壓・命中後本場減傷至少提升至 8%',description:'舉身如擎山，先以踏地震勢封住退路，再以全身之力鎮落。'}
];
const swordTechniqueCatalog=[
  {id:'heavy-fall',embryo:'heavy',order:1,name:'鎮嶽墜鋒',kind:'heavy-fall',min:1.3,max:1.45,hits:1,armorPierce:.18,effect:'單次重斬・無視 18% 防禦',description:'沉肩壓劍，如山岳傾墜；以純粹劍重壓開對手架勢。'},
  {id:'heavy-rift',embryo:'heavy',order:2,name:'崩天斷脈',kind:'heavy-rift',min:1.72,max:1.92,hits:2,armorPierce:.12,effect:'兩段崩斬・無視 12% 防禦',description:'先崩護體氣機，再以斷脈一劍收勢，兩段傷害合併結算。'},
  {id:'spirit-thread',embryo:'spirit',order:1,name:'靈樞引劍',kind:'spirit-thread',min:1.18,max:1.32,hits:3,critBonus:.08,effect:'三道靈劍・暴擊率 +8%',description:'以靈樞牽引三道元劍循脈而至，三擊連成一氣。'},
  {id:'spirit-return',embryo:'spirit',order:2,name:'太一歸元斬',kind:'spirit-return',min:1.52,max:1.7,hits:1,lifeSteal:.12,effect:'歸元斬擊・回復傷害 12% 氣血',description:'散出的劍元於一念間歸一，斬中後回流本命，溫養氣血。'},
  {id:'shadow-stars',embryo:'shadow',order:1,name:'逐星流影',kind:'shadow-stars',min:1.14,max:1.3,hits:3,accuracyBonus:.25,effect:'三連瞬斬・命中評級 +25%',description:'身與劍化作三道逐星殘影，從不同方位接連掠過。'},
  {id:'shadow-void',embryo:'shadow',order:2,name:'無痕越界',kind:'shadow-void',min:1.38,max:1.55,hits:1,repeatChance:.35,repeatScale:.55,effect:'瞬界一斬・35% 機率追加 55% 傷害',description:'劍光越過目力所及之界；殘影偶爾返身，再補無痕一劍。'}
];
const swordEmbryos={
  heavy:{name:'重鋒劍胚',short:'重鋒',description:'劍勢沉凝，養劍時主要增長命骨與玄軀。'},
  spirit:{name:'靈元劍胚',short:'靈元',description:'劍隨元轉，養劍時主要增長元息與銳識。'},
  shadow:{name:'流影劍胚',short:'流影',description:'劍走輕靈，養劍時主要增長游影與銳識。'}
};
const swordIntents={
  break:{name:'破軍劍意',description:'重攻破勢，主要增長元息與玄軀。'},
  light:{name:'流光劍意',description:'迅疾連斬，主要增長游影與銳識。'},
  origin:{name:'歸元劍意',description:'守中歸一，主要增長命骨與玄軀。'}
};
const swordPaths={
  righteous:{name:'天罡劍印',title:'浩然',description:'守正藏鋒，每枚道印提升2%防禦。'},
  evil:{name:'血煞劍印',title:'修羅',description:'以戰養劍，每枚道印提升2%攻擊與0.5%暴擊。'},
  balance:{name:'兩儀劍印',title:'無拘',description:'陰陽並刃，每枚道印使第二式額外提升5%傷害。'},
  unmarked:{name:'劍途未定',title:'未定',description:'正邪閱歷尚淺，本次破境不凝聚道印。'}
};
const swordCinematicSources={
  righteous:'assets/sword-breakthrough-righteous.mp4',
  evil:'assets/sword-breakthrough-evil.mp4',
  balance:'assets/sword-breakthrough-balance.mp4',
  unmarked:'assets/sword-breakthrough-unmarked.mp4'
};
const bodyInjuries={
  scratch:{name:'擦傷',severity:1,duration:900000,description:'傷勢較輕，不會中斷鍛體。'},
  internal:{name:'內傷',severity:2,duration:1800000,description:'鍛體體力消耗提高25%，戰鬥氣血上限降低15%。'},
  tendon:{name:'筋傷',severity:3,duration:2700000,description:'游影降低15%，暫時無法進行極限鍛體。'}
};
const bodyRealmPassives=[
  {realm:'塵軀',name:'凡軀初煉',description:'開啟體力、三項根基與鍛體修行。'},
  {realm:'納勁',name:'勁貫周身',description:'肉身試煉的基礎氣血提高。'},
  {realm:'纏筋',name:'筋絡自如',description:'筋骨更加穩固，為玉骨蛻變奠基。'},
  {realm:'玉骨',name:'玉骨護身',description:'極限鍛體受傷率降低10個百分點。'},
  {realm:'鳴髓',name:'髓鳴自癒',description:'所有傷勢持續時間縮短20%。'},
  {realm:'曜身',name:'曜身長存',description:'肉身試煉氣血上限提高15%。'},
  {realm:'擎嶽',name:'擎嶽不移',description:'肉身試煉受到的傷害降低15%。'},
  {realm:'撼霄',name:'撼霄復元',description:'立即療傷所需食物與木材降低20%。'},
  {realm:'鎮陸',name:'鎮陸真軀',description:'凡間煉體圓滿；肉身招式專精倍率達到最高。'},
  {realm:'渡星',name:'渡星之體',description:'可承受星外環境，等待上位面內容。'},
  {realm:'寰甲',name:'寰甲天成',description:'肉身如界甲，等待上位面內容。'},
  {realm:'無量',name:'無量真身',description:'凡軀體系圓滿。'}
];
const mortalMainline=[
  ['青石荒徑','地脈如呼吸般震動，狂化妖獸盤踞黑色石柱。','yao','狂脈山魈'],['斷脈古井','枯竭古井深處，有人正在修復刻著九環的石柱。','human','守界司巡使'],
  ['赤霞谷','漫天赤霞並非天象，而是抽向高空的靈氣。','yao','赤霞妖禽'],['落霞古觀','殘卷寫著「九鎖既成，天門永閉」。','human','守卷道人'],
  ['星隕荒原','界壁碎片墜入荒原，各方修士為之爭奪。','demon','噬星魔修'],['九曜古臺','完整陣圖顯現：第一鎖已醒，九鎖正在復甦。','human','九曜陣師'],
  ['胎藏妖林','封天之力扭曲新生妖獸，整片林海失序。','yao','胎藏妖王'],['靈胎地宮','九鎖以凡間靈氣維持封閉；封天的代價正是凡間。','dragon','地脈螭龍'],
  ['無相古城','全城共夢，守界司之主隔著萬念向你發問。','human','無相夢使'],['千念鏡宮','古代天穹破裂、城池覆滅的記憶並非謊言。','demon','劫憶心魔'],
  ['百川靈澤','河川與地脈盡向同一方向匯流。','yao','吞流澤主'],['地脈總樞','九鎖將永久封閉凡間與外界的一切通道。','human','總樞監守'],
  ['照虛天塹','界壁裂痕橫亙天外，古災仍留著傷口。','demon','裂界魘影'],['觀天古臺','創陣者留下真相：九鎖從來只是暫時之策。','immortal','守錄天靈'],
  ['雲階天路','守界司內部分裂，仍有人選擇擋在天路之前。','human','鎮階使'],['鎖天殿','他們曾救人、補天、赴死，卻也把保護變成禁絕。','human','守界司大統領'],
  ['九鎖天闕','九節全明，你必須逐一斬斷封天連結。','dragon','九鎖陣靈'],['天門絕域','凡人的安全與後世的道路，在天門前迎來最後一戰。','human','守界司之主']
].map((row,index)=>({id:index+1,name:row[0],summary:row[1],race:row[2],boss:row[3],realm:Math.floor(index/2)+1,image:`assets/qstyle-v2/mainline/realm-${Math.floor(index/2)+1}.png`}));
const mainlinePortraits={guardian:'assets/qstyle-v2/mainline/portrait-guardian.png',observer:'assets/qstyle-v2/mainline/portrait-observer.png',officer:'assets/qstyle-v2/mainline/portrait-officer.png',healer:'assets/qstyle-v2/mainline/portrait-healer.png',lord:'assets/qstyle-v2/mainline/portrait-lord.png',founder:'assets/qstyle-v2/mainline/portrait-founder.png'};
function mainlineProtagonistPortrait(){
  const gender=state.gender==='男'?'male':'female';
  const appearance=Math.max(1,Math.min(3,Number(state.appearance)||1));
  const outfit=Math.max(1,Math.min(8,Number(state.outfit)||1));
  return `assets/qstyle-v2/mainline/protagonist-wardrobe/${gender}-a${appearance}-o${outfit}.webp`;
}
const mainlineMaterials=[['玄紋絲','xuansi'],['玄靈絹','xuanjuan'],['玄紋革','xuanpi'],['玄靈革','lingpi'],['玄風革','fengpi'],['玄靈玉','lingyu'],['玄靈晶','lingjing']];
const mainlineMaterialDescriptions={xuansi:'由九鎖首通或神念遠遊所得的玄蠶絲抽理而成，絲質輕韌且容易承載細小陣紋，是製作冠的主要素材。',xuanjuan:'將九鎖首通或遠遊所得玄靈絲線反覆浸潤、織成的柔韌絹材，是製作法衣的主要素材。',xuanpi:'取自九鎖首通或神念遠遊所遇妖獸的靈化表皮，是製作護腕的主要素材。',lingpi:'由九鎖首通或遠遊所得靈獸皮革鞣製而成，是製作腰帶的主要素材。',fengpi:'九鎖首通或神念遠遊時尋得的御風靈皮，是製作靴履的主要素材。',lingyu:'由九鎖首通或神念遠遊所得的溫潤玉料，是製作玉佩的主要素材。',lingjing:'在九鎖靈流交會處形成的透明晶體，可由首通或神念遠遊取得，是製作指環的主要素材。'};
mainlineMaterials.forEach(([name,key])=>itemCatalog[`main-material-${key}`]={name,image:`assets/qstyle-v2/mainline/material-${key}.png`,description:mainlineMaterialDescriptions[key],count:`mainlineMaterial_${key}`,usable:false,giftable:false,sellPrice:1});
const equipmentSets=['一念','雙生','三渡','四鎮','五嶽','六御','七曜','八極','九破'],equipmentSlots=[['crown','冠','spiritualPower','銳識','xuansi'],['robe','法衣','physique','玄軀','xuanjuan'],['bracer','護腕','rootBone','命骨','xuanpi'],['belt','腰帶','trueQi','元息','lingpi'],['boots','靴履','agility','游影','fengpi'],['pendant','玉佩','','','lingyu'],['ring','指環','','','lingjing']],tierMaterials=['靈砂','玄鐵','青晶','紫晶','地髓','玄元晶','曜靈砂','天罡晶','九玄髓'],forgeNeeds=[[3,1,1],[4,2,1],[5,3,1],[6,4,2],[7,5,2],[8,6,3],[9,7,3],[10,8,4],[12,10,5]];
const equipmentNormalRolls=[[[8,12],[13,17],[26,34],[10,14],[17,23]],[[18,25],[28,37],[55,75],[22,30],[37,50]],[[37,50],[55,75],[110,150],[44,60],[74,100]],[[64,86],[96,129],[191,259],[76,103],[128,172]],[[99,134],[149,201],[298,402],[119,161],[198,268]],[[145,196],[218,295],[436,589],[174,236],[290,393]],[[208,281],[312,422],[623,843],[249,337],[416,562]],[[237,321],[356,482],[712,964],[285,385],[475,642]],[[340,460],[510,690],[1020,1380],[408,552],[680,920]]];
const equipmentRareRolls=[[[13,17],[20,25],[40,50],[16,20],[26,34]],[[29,36],[43,55],[86,109],[34,44],[57,73]],[[57,73],[86,109],[172,218],[69,87],[114,146]],[[99,126],[148,189],[297,378],[119,151],[198,252]],[[154,196],[231,294],[462,588],[185,235],[308,392]],[[226,287],[338,431],[676,861],[271,344],[451,574]],[[323,411],[484,616],[968,1232],[387,493],[645,821]],[[369,469],[553,704],[1106,1408],[442,563],[737,939]],[[528,672],[792,1008],[1584,2016],[634,806],[1056,1344]]];
const craftingMaterialItems=[
  ['赤元草','craftHerbChiyuan','herb-chiyuan.png','蘊含熾盛元息的赤紅靈草，是煉製元息丹與釀造歸元清釀的主要藥材。'],
  ['血玉參','craftHerbXueyu','herb-xueyu.png','根身如血玉凝成的靈參，是煉製命骨丹與釀造玉骨醇醪的主要藥材。'],
  ['金甲芝','craftHerbJinjia','herb-jinjia.png','菌蓋層疊如金甲的靈芝，是煉製玄軀丹與釀造玄身烈酎的主要藥材。'],
  ['輕靈葉','craftHerbQingling','herb-qingling.png','葉脈縈繞清風的輕盈靈草，是煉製游影丹與釀造流影霞酌的主要藥材。'],
  ['丹砂','craftCinnabar','cinnabar.png','煉丹常用的精純朱砂，能穩定藥性並引導丹火凝聚。']
];
const craftingMaterialCountByName=Object.fromEntries(craftingMaterialItems.map(([name,count])=>[name,count]));
craftingMaterialItems.forEach(([name,count,image,description])=>itemCatalog[`craft-material-${count}`]={name,image:`assets/qstyle-v2/production/materials/${image}`,description,count,usable:false,giftable:false,sellPrice:1});
const forgeTierMaterialCountByName=Object.fromEntries(tierMaterials.map((name,index)=>[name,`forgeTierMaterial_${index+1}`]));
tierMaterials.forEach((name,index)=>itemCatalog[`forge-tier-material-${index+1}`]={name,image:'assets/qstyle-v2/mainline/material-lingjing.png',description:`凝聚第 ${index+1} 階器韻的煉器階材，是製作${equipmentSets[index]}系列裝備的必要素材。`,count:forgeTierMaterialCountByName[name],usable:false,giftable:false,sellPrice:1,materialTier:index+1});
itemCatalog.equipmentSpiritCore={name:'器靈精魄',image:'assets/qstyle-v2/spirit-insight-v1.png',description:'從強大器靈殘韻中凝成的精魄，是製作極品裝備的核心珍材。',count:'equipmentSpiritCore',usable:false,giftable:false,sellPrice:1,materialTier:10};
const productionMaterialCountByName={...craftingMaterialCountByName,...forgeTierMaterialCountByName,'器靈精魄':'equipmentSpiritCore'};
const pillTypes=[['yuanxi','元息丹','trueQi','元息','赤元草'],['minggu','命骨丹','rootBone','命骨','血玉參'],['xuanqu','玄軀丹','physique','玄軀','金甲芝'],['youying','游影丹','agility','游影','輕靈葉']],pillNeeds=[[2,1],[3,2],[4,3],[6,4],[8,5],[10,7],[13,9],[16,12],[20,15]],pillTierGains=[10,20,30,40,50,60,70,80,100];
function pillTierGain(tier){return pillTierGains[Math.max(1,Math.min(9,Math.floor(Number(tier)||1)))-1]}
pillTypes.forEach(([key,name,attribute,label])=>{for(let tier=1;tier<=9;tier++){const id=`pill-${key}-t${tier}`,gain=pillTierGain(tier);itemCatalog[id]={name:`${['一','二','三','四','五','六','七','八','九'][tier-1]}階${name}`,image:`assets/qstyle-v2/production/pills/${key}-t${tier}.png`,description:`以專屬主藥與丹砂煉成的永久${label}屬性丹。每顆永久增加 ${gain} 點${label}；每一階此類丹藥基礎最多服用 50 顆，可藉洗髓伐毛丹提高上限。`,count:`pillCount_${key}_${tier}`,usable:true,giftable:false,sellPrice:1,pillData:{key,tier,attribute,label,gain}}}});
const brewTypes=[['yuanxi','歸元清釀','trueQi','元息','赤元草'],['minggu','玉骨醇醪','rootBone','命骨','血玉參'],['xuanqu','玄身烈酎','physique','玄軀','金甲芝'],['youying','流影霞酌','agility','游影','輕靈葉']],brewQualities={normal:{name:'凡品',gain:50,herb:24},rare:{name:'極品',gain:100,herb:36}};
['normal','rare'].forEach(quality=>{
  const meta=brewQualities[quality],baseId=`brew-base-${quality}`;
  itemCatalog[baseId]={name:`${meta.name}原釀`,image:`assets/qstyle-v2/production/brews/base-${quality}.webp`,description:`釀製${meta.name}靈釀的樸素酒基。只能在釀坊作為主材使用。`,count:`brewBase_${quality}`,usable:false,giftable:false,sellPrice:1,brewBase:true};
  brewTypes.forEach(([key,name,attribute,label,herb])=>{const id=`brew-${key}-${quality}`;itemCatalog[id]={name:`${meta.name}・${name}`,image:`assets/qstyle-v2/production/brews/${key}-${quality}.webp`,description:`以${meta.name}原釀與${herb}釀成。品飲後永久增加 ${meta.gain} 點${label}；此品質此類基礎最多品飲 50 瓶，可藉洗髓伐毛丹提高上限。`,count:`brewCount_${key}_${quality}`,usable:true,giftable:false,sellPrice:1,brewData:{key,quality,attribute,label,gain:meta.gain}};});
});
const mainlineBias=[['元息','紫陽參','赤元草'],['命骨','龍血芝','血玉參'],['玄軀','玄甲藤','金甲芝'],['游影','風靈草','輕靈葉']];
const mainlineMechanics=['地脈震波：每三回合敵方攻勢增強','枯脈禁制：敵方防禦較高','赤霞灼流：敵方攻擊較高','殘觀符陣：敵方閃避較高','星屑割裂：敵方暴擊提高','九曜輪轉：敵方命中提高','妖胎狂化：氣血低於一半時攻勢提高','地脈護甲：敵方氣血與防禦提高','共夢迷障：敵方閃避與暴擊提高','劫憶重現：敵方攻防均衡提升','百川回流：敵方氣血提高','總樞鎮壓：敵方防禦提高','界隙亂流：敵方命中與閃避提高','觀天殘陣：敵方防禦與暴擊提高','踏雲追擊：敵方攻擊與命中提高','守界合陣：敵方氣血與防禦提高','九鎖共鳴：敵方全屬性提高','封天決意：守界司之主全力以赴'];
const mainlineWaves=[['躁靈山獸','黑紋妖猿'],['枯井陰靈','守界司井衛'],['赤羽妖禽','霞谷吞靈獸'],['殘符道兵','古觀護卷靈'],['逐星荒獸','奪隕魔修'],['曜臺星傀','九曜守陣人'],['異胎幼獸','妖林蛻變體'],['地宮石俑','靈脈守宮獸'],['夢遊城民','無相念傀'],['破城劫影','鏡宮怨念'],['涸澤水妖','百川吞流獸'],['總樞道兵','鎮脈司衛'],['界隙魘獸','亂流殘影'],['觀天星傀','古臺守錄靈'],['雲階司衛','踏霄鎮路使'],['鎖天殿衛','守界合陣師'],['九鎖道兵','封天陣靈'],['絕域司衛','九鎖化身']];
const mainlineWavePowers=[[1000,1200,1500],[1300,1600,2000],[2400,3000,3800],[3300,4200,5200],[6500,8000,10000],[9000,11500,14500],[18000,22500,28000],[25000,32000,40000],[50000,62000,78000],[70000,88000,110000],[135000,170000,210000],[190000,240000,300000],[360000,450000,560000],[500000,630000,780000],[900000,1120000,1400000],[1250000,1600000,2000000],[2400000,3000000,3800000],[3500000,4400000,5500000]];
const mainlineWaveRaces=[['yao','yao','yao'],['demon','human','human'],['yao','yao','yao'],['immortal','immortal','human'],['yao','demon','demon'],['immortal','human','human'],['yao','yao','yao'],['immortal','yao','dragon'],['human','demon','human'],['demon','demon','demon'],['yao','yao','yao'],['immortal','human','human'],['demon','demon','demon'],['immortal','immortal','immortal'],['human','human','human'],['human','human','human'],['immortal','immortal','dragon'],['human','immortal','human']];
function mainlineArcName(id){return id<=4?'迷霧初見':id<=8?'鎖影浮現':id<=12?'災變真相':id<=16?'守界之爭':'天門抉擇'}
const mainlineStoryScripts=[
  [['山腳樵夫','healer','這幾日林子會喘氣。每逢地底一震，鳥獸便紅著眼往外衝。'],['主角','player','林子……真的會喘氣嗎？我只聽過獸潮，從沒見過這種事。'],['守界司巡使','guardian','此地已由守界司接管。離開石柱，莫再追問。'],['主角','player','守界司？我連這個名字都沒聽過……可若現在離開，山下的人怎麼辦？']],
  [['守井老人','observer','古井曾連著靈脈，如今一夜乾涸，只剩井底有人敲石。'],['守界司巡使','guardian','我是在修復封印，不是毀壞靈脈。退去，這不是你能承擔的事。'],['主角','player','封印、靈脈……我還弄不明白。但井水乾了，村裡的人明日便無水可用。'],['守界司巡使','guardian','你只看見眼前一口井，尚不知道這道封印曾保住多少性命。']],
  [['失蹤修士','healer','赤霞把我們的靈力一縷縷抽走，最後全送上了天。'],['守界司女使','officer','谷中陣眼失控。守界司正在回收逸散靈氣，並非掠奪。'],['主角','player','你說是在救人，可那些失蹤者的名字，為什麼一個也不准提？'],['守界司女使','officer','因為你尚未見過恐慌如何害死一整座城。']],
  [['觀中殘念','observer','九鎖既成，天門永閉……後半卷，被人以劍意刮去了。'],['主角','player','九鎖……原來井底和赤霞谷的異象，都與這個名字有關。'],['守卷道人','guardian','到此為止。知道得越多，未必能讓你救下更多人。'],['主角','player','我不知道被刪掉的是什麼。但既然有人不願讓我們看見，它一定很重要。']],
  [['奪寶修士','healer','那不是星辰，是從天外裂縫掉下來的界壁碎片！'],['守界司女使','officer','放下碎片。它會擴大凡間舊傷。'],['主角','player','我只是碰到它，便看見天空像琉璃一樣裂開……那是真正發生過的事嗎？'],['守界司女使','officer','去九曜古臺。若你能活著走到那裡，便會知道自己正在追問什麼。']],
  [['觀星老人','observer','九曜不是九星，而是九個把天地靈氣送往界壁的鎖眼。'],['主角','player','青石荒徑的黑柱、古井、赤霞……原來不是彼此無關的怪事。'],['九曜陣師','guardian','九鎖重啟已不可逆。你每破一處，凡間便多一分天劫失控的風險。'],['主角','player','我還不知道該不該破壞它。但至少，我不能再讓自己什麼都不知道。']],
  [['靈獸醫者','healer','牠們出生數日便完成百年蛻變，肉身承受不住，全都在痛苦中狂化。'],['主角','player','九鎖原本不是用來保護凡間嗎？為什麼受苦的反而是這些生靈？'],['守界司女使','officer','短痛總好過天穹再裂。'],['主角','player','也許你是對的……可如果這種痛一直不會結束，它還能算是短痛嗎？']],
  [['地宮守靈','observer','九鎖以九脈養界。脈盡，鎖成；鎖成，天路絕。'],['主角','player','所以它真的在抽走凡間的靈氣。守界司知道這件事，卻還是決定繼續？'],['守界司統領','officer','末法仍有人間；天崩之下，連凡人安葬之地都不會留下。'],['主角','player','我原以為只要找出誰在害人便夠了……可你們不是惡人，而我也不知道哪一邊才是對的。']],
  [['夢中之聲','lord','若一人飛升，可令萬人遭劫，你仍認為那人有飛升的資格嗎？'],['主角','player','我……不知道。若代價真是萬條性命，我也無法只說那是修士自己的道路。'],['夢中之聲','lord','不知道，便不該伸手觸碰維繫眾生的鎖。'],['主角','player','可我也不能只聽你給出的答案。讓我看看那場災難，然後由我自己作出選擇。']],
  [['古災倖存者','healer','雷火落下時，仙門護山陣先保住了修士，城裡的凡人只能抬頭等死。'],['主角','player','原來那些哭聲、倒塌的城牆都是真的……守界司並沒有捏造那場災難。'],['劫憶心魔','guardian','既已看見，還不明白嗎？只要天門永閉，這一切就不會再次發生。'],['主角','player','我明白你們為何恐懼了。但九鎖正在傷害今日的凡間，我還不能在這裡停下。']],
  [['澤畔醫者','healer','河床未乾，水中靈性卻消失了。村民還能飲水，修士與妖獸卻開始衰弱。'],['守界司女使','officer','等九鎖完成，亂流平息，凡人至少能安穩活下去。'],['主角','player','在鏡宮裡，我看見沒有九鎖會發生什麼；而在這裡，我也看見九鎖完成後會失去什麼。'],['守界司女使','officer','我們選擇先保住明日。至於百年之後，只能交給仍活著的人。']],
  [['總樞殘碑','observer','九脈歸一，內外永隔。此後無仙臨世，亦無人登天。'],['主角','player','這就是你們的最終計畫……不是等界壁修復，而是讓天門永遠消失。'],['總樞監守','guardian','一艘與風浪隔絕的孤舟，至少不會再次沉沒。'],['主角','player','可九鎖正抽乾舟上的水。這樣換來的安全，究竟還能維持多久？']],
  [['守隙傷兵','healer','我們在這裡死了三百七十二人，只為讓裂縫不再吞掉山下城池。'],['主角','player','以前我只看見你們封鎖消息、抽走靈氣，從沒想過還有人日日死在這裡。'],['守界司女使','officer','既然看見了，就別把我們用命守住的界壁重新推向災難。'],['主角','player','我不會否定你們的守護。但守住裂縫，與永久奪走所有人的道路，不該只能綁在一起。']],
  [['創陣者殘影','founder','九鎖為養界而設。界壁癒合之日，當散九脈、還天路於眾生。'],['主角','player','原來九鎖從來不是永久封印。被刪去的後半卷，記載的是解除它的時機。'],['創陣者殘影','founder','後人若只記得恐懼，守護終會變成另一場劫難。'],['守界司統領','officer','古人留下的是理想。今日界壁仍有裂痕，誰能保證解除後不會重演天崩？']],
  [['動搖的司衛','officer','我們入司時發誓護佑凡人，沒有人告訴我九鎖原本終有解除之日。'],['主角','player','我一路走來也曾把你們當成敵人。現在我只想阻止永久封天，不想否定守界司存在的意義。'],['鎮階使','guardian','沒有絕對安全的方法。選擇解除，便是選擇讓凡人再度承擔風險。'],['主角','player','那就設法修補界壁、約束飛升，而不是因害怕選錯，便永遠不准後人選擇。']],
  [['守界司統領','officer','我們救過十七座城，填過六道界隙，埋葬的同袍比你見過的修士更多。'],['主角','player','正因如此，守界司更不該只剩下封天。你們累積千年的經驗，本可以用來守住一條更安全的天路。'],['守界司統領','officer','擊敗我，你便能進入最後核心；但解除九鎖後的每一道雷，都會成為你的責任。'],['主角','player','我不能保證永不失敗。但我願意承擔選擇，而不是把恐懼變成萬世不准改變的命令。']],
  [['九鎖陣靈','founder','第一鎖、第二鎖……九脈共鳴，封天將成。'],['守界司女使','officer','我替你擋住追兵。不是為了飛升，而是為了讓守界司重新記起「暫時」二字。'],['主角','player','我曾連靈脈與陣眼都分不清。如今我知道，不能粗暴斬碎九鎖；每解除一處，都要把靈氣送回原脈。'],['九鎖陣靈','guardian','解除封天者，將被視為凡間之敵。']],
  [['守界司之主','lord','飛升者只看見自己的長生，卻未必問過被天劫波及的凡人是否願意承擔代價。'],['主角','player','我曾答不出來。看過那場災難後，我更不會說凡人的性命只是求道路上的代價。'],['守界司之主','lord','那你便該明白：一個沒有仙人的凡間，至少仍是一個屬於凡人的世界。'],['主角','player','可我也看見九鎖如何讓靈脈枯竭、生靈異變。我要阻止的不是守護，而是把暫時的守護變成永遠不准後人改變的禁令。']]
];
const mainlineAftermath=['黑柱第一環黯下，地底震動卻未停止。井口方向傳來更深的回聲。','巡使留下半枚守界司令牌。古井深處，一條枯脈正延伸向赤霞谷。','被抽走的靈氣在天際匯成細線，終點指向落霞古觀。','殘卷拼出「九鎖」之名；有人正在抹除建陣者真正的初衷。','界壁碎片映出九處光點，其中已有數處甦醒。','九曜陣圖完全展開。你的目標從追查異象變為阻止九鎖復甦。','妖林恢復片刻寧靜，但新生靈獸仍帶著不可逆的異變。','地宮靈流回歸一脈，你也終於確認：封天正在消耗凡間。','夢境崩散前，守界司之主邀你前往千念鏡宮觀看舊日真相。','你沒有替古災辯解，也沒有因此接受永禁；真正的衝突自此開始。','百川稍緩，所有殘餘流向仍指著地脈總樞。','總樞停轉一刻，永久封閉的完整計畫已無法再被隱瞞。','你第一次親眼看見凡間界壁，也看見守界司世代付出的血。','創陣者原文重見天日：九鎖本應在界壁修復後解除。','一部分司衛放下兵刃，另一部分則退守鎖天殿。','統領敗而不屈，卻履行承諾，開啟通往最後核心的門。','九條靈流被逐一導回凡間，最後的天門絕域隨之顯現。','九鎖崩解，天門第一次真正顯現；天地只承認你取得了走到門前的資格。'];
const mainlineDefeatScripts=[
  [['守界司巡使','guardian','連受驚的山獸都無法越過，現在靠近石柱，只會成為地脈下一個犧牲者。'],['主角','player','我確實很害怕……但牠們衝來之前，地底總會先響一下。下次我會記住。']],
  [['守界司巡使','guardian','古井正在崩塌。我不會為了滿足你的疑問，再多賠上一條性命。'],['主角','player','你剛才明明能傷我，卻先扶住了井壁……守界司究竟是在救人，還是在隱瞞什麼？']],
  [['守界司女使','officer','赤霞會沿靈力逆流。再強行運功，你也會和失蹤者一樣被抽空。'],['主角','player','難怪越用力抵抗，身上的力量反而消失得越快……我得換個辦法。']],
  [['守卷道人','guardian','你連殘觀符陣都破不了，知道被刪去的真相又能改變什麼？'],['主角','player','我現在還看不懂那些古字。但我已經走到這裡，不能再假裝什麼都沒發現。']],
  [['守界司女使','officer','界壁碎片會放大貪念。你此刻的執著，與那些奪寶修士有何不同？'],['主角','player','也許我真的太急著知道答案了。下一次，我會先學會不被碎片裡的景象牽著走。']],
  [['九曜陣師','guardian','九曜每轉一輪，下一道鎖便更穩一分。你沒有時間靠一次次失敗理解陣圖。'],['觀星老人','observer','莫慌。你第一次來時連星軌都看不見，如今至少知道九道光並非星辰。']],
  [['守界司女使','officer','看清楚。這就是靈氣失序後的生靈；解除九鎖，只會讓異變蔓延得更快。'],['主角','player','我不知道解除九鎖會不會更糟……但牠們的痛苦確實與九鎖甦醒同時開始。']],
  [['守界司統領','officer','地脈會排斥一切逆行者。凡間本身已經替你作出選擇。'],['主角','player','也許是我還不懂地脈。但剛才接觸核心時，我感覺到那些靈氣一直想回到原來的方向。']],
  [['夢中之聲','lord','你的意志如此容易被一場共夢淹沒，又憑什麼承擔萬人的清醒？'],['主角','player','夢境借用了全城人的恐懼。下一次，我不會只靠自己的神念與它對抗。']],
  [['古災倖存者','healer','別再看了……每一次雷火落下，我都會重新失去他們。'],['主角','player','若我只因承受不住便轉身，這段記憶就又會變成別人替我下決定的理由。']],
  [['守界司女使','officer','百川不會因一人的意志倒流。接受它們的方向，至少你還能活著離開。'],['主角','player','水流可以疏導。強行截斷才會潰堤，我會找到被掩埋的舊河道。']],
  [['總樞監守','guardian','總樞一息便有千道變化。你破壞的每個節點，都可能讓一方地脈先行枯死。'],['主角','player','所以不能只斬斷它。我必須在出手同時，把靈流送回原脈。']],
  [['守隙傷兵','healer','退後！裂隙正在擴大。你若死在這裡，我們還得分人手替你收屍。'],['主角','player','我看見你們如何鎮住亂流了。下一次，我會先與你們穩住裂隙，再越過天塹。']],
  [['創陣者殘影','founder','只讀見一句原文，便想用它否定後世千年犧牲，你的心仍被答案牽著走。'],['主角','player','你留下的不是答案，而是解除九鎖的條件。我會把全文帶出去，讓世人一同判斷。']],
  [['鎮階使','guardian','動搖者可以放下兵刃，我不能。若職責會因恐懼而改寫，守界司早已不復存在。'],['主角','player','我會用下一次勝負證明：守護凡間與服從永禁，並不是同一件事。']],
  [['守界司統領','officer','你只證明了自己有勇氣，還沒證明你有能力接過我們守了千年的重擔。'],['主角','player','那就別留手。我要跨過的不是你一個人，而是這千年累積的理由。']],
  [['九鎖陣靈','founder','第七靈流偏移。破鎖者無力導脈，封天程序將抹除一切干擾。'],['守界司女使','officer','別再硬斬！先讓前六脈彼此平衡，否則第七鎖會把反震全數送回你身上。']],
  [['守界司之主','lord','你敗給的不是我，是凡間承受不起第二次天崩的重量。回去吧，我仍可當今日從未見過你。'],['主角','player','我會回去，但不是放棄。下一次，我會帶著能承擔這份重量的方法站到你面前。']]
];
const mainlineVictoryScripts=[
  [['山腳樵夫','healer','地底的聲音停了……至少今晚，山下的人可以睡一場安穩覺。'],['主角','player','那根黑色石柱還在發熱，上面的九道圓環也不像天然紋路。我得去古井問問。']],
  [['守界司巡使','guardian','你贏了，卻連自己碰到的是什麼都不知道。拿著這半枚令牌；若還想追查，沿枯脈去赤霞谷。'],['主角','player','你明明可以什麼都不說……守界司似乎並不只是在阻止我。']],
  [['失蹤修士','healer','霞光散了！被困在谷裡的人還活著，快把他們送出去。'],['主角','player','靈氣流向仍指著那座荒廢古觀。也許那裡能解釋「守界司」究竟在收集什麼。']],
  [['觀中殘念','observer','九鎖既成，天門永閉……餘文已毀，只留九曜方位。'],['主角','player','九鎖與天門有關。雖然仍看不懂全貌，但九曜方位指向星隕荒原。']],
  [['守界司女使','officer','你沒有把界壁碎片占為己有。看來，你與那些奪寶者確實不同。'],['主角','player','碎片裡的天空一直在崩裂。我想知道那是幻象，還是凡間真正有過的傷口。']],
  [['觀星老人','observer','看吧，九道光並非星辰；每一道都連著凡間的一條大脈。'],['主角','player','第一鎖就在青石荒徑，而且不只一處節點正在甦醒。從現在起，我追查的不再只是幾場異象。']],
  [['靈獸醫者','healer','妖王的蛻變停下來了。牠受的傷很重，但至少不會再因痛苦襲擊幼獸。'],['主角','player','九鎖說是為了保護凡間，卻也正在改變凡間的生靈。我要去地宮看看靈氣究竟被送往哪裡。']],
  [['守界司統領','officer','你已親眼看見九鎖如何維持界壁。現在還敢說解除它不會帶來災難嗎？'],['主角','player','我不敢。可我也親眼看見靈脈被抽乾。這兩種代價，我都不能假裝不存在。']],
  [['夢中之聲','lord','你抵住了共夢，卻仍沒有回答我的問題。去千念鏡宮吧，那裡沒有辯詞，只有死者留下的記憶。'],['主角','player','我會去。若要作出選擇，至少不能只憑自己一路見到的那一面。']],
  [['古災倖存者','healer','記住那些沒有名字的人。無論你最後選擇什麼，都別再讓他們只成為修士口中的代價。'],['主角','player','我會記住。守界司的恐懼有它的根源，但今日的九鎖也正製造新的傷害。']],
  [['守界司女使','officer','你救下這片靈澤，也只延緩了一地的枯竭。九鎖一旦完成，所有靈流仍會歸向總樞。'],['主角','player','那就去總樞。我要知道你們準備把凡間封閉到什麼時候。']],
  [['總樞監守','guardian','計畫已寫在碑上：九脈歸一，內外永隔。守界司不會再等待下一場天崩。'],['主角','player','所以真正的衝突不是要不要保護凡間，而是保護能否成為永久奪走道路的理由。']],
  [['守隙傷兵','healer','裂隙穩住了。你沒有趁我們受傷破壞封鎖……為什麼？'],['主角','player','因為你們守住的是山下的人。我反對永久封天，不代表我要否定所有守護。']],
  [['創陣者殘影','founder','帶走完整原文。它不能替今日的人作決定，卻能證明九鎖從來不是不可改變。'],['主角','player','我終於明白，被隱瞞的不是九鎖的力量，而是它原本應該結束。']],
  [['動搖的司衛','officer','我們會留下照看傷者。雲階之上仍有人相信，任何遲疑都是對死者的背叛。'],['主角','player','我不會逼你們選邊。我要把證據帶進鎖天殿，讓守界司自己看見它已走了多遠。']],
  [['守界司統領','officer','我敗了。依約，最後核心的門會為你開啟。但若天劫再臨，我仍會第一個站在你面前。'],['主角','player','那時我們可以一同守住它。守界司不必消失，它只是不能再替萬世後人永久關門。']],
  [['守界司女使','officer','九條靈流已回歸原脈，天門絕域正在顯現。接下來，沒有人能替你承受最後的選擇。'],['主角','player','我從一場不明所以的獸潮走到這裡。最後一關，我會帶著一路看見的每一種代價作答。']],
  [['守界司之主','lord','九鎖已散。若有一日天穹再裂，今日所有相信你的人都可能為此付出代價。'],['主角','player','所以這不是結束。我會走到天門前，也會尋找不再讓凡人替飛升承擔代價的方法。']]
];
const mainlineBagRanges=[[20,40,15,30,10,20,15,30],[25,50,20,35,12,24,20,35],[35,65,25,45,16,30,25,45],[40,75,30,50,18,34,30,50],[55,95,35,60,22,40,35,60],[65,110,40,70,26,46,40,70],[80,135,50,85,32,55,50,85],[95,155,55,95,36,62,55,95],[115,185,65,110,42,72,65,110],[135,215,75,125,48,82,75,125],[160,250,90,145,56,95,90,145],[185,285,100,165,64,108,100,165],[215,325,115,185,74,122,115,185],[245,365,130,205,84,138,130,205],[285,420,150,235,96,158,150,235],[325,470,170,260,108,180,170,260],[370,530,195,295,122,205,195,295],[420,600,220,330,140,230,220,330]];
const mainlineFirstClearRewards=mortalMainline.map(stage=>{
  const boss=stage.id%2===0,bag=mainlineBagRanges[stage.id-1],bias=mainlineBias[(stage.id-1)%4],primary=mainlineMaterials[(stage.id-1)%mainlineMaterials.length],secondary=mainlineMaterials[stage.id%mainlineMaterials.length],pick=(low,high)=>boss?high:low,rewards=[
    {type:'state',key:`mainlineMaterial_${primary[1]}`,name:primary[0],amount:boss?2:1},
    ...(boss?[{type:'state',key:`mainlineMaterial_${secondary[1]}`,name:secondary[0],amount:1}]:[]),
    {type:'state',key:forgeTierMaterialCountByName[tierMaterials[stage.realm-1]],name:tierMaterials[stage.realm-1],amount:boss?2:1},
    {type:'loot',key:bias[1],name:bias[1],amount:boss?3:2},
    {type:'state',key:craftingMaterialCountByName[bias[2]],name:bias[2],amount:boss?2:1},
    {type:'state',key:craftingMaterialCountByName['丹砂'],name:'丹砂',amount:boss?2:1},
    {type:'state',key:`tribPill${stage.realm}`,name:`${spiritRealms[stage.realm-1]}丹`,amount:boss?2:1},
    {type:'state',key:'mainlineSpiritStoneBag',name:'靈石袋',amount:pick(bag[0],bag[1])*3},
    {type:'state',key:'mainlineWoodBag',name:'木材袋',amount:pick(bag[2],bag[3])},
    {type:'state',key:'mainlineIronBag',name:'隕鐵袋',amount:pick(bag[4],bag[5])},
    {type:'state',key:'mainlineFoodBag',name:'食物袋',amount:pick(bag[6],bag[7])}
  ];
  if(stage.id===18){mainlineMaterials.forEach(([name,key])=>rewards.push({type:'state',key:`mainlineMaterial_${key}`,name,amount:2}));rewards.push({type:'state',key:'equipmentSpiritCore',name:'器靈精魄',amount:1})}
  return rewards;
});
function mainlineFirstClearRewardText(stage){return mainlineFirstClearRewards[stage.id-1].map(x=>`${x.name}×${x.amount}`).join('、')}
function grantMainlineFirstClearRewards(stage){state.mainlineLoot=state.mainlineLoot||{};for(const reward of mainlineFirstClearRewards[stage.id-1]){if(reward.type==='loot')state.mainlineLoot[reward.key]=(state.mainlineLoot[reward.key]||0)+reward.amount;else state[reward.key]=(state[reward.key]||0)+reward.amount}return mainlineFirstClearRewardText(stage)}
[['mainlineSpiritStoneBag','靈石袋','spiritStone','靈石','assets/qstyle-v2/spirit-stone.png'],['mainlineWoodBag','木材袋','wood','木材','assets/qstyle-v2/wood-cutout.png'],['mainlineIronBag','隕鐵袋','meteorIron','隕鐵','assets/qstyle-v2/meteor-iron-cutout.png'],['mainlineFoodBag','食物袋','food','食物','assets/qstyle-v2/food-cutout.png']].forEach(([count,name,resource,label,image])=>itemCatalog[count]={name,image,description:`副本取得的${name}。使用後每個轉換為 1 點${label}。`,count,usable:true,giftable:false,sellPrice:1,resourceBundle:{resource,label,amount:1}});
const wardrobeOutfits={
  女:[
    {id:1,name:'雲水道袍',kind:'凡品',quality:'common'},{id:2,name:'月華輕袍',kind:'凡品',quality:'common'},{id:3,name:'丹霞法衣',kind:'凡品',quality:'common'},
    {id:4,name:'星河鳳衣',kind:'靈品',quality:'spirit'},{id:5,name:'九霄凰裳',kind:'靈品',quality:'spirit'},
    {id:6,name:'星海神綃',kind:'天工絕品',quality:'masterwork',effect:'star'},{id:7,name:'燼凰天裳',kind:'天工絕品',quality:'masterwork',effect:'flame'},{id:8,name:'萬象瑤衣',kind:'天工絕品',quality:'masterwork',effect:'myriad'}
  ],
  男:[
    {id:1,name:'青雲道袍',kind:'凡品',quality:'common'},{id:2,name:'玄劍法袍',kind:'凡品',quality:'common'},{id:3,name:'山嶽戰袍',kind:'凡品',quality:'common'},
    {id:4,name:'太虛星袍',kind:'靈品',quality:'spirit'},{id:5,name:'天衍劍衣',kind:'靈品',quality:'spirit'},
    {id:6,name:'太初帝袍',kind:'天工絕品',quality:'masterwork',effect:'star'},{id:7,name:'鴻蒙火袞',kind:'天工絕品',quality:'masterwork',effect:'flame'},{id:8,name:'萬象道服',kind:'天工絕品',quality:'masterwork',effect:'myriad'}
  ]
};
const masterworkOutfitPrice=50;
function masterworkOutfitKey(gender,id){return `${gender}:${id}`}
function masterworkOutfitOwned(outfit,gender=state.gender){return outfit?.quality!=='masterwork'||(state.ownedMasterworkOutfits||[]).includes(masterworkOutfitKey(gender,outfit.id))}
function normalizeWardrobeOutfit(){
  state.ownedMasterworkOutfits=Array.isArray(state.ownedMasterworkOutfits)?state.ownedMasterworkOutfits:[];
  const outfit=wardrobeOutfits[state.gender]?.find(item=>item.id===(Number(state.outfit)||1));
  if(outfit?.quality==='masterwork'&&!masterworkOutfitOwned(outfit))state.outfit=1;
}
async function selectOrBuyOutfit(id){
  const gender=state.gender,outfit=wardrobeOutfits[gender]?.find(item=>item.id===Number(id));if(!outfit)return;
  if(!masterworkOutfitOwned(outfit,gender)){
    if((state.spiritJade||0)<masterworkOutfitPrice)return toast('靈玉不足');
    const confirmed=await gameConfirm(`確定花費 ${masterworkOutfitPrice} 靈玉購買「${outfit.name}」？\n購買後將永久加入此角色的衣閣。`,{title:'購買天工絕品',confirmText:'購買'});if(!confirmed)return;
    if(state.gender!==gender||(state.spiritJade||0)<masterworkOutfitPrice)return toast('無法完成購買');
    state.spiritJade-=masterworkOutfitPrice;state.ownedMasterworkOutfits.push(masterworkOutfitKey(gender,outfit.id));toast(`已購得「${outfit.name}」`);
  }
  state.outfit=outfit.id;applyCharacterVisual();renderWardrobeSection('outfits',true);render();save();
}
const trueFormCatalog=[
  {id:'none',name:'返璞歸真',quality:'none',kind:'無品',description:'收斂真身異象，以本來面目示人。'},
  {id:'xuanjia-tortoise',name:'玄甲鎮岳',quality:'good',kind:'良品',image:'assets/qstyle-v2/true-form-xuanjia-tortoise-v1.png',description:'玄甲負岳而行，地脈金環緩轉，鎮住周身浮動元息。'},
  {id:'taixu-sword',name:'太虛劍相',quality:'spirit',kind:'靈品',image:'assets/qstyle-v2/true-form-sword-v2.png',description:'八方虛靈古劍結成劍陣，隨吐納明滅共鳴。'},
  {id:'jiuxiao-wings',name:'九霄靈翼',quality:'mystic',kind:'玄品',image:'assets/qstyle-v2/true-form-wings.png',description:'以清靈元息凝成的光翼，非羽非骨，如雲霞舒展。'},
  {id:'dari-buddha-hand',name:'大日佛掌',quality:'masterwork',kind:'天工絕品',hideTitle:true,image:'assets/qstyle-v2/true-form-dari-buddha-v3.png',description:'半透明的大日佛影於修士身後顯化，垂下金光雙掌，安穩托持主角入定修練。'},
  {id:'wanjie-demon',name:'萬劫魔尊',quality:'masterwork',kind:'天工絕品',hideTitle:true,image:'assets/qstyle-v2/true-form-wanjie-demon-v1.png',description:'萬劫魔影自黑蓮中顯化，四臂結印，幽焰與破碎劫輪緩緩迴轉。'}
];
const masterworkTrueFormPrice=100;
function masterworkTrueFormOwned(form){return form?.quality!=='masterwork'||(state.ownedMasterworkTrueForms||[]).includes(form.id)}
function normalizeTrueFormOwnership(){
  state.ownedMasterworkTrueForms=Array.isArray(state.ownedMasterworkTrueForms)?state.ownedMasterworkTrueForms:[];
  const form=trueFormCatalog.find(item=>item.id===(state.trueForm||'none'))||trueFormCatalog[0];
  if(form.quality==='masterwork'&&!masterworkTrueFormOwned(form))state.trueForm='none';
}
async function selectOrBuyTrueForm(id){
  const form=trueFormCatalog.find(item=>item.id===id);if(!form)return;
  if(!masterworkTrueFormOwned(form)){
    if((state.spiritJade||0)<masterworkTrueFormPrice)return toast('靈玉不足');
    const confirmed=await gameConfirm(`確定花費 ${masterworkTrueFormPrice} 靈玉購買「${form.name}」？\n購買後將永久加入此角色的衣閣。`,{title:'購買天工絕品真身',confirmText:'購買'});if(!confirmed)return;
    if((state.spiritJade||0)<masterworkTrueFormPrice)return toast('無法完成購買');
    state.spiritJade-=masterworkTrueFormPrice;state.ownedMasterworkTrueForms.push(form.id);toast(`已購得「${form.name}」`);
  }
  state.trueForm=form.id;applyCharacterVisual();renderWardrobeSection('true-forms',true);render();save();
}
const titleCatalog=[
  {id:'first-inquiry',name:'初心問道',image:'assets/qstyle-v2/titles/title-first-inquiry-v1.png',kind:'初入仙途',hint:'初入修行即可取得。',alwaysUnlocked:true},
  {id:'qi-ascension',name:'羽化凌霄',image:'assets/qstyle-v2/titles/title-qi-v1.png',kind:'單途飛升',hint:'成功飛升時，只有練氣達到仙陣門檻。'},
  {id:'sword-ascension',name:'劍開天門',image:'assets/qstyle-v2/titles/title-sword-v1.png',kind:'單途飛升',hint:'成功飛升時，只有淬劍達到仙陣門檻。'},
  {id:'body-ascension',name:'金身破界',image:'assets/qstyle-v2/titles/title-body-v1.png',kind:'單途飛升',hint:'成功飛升時，只有煉體達到仙陣門檻。'},
  {id:'qi-sword-ascension',name:'氣劍驚虹',image:'assets/qstyle-v2/titles/title-qi-sword-v1.png',kind:'雙途飛升',hint:'成功飛升時，練氣與淬劍同時達到仙陣門檻。'},
  {id:'qi-body-ascension',name:'性命混元',image:'assets/qstyle-v2/titles/title-qi-body-v1.png',kind:'雙途飛升',hint:'成功飛升時，練氣與煉體同時達到仙陣門檻。'},
  {id:'sword-body-ascension',name:'身劍無間',image:'assets/qstyle-v2/titles/title-sword-body-v1.png',kind:'雙途飛升',hint:'成功飛升時，淬劍與煉體同時達到仙陣門檻。'},
  {id:'three-paths-ascension',name:'三途歸一',image:'assets/qstyle-v2/titles/title-three-paths-v1.png',kind:'三途飛升',hint:'成功飛升時，三條修行道路皆達到仙陣門檻。'},
  {id:'nine-locks',name:'九鎖盡破',image:'assets/qstyle-v2/titles/title-nine-locks-v1.png',kind:'破鎖之證',hint:'完整通過九鎖封天全部十八關。'},
  {id:'all-arts-master',name:'萬法歸宗',image:'assets/qstyle-v2/titles/title-all-arts-master-v1.png',kind:'萬法圓滿',hint:'習得所有非門派功法書，並將每一部功法升至滿級。',description:'永久效果：道悟＋500、天契＋500；無須佩戴亦會生效。'}
];
const defaults = { name:'', gender:'女', hair:1, outfit:1, trueForm:'none', origin:'家族子弟', muted:false, free:0, spiritLevel:0, bodyLevel:0, swordLevel:0, swordPathVersion:2,swordEmbryo:'',swordName:'',swordNurtureLevel:0,swordIntent:0,swordInsight:0,swordIntentType:'',swordMoves:['origin'],swordTrialWins:0,bodyPathVersion:1,bodyStamina:100,bodyStaminaUpdatedAt:0,bodyTemper:0,bodyInjury:'',bodyInjuryUntil:0,testTemporaryItemsMailVersion:0,testResourceSupplyMailVersion:0,testFoodAuraSupplyMailVersion:0,testSpiritMedicineMailVersion:0,testCultivationPillCount:0,testSpiritStoneTenMillionCount:0,spiritMedicineCount:0, ...tribulationPillDefaults, ...techniqueBookDefaults, tribulationPillMigration:1, testTribulationPillGrantVersion:1, totalEarned:0, rootBone:5, trueQi:5, physique:5, agility:5, spiritualPower:5, comprehension:5, fortune:5, attributeGrowthVersion:2, learnedArts:[],learnedBookIds:[],mailbox:[],scripturePurchases:{date:'',ids:[]},marketPermanentPurchases:{},marketDailyPurchases:{date:'',counts:{}},artsCapacity:8,bagRank:1,bagItemOrder:[],mendingSilk:0,metalArt:0, woodArt:0, waterArt:0, fireArt:0, earthArt:0, metalRoot:0, woodRoot:0, waterRoot:0, fireRoot:0, earthRoot:0,spiritRootCurveVersion:2, aura:0, spiritPoolLevel:1, spiritStone:0, spiritJade:0, testJadeGrantVersion:1, food:20, wood:20, meteorIron:20, daoChildTotal:1, daoChildBought:0, workerSpiritStone:0,workerFood:0, workerWood:0, workerMeteorIron:0, spiritStoneAreaLevel:1, foodAreaLevel:1, woodAreaLevel:1, meteorIronAreaLevel:1,caveCoreLevel:1,caveCultivationLevel:1,caveSwordLevel:1,caveBodyLevel:1,caveCultivationEnabled:true,caveSwordEnabled:false,caveBodyEnabled:false,caveSwordTicks:0,caveBodyTicks:0, sect:'', sectFaction:'', sectStar:0, sectContribution:0, sectRank:0, sectTask:'', sectJoinedAt:null, sectYearsProcessed:0, sectNpcSnapshot:null, righteousness:0, evilQi:0, prestige:0, actingLeader:false, npcDaily:{},practiceBuff:{active:false,until:0,remaining:0,total:0},transmissionBuff:{active:false,until:0,remaining:0,total:0},lastGreetingDay:'',lastSalaryDay:'',lastPracticeDay:'',bornAt:null,lastTrustedTime:0,lastSave:Date.now() };
Object.assign(defaults,{qiPathSystemVersion:1,qiCycleMode:'small',qiInsightDay:'',qiInsightCharges:3,qiTribulationFocus:0,qiFoundationMarks:{small:0,origin:0,still:0},qiHeartTrials:{},qiHeartTraits:{guard:0,benevolent:0,free:0}});
Object.assign(defaults,{equippedTitle:'none',unlockedTitles:[]});
Object.assign(defaults,{learnedSectMoves:[]});
defaults.npcDaily={};defaults.cultivationAwakened=false;defaults.firstPath='';defaults.activePath='';defaults.spiritPathOpened=false;defaults.tutorialCompleted=false;
defaults.free=0n;defaults.swordEssence=0n;defaults.totalEarned=0n;defaults.swordPathOpened=null;defaults.bodyPathOpened=null;
defaults.attributeGrowthVersion=3;
defaults.swordPathVersion=0;defaults.swordPathMarks=[];defaults.swordTrialChoices={};defaults.swordTrialPendingChoice=0;
defaults.bodyPathVersion=2;defaults.bodyTrainingLoad=0;defaults.bodyTrainingLoadUpdatedAt=0;
defaults.bodyTrainingSystemVersion=3;defaults.bodyTrainingCharges=2;defaults.bodyTrainingChargeUpdatedAt=0;defaults.bodyFoundations={bone:0,blood:0,organs:0};defaults.bodyTrialFailures={};
defaults.testSwordPathPillsMailVersion=0;defaults.testSwordEssenceMailVersion=0;defaults.righteousQiPillCount=0;defaults.evilQiPillCount=0;
defaults.processedJadeGrantIds=[];
defaults.ownedMasterworkOutfits=[];
defaults.ownedMasterworkTrueForms=[];
defaults.sectTechniqueMailVersion=0;
defaults.sectRecords={};
defaults.sectMerit=0;
defaults.sectSearchAvailableAt=0;
defaults.sectTaskRouteUnlocks={};
defaults.mainlineCleared=0;defaults.mainlineStories={};defaults.mainlineMaterials={};defaults.mainlineLoot={};defaults.mainlineHarvest=[];defaults.mainlineSpiritStoneBag=0;defaults.mainlineWoodBag=0;defaults.mainlineIronBag=0;defaults.mainlineFoodBag=0;defaults.craftingMaterialMigration=0;defaults.ownedArtifacts=[];defaults.equippedArtifact='';
defaults.ascension={version:1,route:'none',prologueCompleted:false,heartTrialCompleted:false,delusionTrialCompleted:false,roadEndCompleted:false,heartRewardAllocated:false,delusionRewardAllocated:false,roadEndRewardAllocated:false,ascended:false,ascendedAt:0,serverAscensionRank:0,titleId:'',heartAnswers:[],delusionReplies:[],delusionAttemptCount:0,roadEndAttemptCount:0,lastMortalTrainingGround:'spirit',currentRealm:'mortal'};
defaults.divineRoamingUnlocked=false;defaults.divineRoamingManualCount=0;defaults.divineRoamingDay='';defaults.divineRoamingUsed=0;defaults.divineRoamingJob=null;defaults.divineRoamingHarvest={};defaults.divineRoamingTimingVersion=0;
defaults.encounterVersion=1;defaults.encounterQueue=[];defaults.encounterHistory=[];defaults.encounterMilestones={};defaults.encounterActiveMs=0;defaults.encounterNextMs=2700000;defaults.encounterSerial=0;
defaults.partnerStory=null;defaults.partnerSystem=null;
defaults.weavingJob=null;defaults.weavingTier=0;
defaults.xisuiFamaoPillCount=0;defaults.dosageLimitBonus=0;defaults.marketWeeklyPurchases={week:'',counts:{}};
defaults.swordEmbryoReversionElixirCount=0;
defaults.renameProtagonistJadeCount=0;defaults.genderRebirthMirrorCount=0;defaults.renamePartnerCovenantCount=0;
defaults.mindEmbodimentUnlocked=false;defaults.mindEmbodimentManualCount=0;
mainlineMaterials.forEach(([,key])=>defaults[`mainlineMaterial_${key}`]=0);defaults.mainlineMaterialMigration=0;
craftingMaterialItems.forEach(([,count])=>defaults[count]=0);
Object.values(forgeTierMaterialCountByName).forEach(count=>defaults[count]=0);defaults.equipmentSpiritCore=0;defaults.productionMaterialStorageVersion=0;
defaults.equipmentInventory=[];defaults.equippedItems={};defaults.pillUsage={};defaults.pillEffectVersion=2;defaults.craftingTier=1;defaults.craftingQuality='normal';defaults.craftingSlot='crown';defaults.craftingPill='yuanxi';
pillTypes.forEach(([key])=>{for(let tier=1;tier<=9;tier++)defaults[`pillCount_${key}_${tier}`]=0});
defaults.brewUsage={};defaults.brewCraftDaily={date:'',normal:0,rare:0};defaults.craftingBrew='yuanxi';defaults.craftingBrewQuality='normal';defaults.sectBrewExchangeDaily={date:'',normal:0,rare:0,counts:{}};
['normal','rare'].forEach(quality=>{defaults[`brewBase_${quality}`]=0;brewTypes.forEach(([key])=>defaults[`brewCount_${key}_${quality}`]=0)});
let state = { ...defaults }, tickStart = Date.now(), manualCultivationStartedAt=0, manualCultivationTimer=null, breakthroughInProgress=false;
const saveKey = 'wendao-changsheng-release-v1';
let createGender='女', createAppearance=1, createOutfit=1, createOrigin='家族子弟', audioContext=null, currentFeature=null, currentRootView='root', currentCaveView='dwelling', currentSectView='home', currentArtsView='sect', currentExperienceView='sword', currentMarketTab='market', suppressSave=false,mainlineStoryStep=0,mainlineStoryStage=null;
let currentSpiritView='realm',activeHeartTrial=null,currentWardrobeView='outfits',currentCharacterView='equipment',currentStudyView='codex';
const marketFloors={market:1,scripture:1,reputation:1};
let marketTreasurePage=1;
const marketFloorLevels=[0,20,40,60,80];
const chineseFloorNames=['一','二','三','四','五'];
let marketFloorNoticeTimer=null,lastScriptureDayKey='',marketPurchaseOffer=null,marketPurchaseQuantity=1,currentMailId=null;
let bgmTheme=null,battle=null,battleTimer=null,swordTrialAdvanceTimer=null,swordTrialCountdownTimer=null,pauseStartedAt=null,sessionOnline=false,confirmResolver=null,prologueTimer=null,offlineRewardTimer=null,tribulationPillUseCount=0,tribulationLocked=false,tribulationTimers=[];
let itemModalKey=null,itemModalQuantity=1,sellItemKey=null,sellItemQuantity=1;
let identityChangeItemKey=null;
let swordPathChoiceConfirming=false;
let clockEpoch=Date.now(),clockPerf=performance.now(),trustedClockReady=location.protocol==='file:',clockSyncPromise=null;

function setClockAnchor(epoch,trusted=false){clockEpoch=epoch;clockPerf=performance.now();trustedClockReady=trusted||location.protocol==='file:'}
function gameNow(){return Math.floor(clockEpoch+(performance.now()-clockPerf))}
function appearanceAsset(gender,appearance,outfit){
  if(qStyleMode){
    const g=gender==='男'?'male':'female';
    const selectedOutfit=Math.max(1,Math.min(8,Number(outfit)||1));
    const selectedAppearance=Math.max(1,Math.min(3,Number(appearance)||1));
    const asset=selectedAppearance===1
      ? `assets/qstyle-v2/${g}-outfit-${selectedOutfit}.png`
      : `assets/qstyle-v2/${g}-appearance-${selectedAppearance}-outfit-${selectedOutfit}.png`;
    return `${asset}?v=20260829b`;
  }
  const g=gender==='男'?'male':'female';
  const version=appearance===2?'v2':'v1';
  return `assets/${g}-appearance-${appearance||1}-outfit-${outfit||1}-${version}.png`;
}
function characterAsset(){return appearanceAsset(state.gender,state.appearance||1,state.outfit||1)}
function titleUnlocked(id){
  if(titleCatalog.find(title=>title.id===id)?.alwaysUnlocked)return true;
  return id==='nine-locks'?(state.mainlineCleared||0)>=18:(state.unlockedTitles||[]).includes(id);
}
function allBookArtsMastered(){
  const requiredBooks=techniqueBooks.filter(book=>!book.exclusiveMarket);if(!requiredBooks.length)return false;
  const levels=new Map((state.learnedArts||[]).filter(art=>art.source==='book').map(art=>[art.id,Math.max(0,Number(art.level)||0)]));
  return requiredBooks.every(book=>levels.get(book.id)>=10);
}
function syncTitleUnlocks(){
  state.unlockedTitles=Array.isArray(state.unlockedTitles)?state.unlockedTitles:[];
  titleCatalog.filter(title=>title.alwaysUnlocked).forEach(title=>{if(!state.unlockedTitles.includes(title.id))state.unlockedTitles.push(title.id)});
  if((state.mainlineCleared||0)>=18&&!state.unlockedTitles.includes('nine-locks'))state.unlockedTitles.push('nine-locks');
  if(allBookArtsMastered()&&!state.unlockedTitles.includes('all-arts-master'))state.unlockedTitles.push('all-arts-master');
  syncAscensionTitleUnlock();
  if(state.equippedTitle!=='none'&&!titleUnlocked(state.equippedTitle))state.equippedTitle='none';
}
function unlockAscensionTitle(paths){
  const key=[...new Set(paths)].sort().join('-'),map={qi:'qi-ascension',sword:'sword-ascension',body:'body-ascension','qi-sword':'qi-sword-ascension','body-qi':'qi-body-ascension','body-sword':'sword-body-ascension','body-qi-sword':'three-paths-ascension'},id=map[key];
  if(!id)return null;
  state.unlockedTitles=Array.isArray(state.unlockedTitles)?state.unlockedTitles:[];
  if(!state.unlockedTitles.includes(id))state.unlockedTitles.push(id);
  return id;
}
function ascensionTitlePaths(){return [['qi','spiritLevel'],['sword','swordLevel'],['body','bodyLevel']].filter(([,level])=>(state[level]||0)>=80).map(([path])=>path)}
function syncAscensionTitleUnlock(){
  const a=state.ascension;if(!a?.ascended)return null;
  let id=a.titleId;if(!id){id=unlockAscensionTitle(ascensionTitlePaths());if(id)a.titleId=id}
  else if(!(state.unlockedTitles||[]).includes(id))state.unlockedTitles.push(id);
  return id;
}
function applyCharacterVisual(){
  normalizeWardrobeOutfit();
  normalizeTrueFormOwnership();
  const hero=$('#heroCharacter');if(hero)hero.src=characterAsset();
  const outfit=wardrobeOutfits[state.gender]?.find(item=>item.id===(Number(state.outfit)||1));
  const heroArt=$('#heroArt');if(heroArt)heroArt.dataset.outfitEffect=outfit?.effect||'none';
  const form=$('#heroTrueForm');if(!form)return;
  const selected=trueFormCatalog.find(item=>item.id===(state.trueForm||'none'))||trueFormCatalog[0];
  if(state.trueForm!==selected.id)state.trueForm=selected.id;
  if(heroArt)heroArt.dataset.trueForm=selected?.id||'none';
  form.className=`hero-true-form true-form-${selected?.id||'none'}`;
  if(selected?.image){form.src=selected.image;form.alt=selected.name;form.classList.remove('hidden')}
  else{form.removeAttribute('src');form.alt='';form.classList.add('hidden')}
  const formFront=$('#heroTrueFormFront');
  const frontLayers={
    'wanjie-demon':{image:'assets/qstyle-v2/true-form-wanjie-demon-hands-v2.png',alt:'萬劫魔尊前景雙手'},
  };
  const frontLayer=frontLayers[selected?.id];
  if(formFront&&frontLayer){formFront.className=`hero-true-form-front front-${selected.id}`;formFront.src=frontLayer.image;formFront.alt=frontLayer.alt;formFront.classList.remove('hidden')}
  else if(formFront){formFront.removeAttribute('src');formFront.alt='';formFront.className='hero-true-form-front hidden'}
  syncTitleUnlocks();
  const title=$('#heroTitle'),equipped=titleCatalog.find(item=>item.id===state.equippedTitle),showTitle=title&&equipped&&titleUnlocked(equipped.id)&&!selected?.hideTitle;
  if(title&&showTitle){title.src=equipped.image;title.alt=equipped.name;title.classList.remove('hidden')}
  else if(title){title.removeAttribute('src');title.alt='';title.classList.add('hidden')}
}
async function syncTrustedTime(){
  if(location.protocol==='file:'){setClockAnchor(Date.now(),true);return true}
  if(clockSyncPromise)return clockSyncPromise;
  clockSyncPromise=(async()=>{
    try{
      const started=performance.now(),url=`${location.origin}${location.pathname}?clock=${Math.random().toString(36).slice(2)}`;
      const response=await fetch(url,{method:'HEAD',cache:'no-store'}),received=performance.now(),header=response.headers.get('date'),serverTime=Date.parse(header||'');
      if(!response.ok||!Number.isFinite(serverTime))throw new Error('server time unavailable');
      const estimated=serverTime+Math.min(1000,Math.max(0,(received-started)/2)),previous=state.lastTrustedTime||0;
      if(previous&&estimated+120000<previous)throw new Error('server time moved backwards');
      const trusted=Math.max(estimated,previous);setClockAnchor(trusted,true);state.lastTrustedTime=trusted;return true;
    }catch{return false}finally{clockSyncPromise=null}
  })();
  return clockSyncPromise;
}
function requireTrustedTime(){if(trustedClockReady)return true;toast('尚未取得可信時間，請確認網路後重新進入遊戲');return false}

function toBigInt(value){if(typeof value==='bigint')return value;if(typeof value==='number')return Number.isFinite(value)?BigInt(Math.max(0,Math.floor(value))):0n;if(typeof value==='string'&&/^\d+$/.test(value))return BigInt(value);return 0n}
function curvedRequirement(start,end,level,power){const progress=Math.pow(Math.max(0,Math.min(228,level))/228,power),value=start*Math.pow(end/start,progress);return BigInt(Math.round(value))}
function req(level){return curvedRequirement(1200,2_000_000_000_000_000,level,.839)}
function swordReq(level){return curvedRequirement(18_000,9_000_000_000_000_000,level,1.05)}
function formatBigInteger(value){const sign=value<0n?'-':'',amount=value<0n?-value:value;if(amount<10000n)return sign+amount.toString();const units=['','萬','億','兆','京','垓','秭','穰','溝','澗','正','載'],parts=[];let rest=amount,index=0;while(rest>0n&&index<units.length){const group=rest%10000n;if(group)parts.unshift(`${group}${units[index]}`);rest/=10000n;index++}if(rest===0n)return sign+parts.slice(0,3).join('');const digits=amount.toString();return `${sign}${digits[0]}.${digits.slice(1,4)}e${digits.length-1}`}
function formatLargeNumber(value){
  if(typeof value==='bigint')return formatBigInteger(value);
  if(!Number.isFinite(value))return '∞';
  const rounded=Math.round(value),sign=rounded<0?'-':'',amount=Math.abs(rounded);
  if(amount<10000)return sign+amount;
  const yi=Math.floor(amount/100000000),wan=Math.floor(amount%100000000/10000),rest=amount%10000,parts=[];
  if(yi)parts.push(`${yi}億`);if(wan||yi&&rest)parts.push(`${wan}萬`);if(rest)parts.push(`${rest}`);
  return sign+parts.join('');
}
function formatCaveAmount(value){const amount=Math.max(0,Number(value)||0),units=['','萬','億','兆','京','垓','秭','穰','溝','澗','正','載'];if(amount<10000)return Math.floor(amount).toLocaleString();const index=Math.min(units.length-1,Math.floor(Math.log10(amount)/4)),scaled=amount/Math.pow(10000,index),digits=scaled>=100?0:scaled>=10?1:2;return `${scaled.toFixed(digits).replace(/\.0+$|(?<=\.[0-9])0+$/,'')}${units[index]}`}
function clampSelectableQuantity(value,minimum,maximum){const min=Math.max(0,Math.floor(Number(minimum)||0)),max=Math.max(min,Math.floor(Number(maximum)||0)),parsed=Math.floor(Number(String(value).replace(/[^0-9]/g,'')));return Math.max(min,Math.min(max,Number.isFinite(parsed)?parsed:min))}
function setQuantityInputValue(id,value){const input=$('#'+id);if(input&&input.value!==String(value))input.value=String(value)}
function bindQuantityInput(id,{minimum=1,maximum,onChange,refresh}){const input=$('#'+id);if(!input)return;const limits=()=>({min:typeof minimum==='function'?minimum():minimum,max:typeof maximum==='function'?maximum():maximum});const commit=()=>{const {min,max}=limits(),value=clampSelectableQuantity(input.value,min,max);onChange(value);refresh()};input.addEventListener('input',()=>{input.value=input.value.replace(/[^0-9]/g,'');if(input.value==='')return;commit()});input.addEventListener('blur',commit);input.addEventListener('change',commit);input.addEventListener('focus',()=>input.select());input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();input.blur()}})}
function legacySpiritAttributeGain(newLevel){const curve=1+Math.floor((Math.max(1,newLevel)-1)/20);return {trueQi:2+curve,rootBone:1+Math.ceil(curve/2),agility:newLevel%3===0?1+Math.floor(curve/6):0,physique:newLevel%5===0?1+Math.floor(curve/7):0,comprehension:newLevel%10===0?1+Math.floor(newLevel/50):0}}
function legacyBodyAttributeGain(newLevel){const curve=1+Math.floor((Math.max(1,newLevel)-1)/20);return {rootBone:2+curve,physique:2+curve,trueQi:newLevel%4===0?1+Math.floor(curve/5):0,agility:newLevel%5===0?1+Math.floor(curve/6):0}}
function growthStage(newLevel){return 1+Math.floor(Math.floor(Math.max(0,newLevel)/10)/4)}
function spiritAttributeGain(newLevel) {
  const stage=growthStage(newLevel),realm=Math.floor(newLevel/10),breakthrough=newLevel%10===0;
  return {trueQi:2+stage,rootBone:1+Math.ceil(stage/2),agility:newLevel%3===0?stage:0,spiritualPower:(newLevel%3===0?stage:0)+(breakthrough?2*stage:0),physique:newLevel%5===0?Math.ceil(stage/2):0,comprehension:breakthrough?1+Math.floor(realm/5):0};
}
function bodyAttributeGain(newLevel) {
  const stage=growthStage(newLevel),breakthrough=newLevel%10===0;
  return {rootBone:2+stage+(breakthrough?2*stage:0),physique:2+stage+(breakthrough?2*stage:0),trueQi:newLevel%4===0?Math.ceil(stage/2):0,agility:newLevel%5===0?Math.ceil(stage/2):0};
}
function swordAttributeGain(newLevel) {
  const stage=growthStage(newLevel),breakthrough=newLevel%10===0;
  return {agility:1+Math.ceil(stage/2)+(breakthrough?2*stage:0),trueQi:newLevel%2===0?stage:0,spiritualPower:(newLevel%3===0?stage:0)+(breakthrough?2*stage:0)};
}
function applyAttributeGain(gain){Object.entries(gain).forEach(([key,value])=>state[key]=(state[key]||0)+value)}
function sumGrowth(total,gain,factor=1){Object.entries(gain).forEach(([key,value])=>total[key]=(total[key]||0)+value*factor);return total}
function cumulativeGrowth(spiritLevel,bodyLevel=0,swordLevel=0){const total={rootBone:0,trueQi:0,physique:0,agility:0,spiritualPower:0,comprehension:0};for(let i=1;i<=spiritLevel;i++)sumGrowth(total,spiritAttributeGain(i));for(let i=1;i<=bodyLevel;i++)sumGrowth(total,bodyAttributeGain(i));for(let i=1;i<=swordLevel;i++)sumGrowth(total,swordAttributeGain(i));return total}
function legacyCumulativeGrowth(spiritLevel,bodyLevel=0){const total={rootBone:0,trueQi:0,physique:0,agility:0,spiritualPower:0,comprehension:0};for(let i=1;i<=spiritLevel;i++)sumGrowth(total,legacySpiritAttributeGain(i));for(let i=1;i<=bodyLevel;i++)sumGrowth(total,legacyBodyAttributeGain(i));return total}
function migrateAttributeGrowth(version){
  if(version>=3)return;
  if(version===2){for(let level=1;level<=(state.spiritLevel||0);level++)state.spiritualPower=(state.spiritualPower||0)+(spiritAttributeGain(level).spiritualPower||0);state.attributeGrowthVersion=3;return}
  // 舊版與未標記版本的存檔都已套用過原本的境界成長；先扣回再換算，避免重複加點。
  if(version<=1)sumGrowth(state,legacyCumulativeGrowth(state.spiritLevel||0,state.bodyLevel||0),-1);
  sumGrowth(state,cumulativeGrowth(state.spiritLevel,state.bodyLevel,state.swordLevel||0));
  ['rootBone','trueQi','physique','agility','spiritualPower','comprehension','fortune'].forEach(key=>state[key]=Math.max(0,Math.round(state[key]||0)));
  state.attributeGrowthVersion=3;
}
function normalizeSwordPath(){
  const version=Math.max(0,Math.floor(state.swordPathVersion||0));
  if(!swordEmbryos[state.swordEmbryo])state.swordEmbryo='';
  if(!state.swordEmbryo)state.swordName='';else state.swordName=String(state.swordName||'無名靈劍').trim().slice(0,12)||'無名靈劍';
  state.swordNurtureLevel=Math.max(0,Math.min(swordRealms.length,Math.floor(state.swordNurtureLevel||0)));state.swordIntent=Math.max(0,Math.floor(state.swordIntent||0));state.swordInsight=Math.max(0,Math.floor(state.swordInsight||0));state.swordTrialWins=Math.max(0,Math.min(swordTrialMaxStage,Math.floor(state.swordTrialWins||0)));
  if(version<4)state.swordTrialWins=Math.max(state.swordTrialWins,Math.min(swordTrialMaxStage,Math.max(0,Math.floor(state.swordLevel||0))));
  if(!swordIntents[state.swordIntentType])state.swordIntentType='';
  const embryoMoves=swordTechniquesForEmbryo(state.swordEmbryo),saved=Array.isArray(state.swordMoves)?state.swordMoves:[],allowed=[...startingTechniques,...bodyTechniqueCatalog,...embryoMoves,...learnedSectSkills()].filter(combatTechniqueAvailable).map(move=>move.id),valid=[...new Set(saved.filter(id=>allowed.includes(id)))];if(!valid.length)valid.push(state.firstPath==='body'?'body-origin':'origin');if(state.swordEmbryo)for(const id of embryoMoves.map(move=>move.id)){if(valid.length>=2)break;if(!valid.includes(id))valid.push(id)}state.swordMoves=valid.slice(0,2);
  state.swordPathMarks=Array.isArray(state.swordPathMarks)?state.swordPathMarks.filter(mark=>mark&&swordPaths[mark.path]&&mark.path!=='unmarked'&&Number.isInteger(mark.level)):[];state.swordTrialChoices=state.swordTrialChoices&&typeof state.swordTrialChoices==='object'?state.swordTrialChoices:{};state.swordTrialPendingChoice=Math.max(0,Math.floor(state.swordTrialPendingChoice||0));state.swordPathVersion=4;
}
function activeBodyInjury(){return bodyInjuries[state.bodyInjury]&&(state.bodyInjuryUntil||0)>gameNow()?state.bodyInjury:''}
function refreshBodyState(){
  const now=gameNow(),recoveryMs=60000;state.bodyStamina=Math.max(0,Number(state.bodyStamina)||0);if(!state.bodyStaminaUpdatedAt)state.bodyStaminaUpdatedAt=now;const recovered=Math.floor(Math.max(0,now-state.bodyStaminaUpdatedAt)/recoveryMs);if(recovered>0&&state.bodyStamina<100){state.bodyStamina=Math.min(100,state.bodyStamina+recovered);state.bodyStaminaUpdatedAt=state.bodyStamina>=100?now:state.bodyStaminaUpdatedAt+recovered*recoveryMs}else if(state.bodyStamina>=100)state.bodyStaminaUpdatedAt=now;
  state.bodyTrainingLoad=Math.max(0,Math.min(100,Number(state.bodyTrainingLoad)||0));if(!state.bodyTrainingLoadUpdatedAt)state.bodyTrainingLoadUpdatedAt=now;const loadRecovered=Math.floor(Math.max(0,now-state.bodyTrainingLoadUpdatedAt)/recoveryMs);if(loadRecovered>0&&state.bodyTrainingLoad>0){state.bodyTrainingLoad=Math.max(0,state.bodyTrainingLoad-loadRecovered);state.bodyTrainingLoadUpdatedAt=state.bodyTrainingLoad<=0?now:state.bodyTrainingLoadUpdatedAt+loadRecovered*recoveryMs}else if(state.bodyTrainingLoad<=0)state.bodyTrainingLoadUpdatedAt=now;
  if(state.bodyInjury&&!activeBodyInjury()){state.bodyInjury='';state.bodyInjuryUntil=0}return state.bodyStamina;
}
function normalizeBodyPath(){const stamina=Number(state.bodyStamina),now=gameNow();state.bodyStamina=Number.isFinite(stamina)?Math.max(0,stamina):100;state.bodyStaminaUpdatedAt=Number(state.bodyStaminaUpdatedAt)||now;state.bodyTemper=Math.max(0,Math.floor(state.bodyTemper||0));state.bodyTrainingLoad=Math.max(0,Math.min(100,Number(state.bodyTrainingLoad)||0));state.bodyTrainingLoadUpdatedAt=Number(state.bodyTrainingLoadUpdatedAt)||now;if(!bodyInjuries[state.bodyInjury]){state.bodyInjury='';state.bodyInjuryUntil=0}state.bodyFoundations=state.bodyFoundations&&typeof state.bodyFoundations==='object'?{bone:Math.max(0,Number(state.bodyFoundations.bone)||0),blood:Math.max(0,Number(state.bodyFoundations.blood)||0),organs:Math.max(0,Number(state.bodyFoundations.organs)||0)}:{bone:0,blood:0,organs:0};if(!Object.values(state.bodyFoundations).some(Boolean)&&state.bodyTemper>0){const migrated=Math.min(1,state.bodyTemper/bodyTemperNeed())*bodySessionNeed();state.bodyFoundations={bone:migrated,blood:migrated,organs:migrated}}const savedCharges=Number(state.bodyTrainingCharges);state.bodyTrainingCharges=Math.max(0,Math.min(14,Number.isFinite(savedCharges)?Math.floor(savedCharges):2));state.bodyTrainingChargeUpdatedAt=Number(state.bodyTrainingChargeUpdatedAt)||now;state.bodyTrialFailures=state.bodyTrialFailures&&typeof state.bodyTrialFailures==='object'?state.bodyTrialFailures:{};state.bodyTrainingSystemVersion=3;refreshBodyState();refreshBodyTrainingCharges();syncBodyTemperFromFoundations()}
function normalizeEncounterSystem(){state.encounterQueue=Array.isArray(state.encounterQueue)?state.encounterQueue.filter(event=>event&&event.id&&Array.isArray(event.choices)).slice(0,12):[];state.encounterHistory=Array.isArray(state.encounterHistory)?state.encounterHistory.filter(Boolean).slice(0,60):[];state.encounterMilestones=state.encounterMilestones&&typeof state.encounterMilestones==='object'?state.encounterMilestones:{};state.encounterActiveMs=Math.max(0,Number(state.encounterActiveMs)||0);state.encounterNextMs=Math.max(1800000,Number(state.encounterNextMs)||2700000);state.encounterSerial=Math.max(0,Math.floor(state.encounterSerial||0));state.encounterVersion=1;partnerNormalize()}
function normalizeIndependentPaths(){if(state.swordPathOpened==null)state.swordPathOpened=!!state.name;if(state.bodyPathOpened==null)state.bodyPathOpened=!!state.name;state.free=toBigInt(state.free);state.swordEssence=toBigInt(state.swordEssence);state.totalEarned=toBigInt(state.totalEarned)}
function normalizeFirstPath(){
  if(!['spirit','sword','body'].includes(state.firstPath))state.firstPath=state.cultivationAwakened?'spirit':'';
  if(state.spiritPathOpened==null)state.spiritPathOpened=!!state.cultivationAwakened;
  if(state.firstPath==='spirit')state.spiritPathOpened=true;
  if(state.firstPath==='sword')state.swordPathOpened=true;
  if(state.firstPath==='body')state.bodyPathOpened=true;
  if(!['spirit','sword','body'].includes(state.activePath)||!pathOpened(state.activePath))state.activePath=state.firstPath;
  if(!state.spiritPathOpened)state.caveCultivationEnabled=false;
  state.tutorialCompleted=!!(state.tutorialCompleted||state.cultivationAwakened);
}
const qiCycles={
  small:{name:'小周天',seal:'周',description:'專注吐納，修為效率 +8%。',rate:.08,mark:'歸元印'},
  origin:{name:'靈元周天',seal:'元',description:'修為效率 +4%；練氣道場元息 +6%，兼修時折半。',rate:.04,mark:'太玄印'},
  still:{name:'定息周天',seal:'定',description:'修為效率 +2%；渡劫成功率 +5%。',rate:.02,mark:'不動印'}
};
function normalizeQiPath(){if(!qiCycles[state.qiCycleMode])state.qiCycleMode='small';state.qiFoundationMarks=state.qiFoundationMarks&&typeof state.qiFoundationMarks==='object'?{small:Math.max(0,Math.floor(state.qiFoundationMarks.small||0)),origin:Math.max(0,Math.floor(state.qiFoundationMarks.origin||0)),still:Math.max(0,Math.floor(state.qiFoundationMarks.still||0))}:{small:0,origin:0,still:0};state.qiInsightCharges=Math.max(0,Math.min(3,Math.floor(Number(state.qiInsightCharges)||0)));state.qiTribulationFocus=Math.max(0,Math.min(6,Math.floor(Number(state.qiTribulationFocus)||0)));state.qiHeartTrials=state.qiHeartTrials&&typeof state.qiHeartTrials==='object'?state.qiHeartTrials:{};state.qiHeartTraits=state.qiHeartTraits&&typeof state.qiHeartTraits==='object'?{guard:Math.max(0,Math.min(3,Math.floor(state.qiHeartTraits.guard||0))),benevolent:Math.max(0,Math.min(3,Math.floor(state.qiHeartTraits.benevolent||0))),free:Math.max(0,Math.min(3,Math.floor(state.qiHeartTraits.free||0)))}:{guard:0,benevolent:0,free:0};state.qiInsightDay=String(state.qiInsightDay||'');state.qiPathSystemVersion=1;refreshQiInsights()}
function refreshQiInsights(){const today=dateKey()||new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei'}).format(new Date());if(state.qiInsightDay!==today){state.qiInsightDay=today;state.qiInsightCharges=3}return state.qiInsightCharges}
function qiRateMultiplier(){const cycle=qiCycles[state.qiCycleMode]||qiCycles.small,marks=Math.min(8,state.qiFoundationMarks?.small||0);return 1+cycle.rate+marks*.0075}
function qiTrueQiMultiplier(){const marks=Math.min(6,state.qiFoundationMarks?.origin||0),base=state.qiCycleMode==='origin'?.06:0,full=base+marks*.01;return 1+full*(state.activePath==='spirit'?1:.5)}
function qiTribulationBonus(includeFocus=true){return (state.qiCycleMode==='still'?5:0)+Math.min(8,state.qiFoundationMarks?.still||0)+(includeFocus?state.qiTribulationFocus||0:0)}
function recordQiFoundationMark(){const key=state.qiCycleMode||'small';state.qiFoundationMarks[key]=(state.qiFoundationMarks[key]||0)+1}
const cultivationPathMeta={
  spirit:{name:'練氣',realm:'聽息一層',difficulty:'入門較易',resource:'修為',description:'吐納天地元息，以門派術法與功法拓展戰術。',scene:'assets/qstyle-v2/main-bg.png'},
  sword:{name:'淬劍',realm:'啟鋒一層',difficulty:'修途艱深',resource:'劍元',description:'養成本命劍，闖試劍境、悟劍意並凝聚道印。',scene:'assets/qstyle-v2/main-bg-sword-v2.png',mobileScene:'assets/qstyle-v2/main-bg-sword-mobile-v2.png'},
  body:{name:'煉體',realm:'塵軀一層',difficulty:'最為艱難',resource:'淬鍊度',description:'以體力、食物與傷勢磨煉肉身，以身為兵。',scene:'assets/qstyle-v2/main-bg-body-v2.png',mobileScene:'assets/qstyle-v2/main-bg-body-mobile-v2.png'}
};
const cultivationSceneMedia=window.matchMedia('(max-width:620px)');
function cultivationScene(path){const meta=cultivationPathMeta[path]||cultivationPathMeta.spirit;return cultivationSceneMedia.matches&&meta.mobileScene?meta.mobileScene:meta.scene}
function pathOpened(path){return path==='spirit'?!!state.spiritPathOpened:path==='sword'?!!state.swordPathOpened:!!state.bodyPathOpened}
function pathRealmName(path){return path==='spirit'?realmName(state.spiritLevel,spiritRealms):path==='sword'?realmName(state.swordLevel||0,swordRealms):realmName(state.bodyLevel,bodyRealms)}
function pathResourceLine(path){if(path==='spirit')return `修為 ${formatLargeNumber(state.free)} / ${formatLargeNumber(req(state.spiritLevel))}`;if(path==='sword')return `劍元 ${formatLargeNumber(state.swordEssence)} / ${formatLargeNumber(swordReq(state.swordLevel||0))}`;refreshBodyTrainingCharges();return `體力 ${Math.floor(state.bodyStamina)} / 100・鍛體時機 ${state.bodyTrainingCharges} / 14`}
function primaryPathAction(){const path=state.activePath||state.firstPath||'spirit';if(path==='spirit')return openPrimarySpiritView();if(path==='sword'){if(!state.swordEmbryo)return openPrimarySwordView('sword');return upgrade('sword')}openPrimaryBodyView(bodyFoundationsReady()?'body':'training')}
function renderPrimarySanctum(){
  if(!state.cultivationAwakened||!state.firstPath)return;
  const path=state.activePath||state.firstPath,screen=$('#gameScreen'),scene=$('.scene-bg'),buttons={spirit:$('#spiritUp'),sword:$('#swordUp'),body:$('#bodyUp')};screen.dataset.firstPath=path;scene.src=cultivationScene(path);scene.alt=`${cultivationPathMeta[path].name}修練道場`;
  const groups={spirit:$('#spiritPathActions'),sword:$('#swordPathActions'),body:$('#bodyPathActions')};Object.entries(groups).forEach(([key,group])=>group.classList.toggle('hidden',key!==path));
  Object.entries(buttons).forEach(([key,button])=>button.classList.toggle('primary-path-button',key===path));
  $$('.body-primary-menu').forEach(button=>button.classList.toggle('body-primary-button',path==='body'));
  $$('.sword-primary-menu').forEach(button=>button.classList.toggle('sword-primary-button',path==='sword'));
  $$('.spirit-primary-menu').forEach(button=>button.classList.toggle('spirit-primary-button',path==='spirit'));
  const resourceLabel=$('.efficiency>div:first-child small'),rateLabel=$('.efficiency>div:nth-of-type(2) small');
  if(path==='spirit'){resourceLabel.textContent='當前修為';$('#totalQi').textContent=formatLargeNumber(state.free);rateLabel.textContent='修煉效率';$('#rateText').textContent=`${formatLargeNumber(rate())} / 5秒`}
  else if(path==='sword'){resourceLabel.textContent='當前劍元';$('#totalQi').textContent=formatLargeNumber(state.swordEssence);rateLabel.textContent='凝劍效率';$('#rateText').textContent=`${formatLargeNumber(swordEssenceRate())} / 5秒`}
  else{refreshBodyState();refreshBodyTrainingCharges();resourceLabel.textContent='鍛體時機';$('#totalQi').textContent=`${state.bodyTrainingCharges} / 14`;rateLabel.textContent='肉身狀態';$('#rateText').textContent=`體力 ${Math.floor(state.bodyStamina)} / 100`}
}
function qiFoundationSummary(){const marks=state.qiFoundationMarks||{};return `歸元印 ${marks.small||0}・太玄印 ${marks.origin||0}・不動印 ${marks.still||0}`}
function qiEtaText(cost=req(state.spiritLevel)){const missing=cost>state.free?cost-state.free:0n;if(missing<=0n)return '修為已足，可立即突破';const ticks=(missing+BigInt(rate())-1n)/BigInt(rate()),seconds=ticks*5n,day=86400n,year=day*365n;if(seconds>=year)return `預計 ${seconds/year} 年 ${seconds%year/day} 天`;if(seconds>=day)return `預計 ${seconds/day} 天 ${seconds%day/3600n} 小時`;if(seconds>=3600n)return `預計 ${seconds/3600n} 小時 ${seconds%3600n/60n} 分`;return `預計 ${Math.max(1,Number(seconds/60n))} 分鐘`}
function qiGainPreview(){const labels={trueQi:'元息',rootBone:'命骨',physique:'玄軀',agility:'游影',spiritualPower:'銳識',comprehension:'道悟'},gain=spiritAttributeGain(state.spiritLevel+1);return Object.entries(gain).filter(([,value])=>value>0).map(([key,value])=>`${labels[key]} +${value}`).join('・')}
function qiEfficiencyBreakdown(){const cycle=Math.round((qiCycles[state.qiCycleMode]?.rate||0)*100),marks=Math.min(8,state.qiFoundationMarks?.small||0)*.75,cave=Math.round(caveCultivationBonus()*100),buff=(buffActive('practiceBuff')?400:0)+(buffActive('transmissionBuff')?700:0);return `基礎 ${formatLargeNumber(baseRate())}／5秒・${qiCycles[state.qiCycleMode].name} +${cycle}%・歸元印 +${marks.toFixed(2).replace(/\.00$/,'')}%・洞府 +${cave}%${buff?`・限時加成 +${buff}%`:''}`}
function qiCycleActualText(id){const marks=state.qiFoundationMarks||{};if(id==='small')return `目前修為效率 +${8+Math.min(8,marks.small||0)*.75}%（上限 +14%）`;if(id==='origin'){const value=6+Math.min(6,marks.origin||0);return `目前元息：主修 +${value}%・兼修 +${value/2}%（主修上限 +12%）`}return `目前渡劫 +${5+Math.min(8,marks.still||0)}%（含不動印，上限 +13%）`}
function qiFoundationCards(){const marks=state.qiFoundationMarks||{},small=Math.min(8,marks.small||0),origin=Math.min(6,marks.origin||0),still=Math.min(8,marks.still||0);return `<div class="qi-foundation-grid"><article><i>歸</i><div><b>歸元印・${marks.small||0} 枚</b><small>每枚使修為效率 +0.75%，8枚達上限。</small><strong>目前 +${small*.75}%／上限 +6%</strong></div></article><article><i>玄</i><div><b>太玄印・${marks.origin||0} 枚</b><small>每枚使元息 +1%；切換淬劍或煉體道場時每枚只生效 +0.5%，6枚達上限。</small><strong>目前主修 +${origin}%・兼修 +${origin*.5}%／主修上限 +6%</strong></div></article><article><i>定</i><div><b>不動印・${marks.still||0} 枚</b><small>每枚使所有練氣雷劫成功率 +1%，8枚達上限。</small><strong>目前 +${still}%／上限 +8%</strong></div></article></div>`}
const qiHeartMilestones=[30,60,90];
const qiHeartQuestions=[
  {text:'山門遭劫，你足以獨自離去，身後眾人卻未必能活。',options:[['先穩住自身道基，再尋轉機','guard','balance'],['留下護持眾人，共擔此劫','benevolent','righteous'],['奪取劫中機緣，以力量破局','free','evil']]},
  {text:'故人身負惡名求你相助，而追索者所言亦非虛妄。',options:[['守住承諾，只做自己應做之事','guard','balance'],['先救其性命，再查明因果','benevolent','righteous'],['因果由人書寫，助對自己有利的一方','free','evil']]},
  {text:'大道機緣僅容一人取得，身旁同道亦已走到最後一步。',options:[['不爭不讓，以本心承受結果','guard','balance'],['分出所得，不使同行者道途斷絕','benevolent','righteous'],['大道獨行，機緣自然由強者所得','free','evil']]}
];
const qiHeartNames={guard:'守一',benevolent:'濟世',free:'逍遙'},qiHeartAspectNames={righteous:'清明',evil:'業火',balance:'兩儀',shaken:'動搖'};
function qiHeartAspect(){const righteous=Math.max(0,state.righteousness||0),evil=Math.max(0,state.evilQi||0);if(righteous>=evil*1.25&&righteous>evil+1)return 'righteous';if(evil>=righteous*1.25&&evil>righteous+1)return 'evil';return 'balance'}
function pendingQiHeartMilestone(){const next=state.spiritLevel+1;return qiHeartMilestones.includes(next)&&!state.qiHeartTrials[String(next)]?next:0}
function qiHeartTraitEffects(){const traits=state.qiHeartTraits||{};return `守一 ${traits.guard||0}/3：渡劫失敗少損失 ${(traits.guard||0)*5}%・濟世 ${traits.benevolent||0}/3：因緣物資 +${(traits.benevolent||0)*5}%・逍遙 ${traits.free||0}/3：每日首次資源靈機 +${(traits.free||0)*20}%`}
function qiHeartStatusHtml(){const pending=pendingQiHeartMilestone(),completed=Object.values(state.qiHeartTrials||{});return `<section class="qi-heart-status"><div><small>道心映照</small><h3>問心境</h3><p>${completed.length?completed.map(item=>`${qiHeartAspectNames[item.aspect]}・${qiHeartNames[item.nature]}心`).join('　'):'尚未留下問心紀錄'}</p></div>${pending?`<button id="enterQiHeartTrial" class="jade-button">心關已現・進入問心境</button>`:`<span>${state.spiritLevel>=89?'凡間三重問心已歷盡':`下一次問心：${realmName(qiHeartMilestones.find(level=>level>state.spiritLevel)||90,spiritRealms)}突破前`}</span>`}<em>${qiHeartTraitEffects()}</em></section>`}
function beginQiHeartTrial(){const milestone=pendingQiHeartMilestone();if(!milestone)return toast('目前尚未觸發問心境');activeHeartTrial={milestone,entryAspect:qiHeartAspect(),index:0,answers:[]};renderQiDestination()}
function leaveQiHeartTrial(){activeHeartTrial=null;renderQiDestination()}
function renderQiHeartTrial(inner){const trial=activeHeartTrial,question=qiHeartQuestions[trial.index],aspect=qiHeartAspectNames[trial.entryAspect];inner.innerHTML=`<section class="qi-heart-trial aspect-${trial.entryAspect}"><small>第 ${qiHeartMilestones.indexOf(trial.milestone)+1} 重問心・${aspect}心境</small><h2>${question.text}</h2><p>心相源自你進入此境前累積的正邪經歷，但此刻的答案仍由你決定。</p><div class="qi-heart-options">${question.options.map(([label,nature,alignment],index)=>`<button data-heart-answer="${index}" class="path-${alignment}"><b>${label}</b><small>${qiHeartNames[nature]}之念・${alignment==='righteous'?'正氣 +2':alignment==='evil'?'邪氣 +2':'正邪各 +1'}</small></button>`).join('')}</div><button id="leaveQiHeartTrial" class="text-button">暫離心境</button></section>`;$$('[data-heart-answer]').forEach(button=>button.onclick=()=>answerQiHeartTrial(+button.dataset.heartAnswer));$('#leaveQiHeartTrial').onclick=leaveQiHeartTrial}
function answerQiHeartTrial(index){const trial=activeHeartTrial,answer=qiHeartQuestions[trial?.index]?.options[index];if(!trial||!answer)return;trial.answers.push({nature:answer[1],alignment:answer[2]});trial.index++;if(trial.index<qiHeartQuestions.length)return renderQiDestination();const counts=id=>trial.answers.filter(answer=>answer.nature===id).length,nature=['guard','benevolent','free'].sort((a,b)=>counts(b)-counts(a))[0],alignCounts=id=>trial.answers.filter(answer=>answer.alignment===id).length;let aspect=trial.entryAspect;if(trial.entryAspect==='righteous'&&alignCounts('evil')>=2||trial.entryAspect==='evil'&&alignCounts('righteous')>=2)aspect='shaken';trial.answers.forEach(answer=>{if(answer.alignment==='righteous')state.righteousness+=2;else if(answer.alignment==='evil')state.evilQi+=2;else{state.righteousness++;state.evilQi++}});state.qiHeartTraits[nature]=Math.min(3,(state.qiHeartTraits[nature]||0)+1);state.qiHeartTrials[String(trial.milestone)]={aspect,nature,entryAspect:trial.entryAspect,completedAt:gameNow()};activeHeartTrial=null;toast(`問心已定・${qiHeartAspectNames[aspect]}・${qiHeartNames[nature]}心`);renderQiDestination();render();save()}
function renderQiCultivation(inner,{side=false,view=currentSpiritView}={}){
  if(activeHeartTrial&&!side)return renderQiHeartTrial(inner);
  refreshQiInsights();const cost=req(state.spiritLevel),maxed=state.spiritLevel>=maxSpiritLevel,cycle=qiCycles[state.qiCycleMode];
  const visible=id=>side||view===id?'':' hidden';
  const realm=`<section class="qi-dashboard${visible('realm')}"><div class="qi-orbit"><span>${cycle.seal}</span></div><div class="qi-heading"><small>${side?'兼修練氣':'練氣主修'}・${cycle.name}</small><h2>${realmName(state.spiritLevel,spiritRealms)}</h2><p>修為 ${formatLargeNumber(state.free)} / ${formatLargeNumber(cost)}・每5秒 ${formatLargeNumber(rate())}</p></div><button id="advanceQiRealm" class="jade-button" ${!maxed&&state.free>=cost?'':'disabled'}>${maxed?'凡間練氣已圓滿':pendingQiHeartMilestone()?'先歷問心境':(state.spiritLevel+1)%10===0?'迎接雷劫':'運轉周天突破'}</button></section><section class="qi-detail-grid${visible('realm')}"><article><small>抵達所需時間</small><b>${maxed?'已達凡間上限':qiEtaText(cost)}</b><span>依目前實際效率估算</span></article><article><small>突破屬性預覽</small><b>${maxed?'無後續境界':qiGainPreview()}</b><span>${(state.spiritLevel+1)%10===0?`成功後凝成「${cycle.mark}」`:'小境界不產生道基印記'}</span></article><article class="wide"><small>效率來源</small><b>${qiEfficiencyBreakdown()}</b></article></section><div class="${visible('realm').trim()}">${qiHeartStatusHtml()}</div>`;
  const cycles=`<section class="qi-section${visible('cycle')}"><div class="qi-section-title"><div><small>行氣法門</small><h3>周天運轉</h3></div><span>可隨時調整，不消耗資源</span></div><div class="qi-cycle-grid">${Object.entries(qiCycles).map(([id,item])=>`<button data-qi-cycle="${id}" class="${id===state.qiCycleMode?'active':''}"><i>${item.seal}</i><b>${item.name}</b><small>${item.description}</small><em>以此周天跨越大境界，凝成「${item.mark}」</em><strong>${qiCycleActualText(id)}</strong></button>`).join('')}</div><div class="qi-balance-note">主修練氣享有完整元息收益；切換至淬劍或煉體道場後，元息類周天與太玄印效果減半。修為效率與渡劫效果不因兼修失效。</div></section>`;
  const insight=`<section class="qi-section qi-insight${visible('insight')}"><div class="qi-section-title"><div><small>每日靈機</small><h3>引氣入道</h3></div><strong>${state.qiInsightCharges} / 3</strong></div><p>每日三次；直接資源每次約等於 15 分鐘自然產出，長期仍維持練氣＜淬劍＜煉體的養成難度。</p><div class="qi-insight-actions"><button data-qi-insight="cultivation" ${state.qiInsightCharges?'':'disabled'}><b>納氣歸元</b><small>獲得15分鐘修為</small></button><button data-qi-insight="aura" ${state.qiInsightCharges?'':'disabled'}><b>洗脈凝神</b><small>獲得15分鐘靈氣</small></button><button data-qi-insight="focus" ${state.qiInsightCharges&&state.qiTribulationFocus<6?'':'disabled'}><b>觀脈悟道</b><small>下次雷劫 +2%・可蓄至 +6%</small></button></div><div class="qi-focus-status">凝神加護：下次雷劫 +${state.qiTribulationFocus||0}%${state.qiTribulationFocus>=6?'・已達上限':''}</div></section><section class="qi-foundation qi-foundation-detail${visible('insight')}"><div class="qi-foundation-heading"><div><small>大境界留印</small><h3>道基印記</h3></div><p>${qiFoundationSummary()}</p></div>${qiFoundationCards()}<span>印記超過收益上限後仍會保留總數紀錄，但不再增加數值。</span></section>`;
  inner.innerHTML=realm+cycles+insight;
  if($('#advanceQiRealm'))$('#advanceQiRealm').onclick=()=>upgrade('spirit');if($('#enterQiHeartTrial'))$('#enterQiHeartTrial').onclick=beginQiHeartTrial;$$('[data-qi-cycle]').forEach(button=>button.onclick=()=>chooseQiCycle(button.dataset.qiCycle));$$('[data-qi-insight]').forEach(button=>button.onclick=()=>useQiInsight(button.dataset.qiInsight));
}
function chooseQiCycle(mode){if(!qiCycles[mode]||mode===state.qiCycleMode)return;state.qiCycleMode=mode;toast(`周天已轉為${qiCycles[mode].name}`);renderQiDestination();render();save()}
function useQiInsight(kind){refreshQiInsights();if(state.qiInsightCharges<1)return toast('今日靈機已用盡');if(kind==='focus'&&state.qiTribulationFocus>=6)return toast('凝神加護已達 +6% 上限');const firstResource=state.qiInsightCharges===3&&kind!=='focus',freedom=firstResource?1+Math.min(3,state.qiHeartTraits?.free||0)*.2:1;state.qiInsightCharges--;if(kind==='aura'){const gain=Math.max(1,Math.round(Math.max(1,auraRate())*180*freedom));addAura(gain);toast(`洗脈凝神・靈氣 +${formatLargeNumber(gain)}`)}else if(kind==='focus'){state.qiTribulationFocus=Math.min(6,(state.qiTribulationFocus||0)+2);toast(`觀脈悟道・下次雷劫 +${state.qiTribulationFocus}%`)}else{const gain=BigInt(Math.max(1,Math.round(rate()*180*freedom)));addCultivation(gain,true);toast(`納氣歸元・修為 +${formatLargeNumber(gain)}`)}renderQiDestination();render();save()}
function renderQiDestination(){const inner=$('#experienceInner');if(!inner)return;if(currentFeature==='spiritPrimary')renderQiCultivation(inner,{view:currentSpiritView});else if(currentFeature==='experience')renderQiCultivation(inner,{side:true})}
function renderPrimarySpiritPanel(view=currentSpiritView){currentSpiritView=view;currentFeature='spiritPrimary';setFeaturePanelStandalone(true);const headings={realm:['吐納修為','練氣境界'],cycle:['行氣法門','周天運轉'],insight:['每日靈機','引氣道基']},heading=headings[view]||headings.realm;$('#featureDescription').innerHTML=`<button id="closePrimarySpiritPanel" class="primary-body-return">返回練氣道場</button><section class="primary-body-heading"><small>${heading[0]}</small><h2>${heading[1]}</h2></section><div id="experienceInner"></div>`;$('#closePrimarySpiritPanel').onclick=closePrimarySpiritPanel;renderQiCultivation($('#experienceInner'),{view})}
function openPrimarySpiritView(view='realm'){if(state.activePath!=='spirit')return openExperienceView('spiritSide');$$('.feature-tab').forEach(item=>item.classList.remove('active'));$('#featurePanel').classList.remove('hidden','feature-locked');$('#gameScreen').classList.add('feature-open');renderPrimarySpiritPanel(view)}
function closePrimarySpiritPanel(){currentFeature=null;$('#featurePanel').classList.add('hidden');$('#gameScreen').classList.remove('feature-open');render()}
function renderPrimaryBodyPanel(view='body'){
  currentFeature='bodyPrimary';setFeaturePanelStandalone(true);currentExperienceView=view;const paired=view==='body'||view==='passives';
  $('#featureDescription').innerHTML=`<button id="closePrimaryBodyPanel" class="primary-body-return">返回煉體道場</button>${paired?`<div class="experience-tabs body-primary-tabs"><button data-primary-body-view="body" class="${view==='body'?'active':''}">肉身</button><button data-primary-body-view="passives" class="${view==='passives'?'active':''}">體魄</button></div>`:`<section class="primary-body-heading"><small>煉體主修</small><h2>${view==='training'?'鍛體場':'肉身試煉'}</h2></section>`}<div id="experienceInner"></div>`;
  $('#closePrimaryBodyPanel').onclick=closePrimaryBodyPanel;$$('[data-primary-body-view]').forEach(button=>button.onclick=()=>renderPrimaryBodyPanel(button.dataset.primaryBodyView));renderBodyExperienceView(view,$('#experienceInner'));
}
function closePrimaryBodyPanel(){currentFeature=null;$('#featurePanel').classList.add('hidden');$('#gameScreen').classList.remove('feature-open');render()}
function openPrimaryBodyView(view='body'){
  if(state.activePath!=='body')return openExperienceView(view);$$('.feature-tab').forEach(item=>item.classList.remove('active'));$('#featurePanel').classList.remove('hidden','feature-locked');$('#gameScreen').classList.add('feature-open');renderPrimaryBodyPanel(view);
}
function renderBodyDestination(view){return currentFeature==='bodyPrimary'?renderPrimaryBodyPanel(view):renderExperiencePanel(view)}
function renderPrimarySwordPanel(view='sword'){
  currentFeature='swordPrimary';setFeaturePanelStandalone(true);renderExperiencePanel(view);currentFeature='swordPrimary';
  const description=$('#featureDescription');description.querySelector('.experience-road-tabs')?.remove();description.querySelector('.experience-tabs')?.remove();description.insertAdjacentHTML('afterbegin','<button id="closePrimarySwordPanel" class="primary-body-return">返回淬劍道場</button>');$('#closePrimarySwordPanel').onclick=closePrimarySwordPanel;
}
function openPrimarySwordView(view='sword'){
  if(state.activePath!=='sword')return openExperienceView(view);$$('.feature-tab').forEach(item=>item.classList.remove('active'));$('#featurePanel').classList.remove('hidden','feature-locked');$('#gameScreen').classList.add('feature-open');renderPrimarySwordPanel(view);renderSwordPathSummary();
}
function closePrimarySwordPanel(){currentFeature=null;$('#featurePanel').classList.add('hidden');$('#gameScreen').classList.remove('feature-open');render()}
function renderSwordDestination(view){return currentFeature==='swordPrimary'?renderPrimarySwordPanel(view):renderExperiencePanel(view)}
function bodyTemperNeed(level=state.bodyLevel){return Math.max(100,Math.round(100*Math.pow(level+1,1.2)))}
function bodyRealmIndex(){return Math.min(bodyRealms.length-1,Math.floor(Math.max(0,state.bodyLevel||0)/10))}
function bodyPassiveUnlocked(index){return bodyRealmIndex()>=index}
function bodySessionNeed(level=state.bodyLevel){return [3,3,4,4,4,5,5,6,7][Math.min(8,Math.floor(Math.max(0,level)/10))]}
function taipeiCalendarDay(timestamp){const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(timestamp)),values=Object.fromEntries(parts.map(part=>[part.type,part.value]));return Math.floor(Date.UTC(+values.year,+values.month-1,+values.day)/86400000)}
function refreshBodyTrainingCharges(){const now=gameNow();if(!state.bodyTrainingChargeUpdatedAt)state.bodyTrainingChargeUpdatedAt=now;const days=Math.max(0,taipeiCalendarDay(now)-taipeiCalendarDay(state.bodyTrainingChargeUpdatedAt));if(days>0){state.bodyTrainingCharges=Math.min(14,Math.max(0,Number(state.bodyTrainingCharges)||0)+days*2);state.bodyTrainingChargeUpdatedAt=now}return state.bodyTrainingCharges}
function bodyFoundationsReady(){const need=bodySessionNeed();return ['bone','blood','organs'].every(key=>(state.bodyFoundations?.[key]||0)>=need)}
function syncBodyTemperFromFoundations(){const need=bodySessionNeed(),ratio=Math.min(1,...['bone','blood','organs'].map(key=>(state.bodyFoundations?.[key]||0)/need));state.bodyTemper=Math.floor(bodyTemperNeed()*Math.max(0,ratio))}
function resetBodyFoundations(){state.bodyFoundations={bone:0,blood:0,organs:0};state.bodyTemper=0}
const bodyBreakthroughAreaLevels=[3,6,9,13,17,22,26,30];
function bodyBreakthroughRequirement(nextLevel=state.bodyLevel+1){if(nextLevel%10!==0||nextLevel<10||nextLevel>80)return null;const targetRealm=nextLevel/10,areaLevel=bodyBreakthroughAreaLevels[targetRealm-1],food=Math.floor(areaCapacity(caveAreas.food,areaLevel)*.8),wood=Math.floor(areaCapacity(caveAreas.wood,areaLevel)*.8),iron=Math.floor(areaCapacity(caveAreas.meteorIron,areaLevel)*.8);return {areaLevel,food,wood,iron,targetRealm}}
function bodyBreakthroughMaterialsReady(requirement=bodyBreakthroughRequirement()){return !requirement||state.food>=requirement.food&&state.wood>=requirement.wood&&state.meteorIron>=requirement.iron&&state.foodAreaLevel>=requirement.areaLevel&&state.woodAreaLevel>=requirement.areaLevel&&state.meteorIronAreaLevel>=requirement.areaLevel}
function consumeBodyBreakthroughMaterials(requirement=bodyBreakthroughRequirement()){if(!requirement)return;state.food-=requirement.food;state.wood-=requirement.wood;state.meteorIron-=requirement.iron}
function bodyTrainingOptions(){const realm=Math.floor((state.bodyLevel||0)/10)+1,injuryReduction=(bodyPassiveUnlocked(3)?10:0)+(state.caveBodyEnabled?state.caveBodyLevel*2:0),staminaFactor=activeBodyInjury()==='internal'?1.25:1,load=Math.floor(state.bodyTrainingLoad||0),materialFactor=state.caveBodyEnabled?Math.max(.75,1-state.caveBodyLevel*.03):1,material=value=>Math.max(0,Math.ceil(value*materialFactor));return {
  basic:{name:'穩身承壓',stamina:Math.ceil(10*staminaFactor),food:material(30*realm),wood:material(10*realm),iron:material(5*realm),roots:{bone:1,blood:1,organs:1},risk:0,load:5,description:'循序承壓，筋骨、氣血、臟腑均衡成長；最穩定但不偏重任何根基。'},
  bath:{name:'藥浴開脈',stamina:Math.ceil(20*staminaFactor),food:material(60*realm),wood:material(30*realm),iron:0,roots:{bone:.8,blood:1.2,organs:1.5},risk:0,load:-25,description:'以食物與木材開脈收功，偏重氣血與臟腑，並能卸除負荷、舒緩傷勢。'},
  extreme:{name:'極限重鍛',stamina:Math.ceil(30*staminaFactor),food:material(50*realm),wood:material(10*realm),iron:material(25*realm),roots:{bone:1.6,blood:1.3,organs:.7},risk:Math.max(5,8+Math.floor(load*.22)-injuryReduction),load:25,description:'以隕鐵重器逼迫肉身突破，筋骨收益最高，但負荷與傷勢風險也最大。'}
}}
function inflictBodyInjury(id){const injury=bodyInjuries[id];if(!injury)return;const current=bodyInjuries[activeBodyInjury()],duration=Math.round(injury.duration*(bodyPassiveUnlocked(4)?.8:1));if(!current||injury.severity>=current.severity){state.bodyInjury=id;state.bodyInjuryUntil=gameNow()+duration}}
function bodyTrainingCapacity(option){refreshBodyTrainingCharges();return Math.max(0,Math.min(state.bodyTrainingCharges||0,Math.floor(state.bodyStamina/option.stamina),option.food?Math.floor(state.food/option.food):Infinity,option.wood?Math.floor(state.wood/option.wood):Infinity,option.iron?Math.floor(state.meteorIron/option.iron):Infinity))}
function trainBody(kind,batch=false){
  refreshBodyState();refreshBodyTrainingCharges();if(!state.bodyPathOpened)return toast('尚未開啟煉體之路');if(state.bodyLevel>=mortalBodyMaxLevel)return toast('凡間肉身已至鎮陸十層極限');if(bodyFoundationsReady())return toast('三項根基已足，請先完成突破');let option=bodyTrainingOptions()[kind];if(!option)return;if(kind==='extreme'&&activeBodyInjury()==='tendon')return toast('筋傷未癒，無法進行極限重鍛');let times=batch?bodyTrainingCapacity(option):Math.min(1,bodyTrainingCapacity(option));if(times<1)return toast((state.bodyTrainingCharges||0)<1?'今日淬體時機已用盡，最多可累積14次':'體力或承壓材料不足');let completed=0,newInjury='';
  while(completed<times&&!bodyFoundationsReady()){
    option=bodyTrainingOptions()[kind];if(kind==='extreme'&&activeBodyInjury()==='tendon')break;if(state.bodyStamina<option.stamina||state.food<option.food||state.wood<option.wood||state.meteorIron<option.iron)break;state.bodyStamina-=option.stamina;state.food-=option.food;state.wood-=option.wood;state.meteorIron-=option.iron;state.bodyTrainingCharges--;for(const [root,gain] of Object.entries(option.roots))state.bodyFoundations[root]=(state.bodyFoundations[root]||0)+gain*partnerRouteMultiplier('body');completed++;state.bodyTrainingLoad=Math.max(0,Math.min(100,(state.bodyTrainingLoad||0)+option.load));if(kind==='bath'){if(activeBodyInjury()==='scratch'){state.bodyInjury='';state.bodyInjuryUntil=0}else if(activeBodyInjury()==='internal')state.bodyInjuryUntil=Math.max(gameNow(),state.bodyInjuryUntil-600000)}if(option.risk&&Math.random()*100<option.risk){const roll=Math.random();inflictBodyInjury(roll<.5?'scratch':roll<.82?'internal':'tendon');newInjury=bodyInjuries[state.bodyInjury].name}}
  syncBodyTemperFromFoundations();state.bodyStaminaUpdatedAt=gameNow();state.bodyTrainingLoadUpdatedAt=gameNow();toast(`${option.name}完成 ${completed} 次・三項根基已淬鍊${newInjury?`・留下${newInjury}`:''}`);renderBodyDestination('training');render();save();
}
function bodyHealCost(id=activeBodyInjury()){const base={scratch:{food:140,wood:30,stone:0},internal:{food:420,wood:90,stone:0},tendon:{food:700,wood:180,stone:0}}[id];if(!base)return;const factor=bodyPassiveUnlocked(7)?.8:1;return {food:Math.ceil(base.food*factor),wood:Math.ceil(base.wood*factor),stone:0}}
function healBodyInjury(){const id=activeBodyInjury();if(!id)return toast('目前沒有傷勢');const costs=bodyHealCost(id);if(state.food<costs.food||state.wood<costs.wood)return toast('療傷所需食物或木材不足');state.food-=costs.food;state.wood-=costs.wood;state.bodyInjury='';state.bodyInjuryUntil=0;toast('傷勢已痊癒');renderBodyDestination('body');render();save()}
function formatDuration(ms){const minutes=Math.max(0,Math.ceil(ms/60000));return minutes>=60?`${Math.floor(minutes/60)}時${minutes%60}分`:`${minutes}分`}
function hasMindEmbodiment() { return state.spiritLevel>=40||!!state.mindEmbodimentUnlocked; }
function setTribulationLock(locked){
  tribulationLocked=locked;
  $('#gameScreen').classList.toggle('tribulation-locked',locked);
}
function blockDuringTribulation(event){
  if(!tribulationLocked)return;
  if(event.target.closest?.('#tribulationExit,#offlineModalClose'))return;
  event.preventDefault();event.stopImmediatePropagation();
}
['click','dblclick','pointerdown','pointerup','touchstart','touchend','keydown','keyup'].forEach(type=>document.addEventListener(type,blockDuringTribulation,true));
function experiencedYears() { return state.bornAt ? Math.max(0,Math.floor((gameNow()-state.bornAt)/900000)) : 0; }
const encounterYearMilestones=[10,30,50,100,300,500,1000];
const encounterRewardPool=['mainlineFoodBag','mainlineWoodBag','mainlineIronBag','main-material-xuansi','main-material-xuanjuan','main-material-xuanpi'];
const encounterScenes=[
  {title:'雨夜古亭',text:'山雨封路，亭中一名負傷散修護著半袋物資，遠處追兵的火把正穿過雨幕。',actions:['替他引開追兵','取走無主之物','辨明因果再處置']},
  {title:'枯井劍鳴',text:'荒村枯井每逢夜半便傳出劍鳴。井底既有殘劍，也纏著多年未散的怨念。',actions:['封存怨念安撫亡魂','吞納怨氣淬礪己身','參悟劍痕後悄然離去']},
  {title:'山祠餘火',text:'傾圮山祠中尚有一點香火，兩名旅人正為僅存的乾糧爭執不休。',actions:['分糧勸和','以威勢奪取供物','各取所需不問善惡']},
  {title:'古道遺囊',text:'古道旁留著一只染塵行囊，內有修行物資，也有一封尚未送達的家書。',actions:['送還行囊與家書','留下物資焚去書信','先送信再收取酬勞']},
  {title:'月下問劍',text:'無名劍客攔在月下，只問你出劍是為護人、勝人，還是見證萬般變化。',actions:['劍為止戈','劍為爭勝','劍隨本心']},
  {title:'渡口妖影',text:'夜渡將開，船家說水下有妖。岸邊富戶願出重金先行，流民卻無力付費。',actions:['護送眾人一同渡河','收下重金只護富戶','先查水勢另尋生路']}
];
function encounterChoice(path,label,reward,amount,tier){const moral=path==='righteous'?{righteousness:3}:path==='evil'?{evilQi:3}:{righteousness:1,evilQi:1};return {path,label,moral,rewards:[{item:reward,amount:Math.max(1,amount)}],result:path==='righteous'?'你守住了心中準則，也得了一份善緣。':path==='evil'?'你以利刃奪得機緣，煞氣也隨之沉入道心。':'你未執一端，在因果之間取得了自己的答案。',tier}}
function makeEncounter(kind='random',year=experiencedYears()){
  const scene=kind==='year'?encounterScenes[encounterYearMilestones.indexOf(year)%encounterScenes.length]:encounterScenes[Math.floor(Math.random()*encounterScenes.length)],tier=worldProgressTier(),scale=Math.max(2,Math.min(40,Math.floor(year/20)+tier*2)),reward=encounterRewardPool[(year+state.encounterSerial)%encounterRewardPool.length],pill=`tribPill${Math.max(1,Math.min(8,tier))}`,id=`${kind}-${year}-${++state.encounterSerial}`;
  return {id,kind,year,title:kind==='year'?`${year}年・${scene.title}`:scene.title,text:scene.text,choices:[encounterChoice('righteous',scene.actions[0],reward,scale,tier),encounterChoice('evil',scene.actions[1],pill,Math.max(1,Math.ceil(tier/3)),tier),encounterChoice('balance',scene.actions[2],reward,Math.max(1,Math.ceil(scale*.7)),tier)]};
}
function queueRealmEncounter(path,level){if(level%10!==0)return;const names={spirit:'練氣',sword:'淬劍',body:'煉體'},event=makeEncounter('random');event.kind='realm';event.title=`${names[path]}破境・${event.title}`;event.text=`大境界方定，尚未散盡的天地氣機引來一段因緣。${event.text}`;queueEncounter(event)}
function queueEncounter(event){if(!event||state.encounterQueue.length>=12)return false;state.encounterQueue.push(event);updateEncounterButton();return true}
function processEncounterTriggers(activeMs=0){
  if(!state.name||!state.cultivationAwakened)return;const years=experiencedYears();
  partnerProcess(years);
  for(const year of encounterYearMilestones){if(years<year||state.encounterMilestones[year])continue;if(queueEncounter(makeEncounter('year',year)))state.encounterMilestones[year]=true;else break}
  if(activeMs>0&&!document.hidden&&!battle&&!tribulationLocked){state.encounterActiveMs+=activeMs;if(state.encounterActiveMs>=state.encounterNextMs&&state.encounterQueue.length<3){state.encounterActiveMs=0;state.encounterNextMs=1800000+Math.floor(Math.random()*1800001);queueEncounter(makeEncounter())}}
  updateEncounterButton();
  updateArtifactTombButton();
}
function encounterRewardText(choice){return choice.rewards.map(reward=>`${itemCatalog[reward.item]?.name||reward.item} ×${reward.amount}`).join('、')}
const artifactCatalog=[
  {id:'mountain-river-seal',name:'山河定界印',image:'assets/qstyle-v2/artifacts/mountain-river-seal.png',rule:'攻擊推動共享界勢；抵達任一端時，對手下一次行動改為破界。界勢上限調整為正負30；逆向抗衡現有界勢時效果減半。練氣推動10、淬劍15（落空反震8）、煉體8並削弱敵方下次推動4。'},
  {id:'sun-moon-wheel',name:'日月交蝕輪',image:'assets/qstyle-v2/artifacts/sun-moon-wheel.png',rule:'每個完整回合輪替日相與月相；日相雙方最終傷害125%，月相雙方75%。固定第一式逢日、第二式逢月。'},
  {id:'four-poles-stele',name:'四極鎮命碑',image:'assets/qstyle-v2/artifacts/four-poles-stele.png',rule:'雙方氣血首次跌破70%與30%時，該擊只降至界線，溢出傷害消失；每擊至多破除一道命界。煉體試煉不生效。'}
];
function normalizeArtifacts(){state.ownedArtifacts=Array.isArray(state.ownedArtifacts)?state.ownedArtifacts.filter(id=>artifactCatalog.some(a=>a.id===id)):[];if(!state.ownedArtifacts.includes(state.equippedArtifact))state.equippedArtifact=''}
function availableArtifactClaimCount(){return [6,12,18].filter(mark=>(state.mainlineCleared||0)>=mark).length}
function artifactClaimPending(){return Math.max(0,availableArtifactClaimCount()-(state.ownedArtifacts?.length||0))}
function updateArtifactTombButton(){const button=$('#artifactTombButton');if(!button)return;button.classList.toggle('hidden',!state.cultivationAwakened||artifactClaimPending()<1)}
function ensureArtifactModal(){let modal=$('#artifactModal');if(modal)return modal;modal=document.createElement('div');modal.id='artifactModal';modal.className='artifact-modal';modal.innerHTML='<section class="artifact-window"><button class="artifact-close" aria-label="關閉">×</button><header><small>九鎖遺府</small><h2>鎮界器塚</h2><p id="artifactModalIntro"></p></header><div id="artifactChoices" class="artifact-choices"></div></section>';document.body.append(modal);modal.querySelector('.artifact-close').onclick=()=>modal.classList.remove('show');return modal}
function openArtifactTomb(mode='claim'){normalizeArtifacts();const modal=ensureArtifactModal(),owned=new Set(state.ownedArtifacts),claim=mode==='claim'&&artifactClaimPending()>0;$('#artifactModalIntro').textContent=claim?`第 ${state.ownedArtifacts.length+1} 座器臺已解封。選定後立即認主，仍可於法寶欄更換已持有法寶。`:'法寶不佔用儲物袋；只能在戰鬥外更換，同時僅能裝備一件。';$('#artifactChoices').innerHTML=artifactCatalog.map(a=>{const has=owned.has(a.id),equipped=state.equippedArtifact===a.id,selectable=claim?!has:has;return `<article class="artifact-card ${equipped?'equipped':''} ${selectable?'':'locked'}"><img src="${a.image}" alt="${a.name}"><div><small>${equipped?'目前裝備':has?'已認主':'尚未取得'}</small><h3>${a.name}</h3><p>${a.rule}</p></div><button data-artifact="${a.id}" ${selectable?'':'disabled'}>${claim?'選此法寶':equipped?'卸下':'裝備'}</button></article>`}).join('');$$('[data-artifact]').forEach(button=>button.onclick=()=>claim?claimArtifact(button.dataset.artifact):toggleArtifact(button.dataset.artifact));modal.classList.add('show')}
async function claimArtifact(id){const artifact=artifactCatalog.find(a=>a.id===id);if(!artifact||artifactClaimPending()<1||state.ownedArtifacts.includes(id))return;if(!await gameConfirm(`確定讓「${artifact.name}」認主？\n取得後鎮界器塚入口會暫時隱去，直至下一道封印於第 12／18 關解開。`,{title:'古器認主',confirmText:'確認認主'}))return;state.ownedArtifacts.push(id);state.equippedArtifact=id;save();render();$('#artifactModal')?.classList.remove('show');toast(`取得並裝備・${artifact.name}`)}
function toggleArtifact(id){if(battle?.active)return toast('戰鬥中無法更換法寶');if(!state.ownedArtifacts.includes(id))return;state.equippedArtifact=state.equippedArtifact===id?'':id;save();render();openArtifactTomb('equip');toast(state.equippedArtifact===id?`已裝備${artifactCatalog.find(a=>a.id===id).name}`:'已卸下法寶')}
function updateEncounterButton(){const button=$('#encounterButton'),badge=$('#encounterBadge'),count=state.encounterQueue?.length||0;if(!button)return;button.classList.toggle('hidden',!state.cultivationAwakened);badge.textContent=count;badge.classList.toggle('hidden',!count);button.classList.toggle('pending',count>0)}
function renderEncounterModal(){const event=state.encounterQueue[0],content=$('#encounterContent');if(!content)return;content.closest('.encounter-card')?.classList.toggle('partner-encounter-card',event?.kind==='partner');if(event?.kind==='partner')return partnerRenderEncounter(event,content);if(event){content.innerHTML=`<p class="eyebrow">${event.kind==='year'?`修練歲月・${event.year}年`:'行路有緣'}</p><h2>${event.title}</h2><p class="encounter-story">${event.text}</p><div class="encounter-choices">${event.choices.map((choice,index)=>`<button data-encounter-choice="${index}" class="path-${choice.path}"><b>${choice.label}</b><small>${choice.path==='righteous'?'正氣':choice.path==='evil'?'邪氣':'正邪各'}有所增長・${encounterRewardText(choice)}</small></button>`).join('')}</div>`;$$('[data-encounter-choice]').forEach(button=>button.onclick=()=>resolveEncounter(+button.dataset.encounterChoice))}else partnerRenderHistory(content)}
function openEncounterModal(){renderEncounterModal();$('#encounterModal').classList.remove('hidden')}
function closeEncounterModal(){$('#encounterModal').classList.add('hidden')}
function resolveEncounter(index){const event=state.encounterQueue[0],choice=event?.choices?.[index];if(event?.kind==='partner')return partnerResolveChoice(event,index);if(!choice)return;if(!choice.heartAdjusted){const bonus=Math.min(3,state.qiHeartTraits?.benevolent||0)*.05;choice.rewards=choice.rewards.map(reward=>({...reward,amount:Math.max(1,Math.ceil(reward.amount*(1+bonus)))}));choice.heartAdjusted=true}const itemRewards=choice.rewards.map(reward=>[itemCatalog[reward.item]?.count,reward.amount]).filter(([count])=>count);if(!canStoreBagCounts(itemRewards))return toast('儲物袋容量不足，請先整理再作抉擇');Object.entries(choice.moral||{}).forEach(([key,value])=>state[key]=(state[key]||0)+value);choice.rewards.forEach(reward=>{const item=itemCatalog[reward.item];if(item)state[item.count]=(state[item.count]||0)+reward.amount});state.encounterHistory.unshift({title:event.title,choice:choice.label,result:`${choice.result} 獲得${encounterRewardText(choice)}。`,year:experiencedYears(),at:gameNow(),tags:[event.kind==='realm'?'cultivation':'life']});state.encounterHistory=state.encounterHistory.slice(0,60);state.encounterQueue.shift();render();renderEncounterModal();updateEncounterButton();save();toast(`奇遇已了・${encounterRewardText(choice)}`)}
function realmName(level, arr) {
  return `${arr[Math.min(Math.floor(level/10),arr.length-1)]}・${['一','二','三','四','五','六','七','八','九','十'][level%10]}層`;
}
function spiritRealmIndex(){return Math.floor(Math.max(0,state.spiritLevel||0)/10)}
function worldProgressLevel(){return Math.max(state.spiritLevel||0,state.swordLevel||0,state.bodyLevel||0)}
function worldProgressTier(){return Math.max(1,Math.min(9,Math.floor(worldProgressLevel()/10)+1))}
function worldProgressGateText(level){return `任一路線達第 ${Math.floor(Math.max(0,level)/10)+1} 境`}
function swordPathUnlocked(){return !!state.swordPathOpened}
function swordIntentUnlocked(){return (state.swordLevel||0)>=40&&(state.swordTrialWins||0)>=40&&!!state.swordEmbryo}
function swordPathExperienceNeed(level=(state.swordLevel||0)+1){const realm=Math.max(1,Math.floor(level/10));return Math.round(20*Math.pow(1.55,realm-1))}
function swordPathAlignment(level=(state.swordLevel||0)+1){const righteous=Math.max(0,Math.floor(state.righteousness||0)),evil=Math.max(0,Math.floor(state.evilQi||0)),total=righteous+evil;if(total<swordPathExperienceNeed(level))return 'unmarked';const tendency=(righteous-evil)/Math.max(1,total);return tendency>=.25?'righteous':tendency<=-.25?'evil':'balance'}
function cultivationAlignment(){
  const righteousness=Math.max(0,Math.floor(state.righteousness||0)),evil=Math.max(0,Math.floor(state.evilQi||0)),total=righteousness+evil,choices=Object.values(state.swordTrialChoices||{}),choiceScore=choices.reduce((sum,path)=>sum+(path==='righteous'?2:path==='evil'?-2:0),0),score=(righteousness-evil)/Math.max(10,total)+choiceScore/Math.max(10,choices.length*4),tier=total<20?0:total<100?1:total<500?2:3;
  if(!tier)return {id:'unsettled',name:'道心未定',tier:0,strength:0,description:'尚未累積足夠閱歷，正邪抉擇暫不影響戰鬥。'};
  const id=score>=.18?'righteous':score<=-.18?'evil':'balance',strength=[0,.04,.07,.1][tier],names={righteous:'守正',evil:'逐煞',balance:'守衡'},descriptions={righteous:'氣血、防禦與減傷提高，適合穩健迎敵。',evil:'三類攻擊提高，但承受傷害也會略增。',balance:'命中、閃避與第二招式提高，重視應變。'};
  return {id,name:names[id],tier,strength,description:descriptions[id]};
}
function swordPathMarkCounts(){const counts={righteous:0,evil:0,balance:0};(state.swordPathMarks||[]).forEach(mark=>{if(counts[mark.path]!=null)counts[mark.path]++});return counts}
function swordTechniquePathProfile(){
  const counts=swordPathMarkCounts(),total=counts.righteous+counts.evil+counts.balance;if(!total)return {path:'unmarked',righteous:0,evil:0,balance:0};
  const max=Math.max(counts.righteous,counts.evil,counts.balance),winners=Object.keys(counts).filter(key=>counts[key]===max),path=winners.length===1?winners[0]:'balance';
  return {path,righteous:(counts.righteous+counts.balance*.5)/total,evil:(counts.evil+counts.balance*.5)/total,balance:counts.balance/total};
}
function swordTechniquePathColors(profile){
  if(profile.path==='unmarked')return {core:'#eaf4f1',main:'#9aaca7',glow:'#536b65'};
  if(profile.path==='righteous')return {core:'#fffde8',main:`hsl(${Math.round(48-profile.evil*28)} 82% 66%)`,glow:`hsl(${Math.round(166-profile.evil*118)} 62% 54%)`};
  if(profile.path==='evil')return {core:'#fff0ec',main:`hsl(${Math.round(350+profile.righteous*30)} 82% 59%)`,glow:`hsl(${Math.round(338+profile.righteous*46)} 72% 34%)`};
  return {core:'#fff',main:`hsl(${Math.round(284-profile.righteous*72+profile.evil*24)} 68% 66%)`,glow:`hsl(${Math.round(42+profile.evil*255)} 72% 56%)`};
}
function swordPathTitle(){const counts=swordPathMarkCounts(),max=Math.max(...Object.values(counts));if(!max)return '劍途未定';const winners=Object.keys(counts).filter(key=>counts[key]===max);return winners.length===3?'萬象':winners.length>1?'兩儀':swordPaths[winners[0]].title}
function swordPathBonus(attribute){
  if(!state.swordEmbryo)return 0;
  const nurture=Math.max(0,Math.floor(state.swordNurtureLevel||0)),realm=Math.max(1,Math.floor((state.swordLevel||0)/10)+1);let bonus=0;
  const embryoGain={heavy:{rootBone:2,physique:1},spirit:{trueQi:1,spiritualPower:1},shadow:{agility:2,spiritualPower:1}}[state.swordEmbryo]||{};bonus+=(embryoGain[attribute]||0)*nurture;
  const intentGain={break:{trueQi:2,physique:1},light:{agility:2,spiritualPower:1},origin:{rootBone:1,physique:1}}[state.swordIntentType]||{};bonus+=(intentGain[attribute]||0)*realm;
  return bonus;
}
function swordRealmProfile(level=state.swordLevel||0){
  const realmBreakthroughs=Math.floor(Math.max(0,level)/10),cycle=(offset)=>Math.max(0,Math.floor((realmBreakthroughs+2-offset)/3));
  return {level:Math.max(0,level),realmBreakthroughs,damage:Math.max(0,level)*.008+realmBreakthroughs*.02,armorPierce:cycle(1)*.02,accuracy:cycle(2)*.05,techniqueDamage:cycle(3)*.02};
}
function swordNurtureTechniqueBonus(technique){return technique?.embryo?Math.max(0,state.swordNurtureLevel||0)*(technique.order===2?.015:.01):0}
function swordRealmEffectText(level=state.swordLevel||0){const profile=swordRealmProfile(level);return `劍勢 ${profile.level} 重・劍招傷害 +${Math.round((profile.damage+profile.techniqueDamage)*100)}%・破防 +${Math.round(profile.armorPierce*100)}%・命中 +${Math.round(profile.accuracy*100)}%`}
function artBaseEffect(art){return Math.round(artTierMax[art.tier-1]*(art.level/10))}
function legacyArtRootEffect(art){return Math.round(Math.max(0,Number(state[`${art.element}Art`])||0)*art.tier*art.level)}
function artRootEffect(art){
  const curveEffect=Math.round(artBaseEffect(art)*spiritRootBonus(state[`${art.element}Root`]||0)/100);
  return Math.max(curveEffect,legacyArtRootEffect(art));
}
function artDirectEffect(art){return artBaseEffect(art)+artRootEffect(art)}
function equippedElementBonus(element){
  const label={metal:'金',wood:'木',water:'水',fire:'火',earth:'土'}[element]||element;
  return Object.values(state.equippedItems||{}).reduce((sum,id)=>{
    const equipment=(state.equipmentInventory||[]).find(item=>item.id===id);
    return sum+(equipment?.affixes||[]).filter(affix=>affix.element===label).reduce((total,affix)=>total+(Number(affix.value)||0),0);
  },0);
}
function artTotalEffect(art){return Math.round(artDirectEffect(art)*(1+equippedElementBonus(art.element)/100))}
function artSecondarySpiritualPower(art){return art.kind==='ultimate'?Math.round(artTotalEffect(art)*.25):0}
function artBonusFor(attribute){return (state.learnedArts||[]).reduce((sum,art)=>sum+(artKinds[art.kind]?.attribute===attribute?artTotalEffect(art):0)+(attribute==='spiritualPower'?artSecondarySpiritualPower(art):0),0)}
function artDirectBonusFor(attribute){return (state.learnedArts||[]).reduce((sum,art)=>sum+(artKinds[art.kind]?.attribute===attribute?artDirectEffect(art):0)+(attribute==='spiritualPower'&&art.kind==='ultimate'?Math.round(artDirectEffect(art)*.25):0),0)}
function equippedAttributeBonus(attribute){return Object.values(state.equippedItems||{}).reduce((sum,id)=>{const e=(state.equipmentInventory||[]).find(x=>x.id===id);return sum+(e?.label&&equipmentSlots.find(x=>x[0]===e.slot)?.[2]===attribute?(e.value||0):0)},0)}
function titlePassiveBonus(attribute){return (state.unlockedTitles||[]).includes('all-arts-master')&&(attribute==='comprehension'||attribute==='fortune')?500:0}
function baseCore(attribute){return Math.max(0,(state[attribute]||0)+artDirectBonusFor(attribute)+swordPathBonus(attribute)+equippedAttributeBonus(attribute)+titlePassiveBonus(attribute))}
function effectiveCore(attribute){let total=(state[attribute]||0)+artBonusFor(attribute)+swordPathBonus(attribute)+equippedAttributeBonus(attribute)+titlePassiveBonus(attribute);if(attribute==='trueQi'&&state.spiritPathOpened)total*=qiTrueQiMultiplier();if(attribute==='agility'&&activeBodyInjury()==='tendon')total*=.85;return Math.max(0,total)}
function displayedCore(attribute){return Math.round(effectiveCore(attribute))}
const combatPowerWeights={rootBone:10,trueQi:25,physique:20,agility:15,spiritualPower:30};
function combatPower(){return Math.round(Object.entries(combatPowerWeights).reduce((sum,[key,weight])=>sum+Math.max(0,effectiveCore(key))*weight,0))}
function leaderboardHeaders(accessToken=''){const headers={apikey:leaderboardConfig.publishableKey,'Content-Type':'application/json'};if(accessToken)headers.Authorization=`Bearer ${accessToken}`;return headers}
function readLeaderboardSession(){try{return JSON.parse(localStorage.getItem(leaderboardConfig.sessionKey))}catch{return null}}
function storeLeaderboardSession(session){if(!session?.access_token||!session?.user?.id)return null;const stored={access_token:session.access_token,refresh_token:session.refresh_token,user:{id:session.user.id},expires_at:Date.now()+Math.max(60,session.expires_in||3600)*1000};localStorage.setItem(leaderboardConfig.sessionKey,JSON.stringify(stored));return stored}
async function ensureLeaderboardSession(forceRefresh=false){
  let session=readLeaderboardSession();if(!forceRefresh&&session?.access_token&&session?.user?.id&&session.expires_at>Date.now()+60000)return session;
  if(session?.refresh_token){try{const response=await fetch(`${leaderboardConfig.url}/auth/v1/token?grant_type=refresh_token`,{method:'POST',headers:leaderboardHeaders(),body:JSON.stringify({refresh_token:session.refresh_token})});if(response.ok)return storeLeaderboardSession(await response.json())}catch{}}
  localStorage.removeItem(leaderboardConfig.sessionKey);
  const response=await fetch(`${leaderboardConfig.url}/auth/v1/signup`,{method:'POST',headers:leaderboardHeaders(),body:'{}'});if(!response.ok)throw new Error('anonymous sign-in failed');return storeLeaderboardSession(await response.json());
}
function publicPlayerUid(userId){return userId?`WD1-${String(userId).toUpperCase()}`:''}
async function registerFormalPlayer(session,retryAuth=true){
  if(!session?.user?.id)return '';
  const existingResponse=await fetch(`${leaderboardConfig.url}/rest/v1/player_accounts?user_id=eq.${encodeURIComponent(session.user.id)}&select=public_uid&limit=1`,{headers:leaderboardHeaders(session.access_token)});
  if(existingResponse.status===401&&retryAuth)return registerFormalPlayer(await ensureLeaderboardSession(true),false);
  if(existingResponse.ok){const [existing]=await existingResponse.json();if(existing?.public_uid){currentPlayerUid=existing.public_uid;localStorage.setItem(accountRecoveryConfig.boundUidKey,currentPlayerUid);return currentPlayerUid}if(localStorage.getItem(accountRecoveryConfig.boundUidKey)||storedRecoveryCode()){clearTransferredDeviceData();throw new Error('account transferred')}}
  const publicUid=publicPlayerUid(session.user.id);
  const payload={user_id:session.user.id,public_uid:publicUid,player_name:(state.name||'無名修士').trim().slice(0,20),release_channel:'v1'};
  const response=await fetch(`${leaderboardConfig.url}/rest/v1/player_accounts?on_conflict=user_id`,{method:'POST',headers:{...leaderboardHeaders(session.access_token),Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(payload)});
  if(response.status===401&&retryAuth)return registerFormalPlayer(await ensureLeaderboardSession(true),false);
  if(!response.ok)throw new Error('player registration failed');currentPlayerUid=publicUid;localStorage.setItem(accountRecoveryConfig.boundUidKey,currentPlayerUid);return publicUid;
}
function clearTransferredDeviceData(){if(suppressSave)return;suppressSave=true;sessionOnline=false;clearTimeout(battleTimer);clearSwordTrialAdvance();clearTimeout(recoveryBackupTimer);battle=null;stopAllBgm();sessionStorage.setItem(accountRecoveryConfig.transferNoticeKey,'1');localStorage.removeItem(accountRecoveryConfig.codeKey);localStorage.removeItem(accountRecoveryConfig.boundUidKey);localStorage.removeItem(leaderboardConfig.sessionKey);localStorage.removeItem(saveKey);location.reload()}
async function verifyAccountOwnership(){const boundUid=localStorage.getItem(accountRecoveryConfig.boundUidKey),hasRecoveryCode=!!storedRecoveryCode();let session=readLeaderboardSession();if(!state.name||!session?.user?.id||!boundUid&&!hasRecoveryCode||accountOwnershipCheckInFlight||document.hidden)return;accountOwnershipCheckInFlight=true;try{let response=await fetch(`${leaderboardConfig.url}/rest/v1/player_accounts?user_id=eq.${encodeURIComponent(session.user.id)}&select=public_uid&limit=1`,{headers:leaderboardHeaders(session.access_token)});if(response.status===401){session=await ensureLeaderboardSession(true);response=await fetch(`${leaderboardConfig.url}/rest/v1/player_accounts?user_id=eq.${encodeURIComponent(session.user.id)}&select=public_uid&limit=1`,{headers:leaderboardHeaders(session.access_token)})}if(!response.ok)return;const [account]=await response.json();if(!account||boundUid&&account.public_uid!==boundUid){clearTransferredDeviceData();return}if(!boundUid&&account.public_uid)localStorage.setItem(accountRecoveryConfig.boundUidKey,account.public_uid)}catch{}finally{accountOwnershipCheckInFlight=false}}
function storedRecoveryCode(){return localStorage.getItem(accountRecoveryConfig.codeKey)||''}
function normalizeRecoveryCode(value){const compact=String(value||'').toUpperCase().replace(/[^A-Z0-9]/g,'');if(!compact.startsWith('WDR1')||compact.length!==28)return '';return `WDR1-${compact.slice(4,10)}-${compact.slice(10,16)}-${compact.slice(16,22)}-${compact.slice(22,28)}`}
function generateRecoveryCode(){const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ23456789',bytes=crypto.getRandomValues(new Uint8Array(24)),body=[...bytes].map(value=>alphabet[value%alphabet.length]).join('');return `WDR1-${body.slice(0,6)}-${body.slice(6,12)}-${body.slice(12,18)}-${body.slice(18,24)}`}
async function recoveryCodeHash(code){const normalized=normalizeRecoveryCode(code);if(!normalized)throw new Error('恢復碼格式不正確');const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(normalized));return [...new Uint8Array(bytes)].map(value=>value.toString(16).padStart(2,'0')).join('')}
function recoverySaveData(){return JSON.parse(JSON.stringify(state,(_,value)=>typeof value==='bigint'?value.toString():value))}
async function recoveryRpc(name,body,retryAuth=true){let session=await ensureLeaderboardSession(),response=await fetch(`${leaderboardConfig.url}/rest/v1/rpc/${name}`,{method:'POST',headers:leaderboardHeaders(session.access_token),body:JSON.stringify(body)});if(response.status===401&&retryAuth){session=await ensureLeaderboardSession(true);return recoveryRpc(name,body,false)}const data=await response.json().catch(()=>null);if(!response.ok)throw new Error(data?.message||'帳號恢復服務暫時無法使用');return {session,data}}
async function uploadRecoveryBackup(code=storedRecoveryCode()){if(!code||recoveryBackupInFlight||!state.name)return;recoveryBackupInFlight=true;try{await recoveryRpc('save_recovery_backup',{p_recovery_hash:await recoveryCodeHash(code),p_save_data:recoverySaveData()})}finally{recoveryBackupInFlight=false}}
function scheduleRecoveryBackup(){if(!storedRecoveryCode()||!state.name||recoveryBackupTimer)return;recoveryBackupTimer=setTimeout(()=>{recoveryBackupTimer=0;uploadRecoveryBackup().catch(()=>{})},15000)}
function refreshRecoveryCodeDisplay(){const code=storedRecoveryCode(),value=$('#recoveryCodeValue'),create=$('#createRecoveryCodeBtn'),copy=$('#copyRecoveryCodeBtn');if(value)value.textContent=code||'尚未建立';if(create){create.textContent=code?'永久恢復碼已建立':'建立恢復碼';create.disabled=!!code}if(copy)copy.disabled=!code}
async function createRecoveryCode(){if(recoveryBackupInFlight)throw new Error('存檔正在備份，請稍後再試');const button=$('#createRecoveryCodeBtn'),hint=$('#recoveryCodeHint'),prior=storedRecoveryCode();if(prior){hint.textContent='此恢復碼會永久沿用，直到角色被刪除。';return}button.disabled=true;hint.textContent='正在建立恢復碼並備份角色……';try{const session=await ensureLeaderboardSession();await registerFormalPlayer(session);const code=generateRecoveryCode();await uploadRecoveryBackup(code);localStorage.setItem(accountRecoveryConfig.codeKey,code);refreshRecoveryCodeDisplay();hint.textContent='已完成雲端備份；此恢復碼會永久沿用，請妥善保存。';toast('永久恢復碼已建立，請妥善保存')}catch(error){hint.textContent=`建立失敗：${error.message}`;throw error}finally{button.disabled=!!storedRecoveryCode()}}
function openAccountRecovery(event){event?.stopPropagation();$('#accountRecoveryInput').value='';$('#accountRecoveryError').textContent='';$('#accountRecoveryModal').classList.remove('hidden')}
async function recoverAccount(){const input=$('#accountRecoveryInput'),button=$('#accountRecoveryConfirm'),code=normalizeRecoveryCode(input.value);if(!code){$('#accountRecoveryError').textContent='恢復碼格式不正確';return}if(state.name&&!await gameConfirm('恢復帳號會以雲端存檔取代此裝置目前的角色。確定繼續？',{title:'取代目前角色',confirmText:'確認恢復',danger:true}))return;button.disabled=true;$('#accountRecoveryError').textContent='正在取回帳號……';try{const {data}=await recoveryRpc('recover_formal_account',{p_recovery_hash:await recoveryCodeHash(code)});if(!data||typeof data!=='object'||!data.name)throw new Error('找不到可恢復的角色存檔');localStorage.setItem(saveKey,JSON.stringify(data));localStorage.removeItem(accountRecoveryConfig.boundUidKey);leaderboardKnownPower=null;leaderboardKnownName='';leaderboardKnownAscensionKey='';localStorage.setItem(accountRecoveryConfig.codeKey,code);state={...defaults,...data};await uploadRecoveryBackup(code);location.reload()}catch(error){$('#accountRecoveryError').textContent=error.message;button.disabled=false}}
async function markJadeGrantClaimed(session,id){
  return fetch(`${leaderboardConfig.url}/rest/v1/jade_grants?id=eq.${encodeURIComponent(id)}&user_id=eq.${encodeURIComponent(session.user.id)}`,{method:'PATCH',headers:{...leaderboardHeaders(session.access_token),Prefer:'return=minimal'},body:JSON.stringify({status:'claimed',claimed_at:new Date().toISOString()})});
}
async function syncJadeGrants({notify=true}={}){
  if(jadeGrantSyncInFlight||!state.name)return 0;jadeGrantSyncInFlight=true;
  try{
    const session=await ensureLeaderboardSession();await registerFormalPlayer(session);
    const query=`user_id=eq.${encodeURIComponent(session.user.id)}&status=eq.pending&select=id,amount,order_ref,note,created_at&order=created_at.asc`;
    const response=await fetch(`${leaderboardConfig.url}/rest/v1/jade_grants?${query}`,{headers:leaderboardHeaders(session.access_token)});if(!response.ok)throw new Error('grant lookup failed');
    const grants=await response.json(),processed=new Set(Array.isArray(state.processedJadeGrantIds)?state.processedJadeGrantIds:[]);let gained=0;
    for(const grant of grants){const amount=Math.max(0,Math.floor(Number(grant.amount)||0));if(!processed.has(grant.id)&&amount>0){state.spiritJade=(state.spiritJade||0)+amount;processed.add(grant.id);gained+=amount;state.processedJadeGrantIds=[...processed].slice(-500);save()}await markJadeGrantClaimed(session,grant.id)}
    if(gained){render();if(notify)toast(`靈玉發放已入帳・+${formatLargeNumber(gained)} 靈玉`)}return gained;
  }catch{return 0}finally{jadeGrantSyncInFlight=false}
}
async function refreshPlayerUidDisplay(){
  const value=$('#playerUidValue'),button=$('#copyPlayerUidBtn'),hint=$('#playerUidHint');if(!value||!button)return;
  value.textContent='正在取得……';button.disabled=true;
  try{const session=await ensureLeaderboardSession();const uid=await registerFormalPlayer(session);value.textContent=uid;button.disabled=!uid;hint.textContent='購買靈玉時，請將此 UID 提供給開發者。'}catch(error){value.textContent='暫時無法取得 UID';hint.textContent=error?.message==='anonymous sign-in failed'?'帳號服務暫時無法登入，請稍後再試。':'連線憑證更新失敗，請稍後重新開啟設定。'}
}
function ascensionLeaderboardKey(a=normalizeAscension()){return a.ascended?`${Math.max(1,Number(a.ascendedAt)||Date.now())}:${a.route}`:''}
function leaderboardVersionValue(){const key=ascensionLeaderboardKey();return key?`${leaderboardConfig.gameVersion}|A:${key}`:leaderboardConfig.gameVersion}
function parseAscensionLeaderboardRecord(record){const match=String(record?.game_version||'').match(/\|A:(\d+):(qi|sword|body)$/);return match?{...record,ascendedAt:Number(match[1]),route:match[2]}:null}
async function loadOwnLeaderboardRecord(session){const query=`user_id=eq.${encodeURIComponent(session.user.id)}&game_version=like.${encodeURIComponent(`${leaderboardConfig.gameVersion}*`)}&select=combat_power,player_name,game_version&limit=1`;const response=await fetch(`${leaderboardConfig.url}/rest/v1/player_rankings?${query}`,{headers:leaderboardHeaders(session.access_token)});if(!response.ok)throw new Error('ranking lookup failed');const [record]=await response.json();leaderboardKnownPower=record?Number(record.combat_power):0;leaderboardKnownName=record?.player_name||'';leaderboardKnownAscensionKey=parseAscensionLeaderboardRecord(record)?`${parseAscensionLeaderboardRecord(record).ascendedAt}:${parseAscensionLeaderboardRecord(record).route}`:''}
async function syncLeaderboard(){
  if(leaderboardSyncInFlight||!state.name||!state.cultivationAwakened)return;leaderboardSyncInFlight=true;
  try{const session=await ensureLeaderboardSession();if(leaderboardKnownPower===null)await loadOwnLeaderboardRecord(session);const currentPower=Math.max(0,Math.round(combatPower())),playerName=state.name.trim().slice(0,20)||'無名修士',nameChanged=playerName!==leaderboardKnownName,ascensionKey=ascensionLeaderboardKey(),ascensionChanged=ascensionKey!==leaderboardKnownAscensionKey;if(currentPower<=leaderboardKnownPower&&!nameChanged&&!ascensionChanged)return;const rankedPower=Math.max(currentPower,leaderboardKnownPower||0),payload={user_id:session.user.id,player_name:playerName,combat_power:rankedPower,spirit_level:state.spiritLevel||0,sword_level:state.swordLevel||0,body_level:state.bodyLevel||0,game_version:leaderboardVersionValue(),updated_at:new Date().toISOString()};const response=await fetch(`${leaderboardConfig.url}/rest/v1/player_rankings?on_conflict=user_id`,{method:'POST',headers:{...leaderboardHeaders(session.access_token),Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify(payload)});if(!response.ok)throw new Error('ranking upload failed');leaderboardKnownPower=rankedPower;leaderboardKnownName=playerName;leaderboardKnownAscensionKey=ascensionKey}catch{}finally{leaderboardSyncInFlight=false}
}
function queueLeaderboardSync(){if(!state.name||!state.cultivationAwakened||leaderboardSyncTimer)return;leaderboardSyncTimer=setTimeout(()=>{leaderboardSyncTimer=0;syncLeaderboard().then(refreshOwnAscensionRank)},2500)}
function syncLeaderboardAfterRename(){
  if(leaderboardSyncTimer){clearTimeout(leaderboardSyncTimer);leaderboardSyncTimer=0}
  const attempt=()=>{if(leaderboardSyncInFlight){leaderboardSyncTimer=setTimeout(()=>{leaderboardSyncTimer=0;attempt()},500);return}syncLeaderboard().then(refreshOwnAscensionRank)};
  attempt();
}
function escapeLeaderboardText(value){const node=document.createElement('span');node.textContent=String(value??'');return node.innerHTML}
function leaderboardHighestRealm(record){const paths=[{label:'修氣',level:Number(record.spirit_level)||0,realms:spiritRealms},{label:'淬劍',level:Number(record.sword_level)||0,realms:swordRealms},{label:'煉體',level:Number(record.body_level)||0,realms:bodyRealms}];const highest=paths.reduce((best,path)=>path.level>best.level?path:best,paths[0]);return `${highest.label}・${realmName(highest.level,highest.realms)}`}
function dedupeCombatLeaderboard(records){const unique=new Map();for(const record of records){const name=String(record.player_name||'無名修士').trim()||'無名修士',key=name.normalize('NFKC');if(!unique.has(key))unique.set(key,{...record,player_name:name})}return [...unique.values()].slice(0,leaderboardConfig.limit)}
async function fetchCombatLeaderboard(){const query=`game_version=like.${encodeURIComponent(`${leaderboardConfig.gameVersion}*`)}&select=player_name,combat_power,spirit_level,sword_level,body_level,updated_at&order=combat_power.desc,updated_at.desc&limit=500`;const response=await fetch(`${leaderboardConfig.url}/rest/v1/player_rankings?${query}`,{headers:leaderboardHeaders()});if(!response.ok)throw new Error('ranking fetch failed');return dedupeCombatLeaderboard(await response.json())}
async function fetchAscensionLeaderboard(){const query=`game_version=like.${encodeURIComponent(`${leaderboardConfig.gameVersion}*`)}&select=user_id,player_name,spirit_level,sword_level,body_level,game_version&limit=1000`,response=await fetch(`${leaderboardConfig.url}/rest/v1/player_rankings?${query}`,{headers:leaderboardHeaders()});if(!response.ok)throw new Error('ascension ranking fetch failed');return (await response.json()).map(parseAscensionLeaderboardRecord).filter(Boolean).sort((a,b)=>a.ascendedAt-b.ascendedAt).slice(0,leaderboardConfig.limit)}
async function refreshOwnAscensionRank(){const a=normalizeAscension(),session=readLeaderboardSession();if(!a.ascended||!session?.user?.id)return;try{const records=await fetchAscensionLeaderboard(),index=records.findIndex(record=>record.user_id===session.user.id);if(index>=0&&a.serverAscensionRank!==index+1){a.serverAscensionRank=index+1;save();const label=document.querySelector('.sheet-ascension-rank b');if(label)label.textContent=`第 ${index+1} 名`}}catch{}}
const ascensionRouteLabels={qi:'練氣飛升',sword:'淬劍飛升',body:'煉體飛升'};
async function openAscensionLeaderboard(modal){renderLeaderboardTabs(modal,'ascension');const list=modal.querySelector('.leaderboard-list');list.innerHTML='<p class="leaderboard-loading">正在查閱飛升仙冊……</p>';try{await syncLeaderboard();const session=readLeaderboardSession(),records=await fetchAscensionLeaderboard(),ownIndex=records.findIndex(record=>record.user_id===session?.user?.id);if(ownIndex>=0){normalizeAscension().serverAscensionRank=ownIndex+1;save()}list.innerHTML=records.length?records.map((record,index)=>`<article class="leaderboard-rank rank-${index+1}"><strong>${index+1}</strong><div><b>${escapeLeaderboardText(record.player_name||'無名修士')}</b><small>${escapeLeaderboardText(ascensionRouteLabels[record.route]||'飛升')}</small></div><span><small>飛升境界</small>${escapeLeaderboardText(leaderboardHighestRealm(record))}</span></article>`).join(''):'<p class="leaderboard-empty">尚無修士名列飛升仙冊</p>'}catch{list.innerHTML='<p class="leaderboard-empty">飛升仙冊暫時無法展開，請稍後再試</p>'}}
function renderLeaderboardTabs(modal,active='combat'){modal.querySelectorAll('[data-leaderboard-tab]').forEach(button=>button.classList.toggle('active',button.dataset.leaderboardTab===active))}
async function openLeaderboard(){
  closeGameMenu();let modal=$('#leaderboardModal');if(!modal){modal=document.createElement('div');modal.id='leaderboardModal';modal.className='leaderboard-modal';modal.innerHTML='<section class="leaderboard-window"><button class="leaderboard-close" aria-label="關閉">×</button><header><small>凡間風雲・前五十名</small><h2>凡間潛龍榜</h2><p>潛龍榜記錄凡間修士曾達到的最高戰力</p></header><nav class="leaderboard-tabs"><button data-leaderboard-tab="combat" class="active">潛龍榜</button><button data-leaderboard-tab="ascension">飛升榜</button></nav><div class="leaderboard-list"><p class="leaderboard-loading">正在觀星推演……</p></div></section>';document.body.appendChild(modal);modal.querySelector('.leaderboard-close').onclick=()=>modal.classList.remove('show');modal.onclick=event=>{if(event.target===modal)modal.classList.remove('show')};modal.querySelector('[data-leaderboard-tab="combat"]').onclick=()=>openLeaderboard();modal.querySelector('[data-leaderboard-tab="ascension"]').onclick=()=>{renderLeaderboardTabs(modal,'ascension');modal.querySelector('.leaderboard-list').innerHTML='<div class="leaderboard-coming"><b>飛升榜・前五十名</b><p>待飛升玩法正式開放後啟用</p><small>屆時將依成功飛升的先後順序排名，並保留飛升類型與飛升境界。</small></div>'}}modal.classList.add('show');renderLeaderboardTabs(modal,'combat');const list=modal.querySelector('.leaderboard-list');list.innerHTML='<p class="leaderboard-loading">正在觀星推演……</p>';queueLeaderboardSync();
  try{await syncLeaderboard();const records=await fetchCombatLeaderboard();list.innerHTML=records.length?records.map((record,index)=>`<article class="leaderboard-rank rank-${index+1}"><strong>${index+1}</strong><div><b>${escapeLeaderboardText(record.player_name||'無名修士')}</b><small>${escapeLeaderboardText(leaderboardHighestRealm(record))}</small></div><span><small>戰力</small>${formatCombatPower(Number(record.combat_power)||0)}</span></article>`).join(''):'<p class="leaderboard-empty">榜上尚無修士留名</p>'}catch{list.innerHTML='<p class="leaderboard-empty">天機暫受遮蔽，請稍後再試</p>'}
}
document.addEventListener('click',event=>{const button=event.target.closest?.('[data-leaderboard-tab="ascension"]'),modal=button?.closest('#leaderboardModal');if(modal)openAscensionLeaderboard(modal)});
function formatCombatPower(value){
  const amount=Math.max(0,Math.floor(value));
  if(amount<10000)return amount.toLocaleString();
  const parts=[],yi=Math.floor(amount/100000000),wan=Math.floor(amount%100000000/10000),rest=amount%10000;
  if(yi)parts.push(`${yi}億`);
  if(wan||yi)parts.push(`${wan}萬`);
  if(rest||!parts.length)parts.push(rest.toString());
  return parts.join(' ');
}
function cultivationEfficiency() { return Math.floor(effectiveCore('comprehension')*.5); }
function auraEfficiency() { return Math.floor(1.25*Math.sqrt(Math.max(0,effectiveCore('fortune')))); }
function pathEfficiency(level){const realm=Math.min(Math.floor(level/10),realmEfficiencyMultipliers.length-1),layer=level%10;return realmEfficiencyMultipliers[realm]*(1+layer*.035)}
function realmEfficiency(){return Math.max(1,pathEfficiency(state.spiritLevel))}
function baseRate() { return Math.max(1,Math.floor((10+cultivationEfficiency())*realmEfficiency())); }
function swordEssenceRate(){return state.swordPathOpened?Math.max(1,Math.floor(12.5*pathEfficiency(state.swordLevel||0)*partnerRouteMultiplier('sword'))):0}
function buffRemaining(key,now=gameNow()){const buff=state[key]||defaults[key];return buff.active?Math.max(0,(buff.until||0)-now):Math.max(0,buff.remaining||0)}
function buffActive(key,now=gameNow()){return !!state[key]?.active&&buffRemaining(key,now)>0}
function cultivationMultiplier(now=gameNow()){return (1+(buffActive('practiceBuff',now)?4:0)+(buffActive('transmissionBuff',now)?7:0)+caveCultivationBonus())*(state.spiritPathOpened?qiRateMultiplier():1)}
function rate() { return Math.max(1,Math.floor(baseRate()*cultivationMultiplier()*partnerRouteMultiplier('qi'))); }
function buffYears(key){return buffRemaining(key)/900000}
function addCultivationBuff(key,years){const remaining=buffRemaining(key),duration=years*900000,total=remaining+duration;state[key]={active:true,until:gameNow()+total,remaining:0,total}}
function buffClock(key){const seconds=Math.max(0,Math.ceil(buffRemaining(key)/1000)),hours=Math.floor(seconds/3600),minutes=Math.floor(seconds%3600/60),secs=seconds%60;return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(secs).padStart(2,'0')}`}
function buffPercent(key){const buff=state[key],total=Math.max(1,buff?.total||buffRemaining(key));return Math.max(0,Math.min(100,buffRemaining(key)/total*100))}
function offlineCultivationGain(from,to){const base=baseRate(),ticks=Math.max(0,(to-from)/5000);let gain=base*ticks*(1+caveCultivationBonus())*partnerRouteMultiplier('qi');for(const [key,bonus] of [['practiceBuff',4],['transmissionBuff',7]]){const buff=state[key];if(buff?.active)gain+=base*bonus*Math.max(0,Math.min(to,buff.until||0)-from)/5000}return Math.floor(gain)}
function offlineSwordEssenceGain(ticks){return state.swordPathOpened?Math.floor(Math.max(0,ticks)*swordEssenceRate()):0}
function spiritPoolProductionBonus(){const upgrades=Math.max(0,(state.spiritPoolLevel||1)-1);return Math.min(upgrades,9)*2+Math.min(Math.max(0,upgrades-9),10)*3+Math.max(0,upgrades-19)*4}
function auraRate() { return Math.max(1,Math.floor(5+spiritPoolProductionBonus()+auraEfficiency())); }
function poolStorageHours() { return Math.min(24,4+Math.max(0,(state.spiritPoolLevel||1)-1)); }
function auraCapacity() { return Math.floor(auraRate()*720*poolStorageHours()); }
function spiritRootLevelGain(level){return level<1||level>200?0:Math.round((.5+2*(level-1)/199)*10)/10}
function spiritRootBonus(level){let total=0;for(let rank=1;rank<=Math.min(200,Math.max(0,Math.floor(level||0)));rank++)total+=spiritRootLevelGain(rank);return Math.round(total*10)/10}
function spiritRootReq(level) { return Math.floor(500*Math.pow(1.38,Math.max(0,level-1))); }
function poolWoodCost() { return Math.floor(120*Math.pow(state.spiritPoolLevel,1.55)); }
function poolIronCost() { return Math.floor(50*Math.pow(state.spiritPoolLevel,1.5)); }
function rootRank(level) { const rank=Math.min(200,Math.max(0,Math.floor(level||0)));return rank===0?'未開啟':`${spiritRootRanks[Math.min(Math.floor((rank-1)/10),spiritRootRanks.length-1)]}・${(rank-1)%10+1}階`; }
function normalizeSpiritRootCurve(needsMigration=false){
  const roots=['metalRoot','woodRoot','waterRoot','fireRoot','earthRoot'];
  roots.forEach(root=>state[root]=Math.min(200,Math.max(0,Math.floor(Number(state[root])||0))+(needsMigration?1:0)));
  state.spiritRootCurveVersion=2;
}
function normalizePillEffectValues(needsMigration=false){
  if(!needsMigration){state.pillEffectVersion=2;return false}
  state.pillUsage=state.pillUsage&&typeof state.pillUsage==='object'?state.pillUsage:{};
  pillTypes.forEach(([key,,attribute])=>{for(let tier=1;tier<=9;tier++){const used=Math.max(0,Math.floor(Number(state.pillUsage[`${key}_${tier}`])||0));state[attribute]=(Number(state[attribute])||0)+used*(pillTierGain(tier)-1)}});
  state.pillEffectVersion=2;
  return true;
}
function chanceFromRating(rating,cap) { return Math.min(cap,rating/(rating+1000)*100); }
function save() { if(suppressSave)return;if(state.sect)syncCurrentSectRecord();const now=gameNow();if(sessionOnline||!state.name||!state.lastSave)state.lastSave=now;if(trustedClockReady)state.lastTrustedTime=Math.max(state.lastTrustedTime||0,now);localStorage.setItem(saveKey,JSON.stringify(state,(_,value)=>typeof value==='bigint'?value.toString():value));scheduleRecoveryBackup() }
function grantTestTribulationPills(){
  Object.keys(tribulationPillDefaults).forEach(key=>state[key]=Math.max(200,state[key]||0));
  state.testTribulationPillGrantVersion=1;
}
function load() {
  try {
    const current=JSON.parse(localStorage.getItem(saveKey));
    if(current) { const growthVersion=current.attributeGrowthVersion||0,needsPillMigration=!current.tribulationPillMigration,needsTestJadeGrant=!current.testJadeGrantVersion,needsTestPillGrant=!current.testTribulationPillGrantVersion;state={...defaults,...current};if(needsTestJadeGrant){state.spiritJade=Math.max(99999,state.spiritJade||0);state.testJadeGrantVersion=1}if(needsPillMigration)state.tribPill1=(state.tribPill1||0)+Math.max(0,current.pills||0);delete state.pills;delete state.sectTokens;delete state.sectTokenDaily;state.tribulationPillMigration=1;if(needsTestPillGrant)grantTestTribulationPills();state.learnedArts=Array.isArray(current.learnedArts)?current.learnedArts:[];state.learnedBookIds=Array.isArray(current.learnedBookIds)?current.learnedBookIds:[];state.mailbox=Array.isArray(current.mailbox)?current.mailbox:[];state.scripturePurchases={...defaults.scripturePurchases,...current.scripturePurchases};state.scripturePurchases.ids=Array.isArray(state.scripturePurchases.ids)?state.scripturePurchases.ids:[];state.marketPermanentPurchases=current.marketPermanentPurchases&&typeof current.marketPermanentPurchases==='object'?current.marketPermanentPurchases:{};state.marketDailyPurchases={...defaults.marketDailyPurchases,...current.marketDailyPurchases};state.marketDailyPurchases.counts=state.marketDailyPurchases.counts&&typeof state.marketDailyPurchases.counts==='object'?state.marketDailyPurchases.counts:{};state.practiceBuff={...defaults.practiceBuff,...current.practiceBuff};state.transmissionBuff={...defaults.transmissionBuff,...current.transmissionBuff};migrateAttributeGrowth(growthVersion);state.bornAt ||= Date.now();delete state.npcAffinity;state.npcDaily=normalizeNpcDailyLog(state.npcDaily);normalizeLearnedArts();normalizeCaveWorkers();normalizeCaveState();migrateSectName(); return state; }
  } catch {}
}
function normalizeMainlineMaterialItems(){if((state.mainlineMaterialMigration||0)>=1)return;const legacy=state.mainlineMaterials&&typeof state.mainlineMaterials==='object'?state.mainlineMaterials:{};mainlineMaterials.forEach(([,key])=>{const count=`mainlineMaterial_${key}`;state[count]=Math.max(0,Math.floor(Number(state[count])||0))+Math.max(0,Math.floor(Number(legacy[key])||0))});state.mainlineMaterials={};state.mainlineMaterialMigration=1}
function normalizeCraftingMaterialItems(){if((state.craftingMaterialMigration||0)>=1)return;state.mainlineLoot=state.mainlineLoot&&typeof state.mainlineLoot==='object'?state.mainlineLoot:{};craftingMaterialItems.forEach(([name,count])=>{state[count]=Math.max(0,Math.floor(Number(state[count])||0))+Math.max(0,Math.floor(Number(state.mainlineLoot[name])||0));delete state.mainlineLoot[name]});state.craftingMaterialMigration=1}
function normalizeProductionMaterialStorage(){
  if((state.productionMaterialStorageVersion||0)>=1)return false;
  state.mainlineLoot=state.mainlineLoot&&typeof state.mainlineLoot==='object'?state.mainlineLoot:{};
  [...tierMaterials,'器靈精魄'].forEach(name=>{const count=productionMaterialCountByName[name];state[count]=Math.max(0,Math.floor(Number(state[count])||0))+Math.max(0,Math.floor(Number(state.mainlineLoot[name])||0));delete state.mainlineLoot[name]});
  state.productionMaterialStorageVersion=1;return true;
}
function migrateSectName(){
  if(!state.sect)return;const all=sectCatalog.flatMap(g=>[...g.good,...g.evil]);if(all.includes(state.sect))return;
  const group=sectCatalog.find(g=>g.star===state.sectStar)||sectCatalog[0],pool=state.sectFaction==='邪'?group.evil:group.good;
  const seed=[...state.sect].reduce((n,c)=>n+c.charCodeAt(0),0);state.sect=pool[seed%pool.length];
}
let entranceTransitionTimer=0;
const entranceTransitionTimes=new WeakMap();
function playEntrance(target){
  const element=typeof target==='string'?$(target):target;
  if(!element||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  const now=performance.now();
  if(now-(entranceTransitionTimes.get(element)||0)<120)return;
  entranceTransitionTimes.set(element,now);
  element.classList.remove('entry-arriving');void element.offsetWidth;element.classList.add('entry-arriving');
  document.documentElement.classList.remove('entry-transition');void document.documentElement.offsetWidth;document.documentElement.classList.add('entry-transition');
  clearTimeout(entranceTransitionTimer);entranceTransitionTimer=setTimeout(()=>document.documentElement.classList.remove('entry-transition'),300);
  setTimeout(()=>element.classList.remove('entry-arriving'),300);
}
function show(id,animate=false) { $$('.screen').forEach(x=>x.classList.remove('active'));const screen=$(id);screen.classList.add('active');if(animate)playEntrance(screen); }
new MutationObserver(records=>records.forEach(record=>{
  const element=record.target;
  if(!(element instanceof Element))return;
  const oldClasses=new Set((record.oldValue||'').split(/\s+/));
  const justOpened=element.matches('.modal,#featurePanel,#gameMenu')&&oldClasses.has('hidden')&&!element.classList.contains('hidden');
  const divineOpened=element.id==='divineRoamingModal'&&!oldClasses.has('show')&&element.classList.contains('show');
  if(justOpened||divineOpened)playEntrance(element);
})).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['class'],attributeOldValue:true});
function isPureCultivationView() {
  return $('#gameScreen').classList.contains('active')
    && currentFeature===null
    && $('#featurePanel').classList.contains('hidden')
    && $('#gameMenu').classList.contains('hidden')
    && !document.querySelector('.modal:not(.hidden)');
}
function hideCultivationToast() {
  const x=$('#toast');
  if(x.dataset.kind==='cultivation'&&x.classList.contains('show'))x.classList.remove('show');
}
function toast(text,kind='general') { const x=$('#toast'); x.textContent=text;x.dataset.kind=kind;x.classList.add('show'); setTimeout(()=>x.classList.remove('show'),1800); }
new MutationObserver(()=>{if(!isPureCultivationView())hideCultivationToast()})
  .observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['class']});
function closeGameConfirm(result=false){
  $('#confirmModal').classList.add('hidden');$('#confirmModal').classList.remove('info-dialog');
  const resolve=confirmResolver;confirmResolver=null;if(resolve)resolve(result);
}
function gameConfirm(message,{title='確認操作',confirmText='確認',danger=false,info=false}={}){
  if(confirmResolver)closeGameConfirm(false);
  $('#confirmModalTitle').textContent=title;$('#confirmModalMessage').textContent=message;
  const accept=$('#confirmModalAccept');accept.textContent=confirmText;accept.className=danger?'danger-button':'jade-button';
  $('#confirmModalCancel').classList.toggle('hidden',info);
  $('#confirmModal').classList.toggle('info-dialog',info);
  $('#confirmModal').classList.remove('hidden');
  return new Promise(resolve=>{confirmResolver=resolve});
}
function createWelcomeMail(now){
  return {id:`welcome-${now}`,subject:'初入修途・迎新贈禮',sender:'問道長生',body:'道友既已結契入世，從此山高水長，自有仙途可尋。這份薄禮贈予初踏修途的你，願你守住本心，行遍九霄。',sentAt:now,read:false,claimed:false,attachments:[{type:'currency',key:'prestige',name:'聲望',image:'assets/qstyle-v2/reputation.png',amount:200}]};
}
function createTestTemporaryItemsMail(now){return {id:'test-temporary-items-v1',subject:'測試用臨時道具',sender:'問道長生・測試',body:'為方便測試目前版本內容，隨信附上兩項臨時道具。領取後可於儲物袋中使用。',sentAt:now,read:false,claimed:false,attachments:[{type:'item',key:'testCultivationPillCount',name:'修為丹',image:itemCatalog.testCultivationPill.image,amount:1},{type:'item',key:'testSpiritStoneTenMillionCount',name:'一千萬靈石',image:itemCatalog.testSpiritStoneTenMillion.image,amount:1}]}}
function ensureTestTemporaryItemsMail(){if(!state.name||state.testTemporaryItemsMailVersion>=1)return;if(!mailbox().some(mail=>mail.id==='test-temporary-items-v1'))mailbox().push(createTestTemporaryItemsMail(gameNow()));state.testTemporaryItemsMailVersion=1}
function createTestResourceSupplyMail(now){return {id:'test-resource-supply-v1',subject:'測試用資源補給',sender:'問道長生・測試',body:'為方便測試洞府、坊市與門派系統，隨信發放一批測試資源。',sentAt:now,read:false,claimed:false,attachments:[{type:'currency',key:'wood',name:'木材',image:'assets/qstyle-v2/wood-cutout.png',amount:10000000},{type:'currency',key:'meteorIron',name:'隕鐵',image:'assets/qstyle-v2/meteor-iron-cutout.png',amount:10000000},{type:'currency',key:'food',name:'食物',image:'assets/qstyle-v2/food-cutout.png',amount:10000000},{type:'currency',key:'prestige',name:'聲望',image:'assets/qstyle-v2/reputation.png',amount:10000000}]}}
function ensureTestResourceSupplyMail(){if(!state.name||state.testResourceSupplyMailVersion>=1)return;if(!mailbox().some(mail=>mail.id==='test-resource-supply-v1'))mailbox().push(createTestResourceSupplyMail(gameNow()));state.testResourceSupplyMailVersion=1}
function createTestFoodAuraSupplyMail(now){return {id:'test-resource-supply-v2',subject:'測試用資源補給',sender:'問道長生・測試',body:'為方便後續測試，隨信補發食物與靈氣。',sentAt:now,read:false,claimed:false,attachments:[{type:'currency',key:'food',name:'食物',image:'assets/qstyle-v2/food-cutout.png',amount:10000000},{type:'currency',key:'aura',name:'靈氣',image:'assets/qstyle-v2/spirit-pool.png',amount:10000000}]}}
function ensureTestFoodAuraSupplyMail(){if(!state.name||state.testFoodAuraSupplyMailVersion>=1)return;if(!mailbox().some(mail=>mail.id==='test-resource-supply-v2'))mailbox().push(createTestFoodAuraSupplyMail(gameNow()));state.testFoodAuraSupplyMailVersion=1}
function createTestSpiritMedicineMail(now){return {id:'test-spirit-medicine-v1',subject:'測試用資源補給',sender:'問道長生・測試',body:'為方便測試煉體之路，隨信附上一批可恢復體力的靈藥。',sentAt:now,read:false,claimed:false,attachments:[{type:'item',key:'spiritMedicineCount',name:'靈藥',image:itemCatalog.spiritMedicine.image,amount:500}]}}
function ensureTestSpiritMedicineMail(){if(!state.name||state.testSpiritMedicineMailVersion>=1)return;if(!mailbox().some(mail=>mail.id==='test-spirit-medicine-v1'))mailbox().push(createTestSpiritMedicineMail(gameNow()));state.testSpiritMedicineMailVersion=1}
function createTestSwordPathPillsMail(now){return {id:'test-sword-path-pills-v1',subject:'劍途測試・正邪丹藥',sender:'問道長生・測試',body:'為方便測試劍途道印與正邪預示，隨信附上正氣丹、邪氣丹各五百顆。領取後可在儲物袋中批量使用。',sentAt:now,read:false,claimed:false,attachments:[{type:'item',key:'righteousQiPillCount',name:'正氣丹',image:itemCatalog.righteousQiPill.image,amount:500},{type:'item',key:'evilQiPillCount',name:'邪氣丹',image:itemCatalog.evilQiPill.image,amount:500}]}}
function ensureTestSwordPathPillsMail(){if(!state.name||state.testSwordPathPillsMailVersion>=1)return;if(!mailbox().some(mail=>mail.id==='test-sword-path-pills-v1'))mailbox().push(createTestSwordPathPillsMail(gameNow()));state.testSwordPathPillsMailVersion=1}
function createTestSwordEssenceMail(now){return {id:'test-sword-essence-v1',subject:'淬劍測試・十億劍元',sender:'問道長生・測試',body:'為方便測試淬劍境界提升與試劍境流程，隨信附上十億劍元。領取後會直接加入目前持有的劍元。',sentAt:now,read:false,claimed:false,attachments:[{type:'currency',key:'swordEssence',name:'劍元',image:'assets/qstyle-v2/sword-cultivation.png',amount:1000000000}]}}
function ensureTestSwordEssenceMail(){if(!state.name||state.testSwordEssenceMailVersion>=1)return;if(!mailbox().some(mail=>mail.id==='test-sword-essence-v1'))mailbox().push(createTestSwordEssenceMail(gameNow()));state.testSwordEssenceMailVersion=1}
function createSectTechniqueRevisionMail(now){return {id:'sect-technique-revision-v2',subject:'門派功法改修致歉與舊傳承操作說明',sender:'問道長生・開發團隊',body:'道友安好：\n\n本次更新重新整理了所有門派的傳功內容，造成查閱與養成規劃上的不便，我們在此致歉。悟卷與天箋現已改為真正稀有的門派傳承：每個星級僅有一個正派與一個邪派門派持有稀有功法，其中一部為悟卷、另一部為天箋；奇偶星級會交換正邪所持類型。全九星合計只有九部悟卷與九部天箋，且仍需晉升供奉才能學習。\n\n【已學功法如何處理】\n更新不會刪除、降級或改寫你已學會的功法。內容與新版不同者會標示為「舊傳承」，原名稱、五行、類型、等級與效果均會繼續保留。\n\n【免費轉換新版】\n前往「功法 → 門派功法」，在舊傳承功法上點選「免費轉換」。轉換會保留原本的星階與功法等級，但名稱、五行、功法類型及加成屬性會改成該門派目前對應欄位的新版內容。確認視窗會先列出轉換前後資料；不想轉換可以直接取消，舊功法沒有期限。\n\n【遺忘與重新學習】\n舊傳承一旦遺忘便無法復原，也不會返還已投入的靈氣。若保留舊傳承，該門派同一欄位視為已學，不能再額外取得新版；需先使用免費轉換，或自行遺忘後再依門派職位重新學習。尚未學過的門派功法會直接依新版內容顯示。\n\n【離開原門派】\n即使已離開原門派，舊傳承仍會保留，也可在門派功法頁免費轉換；不必為了處理舊功法重新拜入原門派。\n\n感謝道友在測試期間陪伴我們調整修行體系。',sentAt:now,read:false,claimed:true,attachments:[]}}
function ensureSectTechniqueRevisionMail(){if(!state.name)return;let existing=mailbox().find(mail=>mail.id==='sect-technique-revision-v2');if(state.sectTechniqueMailVersion<2&&!existing){existing=createSectTechniqueRevisionMail(gameNow());mailbox().unshift(existing)}if(existing)existing.body=existing.body.replace('且仍需晉升供奉才能學習','且需晉升親傳弟子才能學習');state.sectTechniqueMailVersion=Math.max(2,state.sectTechniqueMailVersion||0)}
function mailbox(){return Array.isArray(state.mailbox)?state.mailbox:(state.mailbox=[])}
function unreadMailCount(){return mailbox().filter(mail=>!mail.read).length}
function mailDate(value){return new Intl.DateTimeFormat('zh-TW',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'}).format(new Date(value||Date.now()))}
function renderMailButton(){
  const count=unreadMailCount(),badge=$('#mailUnreadBadge');if(!badge)return;
  badge.textContent=count>99?'99+':count;badge.classList.toggle('hidden',count===0);
}
function renderMailbox(){
  const list=$('#mailList');if(!list)return;const mails=[...mailbox()].sort((a,b)=>(b.sentAt||0)-(a.sentAt||0));
  $('#mailboxUnreadCount').textContent=unreadMailCount();
  list.innerHTML=mails.length?mails.map(mail=>`<button class="mail-list-item ${mail.read?'is-read':'is-unread'}" data-mail-id="${mail.id}"><i>${mail.read?'閱':'新'}</i><span><b>${mail.subject}</b><small>${mail.sender}・${mailDate(mail.sentAt)}</small></span>${mail.attachments?.length?`<em>${mail.claimed?'已領取':'有附件'}</em>`:''}</button>`).join(''):'<div class="mail-empty"><b>暫無書信</b><small>新的訊息與獎勵會送到此處。</small></div>';
  list.querySelectorAll('[data-mail-id]').forEach(button=>button.onclick=()=>openMailDetail(button.dataset.mailId));
}
function openMailbox(){renderMailbox();$('#mailboxModal').classList.remove('hidden')}
function closeMailbox(){$('#mailboxModal').classList.add('hidden')}
function renderMailDetail(){
  const mail=mailbox().find(entry=>entry.id===currentMailId);if(!mail)return closeMailDetail();
  $('#mailDetailSubject').textContent=mail.subject;$('#mailDetailSender').textContent=`寄件人：${mail.sender}`;$('#mailDetailDate').textContent=mailDate(mail.sentAt);$('#mailDetailBody').textContent=mail.body;
  const attachments=Array.isArray(mail.attachments)?mail.attachments:[],section=$('#mailAttachmentSection');section.classList.toggle('hidden',!attachments.length);
  $('#mailAttachmentList').innerHTML=attachments.map(item=>`<div class="mail-attachment ${mail.claimed?'is-claimed':''}"><img src="${item.image||''}" alt=""><span><b>${item.name}</b><small>× ${formatLargeNumber(Number(item.amount||0))}</small></span></div>`).join('');
  const claim=$('#mailClaimBtn');claim.classList.toggle('hidden',!attachments.length);claim.disabled=!!mail.claimed;claim.textContent=mail.claimed?'已領取':'領取附件';
}
function openMailDetail(id){const mail=mailbox().find(entry=>entry.id===id);if(!mail)return;mail.read=true;currentMailId=id;renderMailbox();renderMailButton();renderMailDetail();$('#mailDetailModal').classList.remove('hidden');save()}
function closeMailDetail(){$('#mailDetailModal').classList.add('hidden');currentMailId=null}
function claimMailAttachments(){
  const mail=mailbox().find(entry=>entry.id===currentMailId);if(!mail||mail.claimed)return;
  const itemAttachments=(mail.attachments||[]).filter(attachment=>attachment.type==='item').map(attachment=>[attachment.key,Number(attachment.amount)||0]);
  if(!canStoreBagCounts(itemAttachments))return toast('儲物袋容量不足，請先騰出空間');
  for(const attachment of mail.attachments||[]){if(attachment.type==='currency'&&Object.prototype.hasOwnProperty.call(state,attachment.key)){if(['free','swordEssence'].includes(attachment.key))state[attachment.key]=toBigInt(state[attachment.key])+toBigInt(attachment.amount);else state[attachment.key]=(Number(state[attachment.key])||0)+Number(attachment.amount||0)}else if(attachment.type==='item'&&Object.prototype.hasOwnProperty.call(state,attachment.key))state[attachment.key]=(Number(state[attachment.key])||0)+Number(attachment.amount||0)}
  mail.claimed=true;renderMailDetail();renderMailbox();renderMailButton();render();save();toast('附件已收入囊中');
}
async function deleteCurrentMail(){
  const mail=mailbox().find(entry=>entry.id===currentMailId);if(!mail)return;
  if(mail.attachments?.length&&!mail.claimed){await gameConfirm('此信尚有未領取附件，請先領取附件後再刪除信件。',{title:'無法刪除信件',confirmText:'我知道了'});return}
  if(!await gameConfirm(`確定刪除「${mail.subject}」？`,{title:'刪除信件',confirmText:'確認刪除',danger:true}))return;
  state.mailbox=mailbox().filter(entry=>entry.id!==currentMailId);closeMailDetail();renderMailbox();renderMailButton();save();
}
function addCultivation(amount,silent=false) {
  const gain=toBigInt(amount);state.free+=gain;state.totalEarned+=gain;
  if(!silent&&isPureCultivationView())toast(`修為+${formatLargeNumber(amount)}`,'cultivation');
  render(); save();
}
function updateMainlineButton(){
  const button=$('#mainlineButton');if(!button)return;const awakened=!!state.cultivationAwakened;
  button.classList.toggle('hidden',!awakened);button.classList.toggle('active',awakened&&currentFeature==='mainline');button.disabled=!awakened;button.setAttribute('aria-hidden',String(!awakened));
}
function renderNoviceCultivation(){
  const awakened=!!state.cultivationAwakened,ready=!awakened&&state.free>=noviceCultivationNeed,progress=Math.min(100,Number(state.free)/Number(noviceCultivationNeed)*100),novice=$('#noviceCultivation'),button=$('#manualCultivateBtn');
  novice.classList.toggle('hidden',awakened);novice.classList.toggle('breakthrough-ready',ready);
  $$('.path-actions').forEach(actions=>actions.classList.toggle('hidden',!awakened));
  $$('.feature-tab').forEach(tab=>{tab.classList.toggle('novice-locked',!awakened);tab.setAttribute('aria-disabled',String(!awakened))});
  updateMainlineButton();
  if(awakened)return;
  $('#noviceProgressText').textContent=ready?'修為已足，點擊突破踏入聽息一層':`入門進度 ${formatLargeNumber(state.free)} / ${formatLargeNumber(noviceCultivationNeed)}`;
  $('#noviceProgressBar').style.width=`${progress}%`;
  button.classList.toggle('breakthrough-button',ready);
  if(ready){button.disabled=breakthroughInProgress;button.setAttribute('aria-label','突破至聽息一層');}
  else if(!manualCultivationStartedAt){button.disabled=false;button.classList.remove('channeling');$('#manualCultivateLabel').textContent='修練';$('#manualCultivateHint').textContent=`凝神吐納 5 秒・可得 ${rate()} 修為`;$('#manualCultivateBar').style.width='0%'}
}
function finishManualCultivation(){
  clearInterval(manualCultivationTimer);manualCultivationTimer=null;manualCultivationStartedAt=0;
  if(state.cultivationAwakened)return;
  const amount=BigInt(rate());state.free+=amount;state.totalEarned+=amount;playTone();render();save();
  if(state.free<noviceCultivationNeed)toast(`吐納完成・修為+${formatLargeNumber(amount)}`);
}
function beginManualCultivation(){
  if(state.cultivationAwakened||manualCultivationStartedAt||breakthroughInProgress)return;
  if(state.free>=noviceCultivationNeed)return beginFirstBreakthrough();
  manualCultivationStartedAt=performance.now();const button=$('#manualCultivateBtn');button.disabled=true;button.classList.add('channeling');
  const update=()=>{const elapsed=performance.now()-manualCultivationStartedAt,left=Math.max(0,5-Math.floor(elapsed/1000));$('#manualCultivateLabel').textContent='吐納中';$('#manualCultivateHint').textContent=`尚需 ${left} 秒`;$('#manualCultivateBar').style.width=`${Math.min(100,elapsed/50)}%`;if(elapsed>=5000)finishManualCultivation()};
  update();manualCultivationTimer=setInterval(update,80);
}
function openFirstPathChoice(){
  let modal=$('#firstPathModal');if(!modal){modal=document.createElement('div');modal.id='firstPathModal';modal.className='first-path-modal';document.body.append(modal)}
  modal.innerHTML=`<section class="first-path-window"><small>新手突破・三途問心</small><h2>此身先行何道</h2><p>此次選擇決定主介面的最初道場，並非永久職業。完成入道後，仍可在「兼修」開啟另外兩路，亦可三道同修。</p><div class="first-path-grid">${Object.entries(cultivationPathMeta).map(([id,item])=>`<button data-first-path="${id}" class="first-path-card path-${id}" style="--path-scene:url('${item.scene}')"><b>${item.name}之路</b><em>${item.realm}・以${item.resource}修行</em><small>${item.description}</small><i>選此道入門</i></button>`).join('')}</div></section>`;
  modal.classList.add('show');$$('[data-first-path]').forEach(button=>button.onclick=()=>chooseFirstPath(button.dataset.firstPath));
}
function chooseFirstPath(path){
  if(!cultivationPathMeta[path])return;
  if(state.firstPath){$('#firstPathModal')?.classList.remove('show');render();save();return}
  state.free=state.free>=noviceCultivationNeed?state.free-noviceCultivationNeed:0n;state.firstPath=path;state.activePath=path;state.cultivationAwakened=true;state.tutorialCompleted=true;state.spiritPathOpened=path==='spirit';state.swordPathOpened=path==='sword';state.bodyPathOpened=path==='body';syncSectTaskRouteUnlocks(path);
  state.swordMoves=path==='body'?['body-origin']:['origin'];breakthroughInProgress=false;$('#heroArt').classList.remove('breakthrough-absorb');$('#firstPathModal')?.classList.remove('show');render();startPathBgm(path);save();toast(`已踏入${cultivationPathMeta[path].name}之路・其餘兩道可於兼修開啟`);
  if(path==='sword')setTimeout(()=>openPrimarySwordView('sword'),350);
}
function beginFirstBreakthrough(){
  if(state.cultivationAwakened||state.free<noviceCultivationNeed||breakthroughInProgress)return;
  breakthroughInProgress=true;$('#manualCultivateBtn').disabled=true;$('#heroArt').classList.add('breakthrough-absorb');playBreakthroughSound();
  setTimeout(()=>{breakthroughInProgress=false;$('#heroArt').classList.remove('breakthrough-absorb');openFirstPathChoice()},2100);
}
function playBreakthroughSound(){
  if(state.muted)return;
  try{
    audioContext=audioContext||new (window.AudioContext||window.webkitAudioContext)();audioContext.resume?.();
    const now=audioContext.currentTime,master=audioContext.createGain();master.connect(audioContext.destination);
    master.gain.setValueAtTime(.0001,now);master.gain.exponentialRampToValueAtTime(.2,now+.18);master.gain.setValueAtTime(.2,now+1.35);master.gain.exponentialRampToValueAtTime(.0001,now+2.05);
    const length=Math.floor(audioContext.sampleRate*1.75),buffer=audioContext.createBuffer(1,length,audioContext.sampleRate),data=buffer.getChannelData(0);
    for(let i=0;i<length;i++){const t=i/length;data[i]=(Math.random()*2-1)*Math.sin(Math.PI*t)*.55}
    const breath=audioContext.createBufferSource(),breathFilter=audioContext.createBiquadFilter();breath.buffer=buffer;breathFilter.type='bandpass';breathFilter.Q.value=.8;breathFilter.frequency.setValueAtTime(260,now);breathFilter.frequency.exponentialRampToValueAtTime(1900,now+1.45);breath.connect(breathFilter).connect(master);breath.start(now);breath.stop(now+1.78);
    [164,246,369].forEach((frequency,index)=>{const tone=audioContext.createOscillator(),gain=audioContext.createGain();tone.type=index===1?'triangle':'sine';tone.frequency.setValueAtTime(frequency,now);tone.frequency.exponentialRampToValueAtTime(frequency*2.4,now+1.45);gain.gain.setValueAtTime(.0001,now);gain.gain.exponentialRampToValueAtTime(.09-index*.018,now+.22+index*.08);gain.gain.exponentialRampToValueAtTime(.0001,now+1.7);tone.connect(gain).connect(master);tone.start(now);tone.stop(now+1.75)});
    const impact=audioContext.createOscillator(),impactGain=audioContext.createGain();impact.type='sine';impact.frequency.setValueAtTime(145,now+1.48);impact.frequency.exponentialRampToValueAtTime(42,now+1.98);impactGain.gain.setValueAtTime(.0001,now);impactGain.gain.setValueAtTime(.42,now+1.48);impactGain.gain.exponentialRampToValueAtTime(.0001,now+2.04);impact.connect(impactGain).connect(audioContext.destination);impact.start(now+1.48);impact.stop(now+2.06);
    [880,1320,1760].forEach((frequency,index)=>{const chime=audioContext.createOscillator(),gain=audioContext.createGain();chime.type='sine';chime.frequency.value=frequency;gain.gain.setValueAtTime(.0001,now);gain.gain.setValueAtTime(.07/(index+1),now+1.5+index*.04);gain.gain.exponentialRampToValueAtTime(.0001,now+2.08);chime.connect(gain).connect(audioContext.destination);chime.start(now+1.5+index*.04);chime.stop(now+2.1)});
  }catch{}
}
function addAura(amount) { const cap=auraCapacity();if(state.aura<cap)state.aura=Math.min(cap,state.aura+amount); }
function playTone() {
  if(state.muted) return;
  try { audioContext ||= new (window.AudioContext||window.webkitAudioContext)(); const o=audioContext.createOscillator(),g=audioContext.createGain();o.frequency.value=520;g.gain.setValueAtTime(.035,audioContext.currentTime);g.gain.exponentialRampToValueAtTime(.001,audioContext.currentTime+.35);o.connect(g).connect(audioContext.destination);o.start();o.stop(audioContext.currentTime+.35); } catch {}
}
function updateBgmVolume() {
  bgmTracks().forEach(([name,track])=>{track.muted=state.muted;track.volume=name==='battle'?.48:name==='swordBreakthrough'?.62:name.startsWith('tribulation')?.55:.42});
  const cinematic=$('#swordCinematicVideo');if(cinematic){cinematic.muted=state.muted;cinematic.volume=.82}
}
const cultivationBgmSources={tutorial:'assets/bgm-tutorial-user-v1.wav?v=3',main:'assets/bgm-main-user-v4.wav?v=3',swordCultivation:'assets/bgm-sword-cultivation-user-v1.wav?v=3',bodyCultivation:'assets/bgm-body-cultivation-user-v1.wav?v=3'};
const battleBgmSources={battle:'assets/bgm-battle-user-v1.wav?v=2',swordTrial:'assets/bgm-sword-trial-user-v1.wav?v=1',bodyTrial:'assets/bgm-body-trial-user-v1.wav?v=1'};
function bgmTracks(){return [['title',$('#titleBgm')],['cultivation',$('#mainBgm')],['battle',$('#battleBgm')],['tribulationSuccess',$('#tribulationSuccessBgm')],['tribulationFailure',$('#tribulationFailureBgm')],['swordBreakthrough',$('#swordBreakthroughBgm')],['ascensionPrologue',$('#ascensionPrologueBgm')],['ascensionHeart',$('#ascensionHeartBgm')],['ascensionDelusion',$('#ascensionDelusionBgm')],['ascensionRoadEnd',$('#ascensionRoadEndBgm')],['immortalBarren',$('#immortalBarrenBgm')],...Array.from({length:9},(_,index)=>[`mainline${index+1}`,$(`#mainlineBgm${index+1}`)])]}
function startBgm(theme) {
  const tracks=bgmTracks(),cultivationSource=cultivationBgmSources[theme],battleSource=battleBgmSources[theme],dynamicSource=cultivationSource||battleSource,trackName=cultivationSource?'cultivation':battleSource?'battle':theme,next=tracks.find(([name])=>name===trackName)?.[1];if(!next)return;
  const changed=bgmTheme!==theme;tracks.forEach(([name,track])=>{if(name!==trackName){track.pause();track.currentTime=0}});
  if(cultivationSource&&next.dataset.cultivationTheme!==theme){next.pause();next.src=cultivationSource;next.dataset.cultivationTheme=theme;next.load();next.currentTime=0}
  if(battleSource&&next.dataset.battleTheme!==theme){next.pause();next.src=battleSource;next.dataset.battleTheme=theme;next.load();next.currentTime=0}
  bgmTheme=theme; updateBgmVolume();
  if(changed&&!dynamicSource){next.load();next.currentTime=0}
  next.play().catch(()=>document.addEventListener('pointerdown',()=>{if(bgmTheme===theme)next.play().catch(()=>{})},{once:true}));
}
function startMainlineBgm(stage){startBgm(`mainline${Math.ceil(stage.id/2)}`)}
function pathBgmTheme(path=state.activePath||state.firstPath){return path==='sword'?'swordCultivation':path==='body'?'bodyCultivation':'main'}
function startPathBgm(path){startBgm(pathBgmTheme(path))}
function resumeWorldBgm(){const a=normalizeAscension();a.ascended&&a.currentRealm==='immortal'?startBgm('immortalBarren'):startPathBgm()}
function stopAllBgm() {
  bgmTracks().forEach(([,track])=>{track.pause();track.currentTime=0});
  bgmTheme=null;
}
function render() {
  const spiritMax=state.spiritLevel>=maxSpiritLevel,swordMax=(state.swordLevel||0)>=mortalSwordMaxLevel,spiritCost=spiritMax?null:req(state.spiritLevel),swordCost=swordMax?null:swordReq(state.swordLevel||0),free=state.free,swordEssence=state.swordEssence;
  $('#playerName').textContent=state.name; $('#totalQi').textContent=formatLargeNumber(free);
  $('#spiritStoneAmount').textContent=formatLargeNumber(state.spiritStone);
  $('#spiritJadeAmount').textContent=formatLargeNumber(state.spiritJade);
  $('#reputationAmount').textContent=formatLargeNumber(state.prestige);
  updateEncounterButton();
  updateArtifactTombButton();
  if($('#marketSpiritStone'))$('#marketSpiritStone').textContent=formatLargeNumber(state.spiritStone);
  if($('#marketSpiritJade'))$('#marketSpiritJade').textContent=formatLargeNumber(state.spiritJade);
  if($('#marketReputation'))$('#marketReputation').textContent=formatLargeNumber(state.prestige);
  const activePath=state.activePath||state.firstPath;$('#headerSpiritRealm').textContent=state.cultivationAwakened&&activePath?`${cultivationPathMeta[activePath].name}・${pathRealmName(activePath)}`:'尚未入門';
  $('#headerSect').textContent=state.sect||'無門無派';
  $('#yearsElapsed').textContent=`${experiencedYears().toLocaleString()} 年`;
  $('#headerCombatPower').textContent=formatCombatPower(combatPower());
  queueLeaderboardSync();
  $('#rateText').textContent=formatLargeNumber(rate())+' / 5秒';
  $('#spiritRealm').textContent=realmName(state.spiritLevel,spiritRealms);
  $('#bodyRealm').textContent=state.bodyPathOpened?realmName(state.bodyLevel,bodyRealms):'尚未開啟';
  $('#swordRealm').textContent=state.swordPathOpened?realmName(state.swordLevel||0,swordRealms):'尚未開啟';
  $('#spiritCost').textContent=spiritMax?'已達最高境界':`提升需 ${formatLargeNumber(spiritCost)}`;
  const temperNeed=bodyTemperNeed();
  $('#bodyCost').textContent='';
  const nextSword=(state.swordLevel||0)+1,swordTrialRequired=nextSword%10===0&&(state.swordTrialWins||0)<nextSword;
  $('#swordCost').textContent=!state.swordPathOpened?'點擊開啟淬劍之路':swordMax?'已達最高境界':swordTrialRequired?`需通過試劍境第 ${nextSword} 關`:`淬劍需 ${formatLargeNumber(swordCost)} 劍元`;
  $('#spiritUp').classList.toggle('ready',!spiritMax&&free>=spiritCost);
  $('#bodyUp').classList.remove('ready');
  $('#swordUp').classList.toggle('ready',state.swordPathOpened&&!swordMax&&!swordTrialRequired&&swordEssence>=swordCost);
  $('#heroCharacterHotspot').disabled=!hasMindEmbodiment();
  $('#muteBtn').textContent=state.muted?'♫ 開啟音效':'♪ 靜音';
  renderMailButton();
  renderNoviceCultivation();
  renderPrimarySanctum();
  renderAscensionEntrances();
}
function upgrade(type) {
  const spirit=type==='spirit',sword=type==='sword',cost=spirit?req(state.spiritLevel):sword?swordReq(state.swordLevel||0):0;
  if(spirit&&!state.spiritPathOpened)return openCultivationPath('spirit');
  if(sword&&!state.swordPathOpened)return openCultivationPath('sword');
  if(!spirit&&!sword&&!state.bodyPathOpened)return openCultivationPath('body');
  if((spirit&&state.spiritLevel>=maxSpiritLevel)||(sword&&(state.swordLevel||0)>=mortalSwordMaxLevel)||(!spirit&&!sword&&state.bodyLevel>=mortalBodyMaxLevel))return toast(!spirit&&!sword?'凡間肉身已至鎮陸十層極限':sword?'凡間劍途已至劍域十層極限':'已達此道最高境界');
  if(spirit&&pendingQiHeartMilestone()){openPrimarySpiritView('realm');return toast('心關已現，需先完成問心才能引動突破')}
  if(sword&&((state.swordLevel||0)+1)%10===0&&(state.swordTrialWins||0)<(state.swordLevel||0)+1){state.activePath==='sword'?openPrimarySwordView('trial'):openExperienceView('trial');return toast(`突破前需通過試劍境第 ${(state.swordLevel||0)+1} 關`)}
  if(!spirit&&!sword&&!bodyFoundationsReady())return toast('筋骨、氣血與臟腑尚未全部淬鍊完成');
  if(!spirit&&!sword&&(state.bodyLevel+1)%10===0){openExperienceView('bodyTrial');return toast('大境界需通過歷練中的肉身試煉')}
  if(spirit&&state.free<cost)return toast(`尚缺 ${formatLargeNumber(cost-state.free)} 修為`);
  if(sword&&state.swordEssence<cost)return toast(`尚缺 ${formatLargeNumber(cost-state.swordEssence)} 劍元`);
  if(spirit&&(state.spiritLevel+1)%10===0)return openTrib();
  if(sword&&((state.swordLevel||0)+1)%10===0)return startSwordBreakthrough(cost);
  if(spirit)state.free-=cost;else if(sword)state.swordEssence-=cost;
  if(spirit) { const gain=spiritAttributeGain(state.spiritLevel+1);state.spiritLevel++;applyAttributeGain(gain);toast(`已提升至${realmName(state.spiritLevel,spiritRealms)}`); }
  else if(sword){const gain=swordAttributeGain((state.swordLevel||0)+1);state.swordLevel=(state.swordLevel||0)+1;applyAttributeGain(gain);toast(`已提升至${realmName(state.swordLevel,swordRealms)}`)}
  else {
    const gain=bodyAttributeGain(state.bodyLevel+1);state.bodyLevel++;resetBodyFoundations();applyAttributeGain(gain);
    toast(`已提升至${realmName(state.bodyLevel,bodyRealms)}`);
  }
  syncSectTaskRouteUnlocks(type);render();
  if(spirit)renderQiDestination();
  if(!spirit&&!sword&&currentFeature==='experience')renderExperiencePanel('body');
  save();
}
async function openCultivationPath(type){
  if(!state.cultivationAwakened){toast('需先完成新手修練與三途問心');return false}
  const meta=cultivationPathMeta[type],key=type==='spirit'?'spiritPathOpened':type==='sword'?'swordPathOpened':'bodyPathOpened';if(!meta)return false;if(state[key])return true;
  if(type==='spirit'){
    if(!await gameConfirm('練氣最易入門。靜坐感應天地元息後，即可開始每五秒累積修為，並掌握「凝念馭元」。\n\n開啟後將直接前往練氣道場。',{title:'兼修練氣',confirmText:'靜坐感氣'}))return false;
    state.spiritPathOpened=true;if(!(state.swordMoves||[]).length)state.swordMoves=['origin'];toast('已開啟練氣之路・開始累積修為');
  }else{
    const cost=pathOpeningCosts[type],held=Math.floor(state[cost.key]||0),description=type==='sword'?'開啟後開始凝聚劍元，並可凝聚本命劍、進入試劍境。':'開啟後可透過體力與材料鍛體，並在大境界接受肉身試煉。';
    if(held<cost.amount){toast(`開啟${meta.name}之路尚缺 ${formatLargeNumber(cost.amount-held)} ${cost.label}`);return false}
    if(!await gameConfirm(`是否正式兼修${meta.name}？\n\n${description}\n\n需要消耗：${cost.label} ${formatLargeNumber(cost.amount)}\n目前持有：${formatLargeNumber(held)}`,{title:`兼修${meta.name}`,confirmText:`踏入${meta.realm}`}))return false;
    state[cost.key]-=cost.amount;if(type==='body')state.food+=30;state[key]=true;if(type==='body'&&!(state.swordMoves||[]).length)state.swordMoves=['body-origin'];toast(`已開啟${meta.name}之路・${meta.realm}${type==='body'?'・獲得起步口糧30':''}`);
  }
  syncSectTaskRouteUnlocks(type);render();if(currentFeature==='experience')renderExperiencePanel('overview');save();return true;
}
async function switchCultivationScene(path){
  if(!cultivationPathMeta[path]||path===state.activePath)return;
  if(!pathOpened(path)&&!await openCultivationPath(path))return;
  state.activePath=path;currentFeature=null;currentExperienceView='overview';$('#featurePanel').classList.add('hidden');$('#gameScreen').classList.remove('feature-open');$$('.feature-tab').forEach(item=>item.classList.remove('active'));render();startPathBgm(path);save();toast(`已前往${cultivationPathMeta[path].name}道場`);
}
function openTrib() {
  const nextLevel=state.spiritLevel+1;
  $('#tribTitle').textContent=realmName(nextLevel,spiritRealms)+'雷劫';
  tribulationPillUseCount=0;updateTribulationPanel();$('#tribulationModal').classList.remove('hidden');
}
function currentTribulationPill(){const realmIndex=Math.floor((state.spiritLevel+1)/10),key=`tribPill${realmIndex}`;return {realmIndex,key,item:itemCatalog[key],count:state[key]||0}}
function tribulationBaseChance(realmIndex){
  if(realmIndex<=6)return 50;
  if(realmIndex<=12)return 40;
  if(realmIndex<=17)return 30;
  return 20;
}
function updateTribulationPanel(){
  const {realmIndex,item,count}=currentTribulationPill(),base=tribulationBaseChance(realmIndex),foundation=qiTribulationBonus(),maxPills=Math.max(0,Math.ceil((100-base-foundation)/5)),used=Math.min(tribulationPillUseCount,count,maxPills);
  const cycleBonus=state.qiCycleMode==='still'?5:0,markBonus=Math.min(8,state.qiFoundationMarks?.still||0),focus=state.qiTribulationFocus||0;tribulationPillUseCount=used;$('#tribChance').textContent=`${Math.min(100,base+foundation+used*5)}%`;$('#tribChanceDetail').textContent=`基礎 ${base}%・定息周天 +${cycleBonus}%・不動印 +${markBonus}%・凝神加護 +${focus}%・丹藥 +${used*5}%`;$('#tribPillImage').src=item.image;$('#tribPillImage').alt=item.name;$('#tribPillName').textContent=item.name;$('#pillCount').textContent=`持有 ${formatLargeNumber(count)} 顆`;setQuantityInputValue('tribPillUseCount',used);$('#tribPillMin').disabled=used<=0;$('#tribPillMinus').disabled=used<=0;$('#tribPillPlus').disabled=used>=Math.min(count,maxPills);$('#tribPillMax').disabled=used>=Math.min(count,maxPills);
}
function adjustTribulationPills(delta){tribulationPillUseCount=Math.max(0,tribulationPillUseCount+delta);updateTribulationPanel()}
function maximizeTribulationPills(){
  const {realmIndex,count}=currentTribulationPill(),base=tribulationBaseChance(realmIndex);
  tribulationPillUseCount=Math.min(count,Math.max(0,Math.ceil((100-base-qiTribulationBonus())/5)));updateTribulationPanel();
}
function scheduleTribulation(callback,delay){const timer=setTimeout(callback,delay);tribulationTimers.push(timer);return timer}
function cleanupTribulationScene(){
  tribulationTimers.forEach(clearTimeout);tribulationTimers=[];
  const swordTrack=$('#swordBreakthroughBgm');swordTrack.pause();swordTrack.currentTime=0;
  ['#swordCinematicVideo','#swordCinematicBackdrop'].forEach(id=>{const video=$(id);if(video){video.onended=null;video.ontimeupdate=null;video.pause();try{video.currentTime=0}catch{}}});
  const scene=$('#tribulationScene');scene.className='tribulation-scene';scene.setAttribute('aria-hidden','true');
  setTribulationLock(false);
}
function exitTribulationResult(){
  if(!$('#tribulationScene').classList.contains('show-result'))return;
  cleanupTribulationScene();startPathBgm();
}
function tribulate() {
  if(tribulationLocked)return;
  const {realmIndex,key,count}=currentTribulationPill(),base=tribulationBaseChance(realmIndex),foundation=qiTribulationBonus(),maxPills=Math.max(0,Math.ceil((100-base-foundation)/5)),used=Math.min(tribulationPillUseCount,count,maxPills),chance=Math.min(100,base+foundation+used*5);
  state[key]=count-used;state.qiTribulationFocus=0;tribulationPillUseCount=0;$('#tribulationModal').classList.add('hidden');
  const cost=req(state.spiritLevel),success=Math.random()*100<chance,scene=$('#tribulationScene'),nextRealm=realmName(state.spiritLevel+1,spiritRealms);
  setTribulationLock(true);scene.className='tribulation-scene active gathering';scene.setAttribute('aria-hidden','false');$('#tribulationCharacter').src=characterAsset();$('#tribulationCharacter').alt='渡劫中的修士';$('#tribulationSceneRealm').textContent=`${nextRealm}・天劫`;$('#tribulationSceneText').textContent='黑雲壓境・雷霆正在雲層間尋找氣機';startBgm(success?'tribulationSuccess':'tribulationFailure');
  scheduleTribulation(()=>{scene.classList.add('strike-one');$('#tribulationSceneText').textContent='主雷落地・護住道心'},1100);
  scheduleTribulation(()=>{scene.classList.add('strike-two');$('#tribulationSceneText').textContent='雷罔擴張・經脈承受天威'},2400);
  scheduleTribulation(()=>{scene.classList.add('final-strike');$('#tribulationSceneText').textContent='九霄紫電貫穿雲幕・最後一擊'},3750);
  scheduleTribulation(()=>{
    if(!sessionOnline){cleanupTribulationScene();return}
    scene.classList.add('show-result',success?'result-success':'result-failure');
    if(success) {
      const gain=spiritAttributeGain(state.spiritLevel+1);state.free-=cost;state.spiritLevel++;applyAttributeGain(gain);recordQiFoundationMark();syncSectTaskRouteUnlocks('spirit');queueRealmEncounter('spirit',state.spiritLevel);
      $('#tribulationResultSeal').textContent='成';$('#tribulationResultTitle').textContent='渡劫成功';$('#tribulationResultText').textContent=`境界提升至 ${realmName(state.spiritLevel,spiritRealms)}${state.spiritLevel===40&&!state.mindEmbodimentUnlocked?'・習得意念入體':''}`;
    } else {
      const lossPercent=50-Math.min(3,state.qiHeartTraits?.guard||0)*5,loss=(cost*BigInt(lossPercent)+99n)/100n;state.free=state.free>loss?state.free-loss:0n;
      $('#tribulationResultSeal').textContent='敗';$('#tribulationResultTitle').textContent='渡劫失敗';$('#tribulationResultText').textContent=`雷劫傷及道基，本次修為折損 ${lossPercent}%${lossPercent<50?'・守一心護住部分根基':''}`;
    }
    render();renderQiDestination();save();
  },5150);
}
function swordCinematicSource(path){return swordCinematicSources[path]||swordCinematicSources.unmarked}
function swordCinematicPathProfile(path){const counts=swordPathMarkCounts();if(path!=='unmarked'&&counts[path]!=null)counts[path]++;const total=counts.righteous+counts.evil+counts.balance;if(!total)return {righteous:0,evil:0,balance:0};return {righteous:(counts.righteous+counts.balance*.5)/total,evil:(counts.evil+counts.balance*.5)/total,balance:counts.balance/total}}
async function playSwordCinematic(scene,path){
  const video=$('#swordCinematicVideo'),backdrop=$('#swordCinematicBackdrop');if(!video)return false;const source=swordCinematicSource(path),profile=swordCinematicPathProfile(path);scene.style.setProperty('--cinematic-righteous',profile.righteous);scene.style.setProperty('--cinematic-evil',profile.evil);scene.style.setProperty('--cinematic-balance',profile.balance);scene.style.setProperty('--cinematic-path-strength',(.38+Math.max(profile.righteous,profile.evil,profile.balance)*.28).toFixed(2));video.src=source;video.currentTime=0;video.muted=state.muted;video.volume=.82;scene.classList.add('cinematic-active');stopAllBgm();
  if(backdrop){backdrop.src=source;backdrop.currentTime=0;backdrop.muted=true}
  try{await video.play();if(backdrop&&matchMedia('(min-width:700px)').matches)backdrop.play().catch(()=>{});return true}catch{scene.classList.remove('cinematic-active');video.pause();if(backdrop)backdrop.pause();startBgm('swordBreakthrough');return false}
}
async function startSwordBreakthrough(cost=swordReq(state.swordLevel||0)){
  if(tribulationLocked)return;const next=(state.swordLevel||0)+1;if(next>mortalSwordMaxLevel)return toast('凡間劍途已至劍域十層極限');if(next%10!==0||(state.swordTrialWins||0)<next)return toast(`需先通過試劍境第 ${next} 關`);if(state.swordEssence<cost)return toast(`尚缺 ${formatLargeNumber(cost-state.swordEssence)} 劍元`);
  const path=state.swordTrialChoices?.[String(next)]||swordPathAlignment(next);
  const scene=$('#tribulationScene'),nextRealm=realmName(next,swordRealms),gain=swordAttributeGain(next);setTribulationLock(true);scene.className='tribulation-scene active sword-breakthrough sword-charge';scene.setAttribute('aria-hidden','false');$('#tribulationCharacter').src=characterAsset();$('#tribulationCharacter').alt='淬劍中的修士';$('#tribulationSceneRealm').textContent=`${nextRealm}・本命劍蛻變`;$('#tribulationSceneText').textContent='百戰磨鋒，天地淬劍';$('#swordRealmMarkText').textContent=nextRealm;
  scene.classList.add(`sword-path-${path}`);
  const cinematic=await playSwordCinematic(scene,path);
  scheduleTribulation(()=>{scene.classList.remove('sword-charge');scene.classList.add('sword-dissolve');$('#tribulationSceneText').textContent='舊軀歸散，劍胎涅槃'},2000);
  scheduleTribulation(()=>{scene.classList.remove('sword-dissolve');scene.classList.add('sword-reforge');$('#tribulationSceneText').textContent='承天劫洗煉本命本源'},5000);
  scheduleTribulation(()=>{scene.classList.remove('sword-reforge');scene.classList.add('sword-rebirth');$('#tribulationSceneText').textContent='劫盡光凝，新劍降世'},8000);
  scheduleTribulation(()=>{scene.classList.remove('sword-rebirth');scene.classList.add('sword-final');$('#tribulationSceneText').textContent='本命劍突破大境界'},10000);
  let completed=false;const complete=()=>{
    if(completed)return;completed=true;
    if(!sessionOnline){cleanupTribulationScene();return}state.swordEssence-=cost;state.swordLevel=next;if(path!=='unmarked'&&!state.swordPathMarks.some(mark=>mark.level===next))state.swordPathMarks.push({level:next,path});applyAttributeGain(gain);syncSectTaskRouteUnlocks('sword');const labels={agility:'游影',trueQi:'元息',spiritualPower:'銳識'},gainText=Object.entries(gain).filter(([,value])=>value>0).map(([key,value])=>`${labels[key]}＋${value}`).join('・');scene.classList.add('show-result','result-success');$('#tribulationResultSeal').textContent='鋒';$('#tribulationResultTitle').textContent='本命劍突破大境界';$('#tribulationResultText').textContent=`${state.swordName||'無名靈劍'}・${realmName(state.swordLevel,swordRealms)}｜${gainText}｜${swordPaths[path].name}`;render();save();
  };
  if(cinematic){const video=$('#swordCinematicVideo');video.onended=complete;scheduleTribulation(complete,18000)}else scheduleTribulation(complete,11000);
}

function openHeroCharacterAttributes(){
  if(!isPureCultivationView()||!hasMindEmbodiment())return;
  const bagButton=$('.feature-tab[data-page="bag"]');
  currentFeature='bag';
  setFeaturePanelStandalone(false);
  $$('.feature-tab').forEach(button=>button.classList.toggle('active',button===bagButton));
  $('#featurePanel').classList.remove('feature-locked','hidden');
  $('#gameScreen').classList.add('feature-open');
  currentCharacterView='attributes';renderBagPanel('character');
}
function rewardSnapshot(){return {free:state.free,swordEssence:state.swordEssence,aura:state.aura,spiritStone:state.spiritStone,food:state.food,wood:state.wood,meteorIron:state.meteorIron,swordIntent:state.swordIntent,bodyTemper:state.bodyTemper,sectContribution:state.sectContribution,prestige:state.prestige}}
function rewardDelta(after,before){return typeof after==='bigint'||typeof before==='bigint'?toBigInt(after)-toBigInt(before):Math.max(0,Math.floor(after-before))}
function showOfflineRewards(before,seconds){
  const labels={free:'修為',swordEssence:'劍元',aura:'靈氣',spiritStone:'靈石',food:'食物',wood:'木材',meteorIron:'隕鐵',swordIntent:'劍意',bodyTemper:'淬鍊度',sectContribution:'門派貢獻',prestige:'聲望'},after=rewardSnapshot(),rows=Object.entries(labels).map(([key,label])=>[label,rewardDelta(after[key],before[key])]).filter(([,amount])=>typeof amount==='bigint'?amount>0n:amount>0);
  const hours=Math.floor(seconds/3600),minutes=Math.floor(seconds%3600/60),secs=seconds%60;$('#offlineDuration').textContent=`離線時間 ${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;
  $('#offlineRewardList').innerHTML=rows.length?rows.map(([label,amount])=>`<div><span>${label}</span><b>+${formatLargeNumber(amount)}</b></div>`).join(''):'<p>本次離線時間不足，尚未產生收益。</p>';$('#offlineModal').classList.remove('hidden');
}
function closeOfflineRewards(){
  clearTimeout(offlineRewardTimer);offlineRewardTimer=null;$('#offlineModal').classList.add('hidden');
}
function scheduleOfflineRewards(before,seconds){
  clearTimeout(offlineRewardTimer);offlineRewardTimer=setTimeout(()=>{offlineRewardTimer=null;if(sessionOnline)showOfflineRewards(before,seconds)},180);
}
async function startGame() {
  if(sessionOnline)return;finishPause();sessionOnline=true;
  await verifyAccountOwnership();if(suppressSave)return;
  const savedLast=state.lastSave||0,savedTrusted=state.lastTrustedTime||0;
  trustedClockReady=location.protocol==='file:';
  const clockOkay=await syncTrustedTime(),now=gameNow(),clockRollback=(savedTrusted&&now+120000<savedTrusted)||(savedLast&&savedLast>now+120000);
  if(clockRollback){if(state.bornAt>now)state.bornAt=now;if(state.sectJoinedAt>now)state.sectJoinedAt=now}
  ['practiceBuff','transmissionBuff'].forEach(key=>{const buff=state[key];if(!buff.active&&buff.remaining>0)state[key]={active:true,until:now+buff.remaining,remaining:0,total:buff.total||buff.remaining}});
  show('#gameScreen',true);
  state.activePath=state.activePath||state.firstPath;const ascension=normalizeAscension();startBgm(ascension.ascended&&ascension.currentRealm==='immortal'?'immortalBarren':state.firstPath?pathBgmTheme():'tutorial');
  const offlineBefore=rewardSnapshot();
  processSectYears();
  currentFeature=null;
  $('#featurePanel').classList.add('hidden');
  $('#gameScreen').classList.remove('feature-open');
  $$('.feature-tab').forEach(x=>x.classList.remove('active'));
  applyCharacterVisual();
  const away=clockOkay&&!clockRollback?Math.max(0,Math.floor((now-savedLast)/5000)):0;
  if(away>0&&state.cultivationAwakened) { const gain=state.spiritPathOpened?offlineCultivationGain(savedLast,now):0,swordGain=offlineSwordEssenceGain(away);addAura(away*auraRate());state.swordEssence+=toBigInt(swordGain);runSettlementTick(away);if(state.spiritPathOpened)addCultivation(gain,true);scheduleOfflineRewards(offlineBefore,away*5); }
  else if(clockRollback)setTimeout(()=>toast('偵測到時間異常，本次不結算離線收益'),250);
  else if(!clockOkay&&location.protocol!=='file:')setTimeout(()=>toast('無法取得可信時間，已暫停離線與每日結算'),250);
  tickStart=gameNow();processEncounterTriggers(0);render();save();syncJadeGrants();
}
function updateCreator() {
  const g=createGender==='男'?'male':'female';
  $('#createCharacter').src=appearanceAsset(createGender,createAppearance,createOutfit);
  $$('.appearance-choice').forEach((b,i)=>b.querySelector('img').src=appearanceAsset(createGender,i+1,createOutfit));
  $$('.outfit-choice').forEach((b,i)=>b.querySelector('img').src=appearanceAsset(createGender,createAppearance,i+1));
  const appearances=createGender==='男'?['清衡','鶴髮','幽煞']:['清婉','霜華','幽姬'];
  $$('.appearance-choice').forEach((b,i)=>b.querySelector('small').textContent=appearances[i]);
  const names=createGender==='男'?['青雲袍','玄劍袍','山嶽袍']:['雲水袍','月華袍','丹霞袍'];
  $$('.outfit-choice').forEach((b,i)=>b.querySelector('small').textContent=names[i]);
}
function setCreatorTab(tab){$$('[data-creator-tab]').forEach(button=>button.classList.toggle('active',button.dataset.creatorTab===tab));$$('[data-creator-panel]').forEach(panel=>panel.classList.toggle('active',panel.dataset.creatorPanel===tab))}
function randomCreatorName(){const female=['雲知月','沈清荷','白若蘭','顧靈微','蘇晚照','葉寒煙','柳含章','寧疏影'],male=['沈長風','顧玄川','白雲歸','陸清衡','江問舟','謝懷真','楚星河','葉無塵'],pool=createGender==='女'?female:male;$('#nameInput').value=pool[Math.floor(Math.random()*pool.length)];$('#nameError').textContent=''}

function swordNurtureCost(){const level=Math.max(0,state.swordNurtureLevel||0);return {iron:Math.ceil(8*Math.pow(level+1,1.35)),stone:Math.ceil(150*Math.pow(level+1,1.42)),insight:2+Math.floor(level/5)}}
function swordNurtureMax(){return Math.floor((mortalSwordMaxLevel+1)/10)}
function swordNurtureLimit(){return Math.min(swordNurtureMax(),1+Math.floor((state.swordTrialWins||0)/10))}
function swordTrialReferencePower(stage){const core={rootBone:5,trueQi:5,physique:5,agility:5,spiritualPower:5},level=Math.max(0,Math.min(maxSwordLevel,stage-1));for(let current=1;current<=level;current++)sumGrowth(core,swordAttributeGain(current));return Object.entries(combatPowerWeights).reduce((sum,[key,weight])=>sum+core[key]*weight,0)}
function swordTrialPower(stage){
  const level=Math.max(0,Math.min(mortalSwordMaxLevel,stage-1)),progress=level/mortalSwordMaxLevel;
  // 試劍境前期沿用淬劍成長作為基準；越往後，幻影會逐關累積實戰壓力，避免高關仍停在線性白值。
  const stagePressure=Math.pow(1.03,level),baseFactor=.8+progress*.15,milestoneFactor=stage%10===0?1.1:1;
  return Math.ceil((swordTrialReferencePower(stage)*baseFactor*stagePressure*milestoneFactor)/5)*5;
}
function swordTrialIntentReward(stage){return stage%10===0?3:0}
function swordTechniquesForEmbryo(embryo=state.swordEmbryo){return swordTechniqueCatalog.filter(move=>move.embryo===embryo).sort((a,b)=>a.order-b.order)}
function bodyTechniques(){return [startingTechniques.find(move=>move.id==='body-origin'),...bodyTechniqueCatalog].filter(Boolean)}
function bodyTechniqueUnlocked(move){return !!state.bodyPathOpened&&(state.bodyLevel||0)>=(move?.unlockLevel||0)}
function highestBodyTechnique(){return bodyTechniques().filter(bodyTechniqueUnlocked).sort((a,b)=>(b.unlockLevel||0)-(a.unlockLevel||0))[0]||null}
function ensureBodyTrialTechnique(){const equipped=(state.swordMoves||[]).map(combatTechniqueById).filter(Boolean);if(equipped.some(move=>move.kind==='body'))return false;const highest=highestBodyTechnique();if(!highest)return false;state.swordMoves=[highest.id,...(state.swordMoves||[]).filter(id=>id!==highest.id)].slice(0,2);save();return highest}
function swordTechniqueUnlockStage(id){return swordTechniqueCatalog.find(move=>move.id===id)?.order===2?20:0}
function swordTechniqueUnlocked(id){const move=swordTechniqueCatalog.find(item=>item.id===id);return !!move&&move.embryo===state.swordEmbryo&&(state.swordTrialWins||0)>=swordTechniqueUnlockStage(id)}
function learnedSectSkills(){return (state.learnedSectMoves||[]).filter(move=>move.kind==='sectSkill')}
function combatTechniqueById(id){return startingTechniques.find(move=>move.id===id)||bodyTechniqueCatalog.find(move=>move.id===id)||swordTechniqueCatalog.find(move=>move.id===id)||learnedSectSkills().find(move=>move.id===id)}
function combatTechniqueAvailable(move){return !!move&&(move.kind==='sectSkill'?learnedSectSkills().some(art=>art.id===move.id):move.kind==='body'?bodyTechniqueUnlocked(move):move.id==='origin'?!!state.spiritPathOpened:swordTechniqueUnlocked(move.id))}
function equippedCombatTechniques(){return (state.swordMoves||['origin']).map(combatTechniqueById).filter(combatTechniqueAvailable).slice(0,2)}
async function chooseSwordEmbryo(id){
  const embryo=swordEmbryos[id];if(!embryo||state.swordEmbryo||!swordPathUnlocked())return;
  if(!await gameConfirm(`凝成${embryo.name}後便會與性命相連；日後若想更換，需使用稀有的「歸元鑄胚露」。\n\n${embryo.description}`,{title:'凝聚本命劍',confirmText:'確認凝劍'}))return;
  state.swordEmbryo=id;state.swordName=`${state.name||''}之劍`.slice(0,12)||'無名靈劍';const inherited=(state.swordMoves||[]).filter(moveId=>['origin','body-origin'].includes(moveId)&&combatTechniqueAvailable(combatTechniqueById(moveId)));state.swordMoves=[...inherited,swordTechniquesForEmbryo(id)[0]?.id].filter(Boolean).slice(-2);normalizeSwordPath();toast(`已凝聚${embryo.name}`);renderSwordDestination('sword');render();save();
}
function renameSword(){const input=$('#swordNameInput');if(!input||!state.swordEmbryo)return;const name=input.value.trim().slice(0,12);if(!name)return toast('請輸入劍名');state.swordName=name;toast(`本命劍定名為「${name}」`);renderSwordDestination('sword');save()}
function nurtureSword(){
  if(!state.swordEmbryo)return toast('尚未凝聚本命劍');if(state.swordNurtureLevel>=swordNurtureMax())return toast('本命劍已養成圓滿');if(state.swordNurtureLevel>=swordNurtureLimit())return toast(`通過試劍境第 ${state.swordNurtureLevel*10} 關後開放下一階養劍`);const cost=swordNurtureCost();if(state.meteorIron<cost.iron||state.spiritStone<cost.stone||state.swordInsight<cost.insight)return toast('養劍所需的戰鬥感悟、隕鐵或靈石不足');
  state.meteorIron-=cost.iron;state.spiritStone-=cost.stone;state.swordInsight-=cost.insight;state.swordNurtureLevel++;toast(`養劍完成・本命劍提升至${state.swordNurtureLevel}階`);renderSwordDestination('sword');render();save();
}
async function chooseSwordIntent(id){
  const intent=swordIntents[id];if(!intent||state.swordIntentType||!swordIntentUnlocked())return;if(state.swordIntent<10)return toast('領悟劍意需要10點劍意');
  if(!await gameConfirm(`${intent.description}\n\n領悟後第一版本暫時無法更換。`,{title:'領悟劍意',confirmText:'領悟'}))return;state.swordIntent-=10;state.swordIntentType=id;toast(`已領悟${intent.name}`);renderSwordDestination('sword');render();save();
}
function setSwordMove(id,slot){
  const move=combatTechniqueById(id);if(!move||slot<0||slot>1)return;if(move.embryo&&move.embryo!==state.swordEmbryo)return toast(`此招只屬於${swordEmbryos[move.embryo].name}，目前尚未掌握`);if(!combatTechniqueAvailable(move))return toast(move.kind==='sectSkill'?'尚未習得此門派招式':`通過試劍境第${swordTechniqueUnlockStage(id)}關後解鎖`);state.swordMoves=[...(state.swordMoves||['origin'])];const other=slot===0?1:0;if(state.swordMoves[other]===id){const displaced=state.swordMoves[slot];state.swordMoves[slot]=id;state.swordMoves[other]=displaced;toast(`${move.name}已調整為第${slot+1}式`)}else{state.swordMoves[slot]=id;toast(`${move.name}已設為第${slot+1}式`)}renderArtsPanel('moves');save();
}
function openExperienceView(view='sword'){
  const button=$('.feature-tab[data-page="experience"]');currentFeature='experience';setFeaturePanelStandalone(false);$$('.feature-tab').forEach(item=>item.classList.toggle('active',item===button));$('#featurePanel').classList.remove('hidden','feature-locked');$('#gameScreen').classList.add('feature-open');renderExperiencePanel(view);renderSwordPathSummary();
}
function swordProgressCard(){
  const level=state.swordLevel||0,maxed=level>=mortalSwordMaxLevel,cost=maxed?null:swordReq(level),next=level+1,trialRequired=next%10===0&&(state.swordTrialWins||0)<next,ready=!maxed&&!trialRequired&&state.swordEssence>=cost;
  return `<section class="sword-progress-card"><div><small>淬劍境界</small><h2>${realmName(level,swordRealms)}</h2><span>劍元 ${formatLargeNumber(state.swordEssence||0)}${maxed?'':` / ${formatLargeNumber(cost)}`}</span><em>每5秒凝聚 ${formatLargeNumber(swordEssenceRate())} 劍元</em></div><button id="advanceSwordRealm" class="jade-button" ${maxed||!trialRequired&&!ready?'disabled':''}>${maxed?'已達最高境界':trialRequired?`前往試劍境第 ${next} 關`:`突破至${realmName(next,swordRealms)}`}</button></section>`;
}
function bindSwordProgress(){const button=$('#advanceSwordRealm');if(button)button.onclick=()=>{const next=(state.swordLevel||0)+1;if(next%10===0&&(state.swordTrialWins||0)<next)renderExperiencePanel('trial');else upgrade('sword')}}
function renderBodyExperienceView(view,inner){
  refreshBodyState();refreshBodyTrainingCharges();const injuryId=activeBodyInjury(),injury=bodyInjuries[injuryId],nextIsRealm=(state.bodyLevel+1)%10===0,sessionNeed=bodySessionNeed(),foundationRows=[['bone','筋骨'],['blood','氣血'],['organs','臟腑']];
  if(view==='passives'){inner.innerHTML=`<section class="body-passive-panel"><h2>肉身特性</h2><p>特性只由煉體境界解鎖，不讀取練氣、淬劍、功法或人物總戰力。</p><div class="body-passive-grid">${bodyRealmPassives.map((item,index)=>`<article class="${bodyPassiveUnlocked(index)?'unlocked':'locked'}"><small>${item.realm}</small><b>${item.name}</b><span>${item.description}</span><em>${bodyPassiveUnlocked(index)?'已生效':`需達${item.realm}一層`}</em></article>`).join('')}</div></section>`;return}
  if(state.bodyLevel>=mortalBodyMaxLevel){inner.innerHTML='<div class="realm-lock"><b>鎮陸・十層</b><small>凡間肉身已抵達極限；渡星、寰甲與無量境資料予以保留，待上位面內容開放後再銜接。</small></div>';return}
  if(view==='body'){
    const heal=bodyHealCost(injuryId),ready=bodyFoundationsReady();inner.innerHTML=`<section class="body-dashboard"><div class="body-seal">體</div><div><small>當前肉身</small><h2>${realmName(state.bodyLevel,bodyRealms)}</h2><p>每日取得2次鍛體時機，最多累積14次；完成筋骨、氣血與臟腑根基後方可破境。</p></div><div class="body-charge-summary"><b>鍛體時機 ${state.bodyTrainingCharges} / 14</b><small>以現實每日恢復2次，不隨5秒產出</small></div><div class="body-foundation-grid">${foundationRows.map(([key,label])=>{const value=Math.min(sessionNeed,state.bodyFoundations[key]||0);return `<span><small>${label}</small><b>${value.toFixed(1)} / ${sessionNeed}</b><i><em style="width:${value/sessionNeed*100}%"></em></i></span>`}).join('')}</div><div class="body-meter"><span>體力 <b>${Math.floor(state.bodyStamina)} / 100</b></span><i><em style="width:${Math.min(100,state.bodyStamina)}%"></em></i><small>每1分鐘恢復1點</small></div><div class="body-meter body-load"><span>肉身負荷 <b>${Math.floor(state.bodyTrainingLoad)} / 100</b></span><i><em style="width:${state.bodyTrainingLoad}%"></em></i><small>每1分鐘自然消退1點</small></div><div class="body-condition ${injury?'injured':''}"><b>${injury?injury.name:'肉身無傷'}</b><small>${injury?`${injury.description}・剩餘 ${formatDuration(state.bodyInjuryUntil-gameNow())}`:'目前可進行所有鍛體方式。'}</small>${injury?`<button id="healBodyBtn">療傷・食物 ${formatLargeNumber(heal.food)}／木材 ${formatLargeNumber(heal.wood)}</button>`:''}</div><button id="goBodyAction" class="jade-button">${!ready?'前往鍛體':nextIsRealm?'查看肉身試煉':`突破至${realmName(state.bodyLevel+1,bodyRealms)}`}</button></section>`;if(injury)$('#healBodyBtn').onclick=healBodyInjury;$('#goBodyAction').onclick=()=>!ready?renderBodyDestination('training'):nextIsRealm?renderBodyDestination('bodyTrial'):upgrade('body');return;
  }
  if(view==='training'){
    const options=bodyTrainingOptions();inner.innerHTML=`<section class="body-training-head"><h2>鍛體場</h2><p>三種鍛法各自分配根基成長；每次固定消耗1次鍛體時機。</p><div class="body-training-resources"><span><i class="body-resource-seal">日</i><small>鍛體時機</small><b>${state.bodyTrainingCharges} / 14</b><em>每日恢復2次</em></span><span><i class="body-resource-seal">體</i><small>體力</small><b>${Math.floor(state.bodyStamina)} / 100</b></span><span><i class="body-resource-seal">負</i><small>肉身負荷</small><b>${Math.floor(state.bodyTrainingLoad)} / 100</b></span><span><img src="assets/qstyle-v2/food-cutout.png" alt=""><small>食物</small><b>${formatLargeNumber(state.food)}</b></span><span><img src="assets/qstyle-v2/wood-cutout.png" alt=""><small>木材</small><b>${formatLargeNumber(state.wood)}</b></span><span><img src="assets/qstyle-v2/meteor-iron-cutout.png" alt=""><small>隕鐵</small><b>${formatLargeNumber(state.meteorIron)}</b></span></div><div class="body-foundation-grid">${foundationRows.map(([key,label])=>{const value=Math.min(sessionNeed,state.bodyFoundations[key]||0);return `<span><small>${label}</small><b>${value.toFixed(1)} / ${sessionNeed}</b><i><em style="width:${value/sessionNeed*100}%"></em></i></span>`}).join('')}</div></section><div class="body-training-grid">${Object.entries(options).map(([id,item])=>{const capacity=bodyTrainingCapacity(item),disabled=capacity<1||id==='extreme'&&injuryId==='tendon',rootText=foundationRows.map(([key,label])=>`${label}+${item.roots[key]}`).join('・');return `<article><h3>${item.name}</h3><p>${item.description}</p><small>每次：時機1・體力${item.stamina}・食物${formatLargeNumber(item.food)}・木材${formatLargeNumber(item.wood)}・隕鐵${formatLargeNumber(item.iron)}</small><b>${rootText}・負荷 ${item.load>0?'+':''}${item.load}${item.risk?`・受傷率 ${item.risk}%`:''}</b><div class="body-training-actions"><button data-body-training="${id}" ${disabled?'disabled':''}>進行一次</button><button data-body-training-batch="${id}" ${disabled?'disabled':''}>連續進行・最多${capacity}次</button></div></article>`}).join('')}</div>`;$$('[data-body-training]').forEach(button=>button.onclick=()=>trainBody(button.dataset.bodyTraining));$$('[data-body-training-batch]').forEach(button=>button.onclick=()=>trainBody(button.dataset.bodyTrainingBatch,true));return;
  }
  const target=5+Math.floor((state.bodyLevel+1)/20),requirement=bodyBreakthroughRequirement(),failures=state.bodyTrialFailures[String(state.bodyLevel+1)]||0,materialsReady=bodyBreakthroughMaterialsReady(requirement),ready=nextIsRealm&&bodyFoundationsReady()&&materialsReady;inner.innerHTML=`<section class="body-trial-card"><div class="trial-orb body-orb">守</div><h2>${nextIsRealm?`${realmName(state.bodyLevel+1,bodyRealms)}・肉身試煉`:'尚未抵達大境界關口'}</h2><p>${nextIsRealm?`撐過 ${target} 回合即可破境。突破物資只在成功時扣除，失敗不消耗。`:'小層完成三項根基後，可在肉身頁直接突破。'}</p>${requirement?`<div class="body-trial-requirements"><b>三條產線皆需 ${requirement.areaLevel} 級</b><span>食物 ${formatLargeNumber(state.food)} / ${formatLargeNumber(requirement.food)}</span><span>木材 ${formatLargeNumber(state.wood)} / ${formatLargeNumber(requirement.wood)}</span><span>隕鐵 ${formatLargeNumber(state.meteorIron)} / ${formatLargeNumber(requirement.iron)}</span><small>已失敗 ${failures} 次${failures>=2&&!injury?'・下次無傷挑戰觸發適應保護，必定撐住':'・第三次無傷挑戰可觸發適應保護'}</small></div>`:''}<strong>${!bodyFoundationsReady()?'三項根基尚未完成':!materialsReady?'產線等級或儲備物資不足':'已具備試煉資格'}</strong><button id="startBodyTrial" class="jade-button" ${ready?'':'disabled'}>承受試煉</button></section>`;$('#startBodyTrial').onclick=startBodyTrial;
}
function renderSwordPathSummary(){
  const inner=$('#experienceInner'),trialProgress=inner?.querySelector('.sword-resources span:nth-child(3) b');if(trialProgress)trialProgress.textContent=`${Math.min(state.swordTrialWins||0,swordTrialMaxStage)} / ${swordTrialMaxStage}`;if(!inner||!state.swordEmbryo||inner.querySelector('.sword-path-summary'))return;const counts=swordPathMarkCounts(),next=Math.max(10,Math.ceil(((state.swordLevel||0)+1)/10)*10),path=swordPathAlignment(next),need=swordPathExperienceNeed(next),total=Math.floor(state.righteousness+state.evilQi),anchor=inner.querySelector('.sword-dashboard,.sword-trial-card');if(!anchor)return;
  anchor.insertAdjacentHTML(anchor.classList.contains('sword-dashboard')?'afterend':'beforebegin',`<section class="sword-path-summary path-${path}"><div><small>當前劍格</small><b>${swordPathTitle()}</b><span>天罡 ${counts.righteous}・血煞 ${counts.evil}・兩儀 ${counts.balance}</span></div><div><small>下次大境界預示</small><b>${swordPaths[path].name}</b><span>正氣 ${formatLargeNumber(state.righteousness)}・邪氣 ${formatLargeNumber(state.evilQi)}・閱歷 ${formatLargeNumber(total)} / ${formatLargeNumber(need)}</span></div><p>${swordPaths[path].description}</p></section>`);
  if(state.swordTrialPendingChoice){inner.querySelector('.sword-path-summary').insertAdjacentHTML('afterend',`<section class="pending-path-choice"><b>第 ${state.swordTrialPendingChoice} 關之悟尚未定性</b><span>此選擇會影響下次大境界的劍途判定。</span><div><button data-pending-sword-path="righteous">收劍悟道</button><button data-pending-sword-path="balance">觀其生滅</button><button data-pending-sword-path="evil">吞噼幻影</button></div></section>`);$$('[data-pending-sword-path]').forEach(button=>button.onclick=()=>chooseSwordTrialPath(button.dataset.pendingSwordPath))}
}
function compactSanctumCard(path){
  const meta=cultivationPathMeta[path],opened=pathOpened(path),cost=path==='spirit'?'靜坐感氣・無材料':path==='sword'?'隕鐵 30':'食物 120';
  return `<button type="button" data-switch-path="${path}" class="compact-sanctum path-${path} ${opened?'opened':'locked'}" aria-label="${opened?`前往${meta.name}道場`:`開啟${meta.name}之路，需要${cost}`}" style="--sanctum-bg:url('${meta.scene}')"><span class="compact-sanctum-art" role="img" aria-label="${meta.name}道場"></span><span class="compact-sanctum-copy"><h2>${meta.name}之路</h2><b>${opened?pathRealmName(path):`尚未開啟・${cost}`}</b><span>${opened?pathResourceLine(path):meta.description}</span><i>${opened?'點擊傳送至此道場':'點擊查看開啟條件'}</i></span></button>`;
}
function renderCompactCultivation(inner){
  const activePath=state.activePath||state.firstPath,paths=['spirit','sword','body'].filter(path=>path!==activePath);inner.innerHTML=`<section class="compact-cultivation-head"><small>目前道場・${cultivationPathMeta[activePath]?.name||'未定'}</small><h2>兼修道場</h2><p>點擊另外兩條道路即可切換修練主場景；最初選擇仍會永久保留，不受場景切換影響。</p></section><div class="compact-sanctum-grid">${paths.map(compactSanctumCard).join('')}</div>`;
  $$('[data-switch-path]').forEach(button=>button.onclick=()=>switchCultivationScene(button.dataset.switchPath));
}
function openBodyResourceProduction(){const caveButton=$('.feature-tab[data-page="cave"]');if(!caveButton)return;toggleFeature(caveButton);renderCavePanel('production')}
function renderExperiencePanel(view='overview'){
  if(view==='overview'){currentExperienceView=view;$('#featureDescription').innerHTML='<div id="experienceInner"></div>';renderCompactCultivation($('#experienceInner'));return}
  if(view==='spiritSide'){currentExperienceView=view;$('#featureDescription').innerHTML='<div class="experience-tabs"><button data-experience-view="overview">返回兼修</button></div><div id="experienceInner"></div>';renderQiCultivation($('#experienceInner'),{side:true});$('[data-experience-view="overview"]').onclick=()=>renderExperiencePanel('overview');return}
  if(view==='mainline')view='realm';if(view==='bulkTraining')view='training';currentExperienceView=view;const bodyMode=['body','training','passives','bodyTrial'].includes(view),tabs=bodyMode?[['body','肉身'],['training','鍛體'],['passives','體魄'],['bodyTrial','試煉']]:[['realm','淬劍'],['sword','本命劍'],['trial','試劍境']];$('#featureDescription').innerHTML=`<div class="experience-road-tabs two-roads"><button data-experience-view="overview">兼修道場</button><button data-road="realm" class="${!bodyMode?'active':''}">淬劍之路</button><button data-road="body" class="${bodyMode?'active':''}">煉體之路</button></div><div class="experience-tabs ${bodyMode?'body-experience-tabs':''}">${tabs.map(([id,label])=>`<button data-experience-view="${id}" class="${id===view?'active':''}">${label}</button>`).join('')}</div><div id="experienceInner"></div>`;$$('[data-road]').forEach(button=>button.onclick=()=>renderExperiencePanel(button.dataset.road));$$('[data-experience-view]').forEach(button=>button.onclick=()=>renderExperiencePanel(button.dataset.experienceView));const inner=$('#experienceInner');
  if(bodyMode&&!state.bodyPathOpened){const missing=Math.max(0,120-state.food);inner.innerHTML=`<div class="realm-lock body-path-lock"><b>煉體之路尚未開啟</b><small>消耗食物 120，正式踏入塵軀一層；開啟後另保留30份起步口糧。</small><strong>目前 ${formatLargeNumber(state.food)} / 120${missing?`・尚缺 ${formatLargeNumber(missing)}`:'・已達開啟條件'}</strong><p>可前往「洞府 → 資源生產」，安排道童取得食物。</p><button id="openBodyPath" class="jade-button">開啟煉體之路</button><button id="goBodyResources" class="text-button">前往資源生產</button></div>`;$('#openBodyPath').onclick=()=>openCultivationPath('body');$('#goBodyResources').onclick=openBodyResourceProduction;return}
  if(!bodyMode&&!state.swordPathOpened){inner.innerHTML=`<div class="realm-lock"><b>淬劍之路尚未開啟</b><small>消耗隕鐵 30，正式踏入啟鋒一層。目前持有：${formatLargeNumber(state.meteorIron)}</small><button id="openSwordPath" class="jade-button" ${state.meteorIron<30?'disabled':''}>開啟淬劍之路</button></div>`;$('#openSwordPath').onclick=()=>openCultivationPath('sword');return}
  if(bodyMode){renderBodyExperienceView(view,inner);return}
  if(view==='realm'){inner.innerHTML=swordProgressCard();bindSwordProgress();return}
  if(!swordPathUnlocked()){inner.innerHTML=`${swordProgressCard()}<div class="realm-lock"><b>先開啟淬劍之路</b><small>踏入啟鋒一層後，即可凝聚本命劍並進入試劍境。</small></div>`;bindSwordProgress();return}
  if(view==='sword'){
    if(!state.swordEmbryo){inner.innerHTML=`<section class="sword-intro"><h2>凝聚本命劍</h2><p>選擇一枚劍胚，讓它隨你一同養成；日後可使用稀有的歸元鑄胚露重新選擇。</p><div class="sword-choice-grid">${Object.entries(swordEmbryos).map(([id,item])=>`<button data-sword-embryo="${id}"><b>${item.name}</b><span>${item.description}</span></button>`).join('')}</div></section>`;$$('[data-sword-embryo]').forEach(button=>button.onclick=()=>chooseSwordEmbryo(button.dataset.swordEmbryo));return}
    const embryo=swordEmbryos[state.swordEmbryo],cost=swordNurtureCost(),intent=swordIntents[state.swordIntentType],nurtureMax=swordNurtureMax(),nurtureLimit=swordNurtureLimit(),nurtureMilestone=state.swordNurtureLevel*10,nextNurture=state.swordNurtureLevel+1;inner.innerHTML=`<section class="sword-dashboard"><div class="sword-seal">劍</div><div class="sword-heading"><small>${embryo.name}・養劍 ${state.swordNurtureLevel} / ${nurtureMax} 階</small><h2>${state.swordName}</h2><p>${embryo.description}</p></div><div class="sword-realm-effects"><b>${swordRealmEffectText()}</b><small>劍勢只強化本命劍招；三路屬性在一般戰鬥仍完整疊加。</small></div><div class="sword-resources"><span>劍意 <b>${formatLargeNumber(state.swordIntent)}</b></span><span>戰鬥感悟 <b>${formatLargeNumber(state.swordInsight)}</b></span><span>試劍進度 <b>${state.swordTrialWins} / ${maxSwordLevel+1}</b></span></div><div class="sword-rename"><input id="swordNameInput" maxlength="12" value="${state.swordName.replace(/"/g,'&quot;')}" aria-label="本命劍名稱"><button id="renameSwordBtn">定名</button></div><div class="sword-nurture-preview"><small>下一階養劍預覽</small><b>第一式傷害累計 +${nextNurture}%・第二式傷害累計 +${(nextNurture*1.5).toFixed(1).replace('.0','')}%</b><span>並依${embryo.short}方向增加核心屬性。</span></div><button id="nurtureSwordBtn" class="jade-button" ${state.swordNurtureLevel>=nurtureLimit||state.meteorIron<cost.iron||state.spiritStone<cost.stone||state.swordInsight<cost.insight?'disabled':''}>${state.swordNurtureLevel>=nurtureMax?'本命劍養成圓滿':state.swordNurtureLevel>=nurtureLimit?`通過試劍境第 ${nurtureMilestone} 關開放下一階`:`養劍・感悟 ${formatLargeNumber(cost.insight)}／隕鐵 ${formatLargeNumber(cost.iron)}／靈石 ${formatLargeNumber(cost.stone)}`}</button></section><section class="intent-section"><h3>${intent?`已悟・${intent.name}`:'第一劍意'}</h3>${intent?`<p>${intent.description}</p>`:!swordIntentUnlocked()?`<p>需淬劍達凝魄，並通過試劍境第40關。目前劍意 ${formatLargeNumber(state.swordIntent)} / 10。</p>`:`<div class="intent-grid">${Object.entries(swordIntents).map(([id,item])=>`<button data-sword-intent="${id}" ${state.swordIntent<10?'disabled':''}><b>${item.name}</b><small>${item.description}</small></button>`).join('')}</div>`}</section>`;$('#renameSwordBtn').onclick=renameSword;$('#nurtureSwordBtn').onclick=nurtureSword;$$('[data-sword-intent]').forEach(button=>button.onclick=()=>chooseSwordIntent(button.dataset.swordIntent));return
  }
  if(view==='trial'){
    if(!state.swordEmbryo){inner.innerHTML='<div class="realm-lock"><b>尚未凝聚本命劍</b><small>凝聚劍胚後方可進入試劍境。</small></div>';return}
    const stage=(state.swordTrialWins||0)+1,finished=stage>swordTrialMaxStage,power=finished?0:swordTrialPower(stage),intentReward=finished?0:swordTrialIntentReward(stage);
    inner.innerHTML=finished?'<section class="sword-trial-card"><div class="trial-orb">成</div><h2>試劍境・前九十關全通</h2><p>凡間現有試劍關卡已全部完成。第九十關將銜接未來開放的後續境界。</p><strong>目前沒有更高關卡</strong></section>':`<section class="sword-trial-card"><div class="trial-orb">幻</div><h2>劍道幻影・第 ${stage} 關</h2><p>試劍境不受淬劍境界限制，可直接逐關挑戰至第90關；淬劍跨越大境界時，仍須通過第10、20、30……關。</p><div class="trial-power">關卡戰力・<b>${formatCombatPower(power)}</b></div><strong>首勝獎勵・戰鬥感悟 1${intentReward?`・劍意 ${intentReward}`:''}</strong><button id="startSwordTrial" class="jade-button">進入試劍境</button></section>`;
    if(!finished)$('#startSwordTrial').onclick=startSwordTrial;return
  }
  if(!state.swordEmbryo){inner.innerHTML='<div class="realm-lock"><b>尚未凝聚本命劍</b><small>凝聚劍胚後方可進入試劍境。</small></div>';return}const stage=state.swordTrialWins+1,power=swordTrialPower(stage),intentReward=swordTrialIntentReward(stage),available=stage<=Math.min(maxSwordLevel+1,(state.swordLevel||0)+1);inner.innerHTML=`<section class="sword-trial-card"><div class="trial-orb">幻</div><h2>劍道幻影・第 ${stage} 關</h2><p>本關為固定戰力，不會隨人物變強。淬劍每提升一層即可開放下一關，每逢十層突破前必須先通關。</p><div class="trial-power">關卡戰力・<b>${formatCombatPower(power)}</b></div><strong>首勝獎勵・戰鬥感悟 1${intentReward?`・劍意 ${intentReward}`:''}</strong><button id="startSwordTrial" class="jade-button" ${available?'':'disabled'}>${available?'進入試劍境':`需先將淬劍提升至 ${stage-1} 層`}</button></section>`;$('#startSwordTrial').onclick=startSwordTrial;
}

function clearSwordTrialAdvance(){clearTimeout(swordTrialAdvanceTimer);clearInterval(swordTrialCountdownTimer);swordTrialAdvanceTimer=null;swordTrialCountdownTimer=null}
async function chooseSwordTrialPath(path){
  if(swordPathChoiceConfirming||!swordPaths[path]||path==='unmarked')return;const liveChoice=battle?.mode==='swordTrial'&&battle.resolved&&battle.won,stage=liveChoice?(battle.swordTrialStage||state.swordTrialWins):state.swordTrialPendingChoice;if(!stage||stage%10!==0||state.swordTrialChoices[String(stage)])return;
  const gain=5+Math.floor(stage/10)*2,half=Math.ceil(gain/2),choiceLabel={righteous:'收劍悟道',balance:'觀其生滅',evil:'吞噼幻影'}[path],gainText=path==='righteous'?`正氣 +${gain}`:path==='evil'?`邪氣 +${gain}`:`正氣 +${half}、邪氣 +${half}`;
  swordPathChoiceConfirming=true;const confirmed=await gameConfirm(`確定選擇「${choiceLabel}」？\n\n${gainText}\n\n這將成為試劍境第 ${stage} 關的處世之悟，確定後無法更改。`,{title:'確認劍途選擇',confirmText:'凝成此悟'});swordPathChoiceConfirming=false;if(!confirmed||state.swordTrialChoices[String(stage)])return;
  if(path==='righteous')state.righteousness+=gain;else if(path==='evil')state.evilQi+=gain;else{state.righteousness+=half;state.evilQi+=half}
  state.swordTrialChoices={...state.swordTrialChoices,[String(stage)]:path};state.swordTrialPendingChoice=0;$('#swordPathChoice')?.classList.add('hidden');if($('#battleResultClose'))$('#battleResultClose').disabled=false;if(liveChoice)$('#battleResultText').textContent+=` 此戰凝成${swordPaths[path].name}之悟。`;render();if(currentFeature==='experience')renderExperiencePanel('trial');else if(currentFeature==='swordPrimary')renderPrimarySwordPanel('trial');save();
}
function canAdvanceSwordTrial(){const next=(state.swordTrialWins||0)+1;return !!state.swordEmbryo&&next<=swordTrialMaxStage}
function advanceSwordTrial(){if(!battle||battle.mode!=='swordTrial'||!battle.resolved||!battle.won||!canAdvanceSwordTrial())return;clearSwordTrialAdvance();startSwordTrial()}
function scheduleSwordTrialAdvance(){
  clearSwordTrialAdvance();const button=$('#battleResultNext');let remaining=3;button.textContent=`下一關・${remaining}秒`;
  swordTrialCountdownTimer=setInterval(()=>{remaining--;if(remaining>0)button.textContent=`下一關・${remaining}秒`},1000);
  swordTrialAdvanceTimer=setTimeout(advanceSwordTrial,3000);
}
const dedicatedBattleBackgrounds={
  swordTrial:'assets/qstyle-v2/battle-bg-sword-trial-v1.png',
  bodyTrial:'assets/qstyle-v2/battle-bg-body-trial-v1.png',
  sect:'assets/qstyle-v2/battle-bg-sect-v1.png'
};
function setBattleBackground(type){const image=dedicatedBattleBackgrounds[type],arena=$('.battle-arena');if(arena&&image){arena.style.backgroundImage=`linear-gradient(#edf5ef42,#e4ddca24),url('${image}')`;arena.style.setProperty('background-position','center bottom','important')}}
function startSwordTrial(){
  clearSwordTrialAdvance();
  if((state.swordTrialWins||0)>=swordTrialMaxStage)return toast('試劍境前九十關已全數通關');
  const stage=(state.swordTrialWins||0)+1;if(!state.swordEmbryo||stage>swordTrialMaxStage)return toast('目前試劍境關卡尚未開放');clearTimeout(battleTimer);startBgm('swordTrial');const player=battlePlayerStats(),generated=npcCoreFromPower(swordTrialPower(stage),{id:900000+stage,seedScope:'sword-trial'}),core=generated.core,enemy={combatPower:generated.combatPower,core,maxHp:combatHealth(core.rootBone),attack:Math.max(12,core.trueQi*5),defense:Math.max(0,core.physique*20),evasion:combatEvasion(core.agility),accuracy:combatAccuracy(core.spiritualPower),crit:combatCritical(core.spiritualPower)};
  battle={active:true,resolved:false,mode:'swordTrial',round:1,completedRounds:0,playerMoveIndex:0,player:{...player,hp:player.maxHp},enemy:{...enemy,hp:enemy.maxHp,name:'劍道幻影',npc:{id:`sword-trial-${state.swordTrialWins}`},race:'human'},logs:[]};$('#battleModal').classList.remove('hidden');$('#battleStage').classList.remove('hidden');$('#battleResult').classList.add('hidden');setBattleBackground('swordTrial');$('#playerSilhouette').className=`battle-silhouette ${state.gender==='女'?'silhouette-player-female':'silhouette-player-male'}`;$('#enemySilhouette').className='battle-silhouette silhouette-human';$('#battlePlayerName').textContent=state.name;$('#battleEnemyName').textContent='劍道幻影';$('#battleLog').innerHTML=`<p><b>${state.name}</b>執起本命劍「${state.swordName}」，劍道幻影應念而生。</p>`;syncBattleWeapon();updateBattleUi();battleTimer=setTimeout(playerBattleTurn,700);
}
function startBodyTrial(){
  refreshBodyState();const nextLevel=state.bodyLevel+1,nextIsRealm=nextLevel%10===0,requirement=bodyBreakthroughRequirement(nextLevel);if(!nextIsRealm||!bodyFoundationsReady()||!bodyBreakthroughMaterialsReady(requirement))return toast('根基、產線等級或突破物資尚未備妥');const autoEquipped=ensureBodyTrialTechnique();clearTimeout(battleTimer);startBgm('bodyTrial');const player=bodyTrialPlayerStats(),targetRounds=5+Math.floor(nextLevel/20),enemy=bodyTrialEnemyStats(player,targetRounds),failures=state.bodyTrialFailures[String(nextLevel)]||0,guaranteed=failures>=2&&!activeBodyInjury();
  battle={active:true,resolved:false,mode:'bodyTrial',round:1,completedRounds:0,targetRounds,bodyTrialLevel:nextLevel,bodyRequirement:requirement,guaranteedBodyTrial:guaranteed,playerMoveIndex:0,player:{...player,hp:player.maxHp},enemy:{...enemy,hp:enemy.maxHp,name:'煉體試煉化身',npc:{id:`body-trial-${state.bodyLevel}`},race:'human'},logs:[]};$('#battleModal').classList.remove('hidden');$('#battleStage').classList.remove('hidden');$('#battleResult').classList.add('hidden');setBattleBackground('bodyTrial');$('#playerSilhouette').className=`battle-silhouette ${state.gender==='女'?'silhouette-player-female':'silhouette-player-male'}`;$('#enemySilhouette').className='battle-silhouette silhouette-human';$('#battlePlayerName').textContent=state.name;$('#battleEnemyName').textContent='煉體試煉化身';$('#battleLog').innerHTML=`<p><b>${state.name}</b>踏入試煉，必須以肉身撐過 ${targetRounds} 回合。${autoEquipped?`未裝配肉身招式，已自動將「${autoEquipped.name}」設為第一式。`:''}${guaranteed?'前兩次失敗已使肉身適應此境威壓，本次必能守住最後一息。':''}</p>`;syncBattleWeapon();updateBattleUi();battleTimer=setTimeout(playerBattleTurn,700);
}

const divineRoamingStoneCost=20000,divineRoamingJadeCost=35,mindEmbodimentJadeCost=15,divineRoamingAttemptMs=900000;
function divineRoamingDaily(){const today=dateKey()||new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei'}).format(new Date());if(state.divineRoamingDay!==today){state.divineRoamingDay=today;state.divineRoamingUsed=0}return {used:Math.max(0,state.divineRoamingUsed||0),remaining:Math.max(0,100-(state.divineRoamingUsed||0))}}
function divineRoamingRate(attempt){return attempt<=50?1:attempt<=75?.5:.1}
function addDivineHarvest(key,name,amount,type='state'){if(!amount)return;const harvest=state.divineRoamingHarvest||(state.divineRoamingHarvest={}),id=`${type}:${key}`;harvest[id]=harvest[id]||{key,name,type,amount:0};harvest[id].amount+=amount}
function rollDivineRoamingDrop(stage,rate){const roll=(chance,fn)=>Math.random()<chance*rate&&fn(),range=(min,max)=>min+Math.floor(Math.random()*(max-min+1)),giveMain=()=>{const picked=mainlineMaterials[Math.floor(Math.random()*mainlineMaterials.length)];addDivineHarvest(`mainlineMaterial_${picked[1]}`,picked[0],1)};roll(1,giveMain);if(stage.id%2)roll(.35,giveMain);const tierName=tierMaterials[stage.realm-1];roll(stage.id%2?.3:.75,()=>addDivineHarvest(tierName,tierName,1,'loot'));if(stage.id%2===0)roll(.15,()=>addDivineHarvest(tierName,tierName,1,'loot'));const bias=stage.id>=17?Math.floor(Math.random()*4):(stage.id-1)%4,pickBias=()=>Math.random()<.4?bias:[0,1,2,3].filter(x=>x!==bias)[Math.floor(Math.random()*3)],herb=mainlineBias[pickBias()];roll(stage.id%2?.55:.4,()=>addDivineHarvest(herb[1],herb[1],1,'loot'));roll(stage.id%2?.55:.4,()=>{const name=mainlineBias[pickBias()][2];addDivineHarvest(craftingMaterialCountByName[name],name,1)});roll(stage.id===17?.45:stage.id===18?.7:stage.id%2?.3:.6,()=>addDivineHarvest(craftingMaterialCountByName['丹砂'],'丹砂',1));roll(1,()=>addDivineHarvest(`tribPill${stage.realm}`,`${spiritRealms[stage.realm-1]}丹`,range(1,2)));const bag=mainlineBagRanges[stage.id-1];[['mainlineSpiritStoneBag','靈石袋',1,bag[0]*3,bag[1]*3],['mainlineWoodBag','木材袋',.75,bag[2],bag[3]],['mainlineIronBag','隕鐵袋',.6,bag[4],bag[5]],['mainlineFoodBag','食物袋',.75,bag[6],bag[7]]].forEach(([key,name,chance,min,max])=>roll(chance,()=>addDivineHarvest(key,name,range(min,max))));roll(stage.id===18?.02:stage.id%2?.008:.015,()=>addDivineHarvest(`${stage.realm}階凡品裝備`,`${stage.realm}階凡品裝備`,1,'loot'));roll(stage.id===18?.0015:stage.id%2?.0005:.001,()=>addDivineHarvest(`${stage.realm}階極品裝備`,`${stage.realm}階極品裝備`,1,'loot'))}
function normalizeDivineRoamingTiming(){if((state.divineRoamingTimingVersion||0)>=2)return;const job=state.divineRoamingJob;if(job&&job.completed<job.total){const now=gameNow();job.startedAt=now;job.nextAt=now+divineRoamingAttemptMs;delete job.pendingStageId;delete job.pendingTotal}state.divineRoamingTimingVersion=2}
function processDivineRoaming(){divineRoamingDaily();let job=state.divineRoamingJob,changed=false,guard=0;const now=gameNow();while(job&&job.completed<job.total&&now>=job.nextAt&&guard++<100){const boundary=job.nextAt,stage=mortalMainline[job.stageId-1],attempt=(state.divineRoamingUsed||0)+1;rollDivineRoamingDrop(stage,divineRoamingRate(attempt));state.divineRoamingUsed=attempt;job.completed++;changed=true;if(job.returnRequested){job.total=job.completed;job.finishedAt=boundary;delete job.returnRequested;delete job.pendingStageId;delete job.pendingTotal}else if(job.pendingStageId){const target=job.pendingStageId,available=Math.max(0,100-state.divineRoamingUsed),total=Math.min(Math.max(0,Math.floor(job.pendingTotal||0)),available);if(total>0)state.divineRoamingJob={stageId:target,total,completed:0,startedAt:boundary,nextAt:boundary+divineRoamingAttemptMs};else{job.completed=job.total;job.finishedAt=boundary;delete job.pendingStageId;delete job.pendingTotal}}else if(job.completed>=job.total)job.finishedAt=boundary;else job.nextAt=boundary+divineRoamingAttemptMs;job=state.divineRoamingJob}if(changed)save();return changed}
function divineRoamingStatus(){processDivineRoaming();const job=state.divineRoamingJob;if(!job)return '神念歸體・目前閒置';const stage=mortalMainline[job.stageId-1];if(job.completed>=job.total)return `${stage.name}遠遊完成・${job.completed}/${job.total}`;const pending=job.returnRequested?'・本次結束後神念回歸':job.pendingStageId?`・本次結束後轉往${mortalMainline[job.pendingStageId-1].name}`:'';return `正遠遊${stage.name}・${job.completed}/${job.total}${pending}`}
function divineRoamingActive(){processDivineRoaming();const job=state.divineRoamingJob;return !!job&&job.completed<job.total}
function requestDivineReturn(){processDivineRoaming();const job=state.divineRoamingJob;if(!job||job.completed>=job.total)return toast('神念目前已經歸體');if(job.returnRequested)return toast('已在等待本次遠遊結束');job.returnRequested=true;delete job.pendingStageId;delete job.pendingTotal;save();const selected=+$('.divine-roaming-window[data-divine-selected-stage]')?.dataset.divineSelectedStage;if(selected)openDivineRoamingStage(selected);else openDivineHarvest();toast('已傳念召回・本次結束後神念回歸')}
function divineRoamingTimerState(){const job=state.divineRoamingJob,active=job&&job.completed<job.total;if(!active)return {active:false,remaining:0,percent:100};const remaining=Math.max(0,job.nextAt-gameNow()),percent=Math.max(0,Math.min(100,(divineRoamingAttemptMs-remaining)/divineRoamingAttemptMs*100));return {active:true,remaining,percent}}
function divineRoamingClock(ms){const seconds=Math.max(0,Math.ceil(ms/1000)),minutes=Math.floor(seconds/60);return `${String(minutes).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`}
function openDivineRoamingUnlock(){if(state.spiritLevel<40)return toast('需達化念境一層');if(state.divineRoamingUnlocked)return openDivineHarvest();let modal=$('#divineRoamingModal');if(!modal){modal=document.createElement('div');modal.id='divineRoamingModal';modal.className='divine-roaming-modal';document.body.append(modal)}modal.innerHTML=`<section class="divine-roaming-window"><button class="divine-close">×</button><h2>神念遠遊</h2><p>化念出竅，遠遊已通關的九鎖封天副本。兩種開通方式取得的功能完全相同。</p><div class="divine-unlock-grid"><article><img src="assets/qstyle-v2/spirit-stone.png"><b>靈石參悟</b><strong>${formatLargeNumber(divineRoamingStoneCost)} 靈石</strong><small>以長期開荒資源自行推演遠遊法門。</small><button id="unlockDivineStone" ${(state.spiritStone||0)>=divineRoamingStoneCost?'':'disabled'}>消耗靈石開通</button></article><article><img src="${itemCatalog.divineRoamingManual.image}"><b>神念遠遊訣</b><strong>${formatLargeNumber(divineRoamingJadeCost)} 靈玉</strong><small>於百寶樓永久限購一本，購得時立即開通。</small><button id="openDivineTreasure">前往百寶樓</button></article></div></section>`;modal.classList.add('show');modal.querySelector('.divine-close').onclick=()=>modal.classList.remove('show');$('#unlockDivineStone').onclick=()=>{if(state.spiritStone<divineRoamingStoneCost)return toast('靈石不足');state.spiritStone-=divineRoamingStoneCost;state.divineRoamingUnlocked=true;save();render();renderMainlinePage();openDivineHarvest();toast('神念遠遊已開通')};$('#openDivineTreasure').onclick=()=>{modal.classList.remove('show');openMarket();renderMarket('treasure')}}
function openDivineRoamingStage(id){if(!state.divineRoamingUnlocked)return openDivineRoamingUnlock();processDivineRoaming();const stage=mortalMainline[id-1],daily=divineRoamingDaily(),job=state.divineRoamingJob,active=job&&job.completed<job.total,sameStage=active&&job.stageId===stage.id,maxCount=Math.max(0,daily.remaining-(active?1:0)),timer=divineRoamingTimerState();let modal=$('#divineRoamingModal');if(!modal){modal=document.createElement('div');modal.id='divineRoamingModal';modal.className='divine-roaming-modal';document.body.append(modal)}modal.innerHTML=`<section class="divine-roaming-window" data-divine-selected-stage="${stage.id}" data-divine-active="${active}"><button class="divine-close">×</button><h2>${stage.name}・神念遠遊</h2><p id="divineRoamingLiveStatus">${divineRoamingStatus()}</p><div class="divine-status-grid"><span>今日已完成<b>${daily.used} / 100</b></span><span>可安排次數<b>${maxCount}</b></span><span>當前疲勞<b>${daily.used<50?'清明・100%':daily.used<75?'疲憊・50%':'衰弱・10%'}</b></span></div><div class="divine-single-timer"><span>單次剩餘時間<b id="divineRoamingTimerText">${timer.active?divineRoamingClock(timer.remaining):'尚未開始'}</b></span><div><i id="divineRoamingTimerBar" style="width:${timer.percent}%"></i></div><small>現實 15 分鐘＝遊戲 1 年</small></div><div class="divine-counts">${[[1,'1'],[10,'10'],[maxCount,maxCount]].map(([n,label],index)=>`<button data-divine-count="${n}" ${sameStage||job?.returnRequested||n<1||n>maxCount?'disabled':''}>${active?'切換後遠遊':'遠遊'} ${label} 次${index===2?'・最大':''}</button>`).join('')}</div>${active?`<button id="requestDivineReturn" class="divine-return-button" ${job.returnRequested?'disabled':''}>${job.returnRequested?'等待本次結束・神念回歸':'神念回歸'}</button>`:''}<small>${job?.returnRequested?'召回已送出，本次遠遊結算後便會回歸。':active&&!sameStage?'選定後會先完成目前這一次，再自動切換地圖。':sameStage?'目前正在此地圖遠遊；可前往其他已通關地圖安排切換。':'收益先存入遠遊臨時儲物袋，可隨時提取。'}</small></section>`;modal.classList.add('show');modal.querySelector('.divine-close').onclick=()=>modal.classList.remove('show');modal.querySelectorAll('[data-divine-count]').forEach(button=>button.onclick=()=>startDivineRoaming(stage,+button.dataset.divineCount));if($('#requestDivineReturn'))$('#requestDivineReturn').onclick=requestDivineReturn;updateDivineRoamingTimer()}
function startDivineRoaming(stage,total){processDivineRoaming();const daily=divineRoamingDaily(),job=state.divineRoamingJob,active=job&&job.completed<job.total,maxCount=Math.max(0,daily.remaining-(active?1:0));state.divineRoamingTimingVersion=2;if(active){if(job.stageId===stage.id)return toast('神念目前正在此地圖遠遊');if(total>maxCount)return toast('今日神念遠遊次數不足');job.pendingStageId=stage.id;job.pendingTotal=total;save();openDivineRoamingStage(stage.id);toast(`本次結束後將轉往${stage.name}`);return}if(total>daily.remaining)return toast('今日神念遠遊次數不足');state.divineRoamingJob={stageId:stage.id,total,completed:0,startedAt:gameNow(),nextAt:gameNow()+divineRoamingAttemptMs};save();openDivineRoamingStage(stage.id);toast(`神念已前往${stage.name}`)}
function updateDivineRoamingTimer(){const root=$('.divine-roaming-window[data-divine-selected-stage]');if(!root)return;const wasActive=root.dataset.divineActive==='true';processDivineRoaming();const job=state.divineRoamingJob,active=!!job&&job.completed<job.total;if(wasActive&&!active)return openDivineRoamingStage(+root.dataset.divineSelectedStage);root.dataset.divineActive=String(active);const timer=divineRoamingTimerState(),text=$('#divineRoamingTimerText'),bar=$('#divineRoamingTimerBar'),status=$('#divineRoamingLiveStatus');if(text)text.textContent=timer.active?divineRoamingClock(timer.remaining):'尚未開始';if(bar)bar.style.width=`${timer.percent}%`;if(status)status.textContent=divineRoamingStatus()}
function openDivineHarvest(){processDivineRoaming();const entries=Object.values(state.divineRoamingHarvest||{}),job=state.divineRoamingJob,active=job&&job.completed<job.total;let modal=$('#divineRoamingModal');if(!modal){modal=document.createElement('div');modal.id='divineRoamingModal';modal.className='divine-roaming-modal';document.body.append(modal)}modal.innerHTML=`<section class="divine-roaming-window divine-harvest-window"><button class="divine-close">×</button><h2>神念遠遊・臨時儲物袋</h2><p>${divineRoamingStatus()}・臨時袋沒有容量上限</p><div class="divine-harvest-grid">${entries.length?entries.map(x=>`<span><b>${x.name}</b><strong>× ${formatLargeNumber(x.amount)}</strong></span>`).join(''):'<small>目前尚無遠遊收益</small>'}</div><div class="divine-harvest-actions"><button id="claimDivineHarvest" ${entries.length?'':'disabled'}>提取全部收益</button>${active?`<button id="requestDivineReturn" class="divine-return-button" ${job.returnRequested?'disabled':''}>${job.returnRequested?'等待本次結束・神念回歸':'神念回歸'}</button>`:''}</div>${active?'<small>提取不會中斷遠遊；神念回歸會在本次結算後生效。</small>':''}</section>`;modal.classList.add('show');modal.querySelector('.divine-close').onclick=()=>modal.classList.remove('show');$('#claimDivineHarvest').onclick=claimDivineHarvest;if($('#requestDivineReturn'))$('#requestDivineReturn').onclick=requestDivineReturn}
function claimDivineHarvest(){const entries=Object.values(state.divineRoamingHarvest||{});if(!entries.length)return;const physicalCount=x=>x.type==='state'?x.key:productionMaterialCountByName[x.key],itemCounts=new Set(Object.values(itemCatalog).map(item=>item.count)),deltas=entries.map(x=>[physicalCount(x),x.amount]).filter(([count])=>count&&itemCounts.has(count));if(!canStoreBagCounts(deltas))return toast('角色儲物袋容量不足');entries.forEach(x=>{const count=physicalCount(x);if(count)state[count]=(state[count]||0)+x.amount;else{state.mainlineLoot=state.mainlineLoot||{};state.mainlineLoot[x.key]=(state.mainlineLoot[x.key]||0)+x.amount}});state.divineRoamingHarvest={};save();render();openDivineHarvest();toast('遠遊收益已提取至角色儲物袋')}
function renderMortalMainline(inner=$('#experienceInner')){
  const cleared=Math.max(0,state.mainlineCleared||0),available=Math.min(18,cleared+1),progressRealm=worldProgressTier();
  inner.innerHTML=`<section class="mainline-header"><div><small>九境・十八關</small><h2>九鎖封天</h2><p>每關首次通關可取得一次固定獎勵；之後可重溫完整劇情與戰鬥但不再掉落，持續取得素材需靠神念遠遊。</p></div><strong>${cleared} / 18</strong></section><div class="mainline-stage-grid">${mortalMainline.map(stage=>{const storyLocked=stage.id>available,realmLocked=stage.realm>progressRealm,locked=storyLocked||realmLocked,done=stage.id<=cleared,lockText=storyLocked?`通過第 ${stage.id-1} 關開啟`:`需任一路線達第 ${stage.realm} 境`;return `<article class="mainline-stage ${done?'cleared':''} ${locked?'locked':''}" style="--stage-bg:url('${stage.image}')"><button class="mainline-stage-entry" data-mainline-stage="${stage.id}" ${locked?'disabled':''}><span>${mainlineArcName(stage.id)}・第 ${stage.id} 關・第 ${stage.realm} 境</span><b>${stage.name}</b><small>${locked?lockText:stage.summary}</small><em>${done?'重溫劇情與戰鬥・無重複獎勵':`固定首通獎勵・共 ${mainlineFirstClearRewards[stage.id-1].length} 項`}</em><i>Boss・${stage.boss}</i></button>${done&&state.divineRoamingUnlocked?`<button class="mainline-roaming-button" data-divine-stage="${stage.id}">神念遠遊・取得素材</button>`:''}</article>`}).join('')}</div>`;
  $$('[data-mainline-stage]').forEach(button=>button.onclick=()=>openMainlineStory(+button.dataset.mainlineStage));
  $$('[data-divine-stage]').forEach(button=>button.onclick=()=>openDivineRoamingStage(+button.dataset.divineStage));
}
function renderMainlinePage(){
  if(!state.cultivationAwakened)return false;
  processDivineRoaming();const roaming=state.spiritLevel>=40?`<button id="divineRoamingHeader" type="button">${state.divineRoamingUnlocked?'遠遊臨時儲物袋':'神念遠遊'}</button>`:'<span></span>';$('#featureDescription').innerHTML=`<div class="mainline-standalone-bar"><button id="mainlineBackButton" type="button">返回修煉</button><b>九鎖封天</b>${roaming}</div><div id="mainlineStandaloneInner"></div>`;renderMortalMainline($('#mainlineStandaloneInner'));$('#mainlineBackButton').onclick=toggleMainlinePage;if($('#divineRoamingHeader'))$('#divineRoamingHeader').onclick=()=>state.divineRoamingUnlocked?openDivineHarvest():openDivineRoamingUnlock();
}
function mainlineDialogue(stage){
  const portraitFor=key=>key==='player'?mainlineProtagonistPortrait():mainlinePortraits[key]||mainlinePortraits.guardian;
  return mainlineStoryScripts[stage.id-1].map(([name,portrait,text])=>({name:name==='主角'?(state.name||'修士'):name,portrait:portraitFor(portrait),text}));
}
function openMainlineStory(id){if(!state.cultivationAwakened)return toast('完成新手教程後開啟九鎖封天');if(divineRoamingActive())return toast('神念遠遊期間無法進入副本・請先要求神念回歸');mainlineStoryStage=mortalMainline[id-1];mainlineStoryStage.replay=id<=state.mainlineCleared;mainlineStoryStep=0;startMainlineBgm(mainlineStoryStage);showMainlineDialogue()}
function showMainlineDialogue(){
  const stage=mainlineStoryStage,lines=mainlineDialogue(stage),line=lines[mainlineStoryStep];let modal=$('#mainlineStoryModal');if(!modal){modal=document.createElement('div');modal.id='mainlineStoryModal';modal.className='mainline-story-modal';document.body.append(modal)}
  modal.innerHTML=`<div class="mainline-story-scene" style="--story-bg:url('${stage.image}')"><div class="story-location"><small>${stage.replay?'重溫・':''}第 ${stage.id} 關</small><b>${stage.name}</b></div><img class="story-portrait" src="${line.portrait}" alt="${line.name}"><div class="story-dialogue"><strong>${line.name}</strong><p>${line.text}</p><button id="mainlineStoryNext">${mainlineStoryStep<lines.length-1?'繼續':stage.replay?'再次迎戰':'迎戰'}</button></div></div>`;modal.classList.add('show');$('#mainlineStoryNext').onclick=()=>{if(++mainlineStoryStep<lines.length)showMainlineDialogue();else{modal.classList.remove('show');startMainlineBattle(stage)}};
}
function showMainlineDefeatDialogue(stage){
  startMainlineBgm(stage);
  let step=0,modal=$('#mainlineStoryModal');if(!modal){modal=document.createElement('div');modal.id='mainlineStoryModal';modal.className='mainline-story-modal';document.body.append(modal)}const portraitFor=key=>key==='player'?mainlineProtagonistPortrait():mainlinePortraits[key]||mainlinePortraits.guardian,lines=mainlineDefeatScripts[stage.id-1].map(([name,portrait,text])=>({name:name==='主角'?(state.name||'修士'):name,portrait:portraitFor(portrait),text}));
  const draw=()=>{const line=lines[step];modal.innerHTML=`<div class="mainline-story-scene defeat-scene" style="--story-bg:url('${stage.image}')"><div class="story-location"><small>戰敗・第 ${stage.id} 關</small><b>${stage.name}</b></div><img class="story-portrait" src="${line.portrait}" alt="${line.name}"><div class="story-dialogue defeat-dialogue"><strong>${line.name}</strong><p>${line.text}</p><button id="mainlineStoryNext">${step<lines.length-1?'繼續':'返回結算'}</button></div></div>`;modal.classList.add('show');$('#mainlineStoryNext').onclick=()=>{if(++step<lines.length)draw();else modal.classList.remove('show')}};draw();
}
function showMainlineVictoryDialogue(stage){
  startMainlineBgm(stage);
  let step=0,modal=$('#mainlineStoryModal');if(!modal){modal=document.createElement('div');modal.id='mainlineStoryModal';modal.className='mainline-story-modal';document.body.append(modal)}const portraitFor=key=>key==='player'?mainlineProtagonistPortrait():mainlinePortraits[key]||mainlinePortraits.guardian,lines=mainlineVictoryScripts[stage.id-1].map(([name,portrait,text])=>({name:name==='主角'?(state.name||'修士'):name,portrait:portraitFor(portrait),text}));
  const replay=!!battle?.mainlineReplay,draw=()=>{const line=lines[step];modal.innerHTML=`<div class="mainline-story-scene victory-scene" style="--story-bg:url('${stage.image}')"><div class="story-location"><small>${replay?'重溫戰勝':'首次通關'}・第 ${stage.id} 關</small><b>${stage.name}</b></div><img class="story-portrait" src="${line.portrait}" alt="${line.name}"><div class="story-dialogue victory-dialogue"><strong>${line.name}</strong><p>${line.text}</p><button id="mainlineStoryNext">${step<lines.length-1?'繼續':replay?'結束重溫':'記下通關'}</button></div></div>`;modal.classList.add('show');$('#mainlineStoryNext').onclick=()=>{if(++step<lines.length)draw();else modal.classList.remove('show')}};draw();
}
function startMainlineBattle(stage){
  clearTimeout(battleTimer);startBgm('battle');const player=battlePlayerStats(),names=[...mainlineWaves[stage.id-1],stage.boss],powers=mainlineWavePowers[stage.id-1],races=mainlineWaveRaces[stage.id-1],encounters=names.map((name,index)=>{const generated=npcCoreFromPower(powers[index],{id:`mainline-${stage.id}-${index}`,seedScope:`mainline-${stage.id}-${index}`}),core=generated.core;return {name,race:races[index],combatPower:generated.combatPower,core,maxHp:combatHealth(core.rootBone),attack:Math.max(12,core.trueQi*5),defense:Math.max(0,core.physique*20),evasion:combatEvasion(core.agility),accuracy:combatAccuracy(core.spiritualPower),crit:combatCritical(core.spiritualPower),npc:{id:`mainline-${stage.id}-${index}`}}}),firstEnemy=encounters[0];battle={active:true,resolved:false,mode:'mainline',mainlineStage:stage,mainlineReplay:!!stage.replay,mainlineEncounters:encounters,waveIndex:0,mechanicTriggered:false,round:1,completedRounds:0,playerMoveIndex:0,player:{...player,hp:player.maxHp},enemy:{...firstEnemy,hp:firstEnemy.maxHp},logs:[]};$('#battleModal').classList.remove('hidden');$('#battleStage').classList.remove('hidden');$('#battleResult').classList.add('hidden');$('#playerSilhouette').className=`battle-silhouette ${state.gender==='女'?'silhouette-player-female':'silhouette-player-male'}`;$('#enemySilhouette').className=`battle-silhouette silhouette-${firstEnemy.race}`;$('#battlePlayerName').textContent=state.name;$('#battleEnemyName').textContent=firstEnemy.name;$('.battle-arena').style.backgroundImage=`linear-gradient(#edf5ef88,#e4ddca55),url('${stage.image}')`;$('#battleLog').innerHTML=`<p><b>${stage.name}</b>・${stage.replay?'重溫挑戰':'首次挑戰'}・三段遭遇・固定戰力 ${powers.map(formatCombatPower).join('／')}</p><p><b>關卡機制：</b>${mainlineMechanics[stage.id-1]}</p>`;syncBattleWeapon();updateBattleUi();battleTimer=setTimeout(playerBattleTurn,700);
}
function advanceMainlineWave(){const stage=battle.mainlineStage,next=++battle.waveIndex,template=battle.mainlineEncounters[next];battle.enemy={...template,hp:template.maxHp};battle.mechanicTriggered=false;startBgm('battle');$('#enemySilhouette').className=`battle-silhouette silhouette-${template.race}`;$('#battleEnemyName').textContent=template.name;appendBattleLog(next===2?`前路震動，Boss「${stage.boss}」現身，關卡進入最終階段。`:`精英「${template.name}」接替上陣。`,'enemy');updateBattleUi();battleTimer=setTimeout(playerBattleTurn,900)}
function setFeaturePanelStandalone(standalone){$('#featurePanel')?.classList.toggle('standalone-feature',!!standalone)}
function clearWardrobeLayers(){
  const wardrobeInner=$('#wardrobeInner'),bagInner=$('#bagInner');
  if(wardrobeInner)wardrobeInner.replaceChildren();
  if(bagInner)bagInner.replaceChildren();
}
let featureRecoveryFrame=0;
function resetFeatureContentLayer(){
  const description=$('#featureDescription');if(!description)return;
  description.classList.remove('wardrobe-cleared');description.classList.toggle('root-panel-active',currentFeature==='root');description.classList.toggle('fixed-subtabs',['root','cave','bag','sect','arts','experience'].includes(currentFeature));
  description.style.removeProperty('visibility');description.style.removeProperty('opacity');description.style.removeProperty('filter');description.style.removeProperty('transform');
}
function resetFeatureSubView(page){
  if(page==='root')currentRootView='root';else if(page==='cave'){currentCaveView='dwelling';currentStudyView='codex'}else if(page==='sect')currentSectView='home';else if(page==='arts')currentArtsView='sect';else if(page==='experience')currentExperienceView='overview';else if(page==='bag'){currentCharacterView='equipment';currentWardrobeView='outfits';bagUpgradeDetailsOpen=false}
  for(const key of interfaceScrollMemory.keys())if(key.startsWith(`${page}|`))interfaceScrollMemory.delete(key);
}
function recoverFeaturePanel(page){
  cancelAnimationFrame(featureRecoveryFrame);featureRecoveryFrame=requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const panel=$('#featurePanel'),description=$('#featureDescription');
    if(currentFeature!==page||!panel||panel.classList.contains('hidden')||!description)return;
    resetFeatureContentLayer();
    if(description.childElementCount||description.textContent.trim())return;
    if(page==='root')renderSpiritRootPanel(currentRootView||'root');
    else if(page==='cave')renderCavePanel(currentCaveView||'dwelling');
    else if(page==='bag')renderBagPanel('bag');
    else if(page==='sect')renderSectPanel(currentSectView||'home');
    else if(page==='arts')renderArtsPanel(currentArtsView||'sect');
    else if(page==='experience')renderExperiencePanel(currentExperienceView||'overview');
    else if(page==='mainline')renderMainlinePage();
    else description.textContent=descriptions[page]||'此頁面暫時無法顯示，請重新切換頁籤。';
  }));
}
function toggleFeature(button) {
  const page=button.dataset.page;
  $('#mainlineButton')?.classList.remove('active');
  if(!state.cultivationAwakened)return toast('完成新手教程、踏入聽息一層後開啟此功能');
  if(currentFeature==='bag')clearWardrobeLayers();
  if(currentFeature===page) {
    resetFeatureSubView(page);
    currentFeature=null;
    $('#featurePanel').classList.add('hidden');
    $('#gameScreen').classList.remove('feature-open');
    $$('.feature-tab').forEach(x=>x.classList.remove('active'));
    return;
  }
  if(currentFeature)resetFeatureSubView(currentFeature);
  currentFeature=page;
  setFeaturePanelStandalone(false);
  resetFeatureContentLayer();
  recoverFeaturePanel(page);
  $$('.feature-tab').forEach(x=>x.classList.toggle('active',x===button));
  if(page==='root') {
    $('#featurePanel').classList.remove('feature-locked'); renderSpiritRootPanel('root');
  } else if(page==='cave') {
    const unlocked=state.cultivationAwakened;
    $('#featurePanel').classList.toggle('feature-locked',!unlocked);
    if(unlocked)renderCavePanel('dwelling');else $('#featureDescription').innerHTML='<div class="realm-lock"><b>完成新手教程後開啟</b><small>踏入聽息一層後，即可安排道童取得開啟其他修行道路所需的資源。</small></div>';
  } else if(page==='bag') {
    $('#featurePanel').classList.remove('feature-locked'); renderBagPanel('bag');
  } else if(page==='sect') {
    $('#featurePanel').classList.remove('feature-locked'); renderSectPanel('home');
  } else if(page==='arts') {
    $('#featurePanel').classList.remove('feature-locked');renderArtsPanel('sect');
  } else if(page==='experience') {
    $('#featurePanel').classList.remove('feature-locked');renderExperiencePanel('overview');
  } else {
    $('#featurePanel').classList.remove('feature-locked');
    $('#featureDescription').textContent=descriptions[page];
  }
  $('#featurePanel').classList.remove('hidden');
  $('#gameScreen').classList.add('feature-open');
  resetFeatureContentLayer();
  playEntrance($('#featurePanel'));
}

function toggleMainlinePage(){
  const button=$('#mainlineButton');
  if(!state.cultivationAwakened)return toast('完成新手教程、踏入聽息一層後開啟九鎖封天');
  if(currentFeature==='mainline'){currentFeature=null;setFeaturePanelStandalone(false);button.classList.remove('active');$('#featurePanel').classList.add('hidden');$('#gameScreen').classList.remove('feature-open');startPathBgm();return}
  currentFeature='mainline';setFeaturePanelStandalone(true);resetFeatureContentLayer();recoverFeaturePanel('mainline');$$('.feature-tab').forEach(x=>x.classList.remove('active'));button.classList.add('active');$('#featurePanel').classList.remove('feature-locked','hidden');renderMainlinePage();$('#gameScreen').classList.add('feature-open');resetFeatureContentLayer();playEntrance($('#featurePanel'));
}

function textSeed(text){return [...text].reduce((sum,char,index)=>sum+char.charCodeAt(0)*(index+3),0)}
function sectTechniqueSet(sect=state.sect,star=state.sectStar){
  const override=sectTechniqueOverrides[sect];
  if(override)return override.map(([name,kind,element],index)=>{const skill=kind==='sectSkill'?sectSkillCatalog[sect]:null;return{id:`${sect}-${index}`,sourceSect:sect,name,kind,element,tier:star,level:1,slot:index,sectTechniqueVersion:3,...skill}});
  if(!sect)return[];const seed=textSeed(sect),regularKinds=['secret','formula','sutra','escape'],first=regularKinds[(seed+star)%regularKinds.length],second=regularKinds[(seed+star+1+(seed%2))%regularKinds.length],used=[first,second],remainingRegular=regularKinds.filter(kind=>!used.includes(kind));
  const group=sectCatalog.find(entry=>entry.star===star&&[...entry.good,...entry.evil].includes(sect)),good=group?.good.includes(sect),pool=good?group?.good:group?.evil,index=pool?.indexOf(sect)??-1,rareIndex=pool?.length?(star-1)%pool.length:-2,rareKind=star%2===1?(good?'ultimate':'fragment'):(good?'fragment':'ultimate'),third=index===rareIndex?rareKind:remainingRegular[(seed+star)%remainingRegular.length],picked=[first,second,third];
  const suffix={secret:'玄錄',formula:'命篇',sutra:'體典',escape:'行章',ultimate:'悟卷',fragment:'天箋'},clean=sect.replace(/(仙宮|神宗|聖宗|天宗|劍宗|魔宗|宗|派|門|宮|谷|堂|殿|樓|府|院|山|庭|教|寨|幫|觀|閣|都|海)$/,'');
  return picked.map((kind,index)=>{const element=artElements[(seed+index*star+index)%artElements.length][0],name=`${clean}${suffix[kind]}`;return{id:`${sect}-${index}`,sourceSect:sect,name,kind,element,tier:star,level:1,slot:index,sectTechniqueVersion:3}})
}
function sectTechniqueReplacement(art){if(!art?.sourceSect)return null;const group=sectCatalog.find(entry=>[...entry.good,...entry.evil].includes(art.sourceSect));return group?sectTechniqueSet(art.sourceSect,group.star).find(item=>item.id===art.id)||null:null}
function sectTechniqueChanged(art,replacement=sectTechniqueReplacement(art)){return !!replacement&&['name','kind','element','tier'].some(key=>art[key]!==replacement[key])}
function normalizeLearnedArts(){const existing=Array.isArray(state.learnedArts)?state.learnedArts:[],moves=[...(Array.isArray(state.learnedSectMoves)?state.learnedSectMoves:[]),...existing.filter(art=>art.kind==='sectSkill')];state.learnedSectMoves=Array.from(new Map(moves.map(move=>{const expected=sectTechniqueReplacement(move);return [move.id,expected?.kind==='sectSkill'?{...expected,level:1,legacySectTechnique:false}:{...move,level:1,legacySectTechnique:false}]})).values());state.learnedArts=existing.filter(art=>art.kind!=='sectSkill').map(art=>{if(!art.sourceSect)return art;const expected=sectTechniqueReplacement(art),level=Math.max(1,Math.min(10,art.level||1));if(!expected)return {...art,level};if((art.sectTechniqueVersion||1)<3&&sectTechniqueChanged(art,expected))return {...art,level,legacySectTechnique:true};return {...expected,level,legacySectTechnique:false}});state.learnedBookIds=Array.from(new Set([...(state.learnedBookIds||[]),...state.learnedArts.filter(art=>art.source==='book').map(art=>art.id)]));state.swordMoves=(state.swordMoves||['origin']).filter(id=>combatTechniqueById(id)).slice(0,2);if(!state.swordMoves.length)state.swordMoves=['origin']}
function sectLearnLimit(){return state.sectRank>=2?3:state.sectRank>=1?2:1}
function artUpgradeCost(art){return Math.round(500*art.tier*art.tier*Math.pow(1.5,art.level-1))}
function artsExpandCost(){return Math.round(1000*Math.pow(1.28,Math.max(0,state.artsCapacity-8)))}
const artElementOrder=Object.fromEntries(artElements.map(([element],index)=>[element,index]));
function sortLearnedArts(arts){return [...arts].sort((a,b)=>(Number(a.tier)||0)-(Number(b.tier)||0)||(artElementOrder[a.element]??99)-(artElementOrder[b.element]??99)||String(a.name||'').localeCompare(String(b.name||''),'zh-Hant'))}
function artCard(art){
  const kind=artKinds[art.kind],element=artElements.find(([key])=>key===art.element),cost=art.level<10?artUpgradeCost(art):0,tier=['一','二','三','四','五','六','七','八','九'][art.tier-1],sharp=artSecondarySpiritualPower(art),legacy=!!art.legacySectTechnique&&sectTechniqueChanged(art);
  if(art.kind==='sectSkill')return `<article class="art-card sect-skill-card${legacy?' legacy-sect-art':''}"><span class="art-element">招</span><div><b>${tier}階・${art.name}${legacy?'<em class="legacy-art-badge">舊傳承</em>':''}</b><p>傷害 ${art.basePercent}%＋${art.attributeLabel}×${art.attributeMultiplier}・可於招式頁裝配</p></div><div class="art-actions">${legacy?`<button class="convert-art" data-art-convert="${art.id}">免費轉換</button>`:''}<button class="forget-art" data-art-forget="${art.id}">遺忘</button></div></article>`;
  return `<article class="art-card element-${art.element}${legacy?' legacy-sect-art':''}"><span class="art-element">${element[1]}</span><div><b>${tier}階・${art.name}（${art.level}級）${legacy?'<em class="legacy-art-badge">舊傳承</em>':''}</b><p>${kind.label}+${artBaseEffect(art)}（${element[1]}系靈根效果+${artRootEffect(art)}）${sharp?`・銳識+${sharp}`:''}</p></div><div class="art-actions"><button data-art-upgrade="${art.id}" data-art-cost="${cost}" ${art.level>=10||state.aura<cost?'disabled':''}>${art.level>=10?'已滿級':`升級<br><small>${formatLargeNumber(cost)} 靈氣</small>`}</button>${legacy?`<button class="convert-art" data-art-convert="${art.id}">免費轉換</button>`:''}${art.sourceSect?`<button class="forget-art" data-art-forget="${art.id}">遺忘</button>`:''}</div></article>`
}
function renderSwordMoves(inner){
  const equipped=(state.swordMoves||[]).map(combatTechniqueById),known=[...startingTechniques,...bodyTechniqueCatalog,...swordTechniqueCatalog,...learnedSectSkills()].filter(combatTechniqueAvailable);
  const moveCard=move=>`<article class="origin-move-card ${move.kind||'spirit'}-move-card"><header><b>${move.name}</b><em>${move.kind==='sectSkill'?`${move.sourceSect}門派招式`:move.kind==='body'?'煉體架式':move.embryo?`${swordEmbryos[move.embryo].short}劍招`:'練氣入道招'}</em></header><p>${move.kind==='sectSkill'?`以${move.attributeLabel}轉化為純粹殺傷，不附加其他效果。`:move.description}</p><strong>${move.kind==='sectSkill'?`傷害 ${move.basePercent}%＋${move.attributeLabel}×${move.attributeMultiplier}`:`傷害 ${Math.round(move.min*100)}%～${Math.round(move.max*100)}%${move.kind==='body'?`・${move.effect}`:''}`}</strong><small>已掌握・可跨系自由裝配</small><div><button data-equip-move="${move.id}" data-slot="0" ${state.swordMoves?.[0]===move.id?'disabled':''}>設為第一式</button><button data-equip-move="${move.id}" data-slot="1" ${state.swordMoves?.[1]===move.id?'disabled':''}>設為第二式</button></div></article>`;
  inner.innerHTML=`<section class="move-loadout"><h2>三途出戰招式</h2><div class="equipped-moves"><span>第一式・<b>${equipped[0]?.name||'未裝配'}</b></span><span>第二式・<b>${equipped[1]?.name||'未裝配'}</b></span></div><p>已開啟道路的招式可跨系混裝，戰鬥時依第一式、第二式循環施展；兼修只增加選擇，不會取代原有招式。</p></section><div class="sword-move-grid">${known.map(moveCard).join('')}</div>`;
  $$('[data-equip-move]').forEach(button=>button.onclick=()=>setSwordMove(button.dataset.equipMove,+button.dataset.slot));
}
function renderArtsPanel(view='sect',preserveScroll=false){
  if(view==='books')view='secret';
  currentArtsView=view;
  const description=$('#featureDescription'),savedScrollTop=preserveScroll?description.scrollTop:0,savedScrollLeft=preserveScroll?description.scrollLeft:0,savedTabScroll=preserveScroll?description.querySelector('.arts-book-tabs')?.scrollLeft||0:0;
  const learned=state.learnedArts||[],sectLearned=sortLearnedArts(learned.filter(art=>art.sourceSect)),cap=state.artsCapacity||8,expand=artsExpandCost();
  const selectedBookKind=artBookTabs.some(([key])=>key===view)?artKinds[view]:null,selectedBookArts=selectedBookKind?learned.filter(art=>art.kind===view):[],selectedBookBase=selectedBookArts.reduce((sum,art)=>sum+artBaseEffect(art),0),selectedBookElementBonus=selectedBookArts.reduce((sum,art)=>sum+artRootEffect(art),0),selectedBookTotal=selectedBookBase+selectedBookElementBonus;
  const wallet=view==='moves'?'':`<div class="arts-wallet"><span id="artsAuraAmount">當前靈氣 ${formatLargeNumber(state.aura)}</span>${selectedBookKind?`<span class="arts-kind-total">${selectedBookKind.tab}累積${selectedBookKind.label} ${formatLargeNumber(selectedBookTotal)}<small>功法 ${formatLargeNumber(selectedBookBase)}＋五行加成 ${formatLargeNumber(selectedBookElementBonus)}</small></span>`:''}${view==='sect'?`<span>門派功法 ${sectLearned.length} / ${cap}</span>${cap<40?`<button id="expandArtsBtn" ${state.spiritStone>=expand?'':'disabled'}>擴充一格・${formatLargeNumber(expand)}靈石</button>`:'<b>已達40格上限</b>'}`:''}</div>`;
  const bookView=artBookTabs.some(([key])=>key===view),subTabs=bookView?`<div class="arts-book-tabs">${artBookTabs.map(([key,label])=>`<button data-art-view="${key}" class="${key===view?'active':''}">${label}</button>`).join('')}</div>`:'';
  description.innerHTML=`<div class="arts-main-tabs">${artMainTabs.map(([key,label])=>`<button data-art-view="${key}" class="${key===view||(key==='books'&&bookView)?'active':''}">${label}</button>`).join('')}</div>${subTabs}${wallet}<div id="artsInner"></div>`;
  $$('[data-art-view]').forEach(button=>button.onclick=()=>renderArtsPanel(button.dataset.artView));const bookTabs=$('.arts-book-tabs');if(bookTabs){bookTabs.addEventListener('wheel',event=>{if(Math.abs(event.deltaY)<=Math.abs(event.deltaX))return;bookTabs.scrollLeft+=event.deltaY;event.preventDefault()},{passive:false});const activeBook=bookTabs.querySelector('.active');if(activeBook)bookTabs.scrollLeft=activeBook.offsetLeft-bookTabs.offsetLeft-(bookTabs.clientWidth-activeBook.clientWidth)/2}if(view==='sect'&&cap<40)$('#expandArtsBtn').onclick=expandArtsCapacity;
  const inner=$('#artsInner');if(view==='moves'){renderSwordMoves(inner);return}const list=view==='sect'?sectLearned:sortLearnedArts(learned.filter(art=>!art.sourceSect&&art.kind===view));inner.innerHTML=list.length?`<div class="art-list">${list.map(artCard).join('')}</div>${view==='sect'?`<div class="arts-total">門派技能總計：${Object.values(artKinds).filter(kind=>kind.attribute).map(kind=>`${kind.label}+${sectLearned.filter(art=>artKinds[art.kind].attribute===kind.attribute).reduce((sum,art)=>sum+artTotalEffect(art),0).toLocaleString()}`).join('・')}</div>`:''}`:`<div class="arts-empty"><b>${view==='sect'?'門派功法':artBookTabs.find(([key])=>key===view)[1]}尚無功法</b><small>${view==='sect'?'可於目前門派的傳功殿學習功法。':'可於藏經閣購得相應功法書，並在儲物袋中使用習得。'}</small></div>`;
  $$('[data-art-upgrade]').forEach(button=>button.onclick=()=>upgradeArt(button.dataset.artUpgrade,view));$$('[data-art-convert]').forEach(button=>button.onclick=()=>convertSectArt(button.dataset.artConvert,view));$$('[data-art-forget]').forEach(button=>button.onclick=()=>forgetArt(button.dataset.artForget,view));
  if(preserveScroll){description.scrollTop=savedScrollTop;description.scrollLeft=savedScrollLeft;if(bookTabs)bookTabs.scrollLeft=savedTabScroll}
}
function upgradeArt(id,view){const art=state.learnedArts.find(item=>item.id===id);if(!art||art.level>=10)return;const cost=artUpgradeCost(art);if(state.aura<cost)return toast('靈氣不足');state.aura-=cost;art.level++;const newlyMastered=allBookArtsMastered()&&!(state.unlockedTitles||[]).includes('all-arts-master');syncTitleUnlocks();toast(newlyMastered?'萬法圓滿・獲得稱號「萬法歸宗」・道悟與天契永久＋500':`${art.name}提升至${art.level}級`);renderArtsPanel(view,true);render();save()}
async function convertSectArt(id,view='sect'){const index=state.learnedArts.findIndex(item=>item.id===id),oldArt=state.learnedArts[index],replacement=sectTechniqueReplacement(oldArt);if(index<0||!oldArt?.legacySectTechnique||!sectTechniqueChanged(oldArt,replacement))return;const oldKind=artKinds[oldArt.kind],newKind=artKinds[replacement.kind],oldElement=artElements.find(([key])=>key===oldArt.element)?.[1]||'',newElement=artElements.find(([key])=>key===replacement.element)?.[1]||'',accepted=await gameConfirm(`確定將舊傳承「${oldArt.name}」免費轉換為「${replacement.name}」？\n\n轉換前：${oldElement}系・${oldKind.tab}・${oldKind.label}\n轉換後：${newElement}系・${newKind.tab}・${newKind.label}\n\n保留：${['一','二','三','四','五','六','七','八','九'][replacement.tier-1]}階、${oldArt.level}級\n轉換後無法恢復舊傳承。`,{title:'免費轉換門派功法',confirmText:'確認轉換'});if(!accepted)return;state.learnedArts[index]={...replacement,level:oldArt.level,legacySectTechnique:false};toast(`已轉換為${replacement.name}・保留${oldArt.level}級`);renderArtsPanel(view);render();save()}
async function forgetArt(id,view='sect'){const index=state.learnedArts.findIndex(item=>item.id===id);if(index<0)return;const art=state.learnedArts[index],kind=artKinds[art.kind],skill=art.kind==='sectSkill',lost=skill?0:artTotalEffect(art),sharp=skill?0:artSecondarySpiritualPower(art),warning=skill?'遺忘後將無法在戰鬥招式中裝配，重新加入原門派並達到學習職位後可再次習得。':`將失去 ${kind.label}+${lost.toLocaleString()}${sharp?`、銳識+${sharp.toLocaleString()}`:''}，已投入的靈氣不會返還。`;if(!await gameConfirm(`確定遺忘「${art.name}」？\n${warning}`,{title:'遺忘功法',confirmText:'確認遺忘',danger:true}))return;state.learnedArts.splice(index,1);state.swordMoves=(state.swordMoves||[]).filter(moveId=>moveId!==id);if(!state.swordMoves.length)state.swordMoves=['origin'];toast(`已遺忘${art.name}${skill?'':`・${kind.label}-${lost}${sharp?`・銳識-${sharp}`:''}`}`);renderArtsPanel(view);render();save()}
function updateArtsLive(){if(currentFeature!=='arts')return;const amount=$('#artsAuraAmount');if(amount)amount.textContent=`當前靈氣 ${formatLargeNumber(state.aura)}`;$$('[data-art-upgrade]').forEach(button=>{const art=state.learnedArts.find(item=>item.id===button.dataset.artUpgrade);button.disabled=!art||art.level>=10||state.aura<+button.dataset.artCost})}
function expandArtsCapacity(){if(state.artsCapacity>=40)return;const cost=artsExpandCost();if(state.spiritStone<cost)return toast('靈石不足');state.spiritStone-=cost;state.artsCapacity++;toast(`門派功法格擴充至${state.artsCapacity}格`);renderArtsPanel('sect');render();save()}
function renderSectLearning(){
  if(!state.sect)return toast('目前無門無派');const techniques=sectTechniqueSet(),limit=sectLearnLimit(),learned=state.learnedArts||[],sectLearned=learned.filter(art=>art.sourceSect),record=state.sectRecords?.[state.sect];refreshSectDiscovery(record);
  $('#sectInner').innerHTML=`<section class="sect-learning"><h2>${state.sect}・傳功殿</h2><p class="sect-note">門派功法統一於傳功殿受授；門派招式習得後永久保留，且不占功法格。</p><div class="learning-list">${techniques.map((art,index)=>{const skill=art.kind==='sectSkill',known=learned.some(item=>item.id===art.id)||learnedSectSkills().some(item=>item.id===art.id),rankReady=index<limit,full=!skill&&sectLearned.length>=state.artsCapacity,tier=['一','二','三','四','五','六','七','八','九'][art.tier-1],concealed=index===2&&state.sectRank<1;if(concealed)return `<article class="sect-art-concealed"><b>封存傳承</b><span>傳功殿深處似有異樣，需先在本門累積功勳、晉升內門方可查證。</span><button disabled>尚未查明</button></article>`;const detail=skill?`門派招式・傷害 ${art.basePercent}%＋${art.attributeLabel}×${art.attributeMultiplier}・不占功法格`:`${artElements.find(([key])=>key===art.element)[1]}系・${artKinds[art.kind].tab}・${artKinds[art.kind].label}+${artBaseEffect(art)}`;return `<article><b>${tier}階・${art.name}</b><span>${detail}</span><button data-learn-art="${art.id}" ${known||!rankReady||full?'disabled':''}>${known?'已習得':!rankReady?`需${index===1?'內門弟子':'親傳弟子'}`:full?'技能欄已滿':'學習'}</button></article>`}).join('')}</div></section>`;
  $$('[data-learn-art]').forEach(button=>button.onclick=()=>learnSectArt(button.dataset.learnArt));
}
function learnSectArt(id){const art=sectTechniqueSet().find(item=>item.id===id),skill=art?.kind==='sectSkill';if(!art||state.learnedArts.some(item=>item.id===id)||learnedSectSkills().some(item=>item.id===id))return;if(art.slot>=sectLearnLimit())return toast('目前職位不足');if(!skill&&state.learnedArts.filter(item=>item.sourceSect).length>=state.artsCapacity)return toast('門派功法格已滿');if(skill)state.learnedSectMoves.push(art);else state.learnedArts.push(art);toast(skill?`永久習得門派招式「${art.name}」・不占功法格`:`習得${art.name}`);renderSectLearning();render();save()}

function dateKey(){
  if(!trustedClockReady&&location.protocol!=='file:')return null;
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(gameNow())),values=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
function sectRecordTemplate(meta={}){return {name:meta.name||'',faction:meta.faction||'',star:Math.max(0,Math.floor(meta.star||0)),visited:true,merit:0,contribution:0,rank:0,task:'',actingLeader:false,npcDaily:{},lastGreetingDay:'',discovery:'unknown',joinedAt:null,yearsProcessed:0}}
function sectMetaByName(name){for(const group of sectCatalog){if(group.good.includes(name))return{name,faction:'正',star:group.star};if(group.evil.includes(name))return{name,faction:'邪',star:group.star}}return null}
function sectRareTechnique(sect=state.sect,star=state.sectStar){return sectTechniqueSet(sect,star).find(art=>['ultimate','fragment','sectSkill'].includes(art.kind))||null}
function refreshSectDiscovery(record,sect=record?.name,star=record?.star){if(!record)return;const rare=sectRareTechnique(sect,star),learned=rare&&(state.learnedArts.some(art=>art.id===rare.id)||learnedSectSkills().some(art=>art.id===rare.id));if(learned)record.discovery='obtained';else if(rare&&record.rank>=1)record.discovery='confirmed';else if(rare&&record.merit>=100)record.discovery='hinted';else if(!rare&&record.rank>=1)record.discovery='explored';else record.discovery=record.discovery||'unknown'}
function sectHeritageNotice(record){if(!record)return'';refreshSectDiscovery(record);const rare=sectRareTechnique(record.name,record.star),messages={hinted:'門中偶有秘聞流傳，藏經深處似乎尚有未示外人的痕跡。',confirmed:rare?`內門記載已證實：本門藏有一部${artKinds[rare.kind].tab}，需晉升親傳後方可受授。`:'目前尚未發現更深傳承。',obtained:rare?`已受授本門秘藏「${rare.name}」。`:'本門傳承已記錄。',explored:'目前未從門中記載發現其他秘藏線索。'};return messages[record.discovery]?`<div class="sect-heritage-note"><small>門中見聞</small><p>${messages[record.discovery]}</p></div>`:''}
function syncCurrentSectRecord(){if(!state.sect)return;state.sectRecords=state.sectRecords&&typeof state.sectRecords==='object'?state.sectRecords:{};const meta={name:state.sect,faction:state.sectFaction,star:state.sectStar},record=state.sectRecords[state.sect]||sectRecordTemplate(meta);Object.assign(record,meta,{visited:true,merit:Math.max(0,Math.floor(state.sectMerit||0)),contribution:Math.max(0,Math.floor(state.sectContribution||0)),rank:Math.max(0,Math.min(sectRanks.length-1,Math.floor(state.sectRank||0))),task:state.sectTask||'',actingLeader:!!state.actingLeader,npcDaily:normalizeNpcDailyLog(state.npcDaily),lastGreetingDay:state.lastGreetingDay||'',joinedAt:state.sectJoinedAt||null,yearsProcessed:Math.max(0,Math.floor(state.sectYearsProcessed||0))});refreshSectDiscovery(record);state.sectRecords[state.sect]=record}
function restoreSectRecord(pick,preserveTiming=false){state.sectRecords=state.sectRecords&&typeof state.sectRecords==='object'?state.sectRecords:{};const record=state.sectRecords[pick.name]||sectRecordTemplate(pick),joinedAt=preserveTiming&&state.sectJoinedAt?state.sectJoinedAt:gameNow(),yearsProcessed=preserveTiming?Math.max(0,Math.floor(state.sectYearsProcessed||0)):0;state.sectRecords[pick.name]=record;state.sect=pick.name;state.sectFaction=pick.faction;state.sectStar=pick.star;state.sectMerit=Math.max(0,Math.floor(record.merit||0));state.sectContribution=Math.max(0,Math.floor(record.contribution||0));state.sectRank=Math.max(0,Math.min(sectRanks.length-1,Math.floor(record.rank||0)));state.sectTask=record.task||'';state.sectJoinedAt=joinedAt;state.sectYearsProcessed=yearsProcessed;state.actingLeader=!!record.actingLeader;state.npcDaily=normalizeNpcDailyLog(record.npcDaily);state.lastGreetingDay=record.lastGreetingDay||'';record.joinedAt=joinedAt;record.yearsProcessed=yearsProcessed;record.visited=true;refreshSectDiscovery(record)}
function normalizeSectRecords(){state.sectRecords=state.sectRecords&&typeof state.sectRecords==='object'?state.sectRecords:{};const legacyRecords=Object.values(state.sectRecords);state.lastSalaryDay=[state.lastSalaryDay,...legacyRecords.map(record=>record?.lastSalaryDay)].filter(Boolean).sort().at(-1)||'';state.lastPracticeDay=[state.lastPracticeDay,...legacyRecords.map(record=>record?.lastPracticeDay)].filter(Boolean).sort().at(-1)||'';Object.entries(state.sectRecords).forEach(([name,value])=>{const meta=sectMetaByName(name);if(!meta){delete state.sectRecords[name];return}state.sectRecords[name]={...sectRecordTemplate(meta),...(value&&typeof value==='object'?value:{}),...meta,visited:true};delete state.sectRecords[name].npcAffinity;delete state.sectRecords[name].lastSalaryDay;delete state.sectRecords[name].lastPracticeDay;state.sectRecords[name].npcDaily=normalizeNpcDailyLog(state.sectRecords[name].npcDaily);refreshSectDiscovery(state.sectRecords[name],name,meta.star)});if(!state.sect)return;const meta=sectMetaByName(state.sect)||{name:state.sect,faction:state.sectFaction,star:state.sectStar},existing=state.sectRecords[state.sect],legacyRank=Math.max(0,Math.min(sectRanks.length-1,Math.floor(state.sectRank||0))),legacyMerit=Math.max(Math.floor(state.sectMerit||0),sectPromotionCosts[Math.max(0,legacyRank-1)]||0,Math.floor(state.sectContribution||0));if(!existing)state.sectRecords[state.sect]={...sectRecordTemplate(meta),merit:legacyMerit,contribution:Math.max(0,Math.floor(state.sectContribution||0)),rank:legacyRank,task:state.sectTask||'',actingLeader:!!state.actingLeader,npcDaily:normalizeNpcDailyLog(state.npcDaily),lastGreetingDay:state.lastGreetingDay||''};else{existing.merit=Math.max(existing.merit||0,legacyMerit);existing.contribution=Math.max(existing.contribution||0,Math.floor(state.sectContribution||0));existing.rank=Math.max(existing.rank||0,legacyRank)}restoreSectRecord(meta,true)}
function sectExperienceBonus(){const experienced=Object.values(state.sectRecords||{}).filter(record=>(record.rank||0)>=2).length;return Math.min(.5,experienced*.05)}
function sectInfo(){return sectCatalog.find(x=>x.star===state.sectStar)}
const sectTaskPathOrder=['spirit','sword','body'];
function sectPathMajorRealm(path){if(!pathOpened(path))return 0;const level=path==='spirit'?state.spiritLevel:path==='sword'?state.swordLevel:state.bodyLevel;return Math.max(1,Math.floor(Math.max(0,Number(level)||0)/10)+1)}
function highestSectTaskRealm(){return Math.max(...sectTaskPathOrder.map(sectPathMajorRealm),0)}
function inferSectTaskPath(realm,triggerPath=''){
  const candidates=sectTaskPathOrder.filter(path=>sectPathMajorRealm(path)>=realm);if(!candidates.length)return '';
  if(candidates.includes(triggerPath))return triggerPath;
  const highest=Math.max(...candidates.map(sectPathMajorRealm)),leaders=candidates.filter(path=>sectPathMajorRealm(path)===highest);
  if(leaders.includes(state.firstPath))return state.firstPath;if(leaders.includes(state.activePath))return state.activePath;return leaders[0];
}
function syncSectTaskRouteUnlocks(triggerPath=''){
  const previous=state.sectTaskRouteUnlocks&&typeof state.sectTaskRouteUnlocks==='object'?state.sectTaskRouteUnlocks:{};state.sectTaskRouteUnlocks={};
  Object.entries(previous).forEach(([id,path])=>{if(sectTasks.some(task=>task.id===id)&&sectTaskPathOrder.includes(path))state.sectTaskRouteUnlocks[id]=path});
  const highest=highestSectTaskRealm();sectTasks.forEach(task=>{if(task.realm<=highest&&!state.sectTaskRouteUnlocks[task.id])state.sectTaskRouteUnlocks[task.id]=inferSectTaskPath(task.realm,triggerPath)});
  return state.sectTaskRouteUnlocks;
}
function normalizeSectTaskSystem(){
  const before=JSON.stringify(state.sectTaskRouteUnlocks||{});syncSectTaskRouteUnlocks();const selected=sectTasks.find(task=>task.id===state.sectTask);
  if(selected&&selected.realm>highestSectTaskRealm()){const fallback=sectTasks.filter(task=>task.realm<=highestSectTaskRealm()).at(-1);state.sectTask=fallback?.id||''}
  return before!==JSON.stringify(state.sectTaskRouteUnlocks||{});
}
function resolvedSectTask(task){if(!task)return null;const path=state.sectTaskRouteUnlocks?.[task.id]||inferSectTaskPath(task.realm),variant=task.variants[path]||['未定任務','由最先達標的修行道路決定任務內容。'];return {...task,path,name:variant[0],desc:variant[1]}}
function selectedSectTask(){let task=sectTasks.find(x=>x.id===state.sectTask);if(task&&task.realm>highestSectTaskRealm()){task=sectTasks.filter(entry=>entry.realm<=highestSectTaskRealm()).at(-1);state.sectTask=task?.id||''}return task?resolvedSectTask(task):null}
function sectTaskPathGain(task=selectedSectTask()){return task?Math.min(3,1+Math.floor((task.realm-1)/4)):1}
function sectTaskAnnualGain(task=selectedSectTask()){return task?Math.min(50,Math.floor(task.gain*(1+sectExperienceBonus()))):0}
function processSectYears(){
  if(!state.sect||!state.sectJoinedAt)return false;
  const total=Math.floor((gameNow()-state.sectJoinedAt)/900000),delta=Math.max(0,total-state.sectYearsProcessed);
  if(!delta)return false;
  state.sectYearsProcessed=total;
  const task=selectedSectTask(),pathGain=delta*(task?sectTaskPathGain(task):1);if(state.sectFaction==='正')state.righteousness+=pathGain;else state.evilQi+=pathGain;
  if(task){const sectGain=sectTaskAnnualGain(task)*delta;state.sectMerit+=sectGain;state.sectContribution+=sectGain;state.spiritStone+=task.stone*delta;state.prestige+=task.prestige*delta;syncCurrentSectRecord()}return true;
}
function sectDescription(){
  const index=npcSeed(),places=['青峰疊翠的雲海深處','千瀑交織的靈谷之中','終年星輝垂落的高原','古木遮天的幽靜山脈','浩蕩天河環繞的浮島','地火與寒泉交會的秘境','萬丈孤峰之巔','遠離塵世的上古洞天','雷雲不散的天外山門','潮汐靈脈匯聚的海崖','日月同輝的仙家福地'];
  const practices=['擅長以劍意磨礪道心','精研丹道與靈藥培育','傳承符籙、陣法與禁制之術','重視肉身與元息並行淬鍊','以觀星推演尋求大道軌跡','修習御風踏雲與行章妙法','守護古老典籍與失傳玄錄','講究在生死歷練中突破桎梏','以五行流轉淬鍊門人根基','世代鎮守一處危險的天地裂隙','崇尚萬法歸一、道心澄明'];
  const path=state.sectFaction==='正'?'門人奉行正道、護持蒼生，行事以仁義為先，以清正自守。':'門人不受正統戒律束縛，被世人視為旁門左道；行事只問本心與實力，恩怨必報。';
  return `${state.sect}立於${places[index%places.length]}，${practices[(index*3+Math.floor(index/places.length))%practices.length]}。${path}`;
}
function allEligibleSects(){return sectCatalog.filter(g=>worldProgressLevel()>=g.need).flatMap(g=>[...g.good.map(name=>({name,faction:'正',star:g.star})),...g.evil.map(name=>({name,faction:'邪',star:g.star}))])}
function joinSect(pick,bypassCooldown=false){
  if(!pick||state.sect)return false;
  if(!bypassCooldown&&gameNow()<(state.sectSearchAvailableAt||0))return toast(`門派尋訪尚需等待 ${Math.ceil(((state.sectSearchAvailableAt||0)-gameNow())/900000)} 個修練年`);
  const returning=!!state.sectRecords?.[pick.name];restoreSectRecord(pick);state.sectSearchAvailableAt=0;
  toast(`${returning?'重返':'拜入'}${['一','二','三','四','五','六','七','八','九'][pick.star-1]}星門派・${pick.name}`);render();if(currentFeature==='sect')renderSectPanel('home');save();return true;
}
function joinRandomSect(){
  if(gameNow()<(state.sectSearchAvailableAt||0))return toast(`門派尋訪尚需等待 ${Math.ceil(((state.sectSearchAvailableAt||0)-gameNow())/900000)} 個修練年`);
  const pool=allEligibleSects().flatMap(pick=>{const record=state.sectRecords?.[pick.name],weight=!record?3:record.discovery==='unknown'||record.discovery==='hinted'?2:1;return Array.from({length:weight},()=>pick)}),pick=pool[Math.floor(Math.random()*pool.length)];if(!pick)return;
  joinSect(pick);
}
async function leaveSect(){
  if(!await gameConfirm(`確定脫離${state.sect}？\n本門功勳、貢獻、職位與傳承見聞都會保留；免費尋訪其他門派需等待 3 個修練年。`,{title:'脫離門派',confirmText:'確認脫離',danger:true}))return;
  processSectYears();syncCurrentSectRecord();state.sectSearchAvailableAt=gameNow()+3*900000;
  state.sect='';state.sectFaction='';state.sectStar=0;state.sectMerit=0;state.sectContribution=0;state.sectRank=0;state.sectTask='';state.sectJoinedAt=null;state.sectYearsProcessed=0;state.actingLeader=false;state.npcDaily={};state.lastGreetingDay='';toast('已脫離門派・原門派進度已保留');render();renderSectPanel('home');save();
}
function npcSeed(){const names=sectCatalog.flatMap(g=>[...g.good,...g.evil]);return Math.max(0,names.indexOf(state.sect))}
function sectNpcs(){
  const surnames=['趙','錢','孫','李','周','吳','鄭','王','馮','陳','褚','衛','蔣','沈','韓','楊','朱','秦','尤','許','何','呂','施','張','孔','曹','嚴','華','金','魏','陶','姜','戚','謝','鄒','喻','柏','水','竇','章','雲','蘇','潘','葛','奚','范','彭','郎','魯','韋','昌','馬','苗','鳳','花','方','俞','任','袁','柳','唐','羅','薛','歐陽','上官','司馬','諸葛','夏侯','東方','皇甫','尉遲','公孫','慕容','長孫','宇文','司徒','南宮','令狐','軒轅'];
  const maleGiven=['玄策','清衡','道一','長淵','若塵','星河','無涯','景行','明淵','懷瑾','扶光','晏清','承淵','照夜','守一','修遠','子墨','凌霄','朔','衡','澈','玄','川','長生遠','觀滄海','問天行','凌九霄','守山河','雲歸處','硯無聲'];
  const femaleGiven=['雲舒','清漪','知微','映雪','秋水','昭寧','疏影','望舒','青梧','霽月','含章','雲岫','驚鴻','凝霜','聽瀾','若水','靈犀','月華','瑤','霜','寧','蘭','月','月如霜','雲知意','柳含煙','星照晚','雪無痕','花解語','夢長安'];
  const seed=npcSeed(),mode=seed%12,roles=['掌門','大長老','供奉','師兄','師弟'];
  return roles.map((role,i)=>{const id=seed*5+i,gender=mode===0?'男':mode===1?'女':textSeed(`${state.sect}・${role}・${i}`)%2===0?'男':'女',given=gender==='男'?maleGiven:femaleGiven,name=surnames[(id*37)%surnames.length]+given[id%given.length],title=i===3?(gender==='男'?'師兄':'師姐'):i===4?(gender==='男'?'師弟':'師妹'):role,portrait=i+(gender==='女'?5:0),statSeed=textSeed(`${state.sect}・${name}・戰鬥`);return {title,name,gender,portrait,id,role:i,statBias:{vitality:.92+statSeed%17/100,offense:.92+Math.floor(statSeed/7)%19/100,guard:.92+Math.floor(statSeed/13)%17/100,speed:.92+Math.floor(statSeed/19)%15/100,spirit:.92+Math.floor(statSeed/29)%17/100}}});
}
function renderSectPathIncome(){const inner=$('#sectInner');if(currentSectView!=='tasks'||!inner||inner.querySelector('.sect-path-income'))return;const task=selectedSectTask(),gain=sectTaskPathGain(task);inner.insertAdjacentHTML('afterbegin',`<p class="sect-note sect-path-income">門派歲月會累積${state.sectFaction==='邪'?'邪氣':'正氣'}${task?`；目前任務每年 +${gain}`:'；接取任務後，高階任務累積更快'}。正邪閱歷不會互相抵銷。</p>`)}
function renderSectPanel(view='home'){
  currentSectView=view;processSectYears();
  if(!state.sect){
    const unlocked=sectCatalog.filter(g=>worldProgressLevel()>=g.need);const max=unlocked.at(-1);
    $('#featureDescription').innerHTML=`<section class="sectless"><div class="sect-seal">無</div><h2>無門無派</h2><p>你尚未拜入任何門派，可外出尋訪宗門、求取入道機緣。</p><div class="sect-unlocks">目前最高可加入：${['一','二','三','四','五','六','七','八','九'][max.star-1]}星門派・依三路最高境界判定</div><button id="joinSectBtn" class="jade-button">尋訪門派</button></section>`;
    $('#joinSectBtn').onclick=joinRandomSect;return;
  }
  const tabs=[['home','門派主殿'],['npcs','門人'],['practice','練功房'],['tasks','執事堂'],['learning','傳功殿'],['shop','功勳堂'],['journal','門派見聞']];
  $('#featureDescription').innerHTML=`<div class="sect-tabs">${tabs.map(([k,n])=>`<button data-sect-view="${k}" class="${k===view?'active':''}">${n}</button>`).join('')}</div><div id="sectInner"></div>`;
  $$('.sect-tabs button').forEach(b=>b.onclick=()=>{renderSectView(b.dataset.sectView);renderSectPathIncome()});const tabBar=$('.sect-tabs'),activeTab=tabBar?.querySelector('.active');if(tabBar){tabBar.addEventListener('wheel',event=>{if(Math.abs(event.deltaY)<=Math.abs(event.deltaX))return;tabBar.scrollLeft+=event.deltaY;event.preventDefault()},{passive:false});if(activeTab)tabBar.scrollLeft=activeTab.offsetLeft-tabBar.offsetLeft-(tabBar.clientWidth-activeTab.clientWidth)/2}renderSectView(view);renderSectPathIncome();save();
}
function renderSectView(view){
  currentSectView=view;const inner=$('#sectInner');if(!inner)return;
  $$('.sect-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.sectView===view));
  if(view==='home'){
    const next=sectPromotionCosts[state.sectRank];
    const record=state.sectRecords?.[state.sect],heritage=sectHeritageNotice(record),salary=sectSalary[state.sectRank],salaryDone=state.lastSalaryDay===dateKey();
    inner.innerHTML=`<section class="sect-home ${state.sectFaction==='邪'?'evil':''}"><div class="sect-heading"><span>${['一','二','三','四','五','六','七','八','九'][state.sectStar-1]}星門派・門派主殿</span><h2>${state.sect}</h2></div><p>${sectDescription()}</p><div class="sect-status"><b>${sectRanks[state.sectRank]}${state.actingLeader?'・代理掌門':''}</b><span>本門功勳 ${formatLargeNumber(state.sectMerit)}</span><span>門派貢獻 ${formatLargeNumber(state.sectContribution)}</span><span>聲望 ${formatLargeNumber(state.prestige)}</span></div><div class="sect-home-salary"><span>每日俸祿・${formatLargeNumber(salary)} 靈石</span><button id="claimSalary" class="jade-button" ${salaryDone?'disabled':''}>${salaryDone?'今日已領取':'領取俸祿'}</button></div>${heritage}${next?`<button id="promoteSectBtn" class="jade-button" ${state.sectMerit>=next?'':'disabled'}>晉升${sectRanks[state.sectRank+1]}・需累計 ${formatLargeNumber(next)} 功勳</button>`:'<strong class="rank-max">已達最高職位・護法</strong>'}<button id="leaveSectBtn" class="text-button danger-text">脫離門派・保留本門進度</button></section>`;
    $('#claimSalary').onclick=claimSalary;if(next)$('#promoteSectBtn').onclick=promoteSect;$('#leaveSectBtn').onclick=leaveSect;return;
  }
  if(view==='npcs'){inner.innerHTML=`<div class="npc-grid">${sectNpcs().map((n,index)=>{const power=sectNpcCombatPower(n);return `<button class="npc-card" data-npc="${index}"><span class="npc-portrait p${n.portrait}" style="--portrait-hue:${n.id%37-18}deg;--portrait-bright:${.92+(n.id%9)*.02}"></span><b>${n.title}</b><strong>${n.name}</strong><small>戰力 ${formatCombatPower(power)}</small></button>`}).join('')}</div><div id="npcDetail" class="npc-detail">點選一位門人進行互動</div>`;$$('.npc-card').forEach(b=>b.onclick=()=>renderNpcDetail(+b.dataset.npc));return}
  if(view==='shop'){renderSectShop();return}
  if(view==='learning'){renderSectLearning();return}
  if(view==='journal'){const records=Object.values(state.sectRecords||{}).filter(record=>record.visited).sort((a,b)=>a.star-b.star||a.name.localeCompare(b.name,'zh-Hant')),discoveryText=record=>{refreshSectDiscovery(record);const rare=sectRareTechnique(record.name,record.star);return record.discovery==='obtained'&&rare?`已取得・${rare.name}`:record.discovery==='confirmed'&&rare?`已確認・${artKinds[rare.kind].tab}傳承`:record.discovery==='hinted'?'門中似有未明線索':record.discovery==='explored'?'目前未發現更深線索':'尚待探索'};inner.innerHTML=`<section class="sect-journal"><header><small>只記錄親身拜入後所知之事</small><h2>門派見聞</h2></header><div class="sect-journal-list">${records.map(record=>`<article><span>${['一','二','三','四','五','六','七','八','九'][record.star-1]}星・${record.faction}</span><b>${record.name}</b><small>${sectRanks[record.rank||0]}・功勳 ${formatLargeNumber(record.merit||0)}・貢獻 ${formatLargeNumber(record.contribution||0)}</small><em>${discoveryText(record)}</em></article>`).join('')}</div></section>`;return}
  if(view==='tasks'){syncSectTaskRouteUnlocks();const progress=highestSectTaskRealm(),bonus=Math.round(sectExperienceBonus()*100);inner.innerHTML=`<header class="sect-facility-heading"><small>門派設施・三路最高第 ${progress} 境</small><h2>執事堂</h2></header><div class="task-list">${sectTasks.map(t=>{const unlocked=progress>=t.realm,resolved=unlocked?resolvedSectTask(t):null,annual=unlocked?sectTaskAnnualGain(resolved):t.gain,pathName=resolved?cultivationPathMeta[resolved.path].name:'路線待定';return `<button data-task="${t.id}" class="task-card ${state.sectTask===t.id?'active':''}" ${unlocked?'':'disabled'}><i>${pathName}・第 ${t.realm} 境</i><b>${resolved?.name||'尚未顯現的門派任務'}</b><span>每年：功勳與貢獻各+${annual}・靈石+${formatLargeNumber(t.stone)}・聲望+${t.prestige}</span><small>${resolved?.desc||'由最先令三路最高境界跨過此門檻的修行道路決定，解鎖後永久保留。'}</small><em>${state.sectTask===t.id?'已接取':unlocked?'可接取':`需三路最高達第 ${t.realm} 大境界`}</em></button>`}).join('')}</div><p class="sect-note">任務會持續執行；每道門檻只取三路最高進度，首次達標路線會永久決定該任務。門派閱歷目前加成 ${bonus}%，但功勳與貢獻實際每年最高各 +50。</p>`;$$('.task-card:not(:disabled)').forEach(b=>b.onclick=()=>{state.sectTask=b.dataset.task;toast(`開始持續任務：${selectedSectTask().name}`);renderSectView('tasks');save()});return}
  if(view==='practice'){
    const can=state.sectRank>=1,done=state.lastPracticeDay===dateKey(),practiceOn=buffActive('practiceBuff'),transmissionOn=buffActive('transmissionBuff');
    const practiceReason=!can?'需晉升內門弟子':done?'今日已完成':state.spiritStone<300?`尚缺 ${Math.ceil(300-state.spiritStone)} 靈石`:'開始練功';
    inner.innerHTML=`<div class="practice-grid"><article class="buff-card ${practiceOn?'running':''}"><b>練功</b><p>消耗300靈石，獲得5倍修為修練${state.actingLeader?20:10}年。每日一次，開啟後持續至時間結束。</p><div class="buff-timer ${practiceOn?'active':''}"><i id="practiceTimerBar" style="width:${buffPercent('practiceBuff')}%"></i><span id="practiceTimerText">${practiceOn?buffClock('practiceBuff'):'未開啟'}</span></div><button id="dailyPractice" ${can&&!done&&state.spiritStone>=300?'':'disabled'}>${practiceReason}</button></article><article class="buff-card ${transmissionOn?'running':''}"><b>掌門傳功</b><p>每次獲得8倍修為修練10年，可與練功同時進行，開啟後無法暫停。</p><div class="buff-timer ${transmissionOn?'active':''}"><i id="transmissionTimerBar" style="width:${buffPercent('transmissionBuff')}%"></i><span id="transmissionTimerText">${transmissionOn?buffClock('transmissionBuff'):'未開啟'}</span></div><div class="transmit-buttons"><button data-transmit="1" data-cost="5">1次・5靈玉</button><button data-transmit="30" data-cost="120">30次・120靈玉</button><button data-transmit="100" data-cost="300">100次・300靈玉</button></div></article></div>${can?'':'<p class="sect-note">練功房需達內門弟子以上；目前靈石足夠，但職位尚未符合。</p>'}<p class="sect-note">目前總修練倍率：${cultivationMultiplier()}倍・主介面修練效率 ${rate().toLocaleString()} / 5秒</p>`;
    $('#dailyPractice').onclick=dailyPractice;$$('[data-transmit]').forEach(b=>{b.disabled=transmissionOn||!can||state.spiritJade<+b.dataset.cost;b.onclick=()=>masterTransmission(+b.dataset.transmit,+b.dataset.cost)});return
  }
}
const sectShopGroups=[
  {id:'brew',name:'釀坊原釀',note:'凡品、極品原釀每日各限換 1 瓶。',offers:[
    {id:'brew-normal',itemId:'brew-base-normal',price:120,limit:1,legacyKey:'normal'},
    {id:'brew-rare',itemId:'brew-base-rare',price:300,limit:1,legacyKey:'rare'}
  ]},
  {id:'alchemy',name:'丹藥素材',note:'四象主藥與丹砂每種每日限換 10 份。',offers:craftingMaterialItems.map(([name,count],index)=>({id:`alchemy-${count}`,itemId:`craft-material-${count}`,price:index===4?10:15,limit:10}))},
  {id:'equipment-main',name:'裝備主材',note:'七類部位主材每種每日限換 10 份。',offers:mainlineMaterials.map(([,key])=>({id:`equipment-main-${key}`,itemId:`main-material-${key}`,price:18,limit:10}))},
  {id:'equipment-tier',name:'裝備階材',note:'階材隨三路最高境界開放，每種每日限換 10 份。',offers:tierMaterials.map((name,index)=>({id:`equipment-tier-${index+1}`,itemId:`forge-tier-material-${index+1}`,price:[15,22,30,42,56,72,90,110,135][index],limit:10,unlockTier:index+1}))},
  {id:'equipment-rare',name:'極品珍材',note:'器靈精魄每日限換 2 枚，專供極品裝備使用。',offers:[{id:'equipment-spirit-core',itemId:'equipmentSpiritCore',price:500,limit:2}]}
];
function sectShopExchangeState(){const today=dateKey()||'local';if(state.sectBrewExchangeDaily?.date!==today)state.sectBrewExchangeDaily={date:today,normal:0,rare:0,counts:{}};state.sectBrewExchangeDaily.counts=state.sectBrewExchangeDaily.counts&&typeof state.sectBrewExchangeDaily.counts==='object'?state.sectBrewExchangeDaily.counts:{};state.sectBrewExchangeDaily.normal=Math.max(0,Math.floor(state.sectBrewExchangeDaily.normal||0));state.sectBrewExchangeDaily.rare=Math.max(0,Math.floor(state.sectBrewExchangeDaily.rare||0));return state.sectBrewExchangeDaily}
function sectShopOfferBought(offer,record=sectShopExchangeState()){return offer.legacyKey?record[offer.legacyKey]||0:Math.max(0,Math.floor(record.counts[offer.id]||0))}
function sectShopOfferButton(offer,bought){if(offer.unlockTier&&offer.unlockTier>productionMaxTier())return `${offer.unlockTier}階開放`;if(bought>=offer.limit)return '今日已換足';if(state.sectContribution<offer.price)return '貢獻不足';return '兌換 1 份'}
function renderSectShop(){
  const inner=$('#sectInner');if(!inner)return;const daily=sectShopExchangeState();
  inner.innerHTML=`<section class="sect-shop"><div class="shop-heading"><small>門派設施・每日物資兌換</small><h2>功勳堂</h2><span>門派貢獻 ${formatLargeNumber(state.sectContribution)}</span></div>${sectShopGroups.map(group=>`<section class="sect-shop-group"><header><h3>${group.name}</h3><small>${group.note}</small></header><div class="sect-shop-grid">${group.offers.map(offer=>{const item=itemCatalog[offer.itemId],bought=sectShopOfferBought(offer,daily),locked=offer.unlockTier&&offer.unlockTier>productionMaxTier(),disabled=locked||bought>=offer.limit||state.sectContribution<offer.price;return `<article class="shop-item compact ${locked?'locked':''}"><img src="${item.image}" alt="${item.name}"><div class="shop-item-copy"><b>${item.name}</b><strong>門派貢獻 ${offer.price}</strong><small>持有 ${formatLargeNumber(state[item.count]||0)}・今日 ${bought}／${offer.limit}</small></div><div class="shop-actions"><button data-sect-shop-offer="${offer.id}" ${disabled?'disabled':''}>${sectShopOfferButton(offer,bought)}</button></div></article>`}).join('')}</div></section>`).join('')}</section>`;
  $$('[data-sect-shop-offer]').forEach(button=>button.onclick=()=>purchaseSectShopOffer(button.dataset.sectShopOffer));
}
function purchaseSectShopOffer(id){
  const offer=sectShopGroups.flatMap(group=>group.offers).find(entry=>entry.id===id);if(!offer)return;const item=itemCatalog[offer.itemId],record=sectShopExchangeState(),bought=sectShopOfferBought(offer,record);
  if(offer.unlockTier&&offer.unlockTier>productionMaxTier())return toast(`三路最高達第 ${offer.unlockTier} 大境界後開放`);if(bought>=offer.limit)return toast(`${item.name}今日已達兌換上限`);if(state.sectContribution<offer.price)return toast('門派貢獻不足');if(!canStoreItem(offer.itemId))return toast('儲物袋已滿');
  state.sectContribution-=offer.price;state[item.count]=(state[item.count]||0)+1;if(offer.legacyKey)record[offer.legacyKey]=(record[offer.legacyKey]||0)+1;else record.counts[offer.id]=(record.counts[offer.id]||0)+1;save();renderSectShop();render();toast(`兌得${item.name} ×1`);
}
function registerEquipmentItems(){(state.equipmentInventory||[]).forEach(e=>{const key=`equipment-${e.id}`,slot=equipmentSlots.find(x=>x[0]===e.slot),stat=e.affixes?.length?e.affixes.map(x=>`${x.element}系功法效果 +${x.value.toFixed(1)}%`).join('、'):`${e.label}+${e.value}`;itemCatalog[key]={name:`${e.quality==='rare'?'極品':'凡品'}·${equipmentSets[e.tier-1]}${slot[1]}`,image:`assets/qstyle-v2/production/equipment/${e.slot}-t${e.tier}.png`,description:`器室製成的${equipmentSets[e.tier-1]}階${slot[1]}。${stat}`,count:`equipmentCount_${e.id}`,usable:true,giftable:false,sellPrice:1,equipmentData:e};if(state[`equipmentCount_${e.id}`]==null)state[`equipmentCount_${e.id}`]=1})}
function normalizeEquipmentLoadout(){
  state.equipmentInventory=Array.isArray(state.equipmentInventory)?state.equipmentInventory:[];state.equippedItems=state.equippedItems&&typeof state.equippedItems==='object'?state.equippedItems:{};
  const inventoryIds=new Set(state.equipmentInventory.map(e=>e.id));Object.entries(state.equippedItems).forEach(([slot,id])=>{const equipment=state.equipmentInventory.find(e=>e.id===id);if(!inventoryIds.has(id)||equipment?.slot!==slot)delete state.equippedItems[slot]});
  const equippedIds=new Set(Object.values(state.equippedItems));state.equipmentInventory.forEach(e=>state[`equipmentCount_${e.id}`]=equippedIds.has(e.id)?0:Math.max(1,Math.floor(Number(state[`equipmentCount_${e.id}`])||0)));
}
function equipmentComparisonStats(equipment){
  const stats={};if(!equipment)return stats;
  if(equipment.label)stats[equipment.label]={value:Number(equipment.value)||0,percent:false};
  (equipment.affixes||[]).forEach(affix=>stats[`${affix.element}系功法效果`]={value:Number(affix.value)||0,percent:true});
  return stats;
}
function renderEquipmentComparison(equipment){
  const panel=$('#itemModalEquipmentCompare');if(!panel)return;
  if(!equipment){panel.innerHTML='';panel.classList.add('hidden');return}
  const equippedId=state.equippedItems?.[equipment.slot],current=(state.equipmentInventory||[]).find(item=>item.id===equippedId);
  if(current?.id===equipment.id){panel.innerHTML='<b>裝備比較</b><span class="equipment-current">目前裝備中</span>';panel.classList.remove('hidden');return}
  const nextStats=equipmentComparisonStats(equipment),currentStats=equipmentComparisonStats(current),labels=[...new Set([...Object.keys(nextStats),...Object.keys(currentStats)])];
  const rows=labels.map(label=>{const next=nextStats[label]?.value||0,old=currentStats[label]?.value||0,percent=nextStats[label]?.percent||currentStats[label]?.percent,change=next-old,direction=change>0?'up':change<0?'down':'same',arrow=direction==='up'?'▲':direction==='down'?'▼':'—',value=percent?`+${next.toFixed(1)}%`:`+${formatLargeNumber(next)}`;return `<span><em>${label}</em><strong>${value}<i class="${direction}" aria-label="${direction==='up'?'上升':direction==='down'?'下降':'不變'}">${arrow}</i></strong><small>${current?`目前 ${percent?`+${old.toFixed(1)}%`:`+${formatLargeNumber(old)}`}`:'目前未裝備'}</small></span>`}).join('');
  panel.innerHTML=`<b>裝備比較</b>${rows}`;panel.classList.remove('hidden');
}
function equipInventoryItem(item){const e=item?.equipmentData;if(!e||(state[item.count]||0)<1)return false;state.equippedItems=state.equippedItems||{};const previousId=state.equippedItems[e.slot];if(previousId&&previousId!==e.id)state[`equipmentCount_${previousId}`]=1;state.equippedItems[e.slot]=e.id;state[item.count]=0;toast(`已裝備${item.name}`);render();save();return true}
function unequipInventoryItem(equipment){if(!equipment||state.equippedItems?.[equipment.slot]!==equipment.id)return false;if(!canStoreItem(`equipment-${equipment.id}`,1))return toast('儲物袋空間不足，無法卸下裝備');delete state.equippedItems[equipment.slot];state[`equipmentCount_${equipment.id}`]=1;closeItemModal();renderBagView('character');render();save();toast(`已卸下${itemCatalog[`equipment-${equipment.id}`]?.name||'裝備'}`);return true}
function openEquippedItemModal(id){
  const equipment=(state.equipmentInventory||[]).find(e=>e.id===id),item=itemCatalog[`equipment-${id}`];if(!equipment||!item)return;
  itemModalKey=`equipment-${id}`;itemModalQuantity=1;$('#itemModalImage').src=item.image;$('#itemModalImage').alt=item.name;$('#itemModalName').textContent=item.name;$('#itemModalDescription').textContent='';const stats=equipmentComparisonStats(equipment),rows=Object.entries(stats).map(([label,stat])=>`<span><em>${label}</em><strong>${stat.percent?`+${stat.value.toFixed(1)}%`:`+${formatLargeNumber(stat.value)}`}</strong></span>`).join('');$('#itemModalEquipmentCompare').innerHTML=`<b>詳細屬性</b>${rows}`;$('#itemModalEquipmentCompare').classList.remove('hidden');$('#itemModalCount').textContent='';const modal=$('#itemModal');modal.classList.add('equipped-detail');const use=$('#itemModalUse');use.textContent='卸下';use.classList.remove('hidden');use.disabled=false;use.onclick=()=>unequipInventoryItem(equipment);$('#itemModalSell').disabled=true;$('#itemModalActions').classList.remove('no-use');modal.classList.remove('hidden');
}
function dosageLimit(){return 50+Math.max(0,Math.floor(state.dosageLimitBonus||0))}
function useAttributePill(item,quantity){const p=item?.pillData;if(!p)return false;const limit=dosageLimit(),usageKey=`${p.key}_${p.tier}`,used=state.pillUsage?.[usageKey]||0,owned=state[item.count]||0,amount=Math.max(0,Math.min(limit-used,owned,Math.floor(quantity)));if(amount<1){toast(`此階此類丹藥已達服用上限 ${limit} 顆`);return false}const gain=p.gain||pillTierGain(p.tier),totalGain=gain*amount;state.pillUsage=state.pillUsage||{};state.pillUsage[usageKey]=used+amount;state[item.count]-=amount;state[p.attribute]=(state[p.attribute]||0)+totalGain;toast(`服用${item.name} ×${amount}・${p.label}+${totalGain}（${used+amount}/${limit}）`);render();save();return true}
function useSpiritBrew(item,quantity){const b=item?.brewData;if(!b)return false;const limit=dosageLimit(),usageKey=`${b.key}_${b.quality}`,used=state.brewUsage?.[usageKey]||0,owned=state[item.count]||0,amount=Math.max(0,Math.min(limit-used,owned,Math.floor(quantity)));if(amount<1){toast(`此品質此類靈釀已達品飲上限 ${limit} 瓶`);return false}state.brewUsage=state.brewUsage||{};state.brewUsage[usageKey]=used+amount;state[item.count]-=amount;state[b.attribute]=(state[b.attribute]||0)+b.gain*amount;toast(`品飲${item.name} ×${amount}・${b.label}+${formatLargeNumber(b.gain*amount)}（${used+amount}/${limit}）`);render();save();return true}
function useDosageLimitPill(key,quantity=1){const item=itemCatalog[key],gain=Math.max(0,Math.floor(item?.dosageLimitGain||0));if(!gain||(state[item.count]||0)<1)return false;quantity=Math.max(1,Math.min(state[item.count],Math.floor(quantity)));state[item.count]-=quantity;state.dosageLimitBonus=(state.dosageLimitBonus||0)+gain*quantity;toast(`服用${item.name} ×${quantity}・丹藥與靈釀上限提升至 ${dosageLimit()}`);render();save();return true}
function openItemModal(key){
  const item=itemCatalog[key];if(!item)return;const count=state[item.count]||0;
  const learned=!!item.techniqueBook&&(state.learnedBookIds||[]).includes(item.techniqueBook.id);
  const sectBlocked=!!item.sectInvitation&&!!state.sect;
  const mindManualInvalid=key==='mindEmbodimentManual'&&hasMindEmbodiment();
  refreshBodyState();
  $('#itemModal').classList.remove('equipped-detail');itemModalKey=key;itemModalQuantity=1;$('#itemModalImage').src=item.image;$('#itemModalImage').alt=item.name;$('#itemModalName').textContent=item.name;$('#itemModalDescription').textContent=item.description+(learned?'\n\n此功法已習得，本書只能售出。':'')+(sectBlocked?'\n\n你目前已有門派，必須先脫離門派才能使用此信物。':'')+(mindManualInvalid?'\n\n你已習得意念入體，本書已失效，只能售出。':'');renderEquipmentComparison(item.equipmentData);$('#itemModalCount').textContent=`持有數量：${formatLargeNumber(count)}`;
  const sell=$('#itemModalSell');sell.disabled=count<1;sell.onclick=()=>openSellModal(key,itemModalQuantity);
  const showUse=item.usable&&!learned,canUse=showUse&&!sectBlocked&&!mindManualInvalid;const use=$('#itemModalUse');use.textContent=mindManualInvalid?'已失效':item.equipmentData?'裝備':item.brewData?'品飲':item.singleUseOnly?'使用 1 個':'使用';use.classList.toggle('hidden',!showUse);use.disabled=!canUse||count<1;use.onclick=canUse?()=>useItem(key,item.singleUseOnly?1:itemModalQuantity):null;
  $('.item-quantity-panel>span').textContent=item.singleUseOnly?'出售可選數量・使用固定消耗 1 個':'操作數量';
  updateItemQuantity();
  $('#itemModalActions').classList.toggle('no-use',!showUse);$('#itemModal').classList.remove('hidden');
}
function closeItemModal(){$('#itemModal').classList.add('hidden');itemModalKey=null;itemModalQuantity=1}
function updateItemQuantity(){const item=itemCatalog[itemModalKey];if(!item)return;const owned=Math.max(0,Math.floor(Number(state[item.count])||0));itemModalQuantity=Math.max(1,Math.min(Math.max(1,owned),itemModalQuantity));setQuantityInputValue('itemQuantity',itemModalQuantity);$('#itemMinusBtn').disabled=itemModalQuantity<=1;$('#itemMinBtn').disabled=itemModalQuantity<=1;$('#itemPlusBtn').disabled=itemModalQuantity>=owned;$('#itemMaxBtn').disabled=itemModalQuantity>=owned}
function useTechniqueBook(key){
  const item=itemCatalog[key],book=item?.techniqueBook;if(!book)return false;
  if((state.learnedBookIds||[]).includes(book.id)){toast('此功法已習得，道具只能售出');return false}
  if((state[item.count]||0)<1)return false;
  state[item.count]--;state.learnedBookIds.push(book.id);state.learnedArts.push({...book,level:1});
  toast(`習得「${book.name}」・${artKinds[book.kind].label}+${artBaseEffect(book)}${book.kind==='ultimate'?`・銳識+${Math.round(artBaseEffect(book)*.25)}`:''}`);render();save();return true;
}
function useSectInvitation(key){
  const item=itemCatalog[key],invitation=item?.sectInvitation;if(!invitation)return false;
  if(state.sect){toast('已有門派時無法使用門派信物');return false}if((state[item.count]||0)<1)return false;
  state[item.count]--;return joinSect(invitation,true);
}
function useResourceBundle(key,quantity=1){
  const item=itemCatalog[key],bundle=item?.resourceBundle;if(!bundle||(state[item.count]||0)<1)return false;
  quantity=Math.max(1,Math.min(state[item.count],Math.floor(quantity)));state[item.count]-=quantity;state[bundle.resource]=(state[bundle.resource]||0)+bundle.amount*quantity;toast(`使用${item.name} ${formatLargeNumber(quantity)}個・${bundle.label}+${formatLargeNumber(bundle.amount*quantity)}`);render();save();return true;
}
function useCultivationBundle(key,quantity=1){const item=itemCatalog[key],amount=Number(item?.cultivationBundle)||0;if(amount<=0||(state[item.count]||0)<1)return false;quantity=Math.max(1,Math.min(state[item.count],Math.floor(quantity)));state[item.count]-=quantity;const gain=BigInt(amount)*BigInt(quantity);state.free+=gain;state.totalEarned+=gain;toast(`使用${item.name} ${formatLargeNumber(quantity)}個・修為+${formatLargeNumber(gain)}`);render();save();return true}
function useStaminaMedicine(key,quantity=1){const item=itemCatalog[key],amount=Number(item?.staminaRestore)||0;refreshBodyState();if(amount<=0||(state[item.count]||0)<1)return false;quantity=Math.max(1,Math.min(state[item.count],Math.floor(quantity)));state[item.count]-=quantity;state.bodyStamina+=amount*quantity;state.bodyStaminaUpdatedAt=gameNow();toast(`使用${item.name} ${formatLargeNumber(quantity)}個・體力+${formatLargeNumber(amount*quantity)}${state.bodyStamina>100?'（已溢出保留）':''}`);render();save();return true}
function useMoralPill(key,quantity=1){const item=itemCatalog[key],gain=item?.moralGain;if(!gain||(state[item.count]||0)<1||!Object.prototype.hasOwnProperty.call(state,gain.key))return false;quantity=Math.max(1,Math.min(state[item.count],Math.floor(quantity)));const amount=gain.amount*quantity;state[item.count]-=quantity;state[gain.key]+=amount;toast(`使用${item.name} ${formatLargeNumber(quantity)}個・${gain.label}+${formatLargeNumber(amount)}`);render();save();return true}
function useMindEmbodimentManual(){const item=itemCatalog.mindEmbodimentManual;if(hasMindEmbodiment())return toast('你已習得意念入體，本書已失效');if((state[item.count]||0)<1)return false;state[item.count]--;state.mindEmbodimentUnlocked=true;toast('已習得「意念入體」・人物詳細屬性已開啟');render();save();return true}
function validIdentityName(value){return /^[\p{L}\p{N}·・]{1,8}$/u.test(value)}
function openIdentityChangeModal(key){
  const item=itemCatalog[key],action=item?.identityAction;if(!action)return false;
  if(action==='partnerName'&&!state.partnerSystem?.established){toast('尚未結為道侶，無法使用同心更名契');return false}
  identityChangeItemKey=key;closeItemModal();const partner=state.partnerSystem?.partner;
  $('#identityChangeTitle').textContent=action==='protagonistName'?'重書本命名諱':'重訂同心之名';
  $('#identityChangeMessage').textContent=action==='protagonistName'?`目前姓名：${state.name}`:`目前道侶姓名：${partner.name}`;
  $('#identityChangeInput').value=action==='protagonistName'?state.name:partner.name;$('#identityChangeError').textContent='';
  $('#identityChangeModal').classList.remove('hidden');requestAnimationFrame(()=>$('#identityChangeInput').focus());return false;
}
function closeIdentityChangeModal(){identityChangeItemKey=null;$('#identityChangeModal').classList.add('hidden');$('#identityChangeError').textContent=''}
function confirmIdentityNameChange(){
  const item=itemCatalog[identityChangeItemKey],action=item?.identityAction,name=$('#identityChangeInput').value.trim();if(!item||!['protagonistName','partnerName'].includes(action))return closeIdentityChangeModal();
  if(!validIdentityName(name)){$('#identityChangeError').textContent='姓名限 1～8 個文字，可使用中文、字母、數字與間隔點。';return}
  const current=action==='protagonistName'?state.name:state.partnerSystem?.partner?.name;if(name===current){$('#identityChangeError').textContent='新姓名不可與目前姓名相同。';return}
  if((state[item.count]||0)<1){$('#identityChangeError').textContent='道具數量不足。';return}
  state[item.count]--;if(action==='protagonistName')state.name=name;else{state.partnerSystem.partner.name=name;if(state.partnerStory)state.partnerStory.name=name}
  closeIdentityChangeModal();toast(action==='protagonistName'?`本命名諱已改為「${name}」`:`道侶自此以「${name}」之名同行`);render();if(currentFeature==='bag')renderBagView('bag');save();if(action==='protagonistName')syncLeaderboardAfterRename();
}
async function useGenderRebirthMirror(key){
  const item=itemCatalog[key];if((state[item.count]||0)<1)return false;const next=state.gender==='男'?'女':'男',established=!!state.partnerSystem?.established,encountered=!!state.partnerStory&&!established;
  const detail=established?'你的道侶也會同步轉換性別。':encountered?'命定因緣中的同行者也會同步轉換性別，以維持原有緣分。':'未有命定因緣時，日後出現的有緣人會依轉換後的主角性別生成。';
  if(!await gameConfirm(`將主角性別由「${state.gender}」轉換為「${next}」。\n\n${detail}\n\n姓名、髮型、服裝編號、境界與所有養成數值皆會保留。`,{title:'陰陽轉生',confirmText:'照見新身'}))return false;
  state[item.count]--;state.gender=next;if(state.partnerStory)state.partnerStory.gender=state.partnerStory.gender==='男'?'女':'男';if(established)state.partnerSystem.partner.gender=state.partnerSystem.partner.gender==='男'?'女':'男';applyCharacterVisual();toast(established?'陰陽同轉・你與道侶皆已重塑此身':'陰陽輪轉・此身已重新顯化');render();save();return true;
}
function openSwordEmbryoReversion(){
  const item=itemCatalog.swordEmbryoReversionElixir;if((state[item.count]||0)<1)return false;
  if(!state.swordPathOpened)return toast('尚未開啟淬劍之路，無法使用歸元鑄胚露');
  if(!state.swordEmbryo)return toast('尚未凝聚本命劍胚，無需重塑');
  closeItemModal();let modal=$('#swordEmbryoReversionModal');if(!modal){modal=document.createElement('div');modal.id='swordEmbryoReversionModal';modal.className='divine-roaming-modal';document.body.append(modal)}
  const current=state.swordEmbryo;modal.innerHTML=`<section class="divine-roaming-window"><button class="divine-close">×</button><img src="${item.image}" alt="${item.name}" style="width:112px;display:block;margin:0 auto"><h2>${item.name}・重鑄本命劍胚</h2><p>目前為${swordEmbryos[current].name}。選擇新劍胚後，原有養成進度與劍名完整保留，劍胚屬性方向與可用專屬劍招將依新劍胚重整。</p><div class="divine-counts">${Object.entries(swordEmbryos).filter(([id])=>id!==current).map(([id,embryo])=>`<button data-reversion-embryo="${id}"><b>${embryo.name}</b><small>${embryo.description}</small></button>`).join('')}</div><small>確認重鑄後消耗 1 瓶；關閉視窗不會消耗。</small></section>`;
  modal.classList.add('show');modal.querySelector('.divine-close').onclick=()=>modal.classList.remove('show');modal.querySelectorAll('[data-reversion-embryo]').forEach(button=>button.onclick=async()=>{const next=button.dataset.reversionEmbryo,embryo=swordEmbryos[next];if(!embryo||next===state.swordEmbryo)return;modal.classList.remove('show');if(!await gameConfirm(`確定將${swordEmbryos[state.swordEmbryo].name}重鑄為${embryo.name}？\n\n保留淬劍境界、養劍階數、試劍進度、劍意與劍名；養劍屬性方向和專屬劍招會改為新劍胚。`,{title:'重鑄本命劍胚',confirmText:'飲露重鑄'})){modal.classList.add('show');return}if((state[item.count]||0)<1)return toast('歸元鑄胚露數量不足');state[item.count]--;state.swordEmbryo=next;normalizeSwordPath();modal.classList.remove('show');toast(`本命劍已歸元重鑄・${embryo.name}`);render();if(currentFeature==='bag')renderBagView('bag');save()});return false;
}
async function useItem(key,quantity=1){let used=false;const item=itemCatalog[key];if(item?.equipmentData)used=equipInventoryItem(item);else if(item?.identityAction==='gender')used=await useGenderRebirthMirror(key);else if(item?.identityAction)used=openIdentityChangeModal(key);else if(item?.swordEmbryoReversion)used=openSwordEmbryoReversion();else if(item?.dosageLimitGain)used=useDosageLimitPill(key,quantity);else if(item?.pillData)used=useAttributePill(item,quantity);else if(item?.brewData)used=useSpiritBrew(item,quantity);else if(key==='mindEmbodimentManual')used=useMindEmbodimentManual();else if(item?.techniqueBook)used=useTechniqueBook(key);else if(item?.sectInvitation)used=useSectInvitation(key);else if(item?.cultivationBundle)used=useCultivationBundle(key,quantity);else if(item?.resourceBundle)used=useResourceBundle(key,quantity);else if(item?.staminaRestore)used=useStaminaMedicine(key,quantity);else if(item?.moralGain)used=useMoralPill(key,quantity);if(used){closeItemModal();if(currentFeature==='bag')renderBagView('bag')}}
function itemSellPrice(item){return Math.max(1,Math.floor(Number(item.sellPrice)||1))}
function updateSellModal(){
  const item=itemCatalog[sellItemKey];if(!item)return;
  const owned=Math.max(0,Math.floor(Number(state[item.count])||0));
  sellItemQuantity=Math.max(1,Math.min(owned,sellItemQuantity));
  $('#sellModalTotal').textContent=`可獲得靈石：${formatLargeNumber(sellItemQuantity*itemSellPrice(item))}`;
  $('#sellConfirmBtn').disabled=owned<1;
}
function openSellModal(key,quantity=1){
  const item=itemCatalog[key];if(!item)return;
  const owned=Math.max(0,Math.floor(Number(state[item.count])||0));if(owned<1)return;
  sellItemKey=key;sellItemQuantity=Math.max(1,Math.min(owned,Math.floor(quantity)));
  $('#sellModalMessage').textContent=`確定販售「${item.name}」${formatLargeNumber(sellItemQuantity)}個？`;
  updateSellModal();$('#sellModal').classList.remove('hidden');
}
function closeSellModal(){$('#sellModal').classList.add('hidden');sellItemKey=null;sellItemQuantity=1}
function confirmSellItem(){
  const item=itemCatalog[sellItemKey];if(!item)return closeSellModal();
  const owned=Math.max(0,Math.floor(Number(state[item.count])||0));
  const quantity=Math.max(1,Math.min(owned,sellItemQuantity));if(owned<1)return closeSellModal();
  const earned=quantity*itemSellPrice(item);state[item.count]=owned-quantity;state.spiritStone+=earned;
  if(item.equipmentData&&state[item.count]<1){const slot=item.equipmentData.slot;if(state.equippedItems?.[slot]===item.equipmentData.id)delete state.equippedItems[slot];state.equipmentInventory=(state.equipmentInventory||[]).filter(e=>e.id!==item.equipmentData.id)}
  closeSellModal();closeItemModal();
  if(currentFeature==='bag')renderBagView('bag');render();save();toast(`已售出 ${item.name} ×${quantity}・靈石+${earned}`);
}
function promoteSect(){const need=sectPromotionCosts[state.sectRank];if(state.sectMerit<need)return;state.sectRank++;syncCurrentSectRecord();toast(`晉升為${sectRanks[state.sectRank]}・本門功勳保留`);renderSectView('home');save()}
function normalizeNpcDailyLog(log){return Object.fromEntries(Object.entries(log&&typeof log==='object'?log:{}).map(([key,record])=>[key,{date:record?.date||'',sparWon:!!record?.sparWon}]))}
function npcDailyState(index){const key=String(sectNpcs()[index].id),record=state.npcDaily[key],today=dateKey();if(!today)return record||{date:'',sparWon:true};if(!record||record.date!==today)state.npcDaily[key]={date:today,sparWon:false};else if(typeof record.sparWon!=='boolean')record.sparWon=false;return state.npcDaily[key]}
function renderNpcDetail(index){const n=sectNpcs()[index],npcStats=battleEnemyStats(n),daily=npcDailyState(index),master=index===0,elder=index===1,offering=index===2,challengeDisabled=master?(state.sectRank<2||state.prestige<200||state.actingLeader):daily.sparWon,combatLabel=master?(state.actingLeader?'已是代理掌門':state.sectRank<2?'挑戰掌門・需親傳弟子':state.prestige>=200?'挑戰掌門':'挑戰掌門・需200聲望'):(daily.sparWon?'今日切磋已勝':'切磋');$('#npcDetail').innerHTML=`<b>${n.title}・${n.name}</b><span>戰力 ${formatCombatPower(npcStats.combatPower)}</span><div><button data-npc-action="${master?'challenge':'spar'}" ${challengeDisabled?'disabled':''}>${combatLabel}</button>${master?'<button data-npc-action="greet">請安</button>':''}${elder?'<button data-npc-action="arts">學習功法</button>':''}${offering?'<button data-npc-action="shop">物資兌換</button>':''}</div>`;$$('[data-npc-action]').forEach(b=>b.onclick=()=>npcAction(index,b.dataset.npcAction))}
function npcAction(index,action){const n=sectNpcs()[index],daily=npcDailyState(index);if(['greet','spar'].includes(action)&&!requireTrustedTime())return;if(action==='spar'){if(daily.sparWon)return toast('今日已切磋勝利，明日再來');startNpcBattle(n);return}else if(action==='challenge'){challengeMaster();return}else if(action==='greet'){if(state.lastGreetingDay===dateKey())return toast('今日已向掌門請安');state.lastGreetingDay=dateKey();state.sectContribution+=100;toast('掌門頷首嘉許・門派貢獻+100')}else if(action==='arts'){renderSectLearning();return}else if(action==='shop'){renderSectPanel('shop');return}renderNpcDetail(index);save()}

function combatHealth(rootBone){return Math.max(125,120+Math.max(0,rootBone)*4)}
function combatEvasion(agility){return Math.max(0,agility)*3}
function combatAccuracy(spiritualPower){return Math.max(0,spiritualPower)*3}
function combatDodgeChance(attacker,defender){const evasion=Math.max(0,defender.evasion||0),accuracy=Math.max(0,attacker.accuracy||0);return Math.min(.35,evasion/(evasion+accuracy*4+1000))}
function combatCritical(spiritualPower){const rating=Math.max(0,spiritualPower)*3;return Math.min(.45,rating/(rating+3000))}
function battlePlayerStats(){
  const rootBone=effectiveCore('rootBone'),trueQi=effectiveCore('trueQi'),physique=effectiveCore('physique'),agility=effectiveCore('agility'),spiritualPower=effectiveCore('spiritualPower');
  const marks=swordPathMarkCounts(),alignment=cultivationAlignment(),guardPower=(1+Math.min(.2,marks.righteous*.02))*(alignment.id==='righteous'?1+alignment.strength:1),attackPower=alignment.id==='evil'?1+alignment.strength:1,hpPower=alignment.id==='righteous'?1+alignment.strength*.6:1,precision=alignment.id==='balance'?1+alignment.strength:1;
  return {
    maxHp:Math.round(combatHealth(rootBone)*(activeBodyInjury()==='internal'?.85:1)*hpPower),attack:Math.max(12,trueQi*5)*attackPower,qiAttack:Math.max(12,trueQi*5)*attackPower,bodyAttack:Math.max(12,(rootBone*2+physique*3)*(1+Math.min(.3,bodyRealmIndex()*.0375)))*attackPower,defense:Math.max(0,physique*20)*guardPower,
    evasion:combatEvasion(agility)*precision,accuracy:combatAccuracy(spiritualPower)*precision,crit:Math.min(.5,combatCritical(spiritualPower)+marks.evil*.005),damageReduction:alignment.id==='righteous'?alignment.strength*.5:alignment.id==='evil'?-alignment.strength*.35:0,alignmentSecondMove:alignment.id==='balance'?alignment.strength:0
  };
}
function bodyOnlyCore(){const core={rootBone:5,trueQi:5,physique:5,agility:5,spiritualPower:5};for(let level=1;level<=(state.bodyLevel||0);level++)sumGrowth(core,bodyAttributeGain(level));return core}
function bodyTrialPlayerStats(){
  const core=bodyOnlyCore(),hpBonus=(bodyPassiveUnlocked(1)?.1:0)+(bodyPassiveUnlocked(5)?.15:0),injury=activeBodyInjury();
  return {maxHp:Math.round(combatHealth(core.rootBone)*(1+hpBonus)*(injury==='internal'?.85:1)),attack:Math.max(12,core.trueQi*5),defense:Math.max(0,core.physique*20),evasion:combatEvasion(injury==='tendon'?core.agility*.85:core.agility),accuracy:combatAccuracy(core.spiritualPower),crit:combatCritical(core.spiritualPower),damageReduction:bodyPassiveUnlocked(6)?.15:0};
}
function bodyTrialEnemyStats(player,targetRounds){
  const realm=bodyRealmIndex()+1,defense=Math.round(player.defense*.7),crit=Math.min(.2,.04+realm*.01),targetTotal=.72+Math.min(.22,(realm-1)*.025),targetHit=player.maxHp*targetTotal/targetRounds,reduction=1-(player.damageReduction||0);let low=1,high=Math.max(200,player.maxHp*12);
  for(let i=0;i<28;i++){const attack=(low+high)/2,pressure=Math.max(160,attack*.8),mitigation=Math.max(.15,pressure/(pressure+player.defense)),expected=attack*.9*(1+crit*.5)*mitigation*reduction;if(expected<targetHit)low=attack;else high=attack}
  const attack=Math.max(24,Math.round((low+high)/2));return {combatPower:Math.round(attack*25+defense),core:{rootBone:realm*12,trueQi:Math.ceil(attack/5),physique:Math.ceil(defense/20),agility:realm*3,spiritualPower:realm*3},maxHp:Math.max(500,player.maxHp*8),attack,defense,evasion:0,accuracy:realm*9,crit};
}
function npcCoreFromPower(rawPower,n){
  const keys=Object.keys(combatPowerWeights),costs=keys.map(key=>combatPowerWeights[key]/5),profiles=[[1,1,1,1,1],[2,.85,1.2,.9,.85],[.85,2,.9,.95,1.2],[1.15,.85,2,.85,.9],[.85,.95,.85,2,1.15],[.85,1.15,.9,1.2,2]],seed=textSeed(`${n.seedScope||state.sect}・${n.id}・${n.seedScope?'fixed':state.sectJoinedAt||0}・屬性`);
  let target=Math.max(100,Math.ceil(rawPower/5)*5);while(target/5-20===1)target+=5;
  let randomState=seed||1;const random=()=>{randomState=(Math.imul(randomState,1664525)+1013904223)>>>0;return randomState/4294967296},profile=profiles[seed%profiles.length],weights=profile.map(value=>value*(.85+random()*.3)),weightTotal=weights.reduce((sum,value)=>sum+value,0),cores=Object.fromEntries(keys.map(key=>[key,1])),budget=target/5-20;
  let spent=0;keys.forEach((key,index)=>{const points=Math.floor(budget*(weights[index]/weightTotal)/costs[index]);cores[key]+=points;spent+=points*costs[index]});
  let remaining=budget-spent;if(remaining===1){const index=cores[keys[0]]>1?0:cores[keys[1]]>1?1:cores[keys[2]]>1?2:cores[keys[3]]>1?3:4;cores[keys[index]]--;remaining+=costs[index]}
  while(remaining>0){const candidates=costs.map((cost,index)=>({cost,index})).filter(item=>item.cost<=remaining&&remaining-item.cost!==1),pick=candidates[Math.floor(random()*candidates.length)];cores[keys[pick.index]]++;remaining-=pick.cost}
  return {combatPower:target,core:cores};
}
const sectNpcRealmPowers=[1200,3000,7500,18000,45000,110000,270000,650000,1500000],sectNpcRoleMultipliers=[2.4,1.9,1.65,1.25,.9];
function sectNpcCombatPower(n){const star=Math.max(1,Math.min(9,state.sectStar||1)),role=Math.max(0,Math.min(4,n?.role||0));return Math.round(sectNpcRealmPowers[star-1]*sectNpcRoleMultipliers[role]/5)*5}
function battleEnemyStats(n){
  const generated=npcCoreFromPower(sectNpcCombatPower(n),{...n,seedScope:`sect-${state.sectStar||1}-role-${n.role}`}),core=generated.core;
  return {combatPower:generated.combatPower,core,maxHp:combatHealth(core.rootBone),attack:Math.max(12,core.trueQi*5),defense:Math.max(0,core.physique*20),evasion:combatEvasion(core.agility),accuracy:combatAccuracy(core.spiritualPower),crit:combatCritical(core.spiritualPower)};
}
function startNpcBattle(n,mode='spar'){
  clearTimeout(battleTimer);
  startBgm('battle');
  const player=battlePlayerStats(),enemy=battleEnemyStats(n);
  battle={active:true,resolved:false,mode,round:1,completedRounds:0,playerMoveIndex:0,player:{...player,hp:player.maxHp},enemy:{...enemy,hp:enemy.maxHp,name:n.name,npc:n,race:'human'},logs:[]};
  $('#battleModal').classList.remove('hidden');$('#battleStage').classList.remove('hidden');$('#battleResult').classList.add('hidden');setBattleBackground('sect');
  $('#playerSilhouette').className=`battle-silhouette ${state.gender==='女'?'silhouette-player-female':'silhouette-player-male'}`;
  $('#enemySilhouette').className='battle-silhouette silhouette-human';
  $('#battlePlayerName').textContent=state.name;$('#battleEnemyName').textContent=n.name;
  $('#battleLog').innerHTML=`<p><b>${state.name}</b>與<b>${n.name}</b>抱拳行禮，${mode==='master'?'掌門之位挑戰':'切磋'}開始。</p>`;
  syncBattleWeapon();updateBattleUi();battleTimer=setTimeout(playerBattleTurn,700);
}
function damageRoll(attacker,defender,multiplier=1){
  if(Math.random()<combatDodgeChance(attacker,defender))return {damage:0,dodged:true,crit:false};
  const crit=Math.random()<attacker.crit,raw=attacker.attack*multiplier*(crit?1.5:1),offensePressure=Math.max(160,attacker.attack*.8),mitigation=Math.max(.15,offensePressure/(offensePressure+defender.defense));
  return {damage:Math.max(1,Math.round(raw*mitigation)),dodged:false,crit};
}
function formatBattleNumber(value){return formatLargeNumber(Math.max(0,Math.round(Number(value)||0)))}
function syncBattleWeapon(){
  const arena=$('.battle-arena'),lifeSword=$('#playerLifeSword'),hasSword=!!state.swordEmbryo;
  arena?.classList.toggle('has-player-sword',hasSword);lifeSword?.classList.toggle('visible',hasSword);
}
function swordTechniqueRoll(attacker,defender,technique,multiplier){
  const realm=swordRealmProfile(),marks=swordPathMarkCounts(),hits=Math.max(1,technique.hits||1),attacking={...attacker,accuracy:(attacker.accuracy||0)*(1+(technique.accuracyBonus||0)+realm.accuracy),crit:Math.min(.75,(attacker.crit||0)+(technique.critBonus||0))},guarding={...defender,defense:(defender.defense||0)*(1-Math.min(.8,(technique.armorPierce||0)+realm.armorPierce))},parts=[];
  multiplier*=(1+realm.damage+realm.techniqueDamage)*(1+swordNurtureTechniqueBonus(technique))*(1+Math.min(.2,marks.evil*.02));
  for(let index=0;index<hits;index++)parts.push(damageRoll(attacking,guarding,multiplier/hits));
  if(technique.repeatChance&&Math.random()<technique.repeatChance){const repeat=damageRoll(attacking,guarding,multiplier*(technique.repeatScale||.5));parts.push(repeat)}
  const landed=parts.filter(part=>!part.dodged),damage=landed.reduce((sum,part)=>sum+part.damage,0);return {damage,dodged:!landed.length,crit:landed.some(part=>part.crit),hits:landed.length,attempts:parts.length,repeated:parts.length>hits,parts};
}
function bodyTechniqueRoll(attacker,defender,technique,multiplier){const bodyAccuracy=Math.max(attacker.accuracy||0,(effectiveCore('rootBone')+effectiveCore('physique'))*1.5),attacking={...attacker,attack:attacker.bodyAttack||attacker.attack,accuracy:bodyAccuracy},guarding={...defender,defense:(defender.defense||0)*(1-(technique.armorPierce||0))},hits=Math.max(1,technique.hits||1),parts=[];for(let index=0;index<hits;index++)parts.push(damageRoll(attacking,guarding,multiplier/hits));const landed=parts.filter(part=>!part.dodged),damage=landed.reduce((sum,part)=>sum+part.damage,0),result={damage,dodged:!landed.length,crit:landed.some(part=>part.crit),hits:landed.length,attempts:parts.length,parts};if(!result.dodged&&technique.guardBonus)battle.player.damageReduction=Math.max(battle.player.damageReduction||0,technique.guardBonus);return result}
function sectSkillRoll(attacker,defender,technique,balanceBonus=1){const hit=damageRoll({...attacker,attack:attacker.qiAttack||attacker.attack},defender,technique.basePercent/100*balanceBonus);if(hit.dodged)return hit;const attributeDamage=Math.round(effectiveCore(technique.attribute)*technique.attributeMultiplier*balanceBonus*(hit.crit?1.5:1));return {...hit,damage:Math.max(1,hit.damage+attributeDamage),baseDamage:hit.damage,attributeDamage}}
function animateBattleStrike(attacker,target,damage,technique){
  const attackEl=$(attacker),targetEl=$(target),damageEl=$(target==='#enemySilhouette'?'#enemyDamage':'#playerDamage');
  const enemyCast=attacker==='#enemySilhouette',fx=$('#battleTechniqueFx'),arena=$('.battle-arena');
  attackEl.classList.remove('attacking');targetEl.classList.remove('hit');damageEl.classList.remove('show');
  arena?.classList.remove('clashing','player-strike','enemy-strike');
  fx.className='battle-technique-fx';void attackEl.offsetWidth;
  attackEl.classList.add('attacking');if(!damage.dodged)targetEl.classList.add('hit');
  const lifeSword=$('#playerLifeSword'),swordCast=!enemyCast&&!!technique.embryo;
  lifeSword?.classList.toggle('striking',swordCast);lifeSword?.classList.toggle(`strike-${technique.kind}`,swordCast);
  arena?.classList.add('clashing',enemyCast?'enemy-strike':'player-strike');
  const pathProfile=!enemyCast&&technique.embryo?swordTechniquePathProfile():{path:'unmarked',righteous:0,evil:0,balance:0},pathColors=swordTechniquePathColors(pathProfile);fx.style.setProperty('--righteous-weight',pathProfile.righteous);fx.style.setProperty('--evil-weight',pathProfile.evil);fx.style.setProperty('--balance-weight',pathProfile.balance);fx.style.setProperty('--fx-core',pathColors.core);fx.style.setProperty('--fx-main',pathColors.main);fx.style.setProperty('--fx-glow',pathColors.glow);
  const arenaRect=arena.getBoundingClientRect(),sourceRect=(swordCast?lifeSword:attackEl).getBoundingClientRect(),targetRect=targetEl.getBoundingClientRect(),sourceX=sourceRect.left+sourceRect.width/2-arenaRect.left,targetX=targetRect.left+targetRect.width/2-arenaRect.left,targetY=targetRect.top+targetRect.height*.47-arenaRect.top;
  if(swordCast){lifeSword.style.setProperty('--sword-travel',`${targetX-sourceX}px`);lifeSword.style.setProperty('--sword-rise',`${targetY-(sourceRect.top+sourceRect.height*.47-arenaRect.top)}px`);lifeSword.style.setProperty('--sword-glow',pathColors.main)}
  fx.style.left=`${Math.min(sourceX,targetX)}px`;fx.style.right='auto';fx.style.width=`${Math.abs(targetX-sourceX)}px`;fx.style.top=`${targetY-61}px`;
  if(technique.kind==='sectSkill'||technique.kind==='body')fx.dataset.skillName=technique.name;
  fx.classList.add(enemyCast?'enemy-cast':'player-cast',`${technique.kind}-technique`,`${technique.id}-move`,`path-${pathProfile.path}`);
  const parts=damage.parts||[damage];
  damageEl.innerHTML=parts.map((part,index)=>`<i style="--hit-index:${index}">${part.dodged?'閃避':`-${formatBattleNumber(part.damage)}${part.crit?' <em>暴擊</em>':''}`}</i>`).join('');damageEl.classList.toggle('multi-hit',parts.length>1);damageEl.classList.add('show');
  setTimeout(()=>{attackEl.classList.remove('attacking');targetEl.classList.remove('hit');lifeSword?.classList.remove('striking',`strike-${technique.kind}`);lifeSword?.removeAttribute('style');damageEl.classList.remove('show','multi-hit');damageEl.replaceChildren();arena?.classList.remove('clashing','player-strike','enemy-strike');fx.className='battle-technique-fx';fx.removeAttribute('style')},parts.length>1?1250:860);
}
function appendBattleLog(text,side='player'){
  battle.logs.push(text);if(battle.logs.length>6)battle.logs.shift();
  $('#battleLog').innerHTML=battle.logs.map((x,i)=>`<p class="${i===battle.logs.length-1?side:''}">${x}</p>`).join('');$('#battleLog').scrollTop=$('#battleLog').scrollHeight;
}
function activeBattleArtifact(){const id=state.equippedArtifact;return id==='four-poles-stele'&&battle?.mode==='bodyTrial'?'':id}
function artifactDamageMultiplier(){return activeBattleArtifact()==='sun-moon-wheel'?(battle.round%2?1.25:.75):1}
function applyArtifactDamage(target,raw,side){
  let damage=Math.max(0,Math.round(raw*artifactDamageMultiplier()));
  if(activeBattleArtifact()!=='four-poles-stele'||damage<=0)return damage;
  battle.artifactBarriers=battle.artifactBarriers||{player:[],enemy:[]};const broken=battle.artifactBarriers[side],before=target.hp,targetMax=target.maxHp;
  for(const threshold of [.7,.3]){const line=Math.ceil(targetMax*threshold);if(!broken.includes(threshold)&&before>line&&before-damage<=line){broken.push(threshold);appendBattleLog(`四極鎮命碑顯化，將氣血鎮於 ${Math.round(threshold*100)}% 命界，溢出傷害消散。`,side==='player'?'enemy':'player');return before-line}}
  return damage;
}
const boundaryLimit=30;
function shiftBoundary(amount){
  const current=Number(battle.boundaryMomentum)||0;
  const opposed=current&&Math.sign(current)!==Math.sign(amount);
  battle.boundaryMomentum=Math.max(-boundaryLimit,Math.min(boundaryLimit,current+(opposed?Math.sign(amount)*Math.ceil(Math.abs(amount)/2):amount)));
}
function artifactPush(side,technique,hit){
  if(activeBattleArtifact()!=='mountain-river-seal')return;
  battle.boundaryMomentum=Number(battle.boundaryMomentum)||0;
  if(side==='player'){
    if(hit.dodged){if(technique.embryo)shiftBoundary(-8)}
    else{shiftBoundary(technique.kind==='body'?8:technique.embryo?15:10);if(technique.kind==='body')battle.enemyPushWeakened=true}
    if(battle.boundaryMomentum>=boundaryLimit)battle.enemyMustBreak=true;
  }else if(!hit.dodged){
    const push=Math.max(0,10-(battle.enemyPushWeakened?4:0));battle.enemyPushWeakened=false;shiftBoundary(-push);if(battle.boundaryMomentum<=-boundaryLimit)battle.playerMustBreak=true;
  }
}
function performBoundaryBreak(side){
  const battleArena=$('.battle-arena');battleArena?.classList.add('boundary-breaking');setTimeout(()=>battleArena?.classList.remove('boundary-breaking'),760);
  appendBattleLog(`${side==='player'?state.name:battle.enemy.name}受界勢壓制，只得停手破界。`,side);battle.boundaryMomentum=0;if(side==='player')battle.playerMustBreak=false;else battle.enemyMustBreak=false;updateBattleUi();
}
function playerBattleTurn(){
  if(!battle?.active)return;if(battle.playerMustBreak){performBoundaryBreak('player');return battleTimer=setTimeout(enemyBattleTurn,950)}const equipped=equippedCombatTechniques(),moves=battle.mode==='bodyTrial'?equipped.filter(move=>move.kind==='body'):equipped,slot=battle.playerMoveIndex%moves.length,technique=moves[slot]||highestBodyTechnique()||startingTechniques.find(move=>combatTechniqueAvailable(move))||startingTechniques[0];battle.playerMoveIndex++;const balanceBonus=battle.mode!=='bodyTrial'&&slot===1?1+(technique.embryo?Math.min(.5,swordPathMarkCounts().balance*.05):0)+(battle.player.alignmentSecondMove||0):1,mult=technique.kind==='sectSkill'?balanceBonus:(technique.min+Math.random()*(technique.max-technique.min))*balanceBonus,hit=technique.kind==='sectSkill'?sectSkillRoll(battle.player,battle.enemy,technique,balanceBonus):technique.embryo?swordTechniqueRoll(battle.player,battle.enemy,technique,mult):technique.kind==='body'?bodyTechniqueRoll(battle.player,battle.enemy,technique,mult):damageRoll({...battle.player,attack:battle.player.qiAttack||battle.player.attack},battle.enemy,mult);
  hit.damage=applyArtifactDamage(battle.enemy,hit.damage,'enemy');battle.enemy.hp=Math.max(battle.mode==='bodyTrial'?1:0,battle.enemy.hp-hit.damage);artifactPush('player',technique,hit);animateBattleStrike('#playerSilhouette','#enemySilhouette',hit,technique);
  const healed=hit.dodged?0:Math.min(battle.player.maxHp-battle.player.hp,Math.max(0,Math.round(hit.damage*(technique.lifeSteal||0))));if(healed>0)battle.player.hp+=healed;const repeatText=hit.repeated?'，殘影返斬觸發':'';const healText=healed?`，本命回流恢復 ${formatBattleNumber(healed)} 氣血`:'';
  appendBattleLog(hit.dodged?`${battle.enemy.name}看破招式來勢，避開了${state.name}的${technique.name}。`:`${state.name}${technique.kind==='sectSkill'?'運轉門派真傳':technique.embryo?'催動本命劍':'凝神馭元'}，使出${technique.name}，對${battle.enemy.name}造成了${formatBattleNumber(hit.damage)}傷害${repeatText}${healText}。`,'player');updateBattleUi();
  if(battle.mode==='ascension-road-end'&&battle.enemy.hp/battle.enemy.maxHp<.1){battle.enemy.hp=Math.ceil(battle.enemy.maxHp*.1);updateBattleUi();return setTimeout(()=>finishBattle(true,'天路之主抬手止戰：「夠了。你已讓我看見自己的道。」'),650)}
  if(battle.enemy.hp<=0){if(battle.mode==='mainline'&&battle.waveIndex<2)return setTimeout(advanceMainlineWave,650);return setTimeout(()=>finishBattle(true,'對手氣息已散，無力再戰。'),650)}
  battleTimer=setTimeout(enemyBattleTurn,950);
}
function enemyBattleTurn(){
  if(!battle?.active)return;if(battle.enemyMustBreak){performBoundaryBreak('enemy');battle.completedRounds++;battle.round++;return battleTimer=setTimeout(playerBattleTurn,900)}if(battle.mode==='mainline'){const stage=battle.mainlineStage;if(battle.completedRounds>0&&battle.completedRounds%3===0){battle.enemy.attack=Math.round(battle.enemy.attack*1.06);appendBattleLog(`${stage.boss}引動「${mainlineMechanics[stage.id-1].split('：')[0]}」，攻勢再度提升。`,'enemy')}if(!battle.mechanicTriggered&&[7,17,18].includes(stage.id)&&battle.enemy.hp<=battle.enemy.maxHp*.5){battle.mechanicTriggered=true;battle.enemy.attack=Math.round(battle.enemy.attack*1.15);battle.enemy.defense=Math.round(battle.enemy.defense*1.1);appendBattleLog(`${stage.boss}氣息驟變，關卡核心機制進入第二階段。`,'enemy')}}const technique=startingTechniques[0],mult=technique.min+Math.random()*(technique.max-technique.min),hit=damageRoll(battle.enemy,battle.player,mult);
  const damage=applyArtifactDamage(battle.player,Math.max(hit.dodged?0:1,Math.round(hit.damage*(1-(battle.player.damageReduction||0)))),'player'),minimumHp=battle.mode==='bodyTrial'&&battle.guaranteedBodyTrial?1:0;battle.player.hp=Math.max(minimumHp,battle.player.hp-damage);artifactPush('enemy',technique,{...hit,damage});animateBattleStrike('#enemySilhouette','#playerSilhouette',{...hit,damage},technique);
  appendBattleLog(hit.dodged?`${state.name}踏影側身，避開了${battle.enemy.name}的${technique.name}。`:`${battle.enemy.name}${technique.kind==='sword'?'引氣淬鋒':'凝神引元'}，使出${technique.name}，對${state.name}造成了${formatBattleNumber(damage)}傷害。`,'enemy');
  battle.completedRounds++;updateBattleUi();
  if(battle.player.hp<=0)return setTimeout(()=>finishBattle(false,battle.mode==='master'?'你氣力不支，本次掌門挑戰落敗。':battle.mode==='swordTrial'?'劍道幻影破去招式，本次試劍落敗。':battle.mode==='bodyTrial'?'肉身未能撐住試煉化身的攻勢。':'你氣力不支，本次切磋落敗。'),650);
  if(battle.mode==='bodyTrial'&&battle.completedRounds>=battle.targetRounds)return setTimeout(()=>finishBattle(true,`你以肉身承受猛攻，成功撐過 ${battle.targetRounds} 回合。`),650);
  battle.round++;updateBattleUi();battleTimer=setTimeout(playerBattleTurn,900);
}
function updateBattleUi(){
  if(!battle)return;$('#battleTurn').textContent=battle.mode==='bodyTrial'?`第 ${Math.min(battle.round,battle.targetRounds)} / ${battle.targetRounds} 回合`:`第${['一','二','三','四','五','六','七','八','九','十'][Math.min(9,battle.round-1)]||battle.round}回合`;
  const artifactId=activeBattleArtifact(),arena=$('.battle-arena'),artifactFx=$('#artifactBattleFx');if(artifactId==='sun-moon-wheel')$('#battleTurn').textContent+=(battle.round%2?'・日相 125%':'・月相 75%');else if(artifactId==='mountain-river-seal')$('#battleTurn').textContent+=`・界勢 ${battle.boundaryMomentum||0} / ±${boundaryLimit}`;else if(artifactId==='four-poles-stele')$('#battleTurn').textContent+='・鎮命界';
  arena?.classList.toggle('artifact-boundary',artifactId==='mountain-river-seal');arena?.style.setProperty('--boundary-strength',Math.abs(battle.boundaryMomentum||0)/boundaryLimit);arena?.classList.toggle('artifact-sun',artifactId==='sun-moon-wheel'&&battle.round%2===1);arena?.classList.toggle('artifact-moon',artifactId==='sun-moon-wheel'&&battle.round%2===0);artifactFx?.classList.toggle('active',artifactId==='mountain-river-seal'||artifactId==='sun-moon-wheel');
  const marker=$('#boundaryGaugeMarker'),fill=$('#boundaryGaugeFill'),momentum=Math.max(-boundaryLimit,Math.min(boundaryLimit,battle.boundaryMomentum||0)),percent=(momentum+boundaryLimit)/(boundaryLimit*2)*100;if(marker)marker.style.left=`${percent}%`;if(fill){fill.style.left=`${Math.min(50,percent)}%`;fill.style.width=`${Math.abs(percent-50)}%`;fill.classList.toggle('enemy',momentum<0)}
  $('#playerHealthBar').style.width=`${Math.max(0,battle.player.hp/battle.player.maxHp*100)}%`;$('#enemyHealthBar').style.width=`${Math.max(0,battle.enemy.hp/battle.enemy.maxHp*100)}%`;
  $('#playerHealthText').textContent=`${Math.ceil(battle.player.hp).toLocaleString()} / ${battle.player.maxHp.toLocaleString()}`;$('#enemyHealthText').textContent=`${Math.ceil(battle.enemy.hp).toLocaleString()} / ${battle.enemy.maxHp.toLocaleString()}`;
  const exit=$('#battleExitBtn'),ready=battle.completedRounds>=3;exit.disabled=!ready;exit.textContent=battle.mode==='spar'?'退出':'認輸';
}
function forceEndBattle(){
  if(!battle?.active||battle.completedRounds<3)return;
  if(battle.mode!=='spar')return finishBattle(false,battle.mode==='master'?'你中途認輸，本次掌門挑戰落敗。':battle.mode==='bodyTrial'?'你中途退出，本次肉身試煉落敗。':'你收劍退出，本次試劍落敗。');
  const playerRate=battle.player.hp/battle.player.maxHp,enemyRate=battle.enemy.hp/battle.enemy.maxHp;
  finishBattle(playerRate>=enemyRate,`三回合後終止${battle.mode==='master'?'掌門挑戰':'切磋'}，以剩餘氣血比例判定${playerRate>=enemyRate?'勝出':'落敗'}。`);
}
function finishBattle(won,reason){
  if(!battle||battle.resolved)return;clearTimeout(battleTimer);clearSwordTrialAdvance();battle.active=false;battle.resolved=true;battle.won=won;
  let reward='';
  if(won&&battle.mode==='master'){state.actingLeader=true;reward=' 已取得代理掌門身分。'}
  else if(battle.mode==='swordTrial'){if(won){const stage=state.swordTrialWins+1,intent=swordTrialIntentReward(stage);state.swordTrialWins++;state.swordInsight++;state.swordIntent+=intent;reward=` 戰鬥感悟+1${intent?`、劍意+${intent}`:''}。`;}else reward=' 本關沒有消耗挑戰次數，可調整劍招後再戰。'}
  else if(battle.mode==='bodyTrial'){const trialLevel=battle.bodyTrialLevel||state.bodyLevel+1,key=String(trialLevel);if(won){if(trialLevel===state.bodyLevel+1&&bodyFoundationsReady()&&bodyBreakthroughMaterialsReady(battle.bodyRequirement)){consumeBodyBreakthroughMaterials(battle.bodyRequirement);state.bodyLevel++;resetBodyFoundations();state.bodyTrialFailures[key]=0;applyAttributeGain(bodyAttributeGain(state.bodyLevel));syncSectTaskRouteUnlocks('body');reward=` 突破物資已投入，肉身突破至${realmName(state.bodyLevel,bodyRealms)}。`}else reward=' 試煉資格已失效，未完成突破。'}else{state.bodyTrialFailures[key]=(state.bodyTrialFailures[key]||0)+1;const injury=Math.random()<.6?'internal':'tendon';inflictBodyInjury(injury);reward=` 突破物資完整保留；留下${bodyInjuries[injury].name}。此境已失敗 ${state.bodyTrialFailures[key]} 次。`}}
  else if(battle.mode==='ascension-delusion'||battle.mode==='ascension-road-end'){const roadEnd=battle.mode==='ascension-road-end';reward=won?(roadEnd?' 你已逼天路之主退至認可之線。':' 你沒有消滅疑心，卻已能辨認它的聲音。'):(roadEnd?' 天路沒有關；待你能再多走一步，便再來。':' 照妄未破；把今日輸掉的這一刻一起帶回來。');}
  else if(battle.mode==='mainline'){if(won){const stage=battle.mainlineStage,first=stage.id===state.mainlineCleared+1;if(first){state.mainlineCleared=stage.id;reward=` ${mainlineAftermath[stage.id-1]} 首通獎勵：${grantMainlineFirstClearRewards(stage)}。`}else reward=' 你已完整重溫此關劇情與戰鬥；重複通關不再獲得任何獎勵。持續取得素材需使用神念遠遊。'}else reward=' 可調整招式或提升任一修行道路後再次挑戰；本副本不消耗挑戰次數。'}
  else if(battle.mode==='spar'&&won){const index=sectNpcs().findIndex(n=>n.id===battle.enemy.npc?.id),intentGain=[0,6,4,2,1][index]||0;if(index>=0)npcDailyState(index).sparWon=true;state.prestige+=5;if(state.swordEmbryo&&intentGain)state.swordIntent+=intentGain;reward=` 聲望+5${state.swordEmbryo&&intentGain?`、劍意+${intentGain}`:''}；今日無法再與此人切磋。`}

  if(battle.mode==='swordTrial'&&won&&state.swordTrialWins%10===0&&!state.swordTrialChoices[String(state.swordTrialWins)])state.swordTrialPendingChoice=state.swordTrialWins;
  if(won&&battle.mode==='bodyTrial'&&state.bodyLevel===battle.bodyTrialLevel)queueRealmEncounter('body',state.bodyLevel);
  save();render();
  $('#battleStage').classList.add('hidden');$('#battleResult').classList.remove('hidden');$('#battleResultSeal').textContent=won?'勝':'敗';$('#battleResultSeal').classList.toggle('defeat',!won);
  const nextButton=$('#battleResultNext'),closeButton=$('#battleResultClose'),pathChoice=$('#swordPathChoice');
  nextButton.classList.add('hidden');pathChoice.classList.add('hidden');closeButton.disabled=false;closeButton.textContent=battle.mode==='ascension-delusion'||battle.mode==='ascension-road-end'?'繼續劇情':battle.mode==='swordTrial'?'退出':'返回';
  $('#battleResultTitle').textContent=won?'戰鬥勝利':'戰鬥失敗';
  let resultText=`${reason}${reward}`;
  if(battle.mode==='swordTrial'&&won){
    const milestone=state.swordTrialWins%10===0&&!state.swordTrialChoices[String(state.swordTrialWins)];if(milestone){pathChoice.classList.remove('hidden');closeButton.disabled=true}
    else if(canAdvanceSwordTrial()){nextButton.classList.remove('hidden');scheduleSwordTrialAdvance()}
    else resultText+=' 已通過試劍境第九十關，後續關卡將於未來境界開放。';
  }
  $('#battleResultText').textContent=resultText;
  if(battle.mode==='mainline')setTimeout(()=>won?showMainlineVictoryDialogue(battle.mainlineStage):showMainlineDefeatDialogue(battle.mainlineStage),180);
}
function closeBattle(){const npcId=battle?.enemy?.npc?.id,mode=battle?.mode,won=!!battle?.won,arena=$('.battle-arena');clearTimeout(battleTimer);clearSwordTrialAdvance();battle=null;$('#battleModal').classList.add('hidden');arena?.style.removeProperty('background-image');arena?.style.removeProperty('background-position');if(mode==='ascension-delusion'||mode==='ascension-road-end'){openAscensionAftermath(mode,won);return}startPathBgm();if(currentFeature==='sect'&&npcId!=null){const index=sectNpcs().findIndex(n=>n.id===npcId);renderSectPanel('npcs');if(index>=0)renderNpcDetail(index)}else if(currentFeature==='experience'&&mode==='swordTrial')renderExperiencePanel('trial');else if(currentFeature==='swordPrimary'&&mode==='swordTrial')renderPrimarySwordPanel('trial');else if(currentFeature==='experience'&&mode==='bodyTrial')renderExperiencePanel('bodyTrial');else if(currentFeature==='bodyPrimary'&&mode==='bodyTrial')renderPrimaryBodyPanel('bodyTrial');else if(currentFeature==='mainline'&&mode==='mainline')renderMainlinePage()}
function updatePracticeTimers(){
  if(currentFeature!=='sect'||currentSectView!=='practice')return;
  for(const [key,prefix] of [['practiceBuff','practice'],['transmissionBuff','transmission']]){const bar=$(`#${prefix}TimerBar`),text=$(`#${prefix}TimerText`);if(!bar||!text)continue;const active=buffActive(key);bar.style.width=`${buffPercent(key)}%`;text.textContent=active?buffClock(key):'未開啟';if(!active&&text.closest('.buff-timer')?.classList.contains('active')){renderSectView('practice');render();break}}
}
function dailyPractice(){if(!requireTrustedTime())return;if(state.sectRank<1)return toast('需晉升內門弟子才能使用練功房');if(state.lastPracticeDay===dateKey())return toast('今日已完成練功');if(state.spiritStone<300)return toast(`尚缺 ${Math.ceil(300-state.spiritStone)} 靈石`);state.spiritStone-=300;state.lastPracticeDay=dateKey();const years=state.actingLeader?20:10;addCultivationBuff('practiceBuff',years);toast(`練功已開啟・5倍修為持續${years}年`);renderSectView('practice');render();save()}
function masterTransmission(times,cost){if(state.sectRank<1)return toast('需晉升內門弟子才能接受掌門傳功');if(buffActive('transmissionBuff'))return toast('掌門傳功進行中，需等待本次傳功結束');if(state.spiritJade<cost)return toast('靈玉不足');state.spiritJade-=cost;addCultivationBuff('transmissionBuff',10*times);toast(`掌門傳功已開啟・8倍修為增加 ${10*times} 年`);renderSectView('practice');render();save()}
function claimSalary(){if(!requireTrustedTime())return;if(state.lastSalaryDay===dateKey())return;const amount=sectSalary[state.sectRank];state.spiritStone+=amount;state.lastSalaryDay=dateKey();toast(`俸祿・靈石+${formatLargeNumber(amount)}`);renderSectView('home');render();save()}
async function challengeMaster(){
  if(state.actingLeader)return toast('你已是代理掌門');
  if(state.sectRank<2)return toast('需晉升親傳弟子，才有資格挑戰掌門');
  if(state.prestige<200)return toast('挑戰掌門需要200聲望');
  const confirmed=await gameConfirm('此戰將消耗 200 聲望。\n戰勝掌門可取得代理掌門身分；若挑戰失敗，聲望不予退還。\n\n是否確認挑戰？',{title:'挑戰掌門',confirmText:'消耗200聲望挑戰',danger:true});
  if(!confirmed||state.actingLeader)return;
  if(state.prestige<200)return toast('目前聲望不足，無法挑戰掌門');
  state.prestige-=200;save();render();startNpcBattle(sectNpcs()[0],'master');
}

const caveAreaMaxLevel=30;
const caveAreas = {
  food:{label:'食物',value:'food',worker:'workerFood',level:'foodAreaLevel',icon:'assets/qstyle-v2/food-cutout.png',baseCap:120,foodCost:0,upgradeBase:40},
  wood:{label:'木材',value:'wood',worker:'workerWood',level:'woodAreaLevel',icon:'assets/qstyle-v2/wood-cutout.png',baseCap:100,foodCost:2,upgradeBase:50},
  meteorIron:{label:'隕鐵',value:'meteorIron',worker:'workerMeteorIron',level:'meteorIronAreaLevel',icon:'assets/qstyle-v2/meteor-iron-cutout.png',baseCap:100,foodCost:4,upgradeBase:60}
};
const caveFacilities={
  cultivation:{label:'聚靈室',seal:'氣',level:'caveCultivationLevel',enabled:'caveCultivationEnabled',description:'引靈入室，持續提高線上與離線修為。'},
  sword:{label:'洗劍池',seal:'劍',level:'caveSwordLevel',enabled:'caveSwordEnabled',description:'本命劍浸養於靈泉，掛機時額外凝聚劍元。'},
  body:{label:'鍛體室',seal:'體',level:'caveBodyLevel',enabled:'caveBodyEnabled',description:'以地脈協助收功，降低鍛體材料消耗與受傷風險。'}
};
function caveAreaLevel(area,level=state[area.level]){return Math.max(1,Math.min(caveAreaMaxLevel,Math.floor(level||1)))}
function areaCapacity(area,level=state[area.level]){return Math.floor(area.baseCap*Math.pow(1.32,caveAreaLevel(area,level)-1))}
function areaWorkerMax(area,level=state[area.level]){return caveAreaLevel(area,level)}
function areaOutput(area,level=state[area.level]){return 1+Math.floor((caveAreaLevel(area,level)-1)/2)}
function areaUpgradeCost(area,level=state[area.level]){const current=caveAreaLevel(area,level);return Math.floor(areaCapacity(area,current)*(area.upgradeBase/100))}
function normalizeCaveWorkers(){state.workerSpiritStone=0;Object.values(caveAreas).forEach(area=>{state[area.level]=caveAreaLevel(area);state[area.worker]=Math.max(0,Math.min(Math.floor(state[area.worker]||0),areaWorkerMax(area)))})}
function normalizeCaveState(){
  state.caveCoreLevel=Math.max(1,Math.min(7,Math.floor(state.caveCoreLevel||1)));
  for(const facility of Object.values(caveFacilities)){state[facility.level]=Math.max(1,Math.min(7,Math.floor(state[facility.level]||1)));state[facility.enabled]=!!state[facility.enabled]}
  state.caveSwordTicks=Math.max(0,Math.floor(state.caveSwordTicks||0));state.caveBodyTicks=Math.max(0,Math.floor(state.caveBodyTicks||0));
  if(!state.bodyPathOpened)state.caveBodyEnabled=false;
  while(caveSpiritUsed()>caveSpiritCapacity()){const enabled=Object.values(caveFacilities).reverse().find(f=>state[f.enabled]);if(!enabled)break;state[enabled.enabled]=false}
}
function caveSpiritCapacity(){return 4+(state.caveCoreLevel-1)*2}
function caveFacilityDraw(facility){return 3+Math.floor((state[facility.level]-1)/2)}
function caveSpiritUsed(){return Object.values(caveFacilities).reduce((sum,facility)=>sum+(state[facility.enabled]?caveFacilityDraw(facility):0),0)}
function caveCultivationBonus(){return state.caveCultivationEnabled&&state.spiritPathOpened?.08+state.caveCultivationLevel*.02:0}
function caveFacilityEffect(key){
  const level=state[caveFacilities[key].level];
  if(key==='cultivation')return `修為效率 +${Math.round((.08+level*.02)*100)}%`;
  if(key==='sword')return `劍元效率 +${Math.round((.08+level*.02)*100)}%`;
  return `鍛體材料 -${Math.min(25,level*3)}%・受傷率 -${level*2}%`;
}
function caveCoreUpgradeCost(){const level=state.caveCoreLevel;return {stone:Math.floor(780*Math.pow(level,1.7)),wood:Math.floor(420*Math.pow(level,1.5)),iron:Math.floor(180*Math.pow(level,1.45))}}
function caveFacilityUpgradeCost(key){const level=state[caveFacilities[key].level],weight={cultivation:1,sword:1.15,body:1.1}[key];return {stone:Math.floor(520*weight*Math.pow(level,1.65)),wood:Math.floor(240*weight*Math.pow(level,1.5)),iron:Math.floor(100*weight*Math.pow(level,1.45))}}
function assignedChildren(){return Object.values(caveAreas).reduce((sum,a)=>sum+state[a.worker],0)}
function availableChildren(){return Math.max(0,state.daoChildTotal-assignedChildren())}
const daoChildMax=caveAreaMaxLevel*Object.keys(caveAreas).length;
function daoChildCost(){return Math.floor(50*Math.pow(state.daoChildBought+1,1.35))}
function renderCavePanel(view='dwelling',preserveScroll=false){
  currentCaveView=view;
  const description=$('#featureDescription'),savedScrollTop=preserveScroll?description.scrollTop:0,savedScrollLeft=preserveScroll?description.scrollLeft:0,savedTabScroll=preserveScroll?description.querySelector('.cave-tabs')?.scrollLeft||0:0;
  const tabs=[['dwelling','靈脈'],['production','資源生產'],['alchemy','丹房'],['forge','器室'],['brew','釀坊'],['study','書房']];if(state.partnerSystem?.established)tabs.push(['partner','道侶']);else if(view==='partner')view='dwelling';
  description.innerHTML=`<div class="cave-tabs">${tabs.map(([key,label])=>`<button data-cave-view="${key}" class="${key===view?'active':''}">${label}</button>`).join('')}</div><div id="caveInner"></div>`;
  $$('.cave-tabs button').forEach(b=>b.onclick=()=>renderCaveView(b.dataset.caveView));
  const tabBar=$('.cave-tabs'),activeTab=$('.cave-tabs .active');if(tabBar){tabBar.addEventListener('wheel',event=>{if(Math.abs(event.deltaY)<=Math.abs(event.deltaX))return;tabBar.scrollLeft+=event.deltaY;event.preventDefault()},{passive:false});if(activeTab)tabBar.scrollLeft=activeTab.offsetLeft-tabBar.offsetLeft-(tabBar.clientWidth-activeTab.clientWidth)/2}
  renderCaveView(view);
  if(preserveScroll){description.scrollTop=savedScrollTop;description.scrollLeft=savedScrollLeft;if(tabBar)tabBar.scrollLeft=savedTabScroll}
}
function productionMaxTier(){return worldProgressTier()}
function lootAmount(name){const count=productionMaterialCountByName[name];return Math.max(0,Math.floor(count?state[count]||0:state.mainlineLoot?.[name]||0))}
function spendLoot(name,amount){const count=productionMaterialCountByName[name];if(count)state[count]=lootAmount(name)-amount;else{state.mainlineLoot=state.mainlineLoot||{};state.mainlineLoot[name]=lootAmount(name)-amount}}
function renderAlchemyProduction(inner){const max=productionMaxTier(),tier=Math.max(1,Math.min(max,9,state.craftingTier||1)),unlocked=tier<=max,type=pillTypes.find(x=>x[0]===state.craftingPill)||pillTypes[0],need=pillNeeds[tier-1],herb=lootAmount(type[4]),sand=lootAmount('丹砂'),can=unlocked&&herb>=need[0]&&sand>=need[1],tierText=['一','二','三','四','五','六','七','八','九'][tier-1],gain=pillTierGain(tier),recipe=`<section class="craft-requirement inline-craft-requirement"><b>${type[1]}</b><span class="craft-effect-preview">丹效：服用後永久 ${type[3]} +${gain}</span><span>${type[4]} ${herb}/${need[0]}</span><span>丹砂 ${sand}/${need[1]}</span>${unlocked?'':`<span class="realm-lock">境界不足：需達到可煉製${tierText}階丹藥的境界</span>`}<button id="craftPillBtn" ${can?'':'disabled'}>${unlocked?'煉製一顆':'境界不足'}</button></section>`;inner.innerHTML=`<section class="production-workshop"><button data-production-back="alchemy">返回丹爐</button><h2>丹房生產</h2><p>點選丹藥即可在旁查看材料・目前最高可煉 ${['一','二','三','四','五','六','七','八','九'][max-1]}階</p><div class="production-tier-tabs">${Array.from({length:9},(_,i)=>`<button data-craft-tier="${i+1}" class="${tier===i+1?'active':''} ${i+1>max?'tier-locked':''}">${i+1}階${i+1>max?'・未達境界':''}</button>`).join('')}</div><div class="production-choice-grid inline-recipe-grid">${pillTypes.map(([key,name,,label])=>`<div class="production-choice-item ${type[0]===key?'selected':''}"><button data-pill-type="${key}" class="${type[0]===key?'active':''}"><img src="assets/qstyle-v2/production/pills/${key}-t${tier}.png"><b>${tierText}階${name}</b><small>${label} +${gain}</small></button>${type[0]===key?recipe:''}</div>`).join('')}</div></section>`;bindProductionControls('alchemy');$$('[data-pill-type]').forEach(b=>b.onclick=()=>{state.craftingPill=b.dataset.pillType;renderAlchemyProduction(inner)});$('#craftPillBtn').onclick=()=>{if(!unlocked)return toast('目前境界尚不足以煉製此階丹藥');if(!can)return;const itemKey=`pill-${type[0]}-t${tier}`;if(!canStoreItem(itemKey,1))return toast('儲物袋容量不足');spendLoot(type[4],need[0]);spendLoot('丹砂',need[1]);state[`pillCount_${type[0]}_${tier}`]=(state[`pillCount_${type[0]}_${tier}`]||0)+1;toast(`煉成${tierText}階${type[1]}`);save();renderAlchemyProduction(inner)}}
function rollInt(min,max){return min+Math.floor(Math.random()*(max-min+1))}
function equipmentCraftPreview(tier,quality,slot){const index=equipmentSlots.indexOf(slot);if(index<5){const range=(quality==='rare'?equipmentRareRolls:equipmentNormalRolls)[tier-1][index];return `${slot[3]} ${range[0]}～${range[1]}`}const count=tier<=3?1:tier<=6?2:3,min=tier<=3?1:tier<=6?2:3,max=tier<=3?2:tier<=6?5:8;return `${count} 條隨機五行功法效果，每條 +${min.toFixed(1)}%～${max.toFixed(1)}%`}
function craftEquipment(){const tier=Math.min(productionMaxTier(),state.craftingTier||1),slot=equipmentSlots.find(x=>x[0]===state.craftingSlot)||equipmentSlots[0],quality=state.craftingQuality==='rare'?'rare':'normal',need=forgeNeeds[tier-1],mainKey=`mainlineMaterial_${slot[4]}`,tierMat=tierMaterials[tier-1];if((state[mainKey]||0)<need[0]||lootAmount(tierMat)<need[1]||(quality==='rare'&&lootAmount('器靈精魄')<need[2]))return toast('製作素材不足');if(bagUsedSlots()>=bagCapacity())return toast('儲物袋容量不足');state[mainKey]-=need[0];spendLoot(tierMat,need[1]);if(quality==='rare')spendLoot('器靈精魄',need[2]);const index=equipmentSlots.indexOf(slot),rollTable=quality==='rare'?equipmentRareRolls:equipmentNormalRolls,range=index<5?rollTable[tier-1][index]:null,e={id:`${Date.now()}-${Math.random().toString(36).slice(2,7)}`,slot:slot[0],tier,quality,label:slot[3],value:range?rollInt(range[0],range[1]):0,affixes:[]};if(index>=5){const elements=['金','木','水','火','土'].sort(()=>Math.random()-.5).slice(0,tier<=3?1:tier<=6?2:3),min=tier<=3?1:tier<=6?2:3,max=tier<=3?2:tier<=6?5:8;e.affixes=elements.map(element=>{const low=min*10,high=max*10,value=quality==='rare'?Math.max(rollInt(low,high),rollInt(low,high)):rollInt(low,high);return {element,value:value/10}})}state.equipmentInventory=state.equipmentInventory||[];state.equipmentInventory.push(e);registerEquipmentItems();toast(`製成${quality==='rare'?'極品':'凡品'}·${equipmentSets[tier-1]}${slot[1]}`);save();renderCaveView('forge')}
const weavingTiers=[{amount:2,years:12,wood:100,stone:500},{amount:4,years:14,wood:250,stone:1500},{amount:7,years:16,wood:500,stone:4000},{amount:11,years:18,wood:900,stone:10000},{amount:16,years:20,wood:1500,stone:25000},{amount:22,years:24,wood:2400,stone:60000},{amount:30,years:28,wood:3600,stone:150000},{amount:40,years:32,wood:5200,stone:400000},{amount:55,years:36,wood:7500,stone:1000000}];
function weavingJobState(){const job=state.weavingJob;if(!job||!Number.isFinite(job.endAt)||!Number.isFinite(job.amount)||job.amount<1){state.weavingJob=null;return {status:'idle'}}return {...job,status:gameNow()>=job.endAt?'ready':'working'}}
function selectedWeavingTier(){const max=Math.max(1,Math.min(9,worldProgressTier())),saved=Math.floor(Number(state.weavingTier)||0);return saved>=1?Math.min(max,saved):max}
function weavingTierOptionsHtml(max,selected){return `<div class="weaving-tier-menu hidden" data-weaving-tier-menu><header><b>選擇織法</b><small>已解鎖 1～${max} 階</small></header><div>${weavingTiers.slice(0,max).map((recipe,index)=>{const tier=index+1,affordable=state.wood>=recipe.wood&&state.spiritStone>=recipe.stone;return `<button data-weaving-tier="${tier}" class="${tier===selected?'active':''} ${affordable?'affordable':'cost-short'}"><b>${tier}階織法</b><span>補天絲 ×${recipe.amount}・耗時 ${recipe.years} 年</span><small>木材 ${formatLargeNumber(recipe.wood)}・靈石 ${formatLargeNumber(recipe.stone)}</small></button>`}).join('')}</div></div>`}
function weavingPanelHtml(){const max=Math.max(1,Math.min(9,worldProgressTier())),tier=selectedWeavingTier(),recipe=weavingTiers[tier-1],job=weavingJobState();if(job.status==='ready')return `<section class="weaving-station ready"><img src="${itemCatalog.mendingSilk.image}" alt="補天絲"><div><small>器室・織天台・${job.tier||tier}階織法</small><b>補天絲已織成</b><p>本批共 ${job.amount} 條，領取後可用於提升儲物袋品階。</p></div><button id="claimWeavingBtn">領取 ×${job.amount}</button></section>`;if(job.status==='working'){const years=Math.max(1,Math.ceil((job.endAt-gameNow())/900000));return `<section class="weaving-station working"><img src="${itemCatalog.mendingSilk.image}" alt="補天絲"><div><small>器室・織天台・${job.tier||tier}階織法</small><b>引靈織絲中</b><p>本批 ${job.amount} 條・尚需約 ${years} 年；離線期間照常推進。</p></div><button disabled>織造中</button></section>`}return `<section class="weaving-station"><img src="${itemCatalog.mendingSilk.image}" alt="補天絲"><div><small>器室・織天台</small><button type="button" class="weaving-tier-trigger" data-weaving-tier-toggle aria-expanded="false"><b>${tier}階織法</b><span>點擊選擇 1～${max} 階</span></button><strong>編織補天絲 ×${recipe.amount}</strong><p>以靈木纖維承載空間陣紋，耗時 ${recipe.years} 年；可自由選擇已解鎖的織法。</p><em>木材 ${formatLargeNumber(recipe.wood)}・靈石 ${formatLargeNumber(recipe.stone)}</em></div><button id="startWeavingBtn" ${state.wood>=recipe.wood&&state.spiritStone>=recipe.stone?'':'disabled'}>開始織造</button>${weavingTierOptionsHtml(max,tier)}</section>`}
function bindWeavingControls(inner){const start=$('#startWeavingBtn'),claim=$('#claimWeavingBtn'),trigger=$('[data-weaving-tier-toggle]'),menu=$('[data-weaving-tier-menu]');if(start)start.onclick=startWeaving;if(claim)claim.onclick=claimWeaving;if(trigger&&menu)trigger.onclick=()=>{const opening=menu.classList.contains('hidden');menu.classList.toggle('hidden',!opening);trigger.setAttribute('aria-expanded',String(opening))};$$('[data-weaving-tier]').forEach(button=>button.onclick=()=>{const max=Math.max(1,Math.min(9,worldProgressTier())),tier=Math.floor(Number(button.dataset.weavingTier));if(tier<1||tier>max)return;state.weavingTier=tier;save();renderForgeProduction(inner||$('#caveInner'))})}
function startWeaving(){if(state.weavingJob)return;const tier=selectedWeavingTier(),recipe=weavingTiers[tier-1];if(state.wood<recipe.wood||state.spiritStone<recipe.stone)return toast('織天台所需木材或靈石不足');state.wood-=recipe.wood;state.spiritStone-=recipe.stone;const now=gameNow();state.weavingJob={tier,amount:recipe.amount,startAt:now,endAt:now+recipe.years*900000};save();renderForgeProduction($('#caveInner'));render();toast(`${tier}階織法開爐・預計 ${recipe.years} 年後完成`)}
function claimWeaving(){const job=weavingJobState();if(job.status!=='ready')return;if(!canStoreItem('mendingSilk',job.amount))return toast('儲物袋容量不足，無法領取補天絲');state.mendingSilk=(state.mendingSilk||0)+job.amount;state.weavingJob=null;save();renderForgeProduction($('#caveInner'));render();toast(`補天絲 ×${job.amount} 已收入儲物袋`)}
function renderForgeProduction(inner){const max=productionMaxTier(),tier=Math.max(1,Math.min(max,9,state.craftingTier||1)),unlocked=tier<=max,slot=equipmentSlots.find(x=>x[0]===state.craftingSlot)||equipmentSlots[0],quality=state.craftingQuality==='rare'?'rare':'normal',need=forgeNeeds[tier-1],main=state[`mainlineMaterial_${slot[4]}`]||0,tm=lootAmount(tierMaterials[tier-1]),soul=lootAmount('器靈精魄'),can=unlocked&&main>=need[0]&&tm>=need[1]&&(quality==='normal'||soul>=need[2]),tierText=['一','二','三','四','五','六','七','八','九'][tier-1],preview=equipmentCraftPreview(tier,quality,slot),recipe=`<section class="craft-requirement inline-craft-requirement"><div class="quality-choice inline-quality-choice"><button data-craft-quality="normal" class="${quality==='normal'?'active':''}">凡品</button><button data-craft-quality="rare" class="${quality==='rare'?'active':''}">極品</button></div><b>${quality==='rare'?'極品':'凡品'}·${equipmentSets[tier-1]}${slot[1]}</b><span class="craft-effect-preview">製成數值：${preview}</span><span>${mainlineMaterials.find(x=>x[1]===slot[4])[0]} ${main}/${need[0]}</span><span>${tierMaterials[tier-1]} ${tm}/${need[1]}</span>${quality==='rare'?`<span>器靈精魄 ${soul}/${need[2]}</span>`:''}${unlocked?'':`<span class="realm-lock">境界不足：需達到可製作${tierText}階裝備的境界</span>`}<button id="craftEquipmentBtn" ${can?'':'disabled'}>${unlocked?'製作裝備':'境界不足'}</button></section>`;inner.innerHTML=`<section class="production-workshop"><button data-production-back="forge">返回鑄造爐</button><h2>器室生產</h2><p>點選器物即可在旁查看材料・目前最高可製作 ${equipmentSets[max-1]}</p>${weavingPanelHtml()}<div class="production-tier-tabs">${Array.from({length:9},(_,i)=>`<button data-craft-tier="${i+1}" class="${tier===i+1?'active':''} ${i+1>max?'tier-locked':''}">${i+1}階${i+1>max?'・未達境界':''}</button>`).join('')}</div><div class="production-choice-grid equipment-choices inline-recipe-grid">${equipmentSlots.map(candidate=>`<div class="production-choice-item ${slot[0]===candidate[0]?'selected':''}"><button data-equip-slot="${candidate[0]}" class="${slot[0]===candidate[0]?'active':''}"><img src="assets/qstyle-v2/production/equipment/${candidate[0]}-t${tier}.png"><b>${candidate[1]}</b><small>${equipmentCraftPreview(tier,quality,candidate)}</small></button>${slot[0]===candidate[0]?recipe:''}</div>`).join('')}</div></section>`;bindProductionControls('forge');bindWeavingControls(inner);$$('[data-equip-slot]').forEach(b=>b.onclick=()=>{state.craftingSlot=b.dataset.equipSlot;renderForgeProduction(inner)});$$('[data-craft-quality]').forEach(b=>b.onclick=()=>{state.craftingQuality=b.dataset.craftQuality;renderForgeProduction(inner)});$('#craftEquipmentBtn').onclick=()=>{if(!unlocked)return toast('目前境界尚不足以製作此階裝備');craftEquipment()}}
function brewCraftState(){const today=dateKey()||'local';if(state.brewCraftDaily?.date!==today)state.brewCraftDaily={date:today,normal:0,rare:0};return state.brewCraftDaily}
function renderBrewProduction(inner){const quality=state.craftingBrewQuality==='rare'?'rare':'normal',meta=brewQualities[quality],type=brewTypes.find(x=>x[0]===state.craftingBrew)||brewTypes[0],daily=brewCraftState(),base=state[`brewBase_${quality}`]||0,herb=lootAmount(type[4]),remaining=Math.max(0,3-daily[quality]),can=remaining>0&&base>=1&&herb>=meta.herb,recipe=`<section class="craft-requirement brew-requirement inline-craft-requirement"><img src="${itemCatalog[`brew-base-${quality}`].image}" alt="${meta.name}原釀"><b>${meta.name}・${type[1]}</b><span>${meta.name}原釀 ${base}/1</span><span>${type[4]} ${herb}/${meta.herb}</span><span>品飲效果：${type[3]}永久白值＋${meta.gain}</span><span>今日剩餘釀製 ${remaining}／3</span><button id="craftBrewBtn" ${can?'':'disabled'}>${remaining?'釀製一瓶':'今日已達上限'}</button></section>`;inner.innerHTML=`<section class="production-workshop brew-workshop"><h2>釀坊</h2><p>點選靈釀即可在旁查看材料・凡品與極品每日各可釀製三瓶</p><div class="quality-choice brew-quality-tabs"><button data-brew-quality="normal" class="${quality==='normal'?'active':''}">凡品・今日 ${daily.normal}／3</button><button data-brew-quality="rare" class="${quality==='rare'?'active':''}">極品・今日 ${daily.rare}／3</button></div><div class="production-choice-grid inline-recipe-grid">${brewTypes.map(([key,name,,,herbName])=>`<div class="production-choice-item ${type[0]===key?'selected':''}"><button data-brew-type="${key}" class="${type[0]===key?'active':''}"><img src="assets/qstyle-v2/production/brews/${key}-${quality}.webp"><b>${name}</b><small>${herbName}</small></button>${type[0]===key?recipe:''}</div>`).join('')}</div></section>`;$$('[data-brew-quality]').forEach(button=>button.onclick=()=>{state.craftingBrewQuality=button.dataset.brewQuality;renderBrewProduction(inner)});$$('[data-brew-type]').forEach(button=>button.onclick=()=>{state.craftingBrew=button.dataset.brewType;renderBrewProduction(inner)});$('#craftBrewBtn').onclick=()=>{const record=brewCraftState();if(record[quality]>=3)return toast(`${meta.name}今日已釀製三瓶`);if((state[`brewBase_${quality}`]||0)<1||lootAmount(type[4])<meta.herb)return toast('釀製素材不足');if(!canStoreItem(`brew-${type[0]}-${quality}`))return toast('儲物袋已滿');state[`brewBase_${quality}`]--;spendLoot(type[4],meta.herb);state[`brewCount_${type[0]}_${quality}`]=(state[`brewCount_${type[0]}_${quality}`]||0)+1;record[quality]++;save();renderBrewProduction(inner);render();toast(`釀成${meta.name}・${type[1]}`)}}
function productionTierRequirement(tier){return `需練氣達${spiritRealms[tier-1]}一層、煉體達${bodyRealms[tier-1]}一層，或淬劍達${swordRealms[tier-1]}一層`}
function bindProductionControls(kind){const back=$('[data-production-back]');if(back)back.remove();const max=productionMaxTier(),tabs=$('.production-tier-tabs');$$('[data-craft-tier]').forEach(b=>b.onclick=()=>{const tier=+b.dataset.craftTier;if(tier>max)return toast(productionTierRequirement(tier));state.craftingTier=tier;kind==='alchemy'?renderAlchemyProduction($('#caveInner')):renderForgeProduction($('#caveInner'))});if(tabs)tabs.addEventListener('wheel',event=>{if(Math.abs(event.deltaY)<=Math.abs(event.deltaX))return;tabs.scrollLeft+=event.deltaY;event.preventDefault()},{passive:false})}
function studyEmpty(title,text){return `<div class="study-empty"><i>未</i><b>${title}</b><small>${text}</small></div>`}
function studyCodexView(){
  const cleared=Math.max(0,Math.min(mortalMainline.length,state.mainlineCleared||0));
  return `<section class="study-section-heading"><div><small>親歷方可落筆</small><h3>九域山海志</h3></div><span>已收錄 ${cleared}／${mortalMainline.length}</span></section><div class="study-codex-grid">${mortalMainline.map(stage=>{const known=stage.id<=cleared,bias=mainlineBias[(stage.id-1)%4],enemies=[...mainlineWaves[stage.id-1],stage.boss];return `<article class="study-codex-card ${known?'known':'unknown'}">${known?`<img src="${stage.image}" alt="${stage.name}"><div class="study-codex-copy"><small>${mainlineArcName(stage.id)}・第 ${stage.id} 關</small><b>${stage.name}</b><p>${stage.summary}</p><span>所遇：${enemies.join('、')}</span><em>地方所產：${stage.id>=17?'四象靈藥':`${bias[1]}、${bias[2]}`}</em></div>`:`<div class="study-unknown-seal">？</div><div class="study-codex-copy"><small>第 ${stage.id} 卷</small><b>尚未收錄</b><p>親自踏入此地並完成探索後，地貌、生靈與地方所產才會記入山海志。</p></div>`}</article>`}).join('')}</div>`;
}
function studyRecordsView(){
  const cleared=Math.max(0,Math.min(mortalMainline.length,state.mainlineCleared||0)),swordWins=Math.max(0,Math.min(swordTrialMaxStage,state.swordTrialWins||0)),bodyTrials=Math.floor(Math.max(0,state.bodyLevel||0)/10),bodyFailures=Object.values(state.bodyTrialFailures||{}).reduce((sum,value)=>sum+(Number(value)||0),0),encounters=(state.encounterHistory||[]).length,lastStage=cleared?mortalMainline[cleared-1]:null;
  const swordRecord=state.swordEmbryo?`${state.swordName||'無名靈劍'}・${swordEmbryos[state.swordEmbryo].name}${state.swordIntentType?`・${swordIntents[state.swordIntentType].name}`:''}`:'尚未凝聚本命劍';
  return `<section class="study-section-heading"><div><small>不論成敗，皆為來路</small><h3>修行戰錄</h3></div><span>${cleared+swordWins+bodyTrials} 次關隘已過</span></section><div class="study-record-grid"><article><i>鎖</i><small>九鎖封天</small><b>${cleared}／18</b><p>${lastStage?`最遠抵達：${lastStage.name}`:'尚未踏入封天諸域'}</p></article><article><i>劍</i><small>試劍境</small><b>${swordWins}／${swordTrialMaxStage}</b><p>${swordRecord}</p></article><article><i>身</i><small>肉身試煉</small><b>${bodyTrials} 次破境</b><p>${state.bodyPathOpened?`現為${realmName(state.bodyLevel,bodyRealms)}・目前記錄敗陣 ${bodyFailures} 次`:'尚未踏上煉體之路'}</p></article><article><i>緣</i><small>因緣歲月</small><b>${encounters} 則</b><p>${encounters?'可由因緣入口的歲月錄翻閱':'尚未留下可供翻閱的因緣'}</p></article></div>${cleared?`<section class="study-milestones"><h4>破鎖紀要</h4>${mortalMainline.slice(0,cleared).reverse().map(stage=>`<article><span>第 ${stage.id} 關</span><b>${stage.name}</b><small>${mainlineAftermath[stage.id-1]}</small></article>`).join('')}</section>`:studyEmpty('破鎖紀要尚無墨跡','完成九鎖封天關卡後，結果會自動記在此處。')}`;
}
function studyChronicleView(){
  const cleared=Math.max(0,Math.min(mortalMainline.length,state.mainlineCleared||0));
  const story=cleared?`<section class="study-chronicle-group"><h4>九鎖封天</h4>${mortalMainline.slice(0,cleared).reverse().map(stage=>`<details class="study-lore-entry"><summary><span>第 ${stage.id} 關・${mainlineArcName(stage.id)}</span><b>${stage.name}</b></summary><div class="study-dialogue">${mainlineStoryScripts[stage.id-1].map(([name,,line])=>`<p><b>${name==='主角'?(state.name||'修士'):name}</b><span>${line}</span></p>`).join('')}<em>${mainlineAftermath[stage.id-1]}</em></div></details>`).join('')}</section>`:studyEmpty('尚無主線典故','完成九鎖封天關卡後，可在此重新翻閱當時的對話與結果。');
  const a=normalizeAscension(),chapters=[['prologueCompleted','序章｜天路將起','九鎖崩解，天門顯現。你在三條天路中留下唯一的選擇。'],['heartTrialCompleted','問心陣','三問沒有對錯，只記下你此刻相信的答案。'],['delusionTrialCompleted','照妄陣','心魔以最惡意的方式扭曲答案；你認出了它的聲音。'],['roadEndCompleted','天路盡頭','天路之主見證你的道，仙門自此開啟。']].filter(([key])=>a[key]);const ascensionStory=chapters.length?`<section class="study-chronicle-group"><h4>飛升・闖天路</h4>${chapters.reverse().map(([,title,summary])=>`<details class="study-lore-entry"><summary><span>${a.route==='none'?'未選路':ascensionRouteMeta[a.route].name}</span><b>${title}</b></summary><div class="study-dialogue"><p><b>${state.name||'修士'}</b><span>${summary}</span></p><em>此處僅供劇情回顧，不重開關卡、不觸發戰鬥，亦不重複發放獎勵。</em></div></details>`).join('')}</section>`:'';
  return `<section class="study-section-heading"><div><small>舊事可鑑，來路可尋</small><h3>典故錄</h3></div><span>主線 ${cleared}・天路 ${chapters.length}</span></section>${story}${ascensionStory}`;
}
function renderStudyView(inner,view=currentStudyView){
  currentStudyView=['codex','records','chronicle'].includes(view)?view:'codex';
  const labels={codex:'山海志',records:'戰錄',chronicle:'典故錄'},content={codex:studyCodexView,records:studyRecordsView,chronicle:studyChronicleView};
  inner.innerHTML=`<section class="study-shell"><header class="study-header"><div class="study-seal">藏</div><div><small>洞府・問道書房</small><h2>紙上不添修為，只留親歷見聞</h2><p>收錄走過的地域、闖過的關隘與親歷的主線典故；所有內容均不提供屬性加成。</p></div></header><nav class="study-tabs">${Object.entries(labels).map(([key,label])=>`<button data-study-view="${key}" class="${key===currentStudyView?'active':''}">${label}</button>`).join('')}</nav><div class="study-content">${content[currentStudyView]()}</div></section>`;
  $$('[data-study-view]').forEach(button=>button.onclick=()=>renderStudyView(inner,button.dataset.studyView));
}
function renderCaveView(view){
  currentCaveView=view;
  $$('.cave-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.caveView===view));
  const inner=$('#caveInner');if(!inner)return;
  if(view==='partner'&&state.partnerSystem?.established)return partnerRenderCave(inner);
  if(!['dwelling','production'].includes(view)){
    if(view==='alchemy'){renderAlchemyProduction(inner);return}if(view==='forge'){renderForgeProduction(inner);return}if(view==='brew'){renderBrewProduction(inner);return}
    if(view==='study'){renderStudyView(inner);return}
    inner.innerHTML='<div class="cave-placeholder"><b>道侶</b><small>相關內容將於後續版本開放</small></div>';return;
  }
  const cards=Object.entries(caveAreas).map(([key,a])=>{const level=state[a.level],cap=areaCapacity(a),max=areaWorkerMax(a),output=areaOutput(a),maxed=level>=caveAreaMaxLevel,upgrade=areaUpgradeCost(a),nextCap=areaCapacity(a,level+1),stored=Math.floor(state[a.value]),full=stored>=cap,percent=Math.min(100,stored/Math.max(1,cap)*100);return `<article class="resource-area ${full?'storage-full':''}"><header><img src="${a.icon}" alt="${a.label}"><div><b>${a.label}</b><small>${level}級產地</small></div><em>${full?'倉滿':'生產中'}</em></header><div class="resource-storage"><span><small>目前儲量</small><strong title="${stored.toLocaleString()}">${formatCaveAmount(stored)}</strong></span><i>／</i><span><small>儲存上限</small><strong title="${cap.toLocaleString()}">${formatCaveAmount(cap)}</strong></span></div><div class="resource-capacity-bar"><i style="width:${percent}%"></i></div><p>${full?'倉儲已滿，已暫停生產':`每名道童每 5 秒產出 ${formatCaveAmount(output)}${a.foodCost?`，消耗食物 ${formatCaveAmount(a.foodCost)}`:''}`}</p><div class="worker-stepper"><button data-worker="${key}" data-change="-1">−</button><span>道童 ${state[a.worker]} / ${max}</span><button data-worker="${key}" data-change="1">＋</button></div><button class="area-upgrade" data-upgrade-area="${key}" ${!maxed&&state.wood>=upgrade?'':'disabled'}><span>${maxed?'產地已達最高級':`擴建上限至 ${formatCaveAmount(nextCap)}`}</span><small>${maxed?'30 級圓滿':`木材 ${formatCaveAmount(upgrade)}`}</small></button></article>`}).join('');
  const coreCost=caveCoreUpgradeCost(),coreMax=state.caveCoreLevel>=7,canCore=!coreMax&&state.spiritStone>=coreCost.stone&&state.wood>=coreCost.wood&&state.meteorIron>=coreCost.iron;
  const facilities=Object.entries(caveFacilities).map(([key,f])=>{const level=state[f.level],enabled=state[f.enabled],draw=caveFacilityDraw(f),cost=caveFacilityUpgradeCost(key),maxed=level>=7,locked=key==='sword'&&!state.swordEmbryo,canUpgrade=!maxed&&state.spiritStone>=cost.stone&&state.wood>=cost.wood&&state.meteorIron>=cost.iron;return `<article class="cave-facility ${enabled?'running':''} ${locked?'facility-locked':''}"><span class="facility-seal">${f.seal}</span><div><small>${enabled?'靈氣流轉中':'目前停用'}・耗用 ${draw}</small><b>${f.label}・${level}級</b><p>${f.description}</p><strong>${caveFacilityEffect(key)}</strong></div><div class="facility-actions"><button data-toggle-facility="${key}" ${locked?'disabled':''}>${locked?'凝聚本命劍後開放':enabled?'停止運轉':'開啟運轉'}</button><button data-upgrade-facility="${key}" ${canUpgrade?'':'disabled'}>${maxed?'已達最高級':`升級・靈石 ${formatLargeNumber(cost.stone)}／木 ${formatLargeNumber(cost.wood)}／鐵 ${formatLargeNumber(cost.iron)}`}</button></div></article>`}).join('');
  const cost=daoChildCost();
  if(view==='dwelling'){
    inner.innerHTML=`<section class="cave-core"><div><small>洞府靈脈・${state.caveCoreLevel}階</small><b>供應 ${caveSpiritUsed()} / ${caveSpiritCapacity()}</b><p>修行房間共用靈氣供應；資源區由道童獨立運作。</p></div><button id="upgradeCaveCore" ${canCore?'':'disabled'}>${coreMax?'靈脈已圓滿':`升階・靈石 ${formatLargeNumber(coreCost.stone)}／木 ${formatLargeNumber(coreCost.wood)}／鐵 ${formatLargeNumber(coreCost.iron)}`}</button></section><section class="cave-section-title"><b>修行布置</b><small>依目前目標啟停房間，離線期間同樣生效</small></section><div class="cave-facility-grid">${facilities}</div>`;
    $$('[data-toggle-facility]').forEach(b=>b.onclick=()=>toggleCaveFacility(b.dataset.toggleFacility));
    $$('[data-upgrade-facility]').forEach(b=>b.onclick=()=>upgradeCaveFacility(b.dataset.upgradeFacility));
    $('#upgradeCaveCore').onclick=upgradeCaveCore;
    if(!state.bodyPathOpened){const bodyToggle=$('[data-toggle-facility="body"]');if(bodyToggle){const card=bodyToggle.closest('.cave-facility');bodyToggle.disabled=true;bodyToggle.textContent='開啟煉體後開放';card?.classList.add('facility-locked');const upgrade=card?.querySelector('[data-upgrade-facility="body"]');if(upgrade)upgrade.disabled=true}}
    return;
  }
    inner.innerHTML=`<section class="cave-section-title"><b>資源產地</b><small>產地最高 30 級；每升 1 級增加 1 名道童上限，單區最多 30 名</small></section><section class="dao-child-yard"><img src="assets/qstyle-v2/dao-child.png" alt="道童"><div><small>可用道童</small><b>${availableChildren()} / ${state.daoChildTotal}</b><em>三處產地合計最多招募 ${daoChildMax} 名</em></div><button id="buyDaoChild" ${state.food>=cost&&state.daoChildTotal<daoChildMax?'':'disabled'}>${state.daoChildTotal>=daoChildMax?'已達上限':`招募<br>食物 ${formatLargeNumber(cost)}`}</button></section><div class="resource-area-grid">${cards}</div>`;
  if(!state.bodyPathOpened){const foodCard=$('.resource-area-grid .resource-area:first-child'),foodHeader=foodCard?.querySelector('header'),missing=Math.max(0,120-state.food);foodHeader?.insertAdjacentHTML('afterend',`<div class="body-food-goal"><b>煉體開路目標</b><span>食物 ${formatLargeNumber(state.food)} / 120</span><small>${missing?`尚缺 ${formatLargeNumber(missing)}，請安排道童繼續生產`:'已可前往兼修道場開啟煉體'}</small></div>`)}
  $$('.worker-stepper button').forEach(b=>b.onclick=()=>assignWorker(b.dataset.worker,+b.dataset.change));
  $$('.area-upgrade').forEach(b=>b.onclick=()=>upgradeCaveArea(b.dataset.upgradeArea));
  $('#buyDaoChild').onclick=buyDaoChild;
}
function assignWorker(key,change){const a=caveAreas[key];if(change>0){if(availableChildren()<1)return toast('目前沒有閒置道童');if(state[a.worker]>=areaWorkerMax(a))return toast('此區域已達道童上限')}else if(state[a.worker]<=0)return;state[a.worker]+=change;renderCaveView('production');save()}
function buyDaoChild(){if(state.daoChildTotal>=daoChildMax)return toast(`道童已達 ${daoChildMax} 名上限`);const cost=daoChildCost();if(state.food<cost)return toast('食物不足');state.food-=cost;state.daoChildTotal++;state.daoChildBought++;toast('新道童前來投效');renderCaveView('production');render();save()}
function upgradeCaveArea(key){const a=caveAreas[key];if(state[a.level]>=caveAreaMaxLevel)return toast('此產地已達最高級');const cost=areaUpgradeCost(a);if(state.wood<cost)return toast('木材不足');state.wood-=cost;state[a.level]++;toast(`${a.label}區域提升至${state[a.level]}級`);renderCaveView('production');save()}
function toggleCaveFacility(key){
  const facility=caveFacilities[key];if(!facility)return;if(key==='sword'&&!state.swordEmbryo)return toast('凝聚本命劍後才能開啟洗劍池');if(key==='body'&&!state.bodyPathOpened)return toast('開啟煉體之路後才能使用鍛體室');
  if(state[facility.enabled])state[facility.enabled]=false;
  else{const next=caveSpiritUsed()+caveFacilityDraw(facility);if(next>caveSpiritCapacity())return toast(`洞府靈氣不足・尚缺 ${next-caveSpiritCapacity()} 點供應`);state[facility.enabled]=true}
  renderCaveView('dwelling');save();
}
function upgradeCaveCore(){const cost=caveCoreUpgradeCost();if(state.caveCoreLevel>=7)return;if(state.spiritStone<cost.stone||state.wood<cost.wood||state.meteorIron<cost.iron)return toast('洞府靈脈升階材料不足');state.spiritStone-=cost.stone;state.wood-=cost.wood;state.meteorIron-=cost.iron;state.caveCoreLevel++;toast(`洞府靈脈提升至${state.caveCoreLevel}階・供應上限增加`);renderCaveView('dwelling');render();save()}
function upgradeCaveFacility(key){const facility=caveFacilities[key];if(!facility||state[facility.level]>=7)return;if(key==='body'&&!state.bodyPathOpened)return toast('開啟煉體之路後才能升級鍛體室');const cost=caveFacilityUpgradeCost(key);if(state.spiritStone<cost.stone||state.wood<cost.wood||state.meteorIron<cost.iron)return toast('修行房間升級材料不足');const oldDraw=caveFacilityDraw(facility);state[facility.level]++;const newDraw=caveFacilityDraw(facility);if(state[facility.enabled]&&caveSpiritUsed()>caveSpiritCapacity()){state[facility.level]--;return toast(`升級後需多 ${newDraw-oldDraw} 點靈氣供應，請先提升洞府靈脈`)}state.spiritStone-=cost.stone;state.wood-=cost.wood;state.meteorIron-=cost.iron;toast(`${facility.label}提升至${state[facility.level]}級`);renderCaveView('dwelling');render();save()}
function runCaveFacilities(ticks){
  if(ticks<=0||!state.cultivationAwakened)return;
  if(state.caveSwordEnabled&&state.swordEmbryo&&state.swordPathOpened)state.swordEssence+=BigInt(Math.floor(ticks*swordEssenceRate()*(.08+state.caveSwordLevel*.02)));
  state.caveBodyTicks=0;
}
function runSettlementTick(ticks=1){
  for(let i=0;i<ticks;i++){
    const foodArea=caveAreas.food,foodWorkers=Math.min(state.workerFood,areaWorkerMax(foodArea)),foodCapacity=areaCapacity(foodArea),foodOutput=areaOutput(foodArea);
    if(state.food<foodCapacity)state.food=Math.min(foodCapacity,state.food+foodWorkers*foodOutput);
    for(const key of ['wood','meteorIron']){
      const a=caveAreas[key],output=areaOutput(a),room=Math.max(0,areaCapacity(a)-state[a.value]),workers=Math.min(state[a.worker],areaWorkerMax(a));
      const possible=Math.min(workers,Math.floor(room/output),a.foodCost?Math.floor(state.food/a.foodCost):workers);
      if(possible>0){state.food-=possible*a.foodCost;state[a.value]+=possible*output}
    }
  }
  runCaveFacilities(ticks);
}

const elementData = {
  metal:{label:'金',root:'metalRoot',art:'metalArt',icon:'assets/qstyle-v2/element-metal.png'},
  wood:{label:'木',root:'woodRoot',art:'woodArt',icon:'assets/qstyle-v2/element-wood.png'},
  water:{label:'水',root:'waterRoot',art:'waterArt',icon:'assets/qstyle-v2/element-water.png'},
  fire:{label:'火',root:'fireRoot',art:'fireArt',icon:'assets/qstyle-v2/element-fire.png'},
  earth:{label:'土',root:'earthRoot',art:'earthArt',icon:'assets/qstyle-v2/element-earth.png'}
};
function renderSpiritRootPanel(view='root') {
  $('#featureDescription').classList.add('root-panel-active');
  $('#featureDescription').innerHTML='<div class="root-panel-shell"><div class="root-tabs"><button data-root-view="root">靈根</button><button data-root-view="pool">靈池</button></div><div id="rootInner"></div></div>';
  $$('.root-tabs button').forEach(b=>b.onclick=()=>renderSpiritRootView(b.dataset.rootView));
  renderSpiritRootView(view);
}
function renderSpiritRootView(view) {
  currentRootView=view;
  $$('.root-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.rootView===view));
  const inner=$('#rootInner'); if(!inner)return;
  if(view==='pool') {
    const woodCost=poolWoodCost(),ironCost=poolIronCost(),can=state.wood>=woodCost&&state.meteorIron>=ironCost;
    inner.innerHTML=`<div class="pool-page"><div class="pool-level">${state.spiritPoolLevel}階靈池</div><div class="pool-art small"><span></span><img src="assets/qstyle-v2/spirit-pool.png" alt="靈池"></div><div class="pool-stats"><div><small>靈氣產量</small><b>${formatLargeNumber(auraRate())} / 5秒</b></div><div><small>儲量上限・${poolStorageHours()}小時</small><b>${formatLargeNumber(state.aura)} / ${formatLargeNumber(auraCapacity())}</b></div></div><div class="pool-materials"><div class="pool-owned-materials"><span><img src="assets/qstyle-v2/wood-cutout.png" alt="木材"><em>木材</em><b>${formatLargeNumber(state.wood)}</b></span><i></i><span><img src="assets/qstyle-v2/meteor-iron-cutout.png" alt="隕鐵"><em>隕鐵</em><b>${formatLargeNumber(state.meteorIron)}</b></span></div><div class="pool-upgrade-cost">升階需要：木材 ${formatLargeNumber(woodCost)}・隕鐵 ${formatLargeNumber(ironCost)}</div></div><button id="upgradePoolBtn" class="jade-button" ${can?'':'disabled'}>靈池升階</button></div>`;
    $('#upgradePoolBtn').onclick=upgradeSpiritPool;
    return;
  }
  const elements=Object.entries(elementData).map(([key,e],index)=>{const level=state[e.root],maxed=level>=200,cost=maxed?0:spiritRootReq(level);return `<button class="element-node element-${key}" data-element="${key}" style="--i:${index}" ${maxed?'disabled':''}><img src="${e.icon}" alt="${e.label}系"><b>${e.label}</b><small>${rootRank(level)}</small><em>白值 +${spiritRootBonus(level).toFixed(1)}%</em><span>${maxed?'已達天道十階':`下級 +${spiritRootLevelGain(level+1).toFixed(1)}%・需 ${formatLargeNumber(cost)} 靈氣`}</span></button>`}).join('');
  inner.innerHTML=`<div class="spirit-root-stage"><div class="element-orbit">${elements}<div class="pool-art"><span></span><img src="assets/qstyle-v2/spirit-pool.png" alt="靈池"><strong>靈氣<br>${formatLargeNumber(state.aura)} / ${formatLargeNumber(auraCapacity())}</strong></div></div><small class="root-hint">點擊五系圖騰，以靈氣淬鍊對應靈根</small></div>`;
  $$('.element-node').forEach(b=>b.onclick=()=>upgradeSpiritRoot(b.dataset.element));
}
function upgradeSpiritRoot(key) {
  const e=elementData[key],level=state[e.root],cost=spiritRootReq(level);
  if(level>=200)return toast(`${e.label}系靈根已達天道・10階`);
  if(state.aura<cost)return toast(`尚缺 ${formatLargeNumber(cost-state.aura)} 靈氣`);
  state.aura-=cost;state[e.root]++;toast(`${e.label}系靈根提升至${rootRank(state[e.root])}・白值 +${spiritRootBonus(state[e.root]).toFixed(1)}%`);renderSpiritRootView('root');save();
}
function upgradeSpiritPool() {
  const woodCost=poolWoodCost(),ironCost=poolIronCost();
  if(state.wood<woodCost||state.meteorIron<ironCost)return toast('升階材料不足');
  state.wood-=woodCost;state.meteorIron-=ironCost;state.spiritPoolLevel++;toast(`靈池提升至${state.spiritPoolLevel}階`);renderSpiritRootView('pool');save();
}

function renderBagPanel(view='bag') {
  $('#featureDescription').innerHTML='<div class="bag-tabs"><button data-bag-view="bag">儲物袋</button><button data-bag-view="character">人物</button><button data-bag-view="wardrobe">衣閣</button></div><div id="bagInner"></div>';
  $$('.bag-tabs button').forEach(b=>b.onclick=()=>renderBagView(b.dataset.bagView));
  renderBagView(view);
}
const bagRankNames=['一','二','三','四','五','六','七','八','九','十','十一','十二','十三','十四','十五','十六','十七','十八','十九'];
const bagMaxRank=19,bagBaseCapacity=100,bagUpgradeCosts=[10,15,22,30,40,52,66,82,100,120,142,166,192,220,250,282,316,352];
const bagStackLimit=9999;
function bagCapacity(){return bagBaseCapacity+(Math.max(1,Math.min(bagMaxRank,state.bagRank||1))-1)*50}
function bagUpgradeCost(){return bagUpgradeCosts[Math.max(0,Math.min(bagUpgradeCosts.length-1,(state.bagRank||1)-1))]}
function bagSlotsForAmount(amount){return Math.ceil(Math.max(0,Math.floor(Number(amount)||0))/bagStackLimit)}
function bagItemCounts(){return [...new Set(Object.values(itemCatalog).map(item=>item.count).filter(Boolean))]}
function bagUsedSlots(){return bagItemCounts().reduce((sum,count)=>sum+bagSlotsForAmount(state[count]),0)}
function canStoreBagCounts(changes){const totals=new Map();changes.forEach(([count,amount])=>{if(count&&amount>0)totals.set(count,(totals.get(count)||0)+Math.floor(Number(amount)||0))});const added=[...totals].reduce((sum,[count,amount])=>sum+bagSlotsForAmount((state[count]||0)+amount)-bagSlotsForAmount(state[count]),0);return bagUsedSlots()+added<=bagCapacity()}
function bagStorableAmount(key){const item=itemCatalog[key];if(!item)return 0;const current=Math.max(0,Math.floor(Number(state[item.count])||0)),remainder=current%bagStackLimit,partialSpace=remainder?bagStackLimit-remainder:0,freeSlots=Math.max(0,bagCapacity()-bagUsedSlots());return partialSpace+freeSlots*bagStackLimit}
function canStoreItem(key,amount=1){const item=itemCatalog[key];return !!item&&canStoreBagCounts([[item.count,amount]])}
let bagUpgradeDetailsOpen=false;
function upgradeBag(){
  if(state.bagRank>=bagMaxRank)return;const cost=bagUpgradeCost();
  if((state.mendingSilk||0)<cost)return toast(`尚缺 ${formatLargeNumber(cost-(state.mendingSilk||0))} 補天絲`);
  state.mendingSilk-=cost;state.bagRank++;bagUpgradeDetailsOpen=false;toast(`儲物袋提升至${bagRankNames[state.bagRank-1]}階`);renderBagView('bag');save();
}
const bagCategoryLabels=['資源道具','裝備','功法秘訣','丹藥靈釀','製作素材','信物特殊'];
function bagItemSortProfile(key,item){
  let category=5,tier=0,quality=0,slot=99;
  if(item.resourceBundle||item.cultivationBundle){category=0;tier=Number(item.resourceBundle?.amount||item.cultivationBundle||0)}
  else if(item.equipmentData){category=1;tier=item.equipmentData.tier||0;quality=item.equipmentData.quality==='rare'?1:0;slot=Math.max(0,equipmentSlots.findIndex(entry=>entry[0]===item.equipmentData.slot))}
  else if(item.techniqueBook||/Manual$/.test(key)){category=2;tier=item.techniqueBook?.tier||0}
  else if(item.pillData||item.brewData||item.dosageLimitGain||item.staminaRestore||item.moralGain||/^tribPill/.test(key)){category=3;tier=item.pillData?.tier||Number(key.match(/^tribPill(\d+)/)?.[1]||0);quality=item.dosageLimitGain?2:item.brewData?.quality==='rare'?1:0}
  else if(key.startsWith('main-material-')||key.startsWith('craft-material-')||key.startsWith('forge-tier-material-')||key==='equipmentSpiritCore'||item.brewBase||key==='mendingSilk'){category=4;tier=item.materialTier||0}
  else if(item.sectInvitation||item.identityAction){category=5;tier=item.sectInvitation?.star||0;quality=item.identityAction?1:0}
  return {category,tier,quality,slot};
}
function compareBagItems([keyA,itemA],[keyB,itemB]){const a=bagItemSortProfile(keyA,itemA),b=bagItemSortProfile(keyB,itemB);return a.category-b.category||b.tier-a.tier||b.quality-a.quality||a.slot-b.slot||itemA.name.localeCompare(itemB.name,'zh-Hant')}
function syncBagItemOrder(items){
  const entries=new Map(items),present=new Set(entries.keys()),previous=Array.isArray(state.bagItemOrder)?state.bagItemOrder:[],order=previous.filter(key=>present.has(key)),known=new Set(order);
  items.forEach(([key])=>{if(known.has(key))return;order.splice(Math.floor(Math.random()*(order.length+1)),0,key);known.add(key)});
  if(order.length!==previous.length||order.some((key,index)=>key!==previous[index])){state.bagItemOrder=order;save()}
  return order.map(key=>[key,entries.get(key)]).filter(([,item])=>item);
}
function organizeBag(){const items=Object.entries(itemCatalog).filter(([,item])=>(state[item.count]||0)>0).sort(compareBagItems);state.bagItemOrder=items.map(([key])=>key);save();renderBagView('bag');toast('儲物袋整理完成')}
function bindBagItemActivation(inner){
  let touchStart=null,touchHandledAt=0;
  inner.onpointerdown=event=>{const button=event.target.closest?.('[data-bag-item]');touchStart=button&&event.pointerType==='touch'?{button,x:event.clientX,y:event.clientY,time:performance.now()}:null};
  inner.onpointercancel=()=>{touchStart=null};
  inner.onpointerup=event=>{const start=touchStart;touchStart=null;if(!start||start.button!==event.target.closest?.('[data-bag-item]'))return;if(Math.hypot(event.clientX-start.x,event.clientY-start.y)>12||performance.now()-start.time>700)return;touchHandledAt=performance.now();openItemModal(start.button.dataset.bagItem)};
  inner.onclick=event=>{const button=event.target.closest?.('[data-bag-item]');if(!button||performance.now()-touchHandledAt<500)return;openItemModal(button.dataset.bagItem)};
}
function renderBagView(view) {
  $$('.bag-tabs button').forEach(b=>b.classList.toggle('active',b.dataset.bagView===view));
  const inner=$('#bagInner'); if(!inner)return;
  inner.classList.toggle('nested-subtabs',view==='character'||view==='wardrobe');
  if(view==='bag') {
    const items=syncBagItemOrder(Object.entries(itemCatalog).filter(([,item])=>(state[item.count]||0)>0)),capacity=bagCapacity(),used=bagUsedSlots(),cost=bagUpgradeCost();
    const itemButtons=items.flatMap(([key,item])=>{const category=bagItemSortProfile(key,item).category,total=Math.max(0,Math.floor(Number(state[item.count])||0)),stacks=bagSlotsForAmount(total);return Array.from({length:stacks},(_,index)=>{const amount=Math.min(bagStackLimit,total-index*bagStackLimit);return `<button class="inventory-item" data-bag-item="${key}" data-bag-category="${category}" aria-label="${bagCategoryLabels[category]}・${item.name}・第${index+1}格・${amount}個"><img src="${item.image}" alt="${item.name}"><b>${formatLargeNumber(amount)}</b><small>${item.name}</small></button>`})}).join('');
    const emptySlots=Array.from({length:Math.max(0,capacity-used)},()=>'<span></span>').join('');
    inner.innerHTML=`<section class="bag-toolbar"><div><small>儲物袋品階</small><b>${bagRankNames[state.bagRank-1]}階</b><span>${used} / ${capacity} 格</span></div><div class="bag-toolbar-actions"><button id="openBagUpgradeBtn" ${state.bagRank>=bagMaxRank?'disabled':''}>${state.bagRank>=bagMaxRank?'已滿階':bagUpgradeDetailsOpen?'收起':'升階'}</button><button id="organizeBagBtn">整理</button></div></section>${bagUpgradeDetailsOpen&&state.bagRank<bagMaxRank?`<section class="bag-upgrade-details"><img src="assets/qstyle-v2/mending-silk-cutout.png" alt="補天絲"><span><small>補天絲</small><b>${formatLargeNumber(state.mendingSilk||0)} / ${formatLargeNumber(cost)}</b><em>升至${bagRankNames[state.bagRank]}階・容量增加 50 格</em></span><button id="confirmUpgradeBagBtn" ${(state.mendingSilk||0)>=cost?'':'disabled'}>確認升階</button></section>`:''}<div class="inventory-grid">${itemButtons}${emptySlots}</div><small class="empty-note">每格最多容納 9,999 個・${used?'點擊道具可查看詳細資訊':'目前儲物袋空空如也'}</small>`;
    bindBagItemActivation(inner);$('#organizeBagBtn').onclick=organizeBag;$('#openBagUpgradeBtn').onclick=()=>{bagUpgradeDetailsOpen=!bagUpgradeDetailsOpen;renderBagView('bag')};if($('#confirmUpgradeBagBtn'))$('#confirmUpgradeBagBtn').onclick=upgradeBag;
    return;
  }
  if(view==='wardrobe'){renderWardrobeView(currentWardrobeView);return}
  renderCharacterView(currentCharacterView);
}
function renderCharacterView(view='equipment'){
  currentCharacterView=view;
  const inner=$('#bagInner');if(!inner)return;
  inner.innerHTML=`<div class="character-tabs"><button data-character-view="equipment">裝備</button><button data-character-view="attributes">人物屬性${hasMindEmbodiment()?'':'・未悟'}</button><button data-character-view="dosage">丹釀</button></div><div id="characterInner"></div>`;
  $$('.character-tabs button').forEach(button=>{button.classList.toggle('active',button.dataset.characterView===view);button.onclick=()=>renderCharacterView(button.dataset.characterView)});
  const content=$('#characterInner');
  if(view==='attributes'){
    if(!hasMindEmbodiment()){content.innerHTML='<div class="character-view-lock"><b>人物屬性尚未開啟</b><small>習得「意念入體」後方能內觀命骨、元息與其餘基礎白值；未提前習得者會在化念一層自動領悟。</small></div>';return}
    showCharacterAttributes();return;
  }
  if(view==='dosage'){renderDosageLedger(content);return}
  const src=characterAsset(),slotKeys=[...equipmentSlots.map(x=>x[0]),'treasure'],slotHtml=key=>{if(key==='treasure'){const artifact=artifactCatalog.find(a=>a.id===state.equippedArtifact),owned=state.ownedArtifacts?.length||0;return `<button type="button" class="equip-slot treasure-slot ${artifact?'filled':''}" data-artifact-slot ${owned?'':'disabled'}>${artifact?`<img src="${artifact.image}" alt="${artifact.name}"><small>${artifact.name}</small>`:`<b>法寶</b><small>${owned?'點擊裝備':'尚未取得'}</small>`}</button>`}const id=state.equippedItems?.[key],e=(state.equipmentInventory||[]).find(x=>x.id===id),meta=equipmentSlots.find(x=>x[0]===key),name=meta?.[1]||'法寶';return `<button type="button" class="equip-slot ${e?'filled':''}" ${e?`data-equipped-item="${e.id}"`:'disabled'}>${e?`<img src="assets/qstyle-v2/production/equipment/${e.slot}-t${e.tier}.png" alt="${name}">${e.quality==='rare'?'<i>「極」</i>':''}<small>${equipmentSets[e.tier-1]}${name}</small>`:`<b>${name}</b>`}</button>`},left=slotKeys.slice(0,4).map(slotHtml).join(''),right=slotKeys.slice(4).map(slotHtml).join('');
  content.innerHTML=`<div class="equipment-layout"><div class="equipment-side">${left}</div><div class="equipment-character"><img src="${src}" alt="人物"></div><div class="equipment-side">${right}</div></div>`;
  $$('[data-equipped-item]').forEach(button=>button.onclick=()=>openEquippedItemModal(button.dataset.equippedItem));
  if($('#characterInner [data-artifact-slot]'))$('#characterInner [data-artifact-slot]').onclick=()=>openArtifactTomb('equip');
}
function renderDosageLedger(inner){
  const numerals=['一','二','三','四','五','六','七','八','九'],limit=dosageLimit();
  const tiers=Array.from({length:9},(_,index)=>{const tier=index+1,gain=pillTierGain(tier),rows=pillTypes.map(([key,name,,label])=>{const used=Math.max(0,state.pillUsage?.[`${key}_${tier}`]||0),owned=Math.max(0,state[`pillCount_${key}_${tier}`]||0),percent=Math.min(100,used/limit*100);return `<article><img src="assets/qstyle-v2/production/pills/${key}-t${tier}.png" alt="${numerals[index]}階${name}"><span><b>${name}</b><small>${label}永久白值＋${formatLargeNumber(used*gain)}</small><i><em style="width:${percent}%"></em></i></span><strong>${used}／${limit}<small>持有 ${formatLargeNumber(owned)}</small></strong></article>`}).join('');return `<details class="dosage-tier" ${tier===worldProgressTier()?'open':''}><summary><b>${numerals[index]}階丹藥</b><span>每顆永久＋${gain}・各類可服用 ${limit} 顆</span></summary><div>${rows}</div></details>`}).join('');
  const brews=['normal','rare'].map(quality=>{const meta=brewQualities[quality],rows=brewTypes.map(([key,name,,label])=>{const used=Math.max(0,state.brewUsage?.[`${key}_${quality}`]||0),owned=Math.max(0,state[`brewCount_${key}_${quality}`]||0),percent=Math.min(100,used/limit*100);return `<article><img src="assets/qstyle-v2/production/brews/${key}-${quality}.webp" alt="${meta.name}${name}"><span><b>${name}</b><small>${label}永久白值＋${formatLargeNumber(used*meta.gain)}</small><i><em style="width:${percent}%"></em></i></span><strong>${used}／${limit}<small>持有 ${formatLargeNumber(owned)}</small></strong></article>`}).join('');return `<details class="dosage-tier spirit-brew-ledger"><summary><b>${meta.name}靈釀</b><span>各類皆可品飲 ${limit} 瓶</span></summary><div>${rows}</div></details>`}).join('');
  inner.innerHTML=`<section class="dosage-ledger"><header><small>永久服用紀錄</small><h2>丹藥與靈釀</h2><p>目前個別服用上限 ${limit}（基礎50＋洗髓伐毛丹 ${Math.max(0,state.dosageLimitBonus||0)}）；各階、品質與種類分開計算。</p></header>${tiers}${brews}</section>`;
}
function renderWardrobeView(section='outfits'){
  const inner=$('#bagInner');if(!inner)return;
  inner.innerHTML=`<div class="wardrobe-tabs"><button data-wardrobe-view="outfits">服裝</button><button data-wardrobe-view="true-forms">真身</button><button data-wardrobe-view="titles">稱號</button></div><div id="wardrobeInner"></div>`;
  $$('.wardrobe-tabs button').forEach(button=>button.onclick=event=>{event.preventDefault();event.stopPropagation();renderWardrobeSection(button.dataset.wardrobeView)});
  renderWardrobeSection(section);
}
function replaceWardrobeContent(inner,markup){
  inner.replaceChildren();
  void inner.offsetHeight;
  inner.innerHTML=markup;
}
function restoreWardrobeScroll(scrollTop){
  if(scrollTop===null)return;
  const host=$('#featureDescription');if(!host)return;
  host.scrollTop=scrollTop;
  requestAnimationFrame(()=>{host.scrollTop=scrollTop;requestAnimationFrame(()=>host.scrollTop=scrollTop)});
}
function renderWardrobeSection(section,preserveScroll=false){
  const scrollTop=preserveScroll?($('#featureDescription')?.scrollTop||0):null;
  currentWardrobeView=section;
  $$('.wardrobe-tabs button').forEach(button=>button.classList.toggle('active',button.dataset.wardrobeView===section));
  const inner=$('#wardrobeInner');if(!inner)return;
  if(section==='outfits'){
    const g=state.gender==='男'?'male':'female',appearance=state.appearance||1;
    replaceWardrobeContent(inner,`<div class="wardrobe-intro"><b>衣閣藏衣</b><span>天工絕品需花費靈玉永久購得；服裝不影響人物屬性。</span></div><div class="wardrobe-showcase-strip" data-wardrobe-strip="outfits">${wardrobeOutfits[state.gender].map(outfit=>{const owned=masterworkOutfitOwned(outfit),selected=owned&&state.outfit===outfit.id,canBuy=(state.spiritJade||0)>=masterworkOutfitPrice;return `<article class="wardrobe-card ${outfit.effect?'mythic':''} ${selected?'selected':''} ${owned?'':'locked'}" data-quality="${outfit.quality}" data-outfit-effect="${outfit.effect||'none'}"><span class="wardrobe-preview"><img src="${appearanceAsset(state.gender,appearance,outfit.id)}" alt="${outfit.name}"></span><b>${outfit.name}</b><small class="item-quality">${outfit.kind}${outfit.quality==='masterwork'&&!owned?' ・ 未擁有':''}</small><button type="button" class="wardrobe-action" data-outfit-action="${outfit.id}" ${!owned&&!canBuy?'disabled':''}>${selected?'穿戴中':owned?'穿戴':`${masterworkOutfitPrice} 靈玉`}</button></article>`}).join('')}</div>`);
    $$('[data-outfit-action]').forEach(button=>button.onclick=()=>selectOrBuyOutfit(button.dataset.outfitAction));
    restoreWardrobeScroll(scrollTop);
    return;
  }
  if(section==='true-forms'){
    replaceWardrobeContent(inner,`<div class="wardrobe-intro"><b>真身異象</b><span>天工絕品真身需花費靈玉永久購得。</span></div><div class="wardrobe-showcase-strip" data-wardrobe-strip="true-forms">${trueFormCatalog.map(form=>{const owned=masterworkTrueFormOwned(form),selected=owned&&state.trueForm===form.id,canBuy=(state.spiritJade||0)>=masterworkTrueFormPrice;return `<article class="true-form-card ${selected?'selected':''} ${owned?'':'locked'}" data-quality="${form.quality}" data-true-form-card="${form.id}"><span class="true-form-preview ${form.id==='none'?'empty':''}">${form.image?`<img src="${form.image}" alt="${form.name}">`:'<i>無相</i>'}</span><span><b>${form.name}</b><strong class="item-quality">${form.kind}${form.quality==='masterwork'&&!owned?' ・ 未擁有':''}</strong><small>${form.description}</small></span><button type="button" class="true-form-action" data-true-form-action="${form.id}" ${!owned&&!canBuy?'disabled':''}>${selected?'顯化中':owned?'顯化':`${masterworkTrueFormPrice} 靈玉`}</button></article>`}).join('')}</div>`);
    $$('[data-true-form-action]').forEach(button=>button.onclick=()=>selectOrBuyTrueForm(button.dataset.trueFormAction));
    restoreWardrobeScroll(scrollTop);
    return;
  }
  syncTitleUnlocks();
  replaceWardrobeContent(inner,`<div class="wardrobe-intro"><b>道號仙章</b><span>稱號異象需佩戴才會顯現；稱號的永久效果無須佩戴。</span></div><div class="title-strip"><article class="title-card title-none ${state.equippedTitle==='none'?'selected':''}"><span class="title-empty-seal">無名</span><span><b>不彰其名</b><small>卸下目前佩戴的稱號，收斂所有名號異象。</small></span><button type="button" class="title-action" data-title-action="none">${state.equippedTitle==='none'?'未佩戴':'卸下'}</button></article>${titleCatalog.map(title=>{const unlocked=titleUnlocked(title.id),selected=state.equippedTitle===title.id;return `<article class="title-card ${unlocked?'':'locked'} ${selected?'selected':''}" ${unlocked?'':`aria-label="尚未取得；${title.hint}"`}><span class="title-art"><img src="${title.image}" alt="${unlocked?title.name:'未取得稱號'}"></span><span class="title-copy">${unlocked?`<small>${title.kind}</small><p>${title.description||'佩戴此稱號後，將顯示於人物頭頂。'}</p>`:`<small>取得方式</small><p>${title.hint}</p>`}</span>${unlocked?`<button type="button" class="title-action" data-title-action="${title.id}">${selected?'佩戴中':'佩戴'}</button>`:'<span class="title-status">尚未取得</span>'}</article>`}).join('')}</div>`);
  $$('[data-title-action]').forEach(button=>button.onclick=()=>{state.equippedTitle=button.dataset.titleAction;applyCharacterVisual();renderWardrobeSection('titles',true);save()});
  restoreWardrobeScroll(scrollTop);
}
function showCharacterAttributes() {
  currentCharacterView='attributes';const inner=$('#characterInner')||$('#bagInner');
  const white=attribute=>Math.max(0,Math.round(baseCore(attribute)));
  const rootBone=white('rootBone'),trueQi=white('trueQi'),physique=white('physique'),agility=white('agility'),spiritualPower=white('spiritualPower'),comprehension=white('comprehension'),fortune=white('fortune'),health=combatHealth(rootBone),attack=trueQi*5,defense=physique*20,evasion=combatEvasion(agility),accuracy=combatAccuracy(spiritualPower),critical=Math.round(combatCritical(spiritualPower)*100);
  const rootBoneHealth=rootBone*4,fixedHealth=Math.max(0,health-rootBoneHealth),battleHealth=battlePlayerStats().maxHp,battleHealthDelta=battleHealth-health;
  const final={rootBone:displayedCore('rootBone'),trueQi:displayedCore('trueQi'),physique:displayedCore('physique'),agility:displayedCore('agility'),spiritualPower:displayedCore('spiritualPower'),comprehension:displayedCore('comprehension'),fortune:displayedCore('fortune')};
  const elements=[['metal','金','metalRoot'],['wood','木','woodRoot'],['water','水','waterRoot'],['fire','火','fireRoot'],['earth','土','earthRoot']];
  inner.innerHTML=`<section class="character-sheet"><div class="sheet-header"><div><small>姓名</small><b>${state.name}</b></div><div><small>修煉歲月</small><b>${experiencedYears().toLocaleString()}年</b></div><div><small>練氣境界</small><b>${realmName(state.spiritLevel,spiritRealms)}</b></div><div><small>煉體境界</small><b>${realmName(state.bodyLevel,bodyRealms)}</b></div><div><small>出生</small><b>${state.origin}</b></div><div><small>門派</small><b>${state.sect||'無門無派'}${state.actingLeader?'・代理掌門':''}</b></div></div><details class="sheet-fold"><summary><b>基礎白值</b><span>包含功法、裝備、丹藥等直接加值；不含百分比與臨時狀態</span></summary><div class="sheet-attributes"><div><span>命骨：${rootBone}</span><strong>氣血：${health}</strong></div><div><span>元息：${trueQi}</span><strong>攻擊：${attack}</strong></div><div><span>玄軀：${physique}</span><strong>防禦：${defense}</strong></div><div><span>游影：${agility}</span><strong><button id="evasionHelpBtn" class="attribute-help-button">閃避評級：${evasion}<i>？</i></button></strong></div><div><span>銳識：${spiritualPower}</span><strong>命中評級：${accuracy}・暴擊：${critical}%</strong></div><div><span>道悟：${comprehension}</span><strong>基礎修練效率：+${Math.floor(comprehension*.5)}</strong></div><div><span>天契：${fortune}</span><strong>基礎靈氣獲取：+${Math.floor(1.25*Math.sqrt(fortune))}</strong></div><div><span>正氣：${Math.floor(state.righteousness)}</span><strong>邪氣：${Math.floor(state.evilQi)}</strong></div></div></details><details class="sheet-fold"><summary><b>五系功法屬性</b><span>靈根白值加成與裝備加成分開顯示</span></summary><div class="five-arts">${elements.map(([key,label,stateKey])=>`<span><b>${label}系白值＋${spiritRootBonus(state[stateKey]).toFixed(1)}%</b><small>${rootRank(state[stateKey])}・裝備＋${equippedElementBonus(key).toFixed(1)}%</small></span>`).join('')}</div></details><details class="sheet-fold"><summary><b>加成後實戰屬性</b><span>百分比、周天與當前狀態均已計入</span></summary><div class="final-attribute-grid"><span>命骨 <b>${final.rootBone}</b></span><span>元息 <b>${final.trueQi}</b></span><span>玄軀 <b>${final.physique}</b></span><span>游影 <b>${final.agility}</b></span><span>銳識 <b>${final.spiritualPower}</b></span><span>道悟 <b>${final.comprehension}</b></span><span>天契 <b>${final.fortune}</b></span><span>最終攻擊 <b>${final.trueQi*5}</b></span></div></details></section>`;
  const healthRow=inner.querySelector('.sheet-attributes > div:first-child');healthRow.querySelector('strong').textContent=`氣血白值：${rootBoneHealth}`;healthRow.insertAdjacentHTML('afterend',`<div><span>額外固定氣血：+${fixedHealth}</span><strong>基礎氣血合計：${health}</strong></div>`);inner.querySelector('.final-attribute-grid').insertAdjacentHTML('beforeend',`<span>氣血額外修正 <b>${battleHealthDelta>=0?'+':''}${battleHealthDelta}</b></span><span>最終戰鬥氣血 <b>${battleHealth}</b></span>`);
  inner.querySelector('.character-sheet').insertAdjacentHTML('afterbegin',`<div class="sheet-combat-power"><small>人物戰力</small><b>${formatCombatPower(combatPower())}</b></div>`);
  const alignment=cultivationAlignment();inner.querySelector('.sheet-combat-power').insertAdjacentHTML('afterend',`<div class="sheet-combat-power path-${alignment.id}"><small>處世之道・${alignment.tier?`${alignment.tier}階`:'未定'}</small><b>${alignment.name}</b><span>${alignment.description}</span></div>`);
  inner.querySelector('.sheet-header').insertAdjacentHTML('beforeend',`<div><small>淬劍境界</small><b>${realmName(state.swordLevel||0,swordRealms)}</b></div>`);
  const ascensionRecord=normalizeAscension();inner.querySelector('.sheet-header').insertAdjacentHTML('beforeend',`<div class="sheet-ascension-rank"><small>飛升榜</small><b>${ascensionRecord.ascended?(ascensionRecord.serverAscensionRank?`第 ${ascensionRecord.serverAscensionRank} 名`:'已飛升・同步中'):'尚未飛升'}</b></div>`);
  if(state.swordEmbryo)inner.querySelector('.sheet-header').insertAdjacentHTML('afterend',`<div class="sheet-sword"><small>本命劍・${swordEmbryos[state.swordEmbryo].name}</small><b>${state.swordName}</b><span>養劍 ${state.swordNurtureLevel} 階${state.swordIntentType?`・${swordIntents[state.swordIntentType].name}`:''}・劍格 ${swordPathTitle()}</span><span>${swordRealmEffectText()}</span></div>`);
  $('#evasionHelpBtn').onclick=()=>gameConfirm(`【評級來源】\n每 1 點游影提供 3 點閃避評級。\n每 1 點銳識提供 3 點命中評級。\n\n【閃避率公式】\n閃避率＝防守方閃避評級 ÷（防守方閃避評級＋攻擊方命中評級×4＋1000）\n最終閃避率最高為 35%。\n\n【如何理解】\n防守方閃避評級越高，越容易避開攻擊；攻擊方命中評級越高，越能壓低對方的閃避率。命中評級並不是固定命中百分比，實際結果必須同時比較交戰雙方。\n\n當雙方評級相近時，中後期閃避率會逐漸接近 20%；只有防守方的閃避評級明顯高於攻擊方命中評級時，才會接近 35%上限。\n\n具有「命中評級提高」效果的招式，會先提高本次攻擊的命中評級，再代入公式。例如命中評級＋25%，代表該次攻擊以原命中評級的 125% 計算。\n\n多段攻擊的每一擊都會各自判定閃避，因此可能出現部分命中、部分閃避。暴擊則是另一項獨立判定，命中後才會顯示其傷害結果。`,{title:'命中與閃避說明',confirmText:'明白了',info:true});
}

function finishPause(){
  pauseStartedAt=null;document.documentElement.classList.remove('entry-transition');$$('.entry-arriving').forEach(element=>element.classList.remove('entry-arriving'));updateMainlineButton();
}
function forceOffline(){
  if(suppressSave||!state.name||pauseStartedAt!==null)return;pauseStartedAt=gameNow();state.lastSave=pauseStartedAt;sessionOnline=false;clearTimeout(battleTimer);clearSwordTrialAdvance();closeOfflineRewards();battle=null;if(tribulationLocked)cleanupTribulationScene();
  $('#mailboxModal').classList.add('hidden');$('#mailDetailModal').classList.add('hidden');
  $('#battleModal').classList.add('hidden');$('#tribulationModal').classList.add('hidden');$('#itemModal').classList.add('hidden');$('#sellModal').classList.add('hidden');$('#offlineModal').classList.add('hidden');$('#marketModal').classList.add('hidden');$('#marketPurchaseModal').classList.add('hidden');$('#gameMenu').classList.add('hidden');$('#settingsModal').classList.add('hidden');$('#helpModal').classList.add('hidden');stopAllBgm();show('#titleScreen');$('#titleHint').textContent='已離線・點擊螢幕重新進入';save();
}
function finishCreationPrologue(){
  clearTimeout(prologueTimer);prologueTimer=null;
  $('#prologueScreen').classList.remove('playing');startBgm('title');show('#createScreen',true);
}
function showCreationPrologue(){
  clearTimeout(prologueTimer);show('#prologueScreen',true);
  const screen=$('#prologueScreen');screen.classList.remove('playing');void screen.offsetWidth;screen.classList.add('playing');
  prologueTimer=setTimeout(finishCreationPrologue,5200);
}
function enterFromTitle() { if(state.name) startGame(); else showCreationPrologue(); }
function showSettingsSection(section) {
  ['#settingsMain','#deleteStepOne','#deleteStepTwo'].forEach(id=>$(id).classList.add('hidden'));
  $(section).classList.remove('hidden');
}
function openSettings() {
  $('#gameMenu').classList.add('hidden');
  $('#settingsModal').classList.remove('hidden');
  $('#deleteConfirmInput').value=''; $('#deleteError').textContent='';
  $('#deletePhraseHint').textContent=`${state.name}/刪除`;
  showSettingsSection('#settingsMain');
  refreshRecoveryCodeDisplay();
  refreshPlayerUidDisplay();syncJadeGrants();
}
function openHelp(){
  $('#gameMenu').classList.add('hidden');renderHelp('cultivation');$('#helpModal').classList.remove('hidden');
}
function helpCard(title,items,note=''){return `<section class="help-guide-card"><h3>${title}</h3><ul>${items.map(item=>`<li>${item}</li>`).join('')}</ul>${note?`<p>${note}</p>`:''}</section>`}
function realmHelp(){const groups=[['練氣',spiritRealms],['煉體',bodyRealms],['淬劍',swordRealms]];return groups.map(([title,realms])=>`<section class="help-realm-group"><h3>${title}境界</h3><ol>${realms.map((realm,index)=>`<li><span>${index+1}</span><b>${realm}</b><small>每境十層</small></li>`).join('')}</ol></section>`).join('')}
function renderHelp(tab='cultivation'){
  $$('.help-tabs button').forEach(button=>button.classList.toggle('active',button.dataset.helpTab===tab));const helpTabs=$('.help-tabs'),activeHelpTab=helpTabs?.querySelector('.active');if(helpTabs&&!helpTabs.dataset.horizontalScroll){helpTabs.dataset.horizontalScroll='true';helpTabs.addEventListener('wheel',event=>{if(Math.abs(event.deltaY)<=Math.abs(event.deltaX))return;helpTabs.scrollLeft+=event.deltaY;event.preventDefault()},{passive:false})}if(helpTabs&&activeHelpTab)helpTabs.scrollLeft=activeHelpTab.offsetLeft-helpTabs.offsetLeft-(helpTabs.clientWidth-activeHelpTab.clientWidth)/2;const pages={
    cultivation:helpCard('三路修行',['練氣消耗修為；淬劍消耗獨立累積的劍元；煉體以每日鍛體時機、體力與三類物資淬鍊根基，三條路線可各自推進。','完成新手引導與三途問心後會選定最初道場；其餘道路可由「兼修」開啟，之後能自由切換道場。','修為與劍元可離線累積；煉體不隨每5秒產出，也不會離線自動完成。','切換道場不會關閉已開啟道路，但部分專修效果會在兼修時降低。'])+helpCard('境界與功能解鎖',['三條路線皆為每個大境界十層；小層符合條件即可提升，大境界另有各自考驗。','練氣、淬劍或煉體任一路線達到要求，便可開放對應星級門派、坊市樓層、製作階級及九鎖封天關卡。','九鎖封天需依序通關；每個大境界有兩關，並要求三路之一達到相應境界。','每關首次通關會取得一次固定獎勵；已通關關卡可重溫完整劇情與戰鬥，但不會再次提供獎勵。','神念遠遊開啟後，可探索已通關關卡並持續取得九鎖相關素材。'])+helpCard('三路大境界考驗',['練氣跨越大境界需渡雷劫，部分境界突破前還需完成問心境。','淬劍每逢第十層需先通過對應試劍境關卡，再完成本命劍突破。','煉體跨越大境界需完成三項肉身根基、產線與物資條件，並承受肉身試煉。'])+realmHelp(),
    spirit:helpCard('練氣三個入口',['「練氣」顯示境界、修為、預計突破時間、效率來源、屬性預覽與問心進度。','「周天」用來選擇修行方向，可隨時切換且不消耗資源。','「靈機」每日提供三次操作，並集中顯示凝神加護與道基印記。','兼修練氣頁會將上述資訊集中顯示；修為仍會持續累積。'])+helpCard('三種周天',['小周天：修為效率 +8%，大境界成功後凝成歸元印。','靈元周天：修為效率 +4%、練氣道場元息 +6%；切換淬劍或煉體道場後元息效果減半，大境界成功後凝成太玄印。','定息周天：修為效率 +2%、渡劫成功率 +5%，大境界成功後凝成不動印。','主修與兼修只影響元息類效果；修為效率及渡劫效果不會因切換道場而失效。'])+helpCard('每日靈機與道基印記',['每日恢復3次靈機；納氣歸元取得15分鐘等值修為，洗脈凝神取得15分鐘等值靈氣。','觀脈悟道使下一次雷劫成功率 +2%，最多累積 +6%，引動雷劫後消耗。','歸元印每枚使修為效率 +0.75%，8枚達 +6%收益上限。','太玄印每枚使元息 +1%，兼修時每枚生效 +0.5%，6枚達主修 +6%收益上限。','不動印每枚使練氣雷劫成功率 +1%，8枚達 +8%收益上限。','超過收益上限的印記仍保留總數紀錄，但不再增加數值。'])+helpCard('問心境與正邪心相',['進入靈胎、照虛、蛻凡前會各觸發一次問心境；需完成三道抉擇才能引動該次突破。','進入問心時，既有正氣與邪氣比例會形成清明、業火或兩儀心境；回答仍可自由選擇。','若回答明顯背離原本心相，結果可能形成動搖；每道答案會小幅增加正氣、邪氣或兩者。','守一心每重使渡劫失敗損失降低5%，三重最高由50%降至35%。','濟世心每重使因緣物資 +5%，三重最高 +15%。','逍遙心每重使每日第一次資源型靈機 +20%，三重最高 +60%。','問心不會增加淬劍道印或試劍境進度。'])+helpCard('雷劫',['練氣小層只需足夠修為；跨入下一個大境界時需渡雷劫。','可投入對應境界的渡劫丹，每顆提高5%成功率；雷劫頁會分項顯示定息周天、不動印、凝神加護與丹藥來源。','成功後提升境界與屬性，並依渡劫時使用的周天凝成對應道基印記。','失敗會損失本次突破所需修為的50%；守一心可降低損失比例。','渡劫演出結束後需手動離開結果畫面。']),
    sword:helpCard('本命劍與劍招',['開啟淬劍後可從重鋒、靈元、流影三種劍胚中擇一凝聚；使用歸元鑄胚露可重新選擇劍胚，並保留既有養成進度。','每種劍胚有兩招專屬劍招；第一招凝劍後可用，第二招於通過試劍境第20關後解鎖。','可在招式頁配置第一式與第二式；戰鬥時依順序循環施展，同一招不可重複裝配。'])+helpCard('淬劍與試劍境',['凝聚本命劍後即可由第1關連續挑戰至第90關，不受當前淬劍境界或層數限制。','淬劍小層可直接提升；每逢第十層，仍需先擊敗第10、20、30……關才能跨入下一大境界。','第90關是目前試劍境終點，用於銜接未來開放的後續境界。','試劍境自動戰鬥期間會持續播放專屬樂曲，直到整次挑戰結束。','淬劍達凝魄並通過第40關後，可從破軍、流光、歸元三種劍意中擇一領悟。'])+helpCard('正邪閱歷與劍印',['門派任務會依門派立場累積正氣或邪氣，兩者不消耗也不互相抵銷。','淬劍大境界突破時，會依正邪閱歷凝成天罡、血煞或兩儀劍印；閱歷不足仍可突破，但不會凝印。','劍印會影響劍招效果與演出色彩。']),
    body:helpCard('三種鍛體',['每日恢復2次鍛體時機，最多累積14次；每次操作消耗1次，完全不採每5秒產出。','穩身承壓平均提升筋骨、氣血、臟腑；藥浴開脈偏重氣血與臟腑並降低負荷；極限重鍛偏重筋骨、消耗隕鐵且有受傷風險。','每層所需根基次數依境界提高：塵軀與納勁3次、纏筋至鳴髓4次、曜身與擎嶽5次、撼霄6次、鎮陸7次。','體力每分鐘恢復1點，負荷每分鐘消退1點；鍛體室只降低材料與風險，不會自動增加進度。'])+helpCard('產線與肉身試煉',['跨入納勁至鎮陸時，三條生產線建議等級依序為3、6、9、13、17、22、26、30級，並需備妥各倉容量約八成的突破物資。','突破物資只在試煉成功後扣除；失敗會完整保留物資與三項根基，但可能留下傷勢。','同一大境界失敗兩次後，治癒傷勢再挑戰會觸發肉身適應，第三次必定撐過最後一息。','鎮陸十層為目前凡間上限；渡星、寰甲、無量境保留給後續上位面內容。'])+helpCard('專精回報與傷勢',['煉體境界主要提高命骨、玄軀與生存能力；肉身招式另隨煉體大境界獲得專精倍率，最高增加30%，不會放大練氣或淬劍招式。','內傷提高鍛體體力消耗並降低戰鬥氣血；筋傷降低閃避且禁止極限重鍛；傷勢可等待痊癒或消耗食物、木材治療。','玉骨降低極限重鍛受傷率；鳴髓縮短傷勢；曜身、擎嶽強化肉身試煉；撼霄降低療傷消耗。']),
    ascension:helpCard('開啟天路',['完整通過九鎖封天第18關，且練氣、淬劍或煉體至少一條達到第九大境界一層，便可進入飛升天路。','序章只能選擇已達遊穹一層、劍域一層或鎮陸一層的道路；未達標的選項會呈灰色。','選定道路後無法更改；若尚未決定，必須點擊「待我思考」退出序章。'])+helpCard('四段飛升試煉',['依序完成「天路將起」、「問心陣」、「照妄陣」與「天路盡頭」；關卡進行中無法自行退出，序章僅能以「待我思考」返回。','問心陣的三次回答會即時記錄，並影響照妄陣中心魔針對你的質問；三條修煉道路也各有專屬內容。','問心陣與照妄陣通關後需分配屬性點，完成分配才會開放下一關。','照妄陣心魔為約850萬戰力的攻防型魔族；天路之主為約1000萬戰力的防禦型人族，將其氣血壓至10%即可取得認可。'])+helpCard('飛升結果與重溫',['首次飛升會依完成條件解鎖飛升稱號，記錄飛升時間、道路與飛升榜順位。','成功飛升後可無限重溫四段關卡，但不會再次取得屬性、稱號或改動排行榜。','仙界目前為靈氣枯竭的荒土；凡間修為、劍元、洞府與其他產能仍會運作，但仙界不顯示凡間每5秒產出提示。'])+helpCard('仙凡往返',['凡間可點「仙界」或向上滑動前往仙界；仙界可點「凡間」或向下滑動返回凡間。','仙界暫時只保留人物狀態欄與返回凡間入口；凡間道場、坊市、信箱、因緣與九鎖封天等入口只在凡間顯示。']),
    battle:helpCard('通用戰鬥規則',['命骨影響氣血，元息影響攻擊，玄軀影響防禦，游影影響閃避，銳識影響命中與暴擊。','戰鬥會自動進行並顯示每回合招式、傷害與閃避結果。','戰鬥進行三回合後才可中途退出；除一般切磋外，中途退出視為認輸。','不同戰鬥會使用各自的場景、敵人數值、勝利條件與獎勵。'])+helpCard('戰鬥類型',['九鎖封天：首次通關推進主線並取得固定首通獎勵；重溫不掉落，持續素材來源為神念遠遊。','試劍境：使用淬劍與本命劍相關能力擊敗劍道幻影。','肉身試煉：依煉體能力承受指定回合，重點是撐過考驗而非擊倒對手。','門人切磋：每日勝利次數有限；掌門挑戰需達指定職位與聲望。']),
    arts:helpCard('靈根與靈氣',['靈氣由修練與相關效果取得，可用來提升金、木、水、火、土五行靈根。','靈根會放大相同五行功法的效果；人物天契會提高靈氣獲取效率。','提升靈池可增加靈氣相關成長，操作前可在畫面查看所需物資。'])+helpCard('功法系統',['功法頁分為門派功法、功法書與招式；功法書再依玄錄、命篇、體典、行章、悟卷、天箋分類。','門派功法需加入門派後前往「傳功殿」學習；外門、內門、親傳依序可學一、二、三部。','門派秘藏在尚未查明前只顯示線索；晉升內門可確認，晉升親傳後才可受授。','坊市藏經閣出售功法書；購買後需到儲物袋使用，同名功法不能重複學習。','功法可消耗靈氣升級，效果會計入人物屬性與戰鬥力；遺忘不返還已投入的靈氣。']),
    cave:helpCard('靈脈與修行設施',['洞府靈脈提供設施運作所需供應，提升靈脈可擴充供應上限。','聚靈室提高掛機修為；洗劍池提高掛機劍元；鍛體室降低手動鍛體的材料消耗與受傷風險。','設施可啟停與升級；供應不足時無法啟用。鍛體室不會在在線或離線期間自動增加肉身進度。'])+helpCard('道童與資源生產',['道童可分配至食物、木材及隕鐵生產線；每條生產線每升一級可多安排一名道童。','三條生產線目前最高30級，因此單條生產線最多安排30名道童。','生產線等級與倉儲容量是煉體大境界突破條件的一部分，跨入鎮陸需三線皆達30級。'])+helpCard('煉丹、煉器與儲物袋',['丹房使用神念遠遊取得的主藥與丹砂製作永久屬性丹；可製作階級取決於三路最高境界。','器室可用織天台消耗木材、靈石製作補天絲；可在目前最高境界內自由選擇較低階織法，選擇會保留，離線期間照常推進。','儲物袋初始100格、最高19階，每次升階增加50格；每格同種道具最多容納9,999個。','器室也能使用神念遠遊素材、階材與器靈精魄製作裝備。'])+helpCard('書房',['山海志只收錄親自通過的九鎖封天地域，並記載所遇生靈與地方特產；未發現項目維持封卷。','戰錄彙整九鎖封天、試劍境、肉身試煉與因緣進度，不改變任何屬性。','典故錄只供重新翻閱已完成的主線對話與結果；因緣抉擇請由因緣入口的歲月錄查看。']),
    sect:helpCard('加入、離開與重返',['一至九星門派會隨三路最高境界依序開放；無門無派時可隨機尋訪目前可加入的門派。','隨機尋訪會優先遇到未拜入或尚未探索完整的門派；聲望堂信物可指定加入對應門派。','脫離門派後，需等待三個修練年才能再次免費尋訪；使用指定門派信物不受此等待限制。','每個門派的職位、功勳、貢獻、任務與傳承見聞都會獨立保存，日後重返可繼續累積。'])+helpCard('門派設施',['門派主殿：查看職位與資源、晉升、領取每日俸祿及脫離門派。','門人：切磋、向掌門請安或發起掌門挑戰；大長老與供奉可引導前往門派設施。','練功房：進行每日練功及掌門傳功。','執事堂：承接持續任務；傳功殿：學習門派功法；功勳堂：使用貢獻兌換物資。','門派見聞：只記錄玩家親自拜入後得知的門派與傳承線索。'])+helpCard('持續任務與三路判定',['門派任務依練氣、淬劍、煉體三路中的最高大境界解鎖：第一至第九境每境一項，之後於第11、13、15、17、19、21、23境各開一項，共16項。','每個門檻由最先令三路最高進度達標的道路決定任務內容；其他道路日後超越並跨過新門檻時，仍會正常解鎖新任務。','已解鎖任務的道路與內容永久保留，不會因切換道場或另一條路線追上而改變。','持續任務每個修練年同時增加本門功勳與門派貢獻，並發放靈石、聲望及對應正邪閱歷。'])+helpCard('功勳、貢獻與職位',['任務基礎功勳與貢獻由每年＋10逐步成長至＋50；門派閱歷仍會提高低階任務收益，但實際每年最高各＋50。','職位依累計本門功勳晉升，晉升不會扣除功勳；門派貢獻則保留給功勳堂兌換。','功勳堂供應釀坊原釀、丹藥素材與裝備素材；一般製作素材每種每日限換10份，器靈精魄每日限換2枚。','外門、內門、親傳、供奉、護法會影響功法、俸祿及部分門派功能。']),
    wardrobe:helpCard('衣閣外觀',['髮型、服裝與真身只改變人物外觀，不會增加屬性或戰鬥力。','一般外觀可直接選用；標示「天工絕品・未擁有」的項目需使用靈玉永久購買。','天工絕品服裝每件50靈玉；天工絕品真身每款100靈玉。','服裝依男、女衣閣分別收藏；已購買的真身不受性別限制。'])+helpCard('購買與保存',['購買前會再次確認，靈玉扣除後立即加入目前角色衣閣。','衣閣收藏會隨角色存檔保存，使用帳號恢復碼移轉裝置時也會一併帶走。']),
    account:helpCard('正式版 UID 與靈玉',['每名正式版玩家都有唯一 UID，可在「選單 → 設定」查看及複製；向開發者購買靈玉時請提供此 UID。','靈玉發放完成後，遊戲在線時會自動同步入帳；同一筆發放不會重複領取。','使用易名玉牒更改姓名後，潛龍榜與飛升榜會自動更新為新姓名。'])+helpCard('帳號恢復碼',['在「選單 → 設定」建立恢復碼後，遊戲會定期將角色存檔備份至正式版帳號。','更換裝置時，在標題畫面點擊「使用帳號恢復碼」，可取回角色、原 UID、排行榜身分、衣閣收藏與待領靈玉。','恢復成功後仍沿用原恢復碼；除非永久刪除角色，否則恢復碼不會失效或變更。恢復碼等同帳號密碼，切勿交給他人。','舊裝置在線時會偵測帳號已轉移並清除本機資料；若當時離線，會在下次連網後執行。'])+helpCard('遊戲連線與存檔',['切換到其他應用程式或暫時離開瀏覽器，不會強制斷線或返回標題畫面。','尚未建立恢復碼前，角色存檔只存在目前瀏覽器；清除網站資料、移除瀏覽器或遺失裝置可能導致角色無法取回。','永久刪除角色時，已建立的雲端備份與本機恢復碼也會一併刪除。'])
  };const encounterHelp=helpCard('因緣與歲月',['修練達10、30、50、100、300、500與1000年時，會留下固定歲月事件。','正常在線遊玩約每30至60分鐘可能遇見一樁隨機奇遇；離線、戰鬥與突破演出期間不會累積隨機奇遇計時。','奇遇可暫時收起，待處理事件會保留在右側「因緣」入口。'])+helpCard('抉擇與道心',['每樁奇遇均可守正、逐利或守衡，分別累積正氣、邪氣或兩者閱歷。','獎勵只使用正式既有物品，包括物資袋、凡間素材與渡劫丹；測試道具不會出現。','守正提高氣血、防禦與減傷；逐煞提高三路攻擊但略增承傷；守衡提高命中、閃避與第二招式。']);$('#helpContent').innerHTML=(tab==='encounter'?encounterHelp:pages[tab])||pages.cultivation;
}
const scriptureFloorTiers=[[1,2],[3,4],[5,6],[7,8],[9]];
const scriptureTierPrices=[100,350,1200,5400,16000,48000,145000,435000,1300000];
const reputationFloorStars=[[1,2],[3,4],[5,6],[7,8],[9]];
const sectInvitationPrices=[150,250,450,700,1000,1400,1900,2500,3300];
const reputationResourcePrices={100:{spiritStone:10,wood:18,meteorIron:26},1000:{spiritStone:100,wood:150,meteorIron:220},10000:{spiritStone:1000,wood:1200,meteorIron:1800}};
function seededRandom(seedText){let seed=[...seedText].reduce((value,char)=>(value*31+char.charCodeAt(0))>>>0,2166136261);return()=>{seed+=0x6D2B79F5;let value=seed;value=Math.imul(value^value>>>15,value|1);value^=value+Math.imul(value^value>>>7,value|61);return((value^value>>>14)>>>0)/4294967296}}
function scriptureDailyState(){const today=dateKey()||'local';if(state.scripturePurchases.date!==today){state.scripturePurchases={date:today,ids:[]};save()}return state.scripturePurchases}
function scriptureStock(floor){
  const today=dateKey()||'local',tiers=scriptureFloorTiers[floor-1]||[1,2],pool=techniqueBooks.filter(book=>!book.exclusiveMarket&&tiers.includes(book.tier)),random=seededRandom(`藏經閣-${today}-${floor}`);
  for(let index=pool.length-1;index>0;index--){const swap=Math.floor(random()*(index+1));[pool[index],pool[swap]]=[pool[swap],pool[index]]}
  return pool.slice(0,9);
}
function reputationStock(floor){
  const today=dateKey()||'local',stars=reputationFloorStars[floor-1]||[1,2],pool=sectInvitationItems.filter(entry=>stars.includes(entry.star)),random=seededRandom(`聲望堂-${today}-${floor}`);
  for(let index=pool.length-1;index>0;index--){const swap=Math.floor(random()*(index+1));[pool[index],pool[swap]]=[pool[swap],pool[index]]}
  const resources=reputationResourceItems.filter(entry=>floor>=entry.minFloor&&floor<=entry.maxFloor).map(entry=>entry.id);
  return [...resources,...pool.slice(0,6).map(entry=>entry.id)];
}
function marketDailyState(){
  const today=dateKey()||'local';
  if(state.marketDailyPurchases.date!==today)state.marketDailyPurchases={date:today,counts:{}};
  state.marketDailyPurchases.counts||={};return state.marketDailyPurchases;
}
function marketWeekKey(now=gameNow()){const date=new Date(now),offset=(date.getDay()+6)%7;date.setHours(0,0,0,0);date.setDate(date.getDate()-offset);return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`}
function marketWeeklyState(){const week=marketWeekKey();if(state.marketWeeklyPurchases?.week!==week)state.marketWeeklyPurchases={week,counts:{}};state.marketWeeklyPurchases.counts||={};return state.marketWeeklyPurchases}
function marketOfferForBook(id){
  const book=techniqueBooks.find(entry=>entry.id===id),item=itemCatalog[id];if(!book||!item)return null;
  const tier=['一','二','三','四','五','六','七','八','九'][book.tier-1];
  const treasure=book.exclusiveMarket==='treasure';
  return {id,item,name:book.name,image:item.image,description:`${item.description}\n功法效果：${artKinds[book.kind].label}+${artBaseEffect(book).toLocaleString()}（${book.elementName}行・${tier}階）`,currencyKey:treasure?'spiritJade':'spiritStone',currencyName:treasure?'靈玉':'靈石',currencyImage:`assets/qstyle-v2/${treasure?'spirit-jade':'spirit-stone'}.png`,price:treasure?999:scriptureTierPrices[book.tier-1],dailyLimit:null,permanentLimit:1,quantityEnabled:false};
}
function marketOfferForItem(id){
  const bookOffer=marketOfferForBook(id);if(bookOffer)return bookOffer;
  const casketOffer=marketCultivationCaskets.find(entry=>entry.id===id);
  if(casketOffer){const item=itemCatalog[id];return {id,item,name:item.name,image:item.image,description:item.description,currencyKey:'spiritStone',currencyName:'靈石',currencyImage:'assets/qstyle-v2/spirit-stone.png',price:casketOffer.price,dailyLimit:1,permanentLimit:null,quantityEnabled:false}}
  const resourceOffer=marketResourceItems.find(entry=>entry.id===id);
  if(resourceOffer){const item=itemCatalog[resourceOffer.itemId];return {id,item,storageId:resourceOffer.itemId,name:item.name,image:item.image,description:item.description,currencyKey:'spiritStone',currencyName:'靈石',currencyImage:'assets/qstyle-v2/spirit-stone.png',price:resourceOffer.price,dailyLimit:5,permanentLimit:null,quantityEnabled:true}}
  if(id==='treasure-brew-base-rare'){const item=itemCatalog['brew-base-rare'];return {id,item,storageId:'brew-base-rare',name:item.name,image:item.image,description:item.description,currencyKey:'spiritJade',currencyName:'靈玉',currencyImage:'assets/qstyle-v2/spirit-jade.png',price:18,dailyLimit:5,permanentLimit:null,quantityEnabled:true}}
  if(id==='market-sword-embryo-reversion'||id==='treasure-sword-embryo-reversion'){const item=itemCatalog.swordEmbryoReversionElixir,jade=id.startsWith('treasure-');return {id,item,storageId:'swordEmbryoReversionElixir',weeklyKey:'swordEmbryoReversionElixir',name:item.name,image:item.image,description:item.description,currencyKey:jade?'spiritJade':'spiritStone',currencyName:jade?'靈玉':'靈石',currencyImage:`assets/qstyle-v2/${jade?'spirit-jade':'spirit-stone'}.png`,price:jade?50:30000,dailyLimit:null,weeklyLimit:1,permanentLimit:null,quantityEnabled:false}}
  if(id==='market-xisui-famao-pill'){const item=itemCatalog.xisuiFamaoPill;return {id,item,storageId:'xisuiFamaoPill',weeklyKey:'market-xisui-famao-pill',name:item.name,image:item.image,description:item.description,currencyKey:'spiritStone',currencyName:'靈石',currencyImage:'assets/qstyle-v2/spirit-stone.png',price:30000,dailyLimit:null,weeklyLimit:1,permanentLimit:null,quantityEnabled:false}}
  const item=itemCatalog[id];if(!item)return null;
  if(id==='divineRoamingManual')return {id,item,name:item.name,image:item.image,description:item.description,currencyKey:'spiritJade',currencyName:'靈玉',currencyImage:'assets/qstyle-v2/spirit-jade.png',price:divineRoamingJadeCost,dailyLimit:null,permanentLimit:1,quantityEnabled:false};
  if(id==='mindEmbodimentManual')return {id,item,name:item.name,image:item.image,description:item.description,currencyKey:'spiritJade',currencyName:'靈玉',currencyImage:'assets/qstyle-v2/spirit-jade.png',price:mindEmbodimentJadeCost,dailyLimit:null,permanentLimit:1,quantityEnabled:false};
  if(id==='xisuiFamaoPill')return {id,item,name:item.name,image:item.image,description:item.description,currencyKey:'spiritJade',currencyName:'靈玉',currencyImage:'assets/qstyle-v2/spirit-jade.png',price:50,dailyLimit:null,weeklyLimit:1,permanentLimit:null,quantityEnabled:false};
  if(id==='renameProtagonistJade')return {id,item,name:item.name,image:item.image,description:item.description,currencyKey:'spiritJade',currencyName:'靈玉',currencyImage:'assets/qstyle-v2/spirit-jade.png',price:50,dailyLimit:null,permanentLimit:null,quantityEnabled:false};
  if(id==='genderRebirthMirror')return {id,item,name:item.name,image:item.image,description:item.description,currencyKey:'spiritJade',currencyName:'靈玉',currencyImage:'assets/qstyle-v2/spirit-jade.png',price:150,dailyLimit:null,permanentLimit:null,quantityEnabled:false};
  if(id==='renamePartnerCovenant')return {id,item,name:item.name,image:item.image,description:item.description,currencyKey:'spiritJade',currencyName:'靈玉',currencyImage:'assets/qstyle-v2/spirit-jade.png',price:50,dailyLimit:null,permanentLimit:null,quantityEnabled:false};
  if(id==='brew-base-normal')return {id,item,name:item.name,image:item.image,description:item.description,currencyKey:'spiritStone',currencyName:'靈石',currencyImage:'assets/qstyle-v2/spirit-stone.png',price:2500,dailyLimit:3,permanentLimit:null,quantityEnabled:true};
  if(id==='brew-base-rare')return {id,item,name:item.name,image:item.image,description:item.description,currencyKey:'spiritStone',currencyName:'靈石',currencyImage:'assets/qstyle-v2/spirit-stone.png',price:9000,dailyLimit:3,permanentLimit:null,quantityEnabled:true};
  if(item.sectInvitation){const star=item.sectInvitation.star;return {id,item,name:item.name,image:item.image,description:item.description,currencyKey:'prestige',currencyName:'聲望',currencyImage:'assets/qstyle-v2/reputation.png',price:sectInvitationPrices[star-1],dailyLimit:1,permanentLimit:null,quantityEnabled:false}}
  if(item.resourceBundle){const bundle=item.resourceBundle,price=reputationResourcePrices[bundle.amount]?.[bundle.resource];if(!price)return null;return {id,item,name:item.name,image:item.image,description:item.description,currencyKey:'prestige',currencyName:'聲望',currencyImage:'assets/qstyle-v2/reputation.png',price,dailyLimit:3,permanentLimit:null,quantityEnabled:true}}
  return null;
}
function marketPermanentBought(offer){
  let count=Number(state.marketPermanentPurchases?.[offer.id]||0);
  if(offer.id==='divineRoamingManual'&&((state.divineRoamingManualCount||0)>0||state.divineRoamingUnlocked))count=Math.max(1,count);
  if(offer.id==='mindEmbodimentManual'&&((state.mindEmbodimentManualCount||0)>0||state.mindEmbodimentUnlocked))count=Math.max(1,count);
  if(offer.item?.techniqueBook){
    if((state.learnedBookIds||[]).includes(offer.id)||(state[offer.item.count]||0)>0||(state.scripturePurchases?.ids||[]).includes(offer.id))count=Math.max(1,count);
  }
  return count;
}
function marketDailyBought(offer){return Number(marketDailyState().counts[offer.id]||0)}
function marketWeeklyBought(offer){return Number(marketWeeklyState().counts[offer.weeklyKey||offer.id]||0)}
function marketPurchaseCapacity(offer){
  if(!offer)return 0;
  const affordable=Math.floor((state[offer.currencyKey]||0)/offer.price);
  const dailyRemaining=offer.dailyLimit==null?Infinity:Math.max(0,offer.dailyLimit-marketDailyBought(offer));
  const weeklyRemaining=offer.weeklyLimit==null?Infinity:Math.max(0,offer.weeklyLimit-marketWeeklyBought(offer));
  const permanentRemaining=offer.permanentLimit==null?Infinity:Math.max(0,offer.permanentLimit-marketPermanentBought(offer));
  const storageRemaining=bagStorableAmount(offer.storageId||offer.id);
  return Math.max(0,Math.min(affordable,dailyRemaining,weeklyRemaining,permanentRemaining,storageRemaining,999));
}
function marketPurchaseBlockReason(offer){
  if(!offer)return '商品資料不存在';
  if(offer.id==='divineRoamingManual'&&state.spiritLevel<40)return '需達化念境一層後方可購買';
  if(offer.item?.techniqueBook&&(state.learnedBookIds||[]).includes(offer.id))return '此功法已習得，無法再次購買';
  if(offer.permanentLimit!=null&&marketPermanentBought(offer)>=offer.permanentLimit)return '此商品已達永久限購上限';
  if(offer.dailyLimit!=null&&marketDailyBought(offer)>=offer.dailyLimit)return '此商品今日購買次數已達上限';
  if(offer.weeklyLimit!=null&&marketWeeklyBought(offer)>=offer.weeklyLimit)return '此商品本週購買次數已達上限・每週一 00:00 刷新';
  if((state[offer.currencyKey]||0)<offer.price)return `${offer.currencyName}不足`;
  if(!canStoreItem(offer.storageId||offer.id))return '儲物袋已滿';
  return '';
}
function updateMarketPurchaseModal(){
  const offer=marketPurchaseOffer;if(!offer)return;
  const maximum=marketPurchaseCapacity(offer),reason=marketPurchaseBlockReason(offer);
  marketPurchaseQuantity=Math.max(1,Math.min(marketPurchaseQuantity,Math.max(1,maximum)));
  setQuantityInputValue('marketPurchaseQuantity',marketPurchaseQuantity);
  $('#marketPurchaseQuantityPanel').classList.toggle('hidden',!offer.quantityEnabled);
  $('#marketPurchasePrice').innerHTML=`單價：<img src="${offer.currencyImage}" alt="${offer.currencyName}"> ${formatLargeNumber(offer.price)} ${offer.currencyName}`;
  $('#marketPurchaseBalance').innerHTML=`當前持有：<img src="${offer.currencyImage}" alt="${offer.currencyName}"> <b>${formatLargeNumber(state[offer.currencyKey]||0)}</b> ${offer.currencyName}`;
  const limits=[];
  if(offer.dailyLimit!=null)limits.push(`每日限購：${marketDailyBought(offer).toLocaleString()} / ${offer.dailyLimit.toLocaleString()}`);
  if(offer.weeklyLimit!=null)limits.push(`每週限購：${marketWeeklyBought(offer).toLocaleString()} / ${offer.weeklyLimit.toLocaleString()}（週一00:00刷新）`);
  if(offer.permanentLimit!=null)limits.push(`永久限購：${marketPermanentBought(offer).toLocaleString()} / ${offer.permanentLimit.toLocaleString()}`);
  $('#marketPurchaseLimits').textContent=limits.join('　')||'不限購';
  $('#marketPurchaseTotal').innerHTML=`合計：<img src="${offer.currencyImage}" alt="${offer.currencyName}"> ${formatLargeNumber(offer.price*marketPurchaseQuantity)} ${offer.currencyName}`;
  $('#marketPurchaseReason').textContent=reason;
  $('#marketPurchaseConfirm').disabled=!!reason||maximum<marketPurchaseQuantity;
  ['marketPurchaseMinus','marketPurchaseMin'].forEach(id=>$('#'+id).disabled=marketPurchaseQuantity<=1);
  ['marketPurchasePlus','marketPurchaseMax'].forEach(id=>$('#'+id).disabled=marketPurchaseQuantity>=maximum);
}
function openMarketPurchase(id){
  const offer=marketOfferForItem(id);if(!offer)return;
  marketPurchaseOffer=offer;marketPurchaseQuantity=1;
  $('#marketPurchaseImage').src=offer.image;$('#marketPurchaseImage').alt=offer.name;$('#marketPurchaseName').textContent=offer.name;$('#marketPurchaseDescription').textContent=offer.description;
  updateMarketPurchaseModal();$('#marketPurchaseModal').classList.remove('hidden');
}
function closeMarketPurchase(){$('#marketPurchaseModal').classList.add('hidden');marketPurchaseOffer=null;marketPurchaseQuantity=1}
function confirmMarketPurchase(){
  const offer=marketPurchaseOffer,reason=marketPurchaseBlockReason(offer),maximum=marketPurchaseCapacity(offer);if(!offer)return;if(reason)return toast(reason);
  const quantity=offer.quantityEnabled?Math.min(marketPurchaseQuantity,maximum):1;if(quantity<1)return;
  state[offer.currencyKey]-=offer.price*quantity;state[offer.item.count]=(state[offer.item.count]||0)+quantity;
  if(offer.dailyLimit!=null){const daily=marketDailyState();daily.counts[offer.id]=(daily.counts[offer.id]||0)+quantity}
  if(offer.weeklyLimit!=null){const weekly=marketWeeklyState(),key=offer.weeklyKey||offer.id;weekly.counts[key]=(weekly.counts[key]||0)+quantity}
  if(offer.permanentLimit!=null)state.marketPermanentPurchases[offer.id]=(state.marketPermanentPurchases[offer.id]||0)+quantity;
  if(offer.item.techniqueBook){const legacy=scriptureDailyState();if(!legacy.ids.includes(offer.id))legacy.ids.push(offer.id)}
  if(offer.id==='divineRoamingManual')state.divineRoamingUnlocked=true;
  toast(`購得「${offer.name}」${quantity>1?` × ${quantity}`:''}`);closeMarketPurchase();renderMarket(currentMarketTab);save();
}
function treasureOfferDetail(id){if(id==='divineRoamingManual')return state.spiritLevel>=40?'購得即開通神念遠遊':'需達化念境一層後購買';if(id==='xisuiFamaoPill'||id==='treasure-sword-embryo-reversion')return `本週 ${marketWeeklyBought(marketOfferForItem(id))}／1・週一00:00刷新`;if(id==='renameProtagonistJade')return '不限購・重書主角姓名';if(id==='genderRebirthMirror')return '不限購・轉換主角與命定因緣性別';if(id==='renamePartnerCovenant')return state.partnerSystem?.established?'不限購・重訂道侶姓名':'不限購・結緣後方可使用';if(id==='mindEmbodimentManual')return hasMindEmbodiment()?'已習得・購買後僅可收藏或售出':'使用後提前習得意念入體';if(itemCatalog[id]?.techniqueBook?.exclusiveMarket==='treasure')return `火行・九階・${artKinds[itemCatalog[id].techniqueBook.kind].label}+${artBaseEffect(itemCatalog[id].techniqueBook).toLocaleString()}・永久限購一部`;return '百寶樓珍藏'}
function renderMarket(tab=currentMarketTab){
  currentMarketTab=tab;
  const data={
    market:{title:'坊市',subtitle:'雲市百貨',currency:'stone',floors:[['market-sword-embryo-reversion'],['brew-base-normal'],[],['brew-base-rare'],['market-xisui-famao-pill']]},
    scripture:{title:'藏經閣',subtitle:'古卷玉簡',currency:'stone',floors:[[],[],[],[],[]]},
    reputation:{title:'聲望堂',subtitle:'名望珍藏',currency:'reputation',floors:[[],[],[],[],[]]},
    treasure:{title:'百寶樓',subtitle:'仙珍奇物',currency:'jade',products:['xisuiFamaoPill','treasure-sword-embryo-reversion','renameProtagonistJade','genderRebirthMirror','renamePartnerCovenant','divineRoamingManual','mindEmbodimentManual','treasure-brew-base-rare','treasure-taiyang-lianshen-wujuan','treasure-chixiao-dingming-tianjian']}
  }[tab];
  const hasFloors=tab!=='treasure';
  const floor=hasFloors?(marketFloors[tab]||1):1;
  let products=tab==='scripture'?scriptureStock(floor):tab==='reputation'?reputationStock(floor):(hasFloors?data.floors[floor-1]:data.products);if(tab==='market')products=[...marketResourceItems.filter(entry=>entry.floor===floor).map(entry=>entry.id),...marketCultivationCaskets.filter(entry=>entry.floor===floor).map(entry=>entry.id),...products];if(tab==='treasure')products=products.filter(id=>id==='divineRoamingManual'?!(state.divineRoamingUnlocked&&!(state.divineRoamingManualCount||state.marketPermanentPurchases?.[id])):id==='mindEmbodimentManual'?!(hasMindEmbodiment()&&!(state.mindEmbodimentManualCount||state.marketPermanentPurchases?.[id])):true);
  const treasurePageCount=tab==='treasure'?Math.max(1,Math.ceil(products.length/9)):1;
  if(tab==='treasure'){marketTreasurePage=Math.max(1,Math.min(treasurePageCount,marketTreasurePage));products=products.slice((marketTreasurePage-1)*9,marketTreasurePage*9)}
  const floorTitle=hasFloors?`${data.title}‧${chineseFloorNames[floor-1]}樓`:treasurePageCount>1?`${data.title}‧珍藏 ${marketTreasurePage}/${treasurePageCount}`:data.title;
  const floorControls=hasFloors?`<div class="market-floor-controls">
    ${floor>1?`<button class="market-floor-button market-floor-down" type="button" data-market-floor="down" aria-label="下樓"><img src="assets/qstyle-v2/market-floor-up.png" alt=""><span>下樓</span></button>`:''}
    ${floor<5?`<button class="market-floor-button market-floor-up" type="button" data-market-floor="up" aria-label="上樓"><img src="assets/qstyle-v2/market-floor-up.png" alt=""><span>上樓</span></button>`:''}
  </div>`:treasurePageCount>1?`<div class="market-floor-controls">
    ${marketTreasurePage>1?`<button class="market-floor-button market-floor-down" type="button" data-market-treasure-page="prev" aria-label="上一頁"><img src="assets/qstyle-v2/market-floor-up.png" alt=""><span>上頁</span></button>`:''}
    ${marketTreasurePage<treasurePageCount?`<button class="market-floor-button market-floor-up" type="button" data-market-treasure-page="next" aria-label="下一頁"><img src="assets/qstyle-v2/market-floor-up.png" alt=""><span>下頁</span></button>`:''}
  </div>`:'';
  $$('.market-tabs button').forEach(button=>button.classList.toggle('active',button.dataset.marketTab===tab));
  const currency={stone:['assets/qstyle-v2/spirit-stone.png','靈石'],jade:['assets/qstyle-v2/spirit-jade.png','靈玉'],reputation:['assets/qstyle-v2/reputation.png','聲望']}[data.currency];
  const productHtml=tab==='scripture'?products.map(book=>{const item=itemCatalog[book.id],price=scriptureTierPrices[book.tier-1],offer=marketOfferForBook(book.id),learned=(state.learnedBookIds||[]).includes(book.id),limited=marketPermanentBought(offer)>=1,tier=['一','二','三','四','五','六','七','八','九'][book.tier-1],interaction=limited?' aria-disabled="true" tabindex="-1"':` data-market-purchase="${book.id}"`;return `<button class="market-product${limited?' sold-out':''}" type="button"${interaction}><span class="market-product-image"><img src="${item.image}" alt="${book.name}"></span><b>${book.name}</b><em><img src="${currency[0]}" alt="${currency[1]}">${formatLargeNumber(price)}</em><small>${limited?'已購買':learned?'已習得':`${book.elementName}行・${tier}階・${artKinds[book.kind].label}+${artBaseEffect(book)}`}</small></button>`}).join(''):tab==='reputation'?products.map(id=>{const item=itemCatalog[id],offer=marketOfferForItem(id),bought=marketDailyBought(offer),limited=bought>=offer.dailyLimit,interaction=limited?' aria-disabled="true" tabindex="-1"':` data-market-purchase="${id}"`,detail=item.sectInvitation?`${['一','二','三','四','五','六','七','八','九'][item.sectInvitation.star-1]}星門派`:`今日 ${bought} / ${offer.dailyLimit}`;return `<button class="market-product${limited?' sold-out daily-limit':''}" type="button"${interaction}><span class="market-product-image"><img src="${item.image}" alt="${item.name}"></span><b>${item.name}</b><em><img src="${currency[0]}" alt="${currency[1]}">${formatLargeNumber(offer.price)}</em><small>${limited?'今日已購足':detail}</small></button>`}).join(''):products.map(id=>{const offer=marketOfferForItem(id),daily=offer.dailyLimit!=null&&marketDailyBought(offer)>=offer.dailyLimit,weekly=offer.weeklyLimit!=null&&marketWeeklyBought(offer)>=offer.weeklyLimit,permanent=offer.permanentLimit!=null&&marketPermanentBought(offer)>=offer.permanentLimit,limited=daily||weekly||permanent,interaction=limited?' aria-disabled="true" tabindex="-1"':` data-market-purchase="${id}"`;return `<button class="market-product${limited?' sold-out':''}${daily||weekly?' daily-limit':''}" type="button"${interaction}><span class="market-product-image"><img src="${offer.image}" alt="${offer.name}"></span><b>${offer.name}</b><em><img src="${currency[0]}" alt="${currency[1]}">${formatLargeNumber(offer.price)}</em><small>${daily?'今日已購足':weekly?'本週已購足・週一刷新':permanent?'已購買・永久限購':offer.dailyLimit!=null?`今日 ${marketDailyBought(offer)}／${offer.dailyLimit}`:treasureOfferDetail(id)}</small></button>`}).join('');
  $('#marketContent').innerHTML=`<div class="market-shop-banner"><small>${data.subtitle}</small><b>${floorTitle}</b></div>${floorControls}<div id="marketFloorNotice" class="market-floor-notice" role="status"></div><div class="market-product-grid">${productHtml}</div><p class="market-restock">${tab==='scripture'||tab==='reputation'?'每日 00:00 自動刷新':tab==='treasure'?'週限購商品每週一 00:00 刷新；其餘商品依各自限購規則':'坊市日限購商品每日 00:00 重置；週限購商品每週一 00:00 重置'}</p>`;
  $$('[data-market-floor]').forEach(button=>button.onclick=()=>changeMarketFloor(button.dataset.marketFloor==='up'?1:-1));
  $$('[data-market-treasure-page]').forEach(button=>button.onclick=()=>{marketTreasurePage+=button.dataset.marketTreasurePage==='next'?1:-1;renderMarket('treasure')});
  $$('[data-market-purchase]').forEach(button=>button.onclick=()=>openMarketPurchase(button.dataset.marketPurchase));
  render();
}
function showMarketFloorNotice(text){
  const notice=$('#marketFloorNotice');
  if(!notice)return;
  clearTimeout(marketFloorNoticeTimer);
  notice.textContent=text;
  notice.classList.add('show');
  marketFloorNoticeTimer=setTimeout(()=>notice.classList.remove('show'),2200);
}
function changeMarketFloor(direction){
  if(currentMarketTab==='treasure')return;
  const current=marketFloors[currentMarketTab]||1;
  const next=Math.max(1,Math.min(5,current+direction));
  if(next===current)return;
  if(next>current){
    const requiredLevel=marketFloorLevels[next-1]??0;
    if(worldProgressLevel()<requiredLevel){
      showMarketFloorNotice(`需${worldProgressGateText(requiredLevel)}才可上樓`);
      return;
    }
  }
  marketFloors[currentMarketTab]=next;
  renderMarket(currentMarketTab);
}
function resetMarketNavigation(){currentMarketTab='market';marketTreasurePage=1;Object.keys(marketFloors).forEach(tab=>marketFloors[tab]=1)}
function switchMarketTab(tab){if(tab==='treasure')marketTreasurePage=1;if(Object.prototype.hasOwnProperty.call(marketFloors,tab))marketFloors[tab]=1;renderMarket(tab)}
function openMarket(){
  $('#gameMenu').classList.add('hidden');
  resetMarketNavigation();
  lastScriptureDayKey=dateKey()||'local';
  renderMarket('market');
  $('#marketModal').classList.remove('hidden');
}
function closeMarket(){
  closeMarketPurchase();
  $('#marketModal').classList.add('hidden');
  resetMarketNavigation();
}

const spiritRootCurveMigrationNeeded=(()=>{try{const stored=JSON.parse(localStorage.getItem(saveKey));return !!stored&&(stored.spiritRootCurveVersion||0)<2}catch{return false}})();
const pillEffectMigrationNeeded=(()=>{try{const stored=JSON.parse(localStorage.getItem(saveKey));return !!stored&&(stored.pillEffectVersion||0)<2}catch{return false}})();
load();normalizeSpiritRootCurve(spiritRootCurveMigrationNeeded);const pillEffectMigrated=normalizePillEffectValues(pillEffectMigrationNeeded);normalizeSectRecords();delete state.mainlineEnemySnapshots;delete state.sectNpcSnapshot;normalizeDivineRoamingTiming();if(state.divineRoamingManualCount>0)state.divineRoamingUnlocked=true;normalizeMainlineMaterialItems();normalizeCraftingMaterialItems();const productionMaterialMigrated=normalizeProductionMaterialStorage();registerEquipmentItems();normalizeEquipmentLoadout();normalizeIndependentPaths();normalizeFirstPath();normalizeSwordPath();normalizeBodyPath();normalizeEncounterSystem();normalizeFirstPath();const sectTaskMigrated=normalizeSectTaskSystem();if(spiritRootCurveMigrationNeeded||pillEffectMigrated||partnerStoryMigrated||productionMaterialMigrated||sectTaskMigrated)save();
normalizeQiPath();
try{const existing=JSON.parse(localStorage.getItem(saveKey));if(state.name&&(!existing||!Object.prototype.hasOwnProperty.call(existing,'cultivationAwakened')))state.cultivationAwakened=true}catch{}
setClockAnchor(state.lastTrustedTime||Math.min(state.lastSave||Date.now(),Date.now()),location.protocol==='file:');
const accountTransferNotice=sessionStorage.getItem(accountRecoveryConfig.transferNoticeKey);if(accountTransferNotice)sessionStorage.removeItem(accountRecoveryConfig.transferNoticeKey);$('#titleHint').textContent=accountTransferNotice?'帳號已轉移至其他裝置・本機資料已清除':state.name?'點擊螢幕繼續修煉':'點擊螢幕進入遊戲';
$('#titleScreen').onclick=enterFromTitle;
$('#titleScreen').onkeydown=e=>{if(e.target===$('#titleScreen')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();enterFromTitle()}};
$('#prologueScreen').onclick=finishCreationPrologue;
$('#prologueScreen').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();finishCreationPrologue()}};
$('#backTitleBtn').onclick=()=>{startBgm('title');show('#titleScreen')};
$$('.gender').forEach(b=>b.onclick=()=>{$$('.gender').forEach(x=>x.classList.remove('active'));b.classList.add('active');createGender=b.dataset.gender;updateCreator()});
$$('[data-creator-tab]').forEach(button=>button.onclick=()=>setCreatorTab(button.dataset.creatorTab));
$$('.appearance-choice').forEach(b=>b.onclick=()=>{$$('.appearance-choice').forEach(x=>x.classList.remove('active'));b.classList.add('active');createAppearance=+b.dataset.appearance;updateCreator()});
$$('.outfit-choice').forEach(b=>b.onclick=()=>{$$('.outfit-choice').forEach(x=>x.classList.remove('active'));b.classList.add('active');createOutfit=+b.dataset.style;updateCreator()});
function updateOriginPreview(){$('#originStats').textContent=originDescriptions[createOrigin]}
$$('.origin-choice').forEach(b=>b.onclick=()=>{$$('.origin-choice').forEach(x=>x.classList.remove('active'));b.classList.add('active');createOrigin=b.dataset.origin;updateOriginPreview()});
$('#randomNameBtn').onclick=randomCreatorName;
$('#createBtn').onclick=()=>{const n=$('#nameInput').value.trim();if(!n){$('#nameError').textContent='請輸入暱稱';return}const now=gameNow();state={...defaults,...originProfiles[createOrigin],name:n,gender:createGender,appearance:createAppearance,hair:1,outfit:createOutfit,origin:createOrigin,bornAt:now,lastSave:now,sectTechniqueMailVersion:2,firstPath:'',activePath:'',spiritPathOpened:false,tutorialCompleted:false,swordPathOpened:false,bodyPathOpened:false};state.mailbox=[createWelcomeMail(now)];startGame();save()};

const ascensionRouteMeta={qi:{name:'練氣天路',reward:[400,400,800]},sword:{name:'淬劍天路',reward:[600,600,1200]},body:{name:'煉體天路',reward:[1000,1000,2000]}};
const ascensionAttributes=[['trueQi','元息'],['rootBone','命骨'],['physique','玄軀'],['agility','游影']];
const heartQuestions=[
  {question:'你為何求長生？',options:['我不想死','我想看看這條路究竟能走多遠','我要力量，強到再也沒有人能替我決定','我還不知道']},
  {question:'若求道必須付出代價，你願意失去什麼？',options:['我願意失去安穩','若真有必要，我願意失去力量','只要不是別人的命，我可以付出自己的代價','我不知道自己能失去多少']},
  {question:'若有一天，你發現自己走錯了呢？',options:['回頭','我會先走到最後，再判斷它究竟是不是錯','既然是我選的，我就承擔到底','我不知道。也許到了那時，我已經不是現在的我']}
];
const delusionAttacks=[
  ['你不是怕死。你只是怕自己與凡人一樣，最後什麼都留不住。','你把一路上的苦難，都當成滿足好奇的故事。','你要的不是自由，是爬到最高處後輪到你替別人決定。','你不是誠實，只是不敢承認真正想要什麼。'],
  ['你從未真正得到安穩，才捨得如此輕易。','你從未被真正要求捨棄力量，才說得如此輕巧。','等你站到萬人之上，還會覺得自己的命與凡人一樣重嗎？','你一直用「不知道」逃避。'],
  ['真到那一天，你捨得承認自己一生都走錯了嗎？','只要永遠不走到最後，你就永遠不用承認錯。','你與把九鎖守到永遠的人，有什麼不同？','等你活得更久更強，今日的你早就死了。']
];
function normalizeAscension(){const base=defaults.ascension,current=state.ascension&&typeof state.ascension==='object'?state.ascension:{};Object.assign(current,{...base,...current,heartAnswers:Array.isArray(current.heartAnswers)?current.heartAnswers.slice(0,3):[],delusionReplies:Array.isArray(current.delusionReplies)?current.delusionReplies.slice(0,3):[]});state.ascension=current;const a=current;if(['qi','sword','body'].includes(a.route))a.prologueCompleted=true;if(a.heartTrialCompleted&&a.pendingReward?.stage!=='heart')a.heartRewardAllocated=true;if(a.delusionTrialCompleted&&a.pendingReward?.stage!=='delusion')a.delusionRewardAllocated=true;if(a.heartRewardAllocated)a.heartTrialCompleted=true;if(a.delusionRewardAllocated){a.heartTrialCompleted=true;a.heartRewardAllocated=true;a.delusionTrialCompleted=true}if(a.roadEndRewardAllocated||a.ascended){a.heartTrialCompleted=true;a.heartRewardAllocated=true;a.delusionTrialCompleted=true;a.delusionRewardAllocated=true;a.roadEndCompleted=true;a.roadEndRewardAllocated=true;if(!a.ascendedAt)a.ascendedAt=Date.now()}return a}
function ascensionEligible(){return (state.mainlineCleared||0)>=18&&Math.max(state.spiritLevel||0,state.swordLevel||0,state.bodyLevel||0)>=80}
function ensureAscensionModal(){let modal=$('#ascensionModal');if(modal)return modal;modal=document.createElement('div');modal.id='ascensionModal';modal.className='ascension-modal';modal.innerHTML='<section class="ascension-window"><button class="ascension-close" type="button" aria-label="離開天路">×</button><div id="ascensionContent"></div></section>';document.body.append(modal);modal.querySelector('.ascension-close').onclick=()=>{const content=$('#ascensionContent'),locked=!!content?.querySelector('.ascension-allocation,.ascension-dialogue-stage');if(locked)return toast('此飛升關卡進行中，無法退出');modal.classList.remove('show');resumeWorldBgm()};return modal}
function ascensionDialogueStage({chapter,title,background,portrait,speaker,text,body='',className=''}){const portraitHtml=portrait?`<img class="ascension-dialogue-portrait" src="${portrait}" alt="${speaker} Q版半身立繪">`:'',speakerHtml=speaker?`<strong>${speaker}</strong>`:'';return `<section class="ascension-dialogue-stage ${className}${portrait?'':' narration-only'}" style="--ascension-bg:url('${background}')"><div class="ascension-chapter-card"><small>${chapter}</small><b>${title}</b></div>${portraitHtml}<div class="ascension-dialogue-box">${speakerHtml}<p>${text}</p>${body}</div></section>`}
const ascensionArt={player:()=>mainlineProtagonistPortrait(),lord:()=>mainlinePortraits.lord,spirit:()=> 'assets/qstyle-v2/ascension/portrait-heart-spirit-v2.png',demon:()=>`assets/qstyle-v2/ascension/${state.gender==='女'?'portrait-heart-demon-female-v1.png':'portrait-heart-demon-male-v2.png'}`,master:()=> 'assets/qstyle-v2/ascension/portrait-tianlu-master-v2.png'};
function ascensionLine(speaker,text,portrait='player',extra={}){const narration=speaker==='旁白',disembodied=['旁白','系統','神秘之聲','天音'].includes(speaker);return {speaker:narration?'':speaker==='808'?(state.name||'修士'):speaker,text,portrait:disembodied?'none':portrait,...extra}}
function ascensionRouteChoiceLocked(label){return label==='以練氣闖天路'?(state.spiritLevel||0)<80:label==='以淬劍闖天路'?(state.swordLevel||0)<80:label==='以煉體闖天路'?(state.bodyLevel||0)<80:false}
function commitAscensionRouteChoice(label){const route={'以練氣闖天路':'qi','以淬劍闖天路':'sword','以煉體闖天路':'body'}[label];if(!route)return;const a=normalizeAscension();a.route=route;a.prologueCompleted=true;save()}
function playAscensionStory({theme,chapter,title,background,className='',lines,onDone}){startBgm(theme);const c=$('#ascensionContent');let step=0;const draw=()=>{const line=lines[step];if(!line){onDone?.();return}if(step===lines.length-1&&line.speaker==='系統'&&line.text.startsWith('進入戰鬥')){onDone?.();return}const choices=line.choices||[],body=choices.length?`<div class="ascension-story-choices">${choices.map((choice,index)=>`<button data-story-choice="${index}" ${ascensionRouteChoiceLocked(choice.label)?'disabled':''}>${choice.label}</button>`).join('')}</div>`:'<button class="ascension-story-next" data-story-next>繼續</button>';const portrait=line.portrait==='none'?'':(ascensionArt[line.portrait]||ascensionArt.player)();c.innerHTML=ascensionDialogueStage({chapter,title,background,portrait,speaker:line.speaker,text:line.text,body,className});if(choices.length)c.querySelectorAll('[data-story-choice]').forEach(button=>button.onclick=()=>{if(button.disabled)return;const choice=choices[+button.dataset.storyChoice];choice.onSelect?.();commitAscensionRouteChoice(choice.label);save();if(choice.followup?.length)lines.splice(step+1,0,...choice.followup);step++;draw()});else c.querySelector('[data-story-next]').onclick=()=>{step++;draw()}};draw()}
const heartResponses=[
  ['畏死不是錯。怕死可以讓人求生，也可能讓人為了活，把所有東西都丟掉。','因未知而前行。但好奇也有代價；有些門一旦推開，就再也關不上。','力量能增加你的選擇，也會讓別人的選擇在你眼裡變輕。別成為你曾反對的守界司。','不知道不可恥，總好過替自己編造一個理由。天路很長，你仍有時間去想。'],
  ['沒真正擁有過的東西，最容易說捨。等你真正有可停留之處，再看是否還捨得。','修士求道千年，卻說願意捨道。越強的人，越容易相信自己不能失去力量。','你可以付自己的命、傷與修為，卻不能替別人決定該付什麼。很多人最初也只願犧牲自己，直到覺得自己比別人更重要。','知道自己可能軟弱不可恥。最危險的是還沒失去過，就相信自己什麼都捨得。'],
  ['走錯一千年，也不能因捨不得那一千年，就再錯一萬年。希望真到那時，你的行動和嘴上一樣乾脆。','執著能讓人穿過黑夜，也可能讓人在天亮後仍閉眼前行。別忘了判斷。','承擔自己的選擇，不等於拒絕改變。守界司也曾以負責為由，把九鎖守到永遠。','你承認人會變。很多長生者最大的錯，是活了萬年仍相信自己永遠是當年的那個人。']
];
const heartRouteRemarks={
  qi:['你以天地之息養一身長生，最怕的往往不是氣盡，而是不知為何還要繼續吐納。','練氣者借天地成己身。借得越多，越要記得，有些東西從來不屬於你。','氣可散而復聚，道心若因一次錯路便潰散，縱有無盡元息也托不起你的長生。'],
  sword:['劍修可以日日磨劍，卻未必日日都知道自己為何拔劍。','劍最擅長的是捨。可真正難的，是知道什麼能斬，什麼不能斬。','劍路走偏尚可收劍轉身；若把不肯回頭當成劍心堅定，斬斷的只會是自己的後路。'],
  body:['肉身可以承受千錘百煉，可若不知道為何受苦，再強的筋骨也只是更耐打的軀殼。','煉體者最習慣承受代價。可不是所有傷都該由你硬扛，也不是所有苦都值得受。','筋骨能在傷後重塑，選擇亦然。承認走錯並非軟弱，拖著錯路走到底才不是鎮陸之身。']
};
const delusionRouteAttacks={
  qi:['你口口聲聲求自己的道，卻連每一次吐納都仰賴天地；你所謂的選擇，真有一分不曾向天地借來？','你說願意承擔代價，可練氣者最先計算的總是靈氣、修為與壽元。當代價落在道基上，你還會如此從容？','元息最善循環，你也最善把猶疑繞成道理。若發現走錯，你是改道，還是再吐納千年假裝尚未抵達答案？'],
  sword:['你把求道說成選擇，最後仍會把所有不合心意的答案斬成沉默；這就是你拔劍的理由？','劍修談捨最容易，因為你總相信下一劍能奪回更多。若代價是本命劍碎，你還敢說同一句話？','劍一旦出鞘便想斬到底。你說會承擔，可那究竟是劍心，還是你根本沒有收劍認錯的勇氣？'],
  body:['你把活下去說成意志，卻早已習慣用傷痕證明自己。若不再疼痛，你還知道為何求長生嗎？','煉體者總說代價由自己承受，久而久之便把受苦當成正確。你真在選擇，還是只會硬撐？','你能拖著傷體走很遠，所以也最難承認方向錯了。走得到底，從來不代表那條路值得走。']
};
function delusionQuestionAttack(route,questionIndex,answerIndex){const answer=heartQuestions[questionIndex]?.options[answerIndex]??'我沒有留下答案',answerAttack=delusionAttacks[questionIndex]?.[answerIndex]??'連自己的回答都記不清，還談什麼問心？',routeAttack=delusionRouteAttacks[route]?.[questionIndex]??'';return `你在問心陣親口回答：「${answer}」。${answerAttack}${routeAttack?` ${routeAttack}`:''}`}
function renderAscensionEntrances(){const a=normalizeAscension(),eligible=ascensionEligible(),realmButton=$('#realmSwitchButton'),realmImage=realmButton?.querySelector('img');$('#ascensionButton').classList.toggle('hidden',!eligible);realmButton.classList.toggle('hidden',!a.ascended);const immortal=a.currentRealm==='immortal'&&a.ascended,$scene=$('.scene-bg');$('#gameScreen').classList.toggle('immortal-realm',immortal);$$('.path-action-group').forEach(group=>group.classList.toggle('realm-hidden',immortal));if(immortal){$scene.src='assets/qstyle-v2/ascension/immortal-realm-barren-v1.png';$scene.alt='靈氣枯竭的荒蕪仙界';realmImage.src='assets/qstyle-v2/ascension/entry-mortal-v1.png';realmImage.alt='凡間';realmButton.setAttribute('aria-label','返回凡間');$('#headerSpiritRealm').title='仙界沒有靈氣；凡間修練與產能照常運作'}else{const path=state.activePath||state.firstPath||a.lastMortalTrainingGround||'spirit';a.lastMortalTrainingGround=path;$scene.src=cultivationScene(path);$scene.alt=`${cultivationPathMeta[path]?.name||'練氣'}修練道場`;realmImage.src='assets/qstyle-v2/ascension/entry-immortal-v1.png';realmImage.alt='仙界';realmButton.setAttribute('aria-label','前往仙界')}}
let realmSwitching=false;
let realmSwipeStart=null;
function realmTransitionScene(path,label){return `<section class="realm-transition-scene" style="background-image:url('${path}')" aria-label="${label}"></section>`}
function switchWorldRealm(){
  const a=normalizeAscension();if(!a.ascended||realmSwitching)return;
  const entering=a.currentRealm!=='immortal',path=state.activePath||state.firstPath||a.lastMortalTrainingGround||'spirit',mortalScene=cultivationScene(path),immortalScene=cultivationSceneMedia.matches?'assets/qstyle-v2/ascension/immortal-realm-barren-mobile-v1.png':'assets/qstyle-v2/ascension/immortal-realm-barren-v1.png',transition=document.createElement('div');
  realmSwitching=true;transition.className=`realm-transition realm-transition-${entering?'down':'up'}`;transition.innerHTML=realmTransitionScene(immortalScene,'仙界')+realmTransitionScene(mortalScene,'凡間');document.body.append(transition);
  window.setTimeout(()=>{a.currentRealm=entering?'immortal':'mortal';if(entering){a.lastMortalTrainingGround=state.activePath||state.firstPath||a.lastMortalTrainingGround||'spirit';currentFeature=null;$('#featurePanel').classList.add('hidden');$('#gameScreen').classList.remove('feature-open');$$('.feature-tab').forEach(tab=>tab.classList.remove('active'))}save();render();resumeWorldBgm()},500);
  window.setTimeout(()=>{transition.remove();realmSwitching=false;toast(entering?'你踏入仙界。四野死寂，此地沒有一絲靈氣。':'你自荒蕪仙界降回凡間；凡間一切產能照常運轉。')},1050);
}
function realmSwipeAllowed(target){
  const a=normalizeAscension(),screen=$('#gameScreen');
  return !!a.ascended&&!realmSwitching&&!screen.classList.contains('hidden')&&!screen.classList.contains('feature-open')&&!screen.classList.contains('tribulation-locked')&&!target.closest('.topbar,.efficiency,.path-actions,.bottom-nav,.realm-switch-button,.ascension-entry-button,.mainline-entry-button,.market-button,.mail-button,.encounter-button,.artifact-tomb-button,.modal,.ascension-modal,.leaderboard-modal,.game-menu');
}
function bindRealmSwipe(){
  const screen=$('#gameScreen');if(!screen)return;
  screen.addEventListener('touchstart',event=>{const touch=event.touches[0];realmSwipeStart=event.touches.length===1&&touch&&realmSwipeAllowed(event.target)?{x:touch.clientX,y:touch.clientY,time:performance.now()}:null},{passive:true});
  screen.addEventListener('touchend',event=>{const start=realmSwipeStart,touch=event.changedTouches[0];realmSwipeStart=null;if(!start||!touch||!realmSwipeAllowed(event.target)||performance.now()-start.time>1000)return;const dx=touch.clientX-start.x,dy=touch.clientY-start.y;if(Math.abs(dy)<70||Math.abs(dy)<Math.abs(dx)*1.35)return;const immortal=normalizeAscension().currentRealm==='immortal';if(immortal&&dy>0||!immortal&&dy<0){event.preventDefault();switchWorldRealm()}},{passive:false});
  screen.addEventListener('touchcancel',()=>{realmSwipeStart=null},{passive:true});
}
function openAscensionRoad(){if(!ascensionEligible())return toast('需通關九鎖封天第18關，並讓任一道路達到第九境一層');const modal=ensureAscensionModal();modal.classList.add('show');renderAscensionRoad()}
function renderAscensionRoad(){const a=normalizeAscension(),content=$('#ascensionContent');if(a.pendingReward){renderAscensionAllocation(a.pendingReward);return}const stages=[['序章｜天路將起',a.prologueCompleted,()=>openAscensionPrologue()],['問心陣',a.heartTrialCompleted,()=>openHeartTrial()],['照妄陣',a.delusionTrialCompleted,()=>openDelusionTrial()],['天路盡頭',a.roadEndCompleted,()=>openRoadEnd()]],unlocked=[true,a.prologueCompleted,a.heartTrialCompleted&&a.heartRewardAllocated,a.delusionTrialCompleted&&a.delusionRewardAllocated];content.innerHTML=`<header class="ascension-heading"><small>飛升・闖天路${a.ascended?'・測試重溫':''}</small><h2>${a.route==='none'?'凡間的路，尚未走完':ascensionRouteMeta[a.route].name}</h2><p>${a.ascended?'已開放無限重複挑戰；重溫不會再次取得屬性、稱號或飛升順位。':'九鎖已解，門仍未開。問心、照妄，而後以此身承擔自己的選擇。'}</p></header><div class="ascension-stage-grid">${stages.map((s,i)=>`<button data-asc-stage="${i}" ${!unlocked[i]||s[1]&&!a.ascended?'disabled':''}><i>${s[1]?'✓':i+1}</i><b>${s[0]}</b><small>${s[1]?(a.ascended?'已通關・可重複挑戰':'已通關・不可重入'):unlocked[i]?'可進入':'尚未解鎖'}</small></button>`).join('')}</div>`;content.querySelectorAll('[data-asc-stage]').forEach(button=>button.onclick=stages[+button.dataset.ascStage][2])}
function openAscensionPrologue(){const a=normalizeAscension(),player=state.name||'修士',commonEnd=[ascensionLine('神秘之聲','你在九鎖之中，看過凡人的恐懼，看過守界司的執念，也替後來的人留下了選擇。現在——該問問你自己了。','master'),ascensionLine(player,'我要回答什麼？'),ascensionLine('神秘之聲','不是回答我。回答你自己。','master'),ascensionLine('系統',`飛升・序章「天路將起」完成。闖天路道路已鎖定。下一關：問心陣。`,'master')];const branch=(route)=>{const data={qi:['以天地為爐，以元息為引。你選擇以氣問天。','我一路吐納天地之息，才走到今日。既然天路要一個答案——那我就用這一身修為回答。','從此刻起，你的天路只認練氣。'],sword:['以劍證心，以意成域。你選擇以劍問天。','劍可以斷敵，也可以斷自己。我知道每一次出劍都要付出代價。這最後一段路，也由我的劍來走。','從此刻起，你的天路只認淬劍。'],body:['以血肉承劫，以筋骨鎮陸。你選擇以身問天。','我吃過的苦已經夠多了。有些路不需要走得輕鬆，只需要走得到最後。','從此刻起，你的天路只認煉體。']}[route];return [ascensionLine('神秘之聲',data[0],'master'),ascensionLine(player,data[1]),ascensionLine('神秘之聲',`可。${data[2]}此路既定，不得改換。`,'master'),...commonEnd]};const lines=[ascensionLine('旁白','九道鎖鏈在天穹之上接連斷裂。靈流不再向天際匯聚，而是一道一道墜回山川、河谷與地脈。乾涸已久的靈脈重新亮起微光，巨大門影緩緩顯現。','lord'),ascensionLine('守界司之主','……九鎖，真的解了。','lord'),ascensionLine(player,'我沒有毀掉它們。九條靈流都已送回原脈。至少這一次，不會再拿整個凡間去換一扇天門。'),ascensionLine('守界司之主','你一路走到這裡，最後卻沒有選擇把九鎖斬碎。','lord'),ascensionLine(player,'因為你們有一件事沒有說錯。天路若重新開啟，就不能再把凡人的命當成修士求道的代價；但後來的人也不該替千年前的災難永遠受罰。'),ascensionLine('守界司之主','……你替後人留下了選擇。那麼接下來，就輪到你承擔自己的選擇了。','lord'),ascensionLine('旁白','天門深處傳來轟鳴，白光亮起，一條看不見盡頭的石階延伸向雲海深處。','master'),ascensionLine('神秘之聲','解除九鎖之人。止步。','master'),ascensionLine(player,'誰？你為何攔我？'),ascensionLine('神秘之聲','你不必知道。你解開的只是凡人留在天地之間的鎖。九鎖可以阻止人來到這裡，卻不能決定誰有資格走過這扇門。','master'),ascensionLine(player,'所以九鎖封天第十八關走到最後……仍然不算飛升。'),ascensionLine('神秘之聲','自然不算。你只是重新讓「飛升」二字存在於凡間。至於你能不能飛升——與九鎖無關。','master'),ascensionLine(player,'那我要怎麼證明？'),ascensionLine('神秘之聲','走。走到盡頭。若你仍是現在的你，門自會為你而開。','master'),ascensionLine('旁白','雲海、劍光與山嶽般沉重的三道力量，自天路之上浮現。','master'),ascensionLine('神秘之聲','有人一生只走一道，也有人兼修兩道、三道。天路並不在意。但踏上天路之後，你只能帶一條路走到最後。','master'),ascensionLine(player,'為什麼？選了之後，還能改嗎？'),ascensionLine('神秘之聲','此路不是看你會多少，而是看萬法皆可捨時，哪一條才是你自己的道。問心只問此道，照妄只照此道，天路盡頭也只承認今日的選擇。不能改。長生路上可以回頭，天門之前不可兩度證道。','master'),ascensionLine('神秘之聲','請選擇此次闖天路的道路。','master',{choices:[{label:'以練氣闖天路',onSelect:()=>{a.route='qi'},followup:branch('qi')},{label:'以淬劍闖天路',onSelect:()=>{a.route='sword'},followup:branch('sword')},{label:'以煉體闖天路',onSelect:()=>{a.route='body'},followup:branch('body')},{label:'待我思考',followup:[ascensionLine(player,'……我還不想現在決定。'),ascensionLine('神秘之聲','可。九鎖封了天路千年。若你連決定自己要怎麼走，都只能靠一時衝動——那這千年也未免等得太不值得。想清楚再來，門會等你。','master')],onSelect:()=>{a.route='none'}}]})];playAscensionStory({theme:'ascensionPrologue',chapter:'序章・天路將起',title:'九鎖崩解',background:'assets/qstyle-v2/ascension/bg-prologue-tianlu-v1.png',lines,onDone:()=>{if(a.route==='none'){save();renderAscensionRoad();return}a.prologueCompleted=true;save();toast(`已選定${ascensionRouteMeta[a.route].name}・此選擇不可更改`);renderAscensionRoad()}})}
function openHeartTrial(){const a=normalizeAscension(),routeRemarks=heartRouteRemarks[a.route],lines=[ascensionLine('旁白','無盡淺水映出青石荒徑、斷脈古井、赤霞谷、千念鏡宮、照虛天塹，以及九鎖崩解後回流的靈脈。','spirit'),ascensionLine('問心陣靈','我只是一個替天路問話的人。你走了十八關，還在找「答對」的方法？','spirit'),ascensionLine('問心陣靈','此地沒有對錯。你可以自私、仁慈、畏死、貪生，甚至連自己都不知道想要什麼。我只問三次，你只需回答。','spirit')];heartQuestions.forEach((question,i)=>lines.push(ascensionLine('問心陣靈',`${['第一','第二','第三'][i]}問：${question.question}`,'spirit',{choices:question.options.map((label,index)=>({label,onSelect:()=>{a.heartAnswers[i]=index},followup:[ascensionLine('問心陣靈',heartResponses[i][index],'spirit'),ascensionLine('問心陣靈',i===0?'第一問，問你為何出發。':i===1?'第二問，問你願意留下什麼。':'第三問，問你是否仍敢改變。','spirit'),ascensionLine('問心陣靈',routeRemarks[i],'spirit')]}))})));lines.push(ascensionLine('問心陣靈','若天地替你決定什麼念頭才配飛升——那它與你剛剛解除的九鎖，又有何不同？問心從來不是為了挑出好人，也不是替天地挑一個完美的仙。','spirit'),ascensionLine('問心陣靈','我只是要讓你記得：今日的你曾經怎麼回答。人活得越久，越容易替過去的自己改寫理由。你可以變，也可以反悔，但別有一天連自己曾相信過什麼都不敢承認。','spirit'),ascensionLine(state.name||'修士','所以這才叫問心。'),ascensionLine('問心陣靈','不。這只是讓你先聽見自己的聲音。下一關，才會有人告訴你——你方才說的每一句話，究竟有多可笑。','spirit'),ascensionLine('問心陣靈',a.route==='qi'?'去吧。看看你以天地養出的這口氣，究竟是道心，還是執念。':a.route==='sword'?'去吧。下一關要斬的東西，不在劍外。':'去吧。你最擅長承受疼痛——但下一關，痛的未必是肉身。','spirit'));playAscensionStory({theme:'ascensionHeart',chapter:'飛升・第 1 關',title:'問心陣',background:'assets/qstyle-v2/ascension/bg-heart-trial-v1.png',className:'heart',lines,onDone:()=>{a.heartTrialCompleted=true;a.pendingReward={stage:'heart',points:ascensionRouteMeta[a.route].reward[0]};save();renderAscensionAllocation(a.pendingReward)}})}
function renderAscensionAllocation(reward){const a=normalizeAscension(),c=$('#ascensionContent'),points=Math.max(0,reward.points||0);c.innerHTML=`<div class="ascension-allocation"><small>${reward.stage==='heart'?'問心陣':reward.stage==='delusion'?'照妄陣':'天路盡頭'}・通關</small><h2>${reward.stage==='heart'?'答案無分對錯。心有所問，道才有所行。':reward.stage==='delusion'?'妄念不滅，識之即可。':'此路已盡，此道未終。'}</h2><p>${reward.replay?'本次為劇情重溫，不會再次取得獎勵、稱號或飛升順位。':`將 ${points.toLocaleString()} 點自由分配至四項屬性；剩餘必須為 0。`}</p><b id="ascensionRemaining">剩餘 ${points.toLocaleString()}</b><div class="ascension-attribute-grid">${ascensionAttributes.map(([key,label])=>`<label><span>${label}</span><button type="button" data-minus="${key}">－</button><input type="number" inputmode="numeric" min="0" max="${points}" value="0" data-allocate="${key}"><button type="button" data-plus="${key}">＋</button></label>`).join('')}</div><button data-allocation-complete disabled>${reward.stage==='roadEnd'?'踏入仙門':'完成分配'}</button></div>`;const inputs=[...c.querySelectorAll('[data-allocate]')],complete=c.querySelector('[data-allocation-complete]');function refresh(){let used=0;inputs.forEach(input=>{input.value=String(Math.max(0,Math.min(points,Math.floor(Number(input.value)||0))));used+=+input.value});if(used>points){const changed=document.activeElement?.matches?.('[data-allocate]')?document.activeElement:inputs.at(-1);changed.value=String(Math.max(0,+changed.value-(used-points)));used=points}$('#ascensionRemaining').textContent=`剩餘 ${(points-used).toLocaleString()}`;complete.disabled=used!==points}inputs.forEach(input=>input.oninput=refresh);c.querySelectorAll('[data-minus]').forEach(b=>b.onclick=()=>{const i=c.querySelector(`[data-allocate="${b.dataset.minus}"]`);i.value=Math.max(0,+i.value-1);refresh()});c.querySelectorAll('[data-plus]').forEach(b=>b.onclick=()=>{const i=c.querySelector(`[data-allocate="${b.dataset.plus}"]`);i.value=+i.value+1;refresh()});complete.onclick=()=>{if(complete.disabled)return;if(!reward.replay){inputs.forEach(input=>state[input.dataset.allocate]=Math.max(0,(state[input.dataset.allocate]||0)+(+input.value||0)));if(reward.stage==='heart')a.heartRewardAllocated=true;else if(reward.stage==='delusion')a.delusionRewardAllocated=true;else{a.roadEndRewardAllocated=true;a.roadEndCompleted=true;a.ascended=true;a.currentRealm='immortal';a.serverAscensionRank=a.serverAscensionRank||1}}delete a.pendingReward;save();render();reward.stage==='roadEnd'?renderAscensionSuccess(!!reward.replay):renderAscensionRoad()};refresh()}
function openDelusionTrial(){const a=normalizeAscension(),replySets=[['也許你說得有一部分是真的。','你只是在替我的選擇找最惡意的解釋。','就算我的理由不純粹，那也是我的理由。'],['我現在不知道，不代表我永遠不會知道。','真正到了那一天，我會再選一次。','你一直想證明我會變壞，可「可能」不是事實。'],['如果我真的變了，那就讓那時的我再回答。','錯不可怕，不肯承認才可怕。','你想要的不是答案，你只是想讓我懷疑所有答案。']],lines=[ascensionLine('旁白','巨大黑色鏡面豎立於無邊黑暗。鏡中的身影與你動作不同步，隨後獨自走出鏡面。','demon'),ascensionLine('心魔','你終於來了。問心陣讓你說了三句漂亮話。我只是來問問——你自己信不信。','demon')];for(let i=0;i<3;i++){lines.push(ascensionLine('心魔',delusionQuestionAttack(a.route,i,a.heartAnswers[i]),'demon'));lines.push(ascensionLine('心魔','回答我。','demon',{choices:replySets[i].map((label,index)=>({label,onSelect:()=>{a.delusionReplies[i]=index},followup:[ascensionLine('系統',`心魔・${i===0?'動搖':i===1?'再度動搖':'破綻顯現'}`,'demon')]}))}))}const routeDoubt={qi:'你一路借天地之氣成己身。沒有天地靈氣，你還剩下什麼？你為凡間而怒，還是怕自己的長生也受影響？',sword:'你把一切簡化成「斬」。劍修最擅長的，就是讓別人再也沒有機會選。',body:'你把受傷當成榮耀，把痛苦當成證明。那不是堅強，只是你不知道什麼時候該停。'}[a.route];const routeReply={qi:'借天地，不等於天地欠我。就算沒有靈氣，我走過的路也不會消失。',sword:'劍能斬人，也能護人。若我只會斬，我早就走不到這裡。',body:'能承受，不代表我必須承受。痛苦不是道，只是我走過的東西。'}[a.route];lines.push(ascensionLine('心魔',routeDoubt,'demon'),ascensionLine(state.name||'修士',routeReply),ascensionLine('心魔','說夠了。你不是一直相信自己能承擔選擇嗎？那就別再用嘴。用你選的這條道——把我打碎。','demon'),ascensionLine('系統','進入戰鬥：心魔','demon'));playAscensionStory({theme:'ascensionDelusion',chapter:'飛升・第 2 關',title:'照妄陣',background:'assets/qstyle-v2/ascension/bg-delusion-trial-v1.png',className:'delusion',lines,onDone:()=>{a.delusionAttemptCount++;save();startAscensionBattle('ascension-delusion')}})}
function openRoadEnd(){const a=normalizeAscension(),routeText={qi:'練氣。借天地之息，養一身道基。借來的力量，究竟算不算自己的？',sword:'淬劍。一路走來，你斬過不少東西。到了最後，你還知道為什麼出劍嗎？',body:'煉體。能走到這裡，你很習慣痛。別把能忍，當成不會痛。'}[a.route],choices={qi:['只要我知道它從何而來，就足夠了','力量從哪裡來不重要，我怎麼用才重要','是不是我的，打過便知道'],sword:['知道該斬什麼，比會斬更重要','有些答案，本來就只能出劍後才知道','你若想知道，拔劍便是'],body:['我會痛，只是我還能站','我不是為了受傷才煉體','你打得動我再說']}[a.route],lines=[ascensionLine('旁白','照妄陣後，最後一段天階出現在雲海之上。平台盡頭，一道人影背對你站立。','master'),ascensionLine(state.name||'修士','我來了。'),ascensionLine('那人','比我想的快。能走進天路、問完自己心的人很多。真正難的是，聽過自己最不願聽的話後，還願意繼續走。','master'),ascensionLine(state.name||'修士','所以你就是這條天路最後的守關者？'),ascensionLine('天路之主','有人這麼叫我。九鎖之外，你替後人留下選擇；問心之中，你留下答案；照妄之中，你證明那些答案即使被懷疑，也不會因此消失。','master'),ascensionLine(state.name||'修士','所以我通過天路了？'),ascensionLine('天路之主','你只是走到了盡頭。走到這裡，只證明你沒有停下。至於這扇門認不認你，還差最後一件事。','master'),ascensionLine(state.name||'修士','又要回答問題？'),ascensionLine('天路之主','不問了。不是看你說自己是誰，也不是心魔、九鎖、守界司或凡間眾生認為你該成為誰。只看你走到今日，有沒有資格把這條路繼續走下去。','master'),ascensionLine('天路之主',routeText,'master',{choices:choices.map(label=>({label,followup:[ascensionLine('天路之主','很好。答案不在話裡，接下來讓你的道自己回答。','master')]}))}),ascensionLine(state.name||'修士','所以打贏你，門就會開？'),ascensionLine('天路之主','你打不贏我。我要看的不是你能不能殺我，而是你能逼我退到哪一步。出手吧，讓我看看你走到今日的這條道。','master'),ascensionLine('系統','最終試煉・天路之主','master')];playAscensionStory({theme:'ascensionRoadEnd',chapter:'飛升・最終關',title:'天路盡頭',background:'assets/qstyle-v2/ascension/bg-road-end-v1.png',className:'road-end',lines,onDone:()=>{a.roadEndAttemptCount++;save();startAscensionBattle('ascension-road-end')}})}
const renderAscensionAllocationBase=renderAscensionAllocation;
renderAscensionAllocation=function(reward){const replay=normalizeAscension().ascended;return renderAscensionAllocationBase(replay?{...reward,points:0,replay:true}:reward)};
function ascensionBattleProfile(mode){const core=mode==='ascension-delusion'?{rootBone:60000,trueQi:180000,physique:132500,agility:10000,spiritualPower:20000}:{rootBone:150000,trueQi:40000,physique:240000,agility:40000,spiritualPower:70000};return {combatPower:Object.entries(combatPowerWeights).reduce((sum,[key,weight])=>sum+core[key]*weight,0),core}}
function startAscensionBattle(mode){ensureAscensionModal().classList.remove('show');clearTimeout(battleTimer);const player=battlePlayerStats(),roadEnd=mode==='ascension-road-end';startBgm(roadEnd?'ascensionRoadEnd':'ascensionDelusion');const generated=ascensionBattleProfile(mode),core=generated.core,enemy={combatPower:generated.combatPower,core,maxHp:Math.round(combatHealth(core.rootBone)*(roadEnd?1.25:1)),attack:Math.max(12,core.trueQi*5),defense:Math.max(0,core.physique*20),evasion:combatEvasion(core.agility),accuracy:combatAccuracy(core.spiritualPower),crit:combatCritical(core.spiritualPower),name:roadEnd?'天路之主':'心魔',race:roadEnd?'human':'demon',combatStyle:roadEnd?'defense':'attack-defense'};battle={active:true,resolved:false,mode,round:1,completedRounds:0,playerMoveIndex:0,player:{...player,hp:player.maxHp},enemy:{...enemy,hp:enemy.maxHp},logs:[]};$('#battleModal').classList.remove('hidden');$('#battleStage').classList.remove('hidden');$('#battleResult').classList.add('hidden');$('#playerSilhouette').className=`battle-silhouette ${state.gender==='女'?'silhouette-player-female':'silhouette-player-male'}`;$('#enemySilhouette').className=`battle-silhouette silhouette-${enemy.race}`;$('#battlePlayerName').textContent=state.name;$('#battleEnemyName').textContent=enemy.name;$('.battle-arena').style.backgroundImage=`linear-gradient(#10121455,#18140d55),url('assets/qstyle-v2/ascension/${roadEnd?'bg-road-end-v1.png':'bg-delusion-trial-v1.png'}')`;$('#battleLog').innerHTML=`<p><b>${roadEnd?'最終試煉':'照妄之戰'}</b>・${roadEnd?`人族・防禦型・戰力 ${formatCombatPower(enemy.combatPower)}；將天路之主氣血壓至 10% 即獲認可`:`魔族・攻防型・戰力 ${formatCombatPower(enemy.combatPower)}；擊敗映照自身的心魔`}</p>`;syncBattleWeapon();updateBattleUi();battleTimer=setTimeout(playerBattleTurn,700)}
function completeAscensionBattle(mode,won){const a=normalizeAscension();if(!won){save();ensureAscensionModal().classList.remove('show');resumeWorldBgm();return}if(mode==='ascension-delusion'){a.delusionTrialCompleted=true;a.pendingReward={stage:'delusion',points:ascensionRouteMeta[a.route].reward[1]}}else{a.pendingReward={stage:'roadEnd',points:ascensionRouteMeta[a.route].reward[2]}}save()}
function openAscensionAftermath(mode,won){const modal=ensureAscensionModal(),a=normalizeAscension(),player=state.name||'修士',roadEnd=mode==='ascension-road-end';modal.classList.add('show');if(!roadEnd){const routeClose={qi:'借來的力量可以成為自己的道，但別忘了自己是誰。',sword:'若劍只用來斬掉所有不想聽的聲音，那柄劍便不再屬於你。',body:'「我撐得住」不能成為所有痛苦都值得承受的理由。'}[a.route];const lines=won?[ascensionLine('心魔','……原來如此。我不會死。只要你還會懷疑、後悔，還會在夜深時想「如果當初選另一條路」，我就一直都在。','demon'),ascensionLine(player,'那這一關到底要我做什麼？'),ascensionLine('心魔','不是殺我，是認出我。若你把我的聲音當成真理，你就輸了；若你連我的聲音都不敢聽，你也輸了。','demon'),ascensionLine('心魔','疑心不是敵人，妄念也不是。真正危險的是，你開始分不清它們是不是自己。','demon'),ascensionLine('心魔',routeClose,'demon'),ascensionLine('心魔','我不會消失。只不過下一次——你應該認得出我的聲音了。','demon'),ascensionLine('神秘身影','問過心，照過妄，還能走到這裡。不錯。走上來，到了盡頭——我再告訴你。','master'),ascensionLine('系統','照妄陣・通關。下一關：天路盡頭。','master')]:[ascensionLine('旁白',`${player}倒在碎裂的黑色鏡面上，四周鏡片映出無數個倒下的自己。`,'demon'),ascensionLine('心魔','就這樣？這一次已經完了。你方才說得很好聽，說會承擔、不會被我定義；可到了最後，你連站都站不起來。','demon'),ascensionLine('心魔','我不需要證明你錯。我只要等你輸一次。只要輸過一次，你下次再說那些話，心裡就會多出一個聲音：「真的嗎？你真的做得到嗎？」','demon'),ascensionLine(player,'……所以你想讓我不敢再來？'),ascensionLine('心魔','錯了，我要你再來。如果你不敢踏進這裡，我就贏了；如果你帶著這次失敗再來，我會比現在更像你。下次見，記得把今天輸掉的這一刻一起帶回來。','demon'),ascensionLine('系統','照妄未破。此次挑戰失敗，你仍可再次進入照妄陣。','demon'),ascensionLine(player,'……那就下次，再分勝負。')];playAscensionStory({theme:'ascensionDelusion',chapter:won?'照妄陣・通關':'照妄未破',title:won?'妄念不滅，識之即可':'此次挑戰失敗',background:'assets/qstyle-v2/ascension/bg-delusion-trial-v1.png',className:'delusion',lines,onDone:()=>{if(won){completeAscensionBattle(mode,true);renderAscensionAllocation(a.pendingReward)}else{completeAscensionBattle(mode,false);renderAscensionRoad()}}});return}const lines=won?[ascensionLine('天路之主','夠了。','master'),ascensionLine(player,'還沒結束。你還站著，我還沒贏。'),ascensionLine('天路之主','結束了。你以為走完天路的條件是殺了我？若每個飛升者都必須先強過我，這扇門早就幾萬年沒開過了。','master'),ascensionLine(player,'那你剛才到底在試什麼？'),ascensionLine('天路之主','我在看，你被逼到極限之後，還剩多少是自己的。問心可以說謊，照妄也可以逞強，只有真的動手時，你的道騙不了人。你已經讓我看見了。我認可你。','master'),ascensionLine('天路之主','過去有善人、惡人、為眾生而來的人，也有只為自己長生的人走過這扇門。','master'),ascensionLine(player,'天路不管？'),ascensionLine('天路之主','為何要管？若天地只准它認為正確的人飛升，那九鎖與天路有何不同？天路只確認你有沒有能力走到門前，又有沒有勇氣承認門後的一切仍是你的選擇。','master'),ascensionLine('天路之主','最後看一眼凡間吧。','master',{choices:['有一點捨不得','我只是想把它記清楚','我不後悔'].map((label,index)=>({label,followup:[ascensionLine('天路之主',index===2?'不後悔很好，但別把不後悔變成日後不准自己改變。':'可以回頭看，不代表你必須回頭。記住它，然後繼續走。','master')]}))}),ascensionLine('天路之主','九鎖已解。心已問。妄已照。路已盡。','master'),ascensionLine('旁白','仙門震動，緊閉萬年的門扉緩緩開啟。','master'),ascensionLine('天路之主',`凡間修士，${player}。你有資格過門了。`,'master'),ascensionLine(player,'到了仙界之後，還有路嗎？'),ascensionLine('天路之主','你以為這裡叫「天路盡頭」，是因為道走完了？這裡只是凡間的路走完了。門後的路——才剛開始。','master'),ascensionLine('系統','天路盡頭・通關。此路已盡，此道未終。','master')]:[ascensionLine('旁白','天路之主沒有補刀，只靜靜看著倒下的你。','master'),ascensionLine('天路之主','今日輸了。你在照妄陣裡應該已經學過：一次失敗，不足以替你定義後面的路。','master'),ascensionLine('天路之主','天路沒有關。關上它的，只會是你自己。回去。等你覺得自己能再多走一步——就再來讓我看看。','master'),ascensionLine('系統','天路未盡。此次挑戰失敗，你仍可再次挑戰天路之主。','master')];playAscensionStory({theme:'ascensionRoadEnd',chapter:won?'最終試煉・認可':'天路未盡',title:won?'仙門將啟':'此次挑戰失敗',background:'assets/qstyle-v2/ascension/bg-road-end-v1.png',className:'road-end',lines,onDone:()=>{if(won){completeAscensionBattle(mode,true);renderAscensionAllocation(a.pendingReward)}else{completeAscensionBattle(mode,false);renderAscensionRoad()}}})}
function renderAscensionSuccess(replay=false){const c=$('#ascensionContent'),titleId=replay?null:syncAscensionTitleUnlock(),title=titleCatalog.find(item=>item.id===titleId);c.innerHTML=`<div class="ascension-success"><small>${replay?'天路盡頭・重溫完成':'飛升成功'}</small><h2>${replay?'舊路重行，道果不重取':'凡途已盡，仙路初開'}</h2><p>「你以為天路盡頭，是因為道走完了？」</p><p>「這裡只是凡間的路走完了。門後的路，才剛開始。」</p><hr>${title?`<strong>獲得稱號「${title.name}」</strong>`:''}<strong>仙門之後沒有仙霧，也沒有靈潮。</strong><p>迎接你的，是一片靈氣枯竭、萬物死寂的荒蕪仙界。</p><em>${replay?'本次重溫未再次取得稱號、屬性獎勵或飛升順位。':'凡間的修練、洞府生產與所有既有產能均不受影響。'}</em><button data-enter-immortal>${replay?'結束重溫':'踏入荒蕪仙界'}</button></div>`;c.querySelector('[data-enter-immortal]').onclick=()=>{normalizeAscension().currentRealm='immortal';ensureAscensionModal().classList.remove('show');save();render();startBgm('immortalBarren');toast(replay?'飛升關卡重溫完成。':'仙界沒有靈氣。這裡的路，要用另一種方式走。')}}

$('#spiritUp').onclick=()=>primaryPathAction();$('#spiritCycleUp').onclick=()=>openPrimarySpiritView('cycle');$('#spiritInsightUp').onclick=()=>openPrimarySpiritView('insight'); $('#swordUp').onclick=()=>upgrade('sword'); $('#bodyUp').onclick=()=>openPrimaryBodyView('training');
$('#swordLifeUp').onclick=()=>openPrimarySwordView('sword');$('#swordTrialUp').onclick=()=>openPrimarySwordView('trial');
$('#bodyStatusUp').onclick=()=>openPrimaryBodyView('body');$('#bodyTrialUp').onclick=()=>openPrimaryBodyView('bodyTrial');
$('#tribConfirm').onclick=tribulate; $('#tribCancel').onclick=()=>$('#tribulationModal').classList.add('hidden');
$('#tribulationExit').onclick=exitTribulationResult;
$('#tribPillMin').onclick=()=>{tribulationPillUseCount=0;updateTribulationPanel()};$('#tribPillMinus').onclick=()=>adjustTribulationPills(-1);$('#tribPillPlus').onclick=()=>adjustTribulationPills(1);$('#tribPillMax').onclick=maximizeTribulationPills;
bindQuantityInput('tribPillUseCount',{minimum:0,maximum:()=>{const {realmIndex,count}=currentTribulationPill(),base=tribulationBaseChance(realmIndex);return Math.min(count,Math.max(0,Math.ceil((100-base-qiTribulationBonus())/5)))},onChange:value=>tribulationPillUseCount=value,refresh:updateTribulationPanel});
$('#heroCharacterHotspot').onclick=openHeroCharacterAttributes;
$$('.feature-tab').forEach(b=>b.onclick=()=>toggleFeature(b));
$('#mainlineButton').onclick=toggleMainlinePage;
$('#ascensionButton').onclick=openAscensionRoad;
$('#realmSwitchButton').onclick=switchWorldRealm;
bindRealmSwipe();
cultivationSceneMedia.addEventListener?.('change',()=>{if(state.name)render()});
function closeGameMenu(){
  $('#gameMenu').classList.add('hidden');
  $('#menuBtn').setAttribute('aria-expanded','false');
}
$('#menuBtn').setAttribute('aria-expanded','false');
$('#menuBtn').onclick=event=>{
  event.stopPropagation();
  const menu=$('#gameMenu'),opening=menu.classList.contains('hidden');
  menu.classList.toggle('hidden');
  $('#menuBtn').setAttribute('aria-expanded',String(opening));
};
document.addEventListener('click',event=>{
  if(!$('#gameMenu').classList.contains('hidden')&&!event.target.closest('#gameMenu'))closeGameMenu();
});
document.addEventListener('keydown',event=>{if(event.key==='Escape')closeGameMenu()});
$('#settingsBtn').onclick=openSettings;
$('#leaderboardBtn').onclick=openLeaderboard;
$('#helpBtn').onclick=openHelp;
$$('[data-help-tab]').forEach(button=>button.onclick=()=>renderHelp(button.dataset.helpTab));
$('#settingsCloseBtn').onclick=()=>$('#settingsModal').classList.add('hidden');
$('#copyPlayerUidBtn').onclick=async()=>{if(!currentPlayerUid)return;try{await navigator.clipboard.writeText(currentPlayerUid);toast('UID 已複製')}catch{toast('複製失敗，請長按 UID 複製')}};
document.body.append($('#accountRecoveryModal'));
$('#titleRecoveryBtn').onclick=openAccountRecovery;
$('#createRecoveryCodeBtn').onclick=()=>createRecoveryCode().catch(()=>{});
$('#copyRecoveryCodeBtn').onclick=async()=>{const code=storedRecoveryCode();if(!code)return;try{await navigator.clipboard.writeText(code);toast('恢復碼已複製')}catch{toast('複製失敗，請長按恢復碼複製')}};
$('#accountRecoveryCancel').onclick=()=>$('#accountRecoveryModal').classList.add('hidden');
$('#accountRecoveryConfirm').onclick=recoverAccount;
$('#helpCloseBtn').onclick=()=>$('#helpModal').classList.add('hidden');
$('#marketButton').onclick=openMarket;
$('#mailButton').onclick=openMailbox;
$('#mailboxCloseBtn').onclick=closeMailbox;
$('#mailDetailCloseBtn').onclick=closeMailDetail;
$('#mailClaimBtn').onclick=claimMailAttachments;
$('#mailDeleteBtn').onclick=deleteCurrentMail;
$('#marketCloseBtn').onclick=closeMarket;
$$('[data-market-tab]').forEach(button=>button.onclick=()=>switchMarketTab(button.dataset.marketTab));
$('#marketPurchaseCancel').onclick=closeMarketPurchase;
$('#marketPurchaseConfirm').onclick=confirmMarketPurchase;
$('#marketPurchaseMin').onclick=()=>{marketPurchaseQuantity=1;updateMarketPurchaseModal()};
$('#marketPurchaseMinus').onclick=()=>{marketPurchaseQuantity--;updateMarketPurchaseModal()};
$('#marketPurchasePlus').onclick=()=>{marketPurchaseQuantity++;updateMarketPurchaseModal()};
$('#marketPurchaseMax').onclick=()=>{marketPurchaseQuantity=Math.max(1,marketPurchaseCapacity(marketPurchaseOffer));updateMarketPurchaseModal()};
bindQuantityInput('marketPurchaseQuantity',{minimum:1,maximum:()=>Math.max(1,marketPurchaseCapacity(marketPurchaseOffer)),onChange:value=>marketPurchaseQuantity=value,refresh:updateMarketPurchaseModal});
$('#itemModalClose').onclick=closeItemModal;
$('#itemMinBtn').onclick=()=>{itemModalQuantity=1;updateItemQuantity()};
$('#itemMinusBtn').onclick=()=>{itemModalQuantity--;updateItemQuantity()};
$('#itemPlusBtn').onclick=()=>{itemModalQuantity++;updateItemQuantity()};
$('#itemMaxBtn').onclick=()=>{const item=itemCatalog[itemModalKey];if(item)itemModalQuantity=state[item.count]||1;updateItemQuantity()};
bindQuantityInput('itemQuantity',{minimum:1,maximum:()=>{const item=itemCatalog[itemModalKey];return Math.max(1,item?state[item.count]||0:1)},onChange:value=>itemModalQuantity=value,refresh:updateItemQuantity});
$('#sellCancelBtn').onclick=closeSellModal;
$('#sellConfirmBtn').onclick=confirmSellItem;
$('#offlineModalClose').onclick=closeOfflineRewards;
$('#offlineModal').onclick=event=>{if(event.target===$('#offlineModal'))closeOfflineRewards()};
$('#confirmModalCancel').onclick=()=>closeGameConfirm(false);
$('#confirmModalAccept').onclick=()=>closeGameConfirm(true);
$('#identityChangeCancel').onclick=closeIdentityChangeModal;
$('#identityChangeConfirm').onclick=confirmIdentityNameChange;
$('#identityChangeInput').onkeydown=event=>{if(event.key==='Enter')confirmIdentityNameChange();else if(event.key==='Escape')closeIdentityChangeModal()};
$('#deleteStartBtn').onclick=()=>showSettingsSection('#deleteStepOne');
$('#deleteCancelBtn').onclick=()=>showSettingsSection('#settingsMain');
$('#deleteVerifyBtn').onclick=()=>{
  if($('#deleteConfirmInput').value.trim()!==`${state.name}/刪除`){$('#deleteError').textContent='輸入內容不正確';return}
  $('#deleteError').textContent=''; showSettingsSection('#deleteStepTwo');
};
$('#deleteBackBtn').onclick=()=>showSettingsSection('#deleteStepOne');
$('#deleteFinalBtn').onclick=async()=>{suppressSave=true;sessionOnline=false;clearTimeout(battleTimer);clearSwordTrialAdvance();clearTimeout(recoveryBackupTimer);battle=null;stopAllBgm();if(storedRecoveryCode())try{await recoveryRpc('delete_recovery_backup',{})}catch{}localStorage.removeItem(accountRecoveryConfig.codeKey);localStorage.removeItem(saveKey);state={...defaults,name:'',bornAt:null,lastSave:gameNow()};location.reload()};
$('#backToTitle').onclick=forceOffline;
$('#backToTitle').addEventListener('click',()=>{$('#mailboxModal').classList.add('hidden');$('#mailDetailModal').classList.add('hidden');currentMailId=null});
$('#muteBtn').onclick=()=>{state.muted=!state.muted;updateBgmVolume();render();save()};
$('#battleExitBtn').onclick=forceEndBattle;
$('#battleResultNext').onclick=advanceSwordTrial;
$('#battleResultClose').onclick=closeBattle;
$('#encounterButton').onclick=openEncounterModal;
$('#artifactTombButton').onclick=()=>openArtifactTomb('claim');
$('#encounterCloseBtn').onclick=closeEncounterModal;
$$('[data-sword-trial-path]').forEach(button=>button.onclick=()=>chooseSwordTrialPath(button.dataset.swordTrialPath));
document.addEventListener('click',event=>{if(event.target.closest?.('[data-experience-view],[data-road]'))queueMicrotask(renderSwordPathSummary)});
document.addEventListener('click',event=>{if(event.target.closest?.('[data-task],[data-sect-view="tasks"]'))queueMicrotask(renderSectPathIncome)});
const interfaceScrollMemory=new Map();let interfaceScrollInputUntil=0,interfaceScrollRestoreFrame=0;
function interfaceViewKey(){
  const helpTab=$('.help-tabs .active')?.dataset.helpTab||'',marketTab=typeof currentMarketTab==='string'?currentMarketTab:'',activeViews=[...document.querySelectorAll('[data-root-view].active,[data-bag-view].active,[data-cave-view].active,[data-sect-view].active,[data-arts-view].active,[data-experience-view].active,[data-market-tab].active')].map(element=>Object.values(element.dataset).join(':')).join(',');
  return [currentFeature,currentRootView,currentCaveView,currentSectView,currentArtsView,currentExperienceView,helpTab,marketTab,activeViews].join('|');
}
function interfaceScrollPath(element){
  const parts=[];let node=element;
  while(node&&node!==document.body){
    if(node.id){parts.unshift(`#${node.id}`);break}
    const dataKey=[...node.attributes].find(attribute=>attribute.name.startsWith('data-')&&/(view|tab|tier|road)/.test(attribute.name));
    const classes=[...node.classList].filter(name=>!['active','selected','running','hidden','disabled'].includes(name)).slice(0,3);
    const siblings=node.parentElement?[...node.parentElement.children].filter(child=>child.tagName===node.tagName):[];
    parts.unshift(`${node.tagName.toLowerCase()}${dataKey?`[${dataKey.name}="${dataKey.value}"]`:classes.length?`.${classes.join('.')}`:''}:nth-of-type(${Math.max(1,siblings.indexOf(node)+1)})`);
    node=node.parentElement;
  }
  return parts.join('>');
}
function rememberInterfaceScroll(element){if(!(element instanceof Element))return;interfaceScrollMemory.set(`${interfaceViewKey()}::${interfaceScrollPath(element)}`,{top:element.scrollTop,left:element.scrollLeft})}
function restoreInterfaceScroll(){
  cancelAnimationFrame(interfaceScrollRestoreFrame);interfaceScrollRestoreFrame=requestAnimationFrame(()=>requestAnimationFrame(()=>{
    const context=`${interfaceViewKey()}::`;
    document.querySelectorAll('#featureDescription,.help-card,.mailbox-card,.mail-letter-card,.market-card,.battle-card,.sect-tabs,.cave-tabs,.help-tabs,[class*="tabs"],[class*="scroll"]').forEach(element=>{
      const position=interfaceScrollMemory.get(context+interfaceScrollPath(element));if(!position)return;
      if(element.scrollTop!==position.top)element.scrollTop=position.top;if(element.scrollLeft!==position.left)element.scrollLeft=position.left;
    });
  }))}
['wheel','touchmove','pointerdown','keydown'].forEach(type=>document.addEventListener(type,()=>{interfaceScrollInputUntil=performance.now()+1500},{capture:true,passive:true}));
document.addEventListener('pointermove',event=>{if(event.buttons)interfaceScrollInputUntil=performance.now()+1500},{capture:true,passive:true});
document.addEventListener('scroll',event=>{if(performance.now()<=interfaceScrollInputUntil)rememberInterfaceScroll(event.target)},{capture:true,passive:true});
new MutationObserver(restoreInterfaceScroll).observe($('#app'),{childList:true,subtree:true});
new MutationObserver(()=>{if(currentFeature==='experience')queueMicrotask(renderSwordPathSummary)}).observe($('#featureDescription'),{childList:true,subtree:true});
document.addEventListener('contextmenu',event=>{if(event.target.closest?.('img'))event.preventDefault()});
document.addEventListener('dragstart',event=>{if(event.target.closest?.('img'))event.preventDefault()});
$('#manualCultivateBtn').onclick=beginManualCultivation;
setInterval(()=>{if($('#gameScreen').classList.contains('active')){let sectChanged=false;if(state.cultivationAwakened){const immortal=normalizeAscension().currentRealm==='immortal';addAura(auraRate());const swordGain=state.swordPathOpened?swordEssenceRate():0;if(state.swordPathOpened){state.swordEssence+=BigInt(swordGain);if(!immortal&&state.activePath==='sword')renderPrimarySanctum()}runSettlementTick();sectChanged=processSectYears();processEncounterTriggers(5000);if(state.spiritPathOpened)addCultivation(rate(),immortal||state.activePath!=='spirit');if(!immortal&&state.activePath==='sword'&&swordGain>0&&isPureCultivationView())toast(`劍元+${formatLargeNumber(swordGain)}`,'cultivation')}processDivineRoaming();if(currentFeature==='root')renderSpiritRootView(currentRootView);if(currentFeature==='cave'&&state.cultivationAwakened&&currentCaveView!=='study')renderCaveView(currentCaveView);if(currentFeature==='sect'&&currentSectView!=='npcs'&&sectChanged)renderSectView(currentSectView);if(currentFeature==='arts')updateArtsLive();if(currentFeature==='spiritPrimary'||currentFeature==='experience'&&currentExperienceView==='spiritSide')renderQiDestination();else if(currentFeature==='experience')renderSwordPathSummary();tickStart=gameNow()}},5000);
setInterval(()=>{if($('#gameScreen').classList.contains('active'))$('#tickBar').style.width=Math.min(100,(gameNow()-tickStart)/50)+'%'},50);
setInterval(()=>{if($('#gameScreen').classList.contains('active'))$('#yearsElapsed').textContent=`${experiencedYears().toLocaleString()} 年`},1000);
setInterval(updatePracticeTimers,1000);
setInterval(updateDivineRoamingTimer,1000);
setInterval(()=>{const today=dateKey()||'local';if(today!==lastScriptureDayKey){lastScriptureDayKey=today;if(!$('#marketModal').classList.contains('hidden'))renderMarket(currentMarketTab);if(currentFeature==='cave'&&currentCaveView==='brew')renderBrewProduction($('#caveInner'));if(currentFeature==='sect'&&currentSectView==='shop')renderSectShop()}},1000);
setInterval(()=>{if(sessionOnline&&!document.hidden)syncTrustedTime()},600000);
setInterval(()=>{if(sessionOnline&&!document.hidden)syncJadeGrants()},60000);
setInterval(verifyAccountOwnership,30000);
window.addEventListener('online',verifyAccountOwnership);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&!suppressSave)save();else if(!document.hidden)verifyAccountOwnership()});
window.addEventListener('pagehide',()=>{if(!suppressSave)save()});
async function initializeAssetCache(){
  if(!('serviceWorker' in navigator)||!/^https?:$/.test(location.protocol))return;
  try{
    await navigator.serviceWorker.register('./sw.js',{scope:'./'});
    const registration=await navigator.serviceWorker.ready;
    const preload=()=>{
      const connection=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
      if(connection?.saveData||/2g/.test(connection?.effectiveType||''))return;
      registration.active?.postMessage({type:'PRECACHE_VISUALS'});
    };
    if('requestIdleCallback' in window)requestIdleCallback(preload,{timeout:5000});else setTimeout(preload,2500);
  }catch{}
}
window.addEventListener('load',initializeAssetCache,{once:true});
window.addEventListener('beforeunload',()=>{if(!suppressSave)save()}); updateCreator(); updateOriginPreview(); render();
