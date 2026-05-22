/**
 * UI & HUD Overlay Controller for Asphalt Neon
 * Integrates HTML elements, carousel selectors, digital/arc speedometers, nitro meters, and dynamic standings leaderboards.
 */
export class UI {
  constructor(game) {
    this.game = game;

    // Cache screens
    this.loadingScreen = document.getElementById('loading-screen');
    this.mainMenu = document.getElementById('main-menu');
    this.gameHud = document.getElementById('game-hud');
    this.settingsOverlay = document.getElementById('settings-overlay');
    this.controlsModal = document.getElementById('controls-modal');
    this.pauseOverlay = document.getElementById('pause-overlay');
    this.gameOverScreen = document.getElementById('game-over-screen');

    // Stats mapping
    this.carName = document.getElementById('car-name');
    this.carClass = document.getElementById('car-class');
    this.statSpeed = document.getElementById('stat-speed');
    this.statAccel = document.getElementById('stat-accel');
    this.statHandling = document.getElementById('stat-handling');
    this.statNitro = document.getElementById('stat-nitro');

    this.statSpeedVal = document.getElementById('stat-speed-val');
    this.statAccelVal = document.getElementById('stat-accel-val');
    this.statHandlingVal = document.getElementById('stat-handling-val');
    this.statNitroVal = document.getElementById('stat-nitro-val');

    // HUD items
    this.hudRank = document.getElementById('hud-rank');
    this.hudTime = document.getElementById('hud-time');
    this.hudLap = document.getElementById('hud-lap');
    this.hudSpeed = document.getElementById('hud-speed-val');
    this.hudSpeedFill = document.getElementById('speedometer-fill');
    this.hudNitroFill = document.getElementById('hud-nitro-fill');
    this.hudNitroVal = document.getElementById('hud-nitro-val');
    this.hudDriftPanel = document.querySelector('.drift-score-panel');
    this.hudDriftVal = document.getElementById('hud-drift-val');
    
    // Alerts
    this.alertText = document.getElementById('hud-alert-text');
    this.alertTimeout = null;

    // Carousel cars list
    this.carsList = [
      {
        name: "ANTIGRAVITY X",
        class: "HYPER-CLASS",
        color: 0xffd700,
        stats: { speed: 99, accel: 98, handling: 92, nitro: 99 },
        speedTxt: "430 KM/H", accelTxt: "1.5 S", handlingTxt: "9.2/10", nitroTxt: "9.9/10"
      },
      {
        name: "CYBER HAWK",
        class: "S-CLASS",
        color: 0x00f3ff,
        stats: { speed: 85, accel: 78, handling: 72, nitro: 88 },
        speedTxt: "340 KM/H", accelTxt: "2.3 S", handlingTxt: "7.6/10", nitroTxt: "9.2/10"
      },
      {
        name: "VENOM SPRINT",
        class: "A-CLASS",
        color: 0xff007f,
        stats: { speed: 78, accel: 85, handling: 80, nitro: 70 },
        speedTxt: "320 KM/H", accelTxt: "2.1 S", handlingTxt: "8.5/10", nitroTxt: "7.0/10"
      },
      {
        name: "APEX STALKER",
        class: "X-CLASS",
        color: 0x9d00ff,
        stats: { speed: 95, accel: 90, handling: 65, nitro: 95 },
        speedTxt: "385 KM/H", accelTxt: "1.9 S", handlingTxt: "6.8/10", nitroTxt: "9.8/10"
      }
    ];
    this.currentCarIdx = 0;
    this.selectedTrack = 'neon-city';

    this.bindEvents();
    this.updateCarCarousel();
  }

  showScreen(screen) {
    // Hide all overlays first
    const screens = [
      this.loadingScreen, this.mainMenu, this.gameHud, 
      this.settingsOverlay, this.controlsModal, 
      this.pauseOverlay, this.gameOverScreen
    ];
    screens.forEach(s => s.classList.remove('active'));
    
    if (screen) {
      screen.classList.add('active');
    }
  }

