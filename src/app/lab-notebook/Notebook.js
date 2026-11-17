'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { createNote, EQUIPMENT, localDateTime, NOTEBOOK_HOSTS, noteHost, schedule, validDateTime } from '../../lib/notebook.mjs';
import { exportNotebook, importNotebook, readNotebook, readPhoto, writeNotebook } from '../../lib/notebook-storage';
import { downloadFile } from '../../lib/stocks.mjs';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { Textarea } from '@/components/base/textarea/textarea';
import { NumberField } from '@/components/base/number-field/number-field';
import { Tab, TabList, TabPanel, Tabs } from '@/components/base/tabs/tabs';
import { PillTab, PillTabList } from '@/components/base/tabs/pill-tab';
import { RiAddLine, RiArrowDownSLine, RiBookOpenLine, RiCameraLine, RiCheckLine, RiDeleteBinLine, RiExternalLinkLine, RiPlayLine } from '@remixicon/react';
import { cx } from '@/utils/cx';
import { HostToggle, NotebookDateTime, NotebookFilePicker } from './NotebookControls';
import NotebookManager from './NotebookManager';
import StepVisual, { stepAction } from './StepVisual';

const INBOX_KEY = 'weighing_notebook_transfer_v1';
const DAYS = [1, 2, 3, 4, 5];
const VIEWS = [['samples', '試料一覧'], ['procedure', '作製手順'], ['conditions', '条件・秤量'], ['equipment', '装置メモ']];
const formatTime = value => validDateTime(value) ? new Intl.DateTimeFormat('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '日時未設定';
const formatRemaining = minutes => minutes >= 60 * 24 ? `約${Math.floor(minutes / 1440)}日${Math.round((minutes % 1440) / 60)}時間` : minutes >= 60 ? `約${Math.floor(minutes / 60)}時間${minutes % 60}分` : `約${minutes}分`;
const saveState = status => status === '端末内に保存済み' ? 'saved' : ['保存中…', '保存待ち…', '読み込み中…'].includes(status) ? 'saving' : 'error';

function Photo({ photo, pending, onCaption, onRemove }) {
  const [src, setSrc] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    let stopped = false, url;
    async function load() {
      try {
        const blob = pending.get(photo.id) || await readPhoto(photo.id);
        if (!blob) throw new Error('写真が見つかりません。');
        url = URL.createObjectURL(blob);
        if (!stopped) setSrc(url);
      } catch { if (!stopped) setError('写真を読み込めません。'); }
    }
    load();
    return () => { stopped = true; if (url) URL.revokeObjectURL(url); };
  }, [photo.id, pending]);
  return <figure className="nb-photo">
    {src ? <a href={src} target="_blank" rel="noreferrer" aria-label={`${photo.name}を原寸で開く`}><img src={src} alt={photo.caption || photo.name} onError={() => setError('この画像を表示できません。JPEG・PNG・WebP形式をお試しください。')} /></a> : <p className="nb-photo-loading">読み込み中…</p>}
    {error && <p className="error-message" role="alert">{error}</p>}
    <figcaption><span>{photo.name} · {(photo.size / 1024 / 1024).toFixed(2)} MB</span>
      <Input aria-label={`${photo.name}の説明`} placeholder="写真の説明・撮影条件" maxLength={20000} value={photo.caption} onChange={onCaption} />
      <Button variant="secondary" leadingIcon={RiDeleteBinLine} className="nb-control-button nb-danger-text" onClick={onRemove}>写真を削除</Button>
    </figcaption>
  </figure>;
}

function stepSummary(step, timing) {
  if (step.done) return `完了 ${step.actualEnd ? formatTime(step.actualEnd) : ''}`.trim();
  if (step.actualStart) return `実施中 · 開始 ${formatTime(step.actualStart)}`;
  return validDateTime(timing?.start) ? `開始の目安 ${formatTime(timing.start)}` : '開始日時は未設定';
}

