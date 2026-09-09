/* 道侶十章與結緣後洞府系統。此檔先載入，函式於 game.js 完成初始化後呼叫。 */
const partnerChapterNames=['山間血跡','故人未識','同路一程','故人來訪','來而有往','久無音訊','旁觀者清','無事相尋','各有其道','與君同行'];
const partnerScenes=['forest','market','mountain-road','cave-exterior','cultivation-platform','market','market','cave-interior','mountain-road','cave-exterior'];
const partnerStoryVersion=3;
let partnerStoryMigrated=false;
const partnerDelays=[[8,24],[12,36],[16,48],[24,72],[32,96],[24,72],[16,48],[12,36],[8,24],[0,0]];
const partnerPersonalities={warm:'溫和',reserved:'清冷',free:'灑脫',devoted:'執著'};
const partnerRoutes={qi:'練氣',sword:'淬劍',body:'煉體'};
const partnerStateNames={rest:'休憩',cultivate:'修煉',seclusion:'閉關',travel:'遊歷'};
const partnerStoryData=[
 {intro:'山林雨後，石階旁一道血跡蜿蜒入林。循跡而去，一名陌生修士倚樹而坐，仍警惕地護著懷中玉符。',steps:[
  {speaker:'旁白',text:'血跡尚新，林中卻沒有求救聲。',choices:[['循著血跡查看',0,0],['暫且離去',0,0,'leave']]},
  {speaker:'陌生修士',text:'「若是來取我性命，便不必多言。」對方氣息紊亂，手仍未離開兵刃。',choices:[['替其療傷',0,0],['先辨傷勢與來路',0,0],['移至避雨處',0,0]]},
  {speaker:'陌生修士',text:'傷勢稍穩，對方取出一枚空白身份玉牌，似在等你問名。',name:true},
  {speaker:'同道人',text:'「今日之事，我會記得。」',choices:[['等到傷勢穩定再走',0,0],['留下傷藥',0,0],['替其尋一處藏身地',0,0]]}
 ]},
 {intro:'坊市人潮中，那道曾在山林見過的身影停在舊地圖攤前。若當日未曾相救，這便是你們真正的初見。',steps:[
  {speaker:'同道人',text:'「我在找一條失落的古道，你可曾聽聞？」',choices:[['陪同尋找',1,1],['給出線索',1,1],['由其自行處理',0,-1]]},
  {speaker:'同道人',text:'事情告一段落後，對方忽然問起你這些年的修行。',choices:[['尚好，只是偶有疲憊',1,0],['修行而已，無甚可說',0,1],['發生不少事，慢慢說來',1,0]]}
 ]},
 {intro:'離開坊市後，你們恰巧同赴一處古道。山風很長，沉默也並不難熬。',steps:[
  {speaker:'同道人',text:'「既然同路，要不要一起走？」',choices:[['並肩同行',1,0],['約定彼此照應但各走各的',0,1],['獨自上路',-1,0]]},
  {speaker:'旁白',text:'途中有凡人受困崖下，而天色正迅速轉壞。',choices:[['立刻救人',0,1],['先察地勢再救',0,2],['不涉此因果',0,-1]]},
  {speaker:'同道人',text:'崖後藏有一株罕見靈草，兩人同時看見。',choices:[['交由對方處置',1,0],['平分所得',1,2],['各憑本事',0,1],['留作共同路資',1,2]]}
 ]},
 {intro:'某日洞府外傳來叩門聲。來者沒有傳訊，只帶著一壺尚溫的茶。',steps:[
  {speaker:'同道人',text:'「路過此地，想起你在這裡。」',choices:[['請入洞府',2,1],['在門外小坐',1,1],['今日不便相見',0,1,'skip']]},
  {speaker:'同道人',text:'「若有一日，我把性命託在你手上呢？」',choices:[['我會接住',1,1],['先問清因果，再與你共擔',0,2],['你的路仍該由你自己走',0,1]]},
  {speaker:'同道人',text:'「你覺得我們如今算是什麼？」',choices:[['可信之人',0,1],['難得的知己',1,1],['我在意的人',2,0],['只是同道',-1,0]]}
 ]},
 {intro:'修煉台上靈氣翻湧，你行功至緊要處時，對方恰好來訪。',steps:[
  {speaker:'同道人',text:'「你氣息不穩。若信得過我，我替你守住靈台。」',choices:[['全心相託',2,2,'rely'],['只請其護法',1,0],['婉拒相助',-1,0]]},
  {speaker:'同道人',text:'危機過後，對方把手收回，神情仍有些緊繃。',choices:[['道謝',1,0],['握住那隻尚未放鬆的手',2,0],['談論方才的功法',0,1],['當作無事發生',-1,0]]},
  {speaker:'同道人',text:'「下一次，也別什麼都自己扛。」',choices:[['答應',2,0,'rely'],['我會斟酌',1,1],['不必擔心我',-1,0],['你也是',1,1]]}
 ]},
 {intro:'坊市傳聞有人在險地見過熟悉的身影，此後數百年再無音訊。',steps:[
  {speaker:'旁白',text:'消息真假難辨，你決定如何做？',choices:[['親自尋找',1,1,'care'],['託人四處打聽',1,0,'care'],['留下只有對方看得懂的訊息',1,1,'care'],['相信對方自會歸來',0,1]]},
  {speaker:'同道人',text:'你終於在歸途遇見對方。那人安然無恙，只是風塵滿身：「若再有一次，你還會找嗎？」',choices:[['會，因為是你',2,0],['至少要知道你是否平安',1,1],['若你不希望，我會尊重',0,2],['未必',-1,0]]}
 ]},
 {intro:'坊市酒樓裡，店家自然地把你們安排在同席，笑稱二位果然又一同來了。',steps:[
  {speaker:'路人',text:'「二位道侶今日也照舊？」空氣忽然安靜。',choices:[['含笑不否認',2,0],['尚未到那一步',1,1,'possible'],['只是同行之人',-1,0],['看向對方，讓其回答',0,1]]},
  {speaker:'同道人',text:'離開後，對方問：「這種事，應當由旁人來定嗎？」',choices:[['自然要兩人都願意',1,2],['稱呼而已，不必在意',0,0],['若是你，我並不排斥',2,1,'possible']]}
 ]},
 {intro:'沒有急事、沒有異象，也沒有需要交換的東西。對方只是在傍晚來到你的洞府。',steps:[
  {speaker:'同道人',text:'「今日無事，只想來坐坐。」',choices:[['請其入內',2,0],['取茶對坐',1,1],['笑問是否當真無事',1,0],['繼續修煉',-1,1]]},
  {speaker:'同道人',text:'談話兜轉回初見之日。原來許多細節，對方都還記得。',choices:[['我也記得',2,0],['那時不曾想會走到今日',1,1],['往事已遠',0,1]]},
  {speaker:'同道人',text:'月上枝頭，對方起身告辭。',choices:[['有空再來',1,1,'welcome'],['送至洞府外',1,0],['道一聲珍重',0,1]]}
 ]},
 {intro:'古道將分岔。對方要獨自去一處危險秘境，這不是邀請，也不是試探。',steps:[
  {speaker:'同道人',text:'「這一段路，我必須自己走。」',choices:[['尊重選擇，也說明牽掛',1,2],['坦言擔心',2,0],['堅持同行',1,-1],['只道一聲珍重',0,1]]},
  {speaker:'旁白',text:'等待沒有回音的日子裡，你如何安置這份心？',choices:[['照常修行，為其留燈',1,2],['每隔一段歲月傳訊',1,1],['親赴入口等候',2,0],['不再等待',-2,0]]},
  {speaker:'同道人',text:'多年後，那道身影終於從山霧裡走回來：「我回來了。」',choices:[['回來便好',2,1],['你的路，可曾走明白？',0,2],['下次先告訴我',1,1]]}
 ]},
 {intro:'夕陽落在洞府外。走過漫長歲月，有些話終究要由其中一人先說。',steps:[]}
];

