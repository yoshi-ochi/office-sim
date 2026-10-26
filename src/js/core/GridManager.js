// src/js/core/GridManager.js
import { CONFIG } from '../config.js';

export class GridManager {
  constructor(sceneManager, floorManager) {
    this.sceneManager = sceneManager;
    this.floorManager = floorManager;

    this.isEditMode = false;
    this.selectedObject = null;
    this.isDragging = false;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.planeIntersect = new THREE.Vector3();

    this.rotateBtn = document.getElementById('rotate-btn');
    this.initEvents();
  }

  initEvents() {
    const dom = this.sceneManager.renderer.domElement;

    // タッチ / マウスクリックによる家具選択・ドラッグ
    dom.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    window.addEventListener('pointermove', (e) => this.onPointerMove(e));
    window.addEventListener('pointerup', () => this.onPointerUp());

    // 回転ボタン
    if (this.rotateBtn) {
      this.rotateBtn.addEventListener('click', () => this.rotateSelected());
    }
  }

  toggleEditMode(active) {
    this.isEditMode = active;
    if (!this.isEditMode) {
      this.deselect();
    }
    if (this.rotateBtn) {
      this.rotateBtn.style.display = this.isEditMode ? 'flex' : 'none';
    }
  }

  onPointerDown(e) {
    if (!this.isEditMode) return;

    this.updateMouseCoords(e);
    this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);

    const objects = this.floorManager.getCurrentObjects();
    const intersects = this.raycaster.intersectObjects(objects, true);

    if (intersects.length > 0) {
      // 最上位の家具グループを特定
      let root = intersects[0].object;
      while (root.parent && root.parent !== this.sceneManager.scene) {
        root = root.parent;
      }
      this.selectObject(root);
      this.isDragging = true;
    } else {
      this.deselect();
    }
  }

  onPointerMove(e) {
    if (!this.isEditMode || !this.isDragging || !this.selectedObject) return;

    this.updateMouseCoords(e);
    this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);

    // 床面との交差点
    const intersects = this.raycaster.intersectObject(this.sceneManager.floorPlane);
    if (intersects.length > 0) {
      const hitPoint = intersects[0].point;

      // 50cm (0.5m) グリッドにスナップ
      const snappedX = Math.round(hitPoint.x / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
      const snappedZ = Math.round(hitPoint.z / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;

      // フィールド外郭境界制限
      const maxCoord = (CONFIG.FIELD_SIZE / 2) - 1.0;
      const clampedX = Math.max(-maxCoord, Math.min(maxCoord, snappedX));
      const clampedZ = Math.max(-maxCoord, Math.min(maxCoord, snappedZ));

      this.selectedObject.position.x = clampedX;
      this.selectedObject.position.z = clampedZ;

      // メタデータ更新
      this.selectedObject.userData.gridX = clampedX;
      this.selectedObject.userData.gridZ = clampedZ;
    }
  }

  onPointerUp() {
    this.isDragging = false;
  }

  selectObject(obj) {
    this.deselect();
    this.selectedObject = obj;

    // 選択ハイライト（バウンディングボックス）
    this.boxHelper = new THREE.BoxHelper(this.selectedObject, 0xffff00);
    this.sceneManager.scene.add(this.boxHelper);
  }

  deselect() {
    if (this.boxHelper) {
      this.sceneManager.scene.remove(this.boxHelper);
      this.boxHelper.dispose();
      this.boxHelper = null;
    }
    this.selectedObject = null;
  }

  rotateSelected() {
    if (!this.selectedObject) return;
    // 90度回転
    this.selectedObject.rotation.y += Math.PI / 2;
    if (this.boxHelper) {
      this.boxHelper.update();
    }
  }

  updateMouseCoords(e) {
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  }
}