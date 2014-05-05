define(['underscore-ext'], function(){
	
	return new HierarchyModelUtils();
	
	/**
	 * Utilities supporting hierarchy-table models.
	 * 
	 */
	function HierarchyModelUtils(){
		
		/**
		 * Add this model-utils to given nodes by creating an object
		 * which extends the nodes-array by this instance.
		 * @param nodes : Array
		 * @returns : instance extending nodes
		 */
		this.addToModel = function(nodes){
			var scope = this;
			var Constr = function(){
				_.extend(this, scope);
			};
			Constr.prototype = nodes;
			return new Constr();
		};
		
		/**
		 * Searches the hierarchy for columns to display.
		 * parent: open, this: leaf or closed
		 * @param columns : ColumnModel, may be undefined then 'this' is taken		  
		 * @returns [ColumnModel]
		 */
		this.findDisplayedColumns = function(columns){
			return _ext.extractLeafsUntil(columns || this, deeper);
			
			function deeper(node){				
				return node.open && node.childs && node.childs.length > 0;				
			}			
		};
		
		/**
		 * Searches the rows-hierarchy for rows to display (all up to closed nodes including their parents)
		 * @param rows : {RowModel]
		 * @returns [RowModel]
		 */
		this.findDisplayedRows = function(rows){
			return _ext.extractNodesUntil(rows || this, deeper);
			
			function deeper(node){				
				return node.open && node.childs && node.childs.length > 0;				
			}
		};
		
		/**
		 * Searches the next sybling for the given node.
		 * @param node : {id: child:[nodes], parent: node}
		 * @throw when node has no parent.
		 */
		this.findNextSybling = function(node){
			if(!node.parent){
				throw new Error('Has no parent, therefore no syblings');
			}
			var syblings = node.parent.childs;
			return syblings[_.indexOf(syblings, node)+1];			
		};
		
		/**
		 * Returns whether given node has children.
		 * @param node : {id, childs : [node] }
		 * @return boolean
		 */
		this.nodeHasChildren = function(node){
			return node && node.childs && node.childs.length > 0;
		};
		
	}	
	
});