define(['text!./tableTmpl.html',        
        './libs/jquery.scrollbarWidth'], 
function(tableTmpl_) {
	/**
	 * View for decor-table.
	 * @constructor
	 * @param args : {scope.controller}
	 */
	function TableView(args) {
		var scope = this;
		scope.controller = args.controller;		

		// el's		
		var $container = args.$container;
		scope.$tableDecor = undefined;		
		this.$allColumns = undefined;
		var $columnsContainer = undefined;
		this.$columns = undefined;
		this.$fixedColumns = undefined;
		this.$fixedCells = undefined;
		this.$cellContainer = undefined;
		this.$cells = undefined;
		var $hscroller = undefined;
		var $vscroller = undefined;
		this.$fixedFooterCells = undefined;
		var $footerContainer = undefined;
		var $footers = undefined;

		// dynamic layout configs
		var computedColumnHeight = undefined; // height of columns-container
		var	computedFixedColumnWidth = undefined; // width of column which are fixed
		var computedColumnsWidth = undefined; // width of all non-fixed columns together
		
		// templates
		var tableTmpl = _.template(tableTmpl_); // tmpl for the grid		
		
		function init() {					
		}
		

		/**
		 * Based on controller's rows and columns, grid is drawn into
		 * container. Cleans-up container and triggers adjustLayout. Initializes all
		 * listener.
		 */
		this.drawGrid = function() {			
			// empty container
			$container.empty();						

			// render contents into container			
			$container.append(tableTmpl(scope.findGridTmplContext()));
			scope.initEls();	
			scope.registerListeners();
			
			var columns = scope.controller.columns;
			var rows = scope.controller.rows;
			// fixed cols
			scope.renderFixedColumns(columns.slice(0, 1), scope.$fixedColumns);
			// header cols
			scope.renderColumns(columns.slice(1), null, scope.$columns);
			// fixed cell (left side)
			scope.renderFixedRows(columns.slice(0, 1), rows.slice(0, rows.length-1), scope.$fixedCells);
			// fixed footer cells (left lower corner)
			scope.renderFixedRows(columns.slice(0, 1), rows.slice(rows.length-1), scope.$fixedFooterCells);
			// data cells
			scope.renderRows(columns.slice(1), null, rows.slice(0, rows.length-1), scope.$cells);
			// footer cells
			scope.renderRows(columns.slice(1), null, rows.slice(rows.length-1), $footers);			
			
			// adjust layout components
			scope.adjustLayout();
			initHScroller();			
		};
		
		this.registerListeners = function(){
			// register event-listeners on el's here
		};
		
		/**
		 * The model which is delivered to tableTmpl.html
		 */
		this.findGridTmplContext = function(){
			return scope.controller;		
		};
		
		/**
		 * Invoked when data-cell, footer-cell is about to be rendered in template.
		 * @param: args : {row: RowModel, column: ColumnModel, width (optional)}
		 * @returns : the cell wrapped in jQuery
		 */
		this.createDataCell = function(args){			
			var width = args.width || scope.controller.columnWidth;
			var cell = args.row.findCell(args.column);
			var $cell = jQuery('<div></div>')
							.addClass('cell tableCell')
							.attr('data-rowid', args.row.id)
							.attr('data-columnid', args.column.id)
							.css({width: width, height: scope.controller.rowHeight})
							.data('row', args.row)
							.data('column', args.column)
							.data('cell', cell);
			// add content
			jQuery('<div></div>')
				.addClass('content')
				.text((cell || {}).value || '')
				.appendTo($cell);
			// let the user change cell - if he really must ... !!			
			$cell = scope.controller.onRenderDataCell(_.chain(args).extend({$cell: $cell}).value());
			$cell.children('.content').height($cell.height());
			return $cell; 					 
		};
		
		/**
		 * Same as 'createDataCell' but renders as fixed data-cell.
		 * @param: args : {row: RowModel, column: ColumnModel}
		 * @returns : the cell wrapped in jQuery
		 */
		this.createFixedDataCell = function(args){
			args.width = scope.controller.fixedColumnWidth;
			return scope.createDataCell(args);
		};
		
		/**
		 * Creates a column-cell.		  
		 * @param args : {column : ColumnModel, colidx : integer, width (optional)}
		 * @return : html-snippet to render
		 */
		this.createColumnCell = function(args){
			var width = args.width || scope.controller.columnWidth;
			var $cell = jQuery('<div></div>')
							.addClass('tableCell')
							.attr('data-id', args.column.id)
							.data('column', args.column)	
							.css({width: width, height: scope.controller.columnHeight});
			// content
			jQuery('<div></div>')
				.addClass('content')
				.text(args.column.label)
				.appendTo($cell);
			// let the user hook in
			$cell = scope.controller.onRenderColumnCell(_.chain(args).extend({$cell: $cell}).value());
			$cell.children('.content').height($cell.height());
			return $cell;
		};
		
		this.createFixedColumnCell = function(args){
			args.width = scope.controller.fixedColumnWidth;
			return scope.createColumnCell(args);
		};
		
		/**
		 * Renders the given columns and returns the html.
		 * @param columns
		 * @param cellCreator : either 'createFixedColumnCell' or 'createColumnCell'
		 * @param $container : the container to append the columns
		 */
		this.renderColumns = function(columns, cellCreator, $container){
			cellCreator = cellCreator || scope.createColumnCell;			
			_.chain(columns).each(function(column, idx){
				$container.append(cellCreator({column : column, colidx : idx}));
			});		
		};
		
		/**
		 * Renders the given columns as fixed cells.
		 * @param: columns : [ColumnModel] columns to render 
		 * @param $container : the container where to append the columns
		 */
		this.renderFixedColumns = function(columns, $container){
			scope.renderColumns(columns, scope.createFixedColumnCell, $container);
		};
		
		/**
		 * Renders cells of given rows which are in given columns.		  
		 * @param columns : [ColumnModel]
		 * @param rows : {RowModel} is given is restricted to them
		 * @param cellRenderer : either 'createFixedDataCell' or 'createDataCell'
		 * @param $container : the container to append the rows	
		 */
		this.renderRows = function(columns, cellRenderer, rows, $container){
			cellRenderer = cellRenderer || scope.createDataCell;			
			_.chain(rows).each(function(row, rowidx){				
				var $row = scope.$createRow(row).appendTo($container);
				_.chain(columns).each(function(column, colidx){ 
					$row.append(cellRenderer({row: row, column: column, colidx: colidx}));	 			  
				});  
			});			
		};
		
		/**
		 * Renders cells of given rows as fixed-cells corresp. to given columns.
		 * Left-side of table.
		 * @param columns : [ColumnModel], the columns which are horizontal and vertically fixed
		 * @param rows : [RowModel]
		 * @param $container : the container to append the rows
		 */
		this.renderFixedRows = function(columns, rows, $container){
			scope.renderRows(columns, scope.createFixedDataCell, rows, $container);
		};
		
		/**
		 * Creates a row.
		 * @params row : RowModel
		 */
		this.$createRow = function(row){
			return jQuery('<div></div>')
					.addClass('row')
					.attr('data-rowid', row.id)
					.data('row', row);
		};
		
		/**
		 * Initializes el's
		 */
		this.initEls = function(){			
			scope.$tableDecor = jQuery('.table-decor', $container);			
			scope.$allColumns = jQuery('.all-columns', scope.$tableDecor);
			$columnsContainer = jQuery('.columns-container', scope.$tableDecor);			
			scope.$columns = jQuery('.columns', $columnsContainer);
			scope.$fixedColumns = jQuery('.fixed-columns', scope.$allColumns);
			scope.$fixedCells = jQuery('.fixed-cells', scope.$tableDecor);
			scope.$cellContainer = jQuery('.cell-container', scope.$tableDecor);
			scope.$cells = jQuery('.cells', scope.$cellContainer);
			$hscroller = jQuery('.hscroller', scope.$tableDecor);
			$vscroller = jQuery('.vscroller', scope.$tableDecor);
			scope.$fixedFooterCells = jQuery('.fixed-footer-cells', scope.$tableDecor);
			$footerContainer = jQuery('.footer-container', scope.$tableDecor);
			$footers = jQuery('.footers', scope.$tableDecor);
		};

		/**
		 * Adjusts layout-components to each other. Dependencies are layoutSetting
		 * and css controlled width/height of container.
		 */
		this.adjustLayout = function() {			
			computedColumnHeight = computeColumnHeight();
			computedFixedColumnWidth = computeFixedColumnWidth();
			computedColumnsWidth = computeColumnsWidth(); 
			scope.$tableDecor.css({width: scope.controller.tableWidth, height: scope.controller.tableHeight});							

			scope.$allColumns.css({
				height : computedColumnHeight,
				width : scope.controller.tableWidth
			});

			$columnsContainer.css({
				height : computedColumnHeight,
				width : scope.controller.tableWidth - computedFixedColumnWidth,
				left : computedFixedColumnWidth
			});
			
			scope.$columns.css({
				height : computedColumnHeight,
				width : computedColumnsWidth
			});
			
			scope.$fixedColumns.css({
				height : computedColumnHeight,
				width : computedFixedColumnWidth				
			});		

			$vscroller.css({
				top : computedColumnHeight,
				height : scope.controller.tableHeight - computedColumnHeight - (scope.controller.fixFooter && scope.controller.rowHeight),
				width : scope.controller.tableWidth + jQuery.scrollbarWidth()
			});
			
			scope.$fixedCells.css({				
				width : computedFixedColumnWidth				
			});
			
			scope.$cells.css({
				width : computedColumnsWidth
			});
			
			scope.$cellContainer.css({				
				left : computedFixedColumnWidth,
				width : scope.controller.tableWidth - computedFixedColumnWidth				
			});
			
			if(scope.controller.fixFooter){
				adjustLayoutFooter();
			}	
			
			$hscroller.css({
				left : computedFixedColumnWidth,
				top : scope.controller.tableHeight,
				width : scope.controller.tableWidth - computedFixedColumnWidth
			});			
			jQuery('.fake', $hscroller).width(computedColumnsWidth);
		};
		
		/**
		 * Adjusting layout for footer row.
		 */
		function adjustLayoutFooter(){
			scope.$fixedFooterCells.css({
				width : computedFixedColumnWidth,
				height : scope.controller.rowHeight
			});
			
			$footerContainer.css({
				left : computedFixedColumnWidth,
				width : scope.controller.tableWidth - computedFixedColumnWidth,
				height : scope.controller.rowHeight
			});
			
			$footers.css({
				height : scope.controller.rowHeight,
				width : computedColumnsWidth
			});
		}
		
		/**
		 * Sums-up the width of all columns (non-fixed).
		 * @return integer
		 */
		function computeColumnsWidth(){
			var width = 0;
			scope.$columns.children('.tableCell')
				.each(function(){
					width += jQuery(this).outerWidth();
				});
			return width;
		}
		
		/**
		 * Computes columns-height by taking the maximal height of column-cells.
		 * @return integer
		 */
		function computeColumnHeight(){
			var height = 0;
			scope.$columns.children('.tableCell')
				.add(scope.$fixedColumns.children('.tableCell'))
				.each(function(){
					height = Math.max(height, jQuery(this).outerHeight());
				 });
			return height;
		}
		
		/**
		 * Takes the width of the first column-cell.
		 * returns integer
		 */
		function computeFixedColumnWidth(){			
			return jQuery('.tableCell[data-id="'+scope.controller.columns[0].id+'"]', scope.$fixedColumns).outerWidth();			
		}
		
		/**
		 * Finds column-el by id.
		 * @param columnId
		 * @return the column
		 */
		this.$findColumnById = function(columnId){
			return jQuery('[data-id="'+columnId+'"]', scope.$allColumns);
		};
		
		/**
		 * Searches for the given cell.
		 * @param row : RowModel
		 * @param column : ColumnModel
		 * @param $container : if given, search is restricted to here.
		 */
		this.$findCell = function(row, column, $container){
			$container = $container || scope.$tableDecor;
			return jQuery('.tableCell[data-rowid="'+row.id+'"][data-columnid="'+column.id+'"]', $container);
		};
		
		/**
		 * Searches for the given cell.
		 * @param row : RowModel
		 * @param column : ColumnModel
		 * @param $container : the context ($fixedCells or $cellContainer) 
		 */
		this.$findRow = function(row, $container){			
			return jQuery('.row[data-rowid="'+row.id+'"]', $container);
		};

		/** 
		 * Supports synchronized horizontal scrolling of cells-table and columns.
		 * h-scrolling triggers transitions of cells-table and columns.		  
		 * 
		 */
		function initHScroller() {
			$hscroller.on('scroll', function(event) {
				var scroll = $hscroller.scrollLeft();
				_.chain([scope.$columns, scope.$cells, $footers]).each(function($contents){
					$contents && $contents.css('left', -scroll + 'px');
				});			
			});
		}	
		

		init();
		
		
		
	}

	return TableView;
});