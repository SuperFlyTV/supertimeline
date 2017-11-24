var exports = module.exports = {};

exports.enums = {

	TriggerType: {
		TIME_ABSOLUTE: 0,	// The object is placed on an absolute time on the timeline
		TIME_RELATIVE: 1,	// The object is defined by an expression defining the time relative to other objects
			
		// To be implemented (and might never be)
		//EVENT: 2,			// the object is not on the timeline, but can be triggered typically from an external source

		LOGICAL: 3 			// the object is defined by a logical expression, if resolved to true, then object is present on current time.

	},
	TimelineEventType: {
		START: 	0,
		END: 	1,
		KEYFRAME: 	2,
	},
	TraceLevel: {
		ERRORS: 0,
		INFO: 1,
		TRACE: 2,
	},
};


