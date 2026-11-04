import React from "react";
import { useCurrentFrame, useVideoConfig } from "remotion";
import narration from "../../narration.json";
import durations from "../../audio/durations.json";

const rawScenes = narration.scenes as Array<{ id: string; text: string; maxDurationSeconds: number }>;
const durMap = new Map((durations as Array<{ id: string; duration: number }>).map((d) => [d.id, d.duration + 0.15]));

export const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const time = frame / fps;

  let elapsed = 0;
  let currentText = "";
  for (const s of rawScenes) {
    const dur = durMap.get(s.id) ?? s.maxDurationSeconds;
    if (time >= elapsed && time < elapsed + dur) {
      currentText = s.text;
      break;
    }
    elapsed += dur;
  }

  if (!currentText) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 48,
        left: 96,
        right: 96,
        textAlign: "center",
        zIndex: 100,
      }}
    >
      <div
        style={{
          display: "inline-block",
          background: "rgba(0,0,0,0.7)",
          color: "#ffffff",
          fontSize: 32,
          fontFamily: "Inter, sans-serif",
          padding: "12px 24px",
          borderRadius: 8,
          maxWidth: "100%",
          lineHeight: 1.4,
        }}
      >
        {currentText}
      </div>
    </div>
  );
};
