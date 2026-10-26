// src/js/controls/Joystick.js

export class Joystick {
  constructor(zoneId, knobId) {
    this.zone = document.getElementById(zoneId);
    this.knob = document.getElementById(knobId);
    this.maxRadius = 45; // スティックの最大可動半径(px)

    this.active = false;
    this.startX = 0;
    this.startY = 0;

    // 出力ベクトル { x, y } (範囲: -1.0 ～ 1.0)
    this.vector = { x: 0, y: 0 };
    this.keys = {};

    this.initEvents();
  }

  initEvents() {
    // タッチ / マウスイベント (Pointer Events)
    this.zone.addEventListener('pointerdown', (e) => this.onStart(e));
    window.addEventListener('pointermove', (e) => this.onMove(e));
    window.addEventListener('pointerup', () => this.onEnd());
    window.addEventListener('pointercancel', () => this.onEnd());

    // キーボード入力
    window.addEventListener('keydown', (e) => {
      this.keys[e.key.toLowerCase()] = true;
    });
    window.addEventListener('keyup', (e) => {
      this.keys[e.key.toLowerCase()] = false;
    });
  }

  onStart(e) {
    this.active = true;
    const rect = this.zone.getBoundingClientRect();
    this.startX = rect.left + rect.width / 2;
    this.startY = rect.top + rect.height / 2;
    this.onMove(e);
  }

  onMove(e) {
    if (!this.active) return;

    let dx = e.clientX - this.startX;
    let dy = e.clientY - this.startY;
    let dist = Math.hypot(dx, dy);

    if (dist > this.maxRadius) {
      dx = (dx / dist) * this.maxRadius;
      dy = (dy / dist) * this.maxRadius;
      dist = this.maxRadius;
    }

    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;

    // クォータービュー（アイソメトリック）軸変換 (45度回転補正)
    const normalizedDist = dist / this.maxRadius;
    const angle = Math.atan2(dy, dx);
    const isoAngle = angle - Math.PI / 4;

    this.vector.x = Math.cos(isoAngle) * normalizedDist;
    this.vector.y = Math.sin(isoAngle) * normalizedDist;
  }

  onEnd() {
    this.active = false;
    this.knob.style.transform = 'translate(0px, 0px)';
    this.vector.x = 0;
    this.vector.y = 0;
  }

  getMovementVector() {
    let vx = this.vector.x;
    let vy = this.vector.y;

    // キーボード入力（斜めカメラ補正）
    let keyX = 0;
    let keyY = 0;
    if (this.keys['w'] || this.keys['arrowup'])    { keyX -= 0.707; keyY -= 0.707; }
    if (this.keys['s'] || this.keys['arrowdown'])  { keyX += 0.707; keyY += 0.707; }
    if (this.keys['a'] || this.keys['arrowleft'])  { keyX -= 0.707; keyY += 0.707; }
    if (this.keys['d'] || this.keys['arrowright']) { keyX += 0.707; keyY -= 0.707; }

    if (Math.hypot(keyX, keyY) > 0) {
      vx = keyX;
      vy = keyY;
    }

    return { x: vx, y: vy };
  }
}