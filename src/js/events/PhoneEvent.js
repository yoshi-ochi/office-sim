// src/js/events/PhoneEvent.js

export class PhoneEvent {
  constructor(uiCallbacks) {
    this.callbacks = uiCallbacks;
    this.tasks = [
      {
        title: "内線着信: 1F 総合受付より",
        message: "「3Fの担当者様宛てに重要書類のバイク便が到着しています。1F総合受付カウンターまで受領印をお持ちの上お越しいただけますでしょうか。」",
        actionRequired: "1F エントランスへ移動して書類を受け取る"
      },
      {
        title: "内線着信: 2F 総務部より",
        message: "「先ほど発注いただいた備品（ボールペン・付箋・A4コピー用紙箱）の仕分けが完了しました。2F備品管理室までピックアップをお願いできますか。」",
        actionRequired: "2F 総務部備品棚へ向かう"
      },
      {
        title: "内線着信: 4F DX開発部より",
        message: "「フロア複合機のネットワークIPアドレスが競合している可能性があります。本体パネルのネットワーク設定からDHCPの再取得を実行していただけますか。」",
        actionRequired: "フロア複合機の詳細パネルを開く"
      }
    ];
  }

  trigger(targetMesh) {
    // ランダムタスクを1件選定
    const task = this.tasks[Math.floor(Math.random() * this.tasks.length)];

    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    const modalOverlay = document.getElementById('info-modal');

    if (!modalTitle || !modalContent || !modalOverlay) return;

    modalTitle.innerHTML = `📞 ${task.title}`;
    modalContent.innerHTML = `
      <div style="font-size: 15px; font-style: italic; color: #37474f; background: #eceff1; padding: 12px; border-radius: 8px; margin-bottom: 12px;">
        ${task.message}
      </div>
      <div style="font-size: 13px; font-weight: bold; color: #d32f2f;">
        📌 発生業務タスク: ${task.actionRequired}
      </div>
      <div style="margin-top: 16px; text-align: right;">
        <button id="phone-accept-btn" class="btn-dialog btn-primary">承知しました（受託）</button>
      </div>
    `;

    const acceptBtn = document.getElementById('phone-accept-btn');
    if (acceptBtn) {
      acceptBtn.onclick = () => {
        modalOverlay.classList.remove('active');
        alert(`【タスク受託完了】\n『${task.actionRequired}』がタスクキューに登録されました。`);
      };
    }

    modalOverlay.classList.add('active');
  }
}