import React from "react";
import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Layout, colors, Code } from "../components/Layout";

export const DemoPlan: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = Math.min(frame / (fps * 1), 1);
  const opacity = interpolate(t, [0, 1], [0, 1]);

  return (
    <Layout title="Plan from a numbered menu">
      <div style={{ display: "flex", gap: 48, height: "100%", opacity }}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 32, color: colors.muted, marginBottom: 16 }}>Observed menu</div>
          <Code>
            {`a1 page http://127.0.0.1:4010
a2 link "Tasks"
a3 link "Notes"
a8 textbox "New task"
a9 button "Add"`}
          </Code>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 32, color: colors.muted, marginBottom: 16 }}>Proposed plan</div>
          <Code>
            {`{
  "intent": "Add task Ship demo",
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
