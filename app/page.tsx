import Experiment from './experiment';
import {getChatGPTUser,chatGPTSignInPath} from './chatgpt-auth';
export const dynamic='force-dynamic';
export default async function Page(){const user=await getChatGPTUser();return <Experiment researcherSignedIn={!!user} signInPath={chatGPTSignInPath('/research')}/>;}
