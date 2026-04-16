#!/usr/bin/env node

/**
 * Simple Load Testing Script untuk WhatsApp Integration
 * 
 * Alternatif untuk k6 yang tidak memerlukan instalasi
 */

const http = require('http');
const https = require('https');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');

class SimpleLoadTester {
  constructor(options = {}) {
    this.options = {
      baseUrl: options.baseUrl || 'http://localhost:3000',
      concurrentUsers: options.concurrentUsers || 10,
      duration: options.duration || 30000, // 30 seconds
      rampUpTime: options.rampUpTime || 5000, // 5 seconds
      resultsFile: options.resultsFile || 'simple-load-test-results.json',
      ...options
    };
    
    this.results = {
      startTime: Date.now(),
      requests: [],
      errors: [],
      summary: {}
    };
    
    this.isRunning = false;
    this.activeUsers = 0;
    this.requestCount = 0;
    this.errorCount = 0;
  }

  async start() {
    console.log('🚀 Starting Simple Load Testing...');
    console.log(`Base URL: ${this.options.baseUrl}`);
    console.log(`Concurrent Users: ${this.options.concurrentUsers}`);
    console.log(`Duration: ${this.options.duration}ms`);
    console.log(`Ramp-up Time: ${this.options.rampUpTime}ms`);
    console.log('');
    
    this.isRunning = true;
    
    // Start users gradually
    await this.rampUpUsers();
    
    // Run for specified duration
    await this.sleep(this.options.duration);
    
    // Stop testing
    await this.stop();
  }

  async rampUpUsers() {
    const usersPerInterval = Math.ceil(this.options.concurrentUsers / (this.options.rampUpTime / 1000));
    const interval = 1000; // 1 second
    
    console.log('📈 Ramping up users...');
    
    for (let i = 0; i < this.options.concurrentUsers; i += usersPerInterval) {
      const usersToAdd = Math.min(usersPerInterval, this.options.concurrentUsers - i);
      
      for (let j = 0; j < usersToAdd; j++) {
        this.startUser();
      }
      
      if (i + usersPerInterval < this.options.concurrentUsers) {
        await this.sleep(interval);
      }
    }
    
    console.log(`✅ ${this.options.concurrentUsers} users started`);
  }

  startUser() {
    this.activeUsers++;
    
    const user = {
      id: this.activeUsers,
      startTime: Date.now(),
      requests: 0,
      errors: 0
    };
    
    this.runUser(user);
  }

  async runUser(user) {
    while (this.isRunning) {
      try {
        // Test different endpoints
        const testType = Math.random();
        
        if (testType < 0.4) {
          await this.testGetContacts(user);
        } else if (testType < 0.7) {
          await this.testGetMessages(user);
        } else if (testType < 0.9) {
          await this.testGetSessions(user);
        } else {
          await this.testSendMessage(user);
        }
        
        // Random think time between requests
        const thinkTime = Math.random() * 2000 + 500; // 0.5-2.5 seconds
        await this.sleep(thinkTime);
        
      } catch (error) {
        this.errorCount++;
        user.errors++;
        
        this.results.errors.push({
          userId: user.id,
          timestamp: Date.now(),
          error: error.message,
          url: error.url || 'unknown'
        });
        
        console.error(`User ${user.id} error:`, error.message);
      }
    }
    
    console.log(`User ${user.id} stopped`);
  }

  async testGetContacts(user) {
    const startTime = Date.now();
    const url = `${this.options.baseUrl}/api/whatsapp/test?type=chats`;
    
    try {
      const response = await this.makeRequest(url, 'GET');
      const duration = Date.now() - startTime;
      
      this.recordRequest(user, 'contacts', duration, response.statusCode);
      
      if (response.statusCode >= 400) {
        throw new Error(`HTTP ${response.statusCode}: ${response.body}`);
      }
      
      console.log(`User ${user.id}: Contacts request completed in ${duration}ms`);
      
    } catch (error) {
      error.url = url;
      throw error;
    }
  }

  async testGetMessages(user) {
    const startTime = Date.now();
    const chatId = 'test-chat-' + Math.floor(Math.random() * 100);
    const url = `${this.options.baseUrl}/api/whatsapp/test?type=messages&chatId=${chatId}`;
    
    try {
      const response = await this.makeRequest(url, 'GET');
      const duration = Date.now() - startTime;
      
      this.recordRequest(user, 'messages', duration, response.statusCode);
      
      if (response.statusCode >= 400) {
        throw new Error(`HTTP ${response.statusCode}: ${response.body}`);
      }
      
      console.log(`User ${user.id}: Messages request completed in ${duration}ms`);
      
    } catch (error) {
      error.url = url;
      throw error;
    }
  }

  async testGetSessions(user) {
    const startTime = Date.now();
    const url = `${this.options.baseUrl}/api/whatsapp/test?type=sessions`;
    
    try {
      const response = await this.makeRequest(url, 'GET');
      const duration = Date.now() - startTime;
      
      this.recordRequest(user, 'sessions', duration, response.statusCode);
      
      if (response.statusCode >= 400) {
        throw new Error(`HTTP ${response.statusCode}: ${response.body}`);
      }
      
      console.log(`User ${user.id}: Sessions request completed in ${duration}ms`);
      
    } catch (error) {
      error.url = url;
      throw error;
    }
  }

