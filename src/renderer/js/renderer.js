const minimizeBtn = document.getElementById('minimize-btn');
const closeBtn = document.getElementById('close-btn');

minimizeBtn.addEventListener('click', () => {
  window.electronAPI.minimize();
});

closeBtn.addEventListener('click', () => {
  window.electronAPI.close();
});
