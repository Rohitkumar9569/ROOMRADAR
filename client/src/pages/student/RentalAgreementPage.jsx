import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { FaDownload, FaFileAlt } from 'react-icons/fa';

function RentalAgreementPage() {
    const { applicationId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [application, setApplication] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchApplicationDetails = async () => {
            try {
                if (!user || user.role !== 'Student') {
                    setLoading(false);
                    return;
                }

                const config = {
                    headers: {
                        Authorization: `Bearer ${user.token}`,
                    },
                };
                const { data } = await axios.get(`http://localhost:5000/api/applications/${applicationId}`, config);
                setApplication(data);

                if (data.status !== 'confirmed') {
                    toast.error("This application is not confirmed.");
                    navigate('/student-dashboard/my-applications');
                }

            } catch (error) {
                console.error("Failed to fetch agreement details:", error);
                toast.error("Could not load rental agreement.");
                navigate('/student-dashboard/my-applications');
            } finally {
                setLoading(false);
            }
        };

        fetchApplicationDetails();
    }, [applicationId, user, navigate]);

    if (loading) {
        return <div className="text-center py-20 text-xl">Loading agreement...</div>;
    }

    if (!application) {
        return <div className="text-center py-20 text-red-500">Agreement not found.</div>;
    }

    const landlord = application.landlord;
    const applicant = application.applicant;
    const room = application.room;

    return (
        <div className="pt-24 pb-12 bg-gray-100 min-h-screen">
            <div className="container mx-auto px-4">
                <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow-lg border border-gray-200">
                    <h1 className="text-3xl font-bold text-center text-gray-800 mb-6 flex items-center justify-center">
                        <FaFileAlt className="mr-2 text-indigo-600" /> Digital Rental Agreement
                    </h1>
                    <p className="text-center text-gray-500 mb-8">This is a legally binding agreement.</p>

                    <div className="space-y-6 text-gray-700 leading-relaxed">
                        <p>This Rental Agreement is made and entered into on this **{new Date(application.createdAt).toLocaleDateString()}**, by and between:</p>

                        <div className="border p-4 rounded-md bg-gray-50">
                            <h2 className="font-bold text-lg">Landlord:</h2>
                            <p><strong>Name:</strong> {landlord.name}</p>
                            <p><strong>Contact:</strong> {landlord.mobileNumber} | {landlord.email}</p>
                        </div>

                        <div className="border p-4 rounded-md bg-gray-50">
                            <h2 className="font-bold text-lg">Tenant:</h2>
                            <p><strong>Name:</strong> {applicant.name}</p>
                            <p><strong>Contact:</strong> {applicant.mobileNumber} | {applicant.email}</p>
                        </div>

                        <h2 className="font-bold text-lg">Property Details:</h2>
                        <div className="border p-4 rounded-md bg-gray-50">
                            <p><strong>Property Address:</strong> {room.address}, {room.city}</p>
                            <p><strong>Room Title:</strong> {room.title}</p>
                            <p><strong>Check-in Date:</strong> {new Date(application.checkInDate).toLocaleDateString()}</p>
                            <p><strong>Duration of Stay:</strong> {application.duration} months</p>
                        </div>

                        <h2 className="font-bold text-lg">Financial Terms:</h2>
                        <div className="border p-4 rounded-md bg-gray-50">
                            <p><strong>Monthly Rent:</strong> ₹{room.rent}</p>
                            <p><strong>Security Deposit:</strong> ₹{room.securityDeposit}</p>
                            <p><strong>Platform Fee:</strong> ₹500</p>
                        </div>

                        <p><strong>Terms and Conditions:</strong></p>
                        <ul className="list-disc list-inside space-y-2">
                            <li>The tenant agrees to pay the monthly rent on or before the 5th of each month.</li>
                            <li>The security deposit is refundable at the end of the tenancy, subject to deductions for any damages.</li>
                            <li>The tenant must maintain the property in a clean and sanitary condition.</li>
                            <li>This agreement is for a period of **{application.duration}** months. Early termination may result in forfeiture of the security deposit.</li>
                        </ul>
                    </div>

                    <div className="text-center mt-10">
                        <button
                            onClick={() => toast.success("This feature is coming soon!")} 
                            className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition duration-300 flex items-center justify-center mx-auto"
                        >
                            <FaDownload className="mr-2" /> Download Agreement (PDF)
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RentalAgreementPage;