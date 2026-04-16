#!/bin/bash

# WhatsApp Load Testing Script
# Usage: ./run-load-test.sh [environment]
# Environments: local, staging, production

set -e

# Default environment
ENVIRONMENT=${1:-local}
BASE_URL=""
API_KEY=""

echo "🚀 Starting WhatsApp Load Testing..."
echo "Environment: $ENVIRONMENT"

# Set base URL based on environment
case $ENVIRONMENT in
  local)
    BASE_URL="http://localhost:3000"
    ;;
  staging)
    BASE_URL="https://staging.kokohin.com"
    API_KEY="${STAGING_API_KEY}"
    ;;
  production)
    BASE_URL="https://kokohin.com"
    API_KEY="${PRODUCTION_API_KEY}"
    ;;
  *)
    echo "❌ Invalid environment. Use: local, staging, or production"
    exit 1
    ;;
esac

echo "Base URL: $BASE_URL"
echo "Target: 10,000 concurrent users"
echo "Threshold: Response time < 200ms"
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo "❌ k6 is not installed. Installing..."
    
    # Install k6 based on OS
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        sudo apt-get update
        sudo apt-get install -y ca-certificates gnupg2
        sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
        echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
        sudo apt-get update
        sudo apt-get install -y k6
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install k6
    elif [[ "$OSTYPE" == "msys" || "$OSTYPE" == "cygwin" ]]; then
        # Windows
        echo "Please install k6 manually from: https://k6.io/docs/getting-started/installation/#windows"
        exit 1
    else
        echo "Unsupported OS. Please install k6 manually from: https://k6.io/docs/getting-started/installation/"
        exit 1
    fi
fi

# Create results directory
RESULTS_DIR="load-test-results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
RESULTS_FILE="$RESULTS_DIR/whatsapp_load_test_$TIMESTAMP.json"

mkdir -p "$RESULTS_DIR"

# Run load test
echo "🏃 Running load test..."
k6 run \
  --env BASE_URL="$BASE_URL" \
  --env API_KEY="$API_KEY" \
  --summary-trend-stats="avg,min,med,max,p(90),p(95),p(99)" \
  --summary-export="$RESULTS_FILE" \
  scripts/load-test.js

echo ""
echo "✅ Load test completed!"
echo "Results saved to: $RESULTS_FILE"
echo ""

# Display summary
echo "📊 Test Summary:"
echo "================"
if [ -f "$RESULTS_FILE" ]; then
    echo "Full results available in: $RESULTS_FILE"
    echo ""
    echo "To view detailed results, run:"
    echo "  k6 show $RESULTS_FILE"
    echo ""
    echo "To generate HTML report, run:"
    echo "  k6 run --out html=report.html scripts/load-test.js"
fi

# Performance analysis
echo "🔍 Performance Analysis:"
echo "========================"
echo "Key metrics to check:"
echo "- HTTP request duration (p95) < 200ms"
echo "- Error rate < 10%"
echo "- No memory leaks or connection issues"
echo "- Database query performance"
echo "- Cache hit rates"
echo ""

# Next steps
echo "📝 Next Steps:"
echo "==============="
echo "1. Analyze the results file for detailed metrics"
echo "2. Check application logs for any errors"
echo "3. Monitor database performance during the test"
echo "4. Review cache hit rates and optimize if needed"
echo "5. Consider implementing additional optimizations"
echo ""

echo "🎉 Load testing completed successfully!"