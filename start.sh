#!/bin/bash
# Start the Fantasy Football dev environment
# Usage: ./start.sh [backend|mobile|all]

cd "$(dirname "$0")"

case "${1:-all}" in
  backend)
    echo "Starting backend (Postgres + Redis + FastAPI)..."
    docker-compose up
    ;;
  mobile)
    echo "Starting mobile (Expo)..."
    cd mobile && npx expo start
    ;;
  all)
    echo "Starting backend in background..."
    docker-compose up -d
    echo "Backend running at http://localhost:8000"
    echo "API docs at http://localhost:8000/docs"
    echo ""
    echo "Starting mobile..."
    cd mobile && npx expo start
    ;;
  stop)
    echo "Stopping backend..."
    docker-compose down
    ;;
  *)
    echo "Usage: ./start.sh [backend|mobile|all|stop]"
    ;;
esac
