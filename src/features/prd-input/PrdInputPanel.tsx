import { open } from "@tauri-apps/plugin-dialog";
import { FileUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Card, CardContent, CardHeader, CardTitle, CardTitleBlock, Input, NativeSelect, Textarea } from "../../shared/ui";
import { loadGoalFile } from "../goal-input/api";
import { composePrdPrompt, defaultPrdInput, type PrdInput } from "./prompt";

type PrdInputPanelProps = {
  value: string;
  onChange: (value: string) => void;
  onError: (value: string | null) => void;
  readOnly?: boolean;
};

export function PrdInputPanel({ value, onChange, onError, readOnly = false }: PrdInputPanelProps) {
  const [input, setInput] = useState<PrdInput>(() => ({
    ...defaultPrdInput,
    requirements: value,
  }));

  useEffect(() => {
    onChange(composePrdPrompt(input));
  }, [input, onChange]);

  function patch(patch: Partial<PrdInput>) {
    setInput((current) => ({ ...current, ...patch }));
  }

  async function handleLoadFile() {
    const selected = await open({
      multiple: false,
      filters: [{ name: "PRD source", extensions: ["txt", "md"] }],
    });
    if (!selected || Array.isArray(selected)) return;
    try {
      patch({ requirements: await loadGoalFile(selected) });
      onError(null);
    } catch (err) {
      onError(String(err));
    }
  }

  return (
    <Card as="section" className="flex min-h-0 flex-col" aria-labelledby="prd-input-heading">
      <CardHeader>
        <CardTitleBlock>
          <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">PRD</p>
          <CardTitle id="prd-input-heading">Product brief</CardTitle>
        </CardTitleBlock>
        <Button
          type="button"
          variant="ghost"
          icon={<FileUp size={16} />}
          onClick={handleLoadFile}
          disabled={readOnly}
        >
          Load
        </Button>
      </CardHeader>
      <CardContent className="grid min-h-0 flex-1 gap-4 overflow-auto">
        <label className="grid gap-2">
          <span className="text-sm font-medium">Feature name</span>
          <Input
            value={input.featureName}
            onChange={(event) => patch({ featureName: event.target.value })}
            disabled={readOnly}
            placeholder="PRD builder, onboarding flow, billing dashboard"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium">Problem / background</span>
          <Textarea
            value={input.problem}
            onChange={(event) => patch({ problem: event.target.value })}
            disabled={readOnly}
            className="min-h-[88px]"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium">Target users</span>
          <Input
            value={input.users}
            onChange={(event) => patch({ users: event.target.value })}
            disabled={readOnly}
            placeholder="PMs, founders, internal operators"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium">Requirements</span>
          <Textarea
            value={input.requirements}
            onChange={(event) => patch({ requirements: event.target.value })}
            disabled={readOnly}
            className="min-h-[150px]"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium">Constraints</span>
          <Textarea
            value={input.constraints}
            onChange={(event) => patch({ constraints: event.target.value })}
            disabled={readOnly}
            className="min-h-[82px]"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-sm font-medium">Output language</span>
          <NativeSelect
            value={input.outputLanguage}
            onChange={(event) => patch({ outputLanguage: event.target.value as PrdInput["outputLanguage"] })}
            disabled={readOnly}
          >
            <option value="ko">Korean</option>
            <option value="en">English</option>
          </NativeSelect>
        </label>
      </CardContent>
    </Card>
  );
}
