import { omit } from "lodash";

import { AnyObj, omitDeep, split } from "@/lib/helpers/object.isomorphic";
import { WithAnnotation } from "@/lib/marshal/shared/types";

import { EmailLayoutData } from "../email-layout";
import { GuideData } from "../guide";
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
  | MessageTypeData<A>
  | GuideData<A>;

const REMOVED_READONLY_FIELDS = ["sha", "updated_at"];

export const prepareResourceJson = (
  resource: ResourceData<WithAnnotation>,
): AnyObj => {
  const readonlyFields = resource.__annotation?.readonly_fields || [];
  const [readonly, remainder] = split(resource, readonlyFields);

  const filteredReadonlyFields = omit(readonly, REMOVED_READONLY_FIELDS);

  // Move remaining read only fields under the dedicated field "__readonly".
  const resourceJson = { ...remainder, __readonly: filteredReadonlyFields };

  // Strip out all schema annotations, so not to expose them to end users.
  return omitDeep(resourceJson, ["__annotation"]);
};
