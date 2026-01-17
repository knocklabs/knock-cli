import { Box } from "@telegraph/layout";
import { Text } from "@telegraph/typography";
import { ChangeEvent, useCallback, useEffect, useState } from "react";

interface DataEditorProps {
  data: Record<string, unknown>;
  onChange: (data: Record<string, unknown>) => void;
  schema?: Record<string, unknown>;
  disabled?: boolean;
}

export function DataEditor({
  data,
  onChange,
  disabled = false,
}: DataEditorProps) {
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Sync external data to text
  useEffect(() => {
    setJsonText(JSON.stringify(data, null, 2));
    setError(null);
  }, [data]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLTextAreaElement>) => {
      const text = e.target.value;
      setJsonText(text);

      try {
        const parsed = JSON.parse(text);
        setError(null);
        onChange(parsed);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Invalid JSON");
      }
    },
    [onChange]
  );

  return (
    <Box style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <Text
        as="label"
        size="1"
        weight="medium"
        color="gray"
        style={{ display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}
      >
        Trigger Data (JSON)
      </Text>
      <textarea
        value={jsonText}
        onChange={handleChange}
        disabled={disabled}
        spellCheck={false}
        style={{
          flex: 1,
          minHeight: "120px",
          padding: "12px",
          fontSize: "13px",
          fontFamily: '"SF Mono", Monaco, "Cascadia Code", "Roboto Mono", Consolas, monospace',
          lineHeight: 1.5,
          border: `1px solid ${error ? "#ef4444" : "#d1d5db"}`,
          borderRadius: "8px",
          backgroundColor: disabled ? "#f3f4f6" : "white",
          resize: "vertical",
        }}
      />
      {error && (
        <Text as="span" size="1" color="red" style={{ marginTop: "4px" }}>
          {error}
        </Text>
      )}
    </Box>
  );
}
