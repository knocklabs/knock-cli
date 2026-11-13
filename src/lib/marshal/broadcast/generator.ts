import { BroadcastDirContext } from "@/lib/run-context";

import { BROADCAST_JSON, BroadcastDirBundle } from "./processor.isomorphic";
import { writeBroadcastDirFromBundle } from "./writer";

const scaffoldBroadcastDirBundle = (
  key: string,
  name: string,
): BroadcastDirBundle => {
  const broadcastJson = {
    key,
    name,
    description: "",
    categories: [],
    settings: {
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
  name: string,
): Promise<void> => {
  const bundle = scaffoldBroadcastDirBundle(key, name);

  return writeBroadcastDirFromBundle(broadcastDirCtx, bundle);
};
