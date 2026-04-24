/* eslint-disable @typescript-eslint/no-require-imports */
const axios = require('axios');
const { performance } = require('perf_hooks');

// Configuration
const BASE_URL = 'http://localhost:3000';
const CONCURRENT_REQUESTS = 10; // Start small, can increase gradually
const TOTAL_REQUESTS = 100;
const ENDPOINTS = [
  '/api/whatsapp/test?action=getChats',
  '/api/whatsapp/test?action=getMessages&contactId=test123',
  '/api/whatsapp/test?action=getContacts'
];

// Results tracking
const results = {
  total: 0,
  success: 0,
  failed: 0,
  responseTimes: [],
  errors: []
};

async function makeRequest(endpoint) {
  const startTime = performance.now();
  try {
    const response = await axios.get(`${BASE_URL}${endpoint}`, {
      timeout: 5000 // 5 second timeout
    });
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    results.responseTimes.push(responseTime);
    results.total++;
    
    if (response.data && response.data.success) {
      results.success++;
    } else {
      results.failed++;
      results.errors.push({
        endpoint,
        error: response.data?.error || 'Unknown error',
        responseTime
      });
    }
    
    return {
      success: true,
      responseTime,
      data: response.data
    };
  } catch (error) {
    const endTime = performance.now();
    const responseTime = endTime - startTime;
    
    results.responseTimes.push(responseTime);
    results.total++;
    results.failed++;
    results.errors.push({
      endpoint,
      error: error.message,
      responseTime
    });
    
    return {
      success: false,
      responseTime,
      error: error.message
    };
  }
}

async function runConcurrentTest(endpoint, concurrentCount) {
  console.log(`\n🚀 Testing ${endpoint} with ${concurrentCount} concurrent requests...`);
  
  const promises = [];
  for (let i = 0; i < concurrentCount; i++) {
    promises.push(makeRequest(endpoint));
  }
  
  const responses = await Promise.all(promises);
  
  const avgResponseTime = responses.reduce((sum, r) => sum + r.responseTime, 0) / responses.length;
  const successRate = (responses.filter(r => r.success).length / responses.length) * 100;
  
  console.log(`📊 Results for ${endpoint}:`);
  console.log(`   Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
  console.log(`   Success Rate: ${successRate.toFixed(1)}%`);
  console.log(`   Total Requests: ${responses.length}`);
  
  return {
    endpoint,
    avgResponseTime,
    successRate,
    totalRequests: responses.length
  };
}

async function runLoadTest() {
  console.log('📈 WhatsApp API Load Testing Started');
  console.log('=====================================');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Concurrent Requests: ${CONCURRENT_REQUESTS}`);
  console.log(`Total Requests per Endpoint: ${TOTAL_REQUESTS}`);
  
  const startTime = performance.now();
  
  try {
    // Test each endpoint
    for (const endpoint of ENDPOINTS) {
      await runConcurrentTest(endpoint, CONCURRENT_REQUESTS);
      
      // Small delay between endpoint tests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    const endTime = performance.now();
    const totalTestTime = endTime - startTime;
    
    console.log('\n📋 Summary Report');
    console.log('==================');
    console.log(`Total Test Time: ${totalTestTime.toFixed(2)}ms`);
    console.log(`Overall Success Rate: ${((results.success / results.total) * 100).toFixed(1)}%`);
    
    if (results.responseTimes.length > 0) {
      const avgResponseTime = results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length;
      const minResponseTime = Math.min(...results.responseTimes);
      const maxResponseTime = Math.max(...results.responseTimes);
      
      console.log(`Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
      console.log(`Min Response Time: ${minResponseTime.toFixed(2)}ms`);
      console.log(`Max Response Time: ${maxResponseTime.toFixed(2)}ms`);
    }
    
    if (results.errors.length > 0) {
      console.log(`\n❌ Errors (${results.errors.length}):`);
      results.errors.slice(0, 5).forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.error} (${error.responseTime.toFixed(2)}ms)`);
      });
      if (results.errors.length > 5) {
        console.log(`   ... and ${results.errors.length - 5} more errors`);
      }
    }
    
    // Save results to file
    const fs = require('fs');
    const resultsData = {
      timestamp: new Date().toISOString(),
      config: {
        baseUrl: BASE_URL,
        concurrentRequests: CONCURRENT_REQUESTS,
        totalRequestsPerEndpoint: TOTAL_REQUESTS
      },
      results: {
        total: results.total,
        success: results.success,
        failed: results.failed,
        responseTimes: {
          average: results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length,
          min: Math.min(...results.responseTimes),
          max: Math.max(...results.responseTimes)
        },
        errors: results.errors
      }
    };
    
    fs.writeFileSync('whatsapp-load-test-results.json', JSON.stringify(resultsData, null, 2));
    console.log('\n💾 Results saved to whatsapp-load-test-results.json');
    
  } catch (error) {
    console.error('❌ Load test failed:', error.message);
  }
}

// Check if axios is available
try {
  require.resolve('axios');
  runLoadTest();
} catch (error) {
  console.log('📦 Installing axios for load testing...');
  const { execSync } = require('child_process');
  try {
    execSync('npm install axios', { stdio: 'inherit' });
    console.log('✅ Axios installed. Running load test...');
    runLoadTest();
  } catch (installError) {
    console.error('❌ Failed to install axios:', installError.message);
    console.log('Please install axios manually: npm install axios');
  }
}
