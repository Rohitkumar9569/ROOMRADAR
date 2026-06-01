import React, { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import toast from 'react-hot-toast';
import {
  AlertTriangle,
  ArrowLeft,
  FileText,
  ImagePlus,
  Link as LinkIcon,
  Loader2,
  MessageSquare,
  Paperclip,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import api from '../../api';
import { useAuth } from '../../context/AuthContext';

const categories = [
  { value: 'account', label: 'Account / ban review' },
  { value: 'listing', label: 'Room approval / listing' },
  { value: 'booking', label: 'Booking request' },
  { value: 'payment', label: 'Payment / refund' },
  { value: 'verification', label: 'Verification / KYC' },
  { value: 'safety', label: 'Safety concern' },
  { value: 'damage', label: 'Damage report' },
  { value: 'other', label: 'Other issue' },
];

const priorities = [
  { value: 'medium', label: 'Normal' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
  { value: 'low', label: 'Low' },
];

const issueTypesByCategory = {
  payment: 'refund_request',
  refund: 'refund_request',
  damage: 'damage_claim',
  safety: 'dispute',
  listing: 'misrepresentation',
};

const MAX_PROOF_FILES = 5;
const MAX_PROOF_FILE_SIZE = 8 * 1024 * 1024;
const ALLOWED_PROOF_FILE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'application/pdf',
]);

const trimText = (value, maxLength) => String(value || '').trim().slice(0, maxLength);

const formatSupportScope = (scope = '') => ({
  travelling: 'room seeker',
  student: 'room seeker',
  landlord: 'host',
  platform: 'RoomRadar',
}[String(scope || '').toLowerCase()] || scope);

const normalizeEvidenceLinks = (value = '') => String(value || '')
  .split(/\n|,/)
  .map((item) => item.trim())
  .filter(Boolean)
  .slice(0, 5)
  .map((url) => ({
    url,
    type: /\.(png|jpe?g|webp|gif)$/i.test(url) ? 'image' : /\.(pdf)$/i.test(url) ? 'pdf' : 'other',
    caption: 'User shared proof link',
  }));

const getEvidenceType = (file) => {
  const type = file?.type || '';
  if (type.startsWith('image/')) return 'image';
  if (type.startsWith('video/')) return 'video';
  if (type === 'application/pdf' || /\.pdf$/i.test(file?.name || '')) return 'pdf';
  return 'other';
};

const formatFileSize = (size = 0) => {
  if (!size) return '0 KB';
  if (size < 1024 * 1024) return `${Math.max(1, Math.round(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toFixed(size > 4 * 1024 * 1024 ? 0 : 1)} MB`;
};

const AdminSupportMark = ({ size = 'mobile' }) => {
  const isDesktop = size === 'desktop';

  return (
    <span
      className={`relative flex flex-shrink-0 items-center justify-center overflow-visible rounded-2xl bg-slate-950 text-white shadow-[0_16px_34px_-24px_rgba(15,23,42,0.88)] ring-1 ring-white/20 ${
        isDesktop ? 'h-12 w-12' : 'h-10 w-10'
      }`}
      aria-hidden="true"
    >
      <span className="absolute inset-0 rounded-2xl bg-slate-950" />
      <span className="relative flex h-[72%] w-[72%] items-center justify-center rounded-full bg-white/14 ring-1 ring-white/20">
        <ShieldCheck className={isDesktop ? 'h-6 w-6' : 'h-5 w-5'} strokeWidth={2.35} />
      </span>
      <span className="absolute -bottom-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[8px] font-black leading-none text-cyan-700 ring-1 ring-cyan-100 dark:bg-slate-950 dark:text-cyan-200 dark:ring-cyan-400/30">
        RR
      </span>
    </span>
  );
};

function SupportTicketModal({
  open,
  onClose,
  defaultCategory = 'other',
  defaultPriority = 'medium',
  defaultSubject = '',
  defaultMessage = '',
  context = {},
}) {
  const { user } = useAuth();
  const [category, setCategory] = useState(defaultCategory);
  const [priority, setPriority] = useState(defaultPriority);
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState(defaultMessage);
  const [proofLinks, setProofLinks] = useState('');
  const [proofFiles, setProofFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    setCategory(defaultCategory || 'other');
    setPriority(defaultPriority || 'medium');
    setSubject(defaultSubject || '');
    setMessage(defaultMessage || '');
    setProofLinks('');
    setProofFiles([]);

    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = 'hidden';
    document.body.style.paddingRight = scrollbarWidth > 0 ? `${scrollbarWidth}px` : previousPaddingRight;

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, [defaultCategory, defaultMessage, defaultPriority, defaultSubject, open]);

  const selectedCategoryLabel = useMemo(
    () => categories.find((item) => item.value === category)?.label || 'Support issue',
    [category]
  );

  const handleProofFileChange = (event) => {
    const incomingFiles = Array.from(event.target.files || []);
    event.target.value = '';
    if (!incomingFiles.length) return;

    const validFiles = [];
    incomingFiles.forEach((file) => {
      const allowed = ALLOWED_PROOF_FILE_TYPES.has(file.type);
      if (!allowed) {
        toast.error('Only JPG, PNG, WEBP, HEIC, and PDF proof files are supported right now.');
        return;
      }
      if (file.size > MAX_PROOF_FILE_SIZE) {
        toast.error(`${file.name} is bigger than 8 MB.`);
        return;
      }
      validFiles.push(file);
    });

    setProofFiles((current) => {
      const remainingSlots = MAX_PROOF_FILES - current.length;
      if (remainingSlots <= 0) {
        toast.error(`You can attach up to ${MAX_PROOF_FILES} proof files.`);
        return current;
      }
      if (validFiles.length > remainingSlots) {
        toast.error(`Only ${remainingSlots} more proof file${remainingSlots === 1 ? '' : 's'} can be attached.`);
      }
      return [...current, ...validFiles.slice(0, remainingSlots)];
    });
  };

  const removeProofFile = (indexToRemove) => {
    setProofFiles((current) => current.filter((_, index) => index !== indexToRemove));
  };

  const uploadProofFiles = async () => {
    const uploadedEvidence = [];
    for (const file of proofFiles) {
      const formData = new FormData();
      formData.append('image', file);
      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const url = data?.fileUrl || data?.imageUrl;
      if (url) {
        uploadedEvidence.push({
          url,
          type: getEvidenceType(file),
          caption: file.name,
        });
      }
    }
    return uploadedEvidence;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const cleanSubject = trimText(subject, 140);
    const cleanMessage = trimText(message, 1600);

    if (cleanSubject.length < 6) {
      toast.error('Please add a clear subject.');
      return;
    }
    if (cleanMessage.length < 20) {
      toast.error('Please explain the issue in a little more detail.');
      return;
    }

    setSubmitting(true);
    const uploadToastId = proofFiles.length ? toast.loading('Attaching proof files...') : null;
    try {
      const contextLines = [
        context.scope ? `Scope: ${formatSupportScope(context.scope)}` : '',
        context.path ? `Page: ${context.path}` : '',
        context.roomTitle ? `Room: ${context.roomTitle}` : '',
        user?.email ? `User email: ${user.email}` : '',
      ].filter(Boolean);

      const uploadedEvidence = await uploadProofFiles();
      if (uploadToastId) toast.dismiss(uploadToastId);

      await api.post('/support', {
        subject: cleanSubject,
        issueDescription: `${cleanMessage}${contextLines.length ? `\n\n---\nContext\n${contextLines.join('\n')}` : ''}`,
        category,
        issueType: issueTypesByCategory[category] || 'general',
        priority,
        roomId: context.roomId || undefined,
        applicationId: context.applicationId || undefined,
        evidence: [...normalizeEvidenceLinks(proofLinks), ...uploadedEvidence],
      });
      toast.success('Support message sent to admin queue.');
      onClose?.();
    } catch (error) {
      if (uploadToastId) toast.dismiss(uploadToastId);
      toast.error(error.response?.data?.message || 'Could not send support message.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed bottom-[calc(var(--rr-bottom-nav-height)+env(safe-area-inset-bottom,0px))] left-0 right-0 top-0 z-[51] flex items-stretch justify-center bg-slate-50 text-slate-950 dark:bg-slate-950 dark:text-slate-50 md:inset-0 md:z-[9999] md:items-center md:bg-slate-950/45 md:p-6 md:backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="RoomRadar support form"
    >
      <form
        onSubmit={handleSubmit}
        className="flex h-full max-h-full w-full flex-col overflow-hidden bg-white shadow-none dark:bg-slate-950 md:h-auto md:max-h-[92vh] md:max-w-xl md:rounded-[1.75rem] md:shadow-[0_24px_80px_rgba(15,23,42,0.28)]"
      >
        <div className="flex flex-shrink-0 items-center gap-3 border-b border-slate-200 bg-white/96 px-3 pb-3 pt-[calc(env(safe-area-inset-top,0px)+0.7rem)] shadow-[0_10px_28px_-26px_rgba(15,23,42,0.55)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/96 md:hidden">
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-900 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-white"
            aria-label="Go back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-cyan-600 dark:text-cyan-300">RoomRadar support</p>
            <h2 className="truncate text-base font-black">Message admin</h2>
          </div>
          <AdminSupportMark />
        </div>

        <div className="rr-support-solid-header hidden flex-shrink-0 items-start justify-between gap-4 bg-slate-950 p-5 text-white md:flex sm:p-6">
          <div className="flex min-w-0 gap-3">
            <AdminSupportMark size="desktop" />
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-white/70">RoomRadar support</p>
              <h2 className="mt-1 text-xl font-black leading-tight">Message admin support</h2>
              <p className="mt-1 text-xs font-semibold leading-5 text-white/78">
                Sent inside RoomRadar. Admins can review it from the support queue.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-white/14 text-white transition hover:bg-white/22"
            aria-label="Close support form"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-50 px-4 py-4 dark:bg-slate-950 sm:px-5 md:bg-white md:dark:bg-slate-950">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Issue type</span>
              <select value={category} onChange={(event) => setCategory(event.target.value)} className="input-field mt-2">
                {categories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Priority</span>
              <select value={priority} onChange={(event) => setPriority(event.target.value)} className="input-field mt-2">
                {priorities.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </label>
          </div>

          <label className="mt-4 block">
            <span className="text-xs font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Subject</span>
            <div className="relative mt-2">
              <MessageSquare className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-500" />
              <input
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                maxLength={140}
                className="input-field pl-11"
                placeholder={`${selectedCategoryLabel} issue`}
              />
            </div>
          </label>

          <label className="mt-4 block">
            <span className="text-xs font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Message</span>
            <textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              rows={6}
              maxLength={1600}
              className="mt-2 min-h-36 w-full resize-none rounded-3xl border border-light-border bg-white px-4 py-4 text-sm font-semibold leading-6 outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 dark:border-dark-border dark:bg-dark-input"
              placeholder="Write what happened, which room/profile/booking is involved, and what help you need."
            />
            <p className="mt-1 text-right text-[11px] font-bold text-slate-400">{message.length}/1600</p>
          </label>

          <div className="mt-3">
            <span className="text-xs font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Attach proof optional</span>
            <label
              htmlFor="support-proof-files"
              className="mt-2 flex min-h-20 cursor-pointer items-center gap-3 rounded-3xl border border-dashed border-cyan-300 bg-cyan-50/65 px-4 py-3 text-left transition hover:border-cyan-400 hover:bg-cyan-50 dark:border-cyan-400/30 dark:bg-cyan-400/10"
            >
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-white text-cyan-600 shadow-sm dark:bg-slate-900 dark:text-cyan-300">
                <ImagePlus className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-black text-slate-900 dark:text-white">Add photo or PDF</span>
                <span className="mt-0.5 block text-xs font-bold leading-5 text-slate-500 dark:text-slate-400">
                  Gallery, camera, WhatsApp images, screenshots, or PDF proof. Max 5 files.
                </span>
              </span>
              <Paperclip className="ml-auto h-4 w-4 flex-shrink-0 text-cyan-600 dark:text-cyan-300" />
              <input
                id="support-proof-files"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
                className="sr-only"
                onChange={handleProofFileChange}
              />
            </label>

            {proofFiles.length > 0 && (
              <div className="mt-2 space-y-2">
                {proofFiles.map((file, index) => (
                  <div key={`${file.name}-${file.size}-${index}`} className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                    <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {getEvidenceType(file) === 'image' ? <ImagePlus className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-black text-slate-900 dark:text-white">{file.name}</span>
                      <span className="text-[11px] font-bold text-slate-500">{formatFileSize(file.size)}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeProofFile(index)}
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                      aria-label={`Remove ${file.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <label className="mt-4 block">
            <span className="text-xs font-black uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Proof links optional</span>
            <div className="relative mt-2">
              <LinkIcon className="pointer-events-none absolute left-4 top-3.5 h-4 w-4 text-cyan-500" />
              <textarea
                value={proofLinks}
                onChange={(event) => setProofLinks(event.target.value)}
                rows={2}
                className="w-full resize-none rounded-2xl border border-light-border bg-white py-3 pl-11 pr-4 text-sm font-semibold outline-none transition focus:border-cyan-400 focus:ring-4 focus:ring-cyan-500/10 dark:border-dark-border dark:bg-dark-card"
                placeholder="Paste screenshot/document links, one per line"
              />
            </div>
          </label>

          <div className="mt-4 rounded-2xl border border-amber-300/50 bg-amber-50 p-3 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
            <div className="flex gap-2">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p className="text-xs font-bold leading-5">
                For safety, payment, ban, or room approval issues, send one clear ticket. Duplicate tickets can slow review.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-white/96 px-4 py-3 shadow-[0_-14px_32px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/96 sm:flex-row sm:justify-end md:px-5">
          <button type="button" onClick={onClose} className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-light-border px-5 text-sm font-black dark:border-dark-border">
            Cancel
          </button>
          <button type="submit" disabled={submitting} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-brand px-6 text-sm font-black text-white shadow-lg shadow-red-500/20 transition hover:bg-red-600 disabled:opacity-60">
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {proofFiles.length && submitting ? 'Sending proof...' : 'Send message'}
          </button>
        </div>
      </form>
    </div>
  );
}

SupportTicketModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  defaultCategory: PropTypes.string,
  defaultPriority: PropTypes.string,
  defaultSubject: PropTypes.string,
  defaultMessage: PropTypes.string,
  context: PropTypes.shape({
    scope: PropTypes.string,
    path: PropTypes.string,
    roomId: PropTypes.string,
    roomTitle: PropTypes.string,
    applicationId: PropTypes.string,
  }),
};

export default SupportTicketModal;
