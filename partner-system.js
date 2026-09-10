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
 {intro:'雨才歇，山林裡滿是濕潤的草木氣。石階邊那串血跡一路沒入林深，偶爾被雨水沖淡，卻始終沒有斷。',steps:[
  {speaker:'旁白',text:'血還溫著，林中卻靜得反常。受傷的人沒有呼救，像是寧願撐到最後，也不肯讓誰循聲找到。',choices:[['循著血跡查看',0,0],['暫且離去',0,0,'leave']]},
  {speaker:'陌生修士',text:'樹下的人聽見腳步，勉強抬起兵刃：「若是來取我性命，就快些。我今日……實在沒力氣陪你繞彎子。」',choices:[['替其療傷',0,0],['先辨傷勢與來路',0,0],['移至避雨處',0,0]]},
  {speaker:'陌生修士',text:'傷口總算止了血。對方倚回樹幹，從懷中摸出一枚空白玉牌，遲疑片刻才遞來：「總不能讓你一直叫我『那個傷患』。」',name:true},
  {speaker:'同道人',text:'「我不擅長欠人情。」對方把玉牌仔細收好，聲音仍虛弱，卻不再冷硬，「但今日這份，我會好好記著。」',choices:[['等到傷勢穩定再走',0,0],['留下傷藥',0,0],['替其尋一處藏身地',0,0]]}
 ]},
 {intro:'坊市正是最熱鬧的時辰。你在舊地圖攤前又看見那道身影——對方捏著一張殘圖，已和攤主爭了半刻鐘。若當日未曾入林，這便是你們真正的初見。',steps:[
  {speaker:'同道人',text:'對方認出你，眼裡掠過一點意外，隨即把殘圖攤開：「來得正好。這條古道像是被人從世上抹去了，你可曾聽過？」',choices:[['陪同尋找',1,1],['給出線索',1,1],['由其自行處理',0,-1]]},
  {speaker:'同道人',text:'忙完時，坊市已點起燈。對方買了兩碗熱湯，將其中一碗推給你：「別只說古道了。你呢？這些年過得還好嗎？」',choices:[['尚好，只是偶有疲憊',1,0],['修行而已，無甚可說',0,1],['發生不少事，慢慢說來',1,0]]}
 ]},
 {intro:'離開坊市後，你們才發現彼此要去的是同一條古道。山路很長，偶爾一句閒談，偶爾各自沉默，竟都不讓人覺得難熬。',steps:[
  {speaker:'同道人',text:'對方走出幾步又回頭，故作隨意地問：「既然同路……要不要一起？至少遇上岔路時，多一個人可以怪。」',choices:[['並肩同行',1,0],['約定彼此照應但各走各的',0,1],['獨自上路',-1,0]]},
  {speaker:'旁白',text:'途中有凡人受困崖下，而天色正迅速轉壞。',choices:[['立刻救人',0,1],['先察地勢再救',0,2],['不涉此因果',0,-1]]},
  {speaker:'同道人',text:'救人後，你們在崖縫裡同時看見一株罕見靈草。視線撞在一起，對方先笑了：「這倒難辦了。你說，怎麼分？」',choices:[['交由對方處置',1,0],['平分所得',1,2],['各憑本事',0,1],['留作共同路資',1,2]]}
 ]},
 {intro:'某日洞府外傳來三聲叩門。來者沒有事先傳訊，只提著一壺尚溫的茶，衣角還沾著趕路時的風塵。',steps:[
  {speaker:'同道人',text:'「其實也不算路過。」對方看了一眼手中的茶，難得有些不自在，「只是走到附近，忽然很想見你。」',choices:[['請入洞府',2,1],['在門外小坐',1,1],['今日不便相見',0,1,'skip']]},
  {speaker:'同道人',text:'茶喝到一半，對方忽然停下轉動杯盞的手：「我問個不吉利的。若有一天，我真的只能把性命交給你……你會怎麼辦？」',choices:[['我會接住',1,1],['先問清因果，再與你共擔',0,2],['你的路仍該由你自己走',0,1]]},
  {speaker:'同道人',text:'沉默了一會兒，對方低頭笑了笑：「我們好像已經走得很近了。可若要你親口說……你覺得，我們如今算是什麼？」',choices:[['可信之人',0,1],['難得的知己',1,1],['我在意的人',2,0],['只是同道',-1,0]]}
 ]},
 {intro:'修煉台上靈氣驟然倒捲。你行功正至最凶險的一關，經脈卻先亂了章法；偏偏此時，熟悉的腳步停在禁制之外。',steps:[
  {speaker:'同道人',text:'對方只看一眼便變了臉色，伸出的手卻停在半寸之外：「你氣息亂了。若信我，就點一下頭——剩下的交給我。」',choices:[['全心相託',2,2,'rely'],['只請其護法',1,0],['婉拒相助',-1,0]]},
  {speaker:'同道人',text:'危機過去後，對方慢慢收回手，指節仍因用力而泛白。嘴上什麼都沒說，那口壓了許久的氣卻終於吐了出來。',choices:[['道謝',1,0],['握住那隻尚未放鬆的手',2,0],['談論方才的功法',0,1],['當作無事發生',-1,0]]},
  {speaker:'同道人',text:'臨走前，對方背對著你整理衣袖，聲音悶悶的：「下次別又一個人硬撐。修長生又不是比誰更會逞強。」',choices:[['答應',2,0,'rely'],['我會斟酌',1,1],['不必擔心我',-1,0],['你也是',1,1]]}
 ]},
 {intro:'坊市裡忽然傳來消息：有人曾在險地見過那道熟悉的身影。消息只有寥寥幾句，此後數百年，再沒有任何回音。',steps:[
  {speaker:'旁白',text:'消息真假難辨，你決定如何做？',choices:[['親自尋找',1,1,'care'],['託人四處打聽',1,0,'care'],['留下只有對方看得懂的訊息',1,1,'care'],['相信對方自會歸來',0,1]]},
  {speaker:'同道人',text:'重逢那日，對方瘦了些，袖口也磨得發白。彼此對望許久，那人才啞著嗓子問：「若再來一次……明知可能找不到，你還會找我嗎？」',choices:[['會，因為是你',2,0],['至少要知道你是否平安',1,1],['若你不希望，我會尊重',0,2],['未必',-1,0]]}
 ]},
 {intro:'坊市酒樓裡，店家自然地把你們安排在同席，笑稱二位果然又一同來了。',steps:[
  {speaker:'路人',text:'店家一邊斟酒一邊笑問：「二位道侶今日也照舊？」話音才落，你們同時看向彼此，誰也沒有立刻出聲。',choices:[['含笑不否認',2,0],['尚未到那一步',1,1,'possible'],['只是同行之人',-1,0],['看向對方，讓其回答',0,1]]},
  {speaker:'同道人',text:'離開酒樓後，對方走得比平時慢了一些：「方才那個稱呼……我知道不該由旁人來定。可你聽見時，心裡真的一點波瀾也沒有嗎？」',choices:[['自然要兩人都願意',1,2],['稱呼而已，不必在意',0,0],['若是你，我並不排斥',2,1,'possible']]}
 ]},
 {intro:'沒有急事、沒有異象，也沒有需要交換的東西。對方只是在傍晚來到你的洞府。',steps:[
  {speaker:'同道人',text:'「真的沒事。」對方在門前晃了晃空空的雙手，笑意很輕，「就是今日忽然覺得，一個人待著有些安靜，想來你這裡坐坐。」',choices:[['請其入內',2,0],['取茶對坐',1,1],['笑問是否當真無事',1,0],['繼續修煉',-1,1]]},
  {speaker:'同道人',text:'談話不知怎麼繞回初見。對方竟連那日的雨聲、你衣袖沾到的泥，甚至你說話時皺眉的模樣都還記得。說到一半，自己先不好意思地停了。',choices:[['我也記得',2,0],['那時不曾想會走到今日',1,1],['往事已遠',0,1]]},
  {speaker:'同道人',text:'月已上枝頭。對方起身走到門前，又回頭看了一眼，像是在等一句足以讓下次來訪顯得理所當然的話。',choices:[['有空再來',1,1,'welcome'],['送至洞府外',1,0],['道一聲珍重',0,1]]}
 ]},
 {intro:'古道將分岔。對方要獨自去一處危險秘境，這不是邀請，也不是試探。',steps:[
  {speaker:'同道人',text:'對方望著岔路盡頭，很久才開口：「這一段，我必須自己走。不是不信你……正因為是你，我才不想讓你替我背這份因果。」',choices:[['尊重選擇，也說明牽掛',1,2],['坦言擔心',2,0],['堅持同行',1,-1],['只道一聲珍重',0,1]]},
  {speaker:'旁白',text:'等待沒有回音的日子裡，你如何安置這份心？',choices:[['照常修行，為其留燈',1,2],['每隔一段歲月傳訊',1,1],['親赴入口等候',2,0],['不再等待',-2,0]]},
  {speaker:'同道人',text:'多年後，山霧裡終於走出熟悉的身影。對方站到你面前，原先準備好的話似乎全忘了，只紅著眼睛笑了一下：「我回來了。還好……你也還在。」',choices:[['回來便好',2,1],['你的路，可曾走明白？',0,2],['下次先告訴我',1,1]]}
 ]},
 {intro:'夕陽把兩人的影子拉得很長。走過這麼多年，你們已經熟悉彼此的沉默、倔強與不肯說出口的牽掛。有些話若今日仍不說，或許還能再等很多年；可對方不想再等了。',steps:[]}
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
 '尊重選擇，也說明牽掛':'「我不攔你。」你替對方理好被風吹亂的衣領，「但你要知道，從你踏進去的那一刻起，外面就會多一個牽掛你的人。」','坦言擔心':'「我知道你有非去不可的理由。」你沒有再繞彎子，「可我還是會怕。這句話，我不想瞞你。」','堅持同行':'「你可以不邀我，但不能替我決定。」你向那條岔路踏出一步，「這段路，我要陪你走。」','只道一聲珍重':'千言萬語到了唇邊，最後只剩一句：「珍重。我等你平安回來。」','照常修行，為其留燈':'你仍照常修行，只是每晚都在洞府門前添一盞燈。你不說在等誰，也從未讓它熄滅。','每隔一段歲月傳訊':'你隔些歲月便傳去一句近況，不催歸期，也不問答案，只讓對方知道：這裡一切都好，你也仍在。','親赴入口等候':'你在秘境入口結廬住下。春去秋來，你看過無數人進出，卻始終沒有錯認過任何一道背影。','不再等待':'你終於熄了門前那盞燈。黑暗落下時，心裡某個地方也跟著安靜了。',
 '尚好，只是偶有疲憊':'你捧著熱湯暖了暖手，笑得有些無奈：「大抵還好。只是有些夜裡，也會累得不想再逞強。」','修行而已，無甚可說':'你垂眼看著碗中熱氣：「不過是修行、破境，再繼續走。沒什麼值得特意說的。」','發生不少事，慢慢說來':'「那可說來話長了。」你把熱湯往兩人中間挪了挪，「若你不趕時間，我便慢慢說給你聽。」',
 '我會接住':'你沒有避開那雙眼睛：「我會接住。不是因為我不怕，而是因為那個人是你。」','先問清因果，再與你共擔':'「我會先問清楚你究竟闖了什麼禍。」你頓了頓，「問完，再和你一起擔。」','你的路仍該由你自己走':'「我能護你一時，卻不能替你走完自己的路。」你輕聲道，「真到了那一天，我希望你仍能先相信自己。」',
 '可信之人':'你想了想才答：「是我敢把後背交出去的人。這份信任，對我來說已經很重了。」','難得的知己':'「是知己吧。」你看著杯中並排的倒影，「很多話不必說完，你也能懂的那一種。」','我在意的人':'你沒有再拿同道二字遮掩：「是我會惦記、會擔心，也會因為見到而高興的人。」','只是同道':'「只是同道。」你把語氣放得很平，像是在說服對方，也像在提醒自己。',
 '答應':'「好，我答應你。」你認真看著對方，「下次撐不住時，我會記得我不是只有一個人。」','我會斟酌':'「我會試著改。」你沒有把話說滿，「至少下一次，我會先想起今日有人為我擔心成這樣。」','不必擔心我':'「不必為我擔心，我向來都能自己處理。」你說得輕描淡寫，卻看見對方眉心仍沒有鬆開。','你也是':'「這話也送給你。」你望著對方泛白的指節，「別只顧著接住我，你也可以有撐不住的時候。」',
 '會，因為是你':'「會。」你幾乎沒有思索，「不是因為我喜歡尋人，是因為失去消息的那個人是你。」','至少要知道你是否平安':'「我未必要把你帶回來。」你緩緩吐出一口氣，「但至少，我得親眼知道你還平安。」','若你不希望，我會尊重':'「我會想找你。」你坦白道，「可若那真是你的選擇，我也會學著尊重——只是請你至少留一句平安。」','未必':'你沉默片刻，終究沒有給出安慰人的答案：「未必。不是每一次等待，都還有力氣重來。」',
 '尚未到那一步':'你輕咳一聲，沒有急著撇清：「尚未到那一步……但也不是毫無可能。」','只是同行之人':'「店家誤會了。」你把酒盞推回桌上，「我們只是同行之人。」','自然要兩人都願意':'「自然不能由旁人定。」你放慢腳步，側過臉看向對方，「要你願意，也要我願意，才算數。」','稱呼而已，不必在意':'「不過是一句隨口的稱呼。」你笑了笑，「不必讓它擾了心境。」','若是你，我並不排斥':'你停下腳步，讓彼此都無法再假裝只是閒談：「若那個人是你，我並不排斥。」',
 '我也記得':'「我也記得。」你接著說出一個連對方都以為早已被遺忘的細節，說完時，兩個人都笑了。','那時不曾想會走到今日':'「那時只覺得是萍水相逢。」你望向身旁的人，「哪裡想得到，一轉眼竟已一起走了這麼遠。」','往事已遠':'「都過去那麼久了。」你替兩人添了茶，語氣平靜，「記不記得，也不那麼重要了。」','有空再來':'「下次別再拿『路過』當藉口。」你倚著門笑道，「想來便來，我會替你留盞茶。」','道一聲珍重':'你站在原地沒有相送，只在石門合上前輕聲道：「珍重。夜路慢些走。」',
 '回來便好':'你看著那張久違的臉，原先想好的責備一句也說不出口：「回來便好。其他的……等你歇好了再說。」','你的路，可曾走明白？':'你替對方拂去肩上的霧水：「我等的不是一句交代。只想問你，那條非走不可的路，可曾走明白了？」','下次先告訴我':'你眼眶發熱，話出口卻帶著幾分氣惱：「下次先告訴我。哪怕只有一句也好，別再讓我從旁人口中找你的生死。」',
 '我願意':'你伸出手，掌心向上：「我願意。往後有風雨便一起擋，有好風景也不許一個人先看。」','仍選擇獨行':'你望著那隻等待已久的手，最終沒有握上去：「對不起。這條路，我還是想一個人走。」','記住這段歲月':'你把未能說成承諾的心意收好，輕聲道：「我會記得。往後想起你時，也會記得我們曾真心同行。」'
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
  close:['對方愣了一下，笑意才一點點漫上眼底：「好，我記住了。哪天你反悔，我可是要拿今日這句話來問你的。」','對方垂眼藏了藏笑，最後還是沒藏住：「你每次都這樣……偏在我最不安的時候，說一句讓人捨不得忘的話。」','對方輕輕應了一聲，又怕你沒聽清似的補道：「我的意思是，我很高興。真的。」'],
  thoughtful:['對方捧著杯盞想了片刻：「你沒有為了哄我便隨口答應，反而讓我安心。慢一點沒關係，我們都別委屈自己。」','對方眼神柔和下來：「我懂。人與人靠近，本就不是把彼此的分寸都磨掉。」','對方看了你一會兒，笑道：「這答案很像你。未必好聽，卻是認真說給我的。」'],
  neutral:['對方點點頭，順手替你添了些茶：「好，那就這樣。若哪日改了主意，記得第一個告訴我。」','對方沒有催你，只笑了一下：「慢些也好。能把真話說出來，總比彼此猜來猜去強。」','對方把你的話在心裡過了一遍：「我聽懂了。至少今日，我們又比昨日更了解彼此一點。」'],
  distant:['對方眼裡的亮色淡了些，卻仍替你把話接穩：「我明白。你不必因為怕我難過，就說不是本心的話。」','對方安靜地收回目光：「好，我會站在你覺得舒服的地方。只是……容我緩一緩。」','對方勉強笑了笑：「知道了。放心，我不會追著你討一個更好聽的答案。」']
 },
 reserved:{
  close:['對方沉默得有些久，耳尖卻悄悄紅了：「……好。我聽清了，你不用再說第二遍。」','那雙總顯得平靜的眼睛忽然有了笑意：「是你說的，我便信。只是別讓我等太久。」','對方別開臉，手卻沒有收回：「我不太會說這些。總之……我也是。」'],
  thoughtful:['對方思索片刻才道：「你肯把顧慮告訴我，已經很好。剩下的，我們可以慢慢想。」','對方輕輕頷首：「這樣很公平。你不必遷就我，我也不會讓你獨自承擔。」','對方看了你一眼：「我原以為你會敷衍過去。這個答案……比我預想的好。」'],
  neutral:['對方只應了一聲「嗯」，走出兩步後又停下：「方才不是敷衍。我是真的答應了。」','對方神色仍淡，語氣卻軟了些：「可以。若有不妥，我會直接告訴你。」','對方收回目光：「知道了。走吧——今日的路還長，不必急著一次把話說盡。」'],
  distant:['對方的手指在袖中微微收緊，臉上仍看不出波瀾：「明白。我會守好分寸。」','沉默拖得很長，對方最後只道：「既然這是你的真心話，我接受。只是今日……先別再問我了。」','對方沒有挽留，轉身時腳步卻慢了一拍：「好。你走你的路便是。」']
 },
 free:{
  close:['對方先愣住，隨即笑得眉眼都彎了：「這可是你親口說的！我記性好得很，幾百年後也別想賴。」','對方揚起眉梢，肩頭輕輕撞了你一下：「早這麼說不就好了？害我白白猜了那麼久。」','對方笑著向你伸出拳：「痛快。你給我一分真心，我還你十分——多的先欠著。」'],
  thoughtful:['對方轉著茶盞，難得安靜了一會兒：「你說得對。走得自在，不等於什麼都不必交代。」','對方笑著嘆氣：「行，你照你的步子走。走累了喊一聲，我就在附近。」','對方眨眨眼，語氣比平日認真：「原來你心裡藏了這麼多。下回早點說，我又不會笑你。」'],
  neutral:['對方乾脆地一拍掌：「成，就這麼辦。說好了便別偷偷改規矩。」','對方擺擺手，笑得灑脫：「小事。你自在些，我和你相處也自在。」','對方歪頭看你：「不算意外。但由你親口說出來，聽著還是不太一樣。」'],
  distant:['對方臉上還掛著笑，卻沒再像往常那樣打趣：「行。心不在一處，綁著也沒意思。」','對方聳了聳肩，望向遠處：「好吧，各走各的。若日後還能碰見，就再喝一杯。」','對方退開半步，把失落藏進玩笑裡：「懂了。放心，我這人最大的本事，就是不死纏爛打。」']
 },
 devoted:{
  close:['對方久久看著你，像是在分辨這是不是一場夢：「你既說了，我便會當真。不是只記到明日，是很久、很久。」','對方握住你的手，力道重得幾乎發疼，又急忙鬆了些：「抱歉……我只是太怕一放手，你便把這句話收回去。」','對方低聲笑了，眼眶卻微微發紅：「我等的就是這一句。往後再難的事，也終於不是我一個人的了。」'],
  thoughtful:['對方把每個字都聽完，才認真回答：「你慢慢想，我等得起。但若心裡難受，別再用沉默把我隔在外面。」','對方緩緩點頭：「你的顧慮，我一件也不會輕看。我不求你立刻信我，只求你看著我去做。」','對方目光沉靜：「有界線不要緊。只要你肯告訴我它在哪裡，我就不會莽撞地弄疼你。」'],
  neutral:['對方盯著你確認良久：「好，我依你。可我會把今日放在心上，不是拿來計較，是怕自己忘了你的心意。」','對方答得很慢：「可以。只是與你有關的事，我實在做不到當成無關緊要。」','對方收緊手指，又一根根鬆開：「我聽見了。你不用因為我的樣子，再說一次安慰我。」'],
  distant:['對方沉默得近乎令人不安，最後才啞聲道：「原來如此。給我一點時間吧，我還做不到立刻裝作沒事。」','對方眼底暗了一瞬：「好，我尊重你。只是尊重與不難過，終究不是同一回事。」','對方沒有伸手挽留，只低聲道：「你走吧。我怕再多看一會兒，就會說出讓你為難的話。」']
 }
};
const partnerFlagReactions={
 leave:{warm:'林中人聽著腳步遠去，沒有出聲，只將懷中玉符握得更緊。',reserved:'林中人察覺你已離去，神情未變，像是早已習慣無人回頭。',free:'林中人靠著樹幹低低笑了一聲，任雨水沖淡石階上的血跡。',devoted:'林中人記住了那道遠去的腳步聲，許久之後才獨自起身。'},
 rely:{warm:'對方溫聲道：「放心。你肯信我，我便會好好守著你。」',reserved:'對方按住翻湧靈氣，只低聲道：「別怕。我在。」',free:'對方笑意收斂，語氣難得認真：「交給我。這一次你只管走完自己的周天。」',devoted:'對方一字一句道：「只要我還在，便不會讓你的靈台在我眼前崩散。」'},
 care:{warm:'對方眼中泛起暖意：「原來那些沒有回音的歲月裡，一直有人在找我。」',reserved:'對方垂下眼，半晌才道：「……辛苦你了。下次我會留下消息。」',free:'對方笑著嘆氣：「竟讓你追了這麼遠。這份人情，我怕是還不清了。」',devoted:'對方看著你，聲音微啞：「你真的來了。從今往後，我不會再讓你這樣找我。」'},
 possible:{warm:'對方耳尖微紅，卻沒有移開目光：「那便等到我們都願意時，再由我們親口決定。」',reserved:'對方沉默了一會兒：「……我並不討厭這個可能。」',free:'對方忽然笑了：「好啊。旁人如何叫不重要，我倒想聽你有朝一日親口說。」',devoted:'對方目光灼然：「可能二字，我記下了。總有一天，我會等到你把它說成肯定。」'},
 welcome:{warm:'對方回首一笑：「好。下次我帶新茶來——若不好喝，你也得陪我喝完。」',reserved:'對方腳步微停，唇角有一點藏不住的笑：「嗯。我會再來。不是路過。」',free:'對方倒退著朝你揮手：「說定了！下回可別裝閉關躲我。」',devoted:'對方回望洞府燈火，眼神安定下來：「只要你還願意留這盞燈，我就一定會再來。」'},
 skip:{warm:'門外安靜了一會兒。對方把茶壺輕輕放在石階上：「好，你先忙。茶還溫著，記得喝。」',reserved:'禁制外的人沉默片刻，只留下一句傳音：「知道了。別忘了歇息。」',free:'對方敲了敲禁制，故意笑道：「行吧，這壺茶先欠著。下回可要連本帶利陪我喝。」',devoted:'對方在門外站了很久，最後仍只溫聲道：「我不擾你。若需要我，傳訊便是。」'}
};
function partnerReactionTone(bond,accord,flag){if(flag==='leave'||flag==='skip'||bond<0||accord<0)return 'distant';if(['rely','care','possible','welcome'].includes(flag)||bond>=2)return 'close';if(accord>=2)return 'thoughtful';return 'neutral'}
function partnerChoiceReaction(event,raw,index){const [,bond=0,accord=0,flag='']=raw,personality=state.partnerStory?.personality||'warm';if(partnerFlagReactions[flag]?.[personality])return partnerFlagReactions[flag][personality];const tone=partnerReactionTone(bond,accord,flag),pool=partnerReactionVoices[personality]?.[tone]||partnerReactionVoices.warm.neutral,voice=pool[(event.chapter*7+event.step*3+index)%pool.length],beat=partnerReactionBeats[event.chapter-1]?.[event.step]||'';return `${beat}${beat?' ':''}${voice}`}
function partnerEndingReaction(index){const eligible=partnerEndingEligible(),accepted=eligible&&index===0,personality=state.partnerStory?.personality||'warm';const lines=accepted?{warm:'對方眼裡一下有了水光，笑著把手放進你掌心：「好。那往後累了就一起歇，迷路了也一起找。長生這麼久，我們慢慢走。」',reserved:'對方久久沒有說話，握住你時掌心竟有些發顫：「……好。往後我若又把心事藏起來，你記得提醒我——我們已經不是一個人了。」',free:'對方先笑，笑著笑著卻紅了眼眶：「那便說定了！天地再大也一起去看。誰敢偷偷先走，誰就欠對方一萬年的酒。」',devoted:'對方緊緊回握住你，又怕弄疼似的放輕力道：「我等這句話等了太久。從今往後，我不只陪你赴生死，也陪你過每一個尋常日子。」'}:eligible?{warm:'對方眼裡的笑慢慢淡下去，仍輕聲道：「我明白。謝謝你沒有用一句假話哄我。只是今日，容我先自己走一段。」',reserved:'對方收回手，藏進袖中：「好，我尊重你。」停了一會兒，又低聲補道，「但若我走得快些，不是怨你，只是怕自己回頭。」',free:'對方安靜了片刻，才重新笑起來：「也好。同行本就不只有一種模樣——不過今日這頓酒，你可得讓我先醉一場。」',devoted:'對方許久沒有出聲，最後勉強彎了彎唇：「我不會逼你。只是別要求我立刻放下……我還需要很長一段時間，學會把這份心意安放好。」'}:{warm:'對方替你理了理衣襟，像往常那樣溫聲道：「能同行至此，已經很好。往後若累了，仍可以回來喝一盞茶。」',reserved:'對方輕輕頷首：「這段歲月，我會記得。」走出幾步，又回頭道，「你也要好好走。」',free:'對方舉杯與你輕輕一碰：「路不同又如何？山高水長，總有再見的一日。到時別裝作不認識我。」',devoted:'對方凝望著你，像要把這一刻記得更久：「即使不能並肩到最後，我也不後悔曾真心走過這一程。你不必覺得虧欠。」'};return lines[personality]||lines.warm}
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
function partnerRenderEnding(event,content){if(event.reaction)return partnerRenderReaction(event,content);const s=state.partnerStory,eligible=partnerEndingEligible(),ending=eligible?'兩心同道':s.bond>=3?'有情未同道':s.accord>=3?'同道未有情':'各自長生';const question=eligible?`對方望著你，像平日那樣喚了一聲「${state.name}」，後面的話卻停了很久才說出口：「長生路太長了。我不敢許諾永遠沒有爭執，也不敢說每一步都能走對……可若是與你一起，我想試試。你願意嗎？」`:`夕照落在你們之間。該說的、沒能說的，都在這場相逢裡有了答案。你們沒有責怪彼此，只是安靜地把這段同行珍重收好。`;event.choices=eligible?[partnerChoice('我願意'),partnerChoice('仍選擇獨行')]:[partnerChoice('記住這段歲月')];const visual=eligible?`<div class="partner-visual-stage"><img class="partner-dialogue-art" src="${partnerArt('dialogue')}" alt="${s.gender}修士半身像"></div>`:'<div class="partner-visual-stage partner-narration-stage"></div>',speaker=eligible?`<h2>${partnerDisplayName()}</h2>`:'';content.innerHTML=`<section class="partner-story partner-ending" style="--partner-scene:url('${partnerScene(10)}')">${visual}<div class="partner-dialogue-card"><small>${event.title}・${ending}</small>${speaker}<p>${question}</p></div><div class="partner-choice-panel encounter-choices">${event.choices.map((c,i)=>`<button data-partner-ending="${i}"><b>${c.label}</b></button>`).join('')}</div></section>`;document.querySelectorAll('[data-partner-ending]').forEach(b=>b.onclick=()=>partnerChooseEnding(event,+b.dataset.partnerEnding))}
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