function partnerClamp(value){return Math.max(-5,Math.min(5,Math.round(Number(value)||0)))}
function partnerChoice(label,bond=0,accord=0,flag=''){return {label,bond,accord,flag,path:'balance',rewards:[]}}
function partnerNormalize(){
 if(state.partnerStory){const s=state.partnerStory,year=experiencedYears(),version=Math.max(0,Math.floor(s.version||0));s.bond=partnerClamp(s.bond);s.accord=partnerClamp(s.accord);s.flags=s.flags&&typeof s.flags==='object'?s.flags:{};s.memories=Array.isArray(s.memories)?s.memories:[];s.chapter=Math.max(0,Math.min(10,Math.floor(s.chapter||0)));s.nextYear=Math.max(0,Math.floor(s.nextYear||0));if(version<partnerStoryVersion){if(s.chapter>0&&!s.completed&&s.chapter<10)s.nextYear=Math.min(s.nextYear||year,year+4);s.version=partnerStoryVersion;partnerStoryMigrated=true}if(Array.isArray(state.encounterQueue))state.encounterQueue=state.encounterQueue.filter(event=>event?.kind!=='partner'||Math.floor(event.chapter||0)===s.chapter+1)}
 if(state.partnerSystem?.established){const p=state.partnerSystem;p.milestones=p.milestones||{};p.companionCultivation=p.companionCultivation||{cooldownEndYear:0,activeBuff:null};p.lastResolvedYear=Math.max(0,Math.floor(p.lastResolvedYear||experiencedYears()));if(!p.state?.type)partnerBeginState('rest',true)}
}
function partnerCreateStory(year){const genders=state.gender==='男'?['女']:['男'],routes=['qi','sword','body'],personalities=Object.keys(partnerPersonalities);state.partnerStory={id:`fated-${state.name}-${state.bornAt}`,name:'',gender:genders[0],route:routes[Math.floor(Math.random()*3)],personality:personalities[Math.floor(Math.random()*4)],bond:0,accord:0,flags:{},memories:[],chapter:0,nextYear:year,ending:'',completed:false,version:partnerStoryVersion}}
function partnerProcess(year=experiencedYears()){
 if(!state.partnerStory&&year>=192)partnerCreateStory(year);
 const story=state.partnerStory;if(story&&!story.completed&&story.chapter<10&&year>=story.nextYear&&!state.encounterQueue.some(e=>e.kind==='partner')){const chapter=story.chapter+1;state.encounterQueue.unshift(partnerMakeEvent(chapter));updateEncounterButton()}
 partnerResolveRuntime(year);
}
function partnerMakeEvent(chapter){const data=partnerStoryData[chapter-1],step=0;return {id:`partner-${chapter}-${Date.now()}`,kind:'partner',chapter,step,title:`第${['一','二','三','四','五','六','七','八','九','十'][chapter-1]}章・${partnerChapterNames[chapter-1]}`,text:data.intro,choices:[partnerChoice('繼續')]}}
function partnerArt(kind='dialogue'){const gender=state.partnerStory?.gender||state.partnerSystem?.partner?.gender||'女';return `assets/qstyle-v2/partner/partner-${gender==='男'?'male':'female'}-${kind}-v1.png`}
function partnerScene(chapter){return `assets/qstyle-v2/partner/bg-${partnerScenes[chapter-1]}-v1.png`}
function partnerDisplayName(){return state.partnerStory?.name||state.partnerSystem?.partner?.name||'陌生修士'}
function partnerStepHasDialogue(step){return !!step?.speaker&&step.speaker!=='旁白'&&/[「『]/.test(step.text||'')}
function partnerStepSpeaker(step){if(!partnerStepHasDialogue(step))return '';return step.speaker==='同道人'?partnerDisplayName():step.speaker}
function partnerStepVisual(step,story){const showPartner=partnerStepHasDialogue(step)&&['同道人','陌生修士'].includes(step.speaker);return `<div class="partner-visual-stage${showPartner?'':' partner-narration-stage'}">${showPartner?`<img class="partner-dialogue-art" src="${partnerArt('dialogue')}" alt="${story.gender}修士半身像">`:''}</div>`}
function partnerSpeakerHeading(speaker){return speaker?`<h2>${speaker}</h2>`:''}
function partnerPlayerArt(){return typeof mainlineProtagonistPortrait==='function'?mainlineProtagonistPortrait():`assets/qstyle-v2/mainline/portrait-protagonist-${state.gender==='男'?'male':'female'}-v2.png`}
const partnerActionLines={
 '循著血跡查看':'你循著血跡走入林中，沒有放任那道微弱氣息消失。','暫且離去':'你停下腳步，最終沒有循著血跡走入林中。','替其療傷':'你收起敵意，俯身替對方處理傷勢。','先辨傷勢與來路':'你沒有貿然靠近，而是先察看傷勢與四周留下的痕跡。','移至避雨處':'你扶起對方，先將人移到能夠避雨的地方。','等到傷勢穩定再走':'你留在原處，直到對方的氣息真正穩定。','留下傷藥':'你把傷藥放在對方手邊，沒有要求任何回報。','替其尋一處藏身地':'你替對方尋到安全藏身之處，才轉身離開。',
 '陪同尋找':'你收起自己的行程，決定陪對方把那條古道找完。','給出線索':'你將知道的線索逐一說明，讓對方少走一些彎路。','由其自行處理':'你把此事留給對方，沒有再涉入其中。','並肩同行':'你走到對方身旁，與其一同踏上古道。','約定彼此照應但各走各的':'你們約定沿途照應，卻仍各自保留自己的步調。','獨自上路':'你謝絕同行，選擇獨自走完這段路。','立刻救人':'你沒有遲疑，立刻向崖下受困之人伸出援手。','先察地勢再救':'你先看清山勢與落腳處，再穩妥地展開救援。','不涉此因果':'你沒有停步，任由這段因果留在身後。','交由對方處置':'你退開半步，把靈草的處置交給對方。','平分所得':'你提出平分靈草，讓這場相遇不欠彼此。','各憑本事':'你沒有相讓，只以各自本事決定靈草歸屬。','留作共同路資':'你提議將靈草留下，作為兩人接下來的共同路資。',
 '請入洞府':'你側身讓開洞府門口，請對方入內。','在門外小坐':'你在洞府外添了座位，與對方隔著暮色小坐。','今日不便相見':'你沒有開門，只隔著禁制婉拒了這次來訪。','全心相託':'你放開靈台防備，把最危險的一刻交給對方守護。','只請其護法':'你接受對方護法，卻仍保留最後一層心防。','婉拒相助':'你謝過好意，仍選擇獨自壓下紊亂氣息。','道謝':'你鄭重向對方道謝。','握住那隻尚未放鬆的手':'你沒有多說，只握住那隻仍然緊繃的手。','談論方才的功法':'你避開彼此的情緒，轉而談起方才運轉的功法。','當作無事發生':'你收回目光，像方才什麼都沒有發生。',
 '親自尋找':'你放下手邊之事，親自踏上尋人的路。','託人四處打聽':'你將消息送往各處，託可信之人代為打聽。','留下只有對方看得懂的訊息':'你在約定之地留下只有對方能讀懂的訊息。','相信對方自會歸來':'你沒有追尋，只替對方保留一條回來的路。','含笑不否認':'你只是含笑，沒有否認那聲「道侶」。','看向對方，讓其回答':'你沒有替兩人決定，只安靜地看向對方。','請其入內':'你推開洞府石門，請對方進來坐坐。','取茶對坐':'你取出茶盞，與對方安靜對坐。','笑問是否當真無事':'你笑著追問，對方是否真的只是來坐坐。','繼續修煉':'你沒有停下行功，只讓洞府重新歸於安靜。','送至洞府外':'你一路將對方送到洞府之外。',
 '尊重選擇，也說明牽掛':'你沒有阻攔，只坦白說出自己的牽掛。','坦言擔心':'你不再迂迴，直言自己無法不擔心。','堅持同行':'你拒絕留在原地，堅持要一同踏入秘境。','只道一聲珍重':'你壓下所有挽留，只留下一聲珍重。','照常修行，為其留燈':'你照常修行，卻始終為那個人留著一盞燈。','每隔一段歲月傳訊':'你每隔一段歲月便傳去訊息，不催促，只報平安。','親赴入口等候':'你親自守在秘境入口，任歲月從身旁流過。','不再等待':'你熄了那盞燈，決定不再等待。'
};
function partnerPlayerChoiceText(label){if(partnerActionLines[label])return partnerActionLines[label];const text=String(label||'').replace(/[。！？]$/,'');return `「${text}。」`}
const partnerReactionBeats=[
 ['雨聲落在林葉間，遠處的氣息微微一滯。','護住玉符的手終於鬆開了幾分。','','傷勢穩住後，林中的戒備也悄然淡去。'],
 ['舊地圖在兩人之間攤開，殘缺的墨線一路伸向遠山。','坊市人聲從身旁流過，對方卻一直等著你的回答。'],
 ['山風捲過古道，兩人的腳步在片刻間有了同一個節奏。','崖下傳來呼救，對方把你的決定完整看在眼裡。','靈草在石縫間搖曳，短暫的沉默比言語更加清楚。'],
 ['洞府門前的茶仍溫熱，對方沒有催促。','對方問得平靜，目光卻沒有移開。','暮色落下，這個問題終於被放在兩人之間。'],
 ['紊亂靈氣逐漸平復，對方仍守在你一步之外。','兩人的手都沒有立刻收回。','修煉台上的風停了片刻。'],
 ['尋人的消息散入漫長歲月，終於有一日帶回回音。','重逢之後，對方像是在確認一件比平安更重要的事。'],
 ['酒樓裡的笑聲尚未散去，對方已經留意到你的反應。','走出人群後，兩人的腳步同時慢了下來。'],
 ['洞府裡沒有要緊事，只有一段難得不必趕路的時光。','舊事被重新提起，原來彼此記住的遠比想像中更多。','月色已深，離別前仍有一句話沒有說完。'],
 ['古道在前方分岔，任何挽留都顯得格外沉重。','等待把歲月拉得很長，也把心意照得更加清楚。','山霧分開，久別後的第一句話終於落下。']
];
const partnerReactionVoices={
 warm:{
  close:['對方怔了片刻，眉眼慢慢柔和：「好。你這句話，我會放在心上。」','對方沒有掩飾笑意：「有你這樣回答，我便安心多了。」','對方輕輕頷首：「那我也不與你客氣了。我會同樣記得你的心意。」'],
  thoughtful:['對方仔細想過才回答：「你沒有急著許諾，反而讓我更願意相信。」','對方溫聲道：「這樣也好。把事情想清楚，總勝過勉強自己。」','對方看著你笑了笑：「你有你的分寸，我明白，也會尊重。」'],
  neutral:['對方語氣依舊溫和：「好，那便照你說的做。」','對方點頭：「我明白你的意思。慢一些也無妨。」','對方把話接得很穩：「至少你願意坦白，這便足夠。」'],
  distant:['對方的笑意淡了一些，仍溫聲道：「我明白了。你不必為難自己。」','對方安靜片刻：「好，我會把界線記清楚。」','對方沒有追問，只輕輕點頭：「那便依你所願。」']
 },
 reserved:{
  close:['對方沉默良久，才低聲道：「……好。我記下了。」','那雙一向平靜的眼眸微微動了一下：「既是你說的，我信。」','對方別開視線，語氣仍淡：「不必重複。我已經聽清了。」'],
  thoughtful:['對方略一思索：「有分寸，總比一時衝動好。」','對方頷首：「你的考量沒有錯。便如此。」','對方看了你一眼：「至少這個答案，是你想過之後才說的。」'],
  neutral:['對方只應了一聲：「嗯。」片刻後又補道：「我沒有異議。」','對方神色未變：「可以。照你的意思。」','對方收回目光：「我知道了，繼續走吧。」'],
  distant:['對方的神情重新歸於疏淡：「明白。我不會越界。」','短暫沉默後，對方只道：「既如此，便不必多言。」','對方沒有挽留：「好。這是你的選擇。」']
 },
 free:{
  close:['對方先是一怔，隨即笑出聲：「這可是你說的。往後別想賴帳。」','對方揚起眉梢：「好啊，有你這句話，這趟便更有意思了。」','對方笑著拍了拍你的肩：「痛快。我也拿真心回你。」'],
  thoughtful:['對方轉了轉手中茶盞：「想得周全也好，路才能走得久。」','對方笑道：「你有你的走法，我不攔；能說明白就成。」','對方眨了眨眼：「原來你是這般想的。倒也不壞。」'],
  neutral:['對方爽快應下：「成，那便這麼辦。」','對方擺擺手：「小事。你自在，我也自在。」','對方笑了一聲：「答案不算意外，但我聽見了。」'],
  distant:['對方笑意仍在，眼神卻淡了些：「行。聚散本來就不必勉強。」','對方聳肩：「好吧，各走各的也算一種同行。」','對方退開半步：「明白。你不用替我找理由。」']
 },
 devoted:{
  close:['對方久久望著你：「你既這樣說，我便會當真。不是只當今日的一句話。」','對方的目光沒有半分閃避：「好。你肯交給我的，我絕不會放手。」','對方低聲道：「我等的就是你這句。往後的事，我與你一同承擔。」'],
  thoughtful:['對方認真聽完：「你要想清楚，我可以等。但別用沉默把我推開。」','對方緩緩點頭：「你的顧慮我會記住，也會證明我值得你信。」','對方目光沉靜：「有界線無妨，只要你願意讓我知道界線在哪裡。」'],
  neutral:['對方看著你確認了一遍：「好。我依你，但我會記得今日。」','對方答得很慢：「可以。只是我不會把這件事當作無關緊要。」','對方收緊手指，又緩緩放開：「我聽見了。」'],
  distant:['對方沉默得比往常更久：「原來如此。即使如此，我也不會假裝沒有聽見。」','對方眼底暗了一瞬：「好。我尊重你的選擇，但不代表我毫不在意。」','對方沒有挽留，只低聲道：「你可以走。我會自己記住這一刻。」']
 }
};
const partnerFlagReactions={
 leave:{warm:'林中人聽著腳步遠去，沒有出聲，只將懷中玉符握得更緊。',reserved:'林中人察覺你已離去，神情未變，像是早已習慣無人回頭。',free:'林中人靠著樹幹低低笑了一聲，任雨水沖淡石階上的血跡。',devoted:'林中人記住了那道遠去的腳步聲，許久之後才獨自起身。'},
 rely:{warm:'對方溫聲道：「放心。你肯信我，我便會好好守著你。」',reserved:'對方按住翻湧靈氣，只低聲道：「別怕。我在。」',free:'對方笑意收斂，語氣難得認真：「交給我。這一次你只管走完自己的周天。」',devoted:'對方一字一句道：「只要我還在，便不會讓你的靈台在我眼前崩散。」'},
 care:{warm:'對方眼中泛起暖意：「原來那些沒有回音的歲月裡，一直有人在找我。」',reserved:'對方垂下眼，半晌才道：「……辛苦你了。下次我會留下消息。」',free:'對方笑著嘆氣：「竟讓你追了這麼遠。這份人情，我怕是還不清了。」',devoted:'對方看著你，聲音微啞：「你真的來了。從今往後，我不會再讓你這樣找我。」'},
 possible:{warm:'對方耳尖微紅，卻沒有移開目光：「那便等到我們都願意時，再由我們親口決定。」',reserved:'對方沉默了一會兒：「……我並不討厭這個可能。」',free:'對方忽然笑了：「好啊。旁人如何叫不重要，我倒想聽你有朝一日親口說。」',devoted:'對方目光灼然：「可能二字，我記下了。總有一天，我會等到你把它說成肯定。」'},
 welcome:{warm:'對方回首一笑：「好。下次我還帶著溫茶來。」',reserved:'對方腳步微停：「嗯。我會再來。」',free:'對方揮了揮手：「說定了。下回可別嫌我來得太勤。」',devoted:'對方回望洞府燈火：「只要你還願意等，我便一定會再來。」'}
};
function partnerReactionTone(bond,accord,flag){if(flag==='leave'||flag==='skip'||bond<0||accord<0)return 'distant';if(['rely','care','possible','welcome'].includes(flag)||bond>=2)return 'close';if(accord>=2)return 'thoughtful';return 'neutral'}
function partnerChoiceReaction(event,raw,index){const [,bond=0,accord=0,flag='']=raw,personality=state.partnerStory?.personality||'warm';if(partnerFlagReactions[flag]?.[personality])return partnerFlagReactions[flag][personality];const tone=partnerReactionTone(bond,accord,flag),pool=partnerReactionVoices[personality]?.[tone]||partnerReactionVoices.warm.neutral,voice=pool[(event.chapter*7+event.step*3+index)%pool.length],beat=partnerReactionBeats[event.chapter-1]?.[event.step]||'';return `${beat}${beat?' ':''}${voice}`}
function partnerEndingReaction(index){const eligible=partnerEndingEligible(),accepted=eligible&&index===0,personality=state.partnerStory?.personality||'warm';const lines=accepted?{warm:'對方眼中漾開笑意，將手輕輕交到你掌中：「好。從今日起，長生路不必再各自走了。」',reserved:'對方沉默許久，終於握住你的手：「……好。往後，我與你同行。」',free:'對方笑得像終於等到這一日：「那便說定了。天地再大，我們一起去看。」',devoted:'對方緊緊回握住你：「我等這句話等了太久。此後生死、長生，我都與你同路。」'}:eligible?{warm:'對方眸光微黯，仍溫聲道：「我明白。能把話說清楚，也好過勉強同行。」',reserved:'對方收回伸出的手：「好。我尊重你的選擇。」',free:'對方安靜一瞬，又笑道：「也好。同行不一定非要結契。」',devoted:'對方許久沒有說話，最後只道：「我不會逼你。但今日的答案，我恐怕永遠都忘不了。」'}:{warm:'對方輕聲道：「能同行至此，已是難得。願你往後一路平安。」',reserved:'對方頷首：「這段歲月，我會記得。」',free:'對方舉杯一笑：「路不同也無妨。山高水長，總有再會之日。」',devoted:'對方凝望著你：「即使不能並肩到最後，我也不會否認曾真心走過這一程。」'};return lines[personality]||lines.warm}
function partnerRenderReaction(event,content){const reaction=event.reaction,isPlayer=reaction.phase===0,isNarration=!isPlayer&&reaction.narration,story=state.partnerStory,portrait=isPlayer?partnerPlayerArt():partnerArt('dialogue'),speaker=isPlayer?(state.name||'修士'):isNarration?'':partnerDisplayName(),tag=isPlayer?'你的回應':isNarration?'未被看見的另一端':`${partnerPersonalities[story.personality]}・對方的反應`,text=isPlayer?reaction.playerText:reaction.partnerText,visual=`<div class="partner-visual-stage${isNarration?' partner-narration-stage':''}">${isNarration?'':`<img class="partner-dialogue-art${isPlayer?' partner-player-dialogue-art':''}" src="${portrait}" alt="${speaker}半身立繪">`}</div>`;content.innerHTML=`<section class="partner-story partner-reaction-story" style="--partner-scene:url('${partnerScene(event.chapter)}')">${visual}<div class="partner-dialogue-card"><small>${event.title}・${tag}</small>${partnerSpeakerHeading(speaker)}<p>${text}</p></div><div class="partner-choice-panel partner-reaction-panel"><button data-partner-reaction-next class="jade-button">繼續</button></div></section>`;document.querySelector('[data-partner-reaction-next]').onclick=()=>partnerAdvanceReaction(event)}
function partnerAdvanceReaction(event){const reaction=event.reaction;if(!reaction)return;if(reaction.phase===0){reaction.phase=1;renderEncounterModal();save();return}delete event.reaction;if(reaction.ending)return partnerResolveEnding(event,reaction.endingIndex);if(reaction.flag==='leave'&&event.chapter===1){const story=state.partnerStory;if(!story.name)story.name=story.gender==='男'?'沈硯':'蘇晚';return partnerFinishChapter(event,reaction.label,'你沒有循跡入林。這段緣分並未消失，只是把真正的初見留給了下一次。')}const data=partnerStoryData[event.chapter-1];event.step++;if(event.step>=data.steps.length)return partnerFinishChapter(event,reaction.label,'此章已記入歲月。');renderEncounterModal();save()}
function partnerRenderEncounter(event,content){
 const story=state.partnerStory,data=partnerStoryData[event.chapter-1];
 if(event.chapter===10)return partnerRenderEnding(event,content);
 if(event.reaction)return partnerRenderReaction(event,content);
 const step=data.steps[event.step],intro=event.step===0?`<p class="partner-prose">${data.intro}</p>`:'',speaker=partnerStepSpeaker(step),visual=partnerStepVisual(step,story),speakerHeading=partnerSpeakerHeading(speaker);
 if(step?.name){content.innerHTML=`<section class="partner-story" style="--partner-scene:url('${partnerScene(event.chapter)}')">${visual}<div class="partner-dialogue-card">${intro}<small>${event.title}</small>${speakerHeading}<p>${step.text}</p></div><div class="partner-choice-panel partner-name-panel"><label class="partner-name-field">為這位${story.gender}修士題名<input id="partnerNameInput" maxlength="8" placeholder="輸入姓名"></label><button id="partnerNameConfirm" class="jade-button">記下姓名</button></div></section>`;document.querySelector('#partnerNameConfirm').onclick=()=>partnerConfirmName(event);return}
 const choices=(step?.choices||[]).map(args=>partnerChoice(...args));event.choices=choices;
 content.innerHTML=`<section class="partner-story" style="--partner-scene:url('${partnerScene(event.chapter)}')">${visual}<div class="partner-dialogue-card">${intro}<small>${event.title}・${partnerRoutes[story.route]}・${partnerPersonalities[story.personality]}</small>${speakerHeading}<p>${step.text}</p></div><div class="partner-choice-panel encounter-choices">${choices.map((c,i)=>`<button data-encounter-choice="${i}"><b>${c.label}</b></button>`).join('')}</div></section>`;document.querySelectorAll('[data-encounter-choice]').forEach(b=>b.onclick=()=>partnerResolveChoice(event,+b.dataset.encounterChoice))
}
function partnerConfirmName(event){const input=document.querySelector('#partnerNameInput'),name=(input?.value||'').trim().slice(0,8);if(!name)return toast('請先替這位修士記下姓名');state.partnerStory.name=name;event.step++;renderEncounterModal();save()}
function partnerResolveChoice(event,index){if(event.reaction)return;const data=partnerStoryData[event.chapter-1],step=data.steps[event.step],raw=step?.choices?.[index];if(!raw)return;const [label,bond=0,accord=0,flag='']=raw,story=state.partnerStory;story.chapterBond=(story.chapterBond||0)+bond;story.chapterAccord=(story.chapterAccord||0)+accord;if(flag)story.flags[flag]=true;story.memories.push({chapter:event.chapter,label,year:experiencedYears()});event.reaction={phase:0,label,flag,playerText:partnerPlayerChoiceText(label),partnerText:partnerChoiceReaction(event,raw,index),narration:flag==='leave',ending:false};renderEncounterModal();save()}
function partnerFinishChapter(event,choice,result){const story=state.partnerStory,delta=v=>v>=2?1:v<=-2?-1:0;story.bond=partnerClamp(story.bond+delta(story.chapterBond||0));story.accord=partnerClamp(story.accord+delta(story.chapterAccord||0));story.chapterBond=0;story.chapterAccord=0;story.chapter=event.chapter;const delay=partnerDelays[Math.max(0,Math.min(9,event.chapter-1))],range=delay||[120,360];story.nextYear=experiencedYears()+range[0]+Math.floor(Math.random()*(range[1]-range[0]+1));state.encounterHistory.unshift({title:event.title,choice,result,year:experiencedYears(),at:gameNow(),tags:['life','partner']});state.encounterHistory=state.encounterHistory.slice(0,60);state.encounterQueue.shift();render();renderEncounterModal();updateEncounterButton();save();toast(`${event.title}・已收入歲月錄`)}
function partnerEndingEligible(){const s=state.partnerStory,flags=['rely','care','possible','welcome'].filter(k=>s.flags[k]).length;return s.bond>=3&&s.accord>=3&&flags>=2}
function partnerRenderEnding(event,content){if(event.reaction)return partnerRenderReaction(event,content);const s=state.partnerStory,eligible=partnerEndingEligible(),ending=eligible?'兩心同道':s.bond>=3?'有情未同道':s.accord>=3?'同道未有情':'各自長生';const question=eligible?`「${state.name}，往後的長生路，你可願與我同行？」`:`你們在夕照中說完最後一段話。此心或近、此道或同，卻終究沒有走成同一條路。`;event.choices=eligible?[partnerChoice('我願意'),partnerChoice('仍選擇獨行')]:[partnerChoice('記住這段歲月')];const visual=eligible?`<div class="partner-visual-stage"><img class="partner-dialogue-art" src="${partnerArt('dialogue')}" alt="${s.gender}修士半身像"></div>`:'<div class="partner-visual-stage partner-narration-stage"></div>',speaker=eligible?`<h2>${partnerDisplayName()}</h2>`:'';content.innerHTML=`<section class="partner-story partner-ending" style="--partner-scene:url('${partnerScene(10)}')">${visual}<div class="partner-dialogue-card"><small>${event.title}・${ending}</small>${speaker}<p>${question}</p></div><div class="partner-choice-panel encounter-choices">${event.choices.map((c,i)=>`<button data-partner-ending="${i}"><b>${c.label}</b></button>`).join('')}</div></section>`;document.querySelectorAll('[data-partner-ending]').forEach(b=>b.onclick=()=>partnerChooseEnding(event,+b.dataset.partnerEnding))}
function partnerChooseEnding(event,index){if(event.reaction)return;const label=event.choices?.[index]?.label;if(!label)return;event.reaction={phase:0,label,playerText:partnerPlayerChoiceText(label),partnerText:partnerEndingReaction(index),narration:false,ending:true,endingIndex:index};renderEncounterModal();save()}
function partnerResolveEnding(event,index){const s=state.partnerStory,accepted=partnerEndingEligible()&&index===0;s.chapter=10;s.completed=true;s.ending=accepted?'與君同行':partnerEndingEligible()?'自選獨行':s.bond>=3?'有情未同道':s.accord>=3?'同道未有情':'各自長生';if(accepted)partnerEstablish();state.encounterHistory.unshift({title:event.title,choice:s.ending,result:accepted?`${partnerDisplayName()}自此成為你的道侶。`:'你們將這段相逢收進各自的歲月。',year:experiencedYears(),at:gameNow(),tags:['life','partner']});state.encounterQueue.shift();render();renderEncounterModal();updateEncounterButton();save();toast(accepted?'同心結已成・洞府道侶頁開啟':'緣起緣落，皆為長生路')}