  bindEvents() {
    // Car Selection Carousel
    document.getElementById('car-prev-btn').addEventListener('click', () => {
      this.currentCarIdx = (this.currentCarIdx - 1 + this.carsList.length) % this.carsList.length;
      this.updateCarCarousel();
    });

    document.getElementById('car-next-btn').addEventListener('click', () => {
      this.currentCarIdx = (this.currentCarIdx + 1) % this.carsList.length;
      this.updateCarCarousel();
    });

    // Track Selection
    const cards = document.querySelectorAll('.track-card');
    cards.forEach(card => {
      card.addEventListener('click', (e) => {
        cards.forEach(c => c.classList.remove('active'));
        const target = e.currentTarget;
        target.classList.add('active');
        this.selectedTrack = target.getAttribute('data-track');
      });
    });

    // Start Game
    document.getElementById('start-race-btn').addEventListener('click', () => {
      this.game.startRace(this.carsList[this.currentCarIdx], this.selectedTrack);
    });

    // Settings
    document.getElementById('settings-toggle-btn').addEventListener('click', () => {
      this.settingsOverlay.classList.add('active');
    });

    document.getElementById('settings-close-btn').addEventListener('click', () => {
      this.settingsOverlay.classList.remove('active');
      this.game.input.checkHUDVisibility();
    });

    // Help Controls
    document.getElementById('controls-help-btn').addEventListener('click', () => {
      this.controlsModal.classList.add('active');
    });

    document.getElementById('controls-close-btn').addEventListener('click', () => {
      this.controlsModal.classList.remove('active');
    });

    // Pause button
    document.getElementById('pause-game-btn').addEventListener('click', () => {
      this.game.pauseGame();
    });

    document.getElementById('pause-resume-btn').addEventListener('click', () => {
      this.game.resumeGame();
    });

    document.getElementById('pause-restart-btn').addEventListener('click', () => {
      this.game.restartRace();
    });

    document.getElementById('pause-quit-btn').addEventListener('click', () => {
      this.game.quitToMenu();
    });

    // Game Over Podium
    document.getElementById('over-retry-btn').addEventListener('click', () => {
      this.game.restartRace();
    });

    document.getElementById('over-menu-btn').addEventListener('click', () => {
      this.game.quitToMenu();
    });

    // Settings Quality Detail
    const qualBtns = document.querySelectorAll('[data-quality]');
    qualBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        qualBtns.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        // Triggers pixelRatio changes inside Game
        this.game.setQuality(e.currentTarget.getAttribute('data-quality'));
      });
    });

    // Volume sliders
    const soundSlider = document.getElementById('sound-vol-slider');
    const soundVal = document.getElementById('sound-vol-val');
    soundSlider.addEventListener('input', (e) => {
      const val = e.target.value;
      soundVal.innerText = val + '%';
      this.game.audio.setSFXVolume(val);
    });

    const musicSlider = document.getElementById('music-vol-slider');
    const musicVal = document.getElementById('music-vol-val');
    musicSlider.addEventListener('input', (e) => {
      const val = e.target.value;
      musicVal.innerText = val + '%';
      this.game.audio.setMusicVolume(val);
    });

    // Camera Perspectives
    const camBtns = document.querySelectorAll('[data-cam]');
    camBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        camBtns.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.game.setCameraPerspective(e.currentTarget.getAttribute('data-cam'));
      });
    });

    // Force Touch Overlay options
    const forceBtns = document.querySelectorAll('#hud-force-touch-off, #hud-force-touch-on');
    forceBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        forceBtns.forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        this.game.input.checkHUDVisibility();
      });
    });
  }

  updateCarCarousel() {
    const car = this.carsList[this.currentCarIdx];
    this.carName.innerText = car.name;
    this.carClass.innerText = car.class;

    // Apply color to name text as highlight
    const hexColor = '#' + car.color.toString(16).padStart(6, '0');
    this.carName.style.color = hexColor;
    this.carClass.style.borderColor = hexColor;
    this.carClass.style.color = hexColor;

    this.statSpeed.style.width = car.stats.speed + '%';
    this.statAccel.style.width = car.stats.accel + '%';
    this.statHandling.style.width = car.stats.handling + '%';
    this.statNitro.style.width = car.stats.nitro + '%';

    this.statSpeedVal.innerText = car.speedTxt;
    this.statAccelVal.innerText = car.accelTxt;
    this.statHandlingVal.innerText = car.handlingTxt;
    this.statNitroVal.innerText = car.nitroTxt;

    // Dynamically update the 3D menu showcase car color
    if (this.game && typeof this.game.updateMenuShowcaseColor === 'function') {
      this.game.updateMenuShowcaseColor(car.color);
    }
  }

  updateHUD(speed, nitro, lap, maxLaps, rank, totalRacers, driftScore) {
    // 1. Digital & Arc Speedometers
    const kmh = Math.round(speed * 3.6); // conversion
    this.hudSpeed.innerText = kmh;

    // Circular svg arc calculation
    // Speed max is ~70 m/s with nitro
    const maxSpeedDisplay = 260; // KM/H
    const ratio = Math.min(1.0, kmh / maxSpeedDisplay);
    
    // Circular arc has circumference 251.2
    // Gauge opens by 1/4 (62.8 dash space). Dash offset covers remaining 188.4 scale.
    const maxOffset = 251.2;
    const minOffset = 62.8;
    const targetOffset = maxOffset - ratio * (maxOffset - minOffset);
    
    this.hudSpeedFill.style.strokeDashoffset = targetOffset;
    
    // Glowing color shift at nitro speed
    if (this.game.playerCar && this.game.playerCar.isNitroActive) {
      this.hudSpeedFill.style.stroke = '#9d00ff';
    } else {
      this.hudSpeedFill.style.stroke = '#00f3ff';
    }

    // 2. Nitro bar
    const nitroPct = Math.round(nitro * 100);
    this.hudNitroFill.style.width = nitroPct + '%';
    this.hudNitroVal.innerText = nitroPct + '%';

    // 3. Lap and position indicators
    this.hudLap.innerText = lap;
    this.hudRank.innerText = rank;

    // 4. Drift score panel
    if (driftScore > 0) {
      this.hudDriftPanel.classList.remove('hidden');
      this.hudDriftVal.innerText = driftScore.toLocaleString();
    } else {
      this.hudDriftPanel.classList.add('hidden');
    }
  }

  updateTimer(elapsedTime) {
    const min = Math.floor(elapsedTime / 60);
    const sec = Math.floor(elapsedTime % 60);
    const ms = Math.floor((elapsedTime % 1) * 100);
    
    const minStr = min.toString().padStart(2, '0');
    const secStr = sec.toString().padStart(2, '0');
    const msStr = ms.toString().padStart(2, '0');

    this.hudTime.innerText = `${minStr}:${secStr}:${msStr}`;
  }

  triggerAlert(text) {
    if (this.alertTimeout) {
      clearTimeout(this.alertTimeout);
    }

    this.alertText.innerText = text;
    this.alertText.classList.remove('hidden');

    this.alertTimeout = setTimeout(() => {
      this.alertText.classList.add('hidden');
    }, 2200);
  }

  populateLeaderboard(pilotStandings, playerIndex) {
    const tbody = document.getElementById('leaderboard-rows');
    tbody.innerHTML = ''; // Wipe

    pilotStandings.forEach((pilot, idx) => {
      const tr = document.createElement('tr');
      
      // Standings highlighting
      if (idx === 0) tr.classList.add('winner-row');
      if (pilot.isPlayer) tr.classList.add('player-row');

      // Rank suffix (1st, 2nd, 3rd, 4th)
      const rankSuffix = ["1st", "2nd", "3rd", "4th"][idx] || (idx + 1) + "th";

      // Time conversion
      let timeStr = "--:--:--";
      if (pilot.time > 0) {
        const min = Math.floor(pilot.time / 60);
        const sec = Math.floor(pilot.time % 60);
        const ms = Math.floor((pilot.time % 1) * 100);
        timeStr = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;
      } else if (pilot.dnf) {
        timeStr = "DNF";
      }

      tr.innerHTML = `
        <td class="col-rank">${rankSuffix}</td>
        <td>${pilot.name}</td>
        <td>${pilot.vehicle}</td>
        <td class="col-time font-mono">${timeStr}</td>
      `;

      tbody.appendChild(tr);
    });
  }

  showResults(rank, time, speed, drift) {
    document.getElementById('res-position').innerText = ["1st", "2nd", "3rd", "4th"][rank - 1] || rank + "th";
    
    // Time formatted
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    document.getElementById('res-time').innerText = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}:${ms.toString().padStart(2, '0')}`;

    document.getElementById('res-speed').innerText = Math.round(speed * 3.6) + " KM/H";
    document.getElementById('res-drift').innerText = drift.toLocaleString();

    const title = document.getElementById('race-result-title');
    const subtitle = document.getElementById('race-result-subtitle');

    if (rank === 1) {
      title.innerText = "VICTORY!";
      title.style.color = '#ffaa00';
      subtitle.innerText = "YOU SECURED 1ST POSITION";
    } else {
      title.innerText = "RACE COMPLETED";
      title.style.color = '#ffffff';
      subtitle.innerText = `YOU FINISHED IN ${["1ST", "2ND", "3RD", "4TH"][rank - 1]} POSITION`;
    }

    this.showScreen(this.gameOverScreen);
  }
}
