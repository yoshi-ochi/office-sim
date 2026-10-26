# OfficeSim プロジェクト仕様書 & 実装ステータス (Handover Document v2.0)

## 1. 概要
どうぶつの森風のアイソメトリック（クォータービュー）オフィスシミュレーター＆ゲーミフィケーション業務マニュアル。PC（Windows）、Androidタブレット、スマホのマルチデバイス対応。

## 2. 実装済みモジュール
1. **コア描画 & メモリ管理**:
   - `src/js/core/SceneManager.js`: OrthographicCameraによる斜め45度追従、柔らかなライティング、50m×50mフィールド（50cmグリッド）。
   - `src/js/core/FloorManager.js`: 8階建て対応。階層移動時に旧階のThree.jsジオメトリ/マテリアルを完全disposeしてメモリ肥大化を防止。
2. **アバター & 操作系**:
   - `src/js/entities/Player.js`: ピン型アイコンキャラクター。移動ベクトルの大きさに応じた速度調整とホップアニメーション。
   - `src/js/controls/Joystick.js`: タッチスティックおよびキーボード（WASD/矢印キー）両対応。45度アイソメトリック回転軸補正。
   - `src/js/controls/Interaction.js`: 最寄りオブジェクトの検出と「調べる」アクション。
3. **家具配置 & グリッドスナップ**:
   - `src/js/entities/Furniture.js`: 机、椅子、衝立、プリンター、ロッカー、電話、掲示板のコード生成。
   - `src/js/core/GridManager.js`: 編集モード時のドラッグ移動（50cmスナップ）および90度回転。
4. **イベント & 業務トレーニング**:
   - `src/js/events/TrainingManager.js`: 10種の配布物トレーニング。対象座席への赤ポチ点滅表示、巡回受渡判定。
   - `src/js/events/PrinterEvent.js`: 複合機用紙詰まり・トナー補充のステップバイステップ体験。
   - `src/js/events/PhoneEvent.js`: 社内電話のランダム受電タスク。
5. **マスター連携 & UI**:
   - `src/js/services/SheetService.js`: Google Sheets API/GAS連携用辞書・フローローダー（モック内蔵）。
   - `src/index.html` & `src/css/*`: レスポンシブUI、業務フロー図ダイアログ、自席辞書ポップアップ。
   - `scripts/generate_models.py`: Blenderプロシージャル3Dモデル生成スクリプト。

## 3. 次期開発タスク（ロードマップ）
- [ ] Google Apps Script (GAS) 側のスプレッドシート連携スクリプトの作成
- [ ] ユーザー認証（Firebase / Google OAuth）による個人アカウント管理
- [ ] 自席掲示板の個人別投稿・既読管理およびトレーニング履歴ログ保存
- [ ] アプリ内リアルタイムチャット（全体/グループ/1on1）