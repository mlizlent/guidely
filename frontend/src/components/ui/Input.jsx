const inputBase = "font-sans text-sm leading-relaxed text-[#f0ebfa] bg-[#181524] border border-[#2d2840] rounded-[10px] transition-all duration-150 ease w-full";

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
    <div className={`flex flex-col gap-1.5 w-full ${className} ${error ? 'border-[#f87171]' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-[#b8b0cc] uppercase tracking-wider">
          {label}
          {required && <span className="text-[#f87171] ml-1" aria-hidden="true">*</span>}
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
        className={`${inputBase} h-10 px-3.5 ${error ? 'border-[#f87171] focus:shadow-[0_0_0_3px_rgba(248,113,113,0.12)]' : ''}`}
        autoComplete={autoComplete}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-xs text-[#f87171] flex items-center gap-1" role="alert">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f87171] flex-shrink-0" />
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={helperId} className="text-xs text-[#7a748c]">
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
    <div className={`flex flex-col gap-1.5 w-full ${className} ${error ? 'border-[#f87171]' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-[#b8b0cc] uppercase tracking-wider">
          {label}
          {required && <span className="text-[#f87171] ml-1" aria-hidden="true">*</span>}
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
        className={`${inputBase} px-3.5 py-3 resize-y min-h-[100px] ${error ? 'border-[#f87171] focus:shadow-[0_0_0_3px_rgba(248,113,113,0.12)]' : ''}`}
        rows={rows}
        {...props}
      />
      {error && (
        <p id={errorId} className="text-xs text-[#f87171] flex items-center gap-1" role="alert">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f87171] flex-shrink-0" />
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={helperId} className="text-xs text-[#7a748c]">
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
    <div className={`flex flex-col gap-1.5 w-full ${className} ${error ? 'border-[#f87171]' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      {label && (
        <label htmlFor={selectId} className="text-xs font-medium text-[#b8b0cc] uppercase tracking-wider">
          {label}
          {required && <span className="text-[#f87171] ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
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
          className={`${inputBase} h-10 px-3.5 pr-10 appearance-none cursor-pointer ${error ? 'border-[#f87171]' : ''}`}
          {...props}
        >
          {placeholder && <option value="" disabled>{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <svg className="absolute right-3 w-[18px] h-[18px] text-[#7a748c] pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
      {error && (
        <p id={errorId} className="text-xs text-[#f87171] flex items-center gap-1" role="alert">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f87171] flex-shrink-0" />
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={helperId} className="text-xs text-[#7a748c]">
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
    <div className={`flex flex-col gap-1.5 w-full ${className} ${error ? 'border-[#f87171]' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      {label && (
        <label htmlFor={inputId} className="text-xs font-medium text-[#b8b0cc] uppercase tracking-wider">
          {label}
          {required && <span className="text-[#f87171] ml-1" aria-hidden="true">*</span>}
        </label>
      )}
      <div className="relative">
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
          className="absolute inset-0 opacity-0 cursor-pointer z-10"
          {...props}
        />
        <div className="flex flex-col items-center justify-center gap-1.5 p-6 border-2 border-dashed border-[#2d2840] rounded-[10px] bg-[#181524] text-[#b8b0cc] transition-all duration-150 ease min-h-[120px] text-center hover:border-[#c084fc] hover:bg-[rgba(192,132,252,0.12)] hover:text-[#c084fc]">
          <svg className="w-8 h-8 text-[#7a748c] transition-colors duration-150 ease hover:text-[#c084fc]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span className="text-sm font-medium">
            {value && value.length > 0
              ? `${value.length} file${value.length > 1 ? 's' : ''} selected`
              : 'Click or drag to upload'}
          </span>
          <span className="text-xs text-[#7a748c]">.txt, .md, .pdf</span>
        </div>
      </div>
      {error && (
        <p id={errorId} className="text-xs text-[#f87171] flex items-center gap-1" role="alert">
          <span className="w-1.5 h-1.5 rounded-full bg-[#f87171] flex-shrink-0" />
          {error}
        </p>
      )}
      {helperText && !error && (
        <p id={helperId} className="text-xs text-[#7a748c]">
          {helperText}
        </p>
      )}
    </div>
  );
}