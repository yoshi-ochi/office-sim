// src/js/services/SheetService.js

export class SheetService {
  constructor(apiEndpoint) {
    this.apiEndpoint = apiEndpoint;
  }

  /**
   * GAS向けPOST通信共通メソッド
   * text/plain形式で送信することでCORS preflight（OPTIONSリクエスト）をスキップし、
   * リダイレクトやブラウザ制限によるデータ欠損を防止して確実にスプレッドシートへ書き込みます。
   */
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

  /**
   * クライアント側でのSHA-256暗号化ハッシュ計算（ソルト付加）
   * パスワード原文を通信路に乗せず、不可逆ハッシュ値のみを送信・保存します。
   */
  async hashPassword(password, salt) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + ":" + salt.toLowerCase());
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // --- 認証関連 ---

  /**
   * Googleアカウントの認可ステータスおよびユーザー情報の取得
   */
  async fetchAuthStatus() {
    try {
      const res = await fetch(`${this.apiEndpoint}?action=getAuthStatus`);
      return await res.json();
    } catch (e) {
      console.warn("AuthStatus取得失敗。ローカルテスト用フォールバックを使用します:", e);
      return {
        status: "success",
        email: "local-tester@example.com",
        name: "テスト社員",
        department: "DX開発部",
        role: "主任",
        hasPassword: true
      };
    }
  }

  /**
   * 暗号化ハッシュを送信してパスワードを検証
   */
  async verifyPassword(email, rawPassword) {
    const hash = await this.hashPassword(rawPassword, email);
    const res = await this.postToGas({ action: "verifyPassword", passwordHash: hash });
    return res || { status: "fail", message: "認証通信に失敗しました。" };
  }

  /**
   * 初回パスワードの暗号化登録・保存
   */
  async setPassword(email, rawPassword) {
    const hash = await this.hashPassword(rawPassword, email);
    return await this.postToGas({ action: "setPassword", passwordHash: hash });
  }

  // --- マスターデータ（辞書・業務フロー）取得 ---

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

  // --- フロアレイアウト ---

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

  // --- 自席業務連絡掲示板 ---

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

  // --- 社内チャット ---

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

  // --- トレーニング実績ログ ---

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

  // --- オフライン・通信切断時用フォールバックモック ---

  getMockDictionary() {
    return [
      { term: "稟議書（りんぎしょ）", category: "社内手続き", content: "決裁権限規定に基づく業務購入や契約締結のための社内申請書類。5万円以上の物品購入は自席の内線から総務部へ確認の上、起案します。" },
      { term: "複合機トナー交換手順", category: "オフィス機器", content: "各階複合機のトナーが切れた場合、備品棚から同一型番を取得し、レバーロックを解除して水平に抜き差しします。" },
      { term: "セキュリティカード紛失時対応", category: "セキュリティ", content: "即座に1F防災センターへ連絡しカードアクセスを失効させてください。" }
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
      { date: "2026/10/26 09:30", author: "総務部", category: "連絡", message: "本日の15:00より空調設備の一斉点検を行います。" },
      { date: "2026/10/26 11:15", author: "営業推進部", category: "共有", message: "週次営業進捗レポートの提出期限は今週金曜18:00までとなります。" }
    ];
  }

  getMockChatMessages(channelType) {
    if (channelType === 'floor') {
      return [
        { id: "m_f1", timestamp: "10:15", senderName: "佐藤 課長", message: "本日のフロアミーティングは14時から6F会議室です。" },
        { id: "m_f2", timestamp: "10:20", senderName: "鈴木 主任", message: "承知いたしました。資料準備しておきます。" }
      ];
    } else if (channelType === 'dm') {
      return [
        { id: "m_d1", timestamp: "11:00", senderName: "田中 相談役", message: "先ほどの研修マニュアル、非常に分かりやすかったです！" }
      ];
    }
    return [
      { id: "m_a1", timestamp: "09:00", senderName: "全社アナウンス", message: "おはようございます。本日もよろしくお願いいたします。" },
      { id: "m_a2", timestamp: "11:30", senderName: "人事総務", message: "健康診断の問診票を各席へ配布中ですのでご記入ください。" }
    ];
  }
}