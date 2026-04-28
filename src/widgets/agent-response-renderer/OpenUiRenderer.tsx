type OpenUiRendererProps = {
  schema: unknown;
};

export function OpenUiRenderer({ schema }: OpenUiRendererProps) {
  return (
    <div className="grid gap-2 rounded-md border bg-muted/25 p-3 text-sm">
      <div className="font-medium text-foreground">OpenUI preview</div>
      <pre className="m-0 max-h-[360px] overflow-auto whitespace-pre-wrap break-words rounded border bg-background p-3 font-mono text-xs leading-5">
        {JSON.stringify(schema, null, 2)}
      </pre>
    </div>
  );
}
