import { omit } from "lodash";

import { AnyObj, omitDeep, split } from "@/lib/helpers/object.isomorphic";
import { WithAnnotation } from "@/lib/marshal/shared/types";

import { EmailLayoutData } from "../email-layout";
import { GuideData } from "../guide";
import { MessageTypeData } from "../message-type";
import { PartialData } from "../partial";
import { ReusableStepData } from "../reusable-step";
import { WorkflowData } from "../workflow";

/*
 * Sanitize the resource data into a format that's appropriate for reading
 * and writing, by stripping out any annotation fields and handling readonly
 * fields.
 */
type ResourceData<A extends WithAnnotation> =
  | EmailLayoutData<A>
  | PartialData<A>
  | WorkflowData<A>
  | MessageTypeData<A>
  | GuideData<A>
  | ReusableStepData<A>;

// sha and updated_at fields change too frequently, so we exclude them from resource JSON files
const REMOVED_READONLY_FIELDS = ["sha", "updated_at"];

export const prepareResourceJson = (
  resource: ResourceData<WithAnnotation>,
  $schema?: string,
): AnyObj => {
  const readonlyFields = resource.__annotation?.readonly_fields || [];
  const [readonly, remainder] = split(resource, readonlyFields);

  const filteredReadonlyFields = omit(readonly, REMOVED_READONLY_FIELDS);

  // Move remaining read only fields under the dedicated field "__readonly".
  const resourceJson = { ...remainder, __readonly: filteredReadonlyFields };

  // Append the $schema property to the resource JSON if it is provided.
  if ($schema) {
    Object.assign(resourceJson, { $schema });
  }

  // Strip out all schema annotations, so not to expose them to end users.
  return omitDeep(resourceJson, ["__annotation"]);
};
