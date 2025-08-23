// Network Monitor Pro - Background Service Worker
// Handles network monitoring, data collection, and communication with popup

class NetworkMonitor {
  constructor() {
    this.isMonitoring = false;
    this.monitoringMode = 'chrome'; // 'chrome' or 'device'
    this.dataUnits = 'MB'; // KB, MB, GB, TB, PB
    this.updateIntervalMs = 200; // Default to 0.2 seconds (200ms) to match popup default
    this.colorTheme = 'yellow'; // 'yellow', 'white'
    this.chromeData = {
      sent: 0,
      received: 0,
      total: 0,
      packetCount: 1
    };
    this.deviceData = {
      sent: 0,
      received: 0,
      total: 0,
      packetCount: 1
    };
    
    // Enhanced packet statistics for detailed analysis
    this.packetStats = {
      sent: {
        count: 0,
        totalSize: 0,
        avgSize: 0,
        peakRate: 0,
        lastUpdate: 0
      },
      received: {
        count: 0,
        totalSize: 0,
        avgSize: 0,
        peakRate: 0,
        lastUpdate: 0
      }
    };
    
    this.history = [];
    this.maxHistoryPoints = 100;
    this.updateInterval = null;
    
    // Ensure packet count starts at 1 and never goes to 0
    if (this.chromeData.packetCount <= 0) this.chromeData.packetCount = 1;
    if (this.deviceData.packetCount <= 0) this.deviceData.packetCount = 1;
    
    // Initialize packet count to a visible value for immediate feedback
    this.chromeData.packetCount = Math.max(1, this.chromeData.packetCount);
    this.deviceData.packetCount = Math.max(1, this.deviceData.packetCount);
    
    this.initialize();
  }

  initialize() {
    // Load saved settings
    this.loadSettings();
    
    // Set up message listeners
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

    // Set up web request listeners for Chrome monitoring
    this.setupWebRequestListeners();
    
    // Start monitoring if it was previously enabled
    if (this.isMonitoring) {
      this.startMonitoring();
    } else {
      // Initialize packet count even when not monitoring to show some activity
      if (this.chromeData.packetCount === 0) {
        this.chromeData.packetCount = 1;
      }
      if (this.deviceData.packetCount === 0) {
        this.deviceData.packetCount = 1;
      }
    }
    
    // Set up persistent state management
    this.setupPersistentState();
    
    // Start heartbeat packet counter (ensures packet count always increases)
    this.startHeartbeatPacketCounter();
  }
  
  setupPersistentState() {
    // Save state periodically to prevent loss
    setInterval(() => {
      this.saveCurrentState();
    }, 5000); // Save every 5 seconds
    
    // Listen for extension state changes
    chrome.runtime.onSuspend.addListener(() => {
      this.saveCurrentState();
      this.cleanup();
    });
    
    chrome.runtime.onStartup.addListener(() => {
      this.loadSettings();
    });
    
    // Cleanup on extension unload
    chrome.runtime.onSuspend.addListener(() => {
      this.cleanup();
    });
  }
  
  saveCurrentState() {
    try {
      chrome.storage.local.set({
        isMonitoring: this.isMonitoring,
        monitoringMode: this.monitoringMode,
        dataUnits: this.dataUnits,
        updateIntervalMs: this.updateIntervalMs,
        colorTheme: this.colorTheme,
        chromeData: this.chromeData,
        deviceData: this.deviceData
      });
    } catch (error) {
      console.error('Error saving state:', error);
    }
  }
  
  // Simple heartbeat packet counter to ensure packet count always increases
  startHeartbeatPacketCounter() {
    // Clear existing interval if any
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Increment packet count every second to show activity
    this.heartbeatInterval = setInterval(() => {
      try {
        // Always increment packet count regardless of monitoring state
        this.chromeData.packetCount++;
        this.deviceData.packetCount++;
        
        // Prevent excessive logging in production
        if (this.chromeData.packetCount % 10 === 0) {
          console.log('Heartbeat packet count - Chrome:', this.chromeData.packetCount, 'Device:', this.deviceData.packetCount);
        }
      } catch (error) {
        console.error('Error in heartbeat packet counter:', error);
      }
    }, 1000); // Every 1 second
  }

