'use strict';

var path = require('path');
var Temporify = require('../index');

var flow = Promise.resolve();

flow = flow.then(function() {
  var builder = new Temporify({
    subdir: 'example-project',
    variables: {
      testHomeDir: path.join(__dirname, '../index')
    }
  });

  builder.assign([{
    filename: 'index.js',
    template: `
    'use strict';
    
    var lab = require('<%- testHomeDir %>');
    
    var Devebot = lab.getDevebot();
    
    var app = Devebot.launchApplication({
      appRootPath: __dirname,
      <% if (privateProfile) { %>
      privateProfile: <%- privateProfile %>
      <% } %>
    });

    if (require.main === module) app.server.start();

    module.exports = app;
    `
  }, {
    dir: 'config/',
    filename: 'sandbox.js',
    template: `
      module.exports = {};
    `
  }, {
    filename: 'package.json',
    template: `
    {
      "name": "example-project",
      "version": "0.1.0",
      "description": "Testapp: invalid context",
      "main": "index.js",
      "scripts": {
        "test": "echo 'Error: no test specified' && exit 1"
      },
      "author": "devebot",
      "license": "ISC",
      "devDependencies": {
        "chai": "^4.1.2"
      }
    }
    `
  }]);

  var tempor = builder.assign({
    filename: 'index.js',
    variables: {
      privateProfile: JSON.stringify('123')
    }
  }).generate();

  console.log('Home: %s', tempor.homedir);
  console.log('Stats: %s', JSON.stringify(tempor.stats(), null, 2));

  // var app = require(tempor.homedir);
  // var subf = app.server.start();
  
  // subf = subf.delay(5000);
  
  // subf = subf.then(function() {
  //   return app.server.stop();
  // });

  // subf = subf.then(function() {
  //   builder.destroy();
  // });

  // return subf;
});
