/* ============================================
   Vanilla canvas signature pad
   Usage:
     const pad = new SignaturePad(canvasEl, { onStart, onEnd });
     pad.clear();
     pad.isEmpty();
     pad.toDataURL();
     pad.fromDataURL(dataUrl);
   ============================================ */

class SignaturePad {
  constructor(canvas, opts = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onStart = opts.onStart || (() => {});
    this.onEnd = opts.onEnd || (() => {});
    this.strokeStyle = opts.strokeStyle || '#202124';
    this.lineWidth = opts.lineWidth || 2.2;
    this.drawing = false;
    this._empty = true;
    this._last = null;

    this._resize = this._resize.bind(this);
    this._down = this._down.bind(this);
    this._move = this._move.bind(this);
    this._up = this._up.bind(this);

    this._resize();
    window.addEventListener('resize', this._resize);

    canvas.addEventListener('pointerdown', this._down);
    canvas.addEventListener('pointermove', this._move);
    canvas.addEventListener('pointerup', this._up);
    canvas.addEventListener('pointercancel', this._up);
    canvas.addEventListener('pointerleave', this._up);
  }

  _resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const prev = this._empty ? null : this.toDataURL();

    this.canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    this.canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.strokeStyle = this.strokeStyle;
    this.ctx.lineWidth = this.lineWidth;

    if (prev) this.fromDataURL(prev);
  }

  _pos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  _down(e) {
    e.preventDefault();
    this.canvas.setPointerCapture(e.pointerId);
    this.drawing = true;
    const p = this._pos(e);
    this._last = p;
    this.ctx.beginPath();
    this.ctx.moveTo(p.x, p.y);
    if (this._empty) this.onStart();
  }

  _move(e) {
    if (!this.drawing) return;
    e.preventDefault();
    const p = this._pos(e);
    this.ctx.lineTo(p.x, p.y);
    this.ctx.stroke();
    this._last = p;
    this._empty = false;
  }

  _up(e) {
    if (!this.drawing) return;
    this.drawing = false;
    try { this.canvas.releasePointerCapture(e.pointerId); } catch {}
    if (!this._empty) this.onEnd(this.toDataURL());
  }

  clear() {
    const { width, height } = this.canvas;
    const dpr = window.devicePixelRatio || 1;
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, width, height);
    this.ctx.restore();
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._empty = true;
  }

  isEmpty() { return this._empty; }

  toDataURL() { return this.canvas.toDataURL('image/png'); }

  fromDataURL(dataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const rect = this.canvas.getBoundingClientRect();
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();
        const dpr = window.devicePixelRatio || 1;
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        this.ctx.drawImage(img, 0, 0, rect.width, rect.height);
        this._empty = false;
        resolve();
      };
      img.src = dataUrl;
    });
  }

  destroy() {
    window.removeEventListener('resize', this._resize);
  }
}
