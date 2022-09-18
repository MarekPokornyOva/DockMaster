"use strict";
/*
Resize pasy (UI helper elementy)
    meni pomery velikosti mezi prilehajicimy areami
Tvurce okna by mel zad1at, jak dropnout
    - toolwindow s nezmenenou velikosti
    - documentwindow - plne roztahnout
*/
//npm run watch
//module DockMaster
//{
var DockMaster = /** @class */ (function () {
    function DockMaster() {
    }
    DockMaster.InitContainer = function (containerElement) {
        var supported = document.createElement("p").style.flexDirection != undefined;
        if (!supported)
            throw new TypeError("The browser does not support DockMaster.");
        return new Container(containerElement);
    };
    return DockMaster;
}());
var SysEvent = /** @class */ (function () {
    function SysEvent() {
        this._handlers = [];
    }
    SysEvent.prototype.Add = function (handler) {
        this._handlers.push(handler);
    };
    SysEvent.prototype.Remove = function (handler) {
        this._handlers = this._handlers.filter(function (h) { return h !== handler; });
    };
    SysEvent.prototype.Trigger = function (sender, args) {
        this._handlers.slice(0).forEach(function (h) { return h(sender, args); });
    };
    return SysEvent;
}());
var DockMode;
(function (DockMode) {
    DockMode[DockMode["LeftBorder"] = 1] = "LeftBorder";
    DockMode[DockMode["RightBorder"] = 2] = "RightBorder";
    DockMode[DockMode["TopBorder"] = 4] = "TopBorder";
    DockMode[DockMode["BottomBorder"] = 8] = "BottomBorder";
    DockMode[DockMode["Tab"] = 256] = "Tab";
    DockMode[DockMode["All"] = 511] = "All";
})(DockMode || (DockMode = {}));
var AreaReferencePosition;
(function (AreaReferencePosition) {
    AreaReferencePosition[AreaReferencePosition["Left"] = 1] = "Left";
    AreaReferencePosition[AreaReferencePosition["Right"] = 2] = "Right";
    AreaReferencePosition[AreaReferencePosition["Top"] = 3] = "Top";
    AreaReferencePosition[AreaReferencePosition["Bottom"] = 4] = "Bottom";
})(AreaReferencePosition || (AreaReferencePosition = {}));
var ClosingEventData = /** @class */ (function () {
    function ClosingEventData(Allow) {
        this.Allow = Allow;
    }
    return ClosingEventData;
}());
var Container = /** @class */ (function () {
    function Container(containerElement) {
        this._dragging = false;
        this._recalculateDroppableOffsets = false;
        this._closing = new SysEvent();
        this._containerElement = $(containerElement);
        this._rootElement = $('<div class="dock-area" style="width: 100%; height: 100%; display:flex; flex-direction:column; position:relative"></div>');
        this._topElement = $('<div class="top" style="display:flex; flex-direction:column;"></div>');
        this._centerElement = $('<div class="center" style="display:flex; flex-direction:row; width:100%; height:100%"></div>');
        this._centerLeftElement = $('<div class="centerLeft" style="display:flex; flex-direction:row; height:100%"></div>');
        this._centerTabsElement = $('<div class="centerTabs" style="display:flex; flex-direction:row; width:100%; height:100%"></div>');
        this._centerRightElement = $('<div class="centerRight" style="display:flex; flex-direction:row-reverse; height:100%; margin-left: auto"></div>');
        this._bottomElement = $('<div class="bottom" style="display:flex; flex-direction:column-reverse"></div>');
        this._rootElement.append(this._topElement);
        this._rootElement.append(this._centerElement);
        this._centerElement.append(this._centerLeftElement);
        this._centerElement.append(this._centerTabsElement);
        this._centerElement.append(this._centerRightElement);
        this._rootElement.append(this._bottomElement);
        this._centerTabsControl = new TabControl(this);
        this._centerTabsElement.append(this._centerTabsControl._rootElement);
        this._containerElement.append(this._rootElement);
        this._draggingVisualHelper = new DraggingVisualHelper(this);
    }
    Object.defineProperty(Container.prototype, "RootElement", {
        get: function () { return this._rootElement; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Container.prototype, "RootTabControl", {
        get: function () { return this._centerTabsControl; },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Container.prototype, "Closing", {
        get: function () { return this._closing; },
        enumerable: false,
        configurable: true
    });
    /** Creates new pane. It's not placed anywhere on container automatically. */
    Container.prototype.CreatePane = function (title, content) {
        return new Pane(this, title, content);
    };
    Container.prototype.CreateArea = function (reference, position) {
        var refRoot = reference._rootElement;
        var EnsureDirectionalContainer = function (direction) {
            var par = reference._rootElement.parent();
            if (par.css("flex-direction") === direction)
                return;
            var newPar = $("<div style=\"display:flex; flex-direction:".concat(direction, "; width:100%; height:100%\"></div>"));
            newPar.insertBefore(refRoot);
            newPar.append(refRoot);
        };
        var EnsureHorizontalContainer = function () { return EnsureDirectionalContainer("row"); };
        var EnsureVerticalContainer = function () { return EnsureDirectionalContainer("column"); };
        var result = new TabControl(this);
        var resRoot = result._rootElement;
        if (position === AreaReferencePosition.Left) {
            EnsureHorizontalContainer();
            resRoot.insertBefore(refRoot);
        }
        else if (position === AreaReferencePosition.Right) {
            EnsureHorizontalContainer();
            resRoot.insertAfter(refRoot);
        }
        else if (position === AreaReferencePosition.Top) {
            EnsureVerticalContainer();
            resRoot.insertBefore(refRoot);
        }
        else if (position === AreaReferencePosition.Bottom) {
            EnsureVerticalContainer();
            resRoot.insertAfter(refRoot);
        }
        else
            throw new Error("NotImplementedException");
        return result;
    };
    Container.prototype.NotifyDragStart = function (pane) {
        this._dragging = true;
        this._draggingVisualHelper.SetPane(pane);
        this._draggingVisualHelper.SetArea(this.RootTabControl);
    };
    Container.prototype.NotifyDragStop = function () {
        this._dragging = false;
        this._draggingVisualHelper.Dispose();
    };
    Container.prototype.NotifyAreaMouseEnter = function (tabControl) {
        if (this._dragging) {
            this._draggingVisualHelper.SetArea(tabControl);
            this._recalculateDroppableOffsets = true;
        }
    };
    Container.prototype.NotifyAreaMouseLeave = function (tabControl) {
    };
    Container.prototype.AskClose = function (pane) {
        var data = new ClosingEventData(true);
        this._closing.Trigger(pane, data);
        return data.Allow;
    };
    /** Places docked pane on container. */
    Container.prototype.Dock = function (pane, dockMode) {
        var self = this;
        var Dock = function (targetElement, w, h) {
            pane._Place(w, h);
            pane._SetDocked();
            targetElement.append(pane._rootElement);
            pane.NotifyDock(self);
        };
        if (dockMode == DockMode.LeftBorder)
            Dock(this._centerLeftElement, pane.Width, undefined);
        else if (dockMode === DockMode.RightBorder)
            Dock(this._centerRightElement, pane.Width, undefined);
        else if (dockMode === DockMode.TopBorder)
            Dock(this._topElement, pane.Width, undefined);
        else if (dockMode === DockMode.BottomBorder)
            Dock(this._bottomElement, pane.Width, undefined);
        else
            throw new Error("NotImplementedException");
    };
    return Container;
}());
var Pane = /** @class */ (function () {
    function Pane(_container, title, _content) {
        this._container = _container;
        this.title = title;
        this._content = _content;
        this._rootElement = $("<div class='pane' style='border: 1px solid black'><div class='titleBar'><span class='text'></span><span class='ui-icon ui-icon-newwin'></span><span class='ui-icon ui-icon-closethick'></span></div><div class='content'></div></div>");
        this._rootElement.find(".titleBar .text").text(title);
        var self = this;
        this._rootElement.find(".titleBar .ui-icon-closethick").on("click", function () { return self.Dispose(); });
        this._undockBtn = this._rootElement.find(".titleBar .ui-icon-newwin");
        this._undockBtn.on("click", function () { return self.Undock(); });
        this._rootElement.find(".content").append(_content);
    }
    Object.defineProperty(Pane.prototype, "Title", {
        get: function () { return this.title; },
        enumerable: false,
        configurable: true
    });
    Pane.prototype._Place = function (w, h) {
        if (w)
            this._rootElement.css("width", w - 2 + "px"); //subtract borders on left a right
        if (h)
            this._rootElement.css("height", h - 2 + "px"); //subtract borders on top and bottom
        this._rootElement.find(".content").append(this._content);
    };
    Pane.prototype._SetDocked = function () {
        this._rootElement.removeClass("floating").removeClass("ui-draggable").removeClass("ui-resizable");
        this._rootElement.draggable({ disabled: true });
        this._rootElement.resizable({ disabled: true });
        this._rootElement.css("position", "").css("width", "").css("height", "");
        this._rootElement.find(".titleBar .ui-icon-newwin").css("display", "");
    };
    /** Places floating pane on container. */
    Pane.prototype.Float = function (x, y) {
        var containerElement = this._container._rootElement;
        var offset = containerElement.offset();
        this._rootElement.addClass("floating");
        this._rootElement.css("left", offset.left + x + "px").css("top", offset.top + y + "px");
        this._Place(this.Width, this.Height);
        containerElement.append(this._rootElement);
        this._rootElement.find(".titleBar .ui-icon-newwin").css("display", "none");
        var self = this;
        this._rootElement.draggable({ disabled: false, handle: ".titleBar > .text", containment: containerElement,
            start: function (evt, ui) {
                //log("Pane drag start.");
                ui.helper.css("pointer-events", "none");
                self._container.NotifyDragStart(self);
            },
            stop: function (evt, ui) {
                //log("Pane drag stop.");
                ui.helper.css("pointer-events", "");
                self._container.NotifyDragStop();
            },
            drag: function (evt, ui) {
                //if (self._container._recalculateDroppableOffsets)
                //{
                //	debugger;
                //	self._container._recalculateDroppableOffsets=false;
                //	(<any>$.ui).ddmanager.prepareOffsets(???, evt);
                //}
                //https://stackoverflow.com/questions/725938/js-jquery-dragndrop-recalculate-the-drop-targets
                var dragHandle = $(evt.target);
                if (dragHandle.draggable('option', 'refreshPositions'))
                    dragHandle.draggable('option', 'refreshPositions', false);
                else if (self._container._recalculateDroppableOffsets) {
                    self._container._recalculateDroppableOffsets = false;
                    dragHandle.draggable('option', 'refreshPositions', true);
                }
            }
        });
        this._rootElement.resizable({ disabled: false, minHeight: 100, minWidth: 100, containment: containerElement, handles: 'all', create: function (event, ui) {
                $('.ui-icon-gripsmall-diagonal-se').removeClass("ui-icon-gripsmall-diagonal-se").removeClass("ui-icon");
            } });
    };
    Pane.prototype.NotifyDock = function (dockedTo, undockCallbacks) {
        this._dockedAt = dockedTo;
        this._undockCallbacks = undockCallbacks;
        this._undockBtn.show();
    };
    Pane.prototype.Undock = function () {
        var _this = this;
        if (!this._dockedAt)
            return;
        var containerElement = this._dockedAt.RootElement;
        var o1 = containerElement.offset();
        var o2 = this._rootElement.offset();
        if (this._undockCallbacks)
            this._undockCallbacks.forEach(function (x) { return x(_this); });
        this._undockBtn.hide();
        this.Float(o2.left - o1.left, o2.top - o1.top);
    };
    Pane.prototype.Dispose = function () {
        var _this = this;
        if (!this._container.AskClose(this))
            return;
        if (this._undockCallbacks)
            this._undockCallbacks.forEach(function (x) { return x(_this); });
        this._rootElement.remove();
    };
    return Pane;
}());
var TabControl = /** @class */ (function () {
    function TabControl(_container) {
        this._tabs = [];
        this._disposeOnLastTab = true;
        this._rootElement = $('<div class="tabs" style="position:relative; width:100%; height:100%"><div class="tabsHeader"></div><div class="tabPanels" style="height:100%"></div></div>');
        this._headerElement = this._rootElement.find(".tabsHeader");
        this._panelsElement = this._rootElement.find(".tabPanels");
        var self = this;
        this._rootElement.on("mouseenter", function () { return _container.NotifyAreaMouseEnter(self); });
        this._rootElement.on("mouseleave", function () { return _container.NotifyAreaMouseLeave(self); });
    }
    Object.defineProperty(TabControl.prototype, "RootElement", {
        get: function () { return this._rootElement; },
        enumerable: false,
        configurable: true
    });
    TabControl.prototype.AddTab = function (pane) {
        var _this = this;
        var index = this._tabs.push(pane) - 1;
        if (index === 0)
            this.SelectTab(0);
        else {
            pane._rootElement.detach();
            var self_1 = this;
            var AddTab = function (index) {
                var tabElement = $("<span style='border: 1px solid black; margin:1; cursor: default'></span>").text(self_1._tabs[index].Title);
                tabElement.on("click", function () { return self_1.SelectTab(index); });
                self_1._headerElement.append(tabElement);
            };
            if (index === 1)
                AddTab(0);
            AddTab(index);
        }
        pane._SetDocked();
        pane._rootElement.css("width", "100%").css("height", "100%");
        pane.NotifyDock(this, [function () { return _this.RemoveTab(pane); }]);
    };
    TabControl.prototype.RemoveTab = function (pane) {
        var self = this;
        var RemoveTabHeader = function (index) {
            self._headerElement.children().eq(index).remove();
        };
        var index = this._tabs.indexOf(pane);
        RemoveTabHeader(index);
        this._tabs.splice(index, 1);
        var newTabsCount = this._tabs.length;
        if (newTabsCount === 0) {
            this._selectedTabIndex = undefined;
            if (this._disposeOnLastTab) {
                var par = this._rootElement.parent();
                if (!par.hasClass("centerTabs"))
                    this._rootElement.remove();
                while (!((par.hasClass("centerTabs")) || (par.children().length !== 0))) {
                    var parNew = par.parent();
                    par.remove();
                    par = parNew;
                }
            }
        }
        else {
            if (newTabsCount === 1)
                RemoveTabHeader(0);
            newTabsCount--;
            if (this._selectedTabIndex >= newTabsCount) {
                this._selectedTabIndex = undefined;
                this.SelectTab(newTabsCount);
            }
        }
    };
    TabControl.prototype.SelectTab = function (index) {
        if (this._selectedTabIndex === index)
            return;
        this._panelsElement.children().detach();
        this._panelsElement.append(this._tabs[index]._rootElement);
        this._selectedTabIndex = index;
    };
    return TabControl;
}());
var DropPosition;
(function (DropPosition) {
    DropPosition[DropPosition["LeftBorder"] = 0] = "LeftBorder";
    DropPosition[DropPosition["Left"] = 1] = "Left";
    DropPosition[DropPosition["RightBorder"] = 2] = "RightBorder";
    DropPosition[DropPosition["Right"] = 3] = "Right";
    DropPosition[DropPosition["TopBorder"] = 4] = "TopBorder";
    DropPosition[DropPosition["Top"] = 5] = "Top";
    DropPosition[DropPosition["BottomBorder"] = 6] = "BottomBorder";
    DropPosition[DropPosition["Bottom"] = 7] = "Bottom";
    DropPosition[DropPosition["Tab"] = 8] = "Tab";
})(DropPosition || (DropPosition = {}));
var DraggingVisualHelper = /** @class */ (function () {
    function DraggingVisualHelper(_container) {
        this._container = _container;
        this._img = $("<div style='position:absolute;top:50%;left:50%;margin:-100px 0 0 -100px;z-index:1000' class='draggingVisualHelper'>"
            + "<div style='width:200px;height:200px;border-radius:50%;background:white;border: 0.2px solid black'></div>"
            + "<div class='leftBorder ui-icon ui-icon-arrowthickstop-1-w' style='position:absolute;left:4px;top:96px;width:12px;height:12px'></div>"
            + "<div class='left ui-icon ui-icon-arrowthick-1-w' style='position:absolute;left:24px;top:95px;width:12px;height:12px'></div>"
            + "<div class='topBorder ui-icon ui-icon-arrowthickstop-1-n' style='position:absolute;left:95px;top:4px;width:12px;height:12px'></div>"
            + "<div class='top ui-icon ui-icon-arrowthick-1-n' style='position:absolute;left:95px;top:24px;width:12px;height:12px'></div>"
            + "<div class='rightBorder ui-icon ui-icon-arrowthickstop-1-e' style='position:absolute;left:186px;top:96px;width:12px;height:12px'></div>"
            + "<div class='right ui-icon ui-icon-arrowthick-1-e' style='position:absolute;left:166px;top:95px;width:12px;height:12px'></div>"
            + "<div class='bottomBorder ui-icon ui-icon-arrowthickstop-1-s' style='position:absolute;left:95px;top:186px;width:12px;height:12px'></div>"
            + "<div class='bottom ui-icon ui-icon-arrowthick-1-s' style='position:absolute;left:95px;top:166px;width:12px;height:12px'></div>"
            + "<div class='center ui-icon ui-icon-arrow-4-diag' style='position:absolute;left:94px;top:94px;width:14px;height:14px'></div>"
            + "</div>");
        this._leftBorderDiv = this.SetOnDragging(this._img.find('.leftBorder'), DropPosition.LeftBorder);
        this._leftDiv = this.SetOnDragging(this._img.find('.left'), DropPosition.Left);
        this._topBorderDiv = this.SetOnDragging(this._img.find('.topBorder'), DropPosition.TopBorder);
        this._topDiv = this.SetOnDragging(this._img.find('.top'), DropPosition.Top);
        this._rightBorderDiv = this.SetOnDragging(this._img.find('.rightBorder'), DropPosition.RightBorder);
        this._rightDiv = this.SetOnDragging(this._img.find('.right'), DropPosition.Right);
        this._bottomBorderDiv = this.SetOnDragging(this._img.find('.bottomBorder'), DropPosition.BottomBorder);
        this._bottomDiv = this.SetOnDragging(this._img.find('.bottom'), DropPosition.Bottom);
        this._centerDiv = this.SetOnDragging(this._img.find('.center'), DropPosition.Tab);
        this._fadeDuration = 100;
        //log("DraggingVisualHelper.ctor");
        this._img.fadeOut(1);
    }
    DraggingVisualHelper.prototype.SetPane = function (pane) {
        this._pane = pane;
    };
    DraggingVisualHelper.prototype.SetArea = function (tabControl) {
        if (tabControl) {
            tabControl._rootElement.append(this._img);
            //log("DraggingVisualHelper.SetArea");
            this._img.fadeIn(this._fadeDuration);
        }
        else if (this._placedAt)
            this.Dispose();
        this._placedAt = tabControl;
    };
    DraggingVisualHelper.prototype.Dispose = function () {
        //this._img.remove();
        var self = this;
        this._img.fadeOut(this._fadeDuration, function () { return self._img[0].parentElement.removeChild(self._img[0]); });
        //log("DraggingVisualHelper.Dispose");
        this._placedAt = undefined;
        this.RemovePlaceholder();
    };
    DraggingVisualHelper.prototype.ShowPlaceholder = function (position) {
        //const rootElement:JQuery=this._container.RootElement;
        var rootElement = (position === DropPosition.LeftBorder) || (position === DropPosition.TopBorder) || (position === DropPosition.RightBorder) || (position === DropPosition.BottomBorder)
            ? this._container.RootElement
            : this._placedAt._rootElement;
        var rect = position === DropPosition.LeftBorder ? { left: 0, top: 0, width: "100px", height: "100%" } :
            position === DropPosition.Left ? { left: 0, top: 0, width: "100px", height: "100%" } :
                position === DropPosition.TopBorder ? { left: 0, top: 0, width: "100%", height: "100px" } :
                    position === DropPosition.Top ? { left: 0, top: 0, width: "100%", height: "100px" } :
                        position === DropPosition.RightBorder ? { left: rootElement.width() - 100 + "px", top: 0, width: "100px", height: "100%" } :
                            position === DropPosition.Right ? { left: rootElement.width() - 100 + "px", top: 0, width: "100px", height: "100%" } :
                                position === DropPosition.BottomBorder ? { left: 0, top: rootElement.height() - 100 + "px", width: "100%", height: "100px" } :
                                    position === DropPosition.Bottom ? { left: 0, top: rootElement.height() - 100 + "px", width: "100%", height: "100px" } :
                                        { left: 0, top: 0, width: "100%", height: "100%" };
        var style = "left:".concat(rect.left, ";top:").concat(rect.top, ";width:").concat(rect.width, ";height:").concat(rect.height);
        this._placeholder = $("<div class='dropHelperPlaceholder' style='position: absolute;".concat(style, "'></div>"));
        rootElement.append(this._placeholder);
    };
    DraggingVisualHelper.prototype.RemovePlaceholder = function () {
        if (this._placeholder) {
            this._placeholder.remove();
            this._placeholder = undefined;
        }
    };
    DraggingVisualHelper.prototype.SetOnDragging = function (src, position) {
        var self = this;
        return src.droppable({
            tolerance: "pointer",
            drop: function (event /*: JQuery.Event*/, ui /*: JQueryUI.DroppableEventUIParam*/) {
                if (!self._pane)
                    return;
                var pane = self._pane;
                self.RemovePlaceholder();
                var DoOnTabs = function (f) {
                    if (self._placedAt)
                        f(self._placedAt);
                };
                var AddTabAside = function (position) {
                    DoOnTabs(function (tabs) { return self._container.CreateArea(tabs, position).AddTab(pane); });
                };
                if (position === DropPosition.LeftBorder)
                    self._container.Dock(pane, DockMode.LeftBorder);
                else if (position === DropPosition.TopBorder)
                    self._container.Dock(pane, DockMode.TopBorder);
                else if (position === DropPosition.RightBorder)
                    self._container.Dock(pane, DockMode.RightBorder);
                else if (position === DropPosition.BottomBorder)
                    self._container.Dock(pane, DockMode.BottomBorder);
                else if (position === DropPosition.Left)
                    AddTabAside(AreaReferencePosition.Left);
                else if (position === DropPosition.Top)
                    AddTabAside(AreaReferencePosition.Top);
                else if (position === DropPosition.Right)
                    AddTabAside(AreaReferencePosition.Right);
                else if (position === DropPosition.Bottom)
                    AddTabAside(AreaReferencePosition.Bottom);
                else
                    DoOnTabs(function (tabs) { return tabs.AddTab(pane); });
            },
            over: function (event, ui) {
                //log("Dragging over: "+(position==1?"left":position==2?"top":position==3?"right":position==4?"bottom":"center"));
                self.ShowPlaceholder(position);
            },
            out: function (event, ui) {
                //log("Dragging out: "+(position==1?"left":position==2?"top":position==3?"right":position==4?"bottom":"center"));
                self.RemovePlaceholder();
            },
            hoverClass: "draggingVisualHelperDroppableHoverClass"
        });
    };
    return DraggingVisualHelper;
}());
function log(text) {
    var log = $("#log").append($("<p>" + text + "</p>"));
    log.scrollTop(log.height());
}
//}
