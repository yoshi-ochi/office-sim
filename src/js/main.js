// src/js/main.js
import { CONFIG } from './config.js';
import { FurnitureFactory } from './entities/Furniture.js';
import { Player } from './entities/Player.js';
import { NPCManager } from './entities/NPC.js';
import { SheetService } from './services/SheetService.js';
import { Minimap } from './ui/Minimap.js';
import { ChatManager } from './ui/ChatManager.js';
import { FurnitureEditor } from './ui/FurnitureEditor.js';

class OfficeSimApp {
  constructor() {
    this.currentFloor = 3;
    this.floorObjects = [];
    this.npcObjects = [];
    this.isEditMode = false;
    this.selectedObject = null;
    this.isDragging = false;
    this.boxHelper = null;

    this.inputVector = { x: 0, y: 0 };
    this.keys = {};
    this.activeTargets = [];
    this.pulseTimer = 0;

    this.collidingObject = null;
    this.collisionTimer = 0;
    this.isModalActive = false;
    this.currentUser = null;

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
    container.appendChild(this.renderer.domElement);

    this.scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const dirLight = new THREE.DirectionalLight(0xfff6e5, 0.65);
    dirLight.position.set(30, 45, 30);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    const floorGeo = new THREE.PlaneGeometry(CONFIG.FIELD_SIZE, CONFIG.FIELD_SIZE);
    this.floorMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.85 });
    this.floorPlane = new THREE.Mesh(floorGeo, this.floorMat);
    this.floorPlane.rotation.x = -Math.PI / 2;
    this.floorPlane.receiveShadow = true;
    this.scene.add(this.floorPlane);

    this.gridHelper = new THREE.GridHelper(CONFIG.FIELD_SIZE, CONFIG.GRID_DIVISIONS, 0x81c784, 0xdcdcdc);
    this.gridHelper.position.y = 0.005;
    this.scene.add(this.gridHelper);

    this.player = new Player(this.scene);
    this.sheetService = new SheetService(CONFIG.GAS_API_URL);
    this.minimap = new Minimap('minimap-canvas');
    this.chatManager = new ChatManager(this.sheetService, () => this.currentUser, () => this.currentFloor);
    this.editor = new FurnitureEditor(this);

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
      if (Math.hypot(x - obj.position.x, z - obj.position.z) < (CONFIG.PLAYER_RADIUS + r)) {
        return obj;
      }
    }
    return null;
  }

  async loadFloor(floorId) {
    // 既存家具 & NPC をクリア
    this.floorObjects.forEach(obj => this.scene.remove(obj));
    this.floorObjects = [];
    this.clearNPCs();

    if (this.boxHelper) {
      this.scene.remove(this.boxHelper);
      this.boxHelper = null;
    }
    this.editor.showActionBar(false);

    const floorInfo = CONFIG.FLOORS.find(f => f.id === floorId);
    if (floorInfo) this.floorMat.color.setHex(floorInfo.color);

    let layout = await this.sheetService.fetchFloorLayout(floorId);
    if (!layout || layout.length === 0) {
      layout = [
        { type: 'desk', x: -4, z: -4, rotation: 0, role: '自席', person: '自分', isMySeat: true, shift: '09:00-18:00' },
        { type: 'chair', x: -4, z: -3.2, rotation: 0 },
        { type: 'phone', x: -4.5, z: -4, rotation: 0, role: '社内内線電話' },
        { type: 'board', x: -3.2, z: -4.5, rotation: 0, role: '業務連絡掲示板' },
        { type: 'desk', x: 2, z: -4, rotation: 0, role: '課長', person: '佐藤 課長', distNeeded: 'dist_01', shift: '09:00-17:00' },
        { type: 'chair', x: 2, z: -3.2, rotation: 0 },
        { type: 'desk', x: 6, z: -4, rotation: 0, role: 'リーダー', person: '鈴木 主任', distNeeded: 'dist_04', shift: '15:00-24:00' },
        { type: 'chair', x: 6, z: -3.2, rotation: 0 },
        { type: 'printer', x: 10, z: 2, rotation: 0, role: 'フロア複合機', isPrinter: true }
      ];
    }

    layout.forEach(data => {
      const furniture = FurnitureFactory.create(data.type, data);
      this.scene.add(furniture);
      this.floorObjects.push(furniture);
    });

    // エレベーター & 階段を常設
    if (!this.floorObjects.some(o => o.userData.isElevator)) {
      const elv = FurnitureFactory.create('elevator', { x: -9, z: -10, rotation: 0, role: 'エレベーター' });
      this.scene.add(elv); this.floorObjects.push(elv);
    }
    if (!this.floorObjects.some(o => o.userData.isStairs)) {
      const str = FurnitureFactory.create('stairs', { x: 9, z: -10, rotation: 0, role: '連絡階段' });
      this.scene.add(str); this.floorObjects.push(str);
    }

    // 掲示板の未読チェック
    this.checkBoardUnread();

    // 勤務時間に応じたNPC召喚
    this.refreshNPCs();
  }

  async checkBoardUnread() {
    const posts = await this.sheetService.fetchBoardPosts();
    if (posts && posts.length > 0) {
      const lastPost = posts[posts.length - 1];
      const viewedKey = `board_last_view_${this.currentFloor}`;
      const lastViewed = localStorage.getItem(viewedKey);

      const hasUnread = !lastViewed || lastViewed !== lastPost.id;
      this.floorObjects.forEach(obj => {
        if (obj.userData.type === 'board' && obj.userData.unreadBoardDot) {
          obj.userData.unreadBoardDot.visible = hasUnread;
        }
      });
    }
  }

  clearNPCs() {
    this.npcObjects.forEach(npc => this.scene.remove(npc));
    this.npcObjects = [];
  }

  refreshNPCs() {
    this.clearNPCs();
    this.floorObjects.forEach(obj => {
      if (obj.userData.type === 'desk' && !obj.userData.isMySeat && obj.userData.person !== '未設定') {
        if (NPCManager.isWorkingNow(obj.userData.shift)) {
          const npc = NPCManager.createSittingNPC(obj.userData.person, obj.userData.role);
          // デスクの椅子位置（背後）に座らせる
          npc.position.set(obj.position.x, 0, obj.position.z + 0.7);
          this.scene.add(npc);
          this.npcObjects.push(npc);
        }
      }
    });
  }

  spawnFurnitureInFrontOfPlayer(type) {
    const fwd = this.player.getForwardVector();
    const snapX = Math.round((this.player.position.x + fwd.x * 1.5) / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
    const snapZ = Math.round((this.player.position.z + fwd.z * 1.5) / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;

    const newObj = FurnitureFactory.create(type, { x: snapX, z: snapZ, rotation: this.player.targetRotation });
    this.scene.add(newObj);
    this.floorObjects.push(newObj);
    this.selectFurniture(newObj);
  }

  selectFurniture(obj) {
    this.selectedObject = obj;
    if (this.boxHelper) this.scene.remove(this.boxHelper);
    this.boxHelper = new THREE.BoxHelper(this.selectedObject, 0xffff00);
    this.scene.add(this.boxHelper);
    this.editor.showActionBar(true);
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
      department: obj.userData.department || '',
      shift: obj.userData.shift || '09:00-17:00',
      distNeeded: obj.userData.distNeeded || ''
    }));
    const res = await this.sheetService.saveFloorLayout(this.currentFloor, items);
    if (res && res.status === 'success') {
      alert(`フロア ${this.currentFloor}F のレイアウトを保存しました。`);
    }
  }

  setupEvents() {
    let currentAuthEmail = "";
    let currentAuthUserData = null;

    document.getElementById('btn-check-email')?.addEventListener('click', async () => {
      const email = document.getElementById('login-email').value.trim();
      if (!email) return alert("メールアドレスを入力してください。");

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
        alert(res ? res.message : "アクセスが拒否されました。");
      }
    });

    document.getElementById('btn-login-exec')?.addEventListener('click', async () => {
      const pass = document.getElementById('login-password').value;
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
      const pass = document.getElementById('setup-password').value;
      const res = await this.sheetService.setPassword(currentAuthEmail, pass);
      if (res && res.status === 'success') {
        this.currentUser = currentAuthUserData;
        document.getElementById('user-badge').innerText = `👤 ${this.currentUser.name} (${this.currentUser.role})`;
        document.getElementById('login-overlay').style.display = 'none';
        this.loadFloor(this.currentFloor);
      }
    });

    const editBtn = document.getElementById('btn-edit-mode');
    const palette = document.getElementById('furniture-palette');
    editBtn?.addEventListener('click', () => {
      this.isEditMode = !this.isEditMode;
      editBtn.classList.toggle('active', this.isEditMode);
      editBtn.innerText = this.isEditMode ? "保存して終了" : "家具配置";
      palette.classList.toggle('active', this.isEditMode);

      if (!this.isEditMode) {
        this.syncCurrentLayoutToSheet();
        if (this.boxHelper) {
          this.scene.remove(this.boxHelper);
          this.boxHelper = null;
        }
        this.selectedObject = null;
        this.editor.showActionBar(false);
        this.editor.showSnapGuide(0, 0, false);
      }
    });

    document.querySelectorAll('.palette-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const type = e.target.getAttribute('data-type');
        if (type) this.spawnFurnitureInFrontOfPlayer(type);
      });
    });

    document.getElementById('btn-palette-close')?.addEventListener('click', () => {
      palette.classList.remove('active');
    });

    // ドラッグ移動 & スナップガイド可視化
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
        const snapX = Math.max(-max, Math.min(max, Math.round(p.x / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE));
        const snapZ = Math.max(-max, Math.min(max, Math.round(p.z / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE));

        this.selectedObject.position.x = snapX;
        this.selectedObject.position.z = snapZ;
        if (this.boxHelper) this.boxHelper.update();
        this.editor.showSnapGuide(snapX, snapZ, true);
      }
    });

    window.addEventListener('pointerup', () => {
      this.isDragging = false;
      this.editor.showSnapGuide(0, 0, false);
    });

    // キー入力・ジョイスティック
    window.addEventListener('keydown', e => { if (e.key) this.keys[e.key.toLowerCase()] = true; });
    window.addEventListener('keyup', e => { if (e.key) this.keys[e.key.toLowerCase()] = false; });

    const zone = document.getElementById('joystick-zone');
    const knob = document.getElementById('joystick-knob');
    let active = false, startX = 0, startY = 0;
    zone.addEventListener('pointerdown', e => {
      active = true;
      const rect = zone.getBoundingClientRect();
      startX = rect.left + rect.width / 2; startY = rect.top + rect.height / 2;
    });
    window.addEventListener('pointermove', e => {
      if (!active) return;
      let dx = e.clientX - startX, dy = e.clientY - startY, dist = Math.hypot(dx, dy);
      const maxR = 45;
      if (dist > maxR) { dx = (dx / dist) * maxR; dy = (dy / dist) * maxR; dist = maxR; }
      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      const rad = Math.atan2(dy, dx) - Math.PI / 4;
      this.inputVector.x = Math.cos(rad) * (dist / maxR);
      this.inputVector.y = Math.sin(rad) * (dist / maxR);
    });
    const endJoy = () => {
      active = false;
      knob.style.transform = 'translate(0px, 0px)';
      this.inputVector = { x: 0, y: 0 };
    };
    window.addEventListener('pointerup', endJoy);
    window.addEventListener('pointercancel', endJoy);

    document.getElementById('floor-select')?.addEventListener('change', e => {
      this.changeFloorWithTransition(parseInt(e.target.value, 10), 'center');
    });

    document.getElementById('modal-close-btn')?.addEventListener('click', () => this.closeModal());
  }

  handleTriggerObject(obj) {
    if (this.isEditMode) {
      this.selectFurniture(obj);
      return;
    }
    const data = obj.userData;
    if (data.isElevator) this.triggerElevator();
    else if (data.isStairs) this.triggerStairs();
    else if (data.isPrinter) this.triggerPrinter();
    else if (data.type === 'phone') this.triggerPhone();
    else if (data.type === 'board') this.triggerBoard(obj);
    else {
      this.showModal(`${data.role} のデスク`, `
        <strong>氏名:</strong> ${data.person}<br>
        <strong>部署:</strong> ${data.department || '一般'}<br>
        <strong>勤務シフト:</strong> ${data.shift || '09:00-17:00'}<br>
        <strong>必要配布物:</strong> ${data.distNeeded ? '【要配布】' + data.distNeeded : '特になし'}
      `);
    }
  }

  async triggerBoard(boardObj) {
    const posts = await this.sheetService.fetchBoardPosts();
    if (posts.length > 0) {
      localStorage.setItem(`board_last_view_${this.currentFloor}`, posts[posts.length - 1].id);
      if (boardObj.userData.unreadBoardDot) boardObj.userData.unreadBoardDot.visible = false;
    }

    let listHtml = '<div style="max-height: 200px; overflow-y: auto; margin-bottom: 12px; background: #fafafa; padding: 8px; border-radius: 6px;">';
    posts.slice().reverse().forEach(p => {
      listHtml += `<div style="border-bottom: 1px solid #eee; padding: 6px 0; font-size: 12px;">
        <span style="color: #64748b;">[${p.category}] ${p.author} • ${p.date}</span>
        <div style="color: #1e293b; margin-top: 2px;">${p.message}</div>
      </div>`;
    });
    listHtml += '</div>';

    this.showModal("📌 業務連絡掲示板", listHtml);
  }

  triggerElevator() {
    let buttonsHtml = '<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px;">';
    CONFIG.FLOORS.forEach(f => {
      const isCurrent = f.id === this.currentFloor;
      buttonsHtml += `
        <button class="btn-elv-floor" data-floor="${f.id}" style="padding: 12px; border-radius: 8px; border: 1.5px solid ${isCurrent ? '#00897b' : '#cfd8dc'}; background: ${isCurrent ? '#e0f2f1' : '#fff'};" ${isCurrent ? 'disabled' : ''}>
          🛗 ${f.id}F ${f.name}
        </button>`;
    });
    buttonsHtml += '</div>';
    this.showModal("🛗 エレベーター操作盤", buttonsHtml);
    document.querySelectorAll('.btn-elv-floor').forEach(btn => {
      btn.addEventListener('click', e => {
        this.changeFloorWithTransition(parseInt(e.currentTarget.getAttribute('data-floor'), 10), 'elevator');
      });
    });
  }

  triggerStairs() {
    const prev = this.currentFloor > 1 ? this.currentFloor - 1 : null;
    const next = this.currentFloor < CONFIG.FLOORS.length ? this.currentFloor + 1 : null;
    let html = `<div style="display: flex; flex-direction: column; gap: 10px;">`;
    if (next) html += `<button class="btn-stair-move" data-floor="${next}" style="padding: 12px; background: #e3f2fd; border-radius: 8px;">⬆️ ${next}Fへ上がる</button>`;
    if (prev) html += `<button class="btn-stair-move" data-floor="${prev}" style="padding: 12px; background: #fff3e0; border-radius: 8px;">⬇️ ${prev}Fへ下りる</button>`;
    html += `</div>`;
    this.showModal("🪜 連絡階段", html);
    document.querySelectorAll('.btn-stair-move').forEach(btn => {
      btn.addEventListener('click', e => {
        this.changeFloorWithTransition(parseInt(e.currentTarget.getAttribute('data-floor'), 10), 'stairs');
      });
    });
  }

  changeFloorWithTransition(targetFloor, arrivalType) {
    this.closeModal();
    this.currentFloor = targetFloor;
    const select = document.getElementById('floor-select');
    if (select) select.value = String(targetFloor);

    this.loadFloor(targetFloor);
    if (arrivalType === 'elevator') this.player.position.set(-9, 0, -7.5);
    else if (arrivalType === 'stairs') this.player.position.set(9, 0, -7.5);
    else this.player.position.set(0, 0, 0);
  }

  showModal(title, body) {
    document.getElementById('modal-title').innerHTML = title;
    document.getElementById('modal-content').innerHTML = body;
    document.getElementById('info-modal').classList.add('active');
    this.isModalActive = true;
  }

  closeModal() {
    document.getElementById('info-modal').classList.remove('active');
    this.isModalActive = false;
    this.collisionTimer = 0;
    this.collidingObject = null;
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    const delta = this.clock.getDelta();

    let vx = this.inputVector.x, vy = this.inputVector.y;
    if (this.keys['w'] || this.keys['arrowup'])    { vx -= 0.707; vy -= 0.707; }
    if (this.keys['s'] || this.keys['arrowdown'])  { vx += 0.707; vy += 0.707; }
    if (this.keys['a'] || this.keys['arrowleft'])  { vx += 0.707; vy -= 0.707; }
    if (this.keys['d'] || this.keys['arrowright']) { vx -= 0.707; vy += 0.707; }

    const hit = this.player.update({ x: vx, y: vy }, delta, (nx, nz) => this.checkCollision(nx, nz));
    this.updateCamera(this.player.position.x, this.player.position.z);

    // ミニマップ更新
    this.minimap.update(this.player.position, this.floorObjects);

    if (!this.isModalActive && hit) {
      if (this.collidingObject === hit) {
        this.collisionTimer += delta;
        if (this.collisionTimer >= CONFIG.COLLISION_TRIGGER_TIME) {
          this.handleTriggerObject(hit);
          this.collisionTimer = 0;
        }
      } else {
        this.collidingObject = hit;
        this.collisionTimer = 0;
      }
    } else if (!hit) {
      this.collidingObject = null;
      this.collisionTimer = 0;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

// 動的ローダー対応即時起動
function startOfficeSimApp() {
  const app = new OfficeSimApp();
  app.init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startOfficeSimApp);
} else {
  startOfficeSimApp();
}