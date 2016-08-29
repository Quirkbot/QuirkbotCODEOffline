[ -e dist_polymer ] && rm -rf dist_polymer

cd node_modules/quirkbot-code-static
npm install
cd src/assets
bower install
cd ../..
npm run gulp -- build:polymer --environment=develop
cd ../..
mv node_modules/quirkbot-code-static/dist_polymer ./
rm -rf node_modules/quirkbot-code-static
