#!/usr/bin/env node

/**
 * Load Testing Script untuk WhatsApp Integration
 * 
 * Menggunakan k6 untuk melakukan load testing terhadap:
 * - API endpoints WhatsApp
 * - Database queries
 * - Real-time subscriptions
 * 
 * Target: 10,000 concurrent users, response time < 200ms
 */

const http = require('k6/http');
const { check, sleep } = require('k6');
const { Rate } = require('k6/metrics');

// Custom metrics
const errorRate = new Rate('errors');
const responseTime = new Rate('response_time');

// Test configuration
export const options = {
  stages: [
    { duration: '2m', target: 100 },    // Ramp up to 100 users
    { duration: '5m', target: 100 },    // Stay at 100 users
    { duration: '2m', target: 1000 },   // Ramp up to 1000 users
    { duration: '5m', target: 1000 },  // Stay at 1000 users
    { duration: '2m', target: 5000 },   // Ramp up to 5000 users
    { duration: '5m', target: 5000 },    // Stay at 5000 users
    { duration: '2m', target: 10000 },  // Ramp up to 10000 users
    { duration: '5m', target: 10000 },   // Stay at 10000 users
    { duration: '2m', target: 0 },      // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<200'], // 95% of requests should be below 200ms
    http_req_failed: ['rate<0.1'],    // Error rate should be below 10%
    errors: ['rate<0.1'],              // Custom error rate below 10%
  },
};

// Base URL for testing
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || '';

// Test data
const testChats = [
  'chat_1', 'chat_2', 'chat_3', 'chat_4', 'chat_5',
  'chat_6', 'chat_7', 'chat_8', 'chat_9', 'chat_10'
];

const testMessages = [
  'Hello, this is a test message',
  'How are you doing today?',
  'Can you help me with this?',
  'Thank you for your assistance',
  'I need more information about this'
];

// Helper functions
function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getAuthHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  if (API_KEY) {
    headers['Authorization'] = `Bearer ${API_KEY}`;
  }
  
  return headers;
}

// Test scenarios
export function testGetContacts() {
  const params = {
    headers: getAuthHeaders(),
    tags: { name: 'GetContacts' }
  };
  
  const response = http.get(`${BASE_URL}/api/whatsapp/contacts?page=1&limit=20`, params);
  
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
    'has contacts data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.success === true && Array.isArray(data.contacts);
      } catch {
        return false;
      }
    }
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration < 200);
  
  sleep(1);
}

export function testGetMessages() {
  const chatId = getRandomItem(testChats);
  const params = {
    headers: getAuthHeaders(),
    tags: { name: 'GetMessages' }
  };
  
  const response = http.get(`${BASE_URL}/api/whatsapp/messages?chatId=${chatId}&page=1&limit=50`, params);
  
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
    'has messages data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.success === true && Array.isArray(data.messages);
      } catch {
        return false;
      }
    }
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration < 200);
  
  sleep(1);
}

export function testSendMessage() {
  const chatId = getRandomItem(testChats);
  const message = getRandomItem(testMessages);
  
  const payload = {
    chatId: chatId,
    message: message,
    idempotencyKey: `test_${Date.now()}_${Math.random()}`
  };
  
  const params = {
    headers: getAuthHeaders(),
    tags: { name: 'SendMessage' }
  };
  
  const response = http.post(`${BASE_URL}/api/whatsapp/send`, JSON.stringify(payload), params);
  
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
    'message sent successfully': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.success === true;
      } catch {
        return false;
      }
    }
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration < 200);
  
  sleep(2);
}

export function testGetSessionStatus() {
  const params = {
    headers: getAuthHeaders(),
    tags: { name: 'GetSessionStatus' }
  };
  
  const response = http.get(`${BASE_URL}/api/whatsapp/session/status`, params);
  
  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
    'has session data': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.success === true && data.session;
      } catch {
        return false;
      }
    }
  });
  
  errorRate.add(!success);
  responseTime.add(response.timings.duration < 200);
  
  sleep(1);
}

// Main test execution
export default function () {
  // Randomly select test scenario based on weights
  const random = Math.random();
  
  if (random < 0.4) {
    testGetContacts(); // 40% of requests
  } else if (random < 0.7) {
    testGetMessages(); // 30% of requests
  } else if (random < 0.9) {
    testSendMessage(); // 20% of requests
  } else {
    testGetSessionStatus(); // 10% of requests
  }
}

// Setup and teardown
export function setup() {
  console.log('Starting WhatsApp load test...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Target: 10,000 concurrent users`);
  console.log(`Threshold: Response time < 200ms`);
  
  // Warm up cache
  const params = {
    headers: getAuthHeaders()
  };
  
  // Make a few warm-up requests
  for (let i = 0; i < 5; i++) {
    http.get(`${BASE_URL}/api/whatsapp/contacts?page=1&limit=20`, params);
    sleep(0.5);
  }
  
  return { timestamp: new Date().toISOString() };
}

export function teardown(data) {
  console.log('Load test completed');
  console.log(`Start time: ${data.timestamp}`);
  console.log(`End time: ${new Date().toISOString()}`);
}