export const tenderRouteId=(t:{source:string;id:string})=>`${t.source}-${t.source==='austender'?t.id.replace(/^https:\/\/www\.tenders\.gov\.au\//,'').replaceAll('/','-'):t.id}`;
export const tenderPath=(t:{source:string;id:string})=>`/tender/${encodeURIComponent(tenderRouteId(t))}/`;
export const buyerSlug=(name:string)=>encodeURIComponent(name.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''))+'-'+hash(name);
function hash(s:string){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}return (h>>>0).toString(36);}
export const buyerPath=(name:string)=>`/buyer/${buyerSlug(name)}/`;
export const typeLabels:Record<string,string>={rft:'Request for tender',rfq:'Request for quote',rfp:'Request for proposal',eoi:'Expression of interest',panel:'Supplier panel','forward-notice':'Forward notice',other:'Other request'};
export const sourceLabels={vendorpanel:'VendorPanel',austender:'AusTender',nsw:'NSW tenders'};
