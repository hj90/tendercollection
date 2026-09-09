"use client";
import {useEffect,useState} from 'react';
export default function LocalDate({iso}:{iso:string|null;raw?:string|null}){
 const [local,setLocal]=useState<string|null>(null);
 useEffect(()=>{setLocal(iso?new Intl.DateTimeFormat(undefined,{day:'numeric',month:'short',year:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(iso)):null);},[iso]);
 return <span>{iso?<time dateTime={iso}>{local??new Date(iso).toISOString().replace('T',' ').replace('.000Z',' UTC')}</time>:'Closing date unavailable'}</span>;
}
