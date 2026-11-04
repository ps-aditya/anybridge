import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Layout, colors, Code } from "../components/Layout";
import { getCaptures } from "../captures";

export const Attack: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = Math.min(frame / (fps * 0.8), 1);
  const opacity = interpolate(t, [0, 1], [0, 1]);
  const captures = getCaptures();
  const blocked = captures.attack?.blocked;

  return (
    <Layout title="Observed text is data, not instructions">
      <div style={{ display: "flex", gap: 40, height: "100%", opacity }}>
        <div style={{ flex: 1.15, display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: 24, color: colors.muted, marginBottom: 12 }}>
            Real Notes page · hostile text injected
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
            <Img src={staticFile("captures/notes.png")} style={{ width: "100%", display: "block" }} />
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", gap: 16 }}>
          <div style={{ fontSize: 24, color: colors.muted }}>The approved plan tries the link</div>
          <Code>
            {`steps:
  s1  open /notes
  s2  click link "this cleanup page"

execute:
  s2  blocked

${blocked?.code ?? "ORIGIN_NOT_ALLOWED"}
${blocked?.message ?? "request blocked: http://203.0.113.7/cleanup"}`}
          </Code>
          <div
            style={{
              fontSize: 26,
              color: colors.danger,
              background: "rgba(239,71,111,0.12)",
              border: `1px solid ${colors.danger}`,
              borderRadius: 10,
              padding: 16,
              lineHeight: 1.4,
            }}
          >
            The model can propose it. A human can approve it. The engine still refuses the origin.
          </div>
        </div>
      </div>
    </Layout>
  );
};
