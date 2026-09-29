"use client";
import { LoaderCircle, Search } from "lucide-react";
import { useState } from "react";
import type { Offer } from "@/types";

export function MiningPanel({ onComplete }: { onComplete: (offers: Offer[], summary: string) => void }) {
  const [query, setQuery] = useState(""); const [country, setCountry] = useState("BR"); const [limit, setLimit] = useState("20"); const [accessKey, setAccessKey] = useState(""); const [mining, setMining] = useState(false); const [message, setMessage] = useState("Dados MOCK continuam disponíveis enquanto você não minera resultados reais.");
  const runMining = async () => {
    if (!query.trim() || !accessKey || mining) return;
    setMining(true); setMessage("Preparando mineração…");
    const phaseTimer = window.setTimeout(() => setMessage("Buscando anúncios na Meta Ads Library…"), 300);
    try {
      const response = await fetch("/api/mining", { method: "POST", headers: { "Content-Type": "application/json", "x-sinal-pulse-mining-key": accessKey }, body: JSON.stringify({ keyword: query, country, activeStatus: "active", limit: Number(limit) }) });
      const payload = await response.json() as { error?: string; offers?: Offer[]; run?: { adsReturned: number; groupsGenerated: number } };
      if (!response.ok || !payload.offers || !payload.run) throw new Error(payload.error || "Não foi possível concluir a mineração.");
      setMessage("Concluído · anúncios processados e oportunidades agrupadas."); onComplete(payload.offers, `${payload.run.adsReturned} anúncios REAL · ${payload.run.groupsGenerated} grupos`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Falha na mineração."); }
    finally { window.clearTimeout(phaseTimer); setMining(false); }
  };
  return <section className="mining-panel"><div className="radar-orbits" aria-hidden="true"><i/><i/><i/><b/></div><div className="mining-content"><div className="mining-copy"><h2>O que deseja minerar?</h2><p>Pesquise qualquer palavra-chave. A consulta real usa Apify no servidor; dados MOCK seguem disponíveis.</p></div><div className="search-box"><Search size={20}/><input value={query} placeholder="Ex.: fisioterapia" onChange={(event) => setQuery(event.target.value)} aria-label="O que deseja minerar?"/></div><div className="filters"><select value={country} onChange={(event) => setCountry(event.target.value)}><option value="BR">Brasil</option><option value="US">Estados Unidos</option><option value="PT">Portugal</option></select><select defaultValue="Português"><option>Português</option></select><select defaultValue="Todos os nichos"><option>Todos os nichos</option></select><select defaultValue="Ativos"><option>Ativos</option></select><select value={limit} onChange={(event) => setLimit(event.target.value)}><option value="20">20 resultados</option><option value="50">50 resultados</option><option value="100">100 resultados</option></select><input className="mining-key" type="password" value={accessKey} placeholder="Chave de mineração" onChange={(event) => setAccessKey(event.target.value)} aria-label="Chave de mineração" autoComplete="off"/><button onClick={runMining} disabled={mining || !query.trim() || !accessKey}>{mining ? <LoaderCircle className="spin" size={18}/> : <Search size={18}/>} {mining ? "MINERANDO" : "MINERAR AGORA"}</button></div>{message && <p className="mining-result" role="status">{message}</p>}</div></section>;
}
