"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var _ = require("underscore");
var enums_1 = require("../enums/enums");
// let clone = require('fast-clone')
var clone = function (o) { return o; };
var traceLevel = enums_1.TraceLevel.ERRORS; // 0
var Resolver = /** @class */ (function () {
    function Resolver() {
    }
    Resolver.setTraceLevel = function (levelName) {
        var lvl = enums_1.TraceLevel.ERRORS;
        if (_.isNumber(levelName))
            lvl = levelName;
        else if (levelName)
            lvl = enums_1.TraceLevel[levelName] || enums_1.TraceLevel.ERRORS;
        traceLevel = lvl;
    };
    Resolver.getTraceLevel = function () {
        return traceLevel;
    };
    /*
     * getState
     * time [optional] unix time, default: now
     * returns the current state
    */
    Resolver.getState = function (data, time, externalFunctions) {
        var tl = resolveTimeline(data, {});
        var tld = developTimelineAroundTime(tl, time);
        log('tld', 'TRACE');
        log(tld, 'TRACE');
        var state = resolveState(tld, time);
        evaluateKeyFrames(state, tld);
        if (evaluateFunctions(state, tld, externalFunctions)) {
            // do it all again:
            state = resolveState(tld, time);
            evaluateKeyFrames(state, tld);
        }
        return state;
    };
    /*
    * time [optional] unix time, default: now
    * count: number, how many events we want to return
    * returns an array of the next events
    */
    Resolver.getNextEvents = function (data, time, count) {
        if (!count)
            count = 10;
        var i;
        var obj;
        var tl = {
            resolved: [],
            unresolved: []
        };
        if (_.isArray(data)) {
            tl = resolveTimeline(data);
        }
        else if (_.isObject(data) && data.resolved) {
            tl = data;
        }
        var tld = developTimelineAroundTime(tl, time);
        // Create a 'pseudo LLayers' here, it's composed of objects that are and some that might be...
        var LLayers = {};
        _.each(tl.resolved, function (obj) {
            LLayers[obj.id] = obj;
        });
        _.each(tl.unresolved, function (obj) {
            if (obj.trigger.type === enums_1.TriggerType.LOGICAL) {
                // we'll just assume that the object might be there when the time comes...
                var obj2 = obj;
                LLayers[obj.id] = obj2;
            }
        });
        var keyframes = evaluateKeyFrames({
            LLayers: LLayers,
            GLayers: {},
            time: 0
        }, tld);
        log('getNextEvents', 'TRACE');
        var nextEvents = [];
        var usedObjIds = {};
        // let endCount = 0
        // let startCount = 0
        for (i = 0; i < tld.resolved.length; i++) {
            // if (count>0 && startCount >= count ) break
            obj = tld.resolved[i];
            if (obj.resolved.endTime >= time || // the object has not already finished
                obj.resolved.endTime === 0 // the object has no endTime
            ) {
                if (obj.resolved.startTime >= time) {
                    nextEvents.push({
                        type: enums_1.EventType.START,
                        time: obj.resolved.startTime,
                        obj: obj
                    });
                    // startCount++
                }
                if (obj.resolved.endTime) {
                    nextEvents.push({
                        type: enums_1.EventType.END,
                        time: obj.resolved.endTime,
                        obj: obj
                    });
                }
                // endCount++
                usedObjIds[obj.id] = obj;
            }
        }
        _.each(tl.unresolved, function (obj) {
            if (obj.trigger.type === enums_1.TriggerType.LOGICAL) {
                usedObjIds[obj.id] = obj;
            }
        });
        for (i = 0; i < keyframes.length; i++) {
            var keyFrame = keyframes[i];
            if (keyFrame &&
                keyFrame.parent &&
                keyFrame.resolved &&
                keyFrame.resolved.startTime) {
                if (keyFrame.resolved.startTime >= time) {
                    obj = usedObjIds[keyFrame.parent];
                    if (obj) {
                        nextEvents.push({
                            type: enums_1.EventType.KEYFRAME,
                            time: keyFrame.resolved.startTime,
                            obj: obj,
                            kf: keyFrame
                        });
                    }
                }
                if ((keyFrame.resolved.endTime || 0) >= time) {
                    obj = usedObjIds[keyFrame.parent];
                    if (obj) {
                        nextEvents.push({
                            type: enums_1.EventType.KEYFRAME,
                            time: (keyFrame.resolved.endTime || 0),
                            obj: obj,
                            kf: keyFrame
                        });
                    }
                }
            }
        }
        nextEvents.sort(function (a, b) {
            if (a.time > b.time)
                return 1;
            if (a.time < b.time)
                return -1;
            if (a.type > b.type)
                return -1;
            if (a.type < b.type)
                return 1;
            return 0;
        });
        /*nextEvents = _.sortBy(nextEvents,function (e) {
            return e.time
        })*/
        if (count > 0 && nextEvents.length > count)
            nextEvents.splice(count); // delete the rest
        return nextEvents;
    };
    /*
    * startTime: unix time
    * endTime: unix time
    * returns an array of the events that occurs inside a window
    */
    Resolver.getTimelineInWindow = function (data, startTime, endTime) {
        var tl = resolveTimeline(data, {
            startTime: startTime,
            endTime: endTime
        });
        log('tl', 'TRACE');
        log(tl, 'TRACE');
        return tl;
    };
    /*
    * startTime: unix time
    * endTime: unix time
    * returns an array of the objects that are relevant inside a window
    */
    Resolver.getObjectsInWindow = function (data, startTime, endTime) {
        var tl = resolveTimeline(data, {
            startTime: startTime,
            endTime: endTime
        });
        // log('tl','TRACE')
        // log(tl,'TRACE')
        var tld = developTimelineAroundTime(tl, startTime);
        // log('tld','TRACE')
        // log(tld,'TRACE')
        return tld;
    };
    // Other exposed functionality:
    /*
    * strOrExpr: a string, '1+5*3' or an expression object
    * returns a validated expression
    * {
    *    l: 1
    *    o: '+''
    *    r: {
    *          l: 5
    *          o: '*'
    *          r: 3
    *       }
    * }
    *
    *
    */
    Resolver.interpretExpression = function (strOrExpr, isLogical) {
        return interpretExpression(strOrExpr, isLogical);
    };
    Resolver.resolveExpression = function (strOrExpr, resolvedObjects, ctx) {
        return resolveExpression(strOrExpr, resolvedObjects, ctx);
    };
    Resolver.resolveLogicalExpression = function (expressionOrString, obj, returnExpl, currentState) {
        return resolveLogicalExpression(expressionOrString, obj, returnExpl, currentState);
    };
    Resolver.developTimelineAroundTime = function (tl, time) {
        return developTimelineAroundTime(tl, time);
    };
    Resolver.decipherLogicalValue = function (str, obj, currentState, returnExpl) {
        return decipherLogicalValue(str, obj, currentState, returnExpl);
    };
    return Resolver;
}());
exports.Resolver = Resolver;
/*
    Resolves the objects in the timeline, ie placing the objects at their absoulte positions

    filter: {
        startTime: Number,
        endTime: Number
    }

*/
function resolveTimeline(data, filter) {
    if (!filter)
        filter = {};
    if (!data)
        throw Error('resolveFullTimeline: parameter data missing!');
    // check: if data is infact a resolved timeline, then just return it:
    var unresolvedData;
    if (_.isObject(data) && data['resolved'] && data['unresolved']) {
        return data;
    }
    else {
        unresolvedData = data;
    }
    log('resolveTimeline', 'TRACE');
    // Start resolving the triggers, i.e. resolve them into absolute times on the timeline:
    var resolvedObjects = {};
    var unresolvedObjects = [];
    var objectIds = {};
    var checkArrayOfObjects = function (arrayOfObjects) {
        _.each(arrayOfObjects, function (obj) {
            if (obj) {
                if (!obj.id)
                    throw Error('resolveTimeline: an object is missing its id!');
                if (!obj.trigger)
                    throw Error('resolveTimeline: object "' + obj.id + '" missing "trigger" attribute!');
                if (!_.has(obj.trigger, 'type'))
                    throw Error('resolveTimeline: object "' + obj.id + '" missing "trigger.type" attribute!');
                if (objectIds[obj.id])
                    throw Error('resolveTimeline: id "' + obj.id + '" is not unique!');
                if (!_.has(obj, 'LLayer'))
                    throw Error('resolveTimeline: object "' + obj.id + '" missing "LLayers" attribute!');
                objectIds[obj.id] = true;
                if (obj.isGroup && obj.content && obj.content.objects) {
                    checkArrayOfObjects(obj.content.objects);
                }
            }
        });
    };
    checkArrayOfObjects(unresolvedData);
    unresolvedData = _.map(unresolvedData, function (objOrg) {
        var obj = _.clone(objOrg);
        if (obj) {
            obj.content = _.clone(obj.content || {});
            if (!_.has(obj.content, 'GLayer')) {
                obj.content.GLayer = obj.LLayer;
            }
            unresolvedObjects.push(obj);
            objectIds[obj.id] = true;
        }
        return obj;
    });
    log('======= resolveTimeline: Starting iterating... ==============', 'TRACE');
    var hasAddedAnyObjects = true;
    while (hasAddedAnyObjects) {
        hasAddedAnyObjects = false;
        log('======= Iterating objects...', 'TRACE');
        for (var i = 0; i < unresolvedObjects.length; i++) {
            var obj = _.extend(_.clone(unresolvedObjects[i]), {
                resolved: {}
            });
            if (obj) {
                log('--------------- object ' + obj.id, 'TRACE');
                // if (!obj.resolved) obj.resolved = {}
                if (obj.disabled)
                    obj.resolved.disabled = true;
                var triggerTime = null;
                try {
                    triggerTime = resolveObjectStartTime(obj, resolvedObjects);
                }
                catch (e) {
                    console.log(e);
                    triggerTime = null;
                }
                if (triggerTime) {
                    log('resolved object ' + i, 'TRACE');
                    var outerDuration = resolveObjectDuration(obj, resolvedObjects);
                    if (!_.isNull(outerDuration) && !_.isNull(obj.resolved.innerDuration)) {
                        resolvedObjects[obj.id] = obj;
                        unresolvedObjects.splice(i, 1);
                        i--;
                        hasAddedAnyObjects = true; // this will cause the iteration to run again
                    }
                    else {
                        log('no duration', 'TRACE');
                        log('outerDuration: ' + outerDuration, 'TRACE');
                    }
                }
                // log(obj)
                log(obj, 'TRACE');
            }
        }
    }
    // Now we should have resolved all resolvable objects into absolute times.
    // Any object that couldn't be resolved are left in unresolvedObjects
    // Next: Filter away objects not relevant to filter:
    var filteredObjects = _.filter(resolvedObjects, function (obj) {
        if (!obj.parent) {
            var ok = true;
            if (filter &&
                filter.startTime &&
                obj.resolved.endTime !== 0 &&
                (obj.resolved.endTime || 0) < filter.startTime)
                ok = false; // The object has ended before filter.startTime
            if (filter &&
                filter.endTime &&
                (obj.resolved.startTime || 0) > filter.endTime)
                ok = false; // The object starts after filter.endTime
            return ok;
        }
        return false;
    });
    filteredObjects = sortObjects(filteredObjects);
    return {
        resolved: filteredObjects,
        unresolved: unresolvedObjects
    };
}
/**
 * Develops the provided timeline around specified time
 * Developing a timeline means for example to move looping object to that
 * specific time.
 * @param  {ResolvedTimeline}  tl
 * @param  {SomeTime}          time
 * @return {DevelopedTimeline}
 */
