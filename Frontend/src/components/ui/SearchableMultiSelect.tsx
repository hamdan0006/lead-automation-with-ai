import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronDown, Plus, LucideIcon } from 'lucide-react';

// Type definitions
interface Option {
    label: string;
    value: string;
    [key: string]: any; // Allow additional properties
}

interface SearchableMultiSelectProps {
    options?: Option[];
    selectedValues?: Option[];
    onChange: (selected: Option[]) => void;
    placeholder?: string;
    label?: string;
    className?: string;
    disabled?: boolean;
    loading?: boolean;
    onSearch?: (query: string) => void;
    allowCustomValues?: boolean;
}

const SearchableMultiSelect: React.FC<SearchableMultiSelectProps> = ({
    options = [],
    selectedValues = [],
    onChange,
    placeholder = 'Search industries...',
    label,
    className = '',
    disabled = false,
    loading = false,
    onSearch,
    allowCustomValues = false
}) => {
    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [filteredOptions, setFilteredOptions] = useState<Option[]>(options);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Filter options based on search term
        if (searchTerm.trim()) {
            const filtered = options.filter(option =>
                option.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
                option.value.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredOptions(filtered);

            // Call external search if provided
            if (onSearch && searchTerm.length > 1) {
                onSearch(searchTerm);
            }
        } else {
            setFilteredOptions(options.slice(0, 50)); // Show first 50 options when not searching
        }
    }, [searchTerm, options, onSearch]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (option: Option): void => {
        const isSelected = selectedValues.some(selected => selected.value === option.value);

        if (!isSelected) {
            // Add to selection and clear search
            const newSelection = [...selectedValues, option];
            onChange(newSelection);
            setSearchTerm('');
            setIsOpen(false);
        }
    };

    const handleRemove = (valueToRemove: string): void => {
        const newSelection = selectedValues.filter(selected => selected.value !== valueToRemove);
        onChange(newSelection);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
        if (e.key === 'Escape') {
            setIsOpen(false);
            setSearchTerm('');
        } else if (e.key === 'Enter' && filteredOptions.length > 0) {
            e.preventDefault();
            const firstOption = filteredOptions.find(option =>
                !selectedValues.some(selected => selected.value === option.value)
            );
            if (firstOption) {
                handleSelect(firstOption);
            }
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        setSearchTerm(e.target.value);
    };

    const handleChevronClick = (): void => {
        if (!disabled) {
            setIsOpen(!isOpen);
            if (!isOpen) {
                inputRef.current?.focus();
            }
        }
    };

    return (
        <div className={className}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {label}
                </label>
            )}

            {/* Search Input */}
            <div className="relative" ref={dropdownRef}>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={20} className="text-gray-400 dark:text-gray-500" />
                    </div>

                    <input
                        ref={inputRef}
                        type="text"
                        value={searchTerm}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        onFocus={() => setIsOpen(true)}
                        placeholder={selectedValues.length === 0 ? placeholder : 'Search for more...'}
                        className="block w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors"
                        disabled={disabled}
                    />

                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                        {loading ? (
                            <div className="animate-spin h-5 w-5 border-2 border-brand-500 border-t-transparent rounded-full"></div>
                        ) : (
                            <ChevronDown
                                size={20}
                                className={`text-gray-400 dark:text-gray-500 transition-transform cursor-pointer ${isOpen ? 'rotate-180' : ''}`}
                                onClick={handleChevronClick}
                            />
                        )}
                    </div>
                </div>

                {/* Dropdown */}
                {isOpen && !disabled && (
                    <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl dark:shadow-gray-900/50 max-h-64 overflow-hidden">
                        <div className="max-h-64 overflow-y-auto">
                            {loading && (
                                <div className="px-4 py-8 text-center">
                                    <div className="animate-spin h-6 w-6 border-2 border-brand-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                                    <div className="text-sm text-gray-500 dark:text-gray-400">Searching...</div>
                                </div>
                            )}

                            {!loading && filteredOptions.length === 0 && searchTerm.trim() && (
                                <div className="px-4 py-6 text-center">
                                    <div className="text-gray-500 dark:text-gray-400 text-sm mb-2">
                                        No results found for "{searchTerm}"
                                    </div>
                                    <div className="text-xs text-gray-400 dark:text-gray-500">
                                        Try searching with different keywords
                                    </div>
                                </div>
                            )}

                            {!loading && filteredOptions.length === 0 && !searchTerm.trim() && (
                                <div className="px-4 py-6 text-center">
                                    <Search size={24} className="text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Start typing to search</div>
                                    <div className="text-xs text-gray-400 dark:text-gray-500">Choose from available options</div>
                                </div>
                            )}

                            {!loading && filteredOptions.length > 0 && (
                                <div className="py-1">
                                    {searchTerm.trim() && (
                                        <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700">
                                            {filteredOptions.length} results found
                                        </div>
                                    )}

                                    {filteredOptions.map((option, index) => {
                                        const isSelected = selectedValues.some(selected => selected.value === option.value);
                                        return (
                                            <button
                                                key={option.value}
                                                onClick={() => handleSelect(option)}
                                                disabled={isSelected}
                                                className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors ${isSelected
                                                        ? 'bg-gray-50 dark:bg-gray-700/30 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                                                        : 'hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-700 dark:hover:text-brand-400 text-gray-900 dark:text-white'
                                                    } ${index === 0 && searchTerm.trim() ? 'border-t border-gray-100 dark:border-gray-700' : ''}`}
                                                type="button"
                                            >
                                                <span className="flex-1 text-sm font-medium">{option.label}</span>
                                                {isSelected ? (
                                                    <span className="text-xs text-gray-400 dark:text-gray-600">Selected</span>
                                                ) : (
                                                    <Plus size={16} className="text-gray-400 dark:text-gray-500" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Selected Pills */}
            {selectedValues.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4">
                    {selectedValues.map((selected) => (
                        <span
                            key={selected.value}
                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 text-sm font-medium rounded-full border border-brand-200 dark:border-brand-800 transition-colors"
                        >
                            <span>{selected.label}</span>
                            {!disabled && (
                                <button
                                    type="button"
                                    onClick={() => handleRemove(selected.value)}
                                    className="flex items-center justify-center w-4 h-4 rounded-full hover:bg-brand-200 dark:hover:bg-brand-800 transition-colors"
                                    aria-label={`Remove ${selected.label}`}
                                >
                                    <X size={12} className="w-3 h-3" />
                                </button>
                            )}
                        </span>
                    ))}
                </div>
            )}

            {/* Helper text */}
            {selectedValues.length === 0 && (
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    Make a selection to proceed
                </p>
            )}

            {selectedValues.length > 0 && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    {selectedValues.length} {selectedValues.length === 1 ? 'item' : 'items'} selected
                </p>
            )}
        </div>
    );
};

export default SearchableMultiSelect;