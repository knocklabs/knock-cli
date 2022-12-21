import { PlainObj } from "@/lib/helpers/object-helpers";

export type WorkflowTyped = {
  key: string;
  name: string;
  active: boolean;
  valid: boolean;
  categories?: string[];
  description?: string;
  created_at: string;
  updated_at: string;
};

export type WorkflowPayload = WorkflowTyped & PlainObj;
