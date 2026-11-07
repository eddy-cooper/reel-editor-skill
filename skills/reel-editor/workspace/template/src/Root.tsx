import React from "react";
import { Composition } from "remotion";
import { Reel, TOTAL } from "./Reel";
import { FPS } from "./theme";

export const Root: React.FC = () => (
  <Composition id="Reel" component={Reel} durationInFrames={TOTAL} fps={FPS} width={1080} height={1920} />
);
