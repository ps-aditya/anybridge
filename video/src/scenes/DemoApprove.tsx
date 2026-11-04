import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Layout, colors, Code } from "../components/Layout";

export const DemoApprove: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = Math.min(frame / (fps * 0.8), 1);
  const opacity = interpolate(t, [0, 1], [0, 1]);

  return (
    <Layout title="Human approval">
      <div style={{ display: "flex", gap: 48, height: "100%", opacity }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <Code>
            {`$ anybridge approve plan_b1d027989b8c

Plan: Add task Ship demo
Hash: 8f3a9c...
Expiry: 10 minutes

Approve? (type yes) > yes

Approval created. The model cannot do this.`}
          </Code>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 32 }}>
          <div style={{ fontSize: 36, color: colors.text }}>Out-of-band approval</div>
          <ul style={{ fontSize: 32, color: colors.muted, lineHeight: 1.8, margin: 0, paddingLeft: 48 }}>
            <li>Single use</li>
            <li>Hash-bound</li>
            <li>10-minute expiry</li>
            <li>Model cannot approve</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};
