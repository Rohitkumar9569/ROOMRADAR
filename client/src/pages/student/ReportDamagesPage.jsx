import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api';
import toast from 'react-hot-toast';
import { FaCloudUploadAlt, FaFileImage, FaTimesCircle } from 'react-icons/fa';

function ReportDamagesPage() {
    const { applicationId } = useParams();
    const navigate = useNavigate();

    const [description, setDescription] = useState('');
    const [deductionAmount, setDeductionAmount] = useState('');
    const [images, setImages] = useState([]);
    const [submitting, setSubmitting] = useState(false);

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setImages(files);
    };

    const handleRemoveImage = (indexToRemove) => {
        setImages(images.filter((_, index) => index !== indexToRemove));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        const formData = new FormData();
        formData.append('description', description);
        formData.append('deductionAmount', deductionAmount);
        
        images.forEach(image => {
            formData.append('images', image);
        });

        try {
            await api.put(`/applications/${applicationId}/report-damages`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success("Damage report submitted successfully!");
            navigate('/profile/my-applications');
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to submit report.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-light-bg px-4 pb-24 pt-24 dark:bg-dark-bg">
            <div className="container mx-auto px-4">
                <div className="mx-auto max-w-2xl rounded-3xl border border-light-border bg-light-card p-6 shadow-xl shadow-black/5 dark:border-dark-border dark:bg-dark-card sm:p-8">
                    <h1 className="mb-3 text-center text-2xl font-bold tracking-tight text-light-text dark:text-dark-text">Report Damages</h1>
                    <p className="mb-8 text-center text-sm leading-relaxed text-light-muted dark:text-dark-muted">
                        Document the damages and the amount to be deducted from the security deposit.
                    </p>
                    
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="mb-2 block text-sm font-semibold text-light-text2 dark:text-dark-text2" htmlFor="description">
                                Damage Description
                            </label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows="4"
                                className="w-full rounded-2xl border border-light-border bg-light-bg px-4 py-3 text-light-text outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-dark-border dark:bg-dark-input dark:text-dark-text"
                                required
                            ></textarea>
                        </div>
                        
                        <div className="mb-4">
                            <label className="mb-2 block text-sm font-semibold text-light-text2 dark:text-dark-text2" htmlFor="deductionAmount">
                                Deduction Amount (INR)
                            </label>
                            <input
                                type="number"
                                id="deductionAmount"
                                value={deductionAmount}
                                onChange={(e) => setDeductionAmount(e.target.value)}
                                className="w-full rounded-2xl border border-light-border bg-light-bg px-4 py-3 text-light-text outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/20 dark:border-dark-border dark:bg-dark-input dark:text-dark-text"
                                required
                                min="0"
                            />
                        </div>

                        <div className="mb-6">
                            <label className="mb-2 block text-sm font-semibold text-light-text2 dark:text-dark-text2">
                                Upload Proof (Images)
                            </label>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleFileChange}
                                className="hidden"
                                id="image-upload"
                            />
                            <div className="rounded-2xl border-2 border-dashed border-light-border bg-light-bg p-6 text-center dark:border-dark-border dark:bg-dark-input/60">
                                <label htmlFor="image-upload" className="flex cursor-pointer items-center justify-center font-medium text-cyan-600 transition duration-300 hover:text-cyan-700 dark:text-cyan-400 dark:hover:text-cyan-300">
                                    <FaCloudUploadAlt className="mr-2 text-2xl" /> Click to upload images
                                </label>
                            </div>
                            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                                {images.map((image, index) => (
                                    <div key={index} className="relative h-24 w-full overflow-hidden rounded-2xl shadow-sm">
                                        <img
                                            src={URL.createObjectURL(image)}
                                            alt={`upload-preview-${index}`}
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveImage(index)}
                                            className="absolute right-1 top-1 rounded-full bg-white p-1 text-red-500 transition duration-300 hover:text-red-700 dark:bg-dark-card"
                                        >
                                            <FaTimesCircle />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <button
                            type="submit"
                            disabled={submitting}
                            className="w-full rounded-2xl bg-brand px-8 py-4 font-bold text-white shadow-lg shadow-brand/25 transition duration-300 hover:bg-brand-dark disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {submitting ? 'Submitting...' : 'Submit Damage Report'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default ReportDamagesPage;
