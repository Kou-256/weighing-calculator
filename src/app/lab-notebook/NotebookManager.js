'use client';

import { useState } from 'react';
import { Button } from '@/components/base/buttons/button';
import { Input } from '@/components/base/input/input';
import { PillTab, PillTabList } from '@/components/base/tabs/pill-tab';
import { NOTEBOOK_HOSTS, noteHost } from '../../lib/notebook.mjs';
import { RiAddLine, RiArrowDownLine, RiArrowUpLine, RiDeleteBinLine, RiEditLine, RiExternalLinkLine, RiSearchLine } from '@remixicon/react';
import { HostToggle } from './NotebookControls';

export default function NotebookManager({ notes, selected, ready, host, onHost, onCreate, onSelect, onRename, onMove, onDelete, onRestore, onPurge, onOpen }) {
  const [query, setQuery] = useState('');
  const [trash, setTrash] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const activeCount = notes.filter(n => !n.deletedAt).length;
  const trashCount = notes.length - activeCount;
  const items = notes.filter(note => Boolean(note.deletedAt) === trash);
  const visible = items.filter(note => [note.name, note.sample, note.operator, note.composition, NOTEBOOK_HOSTS[noteHost(note)].formula].join(' ').toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const searching = Boolean(query.trim());
  return <div className="nb-manager">
    {!trash && <section className="section-block nb-create" aria-labelledby="create-title">
      <div className="section-heading"><div><h2 id="create-title">新しい試料</h2><p>母体材料を選んで作成します。5日分・20工程の手順が入ります。秤量計算の各セットから条件を引き継ぐこともできます。</p></div></div>
      <div className="nb-create-row"><HostToggle value={host} onChange={onHost} disabled={!ready} label="新しい試料の母体材料" /><Button leadingIcon={RiAddLine} className="nb-control-button" disabled={!ready} onClick={() => onCreate(host)}>試料を作成</Button></div>
    </section>}

    <section className="section-block" aria-labelledby="list-title">
      <div className="section-heading nb-list-heading"><h2 id="list-title">{trash ? 'ごみ箱' : '試料一覧'}</h2>
        <PillTabList className="nb-segment"><PillTab isSelected={!trash} onSelect={() => setTrash(false)}>一覧 {activeCount}</PillTab><PillTab isSelected={trash} onSelect={() => setTrash(true)}>ごみ箱 {trashCount}</PillTab></PillTabList>
      </div>
      {items.length > 1 && <Input aria-label="試料を検索" leadingIcon={RiSearchLine} className="nb-search" placeholder="試料名・ID・実験者・組成で検索" value={query} onChange={setQuery} />}
      <p className="nb-hint">{searching ? `${visible.length}件が一致` : `${items.length}件`}{trash ? ' · 写真と記録を含めて復元できます。' : searching ? ' · 検索中は並び替えできません。' : ''}</p>
      <ul className="nb-overview" aria-label={trash ? 'ごみ箱の試料' : '試料一覧'}>
        {visible.map((note, index) => {
          const done = note.steps.filter(step => step.done).length;
          const next = note.steps.find(step => !step.done);
          const photos = note.steps.reduce((total, step) => total + step.photos.length, 0);
          const current = !trash && selected === note.id;
          return <li key={note.id} className="nb-overview-card" data-selected={current ? '' : undefined}>
            <div className="nb-overview-top"><span className="nb-host-chip">{NOTEBOOK_HOSTS[noteHost(note)].formula}</span>{current && <span className="nb-state-chip" data-state="next">表示中</span>}<span className="nb-overview-count">{done}/{note.steps.length}工程 · 写真{photos}枚</span></div>
            {editing?.id === note.id
              ? <form className="nb-rename" onSubmit={event => { event.preventDefault(); if (onRename(note.id, name.trim(), editing.name)) setEditing(null); }}><Input autoFocus label="新しい試料名" value={name} onChange={setName} maxLength={200} isRequired /><div className="nb-actions"><Button type="submit" className="nb-control-button" disabled={!name.trim()}>保存</Button><Button variant="secondary" className="nb-control-button" onClick={() => setEditing(null)}>キャンセル</Button></div></form>
              : <h3>{note.name || '名称未設定'}</h3>}
            <p className="nb-overview-meta">{note.sample || 'ID未設定'} · {note.operator || '実験者未設定'} · 開始 {note.start ? note.start.replace('T', ' ') : '未設定'}</p>
            {!trash && <><div className="nb-progress" role="img" aria-label={`${note.name}の進捗 ${done} / ${note.steps.length}工程`}><span style={{ inlineSize: `${(done / note.steps.length) * 100}%` }} /></div><p className="nb-overview-next">{next ? `次：${next.day}日目 · ${next.title}` : 'すべての工程が完了'}</p></>}
            <div className="nb-card-actions">
              {trash ? <><Button className="nb-control-button" onClick={() => onRestore(note.id)}>復元する</Button><Button variant="secondary" leadingIcon={RiDeleteBinLine} className="nb-control-button nb-danger-text" onClick={() => onPurge(note.id)}>完全に削除</Button></> : <>
                <Button className="nb-control-button" onClick={() => onSelect(note.id)}>{current ? '手順を見る' : 'ノートを開く'}</Button>
                <Button variant="secondary" trailingIcon={RiExternalLinkLine} className="nb-control-button" onClick={() => onOpen(note.id)}>別ウィンドウ</Button>
                <span className="nb-card-tools">
                  <Button variant="secondary" iconOnly leadingIcon={RiEditLine} className="nb-control-button" aria-label={`${note.name}の名前を変更`} title="名前を変更" onClick={() => { setEditing({ id: note.id, name: note.name }); setName(note.name); }} />
                  {!searching && <><Button variant="secondary" iconOnly leadingIcon={RiArrowUpLine} className="nb-control-button" aria-label={`${note.name}を上へ`} title="上へ" disabled={index === 0} onClick={() => onMove(note.id, visible[index - 1].id)} />
                  <Button variant="secondary" iconOnly leadingIcon={RiArrowDownLine} className="nb-control-button" aria-label={`${note.name}を下へ`} title="下へ" disabled={index === visible.length - 1} onClick={() => onMove(note.id, visible[index + 1].id)} /></>}
                  <Button variant="secondary" iconOnly leadingIcon={RiDeleteBinLine} className="nb-control-button nb-danger-text" aria-label={`${note.name}をごみ箱へ`} title="ごみ箱へ" onClick={() => onDelete(note.id)} />
                </span>
              </>}
            </div>
          </li>;
        })}
      </ul>
      {!visible.length && <p className="nb-empty-line">{searching ? '検索に一致する試料はありません。' : trash ? 'ごみ箱は空です。' : 'まだ試料がありません。上の「試料を作成」から始めましょう。'}</p>}
    </section>
  </div>;
}