function developTimelineAroundTime(tl, time) {
    // extract group & inner content around a given time
    log('developTimelineAroundTime ' + time, 'TRACE');
    // let resolvedObjects = {}
    var tl2 = {
        resolved: [],
        groups: [],
        unresolved: tl.unresolved
    };
    _.each(tl.resolved, function (resolvedObj) {
        // let newObj = clone(resolvedObj)
        developObj(tl2, time, resolvedObj);
    });
    tl2.resolved = sortObjects(tl2.resolved);
    return tl2;
}
function getParentTime(obj) {
    var time = 0;
    if (_.has(obj.resolved, 'repeatingStartTime') &&
        !_.isNull(obj.resolved.repeatingStartTime)) {
        time = obj.resolved.repeatingStartTime;
    }
    else if (obj.resolved.startTime) {
        time = obj.resolved.startTime;
    }
    if (obj.parent) {
        time += getParentTime(obj.parent) - obj.parent.resolved.startTime;
    }
    return time;
}
function developObj(tl2, time, objOrg, givenParentObj) {
    // Develop and place on tl2:
    log('developObj', 'TRACE');
    var returnObj = _.clone(objOrg);
    returnObj.resolved = _.clone(returnObj.resolved);
    returnObj.resolved.innerStartTime = returnObj.resolved.startTime;
    returnObj.resolved.innerEndTime = returnObj.resolved.endTime;
    var parentObj = givenParentObj || returnObj.parent;
    var parentTime = 0;
    var parentIsRepeating = false;
    if (parentObj) {
        parentTime = getParentTime(parentObj);
        returnObj.resolved.parentId = parentObj.id;
        parentIsRepeating = (_.has(parentObj.resolved, 'repeatingStartTime') &&
            !_.isNull(parentObj.resolved.repeatingStartTime));
    }
    returnObj.resolved.startTime = (returnObj.resolved.startTime || 0) + parentTime;
    if (returnObj.resolved.endTime) {
        returnObj.resolved.endTime += parentTime;
    }
    if (parentObj &&
        parentIsRepeating &&
        returnObj.resolved.endTime &&
        returnObj.resolved.startTime &&
        parentObj.resolved.innerDuration &&
        returnObj.resolved.endTime < time) {
        // The object's playtime has already passed, move forward then:
        returnObj.resolved.startTime += parentObj.resolved.innerDuration;
        returnObj.resolved.endTime += parentObj.resolved.innerDuration;
    }
    // cap inside parent:
    if (parentObj &&
        returnObj.resolved &&
        returnObj.resolved.endTime &&
        parentObj.resolved &&
        parentObj.resolved.endTime &&
        returnObj.resolved.endTime > parentObj.resolved.endTime) {
        returnObj.resolved.endTime = parentObj.resolved.endTime;
    }
    if (parentObj &&
        returnObj.resolved.startTime &&
        parentObj.resolved.endTime &&
        parentObj.resolved.startTime &&
        returnObj.resolved.endTime &&
        (returnObj.resolved.startTime > parentObj.resolved.endTime ||
            returnObj.resolved.endTime < parentObj.resolved.startTime)) {
        // we're outside parent, invalidate
        returnObj.resolved.startTime = null;
        returnObj.resolved.endTime = null;
    }
    log(returnObj, 'TRACE');
    if (returnObj.repeating) {
        log('Repeating', 'TRACE');
        // let outerDuration = objNOTClone.resolved.outerDuration;
        if (!returnObj.resolved.innerDuration)
            throw Error('Object "#' + returnObj.id + '" is repeating but missing innerDuration!');
        log('time: ' + time, 'TRACE');
        log('innerDuration: ' + returnObj.resolved.innerDuration, 'TRACE');
        var repeatingStartTime = Math.max((returnObj.resolved.startTime || 0), time - ((time - (returnObj.resolved.startTime || 0)) % returnObj.resolved.innerDuration)); // This is the startTime closest to, and before, time
        log('repeatingStartTime: ' + repeatingStartTime, 'TRACE');
        returnObj.resolved.repeatingStartTime = repeatingStartTime;
    }
    if (returnObj.isGroup) {
        if (returnObj.content.objects) {
            _.each(returnObj.content.objects, function (child) {
                var newChild = _.clone(child);
                if (!newChild.parent)
                    newChild.parent = returnObj;
                developObj(tl2, time, newChild, returnObj);
            });
        }
        else {
            throw Error('.isGroup is set, but .content.objects is missing!');
        }
        tl2.groups.push(returnObj);
    }
    else {
        tl2.resolved.push(returnObj);
    }
}
function resolveObjectStartTime(obj, resolvedObjects) {
    // recursively resolve object trigger startTime
    if (!obj.resolved)
        obj.resolved = {};
    if (obj.trigger.type === enums_1.TriggerType.TIME_ABSOLUTE) {
        var val = void 0;
        if (_.isNumber(obj.trigger.value)) {
            val = obj.trigger.value;
        }
        else {
            val = parseFloat(obj.trigger.value + '');
        }
        // Easy, return the absolute time then:
        obj.resolved.startTime = val;
    }
    else if (obj.trigger.type === enums_1.TriggerType.TIME_RELATIVE) {
        // ooh, it's a relative time! Relative to what, one might ask? Let's find out:
        if (!_.has(obj.resolved, 'startTime') || _.isNull(obj.resolved.startTime)) {
            var o = decipherTimeRelativeValue(obj.trigger.value + '', resolvedObjects);
            obj.resolved.startTime = (o ? o.value : null);
            obj.resolved.referralIndex = (o ? o.referralIndex : null);
            obj.resolved.referredObjectIds = (o ? o.referredObjectIds : null);
            if (o && o.referredObjectIds) {
                _.each(o.referredObjectIds, function (ref) {
                    var refObj = resolvedObjects[ref.id];
                    if (refObj) {
                        if (refObj.resolved.disabled)
                            obj.resolved.disabled = true;
                    }
                });
            }
        }
    }
    resolveObjectEndTime(obj);
    var startTime = null;
    if (!_.isUndefined(obj.resolved.startTime)) {
        // @ts-ignore
        startTime = obj.resolved.startTime;
    }
    return startTime;
}
function resolveObjectDuration(obj, resolvedObjects) {
    // recursively resolve object duration
    if (!obj.resolved)
        obj.resolved = {};
    var outerDuration = obj.resolved.outerDuration || null;
    var innerDuration = obj.resolved.innerDuration || null;
    if (obj['isGroup']) {
        var obj0_1 = obj;
        if (!_.has(obj.resolved, 'outerDuration')) {
            log('RESOLVE GROUP DURATION', 'TRACE');
            var lastEndTime_1 = -1;
            var hasInfiniteDuration_1 = false;
            if (obj.content && obj.content.objects) {
                // let obj = clone(obj)
                if (!obj.content.hasClonedChildren) {
                    obj.content.hasClonedChildren = true;
                    obj.content.objects = _.map(obj.content.objects, function (o) {
                        var o2 = _.clone(o);
                        o2.content = _.clone(o2.content);
                        return o2;
                    });
                }
                _.each(obj.content.objects, function (child) {
                    if (!child.parent)
                        child.parent = obj0_1;
                    if (!child.resolved)
                        child.resolved = {};
                    var startTime = resolveObjectStartTime(child, resolvedObjects);
                    var outerDuration0 = resolveObjectDuration(child, resolvedObjects);
                    if (!_.isNull(startTime) && !_.isNull(outerDuration0) && !_.isNull(child.resolved.innerDuration)) {
                        resolvedObjects[child.id] = child;
                    }
                    log(child, 'TRACE');
                    if (child.resolved.endTime === 0) {
                        hasInfiniteDuration_1 = true;
                    }
                    if ((child.resolved.endTime || 0) > (lastEndTime_1 || 0)) {
                        lastEndTime_1 = child.resolved.endTime || 0;
                    }
                });
            }
            if (hasInfiniteDuration_1) {
                lastEndTime_1 = 0;
            }
            else {
                if (lastEndTime_1 === -1)
                    lastEndTime_1 = null;
            }
            obj.resolved.innerDuration = lastEndTime_1 || 0;
            outerDuration = (obj.duration > 0 || obj.duration === 0 ?
                obj.duration :
                (lastEndTime_1 || 0));
            obj.resolved.outerDuration = outerDuration;
            log('GROUP DURATION: ' + obj.resolved.innerDuration + ', ' + obj.resolved.outerDuration, 'TRACE');
        }
    }
    else {
        var contentDuration = (obj.content || {}).duration;
        outerDuration = (obj.duration > 0 || obj.duration === 0 ?
            obj.duration :
            contentDuration);
        obj.resolved.outerDuration = outerDuration;
        innerDuration = (contentDuration > 0 || contentDuration === 0 ?
            contentDuration :
            obj.duration);
        obj.resolved.innerDuration = innerDuration;
    }
    resolveObjectEndTime(obj); // don't provide resolvedObjects here, that might cause an infinite loop
    return outerDuration;
}
function resolveObjectEndTime(obj, resolvedObjects) {
    if (!obj.resolved)
        obj.resolved = {};
    if (!_.has(obj.resolved, 'startTime') && resolvedObjects) {
        resolveObjectStartTime(obj, resolvedObjects);
    }
    if (!_.has(obj.resolved, 'outerDuration') && resolvedObjects) {
        resolveObjectDuration(obj, resolvedObjects);
    }
    var endTime = obj.resolved.endTime || null;
    if (_.has(obj.resolved, 'startTime') &&
        _.has(obj.resolved, 'outerDuration') &&
        !_.isNull(obj.resolved.startTime) &&
        !_.isNull(obj.resolved.outerDuration)) {
        if (obj.resolved.outerDuration) {
            endTime = (obj.resolved.startTime || 0) + obj.resolved.outerDuration;
        }
        else {
            endTime = 0; // infinite
        }
        obj.resolved.endTime = endTime;
    }
    return endTime;
}
function interpretExpression(strOrExpr, isLogical) {
    // note: the order is the priority!
    var operatorList = ['+', '-', '*', '/'];
    if (isLogical) {
        operatorList = ['&', '|'];
    }
    var wordIsOperator = function (word) {
        if (operatorList.indexOf(word) !== -1)
            return true;
        return false;
    };
    var regexpOperators = '';
    _.each(operatorList, function (o) {
        regexpOperators += '\\' + o;
    });
    var expression = null;
    if (strOrExpr) {
        if (_.isString(strOrExpr) || _.isNumber(strOrExpr)) {
            var str = strOrExpr + '';
            // Prepare the string:
            // Make sure all operators (+-/*) have spaces between them
            // str = str.replace(/([\(\)\*\/+-])/g,' $1 ')
            // log(str)
            // log(new RegExp('(['+regexpOperators+'])','g'))
            str = str.replace(new RegExp('([' + regexpOperators + '\\(\\)])', 'g'), ' $1 '); // Make sure there's a space between every operator & operand
            var words = _.compact(str.split(' '));
            if (words.length === 0)
                return null; // empty expression
            // Fix special case: a + - b
            for (var i = words.length - 2; i >= 1; i--) {
                if ((words[i] === '-' || words[i] === '+') && wordIsOperator(words[i - 1])) {
                    words[i] = words[i] + words[i + 1];
                    words.splice(i + 1, 1);
                }
            }
            // wrap up parentheses:
            var wrapInnerExpressions_1 = function (words) {
                for (var i = 0; i < words.length; i++) {
                    // if (words[i] == ')') throw 'decipherTimeRelativeValue: syntax error: ')' encountered.'
                    if (words[i] === '(') {
                        var tmp_1 = wrapInnerExpressions_1(words.slice(i + 1));
                        // insert inner expression and remove tha
                        words[i] = tmp_1.inner;
                        words.splice(i + 1, tmp_1.inner.length + 1);
                    }
                    if (words[i] === ')') {
                        return {
                            inner: words.slice(0, i),
                            rest: words.slice(i + 1)
                        };
                    }
                }
                return {
                    inner: words,
                    rest: []
                };
            };
            var tmp = wrapInnerExpressions_1(words);
            if (tmp.rest.length)
                throw Error('interpretExpression: syntax error: parentheses don\'t add up in "' + str + '".');
            var expressionArray = tmp.inner;
            if (expressionArray.length % 2 !== 1)
                throw Error('interpretExpression: operands & operators don\'t add up: "' + expressionArray.join(' ') + '".');
            var getExpression_1 = function (words) {
                if (!words || !words.length)
                    throw Error('interpretExpression: syntax error: unbalanced expression');
                if (words.length === 1 && _.isArray(words[0]))
                    words = words[0];
                if (words.length === 1)
                    return words[0];
                // priority order: /, *, -, +
                var operatorI = -1;
                /*if (operatorI == -1) {

                    for (let i in words) {
                        if (words[i] == '+' || words[i] == '-') {
                            operatorI = parseInt(i)
                            break
                        }
                    }
                }
                if (operatorI == -1) operatorI = words.indexOf('*')
                if (operatorI == -1) operatorI = words.indexOf('/')
                */
                _.each(operatorList, function (operator) {
                    if (operatorI === -1) {
                        operatorI = words.indexOf(operator);
                    }
                });
                if (operatorI !== -1) {
                    var o = {
                        l: words.slice(0, operatorI),
                        o: words[operatorI],
                        r: words.slice(operatorI + 1)
                    };
                    o.l = getExpression_1(o.l);
                    o.r = getExpression_1(o.r);
                    return o;
                }
                else
                    throw Error('interpretExpression: syntax error: operator not found: "' + (words.join(' ')) + '"');
            };
            expression = getExpression_1(expressionArray);
        }
        else if (_.isObject(strOrExpr)) {
            expression = strOrExpr;
        }
    }
    // is valid expression?
    var validateExpression = function (expr0, breadcrumbs) {
        if (!breadcrumbs)
            breadcrumbs = 'ROOT';
        if (_.isObject(expr0)) {
            var expr = expr0;
            if (!_.has(expr, 'l'))
                throw Error('validateExpression: "+breadcrumbs+".l missing');
            if (!_.has(expr, 'o'))
                throw Error('validateExpression: "+breadcrumbs+".o missing');
            if (!_.has(expr, 'r'))
                throw Error('validateExpression: "+breadcrumbs+".r missing');
            if (!_.isString(expr.o))
                throw Error('validateExpression: "+breadcrumbs+".o not a string');
            if (!wordIsOperator(expr.o))
                throw Error(breadcrumbs + '.o not valid: "' + expr.o + '"');
            validateExpression(expr.l, breadcrumbs + '.l');
            validateExpression(expr.r, breadcrumbs + '.r');
        }
    };
    try {
        if (expression) {
            validateExpression(expression);
        }
    }
    catch (e) {
        var errStr = JSON.stringify(expression);
        throw Error(errStr + ' ' + e);
    }
    log('expression: ', 'TRACE');
    log(expression, 'TRACE');
    /*
        Example:
        expression = {
            l: '#asdf.end'  // left operand
            o: 	'+'			// operator
            r: '2'			// right operand
        }
        expression = {
            l: '#asdf.end'
        }
        expression = {
            l: '#asdf.end'
            o: 	'+'
            r: {
                l: 1
                o: *
                r: 2
            }
        }
    */
    return expression;
}
function resolveExpression(expression0, resolvedObjects, ctx) {
    resolvedObjects = resolvedObjects || {};
    ctx = ctx || {
        touchedObjectExpressions: {},
        touchedObjectIDs: [],
        referralIndex: 0
    };
    if (_.isObject(expression0)) {
        var expression = expression0;
        log('resolveExpression', 'TRACE');
        var l = resolveExpression(expression.l, resolvedObjects, ctx);
        var r = resolveExpression(expression.r, resolvedObjects, ctx);
        log('l: ' + l, 'TRACE');
        log('o: ' + expression.o, 'TRACE');
        log('r: ' + r, 'TRACE');
        if (_.isNull(l))
            return null;
        if (_.isNull(r))
            return null;
        if (expression.o === '+')
            return l + r;
        if (expression.o === '-')
            return l - r;
        if (expression.o === '*')
            return l * r;
        if (expression.o === '/')
            return l / r;
    }
    else {
        if (isNumeric(expression0)) {
            if (_.isNumber(expression0)) {
                return expression0;
            }
            else {
                return parseFloat(expression0 + '');
            }
        }
        else {
            var expression = expression0 + '';
            if (expression[0] === '#') {
                if (_.has(ctx.touchedObjectExpressions, expression))
                    return ctx.touchedObjectExpressions[expression]; // to improve performance and avoid circular dependencies
                ctx.touchedObjectExpressions[expression] = null; // to avoid circular dependencies
                //
                var words = expression.slice(1).split('.');
                var hook = 'end';
                if (words.length === 2) {
                    hook = words[1];
                }
                ctx.touchedObjectIDs.push({
                    id: words[0],
                    hook: hook
                });
                var obj = resolvedObjects[words[0]];
                if (!obj) {
                    log('obj "' + words[0] + '" not found', 'TRACE');
                    return null;
                }
                var referredObjValue = (_.has(obj.resolved, 'startTime') ?
                    (obj.resolved.startTime || 0) :
                    resolveObjectStartTime(obj, resolvedObjects));
                var objReferralIndex = ((obj.resolved || {}).referralIndex || 0) + 1;
                if (objReferralIndex > ctx.referralIndex)
                    ctx.referralIndex = objReferralIndex;
                var val = null;
                if (hook === 'start') {
                    val = referredObjValue;
                }
                else if (hook === 'end') {
                    if ((referredObjValue || referredObjValue === 0) &&
                        obj.resolved.outerDuration) {
                        val = referredObjValue + obj.resolved.outerDuration;
                    }
                }
                else if (hook === 'duration') {
                    if (obj.resolved.outerDuration) {
                        val = obj.resolved.outerDuration;
                    }
                }
                else {
                    throw Error('Unknown hook: "' + expression + '"');
                }
                ctx.touchedObjectExpressions[expression] = val;
                return val;
            }
        }
    }
    return null;
}
function resolveLogicalExpression(expressionOrString, obj, returnExpl, currentState) {
    // todo:
    if (_.isObject(expressionOrString) && expressionOrString) {
        var expression = expressionOrString;
        log('resolveLogicalExpression', 'TRACE');
        var l = resolveLogicalExpression(expression.l, obj, returnExpl, currentState);
        var r = resolveLogicalExpression(expression.r, obj, returnExpl, currentState);
        log('l: ' + l, 'TRACE');
        log('o: ' + expression.o, 'TRACE');
        log('r: ' + r, 'TRACE');
        if (_.isNull(l) || _.isNull(r)) {
            if (returnExpl)
                return '-null-';
            return null;
        }
        if (expression.o === '&') {
            if (returnExpl)
                return l + ' and ' + r;
            return l && r;
        }
        if (expression.o === '|') {
            if (returnExpl)
                return l + ' and ' + r;
            return l || r;
        }
    }
    else if (_.isString(expressionOrString)) {
        var expression = expressionOrString;
        var m = expression.match(/!/g);
        var invert = (m ? m.length : 0) % 2;
        var str = expression.replace(/!/g, '');
        var value = (function (str, obj, returnExpl) {
            if (isNumeric(str))
                return !!parseInt(str, 10);
            var m = null;
            var tmpStr = str.trim();
            if (tmpStr === '1' ||
                tmpStr.toLowerCase() === 'true') {
                return true;
            }
            else if (tmpStr === '0' ||
                tmpStr.toLowerCase() === 'false') {
                return false;
            }
            var filterAdd = [];
            var filterRemove = [];
            var objsToCheck = [];
            for (var i = 0; i < 10; i++) {
                m = tmpStr.match(/^([#\$\.])([^#\$\. ]+)(.*)/); // '$L12', '$L', '$G123.main#asdf'
                if (m) {
                    if (m[1] === '$' // Referring to a layer
                    ) {
                        filterAdd.push({
                            t: m[1],
                            val: m[2]
                        });
                    }
                    else if (m[1] === '#' || // Referring to an other object: '#id-of-object'
                        m[1] === '.' // Referring to a class of objects
                    ) {
                        filterRemove.push({
                            t: m[1],
                            val: m[2]
                        });
                    }
                    tmpStr = m[3].trim();
                }
                else {
                    break;
                }
            }
            var err = '';
            var explAdd = [];
            var explRemove = [];
            if (filterAdd.length) {
                // log('filterAdd')
                // log(filterAdd)
                _.each(filterAdd, function (add) {
                    var m = add.val.match(/([GL])(.*)/i);
                    if (m) {
                        if (!isNumeric(m[2])) {
                            err = m[2];
                        }
                        if ((m[1] || '').match(/L/i)) {
                            var LLayer = (m[2] ?
                                m[2] :
                                (obj || {})['LLayer'] || null);
                            // log('obj on LL '+LLayer)
                            // log(currentState.LLayers[LLayer])
                            if (LLayer) {
                                if (currentState && currentState.LLayers[LLayer]) {
                                    objsToCheck.push(currentState.LLayers[LLayer]);
                                }
                            }
                            if (m[2]) {
                                explAdd.push('LLayer ' + (LLayer || 'N/A'));
                            }
                            else {
                                explAdd.push('my LLayer');
                            }
                        }
                        else if ((m[1] || '').match(/G/i)) {
                            var GLayer = (m[2] ?
                                m[2] :
                                ((obj || {})['content'] || { GLayer: null }).GLayer);
                            if (GLayer) {
                                if (currentState && currentState.GLayers[GLayer]) {
                                    objsToCheck.push(currentState.GLayers[GLayer]);
                                }
                            }
                            if (m[2]) {
                                explAdd.push('GLayer ' + (GLayer || 'N/A'));
                            }
                            else {
                                explAdd.push('my GLayer');
                            }
                        }
                        else {
                            err = add.val;
                        }
                    }
                    else {
                        err = add.val;
                    }
                });
            }
            else {
                // check in all layers:
                if (currentState) {
                    _.each(currentState.LLayers, function (obj /*, LLayer*/) {
                        objsToCheck.push(obj);
                    });
                    _.each(currentState.GLayers, function (obj /*, GLayer*/) {
                        objsToCheck.push(obj);
                    });
                }
                explAdd.push('any layer');
            }
            var found = false;
            if (filterRemove.length) {
                found = true;
                _.each(filterRemove, function (remove) {
                    var obj;
                    if (remove.t === '#') {
                        explRemove.push('id "' + remove.val + '"');
                        obj = _.find(objsToCheck, function (obj) {
                            return obj.id === remove.val;
                        });
                        if (!obj)
                            found = false;
                    }
                    else if (remove.t === '.') {
                        explRemove.push('class "' + remove.val + '"');
                        obj = _.find(objsToCheck, function (obj) {
                            return ((obj.classes || []).indexOf(remove.val) !== -1);
                        });
                        if (!obj)
                            found = false;
                    }
                    else {
                        err = remove.t + remove.val;
                        found = false;
                    }
                    // let m = remove.val.match(/([\$\.])(.*)/)
                });
            }
            else {
                explRemove.push('anyting');
                if (objsToCheck.length)
                    found = true;
            }
            var expl = explJoin(explRemove, ', ', ' and ') + ' is playing on ' + explJoin(explAdd, ', ', ' or ');
            if (err)
                throw Error('Unknown logical expression: "' + str + '" ("' + err + '")');
            if (returnExpl)
                return expl;
            return found;
        })(str, obj, returnExpl);
        if (returnExpl) {
            if (invert)
                return 'if not ' + value;
            return 'if ' + value;
        }
        if (invert)
            return !value;
        return value;
    }
    else if (_.isNumber(expressionOrString)) {
        return expressionOrString;
    }
    return null;
}
function decipherTimeRelativeValue(str, resolvedObjects) {
    // Decipher a value related to the trigger type TIME_RELATIVE
    // Examples:
    // #asdf.end -2 // Relative to object asdf's end (plus 2 seconds)
    log('decipherTimeRelativeValue', 'TRACE');
    try {
        var resolveExpressionContext = {
            touchedObjectExpressions: {},
            touchedObjectIDs: [],
            referralIndex: 0
        };
        var expression = interpretExpression(str);
        // resolve expression
        var value = (expression ?
            resolveExpression(expression, resolvedObjects, resolveExpressionContext) :
            0);
        return {
            value: value,
            referralIndex: resolveExpressionContext.referralIndex,
            referredObjectIds: resolveExpressionContext.touchedObjectIDs
        };
    }
    catch (e) {
        console.log('error in expression: ');
        throw e;
    }
}
function decipherLogicalValue(str, obj, currentState, returnExpl) {
    // Decipher a value related to the trigger type TIME_RELATIVE
    // Examples:
    /* Examples:
        '#asdf'		// id of object
        '$L1'		// special: LLayer 1 is not empty
        '$L'		// same LLayer as object
        '$G1'		// special: GLayer 1 is not empty
        '$G'		// same LLayer as object
        '.main'		// reference to a class (.classes)

        '$L.main'	// class main on LLayer
        '$L3#asdf'	// id asdf main on LLayer 3

        '.main & .second' // AND
        '.main | .second' // OR
        '.main | !.second' // OR NOT
    */
    /*
        currentState: {
            GLayers: GLayers,
            LLayers: LLayers
        }

    */
    log('decipherLogicalValue', 'TRACE');
    // let referralIndex = 0
    try {
        // let touchedObjectExpressions = {}
        // let touchedObjectIDs = []
        var expression = interpretExpression(str, true);
        // resolve expression
        return resolveLogicalExpression(expression, obj, returnExpl, currentState);
    }
    catch (e) {
        console.log('error in expression: ');
        throw e;
    }
}
function resolveState(tld, time) {
    log('resolveState', 'TRACE');
    // log('resolveState '+time)
    var LLayers = {};
    var GLayers = {};
    var obj;
    var obj2;
    log('tld', 'TRACE');
    log(tld, 'TRACE');
    log('Resolved objects:', 'TRACE');
    for (var i = 0; i < tld.resolved.length; i++) {
        obj = _.clone(tld.resolved[i]);
        log(obj, 'TRACE');
        if ((obj.resolved.endTime > time ||
            obj.resolved.endTime === 0) &&
            obj.resolved.startTime <= time &&
            !obj.resolved.disabled) {
            // log(obj)
            if (!LLayers[obj.LLayer]) {
                LLayers[obj.LLayer] = obj;
            }
            else {
                // Priority:
                obj2 = LLayers[obj.LLayer];
                if (((obj.priority || 0) > (obj2.priority || 0) // obj has higher priority => replaces obj2
                ) || ((obj.priority || 0) === (obj2.priority || 0) &&
                    obj.resolved.startTime > obj2.resolved.startTime // obj starts later => replaces obj2
                ) || ((obj.priority || 0) === (obj2.priority || 0) &&
                    obj.resolved.startTime === obj2.resolved.startTime &&
                    obj.resolved.referralIndex > obj2.resolved.referralIndex // obj has a higher referralIndex => replaces obj2
                )) {
                    LLayers[obj.LLayer] = obj;
                }
            }
        }
    }
    log('LLayers: ', 'TRACE');
    log(LLayers, 'TRACE');
    var getGLayer = function (obj) {
        if (_.has(obj.content, 'GLayer'))
            return obj.content.GLayer;
        if (_.has(obj, 'LLayer'))
            return obj.LLayer;
        if (obj.parent)
            return getGLayer(obj.parent);
        return null;
    };
    for (var LLayer in LLayers) {
        obj = LLayers[LLayer];
        var GLayer = getGLayer(obj) || 0;
        if (!_.isNull(GLayer)) {
            if (!GLayers[GLayer]) {
                GLayers[GLayer] = obj;
            }
            else {
                // maybe add some better logic here, right now we use the LLayer index as a priority (higher LLayer => higher priority).
                obj2 = GLayers[GLayer];
                if (obj2.LLayer < obj.LLayer) {
                    GLayers[GLayer] = obj;
                }
            }
        }
    }
    log('GLayers, before logical: ', 'TRACE');
    log(GLayers, 'TRACE');
    // Logic expressions:
    var groupsOnState = {};
    var unresolvedLogicObjs = {};
    var addLogicalObj = function (oOrg, parent) {
        if (oOrg.trigger.type === enums_1.TriggerType.LOGICAL) {
            // ensure there's no startTime on obj
            var o = _.clone(oOrg);
            o.content = _.clone(o.content);
            if (o['resolved']) {
                o['resolved'].startTime = null;
                o['resolved'].endTime = null;
                o['resolved'].duration = null;
            }
            if (parent) {
                o.parent = parent;
            }
            if (unresolvedLogicObjs[o.id]) {
                // already there
                return false;
            }
            else {
                unresolvedLogicObjs[o.id] = {
                    prevOnTimeline: null,
                    obj: o
                };
                return true;
            }
        }
        return false;
    };
    // Logical objects will be in the unresolved array:
    _.each(tld.unresolved, function (o) {
        addLogicalObj(o);
    });
    _.each(tld.groups, function (o) {
        if (o.isGroup && o.content && o.content.objects) {
            if (o.trigger.type === enums_1.TriggerType.LOGICAL) {
                addLogicalObj(o);
            }
            else {
                groupsOnState[o.id] = true;
            }
            _.each(o.content.objects, function (child) {
                addLogicalObj(child, o);
            });
        }
    });
    var hasChangedSomethingInIteration = true;
    var iterationsLeft = _.keys(unresolvedLogicObjs).length + 2;
    log('unresolvedLogicObjs', 'TRACE');
    log(unresolvedLogicObjs, 'TRACE');
    log('Logical objects:', 'TRACE');
    while (hasChangedSomethingInIteration && iterationsLeft-- >= 0) {
        hasChangedSomethingInIteration = false;
        _.each(unresolvedLogicObjs, function (o) {
            log(o, 'TRACE');
            var onTimeLine = !!(decipherLogicalValue(o.obj.trigger.value, o.obj, {
                time: time,
                GLayers: GLayers,
                LLayers: LLayers
            }) && !o.obj.disabled);
            log('onTimeLine ' + onTimeLine, 'TRACE');
            if (o.obj.isGroup) {
                groupsOnState[o.obj.id] = onTimeLine;
                if (onTimeLine) {
                    // a group isn't placed in the state, instead its children are evaluated
                    if (o.obj.content && o.obj.content.objects) {
                        _.each(o.obj.content.objects, function (o2) {
                            if (addLogicalObj(o2, o.obj)) {
                                iterationsLeft++;
                                hasChangedSomethingInIteration = true;
                            }
                        });
                    }
                }
            }
            else {
                if (o.obj['parent']) {
                    var parentId = o.obj['parent'].id;
                    onTimeLine = (onTimeLine &&
                        groupsOnState[parentId]);
                }
                var oldLLobj = LLayers[o.obj.LLayer];
                var GLayer = getGLayer(o.obj) || 0;
                var oldGLObj = GLayers[GLayer];
                if (onTimeLine) {
                    // Place in state, according to priority rules:
                    if (!oldLLobj ||
                        (o.obj.priority || 0) > (oldLLobj.priority || 0) // o.obj has higher priority => replaces oldLLobj
                    ) {
                        LLayers[o.obj.LLayer] = o.obj;
                        if (!oldGLObj ||
                            oldGLObj.LLayer <= o.obj.LLayer || // maybe add some better logic here, right now we use the LLayer index as a priority (higher LLayer => higher priority)
                            (oldLLobj && oldGLObj.id === oldLLobj.id // the old object has just been replaced
                            )) {
                            GLayers[GLayer] = o.obj;
                        }
                    }
                    if (oldLLobj && oldLLobj.id !== LLayers[o.obj.LLayer].id) {
                        // oldLLobj has been removed from LLayers
                        // maybe remove it from GLayers as well?
                        var GLayer_1 = getGLayer(o.obj) || 0;
                        if (GLayers[GLayer_1].id === oldLLobj.id) {
                            // yes, remove it:
                            delete GLayers[GLayer_1];
                        }
                    }
                }
                else {
                    // Object should not be in the state
                    if (oldLLobj && oldLLobj.id === o.obj.id) {
                        // remove the object then:
                        delete LLayers[o.obj.LLayer];
                    }
                    if (oldGLObj && oldGLObj.id === o.obj.id) {
                        // remove the object then:
                        delete GLayers[GLayer];
                    }
                }
            }
            if ((o.prevOnTimeline !== onTimeLine)) {
                hasChangedSomethingInIteration = true;
                o.prevOnTimeline = onTimeLine;
            }
        });
    }
    if (iterationsLeft <= 0) {
        log('Timeline Warning: Many Logical iterations, maybe there is a cyclic dependency?', enums_1.TraceLevel.ERRORS);
    }
    log('GLayers: ', 'TRACE');
    log(GLayers, 'TRACE');
    return {
        time: time,
        GLayers: GLayers,
        LLayers: LLayers
    };
}
function evaluateKeyFrames(state, tld) {
    // prepare data
    var resolvedObjects = {};
    _.each(tld.resolved, function (obj) {
        resolvedObjects[obj.id] = obj;
    });
    var allValidKeyFrames = [];
    _.each(state.LLayers, function (obj) {
        if (!obj.resolved)
            obj.resolved = {};
        _.each(_.omit(obj.content, ['GLayer']), function (val, key) {
            if (obj.resolved)
                obj.resolved[key] = _.clone(val);
        });
        if (obj.content && obj.content.templateData) {
            obj.resolved.templateData = _.clone(obj.content.templateData);
        }
        if (obj.content && obj.content.keyframes) {
            var resolvedKeyFrames = [];
            var unresolvedKeyFrames_1 = [];
            _.each(obj.content.keyframes, function (keyFrame) {
                unresolvedKeyFrames_1.push(keyFrame);
            });
            var resolvedObjectsInternal = _.clone(resolvedObjects);
            var hasAddedAnyObjects = true;
            while (hasAddedAnyObjects) {
                hasAddedAnyObjects = false;
                for (var i = 0; i < unresolvedKeyFrames_1.length; i++) {
                    var keyFrame = _.extend(_.clone(unresolvedKeyFrames_1[i]), {
                        resolved: {}
                    });
                    if (keyFrame && keyFrame.trigger) {
                        var triggerTime = null;
                        if (keyFrame.trigger.type === enums_1.TriggerType.LOGICAL) {
                            var onTimeLine = decipherLogicalValue(keyFrame.trigger.value, keyFrame, state);
                            if (onTimeLine) {
                                triggerTime = 1;
                                keyFrame.resolved.startTime = triggerTime;
                            }
                        }
                        else if (keyFrame.trigger.type === enums_1.TriggerType.TIME_ABSOLUTE) {
                            // relative to parent start time
                            var val = void 0;
                            if (_.isNumber(keyFrame.trigger.value)) {
                                val = keyFrame.trigger.value;
                            }
                            else {
                                val = parseFloat(keyFrame.trigger.value + '');
                            }
                            if (obj.resolved.startTime) {
                                triggerTime = val + obj.resolved.startTime;
                            }
                            else {
                                triggerTime = (val ? 1 : 0);
                            }
                            if (triggerTime)
                                keyFrame.resolved.startTime = triggerTime;
                            resolveObjectEndTime(keyFrame, resolvedObjectsInternal);
                        }
                        else {
                            resolveObjectEndTime(keyFrame, resolvedObjectsInternal);
                            triggerTime = keyFrame.resolved.startTime || null;
                        }
                        if (triggerTime) {
                            if (keyFrame.id) {
                                resolvedObjectsInternal[keyFrame.id] = keyFrame;
                            }
                            resolvedKeyFrames.push(keyFrame);
                            unresolvedKeyFrames_1.splice(i, 1);
                            i--;
                            hasAddedAnyObjects = true; // this will cause the iteration to run again
                        }
                    }
                }
            }
            // sort keyframes in ascending order:
            resolvedKeyFrames.sort(function (a, b) {
                var aStartTime = (a.resolved || {}).startTime || 0;
                var bStartTime = (b.resolved || {}).startTime || 0;
                if (aStartTime > bStartTime)
                    return 1;
                if (aStartTime < bStartTime)
                    return -1;
                return 0;
            });
            if (!obj.content)
                obj.content = {};
            // Apply keyframes
            _.each(resolvedKeyFrames, function (keyFrame) {
                var startTime = (keyFrame.resolved || {}).startTime || 0;
                var endTime = (keyFrame.resolved || {}).endTime || 0;
                if (startTime > 0 &&
                    (!state.time || startTime <= state.time) &&
                    (!endTime ||
                        (!state.time || endTime > state.time))) {
                    var usingThisKeyframe_1 = false;
                    if (keyFrame.content) {
                        _.each(keyFrame.content, function (val, key) {
                            if (_.isObject(val)) {
                                if (!obj.resolved[key]) {
                                    obj.resolved[key] = {};
                                }
                                _.each(val, function (val1, attr) {
                                    // Apply keyframe to content:
                                    if (state.time) {
                                        // obj.resolved.mixer[attr] = val1
                                        obj.resolved[key][attr] = val1;
                                    }
                                    usingThisKeyframe_1 = true;
                                });
                            }
                            else {
                                obj.resolved[key] = val;
                            }
                        });
                    }
                    /*
                    if (keyFrame.templateData) {

                        if (_.isObject(obj.resolved.templateData) && _.isObject(keyFrame.templateData)) {

                            _.extend(obj.resolved.templateData, keyFrame.templateData)
                        } else {
                            obj.resolved.templateData = keyFrame.templateData
                        }
                        usingThisKeyframe = true
                    }
                    */
                    if (usingThisKeyframe_1) {
                        allValidKeyFrames.push(_.extend({ parent: obj.id }, keyFrame));
                    }
                }
            });
        }
    });
    return allValidKeyFrames;
}
function evaluateFunctions(state, tld, externalFunctions) {
    var triggernewResolveState = false;
    if (externalFunctions && _.isObject(externalFunctions)) {
        _.each(state.LLayers, function (obj) {
            if (obj.externalFunction) {
                var fcn = externalFunctions[obj.externalFunction];
                if (fcn && _.isFunction(fcn)) {
                    var value = !!fcn(obj, state, tld);
                    triggernewResolveState = triggernewResolveState || value;
                }
            }
        });
    }
    return triggernewResolveState;
}
function isNumeric(num) {
    return !isNaN(num);
}
function log(str, levelName) {
    var lvl = enums_1.TraceLevel.ERRORS;
    if (levelName)
        lvl = enums_1.TraceLevel[levelName] || 0;
    if (traceLevel >= lvl)
        console.log(str);
}
function explJoin(arr, decimator, lastDecimator) {
    if (arr.length === 1) {
        return arr[0];
    }
    else {
        var arr0 = arr.slice(0, -1);
        return arr0.join(decimator) + lastDecimator + arr.slice(-1);
    }
}
function sortObjects(arrayOfObjects) {
    return arrayOfObjects.sort(function (a, b) {
        var aStartTime = (a.resolved || {}).startTime || 0;
        var bStartTime = (b.resolved || {}).startTime || 0;
        if (aStartTime > bStartTime)
            return 1;
        if (aStartTime < bStartTime)
            return -1;
        var aEndTime = (a.resolved || {}).endTime || 0;
        var bEndTime = (b.resolved || {}).endTime || 0;
        if (aEndTime > bEndTime)
            return 1;
        if (aEndTime < bEndTime)
            return -1;
        return 0;
    });
}
//# sourceMappingURL=resolver.js.map