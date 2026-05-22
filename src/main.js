import './styles/main.css';
import Game from './game/Game';

/**
 * Entry point for Asphalt Neon Cyberpunk
 * Instantiates the Game loop, manages general loaded states,
 * and sets up Page Visibility API optimizations to conserve system resources.
 */
document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  
  // Initialize the game
  game.init();

  // Progressively fade out loading screen once systems are wired
  const loader = document.getElementById('loading-screen');
  const loaderProgress = document.getElementById('loader-progress');
  const loaderStatus = document.getElementById('loader-status');

  if (loader && loaderProgress && loaderStatus) {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 5;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        loaderProgress.style.width = '100%';
        loaderStatus.innerText = 'Neural drive Snapped!';
        
        setTimeout(() => {
          loader.classList.remove('active');
        }, 300);
      } else {
        loaderProgress.style.width = progress + '%';
        loaderStatus.innerText = `Calibrating splines... ${progress}%`;
      }
    }, 80);
  }

  // ==========================================================================
  // Efficient Background Processing - Page Visibility API
  // Conserves battery, GPU, and CPU when the browser tab is out of focus.
  // ==========================================================================
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      // Pause game mechanics and audio to save power when tab is inactive
      if (game.state === 'PLAYING') {
        game.pauseGame();
        console.log('[Asphalt Neon] Tab hidden. Simulation paused to conserve resources.');
      }
    }
  });
});
