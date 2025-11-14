// src/pages/landlord/AddRoomPage.jsx

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios'; // Note: Ensure you are using your 'api' instance if it's default
import api from '../../api'; // Use your configured api instance
import Select from 'react-select';
import { useAuth } from '../../context/AuthContext';
import { indianCities } from '../../data/indianCities';
import toast from 'react-hot-toast';

// Component imports (Update paths based on your new structure)
import LocationPicker from '../../components/features/rooms/LocationPicker';
import Spinner from '../../components/common/Spinner';

// Icon imports (using react-icons/fa for consistency with the file)
import {
    FaPlus, FaCheckCircle, FaTimes, FaTools, FaBed, FaMapMarkerAlt,
    FaHome, FaRupeeSign, FaSpinner, FaSave, FaWifi,
    FaBolt, FaWater, FaSnowflake, FaShower, FaCouch, FaCar, FaBuilding,
    FaShieldAlt, FaTshirt, FaStar, FaArrowLeft, FaUsers,
    FaFileContract, FaVideo, FaUtensils, FaStore, FaTrain, FaBus,
    FaUniversity, FaHospital, FaRoute, FaCalendarAlt, FaClock
} from 'react-icons/fa';

// (Options and initialFormState )
const familyStatusOptions = [{ value: 'Any', label: 'Any (Family or Bachelors)' }, { value: 'Bachelors', label: 'Bachelors Only' }, { value: 'Family', label: 'Family Only' }];
const allowedGenderOptions = [{ value: 'Any', label: 'Any Gender' }, { value: 'Male', label: 'Male Only' }, { value: 'Female', label: 'Female Only' }];
const roomTypeOptions = [{ value: 'Single Room', label: 'Single Room' }, { value: 'Shared Room (2 beds)', label: 'Shared Room (2 beds)' }, { value: 'Shared Room (3+ beds)', label: 'Shared Room (3+ beds)' }, { value: '1 BHK', label: 'Full 1 BHK Flat' }, { value: '2 BHK', label: 'Full 2 BHK Flat' },];
const kitchenOptions = [{ value: 'Private', label: 'Private Kitchen' }, { value: 'Shared', label: 'Shared Kitchen' }, { value: 'None', label: 'No Kitchen Access' },];
const depositOptions = [{ value: 'No Deposit', label: 'No Security Deposit' }, { value: '1 Month', label: '1 Month Rent' }, { value: '2 Months', label: '2 Months Rent' },];
const distanceUnits = [{ value: 'm', label: 'm' }, { value: 'km', label: 'km' }, { value: 'min walk', label: 'min walk' },];
const periodUnits = [{ value: 'Days', label: 'Days' }, { value: 'Months', label: 'Months' },];
const timePeriodOptions = [{ value: 'AM', label: 'AM' }, { value: 'PM', label: 'PM' },];
const facilitiesData = { utilities: [{ id: 'wifi', icon: FaWifi, label: 'Wi-Fi' }, { id: 'powerBackup', icon: FaBolt, label: 'Power Backup' }, { id: 'waterSupply', icon: FaWater, label: '24/7 Water' }, { id: 'geyser', icon: FaShower, label: 'Geyser' },], roomFeatures: [{ id: 'attachedWashroom', icon: FaShower, label: 'Attached Washroom' }, { id: 'ac', icon: FaSnowflake, label: 'A/C' }, { id: 'balcony', icon: FaBuilding, label: 'Balcony' }, { id: 'fullyFurnished', icon: FaCouch, label: 'Fully Furnished' },], buildingAmenities: [{ id: 'parking', icon: FaCar, label: 'Parking' }, { id: 'lift', icon: FaBuilding, label: 'Lift' }, { id: 'security', icon: FaShieldAlt, label: '24/7 Security' }, { id: 'laundry', icon: FaTshirt, label: 'Laundry Service' },] };
const kitchenAmenitiesData = [{ id: 'fridge', label: 'Fridge' }, { id: 'microwave', label: 'Microwave' }, { id: 'waterPurifier', label: 'Water Purifier' },];
const rulesData = [{ id: 'guestsAllowed', label: 'Guests Allowed' }, { id: 'petsAllowed', label: 'Pets Allowed' }, { id: 'smokingAllowed', label: 'Smoking Allowed' }, { id: 'drinkingAllowed', label: 'Drinking Allowed' },];

const initialFormState = {
    title: '', rent: '', description: '', roomType: '', beds: '',
    tenantPreferences: { familyStatus: 'Any', allowedGender: 'Any', },
    address: '', city: '', state: '', postalCode: '',
    latitude: null,
    longitude: null,
    distanceCollege: { value: '', unit: 'm' }, distanceHospital: { value: '', unit: 'km' },
    distanceMetro: { value: '', unit: 'm' }, distanceBusStand: { value: '', unit: 'm' },
    distanceRailway: { value: '', unit: 'km' }, distanceMarket: { value: '', unit: 'm' },
    facilities: { wifi: false, powerBackup: false, waterSupply: false, geyser: false, attachedWashroom: false, ac: false, balcony: false, fullyFurnished: false, parking: false, lift: false, security: false, laundry: false, },
    kitchen: '', kitchenAmenities: { fridge: false, microwave: false, waterPurifier: false },
    floor: '', videoUrl: '', securityDeposit: '',
    noticePeriod: { value: '', unit: 'Days' }, minimumStay: { value: '', unit: 'Months' },
    gateClosingTime: { time: '', period: 'PM', noRestriction: false },
    rules: { guestsAllowed: false, petsAllowed: false, smokingAllowed: false, drinkingAllowed: false },
    imageUrl: '', images: [],
};


