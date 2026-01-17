import { Box, Stack } from "@telegraph/layout";

import { ChannelType, ViewMode, ViewportSize } from "../types";
import { ResponsiveControls } from "./ResponsiveControls";
import { ViewModeToggle } from "./ViewModeToggle";

interface HeaderProps {
  channelType: ChannelType;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  viewportSize: ViewportSize;
  onViewportSizeChange: (size: ViewportSize) => void;
  isLoading: boolean;
}

export function Header({
  channelType,
  viewMode,
  onViewModeChange,
  viewportSize,
  onViewportSizeChange,
  isLoading,
}: HeaderProps) {
  const showEmailControls = channelType === "email";

  return (
    <Box
      as="header"
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 24px",
        backgroundColor: "white",
        borderBottom: "1px solid #e5e7eb",
        minHeight: "60px",
      }}
    >
      <Stack direction="row" gap="4">
        {showEmailControls && (
          <ViewModeToggle
            mode={viewMode}
            onChange={onViewModeChange}
            disabled={isLoading}
          />
        )}
      </Stack>
      <Stack direction="row" gap="4">
        {showEmailControls && (
          <ResponsiveControls
            size={viewportSize}
            onChange={onViewportSizeChange}
            disabled={isLoading}
          />
        )}
      </Stack>
    </Box>
  );
}
