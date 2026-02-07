import { useState, useCallback } from 'react'

interface SearchBarProps {
  placeholder?: string
  onSearch?: (query: string) => void
  className?: string
  autoFocus?: boolean
}

export function SearchBar({
  placeholder = 'Search…',
  onSearch,
  className = '',
  autoFocus = false,
}: SearchBarProps) {
  const [value, setValue] = useState('')

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault()
      onSearch?.(value.trim())
    },
    [value, onSearch]
  )

  return (
    <form onSubmit={handleSubmit} className={className}>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm placeholder:text-neutral-400"
        aria-label="Search"
        autoFocus={autoFocus}
      />
    </form>
  )
}
