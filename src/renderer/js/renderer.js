const minimizeBtn = document.getElementById('minimize-btn');
const closeBtn = document.getElementById('close-btn');

// Window controls
minimizeBtn.addEventListener('click', () => {
  window.electronAPI.minimize();
});

closeBtn.addEventListener('click', () => {
  window.electronAPI.close();
});

// Network adapter elements
const adapterName = document.getElementById('adapter-name');
const adapterDescription = document.getElementById('adapter-description');
const adapterStatus = document.getElementById('adapter-status');

// Load network adapters
async function loadNetworkAdapters() {
  try {
    adapterName.textContent = 'Detecting...';
    adapterDescription.textContent = 'Please wait...';
    adapterStatus.textContent = 'Checking';

    const result = await window.electronAPI.getNetworkAdapters();

    if (!result.success) {
      throw new Error(result.message);
    }

    const adapters = result.adapters.filter(
      (adapter) => adapter.status === 'Up',
    );

    if (adapters.length === 0) {
      adapterName.textContent = 'No active adapter';
      adapterDescription.textContent = 'No connected network found';
      adapterStatus.textContent = 'Disconnected';
      return;
    }

    const adapter = adapters[0];

    adapterName.textContent = adapter.name;
    adapterDescription.textContent = adapter.description;
    adapterStatus.textContent = 'Connected';

    console.log('Detected adapters:', adapters);
  } catch (error) {
    console.error('Adapter detection failed:', error);

    adapterName.textContent = 'Detection failed';
    adapterDescription.textContent = error.message;
    adapterStatus.textContent = 'Error';
  }
}

// Start detection
loadNetworkAdapters();
