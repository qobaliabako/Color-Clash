import {z} from 'zod';
import {database,body,reply,sameOrigin,hash,researcher} from '@/lib/store';
import {VERSION,MODES} from '@/lib/task';
export const dynamic='force-dynamic';
const schema=z.object({clientId:z.string().uuid(),token:z.string().regex(/^[a-f0-9]{64}$/),mode:z.enum(MODES),appVersion:z.enum(['0.4.0-web',VERSION]).default('0.4.0-web'),knowledge:z.enum(['new participant','technical/informed']),consent:z.literal(true),adult:z.literal(true),understands:z.literal(true),test:z.boolean().optional(),metadata:z.object({user_agent:z.string().max(300),width:z.number().int().min(600).max(20000),height:z.number().int().min(400).max(20000),pixel_ratio:z.number().min(.5).max(10),refresh_hz:z.number().min(20).max(500),refresh_stable:z.boolean(),fullscreen:z.boolean(),time_origin:z.number().finite().nonnegative()})});
export async function POST(request:Request){
 if(!sameOrigin(request))return reply({error:'Invalid origin'},403);
 try{
  const b=schema.parse(await body(request)),db=database(),tokenHash=await hash(b.token);
  if(await db.prepare('SELECT id FROM deleted_sessions WHERE client_id = ?').bind(b.clientId).first())return reply({error:'This session was permanently deleted by the researcher.'},410);
  const old=await db.prepare('SELECT id,mode,seed,version,token_hash FROM sessions WHERE client_id = ?').bind(b.clientId).first<{id:string,mode:string,seed:number,version:string,token_hash:string}>();
  if(old){if(old.token_hash!==tokenHash||old.mode!==b.mode)return reply({error:'Conflicting reservation'},409);return reply({id:old.id,seed:old.seed,version:old.version});}
  const limit=await db.prepare('SELECT COUNT(*) AS n FROM sessions').first<{n:number}>();if(limit!.n>=2000)return reply({error:'Collection limit reached. Please contact the organiser.'},429);
  const seed=crypto.getRandomValues(new Uint32Array(1))[0],now=new Date().toISOString();
  const metadata={...b.metadata,consent:true,adult_confirmed:true,english_instructions_understood:true,data_kind:b.test&&researcher(request)?'synthetic_test':'human_behavior',timing_method:'requestAnimationFrame canvas draw estimate and KeyboardEvent.timeStamp; not externally calibrated',physical_timing_calibrated:false,nationality_collected:false};
  await db.batch([
   db.prepare('INSERT INTO mode_counters (mode, number) SELECT ?, 1 WHERE NOT EXISTS (SELECT 1 FROM deleted_sessions WHERE client_id = ?) ON CONFLICT(mode) DO UPDATE SET number = number + 1 WHERE NOT EXISTS (SELECT 1 FROM sessions WHERE client_id = ?) AND NOT EXISTS (SELECT 1 FROM deleted_sessions WHERE client_id = ?)').bind(b.mode,b.clientId,b.clientId,b.clientId),
   db.prepare("INSERT INTO sessions (id,client_id,token_hash,mode,ordinal,seed,version,knowledge,started,updated,metadata) SELECT ? || '_P' || printf('%03d',number), ?, ?, ?, number, ?, ?, ?, ?, ?, ? FROM mode_counters WHERE mode = ? AND NOT EXISTS (SELECT 1 FROM deleted_sessions WHERE client_id = ?) ON CONFLICT(client_id) DO NOTHING").bind(b.mode,b.clientId,tokenHash,b.mode,seed,b.appVersion,b.knowledge,now,now,JSON.stringify(metadata),b.mode,b.clientId)
  ]);
  const s=await db.prepare('SELECT id,seed,version FROM sessions WHERE client_id = ?').bind(b.clientId).first<{id:string,seed:number,version:string}>();if(!s)return reply({error:'This session was permanently deleted by the researcher.'},410);return reply(s,201);
 }catch(e){console.error('Session reservation failed',e instanceof Error?e.message:'unknown');return reply({error:'Could not reserve a session. Check your connection and try again.'},400);}
}
