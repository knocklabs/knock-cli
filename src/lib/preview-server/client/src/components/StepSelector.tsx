import { Box } from "@telegraph/layout";
import { Select } from "@telegraph/select";
import { Text } from "@telegraph/typography";

import { ChannelStep, ChannelType } from "../types";

interface StepSelectorProps {
  steps: ChannelStep[];
  selectedRef: string;
  onSelect: (ref: string) => void;
  disabled?: boolean;
}

const CHANNEL_TYPE_LABELS: Record<ChannelType, string> = {
  email: "Email",
  sms: "SMS",
  push: "Push",
  chat: "Chat",
  in_app_feed: "In-App Feed",
};

const CHANNEL_TYPE_ICONS: Record<ChannelType, string> = {
  email: "📧",
  sms: "💬",
  push: "🔔",
  chat: "💭",
  in_app_feed: "📱",
};

export function StepSelector({
  steps,
  selectedRef,
  onSelect,
  disabled = false,
}: StepSelectorProps) {
  return (
    <Box>
      <Text
        as="label"
        size="1"
        weight="medium"
        color="gray"
        style={{ display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}
      >
        Channel Step
      </Text>
      <Select.Root
        value={selectedRef}
        onValueChange={(val) => onSelect(val as string)}
        disabled={disabled}
        size="2"
        placeholder="Select a step..."
      >
        {steps.map((step) => (
          <Select.Option key={step.ref} value={step.ref}>
            {CHANNEL_TYPE_ICONS[step.channelType]} {step.name || step.ref} (
            {CHANNEL_TYPE_LABELS[step.channelType]})
          </Select.Option>
        ))}
      </Select.Root>
    </Box>
  );
}
