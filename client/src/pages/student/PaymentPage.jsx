import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { FaCreditCard, FaLock } from 'react-icons/fa';

function PaymentPage() {
    const { applicationId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();
    const [application, setApplication] = useState(null);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

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
                
                if (data.status !== 'awaiting_payment') {
                    toast.error("This application is not ready for payment.");
                    navigate('/student-dashboard/my-applications');
                }

            } catch (error) {
                console.error("Failed to fetch application details for payment:", error);
                toast.error("Could not load payment details.");
                navigate('/student-dashboard/my-applications');
            } finally {
                setLoading(false);
            }
        };

        fetchApplicationDetails();
    }, [applicationId, user, navigate]);

    const handlePayment = async () => {
        setProcessing(true);
        toast.promise(
            new Promise((resolve) => setTimeout(resolve, 2000)), // Simulate a payment process
            {
                loading: 'Processing payment...',
                success: <b>Payment successful!</b>,
                error: <b>Payment failed. Please try again.</b>,
            }
        ).then(async () => {
            try {
                const config = {
                    headers: { Authorization: `Bearer ${user.token}` }
                };
                await axios.put(`http://localhost:5000/api/applications/${applicationId}/confirm-payment`, {}, config);
                
                navigate('/student-dashboard/my-applications');
            } catch (error) {
                console.error("Failed to confirm payment:", error);
                toast.error(error.response?.data?.message || "Failed to confirm payment.");
            } finally {
                setProcessing(false);
            }
        }).catch(() => {
            setProcessing(false);
        });
    };

    if (loading) {
        return <div className="text-center py-20 text-xl">Loading payment details...</div>;
    }

    if (!application) {
        return <div className="text-center py-20 text-red-500">Application details not found.</div>;
    }

    const rent = application.room.rent;
    const securityDeposit = application.room.securityDeposit || 0;
    const platformFee = 500; 
    const totalAmount = rent + securityDeposit + platformFee;

    return (
        <div className="pt-24 pb-12 bg-gray-100 min-h-screen">
            <div className="container mx-auto px-4">
                <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-lg border border-gray-200">
                    <h1 className="text-3xl font-bold text-center text-gray-800 mb-6">Confirm and Pay</h1>
                    <div className="mb-8">
                        <img 
                            src={application.room.imageUrl} 
                            alt={application.room.title} 
                            className="w-full h-48 object-cover rounded-md shadow-sm" 
                        />
                        <div className="mt-4">
                            <h2 className="text-xl font-semibold text-gray-700">{application.room.title}</h2>
                            <p className="text-gray-500">{application.room.address}, {application.room.city}</p>
                        </div>
                    </div>
                    
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-gray-600 border-b pb-2">
                            <span>First Month's Rent</span>
                            <span className="font-semibold">₹{rent}</span>
                        </div>
                        <div className="flex justify-between items-center text-gray-600 border-b pb-2">
                            <span>Security Deposit</span>
                            <span className="font-semibold">₹{securityDeposit}</span>
                        </div>
                        <div className="flex justify-between items-center text-gray-600 border-b pb-2">
                            <span>Platform Fee</span>
                            <span className="font-semibold">₹{platformFee}</span>
                        </div>
                        <div className="flex justify-between items-center text-gray-800 font-bold text-xl pt-4">
                            <span>Total Payable Amount</span>
                            <span>₹{totalAmount}</span>
                        </div>
                    </div>
                    
                    <button
                        onClick={handlePayment}
                        disabled={processing}
                        className="mt-8 w-full px-8 py-4 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {processing ? 'Processing...' : <><FaLock className="mr-2" /> Pay Securely</>}
                    </button>
                    <p className="text-center text-xs text-gray-400 mt-3">
                        By clicking "Pay Securely", you agree to our terms and conditions.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default PaymentPage;