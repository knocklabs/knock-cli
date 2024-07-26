import { AnyObj, split } from "@/lib/helpers/object.isomorphic";
import { omitDeep } from "@/lib/helpers/object.isomorphic";
import { WithAnnotation } from "@/lib/marshal/shared/types";

import { EmailLayoutData } from "../email-layout";
import { MessageTypeData } from "../message-type";
import { PartialData } from "../partial";
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
  | MessageTypeData<A>;

export const prepareResourceJson = (
  resource: ResourceData<WithAnnotation>,
): AnyObj => {
  // Move read only field under the dedicated field "__readonly".
  const readonlyFields = resource.__annotation?.readonly_fields || [];
  const [readonly, remainder] = split(resource, readonlyFields);
  const resourceJson = { ...remainder, __readonly: readonly };

  // Strip out all schema annotations, so not to expose them to end users.
  return omitDeep(resourceJson, ["__annotation"]);
};
