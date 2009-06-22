/* ************************************************************************

   qooxdoo - the new era of web development
   http://qooxdoo.org

   Copyright:
     2008 Dihedrals.com, http://www.dihedrals.com

   License:
     LGPL: http://www.gnu.org/licenses/lgpl.html
     EPL: http://www.eclipse.org/org/documents/epl-v10.php
     See the LICENSE file in the project's top-level directory for details.

   Authors:
     * Chris Banford (zermattchris)

************************************************************************ */

/**
 * A basic layout, which supports positioning of child widgets in a 'flowing'
 * manner, starting at the container's top/left position, placing children left to right
 * (like a HBox) until the there's no remaining room for the next child. When
 * out of room on the current line of elements, a new line is started, cleared
 * below the tallest child of the preceeding line -- a bit like using 'float'
 * in CSS, except that a new line wraps all the way back to the left.
 *
 * *Example*
 *
 * Here is a little example of how to use the Flow layout.
 *
 * <pre class="javascript">
 * var flow = new qx.ui.layout.FlowLayout("center")      // defaults to "left"
 *
 * var container = new qx.ui.container.Composite( new qx.ui.layout.Flow( flow ) );
 *
 * var button1 = new qx.ui.form.Button("First Button is long! Overflow should stay centered (and a wee bit of margin too...)", "custom/test.png");
 * button1.setMargin(3);
 * container.add(button1);
 *
 * var button2 = new qx.ui.form.Button("2. Button", "custom/test.png");
 * container.add(button2);
 *
 * var button3 = new qx.ui.form.Button("3rd TALL & really, really, really long Button", "custom/test.png");
 * button3.setHeight(100);  // tall button
 * container.add(button3);
 *
 * var button4 = new qx.ui.form.Button("Number 4", "custom/test.png");
 * container.add(button4);
 *
 * this.getRoot().add(container, {edge: 0});
 *
 * </pre>
 *
 */

