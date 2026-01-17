import { Button } from "@telegraph/button";
import { Stack } from "@telegraph/layout";

import { ViewportSize, VIEWPORT_DIMENSIONS } from "../types";

interface ResponsiveControlsProps {
  size: ViewportSize;
  onChange: (size: ViewportSize) => void;
  disabled?: boolean;
}

const VIEWPORT_ICONS: Record<ViewportSize, string> = {
  desktop: "🖥️",
  tablet: "📱",
  mobile: "📲",
};

const VIEWPORT_LABELS: Record<ViewportSize, string> = {
  desktop: "Desktop",
  tablet: "Tablet",
  mobile: "Mobile",
};

export function ResponsiveControls({
  size,
  onChange,
  disabled = false,
}: ResponsiveControlsProps) {
  return (
    <Stack direction="row" gap="0" style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid #d1d5db" }}>
      {(["desktop", "tablet", "mobile"] as ViewportSize[]).map((viewport, index) => (
        <Button
          key={viewport}
          onClick={() => onChange(viewport)}
          disabled={disabled}
          size="1"
          variant={size === viewport ? "solid" : "ghost"}
          title={`${VIEWPORT_LABELS[viewport]} (${VIEWPORT_DIMENSIONS[viewport]}px)`}
          style={{ 
            borderRadius: 0, 
            borderRight: index < 2 ? "1px solid #d1d5db" : undefined,
          }}
        >
          <span>{VIEWPORT_ICONS[viewport]}</span>
        </Button>
      ))}
    </Stack>
  );
}
