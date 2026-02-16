import { BroadcastDirContext } from "@/lib/run-context";

import { BROADCAST_JSON, BroadcastDirBundle } from "./processor.isomorphic";
import { writeBroadcastDirFromBundle } from "./writer";

const scaffoldBroadcastDirBundle = (key: string): BroadcastDirBundle => {
  const broadcastJson = {
    key,
    name: "",
    description: "",
    categories: [],
    target_audience_key: "",
    status: "draft" as const,
    settings: {
      is_commercial: false,
      override_preferences: false,
    },
    steps: [],
  };

  return {
    [BROADCAST_JSON]: broadcastJson,
  };
};

export const generateBroadcastDir = async (
  broadcastDirCtx: BroadcastDirContext,
  key: string,
): Promise<void> => {
  const bundle = scaffoldBroadcastDirBundle(key);

  return writeBroadcastDirFromBundle(broadcastDirCtx, bundle);
};
