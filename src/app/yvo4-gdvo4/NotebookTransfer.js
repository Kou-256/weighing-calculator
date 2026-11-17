'use client';

import { useState } from 'react';
import { localDateTime } from '../../lib/notebook.mjs';

export default function NotebookTransfer({ snapshot }) {
  const [error, setError] = useState('');
  return <div style={{ margin: '16px 0 4px' }}>
    <button type="button" className="secondary-button" onClick={() => {
      try {
        sessionStorage.setItem('weighing_notebook_transfer_v1', JSON.stringify({ schema: 1, snapshot: { ...snapshot, capturedAt: localDateTime() } }));
        window.location.assign('/lab-notebook');
      } catch { setError('秤量データを転記できませんでした。ブラウザの保存設定を確認してください。'); }
    }}>このセットの実験ノートを作成 →</button>
    {error && <p className="error-message" role="alert">{error}</p>}
  </div>;
}
