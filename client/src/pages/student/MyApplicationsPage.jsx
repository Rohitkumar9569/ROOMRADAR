import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, Link, useOutletContext } from 'react-router-dom';
import { getStudentApplications, cancelApplication } from '../../api';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { FaComments, FaBan, FaPencilAlt, FaSpinner, FaFileAlt, FaEye } from 'react-icons/fa';
import BookingRequestModal from '../../components/features/booking/BookingRequestModal';

// --- Loading Skeleton ---
const SkeletonLoader = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-md border border-gray-200 animate-pulse">
                <div className="w-full h-48 bg-gray-200 rounded-t-xl"></div>
                <div className="p-4 space-y-3">
                    <div className="h-5 w-3/4 bg-gray-200 rounded"></div>
                    <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
                    <div className="mt-4 h-10 bg-gray-200 rounded-lg"></div>
                </div>
            </div>
        ))}
    </div>
);

// --- Student Application Card ---
const StudentApplicationCard = ({ application, onUpdate, onEdit }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);

    const getStatusUI = (status) => {
        const styles = {
            pending: 'bg-yellow-100 text-yellow-800 ring-yellow-600/20',
            approved: 'bg-blue-100 text-blue-800 ring-blue-600/20',
            confirmed: 'bg-green-100 text-green-800 ring-green-600/20',
            rejected: 'bg-red-100 text-red-800 ring-red-600/20',
            cancelled: 'bg-gray-100 text-gray-800 ring-gray-600/20',
        };
        return (
            <span className={`capitalize inline-flex items-center rounded-md px-3 py-1 text-xs font-medium ring-1 ring-inset ${styles[status] || styles.cancelled}`}>
                {application.isUpdated && status === 'pending' && <span className="mr-1.5">*</span>}
                {status}
            </span>
        );
    };

    const handleCancel = async () => {
        if (window.confirm('Are you sure you want to cancel this application?')) {
            setLoading(true);
            try {
                await cancelApplication(application._id);
                toast.success('Application cancelled successfully.');
                onUpdate(application._id, 'cancelled');
            } catch (error) {
                toast.error(error.response?.data?.message || 'Failed to cancel application.');
            } finally {
                setLoading(false);
            }
        }
    };

    const canCancel = ['pending', 'approved'].includes(application.status);
    const roomImage = application.room?.images?.[0] || 'https://via.placeholder.com/300';

    return (
        <div className="bg-white rounded-xl shadow-md border border-gray-200 hover:shadow-lg transition-shadow duration-300 flex flex-col">
            <div className="relative">
                <Link to={`/room/${application.room._id}`}>
                    <img src={roomImage} alt={application.room.title} className="w-full h-48 object-cover rounded-t-xl" />
                </Link>
                <div className="absolute top-3 right-3">
                    {getStatusUI(application.status)}
                </div>
            </div>
            <div className="p-4 flex flex-col flex-grow">
                <div>
                    <p className="text-sm text-gray-500">To: {application.landlord.name}</p>
                    <h2 className="text-lg font-semibold text-gray-800 break-words mt-1">{application.room.title}</h2>
                </div>
                <div className="my-3 border-t border-gray-100 pt-3">
                    <p className="text-sm text-gray-700">
                        <strong>Dates:</strong>
                        {application.checkInDate ? format(new Date(application.checkInDate), 'dd MMM, yy') : 'N/A'} to {application.checkOutDate ? format(new Date(application.checkOutDate), 'dd MMM, yy') : 'N/A'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                        <strong>Applied:</strong>
                        {application.createdAt ? format(new Date(application.createdAt), 'dd MMM, yyyy') : 'Not available'}
                    </p>
                </div>
                <div className="flex-grow"></div>
                <div className="mt-4 flex flex-wrap gap-2">
                    <Link to={`/room/${application.room._id}`} className="btn-secondary text-sm flex-1"><FaEye className="mr-2" />Listing</Link>
                    <button onClick={() => navigate(`/profile/inbox/${application.conversationId}`)} className="btn-secondary text-sm flex-1"><FaComments className="mr-2" />Chat</button>
                    {canCancel && (
                        <button onClick={handleCancel} disabled={loading} className="btn-danger text-sm flex-1">
                            {loading ? <FaSpinner className="animate-spin mr-2" /> : <FaBan className="mr-2" />}
                            Cancel
                        </button>
                    )}
                    {application.status === 'pending' && (
                        <button onClick={() => onEdit(application)} className="btn-primary text-sm w-full mt-2"><FaPencilAlt className="mr-2" />Edit Application</button>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- Main Page Component ---
function MyApplicationsPage() {
    const [applications, setApplications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedApplication, setSelectedApplication] = useState(null);

    // State ab layout se aa raha hai
    const { applicationSearchTerm: searchTerm, activeFilter, setApplicationCounts } = useOutletContext();

    const fetchApps = useCallback(async () => {
        try {
            const { data } = await getStudentApplications();
            setApplications(data);
        } catch (error) {
            toast.error("Failed to fetch your applications.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        setLoading(true);
        fetchApps();
    }, [fetchApps]);

    useEffect(() => {
        if (setApplicationCounts) { // Ensure the function exists before calling
            const counts = { all: applications.length, pending: 0, approved: 0, confirmed: 0, rejected: 0, cancelled: 0 };
            applications.forEach(app => {
                if (counts[app.status] !== undefined) {
                    counts[app.status]++;
                }
            });
            setApplicationCounts(counts);
        }
    }, [applications, setApplicationCounts]);

    const filteredApplications = useMemo(() => {
        return applications
            .filter(app => {
                if (!activeFilter || activeFilter === 'all') return true;
                return app.status === activeFilter;
            })
            .filter(app => {
                const term = searchTerm?.toLowerCase() || '';
                return app.room.title.toLowerCase().includes(term) || app.landlord.name.toLowerCase().includes(term);
            });
    }, [applications, activeFilter, searchTerm]);

    const handleEditApplication = (application) => {
        setSelectedApplication(application);
        setIsEditModalOpen(true);
    };

    const handleEditSuccess = () => {
        setIsEditModalOpen(false);
        setSelectedApplication(null);
        toast.success("Fetching latest details...");
        setLoading(true);
        fetchApps();
    };

    const handleApplicationUpdate = (appId, newStatus) => {
        setApplications(prev => prev.map(app => app._id === appId ? { ...app, status: newStatus } : app));
    };

    return (
        <>
            {loading ? <SkeletonLoader /> :
                filteredApplications.length === 0 ? (
                    <div className="text-center p-12 bg-white rounded-lg shadow-md border">
                        <FaFileAlt className="mx-auto text-5xl text-gray-300 mb-4" />
                        <h3 className="text-xl font-semibold text-gray-700">No Matching Applications</h3>
                        <p className="text-gray-500 mt-2">
                            {searchTerm ? "Try adjusting your search." : `You have no ${activeFilter} applications.`}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredApplications.map((app) => (
                            <StudentApplicationCard
                                key={app._id}
                                application={app}
                                onUpdate={handleApplicationUpdate}
                                onEdit={handleEditApplication}
                            />
                        ))}
                    </div>
                )}

            {isEditModalOpen && selectedApplication && (
                <BookingRequestModal
                    mode="edit"
                    applicationData={selectedApplication}
                    room={selectedApplication.room}
                    onClose={() => setIsEditModalOpen(false)}
                    onSuccess={handleEditSuccess}
                />
            )}
        </>
    );
}

export default MyApplicationsPage;