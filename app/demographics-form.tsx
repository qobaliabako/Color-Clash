'use client';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Select,SelectTrigger,SelectValue,SelectContent,SelectItem} from '@/components/ui/select';
import {AGE_OPTIONS,GENDER_OPTIONS,type Demographics} from '@/lib/demographics';

/** Appears after all timed trials; skipping never removes task responses. */
export default function DemographicsForm({onFinish}:{onFinish:(data:Demographics)=>void}){
 const [age,setAge]=useState<Demographics['age_group']>(null);
 const [gender,setGender]=useState<Demographics['gender']>(null);
 return <form onSubmit={e=>{e.preventDefault();onFinish({age_group:age,gender});}}>
  <p className="eyebrow">Timed task complete</p><h1>Two optional questions</h1>
  <p>Your timed responses have reached the server. These answers help describe who took part and are saved with your session code. You may leave either question blank or skip both.</p>
  <div className="demographics-field"><label htmlFor="age-group">Age group <span>(optional)</span></label>
   <Select value={age??''} onValueChange={v=>setAge(v as Demographics['age_group'])}>
    <SelectTrigger id="age-group" className="demographics-select"><SelectValue placeholder="Select an age group"/></SelectTrigger>
    <SelectContent>{AGE_OPTIONS.map(o=><SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
   </Select>
  </div>
  <div className="demographics-field"><label htmlFor="gender">How do you describe your gender? <span>(optional)</span></label>
   <Select value={gender??''} onValueChange={v=>setGender(v as Demographics['gender'])}>
    <SelectTrigger id="gender" className="demographics-select"><SelectValue placeholder="Select a gender option"/></SelectTrigger>
    <SelectContent>{GENDER_OPTIONS.map(o=><SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
   </Select>
  </div>
  <div className="demographics-actions"><Button type="submit" className="primary-action">Save and finish</Button><Button type="button" variant="ghost" onClick={()=>onFinish({age_group:null,gender:null})}>Skip both and finish</Button></div>
 </form>;
}
