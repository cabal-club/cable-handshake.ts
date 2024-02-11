#!/bin/bash

. ./lib.sh

echo "TAP version 14"
for f in t*.sh; do
  . ${f}
done

fin
