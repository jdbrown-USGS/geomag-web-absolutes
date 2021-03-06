'use strict';

var Format = require('geomag/Formatter'),
    Measurement = require('geomag/Measurement'),
    Util = require('util/Util'),
    Validate = require('geomag/Validate'),
    View = require('mvc/View');


var _DEFAULTS = {
};


var MEASUREMENT_TYPE_LABELS = {};

MEASUREMENT_TYPE_LABELS[Measurement.FIRST_MARK_UP] = 'Mark Up';
MEASUREMENT_TYPE_LABELS[Measurement.FIRST_MARK_DOWN] = 'Mark Down';

MEASUREMENT_TYPE_LABELS[Measurement.WEST_DOWN] = 'West Down';
MEASUREMENT_TYPE_LABELS[Measurement.EAST_DOWN] = 'East Down';
MEASUREMENT_TYPE_LABELS[Measurement.WEST_UP] = 'West Up';
MEASUREMENT_TYPE_LABELS[Measurement.EAST_UP] = 'East Up';

MEASUREMENT_TYPE_LABELS[Measurement.SECOND_MARK_UP] = 'Mark Up';
MEASUREMENT_TYPE_LABELS[Measurement.SECOND_MARK_DOWN] = 'Mark Down';

MEASUREMENT_TYPE_LABELS[Measurement.SOUTH_DOWN] = 'South Down';
MEASUREMENT_TYPE_LABELS[Measurement.NORTH_UP] = 'North Up';
MEASUREMENT_TYPE_LABELS[Measurement.SOUTH_UP] = 'South Up';
MEASUREMENT_TYPE_LABELS[Measurement.NORTH_DOWN] = 'North Down';


/**
 * Construct a new DeclinationSummaryView.
 *
 * @param options {Object}
 *        view options.
 * @param options.measurement {geomag.Measurement}
 * @param options.observation {geomag.Observation}
 */
