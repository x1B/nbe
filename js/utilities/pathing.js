define([], function () {

   // Length of a horizontal link stub that helps visualizing where a link is attached
   var STUB_LENGTH = 20;

   // Stub length multiplier for a link attached to the left/right edge of a box.
   var STUB_IN = -1,  STUB_OUT = 1;

   // Stub length multiplier for no stub (link attached to mouse cursor).
   var STUB_NONE = 0;

   var CURVE_PADDING = 10;

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var round = Math.round, abs = Math.abs, min = Math.min, max = Math.max;

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function svgLinearLinkPath( fromLeft, fromTop, toLeft, toTop, fromStub, toStub ) {
      var fromX = round( fromLeft), fromY = round( fromTop ), toX = round( toLeft ), toY = round( toTop );
      var useStubsX = abs( fromX - toX ) > STUB_LENGTH * 2;

      var path = [ 'M', fromX, ',', fromY ];
      path.push( 'H', fromX + fromStub*STUB_LENGTH );
      path.push( 'L', toX + toStub*STUB_LENGTH, ',', toY );
      path.push( 'H', toX );

      return path.join('');
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Try to circumvent boxes which are in the way
    */
   function svgCubicBezierLinkPath( fromLeft, fromTop, toLeft, toTop, fromStub, toStub, fromBox, toBox ) {
      // Path state:
      var x0, y0, xN, yN, stub0, stubN, box0, boxN;
      var curvePadding = CURVE_PADDING;
      var stubPadding = STUB_LENGTH;

      // console.log( 'fromBox', fromBox );
      // console.log( 'toBox', toBox );

      // Simplify by always drawing a path from left to right.
      if ( fromLeft + fromStub*stubPadding <= toLeft + toStub*stubPadding  ) {
         x0 = round( fromLeft); xN = round( toLeft );
         y0 = round( fromTop ); yN = round( toTop );
         stub0 = fromStub;      stubN = toStub;
         box0 = fromBox;        boxN = toBox;
      }
      else {
         x0 = round( toLeft);   xN = round( fromLeft );
         y0 = round( toTop );   yN = round( fromTop );
         stub0 = toStub;        stubN = fromStub;
         box0 = toBox;          boxN = fromBox;
      }
      // console.log( 'link.0: ', xN, yN, stubN, boxN );
      // console.log( 'link.N: ', xN, yN, stubN, boxN );

      function drawBox( box ) {
         path.push( 'M', box.left, ',', box.top );
         path.push( 'H', box.right, 'V', box.bottom, 'H', box.left, 'V', box.top );
      }

      function cubic( toX, toY ) {
         var middleX = x + (toX - x) / 2;
         path.push( 'C', middleX, ',', y, ' ', middleX, ',', toY, ' ', toX, ',', toY );
         x = toX;
         y = toY;
      }

      function cubicY( toX, toY ) {
         var middleY = y + (toY - y) / 2;
         path.push( 'C', x, ',', middleY, ' ', toX, ',', middleY, ' ', toX, ',', toY );
         x = toX;
         y = toY;
      }

      function horizontal( xAbs ) {
         x = xAbs;
         path.push( 'H', x );
      }

      function arc90( xSgn, ySgn, sweep ) {
         x += xSgn * curvePadding;
         y += ySgn * curvePadding;
         path.push( 'A', curvePadding, ',', curvePadding, ' 0 0,', sweep, ' ', x, ',', y );
      }

      function vertical( yAbs ) {
         y = yAbs;
         path.push( 'V', yAbs );
      }

      // Current path and position:
      var x = x0, y = y0;
      var path = [];
      var useBezierY = false;
      // if (box0) drawBox( box0 );
      // if (boxN) drawBox( boxN );
      path.push( 'M', x, ',', y );

      horizontal( x + stub0 * stubPadding );
      if ( stub0 < 0 ) {
         circumventBox0( box0, boxN, stubN );
      }

      if ( stubN > 0 && boxN ) {
         circumventBoxN( boxN );
      }
      else {
         cubic( xN + stubN * stubPadding, yN );
      }
      horizontal( xN );

      function circumventBox0() {
         // down: 1, up: -1
         var yDir;
         if ( (!boxN && yN > y) || (boxN && boxN.top > box0.bottom) ) {
            // The entire dest is below this box: always go downwards
            yDir = 1;
         }
         else if ( (!boxN && yN < y) || (boxN && boxN.bottom < box0.top) ) {
            // The entire dest is above this box: always go upwards
            yDir = -1;
         }
         else {
            // Shortest path to edge of this box
            yDir = abs(box0.top - y) < abs(y - box0.bottom) ? -1 : 1;
         }

         var sweep = yDir === 1 ? 0 : 1;

         // Arc and go to bottom/top:
         arc90( -1, yDir, sweep );
         if ( yDir == 1 ) {
            vertical( max( box0.bottom, y+curvePadding ) );
         }
         else {
            vertical( min( box0.top, y-curvePadding) );
         }

         // Cling to bottom/top edge as far as needed:
         if ( yN * yDir < y * yDir || abs(y - yN)*4 < abs(x - xN) ) {
            // :TODO: dont do this if horizontal distance is very low...
            arc90( 1, yDir, sweep );
            if ( yN * yDir < y * yDir ) {
               horizontal( max( x, min( box0.right, xN - 2*curvePadding ) ) );
            }
         }
         else if ( !boxN && xN > box0.left ) {
            arc90( 1, yDir, sweep );
         }
         else {
            useBezierY = true;
         }
      }

      function circumventBoxN() {
         // Draw line to nearest corner of boxN:
         var yDir, yEdge, xEdge, sweep;
         if (abs(boxN.top - y) < abs(y - boxN.bottom)) {
            yDir = 1;
            yEdge = min( boxN.top - curvePadding, yN - 2*curvePadding );
            sweep = 1;
            xEdge = yEdge > y ? boxN.right : boxN.left;
         }
         else {
            yDir = -1;
            yEdge = max( boxN.bottom + curvePadding, yN + 2*curvePadding );
            sweep = 0;
            xEdge = yEdge < y ? boxN.right : boxN.left;
         }

         if ( useBezierY ) {
            cubicY( boxN.right + curvePadding, yEdge );
         }
         else {
            cubic( max( xEdge, x + curvePadding ), yEdge );
            // Stick to bottom/top edge as far as needed:
            horizontal( boxN.right );
            arc90( 1, yDir, sweep );
         }
         // turn towards port
         vertical( yN - yDir * curvePadding );
         arc90( -1, yDir, sweep );
      }

      return path.join('');
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return svgCubicBezierLinkPath;

} );