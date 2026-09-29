type Props = { score: number; compact?: boolean; momentumPending?: boolean };
export function PulseScore({ score, compact = false, momentumPending = false }: Props) {
  const level = score >= 75 ? "ALTO" : score >= 50 ? "MÉDIO" : "INICIAL";
  return <div className={`pulse-score ${compact ? "compact" : ""}`} aria-label={`Pulse Score ${score}, ${level}`}>
    <div className="score-ring" style={{ "--score": `${score * 3.6}deg` } as React.CSSProperties}><strong>{score}</strong><span>PULSE</span></div><em>{level}</em>
    {momentumPending && <span className="score-pending">MOMENTUM · AGUARDANDO HISTÓRICO</span>}
  </div>;
}
