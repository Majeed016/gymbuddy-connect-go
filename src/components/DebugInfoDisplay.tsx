
import React from 'react';

interface DebugInfoDisplayProps {
  debugInfo: string[];
}

const DebugInfoDisplay: React.FC<DebugInfoDisplayProps> = ({ debugInfo }) => {
  if (debugInfo.length === 0) return null;
  
  return (
    <div className="bg-yellow-50 p-4 rounded-lg mb-4 overflow-auto max-h-60">
      <h3 className="font-bold mb-2">Debug Information:</h3>
      {debugInfo.map((info, index) => (
        <p key={index} className="text-xs text-gray-600">{info}</p>
      ))}
    </div>
  );
};

export default DebugInfoDisplay;