function StepCard({ step, timing, pending, update, addPhotos, openEquipment, index, current, expanded, onToggle }) {
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const invalidOrder = step.actualStart && step.actualEnd && step.actualEnd < step.actualStart;
  const bodyId = `step-body-${step.id}`;
  const state = step.done ? 'done' : step.actualStart ? 'active' : current ? 'next' : 'todo';
  const stateLabel = { done: '完了', active: '実施中', next: '次の作業', todo: '未着手' }[state];
  const changeDate = (key, value) => {
    if (value && !validDateTime(value)) { setMessage('有効な日時を指定してください。'); return; }
    const start = key === 'actualStart' ? value : step.actualStart;
    const end = key === 'actualEnd' ? value : step.actualEnd;
    if (start && end && end < start) { setMessage('終了日時は開始日時以降を指定してください。'); return; }
    setMessage(''); update({ [key]: value });
  };
  const begin = () => {
    const now = localDateTime();
    if (step.actualEnd && now > step.actualEnd) { setMessage('終了日時より後には開始できません。日時を確認してください。'); return; }
    setMessage(''); update({ actualStart: now });
  };
  const finish = () => {
    const now = localDateTime();
    if (step.actualStart && now < step.actualStart) { setMessage('開始日時が未来です。終了日時を手動で指定してください。'); return; }
    setMessage(''); update({ done: true, actualEnd: now });
  };
  const upload = async e => {
    const files = [...(e.target.files || [])];
    e.target.value = '';
    if (!files.length) return;
    setUploading(true); setMessage('');
    try { await addPhotos(files); }
    catch (error) { setMessage(error.message); }
    finally { setUploading(false); }
  };
  const extras = [step.photos.length ? `写真${step.photos.length}枚` : '', step.memo ? 'メモあり' : ''].filter(Boolean).join(' · ');
  return <article id={`step-${step.id}`} tabIndex={-1} className="nb-step" data-state={state} data-expanded={expanded ? '' : undefined}>
    <button type="button" className="nb-step-toggle" aria-expanded={expanded} aria-controls={bodyId} onClick={onToggle}>
      <span className="nb-step-number" aria-hidden="true">{step.done ? <RiCheckLine /> : String(index + 1).padStart(2, '0')}</span>
      <span className="nb-step-heading">
        <span className="nb-step-meta"><span className="nb-state-chip" data-state={state}>{stateLabel}</span><span>工程 {index + 1}</span></span>
        <span className="nb-step-title">{step.title}</span>
        <span className="nb-step-summary">{stepSummary(step, timing)}{extras && ` · ${extras}`}</span>
      </span>
      <StepVisual step={step} compact />
      <RiArrowDownSLine className="nb-step-chevron" aria-hidden />
    </button>
    {expanded && <div id={bodyId} className="nb-step-body">
      <p className="nb-step-description">{step.text}</p>
      {step.check && <details className="nb-disclosure"><summary>条件の確認・原記録との違い</summary><p>{step.check}</p></details>}
      <dl className="nb-time-strip">
        <div><dt>開始の基準</dt><dd>{formatTime(timing.start)}</dd></div>
        <div><dt>次工程の予定</dt><dd>{timing.end ? formatTime(timing.end) : '所要時間を設定'}</dd></div>
      </dl>
      <div className="nb-step-primary">
        {step.done
          ? <Button variant="secondary" className="nb-control-button" onClick={() => update({ done: false })}>完了を解除</Button>
          : step.actualStart
            ? <Button leadingIcon={RiCheckLine} className="nb-control-button" disabled={Boolean(invalidOrder)} onClick={finish}>完了を記録</Button>
            : <><Button leadingIcon={RiPlayLine} className="nb-control-button" onClick={begin}>今から開始</Button><Button variant="secondary" leadingIcon={RiCheckLine} className="nb-control-button" disabled={Boolean(invalidOrder)} onClick={finish}>完了を記録</Button></>}
      </div>
      {message && <p className="error-message" role="alert">{message}</p>}
      <Textarea label="観察・実測・変更点" className="nb-note-field" rows={3} maxLength={20000} value={step.memo} onChange={memo => update({ memo })} placeholder="色、温度、添加量、気づいたこと…" />
      {!!step.photos.length && <div className="nb-photo-grid">{step.photos.map(photo => <Photo key={photo.id} photo={photo} pending={pending} onCaption={caption => update({ photos: step.photos.map(p => p.id === photo.id ? { ...p, caption } : p) })} onRemove={() => { if (window.confirm('この写真を削除しますか？')) update({ photos: step.photos.filter(p => p.id !== photo.id) }); }} />)}</div>}
      <div className="nb-actions">
        <NotebookFilePicker icon={RiCameraLine} accept="image/jpeg,image/png,image/webp" multiple disabled={uploading} onChange={upload}>{uploading ? '写真を準備中…' : '写真を追加'}</NotebookFilePicker>
        <Button variant="secondary" leadingIcon={RiBookOpenLine} className="nb-control-button" onClick={() => openEquipment(step.equipment)}>装置の使い方</Button>
      </div>
      <details className="nb-disclosure"><summary>予定・実際の日時を編集</summary>
        <div className="nb-fields"><NotebookDateTime label="予定開始（個別指定）" value={step.plannedStart} onChange={value => changeDate('plannedStart', value)} />
          <NumberField label="所要時間（分）" minValue={0} maxValue={525600} step={1} isWheelDisabled placeholder="未確定" value={step.minutes === '' ? NaN : Number(step.minutes)} onChange={value => update({ minutes: Number.isNaN(value) ? '' : value })} />
          <NotebookDateTime label="実際の開始" value={step.actualStart} onChange={value => changeDate('actualStart', value)} />
          <NotebookDateTime label="実際の終了" value={step.actualEnd} onChange={value => changeDate('actualEnd', value)} />
        </div><p className="nb-hint">実際の開始、個別の予定開始、前工程の終了の順に優先して計算します。実際の終了は次工程の基準になります。日をまたぐ待機は次の工程で日時を指定してください。</p>
      </details>
    </div>}
  </article>;
}

