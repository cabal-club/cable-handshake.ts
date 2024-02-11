#!/bin/bash

set -e

NUM=0
NUM_PASS=0
function ok() {
  NAME="$1"
  CMD="$2"
  NUM=$((NUM + 1))

  if eval "$2"; then
    echo "ok $NUM - $1"
    NUM_PASS=$((NUM_PASS + 1))
  else
    echo "not ok $NUM - $1"
  fi
}

function fin() {
  echo "1..${NUM}"
  echo "# tests $NUM"
  echo "# pass  $NUM_PASS"
  if [[ $NUM == $NUM_PASS ]]; then
    echo "# ok"
  else
    echo "# not ok"
  fi
}

