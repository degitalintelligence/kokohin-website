#!/usr/bin/env node

/**
 * Performance Monitoring Script untuk WhatsApp Integration
 * 
 * Memantau performa sistem secara real-time selama load testing
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

class PerformanceMonitor {
  constructor(options = {}) {
    this.options = {
      interval: options.interval || 5000, // 5 seconds
      duration: options.duration || 300000, // 5 minutes
      logFile: options.logFile || 'performance-monitor.log',
      ...options
    };
    
    this.startTime = Date.now();
    this.metrics = {
      cpu: [],
      memory: [],
      connections: [],
      queries: [],
      cacheHits: [],
      responseTimes: []
    };
    
    this.isRunning = false;
  }

  async start() {
    console.log('🔍 Starting Performance Monitor...');
    console.log(`Monitoring interval: ${this.options.interval}ms`);
    console.log(`Duration: ${this.options.duration}ms`);
    console.log(`Log file: ${this.options.logFile}`);
    console.log('');
    
    this.isRunning = true;
    
    // Start monitoring intervals
    this.cpuInterval = setInterval(() => this.collectCPUMetrics(), this.options.interval);
    this.memoryInterval = setInterval(() => this.collectMemoryMetrics(), this.options.interval);
    this.connectionInterval = setInterval(() => this.collectConnectionMetrics(), this.options.interval * 2);
    this.queryInterval = setInterval(() => this.collectQueryMetrics(), this.options.interval * 3);
    
    // Stop after duration
    setTimeout(() => this.stop(), this.options.duration);
    
    // Handle graceful shutdown
    process.on('SIGINT', () => this.stop());
    process.on('SIGTERM', () => this.stop());
  }

  async stop() {
    if (!this.isRunning) return;
    
    console.log('\n🛑 Stopping Performance Monitor...');
    
    this.isRunning = false;
    
    // Clear intervals
    clearInterval(this.cpuInterval);
    clearInterval(this.memoryInterval);
    clearInterval(this.connectionInterval);
    clearInterval(this.queryInterval);
    
    // Generate report
    await this.generateReport();
    
    console.log('✅ Performance monitoring completed');
    process.exit(0);
  }

  async collectCPUMetrics() {
    try {
      const cpuUsage = await this.getCPUUsage();
      this.metrics.cpu.push({
        timestamp: Date.now(),
        usage: cpuUsage
      });
      
      this.logMetric('CPU', `${cpuUsage.toFixed(2)}%`);
    } catch (error) {
      console.error('Error collecting CPU metrics:', error.message);
    }
  }

  async collectMemoryMetrics() {
    try {
      const memoryUsage = await this.getMemoryUsage();
      this.metrics.memory.push({
        timestamp: Date.now(),
        ...memoryUsage
      });
      
      this.logMetric('Memory', `${memoryUsage.usedPercent.toFixed(2)}% (${this.formatBytes(memoryUsage.used)} / ${this.formatBytes(memoryUsage.total)})`);
    } catch (error) {
      console.error('Error collecting memory metrics:', error.message);
    }
  }

  async collectConnectionMetrics() {
    try {
      const connections = await this.getConnectionMetrics();
      this.metrics.connections.push({
        timestamp: Date.now(),
        ...connections
      });
      
      this.logMetric('Connections', `Active: ${connections.active}, Idle: ${connections.idle}, Total: ${connections.total}`);
    } catch (error) {
      console.error('Error collecting connection metrics:', error.message);
    }
  }

  async collectQueryMetrics() {
    try {
      const queries = await this.getQueryMetrics();
      this.metrics.queries.push({
        timestamp: Date.now(),
        ...queries
      });
      
      this.logMetric('Database', `Active: ${queries.active}, Slow: ${queries.slow}, Total: ${queries.total}`);
    } catch (error) {
      console.error('Error collecting query metrics:', error.message);
    }
  }

  async getCPUUsage() {
    return new Promise((resolve, reject) => {
      exec('wmic cpu get loadpercentage /value', (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        
        const match = stdout.match(/LoadPercentage=(\d+)/);
        if (match) {
          resolve(parseInt(match[1]));
        } else {
          reject(new Error('Could not parse CPU usage'));
        }
      });
    });
  }

  async getMemoryUsage() {
    return new Promise((resolve, reject) => {
      exec('wmic OS get TotalVisibleMemorySize,FreePhysicalMemory /value', (error, stdout) => {
        if (error) {
          reject(error);
          return;
        }
        
        const totalMatch = stdout.match(/TotalVisibleMemorySize=(\d+)/);
        const freeMatch = stdout.match(/FreePhysicalMemory=(\d+)/);
        
        if (totalMatch && freeMatch) {
          const totalKB = parseInt(totalMatch[1]);
          const freeKB = parseInt(freeMatch[1]);
          const usedKB = totalKB - freeKB;
          
          resolve({
            total: totalKB * 1024,
            used: usedKB * 1024,
            free: freeKB * 1024,
            usedPercent: (usedKB / totalKB) * 100
          });
        } else {
          reject(new Error('Could not parse memory usage'));
        }
      });
    });
  }

  async getConnectionMetrics() {
    // This would need to be implemented based on your specific setup
    // For now, return mock data
    return {
      active: Math.floor(Math.random() * 100) + 50,
      idle: Math.floor(Math.random() * 50) + 10,
      total: Math.floor(Math.random() * 150) + 60
    };
  }

  async getQueryMetrics() {
    // This would need to be implemented based on your database setup
    // For now, return mock data
    return {
      active: Math.floor(Math.random() * 20) + 5,
      slow: Math.floor(Math.random() * 5),
      total: Math.floor(Math.random() * 1000) + 500
    };
  }

  logMetric(type, value) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${type}: ${value}`;
    
    console.log(logEntry);
    
    // Append to log file
    fs.appendFileSync(this.options.logFile, logEntry + '\n');
  }

  formatBytes(bytes) {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  async generateReport() {
    console.log('\n📊 Generating Performance Report...');
    
    const report = {
      summary: {
        duration: Date.now() - this.startTime,
        startTime: new Date(this.startTime).toISOString(),
        endTime: new Date().toISOString()
      },
      metrics: {
        cpu: this.analyzeCPUMetrics(),
        memory: this.analyzeMemoryMetrics(),
        connections: this.analyzeConnectionMetrics(),
        queries: this.analyzeQueryMetrics()
      },
      recommendations: this.generateRecommendations()
    };
    
    const reportFile = `performance-report-${Date.now()}.json`;
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log(`✅ Report saved to: ${reportFile}`);
    this.printSummary(report);
  }

  analyzeCPUMetrics() {
    if (this.metrics.cpu.length === 0) return null;
    
    const usages = this.metrics.cpu.map(m => m.usage);
    return {
      average: usages.reduce((a, b) => a + b, 0) / usages.length,
      max: Math.max(...usages),
      min: Math.min(...usages)
    };
  }

  analyzeMemoryMetrics() {
    if (this.metrics.memory.length === 0) return null;
    
    const usages = this.metrics.memory.map(m => m.usedPercent);
    return {
      average: usages.reduce((a, b) => a + b, 0) / usages.length,
      max: Math.max(...usages),
      min: Math.min(...usages)
    };
  }

  analyzeConnectionMetrics() {
    if (this.metrics.connections.length === 0) return null;
    
    const totals = this.metrics.connections.map(m => m.total);
    return {
      average: totals.reduce((a, b) => a + b, 0) / totals.length,
      max: Math.max(...totals),
      min: Math.min(...totals)
    };
  }

  analyzeQueryMetrics() {
    if (this.metrics.queries.length === 0) return null;
    
    const totals = this.metrics.queries.map(m => m.total);
    return {
      average: totals.reduce((a, b) => a + b, 0) / totals.length,
      max: Math.max(...totals),
      min: Math.min(...totals)
    };
  }

  generateRecommendations() {
    const recommendations = [];
    
    // CPU recommendations
    const cpuAnalysis = this.analyzeCPUMetrics();
    if (cpuAnalysis && cpuAnalysis.average > 80) {
      recommendations.push({
        type: 'CPU',
        issue: 'High CPU usage detected',
        recommendation: 'Consider scaling up CPU or optimizing code'
      });
    }
    
    // Memory recommendations
    const memoryAnalysis = this.analyzeMemoryMetrics();
    if (memoryAnalysis && memoryAnalysis.average > 80) {
      recommendations.push({
        type: 'Memory',
        issue: 'High memory usage detected',
        recommendation: 'Consider increasing memory or checking for memory leaks'
      });
    }
    
    // Connection recommendations
    const connectionAnalysis = this.analyzeConnectionMetrics();
    if (connectionAnalysis && connectionAnalysis.average > 1000) {
      recommendations.push({
        type: 'Connections',
        issue: 'High connection count',
        recommendation: 'Consider connection pooling or connection limits'
      });
    }
    
    return recommendations;
  }

  printSummary(report) {
    console.log('\n📈 Performance Summary:');
    console.log('========================');
    
    if (report.metrics.cpu) {
      console.log(`CPU Usage: Avg ${report.metrics.cpu.average.toFixed(2)}%, Max ${report.metrics.cpu.max.toFixed(2)}%`);
    }
    
    if (report.metrics.memory) {
      console.log(`Memory Usage: Avg ${report.metrics.memory.average.toFixed(2)}%, Max ${report.metrics.memory.max.toFixed(2)}%`);
    }
    
    if (report.metrics.connections) {
      console.log(`Connections: Avg ${report.metrics.connections.average.toFixed(0)}, Max ${report.metrics.connections.max}`);
    }
    
    if (report.metrics.queries) {
      console.log(`Database Queries: Avg ${report.metrics.queries.average.toFixed(0)}, Max ${report.metrics.queries.max}`);
    }
    
    if (report.recommendations.length > 0) {
      console.log('\n⚠️  Recommendations:');
      report.recommendations.forEach(rec => {
        console.log(`- ${rec.type}: ${rec.recommendation}`);
      });
    } else {
      console.log('\n✅ No performance issues detected');
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    interval: args.includes('--interval') ? parseInt(args[args.indexOf('--interval') + 1]) : 5000,
    duration: args.includes('--duration') ? parseInt(args[args.indexOf('--duration') + 1]) : 300000,
    logFile: args.includes('--log') ? args[args.indexOf('--log') + 1] : 'performance-monitor.log'
  };
  
  const monitor = new PerformanceMonitor(options);
  monitor.start();
}

module.exports = PerformanceMonitor;