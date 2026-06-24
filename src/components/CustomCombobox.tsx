import React, { useState, useRef, useEffect } from "react";
import { Plus } from "lucide-react";
import { saveSuggestion } from "../lib/suggestions";

interface CustomComboboxProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (val: string) => void;
  suggestions: string[];
  placeholder?: string;
  required?: boolean;
  fieldName?: string;
}

export default function CustomCombobox({
  id,
  label,
  value,
  onChange,
  suggestions = [],
  placeholder = "",
  required = false,
  fieldName
}: CustomComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState(value);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Sync internal state with prop value
  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  // Filter options based on typed search term
  const filteredSuggestions = suggestions.filter(item =>
    item?.toLowerCase().includes((searchTerm || "").toLowerCase())
  );

  // Handle click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const triggerAutosave = (val: string) => {
    if (fieldName && val && val.trim().length > 0) {
      // Autosave value directly to suggestions collection
      saveSuggestion(fieldName, val.trim()).catch(err => {
        console.warn("Failed to autosave suggestion:", err);
      });
    }
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setSearchTerm(val);
    setIsOpen(false);
    triggerAutosave(val);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    onChange(val);
    setIsOpen(true);
  };

  const handleBlur = () => {
    if (searchTerm) {
      triggerAutosave(searchTerm);
    }
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {label && (
        <label className="block text-[11px] font-bold text-slate-300 mb-1 uppercase tracking-wider">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          required={required}
          className="w-full bg-slate-950/60 border border-slate-700/60 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all duration-150 shadow-sm"
        />
      </div>

      {isOpen && filteredSuggestions.length > 0 && (
        <div className="absolute z-50 mt-1 w-full bg-slate-900 border border-slate-700/60 rounded-lg shadow-2xl max-h-48 overflow-y-auto py-1 scrollbar-thin">
          {filteredSuggestions.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSelect(item)}
              className="w-full text-left px-3 py-1.5 text-xs text-slate-100 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
