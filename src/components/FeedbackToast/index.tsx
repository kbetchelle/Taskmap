import { useFeedbackStore } from '../../stores/feedbackStore'

export function FeedbackToast() {
  const message = useFeedbackStore((s) => s.message)
  const type = useFeedbackStore((s) => s.type)
  const visible = useFeedbackStore((s) => s.visible)

  if (!message) return null

  const typeClasses = {
    success: 'bg-[#34C759] text-white',
    error: 'bg-flow-error text-white',
    info: 'bg-[#007AFF] text-white',
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[2000] px-5 py-3 rounded-lg shadow-lg text-sm font-medium transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
        typeClasses[type]
      } ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6 pointer-events-none'}`}
    >
      {message}
    </div>
  )
}
