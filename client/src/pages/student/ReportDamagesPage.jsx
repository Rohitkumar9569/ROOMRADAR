import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { FaCloudUploadAlt, FaFileImage, FaTimesCircle } from 'react-icons/fa';

function ReportDamagesPage() {
    const { applicationId } = useParams();
    const { user } = useAuth();
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
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    Authorization: `Bearer ${user.token}`,
                },
            };
            await axios.put(`http://localhost:5000/api/applications/${applicationId}/report-damages`, formData, config);
            toast.success("Damage report submitted successfully!");
            navigate('/landlord-dashboard/applications');
        } catch (error) {
            console.error("Failed to submit damage report:", error);
            toast.error(error.response?.data?.message || "Failed to submit report.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="pt-24 pb-12 bg-gray-100 min-h-screen">
            <div className="container mx-auto px-4">
                <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-lg border border-gray-200">
                    <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Report Damages</h1>
                    <p className="text-center text-gray-500 mb-8">
                        Document the damages and the amount to be deducted from the security deposit.
                    </p>
                    
                    <form onSubmit={handleSubmit}>
                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-600 mb-2" htmlFor="description">
                                Damage Description
                            </label>
                            <textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows="4"
                                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                required
                            ></textarea>
                        </div>
                        
                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-600 mb-2" htmlFor="deductionAmount">
                                Deduction Amount (₹)
                            </label>
                            <input
                                type="number"
                                id="deductionAmount"
                                value={deductionAmount}
                                onChange={(e) => setDeductionAmount(e.target.value)}
                                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                required
                                min="0"
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-semibold text-gray-600 mb-2">
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
                            <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
                                <label htmlFor="image-upload" className="cursor-pointer text-indigo-600 hover:text-indigo-700 transition duration-300 font-medium flex items-center justify-center">
                                    <FaCloudUploadAlt className="mr-2 text-2xl" /> Click to upload images
                                </label>
                            </div>
                            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
                                {images.map((image, index) => (
                                    <div key={index} className="relative w-full h-24 rounded-md overflow-hidden shadow-sm">
                                        <img
                                            src={URL.createObjectURL(image)}
                                            alt={`upload-preview-${index}`}
                                            className="w-full h-full object-cover"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveImage(index)}
                                            className="absolute top-1 right-1 bg-white rounded-full p-1 text-red-500 hover:text-red-700 transition duration-300"
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
                            className="w-full px-8 py-4 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
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