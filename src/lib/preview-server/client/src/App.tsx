import { Button } from "@telegraph/button";
import { Box, Stack } from "@telegraph/layout";
import { Text } from "@telegraph/typography";
import { useCallback, useState } from "react";

import { Header } from "./components/Header";
import { PreviewPanel } from "./components/PreviewPanel";
import { Sidebar } from "./components/Sidebar";
import { usePreview } from "./hooks/usePreview";
import { useWebSocket } from "./hooks/useWebSocket";
import { ViewMode, ViewportSize } from "./types";

export function App() {
  // Preview state and data
  const {
    workflow,
    channelSteps,
    isLoadingWorkflow,
    workflowError,
    selectedStep,
    setSelectedStepRef,
    context,
    updateContext,
    preview,
    isLoadingPreview,
    previewError,
    refreshPreview,
    refreshWorkflow,
  } = usePreview();

  // View controls
  const [viewMode, setViewMode] = useState<ViewMode>("html");
  const [viewportSize, setViewportSize] = useState<ViewportSize>("desktop");

  // WebSocket for live reload
  const handleReload = useCallback(() => {
    refreshWorkflow();
    refreshPreview();
  }, [refreshWorkflow, refreshPreview]);

  const { isConnected } = useWebSocket({
    onReload: handleReload,
  });

  // Loading state
  if (isLoadingWorkflow && !workflow) {
    return (
      <Box
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          width: "100vw",
        }}
      >
        <Stack direction="column" gap="4" style={{ alignItems: "center" }}>
          <Box
            style={{
              width: "40px",
              height: "40px",
              border: "3px solid #e5e7eb",
              borderTopColor: "#6366f1",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <Text as="span" size="3" color="gray">
            Loading workflow...
          </Text>
        </Stack>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </Box>
    );
  }

  // Error state
  if (workflowError) {
    return (
      <Box
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          width: "100vw",
        }}
      >
        <Stack direction="column" gap="4" style={{ alignItems: "center", textAlign: "center", padding: "24px" }}>
          <span style={{ fontSize: "48px" }}>⚠️</span>
          <Text as="h1" size="4" weight="semi-bold" color="red">
            Failed to load workflow
          </Text>
          <Text as="p" size="2" color="gray" style={{ maxWidth: "400px" }}>
            {workflowError}
          </Text>
          <Button onClick={refreshWorkflow} size="2" variant="solid">
            Retry
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      style={{
        display: "flex",
        height: "100vh",
        width: "100vw",
        overflow: "hidden",
      }}
    >
      <Sidebar
        workflowName={workflow?.name || workflow?.key || "Workflow"}
        steps={channelSteps}
        selectedStepRef={selectedStep?.ref || ""}
        onStepSelect={setSelectedStepRef}
        context={context}
        onContextChange={updateContext}
        isConnected={isConnected}
        isLoading={isLoadingPreview}
      />
      <Box
        as="main"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <Header
          channelType={selectedStep?.channelType || "email"}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          viewportSize={viewportSize}
          onViewportSizeChange={setViewportSize}
          isLoading={isLoadingPreview}
        />
        <PreviewPanel
          preview={preview}
          channelType={selectedStep?.channelType || "email"}
          viewMode={viewMode}
          viewportSize={viewportSize}
          isLoading={isLoadingPreview}
          error={previewError}
        />
      </Box>
    </Box>
  );
}
