import { Input } from "@telegraph/input";
import { Box, Stack } from "@telegraph/layout";
import { Text } from "@telegraph/typography";
import { ChangeEvent } from "react";

import { PreviewContext } from "../types";

interface ContextEditorProps {
  context: PreviewContext;
  onChange: (updates: Partial<PreviewContext>) => void;
  disabled?: boolean;
}

export function ContextEditor({
  context,
  onChange,
  disabled = false,
}: ContextEditorProps) {
  return (
    <Stack direction="column" gap="4">
      <Box>
        <Text
          as="label"
          size="1"
          weight="medium"
          color="gray"
          style={{ display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}
        >
          Recipient ID
        </Text>
        <Input
          value={context.recipient}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ recipient: e.target.value })}
          placeholder="user-1"
          disabled={disabled}
          size="2"
        />
      </Box>

      <Box>
        <Text
          as="label"
          size="1"
          weight="medium"
          color="gray"
          style={{ display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}
        >
          Actor ID (optional)
        </Text>
        <Input
          value={context.actor}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ actor: e.target.value })}
          placeholder="actor-1"
          disabled={disabled}
          size="2"
        />
      </Box>

      <Box>
        <Text
          as="label"
          size="1"
          weight="medium"
          color="gray"
          style={{ display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}
        >
          Tenant ID (optional)
        </Text>
        <Input
          value={context.tenant}
          onChange={(e: ChangeEvent<HTMLInputElement>) => onChange({ tenant: e.target.value })}
          placeholder="tenant-1"
          disabled={disabled}
          size="2"
        />
      </Box>
    </Stack>
  );
}
