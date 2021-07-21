/*
Copyright (C) Philippe Meyer 2019-2021
Distributed under the MIT License 

vanillaSelectBox : v0.75 : Remote search ready + local search modification : when a check on optgroup checks children only 
                           if they not excluded from search.
vanillaSelectBox : v0.72 : Remote search (WIP) bugfix [x] Select all duplicated
vanillaSelectBox : v0.71 : Remote search (WIP) better code
vanillaSelectBox : v0.70 : Remote search (WIP) for users to test
vanillaSelectBox : v0.65 : Two levels: bug fix : groups are checked/unchecked when check all/uncheck all is clicked
vanillaSelectBox : v0.64 : Two levels: groups are now checkable to check/uncheck the children options 
vanillaSelectBox : v0.63 : Two levels: one click on the group selects / unselects children
vanillaSelectBox : v0.62 : New option: maxOptionWidth set a maximum width for each option for narrow menus
vanillaSelectBox : v0.61 : New option: maxSelect, set a maximum to the selectable options in a multiple choice menu
vanillaSelectBox : v0.60 : Two levels: Optgroups are now used to show two level dropdowns 
vanillaSelectBox : v0.59 : Bug fix : search box was overlapping first item in single selects
vanillaSelectBox : v0.58 : Bug fixes
vanillaSelectBox : v0.57 : Bug fix (minWidth option not honored)
vanillaSelectBox : v0.56 : The multiselect checkboxes are a little smaller, maxWidth option is now working + added minWidth option as well
                           The button has now a style attribute to protect its appearance 
vanillaSelectBox : v0.55 : All attributes from the original select options are copied to the selectBox element
vanillaSelectBox : v0.54 : if all the options of the select are selected by the user then the check all checkbox is checked
vanillaSelectBox : v0.53 : if all the options of the select are selected then the check all checkbox is checked
vanillaSelectBox : v0.52 : Better support of select('all') => command is consistent with checkbox and selecting / deselecting while searching select / uncheck only the found items
vanillaSelectBox : v0.51 : Translations for select all/clear all + minor css corrections + don't select disabled items
vanillaSelectBox : v0.50 : PR by jaguerra2017 adding a select all/clear all check button + optgroup support !
vanillaSelectBox : v0.41 : Bug corrected, the menu content was misplaced if a css transform was applied on a parent
vanillaSelectBox : v0.40 : A click on one selectBox close the other opened boxes
vanillaSelectBox : v0.35 : You can enable and disable items
vanillaSelectBox : v0.30 : The menu stops moving around on window resize and scroll + z-index in order of creation for multiple instances
vanillaSelectBox : v0.26 : Corrected bug in stayOpen mode with disable() function
vanillaSelectBox : v0.25 : New option stayOpen, and the dropbox is no longer a dropbox but a nice multi-select
previous version : v0.24 : corrected bug affecting options with more than one class
https://github.com/PhilippeMarcMeyer/vanillaSelectBox
*/

let VSBoxCounter = function () {
    let count = 0;
    let instances = [];
    return {
        set: function (instancePtr) {
            instances.push({ offset: ++count, ptr: instancePtr });
            return instances[instances.length - 1].offset;
        },
        remove: function (instanceNr) {
            let temp = instances.filter(function (x) {
                return x.offset != instanceNr;
            })
            instances = temp.splice(0);
        },
        closeAllButMe: function (instanceNr) {
            instances.forEach(function (x) {
                if (x.offset != instanceNr) {
                    x.ptr.closeOrder();
                }
            });
        }
    };
}();

