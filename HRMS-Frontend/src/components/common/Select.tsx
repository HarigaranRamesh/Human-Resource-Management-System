import React from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: SelectOption[];
  error?: string;
  hint?: string;
  placeholder?: string;
}

export const Select: React.FC<SelectProps> = ({
  id,
  name,
  label,
  options,
  error,
  hint,
  placeholder = 'Select an option...',
  required,
  className = '',
  ...props
}) => {
  const selectId = id || name;

  return (
    <div className={`common-form-field ${error ? 'has-error' : ''}`.trim()}>
      <label className="form-label" htmlFor={selectId}>
        {label} {required && <span className="required-star">*</span>}
      </label>
      <div className="select-wrapper">
        <select
          id={selectId}
          name={name}
          className={`form-input form-select ${className}`.trim()}
          required={required}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      {error ? (
        <p className="form-error-msg">{error}</p>
      ) : hint ? (
        <p className="form-hint-msg">{hint}</p>
      ) : null}
    </div>
  );
};

export default Select;
