import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  BedDouble,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  Home,
  ImagePlus,
  IndianRupee,
  Loader2,
  MapPin,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api';
import { getRoomFields, roomConfig } from '../../config/roomConfig';
import LocationPicker from '../../components/features/rooms/LocationPicker';
import Spinner from '../../components/common/Spinner';
import { isPhoneFieldKey, isValidIndianMobile, phoneInputProps, sanitizePhoneInput } from '../../utils/phoneUtils';
import { formatPreferenceLabel } from '../../utils/listingDisplay';

const iconMap = {
  title: Home,
  rent: IndianRupee,
  beds: BedDouble,
  roomType: Building2,
  availableFrom: CalendarDays,
  fullAddress: MapPin,
  city: MapPin,
  state: MapPin,
  pincode: MapPin,
};

const buildInitialForm = () => {
  const values = {};
  roomConfig.sections.forEach((section) => {
    section.fields.forEach((field) => {
      if (field.type === 'boolean') values[field.key] = false;
      else if (field.default !== undefined) values[field.key] = field.default;
      else if (field.key === 'familyStatus') values[field.key] = 'Any';
      else if (field.key === 'gender') values[field.key] = 'Any';
      else values[field.key] = '';
    });
  });
  return {
    ...values,
    latitude: null,
    longitude: null,
  };
};

const familyToConfigValue = (value) => {
  if (value === 'Bachelors') return 'Bachelors Only';
  if (value === 'Family') return 'Family Only';
  return value || 'Any';
};

const familyToApiValue = (value) => {
  if (value === 'Bachelors Only') return 'Bachelors';
  if (value === 'Family Only') return 'Family';
  return value || 'Any';
};

const toNumericInputValue = (value) => {
  const rawValue = value && typeof value === 'object' ? value.value : value;
  if (rawValue === undefined || rawValue === null || rawValue === '') return '';
  const numericValue = Number(String(rawValue).replace(/[^\d.-]/g, ''));
  return Number.isFinite(numericValue) ? numericValue : '';
};

const toFieldInputValue = (field, value) => {
  if (field.type === 'number') return toNumericInputValue(value);
  if (field.type === 'date') {
    if (!value) return '';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
  }
  if (value && typeof value === 'object') return value.value ?? '';
  return value ?? '';
};

const toImageUrl = (image) => {
  if (!image) return '';
  if (typeof image === 'string') return image;
  return image.url || image.secure_url || image.imageUrl || '';
};

const requiredFieldsForStep = (section) => section.fields.filter((field) => field.required);
const valueUnitFields = getRoomFields().filter((field) => field.valueUnit);
const numberFields = getRoomFields().filter((field) => field.type === 'number');
const dateFields = getRoomFields().filter((field) => field.type === 'date');

const stepIconMap = {
  basicDetails: Home,
  location: MapPin,
  amenities: Sparkles,
  pricing: IndianRupee,
  rules: ShieldCheck,
  nearby: MapPin,
  guidebook: Building2,
  photos: ImagePlus,
};

const stepCopyMap = {
  basicDetails: 'Name, price, room type, and core stay details.',
  location: 'Exact address and map pin for clean discovery.',
  amenities: 'Select only what the tenant will really get.',
  pricing: 'Deposits, billing, and payment preferences.',
  rules: 'House rules that prevent confusion later.',
  nearby: 'Nearby access details for better matching.',
  guidebook: 'Post-booking details shared after confirmation.',
  photos: 'Real photos build trust and speed up approval.',
};

function AddRoomPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const [formData, setFormData] = useState(() => buildInitialForm());
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(isEditMode);
  const [isDirty, setIsDirty] = useState(false);
  const [priceSuggestion, setPriceSuggestion] = useState(null);
  const [suggestingPrice, setSuggestingPrice] = useState(false);

  const steps = useMemo(() => [...roomConfig.sections, { id: 'photos', label: 'Photos', fields: [] }], []);
  const currentStep = steps[step];
  const isPhotoStep = currentStep.id === 'photos';
  const stepProgress = Math.round(((step + 1) / steps.length) * 100);
  const CurrentStepIcon = stepIconMap[currentStep.id] || ShieldCheck;
  const currentStepCopy = stepCopyMap[currentStep.id] || 'Complete this listing section with accurate details.';
  const selectedMapLocation = useMemo(() => {
    const lat = Number(formData.latitude);
    const lng = Number(formData.longitude);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    return {
      lat,
      lng,
      fullAddress: formData.fullAddress,
    };
  }, [formData.fullAddress, formData.latitude, formData.longitude]);

  useEffect(() => {
    if (!isEditMode) return;

    const fetchRoom = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/rooms/${id}`);
        const room = data.data || data;
        const next = buildInitialForm();

        roomConfig.sections.forEach((section) => {
          section.fields.forEach((field) => {
            if (section.id === 'location') {
              next[field.key] = field.key === 'pincode'
                ? room.location?.pincode || room.location?.postalCode || ''
                : room.location?.[field.key] || '';
              return;
            }
            if (field.key === 'familyStatus') {
              next.familyStatus = familyToConfigValue(room.familyStatus || room.tenantPreferences?.familyStatus);
              return;
            }
            if (field.key === 'gender') {
              next.gender = room.gender || room.tenantPreferences?.allowedGender || 'Any';
              return;
            }
            if (section.id === 'amenities') {
              next[field.key] = Boolean(room.facilities?.[field.key] ?? room[field.key]);
              return;
            }
            if (section.id === 'rules') {
              const ruleValue = room.rules?.[field.key] ?? room[field.key] ?? next[field.key];
              next[field.key] = field.type === 'number' ? toNumericInputValue(ruleValue) : toFieldInputValue(field, ruleValue);
              return;
            }
            if (field.valueUnit) {
              next[field.key] = toNumericInputValue(room[field.key] ?? next[field.key]);
              return;
            }
            if (field.type === 'number') {
              next[field.key] = toNumericInputValue(room[field.key] ?? next[field.key]);
              return;
            }
            next[field.key] = field.type === 'date'
              ? toFieldInputValue(field, room[field.key] ?? next[field.key])
              : room[field.key] ?? next[field.key];
          });
        });

        if (room.location?.coordinates?.length === 2) {
          next.longitude = room.location.coordinates[0];
          next.latitude = room.location.coordinates[1];
        }

        setFormData(next);
        const existingImages = (room.images?.length ? room.images : room.imageUrl ? [room.imageUrl] : [])
          .map(toImageUrl)
          .filter(Boolean);
        setImagePreviews(existingImages);
      } catch (error) {
        toast.error('Could not load this room for editing.');
        navigate('/landlord/my-rooms');
      } finally {
        setLoading(false);
      }
    };

    fetchRoom();
  }, [id, isEditMode, navigate]);

  useEffect(() => {
    const warnBeforeUnload = (event) => {
      if (!isDirty) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    if (!formData.city || !formData.roomType) {
      setPriceSuggestion(null);
      return undefined;
    }

    const timer = setTimeout(async () => {
      try {
        setSuggestingPrice(true);
        const { data } = await api.post('/rooms/suggest-price', {
          city: formData.city,
          roomType: formData.roomType,
          location: { city: formData.city, state: formData.state }
        });
        setPriceSuggestion(data);
      } catch (error) {
        setPriceSuggestion(null);
      } finally {
        setSuggestingPrice(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.city, formData.roomType, formData.state]);

  const updateField = (key, value) => {
    const nextValue = isPhoneFieldKey(key) ? sanitizePhoneInput(value) : value;
    setIsDirty(true);
    setFormData((prev) => ({ ...prev, [key]: nextValue }));
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }));
  };

  const validateSection = (section) => {
    const nextErrors = {};
    requiredFieldsForStep(section).forEach((field) => {
      const value = formData[field.key];
      if (value === undefined || value === null || String(value).trim() === '') {
        nextErrors[field.key] = `${field.label} is required.`;
      }
    });

    section.fields.forEach((field) => {
      const value = formData[field.key];
      if (isPhoneFieldKey(field.key) && value && !isValidIndianMobile(value)) {
        nextErrors[field.key] = `${field.label} must be a valid 10-digit mobile number.`;
      }
    });

    if (section.id === 'location' && (!formData.latitude || !formData.longitude)) {
      nextErrors.mapLocation = 'Please choose the exact map location.';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleNext = () => {
    if (!isPhotoStep && !validateSection(currentStep)) {
      toast.error('Please complete required fields.');
      return;
    }
    if (isPhotoStep) return;
    setStep((prev) => Math.min(prev + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setStep((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLocationChange = useCallback((locationData) => {
    if (!locationData) return;
    const raw = locationData.rawData || {};
    setIsDirty(true);
    setFormData((prev) => ({
      ...prev,
      latitude: locationData.lat,
      longitude: locationData.lng,
      fullAddress: locationData.fullAddress || prev.fullAddress,
      city: raw.city || raw.town || raw.village || prev.city,
      state: raw.state || prev.state,
      pincode: raw.postcode || prev.pincode,
    }));
    setErrors((prev) => ({ ...prev, mapLocation: '' }));
  }, []);

  const handleFileChange = (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    if (imagePreviews.length + files.length > 8) {
      toast.error('Upload up to 8 high-quality photos.');
      return;
    }
    setIsDirty(true);
    setImageFiles((prev) => [...prev, ...files]);
    setImagePreviews((prev) => [...prev, ...files.map((file) => URL.createObjectURL(file))]);
  };

  const removeImage = (index) => {
    setIsDirty(true);
    const preview = imagePreviews[index];
    setImagePreviews((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    if (preview?.startsWith('blob:')) {
      URL.revokeObjectURL(preview);
      setImageFiles((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
    }
  };

  const uploadImages = async () => {
    if (!imageFiles.length) return [];
    const uploaded = [];
    for (const file of imageFiles) {
      const payload = new FormData();
      payload.append('image', file);
      const { data } = await api.post('/upload', payload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      uploaded.push(data.imageUrl);
    }
    return uploaded;
  };

  const buildPayload = async () => {
    const uploaded = await uploadImages();
    const existing = imagePreviews
      .map(toImageUrl)
      .filter((image) => image && !image.startsWith('blob:'));
    const finalImages = [...existing, ...uploaded];
    const normalizedData = { ...formData };

    numberFields.forEach((field) => {
      if (normalizedData[field.key] !== '' && normalizedData[field.key] !== null && normalizedData[field.key] !== undefined) {
        normalizedData[field.key] = Number(normalizedData[field.key]);
      } else {
        delete normalizedData[field.key];
      }
    });

    dateFields.forEach((field) => {
      const value = normalizedData[field.key];
      if (!value) {
        delete normalizedData[field.key];
        return;
      }

      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        delete normalizedData[field.key];
      }
    });

    valueUnitFields.forEach((field) => {
      const value = normalizedData[field.key];
      if (value === '' || value === null || value === undefined || Number.isNaN(Number(value))) {
        delete normalizedData[field.key];
        return;
      }
      normalizedData[field.key] = {
        value: Number(value),
        unit: field.unit || '',
      };
    });

    const facilities = {};
    const rules = {};
    roomConfig.sections.forEach((section) => {
      section.fields.forEach((field) => {
        if (section.id === 'amenities') {
          facilities[field.key] = Boolean(formData[field.key]);
          delete normalizedData[field.key];
        }
        if (section.id === 'rules') {
          delete normalizedData[field.key];
          const value = formData[field.key];
          if (field.type === 'number') {
            const numericValue = toNumericInputValue(value);
            if (numericValue !== '') rules[field.key] = Number(numericValue);
            return;
          }
          rules[field.key] = value;
        }
      });
    });

    return {
      ...normalizedData,
      rent: Number(normalizedData.rent),
      beds: Number(normalizedData.beds),
      familyStatus: familyToApiValue(normalizedData.familyStatus),
      gender: normalizedData.gender,
      tenantPreferences: {
        familyStatus: familyToApiValue(normalizedData.familyStatus),
        allowedGender: normalizedData.gender,
      },
      location: {
        type: 'Point',
        coordinates: [Number(normalizedData.longitude), Number(normalizedData.latitude)],
        fullAddress: normalizedData.fullAddress,
        locality: normalizedData.locality,
        landmark: normalizedData.landmark,
        city: normalizedData.city,
        state: normalizedData.state,
        postalCode: normalizedData.pincode,
        pincode: normalizedData.pincode,
      },
      facilities,
      rules,
      imageUrl: finalImages[0],
      images: finalImages,
    };
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!imagePreviews.length) {
      toast.error('Please upload at least one real room photo.');
      return;
    }

    for (const section of roomConfig.sections) {
      if (!validateSection(section)) {
        setStep(steps.findIndex((item) => item.id === section.id));
        toast.error(`Please complete ${section.label}.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = await buildPayload();
      if (isEditMode) {
        const { data: updatedRoom } = await api.put(`/rooms/${id}`, payload);
        toast.success(
          updatedRoom?.status === 'Pending'
            ? 'Room edits submitted for admin approval.'
            : 'Room updated successfully.'
        );
      } else {
        await api.post('/rooms', payload);
        toast.success('Room submitted for admin review.');
      }
      setIsDirty(false);
      navigate('/landlord/my-rooms');
    } catch (error) {
      toast.error(error.response?.data?.error || error.response?.data?.message || 'Could not save room.');
    } finally {
      setSubmitting(false);
    }
  };

  const renderField = (field) => {
    const Icon = iconMap[field.key] || Sparkles;
    const isDenseOptionStep = currentStep.id === 'amenities' || currentStep.id === 'rules';
    const isPhoneField = isPhoneFieldKey(field.key);
    const commonLabel = (
      <label htmlFor={field.key} className="text-[13px] font-black text-slate-800 dark:text-slate-100 sm:text-sm">
        {field.label}{field.required ? <span className="text-brand"> *</span> : null}
      </label>
    );

    if (field.type === 'boolean') {
      return (
        <button
          key={field.key}
          type="button"
          onClick={() => updateField(field.key, !formData[field.key])}
          className={`relative flex min-h-[4.25rem] flex-col justify-between rounded-[1.1rem] border p-3 text-left transition active:scale-[0.98] sm:min-h-12 sm:flex-row sm:items-center sm:px-4 sm:py-3 ${
            formData[field.key]
              ? 'border-brand/35 bg-gradient-to-br from-rose-50 via-white to-cyan-50 text-brand shadow-[0_12px_26px_rgba(255,56,92,0.10)] dark:border-cyan-300/30 dark:from-cyan-300/12 dark:via-slate-900/75 dark:to-brand/10 dark:text-cyan-100'
              : 'border-slate-200/80 bg-white/82 text-slate-500 hover:border-brand/50 dark:border-slate-700/80 dark:bg-slate-900/70 dark:text-slate-400'
          }`}
        >
          <span className={`max-w-full pr-7 font-black leading-tight ${isDenseOptionStep ? 'text-[11px] sm:text-[13px]' : 'text-[13px] sm:text-sm'}`}>
            {field.label}
          </span>
          <span className={`absolute right-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-full sm:static ${formData[field.key] ? 'bg-brand text-white shadow-sm dark:bg-cyan-400 dark:text-slate-950' : 'bg-slate-100 dark:bg-slate-800'}`}>
            {formData[field.key] ? <Check className="h-4 w-4" /> : null}
          </span>
        </button>
      );
    }

    if (field.type === 'textarea') {
      return (
        <div key={field.key} className="md:col-span-2">
          {commonLabel}
          <textarea
            id={field.key}
            rows={4}
            value={toFieldInputValue(field, formData[field.key])}
            onChange={(event) => updateField(field.key, event.target.value)}
            className="input-field mt-2 min-h-28 resize-none rounded-[1.15rem] text-[15px]"
          />
          {errors[field.key] && <p className="mt-1 text-sm font-semibold text-brand">{errors[field.key]}</p>}
        </div>
      );
    }

    if (field.type === 'select') {
      return (
        <div key={field.key}>
          {commonLabel}
          <select
            id={field.key}
            value={toFieldInputValue(field, formData[field.key])}
            onChange={(event) => updateField(field.key, event.target.value)}
            className="input-field mt-2 h-12 rounded-[1.15rem] text-[15px]"
          >
            <option value="">Select {field.label}</option>
            {field.options.map((option) => (
              <option key={option} value={option}>
                {field.key === 'gender' ? formatPreferenceLabel(option) : option}
              </option>
            ))}
          </select>
          {errors[field.key] && <p className="mt-1 text-sm font-semibold text-brand">{errors[field.key]}</p>}
        </div>
      );
    }

    return (
      <div key={field.key}>
        {commonLabel}
        <div className="relative mt-2">
          <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-cyan-600 dark:text-cyan-300 sm:h-5 sm:w-5" />
          <input
            id={field.key}
            type={isPhoneField ? 'tel' : field.type}
            value={toFieldInputValue(field, formData[field.key])}
            min={field.type === 'number' ? 0 : undefined}
            onChange={(event) => updateField(field.key, event.target.value)}
            className="input-field h-12 rounded-[1.15rem] pl-11 text-[15px] sm:pl-12"
            placeholder={isPhoneField ? '9876543210' : undefined}
            {...(isPhoneField ? phoneInputProps : {})}
          />
        </div>
        {errors[field.key] && <p className="mt-1 text-sm font-semibold text-brand">{errors[field.key]}</p>}
      </div>
    );
  };

  if (loading) return <div className="flex min-h-screen items-center justify-center"><Spinner /></div>;

  return (
    <form onSubmit={handleSubmit} className="rr-add-room-page min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.09),transparent_22rem),linear-gradient(180deg,#f8fafc_0%,#eef4f8_100%)] px-2 pb-32 pt-3 text-slate-900 dark:bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.16),transparent_22rem),linear-gradient(180deg,#0f172a_0%,#111827_100%)] dark:text-slate-50 sm:px-6 sm:pb-10 sm:pt-4 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="rr-add-room-shell mb-4 overflow-hidden rounded-[1.65rem] border border-white/75 bg-white/82 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/72 dark:shadow-[0_24px_70px_rgba(0,0,0,0.34)] sm:rounded-[2rem]">
          <div className="h-1.5 bg-slate-100 dark:bg-slate-800">
            <div
              className="h-full rounded-r-full bg-gradient-to-r from-brand via-rose-400 to-cyan-400 transition-all duration-500"
              style={{ width: `${stepProgress}%` }}
            />
          </div>
          <div className="p-4 sm:p-5 md:flex md:items-center md:justify-between md:gap-5">
            <div className="min-w-0">
              <button type="button" onClick={() => navigate('/landlord/my-rooms')} className="mb-3 inline-flex min-h-9 items-center gap-2 rounded-full border border-slate-200/80 bg-white/70 px-3 text-[12px] font-black text-slate-600 shadow-sm transition hover:text-brand dark:border-slate-700/70 dark:bg-slate-950/40 dark:text-slate-300 sm:text-sm">
                <ArrowLeft className="h-4 w-4" />
                Back to listings
              </button>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-brand sm:text-[11px]">{isEditMode ? 'Edit listing' : 'New listing'}</p>
              <h1 className="mt-1 max-w-[18rem] text-[clamp(20px,5.8vw,28px)] font-black leading-tight tracking-tight sm:max-w-none">
                {isEditMode ? 'Upgrade Your Room Listing' : 'Create a Premium Room Listing'}
              </h1>
              <p className="mt-2 max-w-2xl text-[13px] font-semibold leading-6 text-slate-500 dark:text-slate-400 sm:text-sm">
                Complete only real property details. Edits go for admin approval when required.
              </p>
            </div>
            <div className="rr-add-room-summary mt-4 grid grid-cols-[auto_1fr] items-center gap-3 rounded-[1.35rem] border border-brand/15 bg-gradient-to-br from-brand/10 via-white/70 to-cyan-400/10 p-3 dark:border-cyan-300/15 dark:from-cyan-300/10 dark:via-slate-950/20 dark:to-brand/10 md:mt-0 md:min-w-[13rem]">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-brand shadow-sm dark:bg-slate-950/55 dark:text-cyan-200">
                <CurrentStepIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-brand dark:text-cyan-200">
                  Step {step + 1} of {steps.length}
                </p>
                <p className="truncate text-[12px] font-black text-slate-700 dark:text-slate-200">{currentStep.label}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="no-scrollbar -mx-2 mb-4 flex gap-2 overflow-x-auto px-2 pb-1 sm:mx-0 sm:px-0 md:grid md:grid-cols-4 md:overflow-visible lg:grid-cols-8">
          {steps.map((item, index) => {
            const StepIcon = stepIconMap[item.id] || ShieldCheck;
            const isActive = index === step;
            const isComplete = index < step;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setStep(index)}
                className={`rr-add-room-step-tab ${isActive ? 'is-active' : ''} flex min-h-[3.25rem] w-[8.35rem] flex-shrink-0 items-center gap-2 rounded-[1.15rem] border px-3 py-2 text-left transition active:scale-[0.98] md:w-auto ${
                  isActive
                    ? 'border-brand/40 bg-gradient-to-br from-brand to-rose-500 text-white shadow-[0_14px_34px_rgba(255,56,92,0.24)]'
                    : isComplete
                      ? 'border-emerald-200 bg-emerald-50/90 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-100'
                      : 'border-white/75 bg-white/78 text-slate-500 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/65 dark:text-slate-400'
                }`}
              >
                <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl ${isActive ? 'bg-white/18 text-white' : isComplete ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-100' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300'}`}>
                  {isComplete ? <Check className="h-4 w-4" /> : <StepIcon className="h-4 w-4" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[11px] font-black leading-tight sm:text-xs">{item.label}</span>
                  <span className={`mt-0.5 block text-[9px] font-black uppercase tracking-[0.08em] ${isActive ? 'text-white/78' : 'text-slate-400 dark:text-slate-500'}`}>
                    {index + 1}/{steps.length}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <motion.section
          key={currentStep.id}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="rr-add-room-step-panel overflow-hidden rounded-[1.65rem] border border-white/75 bg-white/86 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/74 dark:shadow-[0_24px_70px_rgba(0,0,0,0.36)] sm:rounded-[2rem]"
        >
          <div className="rr-add-room-step-head border-b border-slate-100/90 bg-gradient-to-br from-white/80 to-slate-50/70 p-4 dark:border-slate-800/80 dark:from-slate-900/70 dark:to-slate-950/35 sm:p-5">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand/12 to-cyan-400/14 text-brand ring-1 ring-brand/10 dark:text-cyan-200 dark:ring-cyan-300/10">
                <CurrentStepIcon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300">
                  {isEditMode ? 'Listing upgrade' : 'Listing setup'}
                </p>
                <h2 className="mt-1 truncate text-[clamp(18px,5vw,24px)] font-black leading-tight tracking-tight">{currentStep.label}</h2>
                <p className="mt-1 text-[13px] font-semibold leading-5 text-slate-500 dark:text-slate-400 sm:text-sm">{currentStepCopy}</p>
              </div>
            </div>
          </div>

          <div className="p-4 sm:p-5 md:p-7">
            {!isPhotoStep ? (
            <>
              <div className={`grid ${
                currentStep.id === 'amenities'
                  ? 'grid-cols-2 gap-3 lg:grid-cols-3'
                  : currentStep.id === 'rules'
                    ? 'grid-cols-2 gap-3 md:grid-cols-2 lg:grid-cols-3'
                    : 'gap-4 md:grid-cols-2'
              }`}>
                {currentStep.fields.map(renderField)}
              </div>

              {currentStep.id === 'location' && (
                <div className="mt-7">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-[clamp(16px,4.5vw,20px)] font-black">Exact Map Location</h3>
                    {errors.mapLocation && <p className="text-sm font-semibold text-brand">{errors.mapLocation}</p>}
                  </div>
                  <div className="overflow-hidden rounded-[1.35rem] border border-slate-200 bg-white/70 dark:border-slate-700 dark:bg-slate-950/25">
                    <LocationPicker onLocationChange={handleLocationChange} selectedLocation={selectedMapLocation} />
                  </div>
                </div>
              )}

              {priceSuggestion && ['basicDetails', 'location'].includes(currentStep.id) && (
                <div className="mt-5 rounded-[1.35rem] border border-brand/20 bg-gradient-to-br from-brand/10 to-cyan-400/10 p-4 text-sm text-slate-800 dark:text-slate-100">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <p className="font-black text-brand dark:text-cyan-200">Price suggestion</p>
                      {priceSuggestion.suggestedRent ? (
                        <p className="mt-1 font-semibold">
                          ₹{Number(priceSuggestion.suggestedRent).toLocaleString('en-IN')}/month based on {priceSuggestion.sampleSize} comparable listing{priceSuggestion.sampleSize === 1 ? '' : 's'}.
                        </p>
                      ) : (
                        <p className="mt-1 font-semibold">{priceSuggestion.explanation}</p>
                      )}
                    </div>
                    {priceSuggestion.suggestedRent && (
                      <button type="button" onClick={() => updateField('rent', priceSuggestion.suggestedRent)} className="btn-outline bg-white dark:bg-slate-950/40">
                        Use suggestion
                      </button>
                    )}
                  </div>
                  {priceSuggestion.explanation && <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">{priceSuggestion.explanation}</p>}
                </div>
              )}

              {suggestingPrice && ['basicDetails', 'location'].includes(currentStep.id) && (
                <div className="mt-5 flex items-center gap-2 rounded-[1.35rem] border border-slate-200 bg-white/70 p-4 text-sm font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-950/25 dark:text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin text-brand" />
                  Calculating price suggestion from real listings...
                </div>
              )}
            </>
          ) : (
            <div>
              <label htmlFor="room-photos" className="group flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-[1.35rem] border border-dashed border-cyan-300/70 bg-gradient-to-br from-cyan-50/90 via-white/80 to-rose-50/70 p-4 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] transition hover:border-brand hover:from-brand/5 dark:border-cyan-300/20 dark:from-cyan-300/8 dark:via-slate-950/20 dark:to-brand/8 sm:min-h-44 sm:p-6">
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand shadow-[0_14px_34px_rgba(15,23,42,0.10)] ring-1 ring-slate-200/70 transition group-active:scale-95 dark:bg-slate-950/70 dark:text-cyan-200 dark:ring-white/10">
                  <UploadCloud className="h-6 w-6" />
                </span>
                <span className="mt-3 text-[clamp(16px,4.5vw,20px)] font-black">Upload real room photos</span>
                <span className="mt-1 max-w-[17rem] text-[13px] font-semibold leading-5 text-slate-500 dark:text-slate-400">Clear, real photos improve trust and approval speed.</span>
                <span className="mt-3 rounded-full bg-white/85 px-3 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-brand shadow-sm dark:bg-slate-950/60 dark:text-cyan-200">
                  Up to 8 images
                </span>
              </label>
              <input id="room-photos" type="file" accept="image/png,image/jpeg,image/webp" multiple className="sr-only" onChange={handleFileChange} />

              <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                {imagePreviews.map((preview, index) => (
                  <div key={preview} className="group relative aspect-[16/11] overflow-hidden rounded-[1.05rem] bg-slate-100 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800 dark:ring-slate-700/80">
                    <img src={preview} alt={`Room ${index + 1}`} className="h-full w-full object-cover" />
                    {index === 0 && (
                      <span className="absolute left-2 top-2 rounded-full bg-brand px-2.5 py-1 text-[10px] font-black text-white shadow-sm">Cover</span>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/60 text-white shadow-sm backdrop-blur transition md:opacity-0 md:group-hover:opacity-100"
                      aria-label="Remove image"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>
        </motion.section>

        <div className="rr-add-room-footer mt-5 mb-28 rounded-[1.5rem] border border-white/80 bg-white/92 p-3 shadow-[0_18px_50px_rgba(15,23,42,0.12)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/88 dark:shadow-[0_24px_70px_rgba(0,0,0,0.38)] sm:mb-0 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-cyan-600 dark:text-cyan-300 sm:text-[11px]">
                Step {step + 1} of {steps.length}
              </p>
              <p className="mt-1 text-[12px] font-semibold leading-5 text-slate-500 dark:text-slate-400 sm:text-sm sm:leading-6">
                {isPhotoStep
                  ? 'Review photos and submit when the listing is ready for admin approval.'
                  : 'Complete this section, then continue to the next listing detail.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-shrink-0 sm:items-center">
              <button type="button" onClick={handleBack} disabled={step === 0} className="btn-outline min-h-11 justify-center rounded-[1.05rem] px-4 text-sm disabled:opacity-40">
                Back
              </button>
              {isPhotoStep ? (
                <button type="submit" disabled={submitting} className="btn-primary inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[1.05rem] px-3 text-sm shadow-[0_14px_34px_rgba(255,56,92,0.20)]">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  <span className="whitespace-nowrap">{isEditMode ? 'Save Changes' : 'Submit Listing'}</span>
                </button>
              ) : (
                <button type="button" onClick={handleNext} className="btn-primary inline-flex min-h-11 items-center justify-center gap-1.5 rounded-[1.05rem] px-3 text-sm shadow-[0_14px_34px_rgba(255,56,92,0.20)]">
                  Continue
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}

export default AddRoomPage;
