import { WidgetStage } from "@/components/widgets/WidgetStage";
import { ScorePlate, SCORE_SIZE } from "@/components/widgets/ScoreWidget";
import { RankPlate, RANK_SIZE } from "@/components/widgets/RankWidget";
import { useLiveState } from "@/lib/api";
import { ALL_MEDALS } from "@/lib/ranks";
import { useEffect } from "react";

export function ScoreWidgetPage() {
  const { data } = useLiveState("score");
  return (
    <WidgetStage width={SCORE_SIZE.W} height={SCORE_SIZE.H} testId="score-widget-root">
      {data ? <ScorePlate data={data} /> : null}
    </WidgetStage>
  );
}

export function RankWidgetPage() {
  const { data } = useLiveState("rank");
  // preload all medals so swaps are instant on stream
  useEffect(() => {
    ALL_MEDALS.forEach((src) => {
      const i = new Image();
      i.src = src;
    });
  }, []);
  return (
    <WidgetStage width={RANK_SIZE.W} height={RANK_SIZE.H} testId="rank-widget-root">
      {data ? <RankPlate data={data} /> : null}
    </WidgetStage>
  );
}
