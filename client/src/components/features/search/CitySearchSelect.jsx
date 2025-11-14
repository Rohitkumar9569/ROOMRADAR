import React from 'react';
import Select from 'react-select';
import { indianCities } from '../../../data/indianCities';

// Professional styling ke liye
const customStyles = {
  control: (provided, state) => ({
    ...provided,
    minHeight: '48px',
    borderRadius: '0.5rem',
    borderWidth: '2px',
    backgroundColor: '#F3F4F6', // bg-gray-100
    boxShadow: state.isFocused ? '0 0 0 2px #4F46E5' : 'none', // focus:ring-indigo-600
    borderColor: state.isFocused ? '#4F46E5' : (state.selectProps.error ? '#EF4444' : '#D1D5DB'),
    '&:hover': {
      borderColor: state.isFocused ? '#4F46E5' : '#A5B4FC',
    },
  }),
  placeholder: (provided) => ({
    ...provided,
    color: '#6B7281', // text-gray-500
  }),
  singleValue: (provided) => ({
    ...provided,
    color: '#1F2937', // text-gray-800
  }),
  menu: (provided) => ({
    ...provided,
    borderRadius: '0.5rem',
    zIndex: 50,
  }),
};

function CitySearchSelect({ value, onChange, error }) {
  // react-select ko { value, label } format mein value chahiye
  const selectedValue = indianCities.find(c => c.value === value) || null;

  const handleChange = (selectedOption) => {
    // Parent component ko sirf string value (e.g., 'mumbai') bhejenge
    onChange(selectedOption ? selectedOption.value : '');
  };

  return (
    <Select
      id="city-select"
      instanceId="city-select"
      options={indianCities}
      value={selectedValue}
      onChange={handleChange}
      isClearable
      isSearchable
      placeholder="Select or search for a city..."
      styles={customStyles}
      error={error} // Pass error prop for styling
    />
  );
}

export default CitySearchSelect;