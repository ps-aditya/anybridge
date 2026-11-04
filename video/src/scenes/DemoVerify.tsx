import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Layout, colors, Code } from "../components/Layout";

export const DemoVerify: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = Math.min(frame / (fps * 0.8), 1);
  const opacity = interpolate(t, [0, 1], [0, 1]);

  return (
    <Layout title="Evidence, not audit">
      <div style={{ display: "flex", gap: 48, height: "100%", opacity }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 32, color: colors.muted, marginBottom: 16 }}>Verify reads the file</div>
          <Code>
            {`{
  "tasks": [
    { "title": "Ship demo", "done": false },
    { "title": "Review fixture spec", "done": false },
    { "title": "Record rough demo", "done": false }
  ]
}`}
          </Code>
          <div style={{ fontSize: 28, color: colors.success, marginTop: 24, fontWeight: 600 }}>verdict: pass</div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 32 }}>
          <div style={{ fontSize: 36, color: colors.text }}>Save and replay</div>
          <Code>
            {`$ anybridge save add-ship-demo
$ curl -X POST /reset
$ anybridge replay add-ship-demo

verdict: pass
model calls: 0`}
          </Code>
        </div>
      </div>
    </Layout>
  );
};
