import { DateTime } from 'luxon';
import {rssItems,value} from './rss';
import {plain,parseDate,classify,parseContact,safeSourceUrl} from '../normalise';
import type {ParsedTender,State} from '../types';
// RSS only. Until a live unblocked feed can be inspected, unknown schemas fail closed.
export function parseAusTender(xml:string,warn:(s:string)=>void=console.warn):ParsedTender[] {
 return rssItems(xml).map(item=>{
 const description=plain(value(item.description));
 const field=(...names:string[])=>{for(const name of names){const direct=Object.entries(item).find(([key])=>key.toLowerCase().split(':').pop()===name.toLowerCase());if(direct&&value(direct[1]))return value(direct[1]); const line=description.split('\n').find(l=>l.toLowerCase().startsWith(name.toLowerCase()+':'));if(line)return line.slice(line.indexOf(':')+1).trim();}return null;};
 const id=value(item.guid);const title=plain(value(item.title));const buyer=field('Agency','Agency Name','buyer');
 if(!id||!title||!buyer)throw new Error('Unrecognised AusTender RSS item schema; snapshot retained');
 const raw=field('Closing Date','Close Date & Time','Close Date','closingDate');
 let closingAt:string|null=null;
 if(raw){const au=DateTime.fromFormat(raw.replace(/\s+(?:AEST|AEDT)$/,''),'d-MMM-yyyy h:mm a',{locale:'en',zone:raw.endsWith('AEST')?'UTC+10':raw.endsWith('AEDT')?'UTC+11':'Australia/Sydney'});closingAt=au.isValid?au.toUTC().toISO():parseDate(raw,warn,`AusTender ${id} closingAt`);}else warn(`AusTender ${id}: unparseable date null`);
 const location=field('Location','Location of Services','state');
 const states:Record<string,State>={'New South Wales':'NSW',Victoria:'VIC',Queensland:'QLD','South Australia':'SA','Western Australia':'WA',Tasmania:'TAS','Northern Territory':'NT','Australian Capital Territory':'ACT'};
 const state=location&&(states[location]??(['NSW','VIC','QLD','SA','WA','TAS','NT','ACT'].includes(location)?location as State:null))||null;
 if(location&&!state)warn(`AusTender ${id}: multi-region or unknown location ${location}; state left unset`);
 return {id,source:'austender',reference:field('ATM ID','reference'),title,description,buyer,buyerType:'other',state,
 categories:(Array.isArray(item.category)?item.category:[]).map(value),requestType:classify(title,description),closingAt,closingAtRaw:raw,
 publishedAt:parseDate(value(item.pubDate),warn,`AusTender ${id} publishedAt`),contact:parseContact(field('Contact','Contact Officer')),documentCount:null,sourceUrl:safeSourceUrl(value(item.link),'austender')};
 });
}
