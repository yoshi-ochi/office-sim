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

    const aspect = (window.innerWidth && window.innerHeight) ? (window.innerWidth / window.innerHeight) : 1;
    const d = CONFIG.CAMERA_VIEW_SIZE || 12;
    this.camera = new THREE.OrthographicCamera(-d * aspect, d * aspect, d, -d, 1, 1000);
    this.camera.zoom = 1.0;
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
    const validX = (typeof targetX === 'number' && !isNaN(targetX)) ? targetX : 0;
    const validZ = (typeof targetZ === 'number' && !isNaN(targetZ)) ? targetZ : 0;
    const dist = CONFIG.CAMERA_DISTANCE || 18;
    const elev = CONFIG.CAMERA_ELEVATION || 22;

    this.camera.position.set(validX + dist, elev, validZ + dist);
    this.camera.lookAt(validX, 0, validZ);
  }

  checkCollision(x, z) {
    if (isNaN(x) || isNaN(z)) return null;
    for (const obj of this.floorObjects) {
      if (this.isEditMode && this.isDragging && this.selectedObject === obj) continue;
      const r = obj.userData.collisionRadius || 0.65;
      if (Math.hypot(x - obj.position.x, z - obj.position.z) < ((CONFIG.PLAYER_RADIUS || 0.35) + r)) {
        return obj;
      }
    }
    return null;
  }

  async loadFloor(floorId) {
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
        { type: 'desk', x: -4, z: -4, rotation: 0, role: '自席', person: '自分', isMySeat: true, shiftWeekday: '09:00-18:00', extensionNumber: '3201' },
        { type: 'chair', x: -4, z: -3.2, rotation: 0 },
        { type: 'phone', x: -4.5, z: -4, rotation: 0, role: '内線電話', extensionNumber: '3201' },
        { type: 'printer_desk', x: -4, z: -4, rotation: 0, role: '自席卓上プリンター', modelNumber: 'CANON LBP621C', tonerType: 'CRG-054H', drumType: '一体型' },
        { type: 'board', x: -3.2, z: -4.5, rotation: 0, role: '業務連絡掲示板' },
        { type: 'desk', x: 2, z: -4, rotation: 0, role: '課長', person: '佐藤 課長', distNeeded: 'dist_01', shiftWeekday: '09:00-17:00', extensionNumber: '3202' },
        { type: 'chair', x: 2, z: -3.2, rotation: 0 },
        { type: 'desk', x: 6, z: -4, rotation: 0, role: 'リーダー', person: '鈴木 主任', distNeeded: 'dist_04', shiftWeekday: '15:00-24:00', shiftSaturday: '13:00-21:00', extensionNumber: '3203' },
        { type: 'chair', x: 6, z: -3.2, rotation: 0 },
        { type: 'printer_floor', x: 10, z: 2, rotation: 0, role: 'フロア複合機', modelNumber: 'ApeosPort-VII C3373', tonerType: 'CT203138', drumType: 'CT351175' }
      ];
    }

    layout.forEach(data => {
      const furniture = FurnitureFactory.create(data.type, data);
      this.scene.add(furniture);
      this.floorObjects.push(furniture);
    });

    if (!this.floorObjects.some(o => o.userData.isElevator)) {
      const elv = FurnitureFactory.create('elevator', { x: -9, z: -10, rotation: 0, role: 'エレベーター' });
      this.scene.add(elv); this.floorObjects.push(elv);
    }
    if (!this.floorObjects.some(o => o.userData.isStairsUp)) {
      const up = FurnitureFactory.create('stairs_up', { x: 7, z: -10, rotation: 0, role: '上り階段' });
      this.scene.add(up); this.floorObjects.push(up);
    }
    if (!this.floorObjects.some(o => o.userData.isStairsDown)) {
      const dn = FurnitureFactory.create('stairs_down', { x: 10, z: -10, rotation: 0, role: '下り階段' });
      this.scene.add(dn); this.floorObjects.push(dn);
    }

    this.checkBoardUnread();
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
        if (NPCManager.isWorkingNow(obj.userData)) {
          const npc = NPCManager.createSittingNPC(obj.userData.person, obj.userData.role);
          npc.position.set(obj.position.x, 0, obj.position.z + 0.7);
          this.scene.add(npc);
          this.npcObjects.push(npc);
        }
      }
    });
  }

  spawnFurnitureInFrontOfPlayer(type) {
    const fwd = this.player.getForwardVector();
    let snapX = Math.round((this.player.position.x + fwd.x * 1.5) / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
    let snapZ = Math.round((this.player.position.z + fwd.z * 1.5) / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
    let isUnderDesk = false;

    if (type === 'printer_desk') {
      const nearbyDesk = this.floorObjects.find(o => o.userData.type === 'desk' && Math.hypot(o.position.x - snapX, o.position.z - snapZ) < 1.2);
      if (nearbyDesk) {
        snapX = nearbyDesk.position.x;
        snapZ = nearbyDesk.position.z;
        const existingPrinter = this.floorObjects.find(o => o.userData.type === 'printer_desk' && Math.hypot(o.position.x - snapX, o.position.z - snapZ) < 0.3);
        if (existingPrinter) {
          isUnderDesk = true;
        }
      }
    }

    const newObj = FurnitureFactory.create(type, { x: snapX, z: snapZ, rotation: 0, isUnderDesk });
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
      shiftWeekday: obj.userData.shiftWeekday || '',
      shiftSaturday: obj.userData.shiftSaturday || '',
      shiftHoliday: obj.userData.shiftHoliday || '',
      extensionNumber: obj.userData.extensionNumber || '',
      modelNumber: obj.userData.modelNumber || '',
      tonerType: obj.userData.tonerType || '',
      drumType: obj.userData.drumType || '',
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

    document.getElementById('btn-dictionary')?.addEventListener('click', () => this.openDictionaryModal());
    document.getElementById('btn-workflow')?.addEventListener('click', () => this.openWorkflowsTableModal());

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

    window.addEventListener('keydown', e => { if (e.key) this.keys[e.key.toLowerCase()] = true; });
    window.addEventListener('keyup', e => { if (e.key) this.keys[e.key.toLowerCase()] = false; });

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

      if (dist < 1.0) {
        this.inputVector = { x: 0, y: 0 };
      } else {
        const rad = Math.atan2(dy, dx) - Math.PI / 4;
        const norm = dist / maxR;
        this.inputVector.x = Math.cos(rad) * norm;
        this.inputVector.y = Math.sin(rad) * norm;
      }
    });

    const endJoy = () => {
      active = false;
      knob.style.transform = 'translate(0px, 0px)';
      this.inputVector = { x: 0, y: 0 };
    };
    window.addEventListener('pointerup', endJoy);
    window.addEventListener('pointercancel', endJoy);

    // --- ピンチイン / ピンチアウト & マウスホイール ズーム制御 ---
    let initialPinchDistance = null;
    let initialZoom = 1.0;
    const minZoom = 0.5;
    const maxZoom = 2.5;

    const getTouchDistance = (t1, t2) => {
      const dx = t1.clientX - t2.clientX;
      const dy = t1.clientY - t2.clientY;
      return Math.hypot(dx, dy);
    };

    window.addEventListener('touchstart', e => {
      if (e.touches.length === 2) {
        initialPinchDistance = getTouchDistance(e.touches[0], e.touches[1]);
        initialZoom = this.camera.zoom;
      }
    }, { passive: false });

    window.addEventListener('touchmove', e => {
      if (e.touches.length === 2 && initialPinchDistance !== null) {
        e.preventDefault();
        const currentDistance = getTouchDistance(e.touches[0], e.touches[1]);
        const scale = currentDistance / initialPinchDistance;
        const newZoom = Math.max(minZoom, Math.min(maxZoom, initialZoom * scale));

        this.camera.zoom = newZoom;
        this.camera.updateProjectionMatrix();
      }
    }, { passive: false });

    window.addEventListener('touchend', e => {
      if (e.touches.length < 2) {
        initialPinchDistance = null;
      }
    });

    window.addEventListener('wheel', e => {
      if (e.target.closest('#chat-drawer') || e.target.closest('#info-modal') || e.target.closest('#furniture-palette')) {
        return;
      }
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
      this.camera.zoom = Math.max(minZoom, Math.min(maxZoom, this.camera.zoom * zoomFactor));
      this.camera.updateProjectionMatrix();
    }, { passive: false });

    window.addEventListener('resize', () => {
      const aspect = window.innerWidth / window.innerHeight;
      const d = CONFIG.CAMERA_VIEW_SIZE || 12;
      this.camera.left = -d * aspect;
      this.camera.right = d * aspect;
      this.camera.top = d;
      this.camera.bottom = -d;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    document.getElementById('floor-select')?.addEventListener('change', e => {
      this.changeFloor(parseInt(e.target.value, 10), 'center');
    });

    document.getElementById('modal-close-btn')?.addEventListener('click', () => this.closeModal());
  }

  handleTriggerObject(obj) {
    if (this.isEditMode) {
      this.selectFurniture(obj);
      return;
    }
    const data = obj.userData;

    if (data.isStairsUp) {
      if (this.currentFloor < CONFIG.FLOORS.length) {
        this.changeFloor(this.currentFloor + 1, 'stairs_up');
      } else {
        alert("最上階のためこれ以上上がれません。");
      }
      return;
    }

    if (data.isStairsDown) {
      if (this.currentFloor > 1) {
        this.changeFloor(this.currentFloor - 1, 'stairs_down');
      } else {
        alert("1階のためこれ以上下りられません。");
      }
      return;
    }

    if (data.isElevator) {
      this.triggerElevator();
      return;
    }
    if (data.type === 'board') {
      this.triggerBoard(obj);
      return;
    }

    if (data.type === 'desk') {
      const px = obj.position.x;
      const pz = obj.position.z;

      const nearbyPhones = this.floorObjects.filter(o => o.userData.type === 'phone' && Math.hypot(o.position.x - px, o.position.z - pz) < 1.4);
      const extStr = nearbyPhones.map(p => p.userData.extensionNumber).filter(Boolean).join(', ') || data.extensionNumber || 'なし';

      const nearbyPrinters = this.floorObjects.filter(o => o.userData.type.includes('printer') && Math.hypot(o.position.x - px, o.position.z - pz) < 1.4);

      let printerInfoHtml = '';
      if (nearbyPrinters.length > 0) {
        printerInfoHtml += '<div style="margin-top: 8px; padding: 6px; background: #fdf4ff; border-radius: 6px; border: 1px solid #f0abfc;">';
        nearbyPrinters.forEach(p => {
          const pd = p.userData;
          printerInfoHtml += `
            <div style="font-size: 11px; margin-bottom: 4px;">
              <strong style="color: #9333ea;">🖨️ ${pd.role} (${pd.type === 'printer_desk' ? '卓上型' : '床置複合機'})</strong><br>
              型番: <strong>${pd.modelNumber || '未登録'}</strong><br>
              対応トナー: ${pd.tonerType || '未登録'} | ドラム: ${pd.drumType || '未登録'}
            </div>
          `;
        });
        printerInfoHtml += '</div>';
      }

      const today = new Date().getDay();
      let shiftToday = data.shiftWeekday || '09:00-17:00';
      if (today === 6) shiftToday = data.shiftSaturday || '09:00-15:00';
      if (today === 0) shiftToday = data.shiftHoliday || '休み';

      const bodyHtml = `
        <div style="font-size: 13px; line-height: 1.5;">
          <strong>担当者:</strong> ${data.person} (${data.department || '編集局'})<br>
          <strong>本日の出勤時間:</strong> <span style="color: #0284c7; font-weight: bold;">${shiftToday}</span><br>
          <div style="font-size: 11px; color: #64748b; margin-bottom: 6px;">
            (平日: ${data.shiftWeekday || '-'} / 土曜: ${data.shiftSaturday || '-'} / 日祝: ${data.shiftHoliday || '-'})
          </div>
          <strong>内線番号:</strong> <span style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-weight: bold;">${extStr}</span><br>
          ${printerInfoHtml}
          <strong>必要配布物:</strong> ${data.distNeeded ? '【要配布】' + data.distNeeded : '特になし'}
        </div>
      `;
      this.showModal(`👤 ${data.role} のデスク詳細`, bodyHtml);
      return;
    }

    if (data.type.includes('printer')) {
      const bodyHtml = `
        <div style="font-size: 13px; line-height: 1.6;">
          <strong>名称:</strong> ${data.role}<br>
          <strong>型番:</strong> <span style="color: #1e293b; font-weight: bold;">${data.modelNumber || '未登録'}</span><br>
          <strong>適合トナー:</strong> <span style="color: #0284c7;">${data.tonerType || '未登録'}</span><br>
          <strong>ドラム形式:</strong> ${data.drumType || '未登録'}
        </div>
      `;
      this.showModal(`🖨️ プリンター・複合機機器情報`, bodyHtml);
      return;
    }

    if (data.type === 'phone') {
      this.showModal(`📞 電話設備`, `<strong>内線番号:</strong> ${data.extensionNumber || '内線 3200'}`);
      return;
    }

    this.showModal(`${data.role}`, `<strong>状況:</strong> 通常稼働中`);
  }

  async triggerBoard(boardObj) {
    const posts = await this.sheetService.fetchBoardPosts();
    if (posts.length > 0) {
      localStorage.setItem(`board_last_view_${this.currentFloor}`, posts[posts.length - 1].id);
      if (boardObj.userData.unreadBoardDot) boardObj.userData.unreadBoardDot.visible = false;
    }

    let listHtml = '<div style="max-height: 180px; overflow-y: auto; margin-bottom: 12px; background: #fafafa; padding: 8px; border-radius: 6px; border: 1px solid #e2e8f0;">';
    posts.slice().reverse().forEach(p => {
      listHtml += `<div style="border-bottom: 1px solid #eee; padding: 6px 0; font-size: 12px;">
        <div style="color: #64748b; font-size: 11px;">[${p.category || '連絡'}] <strong>${p.author || '社員'}</strong> • ${p.date || ''}</div>
        <div style="color: #1e293b; margin-top: 2px;">${p.message}</div>
      </div>`;
    });
    listHtml += '</div>';

    const defaultAuthor = this.currentUser ? this.currentUser.name : '社員';
    const formHtml = `
      <div style="background: #f1f5f9; padding: 10px; border-radius: 8px;">
        <div style="font-weight: bold; font-size: 12px; margin-bottom: 6px; color: #334155;">📌 掲示板に新規投稿</div>
        <div style="display: flex; gap: 6px; margin-bottom: 6px;">
          <input type="text" id="b-author" value="${defaultAuthor}" style="flex: 1; padding: 6px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 4px;">
          <select id="b-cat" style="padding: 6px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 4px;">
            <option value="連絡">連絡</option><option value="共有">共有</option><option value="至急">至急</option>
          </select>
        </div>
        <textarea id="b-msg" placeholder="投稿内容を入力..." rows="2" style="width: 100%; box-sizing: border-box; padding: 6px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 4px; resize: none;"></textarea>
        <div style="text-align: right; margin-top: 6px;">
          <button id="btn-b-submit" class="btn-dialog btn-primary" style="padding: 5px 12px; font-size: 12px;">投稿する</button>
        </div>
      </div>
    `;

    this.showModal("📌 業務連絡掲示板", listHtml + formHtml);

    document.getElementById('btn-b-submit')?.addEventListener('click', async () => {
      const author = document.getElementById('b-author').value.trim() || defaultAuthor;
      const category = document.getElementById('b-cat').value;
      const msg = document.getElementById('b-msg').value.trim();
      if (!msg) return;

      const now = new Date();
      const dateStr = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      await this.sheetService.saveBoardPost({
        id: `b_${Date.now()}`,
        date: dateStr,
        author: author,
        category: category,
        message: msg
      });
      alert("掲示板に投稿しました！");
      this.closeModal();
    });
  }

  async openDictionaryModal() {
    const terms = await this.sheetService.fetchDictionary();
    let listHtml = '<div style="max-height: 220px; overflow-y: auto; margin-bottom: 12px;">';
    terms.forEach(t => {
      listHtml += `
        <div style="margin-bottom: 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px;">
          <div style="font-weight: bold; color: #7b1fa2; font-size: 13px;">[${t.category || '一般'}] ${t.term}</div>
          <div style="font-size: 12px; color: #475569; margin-top: 2px;">${t.content}</div>
        </div>
      `;
    });
    listHtml += '</div>';

    const addFormHtml = `
      <div style="background: #faf5ff; border: 1px solid #e9d5ff; padding: 10px; border-radius: 8px;">
        <div style="font-weight: bold; font-size: 12px; color: #6b21a8; margin-bottom: 6px;">➕ 用語・マニュアルの追加</div>
        <div style="display: flex; gap: 6px; margin-bottom: 6px;">
          <input type="text" id="dict-term" placeholder="用語名" style="flex: 2; padding: 6px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 4px;">
          <input type="text" id="dict-cat" placeholder="分類" style="flex: 1; padding: 6px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 4px;">
        </div>
        <textarea id="dict-content" placeholder="説明を入力..." rows="2" style="width: 100%; box-sizing: border-box; padding: 6px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 4px; resize: none;"></textarea>
        <div style="text-align: right; margin-top: 6px;">
          <button id="btn-dict-add" class="btn-dialog btn-primary" style="background: #7b1fa2; padding: 5px 12px; font-size: 12px;">追加保存</button>
        </div>
      </div>
    `;

    this.showModal("📖 社内辞書・マニュアル用語", listHtml + addFormHtml);

    document.getElementById('btn-dict-add')?.addEventListener('click', async () => {
      const term = document.getElementById('dict-term').value.trim();
      const cat = document.getElementById('dict-cat').value.trim() || '社内業務';
      const content = document.getElementById('dict-content').value.trim();
      if (!term || !content) return alert("用語名と説明を入力してください。");

      await this.sheetService.saveDictionaryTerm({ term, category: cat, content });
      alert(`用語「${term}」を追加しました！`);
      this.closeModal();
    });
  }

  async openWorkflowsTableModal() {
    let rows = await this.sheetService.fetchWorkflows();
    if (!rows || rows.length === 0) {
      rows = [
        { shift: "昼勤", timeGroup: "9:00~", time: "9:00", taskName: "朝刊取り", position: "早番", description: "新聞室から朝刊を回収し、連絡員席に並べる。共同・時事を29部コピー配布、メール送信。", briefexplanation: "新聞室から朝刊回収・配布", weekends: "" },
        { shift: "昼勤", timeGroup: "9:00~", time: "9:00", taskName: "朝刊配り", position: "早番/遅番", description: "早番:5・7F、遅番:6Fへ朝刊を配達。", briefexplanation: "各階朝刊配り", weekends: "" },
        { shift: "昼勤", timeGroup: "9:00~", time: "9:00", taskName: "朝刊あつかい配り", position: "早番", description: "論説委員会(+あつかい)・秘書室×2・経済部×3。18部コピー配布・メール送信。", briefexplanation: "論説・秘書室配り", weekends: "" },
        { shift: "昼勤", timeGroup: "10:00~", time: "10:00", taskName: "外回り", position: "早番", description: "Bag便〆切10:00。電力ビル→県庁→県警→市役所。3Fサポセン備品補充、3F総務郵便出し・回収、2F販売部石巻かほく回収。", briefexplanation: "行政各庁・外回り便回収", weekends: "" },
        { shift: "昼勤", timeGroup: "13:00~", time: "13:00", taskName: "紙補充", position: "早番/遅番", description: "円卓の複合機2機のA3とA4を用紙補充する。", briefexplanation: "複合機コピー用紙補充", weekends: "" },
        { shift: "昼勤", timeGroup: "16:00~", time: "16:00", taskName: "メモ配り", position: "遅番", description: "【自社メモ】(5F)防災教育室長・文化部長・写真映像部長・経済部×3 (6F)メディアセンター長。メール・FAX送信。", briefexplanation: "自社・運動・友好社メモ配り", weekends: "" }
      ];
    }

    let tableRowsHtml = '';
    rows.forEach((r, idx) => {
      tableRowsHtml += `
        <tr data-index="${idx}" style="border-bottom: 1px solid #cbd5e1;">
          <td style="padding: 6px; font-weight: bold; color: #0284c7;">${r.shift}</td>
          <td style="padding: 6px;">${r.time}</td>
          <td style="padding: 6px; font-weight: bold;">${r.taskName}</td>
          <td style="padding: 6px;"><span style="background: #e2e8f0; padding: 2px 6px; border-radius: 4px; font-size: 11px;">${r.position}</span></td>
          <td style="padding: 6px; font-size: 11px; max-width: 260px; line-height: 1.3;">${r.description}</td>
          <td style="padding: 6px; text-align: center;">
            <button class="btn-wf-edit-row" data-index="${idx}" style="background: #f1f5f9; border: 1px solid #cbd5e1; border-radius: 4px; padding: 3px 6px; font-size: 11px; cursor: pointer;">編集</button>
          </td>
        </tr>
      `;
    });

    const modalBodyHtml = `
      <div style="max-height: 340px; overflow-y: auto; margin-bottom: 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
          <thead style="background: #f8fafc; position: sticky; top: 0; border-bottom: 2px solid #cbd5e1;">
            <tr>
              <th style="padding: 6px;">シフト</th>
              <th style="padding: 6px;">時間</th>
              <th style="padding: 6px;">業務名</th>
              <th style="padding: 6px;">担当</th>
              <th style="padding: 6px;">業務内容・配布先</th>
              <th style="padding: 6px;">操作</th>
            </tr>
          </thead>
          <tbody>${tableRowsHtml}</tbody>
        </table>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <button id="btn-wf-add-new" class="btn-dialog" style="background: #10b981; color: #fff; font-size: 12px; padding: 6px 12px;">+ 新規業務行の追加</button>
        <button id="btn-wf-save-all" class="btn-dialog btn-primary" style="font-size: 12px; padding: 6px 16px;">スプレッドシートに保存</button>
      </div>
    `;

    this.showModal("📋 業務情報一覧・簡易マニュアル（編集対応）", modalBodyHtml);

    document.querySelectorAll('.btn-wf-edit-row').forEach(btn => {
      btn.addEventListener('click', e => {
        const idx = parseInt(e.currentTarget.getAttribute('data-index'), 10);
        const item = rows[idx];
        const editHtml = `
          <div style="display: flex; flex-direction: column; gap: 8px; font-size: 12px;">
            <label><strong>時間:</strong> <input type="text" id="edit-wf-time" value="${item.time}" style="width: 100%; padding: 4px;"></label>
            <label><strong>業務名:</strong> <input type="text" id="edit-wf-name" value="${item.taskName}" style="width: 100%; padding: 4px;"></label>
            <label><strong>担当 (早番/遅番):</strong> <input type="text" id="edit-wf-pos" value="${item.position}" style="width: 100%; padding: 4px;"></label>
            <label><strong>詳細説明:</strong> <textarea id="edit-wf-desc" rows="4" style="width: 100%; padding: 4px;">${item.description}</textarea></label>
            <div style="text-align: right; margin-top: 6px;">
              <button id="btn-wf-update-commit" class="btn-dialog btn-primary">行を更新</button>
            </div>
          </div>
        `;
        this.showModal(`✏️ 業務行の編集: ${item.taskName}`, editHtml);
        document.getElementById('btn-wf-update-commit')?.addEventListener('click', () => {
          item.time = document.getElementById('edit-wf-time').value;
          item.taskName = document.getElementById('edit-wf-name').value;
          item.position = document.getElementById('edit-wf-pos').value;
          item.description = document.getElementById('edit-wf-desc').value;
          this.openWorkflowsTableModal();
        });
      });
    });

    document.getElementById('btn-wf-add-new')?.addEventListener('click', () => {
      rows.push({
        shift: "昼勤",
        timeGroup: "新規",
        time: "10:00",
        taskName: "新規タスク",
        position: "早番",
        description: "業務の詳細を入力してください。",
        briefexplanation: "概要",
        weekends: ""
      });
      this.openWorkflowsTableModal();
    });

    document.getElementById('btn-wf-save-all')?.addEventListener('click', async () => {
      await this.sheetService.saveWorkflows(rows);
      alert("業務情報一覧をスプレッドシート（Workflows）に保存しました！");
      this.closeModal();
    });
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
        this.changeFloor(parseInt(e.currentTarget.getAttribute('data-floor'), 10), 'elevator');
      });
    });
  }

  changeFloor(targetFloor, arrivalType) {
    this.closeModal();
    this.currentFloor = targetFloor;
    const select = document.getElementById('floor-select');
    if (select) select.value = String(targetFloor);

    this.loadFloor(targetFloor);

    if (arrivalType === 'stairs_up') this.player.position.set(7, 0, -8);
    else if (arrivalType === 'stairs_down') this.player.position.set(10, 0, -8);
    else if (arrivalType === 'elevator') this.player.position.set(-9, 0, -8);
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

    let vx = Number(this.inputVector.x) || 0;
    let vy = Number(this.inputVector.y) || 0;

    if (this.keys['w'] || this.keys['arrowup'])    { vx -= 0.7071; vy -= 0.7071; }
    if (this.keys['s'] || this.keys['arrowdown'])  { vx += 0.7071; vy += 0.7071; }
    if (this.keys['a'] || this.keys['arrowleft'])  { vx += 0.7071; vy -= 0.7071; }
    if (this.keys['d'] || this.keys['arrowright']) { vx -= 0.7071; vy += 0.7071; }

    const hit = this.player.update({ x: vx, y: vy }, delta, (nx, nz) => this.checkCollision(nx, nz));

    this.updateCamera(this.player.position.x, this.player.position.z);
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

function startOfficeSimApp() {
  const app = new OfficeSimApp();
  app.init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startOfficeSimApp);
} else {
  startOfficeSimApp();
}