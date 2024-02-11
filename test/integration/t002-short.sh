#!/bin/bash

######################################################################
echo '# short msg exchange (Node.js initiator)'
######################################################################
TEMP=$(mktemp)
ok 'run command' 'npx dupsh -- "./cable.rs/target/release/examples/cli 11111111111111111111111111111111 responder \"ich bin rust\"" "node ../../dist/examples/cli 3131313131313131313131313131313131313131313131313131313131313131 initiator \"ich bin node\"" 2> $TEMP'
ok 'got rust msg' 'grep -q "Received message: ich bin node" $TEMP'
ok 'got node.js msg' 'grep -q "got \"ich bin rust\"" $TEMP'
ok 'removed tempfile' 'rm $TEMP'
######################################################################


######################################################################
echo '# short msg exchange (Rust initiator)'
######################################################################
TEMP=$(mktemp)
ok 'run command' 'npx dupsh -- "./cable.rs/target/release/examples/cli 11111111111111111111111111111111 responder \"ich bin rust\"" "node ../../dist/examples/cli 3131313131313131313131313131313131313131313131313131313131313131 initiator \"ich bin node\"" 2> $TEMP'
ok 'got rust msg' 'grep -q "Received message: ich bin node" $TEMP'
ok 'got node.js msg' 'grep -q "got \"ich bin rust\"" $TEMP'
ok 'removed tempfile' 'rm $TEMP'
######################################################################

