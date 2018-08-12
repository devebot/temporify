# Temporify - generate temporary directories & files

`Temporify` is a temporary directories & files generator which is used to
build a temporary project in automation test.

## Installing

Via npm:

```shell
$ npm install --save-dev temporify
```

## Examples

```javascript
var Temporify = require('temporify');

var builder = new Temporify({
  subdir: 'example-project'
});

console.log('Root directory: %s', builder.basedir);
// Root directory: /tmp/tmp-29557R96Xic2Typ4t
console.log('Home directory: %s', builder.homedir);
// Root directory: /tmp/tmp-29557R96Xic2Typ4t/example-project

builder.assign({
  filename: 'server.js',
  template: `
    var devebot = require('devebot');
    module.exports = devebot.launchApplication({
      appRootPath: __dirname
    });
  `
});

builder.assign([{
  dir: 'lib/',
  filename: 'example.js',
  template: `
    function Example(params = {}) {
      var L = params.loggingFactory.getLogger();
      var T = params.loggingFactory.getTracer();
    }
    module.exports = Example;
  `
}, {
  dir: 'config/',
  filename: 'sandbox.js',
  template: `
    module.exports = {
      application: {
        host: "0.0.0.0"
      }
    };
  `
}]);

builder.assign({
  filename: 'README.md',
  template: `
  # example-project
  `
});

// generate temporary directory structure
builder.generate();

// ... do something with the [example-project] ...
// ... display directory structure, for example ...
console.log(JSON.stringify(builder.ls(), null, 2));
// [
//   "config",
//   "config/sandbox.js",
//   "lib",
//   "lib/example.js",
//   "README.md",
//   "server.js"
// ]

// clean-up
builder.destroy();
```