function vanillaSelectBox(domSelector, options) {
    let self = this;
    this.instanceOffset = VSBoxCounter.set(self);
    this.domSelector = domSelector;
    this.root = document.querySelector(domSelector);
    this.rootToken = null;
    this.main;
    this.button;
    this.title;
    this.isMultiple = this.root.hasAttribute("multiple");
    this.multipleSize = this.isMultiple && this.root.hasAttribute("size") ? parseInt(this.root.getAttribute("size")) : -1;
    this.isOptgroups = false;
    this.currentOptgroup = 0;
    this.drop;
    this.top;
    this.left;
    this.options;
    this.listElements;
    this.isDisabled = false;
    this.search = false;
    this.searchZone = null;
    this.inputBox = null;
    this.disabledItems = [];
    this.ulminWidth = 140;
    this.ulmaxWidth = 280;
    this.ulminHeight = 25;
    this.maxOptionWidth = Infinity;
    this.maxSelect = Infinity;
    this.isInitRemote = false;
    this.isSearchRemote = false;
    this.onInit = null;
    this.onSearch = null; // if isRemote is true : a user defined function that loads more options from the back
    this.onInitSize = null;
    this.forbidenAttributes = ["class", "selected", "disabled", "data-text", "data-value", "style"];
    this.forbidenClasses = ["active", "disabled"];
    this.userOptions = {
        maxWidth: 768,
        minWidth: -1,
        maxHeight: 400,
        translations: { "all": "All", "items": "items", "selectAll": "Select All", "clearAll": "Clear All" },
        search: false,
        placeHolder: "",
        stayOpen: false,
        disableSelectAll: false
    }
    if (options) {
        if (options.maxWidth != undefined) {
            this.userOptions.maxWidth = options.maxWidth;
        }
        if (options.minWidth != undefined) {
            this.userOptions.minWidth = options.minWidth;
        }
        if (options.maxHeight != undefined) {
            this.userOptions.maxHeight = options.maxHeight;
        }
        if (options.translations != undefined) {
            for (var property in options.translations) {
                if (options.translations.hasOwnProperty(property)) {
                    if (this.userOptions.translations[property]) {
                        this.userOptions.translations[property] = options.translations[property];
                    }
                }
            }
        }
        if (options.placeHolder != undefined) {
            this.userOptions.placeHolder = options.placeHolder;
        }
        if (options.search != undefined) {
            this.search = options.search;
        }
        if (options.remote != undefined && options.remote) {

           // user defined onInit  function
            if (options.remote.onInit!= undefined && typeof options.remote.onInit === 'function') {
                this.onInit = options.remote.onInit;
                this.isInitRemote = true;
            } 
            if (options.remote.onInitSize != undefined) {
                this.onInitSize = options.remote.onInitSize;
                if (this.onInitSize < 3) this.onInitSize = 3;
            }
            // user defined remote search function
            if (options.remote.onSearch != undefined && typeof options.remote.onSearch === 'function') {
                this.onSearch = options.remote.onSearch;
                this.isSearchRemote = true;
            }
        }

        if (options.stayOpen != undefined) {
            this.userOptions.stayOpen = options.stayOpen;
        }

        if (options.disableSelectAll != undefined) {
            this.userOptions.disableSelectAll = options.disableSelectAll;
        }

        if (options.maxSelect != undefined && !isNaN(options.maxSelect) && options.maxSelect >= 1) {
            this.maxSelect = options.maxSelect;
            this.userOptions.disableSelectAll = true;
        }

        if (options.maxOptionWidth != undefined && !isNaN(options.maxOptionWidth) && options.maxOptionWidth >= 20) {
            this.maxOptionWidth = options.maxOptionWidth;
            this.ulminWidth = options.maxOptionWidth + 60;
            this.ulmaxWidth = options.maxOptionWidth + 60;
        }
    }

    this.closeOrder = function () {
        let self = this;
        if (!self.userOptions.stayOpen) {
            self.drop.style.visibility = "hidden";
            if (self.search) {
                self.inputBox.value = "";
                Array.prototype.slice.call(self.listElements).forEach(function (x) {
                    x.classList.remove("hide");
                });
            }
        }
    }

    this.getCssArray = function (selector) {
        // Why inline css ? To protect the button display from foreign css files
        let cssArray = [];
        if (selector === ".vsb-main button") {
            cssArray = [
                { "key": "min-width", "value": "120px" },
                { "key": "border-radius", "value": "3px" },
                { "key": "width", "value": "100%" },
                { "key": "text-align", "value": "left" },
                { "key": "z-index", "value": "1" },
                { "key": "color", "value": "#333" },
                { "key": "background", "value": "white !important" },
                { "key": "border", "value": "1px solid #DCE4EE !important" },
                { "key": "line-height", "value": "20px" },
                { "key": "font-size", "value": "14px" },
                { "key": "padding", "value": "6px 12px" }
            ]
        }

        return cssArrayToString(cssArray);

        function cssArrayToString(cssList) {
            let list = "";
            cssList.forEach(function (x) {
                list += x.key + ":" + x.value + ";";
            });
            return list;
        }
    }

    this.init = function () {
        let self = this;
        if (self.isInitRemote) {
            self.onInit("",self.onInitSize)
                .then(function (data) {
                    self.buildSelect(data);
                    self.createTree();
                });
        } else {
            self.createTree();
        }
    }

    this.createTree = function () {

        this.rootToken = self.domSelector.replace(/[^A-Za-z0-9]+/, "")
        this.root.style.display = "none";
        let already = document.getElementById("btn-group-" + this.rootToken);
        if (already) {
            already.remove();
        }
        this.main = document.createElement("div");
        this.root.parentNode.insertBefore(this.main, this.root.nextSibling);
        this.main.classList.add("vsb-main");
        this.main.setAttribute("id", "btn-group-" + this.rootToken);
        this.main.style.marginLeft = this.main.style.marginLeft;
        if (self.userOptions.stayOpen) {
            this.main.style.minHeight = (this.userOptions.maxHeight + 10) + "px";
        }

        if (self.userOptions.stayOpen) {
            this.button = document.createElement("div");
        } else {
            this.button = document.createElement("button");
            var cssList = self.getCssArray(".vsb-main button");
            this.button.setAttribute("style", cssList);
        }
        this.button.style.maxWidth = this.userOptions.maxWidth + "px";
        if (this.userOptions.minWidth !== -1) {
            this.button.style.minWidth = this.userOptions.minWidth + "px";
        }

        this.main.appendChild(this.button);
        this.title = document.createElement("span");
        this.button.appendChild(this.title);
        this.title.classList.add("title");
        let caret = document.createElement("span");
        this.button.appendChild(caret);

        caret.classList.add("caret");
        caret.style.position = "absolute";
        caret.style.right = "8px";
        caret.style.marginTop = "8px";

        if (self.userOptions.stayOpen) {
            caret.style.display = "none";
            this.title.style.paddingLeft = "20px";
            this.title.style.fontStyle = "italic";
            this.title.style.verticalAlign = "20%";
        }

        this.drop = document.createElement("div");
        this.main.appendChild(this.drop);
        this.drop.classList.add("vsb-menu");
        this.drop.style.zIndex = 2000 - this.instanceOffset;
        this.ul = document.createElement("ul");
        this.drop.appendChild(this.ul);

        this.ul.style.maxHeight = this.userOptions.maxHeight + "px";
        this.ul.style.minWidth = this.ulminWidth + "px";
        this.ul.style.maxWidth = this.ulmaxWidth + "px";
        this.ul.style.minHeight = this.ulminHeight + "px";
        if (this.isMultiple) {
            this.ul.classList.add("multi");
            if (!self.userOptions.disableSelectAll) {
                let selectAll = document.createElement("option");
                selectAll.setAttribute("value", 'all');
                selectAll.innerText = self.userOptions.translations.selectAll;
                this.root.insertBefore(selectAll, (this.root.hasChildNodes())
                    ? this.root.childNodes[0]
                    : null);
            }
        }
        let selectedTexts = ""
        let sep = "";
        let nrActives = 0;

        if (this.search) {
            this.searchZone = document.createElement("div");
            this.ul.appendChild(this.searchZone);
            this.searchZone.classList.add("vsb-js-search-zone");
            this.searchZone.style.zIndex = 2001 - this.instanceOffset;
            this.inputBox = document.createElement("input");
            this.searchZone.appendChild(this.inputBox);
            this.inputBox.setAttribute("type", "text");
            this.inputBox.setAttribute("id", "search_" + this.rootToken);
            if (this.maxOptionWidth < Infinity) {
                this.searchZone.style.maxWidth = self.maxOptionWidth + 30 + "px";
                this.inputBox.style.maxWidth = self.maxOptionWidth + 30 + "px";
            }

            var para = document.createElement("p");
            this.ul.appendChild(para);
            para.style.fontSize = "12px";
            para.innerHTML = "&nbsp;";
            this.ul.addEventListener("scroll", function (e) {
                var y = this.scrollTop;
                self.searchZone.parentNode.style.top = y + "px";
            });
        }

        this.options = document.querySelectorAll(this.domSelector + " > option");
        Array.prototype.slice.call(this.options).forEach(function (x) {
            let text = x.textContent;
            let value = x.value;
            let originalAttrs;
            if (x.hasAttributes()) {
                originalAttrs = Array.prototype.slice.call(x.attributes)
                    .filter(function (a) {
                        return self.forbidenAttributes.indexOf(a.name) === -1
                    });
            }
            let classes = x.getAttribute("class");
            if (classes) {
                classes = classes
                    .split(" ")
                    .filter(function (c) {
                        return self.forbidenClasses.indexOf(c) === -1
                    });
            } else {
                classes = [];
            }
            let li = document.createElement("li");
            let isSelected = x.hasAttribute("selected");
            let isDisabled = x.hasAttribute("disabled");

            self.ul.appendChild(li);
            li.setAttribute("data-value", value);
            li.setAttribute("data-text", text);

            if (originalAttrs !== undefined) {
                originalAttrs.forEach(function (a) {
                    li.setAttribute(a.name, a.value);
                });
            }

            classes.forEach(function (x) {
                li.classList.add(x);
            });

            if (self.maxOptionWidth < Infinity) {
                li.classList.add("short");
                li.style.maxWidth = self.maxOptionWidth + "px";
            }

            if (isSelected) {
                nrActives++;
                selectedTexts += sep + text;
                sep = ",";
                li.classList.add("active");
                if (!self.isMultiple) {
                    self.title.textContent = text;
                    if (classes.length != 0) {
                        classes.forEach(function (x) {
                            self.title.classList.add(x);
                        });
                    }
                }
            }
            if (isDisabled) {
                li.classList.add("disabled");
            }
            li.appendChild(document.createTextNode(" " + text));
        });

        if (document.querySelector(this.domSelector + ' optgroup') !== null) {
            this.isOptgroups = true;
            //this.isRemote = false;// debug
            this.options = document.querySelectorAll(this.domSelector + " option");
            let groups = document.querySelectorAll(this.domSelector + ' optgroup');
            Array.prototype.slice.call(groups).forEach(function (group) {
                let groupOptions = group.querySelectorAll('option');
                let li = document.createElement("li");
                let span = document.createElement("span");
                let iCheck = document.createElement("i");
                let labelElement = document.createElement("b");
                let dataWay = group.getAttribute("data-way");
                if (!dataWay) dataWay = "closed";
                if (!dataWay || (dataWay !== "closed" && dataWay !== "open")) dataWay = "closed";
                li.appendChild(span);
                li.appendChild(iCheck);
                self.ul.appendChild(li);
                li.classList.add('grouped-option');
                li.classList.add(dataWay);
                self.currentOptgroup++;
                let optId = self.rootToken + "-opt-" + self.currentOptgroup;
                li.id = optId;
                li.appendChild(labelElement);
                labelElement.appendChild(document.createTextNode(group.label));
                li.setAttribute("data-text", group.label);
                self.ul.appendChild(li);

                Array.prototype.slice.call(groupOptions).forEach(function (x) {
                    let text = x.textContent;
                    let value = x.value;
                    let classes = x.getAttribute("class");
                    if (classes) {
                        classes = classes.split(" ");
                    }
                    else {
                        classes = [];
                    }
                    classes.push(dataWay);
                    let li = document.createElement("li");
                    let isSelected = x.hasAttribute("selected");
                    self.ul.appendChild(li);
                    li.setAttribute("data-value", value);
                    li.setAttribute("data-text", text);
                    li.setAttribute("data-parent", optId);
                    if (classes.length != 0) {
                        classes.forEach(function (x) {
                            li.classList.add(x);
                        });
                    }
                    if (isSelected) {
                        nrActives++;
                        selectedTexts += sep + text;
                        sep = ",";
                        li.classList.add("active");
                        if (!self.isMultiple) {
                            self.title.textContent = text;
                            if (classes.length != 0) {
                                classes.forEach(function (x) {
                                    self.title.classList.add(x);
                                });
                            }
                        }
                    }
                    li.appendChild(document.createTextNode(text));
                })
            })
        }

        if (self.multipleSize != -1) {
            if (nrActives > self.multipleSize) {
                let wordForItems = self.userOptions.translations.items || "items"
                selectedTexts = wordForItems + nrActives;
            }
        }
        if (self.isMultiple) {
            self.title.innerHTML = selectedTexts;
        }
        if (self.userOptions.placeHolder != "" && self.title.textContent == "") {
            self.title.textContent = self.userOptions.placeHolder;
        }
        this.listElements = this.drop.querySelectorAll("li:not(.grouped-option)");
        if (self.search) {
            self.inputBox.addEventListener("keyup", function (e) {
                let searchValue = e.target.value.toUpperCase();
                let searchValueLength = searchValue.length;
                let nrFound = 0;
                let nrChecked = 0;
                let selectAll = null;
                if (self.isSearchRemote) {
                    if (searchValueLength == 0) {
                        self.remoteSearchIntegrate(null);
                    } else if (searchValueLength >= 3) {
                        self.onSearch(searchValue)
                            .then(function (data) {
                                self.remoteSearchIntegrate(data);
                            });
                    }
                } else {
                    if (searchValueLength < 3) {
                        Array.prototype.slice.call(self.listElements).forEach(function (x) {
                            if (x.getAttribute('data-value') === 'all') {
                                selectAll = x;
                            } else {
                                x.classList.remove("hidden-search");
                                nrFound++;
                                nrChecked += x.classList.contains('active');
                            }
                        });
                    } else {
                        Array.prototype.slice.call(self.listElements).forEach(function (x) {
                            if (x.getAttribute('data-value') !== 'all') {
                                let text = x.getAttribute("data-text").toUpperCase();
                                if (text.indexOf(searchValue) === -1 && x.getAttribute('data-value') !== 'all') {
                                    x.classList.add("hidden-search");
                                } else {
                                    nrFound++;
                                    x.classList.remove("hidden-search");
                                    nrChecked += x.classList.contains('active');
                                }
                            } else {
                                selectAll = x;
                            }
                        });
                    }
                    if (selectAll) {
                        if (nrFound === 0) {
                            selectAll.classList.add('disabled');
                        } else {
                            selectAll.classList.remove('disabled');
                        }
                        if (nrChecked !== nrFound) {
                            selectAll.classList.remove("active");
                            selectAll.innerText = self.userOptions.translations.selectAll;
                            selectAll.setAttribute('data-selected', 'false')
                        } else {
                            selectAll.classList.add("active");
                            selectAll.innerText = self.userOptions.translations.clearAll;
                            selectAll.setAttribute('data-selected', 'true')
                        }
                    }
                }

            }); //
        }

        if (self.userOptions.stayOpen) {
            self.drop.style.visibility = "visible";
            self.drop.style.boxShadow = "none";
            self.drop.style.minHeight = (this.userOptions.maxHeight + 10) + "px";
            self.drop.style.position = "relative";
            self.drop.style.left = "0px";
            self.drop.style.top = "0px";
            self.button.style.border = "none";
        } else {
            this.main.addEventListener("click", function (e) {
                if (self.isDisabled) return;
                self.drop.style.left = self.left + "px";
                self.drop.style.top = self.top + "px";
                self.drop.style.visibility = "visible";
                document.addEventListener("click", docListener);
                e.preventDefault();
                e.stopPropagation();
                if (!self.userOptions.stayOpen) {
                    VSBoxCounter.closeAllButMe(self.instanceOffset);
                }
            });
        }

        this.drop.addEventListener("click", function (e) {
            if (self.isDisabled) return;
            if (e.target.tagName === 'INPUT') return;
            let isShowHideCommand = e.target.tagName === 'SPAN';
            let isCheckCommand = e.target.tagName === 'I';
            let liClicked = e.target.parentElement;
            if (!liClicked.hasAttribute("data-value")) {
                if (liClicked.classList.contains("grouped-option")) {
                    if (!isShowHideCommand && !isCheckCommand) return;
                    let oldClass, newClass;
                    if (isCheckCommand) { // check or uncheck children
                        self.checkUncheckFromParent(liClicked);
                    } else { //open or close
                        if (liClicked.classList.contains("open")) {
                            oldClass = "open"
                            newClass = "closed"
                        } else {
                            oldClass = "closed"
                            newClass = "open"
                        }
                        liClicked.classList.remove(oldClass);
                        liClicked.classList.add(newClass);
                        let theChildren = self.drop.querySelectorAll("[data-parent='" + liClicked.id + "']");
                        theChildren.forEach(function (x) {
                            x.classList.remove(oldClass);
                            x.classList.add(newClass);
                        })
                    }
                    return;
                }
            }
            let choiceValue = e.target.getAttribute("data-value");
            let choiceText = e.target.getAttribute("data-text");
            let className = e.target.getAttribute("class");

            if (className && className.indexOf("disabled") != -1) {
                return;
            }

            if (className && className.indexOf("overflow") != -1) {
                return;
            }

            if (choiceValue === 'all') {
                if (e.target.hasAttribute('data-selected')
                    && e.target.getAttribute('data-selected') === 'true') {
                    self.setValue('none')
                } else {
                    self.setValue('all');
                }
                return;
            }

            if (!self.isMultiple) {
                self.root.value = choiceValue;
                self.title.textContent = choiceText;
                if (className) {
                    self.title.setAttribute("class", className + " title");
                } else {
                    self.title.setAttribute("class", "title");
                }
                Array.prototype.slice.call(self.listElements).forEach(function (x) {
                    x.classList.remove("active");
                });
                if (choiceText != "") {
                    e.target.classList.add("active");
                }
                self.privateSendChange();
                if (!self.userOptions.stayOpen) {
                    docListener();
                }
            } else {
                let wasActive = false;
                if (className) {
                    wasActive = className.indexOf("active") != -1;
                }
                if (wasActive) {
                    e.target.classList.remove("active");
                } else {
                    e.target.classList.add("active");
                }
                if (e.target.hasAttribute("data-parent")) {
                    self.checkUncheckFromChild(e.target);
                }

                let selectedTexts = ""
                let sep = "";
                let nrActives = 0;
                let nrAll = 0;
                for (let i = 0; i < self.options.length; i++) {
                    nrAll++;
                    if (self.options[i].value == choiceValue) {
                        self.options[i].selected = !wasActive;
                    }
                    if (self.options[i].selected) {
                        nrActives++;
                        selectedTexts += sep + self.options[i].textContent;
                        sep = ",";
                    }
                }
                if (nrAll == nrActives) {
                    let wordForAll = self.userOptions.translations.all || "all";
                    selectedTexts = wordForAll;
                } else if (self.multipleSize != -1) {
                    if (nrActives > self.multipleSize) {
                        let wordForItems = self.userOptions.translations.items || "items"
                        selectedTexts = nrActives + " " + wordForItems;
                    }
                }
                self.title.textContent = selectedTexts;
                self.checkSelectMax(nrActives);
                self.checkUncheckAll();
                self.privateSendChange();
            }
            e.preventDefault();
            e.stopPropagation();
            if (self.userOptions.placeHolder != "" && self.title.textContent == "") {
                self.title.textContent = self.userOptions.placeHolder;
                self.button.classList.remove('not-empty');
            } else {
                self.button.classList.add('not-empty');
            }
        });
        function docListener() {
            document.removeEventListener("click", docListener);
            self.drop.style.visibility = "hidden";
            if (self.search) {
                self.inputBox.value = "";
                Array.prototype.slice.call(self.listElements).forEach(function (x) {
                    x.classList.remove("hidden-search");
                });
            }
        }
    }
    this.init();
    this.checkUncheckAll();
}

