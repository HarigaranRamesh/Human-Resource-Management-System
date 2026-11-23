import React from 'react';

export interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  hint?: string;
  icon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const FormInput: React.FC<FormInputProps> = ({
  id,
  name,
  label,
  error,
  hint,
  icon,
  rightElement,
  required,
  className = '',
  ...props
}) => {
  const inputId = id || name;

  return (
    <div className={`common-form-field ${error ? 'has-error' : ''}`.trim()}>
      <label className="form-label" htmlFor={inputId}>
        {label} {required && <span className="required-star">*</span>}
      </label>
      <div className="input-wrapper">
        {icon && <span className="input-icon-left">{icon}</span>}
        <input
          id={inputId}
          name={name}
          className={`form-input ${icon ? 'with-icon-left' : ''} ${rightElement ? 'with-icon-right' : ''} ${className}`.trim()}
          required={required}
          {...props}
        />
        {rightElement && <div className="input-element-right">{rightElement}</div>}
      </div>
      {error ? (
        <p className="form-error-msg">{error}</p>
      ) : hint ? (
        <p className="form-hint-msg">{hint}</p>
      ) : null}
    </div>
  );
};

export default FormInput;
