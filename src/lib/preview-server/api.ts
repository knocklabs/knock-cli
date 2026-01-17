import * as path from "node:path";

import express, { Request, Response, Router } from "express";
import * as fs from "fs-extra";

import { DirContext } from "@/lib/helpers/fs";
import { AnyObj } from "@/lib/helpers/object.isomorphic";
import * as EmailLayout from "@/lib/marshal/email-layout";
import * as Partial from "@/lib/marshal/partial";
import * as Workflow from "@/lib/marshal/workflow";
import { StepType } from "@/lib/marshal/workflow/types";
import { EmailLayoutDirContext, PartialDirContext } from "@/lib/run-context";

import {
  ChannelStep,
  ChannelType,
  LayoutData,
  PartialData,
  PreviewContext,
  PreviewServerConfig,
  TemplatePreviewRequest,
  WorkflowPreviewData,
} from "./types";

/**
 * Extract channel steps from workflow data
 */
function extractChannelSteps(workflowData: AnyObj): ChannelStep[] {
  const channelSteps: ChannelStep[] = [];

  function processSteps(steps: AnyObj[]): void {
    for (const step of steps) {
      if (step.type === StepType.Channel) {
        // Determine channel type from channel_key or template structure
        const channelType = inferChannelType(step);

        channelSteps.push({
          ref: String(step.ref || ""),
          name: step.name as string | undefined,
          channelKey: step.channel_key as string | undefined,
          channelGroupKey: step.channel_group_key as string | undefined,
          channelType,
          template: (step.template as Record<string, unknown>) || {},
        });
      } else if (
        step.type === StepType.Branch &&
        Array.isArray(step.branches)
      ) {
        for (const branch of step.branches) {
          if (Array.isArray(branch.steps)) {
            processSteps(branch.steps);
          }
        }
      }
    }
  }

  if (Array.isArray(workflowData.steps)) {
    processSteps(workflowData.steps);
  }

  return channelSteps;
}

/**
 * Infer channel type from step data
 */
function inferChannelType(step: AnyObj): ChannelType {
  const channelKey = String(step.channel_key || "").toLowerCase();
  const template = (step.template || {}) as AnyObj;

  // Check template structure to infer type
  if (
    template.subject !== undefined ||
    template.html_body !== undefined ||
    template.visual_blocks !== undefined
  ) {
    return "email";
  }

  if (
    template.title !== undefined &&
    template.text_body !== undefined &&
    !template.subject
  ) {
    return "push";
  }

  if (
    template.markdown_body !== undefined &&
    (template.action_url !== undefined || template.action_buttons !== undefined)
  ) {
    return "in_app_feed";
  }

  if (
    template.markdown_body !== undefined ||
    template.json_body !== undefined
  ) {
    return "chat";
  }

  if (
    template.text_body !== undefined &&
    !template.subject &&
    !template.title
  ) {
    return "sms";
  }

  // Fallback: try to infer from channel key
  if (channelKey.includes("email")) return "email";
  if (channelKey.includes("sms")) return "sms";
  if (channelKey.includes("push")) return "push";
  if (
    channelKey.includes("chat") ||
    channelKey.includes("slack") ||
    channelKey.includes("discord")
  )
    return "chat";
  if (channelKey.includes("in_app") || channelKey.includes("feed"))
    return "in_app_feed";

  // Default to email
  return "email";
}

/**
 * Read all layouts from the layouts directory
 */
