import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Layout, colors, Code } from "../components/Layout";

const steps = [
  { label: "Discover", desc: "numbered menu" },
  { label: "Plan", desc: "typed JSON steps" },
  { label: "Approve", desc: "human, out-of-band" },
  { label: "Execute", desc: "engine runs" },
  { label: "Verify", desc: "file evidence" },
  { label: "Save", desc: "hash-pinned" },
  { label: "Replay", desc: "zero model calls" },
];

export const Overview: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  return (
    <Layout title="How it works">
      <div style={{ display: "flex", gap: 32, height: "100%" }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 24 }}>
          {steps.map((s, i) => {
            const delay = i * 8;
            const t = Math.min(Math.max(frame - delay, 0) / 20, 1);
            const x = interpolate(t, [0, 1], [-40, 0]);
            const o = interpolate(t, [0, 1], [0, 1]);
            return (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 24,
                  transform: `translateX(${x}px)`,
                  opacity: o,
                }}
              >
                <div
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    background: colors.accent,
                    color: colors.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                    fontWeight: 700,
                  }}
                >
                  {i + 1}
                </div>
                <div>
                  <div style={{ fontSize: 36, fontWeight: 600, color: colors.text }}>{s.label}</div>
                  <div style={{ fontSize: 24, color: colors.muted }}>{s.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <Code>
            {`client (any MCP assistant)
    |
    | MCP stdio
    v
AnyBridge engine
  - no model calls
  - origin allowlist
  - path jail
  - human approval`}
          </Code>
        </div>
      </div>
    </Layout>
  );
};
