var tagFilter = require("../plugins/tagFilter.js"),
    commonReg = require("../plugins/commonReg.js"),
    pregQuote = require("../plugins/pregQuote.js");

var cssParser = require('css');

var smarty_left_delimiter;
var smarty_right_delimiter;

var stringRegStr = commonReg.stringRegStr,
    jscommentRegStr = commonReg.jscommentRegStr,
    jsStringArrayRegStr = commonReg.jsStringArrayRegStr;

var DEFAULT_METHOD_NAME = "__main",
    PRFIX = "_",
    SUFFIX = "_";

function setDelimiter() {
        smarty_left_delimiter = fis.config.get("settings.smarty.left_delimiter") || "{";
        smarty_right_delimiter = fis.config.get("settings.smarty.right_delimiter") || "}";
    }
    /**
     * replaceScriptTag 将<script runat="server"></script> 替换为 {script}{/script}
     *
     * @param content $content
     * @param file $file
     * @param conf $conf
     * @access public
     * @return void
     */
function replaceScriptTag(content, file, conf) {
    setDelimiter();
    var runAtServerReg = /(?:^|\s)runat\s*=\s*(["'])server\1/;
    return tagFilter.filterBlock(content,
        "script", "<", ">",
        function(outter, attr, inner) {
            if (runAtServerReg.test(attr)) {
                return smarty_left_delimiter +
                    "script" +
                    attr.replace(runAtServerReg, "") +
                    smarty_right_delimiter +
                    inner +
                    smarty_left_delimiter +
                    "/script" +
                    smarty_right_delimiter;
            } else {
                return outter;
            }
        });
}

/**
 * explandSmartyPathAttr 替换Smarty模板中用于定位资源的标签参数
 *
 * @param content $content
 * @param tagName $tagName
 * @param attrName $attrName
 * @access public
 * @return void
 */
function explandSmartyPathAttr(content, tagName, attrName, file) {
    // /((?:^|\s)name\s*=\s*)((["']).*?\3)/
    setDelimiter();

    var attrReg = new RegExp("((?:^|\\s)" +
        pregQuote(attrName) +
        "\\s*=\\s*)(([\"\']).*?\\3)", "ig");
    content = tagFilter.filterTag(content,
        tagName, smarty_left_delimiter, smarty_right_delimiter,
        function(outter, attr) {

            attr = attr.replace(attrReg,
                function(all, preCodeHolder, valueCodeHolder) {
                    var info = fis.uri.getId(valueCodeHolder, file.dirname);
                    var ret = info.quote + info.id + info.quote;
                    return preCodeHolder + ret;
                });
            // attr = attr.replace(attrReg,
            //     preCodeHolder +
            //     fis_standard_map.id.ld +
            //     valueCodeHolder +
            //     fis_standard_map.id.rd);

            //console.log(outter, attr);
            outter = smarty_left_delimiter +
                tagName + attr +
                smarty_right_delimiter;
            //console.log(outter, attr);
            return outter;
        });

    return content;
}

/**
 * explandScriptRequirePath 替换Js中 require、require.async、require.defer 用到的路径参数
 *
 * @param content $content
 * @access public
 * @return void
 */
function explandScriptRequirePath(content, file) {
    setDelimiter();
    var requireRegStr = "(\\brequire(?:\\s*\\.\\s*(?:async|defer))?\\s*\\(\\s*)(" +
        stringRegStr + "|" +
        jsStringArrayRegStr + ")",

        //优先匹配字符串和注释
        reg = new RegExp(stringRegStr + "|" +
            jscommentRegStr + "|" +
            requireRegStr, "g");

    content = tagFilter.filterBlock(content,
        "script", smarty_left_delimiter, smarty_right_delimiter,
        function(outter, attr, inner) {
            reg.lastIndex = 0;
            inner = inner.replace(reg,
                function(all, requirePrefix, requireValueStr) {
                    var requireValue, hasBrackets = false;

                    if (requirePrefix) {

                        //判断是否有[]，有则切割,
                        requireValueStr = requireValueStr.trim().replace(/(^\[|\]$)/g, function(m, v) {
                            if (v) {
                                hasBrackets = true;
                            }
                            return '';
                        });
                        if (hasBrackets) { //Array
                            //构造数组
                            requireValue = requireValueStr.split(/\s*,\s*/);
                            all = requirePrefix +
                                "[" + requireValue.map(function(path) {
                                    var info = fis.uri.getId(path, file.dirname);
                                    var ret = info.quote + info.id + info.quote;
                                    return ret;
                                }).join(",") + "]";
                        } else { //String
                            var info = fis.uri.getId(requireValueStr, file.dirname);
                            var ret = info.quote + info.id + info.quote;
                            all = requirePrefix + ret;
                        }

                    }
                    return all;
                });

            return smarty_left_delimiter +
                "script" +
                attr +
                smarty_right_delimiter +
                inner +
                smarty_left_delimiter +
                "/script" +
                smarty_right_delimiter;
        });
    return content;
}

function explandPath(content, file, conf) {

    content = explandSmartyPathAttr(content, "html", "her", file);
    content = explandSmartyPathAttr(content, "require", "name", file);
    content = explandSmartyPathAttr(content, "widget", "name", file);
    content = explandScriptRequirePath(content, file);
    return content;
}

function analyseScript(content, file, conf) {
    setDelimiter();
    var requireRegStr = "((?:[^\\$\\.]|^)\\brequire(?:\\s*\\.\\s*(async|defer))?\\s*\\(\\s*)(" +
        stringRegStr + "|" +
        jsStringArrayRegStr + ")",

        //优先匹配字符串和注释
        reg = new RegExp(stringRegStr + "|" +
            jscommentRegStr + "|" +
            requireRegStr, "g");

    content = tagFilter.filterBlock(content,
        "script",
        smarty_left_delimiter,
        smarty_right_delimiter,
        function(outter, attr, inner) {
            var requires = {
                sync: {},
                async: {}
            };

            reg.lastIndex = 0;
            inner.replace(reg,
                function(all, requirePrefix, requireType, requireValueStr) {
                    var requireValue, holder;

                    if (requirePrefix) {

                        //先切割掉[]
                        requireValueStr = requireValueStr.trim().replace(/(^\[|\]$)/g, '');

                        //构造数组
                        requireValue = requireValueStr.split(/\s*,\s*/);


                        //try {
                        //} catch (e) {
                        //TODO Error
                        //}
                        //                        switch (typeof (requireValue)) {
                        //                            case "string": // String
                        //                                requireValue = [requireValue];
                        //                                break;
                        //                            case "object": // Array
                        //                                // nothing to do
                        //                                break;
                        //                            default:
                        //                                break;
                        //                        }

                        requireType = "require" + (requireType ? ("." + requireType) : "");

                        switch (requireType) {
                            case "require":
                                holder = requires.sync;
                                break;
                            case "require.async":
                            case "require.defer":
                                holder = requires.async;
                                break;
                            default:
                                break;
                        }

                        requireValue.forEach(function(item, index, array) {
                            holder[item] = true;
                        });
                    }
                });

            var arr, i;

            arr = [];
            for (i in requires.sync) {
                if (requires.sync.hasOwnProperty(i)) {
                    arr.push(i);
                }
            }
            attr += " sync=[" + arr.join(",") + "]";

            arr = [];
            for (i in requires.async) {
                if (requires.async.hasOwnProperty(i)) {
                    arr.push(i);
                }
            }
            attr += " async=[" + arr.join(",") + "]";

            return smarty_left_delimiter +
                "script" +
                attr +
                smarty_right_delimiter +
                inner +
                smarty_left_delimiter +
                "/script" +
                smarty_right_delimiter;
        });
    return content;
}

function defineWidget(content, file, conf) {
    setDelimiter();
    var methodReg = new RegExp("((?:^|\\s)method\\s*=\\s*)(" + stringRegStr + ")"), //创建提取method方法的正则
        nameReg = new RegExp("(?:^|\\s)name\\s*=\\s*(" + stringRegStr + ")"); //匹配widget中name的正则

    //把define替换成function，name为"_standard路径md5值_method",如没有method则取默认值__main
    content = tagFilter.filterBlock(content,
        "define", smarty_left_delimiter, smarty_right_delimiter,
        function(outter, attr, inner) {
            //把文件standard路径md5
            var md5Name = PRFIX + fis.util.md5(file.id, 32) + SUFFIX;
            //判断define中是否有method属性
            if (methodReg.test(attr)) {

                attr = attr.replace(methodReg, function(all, methodPrefix, methodValue) {
                    var info = fis.util.stringQuote(methodValue);
                    return methodPrefix.replace('method', 'name') + info.quote + md5Name + info.rest + info.quote;
                });
            } else {
                attr += ' name="' + md5Name + DEFAULT_METHOD_NAME + '"';
            }

            return smarty_left_delimiter +
                "function" +
                attr +
                smarty_right_delimiter +
                inner +
                smarty_left_delimiter +
                "/function" +
                smarty_right_delimiter;
        });

    //把widget中的method替换为为"_standard路径md5值_method"
    content = tagFilter.filterTag(content,
        "widget", smarty_left_delimiter, smarty_right_delimiter,
        function(outter, attr, inner) {
            var matches = attr.match(nameReg),
                info, widgetName;
            if (!matches) {
                throw new Error("widget must define name attribute");
            } else {
                info = fis.util.stringQuote(matches[1]);
                widgetName = PRFIX + fis.util.md5(info.rest, 32) + SUFFIX;
            }
            if (methodReg.test(attr)) {
                attr = attr.replace(methodReg, function(all, methodPrefix, methodValue) {
                    info = fis.util.stringQuote(methodValue);

                    return methodPrefix + info.quote + widgetName + info.rest + info.quote;
                });
            } else {
                attr += ' method="' + widgetName + DEFAULT_METHOD_NAME + '"';
            }

            return smarty_left_delimiter +
                "widget" +
                attr +
                smarty_right_delimiter;
        });

    return content;
}

function replaceClassName(content, file, conf) {
    setDelimiter();

    var requireRegStr = 
        "(?:\\brequire(?:\\s*)?\\s*\\(\\s*)(" +
        stringRegStr + ")\\s*\\)\\s*";
    var requireReg = new RegExp(requireRegStr); 

    // var classNameReg = /(?:^|\s)className\s*=\s*sc\(\)/g;
    var classNameRegStr = '(?:^|\\s)className\\s*=\\s*\\{sc\\('
     + '((.|\\s)*?)'
     // + "[^\(\)]*(((?'Open'\()[^\(\)]*)+((?'-Open'\)[^\(\)]*)+)*(?(Open)(?!))"
     // + '([^()})]*)' 
     + '\\)\\}';

    var classNameReg = new RegExp(classNameRegStr, 'g');

    var classTypeReg = /\.[\w-]+(\/(?:pure|public))/;

    return content.replace(classNameReg, 
        function(all, classValue){
            console.log(
                    '\nall:\n', all,
                    '\nclassValue:\n', classValue
                );
    // });

    // return tagFilter.filterBlock(content,
    //     "div", "<", ">",
    //     function(outter, attr, inner) {
            // attr = attr.replace(/\s/g, '');
            
            // var matches = attr.match(classNameReg);
            // attr = attr.replace(classNameReg, function(all, classValue){
            // if(matches){
                classValue = classValue.replace(/\s/g, '');

                var classNames = classValue.split(',');
                var classes = [];

                for(var i = 0; i < classNames.length; i++){

                    var className = classNames[i];
                    var classInfo = null;
                    var classType = '';

                    var typeMatches = className.match(classTypeReg);
                    
                    if(typeMatches){
                        classType = typeMatches[1];
                        // className = className.replace(classType, '');
                    }

                    if(classType !== '/pure'){

                        if(className.indexOf('require') < 0){
                            className = 'require(\'' + file.id.replace('tpl', 'css') + '\')' + className;
                        }

                        className = className.replace(requireReg, function(all, requireValue){
                            
                            classInfo = fis.uri.getId(requireValue, file.dirname);
                            
                            return all.replace(
                                requireValue, 
                                classInfo.quote + classInfo.id + classInfo.quote
                            );
                        });
                        className = fis.util.md5(className, 5);

                    }else{
                        className = className.replace(/^\./, '').replace(classType, '');
                    }

                    classes.push(className);
                }

                // console.log(
                //     '\nall:\n', all,
                //     '\nclassValue:\n', classValue,
                //     '\nclasses:\n', classes
                // );

                // return all;
                // return all.replace(classValue, 'class="' + classes.join(' ') + '"');
                return ' class="' + classes.join(' ') + '"';
                // console.log(classNames);
            // });

            // return '<div ' + attr + '>' + inner + '</div>';
            // return outter;
            // if (className.test(attr)) {
            //     return smarty_left_delimiter +
            //         "script" +
            //         attr.replace(className, "") +
            //         smarty_right_delimiter +
            //         inner +
            //         smarty_left_delimiter +
            //         "/script" +
            //         smarty_right_delimiter;
            // } else {
            //     return outter;
            // }
        });
}

function analyseCSS(content, file, conf){
    // if(file.basename == 'test.css'){
    //     console.log(file);
    // }

    var selectorReg = /\.[\w-]+(\/(?:pure|public))?/g;

    var cssObj = cssParser.parse(content);
    var cssRules = cssObj.stylesheet && cssObj.stylesheet.rules;

    if(cssRules && cssRules.length){
        for(var i = 0; i < cssRules.length; i++){
            var rule = cssRules[i];
            if(rule.type === 'rule'){
                var selectors = rule.selectors;

                // console.log(selectors);
                for(var j = 0; j < selectors.length; j++){
                    var selector = selectors[j];
                    // console.log('\n',selector);

                    selector = selector.replace(selectorReg, function(all, type){
                        // console.log(arguments);

                        if(type !== '/pure'){
                            all = 'require(\'' + file.id + '\')' + all;

                            all = '.' + fis.util.md5(all, 5);
                        }else{
                            all = all.replace(type, '');
                        }

                        return all;
                    });

                    selectors[j] = selector;
                }
            }
        }
    }


    // var matches = content.match(classNameReg);
    // if(matches){
    //     for(var i = 0; i < matches.length; i++){
    //         var match = matches[i];
    //         var name = 'require(\'' + file.id + '\')' + match;
    //         // name = fis.util.md5(name, 5);
    //         content = content.replace(
    //             new RegExp('' + match + '(\\s+)'), 
    //             function(all, s){
    //                 console.log('s:', match, all, s);
    //             }
    //         );
    //     }
    // }

    return cssParser.stringify(cssObj);
}

exports.replaceClassName = replaceClassName;
exports.analyseCSS = analyseCSS;
exports.replaceScriptTag = replaceScriptTag;
exports.explandPath = explandPath;
exports.analyseScript = analyseScript;
exports.defineWidget = defineWidget;
