// src/js/controls/Interaction.js
import { CONFIG } from '../config.js';

export class Interaction {
  constructor(player, floorManager, uiCallbacks) {
    this.player = player;
    this.floorManager = floorManager;
    this.callbacks = uiCallbacks; // { onOpenModal, onTriggerEvent }

    this.actionBtn = document.getElementById('action-btn');
    this.initActionBtn();
  }

  initActionBtn() {
    this.actionBtn.addEventListener('click', () => {
      this.interactClosest();
    });
  }

  // プレイヤーの直近にあるオブジェクトを検索
  findClosestObject() {
    const objects = this.floorManager.getCurrentObjects();
    const playerPos = this.player.position;
    let closest = null;
    let minDistance = CONFIG.INTERACTION_DISTANCE;

    for (const obj of objects) {
      const dist = playerPos.distanceTo(obj.position);
      if (dist < minDistance) {
        minDistance = dist;
        closest = obj;
      }
    }
    return closest;
  }

  interactClosest() {
    const target = this.findClosestObject();
    if (!target) {
      console.log("[Interaction] 近くに対象オブジェクトがありません。");
      return;
    }

    const data = target.userData;

    // プリンターの場合
    if (data.isPrinter) {
      this.callbacks.onTriggerPrinter(target);
      return;
    }

    // 社内電話の場合
    if (data.type === 'phone') {
      this.callbacks.onTriggerPhone(target);
      return;
    }

    // 通常の座席・情報オブジェクト
    this.callbacks.onOpenModal({
      title: `${data.role} のデスク`,
      body: `
        <strong>氏名:</strong> ${data.person}<br>
        <strong>担当フロア:</strong> ${this.floorManager.currentFloorId}F<br>
        <strong>必要配布物:</strong> ${data.distNeeded ? '【要配布】' + data.distNeeded : '特になし'}<br>
        <strong>連絡事項:</strong> 本日の予定業務を完了しています。
      `
    });
  }
}