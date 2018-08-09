'use strict';

var assert = require('chai').assert;
var debug = require('debug');
var path = require('path');
var shell = require('shelljs');
var Builder = require('../lib/builder');

describe('Builder', function() {

  it('create a project', function() {
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

    builder.add({
      dir: 'lib/',
      filename: 'example.js',
      content: `
        function Example(params = {}) {
          var L = params.loggingFactory.getLogger();
          var T = params.loggingFactory.getTracer();
        }
        module.exports = Example;
      `
    });

    builder.add({
      dir: 'config/',
      filename: 'sandbox.js',
      content: `
        module.exports = {
          application: {
            host: "0.0.0.0"
          }
        };
      `
    });

    builder.add({
      filename: 'README.md',
      content: `
      # example-project
      `
    });

    builder.build();

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

    builder.destroy();
  });
});
