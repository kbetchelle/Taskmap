import { type ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
}

export function Button({ variant = 'primary', className = '', children, ...props }: ButtonProps) {
  const base = 'px-3 py-2 text-sm font-medium rounded-md transition-colors disabled:opacity-50'
  const variants = {
    primary: 'bg-accent text-white hover:bg-accent/90',
    secondary: 'bg-neutral-200 text-neutral-900 hover:bg-neutral-300',
    ghost: 'text-neutral-700 hover:bg-neutral-100',
  }
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  )
}
