# Temporify - generate temporary directories & files

`Temporify` is a temporary directories & files generator which is used to
build a temporary project in automation test.

## Installation

Via npm:

```shell
$ npm install --save-dev temporify
```

## Usage

### Constructor

#### `new Temporify(args)`

`args` can be:

* `args.subdir` - a relative path for sub directory that contains generated files.
* `args.variables` - a map of key/value that provides default model for template compiling.

Example:

```javascript
var Temporify = require('temporify');

var temporify = new Temporify({
  subdir: 'example-project',
  variables: {
    version: '1.0.3'
  }
});
```

### Methods

#### `temporify.assign(args)`

Method `assign` is used to declare a directory or a file that will be generated. 

`args` can be a descriptor which is an object describes a directory/file or an array of descriptors. A `descriptor` composes of following fields:

* `dir` - a path of the directory/file.
* `filename` - a string that provides the name of file.
* `mode` - a number that provides the mode of file.
* `template` - an `ejs` template that used to compile to file content.
* `variables` - a collection of template variables.

This method returns the `temporify` object itself.

#### `temporify.generate()`

Method `generate()` is used to generate directories/files which have been declared before. It has no arguments and returns the `temporify` object itself.

#### `temporify.exec(command, opts)`

Method `exec()` creates a new `child_process` and executes the provided `command`. `opts` can be:

* `opts.cwd` - the current working directory (default is value of `temporify.homedir`).
* `opts.env` - a list of environment variables in key/value format.
* `opts.shell` - path to the shell (default is `/bin/sh`).

This method returns the `child_process` result object in format (code, stdout, stderr).

#### `temporify.stats()`

Method `stats()` collects temporary directory information and compares with declared descriptors. It returns the a JSON array that contains the statistics.

#### `temporify.cleanup()`

Method `cleanup()` deletes all of content (sub directories and files) of main temporary directory. It takes no arguments and returns the `temporify` object itself.

#### `temporify.destroy()`

Method `destroy()` deletes the temporary directory completely. It has no arguments and returns nothing.

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

## License

  [MIT](LICENSE)

