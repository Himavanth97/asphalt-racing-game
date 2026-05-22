/**
 * Input Management System for Asphalt Neon
 * Tracks keyboard controls (WASD/Arrows, Space, Shift, R) and handles mobile touch triggers.
 */
export default class Input {
  constructor() {
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false,
      drift: false,
      nitro: false,
      reset: false
    };

    this.isTouchDevice = false;
    this.touchSteerLeft = false;
    this.touchSteerRight = false;
    this.touchDrift = false;
    this.touchNitro = false;

    this.initKeyboard();
    this.initTouch();
  }

  initKeyboard() {
    window.addEventListener('keydown', (e) => {
      this.handleKey(e.code, true);
    });

    window.addEventListener('keyup', (e) => {
      this.handleKey(e.code, false);
    });
  }

  handleKey(code, isDown) {
    switch (code) {
      case 'ArrowUp':
      case 'KeyW':
        this.keys.forward = isDown;
        break;
      case 'ArrowDown':
      case 'KeyS':
        this.keys.backward = isDown;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        this.keys.left = isDown;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.keys.right = isDown;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        this.keys.drift = isDown;
        break;
      case 'Space':
        this.keys.nitro = isDown;
        break;
      case 'KeyR':
        this.keys.reset = isDown;
        break;
    }
  }

  initTouch() {
    // Detect touch capability
    this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    // Bind virtual touch elements from index.html
    const btnLeft = document.getElementById('touch-left-btn');
    const btnRight = document.getElementById('touch-right-btn');
    const btnBrake = document.getElementById('touch-brake-btn');
    const btnNitro = document.getElementById('touch-nitro-btn');

    if (!btnLeft || !btnRight || !btnBrake || !btnNitro) return;

    // Helper to add multi-touch friendly listeners
    const bindTouchTrigger = (element, startCallback, endCallback) => {
      element.addEventListener('touchstart', (e) => {
        e.preventDefault();
        startCallback();
      }, { passive: false });

      element.addEventListener('touchend', (e) => {
        e.preventDefault();
        endCallback();
      }, { passive: false });

      element.addEventListener('touchcancel', (e) => {
        e.preventDefault();
        endCallback();
      }, { passive: false });

      // Fallback for mouse testing on desktop
      element.addEventListener('mousedown', () => {
        startCallback();
      });

      element.addEventListener('mouseup', () => {
        endCallback();
      });

      element.addEventListener('mouseleave', () => {
        endCallback();
      });
    };

    bindTouchTrigger(btnLeft, 
      () => { this.touchSteerLeft = true; }, 
      () => { this.touchSteerLeft = false; }
    );

    bindTouchTrigger(btnRight, 
      () => { this.touchSteerRight = true; }, 
      () => { this.touchSteerRight = false; }
    );

    bindTouchTrigger(btnBrake, 
      () => { this.touchDrift = true; }, 
      () => { this.touchDrift = false; }
    );

    bindTouchTrigger(btnNitro, 
      () => { this.touchNitro = true; }, 
      () => { this.touchNitro = false; }
    );
  }

  // Getters merging keyboard + touch states
  get forward() {
    return this.keys.forward || (this.isTouchDevice && !this.touchSteerLeft && !this.touchSteerRight && !this.touchDrift);
    // Auto accelerate on touch devices if not steering/braking to make mobile racing feel effortless
  }

  get backward() {
    return this.keys.backward || (this.isTouchDevice && this.touchDrift && !this.touchSteerLeft && !this.touchSteerRight);
  }

  get left() {
    return this.keys.left || this.touchSteerLeft;
  }

  get right() {
    return this.keys.right || this.touchSteerRight;
  }

  get drift() {
    return this.keys.drift || this.touchDrift;
  }

  get nitro() {
    return this.keys.nitro || this.touchNitro;
  }

  get reset() {
    const val = this.keys.reset;
    if (val) this.keys.reset = false; // Trigger once per keypress
    return val;
  }

  // Forces HUD visibility if needed
  checkHUDVisibility() {
    const hud = document.getElementById('mobile-controls');
    if (!hud) return;
    
    const forceOn = document.getElementById('hud-force-touch-on').classList.contains('active');
    const forceOff = document.getElementById('hud-force-touch-off').classList.contains('active');

    if (forceOn) {
      hud.classList.remove('hidden');
    } else if (forceOff) {
      if (this.isTouchDevice) {
        hud.classList.remove('hidden');
      } else {
        hud.classList.add('hidden');
      }
    }
  }
}
