#!/bin/bash

######################################################################
echo '# install rust implementation of handshake'
######################################################################
if [[ ! -d cable.rs ]]; then git clone https://github.com/mycognosist/cable.rs; fi
cd cable.rs
git checkout handshake > /dev/null
cargo build --release --examples > /dev/null
cd ..
ok 'rust implementation installed' ''
######################################################################