vanillaSelectBox.prototype.buildSelect = function (data) {
    let self = this;
    if(data == null || data.length < 1) return;
    if(!self.isOptgroups){
        self.isOptgroups = data[0].parent != undefined && data[0].parent != "";
    }
  
    if(self.isOptgroups){
        let groups = {};
        data = data.filter(function(x){
            return x.parent != undefined && x.parent != "";
        });
    
        data.forEach(function (x) {
            if(!groups[x.parent]){
                groups[x.parent] = true;
            }

        });
        for (let group in groups) {
            let anOptgroup = document.createElement("optgroup");
            anOptgroup.setAttribute("label", group);
            
            options = data.filter(function(x){
                return x.parent == group;
            });
            options.forEach(function (x) {
                let anOption = document.createElement("option");
                anOption.value = x.value;
                anOption.text = x.text;
                if(x.selected){
                    anOption.setAttribute("selected",true)
                }
                anOptgroup.appendChild(anOption);
            });
            self.root.appendChild(anOptgroup);
        }
    }else{
        data.forEach(function (x) {
            let anOption = document.createElement("option");
            anOption.value = x.value;
            anOption.text = x.text;
            if(x.selected){
                anOption.setAttribute("selected",true)
            }
            self.root.appendChild(anOption);
        });
    }
}

vanillaSelectBox.prototype.remoteSearchIntegrate = function (data) {
    let self = this;

    if (data == null || data.length == 0) {
        let dataChecked = self.optionsCheckedToData();
        if(dataChecked)
            data = dataChecked.slice(0);
        self.remoteSearchIntegrateIt(data);
    } else {
        let dataChecked = self.optionsCheckedToData();
        if (dataChecked.length > 0){
            for (var i = data.length - 1; i >= 0; i--) {
                if(dataChecked.indexOf(data[i].id) !=-1){
                    data.slice(i,1);
                }
            }
        }
        data = data.concat(dataChecked);

        self.remoteSearchIntegrateIt(data);
    }
}

vanillaSelectBox.prototype.optionsCheckedToData = function () {
    let self = this;
    let dataChecked = [];
    let treeOptions = self.ul.querySelectorAll("li.active:not(.grouped-option)");
    let keepParents = {};
        if (treeOptions) {
            Array.prototype.slice.call(treeOptions).forEach(function (x) {
                let oneData = {"value":x.getAttribute("data-value"),"text":x.getAttribute("data-text"),"selected":true};
                if(oneData.value !== "all"){
                    if(self.isOptgroups){
                        let parentId = x.getAttribute("data-parent");
                        if(keepParents[parentId]!=undefined){
                            oneData.parent = keepParents[parentId];
                        }else{
                            let parentPtr = self.ul.querySelector("#"+parentId);
                            let parentName = parentPtr.getAttribute("data-text");
                            keepParents[parentId] = parentName;
                            oneData.parent = parentName;
                        }
                    }
                    dataChecked.push(oneData);
                }

            });
        }
        return dataChecked;
}

vanillaSelectBox.prototype.removeOptionsNotChecked = function (data) {
    let self = this;
    let minimumSize = self.onInitSize;
    let newSearchSize = data == null ? 0 : data.length;
    let presentSize = self.root.length;
    if (presentSize + newSearchSize > minimumSize) {
        let maxToRemove = presentSize + newSearchSize - minimumSize - 1;
        let removed = 0;
        for (var i = self.root.length - 1; i >= 0; i--) {
            if (self.root.options[i].selected == false) {
                if (removed <= maxToRemove) {
                    removed++;
                    self.root.remove(i);
                }
            }
        }
    }
}

vanillaSelectBox.prototype.remoteSearchIntegrateIt = function (data) {
    let self = this;
    if (data == null || data.length == 0) return;
    while(self.root.firstChild)
    self.root.removeChild(self.root.firstChild);
    
    self.buildSelect(data);
    self.reloadTree();
}

vanillaSelectBox.prototype.reloadTree = function () {
    let self = this;
    let lis = self.ul.querySelectorAll("li");
    if (lis != null) {
        for (var i = lis.length - 1; i >= 0; i--) {
            if (lis[i].getAttribute('data-value') !== 'all') {
                self.ul.removeChild(lis[i]);
            }
        }
    }

    let selectedTexts = ""
    let sep = "";
    let nrActives = 0;
    let nrAll = 0;

    if (self.isOptgroups) {
        if (document.querySelector(self.domSelector + ' optgroup') !== null) {
            self.options = document.querySelectorAll(this.domSelector + " option");
            let groups = document.querySelectorAll(this.domSelector + ' optgroup');
            Array.prototype.slice.call(groups).forEach(function (group) {
                let groupOptions = group.querySelectorAll('option');
                let li = document.createElement("li");
                let span = document.createElement("span");
                let iCheck = document.createElement("i");
                let labelElement = document.createElement("b");
                let dataWay = group.getAttribute("data-way");
                if (!dataWay) dataWay = "closed";
                if (!dataWay || (dataWay !== "closed" && dataWay !== "open")) dataWay = "closed";
                li.appendChild(span);
                li.appendChild(iCheck);
                self.ul.appendChild(li);
                li.classList.add('grouped-option');
                li.classList.add(dataWay);
                self.currentOptgroup++;
                let optId = self.rootToken + "-opt-" + self.currentOptgroup;
                li.id = optId;
                li.appendChild(labelElement);
                labelElement.appendChild(document.createTextNode(group.label));
                li.setAttribute("data-text", group.label);
                self.ul.appendChild(li);

                Array.prototype.slice.call(groupOptions).forEach(function (x) {
                    let text = x.textContent;
                    let value = x.value;
                    let classes = x.getAttribute("class");
                    if (classes) {
                        classes = classes.split(" ");
                    }
                    else {
                        classes = [];
                    }
                    classes.push(dataWay);
                    let li = document.createElement("li");
                    let isSelected = x.hasAttribute("selected");
                    self.ul.appendChild(li);
                    li.setAttribute("data-value", value);
                    li.setAttribute("data-text", text);
                    li.setAttribute("data-parent", optId);
                    if (classes.length != 0) {
                        classes.forEach(function (x) {
                            li.classList.add(x);
                        });
                    }
                    if (isSelected) {
                        nrActives++;
                        selectedTexts += sep + text;
                        sep = ",";
                        li.classList.add("active");
                        if (!self.isMultiple) {
                            self.title.textContent = text;
                            if (classes.length != 0) {
                                classes.forEach(function (x) {
                                    self.title.classList.add(x);
                                });
                            }
                        }
                    }
                    li.appendChild(document.createTextNode(text));
                })
            })
        }
        self.listElements = this.drop.querySelectorAll("li:not(.grouped-option)");
    } else {

        self.options = self.root.querySelectorAll("option");
        Array.prototype.slice.call(self.options).forEach(function (x) {
            let text = x.textContent;
            let value = x.value;
            if (value != "all") {
                let originalAttrs;
                if (x.hasAttributes()) {
                    originalAttrs = Array.prototype.slice.call(x.attributes)
                        .filter(function (a) {
                            return self.forbidenAttributes.indexOf(a.name) === -1
                        });
                }
                let classes = x.getAttribute("class");
                if (classes) {
                    classes = classes
                        .split(" ")
                        .filter(function (c) {
                            return self.forbidenClasses.indexOf(c) === -1
                        });
                } else {
                    classes = [];
                }
                let li = document.createElement("li");
                let isSelected = x.hasAttribute("selected");

                let isDisabled = x.disabled;

                self.ul.appendChild(li);
                li.setAttribute("data-value", value);
                li.setAttribute("data-text", text);

                if (originalAttrs !== undefined) {
                    originalAttrs.forEach(function (a) {
                        li.setAttribute(a.name, a.value);
                    });
                }

                classes.forEach(function (x) {
                    li.classList.add(x);
                });

                if (self.maxOptionWidth < Infinity) {
                    li.classList.add("short");
                    li.style.maxWidth = self.maxOptionWidth + "px";
                }

                if (isSelected) {
                    nrActives++;
                    selectedTexts += sep + text;
                    sep = ",";
                    li.classList.add("active");
                    if (!self.isMultiple) {
                        self.title.textContent = text;
                        if (classes.length != 0) {
                            classes.forEach(function (x) {
                                self.title.classList.add(x);
                            });
                        }
                    }
                }
                if (isDisabled) {
                    li.classList.add("disabled");
                }
                li.appendChild(document.createTextNode(" " + text));
            }
        });
    }

}

