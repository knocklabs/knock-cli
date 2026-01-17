import { Button } from "@telegraph/button";
import { Stack } from "@telegraph/layout";

import { ViewMode } from "../types";

interface ViewModeToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
  disabled?: boolean;
}

export function ViewModeToggle({
  mode,
  onChange,
  disabled = false,
}: ViewModeToggleProps) {
  return (
    <Stack direction="row" gap="0" style={{ borderRadius: "8px", overflow: "hidden", border: "1px solid #d1d5db" }}>
      <Button
        onClick={() => onChange("html")}
        disabled={disabled}
        size="1"
        variant={mode === "html" ? "solid" : "ghost"}
        style={{ borderRadius: 0, borderRight: "1px solid #d1d5db" }}
      >
        HTML
      </Button>
      <Button
        onClick={() => onChange("text")}
        disabled={disabled}
        size="1"
        variant={mode === "text" ? "solid" : "ghost"}
        style={{ borderRadius: 0 }}
      >
        Text
      </Button>
    </Stack>
  );
}
