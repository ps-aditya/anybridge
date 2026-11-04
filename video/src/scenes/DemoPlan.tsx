import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Layout, colors, Code } from "../components/Layout";

export const DemoPlan: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = Math.min(frame / (fps * 0.8), 1);
  const opacity = interpolate(t, [0, 1], [0, 1]);

  return (
    <Layout title="Plan from a numbered menu">
      <div style={{ display: "flex", gap: 40, height: "100%", opacity }}>
        <div style={{ flex: 1.15, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 24, color: colors.muted, marginBottom: 12 }}>
            Real fixture app · http://127.0.0.1:4010/tasks
          </div>
          <div
            style={{
              border: `1px solid ${colors.panel}`,
              borderRadius: 14,
              overflow: "hidden",
              background: "#fff",
              boxShadow: "0 24px 60px rgba(0,0,0,0.45)",
            }}
          >
            <Img src={staticFile("captures/tasks-before.png")} style={{ width: "100%", display: "block" }} />
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 16 }}>
          <div style={{ fontSize: 24, color: colors.muted }}>Observed menu</div>
          <Code>
            {`a1 page http://127.0.0.1:4010
a8 textbox "New task"
a9 button "Add"`}
          </Code>
          <div style={{ fontSize: 24, color: colors.muted, marginTop: 8 }}>Proposed plan</div>
          <Code>
            {`{
  "steps": [
    { "id": "s1", "action": "a1" },
    { "id": "s2", "action": "a8",
      "args": { "value": "Ship demo" } },
    { "id": "s3", "action": "a9" }
  ],
  "checks": [
    { "kind": "file_contains",
      "params": { "value": "Ship demo" } }
  ]
}`}
          </Code>
        </div>
      </div>
    </Layout>
  );
};
