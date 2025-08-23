// Network Monitor Pro - Content Script
// Handles floating widget and page integration

class ContentScript {
  constructor() {
    this.widget = null;
    this.widgetData = null;
    this.updateInterval = null;
    
    // Add debug logging
    console.log('🔧 Network Monitor Content Script initialized');
    console.log('🔧 Content script version: 2.3.0');
    console.log('🔧 Widget state:', this.widget);
    
    // Set up message listener
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      console.log('🔧 Content script received message:', request.action);
      // Security: Validate message before processing (OWASP A03:2021 - Injection Prevention)
      if (!this.validateMessage(request, sender)) {
        console.warn('Security: Invalid message rejected');
        sendResponse({ error: 'Invalid message' });
        return true;
      }
      
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async response
    });
    
    console.log('🔧 Content script message listener set up');
    
    this.initialize();
  }

  initialize() {
    try {
      console.log('🔧 Initializing content script...');
      this.setupWidgetStyles();
      console.log('🔧 Content script initialization completed');
    } catch (error) {
      console.error('🔧 Error initializing content script:', error);
    }
  }

  // Security: Validate incoming messages
  validateMessage(request, sender) {
    try {
      // Check request structure
      if (!request || typeof request !== 'object') {
        console.warn('Security: Invalid request object');
        return false;
      }
      
      // Validate sender
      if (!sender || !sender.id) {
        console.warn('Security: Invalid sender information');
        return false;
      }
      
      // Validate action parameter
      if (!request.action || typeof request.action !== 'string') {
        console.warn('Security: Invalid action parameter');
        return false;
      }
      
      // Check action length (prevent buffer overflow)
      if (request.action.length > 50) {
        console.warn('Security: Action parameter too long');
        return false;
      }
      
      // Validate against allowed actions
      const allowedActions = ['ping', 'createWidget', 'removeWidget', 'toggleWidget', 'updateWidgetData'];
      if (!allowedActions.includes(request.action)) {
        console.warn('Security: Invalid action detected:', request.action);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Security: Message validation error:', error);
      return false;
    }
  }

  setupWidgetStyles() {
    // Inject widget styles into the page
    const style = document.createElement('style');
    style.textContent = `
      .network-monitor-widget {
        position: fixed;
        top: 80px;
        right: 20px;
        width: 140px;
        height: 100px;
        background: rgba(26, 26, 26, 0.95);
        border: 2px solid #ffd700;
        border-radius: 8px;
        z-index: 2147483647;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        color: #ffffff;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(10px);
        transition: all 0.3s ease;
        cursor: move;
        user-select: none;
        min-width: 140px;
        min-height: 100px;
        overflow: hidden;
      }
      
      @media (max-width: 768px) {
        .network-monitor-widget {
          top: 60px;
          right: 10px;
          width: 100px;
          height: 70px;
        }
      }
      
      @media (max-width: 480px) {
        .network-monitor-widget {
          top: 50px;
          right: 5px;
          width: 90px;
          height: 60px;
        }
      }
      
      .network-monitor-widget:hover {
        transform: scale(1.05);
        box-shadow: 0 6px 25px rgba(0, 0, 0, 0.6);
      }
      
      .network-monitor-widget.minimized {
        width: 40px;
        height: 40px;
        overflow: hidden;
      }
      
      .widget-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 6px 8px;
        background: rgba(255, 215, 0, 0.1);
        border-bottom: 1px solid rgba(255, 215, 0, 0.3);
        border-radius: 6px 6px 0 0;
        height: 24px;
      }
      
      .widget-title {
        font-size: 9px;
        font-weight: bold;
        color: #ffd700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .widget-controls {
        display: flex;
        gap: 2px;
      }
      
      .widget-btn {
        width: 14px;
        height: 14px;
        border: none;
        background: transparent;
        color: #ffd700;
        cursor: pointer;
        font-size: 10px;
        border-radius: 2px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      
      .widget-btn:hover {
        background: rgba(255, 215, 0, 0.2);
      }
      
      .widget-content {
        padding: 6px 8px;
        text-align: center;
        height: 60px;
        display: flex;
        flex-direction: column;
        justify-content: center;
      }
      
      .widget-data {
        font-size: 11px;
        margin-bottom: 2px;
      }
      
      .widget-value {
        font-size: 14px;
        font-weight: bold;
        color: #ffd700;
        margin-bottom: 1px;
      }
      
      .widget-unit {
        font-size: 9px;
        color: #999;
        text-transform: uppercase;
      }
      
      .widget-speed {
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid rgba(255, 215, 0, 0.3);
      }
      
      .widget-speed .speed-label {
        font-size: 8px;
        color: #ccc;
        text-transform: uppercase;
        margin-bottom: 2px;
      }
      
      .widget-speed .speed-value {
        font-size: 12px;
        color: #ffd700;
        font-weight: bold;
        margin-bottom: 2px;
      }
      
      .widget-speed .speed-unit {
        font-size: 8px;
        color: #999;
        text-transform: uppercase;
      }
      
      .widget-mini {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
        font-size: 18px;
        font-weight: bold;
        color: #ffd700;
      }
      
      .widget-draggable {
        cursor: move;
      }
      
      .widget-resizable {
        position: absolute;
        bottom: 0;
        right: 0;
        width: 10px;
        height: 10px;
        cursor: se-resize;
        background: rgba(255, 215, 0, 0.3);
        border-radius: 0 0 8px 0;
      }
    `;
    
    document.head.appendChild(style);
  }

  handleMessage(request, sender, sendResponse) {
    console.log('🔧 Handling message:', request.action);
    
    switch (request.action) {
      case 'ping':
        console.log('🔧 Responding to ping');
        sendResponse({ success: true, message: 'Content script ready' });
        break;
        
      case 'createWidget':
        console.log('🔧 Creating widget...');
        try {
          this.createWidget();
          console.log('🔧 Widget creation completed');
          sendResponse({ success: true, message: 'Widget created' });
        } catch (error) {
          console.error('🔧 Error creating widget:', error);
          sendResponse({ success: false, error: error.message });
        }
        break;
        
      case 'removeWidget':
        console.log('🔧 Removing widget...');
        try {
          this.removeWidget();
          console.log('🔧 Widget removal completed');
          sendResponse({ success: true, message: 'Widget removed' });
        } catch (error) {
          console.error('🔧 Error removing widget:', error);
          sendResponse({ success: false, error: error.message });
        }
        break;
        
      case 'updateWidgetData':
        console.log('🔧 Updating widget data...');
        try {
          this.updateWidgetData(request.data);
          sendResponse({ success: true, message: 'Widget data updated' });
        } catch (error) {
          console.error('🔧 Error updating widget data:', error);
          sendResponse({ success: false, error: error.message });
        }
        break;
        
      case 'toggleWidget':
        console.log('🔧 Toggling widget...');
        try {
          if (this.widget) {
            this.removeWidget();
            sendResponse({ success: true, message: 'Widget removed' });
          } else {
            this.createWidget();
            sendResponse({ success: true, message: 'Widget created' });
          }
        } catch (error) {
          console.error('🔧 Error toggling widget:', error);
          sendResponse({ success: false, error: error.message });
        }
        break;
        
      default:
        console.warn('🔧 Unknown action:', request.action);
        sendResponse({ error: 'Unknown action: ' + request.action });
    }
  }

  createWidget() {
    try {
      console.log('🔧 Starting widget creation...');
      
      // Security: Validate DOM environment
      if (!document || !document.body) {
        console.warn('Security: Invalid DOM environment detected');
        return;
      }
      
      if (this.widget) {
        console.log('🔧 Removing existing widget...');
        this.removeWidget();
      }

      console.log('🔧 Creating widget container...');
      // Create widget container
      this.widget = document.createElement('div');
      this.widget.className = 'network-monitor-widget';
      
      // Create widget content
      const widgetContent = this.createSecureWidgetContent();
      
      // Create DOM elements
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = widgetContent;
      
      // Move nodes to widget
      while (tempDiv.firstChild) {
        this.widget.appendChild(tempDiv.firstChild);
      }
      
      console.log('🔧 Setting up widget events...');
      // Add event listeners
      this.setupWidgetEvents();
      
      console.log('🔧 Adding widget to page...');
      // Add to page
      document.body.appendChild(this.widget);
      
      // Ensure widget is visible and positioned correctly
      this.widget.style.display = 'block';
      this.widget.style.visibility = 'visible';
      this.widget.style.opacity = '1';
      this.widget.style.position = 'fixed';
      this.widget.style.top = '80px';
      this.widget.style.right = '20px';
      this.widget.style.zIndex = '2147483647';
      
      console.log('🔧 Starting widget updates...');
      // Start data updates
      this.startWidgetUpdates();
      
      console.log('✅ Network monitor widget created and positioned securely');
      
      // Force a repaint to ensure visibility
      this.widget.offsetHeight;
      
      // Additional visibility assurance
      setTimeout(() => {
        if (this.widget && this.widget.style.display !== 'none') {
          this.widget.style.display = 'block';
          this.widget.style.visibility = 'visible';
          this.widget.style.opacity = '1';
          console.log('🔧 Widget visibility enforced after timeout');
        }
      }, 100);
      
      // Verify widget is actually visible
      setTimeout(() => {
        if (this.widget && this.widget.offsetParent !== null) {
          console.log('✅ Widget is visible in DOM');
        } else {
          console.warn('⚠️ Widget may not be visible in DOM');
        }
      }, 200);
      
    } catch (error) {
      console.error('Error creating widget:', error);
    }
  }
  
  // Security: Create sanitized widget content
  createSecureWidgetContent() {
    // Use template literals with explicit content to prevent injection
    return `
      <div class="widget-header widget-draggable">
        <div class="widget-title">Network</div>
        <div class="widget-controls">
          <button class="widget-btn minimize-btn" title="Minimize">−</button>
          <button class="widget-btn close-btn" title="Close">×</button>
        </div>
      </div>
      <div class="widget-content">
        <div class="widget-data">
          <div class="widget-value" id="widgetTotal">0.00</div>
          <div class="widget-unit" id="widgetUnit">MB</div>
        </div>
        <div class="widget-speed" id="widgetSpeed" style="display: none;">
          <div class="speed-label">Speed:</div>
          <div class="speed-value" id="widgetSpeedValue">0.00</div>
          <div class="speed-unit">Mbps</div>
        </div>
      </div>
      <div class="widget-mini" style="display: none;">n</div>
      <div class="widget-resizable"></div>
    `;
  }

  setupWidgetEvents() {
    if (!this.widget) return;

    // Minimize button
    const minimizeBtn = this.widget.querySelector('.minimize-btn');
    minimizeBtn.addEventListener('click', () => {
      this.toggleMinimize();
    });

    // Close button
    const closeBtn = this.widget.querySelector('.close-btn');
    closeBtn.addEventListener('click', () => {
      this.removeWidget();
    });

    // Dragging functionality
    let isDragging = false;
    let dragOffset = { x: 0, y: 0 };

    const header = this.widget.querySelector('.widget-draggable');
    
    header.addEventListener('mousedown', (e) => {
      isDragging = true;
      dragOffset.x = e.clientX - this.widget.offsetLeft;
      dragOffset.y = e.clientY - this.widget.offsetTop;
      this.widget.style.cursor = 'grabbing';
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const newX = e.clientX - dragOffset.x;
      const newY = e.clientY - dragOffset.y;
      
      // Keep widget within viewport bounds
      const maxX = window.innerWidth - this.widget.offsetWidth;
      const maxY = window.innerHeight - this.widget.offsetHeight;
      
      this.widget.style.left = Math.max(0, Math.min(newX, maxX)) + 'px';
      this.widget.style.top = Math.max(0, Math.min(newY, maxY)) + 'px';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      this.widget.style.cursor = 'move';
    });

    // Resizing functionality
    const resizer = this.widget.querySelector('.widget-resizable');
    let isResizing = false;
    let startSize = { width: 0, height: 0 };

    resizer.addEventListener('mousedown', (e) => {
      isResizing = true;
      startSize.width = this.widget.offsetWidth;
      startSize.height = this.widget.offsetHeight;
      e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isResizing) return;
      
      const newWidth = startSize.width + (e.clientX - (this.widget.offsetLeft + startSize.width));
      const newHeight = startSize.height + (e.clientY - (this.widget.offsetTop + startSize.height));
      
      // Minimum size constraints
      const minWidth = 120;
      const minHeight = 80;
      
      if (newWidth >= minWidth && newHeight >= minHeight) {
        this.widget.style.width = newWidth + 'px';
        this.widget.style.height = newHeight + 'px';
      }
    });

    document.addEventListener('mouseup', () => {
      isResizing = false;
    });
  }

  toggleMinimize() {
    if (!this.widget) return;
    
    const isMinimized = this.widget.classList.contains('minimized');
    
    if (isMinimized) {
      this.widget.classList.remove('minimized');
      this.widget.querySelector('.widget-content').style.display = 'block';
      this.widget.querySelector('.widget-mini').style.display = 'none';
      this.widget.querySelector('.minimize-btn').textContent = '−';
    } else {
      this.widget.classList.add('minimized');
      this.widget.querySelector('.widget-content').style.display = 'none';
      this.widget.querySelector('.widget-mini').style.display = 'flex';
      this.widget.querySelector('.minimize-btn').textContent = '+';
    }
  }

  removeWidget() {
    if (this.widget) {
      this.widget.remove();
      this.widget = null;
      this.stopWidgetUpdates();
      console.log('Network monitor widget removed');
    }
  }

  startWidgetUpdates() {
    // Update widget data every 1000ms (1 second) as requested
    this.updateInterval = setInterval(async () => {
      await this.updateWidgetData();
    }, 1000);
    
    // Also update when page becomes visible (for when menu is hidden)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.updateWidgetData();
      }
    });
    
    // Update on window focus (when user returns to tab)
    window.addEventListener('focus', () => {
      this.updateWidgetData();
    });
  }

  stopWidgetUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }

  async updateWidgetData(data = null) {
    if (!this.widget) return;

    try {
      if (!data) {
        // Get data from background service worker
        const response = await chrome.runtime.sendMessage({ action: 'getData' });
        if (response && !response.error) {
          data = response;
        }
      }

      if (data) {
        // Update widget display
        const totalElement = this.widget.querySelector('#widgetTotal');
        const unitElement = this.widget.querySelector('#widgetUnit');
        
        if (totalElement) totalElement.textContent = data.total;
        if (unitElement) unitElement.textContent = data.units;
        
        // Update speed display if available
        if (data.speed !== undefined && data.speed > 0) {
          const speedElement = this.widget.querySelector('#widgetSpeedValue');
          const speedContainer = this.widget.querySelector('#widgetSpeed');
          
          if (speedElement && speedContainer) {
            // Convert from bits per second to Mbps
            const speedMbps = (data.speed / 1000000).toFixed(2);
            speedElement.textContent = speedMbps;
            speedContainer.style.display = 'block';
          }
        } else {
          // Hide speed display if no speed data
          const speedContainer = this.widget.querySelector('#widgetSpeed');
          if (speedContainer) {
            speedContainer.style.display = 'none';
          }
        }
        
        this.widgetData = data;
      }
    } catch (error) {
      console.error('Error updating widget data:', error);
    }
  }
}

// Initialize content script
const contentScript = new ContentScript();

// Handle page unload
window.addEventListener('beforeunload', () => {
  if (contentScript) {
    contentScript.removeWidget();
  }
}); 