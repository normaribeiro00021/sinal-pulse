"use client";
import { Activity, Archive, BarChart3, Compass, Database, Settings } from "lucide-react";
import { useState } from "react";

const items = [
  [Compass, "Radar"], [Activity, "Escalando"], [BarChart3, "Pulse Daily"], [Archive, "Vault"], [Database, "Ofertas"], [Settings, "Configurações"],
] as const;

export function Sidebar() {
  const [active, setActive] = useState("Radar");
  return <aside className="sidebar">
    <div className="brand">SINAL <span>PULSE</span><small>Radar de oportunidades em movimento</small></div>
    <nav>{items.map(([Icon, label]) => <button key={label} onClick={() => setActive(label)} className={active === label ? "active" : ""}><Icon size={18}/><span>{label}</span></button>)}</nav>
    <div className="sidebar-foot">Inteligência para criadores que pensam no próximo movimento.<br/><br/><span>v0.1.0 · MOCK</span></div>
  </aside>;
}
