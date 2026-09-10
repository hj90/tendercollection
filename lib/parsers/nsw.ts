import {DateTime} from 'luxon';
import {classify,parseDate,safeSourceUrl} from '../normalise';
import type {ParsedTender} from '../types';

type NSWJob={company:string;description:string|null;jobType:string|null;location:string|null;postedDate:string|null;salary?:string|null;title:string;url:string};
type NSWData={jobs:NSWJob[]};
type NSWDetail={description?:string;links?:{url?:string}[];metadata?:{category?:string;closeDate?:string;managedBy?:string;opportunityID?:string;opportunityId?:string;primaryContact?:string;primaryContactName?:string;primaryContactEmail?:string;primaryContactPhone?:string;publishDate?:string;type?:string};sections?:{heading:string;content:string}[];title?:string};

function requestType(job:NSWJob){
 const sourceType=job.jobType?.toLowerCase()??'';
 if(/expression of interest|\beoi\b/.test(sourceType))return 'eoi' as const;
 if(/request for quote|\brfq\b/.test(sourceType))return 'rfq' as const;
 if(/request for proposal|\brfp\b/.test(sourceType))return 'rfp' as const;
 if(/request for tender|\brft\b/.test(sourceType))return 'rft' as const;
 return classify(job.title,job.description??'');
}

export function parseNSW(data:NSWData,warn:(message:string)=>void):ParsedTender[]{
 if(!data||!Array.isArray(data.jobs))throw new Error('NSW snapshot has no jobs array');
 const records=data.jobs.map((job,index)=>{
  if(!job.title||!job.company||!job.url)throw new Error(`NSW job ${index} is missing required fields`);
  const sourceUrl=safeSourceUrl(job.url,'nsw');
  const publishedAt=job.postedDate?parseDate(DateTime.fromFormat(job.postedDate,'d-LLL-yyyy HH:mm',{locale:'en',zone:'Australia/Sydney'}).toISO()??job.postedDate,warn,`NSW job ${job.url}`):null;
    return {id:new URL(sourceUrl).pathname.split('/').filter(Boolean).pop()??sourceUrl,source:'nsw' as const,reference:null,title:job.title,description:job.description?.trim()??'',buyer:job.company,buyerType:null,state:'NSW' as const,categories:[],requestType:requestType(job),closingAt:null,closingAtRaw:null,publishedAt,contact:null,documentCount:null,sourceUrl};
 });
 if(new Set(records.map(record=>record.id)).size!==records.length)throw new Error('Duplicate NSW opportunity identifiers');
 return records;
}

export function parseNSWDetail(data:NSWDetail,sourceUrl:string,warn:(message:string)=>void):ParsedTender{
 const metadata=data.metadata??{};
 const overview=data.sections?.find(section=>section.heading==='Overview')?.content??'';
 const field=(name:string)=>overview.match(new RegExp(`(?:^|\\n)${name}:\\n([^\\n]*)`,'i'))?.[1]?.trim()??null;
 const source=safeSourceUrl(sourceUrl,'nsw');
 const opportunityID=metadata?.opportunityID??metadata?.opportunityId??source.match(/\/([^/]+)\/?$/)?.[1]??source;
 const buyer=metadata?.managedBy??field('Managed')??'NSW Government';
 const publishDate=metadata?.publishDate;
 const title=data.title?.trim()??opportunityID;
 const description=data.description?.trim()??'';
 const date=(raw:string|null,context:string)=>{
  if(!raw){warn(`${context}: missing date`);return null;}
  const date=DateTime.fromFormat(raw,'dd-LLL-yyyy h:mm a',{locale:'en',zone:'Australia/Sydney'});
  if(date.isValid)return date.toUTC().toISO();
  warn(`${context}: unparseable date ${JSON.stringify(raw)}`);return null;
 };
 const publishedAt=publishDate?date(publishDate+' 12:00 PM',`NSW detail ${source} publish date`):null;
 const documents=(data.links??[]).map(link=>link.url?.trim().replace(/^https:\/{2,}/i,'https://')).filter((url):url is string=>Boolean(url&&/^https?:\/\//i.test(url)&&/\.pdf(?:[?#]|$)/i.test(url)));
 const contactName=metadata.primaryContact??metadata.primaryContactName;
 const contactParts=[contactName,metadata.primaryContactEmail,metadata.primaryContactPhone].filter(Boolean);
 return {id:opportunityID,source:'nsw',reference:opportunityID,title,description,buyer,buyerType:null,state:'NSW',categories:metadata.category?metadata.category.split(',').map(category=>category.trim()).filter(Boolean):[],requestType:requestType({title,description,jobType:metadata.type??null,company:buyer,location:null,postedDate:null,url:source}),closingAt:date(metadata.closeDate??null,`NSW detail ${source} close date`),closingAtRaw:metadata.closeDate??null,publishedAt,contact:contactName?{name:contactName,...(metadata.primaryContactEmail?{email:metadata.primaryContactEmail}:{}),...(metadata.primaryContactPhone?{phone:metadata.primaryContactPhone}:{}),raw:contactParts.join('\n')}:null,documents,documentCount:documents.length,sourceUrl:source};
}