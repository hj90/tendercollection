import test from 'node:test';import assert from 'node:assert/strict';
import {parseDate,classify,buyerInfo} from '../lib/normalise';
import {parseVendorPanel} from '../lib/parsers/vendorpanel';import {parseAusTender} from '../lib/parsers/austender';
import {diffSnapshots} from '../lib/snapshot';import {filterListings,createIndex,compact} from '../lib/search';
import type {ParsedTender,Tender,ArchivedTender} from '../lib/types';
const at='2026-09-07T00:00:00.000Z';
const item:ParsedTender={id:'abc',source:'vendorpanel',reference:'VP1',title:'Request for tender',description:'Bridge maintenance',buyer:'Example Council',buyerType:'council',state:'QLD',categories:['Building Trade, Repairs, Maint.'],requestType:'rft',closingAt:'2026-09-10T07:00:00.000Z',closingAtRaw:'10/Sep/2026 05:00 PM (UTC+10:00) Brisbane time',publishedAt:at,contact:null,documentCount:0,sourceUrl:'https://www.vendorpanel.com.au/PublicTenderAccess.aspx?id=abc'};
const active:Tender={...item,firstSeenAt:at,changes:[]};
test('fixed numeric offsets override timezone labels, including half hours and negative offsets',()=>{
 assert.equal(parseDate('29/Sep/2026 05:00 PM (UTC+10:00) Brisbane time',assert.fail,'date'),'2026-09-29T07:00:00.000Z');
 assert.equal(parseDate('29/Sep/2026 05:00 PM (UTC+09:30) Sydney time',assert.fail,'date'),'2026-09-29T07:30:00.000Z');
 assert.equal(parseDate('29/Sep/2026 05:00 PM (UTC-03:30) Unknown time',assert.fail,'date'),'2026-09-29T20:30:00.000Z');
 let warnings=0;assert.equal(parseDate('bad',()=>warnings++,'date'),null);assert.equal(warnings,1);
});
test('CDATA extraction, XML category boundaries, entity decoding and stable guid',()=>{
 const xml=`<rss><channel><item><title>RFT &amp; works</title><guid isPermaLink="false">abc</guid><link>${item.sourceUrl}</link><pubDate>Mon, 07 Sep 2026 00:00:00 GMT</pubDate><description><![CDATA[<b>Tender Details : </b>Bridge &amp; paths<br />More...<br /><b>Issued by : </b>Example Council<br /><b>Closing Date</b> : ${item.closingAtRaw}<br /><b>Reference number</b> : VP1<br /><b>Contact person</b> : Not disclosed<br /><b>Tender categories</b> : Bad, Fragments<br /><b>Specification Docs</b> : 0]]></description><category>Building Trade, Repairs, Maint.</category><category>Roads &amp; bridges</category></item></channel></rss>`;
 const [t]=parseVendorPanel(xml,{'Example Council':{state:'QLD',type:'council'}},assert.fail);
 assert.deepEqual(t.categories,['Building Trade, Repairs, Maint.','Roads & bridges']);assert.equal(t.description,'Bridge & paths\nMore...');assert.equal(t.id,'abc');assert.equal(t.contact,null);assert.equal(t.documentCount,0);
});
test('blocked or malformed responses cannot masquerade as an empty successful source',()=>{
 assert.throws(()=>parseVendorPanel('<html>403</html>',{}));assert.throws(()=>parseAusTender('<html>403</html>'));assert.throws(()=>parseVendorPanel('<rss><channel><item><title>x</title></item></channel></rss>',{}));
});
test('AusTender namespaced fields map without HTML scraping',()=>{
 const [t]=parseAusTender('<rss xmlns:at="urn:at"><channel><item><guid>atm1</guid><title>RFQ test</title><link>https://www.tenders.gov.au/Atm/Show/atm1</link><description>Information</description><at:Agency>Department X</at:Agency><at:Location>NSW</at:Location><at:closingDate>2026-09-10T17:00:00+10:00</at:closingDate><pubDate>Mon, 07 Sep 2026 00:00:00 GMT</pubDate><category>1234</category></item></channel></rss>',assert.fail);
 assert.equal(t.state,'NSW');assert.equal(t.buyer,'Department X');assert.equal(t.closingAt,'2026-09-10T07:00:00.000Z');
});
test('forward notice precedence dominates RFT and panel keywords',()=>{assert.equal(classify('ADVANCE TENDER NOTICE - RFT','preferred supplier arrangement'),'forward-notice');assert.equal(classify('Grounds services','There is no need to provide a response'),'forward-notice');assert.equal(classify('EOI parks','request for tender'),'eoi');assert.equal(classify('Supplier register',''),'panel')});
test('buyer exact and normalised matches, logged fallback, ambiguous locations',()=>{let misses=0;assert.equal(buyerInfo('EXAMPLE Council!','',{'Example Council':{state:'NSW',type:'council'}},assert.fail).state,'NSW');assert.equal(buyerInfo('missing','Brisbane time',{},()=>misses++).state,'QLD');assert.equal(buyerInfo('missing','Canberra, Melbourne, Sydney time',{},()=>misses++).state,null);assert.equal(misses,2)});
test('identical refresh is byte-stable without active lastSeenAt',()=>{const first=diffSnapshots([],[],{vendorpanel:[item]},at);const second=diffSnapshots(first.tenders,first.archive,{vendorpanel:[item]},'2026-09-08T00:00:00.000Z');assert.deepEqual(first,second);assert.ok(!('lastSeenAt' in second.tenders[0]))});
test('disappearance archives; failure keeps other source unchanged; reappearance restores firstSeenAt',()=>{
 const federal:Tender={...active,source:'austender'};const result=diffSnapshots([active,federal],[],{vendorpanel:[]},at);assert.deepEqual(result.tenders,[federal]);assert.equal(result.archive[0].archivedAt,at);
 const restored=diffSnapshots(result.tenders,result.archive,{vendorpanel:[item]},'2026-09-08T00:00:00.000Z');assert.equal(restored.archive.length,0);assert.equal(restored.tenders.find(t=>t.source==='vendorpanel')?.firstSeenAt,at);
});
test('amended closing dates append one history entry and do not repeat',()=>{const changed={...item,closingAt:'2026-09-20T07:00:00.000Z'};const first=diffSnapshots([active],[],{vendorpanel:[changed]},at);assert.deepEqual(first.tenders[0].changes,[{field:'closingAt',from:item.closingAt,to:changed.closingAt,at}]);assert.deepEqual(diffSnapshots(first.tenders,[],{vendorpanel:[changed]},at),first)});
test('12-month archive retention and duplicate detection',()=>{const old:ArchivedTender={...active,archivedAt:'2025-09-06T00:00:00.000Z'};assert.equal(diffSnapshots([], [old],{},at).archive.length,0);assert.throws(()=>diffSnapshots([active],[],{vendorpanel:[item,item]},at))});
test('URL filters round-trip with punctuation, full description search, and expiry rules',()=>{
 const items=[active,{...active,id:'forward',requestType:'forward-notice' as const},{...active,id:'past',closingAt:'2026-08-01T00:00:00Z'}];const index=createIndex(items);const compactItems=items.map(compact);assert.ok(!('description' in compactItems[0]));
 const params=new URLSearchParams({q:'bridge',state:'QLD',category:'Building Trade, Repairs, Maint.',buyer:'Example Council',source:'vendorpanel',type:'rft',window:'7',sort:'closing'});
 assert.equal(filterListings(compactItems,index,new URLSearchParams(params.toString()),Date.parse(at)).length,1);
 assert.equal(filterListings(compactItems,index,new URLSearchParams('sort=closing'),Date.parse(at)).length,1);
 assert.equal(filterListings(compactItems,index,new URLSearchParams(),Date.parse(at)).length,2);
});
