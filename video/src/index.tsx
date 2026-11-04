import React from "react";
import { Composition, staticFile, Audio, Sequence, interpolate, useCurrentFrame, useVideoConfig, registerRoot } from "remotion";
import { Intro } from "./scenes/Intro";
import { Overview } from "./scenes/Overview";
import { DemoPlan } from "./scenes/DemoPlan";
import { DemoApprove } from "./scenes/DemoApprove";
import { DemoVerify } from "./scenes/DemoVerify";
import { Attack } from "./scenes/Attack";
import { Metrics } from "./scenes/Metrics";
import { Close } from "./scenes/Close";
import { MockWatermark } from "./components/MockWatermark";
import { Captions } from "./components/Captions";
import type { Facts } from "./facts";
import narration from "../narration.json";
import durations from "../audio/durations.json";

const fps = 30;
const width = 1920;
const height = 1080;

interface SceneDef {
  id: string;
  text: string;
  maxDurationSeconds: number;
  duration: number;
}

const rawScenes = narration.scenes as SceneDef[];
const durMap = new Map((durations as Array<{ id: string; duration: number }>).map((d) => [d.id, d.duration]));

const scenes = rawScenes.map((s) => ({
  ...s,
  duration: (durMap.get(s.id) ?? s.maxDurationSeconds) + 0.15,
}));

const sceneStarts = scenes.reduce<number[]>((acc, s, i) => {
  acc.push(i === 0 ? 0 : acc[i - 1] + scenes[i - 1].duration);
  return acc;
}, []);

const totalFrames = Math.ceil((sceneStarts[sceneStarts.length - 1] + scenes[scenes.length - 1].duration) * fps);

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="AnyBridgeDemo"
        component={AnyBridgeDemo}
        durationInFrames={totalFrames}
        fps={fps}
        width={width}
        height={height}
        defaultProps={{ facts: {} as Facts }}
      />
    </>
  );
};

registerRoot(RemotionRoot);

const AnyBridgeDemo: React.FC<{ facts: Facts }> = () => {
  return (
    <>
      {scenes.map((s, i) => (
        <Sequence key={`audio-${s.id}`} from={Math.round(sceneStarts[i] * fps)} durationInFrames={Math.ceil(s.duration * fps)}>
          <Audio src={staticFile(`audio/${s.id}.wav`)} />
        </Sequence>
      ))}
      <div style={{ width, height, background: "#0b0c10", position: "relative" }}>
        {scenes.map((s, i) => (
          <Sequence key={s.id} from={Math.round(sceneStarts[i] * fps)} durationInFrames={Math.ceil(s.duration * fps)}>
            <SceneWrapper index={i}>
              {i === 0 && <Intro />}
              {i === 1 && <Overview />}
              {i === 2 && <DemoPlan />}
              {i === 3 && <DemoApprove />}
              {i === 4 && <DemoVerify />}
              {i === 5 && <Attack />}
              {i === 6 && <Metrics />}
              {i === 7 && <Close />}
            </SceneWrapper>
          </Sequence>
        ))}
      </div>
      <Captions />
      <MockWatermark />
    </>
  );
};

const SceneWrapper: React.FC<{ index: number; children: React.ReactNode }> = ({ children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: "clamp" });
  return <div style={{ width: 1920, height: 1080, opacity }}>{children}</div>;
};
