import { DirContext } from "@/lib/helpers/fs";
import { WorkflowDirContext } from "@/lib/run-context";

import ApiV1 from "../api-v1";

/**
 * Configuration for the preview server
 */
export interface PreviewServerConfig {
  workflowDirCtx: WorkflowDirContext;
  layoutsDir: DirContext;
  partialsDir: DirContext;
  sampleData?: Record<string, unknown>;
  port: number;
  apiClient: ApiV1;
  environment: string;
  branch?: string;
}

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
  actor?: string;
  tenant?: string;
  data: Record<string, unknown>;
}

/**
 * Email template fields
 */
export interface EmailTemplate {
  subject?: string;
  html_body?: string;
  text_body?: string;
  preview_text?: string;
  visual_blocks?: unknown[];
}

/**
 * SMS template fields
 */
export interface SmsTemplate {
  text_body?: string;
}

/**
 * Push template fields
 */
export interface PushTemplate {
  title?: string;
  text_body?: string;
}

/**
 * Chat template fields
 */
export interface ChatTemplate {
  summary?: string;
  markdown_body?: string;
  json_body?: string;
}

/**
 * In-app feed template fields
 */
export interface InAppFeedTemplate {
  markdown_body?: string;
  action_url?: string;
  action_buttons?: Array<{
    label: string;
    action: string;
    name: string;
  }>;
}

/**
 * Request body for template preview API
 */
export interface TemplatePreviewRequest {
  channel_type: ChannelType;
  template: Record<string, unknown>;
  recipient: { id: string; name?: string; email?: string };
  actor?: { id: string; name?: string };
  tenant?: { id: string; name?: string };
  data?: Record<string, unknown>;
  layout?: { key: string } | { html_content: string; text_content?: string };
  partials?: Record<string, string>;
}

/**
 * Response from template preview API
 */
export interface TemplatePreviewResponse {
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
 * Error response from template preview API
 */
export interface TemplatePreviewError {
  message: string;
  field?: string;
  code?: string;
}

/**
 * Workflow data with channel steps
 */
export interface WorkflowPreviewData {
  key: string;
  name: string;
  description?: string;
  triggerDataJsonSchema?: Record<string, unknown>;
  channelSteps: ChannelStep[];
}

/**
 * Layout data for email preview
 */
export interface LayoutData {
  key: string;
  name?: string;
  html_layout?: string;
  text_layout?: string;
}

/**
 * Partial data for template preview
 */
export interface PartialData {
  key: string;
  content: string;
  type: string;
}

/**
 * WebSocket message types
 */
export type WebSocketMessage =
  | { type: "reload"; stepRef?: string }
  | { type: "connected" }
  | { type: "error"; message: string };