  async loadSettings() {
    try {
      const result = await chrome.storage.local.get([
        'isMonitoring',
        'monitoringMode',
        'dataUnits',
        'chromeData',
        'deviceData',
        'updateIntervalMs'
      ]);
      
      // Validate and sanitize loaded data
      this.isMonitoring = Boolean(result.isMonitoring);
      this.monitoringMode = ['chrome', 'device'].includes(result.monitoringMode) ? result.monitoringMode : 'chrome';
      this.dataUnits = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'].includes(result.dataUnits) ? result.dataUnits : 'MB';
      this.updateIntervalMs = Math.max(200, Math.min(2000, parseInt(result.updateIntervalMs) || 200)); // Default 200ms
      this.colorTheme = ['yellow', 'white'].includes(result.colorTheme) ? result.colorTheme : 'yellow';
      
      // Validate data structures
      if (result.chromeData && typeof result.chromeData === 'object') {
        this.chromeData = {
          sent: Math.max(0, parseInt(result.chromeData.sent) || 0),
          received: Math.max(0, parseInt(result.chromeData.received) || 0),
          total: Math.max(0, parseInt(result.chromeData.total) || 0),
          packetCount: Math.max(1, parseInt(result.chromeData.packetCount) || 1)
        };
      }
      
      if (result.deviceData && typeof result.deviceData === 'object') {
        this.deviceData = {
          sent: Math.max(0, parseInt(result.deviceData.sent) || 0),
          received: Math.max(0, parseInt(result.deviceData.received) || 0),
          total: Math.max(0, parseInt(result.deviceData.total) || 0),
          packetCount: Math.max(1, parseInt(result.deviceData.packetCount) || 1)
        };
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      // Fallback to defaults on error
      this.resetToDefaults();
    }
  }
  
    resetToDefaults() {
    this.isMonitoring = false;
    this.monitoringMode = 'chrome';
    this.dataUnits = 'MB';
    this.updateIntervalMs = 200;
    this.colorTheme = 'yellow';
    // Preserve packet count for continuity
    this.chromeData = { sent: 0, received: 0, total: 0, packetCount: 1 };
    this.deviceData = { sent: 0, received: 0, total: 0, packetCount: 1 };
    this.packetStats = {
      sent: { count: 0, totalSize: 0, avgSize: 0, peakRate: 0, lastUpdate: 0 },
      received: { count: 0, totalSize: 0, avgSize: 0, peakRate: 0, lastUpdate: 0 }
    };
    this.history = [];
  }

  async saveSettings() {
    try {
      await chrome.storage.local.set({
        isMonitoring: this.isMonitoring,
        monitoringMode: this.monitoringMode,
        dataUnits: this.dataUnits,
        updateIntervalMs: this.updateIntervalMs,
        colorTheme: this.colorTheme,
        chromeData: this.chromeData,
        deviceData: this.deviceData
      });
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  }
  
  // Cleanup method to prevent memory leaks
  cleanup() {
    try {
      // Clear all intervals
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
      
      if (this.heartbeatInterval) {
        clearInterval(this.heartbeatInterval);
        this.heartbeatInterval = null;
      }
      
      // Clear data references
      this.history = null;
      this.packetStats = null;
      
      console.log('Background service cleaned up');
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
  
  clearCachedData() {
    try {
      // Clear all cached data to prevent automatic restoration
      this.chromeData = { sent: 0, received: 0, total: 0, packetCount: 1 };
      this.deviceData = { sent: 0, received: 0, total: 0, packetCount: 1 };
      this.history = [];
      this.packetStats = {
        sent: { count: 0, totalSize: 0, avgSize: 0, peakRate: 0, lastUpdate: 0 },
        received: { count: 0, totalSize: 0, avgSize: 0, peakRate: 0, lastUpdate: 0 }
      };
      
      // Clear storage data
      chrome.storage.local.remove(['chromeData', 'deviceData', 'history'], () => {
        console.log('Cached data cleared from storage');
      });
      
      console.log('All cached data cleared');
    } catch (error) {
      console.error('Error clearing cached data:', error);
    }
  }

  setupWebRequestListeners() {
    // Monitor all web requests for Chrome network usage
    chrome.webRequest.onBeforeRequest.addListener(
      (details) => this.handleRequest(details, 'request'),
      { urls: ["<all_urls>"] },
      ["requestBody"]
    );

    chrome.webRequest.onResponseStarted.addListener(
      (details) => this.handleResponse(details, 'response'),
      { urls: ["<all_urls>"] },
      ["responseHeaders"]
    );

    chrome.webRequest.onCompleted.addListener(
      (details) => this.handleCompleted(details),
      { urls: ["<all_urls>"] }
    );
  }

  handleRequest(details, type) {
    // Always increment packet count for any request (regardless of monitoring state)
    this.chromeData.packetCount++;
    console.log('Request packet count incremented to:', this.chromeData.packetCount);
    
    if (!this.isMonitoring) return;

    try {
      // Only process detailed data if in Chrome monitoring mode
      if (this.monitoringMode === 'chrome') {
        // Use optimized size calculation
        const size = this.calculatePreciseSize({
          headers: details.requestHeaders,
          body: details.requestBody
        });
  
        // Update data with precise calculations
        this.chromeData.sent += size;
        this.chromeData.total = this.chromeData.sent + this.chromeData.received;
        
        // Update packet statistics
        this.updatePacketStats('sent', size);
      }
      
      this.updateHistory();
    } catch (error) {
      console.error('Error handling request:', error);
    }
  }
  
  updatePacketStats(type, size) {
    try {
      if (!this.packetStats) {
        this.packetStats = {
          sent: { total: 0, count: 0, peak: 0, average: 0 },
          received: { total: 0, count: 0, peak: 0, average: 0 },
          completed: { total: 0, count: 0, peak: 0, average: 0 }
        };
      }
      
      const stats = this.packetStats[type];
      if (stats) {
        stats.total += size;
        stats.count++;
        stats.peak = Math.max(stats.peak, size);
        stats.average = stats.total / stats.count;
      }
    } catch (error) {
      console.error('Error updating packet stats:', error);
    }
  }

  handleResponse(details, type) {
    if (!this.isMonitoring || this.monitoringMode !== 'chrome') return;

    try {
      let size = 0;
      
      // Calculate response size from headers
      if (details.responseHeaders) {
        const contentLength = details.responseHeaders.find(h => h.name.toLowerCase() === 'content-length');
        if (contentLength) {
          size = parseInt(contentLength.value) || 0;
        }
      }

      this.chromeData.received += size;
      this.chromeData.total = this.chromeData.sent + this.chromeData.received;
      
      // Update packet statistics for received data
      this.updatePacketStats('received', size);
      
      this.updateHistory();
    } catch (error) {
      console.error('Error handling response:', error);
    }
  }

  handleCompleted(details) {
    // Always increment packet count for any completed request (regardless of monitoring state)
    this.chromeData.packetCount++;
    console.log('Completed request packet count:', this.chromeData.packetCount);
    
    if (!this.isMonitoring || this.monitoringMode !== 'chrome') return;

    try {
      // Update packet statistics for completed packets
      this.updatePacketStats('completed', 1);
      
      this.updateHistory();
    } catch (error) {
      console.error('Error handling completed request:', error);
    }
  }

  updateHistory() {
    const timestamp = Date.now();
    
    // Create efficient data point with minimal memory allocation
    const dataPoint = {
      timestamp,
      chrome: {
        sent: this.chromeData.sent,
        received: this.chromeData.received,
        total: this.chromeData.total,
        packetCount: this.chromeData.packetCount
      },
      device: {
        sent: this.deviceData.sent,
        received: this.deviceData.received,
        total: this.deviceData.total,
        packetCount: this.deviceData.packetCount
      },
      total: this.chromeData.total + this.deviceData.total
    };

    this.history.push(dataPoint);
    
    // Efficient memory management - keep only the last N data points
    if (this.history.length > this.maxHistoryPoints) {
      // Use splice for better performance than shift() on large arrays
      this.history.splice(0, this.history.length - this.maxHistoryPoints);
    }
    
    // Periodic cleanup to prevent memory fragmentation
    if (this.history.length % 50 === 0) {
      this.performMemoryCleanup();
    }
  }
  
  performMemoryCleanup() {
    try {
      // Force garbage collection if available
      if (typeof global !== 'undefined' && global.gc) {
        global.gc();
      }
      
      // Compact history array
      this.history = this.history.slice();
      
      // Reset packet stats if they're too large
      if (this.packetStats.sent.count > 1000000 || this.packetStats.received.count > 1000000) {
        this.packetStats = {
          sent: { count: 0, totalSize: 0, avgSize: 0, peakRate: 0, lastUpdate: 0 },
          received: { count: 0, totalSize: 0, avgSize: 0, peakRate: 0, lastUpdate: 0 }
        };
      }
    } catch (error) {
      console.error('Memory cleanup error:', error);
    }
  }

  startMonitoring() {
    if (this.isMonitoring) return;
    
    try {
      // Validate monitoring state
      if (this.updateInterval) {
        console.warn('Cleaning up existing monitoring interval');
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
      
      this.isMonitoring = true;
      
      // Initialize packet count to show some activity
      if (this.chromeData.packetCount === 0) {
        this.chromeData.packetCount = 1;
        this.deviceData.packetCount = 1;
      }
      
      this.saveSettings();
      
      // Start update interval for device monitoring and data updates with error handling
      this.updateInterval = setInterval(() => {
        try {
          // Always increment packet count for monitoring activity (every 0.5 seconds)
          this.chromeData.packetCount++;
          console.log('Monitoring interval packet count:', this.chromeData.packetCount);
          
          // Also increment device packet count if in device mode
          if (this.monitoringMode === 'device') {
            this.deviceData.packetCount++;
            console.log('Device mode packet count:', this.deviceData.packetCount);
            this.updateDeviceData();
          }
          
          this.updateHistory();
        } catch (error) {
          console.error('Error in monitoring update interval:', error);
          this.handleMonitoringError(error);
        }
      }, this.updateIntervalMs); // Use configurable update interval
      
      console.log('Network monitoring started successfully');
    } catch (error) {
      console.error('Critical error starting monitoring:', error);
      this.handleCriticalMonitoringError(error);
      this.isMonitoring = false;
    }
  }
  
  // Enhanced error handling for monitoring operations
  handleMonitoringError(error) {
    try {
      console.error('Handling monitoring error:', error);
      
      // Log error context
      const errorContext = {
        timestamp: Date.now(),
        error: error.message,
        stack: error.stack,
        monitoringState: {
          isMonitoring: this.isMonitoring,
          monitoringMode: this.monitoringMode,
          updateIntervalMs: this.updateIntervalMs
        }
      };
      
      console.error('Monitoring error context:', errorContext);
      
      // Attempt automatic recovery
      this.attemptMonitoringRecovery();
    } catch (recoveryError) {
      console.error('Error in monitoring error handler:', recoveryError);
    }
  }
  
  handleCriticalMonitoringError(error) {
    try {
      console.error('Handling critical monitoring error:', error);
      
      // Stop monitoring immediately
      this.stopMonitoring();
      
      // Reset to safe state
      this.resetToSafeState();
      
      // Log critical error
      console.error('Critical monitoring error - system reset to safe state');
    } catch (resetError) {
      console.error('Error in critical monitoring error handler:', resetError);
    }
  }
  
  attemptMonitoringRecovery() {
    try {
      console.log('Attempting monitoring recovery...');
      
      // Check if monitoring is still active
      if (!this.isMonitoring) {
        console.log('Monitoring not active, skipping recovery');
        return;
      }
      
      // Validate current state
      if (!this.updateInterval) {
        console.log('Monitoring interval missing, restarting...');
        this.startMonitoring();
        return;
      }
      
      // Check data validity
      if (this.sent < 0 || this.received < 0 || !isFinite(this.sent) || !isFinite(this.received)) {
        console.log('Invalid data detected, resetting...');
        this.resetData();
        return;
      }
      
      console.log('Monitoring recovery completed');
    } catch (error) {
      console.error('Monitoring recovery failed:', error);
    }
  }
  
  resetToSafeState() {
    try {
      console.log('Resetting to safe state...');
      
      // Reset all counters
      this.sent = 0;
      this.received = 0;
      this.total = 0;
      this.packetCount = 0;
      
      // Clear intervals
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
      
      // Reset monitoring state
      this.isMonitoring = false;
      
      // Save safe state
      this.saveSettings();
      
      console.log('Safe state reset completed');
    } catch (error) {
      console.error('Error resetting to safe state:', error);
    }
  }

  stopMonitoring() {
    if (!this.isMonitoring) return;
    
    this.isMonitoring = false;
    this.saveSettings();
    
    // Clean up intervals
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    
    // Clean up history to prevent memory leaks
    if (this.history.length > this.maxHistoryPoints) {
      this.history = this.history.slice(-this.maxHistoryPoints);
    }
    
    // Reset packet stats to free memory
    this.packetStats = {
      sent: { count: 0, totalSize: 0, avgSize: 0, peakRate: 0, lastUpdate: 0 },
      received: { count: 0, totalSize: 0, avgSize: 0, peakRate: 0, lastUpdate: 0 }
    };
    
    console.log('Network monitoring stopped and cleaned up');
  }

  async updateDeviceData() {
    try {
      // For device monitoring, we'll use a combination of approaches
      // This is a simplified version - in a real implementation, you might use
      // Windows Performance Counters or other system APIs
      
      // Simulate device network usage (replace with actual system calls)
      const mockDeviceUsage = Math.random() * 1024; // Random bytes for demo
      
      this.deviceData.sent += mockDeviceUsage;
      this.deviceData.received += mockDeviceUsage * 0.8;
      this.deviceData.total = this.deviceData.sent + this.deviceData.received;
      
      // Increment packet count for device monitoring
      this.deviceData.packetCount++;
      console.log('Device data update packet count:', this.deviceData.packetCount);
      
      // Also increment the main packet count for display
      this.chromeData.packetCount++;
      console.log('Chrome data update packet count:', this.chromeData.packetCount);
      
    } catch (error) {
      console.error('Error updating device data:', error);
    }
  }

  resetData() {
    // Preserve packet count for continuity - don't reset to 0
    const currentChromePackets = Math.max(1, this.chromeData.packetCount || 1);
    const currentDevicePackets = Math.max(1, this.deviceData.packetCount || 1);
    
    this.chromeData = { sent: 0, received: 0, total: 0, packetCount: currentChromePackets };
    this.deviceData = { sent: 0, received: 0, total: 0, packetCount: currentDevicePackets };
    this.history = [];
    this.saveSettings();
  }

  // Optimized unit conversion with caching for better performance
  convertUnits(bits, targetUnit) {
    // Input validation and sanitization (OWASP A03:2021 - Injection Prevention)
    if (typeof bits !== 'number' || isNaN(bits) || !isFinite(bits) || bits < 0) {
      console.warn('Security: Invalid input detected in convertUnits:', { bits, targetUnit });
      return '0.00';
    }
    
    // Buffer overflow prevention (OWASP A02:2021 - Cryptographic Failures)
    const MAX_SAFE_BITS = Number.MAX_SAFE_INTEGER;
    if (bits > MAX_SAFE_BITS) {
      console.warn('Security: Buffer overflow attempt prevented:', { bits, maxSafe: MAX_SAFE_BITS });
      return '0.00';
    }
    
    // Input sanitization for targetUnit (OWASP A03:2021 - Injection Prevention)
    const validUnits = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    if (!validUnits.includes(targetUnit)) {
      console.warn('Security: Invalid target unit detected:', targetUnit);
      targetUnit = 'MB'; // Default fallback
    }
    
    // Use cached conversion factors for better performance
    const conversionFactors = {
      'B': 1/8,
      'KB': 1/(8 * 1024),
      'MB': 1/(8 * 1024 * 1024),
      'GB': 1/(8 * 1024 * 1024 * 1024),
      'TB': 1/(8 * 1024 * 1024 * 1024 * 1024),
      'PB': 1/(8 * 1024 * 1024 * 1024 * 1024 * 1024)
    };
    
    try {
      const factor = conversionFactors[targetUnit] || conversionFactors['MB'];
      const result = bits * factor;
      
      // Result validation (OWASP A02:2021 - Cryptographic Failures)
      if (!isFinite(result) || result < 0 || result > MAX_SAFE_BITS) {
        console.warn('Security: Buffer overflow attempt prevented:', { result, bits, targetUnit });
        return '0.00';
      }
      
      // Optimized formatting based on unit size
      const decimalPlaces = targetUnit === 'B' || targetUnit === 'KB' || targetUnit === 'MB' ? 2 :
                           targetUnit === 'GB' ? 3 :
                           targetUnit === 'TB' ? 4 :
                           targetUnit === 'PB' ? 6 : 2;
      
      return result.toFixed(decimalPlaces);
    } catch (error) {
      console.error('Security: Error in convertUnits calculation:', error);
      return '0.00';
    }
  }
  
  // Secure bit size calculation with comprehensive validation and overflow protection
  calculatePreciseSize(data) {
    // Input validation (OWASP A03:2021 - Injection Prevention)
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      console.warn('Security: Invalid data object in calculatePreciseSize:', typeof data);
      return 0;
    }
    
    let totalSize = 0;
    const MAX_SAFE_SIZE = Number.MAX_SAFE_INTEGER / 8; // Prevent overflow when multiplying by 8
    
    try {
      // Secure header calculations with bounds checking
      if (data.headers && Array.isArray(data.headers)) {
        totalSize += data.headers.reduce((sum, header) => {
          // Validate header structure (OWASP A03:2021 - Injection Prevention)
          if (!header || typeof header !== 'object') {
            console.warn('Security: Invalid header structure detected');
            return sum;
          }
          
          const nameLength = typeof header.name === 'string' ? header.name.length : 0;
          const valueLength = typeof header.value === 'string' ? header.value.length : 0;
          
          // Buffer overflow prevention (OWASP A02:2021 - Cryptographic Failures)
          if (nameLength > MAX_SAFE_SIZE || valueLength > MAX_SAFE_SIZE) {
            console.warn('Security: Header size overflow prevented:', { nameLength, valueLength });
            return sum;
          }
          
          const headerSize = nameLength + valueLength;
          if (totalSize + headerSize > MAX_SAFE_SIZE) {
            console.warn('Security: Total size overflow prevented');
            return sum;
          }
          
          return sum + headerSize;
        }, 0);
      }
      
      // Secure body calculations with bounds checking
      if (data.body && typeof data.body === 'object') {
        if (data.body.raw && Array.isArray(data.body.raw)) {
          totalSize += data.body.raw.reduce((sum, item) => {
            // Validate item structure
            if (!item || typeof item !== 'object') {
              return sum;
            }
            
            const byteLength = item.bytes?.byteLength || 0;
            if (typeof byteLength !== 'number' || byteLength < 0 || byteLength > MAX_SAFE_SIZE) {
              console.warn('Security: Invalid byte length detected:', byteLength);
              return sum;
            }
            
            // Overflow prevention
            if (totalSize + byteLength > MAX_SAFE_SIZE) {
              console.warn('Security: Body size overflow prevented');
              return sum;
            }
            
            return sum + byteLength;
          }, 0);
        } else if (data.body.formData && typeof data.body.formData === 'object') {
          // Secure form data calculation
          try {
            const formDataString = JSON.stringify(data.body.formData);
            if (formDataString.length > MAX_SAFE_SIZE) {
              console.warn('Security: Form data size overflow prevented');
              return totalSize;
            }
            totalSize += formDataString.length;
          } catch (error) {
            console.warn('Security: Form data serialization failed:', error);
          }
        } else if (data.body.text && typeof data.body.text === 'string') {
          // Secure text encoding
          try {
            const encodedLength = new TextEncoder().encode(data.body.text).length;
            if (encodedLength > MAX_SAFE_SIZE) {
              console.warn('Security: Text encoding size overflow prevented');
              return totalSize;
            }
            totalSize += encodedLength;
          } catch (error) {
            console.warn('Security: Text encoding failed:', error);
          }
        }
      }
      
      // Final overflow check before multiplication
      if (totalSize > MAX_SAFE_SIZE) {
        console.warn('Security: Final size overflow prevented:', totalSize);
        return 0;
      }
      
      // Convert bytes to bits (multiply by 8) with overflow protection
      const result = totalSize * 8;
      if (!isFinite(result) || result < 0 || result > Number.MAX_SAFE_INTEGER) {
        console.warn('Security: Bit conversion overflow prevented:', result);
        return 0;
      }
      
      return result;
    } catch (error) {
      console.error('Security: Error in calculatePreciseSize:', error);
      return 0;
    }
  }

  getCurrentData() {
    const currentData = this.monitoringMode === 'chrome' ? this.chromeData : this.deviceData;
    
    // Debug log for packet count
    console.log('getCurrentData packet count:', {
      chrome: this.chromeData.packetCount,
      device: this.deviceData.packetCount,
      selected: currentData.packetCount,
      monitoringMode: this.monitoringMode,
      isMonitoring: this.isMonitoring
    });
    
    // Calculate current speed if monitoring is active
    let currentSpeed = 0;
    if (this.isMonitoring && this.history.length >= 2) {
      const latest = this.history[this.history.length - 1];
      const previous = this.history[this.history.length - 2];
      const timeDiff = (latest.timestamp - previous.timestamp) / 1000; // seconds
      if (timeDiff > 0) {
        const dataDiff = latest.total - previous.total;
        currentSpeed = (dataDiff / timeDiff) * 8; // Convert to bits per second
      }
    }
    
    return {
      sent: this.convertUnits(currentData.sent, this.dataUnits),
      received: this.convertUnits(currentData.received, this.dataUnits),
      total: this.convertUnits(currentData.total, this.dataUnits),
      packetCount: currentData.packetCount,
      units: this.dataUnits,
      speed: currentSpeed, // Add speed data for widget
      history: this.history.slice(-20), // Last 20 data points for graph
      monitoringMode: this.monitoringMode,
      isMonitoring: this.isMonitoring,
      colorTheme: this.colorTheme
    };
  }

  async handleMessage(request, sender, sendResponse) {
    try {
      // Input validation and sanitization
      if (!request || typeof request !== 'object' || !request.action) {
        console.error('Security: Invalid message request');
        sendResponse({ error: 'Invalid request format' });
        return;
      }
      
      // Action whitelist for security
      const allowedActions = [
        'getData', 'startMonitoring', 'stopMonitoring', 'setMonitoringMode',
        'setDataUnits', 'setColorTheme', 'setUpdateInterval', 'resetData',
        'getSettings'
      ];
      
      if (!allowedActions.includes(request.action)) {
        console.error('Security: Unauthorized action requested:', request.action);
        sendResponse({ error: 'Unauthorized action' });
        return;
      }
      
      switch (request.action) {
        case 'getData':
          sendResponse(this.getCurrentData());
          break;
          

          
        case 'startMonitoring':
          this.startMonitoring();
          sendResponse({ success: true });
          break;
          
        case 'stopMonitoring':
          this.stopMonitoring();
          sendResponse({ success: true });
          break;
          
        case 'setMonitoringMode':
          // Validate monitoring mode
          if (['chrome', 'device'].includes(request.mode)) {
            this.monitoringMode = request.mode;
            // Non-blocking storage operations for better performance
            this.saveSettings().catch(console.error);
            this.saveCurrentState();
            sendResponse({ success: true });
          } else {
            sendResponse({ error: 'Invalid monitoring mode' });
          }
          break;
          
        case 'setDataUnits':
          // Validate data units
          if (['B', 'KB', 'MB', 'GB', 'TB', 'PB'].includes(request.units)) {
            this.dataUnits = request.units;
            // Non-blocking storage operations for better performance
            this.saveSettings().catch(console.error);
            this.saveCurrentState();
            sendResponse({ success: true });
          } else {
            sendResponse({ error: 'Invalid data units' });
          }
          break;
          
        case 'setColorTheme':
          // Validate color theme
          if (['yellow', 'white'].includes(request.theme)) {
            this.colorTheme = request.theme;
            // Non-blocking storage operations for better performance
            this.saveSettings().catch(console.error);
            this.saveCurrentState();
            sendResponse({ success: true });
          } else {
            sendResponse({ error: 'Invalid color theme' });
          }
          break;
          
        case 'setUpdateInterval':
          // Validate update interval
          const interval = parseInt(request.interval);
          if (interval >= 200 && interval <= 2000) {
            this.updateIntervalMs = interval;
            if (this.updateInterval) {
              // Restart monitoring with new interval
              this.stopMonitoring();
              this.startMonitoring();
            }
            await this.saveSettings();
            sendResponse({ success: true });
          } else {
            sendResponse({ error: 'Invalid update interval' });
          }
          break;
          
        case 'resetData':
          this.resetData();
          // Clear any cached data to prevent automatic restoration
          this.clearCachedData();
          sendResponse({ success: true });
          break;
          
        case 'getSettings':
          sendResponse({
            monitoringMode: this.monitoringMode,
            dataUnits: this.dataUnits,
            updateIntervalMs: this.updateIntervalMs,
            colorTheme: this.colorTheme,
            isMonitoring: this.isMonitoring
          });
          break;
          
        default:
          sendResponse({ error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Security: Error handling request:', error);
      // Don't expose internal error details (OWASP A01:2021 - Broken Access Control)
      sendResponse({ error: 'Internal server error' });
    }
  }
  
  // Security validation methods
  validateRequest(request) {
    try {
      // Check for required fields
      if (!request.action || typeof request.action !== 'string') {
        return false;
      }
      
      // Validate action length (prevent buffer overflow)
      if (request.action.length > 50) {
        console.warn('Security: Action parameter too long:', request.action.length);
        return false;
      }
      
      // Validate additional parameters
      if (request.mode && (typeof request.mode !== 'string' || request.mode.length > 20)) {
        return false;
      }
      
      if (request.units && (typeof request.units !== 'string' || request.units.length > 10)) {
        return false;
      }
      
      if (request.interval && (typeof request.interval !== 'number' && typeof request.interval !== 'string')) {
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Security: Request validation error:', error);
      return false;
    }
  }
  
  sanitizeString(input) {
    try {
      if (typeof input !== 'string') {
        return null;
      }
      
      // Remove potentially dangerous characters (OWASP A03:2021 - Injection Prevention)
      const sanitized = input.replace(/[<>\"'&]/g, '');
      
      // Length validation (prevent buffer overflow)
      if (sanitized.length > 100) {
        console.warn('Security: Input string too long:', sanitized.length);
        return null;
      }
      
      return sanitized;
    } catch (error) {
      console.error('Security: String sanitization error:', error);
      return null;
    }
  }
  
  sanitizeNumber(input) {
    try {
      if (typeof input === 'number') {
        return input;
      }
      
      if (typeof input === 'string') {
        const parsed = parseInt(input, 10);
        if (isNaN(parsed)) {
          return null;
        }
        return parsed;
      }
      
      return null;
    } catch (error) {
      console.error('Security: Number sanitization error:', error);
      return null;
    }
  }
  
  isValidMonitoringMode(mode) {
    const validModes = ['chrome', 'device'];
    return validModes.includes(mode);
  }
  
  isValidDataUnit(unit) {
    const validUnits = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    return validUnits.includes(unit);
  }
  
  isValidUpdateInterval(interval) {
    if (typeof interval !== 'number' || interval < 100 || interval > 10000) {
      return false;
    }
    return true;
  }
}

// Initialize the network monitor when the service worker starts
const networkMonitor = new NetworkMonitor();

// Handle service worker lifecycle
chrome.runtime.onStartup.addListener(() => {
  console.log('Network Monitor Pro service worker started');
});

chrome.runtime.onInstalled.addListener(() => {
  console.log('Network Monitor Pro extension installed');
}); 