vanillaSelectBox.prototype.disableItems = function (values) {
    let self = this;
    let foundValues = [];
    if (vanillaSelectBox_type(values) == "string") {
        values = values.split(",");
    }

    if (vanillaSelectBox_type(values) == "array") {
        Array.prototype.slice.call(self.options).forEach(function (x) {
            if (values.indexOf(x.value) != -1) {
                foundValues.push(x.value);
                x.setAttribute("disabled", "");
            }
        });
    }
    Array.prototype.slice.call(self.listElements).forEach(function (x) {
        let val = x.getAttribute("data-value");
        if (foundValues.indexOf(val) != -1) {
            x.classList.add("disabled");
        }
    });
}

vanillaSelectBox.prototype.enableItems = function (values) {
    let self = this;
    let foundValues = [];
    if (vanillaSelectBox_type(values) == "string") {
        values = values.split(",");
    }

    if (vanillaSelectBox_type(values) == "array") {
        Array.prototype.slice.call(self.options).forEach(function (x) {
            if (values.indexOf(x.value) != -1) {
                foundValues.push(x.value);
                x.removeAttribute("disabled");
            }
        });
    }

    Array.prototype.slice.call(self.listElements).forEach(function (x) {
        if (foundValues.indexOf(x.getAttribute("data-value")) != -1) {
            x.classList.remove("disabled");
        }
    });
}

vanillaSelectBox.prototype.checkSelectMax = function (nrActives) {
    let self = this;
    if (self.maxSelect == Infinity || !self.isMultiple) return;
    if (self.maxSelect <= nrActives) {
        Array.prototype.slice.call(self.listElements).forEach(function (x) {
            if (x.hasAttribute('data-value')) {
                if (!x.classList.contains('disabled') && !x.classList.contains('active')) {
                    x.classList.add("overflow");
                }
            }
        });
    } else {
        Array.prototype.slice.call(self.listElements).forEach(function (x) {
            if (x.classList.contains('overflow')) {
                x.classList.remove("overflow");
            }
        });
    }
}

vanillaSelectBox.prototype.checkUncheckFromChild = function (liClicked) {
    let self = this;
    let parentId = liClicked.getAttribute('data-parent');
    let parentLi = document.getElementById(parentId);
    if (!self.isMultiple) return;
    let listElements = self.drop.querySelectorAll("li");
    let childrenElements = Array.prototype.slice.call(listElements).filter(function (el) {
        return el.hasAttribute("data-parent") && el.getAttribute('data-parent') == parentId  && !el.classList.contains('hidden-search') ;
    });
    let nrChecked = 0;
    let nrCheckable = childrenElements.length;
    if (nrCheckable == 0) return;
    childrenElements.forEach(function (el) {
        if (el.classList.contains('active')) nrChecked++;
    });
    if (nrChecked === nrCheckable || nrChecked === 0) {
        if (nrChecked === 0) {
            parentLi.classList.remove("checked");
        } else {
            parentLi.classList.add("checked");
        }
    } else {
        parentLi.classList.remove("checked");
    }
}

vanillaSelectBox.prototype.checkUncheckFromParent = function (liClicked) {
    let self = this;
    let parentId = liClicked.id;
    if (!self.isMultiple) return;
    let listElements = self.drop.querySelectorAll("li");
    let childrenElements = Array.prototype.slice.call(listElements).filter(function (el) {
        return el.hasAttribute("data-parent") && el.getAttribute('data-parent') == parentId && !el.classList.contains('hidden-search');
    });
    let nrChecked = 0;
    let nrCheckable = childrenElements.length;
    if (nrCheckable == 0) return;
    childrenElements.forEach(function (el) {
        if (el.classList.contains('active')) nrChecked++;
    });
    if (nrChecked === nrCheckable || nrChecked === 0) {
        //check all or uncheckAll : just do the opposite
        childrenElements.forEach(function (el) {
            var event = document.createEvent('HTMLEvents');
            event.initEvent('click', true, false);
            el.dispatchEvent(event);
        });
        if (nrChecked === 0) {
            liClicked.classList.add("checked");
        } else {
            liClicked.classList.remove("checked");
        }
    } else {
        //check all
        liClicked.classList.remove("checked");
        childrenElements.forEach(function (el) {
            if (!el.classList.contains('active')) {
                var event = document.createEvent('HTMLEvents');
                event.initEvent('click', true, false);
                el.dispatchEvent(event);
            }
        });
    }
}

vanillaSelectBox.prototype.checkUncheckAll = function () {
    let self = this;
    if (!self.isMultiple) return;
    let nrChecked = 0;
    let nrCheckable = 0;
    let checkAllElement = null;
    if (self.listElements == null) return;
    Array.prototype.slice.call(self.listElements).forEach(function (x) {
        if (x.hasAttribute('data-value')) {
            if (x.getAttribute('data-value') === 'all') {
                checkAllElement = x;
            }
            if (x.getAttribute('data-value') !== 'all'
                && !x.classList.contains('hidden-search')
                && !x.classList.contains('disabled')) {
                nrCheckable++;
                nrChecked += x.classList.contains('active');
            }
        }
    });

    if (checkAllElement) {
        if (nrChecked === nrCheckable) {
            // check the checkAll checkbox
            checkAllElement.classList.add("active");
            checkAllElement.innerText = self.userOptions.translations.clearAll;
            checkAllElement.setAttribute('data-selected', 'true')
        } else if (nrChecked === 0) {
            // uncheck the checkAll checkbox
            self.title.textContent = self.userOptions.placeHolder;
            checkAllElement.classList.remove("active");
            checkAllElement.innerText = self.userOptions.translations.selectAll;
            checkAllElement.setAttribute('data-selected', 'false')
        }
    }
}

vanillaSelectBox.prototype.setValue = function (values) {
    let self = this;
    let listElements = self.drop.querySelectorAll("li");

    if (values == null || values == undefined || values == "") {
        self.empty();
    } else {
        if (self.isMultiple) {
            if (vanillaSelectBox_type(values) == "string") {
                if (values === "all") {
                    values = [];
                    Array.prototype.slice.call(listElements).forEach(function (x) {
                        if (x.hasAttribute('data-value')) {
                            let value = x.getAttribute('data-value');
                            if (value !== 'all') {
                                if (!x.classList.contains('hidden-search') && !x.classList.contains('disabled')) {
                                    values.push(x.getAttribute('data-value'));
                                }
                                // already checked (but hidden by search)
                                if (x.classList.contains('active')) {
                                    if (x.classList.contains('hidden-search') || x.classList.contains('disabled')) {
                                        values.push(value);
                                    }
                                }
                            }
                        } else if (x.classList.contains('grouped-option')) {
                            x.classList.add("checked");
                        }
                    });
                } else if (values === "none") {
                    values = [];
                    Array.prototype.slice.call(listElements).forEach(function (x) {
                        if (x.hasAttribute('data-value')) {
                            let value = x.getAttribute('data-value');
                            if (value !== 'all') {
                                if (x.classList.contains('active')) {
                                    if (x.classList.contains('hidden-search') || x.classList.contains('disabled')) {
                                        values.push(value);
                                    }
                                }
                            }
                        } else if (x.classList.contains('grouped-option')) {
                            x.classList.remove("checked");
                        }
                    });
                } else {
                    values = values.split(",");
                }
            }
            let foundValues = [];
            if (vanillaSelectBox_type(values) == "array") {
                Array.prototype.slice.call(self.options).forEach(function (x) {
                    if (values.indexOf(x.value) !== -1) {
                        x.selected = true;
                        foundValues.push(x.value);
                    } else {
                        x.selected = false;
                    }
                });
                let selectedTexts = ""
                let sep = "";
                let nrActives = 0;
                let nrAll = 0;
                Array.prototype.slice.call(listElements).forEach(function (x) {
                    nrAll++;
                    if (foundValues.indexOf(x.getAttribute("data-value")) != -1) {
                        x.classList.add("active");
                        nrActives++;
                        selectedTexts += sep + x.getAttribute("data-text");
                        sep = ",";
                    } else {
                        x.classList.remove("active");
                    }
                });
                if (nrAll == nrActives) {
                    let wordForAll = self.userOptions.translations.all || "all";
                    selectedTexts = wordForAll;
                } else if (self.multipleSize != -1) {
                    if (nrActives > self.multipleSize) {
                        let wordForItems = self.userOptions.translations.items || "items"
                        selectedTexts = nrActives + " " + wordForItems;
                    }
                }
                self.title.textContent = selectedTexts;
                self.privateSendChange();
            }
            self.checkUncheckAll();
        } else {
            let found = false;
            let text = "";
            let classNames = ""
            Array.prototype.slice.call(listElements).forEach(function (x) {
                if (x.getAttribute("data-value") == values) {
                    x.classList.add("active");
                    found = true;
                    text = x.getAttribute("data-text")
                } else {
                    x.classList.remove("active");
                }
            });
            Array.prototype.slice.call(self.options).forEach(function (x) {
                if (x.value == values) {
                    x.selected = true;
                    className = x.getAttribute("class");
                    if (!className) className = "";
                } else {
                    x.selected = false;
                }
            });
            if (found) {
                self.title.textContent = text;
                if (self.userOptions.placeHolder != "" && self.title.textContent == "") {
                    self.title.textContent = self.userOptions.placeHolder;
                }
                if (className != "") {
                    self.title.setAttribute("class", className + " title");
                } else {
                    self.title.setAttribute("class", "title");
                }
            }
        }
    }
}

