import { Box, Stack } from "@telegraph/layout";
import { Text } from "@telegraph/typography";

import { ChannelStep, PreviewContext } from "../types";
import { ContextEditor } from "./ContextEditor";
import { DataEditor } from "./DataEditor";
import { StepSelector } from "./StepSelector";

interface SidebarProps {
  // Workflow
  workflowName: string;
  steps: ChannelStep[];
  selectedStepRef: string;
  onStepSelect: (ref: string) => void;

  // Context
  context: PreviewContext;
  onContextChange: (updates: Partial<PreviewContext>) => void;

  // Connection status
  isConnected: boolean;

  // Loading state
  isLoading: boolean;
}

export function Sidebar({
  workflowName,
  steps,
  selectedStepRef,
  onStepSelect,
  context,
  onContextChange,
  isConnected,
  isLoading,
}: SidebarProps) {
  return (
    <Box
      as="aside"
      style={{
        width: "360px",
        minWidth: "360px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "white",
        borderRight: "1px solid #e5e7eb",
      }}
    >
      {/* Header */}
      <Box p="5" style={{ borderBottom: "1px solid #e5e7eb" }}>
        <Text as="h1" size="4" weight="semi-bold" color="default">
          Template Preview
        </Text>
        <Text as="p" size="2" color="gray" style={{ marginTop: "4px" }}>
          {workflowName}
        </Text>
        <Stack direction="row" gap="2" style={{ marginTop: "12px", alignItems: "center" }}>
          <Box
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: isConnected ? "#22c55e" : "#9ca3af",
              transition: "background-color 0.3s",
            }}
          />
          <Text as="span" size="1" color="gray">
            {isConnected ? "Live reload active" : "Connecting..."}
          </Text>
        </Stack>
      </Box>

      {/* Content */}
      <Stack
        direction="column"
        gap="6"
        p="5"
        style={{ flex: 1, overflow: "auto" }}
      >
        {/* Step Selector */}
        <Box>
          <StepSelector
            steps={steps}
            selectedRef={selectedStepRef}
            onSelect={onStepSelect}
            disabled={isLoading || steps.length === 0}
          />
        </Box>

        {/* Preview Context */}
        <Box>
          <Text
            as="span"
            size="1"
            weight="medium"
            color="gray"
            style={{ 
              display: "block", 
              marginBottom: "12px", 
              textTransform: "uppercase", 
              letterSpacing: "0.05em" 
            }}
          >
            Preview Context
          </Text>
          <ContextEditor
            context={context}
            onChange={onContextChange}
            disabled={isLoading}
          />
        </Box>

        {/* Data Editor */}
        <Box style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <DataEditor
            data={context.data}
            onChange={(data) => onContextChange({ data })}
            disabled={isLoading}
          />
        </Box>
      </Stack>
    </Box>
  );
}
