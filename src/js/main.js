/**
 * Office Simulator & Training Manual
 * Complete Edition with Board System & Continuous Collision Detection
 */

const CONFIG = {
  GAS_API_URL: "https://script.google.com/macros/s/AKfycbzt5FzmsRpP1qXWNJg8LKzm6NMZ6yhaKS8BxGj481lBz8T2fAk8bY9XOu2RpUrFHXZyjg/exec",
  FIELD_SIZE: 50,
  GRID_SIZE: 0.5,
  GRID_DIVISIONS: 100,
  MOVE_SPEED: 7.5,
  ROTATION_SPEED: 14.0,
  CAMERA_VIEW_SIZE: 14,
  CAMERA_ELEVATION: 30,
  CAMERA_DISTANCE: 26,
  PLAYER_RADIUS: 0.35,

  // 衝突によるポップアップ発火の所要時間（秒）
  COLLISION_TRIGGER_TIME: 2.5,

  FLOORS: [
    { id: 1, name: "1F エントランス・受付", color: 0xe8eaf6 },
    { id: 2, name: "2F 総務・人事・経理部", color: 0xe0f2f1 },
    { id: 3, name: "3F 営業本部・企画推進部", color: 0xf5f5f0 },
    { id: 4, name: "4F DX開発部・システム課", color: 0xe3f2fd },
    { id: 5, name: "5F マーケティング・制作部", color: 0xfce4ec },
    { id: 6, name: "6F 会議室・セミナールーム", color: 0xfff3e0 },
    { id: 7, name: "7F 役員フロア・特別応接室", color: 0xefebe9 },
    { id: 8, name: "8F カフェ・リフレッシュラウンジ", color: 0xf1f8e9 }
  ],

  DISTRIBUTIONS: [
    { id: "dist_01", title: "週次営業進捗レポート", targetRoles: ["課長", "部長"] },
    { id: "dist_02", title: "社内セキュリティ監査通知", targetRoles: ["全員"] },
    { id: "dist_03", title: "健康診断案内票", targetRoles: ["全員"] },
    { id: "dist_04", title: "月次勤怠締め切り通知書", targetRoles: ["リーダー"] },
    { id: "dist_05", title: "新規プロジェクト要件概要", targetRoles: ["開発", "企画"] },
    { id: "dist_06", title: "備品発注承認依頼シート", targetRoles: ["課長"] },
    { id: "dist_07", title: "防災訓練手順チェック表", targetRoles: ["フロア責任者"] },
    { id: "dist_08", title: "郵便・宅配便受領サイン用紙", targetRoles: ["総務"] },
    { id: "dist_09", title: "新任研修アンケート", targetRoles: ["新入社員"] },
    { id: "dist_10", title: "役員会議事録", targetRoles: ["役員"] }
  ]
};

class SheetService {
  constructor(apiEndpoint) {
    this.apiEndpoint = apiEndpoint;
  }

  async fetchDictionary() {
    try {
      const res = await fetch(`${this.apiEndpoint}?action=getDictionary`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
      return this.getMockDictionary();
    } catch (e) {
      return this.getMockDictionary();
    }
  }

  async fetchWorkflows() {
    try {
      const res = await fetch(`${this.apiEndpoint}?action=getWorkflows`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
      return this.getMockWorkflows();
    } catch (e) {
      return this.getMockWorkflows();
    }
  }

  async fetchFloorLayout(floorId) {
    try {
      const res = await fetch(`${this.apiEndpoint}?action=getLayout&floor=${floorId}`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
      return null;
    } catch (e) {
      return null;
    }
  }

  async saveFloorLayout(floorId, items) {
    try {
      await fetch(this.apiEndpoint, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "saveLayout", floor: floorId, items: items })
      });
      return true;
    } catch (e) {
      return false;
    }
  }

  async fetchBoardPosts() {
    try {
      const res = await fetch(`${this.apiEndpoint}?action=getBoardPosts`);
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) return data;
      return this.getMockBoardPosts();
    } catch (e) {
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
    } catch (e) {
      return false;
    }
  }

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
}