  async testSendMessage(user) {
    const startTime = Date.now();
    const data = {
      chatId: 'test-chat-' + Math.floor(Math.random() * 100),
      message: `Test message from user ${user.id} at ${Date.now()}`
    };
    const url = `${this.options.baseUrl}/api/whatsapp/test?type=send-message&chatId=${data.chatId}&message=${encodeURIComponent(data.message)}`;
    
    try {
      const response = await this.makeRequest(url, 'GET');
      const duration = Date.now() - startTime;
      
      this.recordRequest(user, 'send-message', duration, response.statusCode);
      
      if (response.statusCode >= 400) {
        throw new Error(`HTTP ${response.statusCode}: ${response.body}`);
      }
      
      console.log(`User ${user.id}: Send message completed in ${duration}ms`);
      
    } catch (error) {
      error.url = url;
      throw error;
    }
  }

  makeRequest(url, method = 'GET', data = null) {
    return new Promise((resolve, reject) => {
      const parsedUrl = new URL(url);
      const isHttps = parsedUrl.protocol === 'https:';
      const httpModule = isHttps ? https : http;
      
      const options = {
        hostname: parsedUrl.hostname,
        port: parsedUrl.port || (isHttps ? 443 : 80),
        path: parsedUrl.pathname + parsedUrl.search,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'SimpleLoadTester/1.0'
        },
        timeout: 30000 // 30 seconds
      };
      
      if (data && method !== 'GET') {
        const jsonData = JSON.stringify(data);
        options.headers['Content-Length'] = Buffer.byteLength(jsonData);
      }
      
      const req = httpModule.request(options, (res) => {
        let body = '';
        
        res.on('data', (chunk) => {
          body += chunk;
        });
        
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        });
      });
      
      req.on('error', (error) => {
        reject(error);
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });
      
      if (data && method !== 'GET') {
        req.write(JSON.stringify(data));
      }
      
      req.end();
    });
  }

  recordRequest(user, type, duration, statusCode) {
    this.requestCount++;
    user.requests++;
    
    this.results.requests.push({
      userId: user.id,
      type: type,
      timestamp: Date.now(),
      duration: duration,
      statusCode: statusCode,
      success: statusCode < 400
    });
  }

  async stop() {
    console.log('\n🛑 Stopping load test...');
    
    this.isRunning = false;
    
    // Wait for active requests to complete
    await this.sleep(2000);
    
    // Generate summary
    this.generateSummary();
    
    // Save results
    this.saveResults();
    
    console.log('✅ Load test completed!');
  }

  generateSummary() {
    const successfulRequests = this.results.requests.filter(r => r.success).length;
    const failedRequests = this.results.requests.filter(r => !r.success).length;
    const totalRequests = this.results.requests.length;
    
    const durations = this.results.requests.map(r => r.duration);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    const minDuration = Math.min(...durations);
    const maxDuration = Math.max(...durations);
    
    // Calculate percentiles
    durations.sort((a, b) => a - b);
    const p90 = durations[Math.floor(durations.length * 0.9)];
    const p95 = durations[Math.floor(durations.length * 0.95)];
    
    this.results.summary = {
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate: (successfulRequests / totalRequests) * 100,
      avgDuration,
      minDuration,
      maxDuration,
      p90,
      p95,
      errorRate: (failedRequests / totalRequests) * 100
    };
  }

  saveResults() {
    const results = {
      ...this.results,
      metadata: {
        startTime: new Date(this.results.startTime).toISOString(),
        endTime: new Date().toISOString(),
        duration: Date.now() - this.results.startTime,
        config: this.options
      }
    };
    
    fs.writeFileSync(this.options.resultsFile, JSON.stringify(results, null, 2));
    
    console.log(`\n📊 Results saved to: ${this.options.resultsFile}`);
    this.printSummary();
  }

  printSummary() {
    const summary = this.results.summary;
    
    console.log('\n📈 Load Test Summary:');
    console.log('======================');
    console.log(`Total Requests: ${summary.totalRequests}`);
    console.log(`Successful Requests: ${summary.successfulRequests}`);
    console.log(`Failed Requests: ${summary.failedRequests}`);
    console.log(`Success Rate: ${summary.successRate.toFixed(2)}%`);
    console.log(`Error Rate: ${summary.errorRate.toFixed(2)}%`);
    console.log('');
    console.log('Response Times:');
    console.log(`  Average: ${summary.avgDuration.toFixed(2)}ms`);
    console.log(`  Minimum: ${summary.minDuration}ms`);
    console.log(`  Maximum: ${summary.maxDuration}ms`);
    console.log(`  P90: ${summary.p90}ms`);
    console.log(`  P95: ${summary.p95}ms`);
    
    // Performance analysis
    console.log('\n🎯 Performance Analysis:');
    if (summary.p95 < 200) {
      console.log('✅ P95 response time meets target (< 200ms)');
    } else {
      console.log('⚠️  P95 response time exceeds target (>= 200ms)');
    }
    
    if (summary.errorRate < 10) {
      console.log('✅ Error rate meets target (< 10%)');
    } else {
      console.log('⚠️  Error rate exceeds target (>= 10%)');
    }
    
    if (summary.successRate >= 99) {
      console.log('✅ Success rate is excellent (>= 99%)');
    } else if (summary.successRate >= 95) {
      console.log('✅ Success rate is good (>= 95%)');
    } else {
      console.log('⚠️  Success rate needs improvement (< 95%)');
    }
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  
  const options = {
    baseUrl: args.includes('--url') ? args[args.indexOf('--url') + 1] : 'http://localhost:3000',
    concurrentUsers: args.includes('--users') ? parseInt(args[args.indexOf('--users') + 1]) : 10,
    duration: args.includes('--duration') ? parseInt(args[args.indexOf('--duration') + 1]) : 30000,
    resultsFile: args.includes('--output') ? args[args.indexOf('--output') + 1] : 'simple-load-test-results.json'
  };
  
  const tester = new SimpleLoadTester(options);
  tester.start().catch(console.error);
}

module.exports = SimpleLoadTester;