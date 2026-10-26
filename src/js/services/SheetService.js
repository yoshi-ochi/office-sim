// src/js/services/SheetService.js

export class SheetService {
  constructor(apiEndpoint = null) {
    // Google Apps Script (Web App) または Sheets API のエンドポイント
    this.apiEndpoint = apiEndpoint;
    this.dictionaryCache = null;
    this.workflowCache = null;
  }

  // 1. 社内用語・業務マニュアル辞書の取得
  async fetchDictionary() {
    if (this.dictionaryCache) return this.dictionaryCache;

    if (!this.apiEndpoint) {
      this.dictionaryCache = this.getMockDictionary();
      return this.dictionaryCache;
    }

    try {
      const res = await fetch(`${this.apiEndpoint}?action=getDictionary`);
      const data = await res.json();
      this.dictionaryCache = data;
      return data;
    } catch (err) {
      console.warn("[SheetService] API取得失敗。ローカルモックを使用します:", err);
      this.dictionaryCache = this.getMockDictionary();
      return this.dictionaryCache;
    }
  }

  // 2. 業務フロー図定義の取得
  async fetchWorkflows() {
    if (this.workflowCache) return this.workflowCache;

    if (!this.apiEndpoint) {
      this.workflowCache = this.getMockWorkflows();
      return this.workflowCache;
    }

    try {
      const res = await fetch(`${this.apiEndpoint}?action=getWorkflows`);
      const data = await res.json();
      this.workflowCache = data;
      return data;
    } catch (err) {
      console.warn("[SheetService] ワークフロー取得失敗。ローカルモックを使用:", err);
      this.workflowCache = this.getMockWorkflows();
      return this.workflowCache;
    }
  }

  // オフライン/スタンドアロン用モック辞書
  getMockDictionary() {
    return [
      {
        term: "稟議書（りんぎしょ）",
        category: "社内手続き",
        content: "決裁権限規定に基づく業務購入や契約締結のための社内申請書類。5万円以上の物品購入は自席の内線から総務部へ確認の上、ワークフローシステムに起案します。"
      },
      {
        term: "複合機トナー交換手順",
        category: "オフィス機器",
        content: "各階複合機のトナーが切れた場合、自席の備品棚または2F総務部保管庫から同一型番を取得し、レバーロックを解除して水平に抜き差しします。"
      },
      {
        term: "セキュリティカード紛失時対応",
        category: "セキュリティ",
        content: "即座に1F防災センター（内線: 1109）へ連絡しカードアクセスを失効させてください。その後、自席PCから始末書テンプレートをダウンロードします。"
      },
      {
        term: "郵便物・社内便集配サイクル",
        category: "総務運用",
        content: "午前10:30および午後15:00の計2回、各階の郵便物受取ボックスから集荷が行われます。"
      }
    ];
  }

  // オフライン/スタンドアロン用モック業務フロー
  getMockWorkflows() {
    return [
      {
        id: "wf_01",
        title: "週次営業進捗レポート配布",
        description: "営業課長・部長へ進捗書類を届け、確認サインを受領する。",
        relatedTaskId: "dist_01"
      },
      {
        id: "wf_02",
        title: "複合機トラブル・用紙詰まり解消",
        description: "カバーを開けてローラー挟まりを除去し、印刷を正常復旧させる。",
        relatedTaskId: "printer_event"
      },
      {
        id: "wf_03",
        title: "総務部備品受取・仕分け",
        description: "社内電話着信に応答し、2F総務部から備品を引き取って配備する。",
        relatedTaskId: "phone_event"
      }
    ];
  }
}