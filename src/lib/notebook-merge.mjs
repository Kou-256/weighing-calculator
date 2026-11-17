const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const record = value => value && typeof value === 'object' && !Array.isArray(value);

// Three-way merge: unrelated changes survive; competing edits remain unsaved.
export function mergeNotebook(base, local, remote) {
  function merge(before, ours, theirs, path) {
    if (equal(ours, theirs)) return ours;
    if (equal(before, ours)) return theirs;
    if (equal(before, theirs)) return ours;
    if ([before, ours, theirs].every(Array.isArray) && [...before, ...ours, ...theirs].every(item => record(item) && typeof item.id === 'string')) {
      const maps = [before, ours, theirs].map(items => new Map(items.map(item => [item.id, item])));
      const common = before.filter(item => maps[1].has(item.id) && maps[2].has(item.id)).map(item => item.id);
      const order = items => items.map(item => item.id).filter(id => common.includes(id));
      const original = order(before), ourOrder = order(ours), theirOrder = order(theirs);
      if (!equal(original, ourOrder) && !equal(original, theirOrder) && !equal(ourOrder, theirOrder)) conflict(path);
      const primary = !equal(original, ourOrder) ? ours : theirs;
      const ids = [...new Set([...primary, ...ours, ...theirs].map(item => item.id))];
      return ids.map(id => merge(maps[0].get(id), maps[1].get(id), maps[2].get(id), `${path}/${id}`)).filter(Boolean);
    }
    if ([ours, theirs].every(record) && (before === undefined || record(before))) {
      // Deletion and editing in different windows must not resurrect a note.
      if (before && Boolean(ours.deletedAt) !== Boolean(theirs.deletedAt) && (ours.deletedAt || theirs.deletedAt)) conflict(path);
      const keys = new Set([...Object.keys(before || {}), ...Object.keys(ours), ...Object.keys(theirs)]);
      return Object.fromEntries([...keys].map(key => [key, merge(before?.[key], ours[key], theirs[key], `${path}/${key}`)]).filter(([, value]) => value !== undefined));
    }
    conflict(path);
  }
  function conflict(path) {
    throw new Error(`別ウィンドウと同じ項目が変更されました（${path}）。この画面のバックアップを書き出し、保存済み記録を読み直してください。`);
  }
  return merge(base, local, remote, '試料');
}
