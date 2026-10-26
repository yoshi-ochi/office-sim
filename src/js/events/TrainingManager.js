// src/js/events/TrainingManager.js
import { CONFIG } from '../config.js';

export class TrainingManager {
  constructor(floorManager, player) {
    this.floorManager = floorManager;
    this.player = player;

    this.currentTaskId = null;
    this.activeTargets = []; // 配布対象の家具オブジェクト一覧
    this.deliveredCount = 0;
    this.totalTargets = 0;
    this.isActive = false;

    this.pulseClock = 0;
  }

  // 配布物ステージの開始
  startDistributionTraining(distributionId) {
    const taskInfo = CONFIG.DISTRIBUTIONS.find(d => d.id === distributionId);
    if (!taskInfo) return;

    this.currentTaskId = distributionId;
    this.deliveredCount = 0;
    this.activeTargets = [];
    this.isActive = true;

    const objects = this.floorManager.getCurrentObjects();

    // 配布対象となる座席を抽出して赤マーカーを点灯
    objects.forEach(obj => {
      const data = obj.userData;
      let isTarget = false;

      if (taskInfo.targetRoles.includes("全員") && data.type === 'desk') {
        isTarget = true;
      } else if (taskInfo.targetRoles.includes(data.role)) {
        isTarget = true;
      } else if (data.distNeeded === distributionId) {
        isTarget = true;
      }

      if (isTarget && data.redDot) {
        data.redDot.visible = true;
        this.activeTargets.push(obj);
      } else if (data.redDot) {
        data.redDot.visible = false;
      }
    });

    this.totalTargets = this.activeTargets.length;
    console.log(`[Training] 『${taskInfo.title}』開始。対象座席数: ${this.totalTargets}`);
    this.notifyUI(`【トレーニング開始】\n『${taskInfo.title}』を赤ポチの座席 (${this.totalTargets}箇所) に配布してください。`);
  }

  // メインループから呼び出す近接チェック＆マーカー拍動アニメーション
  update(delta) {
    if (!this.isActive || this.activeTargets.length === 0) return;

    this.pulseClock += delta * 6;
    const scale = 1.0 + Math.sin(this.pulseClock) * 0.25;

    for (let i = this.activeTargets.length - 1; i >= 0; i--) {
      const target = this.activeTargets[i];
      const redDot = target.userData.redDot;

      if (redDot && redDot.visible) {
        redDot.scale.set(scale, scale, scale);

        // プレイヤーとの距離判定（1.4m以内で配布完了）
        const dist = this.player.position.distanceTo(target.position);
        if (dist < 1.4) {
          redDot.visible = false;
          this.activeTargets.splice(i, 1);
          this.deliveredCount++;

          this.onDeliverSuccess(target);
        }
      }
    }
  }

  onDeliverSuccess(target) {
    console.log(`[Training] 配布完了: ${target.userData.person} (${target.userData.role}) [残 ${this.activeTargets.length}]`);

    if (this.activeTargets.length === 0) {
      this.completeTraining();
    }
  }

  completeTraining() {
    this.isActive = false;
    const taskInfo = CONFIG.DISTRIBUTIONS.find(d => d.id === this.currentTaskId);
    alert(`🎉 配布業務トレーニング完了！\n『${taskInfo.title}』を全座席（${this.totalTargets}件）へ正常に配布しました！`);
  }

  cancelTraining() {
    this.isActive = false;
    const objects = this.floorManager.getCurrentObjects();
    objects.forEach(obj => {
      if (obj.userData.redDot) {
        obj.userData.redDot.visible = false;
      }
    });
    this.activeTargets = [];
  }

  notifyUI(msg) {
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    const modalOverlay = document.getElementById('info-modal');

    if (modalTitle && modalContent && modalOverlay) {
      modalTitle.innerText = "業務トレーニング案内";
      modalContent.innerText = msg;
      modalOverlay.classList.add('active');
    }
  }
}