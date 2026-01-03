import { useState, useEffect, useRef } from "react";

interface FirmFilterCheckboxesProps {
  allFirms: string[];
  selectedFirms: string[];
  onChange: (firms: string[]) => void;
  chartId: string;
  className?: string;
}

export default function FirmFilterCheckboxes({
  allFirms,
  selectedFirms,
  onChange,
  chartId,
  className = "",
}: FirmFilterCheckboxesProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const allCheckboxRef = useRef<HTMLInputElement>(null);

  // Determine checkbox states
  const allSelected = selectedFirms.length === allFirms.length && allFirms.length > 0;
  const noneSelected = selectedFirms.length === 0;
  const someSelected = !allSelected && !noneSelected;

  // Update indeterminate state for "All Firms" checkbox
  useEffect(() => {
    if (allCheckboxRef.current) {
      allCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  // Handle "All Firms" checkbox toggle
  const handleToggleAll = () => {
    if (allSelected) {
      // Deselect all
      onChange([]);
    } else {
      // Select all
      onChange([...allFirms]);
    }
  };

  // Handle individual firm checkbox toggle
  const handleToggleFirm = (firm: string) => {
    if (selectedFirms.includes(firm)) {
      // Remove firm from selection
      const newSelection = selectedFirms.filter((f) => f !== firm);
      onChange(newSelection.length > 0 ? newSelection : allFirms);
    } else {
      // Add firm to selection
      onChange([...selectedFirms, firm]);
    }
  };

  // Selection summary text
  const summaryText =
    allSelected
      ? "All selected ✓"
      : noneSelected
      ? "None selected"
      : `${selectedFirms.length} of ${allFirms.length} selected`;

  return (
    <div
      className={`bg-gray-700/30 rounded-lg border border-gray-600 ${className}`}
    >
      {/* Header - Clickable to expand/collapse */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-gray-700/50 transition-colors rounded-t-lg"
      >
        <div className="flex items-center gap-2">
          <span className="text-gray-400">🏢</span>
          <span className="text-sm text-gray-300">
            Firms:{" "}
            <span
              className={`font-medium ${
                allSelected ? "text-green-400" : noneSelected ? "text-red-400" : "text-yellow-400"
              }`}
            >
              {summaryText}
            </span>
          </span>
        </div>
        <span className="text-gray-400 text-xs transition-transform duration-200">
          {isExpanded ? "▲" : "▼"}
        </span>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-gray-600">
          {/* All Firms checkbox */}
          <div className="px-4 py-2 border-b border-gray-600/50 bg-gray-700/20">
            <label className="flex items-center gap-2 text-sm text-gray-300 hover:text-white cursor-pointer">
              <input
                ref={allCheckboxRef}
                type="checkbox"
                checked={allSelected}
                onChange={handleToggleAll}
                className="w-4 h-4 rounded border-gray-500 bg-gray-700 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 cursor-pointer"
              />
              <span className="font-medium">All Firms</span>
            </label>
          </div>

          {/* Individual firm checkboxes */}
          <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto">
            {allFirms.length > 0 ? (
              allFirms.sort().map((firm) => (
                <label
                  key={firm}
                  className="flex items-center gap-2 text-sm text-gray-300 hover:text-white cursor-pointer transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedFirms.includes(firm)}
                    onChange={() => handleToggleFirm(firm)}
                    className="w-4 h-4 rounded border-gray-500 bg-gray-700 text-blue-500 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 cursor-pointer"
                  />
                  <span className="truncate" title={firm}>
                    {firm}
                  </span>
                </label>
              ))
            ) : (
              <div className="col-span-full text-center text-gray-400 text-sm py-2">
                No firms available
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
