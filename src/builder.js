'use strict';

const fs = require('fs');
const path = require('path');
const deindent = require('deindent');
const ejs = require('ejs');
const shell = require('shelljs');
const tmp = require('tmp');
const misc = require('./misc');

if (!misc.isCleanupSkipped()) {
  tmp.setGracefulCleanup();
}

function Builder(params = {}) {

  let subdir = misc.isString(params.subdir) ? params.subdir : '';
  let container = null;
  let descriptors = [];

  function getContainer() {
    return container = container || tmp.dirSync();
  }

  function register(entrypoint) {
    if (isValid(entrypoint)) {
      let {dir, filename, content, model, mode} = entrypoint;
      dir = dir || '.';
      let fullpath = path.join(getContainer().name, subdir, dir);
      if (filename) {
        content = misc.removeFirstLineBreak(deindent(content || ''));
        if (misc.isObject(model)) {
          content = ejs.render(content, model, {});
        }
        descriptors.push({
          deployed: false,
          dir: fullpath,
          filename: path.join(fullpath, filename),
          mode: mode,
          content: content,
          checksum: misc.generateChecksum(content)
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
    if (misc.isObject(args)) {
      register(args);
    } else
    if (misc.isArray(args)) {
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

  this.ls = function () {
    var filelist = [];
    if (shell.test('-d', this.homedir)) {
      shell.ls('-R', this.homedir).forEach(function(file) {
        filelist.push(file);
      });
    }
    return filelist;
  }

  this.cleanup = function() {
    cleanup();
    return this;
  }

  this.destroy = function() {
    if (!misc.isCleanupSkipped()) {
      if (false) {
        // BE CAREFULLY !!!
        getContainer().removeCallback({ unsafeCleanup: true });
        return;
      }
      cleanup();
      getContainer().removeCallback();
      container = null;
      descriptors.splice(0);
    }
  }
}

function isValid(entrypoint) {
  let {dir, filename, content, mode} = entrypoint;
  if (dir == null && filename == null) return false;
  if (filename == null && content != null) return false;
  return true;
}

function isSafeDir(dir) {
  return misc.isString(dir) && dir.match(/^\/tmp\/.*/g);
}

module.exports = Builder;
