'use strict';

const fs = require('fs');
const path = require('path');
const deindent = require('deindent');
const shell = require('shelljs');
const tmp = require('tmp');

if (!process.env.TEMPORIFY_SKIP_CLEANUP) {
  tmp.setGracefulCleanup();
}

function TemporifyBuilder(params = {}) {

  let subdir = isString(params.subdir) ? params.subdir : '';
  let container = tmp.dirSync();
  let descriptors = [];

  function register(entrypoint) {
    let {dir, filename, content, mode} = entrypoint;
    dir = dir || '.';
    if (isString(dir)) {
      let fullpath = path.join(container.name, subdir, dir);
      if (filename) {
        descriptors.push({
          dir: fullpath,
          filename: path.join(fullpath, filename),
          mode: mode,
          content: denewline(deindent(content || ''))
        });
      } else {
        descriptors.push({
          dir: fullpath
        });
      }
    }
  }

  Object.defineProperty(this, 'basedir', {
    value: container.name
  });

  Object.defineProperty(this, 'homedir', {
    value: path.join(container.name, subdir)
  });

  this.add = function(args = {}) {
    if (isObject(args)) {
      register(args);
    } else
    if (isArray(args)) {
      args.forEach(register);
    }
    return this;
  }

  this.generate = function() {
    for(let idx in descriptors) {
      let descriptor = descriptors[idx];
      shell.mkdir('-p', descriptor.dir);
      if (descriptor.filename) {
        fs.writeFileSync(descriptor.filename, descriptor.content, {
          mode: descriptor.mode
        });
      }
    }
  }

  this.destroy = function() {
    if (!process.env.TEMPORIFY_SKIP_CLEANUP) {
      // container.removeCallback({ unsafeCleanup: true });
      // BE CAREFULLY
      let basedir = container.name;
      if (isSafeDir(basedir)) {
        shell.ls(basedir).forEach(function(file) {
          shell.rm('-rf', path.join(basedir, file));
        });
      }
      container.removeCallback();
    }
  }
}

function isArray(val) {
  return Array.isArray(val);
}

function isObject(val) {
  return val && typeof val === 'object' && !isArray(val);
}

function isString(val) {
  return typeof val === 'string';
}

function isSafeDir(dir) {
  return isString(dir) && dir.match(/^\/tmp\/.*/g);
}

function denewline(str) {
  if (isString(str) && str[0] === '\n') {
    return str.slice(1);
  }
  return str;
}

module.exports = TemporifyBuilder;
