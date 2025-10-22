import React from 'react';

interface EditableCellProps {
  type: 'text' | 'email' | 'phone' | 'number' | 'date' | 'select';
  value: any;
  onChange: (value: any) => void;
  selectOptions?: string[];
}

export function EditableCell({ 
  type, 
  value, 
  onChange,
  selectOptions = []
}: EditableCellProps) {
  const commonClasses = 'w-full px-3 py-2 bg-background border border-border rounded-md text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors';

  switch (type) {
    case 'text':
      return (
        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={commonClasses}
          placeholder="Enter text"
        />
      );

    case 'email':
      return (
        <input
          type="email"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={commonClasses}
          placeholder="Enter email"
        />
      );

    case 'phone':
      return (
        <input
          type="tel"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={commonClasses}
          placeholder="(555) 123-4567"
        />
      );

    case 'number':
      return (
        <input
          type="number"
          value={value ?? 0}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className={commonClasses}
          placeholder="0"
        />
      );

    case 'date':
      return (
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={commonClasses}
        />
      );

    case 'select':
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className={commonClasses}
        >
          <option value="">Select...</option>
          {selectOptions.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );

    default:
      return <span className="text-muted-foreground">{value}</span>;
  }
}
