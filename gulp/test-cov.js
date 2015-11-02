/* (c) 2015 EMIW, LLC. emiw.xyz/license */
const gulp = require('gulp');
const _ = require('lodash');
const { remap, loadCoverage, writeReport } = require('remap-istanbul');
const { spawn } = require('child_process');
const { resolve, basename } = require('path');
const config = require('./lib/config');
const test = require('./test');

const node_modules = resolve(config.basePath, 'node_modules', '.bin'); // eslint-disable-line
const istanbul = resolve(node_modules, 'istanbul');
const _mocha = resolve(node_modules, '_mocha');

const changeMochaOptions = () => {
  const originalMochaConfig = _.cloneDeep(config.mocha);
  config.mocha.pathToMocha = istanbul;
  config.mocha.args.unshift('cover', '--root', config.dest, '-x', basename(config.tests.all), _mocha, '--');

  console.log(config.mocha);
  return () => config.mocha = originalMochaConfig;
};

const coverageDir = resolve(config.basePath, 'coverage');
const remapCoverage = () => {
  // The following is really, really dumb. What happened is istanbul doesn't support source maps,
  // which we need. So, some people created remap-istanbul to fix that. Trouble is, remap-istanbul
  // doesn't expose the options we need (basePath) via the wrapper they provide. So really, we
  // shouldn't have to do any of it. Since source-maps are hard, not having them off the bat is OK,
  // but still, we should only have to do this:
  //     return remapIstanbul(resolve(coverageDir, 'coverage.json'), {
  //       json: resolve(coverageDir, 'coverage-final.json'),
  //       html: resolve(coverageDir, 'html'),
  //       lcovonly: resolve(coverageDir, 'lcov.info'),
  //     });
  // But we can't. Go Figure.

  // This is actual config. This is fine.
  const reports = {
    json: resolve(coverageDir, 'coverage-final.json'),
    html: resolve(coverageDir, 'html'),
    lcovonly: resolve(coverageDir, 'lcov.info'),
  };

  // You have been warned:
  const collector = remap(loadCoverage(resolve(coverageDir, 'coverage.json')), {
    basePath: '/',
  });
  const p = Object.keys(reports).map(type => writeReport(collector, type, reports[type]));
  return Promise.all(p);
};

const checkCoverage = () => {
  return new Promise((good, bad) => {
    const istanbulArgs = _.flatten(Object.keys(config.codeCoverage.thresholds).map((key) => {
      return [`--${key}`, config.codeCoverage.thresholds[key]];
    }));

    spawn(istanbul, ['check-coverage', ...istanbulArgs], { cwd: config.basePath, stdio: 'inherit' })
      .on('close', code => code === 0 ? good() : bad('Code Coverage Failed'))
      .on('error', bad);
  });
};


const testCov = (type) => {
  const revertMochaOptions = changeMochaOptions();
  return test(type)
    .finally(revertMochaOptions)
    .then(remapCoverage)
    .then(checkCoverage);
};

const defineTestCovTask = (name, type) => gulp.task(name, () => testCov(type));

config.tests.types.map(type => defineTestCovTask(`test:${type}:cov`, type));
defineTestCovTask('test:cov', 'all');

module.exports = testCov;
