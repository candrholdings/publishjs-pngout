!function (async, ChildProcess, fs, os, path, pngout, util) {
    'use strict';

    var number = util.number,
        time = util.time;

    module.exports = function (inputs, outputs, callback) {
        var that = this;

        inputs.deleted.forEach(function (filename) {
            // If the deleted file is not a PNG, we still need to remove it from output
            outputs[filename] = null;
        });

        inputs = inputs.newOrChanged;

        async.forEachOf(inputs, function (buffer, filename, callback) {
            if ((path.extname(filename) || '').toLowerCase() !== '.png') {
                outputs[filename] = buffer;

                return callback();
            }
            var startTime = Date.now(),
                original = inputs[filename];

            saveToTemp(original, function (err, inputFilename) {
                if (err) { return callback(err); }

                var outputFilename = getTempFilename();

                execFile(pngout.path, ['-force', inputFilename, outputFilename], {}, function (err, result) {
                    fs.unlink(inputFilename);

                    if (err) {
                        that.log('Failed to crush ' + filename + '\n' + result.stdout + '\n' + result.stderr);

                        return callback(err);
                    }

                    fs.readFile(outputFilename, function (err, crushed) {
                        if (err) {
                            that.log('Failed to read crushed file ' + filename + '\n' + err);

                            return callback(err);
                        }

                        outputs[filename] = crushed;

                        that.log([
                            'Crushed ',
                            filename,
                            ', took ',
                            time.humanize(Date.now() - startTime),
                            ' (',
                            number.bytes(original.length),
                            ' -> ',
                            number.bytes(crushed.length),
                            ', ',
                            (((crushed.length / original.length) - 1) * 100).toFixed(1),
                            '%)'
                        ].join(''));

                        callback();
                    });
                });
            });
        }, function (err) {
            callback(err, err ? null : outputs);
        });
    };

    function execFile(filename, args, options, callback) {
        var watchdog;

        if (typeof options.timeout === 'number') {
            watchdog = setTimeout(function () {
                callback && callback(new Error('timeout'));
                callback = 0;
            }, options.timeout);
        }

        ChildProcess.execFile(filename, args, options, function (err, stdout, stderr) {
            watchdog && clearTimeout(watchdog);
            callback && callback(err, err ? null : { stdout: stdout, stderr: stderr });
            callback = 0;
        });
    }

    function getTempFilename() {
        return path.resolve(os.tmpdir(), 'publishjs-pngout.' + Date.now() + (Math.random() + '').substr(1) + '.png');
    }

    function saveToTemp(buffer, callback) {
        var filename = getTempFilename();

        fs.writeFile(filename, buffer, function (err) {
            callback(err, err ? null : filename);
        });
    }
}(
    require('async'),
    require('child_process'),
    require('fs'),
    require('os'),
    require('path'),
    require('pngout-bin'),
    require('publishjs').util
);