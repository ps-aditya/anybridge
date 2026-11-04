import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { getFacts } from "../facts";

export const MockWatermark: React.FC = () => {
  const facts = getFacts();
  const frame = useCurrentFrame();
  if (!facts.mock) return null;
  const opacity = interpolate(frame % 60, [0, 30, 60], [0.3, 0.6, 0.3]);
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        zIndex: 9999,
        opacity,
      }}
    >
      <div
        style={{
          fontSize: 120,
          fontWeight: 900,
          color: "#ef476f",
          transform: "rotate(-15deg)",
          border: "12px solid #ef476f",
          padding: "24px 64px",
          borderRadius: 24,
        }}
      >
        MOCK DATA
      </div>
    </div>
  );
};