qx.Class.define("flowlayout.FlowLayout",
{
  extend : qx.ui.layout.Abstract,


  /*
  *****************************************************************************
     CONSTRUCTOR
  *****************************************************************************
  */

  /**
   * @param spacing {Integer?0} The spacing between child widgets {@link #spacing}.
   * @param alignX {String?"left"} Horizontal alignment of the whole children
   *     block {@link #alignX}.
   */
  construct : function(spacing, alignX)
  {
    this.base(arguments);

    if (spacing) {
      this.setSpacing(spacing);
    }

    if (alignX) {
      this.setAlignX(alignX);
    }
  },



  /*
  *****************************************************************************
     PROPERTIES
  *****************************************************************************
  */

  properties :
  {
    /**
     * Horizontal alignment of the whole children block. The horizontal
     * alignment of the child is completely ignored in HBoxes (
     * {@link qx.ui.core.LayoutItem#alignX}).
     */
    alignX :
    {
    check : [ "left", "center", "right" ],
    init : "left",
    apply : "_applyLayoutChange"
    },

    /**
     * Vertical alignment of each child. Can be overridden through
     * {@link qx.ui.core.LayoutItem#alignY}.
     */
    alignY :
    {
    check : [ "top", "middle", "bottom", "baseline" ],
    init : "top",
    apply : "_applyLayoutChange"
    },

    /** Horizontal spacing between two children */
    spacing :
    {
    check : "Integer",
    init : 0,
    apply : "_applyLayoutChange"
    },


    /** Whether the actual children list should be layouted in reversed order. */
    reversed :
    {
      check : "Boolean",
      init : false,
      apply : "_applyReversed"
    }
    
  },



  /*
  *****************************************************************************
     MEMBERS
  *****************************************************************************
  */

  members :
  {
    __currLinesTotalChildWidth : 0,
    __currLinesTallestChild : 0,

    /*
    ---------------------------------------------------------------------------
      HELPER METHODS
    ---------------------------------------------------------------------------
    */

    // property apply
    _applyReversed : function()
    {
      // easiest way is to invalidate the cache
      //this._invalidChildrenCache = true;

      // call normal layout change
      this._applyLayoutChange();
    },
	
	
	
    /*
    ---------------------------------------------------------------------------
      LAYOUT INTERFACE
    ---------------------------------------------------------------------------
    */

    // overridden
    verifyLayoutProperty : qx.core.Variant.select("qx.debug",
    {
      "on" : function(item, name, value)
      {
            this.assert( false, "The property '"+name+"' is not supported by the flow layout!" );
      },

      "off" : null
    }),

    //-------------------------------------------------------------------
    // overridden
	//-------------------------------------------------------------------
    /**
     * The FlowLayout tries to add as many Children as possible to the current 'Line'
     * and when it sees that the next Child won't fit, it starts on a new Line, continuing
     * until all the Children have been added.
     * To enable alignX "left", "center", "right" renderLayout has to calculate the positions
     * of all a Line's children before it draws them.
     * @param availWidth {Integer} Final width available for the content (in pixel)
     * @param availHeight {Integer} Final height available for the content (in pixel)
     * @return {void}
     */
    renderLayout : function( availWidth, availHeight )
    {
      var util = qx.ui.layout.Util;
      var children = this._getLayoutChildren();
      var child, size, left, top, childW;
      var marginL, marginR, marginT, marginB;

      var linesChildrenIndexes =[];
      var newLineFlag = false;

      var lineLeft = 0, lineTop = 0;
      var tallestChildInLine = 0;


      // Reverse support.
      // Todo: move this to the _cache like with HBox...
      if (this.getReversed()) {
        children = children.concat().reverse();
      }

      
      // Compute gaps
      //var spacing = this.getSpacing();
      //var separator = this.getSeparator();
      //if (separator) {
      //  var gaps = util.computeHorizontalSeparatorGaps(children, spacing, separator);
      //} else {
      //var gaps = util.computeHorizontalGaps(children, spacing, true);
      //}
     // this.info( "   >> Layout spacing: " + spacing );

      // Flow Render children
      //if ( qx.core.Variant.get("qx.debug") == "on" ){ this.info( "*** Render Start ***" ); }
      var lineCounter = 0;
      var currChildIndex = 0
      while ( currChildIndex < children.length )
      {
        lineCounter++;
        tallestChildInLine = 0;

        linesChildrenIndexes = this._getIndexesOfChildrenOnALine(children, currChildIndex, availWidth);

        /*
        // Debug msgs
        if ( qx.core.Variant.get("qx.debug") == "on" ){
          if ( linesChildrenIndexes.length > 0 ) {
            this.info( "Line #"+ (lineCounter) +" is "+this.getAlignX()+" aligned and has " + linesChildrenIndexes.length + "x children" );
          } else {
            this.info( "Line #"+ (lineCounter) +" is "+this.getAlignX()+" aligned and has 1 child" );
          }
        }
        */


        // Alignment X support
        var thisLineCurrLeft = 0;        // AlignX -> "left"
        if (this.getAlignX() != "left") {
          thisLineCurrLeft = availWidth - this.__currLinesTotalChildWidth;  // AlignX -> "right"
          if (this.getAlignX() == "center") {
            thisLineCurrLeft = Math.round(thisLineCurrLeft / 2);  // AlignX -> "center"
          }
          // reverse this Line's children, so the Flow starts from the
          // right edge of the container, with the proper child order (I think)
          if (this.getAlignX() == "right") {
            linesChildrenIndexes = linesChildrenIndexes.concat().reverse();
          }
        }



        // If there are multiple children that have place on this Line,
        // then loop through them and render each one after calculating
        // the correct left starting position due to alignX.
        var thisLineNr;
        var len = linesChildrenIndexes.length;
        for ( var x=0; x<len; x++ )
        {
          thisLineNr = linesChildrenIndexes[x];
          child = children[thisLineNr];
          //this.info( "   >> Render child: " + child.getLabel() );
          size = child.getSizeHint();
          // Keep track of the tallest child on this Line.
          marginT = child.getMarginTop();
          marginB = child.getMarginBottom();
          if ( (marginT + size.height + marginB) > tallestChildInLine ) {
            tallestChildInLine = (marginT + size.height + marginB);
          }
          marginL = child.getMarginLeft();
          marginR = child.getMarginRight();


          // Respect vertical alignment - alignY
          top = util.computeVerticalAlignOffset(child.getAlignY()||this.getAlignY(), (marginT + size.height + marginB), this.__currLinesTallestChild, marginT, marginB);


          child.renderLayout( (thisLineCurrLeft + marginL), (lineTop + top), size.width, size.height);

          thisLineCurrLeft += (marginL + size.width + marginR);
          currChildIndex++;
        }

        // Single child on Line
        // If this line contain's a single element that is wider than then
        // available space, then it still needs to be rendered to this Line,
        // and the line counter increased to the next line (otherwise any
        // element wider than availWidth wouldn't be shown...)
        // AlignX will have special meaning here! Will prob mean negative left pos...
        if ( len < 1 )
        {
          child = children[currChildIndex];
          //this.info( "   >> Render child wider than window on its own line: " + child.getLabel() );
          size = child.getSizeHint();
          // Only a single child on this line, so its automatically the tallest.
          marginT = child.getMarginTop();
          marginB = child.getMarginBottom();
          tallestChildInLine = (marginT + size.height + marginB);
          marginL = child.getMarginLeft();
          marginR = child.getMarginRight();


          // Adjust this single, possibly overflowing child for alignX.
          if ( (marginL + size.width + marginR) > availWidth )
          {
            // Child is overflowing.
            if (this.getAlignX() == "center")
            {
              var centeredLeft = Math.round((availWidth - (marginL + size.width + marginR)) / 2)
              //this.info( ">> Single centered overflow: " + centeredLeft );
              thisLineCurrLeft = centeredLeft;      // AlignX -> "center"
            }
            if (this.getAlignX() == "right")
            {
              var rightLeft = Math.round(availWidth - (marginL + size.width + marginR))
              //this.info( ">> Single centered overflow: " + centeredLeft );
              thisLineCurrLeft = rightLeft;      // AlignX -> "right"
            }
          }

          // alignY -> When a single child is displayed alone on a line,
          // there is no alignY applied, as this child's hieght is the Line's height.
          child.renderLayout( (thisLineCurrLeft + marginL), (lineTop + marginT), size.width, size.height);
          currChildIndex++;
        }

        // update the next line's top starting point.
        lineTop += tallestChildInLine;
      }
    },


	//-------------------------------------------------------------------
	/**
	* Protected helper method for renderLayout(). Looks forward in the list of this
	* FlowLayout's children to see how many will fit in a Line (using availWidth).
	* 
	* @param children {Array} List of children elements passed from renderLayout().
	* @param startIndex {Integer} The index number to start calculating Children widths with.
	* @param availWidth {Integer} Layout's available width for the content (in pixels). Passed directly from renderLayout().
	* @return childIndexList {Integer[]} Simple list of integers [4,5,6,7] that correspond to children in renderLayout's children list.
	*/
	_getIndexesOfChildrenOnALine : function(children, startIndex, availWidth)
	{
		var childIndexList = [];
		var child, size, childW;
		var marginL, marginR, marginT, marginB;
		var currLeft = 0;
		var tallestChildInLine = 0;

		for ( var i=startIndex, l=children.length; i<l; i++ )
		{
			// Add children indexes, until their accumulated widths
			// won't fit on a single line anymore.
			child = children[i];
			size = child.getSizeHint();
			marginL = child.getMarginLeft();
			marginR = child.getMarginRight();
			marginT = child.getMarginTop();
			marginB = child.getMarginBottom();
			childW = marginL + size.width + marginR;
			if ( currLeft + childW > availWidth ) {
				// Don't save this child and return this lines list of Child index numbers.
				break;
			}
			// Calc Tallest child on line.
			if ( (marginT + size.height + marginB) > tallestChildInLine ) {
				tallestChildInLine = (marginT + size.height + marginB);
			}
			childIndexList.push(i);
			currLeft += childW;

		}

		// keep track of the total width of all this line's children, so
		// renderLayout() can calculate the starting left position of the first child,
		// so that alignX works.
		this.__currLinesTotalChildWidth = currLeft;
		// Same for alignY
		this.__currLinesTallestChild = tallestChildInLine;

		return childIndexList;
	},

	// overridden
	//-------------------------------------------------------------------
	/**
	* Return the size of the layout assuming all items fit onto one single line (no wrapping).
	* @return {Map} The size hint.
	*/
	_computeSizeHint : function()
	{
		return {
			width : 0,
			height : 0
		};
	}
	
	// @todo:
	//-------------------------------------------------------------------
	/**
	* Calculate the height, for a given width. Not yet implemented in qx...
	*/
	//_getHeightForWidth : function(width)
	//{
	//	return {
	//		width : 0,
	//		height : 0
	//	};
	//}
	
	
	
  }
});