function Snapshot({ value }) {
  if (!value) return <p className="nb-hint">秤量計算ツールの計算結果で「このセットの実験ノートを作成」を押すと、計算値・実測値・添加方法を取り込めます。</p>;
  return <div className="nb-snapshot"><p>{value.compound} · {value.targetMol} mol · セット {value.setNumber}<br />取り込み：{formatTime(value.capturedAt)}</p>
    <p>組成：{Object.entries(value.concentrations || {}).map(([element, percent]) => `${element} ${percent}%`).join(' / ')}</p>
    <div className="nb-mass-list">{(value.materials || []).map(row => <div key={row.material} className="nb-mass-row"><strong>{row.material}</strong><span>理論秤量 {Number(row.calculated).toPrecision(7)} g</span><span>{row.method === 'ストック' ? `${row.stockName || 'ストック未指定'} / ${row.actualUl == null ? '分取未確定' : `${row.actualUl} µL`} · ${row.confirmedAt ? '同条件の添加履歴あり（今回の実施は要確認）' : '添加完了は未記録'}` : `実測 ${row.measured || '未入力'}${row.measured ? ' g' : ''} · ${row.weighed ? '秤量済み' : '未完了'}`}</span>{row.error && <span>{row.error}</span>}</div>)}</div>
    {value.liquidBudget && <p>添加液量上限 {value.liquidBudget.limitMl} mL · 追加硝酸（理論） {value.liquidBudget.unresolved ? '未確定' : `${value.liquidBudget.remainingMl} mL`}{value.liquidBudget.over ? '（上限超過）' : ''}</p>}
    <p className="nb-hint">取り込んだ時点の値を保存しています。計算ツールの後日の変更では上書きしません。</p>
  </div>;
}

