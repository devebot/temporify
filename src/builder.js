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
  let container = null;
  let descriptors = [];

  function getContainer() {
    return container = container || tmp.dirSync();
  }

  function register(entrypoint) {
    if (isValid(entrypoint)) {
      let {dir, filename, content, mode} = entrypoint;
      dir = dir || '.';
      let fullpath = path.join(getContainer().name, subdir, dir);
      if (filename) {
        descriptors.push({
          deployed: false,
          dir: fullpath,
          filename: path.join(fullpath, filename),
          mode: mode,
          content: denewline(deindent(content || ''))
        });
      } else {
        descriptors.push({
          deployed: false,
          dir: fullpath
        });
      }
    }
  }

  function cleanup() {
    let basedir = getContainer().name;
    if (isSafeDir(basedir)) {
      shell.ls(basedir).forEach(function(file) {
        shell.rm('-rf', path.join(basedir, file));
      });
    }
    for(let idx in descriptors) {
      let descriptor = descriptors[idx];
      descriptor.deployed = false;
    }
  }

  Object.defineProperty(this, 'basedir', {
    value: getContainer().name
  });

  Object.defineProperty(this, 'homedir', {
    value: path.join(getContainer().name, subdir)
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
      if (!descriptor.deployed) {
        shell.mkdir('-p', descriptor.dir);
        if (descriptor.filename) {
          fs.writeFileSync(descriptor.filename, descriptor.content, {
            mode: descriptor.mode
          });
        }
        descriptor.deployed = true;
      }
    }
  }

  this.cleanup = function() {
    cleanup();
    return this;
  }

  this.destroy = function() {
    if (!process.env.TEMPORIFY_SKIP_CLEANUP) {
      if (false) {
        // BE CAREFULLY !!!
        getContainer().removeCallback({ unsafeCleanup: true });
        return;
      }
      cleanup();
      getContainer().removeCallback();
    }
  }
}

function isValid(entrypoint) {
  let {dir, filename, content, mode} = entrypoint;
  if (dir == null && filename == null) return false;
  if (filename == null && content != null) return false;
  return true;
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
