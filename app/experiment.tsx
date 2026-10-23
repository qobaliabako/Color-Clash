'use client';
import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Checkbox} from '@/components/ui/checkbox';
import DemographicsForm from './demographics-form';
import type {Demographics} from '@/lib/demographics';
import {CUES,COLOURS,KEYS,RGB,VERSION,isMode,isResearch,makeTask,makePractice,type Mode,type ResponseRow} from '@/lib/task';
import {Engine,Interrupted,estimateRefresh} from '@/lib/engine';
import {Uploader,readDraft,writeDraft,DRAFT_KEY,RECEIPT_KEY,type Draft} from '@/lib/upload';
type Stage='start'|'connecting'|'keys'|'practice_intro'|'running'|'task_intro'|'break'|'survey'|'demographics'|'saving'|'done'|'stopped'|'recovery';
type Answer={question:string,answer:string,cue?:string,context?:string,frame?:string};
export default function Experiment({researcherSignedIn=false,signInPath='/signin-with-chatgpt?return_to=%2Fresearch'}:{researcherSignedIn?:boolean,signInPath?:string}){
 const [mode,setMode]=useState<Mode>('research'),[stage,setStage]=useState<Stage>('start');
 const [consent,setConsent]=useState(false),[informed,setInformed]=useState(false),[desktop,setDesktop]=useState(true);
 const [error,setError]=useState(''),[message,setMessage]=useState(''),[id,setId]=useState(''),[expectedKey,setExpectedKey]=useState('d');
 const [questionIndex,setQuestionIndex]=useState(0),[questions,setQuestions]=useState<{text:string,question:string,choices:string[],keys:string[],cue?:string,context?:string,frame?:string}[]>([]);
 const [receipt,setReceipt]=useState<{id:string,token:string,status:string}|null>(null);
 const demographicsGate=useRef<((data:Demographics)=>void)|null>(null);
 const canvas=useRef<HTMLCanvasElement>(null),engine=useRef<Engine|null>(null),uploader=useRef<Uploader|null>(null),gate=useRef<(()=>void)|null>(null),answerGate=useRef<((answer:string)=>void)|null>(null),skipSurvey=useRef(false),stageRef=useRef<Stage>('start');
 const transition=(s:Stage)=>{stageRef.current=s;setStage(s);};
 useEffect(()=>{
  const m=new URLSearchParams(location.search).get('mode');if(isMode(m))setMode(m);
  setDesktop(innerWidth>=800&&innerHeight>=500&&!/Mobi|Android/i.test(navigator.userAgent));
  const pending=readDraft();if(pending){uploader.current=new Uploader(pending);setId(pending.id||'Pending connection');setMode(pending.mode);transition('recovery');}
  try{const r=JSON.parse(localStorage.getItem(RECEIPT_KEY)||'null');setReceipt(r);setInformed(!!r);}catch{}
  const onKey=(e:KeyboardEvent)=>{if(!e.isTrusted||e.repeat)return;if(e.code==='Space'&&gate.current){e.preventDefault();const done=gate.current;gate.current=null;done();}};
  window.addEventListener('keydown',onKey);return()=>{window.removeEventListener('keydown',onKey);};
 },[]);
 // Stable task-status tool; no tool can manufacture a human response.
 useEffect(()=>{const context=(document as unknown as {modelContext?:{registerTool:(tool:unknown,options:unknown)=>unknown}}).modelContext;if(!context?.registerTool)return;const c=new AbortController();void Promise.resolve(context.registerTool({name:'get_color_clash_status',description:'Read the current task stage and whether this browser has pending responses. Does not start the task or provide responses.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute(input:unknown){if(!input||typeof input!=='object'||Object.keys(input).length)throw Error('Expected empty input');return {stage:stageRef.current,pending_upload:!!readDraft(),mode:uploader.current?.draft.mode??mode};}},{signal:c.signal})).catch(()=>{});return()=>c.abort();},[mode]);
 // Questionnaire key answers use the current question, without stale closures.
 useEffect(()=>{if(stage!=='survey')return;const onKey=(e:KeyboardEvent)=>{if(!e.isTrusted||e.repeat)return;const q=questions[questionIndex],i=q?.keys.indexOf(e.key.toLowerCase())??-1;if(i>=0&&answerGate.current){e.preventDefault();const done=answerGate.current;answerGate.current=null;done(q.choices[i]);}if(e.key==='Escape'&&answerGate.current){skipSurvey.current=true;const done=answerGate.current;answerGate.current=null;done('skip');}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);},[stage,questionIndex,questions]);
 useEffect(()=>{if(!['practice_intro','task_intro','break'].includes(stage))return;const onKey=(e:KeyboardEvent)=>{if(e.key==='Escape'){engine.current?.stop('aborted');gate.current?.();gate.current=null;}};window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);},[stage]);
 function continueGate(){const done=gate.current;gate.current=null;done?.();}
 async function screen(s:Stage,text:string){setMessage(text);transition(s);await new Promise<void>(resolve=>gate.current=resolve);engine.current?.check();}
 async function start(){
  setError('');transition('connecting');
  try{
   if(readDraft())throw Error('A saved session still needs uploading. Refresh this page.');
   localStorage.setItem('color-clash-storage-check','ok');localStorage.removeItem('color-clash-storage-check');
   if(document.documentElement.requestFullscreen)try{await document.documentElement.requestFullscreen();}catch{}
   await document.fonts.ready;const refresh=await estimateRefresh();
   if(!refresh.stable||refresh.hz<20||refresh.hz>500)throw Error('Display timing was unstable. Close other apps and try again before starting.');
   const token=[...crypto.getRandomValues(new Uint8Array(32))].map(b=>b.toString(16).padStart(2,'0')).join('');
   const draft:Draft={clientId:crypto.randomUUID(),token,mode,appVersion:VERSION,knowledge:informed||mode==='research_check'?'technical/informed':'new participant',metadata:{user_agent:navigator.userAgent.slice(0,300),width:innerWidth,height:innerHeight,pixel_ratio:devicePixelRatio,refresh_hz:refresh.hz,refresh_stable:refresh.stable,fullscreen:!!document.fullscreenElement,time_origin:performance.timeOrigin},rows:[],ack:0};
   writeDraft(draft);const up=new Uploader(draft);uploader.current=up;const reserved=await up.reserve();setId(reserved.id);
   const keys=isResearch(mode)?['d','f','j']:['d','f','j','k'];const en=new Engine(canvas.current!,refresh.period,keys,!!document.fullscreenElement);engine.current=en;
   for(const key of keys){setExpectedKey(key);transition('keys');await en.waitKey(key);}
   let passed=false;
   for(let attempt=1;attempt<=2;attempt++){
    await screen('practice_intro',attempt===1?'Respond to the ink colour. Ignore the word'+(isResearch(mode)?' and its outline.':'.')+' Practice includes feedback and a key guide.':'Let’s practise the key mapping once more. Respond to the ink colour.');
    transition('running');const practice=await makePractice(mode,reserved.seed,attempt);const rows:ResponseRow[]=[];
    for(const t of practice){const row=await en.trial(t,draft.rows.length,true);up.record(row);rows.push(row);await en.after(row,true);}
    if(rows.reduce((a,r)=>a+r.rt_usable,0)/rows.length>=.8){passed=true;break;}
   }
   if(!passed){en.cleanup();await end('practice_failed',undefined,'The key mapping was not established today. No measured task started.');return;}
   await up.flush();await screen('task_intro',mode==='research_check'?'Technical check: 24 trials. There is no feedback now.':mode==='demo'?'Demonstration: 32 trials. There is no feedback now.':'Respond as quickly and accurately as you can. There is no feedback or key guide now. Please stay on this page and avoid talking or multitasking.');
   const task=makeTask(mode,reserved.seed);transition('running');
   for(let i=0;i<task.length;i++){
    if(mode==='experiment'&&i===64){await up.flush();await screen('break','You may take a short break. Continue when ready.');transition('running');}
    const row=await en.trial(task[i],draft.rows.length,false);up.record(row);await en.after(row,false);
   }
   en.cleanup();engine.current=null;if(document.fullscreenElement)await document.exitFullscreen();
   transition('saving');setMessage('The timed task is finished. Confirming that your responses reached the server…');await up.flush();await up.request({action:'finish',status:'completed'});
   let answers:Answer[]|undefined;
   if(mode==='research'){
    const qs=[{question:'noticed_associations',text:'Did you notice relationships between particular words and colours?'},{question:'noticed_change',text:'Did any word–colour relationships seem to change during the task?'},{question:'used_words',text:'Did you use the words or outlines to anticipate a colour?'},{question:'interruption',text:'Were you distracted or interrupted during the timed task?'}].map(q=>({...q,choices:['yes','no','unsure / prefer not to answer'],keys:['d','f','u']}));
    const all:{text:string,question:string,choices:string[],keys:string[],cue?:string,context?:string,frame?:string}[]=[...qs];
    for(const context of ['A','B'])for(const cue of CUES){const t=task.find(t=>t.context===context&&t.cue===cue)!;all.push({question:'end_colour_estimate',text:`At the END of the task, which colour seemed most common for ${cue} inside the ${t.frame} outline?`,cue,context,frame:t.frame,choices:['red','blue','green','unsure / prefer not to answer'],keys:['d','f','j','u']});}
    setQuestions(all);answers=[];skipSurvey.current=false;transition('survey');
    for(let i=0;i<all.length;i++){setQuestionIndex(i);const answer=await new Promise<string>(resolve=>answerGate.current=resolve);if(skipSurvey.current){answers=undefined;break;}const q=all[i];answers.push({question:q.question,answer,...(q.cue?{cue:q.cue,context:q.context,frame:q.frame}:{})});}
   }
   // Persist final answers before the optional page, so a refresh can retry them.
   draft.terminal='completed';if(answers)draft.survey=answers;writeDraft(draft);
   transition('demographics');
   const demographics=await new Promise<Demographics>(resolve=>demographicsGate.current=resolve);
   await end('completed',answers,'',demographics);
  }catch(e){engine.current?.cleanup();engine.current=null;if(document.fullscreenElement)try{await document.exitFullscreen();}catch{}
   if(e instanceof Interrupted){await end(e.message==='interrupted'?'interrupted':'aborted',undefined,'The task stopped. Previously completed responses are retained; please do not repeat the measured task.');}
   else{setError(e instanceof Error?e.message:'The task could not continue.');transition(readDraft()?'recovery':'start');}
  }
 }
 async function end(status:string,answers?:Answer[],notice='',demographics?:Demographics){
  transition('saving');setMessage('Saving your session…');setError('');
  try{const up=uploader.current!;await up.finalize(status,answers,demographics);const r=JSON.parse(localStorage.getItem(RECEIPT_KEY)!);setReceipt(r);setId(r.id);setMessage(notice);transition(r.status==='completed'?'done':'stopped');}
  catch(e){setMessage(notice);setError((e instanceof Error?e.message:'Upload unavailable')+'. Your pending responses remain in this browser.');transition('recovery');}
 }
 function answer(value:string){const done=answerGate.current;answerGate.current=null;done?.(value);}
 function finishDemographics(data:Demographics){const done=demographicsGate.current;demographicsGate.current=null;done?.(data);}
 async function retry(){const up=uploader.current;if(!up)return;await end(up.draft.terminal??'aborted',up.draft.survey as Answer[]|undefined);}
 async function withdraw(){if(!receipt||!confirm('Withdraw this session and delete its responses from the research server?'))return;setError('');try{const r=await fetch('/api/sessions/'+receipt.id,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+receipt.token},body:JSON.stringify({action:'withdraw'})});if(!r.ok)throw Error('Withdrawal was not confirmed. Please retry.');localStorage.removeItem(RECEIPT_KEY);setReceipt({...receipt,status:'withdrawn'});}catch(e){setError((e as Error).message);}}
 const colours=isResearch(mode)?COLOURS:[...COLOURS,'yellow'];
 const keyGuide=<div className="key-guide">{colours.map(c=><div key={c}><kbd>{KEYS[c].toUpperCase()}</kbd><span style={{color:RGB[c]}}>{c.toUpperCase()}</span></div>)}</div>;
 return <>
  <canvas ref={canvas} className={'task-canvas '+(stage==='running'?'visible':'')} aria-label="Timed colour-response task"/>
  {stage!=='running'&&<main className="task-shell"><header className="task-header"><a href="/" tabIndex={stage==='start'?0:-1}>Color Clash</a><span>{mode==='research'?'Colour-response task':mode.replace('_',' ')}</span></header>
   <section className="panel">
   {stage==='start'&&<><p className="eyebrow">Desktop or laptop · physical keyboard</p><h1>Respond to the ink colour.</h1><p>Use the keys below. Work quickly and accurately, ignoring the word{isResearch(mode)?' and its outline':''}.</p>{keyGuide}<p className="session-duration">{mode==='research'?'Allow 15–20 minutes, without interruptions.':mode==='research_check'?'Short technical check, including practice.':'Practice followed by a colour-response task.'} Results save automatically. You do not need to install software or choose a participant name.</p><div className="consent-copy"><p>This educational study records a code, key responses, reaction times, brief final answers and browser/display information. At the end, you may optionally provide an age group and your gender. These are sent to the research server for the organiser’s analysis and presentation. Your name, nationality, microphone and camera are not requested.</p><p>Participation is voluntary. ESC stops the task. You can withdraw this browser’s session afterwards. Keep your session code if you need to contact the person who invited you. This is not a diagnosis.</p></div><label className="check-row"><Checkbox checked={consent} onCheckedChange={v=>setConsent(v===true)}/><span>I am at least 18, understand these English instructions, and agree to participate and have my responses saved for this project.</span></label><label className="check-row"><Checkbox checked={informed} onCheckedChange={v=>setInformed(v===true)}/><span>I have already tried this task or read its research design.</span></label>{!desktop&&<p role="alert">Please use a desktop or laptop with a physical keyboard and a window at least 800 × 500 pixels.</p>}<Button className="primary-action" disabled={!consent||!desktop} onClick={start}>Begin</Button><p className="small-note">Use an English keyboard input source. Choose a quiet place, silence notifications and avoid talking or multitasking. Keep display settings fixed.</p></>}
   {stage==='connecting'&&<><h1>Preparing your session</h1><p>Checking display timing and connecting to the research server…</p><p>Please keep this page visible.</p></>}
   {stage==='keys'&&<><p className="eyebrow">Keyboard check</p><h1>Press and release <kbd>{expectedKey.toUpperCase()}</kbd></h1>{keyGuide}<p>Your session is {id}. ESC exits.</p></>}
   {['practice_intro','task_intro','break'].includes(stage)&&<><p className="eyebrow">{stage==='practice_intro'?'Practice':stage==='break'?'Break':'Timed task'}</p><h1>{stage==='practice_intro'?'Learn the keys.':stage==='break'?'Pause before the next block.':'Ready to begin?'}</h1><p>{message}</p>{keyGuide}<Button className="primary-action" onClick={continueGate}>Continue</Button><p className="small-note">Or press and release SPACE. ESC exits.</p></>}
   {stage==='survey'&&questions[questionIndex]&&<><p className="eyebrow">Timed task complete · question {questionIndex+1} of 16</p><h1 className="question">{questions[questionIndex].text}</h1><p>These questions are untimed. You may choose “unsure”.</p><div className="answers">{questions[questionIndex].choices.map((v,i)=><Button variant="outline" key={v} onClick={()=>answer(v)}><kbd>{questions[questionIndex].keys[i].toUpperCase()}</kbd>{v}</Button>)}</div><Button variant="ghost" onClick={()=>{skipSurvey.current=true;answer('skip');}}>Skip remaining questions</Button></>}
   {stage==='demographics'&&<DemographicsForm onFinish={finishDemographics}/>}
   {stage==='saving'&&<><h1>Confirming your saved results</h1><p>{message}</p><p>Keep this page open until confirmation appears.</p></>}
   {stage==='recovery'&&<><p className="eyebrow">Upload needs confirmation</p><h1>Your saved responses are waiting.</h1><p>{message||'A session was started in this browser. We can retry uploading the responses already recorded, without repeating the task.'}</p><p>{id&&`Session: ${id}. `}Do not clear browser storage or switch to another browser before uploading.</p><Button className="primary-action" onClick={retry}>Retry saved upload</Button><p className="small-note">A refreshed or interrupted measured task is retained as an incomplete session; it is not resumed midway.</p></>}
   {(stage==='done'||stage==='stopped')&&<><p className="eyebrow">Server receipt confirmed</p><h1>{stage==='done'?'Your session is saved.':'Your session has stopped.'}</h1><p className="receipt">{id}</p><p>{message||'You can close this page. You do not need to send a file.'}</p>{stage==='done'&&mode==='research'&&<div className="debrief"><h2>What were we exploring?</h2><p>Some words often appeared in particular colours. Halfway through, some of those relationships changed inside one outline. We ask whether that change also affects responses to words whose relationships stay the same.</p><p>Responses may reflect learning, memory retrieval, attention and response preparation. This task measures behaviour; it does not measure brain activity or neurotransmitters. One person’s result does not establish a mechanism or an ability score.</p></div>}{receipt?.status==='withdrawn'?<p>Your server responses have been withdrawn.</p>:<Button variant="outline" onClick={withdraw}>Withdraw this session</Button>}<p className="small-note">Please do not repeat the research task. A second session has prior exposure.</p></>}
   {error&&<p className="error-message" role="alert">{error}</p>}
   </section>{['start','done','stopped'].includes(stage)&&<nav className="research-entry" aria-label="Researcher navigation"><a href="/research">Researcher dashboard</a>{researcherSignedIn?<a href="/signout-with-chatgpt?return_to=%2F" target="_top">Sign out</a>:<a className="research-sign-in" href={signInPath} target="_top">Researcher sign in <span>with ChatGPT</span></a>}</nav>}<footer>Educational exploratory study · {VERSION}</footer>
  </main>}
 </>;
}