function partnerEstablish(){const s=state.partnerStory,year=experiencedYears();state.partnerSystem={established:true,partneredAtYear:year,partner:{id:s.id,name:s.name,gender:s.gender,route:s.route,personality:s.personality,realm:Math.max(1,Math.min(9,worldProgressTier())),cultivationProgress:0},state:null,companionCultivation:{cooldownEndYear:0,activeBuff:null},milestones:{firstCompanionCultivationDone:false,firstSeclusionDone:false,firstTravelDone:false},lastResolvedYear:year};partnerBeginState('rest',true)}
function partnerStateDuration(type,first=false){if(first)return [96,120,144,168,192][Math.floor(Math.random()*5)];const ranges={rest:[48,144],cultivate:[96,240],seclusion:[240,720],travel:[144,480]},r=ranges[type],values=[];for(let n=r[0];n<=r[1];n+=24)values.push(n);return values[Math.floor(Math.random()*values.length)]}
function partnerChooseState(){const p=state.partnerSystem,weights={warm:[30,35,15,20],reserved:[20,35,25,20],free:[25,20,10,45],devoted:[10,40,40,10]}[p.partner.personality],types=['rest','cultivate','seclusion','travel'],allowed=types.filter(t=>!(t===p.state?.type&&(t==='seclusion'||t==='travel')));let pool=allowed.map(t=>[t,weights[types.indexOf(t)]]),total=pool.reduce((a,[,w])=>a+w,0),roll=Math.random()*total;for(const [t,w] of pool){roll-=w;if(roll<=0)return t}return 'rest'}
function partnerBeginState(type=partnerChooseState(),first=false,start=experiencedYears()){const p=state.partnerSystem,duration=partnerStateDuration(type,first);p.state={type,startYear:start,endYear:start+duration,previousType:p.state?.type||'',consecutiveRestOrCultivate:['rest','cultivate'].includes(type)&&p.state?.type===type?(p.state.consecutiveRestOrCultivate||1)+1:1,destinationType:type==='travel'?['訪古','尋藥','觀海','問劍'][Math.floor(Math.random()*4)] :''}}
function partnerResolveRuntime(year=experiencedYears()){const p=state.partnerSystem;if(!p?.established)return;partnerRefreshBuff(year);let guard=0;while(p.state&&year>=p.state.endYear&&guard++<1000){const duration=p.state.endYear-p.state.startYear,mult={rest:.75,cultivate:1,seclusion:1.1,travel:.95}[p.state.type];p.partner.cultivationProgress+=duration*mult;if(p.state.type==='seclusion'&&duration>=480&&!p.milestones.firstSeclusionDone){p.milestones.firstSeclusionDone=true;partnerLog('閉關歲月',`${p.partner.name}完成了一次漫長閉關。`)}if(p.state.type==='travel'&&duration>=360&&!p.milestones.firstTravelDone){p.milestones.firstTravelDone=true;partnerLog('遠遊歸來',`${p.partner.name}自漫長遊歷中歸來。`)}while(p.partner.realm<9&&p.partner.cultivationProgress>=p.partner.realm*900){p.partner.cultivationProgress-=p.partner.realm*900;p.partner.realm++;partnerLog('道侶破境',`${p.partner.name}踏入${p.partner.realm}境。`)}const end=p.state.endYear,next=partnerChooseState();partnerBeginState(next,false,end)}p.lastResolvedYear=year}
function partnerLog(title,result){state.encounterHistory.unshift({title,choice:partnerDisplayName(),result,year:experiencedYears(),at:gameNow(),tags:['partner']});state.encounterHistory=state.encounterHistory.slice(0,60)}
function partnerRefreshBuff(year=experiencedYears()){const c=state.partnerSystem?.companionCultivation;if(c?.activeBuff&&year>=c.activeBuff.endYear)c.activeBuff=null}
function partnerRouteMultiplier(route){const c=state.partnerSystem?.companionCultivation;partnerRefreshBuff();return c?.activeBuff?.route===route?1.03:1}
function partnerCompanionPractice(route){const p=state.partnerSystem,year=experiencedYears();if(!p?.established||!['rest','cultivate'].includes(p.state.type))return toast('道侶目前不在洞府，無法共同修煉');if(year<(p.companionCultivation.cooldownEndYear||0))return toast('同修心境尚未平復');const unlocked={qi:state.spiritPathOpened,sword:state.swordPathOpened,body:state.bodyPathOpened};if(!unlocked[route])return;p.companionCultivation.cooldownEndYear=year+192;p.companionCultivation.activeBuff={route,startYear:year,endYear:year+96,bonus:.03};if(!p.milestones.firstCompanionCultivationDone){p.milestones.firstCompanionCultivationDone=true;partnerLog('初次同修',`${state.name}與${p.partner.name}第一次並肩參悟。`)}save();renderCavePanel('partner');toast(`${partnerPracticeName(route,p.partner.route)}・${partnerRoutes[route]}效率提升3%（96年）`)}
function partnerPracticeName(a,b){const pair=[a,b].sort().join('-'),map={'qi-qi':'對坐論氣','sword-sword':'互證劍勢','body-body':'對練磨身','qi-sword':'氣劍相證','body-qi':'氣血相參','body-sword':'劍身互證'};return map[pair]||'同參大道'}
function partnerRenderCave(inner){const p=state.partnerSystem;if(!inner||!p?.established)return;partnerResolveRuntime();const year=experiencedYears(),s=p.state,can=['rest','cultivate'].includes(s.type),remaining=Math.max(0,s.endYear-year),vague=remaining<=48?'歸期將近':remaining<=144?'尚需一段時日':'歸期未定',active=p.companionCultivation.activeBuff,unlocked=[['qi','練氣'],['sword','淬劍'],['body','煉體']].filter(([k])=>({qi:state.spiritPathOpened,sword:state.swordPathOpened,body:state.bodyPathOpened}[k]));inner.innerHTML=`<section class="partner-cave"><div class="partner-cave-scene"><img src="assets/qstyle-v2/partner/bg-cave-interior-v1.png" alt="洞府內景"><img class="partner-full-art" src="${partnerArt('full')}" alt="${p.partner.name}全身像"></div><header><small>結為道侶 ${Math.max(0,year-p.partneredAtYear)} 年</small><h2>${p.partner.name}</h2><p>${partnerRoutes[p.partner.route]}・${p.partner.realm}境・${partnerPersonalities[p.partner.personality]}</p></header><div class="partner-status"><article><small>當前行止</small><b>${partnerStateNames[s.type]}</b><span>已過 ${Math.max(0,year-s.startYear)} 年・${vague}</span></article><article><small>同修狀態</small><b>${active?`${partnerRoutes[active.route]} +3%`:'尚無加持'}</b><span>${active?`餘約 ${Math.max(0,active.endYear-year)} 年`:`${Math.max(0,(p.companionCultivation.cooldownEndYear||0)-year)} 年後可再同修`}</span></article></div><section class="partner-practice"><h3>${can?'與君同修':'洞府空席'}</h3><p>${can?'選擇自己已開啟的一途，共參九十六年；同一時間只保留一種加持。':`${p.partner.name}正在${partnerStateNames[s.type]}，待其歸來再一同修行。`}</p><div>${unlocked.map(([k,n])=>`<button data-partner-practice="${k}" ${can&&year>=(p.companionCultivation.cooldownEndYear||0)?'':'disabled'}>${partnerPracticeName(k,p.partner.route)}<small>${n}效率 +3%</small></button>`).join('')}</div></section></section>`;document.querySelectorAll('[data-partner-practice]').forEach(b=>b.onclick=()=>partnerCompanionPractice(b.dataset.partnerPractice))}

let partnerHistoryFilter='life';
function partnerRenderHistory(content){const partnered=!!state.partnerSystem?.established,tabs=[['cultivation','修練'],['life','歲月']];if(partnered)tabs.push(['partner','道侶']);if(!tabs.some(([k])=>k===partnerHistoryFilter))partnerHistoryFilter='life';const entries=(state.encounterHistory||[]).filter(e=>(e.tags||['life']).includes(partnerHistoryFilter));content.innerHTML=`<p class="eyebrow">歲月錄</p><h2>往事留痕</h2><nav class="partner-history-tabs">${tabs.map(([k,n])=>`<button data-history-filter="${k}" class="${k===partnerHistoryFilter?'active':''}">${n}</button>`).join('')}</nav><div class="encounter-history">${entries.length?entries.map(e=>`<article><b>${e.title}</b><span>${e.choice||''}</span><small>${e.result||''}</small></article>`).join(''):'<p>此卷尚是一片空白。</p>'}</div>`;document.querySelectorAll('[data-history-filter]').forEach(b=>b.onclick=()=>{partnerHistoryFilter=b.dataset.historyFilter;partnerRenderHistory(content)})}
