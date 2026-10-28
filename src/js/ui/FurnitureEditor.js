// src/js/ui/FurnitureEditor.js
import { CONFIG } from '../config.js';
import { FurnitureFactory } from '../entities/Furniture.js';

export class FurnitureEditor {
  constructor(app) {
    this.app = app;
    this.actionBar = document.getElementById('furniture-action-bar');
    this.carouselModal = document.getElementById('furniture-carousel-modal');

    // 選択可能なオブジェクトリスト
    this.items = [
      { type: 'desk_150_80', name: '標準デスク (150×80)', category: '机' },
      { type: 'desk_120_70', name: 'コンパクトデスク (120×70)', category: '机' },
      { type: 'desk_250_100', name: '大型役員デスク (250×100)', category: '机' },
      { type: 'chair', name: 'オフィスチェア', category: '椅子' },
      { type: 'sofa_reception', name: '応接ソファ (黒革)', category: '応接' },
      { type: 'table_low_reception', name: '応接ローテーブル (黒)', category: '応接' },
      { type: 'custom_shelf', name: '可変書類棚 (サイズ自由)', category: '収納' },
      { type: 'locker_300_60', name: '大型ロッカー (300×60×130)', category: '収納' },
      { type: 'printer_desk', name: '卓上プリンター (机上/机下)', category: '機器' },
      { type: 'printer_floor', name: '大型複合機 (床置)', category: '機器' },
      { type: 'partition', name: '間仕切り衝立', category: '設備' },
      { type: 'phone', name: '内線電話', category: '設備' },
      { type: 'board', name: '業務連絡掲示板', category: '設備' },
      { type: 'stairs_up', name: '上り連絡階段 (1.5m)', category: '階段' },
      { type: 'stairs_down', name: '下り連絡階段 (1.5m)', category: '階段' },
      { type: 'elevator', name: 'エレベーター', category: '昇降' }
    ];

    this.currentIndex = 0;

    // スナップ枠
    const snapGeo = new THREE.BoxGeometry(CONFIG.GRID_SIZE, 0.05, CONFIG.GRID_SIZE);
    const snapMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.5 });
    this.snapBox = new THREE.Mesh(snapGeo, snapMat);
    this.snapBox.visible = false;
    this.app.scene.add(this.snapBox);

    this.initPreviewScene();
    this.setupEvents();
  }

  // --- カルーセル用 3Dプレビューレンダラー初期化 ---
  initPreviewScene() {
    this.previewCanvas = document.getElementById('palette-preview-canvas');
    if (!this.previewCanvas) return;

    this.previewScene = new THREE.Scene();
    this.previewScene.background = new THREE.Color(0xf1f5f9);

    this.previewCamera = new THREE.PerspectiveCamera(40, 1, 0.1, 50);
    this.previewCamera.position.set(2.5, 2.0, 3.0);
    this.previewCamera.lookAt(0, 0.6, 0);

    this.previewRenderer = new THREE.WebGLRenderer({ canvas: this.previewCanvas, antialias: true, alpha: true });
    this.previewRenderer.setSize(180, 180);
    this.previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const amb = new THREE.AmbientLight(0xffffff, 0.85);
    this.previewScene.add(amb);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(5, 10, 7);
    this.previewScene.add(dir);

    this.previewCurrentMesh = null;

    // プレビューアニメーションループ
    const anim = () => {
      requestAnimationFrame(anim);
      if (this.carouselModal && this.carouselModal.classList.contains('active') && this.previewCurrentMesh) {
        this.previewCurrentMesh.rotation.y += 0.015; // ゆっくり回転
        this.previewRenderer.render(this.previewScene, this.previewCamera);
      }
    };
    anim();
  }

  updatePreviewModel() {
    if (!this.previewScene) return;
    if (this.previewCurrentMesh) {
      this.previewScene.remove(this.previewCurrentMesh);
    }

    const item = this.items[this.currentIndex];
    const previewObj = FurnitureFactory.create(item.type, { x: 0, z: 0, rotation: 0 });
    previewObj.position.set(0, 0, 0);

    // プレビュー用にスケール微調整
    if (item.type === 'locker_300_60' || item.type === 'desk_250_100') {
      previewObj.scale.set(0.65, 0.65, 0.65);
    } else if (item.type.includes('stairs') || item.type === 'elevator') {
      previewObj.scale.set(0.55, 0.55, 0.55);
    } else {
      previewObj.scale.set(0.85, 0.85, 0.85);
    }

    this.previewCurrentMesh = previewObj;
    this.previewScene.add(this.previewCurrentMesh);

    // テキスト情報更新
    const nameEl = document.getElementById('palette-item-name');
    const catEl = document.getElementById('palette-item-cat');
    const idxEl = document.getElementById('palette-item-index');
    if (nameEl) nameEl.innerText = item.name;
    if (catEl) catEl.innerText = `[${item.category}]`;
    if (idxEl) idxEl.innerText = `${this.currentIndex + 1} / ${this.items.length}`;

    // 棚の場合のみサイズ入力欄を表示
    const shelfCustomBox = document.getElementById('shelf-dimension-controls');
    if (shelfCustomBox) {
      shelfCustomBox.style.display = (item.type === 'custom_shelf') ? 'block' : 'none';
    }
  }

  setupEvents() {
    // 左右矢印スライド
    document.getElementById('btn-palette-prev')?.addEventListener('click', () => {
      this.currentIndex = (this.currentIndex - 1 + this.items.length) % this.items.length;
      this.updatePreviewModel();
    });

    document.getElementById('btn-palette-next')?.addEventListener('click', () => {
      this.currentIndex = (this.currentIndex + 1) % this.items.length;
      this.updatePreviewModel();
    });

    // 「配置する」ボタン
    document.getElementById('btn-palette-place')?.addEventListener('click', () => {
      const item = this.items[this.currentIndex];
      let extraData = {};
      if (item.type === 'custom_shelf') {
        extraData.shelfWidth = parseFloat(document.getElementById('shelf-inp-w')?.value) || 1.2;
        extraData.shelfDepth = parseFloat(document.getElementById('shelf-inp-d')?.value) || 0.45;
        extraData.shelfHeight = parseFloat(document.getElementById('shelf-inp-h')?.value) || 1.8;
      }
      this.app.spawnFurnitureInFrontOfPlayer(item.type, extraData);
    });

    // 45度回転
    document.getElementById('btn-f-rotate')?.addEventListener('click', () => {
      if (this.app.selectedObject) {
        this.app.selectedObject.rotation.y = (this.app.selectedObject.rotation.y + Math.PI / 4) % (Math.PI * 2);
        if (this.app.boxHelper) this.app.boxHelper.update();
      }
    });

    // 撤去
    document.getElementById('btn-f-delete')?.addEventListener('click', () => {
      if (!this.app.selectedObject) return;
      if (confirm(`選択中の「${this.app.selectedObject.userData.role}」を撤去しますか？`)) {
        this.deleteSelected();
      }
    });

    // 属性編集
    document.getElementById('btn-f-edit')?.addEventListener('click', () => {
      if (this.app.selectedObject) {
        this.openPropertyModal(this.app.selectedObject);
      }
    });
  }

  showActionBar(show) {
    if (this.actionBar) this.actionBar.classList.toggle('active', show);
  }

  showSnapGuide(x, z, visible) {
    this.snapBox.visible = visible;
    if (visible) this.snapBox.position.set(x, 0.02, z);
  }

  deleteSelected() {
    const obj = this.app.selectedObject;
    if (!obj) return;
    this.app.scene.remove(obj);
    const idx = this.app.floorObjects.indexOf(obj);
    if (idx !== -1) this.app.floorObjects.splice(idx, 1);
    if (this.app.boxHelper) {
      this.app.scene.remove(this.app.boxHelper);
      this.app.boxHelper = null;
    }
    this.app.selectedObject = null;
    this.showActionBar(false);
    this.showSnapGuide(0, 0, false);
  }

  openPropertyModal(obj) {
    const d = obj.userData;
    const isDesk = d.type.includes('desk');
    const isShelf = d.type === 'custom_shelf';
    const isPrinter = d.type.includes('printer');
    const isPhone = d.type === 'phone';

    let extraFields = '';

    // 棚の寸法変更
    if (isShelf) {
      extraFields += `
        <div style="background: #fef3c7; padding: 8px; border-radius: 6px; border: 1px solid #fde68a;">
          <strong style="color: #b45309;">📏 棚の寸法設定 (m単位)</strong>
          <div style="display:flex; gap:6px; margin-top:4px;">
            <label style="flex:1;">幅: <input type="number" step="0.1" id="prop-shelf-w" value="${d.shelfWidth || 1.2}" style="width:100%; padding:4px;"></label>
            <label style="flex:1;">奥行: <input type="number" step="0.1" id="prop-shelf-d" value="${d.shelfDepth || 0.45}" style="width:100%; padding:4px;"></label>
            <label style="flex:1;">高さ: <input type="number" step="0.1" id="prop-shelf-h" value="${d.shelfHeight || 1.8}" style="width:100%; padding:4px;"></label>
          </div>
        </div>
      `;
    }

    if (isDesk) {
      extraFields += `
        <div style="background: #f8fafc; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0; margin-top: 4px;">
          <strong style="color: #0369a1;">📅 出勤時間設定（3区分）</strong>
          <label style="display:block; margin-top:4px;">平日: <input type="text" id="prop-shift-w" value="${d.shiftWeekday || '09:00-17:00'}" style="width: 100%; padding: 4px;"></label>
          <label style="display:block; margin-top:4px;">土曜: <input type="text" id="prop-shift-s" value="${d.shiftSaturday || '09:00-15:00'}" style="width: 100%; padding: 4px;"></label>
          <label style="display:block; margin-top:4px;">日祝: <input type="text" id="prop-shift-h" value="${d.shiftHoliday || '休み'}" style="width: 100%; padding: 4px;"></label>
        </div>
      `;
    }

    if (isPhone || isDesk) {
      extraFields += `
        <label><strong>内線番号:</strong><br><input type="text" id="prop-ext" value="${d.extensionNumber || ''}" placeholder="例: 3214" style="width: 100%; padding: 4px;"></label>
      `;
    }

    if (isPrinter) {
      extraFields += `
        <div style="background: #fdf4ff; padding: 8px; border-radius: 6px; border: 1px solid #f0abfc; margin-top: 4px;">
          <strong style="color: #a21caf;">🖨️ プリンター消耗品情報</strong>
          <label style="display:block; margin-top:4px;">型番: <input type="text" id="prop-model" value="${d.modelNumber || ''}" style="width: 100%; padding: 4px;"></label>
          <label style="display:block; margin-top:4px;">トナー: <input type="text" id="prop-toner" value="${d.tonerType || ''}" style="width: 100%; padding: 4px;"></label>
          <label style="display:block; margin-top:4px;">ドラム: <input type="text" id="prop-drum" value="${d.drumType || ''}" style="width: 100%; padding: 4px;"></label>
        </div>
      `;
    }

    const html = `
      <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px; max-height: 380px; overflow-y: auto;">
        <label><strong>役割・品名:</strong><br><input type="text" id="prop-role" value="${d.role || ''}" style="width: 100%; padding: 4px;"></label>
        <label><strong>担当者氏名:</strong><br><input type="text" id="prop-person" value="${d.person || ''}" style="width: 100%; padding: 4px;"></label>
        <label><strong>所属部署:</strong><br><input type="text" id="prop-dept" value="${d.department || ''}" style="width: 100%; padding: 4px;"></label>
        ${extraFields}
        <label><strong>配布タスクID:</strong><br><input type="text" id="prop-dist" value="${d.distNeeded || ''}" style="width: 100%; padding: 4px;"></label>
        <div style="text-align: right; margin-top: 8px;">
          <button id="btn-prop-save" class="btn-dialog btn-primary">設定反映</button>
        </div>
      </div>
    `;

    this.app.showModal(`✏️ 属性編集 (${d.type})`, html);

    document.getElementById('btn-prop-save')?.addEventListener('click', () => {
      d.role = document.getElementById('prop-role').value.trim();
      d.person = document.getElementById('prop-person').value.trim();
      d.department = document.getElementById('prop-dept').value.trim();
      d.distNeeded = document.getElementById('prop-dist').value.trim() || null;

      if (isShelf) {
        d.shelfWidth = parseFloat(document.getElementById('prop-shelf-w').value) || 1.2;
        d.shelfDepth = parseFloat(document.getElementById('prop-shelf-d').value) || 0.45;
        d.shelfHeight = parseFloat(document.getElementById('prop-shelf-h').value) || 1.8;
        // メッシュ再生成
        this.app.rebuildFurnitureMesh(obj);
      }

      if (document.getElementById('prop-shift-w')) {
        d.shiftWeekday = document.getElementById('prop-shift-w').value.trim();
        d.shiftSaturday = document.getElementById('prop-shift-s').value.trim();
        d.shiftHoliday = document.getElementById('prop-shift-h').value.trim();
      }
      if (document.getElementById('prop-ext')) {
        d.extensionNumber = document.getElementById('prop-ext').value.trim();
      }
      if (document.getElementById('prop-model')) {
        d.modelNumber = document.getElementById('prop-model').value.trim();
        d.tonerType = document.getElementById('prop-toner').value.trim();
        d.drumType = document.getElementById('prop-drum').value.trim();
      }

      this.app.closeModal();
      this.app.refreshNPCs();
      alert("設定を反映しました。「保存して終了」で確定してください。");
    });
  }
}