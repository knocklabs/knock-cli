import { Channel } from "@knocklabs/mgmt/resources/channels";

import {
  getAvailableStepTypes,
  scaffoldSteps,
  StepTag,
} from "@/lib/marshal/workflow/generator";
import { BroadcastDirContext } from "@/lib/run-context";

import { BROADCAST_JSON, BroadcastDirBundle } from "./processor.isomorphic";
import { writeBroadcastDirFromBundle } from "./writer";

/*
 * Broadcasts must have at least one channel step, so `broadcast new` only
 * offers channel step types that render a template. In-app guide steps are
 * left out because their scaffold has no usable guide key.
 */
const BROADCAST_STEP_TAGS = new Set<StepTag>([
  "email",
  "in_app_feed",
  "sms",
  "push",
  "chat",
]);

export const getAvailableBroadcastStepTypes = (
  channelTypes: Channel["type"][],
): StepTag[] =>
  getAvailableStepTypes(channelTypes).filter((tag) =>
    BROADCAST_STEP_TAGS.has(tag),
  );

type NewBroadcastAttrs = {
  key: string;
  name: string;
  steps: StepTag[];
};

export const scaffoldBroadcastDirBundle = (
  attrs: NewBroadcastAttrs,
  channelsByType: Record<Channel["type"], Channel[]>,
): BroadcastDirBundle => {
  const [steps, bundleFragment] = scaffoldSteps(attrs.steps, channelsByType);

  const broadcastJson = {
    key: attrs.key,
    name: attrs.name,
    description: "",
    categories: [],
    settings: {
      override_preferences: false,
    },
    steps,
  };

  return { [BROADCAST_JSON]: broadcastJson, ...bundleFragment };
};

export const generateBroadcastDir = async (
  broadcastDirCtx: BroadcastDirContext,
  attrs: NewBroadcastAttrs,
  channelsByType: Record<Channel["type"], Channel[]>,
): Promise<void> => {
  const bundle = scaffoldBroadcastDirBundle(attrs, channelsByType);

  return writeBroadcastDirFromBundle(broadcastDirCtx, bundle);
};
