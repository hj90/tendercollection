import { DateTime } from 'luxon';
import { load } from 'cheerio';
import { rssItems, value } from './rss';
import { plain, parseDate, classify, safeSourceUrl } from '../normalise';
import type { ParsedTender, State } from '../types';

type Warn = (message:string)=>void;
export type AusTenderSeed = Pick<ParsedTender,'id'|'sourceUrl'|'title'|'description'|'publishedAt'> & {reference:string};
export const AUSTENDER_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 TenderCollection/1.0 (+https://tendercollection.vercel.app/about/)';

export function noticeUrl(raw:string):string {
 const url=new URL(safeSourceUrl(raw,'austender'));
 if(url.protocol!=='https:' || url.hostname!=='www.tenders.gov.au' || !/^\/(Atm|Advert)\/Show\/[a-f0-9-]{36}$/i.test(url.pathname) || url.search || url.hash) throw new Error(`Unexpected AusTender notice URL: ${raw}`);
 return url.href;
}

// The real RSS schema contains only title/link/description/guid/pubDate.
export function parseAusTender(xml:string,warn:Warn=console.warn):AusTenderSeed[] {
 const seeds=rssItems(xml).map(item=>{
 const sourceUrl=noticeUrl(value(item.link));const id=noticeUrl(value(item.guid));
 const title=plain(value(item.title));const separator=title.indexOf(':');
 if(id!==sourceUrl || separator<1 || !title.slice(separator+1).trim()) throw new Error('Unrecognised AusTender RSS identity/title; retaining snapshot');
 return {id,sourceUrl,reference:title.slice(0,separator).trim(),title:title.slice(separator+1).trim(),description:plain(value(item.description)),publishedAt:parseDate(value(item.pubDate),warn,`AusTender ${id} publishedAt`)};
 });
 if(!seeds.length || seeds.length>1000 || new Set(seeds.map(t=>t.id)).size!==seeds.length) throw new Error('Empty, oversized or duplicate AusTender RSS snapshot');
 return seeds;
}

export function parseAusTenderClosing(raw:string,warn:Warn,context:string):string|null {
 const match=raw.match(/^(\d{1,2}-[a-z]{3}-\d{4})\s+(\d{1,2}:\d{2})\s*(am|pm)\s*\((ACT Local Time|AEST|AEDT)\)$/i);
 if(match){
 const zone=match[4].toUpperCase()==='AEST'?'UTC+10':match[4].toUpperCase()==='AEDT'?'UTC+11':'Australia/Sydney';
 const date=DateTime.fromFormat(`${match[1]} ${match[2]} ${match[3].toUpperCase()}`,'d-MMM-yyyy h:mm a',{locale:'en',zone});
 if(date.isValid)return date.toUTC().toISO();
 }
 warn(`${context}: unparseable closing date ${JSON.stringify(raw)}`);return null;
}

export function parseAusTenderDetail(seed:AusTenderSeed,html:string,warn:Warn=console.warn):ParsedTender {
 const $=load(html);
 const field=(name:string)=>{
 const node=$(`.list-desc label[for="${name}"]`).first().closest('.list-desc').find('.list-desc-inner').first().clone();
 node.find('script,style,a#timeZoneLink').remove();node.find('br').replaceWith('\n');node.find('p').append('\n');
 return node.text().replace(/\r/g,'').split('\n').map(line=>line.replace(/[\t \u00a0]+/g,' ').trim()).filter(Boolean).join('\n');
 };
 const reference=field('AtmId');const buyer=field('Agency');const raw=field('CloseDate').replace(/\s+/g,' ');const category=field('Category');
 if(reference!==seed.reference || !buyer || !raw || !category) throw new Error(`Incomplete/mismatched AusTender detail ${seed.sourceUrl}; retaining entire source snapshot`);
 const closingAt=parseAusTenderClosing(raw,warn,`AusTender ${seed.id}`);
 if(!closingAt)throw new Error(`Cannot safely publish AusTender ${seed.id} without a closing date`);
 const location=field('Locations');const regions=[...new Set(location.match(/\b(?:NSW|VIC|QLD|SA|WA|TAS|NT|ACT)\b/g)??[])];
 const state=regions.length===1?regions[0] as State:null;
 if(!state)warn(`AusTender ${seed.reference}: multi-region or unspecified location ${JSON.stringify(location)}; state left unset`);
 const description=field('Description')||seed.description;
 const classificationText=[description,field('OtherInstructions'),field('Type'),field('PanelArrangement')==='Yes'?'supplier panel':''].join('\n');
 const contactNode=$('.contact-long').first().clone();contactNode.find('.contact-heading').remove();contactNode.find('br').replaceWith('\n');contactNode.find('p').append('\n');
 const rawContact=contactNode.text().split('\n').map(s=>s.trim()).filter(Boolean).join('\n');
 const email=contactNode.find('a[href^="mailto:"]').first().attr('href')?.slice(7).split('?')[0];
 const phone=rawContact.match(/(?:Phone|Telephone|Tel)\s*:\s*([+\d() -]+)/i)?.[1]?.trim();
 const firstLine=rawContact.split('\n')[0];const name=firstLine&&!firstLine.includes(':')?firstLine:undefined;
 return {...seed,source:'austender',buyer,buyerType:'other',state,categories:[category],description,
 requestType:classify(seed.title,classificationText),closingAt,closingAtRaw:raw,
 contact:rawContact?{raw:rawContact,...(name?{name}:{}),...(email?{email}:{}),...(phone?{phone}:{})}:null,documentCount:null};
}

export async function enrichAusTender(seeds:AusTenderSeed[],getPage:(url:string)=>Promise<string>,warn:Warn=console.warn):Promise<ParsedTender[]> {
 const records:ParsedTender[]=[];
 // Sequential and bounded: no credentials, document downloads or unrelated portal crawling.
 for(const seed of seeds) records.push(parseAusTenderDetail(seed,await getPage(seed.sourceUrl),warn));
 return records;
}
