import { rssItems, value } from './rss';
import {plain,parseDate,parseContact,buyerInfo,classify,safeSourceUrl} from '../normalise';
import type {Buyers,ParsedTender} from '../types';
export function parseVendorPanel(xml:string,buyers:Buyers,warn:(s:string)=>void=console.warn):ParsedTender[] {
 return rssItems(xml).map(item=>{
 const html=value(item.description);
 const labels=[...html.matchAll(/<b>\s*(Tender Details|Issued by|Closing Date|Reference number|Contact person|Tender categories|Specification Docs)\s*:?\s*<\/b>\s*:?\s*/gi)];
 const fields:Record<string,string>={};
 labels.forEach((m,i)=>{fields[m[1].toLowerCase()]=plain(html.slice(m.index!+m[0].length,labels[i+1]?.index??html.length));});
 const id=value(item.guid); const buyer=fields['issued by']; const title=plain(value(item.title));
 if(!id||!buyer||!title||!fields['closing date']) throw new Error('Incomplete VendorPanel item; refusing partial snapshot');
 const raw=fields['closing date']; const description=fields['tender details']??'';
 const info=buyerInfo(buyer,raw,buyers,warn);
 const docs=fields['specification docs'];
 return {id,source:'vendorpanel',reference:fields['reference number']??null,title,description,buyer,buyerType:info.buyerType,state:info.state,
 categories:(Array.isArray(item.category)?item.category:[]).map(c=>value(c)),requestType:classify(title,description),
 closingAt:parseDate(raw,warn,`VendorPanel ${id} closingAt`),closingAtRaw:raw,
 publishedAt:parseDate(value(item.pubDate),warn,`VendorPanel ${id} publishedAt`),contact:parseContact(fields['contact person']),
 documentCount:docs&&/^\d+$/.test(docs)?Number(docs):null,sourceUrl:safeSourceUrl(value(item.link),'vendorpanel')};
 });
}
