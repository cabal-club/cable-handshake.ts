#!/bin/bash

######################################################################
echo '# long msg exchange (Node.js initiator)'
######################################################################
TEMP=$(mktemp)
ok 'run command' 'npx dupsh -- "./cable.rs/target/release/examples/cli 11111111111111111111111111111111 responder --file 11.txt" "node ../../dist/examples/cli 3131313131313131313131313131313131313131313131313131313131313131 initiator @6317.txt" 2> $TEMP'
ok 'got rust msg' 'grep -q "generations of pirates, and I saw by their movements that they were" $TEMP'
ok 'got node.js msg' 'grep -q "The Hatter looked at the March Hare, who had followed him" $TEMP'
cp $TEMP log
ok 'removed tempfile' 'rm $TEMP'
######################################################################


######################################################################
echo '# long msg exchange (Rust initiator)'
######################################################################
TEMP=$(mktemp)
ok 'run command' 'npx dupsh -- "./cable.rs/target/release/examples/cli 11111111111111111111111111111111 initiator --file 11.txt" "node ../../dist/examples/cli 3131313131313131313131313131313131313131313131313131313131313131 responder @6317.txt" 2> $TEMP'
ok 'got rust msg' 'grep -q "generations of pirates, and I saw by their movements that they were" $TEMP'
ok 'got node.js msg' 'grep -q "The Hatter looked at the March Hare, who had followed him" $TEMP'
cp $TEMP log
ok 'removed tempfile' 'rm $TEMP'
######################################################################
