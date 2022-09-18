/*
Resize pasy (UI helper elementy)
	meni pomery velikosti mezi prilehajicimy areami
Tvurce okna by mel zad1at, jak dropnout
    - toolwindow s nezmenenou velikosti
    - documentwindow - plne roztahnout
*/

type int = number;

//npm run watch
	
//module DockMaster
//{
	class DockMaster
	{
		public static InitContainer(containerElement:HTMLElement):Container
		{
			const supported:boolean=document.createElement("p").style.flexDirection!=undefined;
			if (!supported)
				throw new TypeError("The browser does not support DockMaster.");
			return new Container(containerElement);
		}
	}

	interface IEvent<T>
    {
        Add(handler: { (sender:any, args:T): void }) : void;
        Remove(handler: { (sender:any, args:T): void }) : void;
    }

	class SysEvent<T> implements IEvent<T> {
        _handlers: { (sender:any, args:T): void; }[] = [];
    
        public Add(handler: { (sender:any, args:T): void }) : void {
            this._handlers.push(handler);
        }
    
        public Remove(handler: { (sender:any, args:T): void }) : void {
            this._handlers = this._handlers.filter(h => h !== handler);
        }
    
        public Trigger(sender:any, args:T) {
            this._handlers.slice(0).forEach(h => h(sender, args));
        }
    }

	enum DockMode
	{
		LeftBorder=1,
		RightBorder=2,
		TopBorder=4,
		BottomBorder=8,
		Tab=256,
		All=Tab*2-1
	}

	enum AreaReferencePosition
	{
		Left=1,
		Right=2,
		Top=3,
		Bottom=4
	}
	
	class ClosingEventData
	{
		constructor(public Allow:boolean)
		{}
	}

	interface IDockingControl
	{
		get RootElement():JQuery;
	}


	class Container implements IDockingControl
	{
		readonly _containerElement:JQuery;
		readonly _rootElement:JQuery;
		readonly _topElement:JQuery;
		readonly _centerElement:JQuery;
		readonly _centerLeftElement:JQuery;
		readonly _centerTabsElement:JQuery;
		readonly _centerTabsControl:TabControl;
		readonly _centerRightElement:JQuery;
		readonly _bottomElement:JQuery;
		readonly _draggingVisualHelper:DraggingVisualHelper;
		_dragging:boolean=false;
		_recalculateDroppableOffsets:boolean=false;
	
		constructor(containerElement:HTMLElement)
		{
			this._containerElement=$(containerElement);
			this._rootElement=$('<div class="dock-area" style="width: 100%; height: 100%; display:flex; flex-direction:column; position:relative"></div>');
			this._topElement=$('<div class="top" style="display:flex; flex-direction:column;"></div>');
			this._centerElement=$('<div class="center" style="display:flex; flex-direction:row; width:100%; height:100%"></div>');
			this._centerLeftElement=$('<div class="centerLeft" style="display:flex; flex-direction:row; height:100%"></div>');
			this._centerTabsElement=$('<div class="centerTabs" style="display:flex; flex-direction:row; width:100%; height:100%"></div>');
			this._centerRightElement=$('<div class="centerRight" style="display:flex; flex-direction:row-reverse; height:100%; margin-left: auto"></div>');
			this._bottomElement=$('<div class="bottom" style="display:flex; flex-direction:column-reverse"></div>');
			this._rootElement.append(this._topElement);
			this._rootElement.append(this._centerElement);
			this._centerElement.append(this._centerLeftElement);
			this._centerElement.append(this._centerTabsElement);
			this._centerElement.append(this._centerRightElement);
			this._rootElement.append(this._bottomElement);
			this._centerTabsControl=new TabControl(this);
			this._centerTabsElement.append(this._centerTabsControl._rootElement);

			this._containerElement.append(this._rootElement);
			this._draggingVisualHelper=new DraggingVisualHelper(this);
		}
		get RootElement():JQuery { return this._rootElement; }

		public get RootTabControl():TabControl { return this._centerTabsControl; }

		readonly _closing:SysEvent<ClosingEventData> = new SysEvent<ClosingEventData>();
		public get Closing() { return this._closing; } 

		/** Creates new pane. It's not placed anywhere on container automatically. */
		public CreatePane(title:string, content:HTMLElement):Pane
		{
			return new Pane(this,title,content);
		}

		public CreateArea(reference:TabControl,position:AreaReferencePosition):TabControl
		{
			const refRoot:JQuery=reference._rootElement;

			const EnsureDirectionalContainer=function(direction:string):void
			{
				const par:JQuery=reference._rootElement.parent();
				if (par.css("flex-direction")===direction)
					return;
				const newPar=$(`<div style="display:flex; flex-direction:${direction}; width:100%; height:100%"></div>`);
				newPar.insertBefore(refRoot);
				newPar.append(refRoot);
			}
			const EnsureHorizontalContainer=():void => EnsureDirectionalContainer("row");
			const EnsureVerticalContainer=():void => EnsureDirectionalContainer("column");

			const result:TabControl=new TabControl(this);
			const resRoot:JQuery=result._rootElement;
			if (position===AreaReferencePosition.Left)
			{
				EnsureHorizontalContainer();
				resRoot.insertBefore(refRoot);
			}
			else if (position===AreaReferencePosition.Right)
			{
				EnsureHorizontalContainer();
				resRoot.insertAfter(refRoot);
			}
			else if (position===AreaReferencePosition.Top)
			{
				EnsureVerticalContainer();
				resRoot.insertBefore(refRoot);
			}
			else if (position===AreaReferencePosition.Bottom)
			{
				EnsureVerticalContainer();
				resRoot.insertAfter(refRoot);
			}
			else
				throw new Error("NotImplementedException");
			return result;
		}

		public NotifyDragStart(pane:Pane):void
		{
			this._dragging=true;
			this._draggingVisualHelper.SetPane(pane);
			this._draggingVisualHelper.SetArea(this.RootTabControl);
		}

		public NotifyDragStop():void
		{
			this._dragging=false;
			this._draggingVisualHelper.Dispose();
		}

		public NotifyAreaMouseEnter(tabControl:TabControl):void
		{
			if (this._dragging)
			{
				this._draggingVisualHelper.SetArea(tabControl);
				this._recalculateDroppableOffsets=true;
			}
		}

		public NotifyAreaMouseLeave(tabControl:TabControl):void
		{
		}

		public AskClose(pane:Pane):boolean
		{
			let data=new ClosingEventData(true);
			this._closing.Trigger(pane, data);
			return data.Allow;
		}

		/** Places docked pane on container. */
		public Dock(pane:Pane,dockMode:DockMode):void
		{
			const self:Container=this;
			const Dock=function(targetElement:JQuery,w?:int,h?:int):void
			{
				pane._Place(w,h);
				pane._SetDocked();
				targetElement.append(pane._rootElement);
				pane.NotifyDock(self);
			}

			if (dockMode==DockMode.LeftBorder)
				Dock(this._centerLeftElement,pane.Width,undefined);
			else if (dockMode===DockMode.RightBorder)
				Dock(this._centerRightElement,pane.Width,undefined);
			else if (dockMode===DockMode.TopBorder)
				Dock(this._topElement,pane.Width,undefined);
			else if (dockMode===DockMode.BottomBorder)
				Dock(this._bottomElement,pane.Width,undefined);
			else
				throw new Error("NotImplementedException");
		}
	}

	class Pane
	{
		readonly _rootElement:JQuery;
		readonly _undockBtn:JQuery;
		_dockedAt?:IDockingControl;
		_undockCallbacks?:((pane: Pane) => void)[];
		constructor(private _container:Container,private title:string,private _content:HTMLElement)
		{
			this._rootElement=$("<div class='pane' style='border: 1px solid black'><div class='titleBar'><span class='text'></span><span class='ui-icon ui-icon-newwin'></span><span class='ui-icon ui-icon-closethick'></span></div><div class='content'></div></div>");
			this._rootElement.find(".titleBar .text").text(title);
			const self:Pane=this;
			this._rootElement.find(".titleBar .ui-icon-closethick").on("click",() => self.Dispose());
			this._undockBtn=this._rootElement.find(".titleBar .ui-icon-newwin");
			this._undockBtn.on("click",() => self.Undock());
			this._rootElement.find(".content").append(_content);
		}

		public Width?:int;
		public Height?:int;
		public get Title():string { return this.title; }

		_Place(w?:int,h?:int):void
		{
			if (w)
				this._rootElement.css("width",w!-2+"px"); //subtract borders on left a right
			if (h)
				this._rootElement.css("height",h!-2+"px"); //subtract borders on top and bottom
			this._rootElement.find(".content").append(this._content);
		}

		_SetDocked():void
		{
			this._rootElement.removeClass("floating").removeClass("ui-draggable").removeClass("ui-resizable");
			this._rootElement.draggable({disabled: true});
			this._rootElement.resizable({disabled: true});
			this._rootElement.css("position","").css("width","").css("height","");
			this._rootElement.find(".titleBar .ui-icon-newwin").css("display","");
		}

		/** Places floating pane on container. */
		public Float(x:int,y:int):void
		{
			let containerElement=this._container._rootElement;
			let offset=containerElement.offset()!;
			this._rootElement.addClass("floating");
			this._rootElement.css("left",offset.left+x+"px").css("top",offset.top+y+"px");
			this._Place(this.Width,this.Height);
			containerElement.append(this._rootElement);
			this._rootElement.find(".titleBar .ui-icon-newwin").css("display","none");

			let self:Pane=this;
			this._rootElement.draggable({disabled:false,handle:".titleBar > .text",containment: containerElement,/*refreshPositions:true,*/
				start: function(evt, ui) {
					//log("Pane drag start.");
					ui.helper.css("pointer-events","none");
					self._container.NotifyDragStart(self);
				},
				stop: function(evt, ui) {
					//log("Pane drag stop.");
					ui.helper.css("pointer-events","");
					self._container.NotifyDragStop();
				},
				drag: function(evt, ui) {
					//if (self._container._recalculateDroppableOffsets)
					//{
					//	debugger;
					//	self._container._recalculateDroppableOffsets=false;
					//	(<any>$.ui).ddmanager.prepareOffsets(???, evt);
					//}

					//https://stackoverflow.com/questions/725938/js-jquery-dragndrop-recalculate-the-drop-targets
					var dragHandle = $(evt.target);
					if (dragHandle.draggable('option', 'refreshPositions'))
						 dragHandle.draggable('option', 'refreshPositions', false)
					else if (self._container._recalculateDroppableOffsets)
					{
						self._container._recalculateDroppableOffsets=false;
						dragHandle.draggable('option', 'refreshPositions', true);
					}
				}
			});
			this._rootElement.resizable({disabled:false,minHeight:100,minWidth:100,containment:containerElement,handles:'all',create: function(event, ui) {
				$('.ui-icon-gripsmall-diagonal-se').removeClass("ui-icon-gripsmall-diagonal-se").removeClass("ui-icon");
				}});
		}

		public NotifyDock(dockedTo:IDockingControl,undockCallbacks?:((pane: Pane) => void)[]):void
		{
			this._dockedAt=dockedTo;
			this._undockCallbacks=undockCallbacks;
			this._undockBtn.show();
		}

		public Undock():void
		{
			if (!this._dockedAt)
				return;

			let containerElement=this._dockedAt.RootElement;
			let o1:JQuery.Coordinates=containerElement.offset()!;
			let o2:JQuery.Coordinates=this._rootElement.offset()!;

			if (this._undockCallbacks)
				this._undockCallbacks.forEach(x => x(this));
			this._undockBtn.hide();

			this.Float(o2.left-o1.left,o2.top-o1.top);
		}

		public Dispose():void
		{
			if (!this._container.AskClose(this))
				return;

			if (this._undockCallbacks)
				this._undockCallbacks.forEach(x => x(this));
			this._rootElement.remove();
		}
	}

	class TabControl implements IDockingControl
	{
		public readonly _rootElement:JQuery;
		public readonly _headerElement:JQuery;
		public readonly _panelsElement:JQuery;
		readonly _tabs:Pane[]=[];
		_selectedTabIndex?:int;
		readonly _disposeOnLastTab:boolean=true;
	
		constructor(_container:Container)
		{
			this._rootElement=$('<div class="tabs" style="position:relative; width:100%; height:100%"><div class="tabsHeader"></div><div class="tabPanels" style="height:100%"></div></div>');	
			this._headerElement=this._rootElement.find(".tabsHeader");
			this._panelsElement=this._rootElement.find(".tabPanels");

			const self:TabControl=this;
			this._rootElement.on("mouseenter",() => _container.NotifyAreaMouseEnter(self));
			this._rootElement.on("mouseleave",() => _container.NotifyAreaMouseLeave(self));
		}
		get RootElement():JQuery { return this._rootElement; }

		public AddTab(pane: Pane):void
		{
			const index:int=this._tabs.push(pane)-1;
			if (index===0)
				this.SelectTab(0);
			else
			{
				pane._rootElement.detach();

				const self:TabControl=this;
				const AddTab = function(index:int):void
				{
					let tabElement=$("<span style='border: 1px solid black; margin:1; cursor: default'></span>").text(self._tabs[index].Title);
					tabElement.on("click",() => self.SelectTab(index));
					self._headerElement.append(tabElement);
				}

				if (index===1)
					AddTab(0);
				AddTab(index);
			}
			pane._SetDocked();
			pane._rootElement.css("width","100%").css("height","100%");
			pane.NotifyDock(this, [() => this.RemoveTab(pane)]);
		}

		public RemoveTab(pane: Pane):void
		{
			const self:TabControl=this;
			const RemoveTabHeader = function(index:int):void
			{
				self._headerElement.children().eq(index).remove();	
			}

			const index:int=this._tabs.indexOf(pane);
			RemoveTabHeader(index);
			this._tabs.splice(index,1);

			let newTabsCount:int=this._tabs.length;
			if (newTabsCount===0)
			{
				this._selectedTabIndex=undefined;
				if (this._disposeOnLastTab)
				{
					let par:JQuery=this._rootElement.parent();
					if (!par.hasClass("centerTabs"))
						this._rootElement.remove();

					while (!((par.hasClass("centerTabs")) || (par.children().length!==0)))
					{
						const parNew:JQuery=par.parent();
						par.remove();
						par=parNew;
					}
				}
			}
			else
			{
				if (newTabsCount===1)
					RemoveTabHeader(0);

				newTabsCount--;
				if (this._selectedTabIndex!>=newTabsCount)
				{
					this._selectedTabIndex=undefined;
					this.SelectTab(newTabsCount);
				}
			}
		}

		public SelectTab(index:int):void
		{
			if (this._selectedTabIndex===index)
				return;
			this._panelsElement.children().detach();
			this._panelsElement.append(this._tabs[index]._rootElement);
			this._selectedTabIndex=index;
		}
	}

	enum DropPosition
	{
		LeftBorder,
		Left,
		RightBorder,
		Right,
		TopBorder,
		Top,
		BottomBorder,
		Bottom,
		Tab
	}

	class DraggingVisualHelper
	{
		readonly _img:JQuery=$("<div style='position:absolute;top:50%;left:50%;margin:-100px 0 0 -100px;z-index:1000' class='draggingVisualHelper'>"
			+"<div style='width:200px;height:200px;border-radius:50%;background:white;border: 0.2px solid black'></div>"
			+"<div class='leftBorder ui-icon ui-icon-arrowthickstop-1-w' style='position:absolute;left:4px;top:96px;width:12px;height:12px'></div>"
			+"<div class='left ui-icon ui-icon-arrowthick-1-w' style='position:absolute;left:24px;top:95px;width:12px;height:12px'></div>"
			+"<div class='topBorder ui-icon ui-icon-arrowthickstop-1-n' style='position:absolute;left:95px;top:4px;width:12px;height:12px'></div>"
			+"<div class='top ui-icon ui-icon-arrowthick-1-n' style='position:absolute;left:95px;top:24px;width:12px;height:12px'></div>"
			+"<div class='rightBorder ui-icon ui-icon-arrowthickstop-1-e' style='position:absolute;left:186px;top:96px;width:12px;height:12px'></div>"
			+"<div class='right ui-icon ui-icon-arrowthick-1-e' style='position:absolute;left:166px;top:95px;width:12px;height:12px'></div>"
			+"<div class='bottomBorder ui-icon ui-icon-arrowthickstop-1-s' style='position:absolute;left:95px;top:186px;width:12px;height:12px'></div>"
			+"<div class='bottom ui-icon ui-icon-arrowthick-1-s' style='position:absolute;left:95px;top:166px;width:12px;height:12px'></div>"
			+"<div class='center ui-icon ui-icon-arrow-4-diag' style='position:absolute;left:94px;top:94px;width:14px;height:14px'></div>"
			+"</div>");
		readonly _leftBorderDiv:JQuery=this.SetOnDragging(this._img.find('.leftBorder'),DropPosition.LeftBorder);
		readonly _leftDiv:JQuery=this.SetOnDragging(this._img.find('.left'),DropPosition.Left);
		readonly _topBorderDiv:JQuery=this.SetOnDragging(this._img.find('.topBorder'),DropPosition.TopBorder);
		readonly _topDiv:JQuery=this.SetOnDragging(this._img.find('.top'),DropPosition.Top);
		readonly _rightBorderDiv:JQuery=this.SetOnDragging(this._img.find('.rightBorder'),DropPosition.RightBorder);
		readonly _rightDiv:JQuery=this.SetOnDragging(this._img.find('.right'),DropPosition.Right);
		readonly _bottomBorderDiv:JQuery=this.SetOnDragging(this._img.find('.bottomBorder'),DropPosition.BottomBorder);
		readonly _bottomDiv:JQuery=this.SetOnDragging(this._img.find('.bottom'),DropPosition.Bottom);
		readonly _centerDiv:JQuery=this.SetOnDragging(this._img.find('.center'),DropPosition.Tab);
		readonly _fadeDuration:number=100;
		_pane?:Pane;
		_placedAt?:TabControl;
		_placeholder?:JQuery;
		constructor(private _container:Container)
		{
			//log("DraggingVisualHelper.ctor");
			this._img.fadeOut(1);
		}
		
		public SetPane(pane:Pane):void
		{
			this._pane=pane;
		}
		
		public SetArea(tabControl?:TabControl):void
		{
			if (tabControl)
			{
				tabControl._rootElement.append(this._img);
				//log("DraggingVisualHelper.SetArea");
				this._img.fadeIn(this._fadeDuration);
			}
			else
				if (this._placedAt)
					this.Dispose();
			this._placedAt=tabControl;
		}
		
		public Dispose():void
		{
			//this._img.remove();
			const self:DraggingVisualHelper=this;
			this._img.fadeOut(this._fadeDuration,() => self._img[0].parentElement!.removeChild(self._img[0]));
			//log("DraggingVisualHelper.Dispose");
			this._placedAt=undefined;
			this.RemovePlaceholder();
		}
		
		ShowPlaceholder(position:DropPosition):void
		{
			//const rootElement:JQuery=this._container.RootElement;

			const rootElement:JQuery=(position===DropPosition.LeftBorder) || (position===DropPosition.TopBorder) || (position===DropPosition.RightBorder)|| (position===DropPosition.BottomBorder)
				? this._container.RootElement
				: this._placedAt!._rootElement;
			const rect:any=
				position===DropPosition.LeftBorder ? {left:0,top:0,width:"100px",height:"100%"} :
				position===DropPosition.Left ? {left:0,top:0,width:"100px",height:"100%"} :
				position===DropPosition.TopBorder ? {left:0,top:0,width:"100%",height:"100px"} :
				position===DropPosition.Top ? {left:0,top:0,width:"100%",height:"100px"} :
				position===DropPosition.RightBorder ? {left:rootElement.width()!-100+"px",top:0,width:"100px",height:"100%"} :
				position===DropPosition.Right ? {left:rootElement.width()!-100+"px",top:0,width:"100px",height:"100%"} :
				position===DropPosition.BottomBorder ? {left:0,top:rootElement.height()!-100+"px",width:"100%",height:"100px"} :
				position===DropPosition.Bottom ? {left:0,top:rootElement.height()!-100+"px",width:"100%",height:"100px"} :
				{left:0,top:0,width:"100%",height:"100%"};
			const style=`left:${rect.left};top:${rect.top};width:${rect.width};height:${rect.height}`;
			this._placeholder=$(`<div class='dropHelperPlaceholder' style='position: absolute;${style}'></div>`);
			rootElement.append(this._placeholder);
		}
		
		RemovePlaceholder():void
		{
			if (this._placeholder)
			{
				this._placeholder.remove();
				this._placeholder=undefined;
			}
		}
		
		SetOnDragging(src:JQuery, position:DropPosition):JQuery
		{
			const self:DraggingVisualHelper=this;
			return src.droppable({
				tolerance: "pointer",
				drop: (event/*: JQuery.Event*/, ui/*: JQueryUI.DroppableEventUIParam*/):void => {
					if (!self._pane)
						return;
					const pane:Pane=self._pane;
					self.RemovePlaceholder();

					const DoOnTabs=function(f:((tabs:TabControl) => void))
					{
						if (self._placedAt)
							f(self._placedAt);
					}
					const AddTabAside=function(position:AreaReferencePosition):void
					{
						DoOnTabs(tabs=>self._container.CreateArea(tabs,position).AddTab(pane));
					}

					if (position===DropPosition.LeftBorder)
						self._container.Dock(pane, DockMode.LeftBorder);
					else if (position===DropPosition.TopBorder)
						self._container!.Dock(pane, DockMode.TopBorder);
					else if (position===DropPosition.RightBorder)
						self._container!.Dock(pane, DockMode.RightBorder);
					else if (position===DropPosition.BottomBorder)
						self._container!.Dock(pane, DockMode.BottomBorder);
					else if (position===DropPosition.Left)
						AddTabAside(AreaReferencePosition.Left);
					else if (position===DropPosition.Top)
						AddTabAside(AreaReferencePosition.Top);
					else if (position===DropPosition.Right)
						AddTabAside(AreaReferencePosition.Right);
					else if (position===DropPosition.Bottom)
						AddTabAside(AreaReferencePosition.Bottom);
					else
						DoOnTabs(tabs => tabs.AddTab(pane));
				},
				over: (event, ui) => {
					//log("Dragging over: "+(position==1?"left":position==2?"top":position==3?"right":position==4?"bottom":"center"));
					self.ShowPlaceholder(position);
				},
				out: (event, ui) => {
					//log("Dragging out: "+(position==1?"left":position==2?"top":position==3?"right":position==4?"bottom":"center"));
					self.RemovePlaceholder();
				},
				hoverClass:"draggingVisualHelperDroppableHoverClass"
			});
		}
	}

function log(text:string):void
{
    const log=$("#log").append($("<p>"+text+"</p>"));
	 log.scrollTop(log.height()!);
}
//}
