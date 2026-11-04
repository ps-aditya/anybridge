import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Layout, colors } from "../components/Layout";
import { getFacts } from "../facts";

export const Close: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = Math.min(frame / (fps * 0.8), 1);
  const opacity = interpolate(t, [0, 1], [0, 1]);
  const facts = getFacts();

  return (
    <Layout>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          opacity,
        }}
      >
        <div style={{ fontSize: 96, fontWeight: 800, color: colors.accent, marginBottom: 32 }}>AnyBridge</div>
        <div style={{ fontSize: 44, color: colors.text, marginBottom: 48 }}>Compile once. Replay forever.</div>
        <div style={{ fontSize: 32, color: colors.muted, marginBottom: 24 }}>{facts.repo}</div>
        <div style={{ fontSize: 28, color: colors.muted }}>MIT License · Built Oct 26 - Nov 4, 2026</div>
        <div style={{ fontSize: 24, color: colors.muted, marginTop: 32 }}>Voice: Kokoro-82M · Narration drafted with Muse Spark 1.3</div>
      </div>
    </Layout>
  );
};
