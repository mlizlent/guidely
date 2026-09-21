import './Input.css';

export function Input({
  label,
  type = 'text',
  value,
  onChange,
  onBlur,
  placeholder,
  disabled = false,
  required = false,
  error,
  helperText,
  className = '',
  id,
  name,
  autoComplete,
  ...props
}) {
  const inputId = id || name;
  const errorId = error ? `${inputId}-error` : undefined;
  const helperId = helperText && !error ? `${inputId}-helper` : undefined;

  return (
    <div className={`input-wrapper ${className} ${error ? 'input-wrapper--error' : ''} ${disabled ? 'input-wrapper--disabled' : ''}`}>
      {label && (
        <label htmlFor={inputId} className="input__label">
          {label}
          {required && <span className="input__required" aria-hidden="true">*</span>}
        </label>
      )}
      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={errorId || helperId}
        className="input"
        autoComplete={autoComplete}
        {...props}
      />
      {error && (
        <p id={errorId} className="input__error" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={helperId} className="input__helper">
          {helperText}
        </p>
      )}
    </div>
  );
}

export function Textarea({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  disabled = false,
  required = false,
  error,
  helperText,
  rows = 4,
  className = '',
  id,
  name,
  ...props
}) {
  const inputId = id || name;
  const errorId = error ? `${inputId}-error` : undefined;
  const helperId = helperText && !error ? `${inputId}-helper` : undefined;

  return (
    <div className={`input-wrapper ${className} ${error ? 'input-wrapper--error' : ''} ${disabled ? 'input-wrapper--disabled' : ''}`}>
      {label && (
        <label htmlFor={inputId} className="input__label">
          {label}
          {required && <span className="input__required" aria-hidden="true">*</span>}
        </label>
      )}
      <textarea
        id={inputId}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={errorId || helperId}
        className="textarea"
        rows={rows}
        {...props}
      />
      {error && (
        <p id={errorId} className="input__error" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={helperId} className="input__helper">
          {helperText}
        </p>
      )}
    </div>
  );
}

export function Select({
  label,
  value,
  onChange,
  onBlur,
  options = [],
  placeholder,
  disabled = false,
  required = false,
  error,
  helperText,
  className = '',
  id,
  name,
  ...props
}) {
  const selectId = id || name;
  const errorId = error ? `${selectId}-error` : undefined;
  const helperId = helperText && !error ? `${selectId}-helper` : undefined;

  return (
    <div className={`input-wrapper ${className} ${error ? 'input-wrapper--error' : ''} ${disabled ? 'input-wrapper--disabled' : ''}`}>
      {label && (
        <label htmlFor={selectId} className="input__label">
          {label}
          {required && <span className="input__required" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="select-wrapper">
        <select
          id={selectId}
          name={name}
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          disabled={disabled}
          required={required}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={errorId || helperId}
          className="select"
          {...props}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <svg className="select__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
      {error && (
        <p id={errorId} className="input__error" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={helperId} className="input__helper">
          {helperText}
        </p>
      )}
    </div>
  );
}

export function FileInput({
  label,
  value,
  onChange,
  accept,
  multiple = false,
  disabled = false,
  required = false,
  error,
  helperText,
  className = '',
  id,
  name,
  ...props
}) {
  const inputId = id || name;
  const errorId = error ? `${inputId}-error` : undefined;
  const helperId = helperText && !error ? `${inputId}-helper` : undefined;

  return (
    <div className={`input-wrapper ${className} ${error ? 'input-wrapper--error' : ''} ${disabled ? 'input-wrapper--disabled' : ''}`}>
      {label && (
        <label htmlFor={inputId} className="input__label">
          {label}
          {required && <span className="input__required" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="file-input-wrapper">
        <input
          id={inputId}
          name={name}
          type="file"
          onChange={onChange}
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          required={required}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={errorId || helperId}
          className="file-input"
          {...props}
        />
        <div className="file-input__label">
          <svg className="file-input__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span className="file-input__text">
            {value && value.length > 0
              ? `${value.length} file${value.length > 1 ? 's' : ''} selected`
              : 'Click or drag to upload'}
          </span>
          <span className="file-input__hint">.txt, .md, .pdf</span>
        </div>
      </div>
      {error && (
        <p id={errorId} className="input__error" role="alert">
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={helperId} className="input__helper">
          {helperText}
        </p>
      )}
    </div>
  );
}