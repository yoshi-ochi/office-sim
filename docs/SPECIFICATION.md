# OfficeSim プロジェクト仕様書 & 実装ステータス (Handover Document v3.0)

## 1. 概要
オフィス内設備や座席配置、日常業務フローを3D空間内で直観的に学習・体験できる、ゲーミフィケーション業務マニュアル＆オフィスシミュレーター。
PC（Windows/Macブラウザ）、スマートフォン、タブレットのマルチデバイスに対応。

- **ホスティング**: GitHub Pages
- **バックエンド / データベース**: Google Apps Script (GAS) + Google スプレッドシート
- **フロントエンド技術**: HTML5, CSS3, Vanilla JavaScript (ES Modules), Three.js (r128)
- **キャッシュ制御**: HTML側動的タイムスタンプローダー（`Date.now()`）による完全自動キャッシュバスター機構

---

## 2. ディレクトリ構成

モジュール分割と関心の分離（SoC）を行った現在の構成です。

```text
office-sim/
├── SPECIFICATION.md              # 本仕様書（開発・引き継ぎドキュメント）
├── scripts/
│   └── generate_models.py        # Blenderプロシージャル3Dモデル生成スクリプト
└── src/
    ├── index.html                # エントリポイント（動的タイムスタンプローダー内蔵）
    ├── css/
    │   ├── style.css             # 基本レイアウト・キャンバススタイル
    │   └── ui.css                # 各種UI、モーダル、ボタン、ドロワースタイル
    └── js/
        ├── config.js             # 定数定義（グリッド、速度、カメラ、フロア設定、GAS URL）
        ├── main.js               # アプリ起動・メインループ・衝突判定・イベント統括
        ├── services/
        │   └── SheetService.js   # GAS API通信・暗号化認証・データ永続化
        ├── entities/
        │   ├── Player.js         # 自アバター描画・移動計算・ホップ演出・境界判定
        │   ├── NPC.js            # 曜日別シフト判定・在席NPCアバター生成
        │   └── Furniture.js      # 家具・設備モデリング集（デスク、卓上/床置複合機、階段、エレベーター等）
        └── ui/
            ├── Minimap.js        # 俯瞰ミニマップ・自位置/設備/タスク描画
            ├── ChatManager.js    # 社内チャット・タブ切替・未読バッジ
            └── FurnitureEditor.js # 家具配置・45度回転・撤去・属性編集モーダル
3. 実装済みモジュール & アーキテクチャ(1) コア描画・カメラ・グリッドsrc/js/main.js: アプリケーション全体の初期化、メインループ、衝突・接触判定、モーダル統括。50cm（0.5m）グリッド: 32m四方のフィールドに対して GRID_SIZE: 0.5、GRID_DIVISIONS: 64 を適用した精密なマス目。OrthographicCamera & ズーム機能:アイソメトリック（クォータービュー）追従カメラ。   スマートフォン / タブレット: 2本指のピンチイン・ピンチアウト操作によるシームレスな拡大・縮小（0.5x 〜 2.5x）。PC: マウスホイール操作によるズーム倍率調整。カメラ位置の NaN 汚染ガードおよびゼロ除算防止による画面消失（全盲）バグの完全防止。(2) アバター & 操作系src/js/entities/Player.js: 赤色コーン＋球体頭部＋丸影のプレイヤーキャラクター。移動ベクトルに応じた上下ホッピング演出。   バーチャルジョイスティック & キー入力:タッチ操作によるアナログスティック（正規化移動ベクトル算出）。   キーボード（WASD / 矢印キー）移動対応[cite: 15]。(3) フロア昇降 & 設備上り階段（stairs_up / 緑色サイン）:幅150cm（1.5m）仕様。1.2秒接触（押し当て）により、ポップアップなしで即座に1つ上の階へ直接移動。下り階段（stairs_down / オレンジ色サイン）:幅150cm（1.5m）仕様。1.2秒接触により、ポップアップなしで即座に1つ下の階へ直接移動。エレベーター（elevator）:近代的なシャフト・ドア・フロア表示インジケーター。接触時に全フロア（1F〜8F）選択ダイアログを展開。フロア切り替え時のメモリ管理:階層遷移時に前フロアのThree.jsジオメトリ・マテリアルを完全disposeし、メモリリークを抑止[cite: 15]。到着階の階段・エレベーター直前へ安全に着地（接触ループ防止オフセット処理）。(4) 家具配置 & エディタsrc/js/entities/Furniture.js:デスク、チェア、パーティション、ロッカー、電話、掲示板、エレベーター、上り/下り階段、プリンターの3Dプロシージャル生成。   配置時にワールドマス目に沿って直交（0度）で生成。src/js/ui/FurnitureEditor.js:45度単位（$\pi/4$）での回転スナップ。   ドラッグ移動時のスナップガイド枠（青色半透明マス）のリアルタイム可視化。   家具の撤去・削除（ゴミ箱機能）: 選択中の家具を即時削除。   属性編集UI: 役割、担当者名、所属部署、平日/土曜/日祝シフト、内線番号、機器型番・消耗品情報を画面上で編集。   (5) プリンター・電話・周辺設備結合プリンターの種別分離:床置き大型複合機（printer_floor）: フロア共用機。用紙詰まり解消イベント対応[cite: 15]。   卓上プリンター（printer_desk）: 近隣デスク（1.2m以内）の机上（高さ0.75m）に自動スナップ。すでに机上にプリンターが存在する場合は自動的に机の下（高さ0.15m）に段積み配置。   周辺設備結合モーダル:デスクに接触した際、その座席から半径1.4m以内にある内線電話（番号）およびプリンター（型番・適合トナー型番・ドラム形式）を自動探索・マージし、1つの詳細ウィンドウ内にまとめて表示。(6) シフト連動NPC（平日・土曜・日祝）src/js/entities/NPC.js:各座席の出勤時間を「平日 (shiftWeekday)」「土曜 (shiftSaturday)」「日祝 (shiftHoliday)」の3区分で個別管理。システム現在時刻と曜日（日曜=0、土曜=6、平日=1〜5）をリアルタイム判定し、勤務時間中であれば座席背後にNPCアバターを自動召喚・着席（頭上ネームプレート付き）。   (7) UI・社内ツール & データベース連携src/js/services/SheetService.js: GASエンドポイント経由の非同期通信・データ永続化。   src/js/ui/Minimap.js: 画面右下にフロア全体の俯瞰図、家具、自アバター（赤）、階段/エレベーター（緑/橙/黄）をリアルタイムレンダリング。   src/js/ui/ChatManager.js:全社 / 現フロア / 1on1 の3タブ構成。   ドロワー非表示時の未読メッセージ件数赤バッジ表示（5秒間隔ポーリング）。   業務連絡掲示板:過去投稿の閲覧および新規投稿フォームを常設。未読投稿がある場合、3D掲示板右上に赤丸バッジを点滅表示。   社内用語辞書:カテゴリ別マニュアル用語の閲覧[cite: 15]。画面上からの新規用語・解説の追加登録＆スプレッドシートへの保存。業務情報一覧テーブル（簡易マニュアル）:昼勤平日簡易マニュアルのデータ構造（shift, timeGroup, time, taskName, position, description, icon, briefexplanation, weekends）に完全準拠した表形式UI。   画面上で行内容の編集、新規業務行の追加、スプレッドシート（Workflows シート）への一括保存が可能。認証システム:AllowedUsers シートのメールホワイトリスト照合。   初回ログイン時のパスワード設定およびクライアントSHA-256暗号化ハッシュ検証。   4. スプレッドシート データ構造 (Schema)AllowedUsers: email, name, department, role, passwordHashLayouts: floor, type, x, z, rotation, role, person, department, shiftWeekday, shiftSaturday, shiftHoliday, extensionNumber, modelNumber, tonerType, drumType, distNeededWorkflows: shift, timeGroup, time, taskName, position, description, icon, briefexplanation, weekends   Dictionary: term, category, contentBoard: id, date, author, category, messageChat: id, timestamp, channelType, channelTarget, senderName, messageTrainingLogs: id, timestamp, email, userName, taskId, taskTitle, clearTimeSec, score5. 今後の拡張候補（ロードマップ）[ ] 役職（role）に応じた権限分離（管理者のみ家具配置・レイアウト保存可能、一般は閲覧・受講のみ）[ ] エレベーター・階段を活用した複数フロア連動ミッション（1F受付書類受取、各階回覧板回収など）[ ] 業務フロー図・マニュアル行からの直接シミュレーションタスク起動連動[ ] アバターの外観カスタマイズ（スーツカラー、髪型、アクセサリー）