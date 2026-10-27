// src/js/services/SheetService.js

export class SheetService {
  constructor(apiEndpoint) {
    this.apiEndpoint = apiEndpoint;
  }

  async postToGas(payload) {
    try {
      const res = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (e) {
      console.warn("GAS通信エラー:", e);
      return null;
    }
  }

  async hashPassword(password, salt) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + ":" + salt.toLowerCase());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // --- 認証系メソッド ---

  async checkEmail(email) {
    return await this.postToGas({ action: "checkEmail", email });
  }

  async verifyPassword(email, rawPassword) {
    const hash = await this.hashPassword(rawPassword, email);
    const res = await this.postToGas({ action: "verifyPassword", email, passwordHash: hash });
    return res || { status: "fail", message: "認証通信に失敗しました。" };
  }

  async setPassword(email, rawPassword) {
    const hash = await this.hashPassword(rawPassword, email);
    return await this.postToGas({ action: "setPassword", email, passwordHash: hash });
  }

  // --- マスターデータ取得 ---

  async fetchDictionary() {
    try {
      const res = await fetch(`${this.apiEndpoint}?action=getDictionary`);
      const data = await res.json();
      return (Array.isArray(data) && data.length > 0) ? data : this.getMockDictionary();
    } catch {
      return this.getMockDictionary();
    }
  }

  async fetchWorkflows() {
    try {
      const res = await fetch(`${this.apiEndpoint}?action=getWorkflows`);
      const data = await res.json();
      return (Array.isArray(data) && data.length > 0) ? data : this.getMockWorkflows();
    } catch {
      return this.getMockWorkflows();
    }
  }

  // --- レイアウト ---

  async fetchFloorLayout(floorId) {
    try {
      const res = await fetch(`${this.apiEndpoint}?action=getLayout&floor=${floorId}`);
      const data = await res.json();
      return (Array.isArray(data) && data.length > 0) ? data : null;
    } catch {
      return null;
    }
  }

  async saveFloorLayout(floorId, items) {
    return await this.postToGas({ action: "saveLayout", floor: floorId, items });
  }

  // --- 掲示板 ---

  async fetchBoardPosts() {
    try {
      const res = await fetch(`${this.apiEndpoint}?action=getBoardPosts`);
      const data = await res.json();
      return (Array.isArray(data) && data.length > 0) ? data : this.getMockBoardPosts();
    } catch {
      return this.getMockBoardPosts();
    }
  }

  async saveBoardPost(postData) {
    return await this.postToGas({ action: "saveBoardPost", post: postData });
  }

  // --- チャット ---

  async fetchChatMessages(channelType, channelTarget) {
    try {
      const res = await fetch(`${this.apiEndpoint}?action=getChatMessages&channelType=${channelType}&channelTarget=${channelTarget}`);
      const data = await res.json();
      return (Array.isArray(data) && data.length > 0) ? data : this.getMockChatMessages(channelType);
    } catch {
      return this.getMockChatMessages(channelType);
    }
  }

  async sendChatMessage(msgData) {
    return await this.postToGas({ action: "sendChatMessage", message: msgData });
  }

  // --- トレーニング実績 ---

  async fetchTrainingLogs() {
    try {
      const res = await fetch(`${this.apiEndpoint}?action=getTrainingLogs`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  async saveTrainingLog(logData) {
    return await this.postToGas({ action: "saveTrainingLog", log: logData });
  }

  // --- フォールバックモック ---

  getMockDictionary() {
    return [
      { term: "稟議書（りんぎしょ）", category: "社内手続き", content: "決裁権限規定に基づく業務購入や契約締結のための社内申請書類。" },
      { term: "複合機トナー交換手順", category: "オフィス機器", content: "各階複合機のトナーが切れた場合、備品棚から同一型番を取得し交換します。" }
    ];
  }

  getMockWorkflows() {
    return [
      { id: "wf_01", title: "週次営業進捗レポート配布", description: "営業課長・部長へ進捗書類を届け、サインを受領する。", relatedTaskId: "dist_01" },
      { id: "wf_02", title: "複合機トラブル・用紙詰まり解消", description: "カバーを開けてローラー挟まりを除去し、印刷を復旧させる。", relatedTaskId: "printer_event" },
      { id: "wf_03", title: "総務部備品受取・仕分け", description: "社内電話着信に応答し、2F総務部から備品を引き取る。", relatedTaskId: "phone_event" }
    ];
  }

  getMockBoardPosts() {
    return [
      { date: "2026/10/27 09:30", author: "総務部", category: "連絡", message: "本日の15:00より空調設備の一斉点検を行います。" }
    ];
  }

  getMockChatMessages(channelType) {
    return [
      { id: "m_1", timestamp: "10:15", senderName: "佐藤 課長", message: "本日のフロアミーティングは14時から6F会議室です。" }
    ];
  }
}
