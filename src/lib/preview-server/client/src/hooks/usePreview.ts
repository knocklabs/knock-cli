import { useCallback, useEffect, useState } from "react";

import {
  ChannelStep,
  PreviewContext,
  PreviewError,
  PreviewResponse,
  SchemaResponse,
  WorkflowPreviewData,
} from "../types";

interface UsePreviewReturn {
  // Workflow data
  workflow: WorkflowPreviewData | null;
  channelSteps: ChannelStep[];
  isLoadingWorkflow: boolean;
  workflowError: string | null;

  // Selected step
  selectedStep: ChannelStep | null;
  setSelectedStepRef: (ref: string) => void;

  // Preview context
  context: PreviewContext;
  updateContext: (updates: Partial<PreviewContext>) => void;

  // Schema and sample data
  schema: Record<string, unknown>;
  sampleData: Record<string, unknown>;

  // Preview result
  preview: PreviewResponse | null;
  isLoadingPreview: boolean;
  previewError: string | null;

  // Actions
  refreshPreview: () => Promise<void>;
  refreshWorkflow: () => Promise<void>;
}

const DEFAULT_CONTEXT: PreviewContext = {
  recipient: "user-1",
  actor: "",
  tenant: "",
  data: {},
};

export function usePreview(): UsePreviewReturn {
  // Workflow state
  const [workflow, setWorkflow] = useState<WorkflowPreviewData | null>(null);
  const [isLoadingWorkflow, setIsLoadingWorkflow] = useState(true);
  const [workflowError, setWorkflowError] = useState<string | null>(null);

  // Selected step
  const [selectedStepRef, setSelectedStepRef] = useState<string>("");

  // Preview context
  const [context, setContext] = useState<PreviewContext>(DEFAULT_CONTEXT);

  // Schema
  const [schema, setSchema] = useState<Record<string, unknown>>({});
  const [sampleData, setSampleData] = useState<Record<string, unknown>>({});

  // Preview result
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  // Derived state
  const channelSteps = workflow?.channelSteps || [];
  const selectedStep =
    channelSteps.find((s) => s.ref === selectedStepRef) || null;

  // Fetch workflow data
  const refreshWorkflow = useCallback(async () => {
    setIsLoadingWorkflow(true);
    setWorkflowError(null);

    try {
      const response = await fetch("/api/workflow");
      if (!response.ok) {
        throw new Error(`Failed to load workflow: ${response.statusText}`);
      }

      const data: WorkflowPreviewData = await response.json();
      setWorkflow(data);

      // Select first email step by default, or first step if no email
      if (data.channelSteps.length > 0 && !selectedStepRef) {
        const emailStep = data.channelSteps.find(
          (s) => s.channelType === "email",
        );
        setSelectedStepRef(emailStep?.ref || data.channelSteps[0].ref);
      }
    } catch (error) {
      setWorkflowError(
        error instanceof Error ? error.message : "Failed to load workflow",
      );
    } finally {
      setIsLoadingWorkflow(false);
    }
  }, [selectedStepRef]);

  // Fetch schema and sample data
  const fetchSchema = useCallback(async () => {
    try {
      const response = await fetch("/api/schema");
      if (!response.ok) {
        return;
      }

      const data: SchemaResponse = await response.json();
      setSchema(data.schema);
      setSampleData(data.sampleData);

      // Update context with sample data if data is empty
      setContext((prev) => {
        if (
          Object.keys(prev.data).length === 0 &&
          Object.keys(data.sampleData).length > 0
        ) {
          return { ...prev, data: data.sampleData };
        }

        return prev;
      });
    } catch {
      // Schema is optional, don't show error
    }
  }, []);

  // Generate preview
  const refreshPreview = useCallback(async () => {
    if (!selectedStep) {
      return;
    }

    setIsLoadingPreview(true);
    setPreviewError(null);

    try {
      const response = await fetch("/api/preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          stepRef: selectedStep.ref,
          context,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as PreviewError;
        const errorMessage =
          errorData.error ||
          errorData.errors?.map((e) => e.message).join(", ") ||
          "Preview generation failed";
        setPreviewError(errorMessage);
        return;
      }

      setPreview(data as PreviewResponse);
    } catch (error) {
      setPreviewError(
        error instanceof Error ? error.message : "Preview generation failed",
      );
    } finally {
      setIsLoadingPreview(false);
    }
  }, [selectedStep, context]);

  // Update context
  const updateContext = useCallback((updates: Partial<PreviewContext>) => {
    setContext((prev) => ({ ...prev, ...updates }));
  }, []);

  // Initial load
  useEffect(() => {
    refreshWorkflow();
    fetchSchema();
  }, [refreshWorkflow, fetchSchema]);

  // Refresh preview when step or context changes
  useEffect(() => {
    if (selectedStep) {
      refreshPreview();
    }
  }, [selectedStep, context, refreshPreview]);

  return {
    workflow,
    channelSteps,
    isLoadingWorkflow,
    workflowError,
    selectedStep,
    setSelectedStepRef,
    context,
    updateContext,
    schema,
    sampleData,
    preview,
    isLoadingPreview,
    previewError,
    refreshPreview,
    refreshWorkflow,
  };
}
