import React from 'react';
import toast from 'react-hot-toast';

export const confirmToast = ({
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'danger',
  onConfirm,
}) => {
  const confirmClass = tone === 'danger'
    ? 'bg-brand text-white hover:bg-red-600'
    : 'bg-emerald-600 text-white hover:bg-emerald-700';

  toast((t) => (
    <div className="max-w-sm space-y-3">
      <div>
        <p className="text-sm font-bold text-light-text">{title}</p>
        {description && <p className="mt-1 text-xs font-medium text-light-muted">{description}</p>}
      </div>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => toast.dismiss(t.id)}
          className="rounded-xl border border-light-border px-3 py-2 text-xs font-bold text-light-muted transition hover:bg-light-bg"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={async () => {
            toast.dismiss(t.id);
            await onConfirm?.();
          }}
          className={`rounded-xl px-3 py-2 text-xs font-bold transition ${confirmClass}`}
        >
          {confirmLabel}
        </button>
      </div>
    </div>
  ), { duration: 10000 });
};
