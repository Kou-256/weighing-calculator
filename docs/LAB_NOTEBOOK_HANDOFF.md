# 実験ノート：AIエージェント向け引き継ぎ

このファイルと同梱ソースは、2026-11-17時点の実験ノートを他のAIエージェントが読み込み、編集・検証できるようにしたものです。ZIPは現在の作業フォルダのスナップショットです。Gitに未コミットの実装も含むため、GitHub上のコードと一致するとは限りません。

## 最初に読むファイル

1. `AGENTS.md`：BoardUIのコンポーネント、色、文字、フォームに関するプロジェクト規則。
2. `src/app/lab-notebook/Notebook.js`：実験ノート本体。試料選択、各工程、予定、写真、保存、バックアップを接続。
3. `src/lib/notebook.mjs`：20工程・5日分の手順、装置マニュアル、ノート作成、予定時刻計算、保存形式の検証。
4. `src/lib/notebook-storage.js` と `src/lib/notebook-merge.mjs`：IndexedDBと複数画面の保存・競合処理。

## ソースの構成

| ファイル／ディレクトリ | 役割 |
| --- | --- |
| `src/app/lab-notebook/page.js` | `/lab-notebook` の入口とメタデータ、プロバイダー |
| `src/app/lab-notebook/Notebook.js` | 画面本体、工程カード、写真、試料データ、保存状態 |
| `src/app/lab-notebook/NotebookManager.js` | 試料一覧、検索、名前変更、並び替え、ごみ箱、復元、別ウィンドウ |
| `src/app/lab-notebook/NotebookControls.js` | 日本語カレンダー、24時間時刻入力、ファイル選択、BoardUIプロバイダー |
| `src/app/lab-notebook/StepVisual.js` | 器具・作業のSVG図と各工程の短い行動案内 |
| `src/app/lab-notebook/notebook.css` | 実験ノートの配置、各状態、レスポンシブ表示、切り替えアニメーション |
| `src/lib/notebook.mjs` | 原記録を整理した手順・装置メモ、日付検証、予定計算、スキーマ検証 |
| `src/lib/notebook-storage.js` | 写真とノートの保存、写真付きJSONバックアップと追加復元 |
| `src/lib/notebook-merge.mjs` | 保存時の3方向マージ、同一項目の競合検出 |
| `src/app/yvo4-gdvo4/NotebookTransfer.js` | 秤量計算の条件をノートに引き継ぐ入口 |
| `src/app/yvo4-gdvo4/` | 秤量計算ツールと関連画面 |
| `src/components/` | ソースとしてインストール済みのBoardUIコンポーネント |
| `src/styles/` | BoardUIの共通スタイル、文字、色のトークン |
| `src/styles/notebook-theme.css` | 共通テーマと実験ノートだけの緑色のスコープ |
| `src/app/globals.css`、`src/app/layout.js` | アプリ全体のスタイル、フォント、レイアウト |
| `src/utils/` | `cx()`などの共有ユーティリティ |
| `tests/` | 予定計算、保存形式、マージ、秤量計算などのテスト |

ZIPには依存先を含むアプリ全体のソース・公開アセット・設定を収録しています。実験ノートのファイルだけを別プロジェクトへコピーすると、BoardUIや共通テーマなどの依存が不足します。

## 起動・確認

Node.js 24系でのビルドを確認済みです。展開先で次を実行します。

```sh
npm ci
npm run dev -- --port 3210
```

`http://localhost:3210/lab-notebook` を開きます。`@/` は `src/` を指します（`tsconfig.json`）。現在のフォントは `next/font/google` のNoto Sans JPです。過去に使用したヒラギノのローカルフォントファイルは同梱していません。フォントの取得を含む初回ビルドにはインターネット接続が必要です。

```sh
npm test
npm run build
```

収録時点では63件のテストが成功し、Vercel上の本番ビルドも成功しています。画面を変更した場合は、幅320px・390px・デスクトップ、キーボード操作、写真追加・再読み込み、試料切り替え後の記録保持を確認してください。

## 画面構成（2026-11-17 UI改修）

