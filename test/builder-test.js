'use strict';

var assert = require('chai').assert;
var debug = require('debug');
var fs = require('fs');
var path = require('path');
var shell = require('shelljs');
var Builder = require('../lib/builder');

describe('Builder', function() {

  it('generate a new project and destroy it successfully', function() {
    var dbg = debug('temporify:create-project');
    var builder = new Builder({
      subdir: 'example-project'
    });

    assert.isDefined(builder.basedir);
    dbg.enabled && dbg('Basedir: %s', builder.basedir);
    dbg.enabled && dbg('Homedir: %s', builder.homedir);

    builder.add({
      filename: 'server.js',
      content: `
        var devebot = require('devebot');
        module.exports = devebot.launchApplication({
          appRootPath: __dirname
        });
      `
    });

    builder.add([{
      dir: 'lib/',
      filename: 'example.js',
      content: `
        function Example(params = {}) {
          var L = params.loggingFactory.getLogger();
          var T = params.loggingFactory.getTracer();
        }
        module.exports = Example;
      `
    }, {
      dir: 'config/',
      filename: 'sandbox.js',
      content: `
        module.exports = {
          application: {
            host: "0.0.0.0"
          }
        };
      `
    }]);

    builder.add({
      filename: 'README.md',
      content: `
      # example-project
      `
    });

    builder.generate();

    var filenames = [];
    shell.ls('-R', path.join(builder.basedir)).forEach(function(file) {
      filenames.push(file);
    });

    dbg.enabled && dbg(JSON.stringify(filenames, null, 2));

    assert.deepEqual(filenames, [
      "example-project",
      "example-project/config",
      "example-project/config/sandbox.js",
      "example-project/lib",
      "example-project/lib/example.js",
      "example-project/README.md",
      "example-project/server.js"
    ]);

    let text = shell.cat(path.join(builder.homedir, 'README.md'));
    assert.equal(text.stdout, '# example-project\n');

    let basedir = builder.basedir;

    builder.destroy();

    assert.isFalse(shell.test('-d', basedir));
  });

  it('directories and files are generated only one time', function() {
    var dbg = debug('temporify:create-project');
    var builder = new Builder({
      subdir: 'example-project'
    });

    builder.add({
      filename: 'server.js',
      content: `
        var devebot = require('devebot');
        module.exports = devebot.launchApplication({
          appRootPath: __dirname
        });
      `
    });

    builder.add([{
      dir: 'lib/',
      filename: 'example.js',
      content: `
        function Example(params = {}) {
          var L = params.loggingFactory.getLogger();
          var T = params.loggingFactory.getTracer();
        }
        module.exports = Example;
      `
    }, {
      dir: 'config/',
      filename: 'sandbox.js',
      content: `
        module.exports = {
          application: {
            host: "0.0.0.0"
          }
        };
      `
    }]);

    builder.add({
      filename: 'README.md',
      content: `
      # example-project
      `
    });

    builder.generate();

    var filenames = [];
    shell.ls('-R', path.join(builder.basedir)).forEach(function(file) {
      filenames.push(file);
    });

    assert.deepEqual(filenames, [
      "example-project",
      "example-project/config",
      "example-project/config/sandbox.js",
      "example-project/lib",
      "example-project/lib/example.js",
      "example-project/README.md",
      "example-project/server.js"
    ]);

    // Add more files
    builder.add({
      dir: 'data/',
      filename: 'accounts.js',
      content: `
        [
          {
            "username": "user1",
            "password": "c2b8c087-1d15-4d1f-bd03-3ebea3006076"
          },
          {
            "username": "user2",
            "password": "9c5561e5-e6e9-4cc5-aeed-51ad377f24a0"
          }
        ]
      `
    });

    // change README.md content
    fs.writeFileSync(path.join(builder.homedir, 'README.md'),
        '# example-project\n\nUpdated!!!');

    builder.generate();

    var filename2 = [];
    shell.ls('-R', path.join(builder.basedir)).forEach(function(file) {
      filename2.push(file);
    });

    false && console.log(JSON.stringify(filename2, null, 2));

    assert.deepEqual(filename2, [
      "example-project",
      "example-project/config",
      "example-project/config/sandbox.js",
      "example-project/data",
      "example-project/data/accounts.js",
      "example-project/lib",
      "example-project/lib/example.js",
      "example-project/README.md",
      "example-project/server.js"
    ]);

    let text = shell.cat(path.join(builder.homedir, 'README.md'));
    assert.equal(text.stdout, '# example-project\n\nUpdated!!!');

    let basedir = builder.basedir;

    builder.destroy();

    assert.isFalse(shell.test('-d', basedir));
  });
});
