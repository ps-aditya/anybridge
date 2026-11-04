import React from "react";

export const colors = {
  bg: "#0b0c10",
  panel: "#1f2833",
  text: "#c5c6c7",
  muted: "#8d99ae",
  accent: "#66fcf1",
  danger: "#ef476f",
  success: "#06d6a0",
};

export const Layout: React.FC<{ children: React.ReactNode; title?: string }> = ({ children, title }) => {
  return (
    <div
      style={{
        width: 1920,
        height: 1080,
        background: colors.bg,
        color: colors.text,
        fontFamily: "Inter, sans-serif",
        padding: 96,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {title && (
        <h1
          style={{
            fontSize: 64,
            fontWeight: 700,
            margin: 0,
            marginBottom: 48,
            color: colors.accent,
            letterSpacing: -1,
          }}
        >
          {title}
        </h1>
      )}
      <div style={{ flex: 1, position: "relative" }}>{children}</div>
    </div>
  );
};

export const Code: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <pre
    style={{
      fontFamily: "'JetBrains Mono', monospace",
      background: colors.panel,
      padding: 24,
      borderRadius: 12,
      fontSize: 28,
      color: colors.text,
      overflow: "hidden",
      whiteSpace: "pre-wrap",
      wordBreak: "break-word",
      margin: 0,
    }}
  >
    {children}
  </pre>
);

export const Caption: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      position: "absolute",
      bottom: 48,
      left: 96,
      right: 96,
      fontSize: 32,
      color: colors.muted,
      textAlign: "center",
    }}
  >
    {children}
  </div>
);
