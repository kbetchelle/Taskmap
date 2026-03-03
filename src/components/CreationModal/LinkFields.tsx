interface LinkFieldsProps {
  url: string
  onUrlChange: (u: string) => void
  urlError: string | null
}

export function LinkFields({ url, onUrlChange, urlError }: LinkFieldsProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-flow-meta text-flow-textSecondary font-flow-medium">URL</label>
      <input
        type="url"
        className={`
          px-3 py-1.5 text-sm border rounded-md bg-flow-background text-flow-textPrimary
          placeholder:text-flow-textDisabled focus:outline-none focus:border-flow-focus
          ${urlError ? 'border-flow-error ring-1 ring-flow-error/30' : 'border-flow-columnBorder'}
        `}
        placeholder="https://example.com"
        value={url}
        onChange={(e) => onUrlChange(e.target.value)}
        autoComplete="url"
      />
      {urlError && (
        <p className="text-flow-meta text-flow-error">{urlError}</p>
      )}
    </div>
  )
}
