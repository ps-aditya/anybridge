import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Layout, colors, Code } from "../components/Layout";
import { getCaptures } from "../captures";

export const DemoApprove: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = Math.min(frame / (fps * 0.8), 1);
  const opacity = interpolate(t, [0, 1], [0, 1]);
  const captures = getCaptures();

  const output = captures.approve_output
    ? captures.approve_output
        .replace(/\n$/, "")
        .replace(
          "Type yes to approve this exact plan: Approved",
          "Type yes to approve this exact plan: yes\n\nApproved",
        )
    : "captured approval output unavailable";

  return (
    <Layout title="Human approval">
      <div style={{ display: "flex", gap: 48, height: "100%", opacity }}>
        <div style={{ flex: 1.25, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 24, color: colors.muted, marginBottom: 12 }}>
            Captured from the real CLI · plan {captures.summary?.plan_id ?? "unknown"}
          </div>
          <Code>{output}</Code>
          <div style={{ fontSize: 20, color: colors.muted, marginTop: 12 }}>
            Input was piped as “yes” for this recording; the real path is interactive.
          </div>
        </div>
        <div style={{ flex: 0.8, display: "flex", flexDirection: "column", justifyContent: "center", gap: 28 }}>
          <div style={{ fontSize: 34, color: colors.text }}>Out-of-band approval</div>
          <ul style={{ fontSize: 30, color: colors.muted, lineHeight: 1.9, margin: 0, paddingLeft: 44 }}>
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
