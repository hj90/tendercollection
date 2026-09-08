import {AUSTENDER_USER_AGENT,noticeUrl} from './parsers/austender';
const FEED='https://www.tenders.gov.au/public_data/rss/rss.xml';
export function closedNoticeRedirect(original:string,location:string):string {
 const source=new URL(noticeUrl(original));const destination=new URL(location,source);
 const expected=source.pathname.replace('/Show/','/ShowClosed/');
 if(destination.origin!==source.origin||destination.pathname!==expected||destination.hash||![...destination.searchParams].every(([k,v])=>k==='PreviewMode'&&v==='False'))throw new Error('Unexpected AusTender redirect; snapshot retained');
 return destination.href;
}
export async function getAusTenderText(url:string,warn:(s:string)=>void):Promise<string>{
 if(url!==FEED)noticeUrl(url);
 const headers={'User-Agent':AUSTENDER_USER_AGENT,'Accept':url===FEED?'application/rss+xml, application/xml, text/xml':'text/html'};
 let response=await fetch(url,{headers,redirect:'manual',signal:AbortSignal.timeout(30000)});
 if([301,302,303,307,308].includes(response.status)){
  if(url===FEED)throw new Error('Unexpected RSS redirect');
  const location=response.headers.get('location');if(!location)throw new Error('Missing notice redirect location');
  const closedUrl=closedNoticeRedirect(url,location);
  warn(`AusTender ${url}: following public closed-notice redirect; RSS can lag closure.`);
  response=await fetch(closedUrl,{headers,redirect:'error',signal:AbortSignal.timeout(30000)});
 }
 if(!response.ok)throw new Error(`AusTender HTTP ${response.status}: ${url}`);
 const body=await response.text();if(body.length>10_000_000)throw new Error('Unexpectedly large AusTender response');
 return body;
}
