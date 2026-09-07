import { XMLParser, XMLValidator } from 'fast-xml-parser';
export const value = (v:unknown):string => typeof v==='object' && v!==null ? String((v as Record<string,unknown>)['#text']??'') : String(v??'');
export function rssItems(xml:string):Record<string,unknown>[] {
 if(!xml.trim().startsWith('<')||!/<rss[\s>]/i.test(xml)||XMLValidator.validate(xml)!==true) throw new Error('Response is not valid RSS XML; snapshot retained');
 const doc=new XMLParser({ignoreAttributes:false,parseTagValue:false,trimValues:true,isArray:(name)=>name==='item'||name==='category'}).parse(xml);
 if(!doc.rss?.channel) throw new Error('Missing RSS channel');
 return doc.rss.channel.item??[];
}
