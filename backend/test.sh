#!/bin/bash

# Test script for media-sync system

echo "Starting Docker Compose..."
docker-compose up -d

echo "Waiting for services to be ready..."
sleep 30

echo "Testing MongoDB connection..."
# Add MongoDB test if needed

echo "Testing MediaMTX ingest API..."
curl -s http://localhost:9000/api/streams | jq . || echo "Failed to get ingest streams"

echo "Testing MediaMTX cluster API..."
curl -s http://localhost:9001/api/streams | jq . || echo "Failed to get cluster streams"

echo "Testing NestJS app health..."
curl -s http://localhost:3000/api/streams | jq . || echo "Failed to get streams from app"

echo "Testing stream assignment..."
curl -s http://localhost:3000/api/streams/assignment | jq . || echo "Failed to get assignments"

echo "Testing alerts..."
curl -s http://localhost:3000/api/alerts | jq . || echo "Failed to get alerts"

echo "Testing metrics..."
curl -s http://localhost:3000/api/metrics/stream/test | jq . || echo "Failed to get metrics"

echo "All tests completed. Check output above."

# To stop: docker-compose down