vanillaSelectBox.prototype.privateSendChange = function () {
    let event = document.createEvent('HTMLEvents');
    event.initEvent('change', true, false);
    this.root.dispatchEvent(event);
}

vanillaSelectBox.prototype.empty = function () {
    Array.prototype.slice.call(this.listElements).forEach(function (x) {
        x.classList.remove("active");
    });
    Array.prototype.slice.call(this.options).forEach(function (x) {
        x.selected = false;
    });
    this.title.textContent = "";
    if (this.userOptions.placeHolder != "" && this.title.textContent == "") {
        this.title.textContent = this.userOptions.placeHolder;
    }
    this.checkUncheckAll();
    this.privateSendChange();
}

vanillaSelectBox.prototype.destroy = function () {
    let already = document.getElementById("btn-group-" + this.rootToken);
    if (already) {
        VSBoxCounter.remove(this.instanceOffset);
        already.remove();
        this.root.style.display = "inline-block";
    }
}
vanillaSelectBox.prototype.disable = function () {
    let already = document.getElementById("btn-group-" + this.rootToken);
    if (already) {
        button = already.querySelector("button")
        if (button) button.classList.add("disabled");
        this.isDisabled = true;
    }
}
vanillaSelectBox.prototype.enable = function () {
    let already = document.getElementById("btn-group-" + this.rootToken);
    if (already) {
        button = already.querySelector("button")
        if (button) button.classList.remove("disabled");
        this.isDisabled = false;
    }
}

vanillaSelectBox.prototype.showOptions = function () {
    console.log(this.userOptions);
}
// Polyfills for IE
if (!('remove' in Element.prototype)) {
    Element.prototype.remove = function () {
        if (this.parentNode) {
            this.parentNode.removeChild(this);
        }
    };
}

function vanillaSelectBox_type(target) {
    const computedType = Object.prototype.toString.call(target);
    const stripped = computedType.replace("[object ", "").replace("]", "");
    const lowercased = stripped.toLowerCase();
    return lowercased;
}

