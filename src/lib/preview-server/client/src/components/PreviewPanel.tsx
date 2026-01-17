import { Box, Stack } from "@telegraph/layout";
import { Text } from "@telegraph/typography";
import { useMemo } from "react";

import {
  ChannelType,
  PreviewResponse,
  ViewMode,
  ViewportSize,
  VIEWPORT_DIMENSIONS,
} from "../types";

interface PreviewPanelProps {
  preview: PreviewResponse | null;
  channelType: ChannelType;
  viewMode: ViewMode;
  viewportSize: ViewportSize;
  isLoading: boolean;
  error: string | null;
}

export function PreviewPanel({
  preview,
  channelType,
  viewMode,
  viewportSize,
  isLoading,
  error,
}: PreviewPanelProps) {
  const viewportWidth = VIEWPORT_DIMENSIONS[viewportSize];

  const content = useMemo(() => {
    if (error) {
      return (
        <Stack direction="column" gap="4" style={{ alignItems: "center", padding: "48px 24px", textAlign: "center" }}>
          <span style={{ fontSize: "48px" }}>⚠️</span>
          <Text as="h2" size="4" weight="semi-bold" color="red">
            Preview Error
          </Text>
          <Text
            as="pre"
            size="2"
            color="gray"
            style={{
              maxWidth: "400px",
              whiteSpace: "pre-wrap",
              fontFamily: '"SF Mono", Monaco, "Cascadia Code", monospace',
            }}
          >
            {error}
          </Text>
        </Stack>
      );
    }

    if (isLoading) {
      return (
        <Stack direction="column" gap="4" style={{ alignItems: "center", padding: "48px 24px" }}>
          <Box
            style={{
              width: "32px",
              height: "32px",
              border: "3px solid #e5e7eb",
              borderTopColor: "#6366f1",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <Text as="span" size="2" color="gray">
            Generating preview...
          </Text>
        </Stack>
      );
    }

    if (!preview) {
      return (
        <Stack direction="column" gap="4" style={{ alignItems: "center", padding: "48px 24px", textAlign: "center" }}>
          <span style={{ fontSize: "48px", opacity: 0.5 }}>📄</span>
          <Text as="span" size="2" color="gray">
            Select a channel step to preview
          </Text>
        </Stack>
      );
    }

    // Render based on channel type
    switch (channelType) {
      case "email":
        return renderEmailPreview(preview, viewMode);
      case "sms":
        return renderSmsPreview(preview);
      case "push":
        return renderPushPreview(preview);
      case "chat":
        return renderChatPreview(preview);
      case "in_app_feed":
        return renderInAppFeedPreview(preview);
      default:
        return renderEmailPreview(preview, viewMode);
    }
  }, [preview, channelType, viewMode, isLoading, error]);

  return (
    <Box
      style={{
        flex: 1,
        display: "flex",
        justifyContent: "center",
        padding: "24px",
        backgroundColor: "#f3f4f6",
        overflow: "auto",
      }}
    >
      <Box
        style={{
          width: "100%",
          maxWidth: viewportSize === "desktop" ? "100%" : viewportWidth,
          backgroundColor: "white",
          borderRadius: "8px",
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)",
          overflow: "hidden",
          transition: "max-width 0.3s ease",
        }}
      >
        {content}
      </Box>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </Box>
  );
}

function renderEmailPreview(preview: PreviewResponse, viewMode: ViewMode) {
  const { subject, html_body, text_body } = preview;

  return (
    <Box>
      {subject && (
        <Box p="4" style={{ borderBottom: "1px solid #e5e7eb", backgroundColor: "#f9fafb" }}>
          <Text as="span" size="1" color="gray" style={{ textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Subject
          </Text>
          <Text as="p" size="3" weight="medium" color="default" style={{ marginTop: "4px" }}>
            {subject}
          </Text>
        </Box>
      )}
      {viewMode === "html" && html_body ? (
        <iframe
          srcDoc={html_body}
          title="Email Preview"
          sandbox="allow-same-origin"
          style={{
            width: "100%",
            border: "none",
            minHeight: "500px",
          }}
        />
      ) : (
        <Box
          as="pre"
          p="5"
          style={{
            fontFamily: '"SF Mono", Monaco, "Cascadia Code", monospace',
            fontSize: "13px",
            lineHeight: 1.6,
            whiteSpace: "pre-wrap",
            color: "#374151",
            margin: 0,
          }}
        >
          {text_body || "No text content available"}
        </Box>
      )}
    </Box>
  );
}

function renderSmsPreview(preview: PreviewResponse) {
  const { text_body } = preview;

  return (
    <Box p="5">
      <Box
        style={{
          maxWidth: "280px",
          padding: "12px 16px",
          backgroundColor: "#e5e7eb",
          borderRadius: "18px",
          borderBottomLeftRadius: "4px",
        }}
      >
        <Text as="span" size="2" color="default" style={{ lineHeight: 1.4 }}>
          {text_body || "No message content"}
        </Text>
      </Box>
    </Box>
  );
}

function renderPushPreview(preview: PreviewResponse) {
  const { title, text_body } = preview;

  return (
    <Box p="5">
      <Box
        style={{
          maxWidth: "360px",
          padding: "16px",
          backgroundColor: "#f9fafb",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
        }}
      >
        {title && (
          <Text as="strong" size="2" weight="semi-bold" color="default">
            {title}
          </Text>
        )}
        <Text as="p" size="2" color="gray" style={{ marginTop: title ? "4px" : 0 }}>
          {text_body || "No message content"}
        </Text>
      </Box>
    </Box>
  );
}

function renderChatPreview(preview: PreviewResponse) {
  const { summary, markdown_body, json_body } = preview;

  return (
    <Box p="5">
      <Box
        style={{
          maxWidth: "400px",
          padding: "16px",
          backgroundColor: "#f9fafb",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
        }}
      >
        {summary && (
          <Text as="strong" size="2" weight="medium" color="default">
            {summary}
          </Text>
        )}
        <Text as="p" size="2" color="gray" style={{ marginTop: summary ? "8px" : 0, lineHeight: 1.5 }}>
          {markdown_body || json_body || "No message content"}
        </Text>
      </Box>
    </Box>
  );
}

function renderInAppFeedPreview(preview: PreviewResponse) {
  const { markdown_body } = preview;

  return (
    <Box p="5">
      <Box
        style={{
          maxWidth: "400px",
          padding: "16px",
          backgroundColor: "white",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
        }}
      >
        <Text as="p" size="2" color="gray" style={{ lineHeight: 1.5 }}>
          {markdown_body || "No message content"}
        </Text>
      </Box>
    </Box>
  );
}
