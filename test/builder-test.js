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

    var filenames = builder.ls();

    dbg.enabled && dbg(JSON.stringify(filenames, null, 2));

    assert.deepEqual(filenames, [
      "config",
      "config/sandbox.js",
      "lib",
      "lib/example.js",
      "README.md",
      "server.js"
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

    var filenames = builder.ls();

    assert.deepEqual(filenames, [
      "config",
      "config/sandbox.js",
      "lib",
      "lib/example.js",
      "README.md",
      "server.js"
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

    var filename2 = builder.ls();

    false && console.log(JSON.stringify(filename2, null, 2));

    assert.deepEqual(filename2, [
      "config",
      "config/sandbox.js",
      "data",
      "data/accounts.js",
      "lib",
      "lib/example.js",
      "README.md",
      "server.js"
    ]);

    let text = shell.cat(path.join(builder.homedir, 'README.md'));
    assert.equal(text.stdout, '# example-project\n\nUpdated!!!');

    let basedir = builder.basedir;

    builder.destroy();
    assert.isFalse(shell.test('-d', basedir));
  });

  it('cleanup() removes all of files & directories but keep descriptors', function() {
    var dbg = debug('temporify:create-project');
    var builder = new Builder({
      subdir: 'example-project'
    });
    let basedir = builder.basedir;

    builder.add([{
      filename: 'server.js',
      content: `
        var devebot = require('devebot');
        module.exports = devebot.launchApplication({
          appRootPath: __dirname
        });
      `
    }, {
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
    }, {
      filename: 'README.md',
      content: `
      # example-project
      `
    }]);

    builder.generate();
    assert.deepEqual(builder.ls(), [
      "config",
      "config/sandbox.js",
      "lib",
      "lib/example.js",
      "README.md",
      "server.js"
    ]);

    builder.cleanup();
    assert.deepEqual(builder.ls(), []);
    assert.isTrue(shell.test('-d', basedir));
    assert.equal(builder.basedir, basedir);

    builder.generate();
    assert.deepEqual(builder.ls(), [
      "config",
      "config/sandbox.js",
      "lib",
      "lib/example.js",
      "README.md",
      "server.js"
    ]);
    assert.isTrue(shell.test('-d', basedir));
    assert.equal(builder.basedir, basedir);

    builder.destroy();
    assert.isFalse(shell.test('-d', basedir));
  });
});
