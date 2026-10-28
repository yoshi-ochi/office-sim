// src/js/ui/FurnitureEditor.js
import { CONFIG } from '../config.js';

export class FurnitureEditor {
  constructor(app) {
    this.app = app;
    this.actionBar = document.getElementById('furniture-action-bar');

    const snapGeo = new THREE.BoxGeometry(CONFIG.GRID_SIZE, 0.05, CONFIG.GRID_SIZE);
    const snapMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.5 });
    this.snapBox = new THREE.Mesh(snapGeo, snapMat);
    this.snapBox.visible = false;
    this.app.scene.add(this.snapBox);

    this.setupEvents();
  }

  setupEvents() {
    // 45度単位回転
    document.getElementById('btn-f-rotate')?.addEventListener('click', () => {
      if (this.app.selectedObject) {
        this.app.selectedObject.rotation.y = (this.app.selectedObject.rotation.y + Math.PI / 4) % (Math.PI * 2);
        if (this.app.boxHelper) this.app.boxHelper.update();
      }
    });

    document.getElementById('btn-f-delete')?.addEventListener('click', () => {
      if (!this.app.selectedObject) return;
      if (confirm(`選択中の「${this.app.selectedObject.userData.role}」を撤去しますか？`)) {
        this.deleteSelected();
      }
    });

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
    const isDesk = d.type === 'desk';
    const isPrinter = d.type.includes('printer');
    const isPhone = d.type === 'phone';

    let extraFields = '';

    if (isDesk) {
      extraFields += `
        <div style="background: #f8fafc; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0; margin-top: 4px;">
          <strong style="color: #0369a1;">📅 出勤時間設定（3区分）</strong>
          <label style="display:block; margin-top:4px;">平日シフト: <input type="text" id="prop-shift-w" value="${d.shiftWeekday || '09:00-17:00'}" style="width: 100%; padding: 4px;"></label>
          <label style="display:block; margin-top:4px;">土曜シフト: <input type="text" id="prop-shift-s" value="${d.shiftSaturday || '09:00-15:00'}" style="width: 100%; padding: 4px;"></label>
          <label style="display:block; margin-top:4px;">日祝シフト: <input type="text" id="prop-shift-h" value="${d.shiftHoliday || '休み'}" style="width: 100%; padding: 4px;"></label>
        </div>
      `;
    }

    if (isPhone || isDesk) {
      extraFields += `
        <label><strong>内線番号:</strong><br><input type="text" id="prop-ext" value="${d.extensionNumber || ''}" placeholder="例: 内線 3214" style="width: 100%; padding: 4px;"></label>
      `;
    }

    if (isPrinter) {
      extraFields += `
        <div style="background: #fdf4ff; padding: 8px; border-radius: 6px; border: 1px solid #f0abfc; margin-top: 4px;">
          <strong style="color: #a21caf;">🖨️ プリンター・消耗品詳細</strong>
          <label style="display:block; margin-top:4px;">型番: <input type="text" id="prop-model" value="${d.modelNumber || ''}" style="width: 100%; padding: 4px;"></label>
          <label style="display:block; margin-top:4px;">トナー型番: <input type="text" id="prop-toner" value="${d.tonerType || ''}" style="width: 100%; padding: 4px;"></label>
          <label style="display:block; margin-top:4px;">ドラム形式: <input type="text" id="prop-drum" value="${d.drumType || ''}" style="width: 100%; padding: 4px;"></label>
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