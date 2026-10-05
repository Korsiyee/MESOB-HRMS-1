#!/bin/bash
cd "$(dirname "$0")"
./node_modules/.bin/vitest run src/api/apiClient.bugCondition.test.js
