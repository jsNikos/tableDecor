define(['./TableView', 'underscore-ext'], function(TableView){
	
	return HierarchyTableView;
	
	/**
	 * View extending TableView and supporting to show hierarchies in columns and rows.
	 */
	function HierarchyTableView(args){
		var scope = this;		
		// inheritance
		TableView.call(this, args);
			
		
		var super_initEls = this.initEls;
		this.initEls = function(){
			super_initEls.call(this);
			this.$tableDecor.addClass('hierarchy-table-decor');
		};
		
		/**
		 * Registers event-listener on table-components.
		 */
		this.registerListeners = function(){
			// row-opener
			scope.$fixedCells.on('click', '.tableCell .content', scope.controller.handleFixedCellClick);
			// column-opener
			scope.$columns.on('click', '.tableCell .content', scope.controller.handleColumnCellClick);
		};
		
		/**
		 * Renders the given columns and returns the html.
		 * Iterates the hierarchy.
		 * @param columns : [ColumModel]
		 * @param cellCreator : either 'createFixedColumnCell' or 'createColumnCell'
		 * @param $container : the container to append the columns
		 */
		this.renderColumns = function(columns, cellCreator, $container){
			cellCreator = cellCreator || scope.createColumnCell;
			var $rootLevel = $container;
			
			// visit nodes in hierarchy and create corresp. dom-tree.
			_ext.visitNodes(columns, visitor, $rootLevel);
			
			function visitor(column, colidx, $levelContainer){
				var $nextLevel = $createLevelContainer();
				var $column = jQuery(cellCreator({column : column, colidx : colidx}))				
								   .append($nextLevel)
								   .appendTo($levelContainer);
				return column.open && $nextLevel;
			}			
		};
		
		/**
		 * Renders cells underneath given root-rows which are underneath given root-columns.
		 * It is extracted which row-level and which column-level are to be shown, based on
		 * the open-status of rows/columns.		  
		 * @param columns : [ColumnModel]
		 * @param rows : {RowModel} is given is restricted to them
		 * @param cellRenderer : either 'createFixedDataCell' or 'createDataCell'
		 * @param $container : the container to append the rows		 
		 */
		this.renderRows = function(columns, cellRenderer, rows, $container){
			cellRenderer = cellRenderer || scope.createDataCell;			
			var displayedRows = scope.controller.findDisplayedRows(rows);
			var displayedCols = scope.controller.findDisplayedColumns(columns);
			_.chain(displayedRows).each(function(row, rowidx){				
				var $row = scope.$createRow(row).appendTo($container);
				_.chain(displayedCols).each(function(column, colidx){					
					$row.append(cellRenderer({row: row, column: column, colidx: colidx}));	 			  
				});  
			});			
		};
		
		/**
		 * Renders cells of given row-hierarchy as fixed-cells corresp. to given columns.
		 * These columns is naturally fixed either and the first column's childs are taken
		 * to be the row-level headers. They cannot have any deeper levels.
		 * @param columns : [ColumnModel], the columns which are horizontal and vertically fixed
		 * @param rows : [RowModel]
		 * @param $container : the container to append the rows
		 */
		this.renderFixedRows = function(columns, rows, $container){			
			var $rootLevel = $container;
			var rowLevelHeaders = columns[0].childs;
			
			// visit nodes in hierarchy and create corresp. dom-tree.
			_ext.visitNodes(rows, visitor, $rootLevel);
			
			function visitor(row, rowidx, $levelContainer){
				var $nextLevel = $createLevelContainer();
				var $row = scope.$createRow(row).appendTo($levelContainer);
				jQuery(scope.createFixedDataCell({row: row, column: rowLevelHeaders[row.level], colidx: row.level}))				
								   .append($nextLevel)
								   .appendTo($row);
				return row.open && $nextLevel;
			}
			// when more than one fixed col is supported rendering goes here columns[1 ...]					
		};
			
		/**
		 * Triggers to remove all child rows for the given row from view.
		 * This method can be applied only 'fixed-cells' which have hierarchy.
		 * This triggers to remove all descendent rows in data-cells.
		 * @param row : RowModel
		 * @param column : ColumnModel
		 */
		this.removeDescendingRows = function(row , column){			
			if(!row.childs || row.childs.length === 0){
				return;
			}			
			var $targetCell = scope.$findCell(row, column, scope.$fixedCells);
			// collect rows to remove (fixedCells and cellContainer)
			var $toEmpty = $targetCell.children('.level-container');
			var dataCellRows =	_ext.extractNodesUntil(row.childs, function(row){ return row.open; });
			_.chain(dataCellRows).each(function(row){
				// add data-cell row				
				$toEmpty = $toEmpty.add(scope.$findRow(row, scope.$cellContainer));
			});
			$toEmpty.empty();	
			// re-render this row and replace with old
			var $holder = jQuery('<div></div>');
			scope.renderFixedRows(scope.controller.columns.slice(0, 1), [row], $holder);
			$targetCell.closest('.row')
					   .replaceWith($holder.children());
			// adjust the layout
			scope.adjustLayout();
		};	
		
		
		/**
		 * Triggers to show row's child-rows.
		 * @param row : RowModel
		 */
		this.addChildRows = function(row, column){
			if(!row.childs || row.childs.length === 0){
				return;
			}
			// render fixedRows
			var $targetCell = scope.$findCell(row, column, scope.$fixedCells);			
			scope.renderFixedRows(scope.controller.columns.slice(0, 1), row.childs, $targetCell.children('.level-container'));
			
			// render rows
			var $holder = jQuery('<div></div>');
			scope.renderRows(scope.controller.columns.slice(1), null, row.childs, $holder); 
			scope.$findRow(row, scope.$cellContainer)
				 .after($holder.children());
			
			// adjust the layout
			scope.adjustLayout();
		};
		
		/**
		 * Removes descending columns underneath given column. As well triggers to 
		 * refresh rows to display the correct cell-value.
		 * @param column : ColumnModel
		 */
		this.removeDescendingColumns = function(column){
			if(!scope.controller.nodeHasChildren(column)){
				return;
			}	
			
			// the column is closed, calling to re-rendering and replacing old one
			var $column = scope.$findColumnById(column.id); 
			var $columnHolder = jQuery('<div></div>');
			$column.children('.level-container').empty();			
			scope.renderColumns(column, null, $columnHolder);
			$column.replaceWith($columnHolder.children());
			
			// for each row replace cells with cell underneath column in row
			var oldDisplayedColIds = _.chain(scope.controller.findDisplayedColumns(column.childs)).pluck('id').value();
			scope.$cells.children('.row').each(function(){
				var $row = jQuery(this);
				// get cells to be replaced
				var $cellsToReplace = 
						$row.children('.tableCell')
						    .filter(function(){ return _.contains(oldDisplayedColIds, jQuery(this).attr('data-columnid'));	});
				// create cell to replace with
				var $newCell = scope.createDataCell({row: $row.data('row'), column: column});	 			  
				$newCell.insertBefore($cellsToReplace.get(0));
				$cellsToReplace.remove();
			});			
			
			// adjust the layout
			scope.adjustLayout();
		};
		
		/**
		 * Adds the columns childs to view. As well triggers to refresh rows
		 * to display the correct cell-value.
		 * @param column : ColumnModel
		 */
		this.addChildColumns = function(column){
			if(!column.childs || column.childs.length === 0){
				return;
			}
			// render fixed-columns
			var $targetCell = scope.$findColumnById(column.id);			
			var $newColHolder = jQuery('<div></div>');
			scope.renderColumns([column], null, $newColHolder);
			$targetCell.replaceWith($newColHolder.children());			
			
			// replace cells in rows for displayed columns
			var displayedCols = scope.controller.findDisplayedColumns([column]);
			scope.$cells.children('.row').each(function(){
				var $row = jQuery(this);
				var row = $row.data('row');
				// get cell to be replaced
				var $cellToReplace = scope.$findCell(row, column, $row);					
				// create cells to replace with
				$newCellsHolder = jQuery('<div></div>');
				_.chain(displayedCols).each(function(column){ 
					$newCellsHolder.append(scope.createDataCell({row: row, column: column}));	 			  
				}); 
				$cellToReplace.replaceWith($newCellsHolder.children());
			});
			
			// adjust the layout
			scope.adjustLayout();			
		};
		
		/**
		 * Iterates through columns and adapts sizes by summing-up required sizes for
		 * lower levels.
		 */
		function adjustColumnSizes(){
			visitCells(scope.$fixedColumns.children('.tableCell'), postVisitor, findNextLevel);
			visitCells(scope.$columns.children('.tableCell'), postVisitor, findNextLevel);
			
			function findNextLevel($node){
				return jQuery('.level-container', $node).children('.tableCell');
			}
			
			// invoked after iterating all childs first
			function postVisitor($tableCell){				
				var height = 0;
				var width = 0;
				var heightLevelCont = 0;
				var $levelContainer = $tableCell.children('.level-container');				
				$levelContainer.children('.tableCell')
					.each(function(){
						var $child = jQuery(this); 
						height = Math.max(height, $child.height());
						width += $child.width();
						heightLevelCont = Math.max(heightLevelCont, $child.height());
					});
				$tableCell.height($tableCell.children('.content').height() + height)
						  .width(width || $tableCell.width());
				$levelContainer.height(heightLevelCont);
			}
		}
		
		var super_adjustLayout = this.adjustLayout;
		this.adjustLayout = function(){
			adjustColumnSizes();
			adjustRowSizes();
			super_adjustLayout.call(this);
			adjustHeightOfLeafCols();			
		};
		
		/**
		 * For all columns displayed as leaf, the height is extended to fully use
		 * the all-columns container height.
		 */
		function adjustHeightOfLeafCols(){
			_.chain(scope.controller.columns.findDisplayedColumns()).each(function(column){
				var $column = scope.$findColumnById(column.id);
				var height = $column.height();
				// add the missing height
				height += scope.$allColumns.height() - ($column.offset().top + height - scope.$allColumns.offset().top);			
				$column.height(height);
				$column.children('.content').outerHeight(height);
			});			
		}
		
		/**
		 * Iterates through fixed-rows and adapts sizes by summing-up required sizes for
		 * lower levels. Width is computed by adjusting to the column-header.
		 */
		function adjustRowSizes(){
			var levelWidth = computeRowLevelWidth(); 
			visitCells(scope.$fixedCells.children('.row'), postVisitor, findNextLevel);
			visitCells(scope.$fixedFooterCells.children('.row'), postVisitor, findNextLevel);
			
			function findNextLevel($row){				
				return $row.children('.tableCell').children('.level-container').children('.row');			
			}
			
			// invoked after iterating all childs first
			function postVisitor($row){				
				var height = 0;
				var width = 0;		
				var $tableCell = $row.children('.tableCell');
				var $levelContainer = $tableCell.children('.level-container');				
				$levelContainer.children('.row')
					.each(function(){
						var $child = jQuery(this).children('.tableCell'); 
						height += $child.height();							
						width = Math.max(width, $child.width());
					});				
				$tableCell.height($tableCell.children('.content').height() + height)
						  .width(levelWidth[$tableCell.data('row').level]);			
				$row.height($tableCell.height());
			}			
		}	
		
		/**
		 * Computes for each row-level the require width by summing-up the width of corresponding
		 * row-headers (first column's childs).
		 * @return {level : Number}
		 */
		function computeRowLevelWidth(){
			var result = [];
			scope.$fixedColumns.find('.level-container > .tableCell').each(function(idx){
				result[idx] = jQuery(this).width();
			});
			for(var idx = result.length - 1; idx > 0; idx--){
				result[idx-1] = result[idx-1] + result[idx];
			}
			return result;
		}
		
		/**
		 * Iterates through given node-hierarchy.
		 * @param $nodes
		 * @param postVisitor : is invoked after all child's are iterated
		 * @param context
		 * @param findNextLevel : used to extract next level of childs in iteration
		 *   					function($node) - invoked with current node
		 */
		function visitCells($nodes, postVisitor, findNextLevel){			
			$nodes.each(function(){
				iterate(jQuery(this));
			});
			
			function iterate($node){					
				findNextLevel($node).each(function(){
						iterate(jQuery(this));
					});
				postVisitor($node);	
			}			
		};
		
		/**
		 * Creates a container for column/row cells suitable to display next level cells
		 * in hierarchy. 
		 */
		function $createLevelContainer(){
			return jQuery('<div></div>').addClass('level-container');
		}
		
		
		
	}
	
});