- 秤量計算ツールと同じページ骨格を使います：`.calculator-page`・`.page-header`・`.app-header`・`.section-block`・`.compound-toggle`・フッター。ノート固有の部品だけを`notebook.css`の`nb-`クラスで定義し、緑のアクセントは`.nb-page`に限定しています。
- 画面は「試料一覧／作製手順／条件・秤量／装置メモ」の4タブ。試料の作成・並び替え・ごみ箱・バックアップは「試料一覧」に集約しました。
- ヘッダーの「表示中の試料」カードに進捗バー・次の工程・試料の切り替え・新規作成・別ウィンドウを表示します。
- 工程カードは折りたたみ式で、次の作業だけを初期表示で開きます。主操作は状態に応じて「今から開始」→「完了を記録」の順に1つを強調します。試料を開くと、次の未完了工程がある日に移動します。
- `globals.css`の`.calculator-page button { color: inherit }`はカスケードレイヤー外のため、BoardUIの主要ボタンの白文字を`notebook.css`で明示しています。

## 維持する仕様

- 実験ノートは緑、秤量計算ツールは青。緑のテーマを`body`や`:root`全体に広げず、ノートとポータルのカレンダーに限定します。
- 主要ボタンは背景色に白文字で太字。文字の矢印で誘導せず、工程の配置・選択状態・アイコンで示します。
- SVGは作業を識別する模式図です。操作条件や薬品量の正しさを保証する図として扱いません。手順本文の確認事項を削除しないでください。
- 切り替えは180〜220ms程度。入力のたびにアニメーションや再マウントを起こさず、試料・日程などの変更を契機にします。`prefers-reduced-motion`に対応しています。
- 母体材料はYVO₄／GdVO₄を試料ごとに保存します。秤量条件から取り込んだ試料はスナップショットの母体を優先します。
- 秤量条件の転記は作成時点のスナップショットです。計算画面の後日の変更で記録を上書きしません。
- マニュアルの薬品量は提供された原記録の値です。合成モル数に連動する自動換算は未実装です。

## 保存と互換性

- ノートと写真はIndexedDBの`weighing-lab-notebook`、バージョン1、`workspace`・`photos`ストアに保存します。保存形式の`schema`は1です。
- 同じ端末・ブラウザ・オリジンのローカル保存です。ソースZIPに実験記録や写真は含みません。記録の移行には画面の写真付きバックアップを使用します。
- Google Driveやサーバーへの自動保存・端末間同期は未接続です。
- 複数画面ではBroadcastChannel等で更新を通知し、保存トランザクション内で3方向マージします。同じ項目の競合は保存を止め、バックアップと読み直しを案内します。
- 試料は`?sample=試料ID`で直接開けます。不明・削除済みIDで別試料を誤って表示しないようにしています。
- 削除は`deletedAt`によるごみ箱への移動です。完全削除するまでは写真も保持します。ごみ箱を含めて500試料が上限です。
- 写真はJPEG・PNG・WebP、1枚20MB、1工程100枚まで。写真付きJSONバックアップは1ファイル250MBまでです。
- バックアップ復元は既存ノートを残して追加し、試料IDと写真IDを再採番します。
- スキーマ、既存工程ID、写真参照、スナップショット、マージ処理を変える際は既存データの互換性と必要な移行を確認してください。

## デプロイ情報

- 公開URL：`https://weighing-calculator.vercel.app/lab-notebook`
- Vercelプロジェクト：`weighing-calculator`
- スコープ：`kou-256s-projects`
- 2026-11-17の反映はVercel CLIによるローカルソースのデプロイです。Gitへのpushによる自動デプロイではありません。
- 実行した流れ：`vercel deploy --prod --skip-domain`、確認、`vercel promote <deployment-url>`。
- ZIPに認証情報、`.env`、`.vercel`、`node_modules`、`.next`、ローカルフォントは同梱していません。別環境のエージェントは自分の正規のVercel認証で対象プロジェクトを確認し、公開を依頼されたときにデプロイします。

## 他のAIエージェントへの依頼例

> このZIPを展開し、`AGENTS.md`と`docs/LAB_NOTEBOOK_HANDOFF.md`を読んでください。実験ノートの編集対象は`src/app/lab-notebook/`です。関連する保存処理は`src/lib/notebook*`、共通UIは`src/components/`と`src/styles/`です。既存の試料・写真・バックアップとの互換性を保ち、スマホ表示と変更した操作を検証してから、指定された改修を行ってください。
