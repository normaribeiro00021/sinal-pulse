"use client";
import Link from "next/link";
import { Bookmark, ExternalLink, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { PulseScore } from "@/components/pulse-score";
import type { Offer, OfferStatus } from "@/types";

const statuses: Record<OfferStatus, {label: string; symbol: string}> = { accelerating: {label:"ACELERANDO",symbol:"↗"}, scaling:{label:"ESCALANDO",symbol:"↑"}, new:{label:"NOVO SINAL",symbol:"✦"}, stable:{label:"ESTÁVEL",symbol:"—"}, losing:{label:"PERDENDO FORÇA",symbol:"↘"} };

export function OfferCard({ offer }: { offer: Offer }) {
  const [saved, setSaved] = useState(false); const [dismissed, setDismissed] = useState(false);
  const status = statuses[offer.status];
  if (dismissed) return null;
  return <article className="offer-card">
    <div className="offer-head"><div><h3>{offer.name}</h3><p>por {offer.advertiser} · <span className={offer.dataSource === "REAL" ? "real-badge" : ""}>{offer.dataSource}</span></p></div><span className={`status ${offer.status}`}>{status.symbol} {status.label}</span></div>
    <div className="offer-body">{offer.thumbnail ? <img src={offer.thumbnail} alt=""/> : <div className="thumbnail-empty">SEM CRIATIVO</div>}<div className="offer-details"><div className="tags"><span>{offer.niche}</span><span>{offer.subniche}</span><span>{offer.country}</span></div><div className="metrics"><div><b>{offer.activeAds}</b><small>ANÚNCIOS ATIVOS</small></div><div><b className={offer.adGrowth > 0 ? "positive" : ""}>{offer.momentumPending ? "—" : `+${offer.adGrowth}%`}</b><small>VARIAÇÃO</small></div><div><b>{offer.oldestAdDays}</b><small>DIAS ATIVO</small></div><div><b>{offer.creativeCount}</b><small>CRIATIVOS</small></div></div><div className="offer-actions"><Link href={`/offers/${offer.id}`}><ExternalLink size={14}/> Ver oferta</Link><button title="TikTok ainda não conectado" disabled><ShieldCheck size={14}/> TikTok em breve</button><button className={saved ? "saved" : ""} onClick={() => setSaved(!saved)} title="Salvar"><Bookmark size={15}/></button><button onClick={() => setDismissed(true)} title="Descartar"><Trash2 size={15}/></button></div></div><PulseScore score={offer.pulseScore} compact momentumPending={offer.momentumPending}/></div>
  </article>;
}
