import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Layout, colors, Code } from "../components/Layout";
import { getCaptures } from "../captures";

export const DemoVerify: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = Math.min(frame / (fps * 0.8), 1);
  const opacity = interpolate(t, [0, 1], [0, 1]);
  const captures = getCaptures();

  const evidence = captures.verify?.verified.evidence?.[0];
  const replayVerdict = captures.replay?.replay.verification?.verdict ?? "missing";

  return (
    <Layout title="Evidence, not audit">
      <div style={{ display: "flex", gap: 40, height: "100%", opacity }}>
        <div style={{ flex: 1.15, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 24, color: colors.muted, marginBottom: 12 }}>
            After execute · “Ship demo” is now in the app
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
            <Img src={staticFile("captures/tasks-after.png")} style={{ width: "100%", display: "block" }} />
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 16 }}>
          <div style={{ fontSize: 24, color: colors.muted }}>Verifier reads the file</div>
          <Code>
            {`{
  "kind": "${evidence?.kind ?? "file_contains"}",
  "target": "${evidence?.target ?? "Ship demo"}",
  "found": ${evidence?.found ?? true}
}

verdict: ${captures.verify?.verified.verdict ?? "unknown"}`}
          </Code>
          <div style={{ fontSize: 24, color: colors.muted, marginTop: 8 }}>Save, reset, replay</div>
          <Code>
            {`replay status: ${captures.replay?.replay.status ?? "unknown"}
replay verdict: ${replayVerdict}
model calls: 0`}
          </Code>
        </div>
      </div>
    </Layout>
  );
};