async function readAllLayouts(
  layoutsDir: DirContext,
): Promise<Map<string, LayoutData>> {
  const layouts = new Map<string, LayoutData>();

  if (!layoutsDir.exists) {
    return layouts;
  }

  try {
    const dirents = await fs.readdir(layoutsDir.abspath, {
      withFileTypes: true,
    });

    // Process directories sequentially to read layouts
    // eslint-disable-next-line no-await-in-loop
    for (const dirent of dirents) {
      if (!dirent.isDirectory()) continue;

      const layoutDirCtx: EmailLayoutDirContext = {
        type: "email_layout",
        key: dirent.name,
        abspath: path.resolve(layoutsDir.abspath, dirent.name),
        exists: true,
      };

      try {
        // eslint-disable-next-line no-await-in-loop
        const [layoutData] = await EmailLayout.readEmailLayoutDir(
          layoutDirCtx,
          {
            withExtractedFiles: true,
          },
        );

        if (layoutData) {
          const data = layoutData as AnyObj;
          layouts.set(dirent.name, {
            key: dirent.name,
            name: data.name as string | undefined,
            html_layout: data.html_layout as string | undefined,
            text_layout: data.text_layout as string | undefined,
          });
        }
      } catch {
        // Skip invalid layout directories
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return layouts;
}

/**
 * Read all partials from the partials directory
 */
async function readAllPartials(
  partialsDir: DirContext,
): Promise<Map<string, PartialData>> {
  const partials = new Map<string, PartialData>();

  if (!partialsDir.exists) {
    return partials;
  }

  try {
    const dirents = await fs.readdir(partialsDir.abspath, {
      withFileTypes: true,
    });

    // Process directories sequentially to read partials
    // eslint-disable-next-line no-await-in-loop
    for (const dirent of dirents) {
      if (!dirent.isDirectory()) continue;

      const partialDirCtx: PartialDirContext = {
        type: "partial",
        key: dirent.name,
        abspath: path.resolve(partialsDir.abspath, dirent.name),
        exists: true,
      };

      try {
        // eslint-disable-next-line no-await-in-loop
        const [partialData] = await Partial.readPartialDir(partialDirCtx, {
          withExtractedFiles: true,
        });

        if (partialData) {
          const data = partialData as AnyObj;
          partials.set(dirent.name, {
            key: dirent.name,
            content: String(data.content || ""),
            type: String(data.type || "html"),
          });
        }
      } catch {
        // Skip invalid partial directories
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return partials;
}

/**
 * Generate sample data from JSON schema
 */
function generateSampleDataFromSchema(
  schema: Record<string, unknown>,
): Record<string, unknown> {
  const sampleData: Record<string, unknown> = {};

  if (!schema || typeof schema !== "object") {
    return sampleData;
  }

  const properties = (schema as AnyObj).properties as
    | Record<string, AnyObj>
    | undefined;
  if (!properties) {
    return sampleData;
  }

  for (const [key, prop] of Object.entries(properties)) {
    if (!prop || typeof prop !== "object") continue;

    switch (prop.type) {
      case "string":
        sampleData[key] = prop.default || prop.example || `sample_${key}`;
        break;
      case "number":
      case "integer":
        sampleData[key] = prop.default || prop.example || 0;
        break;
      case "boolean":
        sampleData[key] = prop.default ?? prop.example ?? true;
        break;
      case "array":
        sampleData[key] = prop.default || prop.example || [];
        break;
      case "object":
        sampleData[key] = prop.default || prop.example || {};
        break;
      default:
        sampleData[key] = null;
    }
  }

  return sampleData;
}

/**
 * Create API router for preview server
 */
export function createApiRouter(config: PreviewServerConfig): Router {
  // eslint-disable-next-line new-cap
  const router = express.Router();

  // Store workflow data and resources in memory for quick access
  let cachedWorkflowData: WorkflowPreviewData | null = null;
  let cachedLayouts: Map<string, LayoutData> = new Map();
  let cachedPartials: Map<string, PartialData> = new Map();

  /**
   * Reload workflow data from disk
   */
  async function reloadWorkflow(): Promise<WorkflowPreviewData> {
    const [workflowData, errors] = await Workflow.readWorkflowDir(
      config.workflowDirCtx,
      { withExtractedFiles: true },
    );

    if (errors.length > 0 || !workflowData) {
      throw new Error(`Failed to read workflow: ${errors[0]?.message}`);
    }

    const channelSteps = extractChannelSteps(workflowData);

    const data = workflowData as AnyObj;
    cachedWorkflowData = {
      key: String(data.key || ""),
      name: String(data.name || ""),
      description: data.description as string | undefined,
      triggerDataJsonSchema: data.trigger_data_json_schema as
        | Record<string, unknown>
        | undefined,
      channelSteps,
    };

    return cachedWorkflowData;
  }

  /**
   * Reload layouts and partials from disk
   */
  async function reloadResources(): Promise<void> {
    cachedLayouts = await readAllLayouts(config.layoutsDir);
    cachedPartials = await readAllPartials(config.partialsDir);
  }

  // Initialize caches
  reloadWorkflow().catch(console.error);
  reloadResources().catch(console.error);

  /**
   * GET /api/workflow
   * Get workflow data including channel steps
   */
  router.get("/workflow", async (_req: Request, res: Response) => {
    try {
      const workflow = await reloadWorkflow();
      res.json(workflow);
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error ? error.message : "Failed to load workflow",
      });
    }
  });

  /**
   * GET /api/workflow/steps
   * Get list of channel steps for selector
   */
  router.get("/workflow/steps", async (_req: Request, res: Response) => {
    try {
      const workflow = await reloadWorkflow();
      res.json(workflow.channelSteps);
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error
            ? error.message
            : "Failed to load workflow steps",
      });
    }
  });

  /**
   * GET /api/schema
   * Get trigger data JSON schema and sample data
   */
  router.get("/schema", async (_req: Request, res: Response) => {
    try {
      const workflow = await reloadWorkflow();
      const schema = workflow.triggerDataJsonSchema || {};
      const sampleData =
        config.sampleData || generateSampleDataFromSchema(schema);

      res.json({
        schema,
        sampleData,
      });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to load schema",
      });
    }
  });

  /**
   * GET /api/layouts
   * Get all available layouts
   */
  router.get("/layouts", async (_req: Request, res: Response) => {
    try {
      await reloadResources();
      const layouts = [...cachedLayouts.values()];
      res.json(layouts);
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error ? error.message : "Failed to load layouts",
      });
    }
  });

  /**
   * GET /api/layouts/:key
   * Get a specific layout by key
   */
  router.get("/layouts/:key", async (req: Request, res: Response) => {
    try {
      await reloadResources();
      const layoutKey = Array.isArray(req.params.key)
        ? req.params.key[0]
        : req.params.key;
      const layout = cachedLayouts.get(layoutKey);

      if (!layout) {
        res.status(404).json({ error: "Layout not found" });
        return;
      }

      res.json(layout);
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Failed to load layout",
      });
    }
  });

  /**
   * GET /api/partials
   * Get all available partials
   */
  router.get("/partials", async (_req: Request, res: Response) => {
    try {
      await reloadResources();
      const partials = [...cachedPartials.values()];
      res.json(partials);
    } catch (error) {
      res.status(500).json({
        error:
          error instanceof Error ? error.message : "Failed to load partials",
      });
    }
  });

  /**
   * POST /api/preview
   * Generate template preview using Knock API
   */
  router.post("/preview", async (req: Request, res: Response) => {
    try {
      const {
        stepRef,
        context,
      }: {
        stepRef: string;
        context: PreviewContext;
      } = req.body;

      // Reload workflow to get latest template
      const workflow = await reloadWorkflow();
      const step = workflow.channelSteps.find((s) => s.ref === stepRef);

      if (!step) {
        res.status(404).json({ error: `Step not found: ${stepRef}` });
        return;
      }

      // Reload resources
      await reloadResources();

      // Build template preview request
      const previewRequest: TemplatePreviewRequest = {
        channel_type: step.channelType,
        template: step.template,
        recipient: { id: context.recipient || "user-1" },
        data: context.data || {},
      };

      // Add optional context
      if (context.actor) {
        previewRequest.actor = { id: context.actor };
      }

      if (context.tenant) {
        previewRequest.tenant = { id: context.tenant };
      }

      // For email templates, resolve layout
      if (step.channelType === "email") {
        const settings = step.template.settings as AnyObj | undefined;
        const layoutKey = settings?.layout_key as string | undefined;

        if (layoutKey && cachedLayouts.has(layoutKey)) {
          const layout = cachedLayouts.get(layoutKey)!;
          previewRequest.layout = {
            html_content: layout.html_layout || "{{ content }}",
            text_content: layout.text_layout,
          };
        }
      }

      // Add partials
      if (cachedPartials.size > 0) {
        previewRequest.partials = {};
        for (const [key, partial] of cachedPartials) {
          previewRequest.partials[key] = partial.content;
        }
      }

      // Call Knock API
      const response = await config.apiClient.client.post(
        "/v1/templates/preview",
        previewRequest,
        {
          headers: {
            "Knock-Environment": config.environment,
          },
        },
      );

      if (response.status >= 400) {
        res.status(response.status).json({
          error: "Preview generation failed",
          errors: response.data?.errors || [
            { message: response.data?.message || "Unknown error" },
          ],
        });
        return;
      }

      res.json(response.data);
    } catch (error) {
      console.error("[api] Preview error:", error);
      res.status(500).json({
        error:
          error instanceof Error ? error.message : "Preview generation failed",
      });
    }
  });

  /**
   * POST /api/reload
   * Force reload all data from disk
   */
  router.post("/reload", async (_req: Request, res: Response) => {
    try {
      await reloadWorkflow();
      await reloadResources();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({
        error: error instanceof Error ? error.message : "Reload failed",
      });
    }
  });

  return router;
}
