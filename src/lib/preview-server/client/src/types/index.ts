/**
 * Channel types supported for preview
 */
export type ChannelType = "email" | "sms" | "push" | "chat" | "in_app_feed";

/**
 * A channel step extracted from a workflow
 */
export interface ChannelStep {
  ref: string;
  name?: string;
  channelKey?: string;
  channelGroupKey?: string;
  channelType: ChannelType;
  template: Record<string, unknown>;
}

/**
 * Preview context provided by the user
 */
export interface PreviewContext {
  recipient: string;
  actor: string;
  tenant: string;
  data: Record<string, unknown>;
}

/**
 * Workflow preview data
 */
export interface WorkflowPreviewData {
  key: string;
  name: string;
  description?: string;
  triggerDataJsonSchema?: Record<string, unknown>;
  channelSteps: ChannelStep[];
}

/**
 * Schema and sample data response
 */
export interface SchemaResponse {
  schema: Record<string, unknown>;
  sampleData: Record<string, unknown>;
}

/**
 * Preview response from API
 */
export interface PreviewResponse {
  subject?: string;
  html_body?: string;
  text_body?: string;
  preview_text?: string;
  title?: string;
  markdown_body?: string;
  summary?: string;
  json_body?: string;
  action_url?: string;
}

/**
 * Preview error response
 */
export interface PreviewError {
  error?: string;
  errors?: Array<{
    message: string;
    field?: string;
  }>;
}

/**
 * View mode for email preview
 */
export type ViewMode = "html" | "text";

/**
 * Viewport size for responsive preview
 */
export type ViewportSize = "desktop" | "tablet" | "mobile";

/**
 * Viewport dimensions
 */
export const VIEWPORT_DIMENSIONS: Record<ViewportSize, number> = {
  desktop: 1200,
  tablet: 768,
  mobile: 375,
};

/**
 * WebSocket message types
 */
export interface WebSocketMessage {
  type: "reload" | "connected" | "error";
  stepRef?: string;
  message?: string;
}
