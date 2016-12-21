#!/bin/bash

if [ ! -d node_modules ]; then
	npm install
fi

cat src/session.js >joined.js
cat src/editor.js >>joined.js
cat src/analyzer.js >>joined.js
cat src/root.js >>joined.js
node ./node_modules/babel-cli/bin/babel.js joined.js --plugins \
	transform-react-jsx --out-file script.js && rm joined.js
