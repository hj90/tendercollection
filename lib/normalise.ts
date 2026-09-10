import { DateTime } from 'luxon';
import he from 'he';
import type { Buyers, RequestType, State, Tender } from './types';
export const plain = (value:string) => he.decode(value.replace(/<br\s*\/?\s*>/gi,'\n').replace(/<\/p\s*>/gi,'\n').replace(/<[^>]*>/g,'')).replace(/\r/g,'').trim();
export const normaliseName = (s:string) => s.toLowerCase().replace(/[^a-z0-9]/g,'');
export function classify(title:string, description:string):RequestType {
 const forward = /\b(?:forward notice|advance[d]? (?:tender )?notice|prior information notice|future tender|intention to (?:go to market|invite)|do not (?:respond|submit)|no (?:need to provide a response|response (?:is )?required))\b/i;
 if(forward.test(title+' '+description)) return 'forward-notice';
 const rules:[RequestType,RegExp][] = [['panel',/\b(?:prequalified|pre-qualified|standing offer|preferred supplier|supplier (?:panel|register)|panel arrangement)\b/i],['eoi',/\b(?:eoi|expressions? of interest)\b/i],['rfq',/\b(?:rfq|requests? for quot(?:e|es|ation|ations))\b/i],['rfp',/\b(?:rfp|requests? for proposals?)\b/i],['rft',/\b(?:rft|requests? for tenders?|invitation to tender)\b/i]];
 for(const text of [title,description]) for(const [type,re] of rules) if(re.test(text)) return type;
 return 'other';
}
export function parseDate(raw:string|null, warn:(s:string)=>void, context:string):string|null {
 if(raw) {
 const m=raw.match(/(\d{1,2}\/\w{3}\/\d{4}\s+\d{1,2}:\d{2}\s*[AP]M)\s*\(UTC([+-]\d{2}:\d{2})\)/i);
 const date=m ? DateTime.fromFormat(`${m[1]} ${m[2]}`,'d/LLL/yyyy h:mm a ZZ',{locale:'en',setZone:true}) : DateTime.fromISO(raw,{setZone:true});
 if(date.isValid) return date.toUTC().toISO();
 const rfc=DateTime.fromRFC2822(raw,{setZone:true});
 if(rfc.isValid) return rfc.toUTC().toISO();
 }
 warn(`${context}: unparseable date ${JSON.stringify(raw)}`); return null;
}
export function buyerInfo(buyer:string,raw:string|null,buyers:Buyers,warn:(s:string)=>void) {
 const match=buyers[buyer] ?? Object.entries(buyers).find(([name])=>normaliseName(name)===normaliseName(buyer))?.[1];
 if(match) return {state:match.state,buyerType:match.type,mapped:true};
 warn(`Buyer map miss: ${buyer}`);
 const labels:Record<string,State>={Brisbane:'QLD',Adelaide:'SA',Perth:'WA',Hobart:'TAS',Darwin:'NT'};
 const state=Object.entries(labels).find(([label])=>raw?.includes(label))?.[1]??null;
 return {state,buyerType:null,mapped:false};
}
export function parseContact(raw:string|null):Tender['contact'] {
 if(!raw || /^not disclosed$/i.test(raw.trim())) return null;
 const email=raw.match(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/i)?.[0];
 const phone=raw.match(/(?:Tel(?:ephone)?|Phone)\s*:\s*([+\d()\s-]+)/i)?.[1]?.trim();
 const name=raw.split(/Email\s*:|Tel(?:ephone)?\s*:|Phone\s*:/i)[0].trim();
 return {raw,...(name?{name}:{}),...(email?{email}:{}),...(phone?{phone}:{})};
}
export function safeSourceUrl(raw:string,source:'vendorpanel'|'austender'|'nsw') {
 const url=new URL(raw); const domain=source==='vendorpanel'?'vendorpanel.com.au':'tenders.gov.au';
 const allowed=source==='nsw'?'buy.nsw.gov.au':domain;
 if(!['https:','http:'].includes(url.protocol)||!(url.hostname===allowed||url.hostname.endsWith('.'+allowed))) throw new Error('Unexpected source URL');
 return url.href;
}
