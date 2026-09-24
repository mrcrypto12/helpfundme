import React from 'react';

const COUNTRY_CODES = [
  ['GH', '+233'], ['NG', '+234'], ['CI', '+225'], ['TG', '+228'], ['BF', '+226'],
  ['KE', '+254'], ['ZA', '+27'], ['GB', '+44'], ['US/CA', '+1'], ['DE', '+49'], ['FR', '+33'],
] as const;

interface Props {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

const PhoneInput: React.FC<Props> = ({ value, onChange, disabled, placeholder = 'Phone number' }) => {
  const matched = COUNTRY_CODES.find(([, code]) => value.startsWith(code));
  const code = matched?.[1] || '+233';
  const local = matched ? value.slice(code.length) : value.replace(/^\+/, '');
  return <div className="phone-input-group">
    <select aria-label="Country calling code" className="form-input phone-code" value={code} disabled={disabled} onChange={(e) => onChange(`${e.target.value}${local.replace(/\D/g, '')}`)}>
      {COUNTRY_CODES.map(([country, dial]) => <option key={`${country}-${dial}`} value={dial}>{country} {dial}</option>)}
    </select>
    <input aria-label="Phone number" className="form-input" inputMode="tel" disabled={disabled} placeholder={placeholder} value={local} onChange={(e) => onChange(`${code}${e.target.value.replace(/\D/g, '')}`)} />
  </div>;
};
export default PhoneInput;