class FurnitureFactory {
  static create(type, data = {}) {
    const group = new THREE.Group();
    group.name = `furniture_${type}_${Date.now()}`;
    group.userData = {
      type: type,
      gridX: parseFloat(data.x) || 0,
      gridZ: parseFloat(data.z) || 0,
      role: data.role || (type === 'desk' ? '社員' : '共用備品'),
      person: data.person || '未設定',
      task: data.task || 'なし',
      distNeeded: data.distNeeded || null,
      isMySeat: !!data.isMySeat,
      isPrinter: !!data.isPrinter || type === 'printer',
      collisionRadius: (type === 'partition' || type === 'phone') ? 0.35 : 0.65
    };

    let mesh;
    switch (type) {
      case 'desk': mesh = this.buildDesk(group.userData.isMySeat); break;
      case 'chair': mesh = this.buildChair(); break;
      case 'partition': mesh = this.buildPartition(); break;
      case 'printer': mesh = this.buildPrinter(); break;
      case 'locker': mesh = this.buildLocker(); break;
      case 'phone': mesh = this.buildPhone(); break;
      case 'board': mesh = this.buildBoard(); break;
      default: mesh = this.buildBox(); break;
    }
    group.add(mesh);

    const redDotGeo = new THREE.SphereGeometry(0.22, 16, 16);
    const redDotMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });
    const redDot = new THREE.Mesh(redDotGeo, redDotMat);
    redDot.position.set(0, 1.8, 0);
    redDot.visible = false;
    group.add(redDot);
    group.userData.redDot = redDot;

    group.position.set(
      Math.round((parseFloat(data.x) || 0) / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE,
      0,
      Math.round((parseFloat(data.z) || 0) / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE
    );
    group.rotation.y = parseFloat(data.rotation) || 0;

    return group;
  }

  static buildDesk(isMySeat) {
    const group = new THREE.Group();
    const topGeo = new THREE.BoxGeometry(1.4, 0.05, 0.8);
    const topMat = new THREE.MeshStandardMaterial({ color: isMySeat ? 0x64b5f6 : 0xd7ccc8, roughness: 0.4 });
    const top = new THREE.Mesh(topGeo, topMat);
    top.position.y = 0.72;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.7, 8);
    const legMat = new THREE.MeshStandardMaterial({ color: 0x455a64 });
    [[-0.62, -0.32], [0.62, -0.32], [-0.62, 0.32], [0.62, 0.32]].forEach(([x, z]) => {
      const leg = new THREE.Mesh(legGeo, legMat);
      leg.position.set(x, 0.35, z);
      leg.castShadow = true;
      group.add(leg);
    });

    const monGeo = new THREE.BoxGeometry(0.5, 0.3, 0.04);
    const monMat = new THREE.MeshStandardMaterial({ color: 0x212121 });
    const mon = new THREE.Mesh(monGeo, monMat);
    mon.position.set(0, 0.95, -0.2);
    mon.castShadow = true;
    group.add(mon);

    return group;
  }

  static buildChair() {
    const group = new THREE.Group();
    const seatGeo = new THREE.BoxGeometry(0.48, 0.06, 0.48);
    const seatMat = new THREE.MeshStandardMaterial({ color: 0x37474f });
    const seat = new THREE.Mesh(seatGeo, seatMat);
    seat.position.y = 0.45;
    seat.castShadow = true;
    group.add(seat);

    const backGeo = new THREE.BoxGeometry(0.48, 0.45, 0.05);
    const back = new THREE.Mesh(backGeo, seatMat);
    back.position.set(0, 0.7, -0.22);
    back.castShadow = true;
    group.add(back);

    const poleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.42, 8);
    const pole = new THREE.Mesh(poleGeo, seatMat);
    pole.position.y = 0.21;
    group.add(pole);

    return group;
  }

  static buildPartition() {
    const geo = new THREE.BoxGeometry(1.2, 1.4, 0.06);
    const mat = new THREE.MeshStandardMaterial({ color: 0x90a4ae });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.7;
    mesh.castShadow = true;
    return mesh;
  }

  static buildPrinter() {
    const group = new THREE.Group();
    const bodyGeo = new THREE.BoxGeometry(0.9, 0.95, 0.8);
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xeeeeee });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.48;
    body.castShadow = true;
    group.add(body);

    const panelGeo = new THREE.BoxGeometry(0.4, 0.06, 0.25);
    const panelMat = new THREE.MeshStandardMaterial({ color: 0x1976d2 });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(0.15, 0.98, 0.2);
    group.add(panel);

    return group;
  }

  static buildLocker() {
    const geo = new THREE.BoxGeometry(0.9, 1.8, 0.5);
    const mat = new THREE.MeshStandardMaterial({ color: 0xb0bec5 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.9;
    mesh.castShadow = true;
    return mesh;
  }

  static buildPhone() {
    const geo = new THREE.BoxGeometry(0.25, 0.1, 0.25);
    const mat = new THREE.MeshStandardMaterial({ color: 0x455a64 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.75;
    return mesh;
  }

  static buildBoard() {
    const group = new THREE.Group();
    const geo = new THREE.BoxGeometry(1.6, 1.1, 0.06);
    const mat = new THREE.MeshStandardMaterial({ color: 0x5d4037, roughness: 0.8 });
    const frame = new THREE.Mesh(geo, mat);
    frame.position.y = 1.35;
    frame.castShadow = true;
    group.add(frame);

    const faceGeo = new THREE.BoxGeometry(1.48, 0.98, 0.07);
    const faceMat = new THREE.MeshStandardMaterial({ color: 0xd7ccc8, roughness: 0.9 });
    const face = new THREE.Mesh(faceGeo, faceMat);
    face.position.y = 1.35;
    group.add(face);

    return group;
  }

  static buildBox() {
    const geo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffb74d });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = 0.4;
    return mesh;
  }
}

class Player {
  constructor(scene) {
    this.scene = scene;
    this.mesh = new THREE.Group();
    this.position = new THREE.Vector3(0, 0, 0);
    this.targetRotation = 0;
    this.bounceTimer = 0;

    const headGeo = new THREE.SphereGeometry(0.35, 24, 24);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xe53935, roughness: 0.2 });
    this.head = new THREE.Mesh(headGeo, headMat);
    this.head.position.y = 1.35;
    this.head.castShadow = true;
    this.mesh.add(this.head);

    const coneGeo = new THREE.ConeGeometry(0.28, 0.9, 24);
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xc62828 });
    this.body = new THREE.Mesh(coneGeo, coneMat);
    this.body.rotation.x = Math.PI;
    this.body.position.y = 0.7;
    this.body.castShadow = true;
    this.mesh.add(this.body);

    const shadowGeo = new THREE.RingGeometry(0.05, 0.35, 16);
    const shadowMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    this.mesh.add(shadow);

    this.scene.add(this.mesh);
  }

  getForwardVector() {
    return new THREE.Vector3(Math.sin(this.targetRotation), 0, Math.cos(this.targetRotation));
  }

  update(moveVec, delta, obstacleCheck) {
    const len = Math.hypot(moveVec.x, moveVec.y);
    let collidedObject = null;

    if (len > 0.05) {
      const normX = moveVec.x / Math.max(1, len);
      const normZ = moveVec.y / Math.max(1, len);
      const moveDist = CONFIG.MOVE_SPEED * Math.min(len, 1.0) * delta;

      const nextX = this.mesh.position.x + normX * moveDist;
      const hitX = obstacleCheck(nextX, this.mesh.position.z);
      if (!hitX) {
        const half = (CONFIG.FIELD_SIZE / 2) - 1.0;
        this.mesh.position.x = Math.max(-half, Math.min(half, nextX));
      } else {
        collidedObject = hitX;
      }

      const nextZ = this.mesh.position.z + normZ * moveDist;
      const hitZ = obstacleCheck(this.mesh.position.x, nextZ);
      if (!hitZ) {
        const half = (CONFIG.FIELD_SIZE / 2) - 1.0;
        this.mesh.position.z = Math.max(-half, Math.min(half, nextZ));
      } else {
        collidedObject = hitZ;
      }

      this.targetRotation = Math.atan2(normX, normZ);
      this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, this.targetRotation, CONFIG.ROTATION_SPEED * delta);

      this.bounceTimer += delta * 15;
      this.head.position.y = 1.35 + Math.sin(this.bounceTimer) * 0.06;
      this.body.position.y = 0.7 + Math.sin(this.bounceTimer) * 0.03;
    } else {
      this.head.position.y = THREE.MathUtils.lerp(this.head.position.y, 1.35, delta * 10);
      this.body.position.y = THREE.MathUtils.lerp(this.body.position.y, 0.7, delta * 10);
    }
    this.position.copy(this.mesh.position);

    return len > 0.05 ? collidedObject : null;
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

    this.collidingObject = null;
    this.collisionTimer = 0;
    this.isModalActive = false;

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

      const r = obj.userData.collisionRadius || 0.6;
      const dx = x - obj.position.x;
      const dz = z - obj.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist < (CONFIG.PLAYER_RADIUS + r)) {
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
  }

  spawnFurnitureInFrontOfPlayer(type) {
    const fwd = this.player.getForwardVector();
    const targetX = this.player.position.x + fwd.x * 1.5;
    const targetZ = this.player.position.z + fwd.z * 1.5;

    const snapX = Math.round(targetX / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
    const snapZ = Math.round(targetZ / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;

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

    const success = await this.sheetService.saveFloorLayout(this.currentFloor, items);
    if (success) {
      alert(`フロア ${this.currentFloor}F のレイアウトをスプレッドシートに保存しました。`);
    }
  }

  setupEvents() {
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

    window.addEventListener('keydown', e => { this.keys[e.key.toLowerCase()] = true; });
    window.addEventListener('keyup', e => { this.keys[e.key.toLowerCase()] = false; });

    // バーチャルジョイスティック
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
      this.currentFloor = parseInt(e.target.value, 10);
      this.loadFloor(this.currentFloor);
      this.cancelTraining();
    });

    // 編集モード切替
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

    // パレットボタン
    document.querySelectorAll('.palette-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        const type = e.target.getAttribute('data-type');
        if (type) {
          this.spawnFurnitureInFrontOfPlayer(type);
        }
      });
    });

    document.getElementById('btn-palette-close')?.addEventListener('click', () => {
      if (palette) palette.classList.remove('active');
    });

    // 回転
    rotateBtn?.addEventListener('click', () => {
      if (this.selectedObject) {
        this.selectedObject.rotation.y += Math.PI / 2;
        if (this.boxHelper) this.boxHelper.update();
      }
    });

    // 家具ドラッグ操作
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
        const sx = Math.round(p.x / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
        const sz = Math.round(p.z / CONFIG.GRID_SIZE) * CONFIG.GRID_SIZE;
        const max = (CONFIG.FIELD_SIZE / 2) - 1.0;
        this.selectedObject.position.x = Math.max(-max, Math.min(max, sx));
        this.selectedObject.position.z = Math.max(-max, Math.min(max, sz));
        if (this.boxHelper) this.boxHelper.update();
      }
    });

    window.addEventListener('pointerup', () => { this.isDragging = false; });

    // 辞書
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

    // 業務フロー
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

  // 衝突が2.5秒続いた際の発火振り分け
  handleTriggerObject(obj) {
    if (this.isEditMode) {
      this.selectFurniture(obj);
      return;
    }

    const data = obj.userData;
    if (data.isPrinter) {
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

  // 自席掲示板の表示 & 投稿処理
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

    const formHtml = `
      <div style="background: #f0f4f8; padding: 12px; border-radius: 8px;">
        <div style="font-weight: bold; font-size: 13px; margin-bottom: 8px; color: #37474f;">📌 掲示板に新規投稿</div>
        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
          <input type="text" id="board-author" placeholder="氏名" style="flex: 1; padding: 6px 10px; border: 1px solid #b0bec5; border-radius: 6px; font-size: 12px;">
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
      const author = document.getElementById('board-author').value.trim() || '社員';
      const category = document.getElementById('board-category').value;
      const message = document.getElementById('board-message').value.trim();

      if (!message) {
        alert("投稿内容を入力してください。");
        return;
      }

      const now = new Date();
      const dateStr = `${now.getFullYear()}/${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

      const newPost = {
        id: `post_${Date.now()}`,
        date: dateStr,
        author: author,
        category: category,
        message: message
      };

      await this.sheetService.saveBoardPost(newPost);
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

    // 2.5秒以上の衝突押し当て判定
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

    // 配布物トレーニング判定
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
              alert("🎉 全ての座席への配布が完了しました！トレーニング達成です。");
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