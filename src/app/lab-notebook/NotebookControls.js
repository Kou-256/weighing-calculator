'use client';

import { useId, useRef, useState } from 'react';
import { parseDate, parseTime, Time } from '@internationalized/date';
import { RiCloseLine } from '@remixicon/react';
import { Button } from '@/components/base/buttons/button';
import { DatePicker } from '@/components/base/date-picker/date-picker';
import { TimeField } from '@/components/base/time-field/time-field';
import { DirectionProvider } from '@/components/foundations/direction/direction';
import { TemplateCopyProvider } from '@/components/foundations/template-copy/template-copy';
import { cx } from '@/utils/cx';
import { NOTEBOOK_HOSTS } from '../../lib/notebook.mjs';

const COPY = { 'Select date': '日付を選択', 'Cancel': 'キャンセル', 'Apply': '適用', 'Date': '日付' };
const translate = text => COPY[text] || text;

export function NotebookProviders({ children }) {
  return <DirectionProvider locale="ja-JP"><TemplateCopyProvider translate={translate}>{children}</TemplateCopyProvider></DirectionProvider>;
}

// Adapt BoardUI's date and time controls to the notebook's existing local
// YYYY-MM-DDTHH:mm format, without changing persisted records or time zones.
export function NotebookDateTime({ label, value, onChange }) {
  const labelId = useId();
  const [draftTime, setDraftTime] = useState(new Time(9, 0));
  const date = value ? parseDate(value.slice(0, 10)) : null;
  const time = value ? parseTime(value.slice(11, 16)) : draftTime;
  const withTime = (day, clock) => `${day}T${clock.toString().slice(0, 5)}`;
  return <div className="nb-datetime" role="group" aria-labelledby={labelId}>
    <span id={labelId} className="text-body-medium text-text-primary">{label}</span>
    <div className="nb-datetime-controls">
      <DatePicker aria-label={`${label}の日付`} value={date} onChange={day => onChange(day ? withTime(day, time || new Time(9, 0)) : '')} className="nb-date-trigger" />
      <TimeField aria-label={`${label}の時刻`} value={time} hourCycle={24} granularity="minute" onChange={clock => { setDraftTime(clock); if (date && clock) onChange(withTime(date, clock)); }} className="nb-clock" />
      <Button variant="secondary" iconOnly leadingIcon={RiCloseLine} className="nb-control-button nb-clear-date" aria-label={`${label}をクリア`} disabled={!value} onClick={() => onChange('')} />
    </div>
    {!date && <span className="text-caption-1-regular text-text-secondary">日付を選ぶと時刻と合わせて設定されます。</span>}
  </div>;
}

// The registry upload example simulates progress. This adapter instead uses
// the actual multi-file selection and IndexedDB persistence from the notebook.
export function NotebookFilePicker({ children, accept, multiple = false, disabled, onChange, icon }) {
  const inputRef = useRef(null);
  return <span className="nb-file-picker">
    <Button variant="secondary" leadingIcon={icon} className="nb-control-button" disabled={disabled} onClick={() => inputRef.current?.click()}>{children}</Button>
    <input ref={inputRef} type="file" accept={accept} multiple={multiple} disabled={disabled} aria-label={typeof children === 'string' ? children : 'ファイルを選択'} hidden onChange={onChange} />
  </span>;
}

// Same sliding segmented control as the calculator's host material picker.
export function HostToggle({ value, onChange, disabled, label = '母体材料' }) {
  const keys = Object.keys(NOTEBOOK_HOSTS);
  return <div className={cx('compound-toggle', value === keys[1] && 'is-second-selected')} role="radiogroup" aria-label={label}>
    {keys.map(key => <button type="button" key={key} role="radio" aria-checked={value === key} className={value === key ? 'is-selected' : ''} disabled={disabled} onClick={() => onChange(key)}
      onKeyDown={event => {
        const prev = ['ArrowLeft', 'ArrowUp', 'Home'], next = ['ArrowRight', 'ArrowDown', 'End'];
        if (![...prev, ...next].includes(event.key)) return;
        event.preventDefault();
        const group = event.currentTarget.parentElement;
        onChange(prev.includes(event.key) ? keys[0] : keys[1]);
        requestAnimationFrame(() => group?.querySelector('[aria-checked="true"]')?.focus());
      }}>{NOTEBOOK_HOSTS[key].formula}</button>)}
  </div>;
}
