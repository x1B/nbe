define([], function () {


   // Length of a link stub (which helps visualizing where the link is attached).
   var STUB_LENGTH = 12;
   // A stub for a link attached to the left edge of a box.
   var STUB_IN = -1;
   // A stub for a link attached to the right edge of a box.
   var STUB_OUT = 1;
   // No stub (link attached to mouse cursor).
   var STUB_NONE = 0;

   //////////////////////////////////////////////////////////////////////////////////////////////////////////

   var round = Math.round, abs = Math.abs, min = Math.min, max = Math.max;
   function svgLinearLinkPath( fromLeft, fromTop, toLeft, toTop, fromStub, toStub ) {
      var fromX = round( fromLeft), fromY = round( fromTop ), toX = round( toLeft ), toY = round( toTop );
      var useStubsX = abs( fromX - toX ) > STUB_LENGTH * 2;

      var path = [ 'M', fromX, ',', fromY ];
      path.push( 'H', fromX + fromStub*STUB_LENGTH );
      path.push( 'L', toX + toStub*STUB_LENGTH, ',', toY );
      path.push( 'H', toX );

      return path.join('');
   }

   /**
    * Try to circumvent boxes which are in the way
    */
   function svgCubicBezierLinkPath( fromLeft, fromTop, toLeft, toTop, fromStub, toStub, fromBox, toBox ) {
      var x0, y0, xN, yN, stub0, stubN, box0, boxN;
      var padding = STUB_LENGTH;

      // console.log( 'fromBox', fromBox );
      // console.log( 'toBox', toBox );

      // Simplify by always drawing a path from left to right.
      if ( fromLeft <= toLeft ) {
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
         var middleX = (toX - x) / 2;
         path.push( 'C', x + middleX, ',', y, ' ', x + middleX, ',', toY, ' ', toX, ',', toY );
         x = toX;
         y = toY;
      }

      function horizontal( xAbs ) {
         x = xAbs;
         path.push( 'H', x );
      }

      function arc90( xSgn, ySgn, sweep ) {
         x += xSgn * padding;
         y += ySgn * padding;
         path.push( 'A', padding, ',', padding, ' 0 0,', sweep, ' ', x, ',', y );
      }

      function vertical( yAbs ) {
         y = yAbs;
         path.push( 'V', yAbs );
      }

      // Current path and position:
      var x = x0, y = y0;
      var path = [];
      // if (box0) drawBox( box0 );
      // if (boxN) drawBox( boxN );
      path.push( 'M', x, ',', y );

      horizontal( x + stub0 * padding );
      if ( stub0 < 0 ) {
         circumventBox0( box0, boxN, stubN );
      }
      if ( stubN > 0 && boxN ) {
         circumventBoxN( boxN );
      }
      else {
         cubic( xN + stubN * padding, yN );
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
            yDir = (box0.top - y < y - box0.bottom) ? -1 : 1;
         }

         var sweep = yDir === 1 ? 0 : 1;

         // Arc and go to bottom/top:
         arc90( -1, yDir, sweep );
         if ( yDir == 1 ) {
            vertical( max( box0.bottom, y+padding ) );
         }
         else {
            vertical( min( box0.top, y-padding) );
         }
         arc90( 1, yDir, sweep );

         // Cling to bottom/top edge as far as needed:
         if ( yN * yDir < y * yDir ) {
            horizontal( max( x, min( box0.right, xN - 2*padding ) ) );
         }
      }

      function circumventBoxN() {
         // Draw line to nearest corner of boxN:
         var yDir, yEdge, xEdge, sweep;
         if (abs(boxN.top - y) < abs(y - boxN.bottom)) {
            yDir = 1;
            yEdge = min( boxN.top - padding, yN - 2*padding );
            sweep = 1;
            xEdge = yEdge > y ? boxN.right : boxN.left, x;
         }
         else {
            yDir = -1;
            yEdge = max( boxN.bottom + padding, yN + 2*padding );
            sweep = 0;
            xEdge = yEdge < y ? boxN.right : boxN.left, x;
         }

         cubic( max( xEdge, x + padding ), yEdge );
         // Stick to bottom/top edge as far as needed:
         horizontal( boxN.right );
         // turn towards port
         arc90( 1, yDir, sweep );
         vertical( yN - yDir * padding );
         arc90( -1, yDir, sweep );
      }

      return path.join('');
   }

   return svgCubicBezierLinkPath;

} );