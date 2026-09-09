import {DateTime} from 'luxon';
import type {Tender,ParsedTender,ArchivedTender,Source} from './types';
export const key=(t:{source:Source;id:string})=>`${t.source}:${t.id}`;
export function diffSnapshots(active:Tender[],archive:ArchivedTender[],snapshots:Partial<Record<Source,ParsedTender[]>>,now:string) {
 const next:Tender[]=[];const history=new Map(archive.map(t=>[key(t),t]));
 for(const source of ['vendorpanel','austender'] as const){
 const previous=active.filter(t=>t.source===source);const incoming=snapshots[source];
 if(incoming===undefined){next.push(...previous);continue;}
 const unique=new Map<string,ParsedTender>();
 for(const t of incoming){if(t.source!==source)throw new Error('Source mismatch');if(unique.has(key(t)))throw new Error(`Duplicate feed guid ${key(t)}; retaining snapshot`);unique.set(key(t),t);}
 for(const t of previous)if(!unique.has(key(t)))history.set(key(t),{...t,archivedAt:now});
 const old=new Map(previous.map(t=>[key(t),t]));
 for(const [id,t] of unique){const prior=old.get(id)??history.get(id);const changes=[...(prior?.changes??[])].filter(change=>change.field!=='vendorPanelDetails');
 if(prior)for(const field of Object.keys(t) as (keyof ParsedTender)[]){if(field in prior&&JSON.stringify(prior[field])!==JSON.stringify(t[field]))changes.push({field,from:typeof prior[field]==='string'?prior[field] as string:JSON.stringify(prior[field]),to:typeof t[field]==='string'?t[field] as string:JSON.stringify(t[field]),at:now});}
 next.push({...t,firstSeenAt:prior?.firstSeenAt??now,changes});history.delete(id);
 }
 }
 const cutoff=DateTime.fromISO(now).minus({months:12}).toMillis();
 return {tenders:next.sort((a,b)=>key(a).localeCompare(key(b))),archive:[...history.values()].filter(t=>Date.parse(t.archivedAt)>=cutoff).sort((a,b)=>key(a).localeCompare(key(b)))};
}
