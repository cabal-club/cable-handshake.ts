#!/bin/bash

. ./lib.sh

echo "TAP version 13"
for f in t*.sh; do
  . ${f}
done

fin
