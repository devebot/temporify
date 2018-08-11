'use strict';

const fs = require('fs');
const path = require('path');
const deindent = require('deindent');
const ejs = require('ejs');
const shell = require('shelljs');
const tmp = require('tmp');
const lodash = require('lodash');
const misc = require('./misc');

if (!misc.isCleanupSkipped()) {
  tmp.setGracefulCleanup();
}

function Builder(params = {}) {

  let subdir = misc.isString(params.subdir) ? params.subdir : '';
  let variables = misc.isObject(params.variables) ? lodash.cloneDeep(params.variables) : {};
  let container = null;
  let descriptors = {};

  function getContainer() {
    return container = container || tmp.dirSync();
  }

  function register(entrypoint) {
    if (isValid(entrypoint)) {
      let {dir, filename, content, model, mode} = entrypoint;
      dir = dir || '.';
      let fullpath = path.join(getContainer().name, subdir, dir);
      if (filename) {
        if (misc.isString(content)) {
          content = misc.removeFirstLineBreak(deindent(content));
        }
        let filepath = path.join(fullpath, filename);
        if (misc.isObject(descriptors[filepath])) {
          let descriptor = descriptors[filepath];
          let updated = (mode != null && mode != descriptor.mode) ||
              (content != null && content != descriptor.content) ||
              (model != null && !lodash.isEqual(model, descriptor.model));
          if (updated) {
            descriptor.deployed = false;
          }
          descriptor.dir = fullpath;
          descriptor.filename = filepath;
          descriptor.mode = mode || descriptor.mode;
          descriptor.content = content || descriptor.content || '';
          descriptor.model = model || descriptor.model;
        } else {
          descriptors[filepath] = {
            deployed: false,
            dir: fullpath,
            filename: filepath,
            mode: mode,
            content: content,
            model: model
          };
        }
      } else {
        descriptors[fullpath] = descriptors[fullpath] || {
          deployed: false,
          dir: fullpath
        };
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
          let body = descriptor.content;
          let model = lodash.merge({}, variables, descriptor.model);
          if (!lodash.isEmpty(model)) {
            body = ejs.render(body, model, {});
          }
          descriptor.checksum = misc.generateChecksum(body);
          fs.writeFileSync(descriptor.filename, body, {
            mode: descriptor.mode
          });
        }
        descriptor.deployed = true;
      }
    }
    return this;
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
      if (misc.isUnsafeCleanup()) { // BE CAREFULLY !!!
        getContainer().removeCallback({ unsafeCleanup: true });
      } else {
        cleanup();
        getContainer().removeCallback();
      }
      container = null;
      for(let idx in descriptors) {
        delete descriptors[idx];
      }
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
