// src/js/main.js 先頭
const t = Date.now();
import { CONFIG } from './config.js';
import { FurnitureFactory } from './entities/Furniture.js';
import { Player } from './entities/Player.js';

class SheetService {
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
    return await this.postToGas({ action: "saveLayout", floor: floorId, items });
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
    return await this.postToGas({ action: "saveBoardPost", post: postData });
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
    return await this.postToGas({ action: "sendChatMessage", message: msgData });
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

  async saveTrainingLog(logData) {
    return await this.postToGas({ action: "saveTrainingLog", log: logData });
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
      { date: "2026/10/27 09:30", author: "総務部", category: "連絡", message: "本日の15:00より空調設備の一斉点検を行います。" }
    ];
  }

  getMockChatMessages(channelType) {
    return [
      { id: "m_1", timestamp: "10:15", senderName: "佐藤 課長", message: "本日のフロアミーティングは14時から6F会議室です。" }
    ];
  }
}

class OfficeSimApp {
  constructor() {
    this.currentFloor = 3;
    this.floorObjects = [];
    this.isEditMode = false;
    this.selectedObject = null;
    this.isDragging = false;
    this.boxHelper = null;

    this.inputVector = { x: 0, y: 0 };
    this.keys = {};
    this.activeTargets = [];
    this.pulseTimer = 0;

    this.trainingStartTime = 0;
    this.currentTrainingTaskId = null;

    this.collidingObject = null;
    this.collisionTimer = 0;
    this.isModalActive = false;

    this.currentUser = null;

    this.chatChannel = 'all';
    this.chatTarget = 'all';
    this.chatPollInterval = null;

    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  init() {
    const container = document.getElementById('canvas-container');

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xd7e0e5);

    const aspect = window.innerWidth / window.innerHeight;
    const d = CONFIG.CAMERA_VIEW_SIZE;
    this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
    this.updateCamera(0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xfff6e5, 0.65);
    dirLight.position.set(30, 45, 30);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    this.scene.add(dirLight);

    const floorGeo = new THREE.PlaneGeometry(CONFIG.FIELD_SIZE, CONFIG.FIELD_SIZE);
    this.floorMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.85 });
    this.floorPlane = new THREE.Mesh(floorGeo, this.floorMat);
    this.floorPlane.rotation.x = -Math.PI / 2;
    this.floorPlane.receiveShadow = true;
    this.scene.add(this.floorPlane);

    const grid = new THREE.GridHelper(CONFIG.FIELD_SIZE, CONFIG.GRID_DIVISIONS, 0x81c784, 0xdcdcdc);
    grid.position.y = 0.005;
    this.scene.add(grid);

    this.player = new Player(this.scene);
    this.sheetService = new SheetService(CONFIG.GAS_API_URL);

    this.loadFloor(this.currentFloor);
    this.setupEvents();
    this.animate();
  }

  updateCamera(targetX, targetZ) {
    this.camera.position.set(targetX + CONFIG.CAMERA_DISTANCE, CONFIG.CAMERA_ELEVATION, targetZ + CONFIG.CAMERA_DISTANCE);
    this.camera.lookAt(targetX, 0, targetZ);
  }

  checkCollision(x, z) {
    for (const obj of this.floorObjects) {
      if (this.isEditMode && this.isDragging && this.selectedObject === obj) continue;
      const r = obj.userData.collisionRadius || 0.65;
      const dx = x - obj.position.x;
      const dz = z - obj.position.z;
      if (Math.hypot(dx, dz) < (CONFIG.PLAYER_RADIUS + r)) {
        return obj;
      }
    }
    return null;
  }

  async loadFloor(floorId) {
    this.floorObjects.forEach(obj => {
      this.scene.remove(obj);
      obj.traverse(child => {
        if (child.isMesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) child.material.forEach(m => m.dispose());
            else child.material.dispose();
          }
        }
      });
    });
    this.floorObjects = [];
    if (this.boxHelper) {
      this.scene.remove(this.boxHelper);
      this.boxHelper = null;
    }

    const floorInfo = CONFIG.FLOORS.find(f => f.id === floorId);
    if (floorInfo) this.floorMat.color.setHex(floorInfo.color);

    let layout = await this.sheetService.fetchFloorLayout(floorId);
    if (!layout || layout.length === 0) {
      layout = [
        { type: 'desk', x: -4, z: -4, rotation: 0, role: '自席', person: '自分', isMySeat: true },
        { type: 'chair', x: -4, z: -3.2, rotation: 0 },
        { type: 'phone', x: -4.5, z: -4, rotation: 0, role: '社内内線電話' },
        { type: 'board', x: -3.2, z: -4.5, rotation: 0, role: '業務連絡掲示板' },
        { type: 'desk', x: 2, z: -4, rotation: 0, role: '課長', person: '佐藤 課長', distNeeded: 'dist_01' },
        { type: 'chair', x: 2, z: -3.2, rotation: 0 },
        { type: 'desk', x: 6, z: -4, rotation: 0, role: 'リーダー', person: '鈴木 主任', distNeeded: 'dist_04' },
        { type: 'chair', x: 6, z: -3.2, rotation: 0 },
        { type: 'printer', x: 10, z: 2, rotation: 0, role: 'フロア複合機', isPrinter: true },
        { type: 'locker', x: -10, z: -8, rotation: 0, role: '個人用ロッカー' },
        { type: 'partition', x: 0, z: -1, rotation: 0 }
      ];
    }

    layout.forEach(data => {
      const furniture = FurnitureFactory.create(data.type, data);
      this.scene.add(furniture);
      this.floorObjects.push(furniture);
    });

    // --- エレベーター & 階段を常設 (コア設備) ---
    if (!this.floorObjects.some(o => o.userData.isElevator)) {
      const elv = FurnitureFactory.create('elevator', { x: -9, z: -10, rotation: 0, role: 'エレベーター' });
      this.scene.add(elv);
      this.floorObjects.push(elv);
    }

    if (!this.floorObjects.some(o => o.userData.isStairs)) {
      const str = FurnitureFactory.create('stairs', { x: 9, z: -10, rotation: 0, role: '連絡階段' });
      this.scene.add(str);
      this.floorObjects.push(str);
    }
  }

  spawnFurnitureInFrontOfPlayer(type) {
    const fwd = this.player.getForwardVector();
    const snapX = Math.round((this.player.position.x + fwd.x * 1.5) / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
    const snapZ = Math.round((this.player.position.z + fwd.z * 1.5) / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;

    const newObj = FurnitureFactory.create(type, {
      x: snapX,
      z: snapZ,
      rotation: this.player.targetRotation
    });

    this.scene.add(newObj);
    this.floorObjects.push(newObj);
    this.selectFurniture(newObj);
  }

  selectFurniture(obj) {
    this.selectedObject = obj;
    if (this.boxHelper) this.scene.remove(this.boxHelper);
    this.boxHelper = new THREE.BoxHelper(this.selectedObject, 0xffff00);
    this.scene.add(this.boxHelper);
  }

  async syncCurrentLayoutToSheet() {
    const items = this.floorObjects.map(obj => ({
      floor: this.currentFloor,
      type: obj.userData.type,
      x: obj.position.x,
      z: obj.position.z,
      rotation: obj.rotation.y,
      role: obj.userData.role,
      person: obj.userData.person,
      distNeeded: obj.userData.distNeeded || ""
    }));
    const res = await this.sheetService.saveFloorLayout(this.currentFloor, items);
    if (res && res.status === 'success') {
      alert(`フロア ${this.currentFloor}F のレイアウトをスプレッドシートに保存しました。`);
    }
  }

  async loadChatMessages() {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const messages = await this.sheetService.fetchChatMessages(this.chatChannel, this.chatTarget);
    container.innerHTML = '';

    messages.forEach(m => {
      const isSelf = this.currentUser && m.senderName === this.currentUser.name;
      const msgDiv = document.createElement('div');
      msgDiv.className = `chat-msg ${isSelf ? 'self' : 'other'}`;
      msgDiv.innerHTML = `
        <div class="chat-msg-meta">${m.senderName} • ${m.timestamp}</div>
        <div>${m.message}</div>
      `;
      container.appendChild(msgDiv);
    });
    container.scrollTop = container.scrollHeight;
  }

  async sendCurrentChatMessage() {
    const input = document.getElementById('chat-input-text');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    const sender = this.currentUser ? this.currentUser.name : '匿名社員';
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const msgObj = {
      id: `msg_${Date.now()}`,
      timestamp: timeStr,
      channelType: this.chatChannel,
      channelTarget: this.chatTarget,
      senderName: sender,
      message: text
    };

    input.value = '';
    const container = document.getElementById('chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-msg self';
    msgDiv.innerHTML = `<div class="chat-msg-meta">${sender} • ${timeStr}</div><div>${text}</div>`;
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;

    await this.sheetService.sendChatMessage(msgObj);
  }

  setupEvents() {
    const passwordRegex = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]{4,20}$/;
    let currentAuthEmail = "";
    let currentAuthUserData = null;

    document.getElementById('btn-check-email')?.addEventListener('click', async () => {
      const email = document.getElementById('login-email').value.trim();
      if (!email) {
        alert("メールアドレスを入力してください。");
        return;
      }

      const res = await this.sheetService.checkEmail(email);
      if (res && res.status === 'success') {
        currentAuthEmail = email;
        currentAuthUserData = res.user;

        document.getElementById('step-email-area').style.display = 'none';

        if (res.hasPassword) {
          document.getElementById('password-form-area').style.display = 'block';
          document.getElementById('login-user-name').innerText = `👤 ${res.user.name} (${res.user.role})`;
        } else {
          document.getElementById('setup-form-area').style.display = 'block';
          document.getElementById('setup-user-name').innerText = `👤 ${res.user.name} (${res.user.role})`;
        }
      } else {
        alert(res ? res.message : "アクセスが拒否されました。登録済みのメールアドレスではありません。");
      }
    });

    document.getElementById('btn-login-exec')?.addEventListener('click', async () => {
      const pass = document.getElementById('login-password').value;
      if (!passwordRegex.test(pass)) {
        alert("パスワードは4〜20文字の半角英数字・記号で入力してください。");
        return;
      }

      const res = await this.sheetService.verifyPassword(currentAuthEmail, pass);
      if (res && res.status === 'success') {
        this.currentUser = res.user;
        document.getElementById('user-badge').innerText = `👤 ${this.currentUser.name} (${this.currentUser.role})`;
        document.getElementById('login-overlay').style.display = 'none';
        this.loadFloor(this.currentFloor);
      } else {
        alert(res ? res.message : "パスワードが正しくありません。");
      }
    });

    document.getElementById('btn-setup-exec')?.addEventListener('click', async () => {
      const newPass = document.getElementById('setup-password').value;
      if (!passwordRegex.test(newPass)) {
        alert("設定するパスワードは4〜20文字の半角英数字・記号で入力してください。");
        return;
      }

      const res = await this.sheetService.setPassword(currentAuthEmail, newPass);
      if (res && res.status === 'success') {
        alert("パスワードを設定しました。サインインします。");
        this.currentUser = currentAuthUserData;
        document.getElementById('user-badge').innerText = `👤 ${this.currentUser.name} (${this.currentUser.role})`;
        document.getElementById('login-overlay').style.display = 'none';
        this.loadFloor(this.currentFloor);
      } else {
        alert("パスワード設定に失敗しました。");
      }
    });

    document.getElementById('btn-history')?.addEventListener('click', async () => {
      if (!this.currentUser) return;
      const logs = await this.sheetService.fetchTrainingLogs();
      let html = '<div style="max-height: 280px; overflow-y: auto;">';
      if (logs.length === 0) {
        html += '<p style="color: #78909c; font-size: 13px;">まだ完了したトレーニング履歴はありません。</p>';
      } else {
        logs.slice().reverse().forEach(l => {
          html += `
            <div style="border-bottom: 1px solid #e2e8f0; padding: 8px 0; font-size: 13px;">
              <div style="font-weight: bold; color: #1e293b;">🎯 ${l.taskTitle}</div>
              <div style="display: flex; justify-content: space-between; color: #64748b; font-size: 11px; margin-top: 4px;">
                <span>スコア: <strong style="color: #16a34a;">${l.score}点</strong> (所要時間: ${l.clearTimeSec}秒)</span>
                <span>${l.timestamp}</span>
              </div>
            </div>
          `;
        });
      }
      html += '</div>';
      this.showModal(`📊 ${this.currentUser.name} さんの受講・実績履歴`, html);
    });

    window.addEventListener('resize', () => {
      const aspect = window.innerWidth / window.innerHeight;
      const d = CONFIG.CAMERA_VIEW_SIZE;
      this.camera.left = -d * aspect;
      this.camera.right = d * aspect;
      this.camera.top = d;
      this.camera.bottom = -d;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    window.addEventListener('keydown', e => {
      if (e && e.key) {
        this.keys[e.key.toLowerCase()] = true;
      }
    });

    window.addEventListener('keyup', e => {
      if (e && e.key) {
        this.keys[e.key.toLowerCase()] = false;
      }
    });

    const zone = document.getElementById('joystick-zone');
    const knob = document.getElementById('joystick-knob');
    let active = false, startX = 0, startY = 0;

    zone.addEventListener('pointerdown', e => {
      active = true;
      const rect = zone.getBoundingClientRect();
      startX = rect.left + rect.width / 2;
      startY = rect.top + rect.height / 2;
    });

    window.addEventListener('pointermove', e => {
      if (!active) return;
      let dx = e.clientX - startX;
      let dy = e.clientY - startY;
      let dist = Math.hypot(dx, dy);
      const maxR = 45;
      if (dist > maxR) {
        dx = (dx / dist) * maxR;
        dy = (dy / dist) * maxR;
        dist = maxR;
      }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;

      const rad = Math.atan2(dy, dx) - Math.PI / 4;
      const norm = dist / maxR;
      this.inputVector.x = Math.cos(rad) * norm;
      this.inputVector.y = Math.sin(rad) * norm;
    });

    const endJoy = () => {
      active = false;
      knob.style.transform = 'translate(0px, 0px)';
      this.inputVector = { x: 0, y: 0 };
    };
    window.addEventListener('pointerup', endJoy);
    window.addEventListener('pointercancel', endJoy);

    document.getElementById('floor-select')?.addEventListener('change', e => {
      const selected = parseInt(e.target.value, 10);
      this.changeFloorWithTransition(selected, false);
    });

    const chatDrawer = document.getElementById('chat-drawer');
    document.getElementById('btn-chat-toggle')?.addEventListener('click', () => {
      chatDrawer.classList.add('open');
      this.loadChatMessages();
      if (!this.chatPollInterval) {
        this.chatPollInterval = setInterval(() => this.loadChatMessages(), 5000);
      }
    });

    document.getElementById('btn-chat-close')?.addEventListener('click', () => {
      chatDrawer.classList.remove('open');
      if (this.chatPollInterval) {
        clearInterval(this.chatPollInterval);
        this.chatPollInterval = null;
      }
    });

    document.querySelectorAll('.chat-tab-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        document.querySelectorAll('.chat-tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.chatChannel = e.target.getAttribute('data-channel');
        this.chatTarget = this.chatChannel === 'floor' ? String(this.currentFloor) : 'all';
        this.loadChatMessages();
      });
    });

    document.getElementById('chat-send-btn')?.addEventListener('click', () => this.sendCurrentChatMessage());
    document.getElementById('chat-input-text')?.addEventListener('keypress', e => {
      if (e.key === 'Enter') this.sendCurrentChatMessage();
    });

    const editBtn = document.getElementById('btn-edit-mode');
    const rotateBtn = document.getElementById('rotate-btn');
    const palette = document.getElementById('furniture-palette');

    editBtn?.addEventListener('click', () => {
      this.isEditMode = !this.isEditMode;
      editBtn.classList.toggle('active', this.isEditMode);
      editBtn.innerText = this.isEditMode ? "保存して終了" : "家具配置";

      if (rotateBtn) rotateBtn.style.display = this.isEditMode ? "flex" : "none";
      if (palette) palette.classList.toggle('active', this.isEditMode);

      if (!this.isEditMode) {
        this.syncCurrentLayoutToSheet();
        if (this.boxHelper) {
          this.scene.remove(this.boxHelper);
          this.boxHelper = null;
        }
        this.selectedObject = null;
      }
    });

    document.querySelectorAll('.palette-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const type = e.target.getAttribute('data-type');
        if (type) this.spawnFurnitureInFrontOfPlayer(type);
      });
    });

    document.getElementById('btn-palette-close')?.addEventListener('click', () => {
      if (palette) palette.classList.remove('active');
    });

    rotateBtn?.addEventListener('click', () => {
      if (this.selectedObject) {
        this.selectedObject.rotation.y += Math.PI / 2;
        if (this.boxHelper) this.boxHelper.update();
      }
    });

    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', e => {
      if (!this.isEditMode) return;
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const hits = this.raycaster.intersectObjects(this.floorObjects, true);

      if (hits.length > 0) {
        let root = hits[0].object;
        while (root.parent && root.parent !== this.scene) root = root.parent;
        this.selectFurniture(root);
        this.isDragging = true;
      }
    });

    window.addEventListener('pointermove', e => {
      if (!this.isEditMode || !this.isDragging || !this.selectedObject) return;
      this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const hits = this.raycaster.intersectObject(this.floorPlane);
      if (hits.length > 0) {
        const p = hits[0].point;
        const max = (CONFIG.FIELD_SIZE / 2) - 1.0;
        this.selectedObject.position.x = Math.max(-max, Math.min(max, Math.round(p.x / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE));
        this.selectedObject.position.z = Math.max(-max, Math.min(max, Math.round(p.z / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE));
        if (this.boxHelper) this.boxHelper.update();
      }
    });

    window.addEventListener('pointerup', () => { this.isDragging = false; });

    document.getElementById('btn-dictionary')?.addEventListener('click', async () => {
      const terms = await this.sheetService.fetchDictionary();
      let html = '<div style="max-height: 280px; overflow-y: auto;">';
      terms.forEach(t => {
        html += `<div style="margin-bottom: 12px; border-bottom: 1px solid #eee; padding-bottom: 6px;">
          <div style="font-weight: bold; color: #1565c0;">[${t.category || '一般'}] ${t.term}</div>
          <div style="font-size: 13px; color: #424242; margin-top: 4px;">${t.content}</div>
        </div>`;
      });
      html += '</div>';
      this.showModal("📖 社内マニュアル・用語辞書 (自席参照)", html);
    });

    document.getElementById('btn-workflow')?.addEventListener('click', async () => {
      const flows = await this.sheetService.fetchWorkflows();
      let html = '<p style="margin-bottom: 10px; font-size: 12px; color: #757575;">フローをタップすると、該当のシミュレーション業務が起動します。</p>';
      html += '<div style="display: flex; flex-direction: column; gap: 8px;">';
      flows.forEach(f => {
        html += `<button class="btn-wf-item" data-task="${f.relatedTaskId}" style="text-align: left; background: #f5f5f5; border: 1px solid #ccc; padding: 10px; border-radius: 6px; cursor: pointer;">
          <strong style="color: #2e7d32;">▶ ${f.title}</strong>
          <div style="font-size: 12px; color: #616161; margin-top: 2px;">${f.description}</div>
        </button>`;
      });
      html += '</div>';
      this.showModal("📋 業務フロー図・タスク起動", html);

      document.querySelectorAll('.btn-wf-item').forEach(btn => {
        btn.addEventListener('click', e => {
          const taskId = e.currentTarget.getAttribute('data-task');
          this.closeModal();
          if (taskId === 'printer_event') this.triggerPrinter();
          else if (taskId === 'phone_event') this.triggerPhone();
          else this.startDistributionTraining(taskId);
        });
      });
    });

    document.getElementById('modal-close-btn')?.addEventListener('click', () => this.closeModal());
  }

  handleTriggerObject(obj) {
    if (this.isEditMode) {
      this.selectFurniture(obj);
      return;
    }

    const data = obj.userData;
    if (data.isElevator) {
      this.triggerElevator();
    } else if (data.isStairs) {
      this.triggerStairs();
    } else if (data.isPrinter) {
      this.triggerPrinter();
    } else if (data.type === 'phone') {
      this.triggerPhone();
    } else if (data.type === 'board') {
      this.triggerBoard();
    } else {
      this.showModal(`${data.role} のデスク`, `
        <strong>氏名:</strong> ${data.person}<br>
        <strong>必要配布物:</strong> ${data.distNeeded ? '【要配布】' + data.distNeeded : '特になし'}<br>
        <strong>状況:</strong> 通常業務中
      `);
    }
  }

  // --- エレベーター操作盤モーダル ---
  triggerElevator() {
    let buttonsHtml = '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 12px;">';
    CONFIG.FLOORS.forEach(f => {
      const isCurrent = f.id === this.currentFloor;
      buttonsHtml += `
        <button class="btn-elv-floor" data-floor="${f.id}" style="
          padding: 12px 8px; border-radius: 8px; font-weight: bold; font-size: 13px; cursor: ${isCurrent ? 'default' : 'pointer'};
          border: 1.5px solid ${isCurrent ? '#00897b' : '#cfd8dc'};
          background: ${isCurrent ? '#e0f2f1' : '#ffffff'};
          color: ${isCurrent ? '#004d40' : '#37474f'};
        " ${isCurrent ? 'disabled' : ''}>
          🛗 ${f.id}F ${f.name} ${isCurrent ? '【現在地】' : ''}
        </button>
      `;
    });
    buttonsHtml += '</div>';

    this.showModal("🛗 エレベーター操作盤", `
      <p style="font-size: 13px; color: #546e7a; margin-bottom: 6px;">移動したい目的フロアを選択してください。</p>
      ${buttonsHtml}
    `);

    document.querySelectorAll('.btn-elv-floor').forEach(btn => {
      btn.addEventListener('click', e => {
        const target = parseInt(e.currentTarget.getAttribute('data-floor'), 10);
        if (target !== this.currentFloor) {
          this.changeFloorWithTransition(target, 'elevator');
        }
      });
    });
  }

  // --- 連絡階段モーダル ---
  triggerStairs() {
    const prevFloor = this.currentFloor > 1 ? this.currentFloor - 1 : null;
    const nextFloor = this.currentFloor < CONFIG.FLOORS.length ? this.currentFloor + 1 : null;

    let html = `
      <p style="font-size: 13px; color: #546e7a; margin-bottom: 16px;">
        現在地: <strong>${this.currentFloor}F</strong><br>
        連絡階段を使って上下のフロアへ徒歩で移動します。
      </p>
      <div style="display: flex; flex-direction: column; gap: 12px;">
    `;

    if (nextFloor) {
      const fInfo = CONFIG.FLOORS.find(f => f.id === nextFloor);
      html += `
        <button class="btn-stair-move" data-floor="${nextFloor}" style="padding: 14px; background: #e3f2fd; border: 1.5px solid #2196f3; color: #0d47a1; font-weight: bold; border-radius: 8px; cursor: pointer; text-align: left;">
          ⬆️ 1フロア上がる（${nextFloor}F ${fInfo ? fInfo.name : ''}）
        </button>
      `;
    }

    if (prevFloor) {
      const fInfo = CONFIG.FLOORS.find(f => f.id === prevFloor);
      html += `
        <button class="btn-stair-move" data-floor="${prevFloor}" style="padding: 14px; background: #fff3e0; border: 1.5px solid #ff9800; color: #e65100; font-weight: bold; border-radius: 8px; cursor: pointer; text-align: left;">
          ⬇️ 1フロア下りる（${prevFloor}F ${fInfo ? fInfo.name : ''}）
        </button>
      `;
    }

    html += '</div>';

    this.showModal("🪜 連絡階段", html);

    document.querySelectorAll('.btn-stair-move').forEach(btn => {
      btn.addEventListener('click', e => {
        const target = parseInt(e.currentTarget.getAttribute('data-floor'), 10);
        this.changeFloorWithTransition(target, 'stairs');
      });
    });
  }

  // --- フロア切り替えとプレイヤー再配置 ---
  changeFloorWithTransition(targetFloor, arrivalType = 'elevator') {
    this.closeModal();
    this.currentFloor = targetFloor;

    const floorSelect = document.getElementById('floor-select');
    if (floorSelect) floorSelect.value = String(targetFloor);

    if (this.chatChannel === 'floor') {
      this.chatTarget = String(targetFloor);
      this.loadChatMessages();
    }

    this.cancelTraining();
    this.loadFloor(targetFloor);

    // 移動方法に応じて出現位置を切り替え（接触ループを防ぐため手前へオフセット）
    if (arrivalType === 'elevator') {
      this.player.position.set(-9, 0, -8);
    } else if (arrivalType === 'stairs') {
      this.player.position.set(9, 0, -8);
    } else {
      this.player.position.set(0, 0, 0);
    }
    this.player.targetRotation = 0;
  }

  async triggerBoard() {
    const posts = await this.sheetService.fetchBoardPosts();
    let listHtml = '<div style="max-height: 200px; overflow-y: auto; margin-bottom: 16px; border: 1px solid #cfd8dc; border-radius: 8px; padding: 8px; background: #fafafa;">';
    posts.slice().reverse().forEach(p => {
      listHtml += `
        <div style="border-bottom: 1px solid #e0e0e0; padding: 8px 0;">
          <div style="display: flex; justify-content: space-between; font-size: 11px; color: #78909c;">
            <span>[${p.category || '連絡'}] <strong>${p.author || '社員'}</strong></span>
            <span>${p.date || ''}</span>
          </div>
          <div style="color: #37474f; font-size: 13px; margin-top: 4px; line-height: 1.4;">${p.message}</div>
        </div>
      `;
    });
    listHtml += '</div>';

    const defaultAuthor = this.currentUser ? this.currentUser.name : '社員';
    const formHtml = `
      <div style="background: #f0f4f8; padding: 12px; border-radius: 8px;">
        <div style="font-weight: bold; font-size: 13px; margin-bottom: 8px; color: #37474f;">📌 掲示板に新規投稿</div>
        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
          <input type="text" id="board-author" value="${defaultAuthor}" style="flex: 1; padding: 6px 10px; border: 1px solid #b0bec5; border-radius: 6px; font-size: 12px;">
          <select id="board-category" style="padding: 6px 10px; border: 1px solid #b0bec5; border-radius: 6px; font-size: 12px; background: #fff;">
            <option value="連絡">連絡</option>
            <option value="共有">共有</option>
            <option value="急募">急募</option>
            <option value="依頼">依頼</option>
          </select>
        </div>
        <textarea id="board-message" placeholder="掲示内容を入力してください..." rows="2" style="width: 100%; box-sizing: border-box; padding: 8px; border: 1px solid #b0bec5; border-radius: 6px; font-size: 12px; resize: none;"></textarea>
        <div style="text-align: right; margin-top: 8px;">
          <button id="board-submit-btn" class="btn-dialog btn-primary" style="padding: 6px 14px; font-size: 12px;">掲示板に投稿</button>
        </div>
      </div>
    `;

    this.showModal("📌 自席の業務連絡掲示板", listHtml + formHtml);

    document.getElementById('board-submit-btn')?.addEventListener('click', async () => {
      const author = document.getElementById('board-author').value.trim() || defaultAuthor;
      const category = document.getElementById('board-category').value;
      const message = document.getElementById('board-message').value.trim();

      if (!message) return;
      const now = new Date();
      const dateStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      await this.sheetService.saveBoardPost({
        id: `post_${Date.now()}`,
        date: dateStr,
        author: author,
        category: category,
        message: message
      });
      alert("掲示板に投稿しました！");
      this.closeModal();
    });
  }

  triggerPrinter() {
    this.showModal("複合機トラブル: 用紙詰まり (C-1301)", `
      <div style="background: #ffebee; border-left: 4px solid #f44336; padding: 8px 12px; margin-bottom: 12px; color: #c62828; font-weight: bold;">
        エラー: カセット1から給紙中に紙詰まりが発生しました。
      </div>
      <p>右側面のレバーAを引き上げてカバーを開け、ローラーに挟まった用紙をゆっくり両手で引き抜いてください。</p>
      <div style="margin-top: 16px; text-align: right;">
        <button id="jam-fix-btn" class="btn-dialog btn-primary">用紙を取り除いてカバーを閉じる</button>
      </div>
    `);
    document.getElementById('jam-fix-btn')?.addEventListener('click', () => {
      this.closeModal();
      alert("🎉 複合機の紙詰まりが解消され、印刷キューが再開しました！");
    });
  }

  triggerPhone() {
    this.showModal("📞 内線着信: 1F 総合受付より", `
      <div style="background: #eceff1; padding: 12px; border-radius: 8px; margin-bottom: 12px; font-style: italic;">
        「3Fの担当者様宛てに重要書類のバイク便が到着しています。1F総合受付カウンターまで受領印をお持ちの上お越しいただけますでしょうか。」
      </div>
      <p style="color: #d32f2f; font-weight: bold;">📌 発生タスク: 1F エントランスへ移動して書類を受け取る</p>
      <div style="margin-top: 16px; text-align: right;">
        <button id="phone-ok-btn" class="btn-dialog btn-primary">受託する</button>
      </div>
    `);
    document.getElementById('phone-ok-btn')?.addEventListener('click', () => {
      this.closeModal();
      alert("【タスク受託】総合受付での受取タスクが登録されました。");
    });
  }

  startDistributionTraining(distId) {
    const task = CONFIG.DISTRIBUTIONS.find(d => d.id === distId);
    if (!task) return;

    this.currentTrainingTaskId = distId;
    this.trainingStartTime = Date.now();
    this.activeTargets = [];

    this.floorObjects.forEach(obj => {
      const data = obj.userData;
      let match = false;
      if (task.targetRoles.includes("全員") && data.type === 'desk') match = true;
      else if (task.targetRoles.includes(data.role)) match = true;
      else if (data.distNeeded === distId) match = true;

      if (match && data.redDot) {
        data.redDot.visible = true;
        this.activeTargets.push(obj);
      }
    });

    alert(`【配布トレーニング開始】\n『${task.title}』を赤ポチの座席（${this.activeTargets.length}箇所）に配ってください。`);
  }

  cancelTraining() {
    this.floorObjects.forEach(obj => {
      if (obj.userData.redDot) obj.userData.redDot.visible = false;
    });
    this.activeTargets = [];
    this.currentTrainingTaskId = null;
  }

  showModal(title, body) {
    const t = document.getElementById('modal-title');
    const c = document.getElementById('modal-content');
    const m = document.getElementById('info-modal');
    if (t && c && m) {
      t.innerHTML = title;
      c.innerHTML = body;
      m.classList.add('active');
      this.isModalActive = true;
    }
  }

  closeModal() {
    const m = document.getElementById('info-modal');
    if (m) m.classList.remove('active');
    this.isModalActive = false;
    this.collisionTimer = 0;
    this.collidingObject = null;
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();

    let vx = this.inputVector.x;
    let vy = this.inputVector.y;
    if (this.keys['w'] || this.keys['arrowup'])    { vx -= 0.707; vy -= 0.707; }
    if (this.keys['s'] || this.keys['arrowdown'])  { vx += 0.707; vy += 0.707; }
    if (this.keys['a'] || this.keys['arrowleft'])  { vx += 0.707; vy -= 0.707; }
    if (this.keys['d'] || this.keys['arrowright']) { vx -= 0.707; vy += 0.707; }

    const hitObject = this.player.update({ x: vx, y: vy }, delta, (nx, nz) => this.checkCollision(nx, nz));
    this.updateCamera(this.player.position.x, this.player.position.z);

    if (!this.isModalActive && hitObject) {
      if (this.collidingObject === hitObject) {
        this.collisionTimer += delta;
        if (this.collisionTimer >= CONFIG.COLLISION_TRIGGER_TIME) {
          this.handleTriggerObject(hitObject);
          this.collisionTimer = 0;
        }
      } else {
        this.collidingObject = hitObject;
        this.collisionTimer = 0;
      }
    } else if (!hitObject) {
      this.collidingObject = null;
      this.collisionTimer = 0;
    }

    if (this.activeTargets.length > 0) {
      this.pulseTimer += delta * 6;
      const s = 1.0 + Math.sin(this.pulseTimer) * 0.25;
      for (let i = this.activeTargets.length - 1; i >= 0; i--) {
        const obj = this.activeTargets[i];
        if (obj.userData.redDot) {
          obj.userData.redDot.scale.set(s, s, s);
          if (this.player.position.distanceTo(obj.position) < 1.4) {
            obj.userData.redDot.visible = false;
            this.activeTargets.splice(i, 1);

            if (this.activeTargets.length === 0) {
              const elapsedSec = ((Date.now() - this.trainingStartTime) / 1000).toFixed(1);
              const taskInfo = CONFIG.DISTRIBUTIONS.find(d => d.id === this.currentTrainingTaskId);
              const score = Math.max(50, Math.round(100 - (elapsedSec > 40 ? (elapsedSec - 40) * 1.5 : 0)));

              alert(`🎉 配布業務完了！\nクリアタイム: ${elapsedSec}秒 / 獲得スコア: ${score}点`);

              if (this.currentUser) {
                const now = new Date();
                const timeStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                this.sheetService.saveTrainingLog({
                  id: `log_${Date.now()}`,
                  timestamp: timeStr,
                  email: this.currentUser.email,
                  userName: this.currentUser.name,
                  taskId: this.currentTrainingTaskId,
                  taskTitle: taskInfo ? taskInfo.title : "業務配布",
                  clearTimeSec: elapsedSec,
                  score: score
                });
              }
              this.currentTrainingTaskId = null;
            }
          }
        }
      }
    }

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new OfficeSimApp();
  app.init();
});