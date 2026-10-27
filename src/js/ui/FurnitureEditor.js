// src/js/ui/FurnitureEditor.js
import { CONFIG } from '../config.js';

export class FurnitureEditor {
  constructor(app) {
    this.app = app;
    this.actionBar = document.getElementById('furniture-action-bar');
    this.gridHelper = app.gridHelper;

    // ドラッグ時のスナップガイド枠
    const snapGeo = new THREE.BoxGeometry(CONFIG.GRID_SIZE, 0.05, CONFIG.GRID_SIZE);
    const snapMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.5 });
    this.snapBox = new THREE.Mesh(snapGeo, snapMat);
    this.snapBox.visible = false;
    this.app.scene.add(this.snapBox);

    this.setupEvents();
  }

  setupEvents() {
    document.getElementById('btn-f-rotate')?.addEventListener('click', () => {
      if (this.app.selectedObject) {
        this.app.selectedObject.rotation.y += Math.PI / 2;
        if (this.app.boxHelper) this.app.boxHelper.update();
      }
    });

    document.getElementById('btn-f-delete')?.addEventListener('click', () => {
      if (!this.app.selectedObject) return;
      if (confirm(`選択中の ${this.app.selectedObject.userData.role} を撤去しますか？`)) {
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
    if (visible) {
      this.snapBox.position.set(x, 0.02, z);
    }
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
    const html = `
      <div style="display: flex; flex-direction: column; gap: 10px; font-size: 13px;">
        <label>
          <strong>役割・名称:</strong><br>
          <input type="text" id="prop-role" value="${d.role || ''}" style="width: 100%; padding: 6px; box-sizing: border-box;">
        </label>
        <label>
          <strong>担当者名 (NPC名):</strong><br>
          <input type="text" id="prop-person" value="${d.person || ''}" style="width: 100%; padding: 6px; box-sizing: border-box;">
        </label>
        <label>
          <strong>所属部署:</strong><br>
          <input type="text" id="prop-dept" value="${d.department || ''}" style="width: 100%; padding: 6px; box-sizing: border-box;">
        </label>
        <label>
          <strong>勤務シフト (例: 09:00-17:00, 15:00-24:00):</strong><br>
          <input type="text" id="prop-shift" value="${d.shift || '09:00-17:00'}" style="width: 100%; padding: 6px; box-sizing: border-box;">
        </label>
        <label>
          <strong>必要配布物ID (タスク用):</strong><br>
          <input type="text" id="prop-dist" value="${d.distNeeded || ''}" style="width: 100%; padding: 6px; box-sizing: border-box;">
        </label>
        <div style="text-align: right; margin-top: 10px;">
          <button id="btn-prop-save" class="btn-dialog btn-primary">属性を保存</button>
        </div>
      </div>
    `;

    this.app.showModal(`✏️ 家具の属性編集 (${d.type})`, html);

    document.getElementById('btn-prop-save')?.addEventListener('click', () => {
      d.role = document.getElementById('prop-role').value.trim();
      d.person = document.getElementById('prop-person').value.trim();
      d.department = document.getElementById('prop-dept').value.trim();
      d.shift = document.getElementById('prop-shift').value.trim();
      d.distNeeded = document.getElementById('prop-dist').value.trim() || null;

      this.app.closeModal();
      this.app.refreshNPCs();
      alert("属性を一時更新しました。「保存して終了」で確定してください。");
    });
  }
}