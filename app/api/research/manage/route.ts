import {z} from 'zod';
import {body,reply,researcher,sameOrigin} from '@/lib/store';
import {deleteSessions,setExclusion,SESSION_ID} from '@/lib/research';
export const dynamic='force-dynamic';
const ids=z.array(z.string().regex(SESSION_ID)).min(1).max(100).refine(a=>new Set(a).size===a.length,'Duplicate session IDs');
const schema=z.discriminatedUnion('action',[
 z.object({action:z.literal('delete'),sessionIds:ids,confirmed:z.literal(true),confirmation:z.literal('PERMANENTLY DELETE SELECTED SESSIONS')}).strict(),
 z.object({action:z.literal('exclude'),sessionIds:ids,reason:z.string().trim().min(1).max(1000)}).strict(),
 z.object({action:z.literal('include'),sessionIds:ids,reason:z.string().trim().min(1).max(1000)}).strict()
]);
export async function POST(request:Request){
 if(!researcher(request))return reply({error:'Access denied. Sign in with the researcher account.'},403);
 if(!sameOrigin(request))return reply({error:'Invalid origin'},403);
 let b:z.infer<typeof schema>;try{b=schema.parse(await body(request));}catch{return reply({error:'Select 1–100 sessions. Deletion requires explicit confirmation; analysis changes require a reason.'},400);}
 try{
  if(b.action==='delete')await deleteSessions(b.sessionIds);
  else await setExclusion(b.sessionIds,b.action==='exclude',b.reason);
  return reply({ok:true,sessionIds:b.sessionIds,action:b.action});
 }catch(e){console.error('Research change failed',e);return reply({error:'The change could not be saved. Refresh the session list and try again.'},409);}
}
