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
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

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

  async fetchFloorLayout(floorId) {
    try {
      const res = await fetch(`${this.apiEndpoint}?action=getLayout&floor=${floorId}`);
      const data = await res.json();
      return (Array.isArray(data) && data.length > 0) ? data : null;
    } catch { return null; }
  }

  async saveFloorLayout(floorId, items) {
    return await this.postToGas({ action: "saveLayout", floor: floorId, items });
  }

  async fetchBoardPosts() {
    try {
      const res = await fetch(`${this.apiEndpoint}?action=getBoardPosts`);
      return await res.json();
    } catch { return []; }
  }

  async saveBoardPost(postData) {
    return await this.postToGas({ action: "saveBoardPost", post: postData });
  }

  async fetchChatMessages(channelType, channelTarget) {
    try {
      const res = await fetch(`${this.apiEndpoint}?action=getChatMessages&channelType=${channelType}&channelTarget=${channelTarget}`);
      return await res.json();
    } catch { return []; }
  }

  async sendChatMessage(msgData) {
    return await this.postToGas({ action: "sendChatMessage", message: msgData });
  }

  async fetchDictionary() {
    try {
      const res = await fetch(`${this.apiEndpoint}?action=getDictionary`);
      return await res.json();
    } catch { return []; }
  }

  async fetchWorkflows() {
    try {
      const res = await fetch(`${this.apiEndpoint}?action=getWorkflows`);
      return await res.json();
    } catch { return []; }
  }

  async fetchTrainingLogs() {
    try {
      const res = await fetch(`${this.apiEndpoint}?action=getTrainingLogs`);
      return await res.json();
    } catch { return []; }
  }

  async saveTrainingLog(logData) {
    return await this.postToGas({ action: "saveTrainingLog", log: logData });
  }

  async saveDictionaryTerm(termData) {
    return await this.postToGas({ action: "saveDictionaryTerm", term: termData });
  }

  async saveWorkflows(rows) {
    return await this.postToGas({ action: "saveWorkflows", rows });
  }
}