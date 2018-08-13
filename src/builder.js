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
      let {dir, filename, template, variables, mode} = entrypoint;
      dir = dir || '.';
      let fullpath = path.join(getContainer().name, subdir, dir);
      if (filename) {
        if (misc.isString(template)) {
          template = misc.removeFirstLineBreak(deindent(template));
        }
        let filepath = path.join(fullpath, filename);
        if (misc.isObject(descriptors[filepath])) {
          let descriptor = descriptors[filepath];
          let changed = (mode != null && mode != descriptor.mode) ||
              (template != null && template != descriptor.template) ||
              (variables != null && !lodash.isEqual(variables, descriptor.variables));
          if (changed) {
            descriptor.deployed = false;
          }
          descriptor.type = 'file';
          descriptor.dir = fullpath;
          descriptor.filename = filepath;
          descriptor.mode = mode || descriptor.mode;
          descriptor.template = template || descriptor.template || '';
          descriptor.variables = variables || descriptor.variables;
        } else {
          descriptors[filepath] = {
            deployed: false,
            type: 'file',
            dir: fullpath,
            filename: filepath,
            mode: mode,
            template: template,
            variables: variables
          };
        }
      } else {
        descriptors[fullpath] = descriptors[fullpath] || {
          deployed: false,
          type: 'dir',
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

  this.assign = function(args = {}) {
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
          let body = descriptor.template;
          let model = lodash.merge({}, variables, descriptor.variables);
          if (!lodash.isEmpty(model)) {
            body = ejs.render(body, model, {});
          }
          descriptor.checksum = misc.generateChecksum(body);
          descriptor.size = body.length;
          fs.writeFileSync(descriptor.filename, body, {
            mode: descriptor.mode
          });
        }
        descriptor.deployed = true;
      }
    }
    return this;
  }

  this.exec = function (cmd, opts) {
    opts = lodash.defaults({
      cwd: this.homedir,
      silent: true,
    }, lodash.pick(opts, ['cwd', 'env', 'shell']));
    let info = shell.exec(cmd, opts);
    // let {code, stdout, stderr} = info;
    return info;
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

  this.stats = function () {
    // load files from homedir
    let filemap = {};
    let homedir = this.homedir;
    if (shell.test('-d', homedir)) {
      shell.ls('-lR', homedir).forEach(function(file) {
        let fullpath = path.join(homedir, file.name);
        let type = null;
        if (!type && shell.test('-f', fullpath)) {
          type = 'file';
        }
        if (!type && shell.test('-d', fullpath)) {
          type = 'dir';
        }
        if (!type) {
          type = 'unknown';
        }
        filemap[fullpath] = { scope: 1, realobject: { type: type } };
        if (type === 'file') {
          filemap[fullpath].realobject.dir = path.dirname(fullpath);
          filemap[fullpath].realobject.filename = fullpath;
          filemap[fullpath].realobject.size = file.size;
          filemap[fullpath].realobject.checksum = misc.getChecksumOfFile(fullpath);
        }
        if (type === 'dir') {
          filemap[fullpath].realobject.dir = fullpath;
        }
      });
    }
    // loop descriptors for comparison
    lodash.forOwn(descriptors, function(descriptor, fullpath) {
      if (filemap[fullpath]) { // new files
        filemap[fullpath].scope = 0;
      } else {
        filemap[fullpath] = {};
        filemap[fullpath].scope = -1;
      }
      filemap[fullpath] = filemap[fullpath] || {};
      filemap[fullpath].descriptor = lodash.omit(descriptor, [
        'template',
        'variables'
      ]);
    });
    return lodash.values(filemap);
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

  return this;
}

function isValid(entrypoint) {
  let {dir, filename, template, mode} = entrypoint;
  if (dir == null && filename == null) return false;
  if (filename == null && template != null) return false;
  return true;
}

function isSafeDir(dir) {
  return misc.isString(dir) && dir.match(/^\/tmp\/.*/g);
}

module.exports = Builder;
