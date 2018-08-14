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

  const skipCompareDir = params.skipCompareDir === true;
  const throwIfError = params.throwIfError !== false;
  const subdir = lodash.isString(params.subdir) ? params.subdir : '';
  const variables = lodash.isObject(params.variables) ? lodash.cloneDeep(params.variables) : {};

  let container = null;
  let descriptors = {};

  function getContainer() {
    return container = container || tmp.dirSync();
  }

  function register(entrypoint) {
    if (isValid(entrypoint, throwIfError)) {
      let {dir, filename, template, variables, mode} = entrypoint;
      dir = dir || '.';
      let fullpath = path.join('.', dir, '/');
      if (filename) {
        if (lodash.isString(template)) {
          template = misc.removeFirstLineBreak(deindent(template));
        }
        let filepath = path.join(fullpath, filename);
        if (lodash.isObject(descriptors[filepath])) {
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
      if (!skipCompareDir) {
        // extract ancestor directories
        let dirLevels = fullpath.split(path.sep);
        let parentDir = '.';
        for(let idx in dirLevels) {
          if (dirLevels[idx] !== '.' && dirLevels[idx] !== '') {
            parentDir = path.join(parentDir, dirLevels[idx], '/');
            descriptors[parentDir] = descriptors[parentDir] || {
              deployed: false,
              type: 'dir',
              dir: parentDir
            };
          }
        }
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
    if (lodash.isArray(args)) {
      args.forEach(register);
    } else
    if (lodash.isObject(args)) {
      register(args);
    }
    return this;
  }

  this.generate = function() {
    let self = this;
    for(let idx in descriptors) {
      let descriptor = descriptors[idx];
      if (!descriptor.deployed) {
        shell.mkdir('-p', path.join(self.homedir, descriptor.dir));
        if (descriptor.filename) {
          let body = descriptor.template;
          let model = lodash.merge({}, variables, descriptor.variables);
          if (!lodash.isEmpty(model)) {
            body = ejs.render(body, model, {});
          }
          descriptor.checksum = misc.generateChecksum(body);
          descriptor.size = body.length;
          fs.writeFileSync(path.join(self.homedir, descriptor.filename), body, {
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
        let filepath = file.name;
        let fileinfo = { scope: 1, realobject: { type: type } };
        if (type === 'file') {
          fileinfo.realobject.dir = path.join(path.dirname(filepath), '/');
          fileinfo.realobject.filename = filepath;
          fileinfo.realobject.size = file.size;
          fileinfo.realobject.checksum = misc.getChecksumOfFile(fullpath);
        }
        if (type === 'dir') {
          filepath = path.join(filepath, '/');
          fileinfo.realobject.dir = filepath;
        }
        filemap[filepath] = fileinfo;
      });
    }
    // loop descriptors for comparison
    lodash.forOwn(descriptors, function(descriptor, filepath) {
      if (filemap[filepath]) {
        filemap[filepath].scope = 0;
      } else { // new files
        filemap[filepath] = {};
        filemap[filepath].scope = -1;
      }
      filemap[filepath] = filemap[filepath] || {};
      filemap[filepath].descriptor = lodash.omit(descriptor, [
        'template',
        'variables'
      ]);
    });
    // check if the temporary directories/files have been changed
    let changed = false;
    for(let filepath in filemap) {
      let info = filemap[filepath];
      if (info.realobject && info.realobject.type === 'dir' &&
          info.descriptor && info.descriptor.type === 'dir') continue;
      if (skipCompareDir) {
        if (info.realobject && info.realobject.type === 'dir' && !info.descriptor) continue;
        if (info.descriptor && info.descriptor.type === 'dir' && !info.realobject) continue;
      }
      if (info.realobject && info.realobject.type === 'file' &&
          info.descriptor && info.descriptor.type === 'file' &&
          info.realobject.size === info.descriptor.size &&
          info.realobject.checksum === info.descriptor.checksum) continue;
      changed = true;
      break;
    }
    return {
      changed: changed,
      details: lodash.values(filemap)
    };
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

function isValid(entrypoint, throwIfError) {
  function falseOrError(msg) {
    if (throwIfError) throw new Error(msg);
    return false;
  }
  let {dir, filename, template, variables, mode} = entrypoint;
  if (dir == null && filename == null) {
    return falseOrError('Both [dir] and [filename] parameters must not be null');
  }
  if (dir != null && !lodash.isString(dir)) {
    return falseOrError('[dir] must be a string');
  }
  if (filename != null && !lodash.isString(filename)) {
    return falseOrError('[filename] must be a string');
  }
  if (filename == null && (template != null || variables != null || mode != null)) {
    return falseOrError('[dir] declaration does not need template, variables or mode');
  }
  return true;
}

function isSafeDir(dir) {
  return lodash.isString(dir) && dir.match(/^\/tmp\/.*/g);
}

module.exports = Builder;
