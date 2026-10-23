import {database,reply,researcher} from '@/lib/store';
import {allResearchRecords,csvLine,listSessions,researchRecord,trialCsvFields,trialRows,summaryCsvFields,summaryRow,SESSION_ID} from '@/lib/research';
import {zipStream,type ZipEntry} from '@/lib/zip';
export const dynamic='force-dynamic';
const downloadHeaders=(type:string,name:string)=>({'Content-Type':type,'Content-Disposition':`attachment; filename="${name}"`,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
async function* textChunk(s:string){yield s;}
const records=allResearchRecords;
async function* archive(ids:string[],created:string):AsyncIterable<ZipEntry>{
 yield {name:'README.txt',chunks:textChunk(`Color Clash research export\nCreated: ${created} (UTC)\n\nsession-summary.csv: one row per stored session, including incomplete, withdrawn, and excluded sessions.\ncombined-trials.csv: all retained practice and measured trial responses with session and exclusion fields.\nsessions/<session ID>.json: full research records, exact schedules, trial responses, questionnaire answers, demographics, descriptive results, and exclusion history.\n\nexcluded_from_analysis: 1 = excluded, 0 = included. Exclusion never removes data from this raw export. Apply your analysis rules explicitly.\nexclusion_reason and exclusion_changed_at describe the most recent decision, including reinstatement. Timestamps are ISO 8601 UTC. exclusion_history_json and JSON exclusion_history retain decisions in recorded order.\nExclusion does not recalculate scores or change the scientific protocol.\nMissing questionnaire or demographics data remain blank/null. Withdrawn sessions contain only their remaining records. Permanently deleted sessions and their tombstones are not research records and are not exported.\nCSV is UTF-8 with quoted fields. Structured fields are JSON. Text beginning with spreadsheet formula characters is prefixed with an apostrophe; JSON preserves the original text.\nThe session list is captured at export start; records are read as the archive streams. Active sessions may continue uploading. For a fixed analysis, export after collection closes.\nAuthentication tokens, token hashes, credentials, and client reservation identifiers are never exported.\n`)};
 yield {name:'session-summary.csv',chunks:(async function*(){yield csvLine(summaryCsvFields);for await(const s of records(ids))yield csvLine(summaryCsvFields,summaryRow(s));})()};
 yield {name:'combined-trials.csv',chunks:(async function*(){yield csvLine(trialCsvFields);for await(const s of records(ids))for(const r of trialRows(s))yield csvLine(trialCsvFields,r);})()};
 for await(const s of records(ids))yield {name:`sessions/${s.id}.json`,chunks:textChunk(JSON.stringify(s,null,2))};
}
export async function GET(request:Request){
 if(!researcher(request))return reply({error:'Access denied. Sign in with the researcher account.'},403);
 try{
  const url=new URL(request.url),id=url.searchParams.get('id');
  if(url.searchParams.get('download')==='all'){
   const rows=await database().prepare('SELECT id FROM sessions ORDER BY started,id').all<{id:string}>();
   return new Response(zipStream(archive(rows.results.map(r=>r.id),new Date().toISOString())),{headers:downloadHeaders('application/zip','color-clash-all-results.zip')});
  }
  if(id){
   if(!SESSION_ID.test(id))return reply({error:'Invalid session ID'},400);
   const s=await researchRecord(id);if(!s||s.status==='withdrawn')return reply({error:'No available data'},404);
   if(url.searchParams.get('format')==='csv')return new Response(csvLine(trialCsvFields)+trialRows(s).map(r=>csvLine(trialCsvFields,r)).join(''),{headers:downloadHeaders('text/csv;charset=utf-8',`${id}_trials.csv`)});
   return new Response(JSON.stringify(s,null,2),{headers:downloadHeaders('application/json',`${id}.json`)});
  }
  return reply(await listSessions());
 }catch(e){console.error('Export failed',e);return reply({error:'Research storage is temporarily unavailable.'},503);}
}
