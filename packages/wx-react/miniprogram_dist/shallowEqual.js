/**
 * Copyright (c) Areslabs.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
 
const hasOwn = Object.prototype.hasOwnProperty

function is(x, y) {
    if (x === y) {
        return x !== 0 || y !== 0 || 1 / x === 1 / y
    } else {
        return x !== x && y !== y
    }
}

export default function shallowEqual(objA, objB) {
    if (is(objA, objB)) return true

    if (typeof objA !== 'object' || objA === null ||
        typeof objB !== 'object' || objB === null) {
        return false
    }

    const keysA = Object.keys(objA)
    const keysB = Object.keys(objB)

    if (keysA.length !== keysB.length) return false

    for (let i = 0; i < keysA.length; i++) {
        if (keysA[i] === 'children') continue

        if (!hasOwn.call(objB, keysA[i]) ||
            !is(objA[keysA[i]], objB[keysA[i]])) {
            return false
        }
    }

    return true
}