!function(t,e){"object"==typeof exports&&"undefined"!=typeof module?e(exports):"function"==typeof define&&define.amd?define(["exports"],e):e((t="undefined"!=typeof globalThis?globalThis:t||self).noUiSlider={})}(this,function(st){"use strict";var t,e;function n(t){return"object"==typeof t&&"function"==typeof t.to}function at(t){t.parentElement.removeChild(t)}function lt(t){return null!=t}function ut(t){t.preventDefault()}function o(t){return"number"==typeof t&&!isNaN(t)&&isFinite(t)}function ct(t,e,r){0<r&&(dt(t,e),setTimeout(function(){ht(t,e)},r))}function pt(t){return Math.max(Math.min(t,100),0)}function ft(t){return Array.isArray(t)?t:[t]}function r(t){var e=(t=String(t)).split(".");return 1<e.length?e[1].length:0}function dt(t,e){t.classList&&!/\s/.test(e)?t.classList.add(e):t.className+=" "+e}function ht(t,e){t.classList&&!/\s/.test(e)?t.classList.remove(e):t.className=t.className.replace(new RegExp("(^|\\b)"+e.split(" ").join("|")+"(\\b|$)","gi")," ")}function mt(t){var e=void 0!==window.pageXOffset,r="CSS1Compat"===(t.compatMode||"");return{x:e?window.pageXOffset:r?t.documentElement.scrollLeft:t.body.scrollLeft,y:e?window.pageYOffset:r?t.documentElement.scrollTop:t.body.scrollTop}}function c(t,e){return 100/(e-t)}function p(t,e,r){return 100*e/(t[r+1]-t[r])}function f(t,e){for(var r=1;t>=e[r];)r+=1;return r}function i(t,e,r){if(r>=t.slice(-1)[0])return 100;var n,i,o=f(r,t),s=t[o-1],a=t[o],l=e[o-1],u=e[o];return l+(i=r,p(n=[s,a],n[0]<0?i+Math.abs(n[0]):i-n[0],0)/c(l,u))}function s(t,e,r,n){if(100===n)return n;var i,o,s=f(n,t),a=t[s-1],l=t[s];return r?(l-a)/2<n-a?l:a:e[s-1]?t[s-1]+(i=n-t[s-1],o=e[s-1],Math.round(i/o)*o):n}st.PipsMode=void 0,(t=st.PipsMode||(st.PipsMode={})).Range="range",t.Steps="steps",t.Positions="positions",t.Count="count",t.Values="values",st.PipsType=void 0,(e=st.PipsType||(st.PipsType={}))[e.None=-1]="None",e[e.NoValue=0]="NoValue",e[e.LargeValue=1]="LargeValue",e[e.SmallValue=2]="SmallValue";var a=function(){function t(e,t,r){var n;this.xPct=[],this.xVal=[],this.xSteps=[],this.xNumSteps=[],this.xHighestCompleteStep=[],this.xSteps=[r||!1],this.xNumSteps=[!1],this.snap=t;var i=[];for(Object.keys(e).forEach(function(t){i.push([ft(e[t]),t])}),i.sort(function(t,e){return t[0][0]-e[0][0]}),n=0;n<i.length;n++)this.handleEntryPoint(i[n][1],i[n][0]);for(this.xNumSteps=this.xSteps.slice(0),n=0;n<this.xNumSteps.length;n++)this.handleStepPoint(n,this.xNumSteps[n])}return t.prototype.getDistance=function(t){var e,r=[];for(e=0;e<this.xNumSteps.length-1;e++){var n=this.xNumSteps[e];if(n&&t/n%1!=0)throw new Error("noUiSlider: 'limit', 'margin' and 'padding' of "+this.xPct[e]+"% range must be divisible by step.");r[e]=p(this.xVal,t,e)}return r},t.prototype.getAbsoluteDistance=function(t,e,r){var n,i=0;if(t<this.xPct[this.xPct.length-1])for(;t>this.xPct[i+1];)i++;else t===this.xPct[this.xPct.length-1]&&(i=this.xPct.length-2);r||t!==this.xPct[i+1]||i++,null===e&&(e=[]);var o=1,s=e[i],a=0,l=0,u=0,c=0;for(n=r?(t-this.xPct[i])/(this.xPct[i+1]-this.xPct[i]):(this.xPct[i+1]-t)/(this.xPct[i+1]-this.xPct[i]);0<s;)a=this.xPct[i+1+c]-this.xPct[i+c],100<e[i+c]*o+100-100*n?(l=a*n,o=(s-100*n)/e[i+c],n=1):(l=e[i+c]*a/100*o,o=0),r?(u-=l,1<=this.xPct.length+c&&c--):(u+=l,1<=this.xPct.length-c&&c++),s=e[i+c]*o;return t+u},t.prototype.toStepping=function(t){return t=i(this.xVal,this.xPct,t)},t.prototype.fromStepping=function(t){return function(t,e,r){if(100<=r)return t.slice(-1)[0];var n,i=f(r,e),o=t[i-1],s=t[i],a=e[i-1],l=e[i];return n=[o,s],(r-a)*c(a,l)*(n[1]-n[0])/100+n[0]}(this.xVal,this.xPct,t)},t.prototype.getStep=function(t){return t=s(this.xPct,this.xSteps,this.snap,t)},t.prototype.getDefaultStep=function(t,e,r){var n=f(t,this.xPct);return(100===t||e&&t===this.xPct[n-1])&&(n=Math.max(n-1,1)),(this.xVal[n]-this.xVal[n-1])/r},t.prototype.getNearbySteps=function(t){var e=f(t,this.xPct);return{stepBefore:{startValue:this.xVal[e-2],step:this.xNumSteps[e-2],highestStep:this.xHighestCompleteStep[e-2]},thisStep:{startValue:this.xVal[e-1],step:this.xNumSteps[e-1],highestStep:this.xHighestCompleteStep[e-1]},stepAfter:{startValue:this.xVal[e],step:this.xNumSteps[e],highestStep:this.xHighestCompleteStep[e]}}},t.prototype.countStepDecimals=function(){var t=this.xNumSteps.map(r);return Math.max.apply(null,t)},t.prototype.convert=function(t){return this.getStep(this.toStepping(t))},t.prototype.handleEntryPoint=function(t,e){var r;if(!o(r="min"===t?0:"max"===t?100:parseFloat(t))||!o(e[0]))throw new Error("noUiSlider: 'range' value isn't numeric.");this.xPct.push(r),this.xVal.push(e[0]);var n=Number(e[1]);r?this.xSteps.push(!isNaN(n)&&n):isNaN(n)||(this.xSteps[0]=n),this.xHighestCompleteStep.push(0)},t.prototype.handleStepPoint=function(t,e){if(e)if(this.xVal[t]!==this.xVal[t+1]){this.xSteps[t]=p([this.xVal[t],this.xVal[t+1]],e,0)/c(this.xPct[t],this.xPct[t+1]);var r=(this.xVal[t+1]-this.xVal[t])/this.xNumSteps[t],n=Math.ceil(Number(r.toFixed(3))-1),i=this.xVal[t]+this.xNumSteps[t]*n;this.xHighestCompleteStep[t]=i}else this.xSteps[t]=this.xHighestCompleteStep[t]=this.xVal[t]},t}(),l={to:function(t){return void 0===t?"":t.toFixed(2)},from:Number},u={target:"target",base:"base",origin:"origin",handle:"handle",handleLower:"handle-lower",handleUpper:"handle-upper",touchArea:"touch-area",horizontal:"horizontal",vertical:"vertical",background:"background",connect:"connect",connects:"connects",ltr:"ltr",rtl:"rtl",textDirectionLtr:"txt-dir-ltr",textDirectionRtl:"txt-dir-rtl",draggable:"draggable",drag:"state-drag",tap:"state-tap",active:"active",tooltip:"tooltip",pips:"pips",pipsHorizontal:"pips-horizontal",pipsVertical:"pips-vertical",marker:"marker",markerHorizontal:"marker-horizontal",markerVertical:"marker-vertical",markerNormal:"marker-normal",markerLarge:"marker-large",markerSub:"marker-sub",value:"value",valueHorizontal:"value-horizontal",valueVertical:"value-vertical",valueNormal:"value-normal",valueLarge:"value-large",valueSub:"value-sub"},gt={tooltips:".__tooltips",aria:".__aria"};function d(t,e){if(!o(e))throw new Error("noUiSlider: 'step' is not numeric.");t.singleStep=e}function h(t,e){if(!o(e))throw new Error("noUiSlider: 'keyboardPageMultiplier' is not numeric.");t.keyboardPageMultiplier=e}function m(t,e){if(!o(e))throw new Error("noUiSlider: 'keyboardDefaultStep' is not numeric.");t.keyboardDefaultStep=e}function g(t,e){if("object"!=typeof e||Array.isArray(e))throw new Error("noUiSlider: 'range' is not an object.");if(void 0===e.min||void 0===e.max)throw new Error("noUiSlider: Missing 'min' or 'max' in 'range'.");if(e.min===e.max)throw new Error("noUiSlider: 'range' 'min' and 'max' cannot be equal.");t.spectrum=new a(e,t.snap||!1,t.singleStep)}function v(t,e){if(e=ft(e),!Array.isArray(e)||!e.length)throw new Error("noUiSlider: 'start' option is incorrect.");t.handles=e.length,t.start=e}function b(t,e){if("boolean"!=typeof e)throw new Error("noUiSlider: 'snap' option must be a boolean.");t.snap=e}function S(t,e){if("boolean"!=typeof e)throw new Error("noUiSlider: 'animate' option must be a boolean.");t.animate=e}function x(t,e){if("number"!=typeof e)throw new Error("noUiSlider: 'animationDuration' option must be a number.");t.animationDuration=e}function y(t,e){var r,n=[!1];if("lower"===e?e=[!0,!1]:"upper"===e&&(e=[!1,!0]),!0===e||!1===e){for(r=1;r<t.handles;r++)n.push(e);n.push(!1)}else{if(!Array.isArray(e)||!e.length||e.length!==t.handles+1)throw new Error("noUiSlider: 'connect' option doesn't match handle count.");n=e}t.connect=n}function w(t,e){switch(e){case"horizontal":t.ort=0;break;case"vertical":t.ort=1;break;default:throw new Error("noUiSlider: 'orientation' option is invalid.")}}function E(t,e){if(!o(e))throw new Error("noUiSlider: 'margin' option must be numeric.");0!==e&&(t.margin=t.spectrum.getDistance(e))}function P(t,e){if(!o(e))throw new Error("noUiSlider: 'limit' option must be numeric.");if(t.limit=t.spectrum.getDistance(e),!t.limit||t.handles<2)throw new Error("noUiSlider: 'limit' option is only supported on linear sliders with 2 or more handles.")}function C(t,e){var r;if(!o(e)&&!Array.isArray(e))throw new Error("noUiSlider: 'padding' option must be numeric or array of exactly 2 numbers.");if(Array.isArray(e)&&2!==e.length&&!o(e[0])&&!o(e[1]))throw new Error("noUiSlider: 'padding' option must be numeric or array of exactly 2 numbers.");if(0!==e){for(Array.isArray(e)||(e=[e,e]),t.padding=[t.spectrum.getDistance(e[0]),t.spectrum.getDistance(e[1])],r=0;r<t.spectrum.xNumSteps.length-1;r++)if(t.padding[0][r]<0||t.padding[1][r]<0)throw new Error("noUiSlider: 'padding' option must be a positive number(s).");var n=e[0]+e[1],i=t.spectrum.xVal[0];if(1<n/(t.spectrum.xVal[t.spectrum.xVal.length-1]-i))throw new Error("noUiSlider: 'padding' option must not exceed 100% of the range.")}}function N(t,e){switch(e){case"ltr":t.dir=0;break;case"rtl":t.dir=1;break;default:throw new Error("noUiSlider: 'direction' option was not recognized.")}}function V(t,e){if("string"!=typeof e)throw new Error("noUiSlider: 'behaviour' must be a string containing options.");var r=0<=e.indexOf("tap"),n=0<=e.indexOf("drag"),i=0<=e.indexOf("fixed"),o=0<=e.indexOf("snap"),s=0<=e.indexOf("hover"),a=0<=e.indexOf("unconstrained");if(i){if(2!==t.handles)throw new Error("noUiSlider: 'fixed' behaviour must be used with 2 handles");E(t,t.start[1]-t.start[0])}if(a&&(t.margin||t.limit))throw new Error("noUiSlider: 'unconstrained' behaviour cannot be used with margin or limit");t.events={tap:r||o,drag:n,fixed:i,snap:o,hover:s,unconstrained:a}}function k(t,e){if(!1!==e)if(!0===e||n(e)){t.tooltips=[];for(var r=0;r<t.handles;r++)t.tooltips.push(e)}else{if((e=ft(e)).length!==t.handles)throw new Error("noUiSlider: must pass a formatter for all handles.");e.forEach(function(t){if("boolean"!=typeof t&&!n(t))throw new Error("noUiSlider: 'tooltips' must be passed a formatter or 'false'.")}),t.tooltips=e}}function U(t,e){if(!n(e))throw new Error("noUiSlider: 'ariaFormat' requires 'to' method.");t.ariaFormat=e}function M(t,e){if(!n(r=e)||"function"!=typeof r.from)throw new Error("noUiSlider: 'format' requires 'to' and 'from' methods.");var r;t.format=e}function A(t,e){if("boolean"!=typeof e)throw new Error("noUiSlider: 'keyboardSupport' option must be a boolean.");t.keyboardSupport=e}function D(t,e){t.documentElement=e}function L(t,e){if("string"!=typeof e&&!1!==e)throw new Error("noUiSlider: 'cssPrefix' must be a string or `false`.");t.cssPrefix=e}function T(e,r){if("object"!=typeof r)throw new Error("noUiSlider: 'cssClasses' must be an object.");"string"==typeof e.cssPrefix?(e.cssClasses={},Object.keys(r).forEach(function(t){e.cssClasses[t]=e.cssPrefix+r[t]})):e.cssClasses=r}function vt(e){var r={margin:null,limit:null,padding:null,animate:!0,animationDuration:300,ariaFormat:l,format:l},n={step:{r:!1,t:d},keyboardPageMultiplier:{r:!1,t:h},keyboardDefaultStep:{r:!1,t:m},start:{r:!0,t:v},connect:{r:!0,t:y},direction:{r:!0,t:N},snap:{r:!1,t:b},animate:{r:!1,t:S},animationDuration:{r:!1,t:x},range:{r:!0,t:g},orientation:{r:!1,t:w},margin:{r:!1,t:E},limit:{r:!1,t:P},padding:{r:!1,t:C},behaviour:{r:!0,t:V},ariaFormat:{r:!1,t:U},format:{r:!1,t:M},tooltips:{r:!1,t:k},keyboardSupport:{r:!0,t:A},documentElement:{r:!1,t:D},cssPrefix:{r:!0,t:L},cssClasses:{r:!0,t:T}},i={connect:!1,direction:"ltr",behaviour:"tap",orientation:"horizontal",keyboardSupport:!0,cssPrefix:"noUi-",cssClasses:u,keyboardPageMultiplier:5,keyboardDefaultStep:10};e.format&&!e.ariaFormat&&(e.ariaFormat=e.format),Object.keys(n).forEach(function(t){if(lt(e[t])||void 0!==i[t])n[t].t(r,lt(e[t])?e[t]:i[t]);else if(n[t].r)throw new Error("noUiSlider: '"+t+"' is required.")}),r.pips=e.pips;var t=document.createElement("div"),o=void 0!==t.style.msTransform,s=void 0!==t.style.transform;r.transformRule=s?"transform":o?"msTransform":"webkitTransform";return r.style=[["left","top"],["right","bottom"]][r.dir][r.ort],r}function O(t,b,o){var l,u,s,i,a,e,c,p=window.navigator.pointerEnabled?{start:"pointerdown",move:"pointermove",end:"pointerup"}:window.navigator.msPointerEnabled?{start:"MSPointerDown",move:"MSPointerMove",end:"MSPointerUp"}:{start:"mousedown touchstart",move:"mousemove touchmove",end:"mouseup touchend"},f=window.CSS&&CSS.supports&&CSS.supports("touch-action","none")&&function(){var t=!1;try{var e=Object.defineProperty({},"passive",{get:function(){t=!0}});window.addEventListener("test",null,e)}catch(t){}return t}(),d=t,y=b.spectrum,S=[],x=[],h=[],m=0,g={},v=t.ownerDocument,w=b.documentElement||v.documentElement,E=v.body,P="rtl"===v.dir||1===b.ort?0:100;function C(t,e){var r=v.createElement("div");return e&&dt(r,e),t.appendChild(r),r}function N(t,e){var r=C(t,b.cssClasses.origin),n=C(r,b.cssClasses.handle);return C(n,b.cssClasses.touchArea),n.setAttribute("data-handle",String(e)),b.keyboardSupport&&(n.setAttribute("tabindex","0"),n.addEventListener("keydown",function(t){return function(t,e){if(k()||U(e))return!1;var r=["Left","Right"],n=["Down","Up"],i=["PageDown","PageUp"],o=["Home","End"];b.dir&&!b.ort?r.reverse():b.ort&&!b.dir&&(n.reverse(),i.reverse());var s,a=t.key.replace("Arrow",""),l=a===i[0],u=a===i[1],c=a===n[0]||a===r[0]||l,p=a===n[1]||a===r[1]||u,f=a===o[0],d=a===o[1];if(!(c||p||f||d))return!0;if(t.preventDefault(),p||c){var h=b.keyboardPageMultiplier,m=c?0:1,g=it(e),v=g[m];if(null===v)return!1;!1===v&&(v=y.getDefaultStep(x[e],c,b.keyboardDefaultStep)),(u||l)&&(v*=h),v=Math.max(v,1e-7),v*=c?-1:1,s=S[e]+v}else s=d?b.spectrum.xVal[b.spectrum.xVal.length-1]:b.spectrum.xVal[0];return Z(e,y.toStepping(s),!0,!0),W("slide",e),W("update",e),W("change",e),W("set",e),!1}(t,e)})),n.setAttribute("role","slider"),n.setAttribute("aria-orientation",b.ort?"vertical":"horizontal"),0===e?dt(n,b.cssClasses.handleLower):e===b.handles-1&&dt(n,b.cssClasses.handleUpper),r}function V(t,e){return!!e&&C(t,b.cssClasses.connect)}function r(t,e){return!(!b.tooltips||!b.tooltips[e])&&C(t.firstChild,b.cssClasses.tooltip)}function k(){return d.hasAttribute("disabled")}function U(t){return u[t].hasAttribute("disabled")}function M(){a&&(I("update"+gt.tooltips),a.forEach(function(t){t&&at(t)}),a=null)}function A(){M(),a=u.map(r),Y("update"+gt.tooltips,function(t,e,r){if(a&&b.tooltips&&!1!==a[e]){var n=t[e];!0!==b.tooltips[e]&&(n=b.tooltips[e].to(r[e])),a[e].innerHTML=n}})}function D(t,e){return t.map(function(t){return y.fromStepping(e?y.getStep(t):t)})}function L(m){var g=function(t){if(t.mode===st.PipsMode.Range||t.mode===st.PipsMode.Steps)return y.xVal;if(t.mode!==st.PipsMode.Count)return t.mode===st.PipsMode.Positions?D(t.values,t.stepped):t.mode===st.PipsMode.Values?t.stepped?t.values.map(function(t){return y.fromStepping(y.getStep(y.toStepping(t)))}):t.values:[];if(t.values<2)throw new Error("noUiSlider: 'values' (>= 2) required for mode 'count'.");for(var e=t.values-1,r=100/e,n=[];e--;)n[e]=e*r;return n.push(100),D(n,t.stepped)}(m),v={},t=y.xVal[0],e=y.xVal[y.xVal.length-1],b=!1,S=!1,x=0;return(g=g.slice().sort(function(t,e){return t-e}).filter(function(t){return!this[t]&&(this[t]=!0)},{}))[0]!==t&&(g.unshift(t),b=!0),g[g.length-1]!==e&&(g.push(e),S=!0),g.forEach(function(t,e){var r,n,i,o,s,a,l,u,c,p,f=t,d=g[e+1],h=m.mode===st.PipsMode.Steps;for(h&&(r=y.xNumSteps[e]),r||(r=d-f),void 0===d&&(d=f),r=Math.max(r,1e-7),n=f;n<=d;n=Number((n+r).toFixed(7))){for(u=(s=(o=y.toStepping(n))-x)/(m.density||1),p=s/(c=Math.round(u)),i=1;i<=c;i+=1)v[(a=x+i*p).toFixed(5)]=[y.fromStepping(a),0];l=-1<g.indexOf(n)?st.PipsType.LargeValue:h?st.PipsType.SmallValue:st.PipsType.NoValue,!e&&b&&n!==d&&(l=0),n===d&&S||(v[o.toFixed(5)]=[n,l]),x=o}}),v}function T(e,i,o){var t,r,s=v.createElement("div"),a=((t={})[st.PipsType.None]="",t[st.PipsType.NoValue]=b.cssClasses.valueNormal,t[st.PipsType.LargeValue]=b.cssClasses.valueLarge,t[st.PipsType.SmallValue]=b.cssClasses.valueSub,t),l=((r={})[st.PipsType.None]="",r[st.PipsType.NoValue]=b.cssClasses.markerNormal,r[st.PipsType.LargeValue]=b.cssClasses.markerLarge,r[st.PipsType.SmallValue]=b.cssClasses.markerSub,r),u=[b.cssClasses.valueHorizontal,b.cssClasses.valueVertical],c=[b.cssClasses.markerHorizontal,b.cssClasses.markerVertical];function p(t,e){var r=e===b.cssClasses.value,n=r?a:l;return e+" "+(r?u:c)[b.ort]+" "+n[t]}return dt(s,b.cssClasses.pips),dt(s,0===b.ort?b.cssClasses.pipsHorizontal:b.cssClasses.pipsVertical),Object.keys(e).forEach(function(t){!function(t,e,r){if((r=i?i(e,r):r)!==st.PipsType.None){var n=C(s,!1);n.className=p(r,b.cssClasses.marker),n.style[b.style]=t+"%",r>st.PipsType.NoValue&&((n=C(s,!1)).className=p(r,b.cssClasses.value),n.setAttribute("data-value",String(e)),n.style[b.style]=t+"%",n.innerHTML=String(o.to(e)))}}(t,e[t][0],e[t][1])}),s}function O(){i&&(at(i),i=null)}function j(t){O();var e=L(t),r=t.filter,n=t.format||{to:function(t){return String(Math.round(t))}};return i=d.appendChild(T(e,r,n))}function z(){var t=l.getBoundingClientRect(),e="offset"+["Width","Height"][b.ort];return 0===b.ort?t.width||l[e]:t.height||l[e]}function H(i,o,s,a){var e=function(t){var e,r,n=function(r,t,n){var e=0===r.type.indexOf("touch"),i=0===r.type.indexOf("mouse"),o=0===r.type.indexOf("pointer"),s=0,a=0;0===r.type.indexOf("MSPointer")&&(o=!0);if("mousedown"===r.type&&!r.buttons&&!r.touches)return!1;if(e){var l=function(t){var e=t.target;return e===n||n.contains(e)||r.composed&&r.composedPath().shift()===n};if("touchstart"===r.type){var u=Array.prototype.filter.call(r.touches,l);if(1<u.length)return!1;s=u[0].pageX,a=u[0].pageY}else{var c=Array.prototype.find.call(r.changedTouches,l);if(!c)return!1;s=c.pageX,a=c.pageY}}t=t||mt(v),(i||o)&&(s=r.clientX+t.x,a=r.clientY+t.y);return r.pageOffset=t,r.points=[s,a],r.cursor=i||o,r}(t,a.pageOffset,a.target||o);return!!n&&(!(k()&&!a.doNotReject)&&(e=d,r=b.cssClasses.tap,!((e.classList?e.classList.contains(r):new RegExp("\\b"+r+"\\b").test(e.className))&&!a.doNotReject)&&(!(i===p.start&&void 0!==n.buttons&&1<n.buttons)&&((!a.hover||!n.buttons)&&(f||n.preventDefault(),n.calcPoint=n.points[b.ort],void s(n,a))))))},r=[];return i.split(" ").forEach(function(t){o.addEventListener(t,e,!!f&&{passive:!0}),r.push([t,e])}),r}function F(t){var e,r,n,i,o,s,a=100*(t-(e=l,r=b.ort,n=e.getBoundingClientRect(),i=e.ownerDocument,o=i.documentElement,s=mt(i),/webkit.*Chrome.*Mobile/i.test(navigator.userAgent)&&(s.x=0),r?n.top+s.y-o.clientTop:n.left+s.x-o.clientLeft))/z();return a=pt(a),b.dir?100-a:a}function R(t,e){"mouseout"===t.type&&"HTML"===t.target.nodeName&&null===t.relatedTarget&&q(t,e)}function _(t,e){if(-1===navigator.appVersion.indexOf("MSIE 9")&&0===t.buttons&&0!==e.buttonsProperty)return q(t,e);var r=(b.dir?-1:1)*(t.calcPoint-e.startCalcPoint);J(0<r,100*r/e.baseSize,e.locations,e.handleNumbers,e.connect)}function q(t,e){e.handle&&(ht(e.handle,b.cssClasses.active),m-=1),e.listeners.forEach(function(t){w.removeEventListener(t[0],t[1])}),0===m&&(ht(d,b.cssClasses.drag),Q(),t.cursor&&(E.style.cursor="",E.removeEventListener("selectstart",ut))),e.handleNumbers.forEach(function(t){W("change",t),W("set",t),W("end",t)})}function B(t,e){if(!e.handleNumbers.some(U)){var r;if(1===e.handleNumbers.length)r=u[e.handleNumbers[0]].children[0],m+=1,dt(r,b.cssClasses.active);t.stopPropagation();var n=[],i=H(p.move,w,_,{target:t.target,handle:r,connect:e.connect,listeners:n,startCalcPoint:t.calcPoint,baseSize:z(),pageOffset:t.pageOffset,handleNumbers:e.handleNumbers,buttonsProperty:t.buttons,locations:x.slice()}),o=H(p.end,w,q,{target:t.target,handle:r,listeners:n,doNotReject:!0,handleNumbers:e.handleNumbers}),s=H("mouseout",w,R,{target:t.target,handle:r,listeners:n,doNotReject:!0,handleNumbers:e.handleNumbers});n.push.apply(n,i.concat(o,s)),t.cursor&&(E.style.cursor=getComputedStyle(t.target).cursor,1<u.length&&dt(d,b.cssClasses.drag),E.addEventListener("selectstart",ut,!1)),e.handleNumbers.forEach(function(t){W("start",t)})}}function n(t){t.stopPropagation();var i,o,s,e=F(t.calcPoint),r=(i=e,s=!(o=100),u.forEach(function(t,e){if(!U(e)){var r=x[e],n=Math.abs(r-i);(n<o||n<=o&&r<i||100===n&&100===o)&&(s=e,o=n)}}),s);!1!==r&&(b.events.snap||ct(d,b.cssClasses.tap,b.animationDuration),Z(r,e,!0,!0),Q(),W("slide",r,!0),W("update",r,!0),W("change",r,!0),W("set",r,!0),b.events.snap&&B(t,{handleNumbers:[r]}))}function X(t){var e=F(t.calcPoint),r=y.getStep(e),n=y.fromStepping(r);Object.keys(g).forEach(function(t){"hover"===t.split(".")[0]&&g[t].forEach(function(t){t.call(ot,n)})})}function Y(t,e){g[t]=g[t]||[],g[t].push(e),"update"===t.split(".")[0]&&u.forEach(function(t,e){W("update",e)})}function I(t){var i=t&&t.split(".")[0],o=i?t.substring(i.length):t;Object.keys(g).forEach(function(t){var e,r=t.split(".")[0],n=t.substring(r.length);i&&i!==r||o&&o!==n||((e=n)!==gt.aria&&e!==gt.tooltips||o===n)&&delete g[t]})}function W(r,n,i){Object.keys(g).forEach(function(t){var e=t.split(".")[0];r===e&&g[t].forEach(function(t){t.call(ot,S.map(b.format.to),n,S.slice(),i||!1,x.slice(),ot)})})}function $(t,e,r,n,i,o){var s;return 1<u.length&&!b.events.unconstrained&&(n&&0<e&&(s=y.getAbsoluteDistance(t[e-1],b.margin,!1),r=Math.max(r,s)),i&&e<u.length-1&&(s=y.getAbsoluteDistance(t[e+1],b.margin,!0),r=Math.min(r,s))),1<u.length&&b.limit&&(n&&0<e&&(s=y.getAbsoluteDistance(t[e-1],b.limit,!1),r=Math.min(r,s)),i&&e<u.length-1&&(s=y.getAbsoluteDistance(t[e+1],b.limit,!0),r=Math.max(r,s))),b.padding&&(0===e&&(s=y.getAbsoluteDistance(0,b.padding[0],!1),r=Math.max(r,s)),e===u.length-1&&(s=y.getAbsoluteDistance(100,b.padding[1],!0),r=Math.min(r,s))),!((r=pt(r=y.getStep(r)))===t[e]&&!o)&&r}function G(t,e){var r=b.ort;return(r?e:t)+", "+(r?t:e)}function J(t,n,r,e,i){var o=r.slice(),s=e[0],a=[!t,t],l=[t,!t];e=e.slice(),t&&e.reverse(),1<e.length?e.forEach(function(t,e){var r=$(o,t,o[t]+n,a[e],l[e],!1);!1===r?n=0:(n=r-o[t],o[t]=r)}):a=l=[!0];var u=!1;e.forEach(function(t,e){u=Z(t,r[t]+n,a[e],l[e])||u}),u&&(e.forEach(function(t){W("update",t),W("slide",t)}),null!=i&&W("drag",s))}function K(t,e){return b.dir?100-t-e:t}function Q(){h.forEach(function(t){var e=50<x[t]?-1:1,r=3+(u.length+e*t);u[t].style.zIndex=String(r)})}function Z(t,e,r,n,i){return i||(e=$(x,t,e,r,n,!1)),!1!==e&&(function(t,e){x[t]=e,S[t]=y.fromStepping(e);var r="translate("+G(10*(K(e,0)-P)+"%","0")+")";u[t].style[b.transformRule]=r,tt(t),tt(t+1)}(t,e),!0)}function tt(t){if(s[t]){var e=0,r=100;0!==t&&(e=x[t-1]),t!==s.length-1&&(r=x[t]);var n=r-e,i="translate("+G(K(e,n)+"%","0")+")",o="scale("+G(n/100,"1")+")";s[t].style[b.transformRule]=i+" "+o}}function et(t,e){return null===t||!1===t||void 0===t?x[e]:("number"==typeof t&&(t=String(t)),!1!==(t=b.format.from(t))&&(t=y.toStepping(t)),!1===t||isNaN(t)?x[e]:t)}function rt(t,e,r){var n=ft(t),i=void 0===x[0];e=void 0===e||e,b.animate&&!i&&ct(d,b.cssClasses.tap,b.animationDuration),h.forEach(function(t){Z(t,et(n[t],t),!0,!1,r)});for(var o=1===h.length?0:1;o<h.length;++o)h.forEach(function(t){Z(t,x[t],!0,!0,r)});Q(),h.forEach(function(t){W("update",t),null!==n[t]&&e&&W("set",t)})}function nt(t){if(void 0===t&&(t=!1),t)return 1===S.length?S[0]:S.slice(0);var e=S.map(b.format.to);return 1===e.length?e[0]:e}function it(t){var e=x[t],r=y.getNearbySteps(e),n=S[t],i=r.thisStep.step,o=null;if(b.snap)return[n-r.stepBefore.startValue||null,r.stepAfter.startValue-n||null];!1!==i&&n+i>r.stepAfter.startValue&&(i=r.stepAfter.startValue-n),o=n>r.thisStep.startValue?r.thisStep.step:!1!==r.stepBefore.step&&n-r.stepBefore.highestStep,100===e?i=null:0===e&&(o=null);var s=y.countStepDecimals();return null!==i&&!1!==i&&(i=Number(i.toFixed(s))),null!==o&&!1!==o&&(o=Number(o.toFixed(s))),[o,i]}dt(e=d,b.cssClasses.target),0===b.dir?dt(e,b.cssClasses.ltr):dt(e,b.cssClasses.rtl),0===b.ort?dt(e,b.cssClasses.horizontal):dt(e,b.cssClasses.vertical),dt(e,"rtl"===getComputedStyle(e).direction?b.cssClasses.textDirectionRtl:b.cssClasses.textDirectionLtr),l=C(e,b.cssClasses.base),function(t,e){var r=C(e,b.cssClasses.connects);u=[],(s=[]).push(V(r,t[0]));for(var n=0;n<b.handles;n++)u.push(N(e,n)),h[n]=n,s.push(V(r,t[n+1]))}(b.connect,l),(c=b.events).fixed||u.forEach(function(t,e){H(p.start,t.children[0],B,{handleNumbers:[e]})}),c.tap&&H(p.start,l,n,{}),c.hover&&H(p.move,l,X,{hover:!0}),c.drag&&s.forEach(function(e,r){if(!1!==e&&0!==r&&r!==s.length-1){var n=u[r-1],i=u[r],t=[e];dt(e,b.cssClasses.draggable),c.fixed&&(t.push(n.children[0]),t.push(i.children[0])),t.forEach(function(t){H(p.start,t,B,{handles:[n,i],handleNumbers:[r-1,r],connect:e})})}}),rt(b.start),b.pips&&j(b.pips),b.tooltips&&A(),I("update"+gt.aria),Y("update"+gt.aria,function(t,e,s,r,a){h.forEach(function(t){var e=u[t],r=$(x,t,0,!0,!0,!0),n=$(x,t,100,!0,!0,!0),i=a[t],o=String(b.ariaFormat.to(s[t]));r=y.fromStepping(r).toFixed(1),n=y.fromStepping(n).toFixed(1),i=y.fromStepping(i).toFixed(1),e.children[0].setAttribute("aria-valuemin",r),e.children[0].setAttribute("aria-valuemax",n),e.children[0].setAttribute("aria-valuenow",i),e.children[0].setAttribute("aria-valuetext",o)})});var ot={destroy:function(){for(I(gt.aria),I(gt.tooltips),Object.keys(b.cssClasses).forEach(function(t){ht(d,b.cssClasses[t])});d.firstChild;)d.removeChild(d.firstChild);delete d.noUiSlider},steps:function(){return h.map(it)},on:Y,off:I,get:nt,set:rt,setHandle:function(t,e,r,n){if(!(0<=(t=Number(t))&&t<h.length))throw new Error("noUiSlider: invalid handle number, got: "+t);Z(t,et(e,t),!0,!0,n),W("update",t),r&&W("set",t)},reset:function(t){rt(b.start,t)},__moveHandles:function(t,e,r){J(t,e,x,r)},options:o,updateOptions:function(e,t){var r=nt(),n=["margin","limit","padding","range","animate","snap","step","format","pips","tooltips"];n.forEach(function(t){void 0!==e[t]&&(o[t]=e[t])});var i=vt(o);n.forEach(function(t){void 0!==e[t]&&(b[t]=i[t])}),y=i.spectrum,b.margin=i.margin,b.limit=i.limit,b.padding=i.padding,b.pips?j(b.pips):O(),b.tooltips?A():M(),x=[],rt(lt(e.start)?e.start:r,t)},target:d,removePips:O,removeTooltips:M,getTooltips:function(){return a},getOrigins:function(){return u},pips:j};return ot}function j(t,e){if(!t||!t.nodeName)throw new Error("noUiSlider: create requires a single element, got: "+t);if(t.noUiSlider)throw new Error("noUiSlider: Slider was already initialized.");var r=O(t,vt(e),e);return t.noUiSlider=r}var z={__spectrum:a,cssClasses:u,create:j};st.create=j,st.cssClasses=u,st.default=z,Object.defineProperty(st,"__esModule",{value:!0})});

