// src/js/events/PrinterEvent.js

export class PrinterEvent {
  constructor(uiCallbacks) {
    this.callbacks = uiCallbacks;
    this.isJamResolved = false;
    this.isTonerReplaced = false;
    this.currentStep = 0;
  }

  // プリンターイベント起動
  trigger(targetMesh) {
    const errorTypes = ['JAM', 'TONER_EMPTY'];
    const errorType = errorTypes[Math.floor(Math.random() * errorTypes.length)];

    if (errorType === 'JAM') {
      this.startPaperJamProcedure();
    } else {
      this.startTonerProcedure();
    }
  }

  startPaperJamProcedure() {
    this.currentStep = 1;
    this.renderStep({
      title: "複合機トラブル: 用紙詰まり (C-1301)",
      body: `
        <div style="background: #ffebee; border-left: 4px solid #f44336; padding: 8px 12px; margin-bottom: 12px; font-weight: bold; color: #c62828;">
          エラー: カセット1から給紙中に紙詰まりが発生しました。
        </div>
        <p><strong>【ステップ 1】</strong> 右側面のレバーAを引き上げてカバーを開けてください。</p>
      `,
      btnText: "カバーを開ける",
      onNext: () => this.paperJamStep2()
    });
  }

  paperJamStep2() {
    this.currentStep = 2;
    this.renderStep({
      title: "複合機トラブル: 用紙詰まり対応中",
      body: `
        <div style="background: #fff3e0; border-left: 4px solid #ff9800; padding: 8px 12px; margin-bottom: 12px; color: #e65100;">
          内部ローラーに挟まった用紙が露出しています。
        </div>
        <p><strong>【ステップ 2】</strong> 用紙が破れないよう、両手でゆっくり手前方向へ引き抜いてください。</p>
      `,
      btnText: "用紙を慎重に引き抜く",
      onNext: () => this.paperJamStep3()
    });
  }

  paperJamStep3() {
    this.currentStep = 3;
    this.renderStep({
      title: "複合機トラブル: 復旧完了",
      body: `
        <div style="background: #e8f5e9; border-left: 4px solid #4caf50; padding: 8px 12px; margin-bottom: 12px; color: #2e7d32;">
          異物・紙片がないことを確認しました。
        </div>
        <p><strong>【ステップ 3】</strong> レバーAを押し戻し、カバーをカチッと音がするまで閉めてください。</p>
      `,
      btnText: "カバーを閉じる (復旧完了)",
      onNext: () => {
        alert("🎉 複合機の紙詰まりが解消され、印刷キューが再開しました！");
        this.close();
      }
    });
  }

  startTonerProcedure() {
    this.renderStep({
      title: "複合機メンテナンス: トナー残量なし (K/ブラック)",
      body: `
        <div style="background: #e3f2fd; border-left: 4px solid #2196f3; padding: 8px 12px; margin-bottom: 12px; color: #0d47a1;">
          備品管理棚から新しいブラックトナー(TK-8346K)を取り出して交換してください。
        </div>
        <p><strong>手順:</strong> フロントカバーを開け、ロックレバーを下げて古いカートリッジを引き抜き、新しいカートリッジを5〜6回水平に振ってから差し込みます。</p>
      `,
      btnText: "トナーを交換して認識させる",
      onNext: () => {
        alert("🎉 ブラックトナーの補充が完了し、印字濃度調整が終了しました！");
        this.close();
      }
    });
  }

  renderStep({ title, body, btnText, onNext }) {
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    const modalOverlay = document.getElementById('info-modal');

    if (!modalTitle || !modalContent || !modalOverlay) return;

    modalTitle.innerHTML = title;
    modalContent.innerHTML = `
      ${body}
      <div style="margin-top: 16px; text-align: right;">
        <button id="modal-next-step-btn" class="btn-dialog btn-primary">${btnText}</button>
      </div>
    `;

    const nextBtn = document.getElementById('modal-next-step-btn');
    if (nextBtn) {
      nextBtn.onclick = onNext;
    }

    modalOverlay.classList.add('active');
  }

  close() {
    const modalOverlay = document.getElementById('info-modal');
    if (modalOverlay) {
      modalOverlay.classList.remove('active');
    }
  }
}