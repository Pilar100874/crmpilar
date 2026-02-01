// Popup script for the extension
document.addEventListener('DOMContentLoaded', async () => {
  const userIdInput = document.getElementById('userId');
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const loginSection = document.getElementById('loginSection');
  const activeSection = document.getElementById('activeSection');
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  const userRow = document.getElementById('userRow');
  const userIdDisplay = document.getElementById('userIdDisplay');

  // Load saved user ID
  const saved = await chrome.storage.local.get(['userId']);
  if (saved.userId) {
    userIdInput.value = saved.userId;
  }

  // Check current capture status
  updateUI();

  startBtn.addEventListener('click', async () => {
    const userId = userIdInput.value.trim();
    
    if (!userId) {
      alert('Por favor, insira o ID do usuário');
      return;
    }

    // Save user ID
    await chrome.storage.local.set({ userId });

    // Start capture
    chrome.runtime.sendMessage({ 
      action: 'startCapture', 
      userId 
    }, (response) => {
      if (response.success) {
        updateUI();
      }
    });
  });

  stopBtn.addEventListener('click', () => {
    chrome.runtime.sendMessage({ action: 'stopCapture' }, (response) => {
      if (response.success) {
        updateUI();
      }
    });
  });

  function updateUI() {
    chrome.runtime.sendMessage({ action: 'getStatus' }, (response) => {
      if (response.isCapturing) {
        loginSection.classList.add('hidden');
        activeSection.classList.remove('hidden');
        statusDot.classList.remove('inactive');
        statusDot.classList.add('active');
        statusText.textContent = 'Ativo';
        userRow.style.display = 'flex';
        userIdDisplay.textContent = response.userId?.substring(0, 8) + '...';
      } else {
        loginSection.classList.remove('hidden');
        activeSection.classList.add('hidden');
        statusDot.classList.remove('active');
        statusDot.classList.add('inactive');
        statusText.textContent = 'Inativo';
        userRow.style.display = 'none';
      }
    });
  }
});
