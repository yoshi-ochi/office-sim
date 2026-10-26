// src/js/core/FloorManager.js
import { CONFIG } from '../config.js';
import { Furniture } from '../entities/Furniture.js';

export class FloorManager {
  constructor(sceneManager) {
    this.sceneManager = sceneManager;
    this.currentFloorId = 1;
    this.currentFloorObjects = []; // 現在の階に属するThree.jsオブジェクト群
    this.floorDataStore = new Map(); // 各階の家具配置データ (JSONキャッシュ用)

    this.initDefaultLayouts();
  }

  // 各階の初期データ（サンプルレイアウト）
  initDefaultLayouts() {
    for (let f = 1; f <= 8; f++) {
      const items = [];
      // 各階に自席、デスク群、プリンター、ロッカーをデフォルト配置
      items.push({ type: 'desk', x: -4, z: -4, rotation: 0, role: '自席', person: '自分', isMySeat: true });
      items.push({ type: 'chair', x: -4, z: -3.2, rotation: 0 });
      items.push({ type: 'phone', x: -4.5, z: -4, rotation: 0, role: '社内内線電話' });
      items.push({ type: 'board', x: -3.2, z: -4.5, rotation: 0, role: '業務連絡掲示板' });

      // 同僚デスク
      items.push({ type: 'desk', x: 2, z: -4, rotation: 0, role: '課長', person: '佐藤 課長', distNeeded: 'dist_01' });
      items.push({ type: 'chair', x: 2, z: -3.2, rotation: 0 });
      items.push({ type: 'desk', x: 6, z: -4, rotation: 0, role: 'リーダー', person: '鈴木 主任', distNeeded: 'dist_04' });
      items.push({ type: 'chair', x: 6, z: -3.2, rotation: 0 });

      // 複合機 & ロッカー
      items.push({ type: 'printer', x: 10, z: 2, rotation: 0, role: 'フロア複合機', isPrinter: true });
      items.push({ type: 'locker', x: -10, z: -8, rotation: 0, role: '個人用ロッカー' });
      items.push({ type: 'partition', x: 0, z: -1, rotation: 0 });

      this.floorDataStore.set(f, items);
    }
  }

  // 指定フロアへ切り替え（完全メモリ解放 + 新フロアロード）
  switchFloor(floorId) {
    if (this.currentFloorId === floorId && this.currentFloorObjects.length > 0) return;

    // 1. 旧フロアオブジェクトのメモリ破棄（Dispose）
    this.disposeCurrentFloor();

    // 2. フロア情報の更新
    this.currentFloorId = floorId;
    const floorInfo = CONFIG.FLOORS.find(f => f.id === floorId);
    if (floorInfo) {
      this.sceneManager.setFloorColor(floorInfo.color);
    }

    // 3. 新フロアのオブジェクト生成
    const layout = this.floorDataStore.get(floorId) || [];
    layout.forEach(data => {
      const furniture = Furniture.create(data.type, data);
      this.sceneManager.scene.add(furniture);
      this.currentFloorObjects.push(furniture);
    });

    console.log(`[FloorManager] フロア ${floorId}F (${floorInfo?.name}) をロード。オブジェクト数: ${this.currentFloorObjects.length}`);
  }

  // 現在の階のThree.jsオブジェクト・GPUリソースを完全に解放
  disposeCurrentFloor() {
    for (const obj of this.currentFloorObjects) {
      this.sceneManager.scene.remove(obj);

      obj.traverse(child => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach(m => m.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });
    }
    this.currentFloorObjects = [];
  }

  getCurrentObjects() {
    return this.currentFloorObjects;
  }
}