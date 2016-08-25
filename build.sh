[ -e api ] && rm -rf api
[ -e compiler ] && rm -rf compiler
[ -e extension ] && rm -rf extension
[ -e dist_polymer ] && rm -rf dist_polymer
[ -e quirkbot-chrome-* ] && rm -rf quirkbot-chrome-*

# download compiler
git clone git@github.com:Quirkbot/QuirkbotCompilerStack.git compiler
cd compiler
npm install
cd ..

# download api
git clone git@bitbucket.org:murilopolese/quirkbot-api.git api
cd api
npm install
cd ..

# download CODE;
git clone git@github.com:Quirkbot/QuirkbotCODE.git code
cd code
npm install
cd src/assets
bower install
cd ../..
npm run gulp -- build:polymer
cd ..
mv code/dist_polymer ./

# download extension
wget https://s3.amazonaws.com/quirkbot-downloads-production/downloads/quirkbot-chrome-app-latest.zip
unzip quirkbot-chrome-app-0.2.0.zip -d extension
rm https://s3.amazonaws.com/quirkbot-downloads-production/downloads/quirkbot-chrome-app-latest.zip
# patch extension

# build app
