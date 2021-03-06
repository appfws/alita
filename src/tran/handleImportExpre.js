/**
 * Copyright (c) Areslabs.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
 
import traverse from "@babel/traverse"
import {RNNOTSUPPORTCOMP} from '../constants'

let JSXElements = new Set(), //js中所有的JSX数组
    usedComponent = {};

function getJSXElements(path) {
    let nodeType = path.node.type;
    if(nodeType === 'JSXElement'){
        const name = path.node.openingElement.name.name
        JSXElements.add(name)
    }
}

function handleImport(path) {
    const relativePath = path.node.source.value
    if (!path.node.source.extra) {
        // extra若不存在， 说明导入是在AST处理的时候 后加的
        return
    }
    const originalPath = path.node.source.extra.rawValue

    const isLibPath = judgeLibPath(relativePath)
    let isCompImport = false
    for(let item of path.node.specifiers){
        let importElement = item.local.name;

        if(JSXElements.has(importElement)){
            usedComponent[importElement] = isLibPath ? getCompFinalPath(originalPath, importElement) : relativePath;
            isCompImport = true
        }
    }

    if (isCompImport && !isLibPath) {
        path.node.source.value = `${relativePath}.comp`
    }
}


function handleRequire(path) {
    const relativePath = path.node.arguments[0].value

    if (!path.node.arguments[0].extra) {
        // extra若不存在， 说明导入是在AST处理的时候 后加的
        return
    }

    const originalPath = path.node.arguments[0].extra.rawValue

    const isLibPath = judgeLibPath(relativePath)
    let isCompImport = false
    const id = path.parentPath.node.id
    if (id.type === 'Identifier'
        && JSXElements.has(id.name)
    ) {
        usedComponent[id.name] = isLibPath ? getCompFinalPath(originalPath, id.name) : relativePath
        isCompImport = true
    } else if (id.type === 'ObjectPattern') {
        const opp = id.properties
        for(let i = 0; i < opp.length; i++) {
            const item = opp[i]
            if (item.type === 'ObjectProperty') {
                const name = item.key.name
                if (JSXElements.has(name)) {
                    usedComponent[name] = isLibPath ? getCompFinalPath(originalPath, name) : relativePath
                    isCompImport = true
                }
            }
        }
    }
    if (isCompImport && !isLibPath) {
        path.node.arguments[0].value = `${relativePath}.comp`
    }
}

export default function (ast, {filepath, json}){
    JSXElements = new Set(); //js中所有的JSX数组
    usedComponent = {};

    traverse(ast, {
        enter(path) {
            getJSXElements(path);
        },
    });
    traverse(ast, {
        exit(path) {
            if (path.type === 'ImportDeclaration') {
                handleImport(path, filepath);
                return
            }

            if (path.type === 'CallExpression'
                && path.node.callee.name === 'require'
                && path.key === 'init'
            ) {
                handleRequire(path, filepath)
                return
            }
        },
    });

    const jsxElementsArray = Array.from(JSXElements)
    for(let i = 0; i < jsxElementsArray.length; i ++) {
        const item = jsxElementsArray[i]
        if (item === 'view' || item === 'block' || item === 'image') continue
        if (item.endsWith('CPT')) continue

        if (usedComponent[item] === undefined) {
            const backUpPath = getBackUpPath(item)
            if (backUpPath) {
                console.log(`${item} 组件没有发现正常的导入路径！将使用全局搜索到的${backUpPath}`.warn)
                usedComponent[item] = backUpPath
            }
        }
    }

    json.usingComponents = usedComponent
    return ast
}

function getBackUpPath(name) {
    const allKeys = Object.keys(global.execArgs.extCompPathMaps)
    for(let i = 0; i < allKeys.length; i ++) {
        const compMaps = global.execArgs.extCompPathMaps[allKeys[i]]
        if (compMaps[name]) {
            return compMaps[name]
        }
    }
}


function judgeLibPath(relativePath) {
    if (relativePath.startsWith('/')
        || relativePath.startsWith('.')
    ) {
        return false
    }

    return getLibPath(relativePath) === relativePath
}

function getCompFinalPath(originalPath, name) {
    if (originalPath === 'react-native'
        && RNNOTSUPPORTCOMP.has(name)
    ) {
        console.log(`不支持React Native组件${name}`.warn)
        return
    }


    if (global.execArgs.extCompPathMaps[originalPath] === undefined) {
        console.log(`${originalPath} 需要在配置文件extCompLibs字段指定！`.error)
        return
    }

    if (global.execArgs.extCompPathMaps[originalPath][name] === undefined) {
        console.log(`组件${name} 没有在${originalPath}指定`.error)
        return
    }


    return global.execArgs.extCompPathMaps[originalPath][name]
}

function getLibPath(path) {
    if (path.charAt(0) === '@') {
        const index = path.indexOf('/')
        const twoIndex = path.indexOf('/', index + 1)
        if (twoIndex === -1) {
            return path
        } else {
            return path.substring(0, twoIndex)
        }
    } else {
        const index = path.indexOf('/')
        if (index === -1) {
            return path
        } else {
            return path.substring(0, index)
        }
    }
}
