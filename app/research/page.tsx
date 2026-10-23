import {getChatGPTUser,chatGPTSignInPath,chatGPTSignOutPath} from '../chatgpt-auth';
import {isResearchOwner} from '@/lib/store';
import {listSessions} from '@/lib/research';
import ResearchDashboard from './research-dashboard';
export const dynamic='force-dynamic';
export default async function Research(){
 const user=await getChatGPTUser();
 if(!user||!isResearchOwner(user.userId,user.email))return <main className="task-shell"><section className="panel"><p className="eyebrow">Color Clash · researcher access</p><h1>{user?'Access denied':'Researcher sign in'}</h1><p>{user?'This account cannot view or manage participant results. Sign in with the researcher account.':'Sign in with ChatGPT to access the researcher dashboard. Only the designated researcher account is allowed.'}</p><div className="research-actions">{user?<a href={chatGPTSignOutPath('/research')} target="_top">Sign out</a>:<a className="research-sign-in" href={chatGPTSignInPath('/research')} target="_top">Researcher sign in <span>with ChatGPT</span></a>}<a href="/">Back to experiment</a></div><p>Participants can complete the experiment without a ChatGPT account.</p></section></main>;
 let data:Awaited<ReturnType<typeof listSessions>>={sessions:[],total:0},error='';
 try{data=await listSessions();}catch{error='Results storage is temporarily unavailable. Please refresh.';}
 return <main className="research"><header><p className="eyebrow">Color Clash · researcher dashboard</p><h1>Research results</h1><p>Signed in as {user.email}</p></header><nav className="research-actions" aria-label="Researcher navigation"><a href="/">Back to experiment</a><a href="/?mode=research_check">Technical check</a><a href={chatGPTSignOutPath('/research')} target="_top">Sign out</a></nav><ResearchDashboard initial={data} initialError={error}/><p className="small-note">IDs are assigned when a session starts, separately for each mode. Incomplete, withdrawn and deleted sessions retain their number. Counters are never reset. Counts are sessions, not necessarily unique people.</p><p className="small-note">Keep human data separate from technical tests and the desktop pilot. Exclusion preserves the raw data and does not change descriptive scores. Choose your recruitment target, stopping date and analysis criteria before analysing volunteer results.</p></main>;
}
