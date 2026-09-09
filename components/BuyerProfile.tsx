import type {VendorPanelDetails} from '../lib/types';

function website(raw:string|null){
 if(!raw)return null;
 try{const url=new URL(raw);return ['http:','https:'].includes(url.protocol)?url.href:null}catch{return null}
}

export default function BuyerProfile({buyer,details,compact=false}:{buyer:string;details?:VendorPanelDetails;compact?:boolean}){
 if(!details?.buyerAddress&&!details?.buyerWebsite&&!details?.buyerDescription)return null;
 const href=website(details.buyerWebsite);
 const Heading=compact?'h3':'h2';
 return <section className={compact?'panel-section buyer-profile':'detail-section buyer-profile'}><Heading>About the buyer</Heading><dl className="buyer-profile-grid"><div><dt>Business name</dt><dd>{buyer}</dd></div>{details.buyerAddress&&<div><dt>Location</dt><dd className="description">{details.buyerAddress}</dd></div>}{details.buyerWebsite&&<div><dt>Website</dt><dd>{href?<a href={href} target="_blank" rel="noopener noreferrer">{details.buyerWebsite} ↗</a>:details.buyerWebsite}</dd></div>}{details.buyerDescription&&<div className="buyer-profile-description"><dt>Business information</dt><dd className="description">{details.buyerDescription}</dd></div>}</dl></section>;
}
