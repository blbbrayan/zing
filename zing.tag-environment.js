(function () {
    zing.TagEnvironment = function ($tag, $guid, $html, $jstemplate) {
        var $env = {},
            $intervalfn = [],
            $interval = setInterval(function () {
                $intervalfn.forEach(function (fn) {
                    fn()
                })
            }, 100);

        function parseExpression(exp) {
            if (exp.includes("$:"))
                return "";
            return exp.split('$$').join('$env.');
        }

        //pre
        function $link() {
            $intervalfn.push(function () {
                var ar = zing.getUnder($tag, '_link');
                if (ar)
                    ar.forEach(function (ele) {
                        if (ele.innerHTML !== eval(parseExpression(ele.attributes.link.value)))
                            ele.innerHTML = eval(parseExpression(ele.attributes.link.value));
                    })
            });
        }

        function $bind() {
            $intervalfn.push(function () {
                var ar = zing.getUnder($tag, '_bind');
                if (ar)
                    ar.forEach(function (ele) {
                        if ($env[ele.attributes.bind.value] !== ele.value)
                            $env[ele.attributes.bind.value] = ele.value;
                    })
            });
        }

        function $if() {
            var templates = [];

            function toTemplate(ele, fn) {
                var temp = document.createElement('if');
                templates.push({temp: temp, ele: ele, fn: fn});
                ele.parentElement.replaceChild(temp, ele);
            }

            $intervalfn.push(function () {
                var ar = zing.getUnder($tag, '_if');
                if (ar)
                    ar.forEach(function (ele) {
                        if (!eval(parseExpression(ele.attributes.if.value)))
                            toTemplate(ele, parseExpression(ele.attributes.if.value));
                    });
                templates.forEach(function (template) {
                    if (eval(template.fn)) {
                        template.temp.parentElement.replaceChild(template.ele, template.temp);
                        templates.splice(templates.indexOf(template), 1);
                    }
                });
            })
        }

        function $for() {

            var watchers = [];

            function createClone(ele, forEle, varName, arrName, i, clones) {
                var clone = ele.cloneNode(true);
                clone.removeAttribute('for');
                zing.allUnder(clone).forEach(function (e) {
                    Array.from(e.attributes).forEach(function (attr) {
                        attr.value = attr.value.split('$:' + varName).join('$$' + arrName + '[' + i + ']');
                    });
                });
                forEle.appendChild(clone);
                clones.push(clone);
                update();
            }

            $intervalfn.push(function () {
                zing.getUnder($tag, '_for').forEach(function (ele) {
                    var elemArray = ele.attributes.for.value.split(':'),
                        arrName = elemArray[0],
                        variableName = elemArray[1],
                        forEle = document.createElement('for');
                    ele.parentElement.replaceChild(forEle, ele);

                    watchers.push({ele: ele, forEle: forEle, arrName: arrName, varName: variableName, clones: []});
                });
                watchers.forEach(function (watcher) {
                    var ar = $env[watcher.arrName];
                    while (watcher.clones.length < ar.length)
                        createClone(watcher.ele, watcher.forEle, watcher.varName, watcher.arrName, watcher.clones.length, watcher.clones);
                    while (watcher.clones.length > ar.length) {
                        var target = watcher.clones[watcher.clones.length - 1];
                        watcher.clones.splice(watcher.clones.indexOf(target), 1);
                        target.remove();
                    }
                });
            });
        }

        function handleClick(ele) {
            eval(parseExpression(ele.target.attributes.click.value));
        }

        //post
        function $click() {
            var ar = zing.getUnder($tag, '_click') || [];
            ar.forEach(function (ele) {
                ele.removeEventListener('click', handleClick);
                ele.addEventListener('click', handleClick);
            });
        }

        function update() {
            $click();
        }

        function start() {
            $for();
            $link();
            $bind();
            $if();
            eval($jstemplate);
            update();
        }

        function stop() {
            clearInterval($interval);
        }

        return {
            start: start,
            update: update,
            stop: stop
        };
    }

}());