# Temporify - generate temporary directories & files

`Temporify` is a temporary directories & files generator which is used to
build a temporary project for automation test.

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

// ... do something with the [example-project] ...
// ... display directory structure, for example ...
var filenames = [];

var shell = require('shelljs');
shell.ls('-R', path.join(builder.basedir)).forEach(function(file) {
  filenames.push(file);
});
console.log(JSON.stringify(filenames, null, 2));
// [
//   "example-project",
//   "example-project/config",
//   "example-project/config/sandbox.js",
//   "example-project/lib",
//   "example-project/lib/example.js",
//   "example-project/README.md",
//   "example-project/server.js"
// ]

// clean-up
builder.destroy();
```
