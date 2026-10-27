// src/js/services/SheetService.js
export class SheetService {
  constructor(apiEndpoint) {
    this.apiEndpoint = apiEndpoint;
  }

  // クライアント側でのSHA-256暗号化ハッシュ計算（ソルト付加）
  async hashPassword(password, salt) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + ":" + salt.toLowerCase());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // Google認証ステータスとユーザー情報を取得
  async fetchAuthStatus() {
    try {
      const res = await fetch(`${this.apiEndpoint}?action=getAuthStatus`);
      return await res.json();
    } catch {
      // オフラインモック
      return {
        status: "success",
        email: "yoshi@example.com",
        name: "落合 慶亮",
        department: "DX開発部",
        role: "主任",
        hasPassword: true
      };
    }
  }

  // 暗号化ハッシュを送信してパスワード認証
  async verifyPassword(email, rawPassword) {
    const hash = await this.hashPassword(rawPassword, email);
    try {
      const res = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "verifyPassword", passwordHash: hash })
      });
      return await res.json();
    } catch {
      // オフライン用フォールバック
      if (rawPassword === "pass123") {
        return {
          status: "success",
          user: { email, name: "落合 慶亮", department: "DX開発部", role: "主任" }
        };
      }
      return { status: "fail", message: "認証に失敗しました。" };
    }
  }

  // 初回パスワードの暗号化登録
  async setPassword(email, rawPassword) {
    const hash = await this.hashPassword(rawPassword, email);
    try {
      const res = await fetch(this.apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "setPassword", passwordHash: hash })
      });
      return await res.json();
    } catch {
      return { status: "success" };
    }
  }

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
    try {
      await fetch(this.apiEndpoint, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveLayout", floor: floorId, items })
      });
      return true;
    } catch {
      return false;
    }
  }

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
    try {
      await fetch(this.apiEndpoint, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveBoardPost", post: postData })
      });
      return true;
    } catch {
      return false;
    }
  }

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
    try {
      await fetch(this.apiEndpoint, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sendChatMessage", message: msgData })
      });
      return true;
    } catch {
      return false;
    }
  }

  async saveTrainingLog(logData) {
    try {
      await fetch(this.apiEndpoint, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveTrainingLog", log: logData })
      });
      return true;
    } catch {
      return false;
    }
  }

  async fetchTrainingLogs() {
    try {
      const res = await fetch(`${this.apiEndpoint}?action=getTrainingLogs`);
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

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
      { date: "2026/10/26 09:30", author: "総務部", category: "連絡", message: "本日の15:00より空調設備の一斉点検を行います。" }
    ];
  }

  getMockChatMessages(channelType) {
    return [
      { id: "m_1", timestamp: "10:15", senderName: "佐藤 課長", message: "本日のフロアミーティングは14時から6F会議室です。" }
    ];
  }
}