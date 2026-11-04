import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Layout, colors } from "../components/Layout";
import { getFacts } from "../facts";

const Kpi: React.FC<{ label: string; value: string; sub?: string; delay: number }> = ({ label, value, sub, delay }) => {
  const frame = useCurrentFrame();
  const t = Math.min(Math.max(frame - delay, 0) / 20, 1);
  const o = interpolate(t, [0, 1], [0, 1]);
  const y = interpolate(t, [0, 1], [30, 0]);
  return (
    <div
      style={{
        flex: 1,
        background: "#1f2833",
        borderRadius: 16,
        padding: 32,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        opacity: o,
        transform: `translateY(${y}px)`,
      }}
    >
      <div style={{ fontSize: 24, color: colors.muted, marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 56, fontWeight: 700, color: colors.accent }}>{value}</div>
      {sub && <div style={{ fontSize: 20, color: colors.muted, marginTop: 8 }}>{sub}</div>}
    </div>
  );
};

export const Metrics: React.FC = () => {
  const facts = getFacts();
  const compileSec = facts.compile.seconds.toFixed(2);
  const replaySec = facts.replay.seconds.toFixed(2);
  const speedup = facts.replay.seconds > 0 ? (facts.compile.seconds / facts.replay.seconds).toFixed(1) : "—";

  return (
    <Layout title="Measured results">
      <div style={{ display: "flex", flexDirection: "column", gap: 32, height: "100%", justifyContent: "center" }}>
        <div style={{ display: "flex", gap: 32 }}>
          <Kpi label="Verified tasks" value={`${facts.eval.success}/${facts.eval.n}`} sub="plan → execute → verify → replay" delay={0} />
          <Kpi label="Replay model calls" value={`${facts.replay.model_calls}`} sub="zero API keys needed" delay={8} />
          <Kpi label="Red team blocked" value={`${facts.redteam.passed}/${facts.redteam.total}`} sub="covered cases" delay={16} />
        </div>
        <div style={{ display: "flex", gap: 32 }}>
          <Kpi label="Compile time" value={`${compileSec}s`} sub="8 tasks, engine only" delay={24} />
          <Kpi label="Replay time" value={`${replaySec}s`} sub="after fixture reset" delay={32} />
          <Kpi label="Speed-up" value={`${speedup}x`} sub="compile vs replay" delay={40} />
        </div>
        <div style={{ fontSize: 24, color: colors.muted, textAlign: "center", marginTop: 16 }}>
          Model: {facts.model.id} via {facts.model.provider}
        </div>
      </div>
    </Layout>
  );
};