function AddRoomPage() {
    const { user, updateUser } = useAuth();
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditMode = Boolean(id);

    const [formData, setFormData] = useState(initialFormState);
    const [step, setStep] = useState(1);
    const [highestStep, setHighestStep] = useState(1);
    const [images, setImages] = useState([]);
    const [imagePreviews, setImagePreviews] = useState([]);
    const [coverImageIndex, setCoverImageIndex] = useState(0);
    const [uploading, setUploading] = useState(false);
    const [loadingDetails, setLoadingDetails] = useState(isEditMode);
    const [isFormDirty, setIsFormDirty] = useState(false);
    const [errors, setErrors] = useState({});
    const dragItem = useRef();
    const dragOverItem = useRef();
    const [previewModalImage, setPreviewModalImage] = useState(null);

    useEffect(() => {
        if (isEditMode && user) {
            const fetchRoomData = async () => {
                setLoadingDetails(true);
                try {
                    const config = {
                        headers: {
                            Authorization: `Bearer ${user.token}`,
                            'Cache-Control': 'no-cache',
                        }
                    };
                    
                    //  Fetch data without double destructuring
                    const { data } = await api.get(`/rooms/${id}`, config);

                    //  Safely get the room object, just like in RoomDetailsPage
                    const fetchedRoom = data.data || data;

                    // Add a check to ensure fetchedRoom is valid
                    if (!fetchedRoom || !fetchedRoom._id) {
                         toast.error("Could not find room data to edit.");
                         navigate('/landlord/my-rooms');
                         return;
                    }

                    const newFormData = JSON.parse(JSON.stringify(initialFormState));

                    //  This loop will now work because fetchedRoom is a valid object
                    Object.keys(newFormData).forEach(key => {
                        if (fetchedRoom[key] !== undefined && fetchedRoom[key] !== null) {
                            if (typeof newFormData[key] === 'object' && !Array.isArray(newFormData[key]) && newFormData[key] !== null) {
                                newFormData[key] = { ...newFormData[key], ...fetchedRoom[key] };
                            } else {
                                newFormData[key] = fetchedRoom[key];
                            }
                        }
                    });

                    if (fetchedRoom.location) {
                        newFormData.address = fetchedRoom.location.fullAddress || '';
                        newFormData.city = fetchedRoom.location.city || '';
                        newFormData.state = fetchedRoom.location.state || '';
                        newFormData.postalCode = fetchedRoom.location.postalCode || '';
                        if (fetchedRoom.location.coordinates && fetchedRoom.location.coordinates.length === 2) {
                            newFormData.longitude = fetchedRoom.location.coordinates[0];
                            newFormData.latitude = fetchedRoom.location.coordinates[1];
                        }
                    }

                    const mapUnitValueField = (fieldName) => {
                        if (fetchedRoom[fieldName]) {
                            newFormData[fieldName] = {
                                value: fetchedRoom[fieldName].value !== undefined && fetchedRoom[fieldName].value !== null ? fetchedRoom[fieldName].value : '',
                                unit: fetchedRoom[fieldName].unit || newFormData[fieldName].unit,
                            };
                        }
                    };
                    mapUnitValueField('distanceCollege');
                    mapUnitValueField('distanceHospital');
                    mapUnitValueField('distanceMetro');
                    mapUnitValueField('distanceBusStand');
                    mapUnitValueField('distanceRailway');
                    mapUnitValueField('distanceMarket');
                    mapUnitValueField('noticePeriod');
                    mapUnitValueField('minimumStay');

                    if (fetchedRoom.gateClosingTime) {
                        newFormData.gateClosingTime = {
                            time: fetchedRoom.gateClosingTime.time || '',
                            period: fetchedRoom.gateClosingTime.period || 'PM',
                            noRestriction: fetchedRoom.gateClosingTime.noRestriction || false,
                        };
                    }

                    setFormData(newFormData);

                    if (fetchedRoom.images && fetchedRoom.images.length > 0) {
                        setImagePreviews(fetchedRoom.images);
                        const coverIndex = fetchedRoom.images.indexOf(fetchedRoom.imageUrl);
                        setCoverImageIndex(coverIndex > -1 ? coverIndex : 0);
                    } else {
                        setImagePreviews([]);
                        setCoverImageIndex(0);
                    }
                    setHighestStep(5);

                } catch (error) {
                    // This catch block is what shows your toast message
                    console.error("Error fetching room data:", error);
                    toast.error("Could not fetch room details.");
                    navigate('/landlord/my-rooms');
                } finally {
                    setLoadingDetails(false);
                }
            };
            fetchRoomData();
        }
    }, [id, isEditMode, user, navigate]);
   

    useEffect(() => {
        const dirty = Object.values(formData).some(val => val !== '' && (Array.isArray(val) ? val.length > 0 : true)) || images.length > 0;
        setIsFormDirty(dirty);
    }, [formData, images]);

    useEffect(() => {
        const handleBeforeUnload = (event) => { if (isFormDirty) { event.preventDefault(); event.returnValue = ''; } };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [isFormDirty]);

    const validateField = (name, value) => { let error = ''; switch (name) { case 'title': if (String(value).trim().length < 10) error = 'Title must be at least 10 characters long.'; break; case 'rent': if (!value || value <= 0) error = 'Please enter a valid rent.'; break; case 'description': if (String(value).trim().length < 20) error = 'Description must be at least 20 characters long.'; break; case 'roomType': if (!value) error = 'Please select a room type.'; break; case 'beds': if (!value || value <= 0) error = 'Please enter a valid number of beds.'; break; case 'address': if (String(value).trim().length < 5) error = 'Please enter a valid address.'; break; case 'city': if (!value) error = 'Please select a city.'; break; case 'location': if (!value || !value.latitude || !value.longitude) error = 'Please pick a location on the map.'; break; default: break; } setErrors(prev => ({ ...prev, [name]: error })); return !error; };
    const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); validateField(name, value); };
    const handleSelectChange = (name, selectedOption) => { const value = selectedOption ? selectedOption.value : ''; setFormData(prev => ({ ...prev, [name]: value })); validateField(name, value); };
    const handleObjectChange = (fieldName, key, value) => { setFormData(prev => ({ ...prev, [fieldName]: { ...prev[fieldName], [key]: value } })); };
    const handleToggle = (category, id) => { setFormData(prev => ({ ...prev, [category]: { ...prev[category], [id]: !prev[category][id] } })); };

    const handleLocationChange = useCallback((locationData) => {
        if (locationData && locationData.rawData) {
            const { lat, lng, fullAddress, rawData } = locationData;
            const extractedCityName = rawData.city || rawData.town || rawData.village || rawData.county;
            let cityValueToSet = formData.city; 

            if (extractedCityName) {
                const matchedCity = indianCities.find(c =>
                    c.value.toLowerCase() === extractedCityName.toLowerCase()
                );
                if (matchedCity) {
                    cityValueToSet = matchedCity.value;
                }
            }
            setFormData(prev => ({
                ...prev,
                latitude: lat,
                longitude: lng,
                address: fullAddress || prev.address,
                city: cityValueToSet,
                state: rawData.state || "",
                postalCode: rawData.postcode || "",
            }));
            setErrors(prev => ({ ...prev, location: '' }));
        }
    }, [formData.city]);

    const handleFileChange = (e) => { const files = Array.from(e.target.files); if (imagePreviews.length + files.length > 5) { toast.error('You can upload a maximum of 5 photos.'); return; } setImages(prev => [...prev, ...files]); const newPreviews = files.map(file => URL.createObjectURL(file)); setImagePreviews(prev => [...prev, ...newPreviews]); };
    const removeImage = (indexToRemove) => { const previewToRemove = imagePreviews[indexToRemove]; if (indexToRemove === coverImageIndex) { setCoverImageIndex(0); } else if (indexToRemove < coverImageIndex) { setCoverImageIndex(prev => prev - 1); } const updatedPreviews = imagePreviews.filter((_, index) => index !== indexToRemove); setImagePreviews(updatedPreviews); if (!previewToRemove.startsWith('blob:')) { setFormData(prev => ({ ...prev, images: prev.images.filter(url => url !== previewToRemove) })); } else { const blobUrlIndex = imagePreviews.filter(p => p.startsWith('blob:')).findIndex(p => p === previewToRemove); if (blobUrlIndex !== -1) { setImages(prevImages => prevImages.filter((_, i) => i !== blobUrlIndex)); } URL.revokeObjectURL(previewToRemove); } };
    const openImageModal = (image) => setPreviewModalImage(image);
    const closeImageModal = () => setPreviewModalImage(null);
    const setAsCover = (index) => { setCoverImageIndex(index); toast.success("Cover photo selected!"); };
    const handleDragStart = (e, position) => { dragItem.current = position; };
    const handleDragEnter = (e, position) => { dragOverItem.current = position; };
    const handleDrop = () => { if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) return; const newImagePreviews = [...imagePreviews]; const dragItemContent = newImagePreviews[dragItem.current]; newImagePreviews.splice(dragItem.current, 1); newImagePreviews.splice(dragOverItem.current, 0, dragItemContent); if (dragItem.current === coverImageIndex) { setCoverImageIndex(dragOverItem.current); } else { if (dragItem.current < coverImageIndex && dragOverItem.current >= coverImageIndex) { setCoverImageIndex(prev => prev - 1); } else if (dragItem.current > coverImageIndex && dragOverItem.current <= coverImageIndex) { setCoverImageIndex(prev => prev + 1); } } setImagePreviews(newImagePreviews); dragItem.current = null; dragOverItem.current = null; };
    const uploadImages = async () => { if (images.length === 0) return []; const imageUrls = []; try { const config = { headers: { 'Content-Type': 'multipart/form-data', Authorization: `Bearer ${user.token}` } }; for (const imageFile of images) { const formData = new FormData(); formData.append('image', imageFile); const { data } = await api.post('/upload', formData, config); imageUrls.push(data.imageUrl); } return imageUrls; } catch (err) { toast.error('Image upload failed.'); return null; } };

    const handleSubmit = async (e) => {
        e.preventDefault();
        let isStepValid = true;
        if (step === 1) { isStepValid = ['title', 'rent', 'description', 'roomType', 'beds'].every(field => validateField(field, formData[field])); }
        else if (step === 2) { const isTextFieldsValid = ['address', 'city'].every(field => validateField(field, formData[field])); const isLocationPicked = validateField('location', { latitude: formData.latitude, longitude: formData.longitude }); isStepValid = isTextFieldsValid && isLocationPicked; }
        if (!isStepValid) { toast.error('Please fix the errors before proceeding.'); return; }
        if (step < 5) { setStep(step + 1); if (step + 1 > highestStep) { setHighestStep(step + 1); } window.scrollTo(0, 0); return; }
        if (step === 5 && imagePreviews.length === 0) { toast.error('Please upload at least one room photo.'); return; }
        setUploading(true);
        setIsFormDirty(false);
        const newImageUrls = await uploadImages();
        if (newImageUrls === null) { setUploading(false); setIsFormDirty(true); return; }
        const existingImageUrls = imagePreviews.filter(p => !p.startsWith('blob:'));
        const finalImageUrls = [...existingImageUrls];
        imagePreviews.forEach(preview => { if (preview.startsWith('blob:')) { finalImageUrls.push(newImageUrls.shift()); } });
        if (finalImageUrls.length === 0) { toast.error("At least one image is required."); setUploading(false); setIsFormDirty(true); return; }
        try {
            const dataToSend = { ...formData };
            dataToSend.location = {
                type: 'Point',
                coordinates: [dataToSend.longitude, dataToSend.latitude],
                fullAddress: dataToSend.address,
                city: dataToSend.city,
                state: dataToSend.state,
                postalCode: dataToSend.postalCode,
            };
            delete dataToSend.address;
            delete dataToSend.city;
            delete dataToSend.latitude;
            delete dataToSend.longitude;
            delete dataToSend.state;
            delete dataToSend.postalCode;
            const roomData = { ...dataToSend, rent: Number(dataToSend.rent), imageUrl: finalImageUrls[coverImageIndex], images: finalImageUrls, };
            const config = { headers: { 'Authorization': `Bearer ${user.token}` } };
            
            if (isEditMode) {
                await api.put(`/rooms/${id}`, roomData, config);
                toast.success('Room updated successfully!');
                setIsFormDirty(false); 
                navigate('/landlord/my-rooms'); 
            } else {
                await api.post('/rooms', roomData, config);
                const updatedUser = {
                    ...user,
                    roles: [...(user.roles || []), 'Landlord'].filter((v, i, a) => a.indexOf(v) === i)
                };
                updateUser(updatedUser);
                toast.success('Your room has been listed successfully!');
                setIsFormDirty(false);
                setTimeout(() => navigate('/landlord/overview'), 100);
            }
        } catch (err) {
            console.error('FINAL SUBMISSION FAILED:', err);
            toast.error(err.response?.data?.message || (isEditMode ? 'Failed to update room.' : 'Failed to add room.'));
            setIsFormDirty(true);
        } finally {
            setUploading(false);
        }
    };

    const handleStepClick = (targetStep) => { if (targetStep <= highestStep) { setStep(targetStep); } };

    // (renderFormStep function )
    const renderFormStep = () => {
        const customSelectStyles = {
            control: (base, state) => ({ ...base, borderRadius: '0.5rem', borderWidth: '1px', borderColor: state.isFocused ? '#6366F1' : '#E5E7EB', backgroundColor: 'white', padding: '0.4rem', boxShadow: state.isFocused ? '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' : '0 1px 2px 0 rgb(0 0 0 / 0.05)', transition: 'all 0.3s ease-in-out', '&:hover': { borderColor: '#A5B4FC' } }),
            menu: (base) => ({ ...base, zIndex: 9999, borderRadius: '0.5rem' })
        };
        const unitSelectStyles = { control: (base, state) => ({ ...base, borderRadius: '0.5rem', borderWidth: '1px', backgroundColor: 'white', minWidth: '100px', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)', borderColor: state.isFocused ? '#6366F1' : '#E5E7EB', '&:hover': { borderColor: '#A5B4FC' } }), menu: (base) => ({ ...base, zIndex: 51 }) };
        const timePeriodSelectStyles = { control: (base) => ({ ...base, borderRadius: '0.5rem', borderWidth: '1px', backgroundColor: 'white', minWidth: '90px', boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.05)', '&:hover': { borderColor: '#A5B4FC' } }), menu: (base) => ({ ...base, zIndex: 51 }) };

        return (<div className="space-y-6"> {step === 1 && (<div className="animate-fade-in"> <h3 className="text-2xl font-bold text-gray-800">1. Basic Details</h3> <div className="relative group mt-6"> <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors"><FaHome className="h-5 w-5" /></span> <input type="text" id="title" name="title" value={formData.title} onChange={handleChange} className="peer block w-full rounded-lg border border-gray-200 bg-white p-4 pl-10 shadow-sm transition-all duration-300 focus:border-indigo-500 focus:shadow-md focus:ring-1 focus:ring-indigo-500 placeholder:text-transparent" placeholder="Room Title" /> <label htmlFor="title" className="absolute left-10 top-4 text-gray-500 transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:-top-2.5 peer-focus:text-indigo-600 peer-focus:text-sm bg-slate-50 px-1 peer-[&:not(:placeholder-shown)]:-top-2.5 peer-[&:not(:placeholder-shown)]:text-sm peer-[&:not(:placeholder-shown)]:text-indigo-600">Room Title <span className="text-red-500">*</span></label> {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>} </div> <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6"> <div className="relative group"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600"><FaRupeeSign className="h-5 w-5" /></span><input type="number" id="rent" name="rent" value={formData.rent} onChange={handleChange} className="peer block w-full rounded-lg border border-gray-200 bg-white p-4 pl-10 shadow-sm transition-all duration-300 focus:border-indigo-500 focus:shadow-md focus:ring-1 focus:ring-indigo-500 placeholder:text-transparent" placeholder="Rent" /><label htmlFor="rent" className="absolute left-10 top-4 text-gray-500 transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:-top-2.5 peer-focus:text-indigo-600 peer-focus:text-sm bg-slate-50 px-1 peer-[&:not(:placeholder-shown)]:-top-2.5 peer-[&:not(:placeholder-shown)]:text-sm peer-[&:not(:placeholder-shown)]:text-indigo-600">Rent per month <span className="text-red-500">*</span></label>{errors.rent && <p className="mt-1 text-xs text-red-500">{errors.rent}</p>}</div> <div className="relative group"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600"><FaBed className="h-5 w-5" /></span><input type="number" id="beds" name="beds" value={formData.beds} onChange={handleChange} className="peer block w-full rounded-lg border border-gray-200 bg-white p-4 pl-10 shadow-sm transition-all duration-300 focus:border-indigo-500 focus:shadow-md focus:ring-1 focus:ring-indigo-500 placeholder:text-transparent" placeholder="Beds" /><label htmlFor="beds" className="absolute left-10 top-4 text-gray-500 transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:-top-2.5 peer-focus:text-indigo-600 peer-focus:text-sm bg-slate-50 px-1 peer-[&:not(:placeholder-shown)]:-top-2.5 peer-[&:not(:placeholder-shown)]:text-sm peer-[&:not(:placeholder-shown)]:text-indigo-600">Number of Beds <span className="text-red-500">*</span></label>{errors.beds && <p className="mt-1 text-xs text-red-500">{errors.beds}</p>}</div> </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                <div><label className="block text-sm font-semibold text-gray-700 mb-2">Room Type <span className="text-red-500">*</span></label><Select styles={customSelectStyles} name="roomType" options={roomTypeOptions} onChange={(opt) => handleSelectChange('roomType', opt)} value={roomTypeOptions.find(o => o.value === formData.roomType)} placeholder="Select room type..." />{errors.roomType && <p className="mt-1 text-xs text-red-500">{errors.roomType}</p>}</div>
                <div><label className="block text-sm font-semibold text-gray-700 mb-2">Family Status <span className="text-red-500">*</span></label><Select styles={customSelectStyles} name="familyStatus" options={familyStatusOptions} onChange={(opt) => handleObjectChange('tenantPreferences', 'familyStatus', opt.value)} value={familyStatusOptions.find(o => o.value === formData.tenantPreferences.familyStatus)} /></div>
            </div>
            <div className="mt-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Allowed Gender <span className="text-red-500">*</span></label>
                <Select
                    styles={customSelectStyles}
                    name="allowedGender"
                    options={allowedGenderOptions}
                    onChange={(opt) => handleObjectChange('tenantPreferences', 'allowedGender', opt.value)}
                    value={allowedGenderOptions.find(o => o.value === formData.tenantPreferences.allowedGender)}
                    isDisabled={formData.tenantPreferences.familyStatus === 'Family'}
                />
                {formData.tenantPreferences.familyStatus === 'Family' && <p className="mt-1 text-xs text-gray-500">Gender preference is not applicable for families.</p>}
            </div>
            <div className="relative group mt-6"> <textarea id="description" name="description" value={formData.description} onChange={handleChange} rows="3" className="peer block w-full rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition-all duration-300 focus:border-indigo-500 focus:shadow-md focus:ring-1 focus:ring-indigo-500 placeholder:text-transparent" placeholder="Description"></textarea> <label htmlFor="description" className="absolute left-3 top-4 text-gray-500 transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:-top-2.5 peer-focus:text-indigo-600 peer-focus:text-sm bg-slate-50 px-1 peer-[&:not(:placeholder-shown)]:-top-2.5 peer-[&:not(:placeholder-shown)]:text-sm peer-[&:not(:placeholder-shown)]:text-indigo-600">Detailed Description <span className="text-red-500">*</span></label> {errors.description && <p className="mt-1 text-xs text-red-500">{errors.description}</p>} </div> </div>)} {step === 2 && (<div className="animate-fade-in"> <h3 className="text-2xl font-bold text-gray-800">2. Location & Proximity</h3> <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6"> <div className="relative group"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600"><FaMapMarkerAlt className="h-5 w-5" /></span><input type="text" id="address" name="address" value={formData.address} onChange={handleChange} className="peer block w-full rounded-lg border border-gray-200 bg-white p-4 pl-10 shadow-sm transition-all duration-300 focus:border-indigo-500 focus:shadow-md focus:ring-1 focus:ring-indigo-500 placeholder:text-transparent" placeholder="Full Address" /><label htmlFor="address" className="absolute left-10 top-4 text-gray-500 transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:-top-2.5 peer-focus:text-indigo-600 peer-focus:text-sm bg-slate-50 px-1 peer-[&:not(:placeholder-shown)]:-top-2.5 peer-[&:not(:placeholder-shown)]:text-sm peer-[&:not(:placeholder-shown)]:text-indigo-600">Full Address <span className="text-red-500">*</span></label>{errors.address && <p className="mt-1 text-xs text-red-500">{errors.address}</p>}</div> <div><label className="block text-sm font-semibold text-gray-700 mb-2">City <span className="text-red-500">*</span></label><Select id="city" name="city" options={indianCities} onChange={(opt) => handleSelectChange('city', opt)} value={indianCities.find(c => c.value === formData.city)} placeholder="Search and select a city" isClearable isSearchable required styles={customSelectStyles} />{errors.city && <p className="mt-1 text-xs text-red-500">{errors.city}</p>}</div> </div>
            <div className="mt-6">
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Pinpoint Location on Map <span className="text-red-500">*</span>
                </label>
                <LocationPicker onLocationChange={handleLocationChange} />
                {errors.location && <p className="mt-1 text-xs text-red-500">{errors.location}</p>}
                {formData.latitude && formData.longitude && (
                    <div className="mt-3 p-2 bg-green-100 text-green-800 text-xs rounded-md">
                        Location pinned at: Lat: {formData.latitude.toFixed(4)}, Lng: {formData.longitude.toFixed(4)}
                    </div>
                )}
            </div>
            <hr className="my-6 border-gray-200" /> <h4 className="font-semibold text-lg text-gray-800">Distances (Optional)</h4> <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4"> <div><label className="block text-sm font-semibold text-gray-700 mb-2">To nearest College</label><div className="flex items-center space-x-2"><div className="relative flex-grow"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><FaUniversity className="h-5 w-5" /></span><input type="number" value={formData.distanceCollege.value} onChange={(e) => handleObjectChange('distanceCollege', 'value', e.target.value)} placeholder="e.g., 500" className="block w-full rounded-lg border border-gray-200 bg-white p-3 pl-10 shadow-sm transition-all duration-300 focus:border-indigo-500 focus:shadow-md focus:ring-1 focus:ring-indigo-500" /></div><Select options={distanceUnits} value={distanceUnits.find(u => u.value === formData.distanceCollege.unit)} onChange={(opt) => handleObjectChange('distanceCollege', 'unit', opt.value)} styles={unitSelectStyles} /></div></div> <div><label className="block text-sm font-semibold text-gray-700 mb-2">To nearest Hospital</label><div className="flex items-center space-x-2"><div className="relative flex-grow"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><FaHospital className="h-5 w-5" /></span><input type="number" value={formData.distanceHospital.value} onChange={(e) => handleObjectChange('distanceHospital', 'value', e.target.value)} placeholder="e.g., 1" className="block w-full rounded-lg border border-gray-200 bg-white p-3 pl-10 shadow-sm transition-all duration-300 focus:border-indigo-500 focus:shadow-md focus:ring-1 focus:ring-indigo-500" /></div><Select options={distanceUnits} value={distanceUnits.find(u => u.value === formData.distanceHospital.unit)} onChange={(opt) => handleObjectChange('distanceHospital', 'unit', opt.value)} styles={unitSelectStyles} /></div></div> <div><label className="block text-sm font-semibold text-gray-700 mb-2">To nearest Metro</label><div className="flex items-center space-x-2"><div className="relative flex-grow"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><FaTrain className="h-5 w-5" /></span><input type="number" value={formData.distanceMetro.value} onChange={(e) => handleObjectChange('distanceMetro', 'value', e.target.value)} placeholder="e.g., 5" className="block w-full rounded-lg border border-gray-200 bg-white p-3 pl-10 shadow-sm transition-all duration-300 focus:border-indigo-500 focus:shadow-md focus:ring-1 focus:ring-indigo-500" /></div><Select options={distanceUnits} value={distanceUnits.find(u => u.value === formData.distanceMetro.unit)} onChange={(opt) => handleObjectChange('distanceMetro', 'unit', opt.value)} styles={unitSelectStyles} /></div></div> <div><label className="block text-sm font-semibold text-gray-700 mb-2">To nearest Bus Stand</label><div className="flex items-center space-x-2"><div className="relative flex-grow"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><FaBus className="h-5 w-5" /></span><input type="number" value={formData.distanceBusStand.value} onChange={(e) => handleObjectChange('distanceBusStand', 'value', e.target.value)} placeholder="e.g., 200" className="block w-full rounded-lg border border-gray-200 bg-white p-3 pl-10 shadow-sm transition-all duration-300 focus:border-indigo-500 focus:shadow-md focus:ring-1 focus:ring-indigo-500" /></div><Select options={distanceUnits} value={distanceUnits.find(u => u.value === formData.distanceBusStand.unit)} onChange={(opt) => handleObjectChange('distanceBusStand', 'unit', opt.value)} styles={unitSelectStyles} /></div></div> <div><label className="block text-sm font-semibold text-gray-700 mb-2">To nearest Railway</label><div className="flex items-center space-x-2"><div className="relative flex-grow"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><FaRoute className="h-5 w-5" /></span><input type="number" value={formData.distanceRailway.value} onChange={(e) => handleObjectChange('distanceRailway', 'value', e.target.value)} placeholder="e.g., 2" className="block w-full rounded-lg border border-gray-200 bg-white p-3 pl-10 shadow-sm transition-all duration-300 focus:border-indigo-500 focus:shadow-md focus:ring-1 focus:ring-indigo-500" /></div><Select options={distanceUnits} value={distanceUnits.find(u => u.value === formData.distanceRailway.unit)} onChange={(opt) => handleObjectChange('distanceRailway', 'unit', opt.value)} styles={unitSelectStyles} /></div></div> <div><label className="block text-sm font-semibold text-gray-700 mb-2">To nearest Market</label><div className="flex items-center space-x-2"><div className="relative flex-grow"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><FaStore className="h-5 w-5" /></span><input type="number" value={formData.distanceMarket.value} onChange={(e) => handleObjectChange('distanceMarket', 'value', e.target.value)} placeholder="e.g., 100" className="block w-full rounded-lg border border-gray-200 bg-white p-3 pl-10 shadow-sm transition-all duration-300 focus:border-indigo-500 focus:shadow-md focus:ring-1 focus:ring-indigo-500" /></div><Select options={distanceUnits} value={distanceUnits.find(u => u.value === formData.distanceMarket.unit)} onChange={(opt) => handleObjectChange('distanceMarket', 'unit', opt.value)} styles={unitSelectStyles} /></div></div> </div> </div>)} {step === 3 && (<div className="animate-fade-in"> <h3 className="text-2xl font-bold text-gray-800">3. Amenities & Features</h3> {Object.entries(facilitiesData).map(([category, items]) => (<div key={category} className="mt-6"> <h4 className="font-semibold text-lg text-gray-800 mb-4 flex items-center"> {category === 'utilities' && <FaTools className="mr-3 text-indigo-500" />} {category === 'roomFeatures' && <FaBed className="mr-3 text-indigo-500" />} {category === 'buildingAmenities' && <FaBuilding className="mr-3 text-indigo-500" />} {category.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} </h4> <div className="grid grid-cols-2 md:grid-cols-4 gap-4"> {items.map(item => (<button type="button" key={item.id} onClick={() => handleToggle('facilities', item.id)} className={`flex items-center justify-center text-center p-3 rounded-lg border-2 text-sm font-medium transition-all duration-200 ${formData.facilities[item.id] ? 'bg-indigo-600 text-white border-indigo-700 shadow-md' : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400 hover:bg-indigo-50'}`}> <item.icon className={`mr-3 h-5 w-5 ${formData.facilities[item.id] ? 'text-white' : 'text-indigo-500'}`} /> {item.label} </button>))} </div> </div>))} <hr className="my-6 border-gray-200" /> <div className="mt-6"> <h4 className="font-semibold text-lg text-gray-800 mb-4 flex items-center"><FaUtensils className="mr-3 text-indigo-500" /> Kitchen</h4> <Select name="kitchen" options={kitchenOptions} onChange={(opt) => handleSelectChange('kitchen', opt)} value={kitchenOptions.find(o => o.value === formData.kitchen)} placeholder="Select kitchen availability..." styles={customSelectStyles} /> {formData.kitchen && formData.kitchen !== 'None' && (<div className="mt-4 pl-2"> <p className="text-sm font-semibold text-gray-700 mb-2">Kitchen Includes:</p> <div className="flex flex-wrap gap-4"> {kitchenAmenitiesData.map(item => (<button type="button" key={item.id} onClick={() => handleToggle('kitchenAmenities', item.id)} className={`p-3 rounded-lg border-2 text-sm font-medium transition-all duration-200 ${formData.kitchenAmenities[item.id] ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'}`}> {item.label} </button>))} </div> </div>)} </div> <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 mt-6 border-t border-gray-200"> <div className="relative group"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600"><FaBuilding className="h-5 w-5" /></span><input type="text" name="floor" value={formData.floor} onChange={handleChange} placeholder="e.g., 3rd out of 5" className="peer block w-full rounded-lg border border-gray-200 bg-white p-4 pl-10 shadow-sm transition-all duration-300 focus:border-indigo-500 focus:shadow-md focus:ring-1 focus:ring-indigo-500 placeholder:text-transparent" /><label htmlFor="floor" className="absolute left-10 top-4 text-gray-500 transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:-top-2.5 peer-focus:text-indigo-600 peer-focus:text-sm bg-slate-50 px-1 peer-[&:not(:placeholder-shown)]:-top-2.5 peer-[&:not(:placeholder-shown)]:text-sm peer-[&:not(:placeholder-shown)]:text-indigo-600">Floor</label></div> <div className="relative group"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600"><FaVideo className="h-5 w-5" /></span><input type="text" name="videoUrl" value={formData.videoUrl} onChange={handleChange} placeholder="https://youtube.com/watch?v=..." className="peer block w-full rounded-lg border border-gray-200 bg-white p-4 pl-10 shadow-sm transition-all duration-300 focus:border-indigo-500 focus:shadow-md focus:ring-1 focus:ring-indigo-500 placeholder:text-transparent" /><label htmlFor="videoUrl" className="absolute left-10 top-4 text-gray-500 transition-all duration-300 peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-focus:-top-2.5 peer-focus:text-indigo-600 peer-focus:text-sm bg-slate-50 px-1 peer-[&:not(:placeholder-shown)]:-top-2.5 peer-[&:not(:placeholder-shown)]:text-sm peer-[&:not(:placeholder-shown)]:text-indigo-600">Video Tour URL (Optional)</label></div> </div> </div>)} {step === 4 && (<div className="animate-fade-in"> <h3 className="text-2xl font-bold text-gray-800">4. Rules & Policies</h3> <p className="text-gray-500 mt-2">Set clear expectations for your future tenants.</p> <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6"> <div><label className="block text-sm font-semibold text-gray-700 mb-2">Security Deposit</label><Select name="securityDeposit" options={depositOptions} onChange={(opt) => handleSelectChange('securityDeposit', opt)} value={depositOptions.find(o => o.value === formData.securityDeposit)} styles={customSelectStyles} placeholder="Select deposit amount" /></div> <div><label className="block text-sm font-semibold text-gray-700 mb-2">Notice Period</label><div className="flex items-center space-x-2"><div className="relative flex-grow"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><FaCalendarAlt className="h-5 w-5" /></span><input type="number" value={formData.noticePeriod.value} onChange={(e) => handleObjectChange('noticePeriod', 'value', e.target.value)} placeholder="e.g., 30" className="block w-full rounded-lg border border-gray-200 bg-white p-3 pl-10 shadow-sm transition-all duration-300 focus:border-indigo-500 focus:shadow-md focus:ring-1 focus:ring-indigo-500" /></div><Select options={periodUnits} value={periodUnits.find(u => u.value === formData.noticePeriod.unit)} onChange={(opt) => handleObjectChange('noticePeriod', 'unit', opt.value)} styles={unitSelectStyles} /></div></div> <div><label className="block text-sm font-semibold text-gray-700 mb-2">Minimum Stay (Lock-in)</label><div className="flex items-center space-x-2"><div className="relative flex-grow"><span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><FaFileContract className="h-5 w-5" /></span><input type="number" value={formData.minimumStay.value} onChange={(e) => handleObjectChange('minimumStay', 'value', e.target.value)} placeholder="e.g., 6" className="block w-full rounded-lg border border-gray-200 bg-white p-3 pl-10 shadow-sm transition-all duration-300 focus:border-indigo-500 focus:shadow-md focus:ring-1 focus:ring-indigo-500" /></div><Select options={periodUnits} value={periodUnits.find(u => u.value === formData.minimumStay.unit)} onChange={(opt) => handleObjectChange('minimumStay', 'unit', opt.value)} styles={unitSelectStyles} /></div></div> <div> <label className="block text-sm font-semibold text-gray-700 mb-2">Gate Closing Time</label> <div className="flex items-center space-x-4"> <div className="flex-grow"> <div className={`flex items-center space-x-2 transition-opacity duration-300 ${formData.gateClosingTime.noRestriction ? 'opacity-50' : 'opacity-100'}`}> <div className="relative flex-grow"> <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400"><FaClock className="h-5 w-5" /></span> <input type="text" value={formData.gateClosingTime.time} onChange={(e) => handleObjectChange('gateClosingTime', 'time', e.target.value)} placeholder="e.g., 11:00" className="block w-full rounded-lg border border-gray-200 bg-white p-3 pl-10 shadow-sm transition-all duration-300 focus:border-indigo-500 focus:shadow-md focus:ring-1 focus:ring-indigo-500" disabled={formData.gateClosingTime.noRestriction} /> </div> <Select options={timePeriodOptions} value={timePeriodOptions.find(p => p.value === formData.gateClosingTime.period)} onChange={(opt) => handleObjectChange('gateClosingTime', 'period', opt.value)} styles={timePeriodSelectStyles} isDisabled={formData.gateClosingTime.noRestriction} /> </div> </div> <div className="flex items-center"> <input type="checkbox" id="noRestriction" checked={formData.gateClosingTime.noRestriction} onChange={(e) => handleObjectChange('gateClosingTime', 'noRestriction', e.target.checked)} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-600" /> <label htmlFor="noRestriction" className="ml-2 text-sm font-medium text-gray-700">No Restriction</label> </div> </div> </div> </div> <div className="mt-6"> <h4 className="font-semibold text-lg text-gray-800 mb-4 flex items-center pt-6 border-t border-gray-200"><FaUsers className="mr-3 text-indigo-500" /> Other Rules</h4> <div className="grid grid-cols-2 md:grid-cols-4 gap-4"> {rulesData.map(item => (<button type="button" key={item.id} onClick={() => handleToggle('rules', item.id)} className={`p-3 rounded-lg border-2 text-sm font-medium transition-all duration-200 ${formData.rules[item.id] ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'}`}> {item.label} </button>))} </div> </div> </div>)} {step === 5 && (<div className="animate-fade-in"> <h3 className="text-2xl font-bold text-gray-800">5. Room Photos <span className="text-red-500">*</span></h3> <p className="text-gray-500 mt-2">Upload clear photos. Drag to reorder. Click the star to set a cover photo. (Max 5)</p> <input id="file-upload" type="file" multiple onChange={handleFileChange} className="sr-only" accept="image/png, image/jpeg" /> <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mt-6"> {imagePreviews.map((preview, index) => (<div key={index} className="relative group aspect-square cursor-grab" draggable onDragStart={(e) => handleDragStart(e, index)} onDragEnter={(e) => handleDragEnter(e, index)} onDragEnd={handleDrop} onDragOver={(e) => e.preventDefault()}> <img src={preview} alt={`preview ${index + 1}`} className="h-full w-full object-cover rounded-lg border-2 border-gray-200" /> {index === coverImageIndex && (<div className="absolute top-0 left-0 bg-indigo-600 text-white text-xs font-bold px-2 py-1 rounded-br-lg rounded-tl-md flex items-center"><FaStar className="mr-1" /> Cover</div>)} <div className="absolute inset-0 bg-black bg-opacity-50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"> {index !== coverImageIndex && (<button type="button" onClick={() => setAsCover(index)} className="text-white text-xs bg-black bg-opacity-70 px-2 py-1 rounded mb-2">Set as Cover</button>)} <button type="button" onClick={() => openImageModal(preview)} className="text-white text-xs bg-black bg-opacity-70 px-2 py-1 rounded">View</button> </div> <button type="button" onClick={() => removeImage(index)} className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 bg-red-500 text-white rounded-full p-1.5 shadow-md"><FaTimes size={12} /></button> </div>))} {imagePreviews.length < 5 && (<label htmlFor="file-upload" className="cursor-pointer aspect-square rounded-lg border-2 border-dashed border-gray-400 flex flex-col items-center justify-center text-gray-400 hover:border-indigo-600 hover:text-indigo-600 transition-colors"><FaPlus className="h-8 w-8" /><span className="text-sm font-semibold mt-1">Add Photo</span></label>)} </div> </div>)} </div>);
    };

    if (loadingDetails) { return <div className="flex justify-center items-center min-h-screen"><FaSpinner className="animate-spin text-indigo-600 h-16 w-16" /></div>; }

    return (
        <>
            <div className="w-full max-w-4xl mx-auto bg-slate-50 rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 my-10">
                <div className="text-center mb-8"> <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-800 mb-2 tracking-tight">{isEditMode ? 'Edit Your Room' : 'Add a New Room'}</h1> <p className="text-gray-500 text-sm sm:text-base">Follow these 5 simple steps to get your room listed.</p> </div>
                <div className="flex items-start justify-center space-x-1 sm:space-x-2 md:space-x-4 mb-10">
                    {['Details', 'Location', 'Amenities', 'Rules', 'Photos'].map((label, index) => {
                        const stepNumber = index + 1;
                        return (<React.Fragment key={label}> <div className={`flex flex-col items-center text-center w-14 sm:w-16 ${stepNumber <= highestStep ? 'cursor-pointer' : 'cursor-default'}`} onClick={() => handleStepClick(stepNumber)}> <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full border-2 flex items-center justify-center font-bold text-lg transition-all duration-300 ${step >= stepNumber ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-400 border-gray-300'}`}> {step > stepNumber ? <FaCheckCircle /> : stepNumber} </div> <p className={`mt-2 text-[10px] sm:text-xs font-semibold transition-colors duration-300 ${step >= stepNumber ? 'text-indigo-600' : 'text-gray-400'}`}>{label}</p> </div> {index < 4 && (<div className={`flex-1 h-1 mt-5 sm:mt-6 rounded-full transition-colors duration-500 ${step > stepNumber ? 'bg-indigo-600' : 'bg-gray-300'}`}></div>)} </React.Fragment>);
                    })}
                </div>
                <form onSubmit={handleSubmit} noValidate>
                    {renderFormStep()}
                    <div className="mt-10 flex items-center justify-between">
                        <button type="button" onClick={() => { if (step > 1) { setStep(step - 1); window.scrollTo(0, 0); } else { navigate('/landlord/my-rooms'); } }} className="px-4 py-2 sm:px-6 sm:py-3 border border-gray-300 rounded-lg text-sm font-semibold text-gray-700 hover:bg-gray-50 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"> <FaArrowLeft className="mr-2" /> {step > 1 ? 'Previous' : 'Back to My Rooms'} </button>
                        <button type="submit" disabled={uploading} className="px-5 py-3 sm:px-8 sm:py-3 rounded-lg text-sm font-semibold text-white bg-indigo-600 shadow-lg shadow-indigo-500/50 transition-all duration-300 transform hover:-translate-y-1 hover:shadow-xl disabled:opacity-50 flex items-center justify-center"> {uploading ? (<><FaSpinner className="animate-spin mr-3" /> Submitting...</>) : (step < 5 ? 'Next Step' : (isEditMode ? (<><FaSave className="mr-2" /> Save Changes</>) : (<><FaPlus className="mr-2" /> List Room</>)))} </button>
                    </div>
                </form>
            </div>
            {previewModalImage && (<div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 animate-fade-in" onClick={closeImageModal}> <img src={previewModalImage} alt="Large preview" className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg shadow-2xl" onClick={(e) => e.stopPropagation()} /> <button onClick={closeImageModal} className="absolute top-4 right-4 bg-white text-gray-800 rounded-full p-2 shadow-lg"><FaTimes size={20} /></button> </div>)}
        </>
    );
}

export default AddRoomPage;