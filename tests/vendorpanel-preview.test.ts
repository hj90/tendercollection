import test from 'node:test';
import assert from 'node:assert/strict';
import {parseVendorPanelPreview,parseVendorPanelPreviewDate} from '../lib/parsers/vendorpanel-preview';
import {enrichVendorPanel,vendorPanelPreviewUrl} from '../lib/vendorpanel-http';
import type {ParsedTender,Tender} from '../lib/types';

const row=(label:string,content:string)=>`<div class="opportunityPreviewInnerRow"><div class="opportunityPreviewMinHeading">${label}</div><div class="opportunityPreviewContent">${content}</div></div>`;
const html=`<table><tr class="OpportunityPreviewNameRowTenderPublic"><td>Example</td></tr><tr><td>
${row('VP Reference #','VP455349')}${row('Buyers Reference #','ABC-42')}${row('Opens','Thursday 03 April 2025 <span>(E. Australia Standard Time)</span>')}${row('Supplier query cut-off','Wednesday 30 June 2027 02:00 PM <span>(AUS Eastern Standard Time)</span>')}${row('Expected decision','Wednesday 11 August 2027 <span>(AUS Eastern Standard Time)</span>')}
<div class="opportunityPreviewMaxHeading">Background information / Compatibility requirements</div>${row('Details','Background <b>detail</b>')}
<div class="opportunityPreviewMaxHeading">Desired Outcomes</div>${row('Details','Outcome<br>detail')}
<div class="opportunityPreviewMaxHeading">Questions asked by the buyer</div>${row('Question 1','Can you deliver?')}
<div class="opportunityPreviewMaxHeading">Regions of Service</div>${row('Locations','<ul><li><b>Queensland</b><br>Central West</li></ul>')}
<div class="opportunityPreviewMaxHeading">Information requested by others</div>${row('26/Aug/2026 03:48 PM','<b>Question:</b><br>Can we edit the form?<br><br><b>Answered on 26/Aug/2026 04:33 PM:</b><br>Yes, you may.')}
<div class="opportunityPreviewMaxHeading">Updates made to this Request</div>${row('27/Aug/2026 12:18 PM','A new schedule was attached.')}
</td></tr></table>`;

test('public preview maps richer dates, requirements, Q&A and updates',()=>{const d=parseVendorPanelPreview(html);assert.equal(d.buyerReference,'ABC-42');assert.equal(d.opensAt,'2025-04-02T14:00:00.000Z');assert.equal(d.queryCutoffAt,'2027-06-30T04:00:00.000Z');assert.equal(d.background,'Background detail');assert.equal(d.desiredOutcomes,'Outcome\ndetail');assert.deepEqual(d.buyerQuestions,['Can you deliver?']);assert.deepEqual(d.serviceRegions,['Queensland\nCentral West']);assert.equal(d.publicQuestions[0].question,'Can we edit the form?');assert.equal(d.publicQuestions[0].answer,'Yes, you may.');assert.equal(d.updates[0].description,'A new schedule was attached.');assert.equal(parseVendorPanelPreviewDate('26/Aug/2026 04:33 PM'),'2026-08-26T06:33:00.000Z')});

test('preview enrichment retains prior details on a per-record failure',async()=>{const seed={id:'bfbbade7954f4db693dca121e7e7b7d3',source:'vendorpanel',reference:'VP455349',title:'Example',description:'Brief',buyer:'Buyer',buyerType:null,state:null,categories:[],requestType:'other',closingAt:null,closingAtRaw:null,publishedAt:null,contact:null,documentCount:null,sourceUrl:'https://www.vendorpanel.com.au/PublicTenderAccess.aspx?id=x'} satisfies ParsedTender;const details=parseVendorPanelPreview(html);const prior={...seed,firstSeenAt:'2026-01-01T00:00:00Z',changes:[],vendorPanelDetails:details} satisfies Tender;const warnings:string[]=[];const [result]=await enrichVendorPanel([seed],[prior],async()=>{throw new Error('offline')},m=>warnings.push(m));assert.deepEqual(result.vendorPanelDetails,details);assert.match(warnings[0],/retained previous details/);assert.match(vendorPanelPreviewUrl(seed),/bfbbade.*s455349$/)});
