!function (assert, async, linq, path) {
    'use strict';

    require('vows').describe('Integration test').addBatch({
        'When minifying a CSS file': {
            topic: function () {
                var callback = this.callback,
                    topic;

                async.parallel({
                    input: function (callback) {
                        require('publishjs')({
                            cache: false,
                            log: false,
                            processors: {
                                cssmin: require('../index')
                            }
                        }).build(function (pipe, callback) {
                            pipe.from(path.resolve(path.dirname(module.filename), 'integration-test-files/input'))
                                .cssmin()
                                .run(callback);
                        }, callback);
                    },
                    baseline: function (callback) {
                        require('publishjs')({
                            cache: false,
                            log: false
                        }).build(function (pipe, callback) {
                            pipe.from(path.resolve(path.dirname(module.filename), 'integration-test-files/baseline'))
                                .run(callback);
                        }, callback);
                    }
                }, callback);
            },

            'should returns a minified copy': function (topic) {
                var input = linq(topic.input.all).select(function (buffer) {
                        return buffer.toString('base64');
                    }).run(),
                    baseline = linq(topic.baseline.all).select(function (buffer) {
                        return buffer.toString('base64');
                    }).run();

                assert.deepEqual(input, baseline);
            }
        }
    }).export(module);
}(
    require('assert'),
    require('async'),
    require('async-linq'),
    require('path')
);