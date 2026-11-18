import Notebook from './Notebook';
import { NotebookProviders } from './NotebookControls';
import './notebook.css';

export const metadata = {
  title: 'YVO₄ / GdVO₄ 実験ノート・作製マニュアル',
  description: '試料ごとの作製手順、予定時刻、写真と観察記録。',
};

export default function NotebookPage() {
  return <NotebookProviders><Notebook /></NotebookProviders>;
}
