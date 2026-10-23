import {authorize,append,finish,schedules} from '@/lib/session';
import {database,reply,body,sameOrigin} from '@/lib/store';
import {cleanDemographics} from '@/lib/demographics';
export const dynamic='force-dynamic';
type Context={params:Promise<{id:string}>};
export async function POST(request:Request,context:Context){
 if(!sameOrigin(request))return reply({error:'Invalid origin'},403);
 try{
  const {id}=await context.params;const token=(request.headers.get('authorization')??'').replace(/^Bearer /,'');const s=await authorize(id,token);const b=await body(request);
  if(b.action==='trials'){if(!Array.isArray(b.rows)||b.rows.length<1||b.rows.length>20)throw Error('Invalid batch');return reply({acknowledged:await append(s,b.rows)});}
  if(b.action==='finish'){if(!['completed','aborted','interrupted','practice_failed'].includes(b.status))throw Error('Invalid final status');return reply(await finish(s,b.status));}
  if(b.action==='survey'){
   if(s.status!=='completed'||s.mode!=='research')throw Error('Survey not permitted');
   if(!Array.isArray(b.responses)||b.responses.length!==16)throw Error('Incomplete questionnaire');
   const plan=await schedules(s);const cleaned:Record<string,string>[]=[];
   const questions=['noticed_associations','noticed_change','used_words','interruption'];
   for(let i=0;i<4;i++){const r=b.responses[i];if(r.question!==questions[i]||!['yes','no','unsure / prefer not to answer'].includes(r.answer))throw Error('Invalid answer');cleaned.push({question:r.question,answer:r.answer});}
   for(const context of ['A','B'])for(const cue of ['DAXI','FENU','GOPA','HESI','JONU','KAVO']){
    const r:Record<string,string>=b.responses[cleaned.length],frame=plan.task.find(t=>t.cue===cue&&t.context===context)!.frame!;
    if(r.question!=='end_colour_estimate'||r.cue!==cue||r.context!==context||r.frame!==frame||!['red','blue','green','unsure / prefer not to answer'].includes(r.answer))throw Error('Invalid final-colour answer');
    cleaned.push({question:r.question,cue,context,frame,answer:r.answer});
   }
   await database().prepare('UPDATE sessions SET survey = ?, updated = ? WHERE id = ?').bind(JSON.stringify(cleaned),new Date().toISOString(),s.id).run();return reply({survey_saved:true});
  }
  if(b.action==='demographics'){
   if(s.status!=='completed')throw Error('Demographics require a completed timed task');
   const cleaned=cleanDemographics(b.demographics);
   const result=await database().prepare('UPDATE sessions SET demographics = ?, updated = ? WHERE id = ? AND status = ?').bind(JSON.stringify(cleaned),new Date().toISOString(),s.id,'completed').run();
   if(result.meta.changes!==1)throw Error('Session no longer available');
   return reply({demographics_saved:true});
  }
  if(b.action==='withdraw'){
   await database().batch([database().prepare('DELETE FROM trials WHERE session_id = ?').bind(s.id),database().prepare('UPDATE sessions SET status = ?, saved = 0, metadata = ?, survey = NULL, demographics = NULL, summary = NULL, updated = ? WHERE id = ?').bind('withdrawn','{}',new Date().toISOString(),s.id)]);return reply({withdrawn:true});
  }
  throw Error('Unknown action');
 }catch(e){const message=e instanceof Error?e.message:'Storage error';console.error('Session write rejected',message);return reply({error:message},message==='Session permanently deleted'?410:message.includes('Unauthorized')?403:409);}
}
