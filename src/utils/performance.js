import { memo, useMemo, useCallback } from 'react';

/**
 * Performance optimization utilities
 */

/**
 * Memoized component wrapper with custom comparison
 * @param {React.Component} Component - Component to memoize
 * @param {Function} propsAreEqual - Custom comparison function
 * @returns {React.MemoizedComponent}
 */
export const memoWithComparison = (Component, propsAreEqual) => {
  return memo(Component, propsAreEqual);
};

/**
 * Shallow comparison for props (useful for memo)
 * @param {Object} prevProps - Previous props
 * @param {Object} nextProps - Next props
 * @returns {boolean} True if props are equal
 */
export const shallowEqual = (prevProps, nextProps) => {
  const prevKeys = Object.keys(prevProps);
  const nextKeys = Object.keys(nextProps);

  if (prevKeys.length !== nextKeys.length) {
    return false;
  }

  for (let key of prevKeys) {
    if (prevProps[key] !== nextProps[key]) {
      return false;
    }
  }

  return true;
};

/**
 * Deep comparison for complex objects (use sparingly)
 * @param {*} a - First value
 * @param {*} b - Second value
 * @returns {boolean} True if deeply equal
 */
export const deepEqual = (a, b) => {
  if (a === b) return true;
  
  if (a == null || b == null) return false;
  
  if (typeof a !== typeof b) return false;
  
  if (typeof a === 'object') {
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    for (let key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    
    return true;
  }
  
  return false;
};

/**
 * Debounce function for performance optimization
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Execute immediately on first call
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait, immediate = false) => {
  let timeout;
  
  return function executedFunction(...args) {
    const later = () => {
      timeout = null;
      if (!immediate) func(...args);
    };
    
    const callNow = immediate && !timeout;
    
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    
    if (callNow) func(...args);
  };
};

/**
 * Throttle function for performance optimization
 * @param {Function} func - Function to throttle
 * @param {number} limit - Limit in milliseconds
 * @returns {Function} Throttled function
 */
export const throttle = (func, limit) => {
  let inThrottle;
  
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

/**
 * Custom hook for memoizing expensive calculations
 * @param {Function} factory - Factory function
 * @param {Array} deps - Dependencies array
 * @returns {*} Memoized value
 */
export const useMemoizedValue = (factory, deps) => {
  return useMemo(factory, deps);
};

/**
 * Custom hook for memoizing callbacks
 * @param {Function} callback - Callback function
 * @param {Array} deps - Dependencies array
 * @returns {Function} Memoized callback
 */
export const useMemoizedCallback = (callback, deps) => {
  return useCallback(callback, deps);
};

/**
 * Performance monitoring utilities
 */
export class PerformanceMonitor {
  constructor() {
    this.marks = new Map();
    this.measures = new Map();
  }

  /**
   * Start timing an operation
   * @param {string} name - Operation name
   */
  startTiming(name) {
    if (typeof performance !== 'undefined') {
      performance.mark(`${name}-start`);
      this.marks.set(name, Date.now());
    }
  }

  /**
   * End timing an operation
   * @param {string} name - Operation name
   * @returns {number} Duration in milliseconds
   */
  endTiming(name) {
    if (typeof performance !== 'undefined') {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
      
      const measure = performance.getEntriesByName(name)[0];
      const duration = measure ? measure.duration : 0;
      
      this.measures.set(name, duration);
      return duration;
    }
    
    const startTime = this.marks.get(name);
    if (startTime) {
      const duration = Date.now() - startTime;
      this.measures.set(name, duration);
      return duration;
    }
    
    return 0;
  }

  /**
   * Get performance statistics
   * @returns {Object} Performance stats
   */
  getStats() {
    return {
      measures: Object.fromEntries(this.measures),
      averages: this.getAverages()
    };
  }

  /**
   * Get average durations for repeated operations
   * @returns {Object} Average durations
   */
  getAverages() {
    const averages = {};
    const grouped = {};
    
    for (let [name, duration] of this.measures) {
      const baseName = name.replace(/-\d+$/, ''); // Remove numeric suffixes
      if (!grouped[baseName]) {
        grouped[baseName] = [];
      }
      grouped[baseName].push(duration);
    }
    
    for (let [name, durations] of Object.entries(grouped)) {
      averages[name] = durations.reduce((a, b) => a + b, 0) / durations.length;
    }
    
    return averages;
  }

  /**
   * Clear all measurements
   */
  clear() {
    this.marks.clear();
    this.measures.clear();
    
    if (typeof performance !== 'undefined') {
      performance.clearMarks();
      performance.clearMeasures();
    }
  }
}

/**
 * Global performance monitor instance
 */
export const performanceMonitor = new PerformanceMonitor();

/**
 * Higher-order component for performance monitoring
 * @param {React.Component} WrappedComponent - Component to monitor
 * @param {string} componentName - Name for monitoring
 * @returns {React.Component} Monitored component
 */
export const withPerformanceMonitoring = (WrappedComponent, componentName) => {
  return function MonitoredComponent(props) {
    useMemo(() => {
      performanceMonitor.startTiming(`${componentName}-render`);
    }, []);

    useEffect(() => {
      performanceMonitor.endTiming(`${componentName}-render`);
      
      return () => {
        performanceMonitor.startTiming(`${componentName}-unmount`);
      };
    }, []);

    return <WrappedComponent {...props} />;
  };
};

/**
 * Memory management utilities
 */
export class MemoryManager {
  constructor() {
    this.objectPool = new Map();
  }

  /**
   * Get or create an object from the pool
   * @param {string} type - Object type
   * @param {Function} factory - Factory function to create new objects
   * @returns {*} Pooled object
   */
  getPooledObject(type, factory) {
    if (!this.objectPool.has(type)) {
      this.objectPool.set(type, []);
    }
    
    const pool = this.objectPool.get(type);
    
    if (pool.length > 0) {
      return pool.pop();
    }
    
    return factory();
  }

  /**
   * Return an object to the pool
   * @param {string} type - Object type
   * @param {*} object - Object to return
   */
  returnToPool(type, object) {
    if (!this.objectPool.has(type)) {
      this.objectPool.set(type, []);
    }
    
    // Reset object properties if it has a reset method
    if (object && typeof object.reset === 'function') {
      object.reset();
    }
    
    const pool = this.objectPool.get(type);
    if (pool.length < 50) { // Limit pool size
      pool.push(object);
    }
  }

  /**
   * Clear all pools
   */
  clearPools() {
    this.objectPool.clear();
  }

  /**
   * Get memory usage statistics
   * @returns {Object} Memory stats
   */
  getMemoryStats() {
    if (typeof performance !== 'undefined' && performance.memory) {
      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        poolSizes: Object.fromEntries(
          Array.from(this.objectPool.entries()).map(([type, pool]) => [type, pool.length])
        )
      };
    }
    
    return {
      poolSizes: Object.fromEntries(
        Array.from(this.objectPool.entries()).map(([type, pool]) => [type, pool.length])
      )
    };
  }
}

/**
 * Global memory manager instance
 */
export const memoryManager = new MemoryManager();

/**
 * Cleanup utilities for preventing memory leaks
 */
export const cleanup = {
  /**
   * Cleanup timers
   * @param {Array} timers - Array of timer IDs
   */
  timers: (timers) => {
    timers.forEach(timer => {
      if (timer) {
        clearTimeout(timer);
        clearInterval(timer);
      }
    });
  },

  /**
   * Cleanup event listeners
   * @param {Array} listeners - Array of {element, event, handler} objects
   */
  eventListeners: (listeners) => {
    listeners.forEach(({ element, event, handler }) => {
      if (element && element.removeEventListener) {
        element.removeEventListener(event, handler);
      }
    });
  },

  /**
   * Cleanup observers
   * @param {Array} observers - Array of observer objects
   */
  observers: (observers) => {
    observers.forEach(observer => {
      if (observer && typeof observer.disconnect === 'function') {
        observer.disconnect();
      }
    });
  }
};

// Export performance utilities as default
export default {
  memoWithComparison,
  shallowEqual,
  deepEqual,
  debounce,
  throttle,
  useMemoizedValue,
  useMemoizedCallback,
  PerformanceMonitor,
  performanceMonitor,
  withPerformanceMonitoring,
  MemoryManager,
  memoryManager,
  cleanup
};