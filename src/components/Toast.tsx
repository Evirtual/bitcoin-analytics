type ToastProps = {
  open: boolean
  variant?: 'error' | 'default'
  message: string
  onClose: () => void
}

export function Toast({ open, variant = 'default', message, onClose }: ToastProps) {
  if (!open) return null

  return (
    <div className="toastHost" role="status" aria-live={variant === 'error' ? 'assertive' : 'polite'}>
      <div className={variant === 'error' ? 'toast banner error' : 'toast banner'}>
        <div className="toastMessage">{message}</div>
        <button className="iconBtn toastClose" type="button" onClick={onClose} aria-label="Dismiss">
          ✕
        </button>
      </div>
    </div>
  )
}
