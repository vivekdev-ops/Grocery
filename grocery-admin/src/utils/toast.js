// src/utils/toast.js

export const showToast = async (message, duration = 'short') => {
  try {
    // Check if running in a Capacitor native mobile environment
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      // If you eventually install @capacitor/toast, you can dynamically call it or use plugins here
      console.log('Native Toast:', message);
    } else {
      // Fallback custom web toast banner for browser/Android WebView preview
      const existingToast = document.getElementById('native-toast-banner');
      if (existingToast) existingToast.remove();

      const toast = document.createElement('div');
      toast.id = 'native-toast-banner';
      toast.innerText = message;
      toast.style.cssText = `
        position: fixed;
        bottom: 80px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(15, 23, 42, 0.9);
        color: #fff;
        padding: 10px 20px;
        border-radius: 9999px;
        font-size: 12px;
        font-weight: 900;
        z-index: 99999;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(8px);
        letter-spacing: 0.025em;
        transition: opacity 0.3s ease;
      `;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
      }, 2500);
    }
  } catch (err) {
    console.error('Toast error:', err);
  }
};