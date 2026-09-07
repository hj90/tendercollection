import active from '../data/tenders.json';
import archived from '../data/archive.json';
import metadata from '../data/meta.json';
import type {Tender,ArchivedTender,Metadata} from './types';
export const tenders=active as Tender[];
export const archive=archived as ArchivedTender[];
export const allTenders=[...tenders,...archive];
export const meta=metadata as Metadata;