var MeasurementView = function (options) {
    var _this,
      _initialize,

      _onAngleChange,
      _onTimeChange,
      _updateErrorState,
      _validateAngle,
      _validateRelativeTime,
      _validateTime;


  options = Util.extend({}, _DEFAULTS, options);
  _this = View(options);
  /**
   * Initialize view, and call render.
   * @param options {Object} same as constructor.
   */
  _initialize = function (options) {
    var el;

    el = _this.el;

    _this._measurement = options.measurement;
    _this._observation = options.observation;

    el.innerHTML = [
      '<th scope="row" class="measurement-type">',
        MEASUREMENT_TYPE_LABELS[_this._measurement.get('type')] || 'Type',
      '</th>',
      '<td class="measurement-time"><input type="text"/></td>',
      '<td class="measurement-degrees"><input type="text"/></td>',
      '<td class="measurement-minutes"><input type="text"/></td>',
      '<td class="measurement-seconds"><input type="text"/></td>',

      '<td class="measurement-h">&ndash;</td>',
      '<td class="measurement-e">&ndash;</td>',
      '<td class="measurement-z">&ndash;</td>',
      '<td class="measurement-f">&ndash;</td>'
    ].join('');

    // save references to elements that will be updated during render
    _this._timeInput = el.querySelector('.measurement-time > input');
    _this._degreesInput = el.querySelector('.measurement-degrees > input');
    _this._minutesInput = el.querySelector('.measurement-minutes > input');
    _this._secondsInput = el.querySelector('.measurement-seconds > input');

    _this._hValue = el.querySelector('.measurement-h');
    _this._eValue = el.querySelector('.measurement-e');
    _this._zValue = el.querySelector('.measurement-z');
    _this._fValue = el.querySelector('.measurement-f');

    _this._measurement.on('change', _this.render, _this);
    _this._timeInput.addEventListener('blur', _onTimeChange);
    _this._degreesInput.addEventListener('blur', _onAngleChange);
    _this._minutesInput.addEventListener('blur', _onAngleChange);
    _this._secondsInput.addEventListener('blur', _onAngleChange);

    _this.render();
  };

  _onAngleChange = function (evt) {
    var degrees,
        error,
        minutes,
        seconds;

    degrees = _this._degreesInput.value;
    minutes = _this._minutesInput.value;
    seconds = _this._secondsInput.value;
    error = null;

    if (evt.target === _this._minutesInput) {
      // When decimal minutes are entered, clear corresponding seconds value.
      if (minutes.indexOf('.') !== -1) {
        seconds = 0;
        // In case the angle doesn't change, keep inputs consistent.
        _this._secondsInput.value = 0;
      }
    }
    // validate angle change
    error = _validateAngle(degrees, minutes, seconds);

    if (error === null) {
      // no errors on measurement, set measurement values
      _this._measurement.set({
        'angle': Format.dmsToDecimal(degrees, minutes, seconds),
        'angle_error': null
      });
    } else {
      _this._measurement.set({
        'angle_error': 'Invalid Angle. Check Deg, Min, Sec values.'
      });
    }
  };

  _onTimeChange = function (/*evt*/) {
    var error,
        time;

    time = _this._timeInput.value;

    // validate relative time
    error = _validateRelativeTime(time);

    if (error === null) {
      // convert relative time to epoch time
      time = Format.parseRelativeTime(time,
          _this._observation.get('begin'));
      error = _validateTime(time);
    }

    if (error === null) {
      // absolute time is valid
      _this._measurement.set({
        'time': time,
        'time_error': null
      });
    } else {
      _this._measurement.set({
        'time_error': error
      });
    }
  };

  _updateErrorState = function (el, valid, helpText) {
    if (valid){
      // passes validation
      el.classList.remove('error');
      el.removeAttribute('title');
    } else {
      // does not pass validation
      el.className = 'error';
      el.title = helpText;
    }
  };

  _validateAngle = function (degrees, minutes, seconds) {
    var helpText,
        validDegrees,
        validMinutes,
        validSeconds;

    validDegrees = true;
    validMinutes = true;
    validSeconds = true;
    helpText = null;

    // DEGREES
    if (!Validate.validDegrees(degrees)) {
      validDegrees = false;
      helpText = 'Invalid Degrees. Must be between, 0-360.';
    }
    _updateErrorState(_this._degreesInput, validDegrees, helpText);

    // MINUTES
    if (!Validate.validMinutes(minutes)) {
      validMinutes = false;
      helpText = 'Invalid Minutes. Must be between, 0-60.';
    }
    _updateErrorState(_this._minutesInput, validMinutes, helpText);

    // SECONDS
    if (!Validate.validSeconds(seconds)) {
      validSeconds = false;
      helpText = 'Invalid Seconds. Must be between, 0-60.';
    }
    _updateErrorState(_this._secondsInput, validSeconds, helpText);

    return helpText;
  };

  /**
   * Validate a relative time.
   *
   * @param time {String}
   *     relative time.
   * @return {String}
   *     error message if there are validation problems.
   *     null if time is valid.
   */
  _validateRelativeTime = function (time) {
    var helpText,
        validTime;

    validTime = true;
    helpText = null;

    if (!Validate.validTime(time)) {
      validTime = false;
      helpText = 'Invalid Time. HH24:MI:SS';
    }
    _updateErrorState(_this._timeInput, validTime, helpText);

    return helpText;
  };

  /**
   * Validate an absolute time.
   *
   * @param time {Number}
   *     epoch timestamp.
   * @return {String}
   *     error message if there are validation problems.
   *     null if time is valid.
   */
  _validateTime = function (time) {
    var error,
        now,
        validTime;

    error = null;
    now = new Date();
    validTime = true;

    // check to see if the time is in the future
    if (time > now) {
      error = 'Time is in the future.  Check your dates.';
      validTime = false;
    }
    _updateErrorState(_this._timeInput, validTime, error);

    return error;
  };

  _this.destroy = Util.compose(
      // sub class destroy method
      function () {
        // Remove event listeners
        _this._timeInput.removeEventListener('blur', _onTimeChange);
        _this._degreesInput.removeEventListener('blur', _onAngleChange);
        _this._minutesInput.removeEventListener('blur', _onAngleChange);
        _this._secondsInput.removeEventListener('blur', _onAngleChange);

        // Clean up private methods
        _onAngleChange = null;
        _onTimeChange = null;
        _updateErrorState = null;
        _validateAngle = null;
        _validateTime = null;

        // Clean up private variables
        _this = null;
      },
      // parent class destroy method
      _this.destroy);

  _this.render = function () {
    var angle,
        angle_error,
        dms,
        e,
        f,
        h,
        measurement,
        time,
        time_error,
        timeString,
        z;

    measurement = _this._measurement;
    time = measurement.get('time');
    time_error = measurement.get('time_error');
    angle = measurement.get('angle');
    angle_error = measurement.get('angle_error');
    timeString = null;
    dms = null;
    h = measurement.get('h');
    e = measurement.get('e');
    z = measurement.get('z');
    f = measurement.get('f');

    if (time_error === null) {
      if (time === null) {
        timeString = '';
      } else {
        timeString = Format.time(time);
      }
      _this._timeInput.value = timeString;
    }

    if (angle_error === null) {
      if (angle === null) {
        dms = ['', '', ''];
      } else {
        dms = Format.decimalToDms(angle);
      }
      _this._degreesInput.value = dms[0];
      _this._minutesInput.value = dms[1];
      _this._secondsInput.value = dms[2];
    }

    _this._hValue.innerHTML = (h === null ? '&ndash;' : Format.nanoteslas(h));
    _this._eValue.innerHTML = (e === null ? '&ndash;' : Format.nanoteslas(e));
    _this._zValue.innerHTML = (z === null ? '&ndash;' : Format.nanoteslas(z));
    _this._fValue.innerHTML = (f === null ? '&ndash;' : Format.nanoteslas(f));
  };


  _initialize(options);
  options = null;
  return _this;
};

module.exports = MeasurementView;
