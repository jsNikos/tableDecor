define(['./TableController',
        './HierarchyTableView',
        './hierarchyModelUtils',
        './RowModel'],
function(TableController, HierarchyTableView, hierarchyModelUtils, RowModel){
	
	return function(args){
		HierarchyTableController.prototype = hierarchyModelUtils;
		return new HierarchyTableController(args);
	};
	
	/**
	 * This extends the tableController by adding functionality to render hierarichal data.
	 * That is where columns and rows define hierarchies and cells are attached to each node-combination.
	 * @args : extends the args of tableController, for own see options-section 
	 */
	function HierarchyTableController(args){
		var scope = this;		
		// options
		
		// inheritance - this call init and extends this by args		
		TableController.call(this, args);
		
		// model
		this.columns = hierarchyModelUtils.addToModel(this.columns);		
		this.rows = hierarchyModelUtils.addToModel(this.rows);		
		
		function init(){
			recInitRowModels(scope.rows);
			computeLevelsAndParents(scope.rows);			
			computeLevelsAndParents(scope.columns);
		}
		
		/**
		 * Handles fixed-cell click by opening/closing corresponding row.
		 * 'this' refers to cell's content-div.
		 */
		this.handleFixedCellClick = function(event) {
			var $cell = jQuery(this).parent('.tableCell');
			var row = $cell.data('row');
			var column = $cell.data('column');
			if (row.open) {				
				row.open = false;
				scope.view.removeDescendingRows(row, column);				
			} else {				
				row.open = true;
				scope.view.addChildRows(row, column);				
			}
		};
		
		/**
		 * Handles column-cell click by opening/closing corresponding column.
		 * 'this' refers to cell's content-div.
		 */
		this.handleColumnCellClick = function(event){
			var $cell = jQuery(this).parent('.tableCell');
			var column = $cell.data('column');			
			if (column.open) {				
				column.open = false;
				scope.view.removeDescendingColumns(column);				
			} else {				
				column.open = true;
				scope.view.addChildColumns(column);				
			}
		};
		
		/**
		 * Extends recursively all row-nodes by RowModel.
		 */
		function recInitRowModels(rows){
			_ext.visitNodes(rows, visitor, rows);
			function visitor(row, idx, level){
				RowModel.prototype = row;
				level[idx] = new RowModel();
				return row.childs;
			}
		}
		
		/**
		 * Computes level and parent of nodes and adds as property to each node.
		 * @param nodes : {id, childs: [node]}
		 */
		function computeLevelsAndParents(nodes){
			_ext.visitNodes(nodes, visitor, {level: 0, parent: null});
			// returns the children's level and parent
			function visitor(node, idx, args){
				node.level = args.level;
				node.parent = args.parent;
				return {level : args.level+1, parent : node};
			}
		}
		
		/**
		 * Initializes the view.
		 */
		this.initView = function(){			
			// init view			
			this.view = new HierarchyTableView({
				$container : args.$container,
				controller : scope
			});
		};	
		
		init();
	}
	
	// model types
	HierarchyTableController.RowModel = function(){
		// inheritance
		RowModel.call(this);		
		this.parent; // RowModel - is computed by controller
		this.childs; // [RowModel]
		this.level; // int 0-based	- is computed by controller
		this.open; // if rendered as open-node
	};
	
	// the first column's childs are interpreted as row-level-headers
	HierarchyTableController.ColumnModel = function(){
		// inheritance
		TableController.ColumnModel.call(this);		
		this.parent; // ColumnModel - is computed by controller
		this.childs; // [ColumnModel]
		this.level; // int 0-based - is computed by controller
		this.open; // if rendered as open-node
	};
	
	HierarchyTableController.CellModel = function(){
		// inheritance
		TableController.CellModel.call(this);		
	};
	
	
});