(function($) {
    $('.js-filter-toggle').on('click',function (){
        event.preventDefault();
        $('.fdrop').slideToggle(200);
    });

    $('.js-filter-close').on('click',function (){
        event.preventDefault();
        $('.fdrop').slideUp(200);
    });

    let fselects = $(".fdrop__select");

    fselects.each(function (){
        let elemId = $(this).attr('id');
        let mySelect = new vanillaSelectBox('#'+elemId,{
            placeHolder: "Выбрать",
            disableSelectAll: true,
            translations : { "all": "Все", "items": "Выбрано","selectAll":"Выбрать все","clearAll":"Снять все"}
        });
    });

    let priceSlider = document.getElementById('priceSlider');
    let minPrice = parseInt(priceSlider.dataset.min)
    let maxPrice = parseInt(priceSlider.dataset.max)

    noUiSlider.create(priceSlider, {
        start: [minPrice, maxPrice],
        connect: true,
        step: 1,
        range: {
            'min': minPrice,
            'max': maxPrice
        }
    });


    let inputMin = document.getElementById('min-price');
    let inputMax = document.getElementById('max-price');

    priceSlider.noUiSlider.on('update', function (values, handle) {
        var value = values[handle];
        if (handle) {
            inputMax.value = Math.round(value);
        } else {
            inputMin.value = Math.round(value);
        }
    });

    $('#min-price').on('cnahge keyup paste',function (){
        if ($(this).val() < minPrice) $(this).val(minPrice);
        if ($(this).val() > maxPrice) $(this).val(maxPrice);
        priceSlider.noUiSlider.set([$(this).val(), null]);
    });
    $('#max-price').on('cnahge keyup paste',function (){
        if ($(this).val() < minPrice) $(this).val(minPrice);
        if ($(this).val() > maxPrice) $(this).val(maxPrice);
        priceSlider.noUiSlider.set([null, $(this).val()]);
    });

}(jQuery));