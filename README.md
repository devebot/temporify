# Temporify - generate temporary files and directories

`Temporify` is a temporary directories & files generator, which is used to
build a temporary project for automation test.

## Installing

Via npm:

```shell
$ npm install --save temporify
```

## Examples

```javascript
var Temporify = require('temporify');

var builder = new Temporify({
  subdir: 'example-project'
});

console.log('Root directory: %s', builder.basedir);
console.log('Home directory: %s', builder.homedir);

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

// generate temporary directory structure
builder.generate();

// ... do anything with example-project ...

// clean-up
builder.destroy();
```

