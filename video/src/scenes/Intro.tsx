import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Layout, colors } from "../components/Layout";

export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = Math.min(frame / (fps * 1.5), 1);
  const y = interpolate(progress, [0, 1], [60, 0]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);

  return (
    <Layout>
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          transform: `translateY(${y}px)`,
          opacity,
        }}
      >
        <div
          style={{
            fontSize: 120,
            fontWeight: 800,
            color: colors.accent,
            letterSpacing: -4,
            marginBottom: 32,
          }}
        >
          AnyBridge
        </div>
        <div
          style={{
            fontSize: 48,
            color: colors.text,
            textAlign: "center",
            maxWidth: 1400,
            lineHeight: 1.4,
          }}
        >
          Operate software that has no ready-made integration.
        </div>
        <div style={{ fontSize: 36, color: colors.muted, marginTop: 24 }}>Compile once. Replay forever.</div>
      </div>
    </Layout>
  );
};
