'use client';

import { useState } from 'react';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { PillTab, PillTabList } from '@/components/base/tabs/pill-tab';
import { NOTEBOOK_HOSTS, noteHost } from '../../lib/notebook.mjs';
import { RiArrowUpLine, RiArrowDownLine, RiExternalLinkLine } from '@remixicon/react';

export default function NotebookManager({ notes, selected, onSelect, onRename, onMove, onDelete, onRestore, onPurge, onOpen }) {
  const [query, setQuery] = useState('');
  const [trash, setTrash] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const items = notes.filter(note => Boolean(note.deletedAt) === trash);
  const visible = items.filter(note => [note.name, note.sample, note.operator, note.composition, NOTEBOOK_HOSTS[noteHost(note)].formula].join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  return <div className="nb-manager">
    <PillTabList><PillTab isSelected={!trash} onSelect={() => setTrash(false)}>試料一覧 {notes.filter(n => !n.deletedAt).length}</PillTab><PillTab isSelected={trash} onSelect={() => setTrash(true)}>ごみ箱 {notes.filter(n => n.deletedAt).length}</PillTab></PillTabList>
    <Input label="試料を検索" placeholder="試料名・ID・実験者・組成" value={query} onChange={setQuery} />
    <p className="nb-hint">{visible.length}件{trash ? ' · 写真と記録を含めて復元できます。' : ' · 並び替えは上の試料タブにも反映されます。'}</p>
    <ul className="nb-overview" aria-label={trash ? 'ごみ箱の試料' : '試料一覧'}>
      {visible.map((note, index) => {
        const done = note.steps.filter(step => step.done).length;
        const next = note.steps.find(step => !step.done);
        const photos = note.steps.reduce((total, step) => total + step.photos.length, 0);
        return <li key={note.id} className="nb-overview-card" data-selected={!trash && selected === note.id ? '' : undefined}>
          <div className="nb-overview-top"><span className="nb-kicker">{NOTEBOOK_HOSTS[noteHost(note)].formula}</span><span className="nb-hint">{!trash && selected === note.id ? '表示中 · ' : ''}{done}/{note.steps.length}工程 · 写真{photos}枚</span></div>
          {editing?.id === note.id ? <form className="nb-rename" onSubmit={event => { event.preventDefault(); if (onRename(note.id, name.trim(), editing.name)) setEditing(null); }}><Input autoFocus label="新しい試料名" value={name} onChange={setName} maxLength={200} isRequired /><div className="nb-actions"><Button type="submit" className="nb-control-button" disabled={!name.trim()}>名前を保存</Button><Button variant="secondary" className="nb-control-button" onClick={() => setEditing(null)}>キャンセル</Button></div></form> : <h3>{note.name || '名称未設定'}</h3>}
          <p className="nb-overview-meta">{note.sample || 'ID未設定'} · {note.operator || '実験者未設定'}<br />開始：{note.start ? note.start.replace('T', ' ') : '未設定'}</p>
          {!trash && <><progress max={note.steps.length} value={done} aria-label={`${note.name}の進捗`} /><p className="nb-hint">{next ? `次：${next.day}日目 · ${next.title}` : 'すべての工程が完了'}</p></>}
          <div className="nb-actions">
            {trash ? <><Button className="nb-control-button" onClick={() => onRestore(note.id)}>復元する</Button><Button variant="danger" className="nb-control-button" onClick={() => onPurge(note.id)}>完全に削除</Button></> : <>
              <Button className="nb-control-button" onClick={() => onSelect(note.id)}>ノートを表示</Button>
              <Button variant="secondary" trailingIcon={RiExternalLinkLine} className="nb-control-button" onClick={() => onOpen(note.id)}>別ウィンドウ</Button>
              <Button variant="secondary" className="nb-control-button" onClick={() => { setEditing({ id: note.id, name: note.name }); setName(note.name); }}>名前を変更</Button>
              <Button variant="secondary" iconOnly leadingIcon={RiArrowUpLine} className="nb-control-button" aria-label={`${note.name}を上へ`} disabled={index === 0} onClick={() => onMove(note.id, visible[index - 1].id)} />
              <Button variant="secondary" iconOnly leadingIcon={RiArrowDownLine} className="nb-control-button" aria-label={`${note.name}を下へ`} disabled={index === visible.length - 1} onClick={() => onMove(note.id, visible[index + 1].id)} />
              <Button variant="danger" className="nb-control-button" onClick={() => onDelete(note.id)}>ごみ箱へ</Button>
            </>}
          </div>
        </li>;
      })}
    </ul>
    {!visible.length && <p className="nb-empty">{query ? '検索に一致する試料はありません。' : trash ? 'ごみ箱は空です。' : '新しい試料を追加してください。'}</p>}
  </div>;
}
