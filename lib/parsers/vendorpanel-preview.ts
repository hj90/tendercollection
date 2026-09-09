import {load,type CheerioAPI,type Cheerio} from 'cheerio';
import {DateTime} from 'luxon';
import {plain} from '../normalise';
import type {AnyNode} from 'domhandler';
import type {VendorPanelDetails} from '../types';

const clean=(html:string)=>plain(html).replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
const zone=(raw:string)=>/Daylight/i.test(raw)?'UTC+11':/Central/i.test(raw)?'UTC+9:30':/Western|W\. Australia/i.test(raw)?'UTC+8':'UTC+10';
export function parseVendorPanelPreviewDate(raw:string|null):string|null {
 if(!raw)return null;const value=raw.replace(/\s*\([^)]*\)\s*$/,'').trim();
 for(const format of ['cccc dd LLLL yyyy hh:mm a','cccc d LLLL yyyy hh:mm a','cccc dd LLLL yyyy','cccc d LLLL yyyy','dd/LLL/yyyy hh:mm a','d/LLL/yyyy hh:mm a']){
  const parsed=DateTime.fromFormat(value,format,{locale:'en',zone:zone(raw)});if(parsed.isValid)return parsed.toUTC().toISO();
 }
 return null;
}
function section($:CheerioAPI,title:RegExp):Cheerio<AnyNode>[] {
 const heading=$('.opportunityPreviewMaxHeading').filter((_,el)=>title.test($(el).text().trim())).first();if(!heading.length)return [];
 return heading.nextUntil('.opportunityPreviewMaxHeading','.opportunityPreviewInnerRow').toArray().map(el=>$(el));
}
function fields($:CheerioAPI){const result=new Map<string,string>();$('.opportunityPreviewInnerRow').each((_,el)=>{const row=$(el);const name=row.find('.opportunityPreviewMinHeading').first().text().trim().toLowerCase().replace(/:\s*$/,'');const content=row.find('.opportunityPreviewContent').first();if(name&&content.length&&!result.has(name))result.set(name,clean(content.html()??''));});return result;}
const dated=(value:string)=>parseVendorPanelPreviewDate(value)||null;
export function parseVendorPanelPreview(html:string):VendorPanelDetails {
 const $=load(html);if(!$('.opportunityPreviewMinHeading').length||!/VP Reference/i.test($.text()))throw new Error('Invalid VendorPanel public preview');const map=fields($);
 const raw=(name:string)=>map.get(name)??null;
 const textSection=(title:RegExp)=>section($,title)[0]?.find('.opportunityPreviewContent').first().html();
 const opportunityHtml=textSection(/^What the buyer is requesting$/i);
 const buyerQuestions=section($,/^Questions asked by the buyer$/i).map(row=>clean(row.find('.opportunityPreviewContent').html()??'')).filter(Boolean);
 const serviceRegions=section($,/^Regions of Service$/i).flatMap(row=>row.find('.opportunityPreviewContent li').toArray().map(el=>clean($(el).html()??''))).filter(Boolean);
 const publicQuestions=section($,/^Information requested by others$/i).flatMap(row=>{
  const heading=clean(row.find('.opportunityPreviewMinHeading').html()??'');const body=clean(row.find('.opportunityPreviewContent').html()??'');if(!body||/^None\.\.\.$/i.test(body))return [];
  const match=body.match(/Question:\s*([\s\S]*?)(?:Answered on\s*(\d{1,2}\/\w{3}\/\d{4}\s+\d{1,2}:\d{2}\s+[AP]M)\s*:\s*([\s\S]*))?$/i);
  return [{askedAt:dated(heading),question:(match?.[1]??body).trim(),answeredAt:dated(match?.[2]?.trim()??''),answer:match?.[3]?.trim()||null}];
 });
 const updates=section($,/^Updates made to this Request$/i).flatMap(row=>{const description=clean(row.find('.opportunityPreviewContent').html()??'');if(!description||/^None\.\.\.$/i.test(description))return [];return [{at:dated(clean(row.find('.opportunityPreviewMinHeading').html()??'')),description}];});
 const opensAtRaw=raw('opens'),queryCutoffAtRaw=raw('supplier query cut-off'),expectedDecisionAtRaw=raw('expected decision');
 return {opportunityDescription:opportunityHtml?clean(opportunityHtml):null,buyerAddress:raw('location'),buyerWebsite:raw('website'),buyerDescription:raw('business info'),buyerReference:raw('buyers reference #'),opensAt:dated(opensAtRaw??''),opensAtRaw,queryCutoffAt:dated(queryCutoffAtRaw??''),queryCutoffAtRaw,expectedDecisionAt:dated(expectedDecisionAtRaw??''),expectedDecisionAtRaw,
  background:textSection(/^Background information/i)?clean(textSection(/^Background information/i)!):null,desiredOutcomes:textSection(/^Desired Outcomes/i)?clean(textSection(/^Desired Outcomes/i)!):null,buyerQuestions,serviceRegions,publicQuestions,updates};
}