export default function Notebook() {
  const [notes, setNotes] = useState([]);
  const [selected, setSelected] = useState('');
  const [draftHost, setDraftHost] = useState('yvo4');
  const [view, setView] = useState('procedure');
  const [day, setDay] = useState(1);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('読み込み中…');
  const [busy, setBusy] = useState(false);
  const [equipment, setEquipment] = useState('');
  const [now, setNow] = useState(Date.now());
  const [transfer, setTransfer] = useState(null);
  const [notice, setNotice] = useState('');
  const [popupUrl, setPopupUrl] = useState('');
  const [openSteps, setOpenSteps] = useState({});
  const baseline = useRef([]);
  const channel = useRef(null);
  const pending = useRef(new Map());
  const saveQueue = useRef(Promise.resolve());
  const revision = useRef(0);
  const dirty = useRef(false);
  const stateRef = useRef(notes);
  const shownNote = useRef('');
  stateRef.current = notes;

  useEffect(() => {
    let alive = true;
    readNotebook().then(data => {
      if (!alive) return;
      baseline.current = data.notes;
      const requested = new URL(window.location.href).searchParams.get('sample');
      const initial = requested ? data.notes.find(n => n.id === requested && !n.deletedAt) : data.notes.find(n => !n.deletedAt);
      setNotes(data.notes); setSelected(initial?.id || ''); setView(initial ? 'procedure' : 'samples'); setReady(true); setStatus('端末内に保存済み');
      if (requested && !initial) setNotice('指定された試料が見つからないか、ごみ箱にあります。一覧・ごみ箱を確認してください。');
      try {
        const inbox = sessionStorage.getItem(INBOX_KEY);
        if (inbox) { const parsed = JSON.parse(inbox); if (parsed?.schema === 1 && parsed.snapshot) setTransfer(parsed); }
      } catch { setError('秤量データを読み込めませんでした。計算結果から再度転記してください。'); }
    }).catch(e => { if (alive) { setError(`端末内の記録を読み込めません。再読み込みしてください。${e.message}`); setStatus('読み込み失敗・編集を停止'); } });
    const timer = setInterval(() => setNow(Date.now()), 30000);
    let refreshVersion = 0;
    const refresh = async () => {
      if (dirty.current) return;
      const version = ++refreshVersion;
      try {
        const data = await readNotebook();
        if (!alive || dirty.current || version !== refreshVersion) return;
        baseline.current = data.notes; setNotes(data.notes);
      } catch (e) { if (alive) setError(`別画面の更新を読み込めません。${e.message}`); }
    };
    if ('BroadcastChannel' in window) { channel.current = new BroadcastChannel('weighing-notebook-updates'); channel.current.onmessage = refresh; }
    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    const unload = event => { if (dirty.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', unload);
    return () => { alive = false; clearInterval(timer); channel.current?.close(); channel.current = null; window.removeEventListener('focus', refresh); window.removeEventListener('storage', refresh); window.removeEventListener('beforeunload', unload); };
  }, []);

  useEffect(() => {
    if (!ready || !dirty.current) return;
    const currentRevision = revision.current;
    const blobs = new Map(pending.current);
    setStatus('保存中…');
    const timer = setTimeout(() => {
      saveQueue.current = saveQueue.current.catch(() => {}).then(async () => {
        const saved = await writeNotebook(notes, blobs, baseline.current);
        for (const [id, blob] of blobs) if (pending.current.get(id) === blob) pending.current.delete(id);
        baseline.current = revision.current === currentRevision ? saved.notes : notes;
        if (revision.current === currentRevision) { dirty.current = false; setNotes(saved.notes); setStatus('端末内に保存済み'); setError(current => current.startsWith('保存できませんでした。') ? '' : current); }
        channel.current?.postMessage('saved');
        try { localStorage.setItem('weighing-notebook-updated', crypto.randomUUID()); } catch { /* IndexedDB remains the source of truth. */ }
      }).catch(e => { setStatus('未保存'); setError(`保存できませんでした。バックアップを書き出してください。${e.message}`); });
    }, 250);
    return () => clearTimeout(timer);
  }, [notes, ready]);

  const mutate = updater => {
    revision.current += 1; dirty.current = true; setStatus('保存待ち…');
    setNotes(updater);
  };
  const activeNotes = notes.filter(n => !n.deletedAt);
  const note = activeNotes.find(n => n.id === selected);
  useEffect(() => {
    if (!ready) return;
    const url = new URL(window.location.href);
    if (note) url.searchParams.set('sample', note.id); else url.searchParams.delete('sample');
    window.history.replaceState(null, '', url);
    if (selected && !note) { setSelected(''); setView('samples'); setNotice('この試料は削除されました。一覧・ごみ箱から確認できます。'); }
  }, [selected, note?.id, ready]);
  const selectedHost = note ? noteHost(note) : draftHost;
  const timings = note ? schedule(note) : [];
  const nextIndex = note?.steps.findIndex(s => !s.done) ?? -1;
  const nextStep = nextIndex >= 0 ? note.steps[nextIndex] : null;
  const nextTime = nextIndex >= 0 ? timings[nextIndex] : null;
  const followingStep = nextIndex >= 0 ? note.steps.slice(nextIndex + 1).find(step => !step.done) : null;
  const doneCount = note ? note.steps.filter(s => s.done).length : 0;

  // Opening a sample lands on the day of its next unfinished step.
  useEffect(() => {
    if (!note || shownNote.current === note.id) return;
    shownNote.current = note.id;
    setDay(note.steps.find(s => !s.done)?.day || 1);
  }, [note?.id]);

  const stepKey = step => `${note?.id}:${step.id}`;
  const isOpen = (step, index) => openSteps[stepKey(step)] ?? index === nextIndex;
  const showCurrentStep = () => {
    if (!nextStep) return;
    setDay(nextStep.day);
    setOpenSteps(old => ({ ...old, [stepKey(nextStep)]: true }));
    requestAnimationFrame(() => {
      const element = document.getElementById(`step-${nextStep.id}`);
      element?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
      element?.focus({ preventScroll: true });
    });
  };
  const photoCount = notes.reduce((sum, n) => sum + n.steps.reduce((v, s) => v + s.photos.length, 0), 0);
  const photoBytes = notes.reduce((sum, n) => sum + n.steps.reduce((v, s) => v + s.photos.reduce((b, p) => b + p.size, 0), 0), 0);
  const updateNote = patch => mutate(old => old.map(n => n.id === selected ? { ...n, ...patch } : n));
  const updateStep = (id, patch) => mutate(old => old.map(n => n.id === selected ? { ...n, steps: n.steps.map(s => s.id === id ? { ...s, ...patch } : s) } : n));
  const addNote = (snapshot, host = selectedHost) => {
    if (notes.length >= 500) { setError('試料は500件までです。バックアップして整理してください。'); return; }
    const name = snapshot ? `${snapshot.compound} セット${snapshot.setNumber}` : `試料 ${notes.length + 1}`;
    const created = createNote(name, snapshot, localDateTime(), host);
    mutate(old => [...old, created]); setSelected(created.id); setPopupUrl(''); setView('conditions');
    if (snapshot) { sessionStorage.removeItem(INBOX_KEY); setTransfer(null); }
  };
  const addPhotos = async (stepId, files) => {
    const noteId = selected;
    const target = stateRef.current.find(n => n.id === noteId)?.steps.find(s => s.id === stepId);
    if (!target) throw new Error('試料が見つかりません。');
    if (target.photos.length + files.length > 100) throw new Error('写真は1工程100枚までです。');
    for (const file of files) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('JPEG・PNG・WebP形式の写真を選んでください。HEICはJPEG等へ変換してください。');
      if (file.size <= 0 || file.size > 20 * 1024 * 1024) throw new Error('写真は1枚20 MB以下にしてください。');
    }
    const entries = files.map(file => ({ id: crypto.randomUUID(), name: file.name.slice(0, 500), caption: '', size: file.size, type: file.type }));
    entries.forEach((p, i) => pending.current.set(p.id, files[i]));
    mutate(old => old.map(n => n.id === noteId ? { ...n, steps: n.steps.map(s => s.id === stepId ? { ...s, photos: [...s.photos, ...entries] } : s) } : n));
  };
  const openEquipment = id => { setEquipment(id); setView('equipment'); };

  useEffect(() => {
    if (view === 'equipment' && equipment) document.getElementById(`equipment-${equipment}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [view, equipment]);

  const backup = async (onlySelected = false) => {
    setBusy(true); setError(current => current.startsWith('保存できませんでした。') ? current : '');
    try {
      await saveQueue.current.catch(() => {});
      const content = await exportNotebook(onlySelected ? stateRef.current.filter(n => n.id === selected) : stateRef.current, pending.current);
      if (new Blob([content]).size > 250 * 1024 * 1024) throw new Error('バックアップが250 MBを超えます。試料別に書き出すか写真を整理してください。');
      downloadFile(`${onlySelected ? NOTEBOOK_HOSTS[selectedHost].filePrefix : '蛍光体'}実験ノート_${localDateTime().slice(0, 10)}.json`, content, 'application/json');
    } catch (e) { setError(current => current.startsWith('保存できませんでした。') ? `${current} 書き出しエラー：${e.message}` : e.message); }
    finally { setBusy(false); }
  };
  const restore = async e => {
    const file = e.target.files?.[0]; e.target.value = '';
    if (!file) return;
    setBusy(true); setError('');
    try {
      if (file.size > 250 * 1024 * 1024) throw new Error('バックアップは250 MB以下にしてください。');
      const restored = await importNotebook(await file.text());
      if (stateRef.current.length + restored.notes.length > 500) throw new Error('復元後の試料数が500件を超えます。');
      for (const [id, blob] of restored.photos) pending.current.set(id, blob);
      mutate(old => [...old, ...restored.notes]);
      if (restored.notes.length) setSelected(restored.notes[0].id);
      setNotice(`${restored.notes.length}件の試料を復元しました。`);
    } catch (e) { setError(`復元できませんでした。${e.message}`); }
    finally { setBusy(false); }
  };
  const retrySave = () => { if (ready) mutate(old => [...old]); else window.location.reload(); };
  const selectNote = id => { setSelected(id); setPopupUrl(''); };
  const removeNote = id => {
    const target = stateRef.current.find(n => n.id === id);
    if (!target || !window.confirm(`「${target.name}」をごみ箱へ移動しますか？写真・記録は復元できます。`)) return;
    mutate(old => old.map(n => n.id === id ? { ...n, deletedAt: new Date().toISOString() } : n));
    setNotice(`「${target.name}」をごみ箱へ移動しました。試料一覧のごみ箱から復元できます。`);
  };
  const openWindow = id => {
    const url = new URL(window.location.href); url.searchParams.set('sample', id);
    const popup = window.open(url.href, '_blank', 'popup,width=960,height=900');
    if (popup) { popup.opener = null; popup.focus(); setPopupUrl(''); }
    else { setPopupUrl(url.href); setNotice('別ウィンドウを開けませんでした。下のリンクから開けます。'); }
  };
  const renameNote = (id, name, expected) => {
    if (!name) return false;
    if (stateRef.current.find(n => n.id === id)?.name !== expected) { setNotice('試料名が別画面で変更されています。もう一度「名前を変更」を選んでください。'); return false; }
    mutate(old => old.map(n => n.id === id ? { ...n, name } : n)); return true;
  };
  const moveNote = (id, neighbor) => mutate(old => {
    const result = [...old], from = result.findIndex(n => n.id === id), to = result.findIndex(n => n.id === neighbor);
    if (from >= 0 && to >= 0) [result[from], result[to]] = [result[to], result[from]];
    return result;
  });
  const changeHost = key => { setDraftHost(key); if (note && !note.snapshot) updateNote({ host: key }); };
  const minutesLeft = nextTime?.end ? Math.ceil((new Date(nextTime.end).getTime() - now) / 60000) : null;
  const saving = saveState(status);

  return <main className="calculator-page nb-page"><div className="app-shell">
    <header className="page-header">
      <Link className="page-brand" href="/" aria-label="秤量計算ツールのトップへ">
        <Image className="page-brand-icon" src="/yvo4_gdvo4_weighing_icon.svg" width="48" height="48" alt="" priority unoptimized />
        <span className="page-brand-copy"><strong>Lab Notebook</strong><small>YVO₄ / GdVO₄</small></span>
      </Link>
      <Link className="secondary-button page-notebook-link" href="/yvo4-gdvo4">秤量計算ツール</Link>
    </header>

    <section className="app-header" aria-labelledby="notebook-title">
      <div className="nb-header-top"><p className="eyebrow">LAB NOTEBOOK</p><span className="nb-save-chip" data-state={saving} role="status">{status}</span></div>
      <div><h1 id="notebook-title">実験ノート</h1>
        <p>試料ごとに作製手順・予定時刻・写真・観察記録をまとめて管理できます。</p></div>
      {note ? <div className="nb-current-card">
        <div className="nb-current-top"><span>表示中の試料</span><span>{NOTEBOOK_HOSTS[selectedHost].formula}{note.sample ? ` · ${note.sample}` : ''}</span></div>
        <strong>{note.name || '名称未設定'}</strong>
        <div className="nb-progress" role="img" aria-label={`進捗 ${doneCount} / ${note.steps.length}工程`}><span style={{ inlineSize: `${(doneCount / note.steps.length) * 100}%` }} /></div>
        <p className="nb-current-next">{doneCount} / {note.steps.length}工程完了{nextStep ? ` · 次：${nextStep.day}日目 ${nextStep.title}` : ' · すべて完了'}</p>
        {activeNotes.length > 1 && <nav className="nb-sample-tabs" aria-label="試料の切り替え"><PillTabList>{activeNotes.map(n => <PillTab key={n.id} isSelected={selected === n.id} className="nb-sample-tab" onSelect={() => selectNote(n.id)}>{n.name || '名称未設定'}<small>{n.steps.filter(s => s.done).length}/{n.steps.length}</small></PillTab>)}</PillTabList></nav>}
        <div className="nb-current-actions">
          <Button variant="secondary" leadingIcon={RiAddLine} className="nb-control-button" disabled={!ready} onClick={() => addNote(null)}>新しい試料</Button>
          <Button variant="secondary" trailingIcon={RiExternalLinkLine} className="nb-control-button" onClick={() => openWindow(note.id)}>別ウィンドウ</Button>
        </div>
      </div> : ready && <div className="nb-current-card">
        <span>表示中の試料</span><strong>{activeNotes.length ? '試料を選んでください' : 'まだ試料がありません'}</strong>
        <p className="nb-current-next">{activeNotes.length ? '試料一覧から開くノートを選びます。' : '新しい試料には5日分・20工程の手順が入ります。'}</p>
      </div>}
    </section>

    {error && <div className="error-message nb-message" role="alert"><p>{error}</p><div className="nb-actions"><Button variant="secondary" className="nb-control-button" onClick={retrySave}>保存を再試行 / 再読み込み</Button>{error.startsWith('保存できませんでした。') && <Button variant="secondary" className="nb-control-button" onClick={() => { if (window.confirm('未保存の変更は失われます。必要なら先に写真付きバックアップを書き出してください。保存済み記録を読み直しますか？')) { dirty.current = false; window.location.reload(); } }}>保存済み記録を読み直す</Button>}</div></div>}
    {notice && <div className="nb-notice" role="status"><p>{notice}</p>{popupUrl && <a href={popupUrl} target="_blank" rel="noopener noreferrer">別タブでノートを開く</a>}<Button variant="secondary" className="nb-control-button" onClick={() => { setNotice(''); setPopupUrl(''); }}>閉じる</Button></div>}
    {transfer && <section className="section-block nb-transfer"><p className="eyebrow">FROM WEIGHING CALCULATOR</p><h2>秤量計算のセット{transfer.snapshot.setNumber}を受け取りました</h2><p>{transfer.snapshot.compound} · {transfer.snapshot.targetMol} mol。計算値・実測値・ストックの設定を、新しい試料として保存します。</p><div className="nb-actions"><Button className="nb-control-button" leadingIcon={RiAddLine} disabled={!ready} onClick={() => addNote(transfer.snapshot)}>この条件で試料を作成</Button><Button variant="secondary" className="nb-control-button" onClick={() => { sessionStorage.removeItem(INBOX_KEY); setTransfer(null); }}>取り込まない</Button></div></section>}

    <Tabs selectedKey={view} onSelectionChange={key => setView(String(key))} className="nb-views">
      <TabList aria-label="実験ノートの画面" variant="segmented" className="nb-view-tabs">{VIEWS.map(([id, label]) => <Tab key={id} id={id}>{label}</Tab>)}</TabList>

      <TabPanel id="samples">
        <NotebookManager notes={notes} selected={selected} ready={ready} host={draftHost} onHost={setDraftHost} onCreate={host => addNote(null, host)} onSelect={id => { selectNote(id); setView('procedure'); }} onRename={renameNote} onMove={moveNote} onDelete={removeNote} onRestore={id => { mutate(old => old.map(n => n.id === id ? { ...n, deletedAt: undefined } : n)); setNotice('試料を復元しました。試料一覧から開けます。'); }} onPurge={id => { const target = notes.find(n => n.id === id); if (window.confirm(`「${target?.name}」と写真・記録を完全に削除しますか？この操作は取り消せません。`)) mutate(old => old.filter(n => n.id !== id)); }} onOpen={openWindow} />
        <section className="section-block nb-backup" aria-labelledby="backup-title">
          <div className="section-heading"><div><h2 id="backup-title">記録のバックアップ</h2><p>写真の原本と試料の記録をJSONで保存します。ブラウザのデータ削除や端末変更に備え、定期的に書き出してください。</p></div></div>
          <dl className="nb-storage"><div><dt>保存先</dt><dd>この端末・このブラウザ</dd></div><div><dt>写真</dt><dd>{photoCount}枚 · {(photoBytes / 1024 / 1024).toFixed(1)} MB</dd></div></dl>
          <div className="nb-actions"><Button leadingIcon={RiCameraLine} className="nb-control-button" disabled={!ready || busy} onClick={() => backup()}>{busy ? '処理中…' : '写真付きで全体を書き出す'}</Button>{note && <Button variant="secondary" className="nb-control-button" disabled={!ready || busy} onClick={() => backup(true)}>表示中の試料だけ書き出す</Button>}<NotebookFilePicker accept="application/json,.json" disabled={!ready || busy} onChange={restore}>バックアップから追加復元</NotebookFilePicker></div>
          <p className="nb-hint">復元は既存ノートを残して追加します。Google Driveへの自動保存・端末間同期は未接続のため、書き出したファイルは学校のDrive等に保管してください。写真はJPEG・PNG・WebP、1枚20 MBまで。バックアップは1ファイル250 MBまで。保存容量の上限は端末・ブラウザによって異なります。</p>
        </section>
      </TabPanel>

      <TabPanel id="procedure">{note ? <>
        <section className="section-block nb-next" aria-labelledby="next-title">
          <p className="eyebrow">{nextStep ? 'NEXT STEP' : 'COMPLETED'}</p>
          <div className="nb-next-visual" key={`${note.id}-${nextIndex}`}>
            {nextStep && <StepVisual step={nextStep} />}
            <div className="nb-next-copy"><h2 id="next-title">{nextStep ? stepAction(nextStep) : 'すべての工程を完了しました'}</h2><p className="nb-next-position">{nextStep ? `${nextStep.day}日目 · 工程 ${nextIndex + 1} / ${note.steps.length}` : `${note.steps.length}工程の記録が完了`}</p></div>
          </div>
          {nextTime && <dl className="nb-time-strip">
            <div><dt>開始</dt><dd>{formatTime(nextTime.start)}</dd></div>
            <div><dt>次工程へ進む目安</dt><dd>{nextTime.end ? formatTime(nextTime.end) : '所要時間が未確定'}</dd></div>
            {minutesLeft !== null && <div className="nb-time-wide" data-late={minutesLeft < 0 ? '' : undefined}><dt>残り</dt><dd>{minutesLeft < 0 ? '予定時刻を過ぎています。実際の進捗を記録してください。' : formatRemaining(minutesLeft)}</dd></div>}
          </dl>}
          {nextStep && <Button className="nb-control-button nb-wide-button" onClick={showCurrentStep}>この工程を開く</Button>}
          {followingStep && <div className="nb-following"><StepVisual step={followingStep} compact /><div><span>この作業のあと</span><p>{followingStep.day}日目 · {followingStep.title}</p></div></div>}
          <p className="nb-hint">時刻は目安です。工程を自動で完了にはしません。画面を閉じている間の通知はありません。</p>
        </section>
        <nav className="nb-day-tabs" aria-label="作製日程"><PillTabList>{DAYS.map(d => {
          const steps = note.steps.filter(s => s.day === d), done = steps.filter(s => s.done).length;
          return <PillTab key={d} isSelected={day === d} className="nb-day-tab" onSelect={() => setDay(d)}>{d}日目<small data-complete={steps.length && done === steps.length ? '' : undefined}>{done}/{steps.length}</small></PillTab>;
        })}</PillTabList></nav>
        <div className="nb-step-list" key={`${note.id}-${day}`}>{note.steps.map((step, index) => step.day === day ? <StepCard key={`${note.id}-${step.id}`} step={step} timing={timings[index]} index={index} current={index === nextIndex} expanded={isOpen(step, index)} onToggle={() => setOpenSteps(old => ({ ...old, [stepKey(step)]: !isOpen(step, index) }))} pending={pending.current} update={patch => updateStep(step.id, patch)} addPhotos={files => addPhotos(step.id, files)} openEquipment={openEquipment} /> : null)}</div>
      </> : <NoSample onList={() => setView('samples')} onCreate={() => addNote(null)} ready={ready} />}</TabPanel>

      <TabPanel id="conditions">{note ? <div key={note.id} className="nb-sample-content">
        <section className="section-block">
          <div className="section-heading"><div><h2>試料の情報</h2><p>名前・ID・実験者・開始日時を記録します。</p></div></div>
          <div className="setting-field nb-host-field"><span className="setting-label">母体材料</span><HostToggle value={selectedHost} onChange={changeHost} disabled={!ready || Boolean(note.snapshot)} />{note.snapshot && <span className="setting-help">取り込んだ秤量条件に合わせて固定しています。</span>}</div>
          <div className="nb-fields"><Input label="試料名" value={note.name} maxLength={20000} onChange={name => updateNote({ name })} /><Input label="試料ID" value={note.sample} maxLength={20000} placeholder="例：YVO4-001" onChange={sample => updateNote({ sample })} />
            <NotebookDateTime label="作製開始日時" value={note.start} onChange={start => updateNote({ start })} /><Input label="実験者" value={note.operator} maxLength={20000} onChange={operator => updateNote({ operator })} /></div>
          <p className="nb-hint">日時はこの端末のタイムゾーンで表示します（{formatTime(note.start)}）。</p>
          <Input label="組成・添加濃度" className="nb-note-field" value={note.composition} maxLength={20000} placeholder="元素・mol%の定義も記録（5%等の対象は原文で未指定）" onChange={composition => updateNote({ composition })} />
          <Textarea label="実験全体のメモ" className="nb-note-field" rows={4} value={note.memo} maxLength={20000} placeholder="硝酸の製品・濃度、原料ロット、保管場所、手順変更など" onChange={memo => updateNote({ memo })} />
        </section>
        <section className="section-block">
          <div className="section-heading"><div><h2>秤量計算から引き継いだ記録</h2></div><Link className="text-button nb-link" href="/yvo4-gdvo4">秤量計算を開く</Link></div>
          <Snapshot value={note.snapshot} />
          <p className="nb-caution">本文中の添加量はご提供の原記録の値です。秤量計算の合成モル数に連動した自動換算はしていません。特に純水・硝酸・クエン酸・プロピレングリコールの量は、今回の条件と照合してください。</p>
          <details className="nb-disclosure"><summary>原記録の日付・条件を確認する</summary><p>タイトル：多目的ベイズ最適化 1回目。原文の日付は2025/07/25(土)、2025/07/26(日)、2026/07/27(月)、2025/07/28(火)、2026/07/29(水)。年・曜日が混在しているため、自動採用していません。新しい実験の開始日時をカレンダーから指定してください。</p><p>「1〜5日目」は原記録の区分です。日付を自動で1日ずつ進めるものではありません。時間が未記載の工程は空欄にしています。</p><p>マニュアル版：{note.protocolVersion}。各ノートには作成時点の手順を保存します。</p></details>
        </section>
        <section className="section-block nb-danger-zone"><div><h2>この試料を削除</h2><p>ごみ箱へ移動します。写真・記録は試料一覧のごみ箱から復元できます。</p></div><Button variant="secondary" leadingIcon={RiDeleteBinLine} className="nb-control-button nb-danger-text" onClick={() => removeNote(note.id)}>ごみ箱へ移動</Button></section>
      </div> : <NoSample onList={() => setView('samples')} onCreate={() => addNote(null)} ready={ready} />}</TabPanel>

      <TabPanel id="equipment"><section className="section-block nb-equipment" aria-labelledby="equipment-title">
        <div className="section-heading"><div><h2 id="equipment-title">装置の使い方</h2><p>ご提供の記録を整理した操作メモです。装置の型番・現状と照合して使用してください。</p></div></div>
        <nav className="nb-chip-row" aria-label="装置へ移動">{EQUIPMENT.map(item => <button type="button" key={item.id} className="nb-chip" aria-current={item.id === equipment ? 'true' : undefined} onClick={() => { setEquipment(item.id); document.getElementById(`equipment-${item.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>{item.title}</button>)}</nav>
        {EQUIPMENT.map(item => <article key={item.id} id={`equipment-${item.id}`} className={cx('nb-equipment-item', item.id === equipment && 'nb-highlight')}><h3>{item.title}</h3><ol>{item.text.map((text, i) => <li key={i}>{text}</li>)}</ol>{item.source && <a className="text-button nb-link" href={item.source[1]} target="_blank" rel="noreferrer">{item.source[0]}</a>}</article>)}
      </section></TabPanel>
    </Tabs>

    <footer>
      <a href="https://github.com/Kou-256/weighing-calculator" target="_blank" rel="noreferrer">GitHub <span aria-hidden="true">↗</span></a>
      <span>Created by Kou Hashizume</span>
    </footer>
  </div></main>;
}

function NoSample({ onList, onCreate, ready }) {
  return <section className="section-block nb-empty"><h2>試料が選ばれていません</h2><p>試料一覧から開くか、新しい試料を作成してください。新しい試料には5日分・20工程の手順が入ります。</p><div className="nb-actions"><Button leadingIcon={RiAddLine} className="nb-control-button" disabled={!ready} onClick={onCreate}>新しい試料を作成</Button><Button variant="secondary" className="nb-control-button" onClick={onList}>試料一覧を開く</Button></div></section>;
}
