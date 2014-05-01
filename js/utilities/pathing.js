define( [], function() {
   'use strict';

   // Length of a horizontal link stub that helps visualizing where a link is attached
   var STUB_LENGTH = 20;
   var ARROW_HEAD_LENGTH = 3;
   var CURVE_PADDING = 8;

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   var round = Math.round, abs = Math.abs, min = Math.min, max = Math.max;

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   function svgLinearLinkPath( fromLeft, fromTop, toLeft, toTop, fromStubSgn, toStubSgn ) {
      var fromX = round( fromLeft ),
          fromY = round( fromTop ),
          toX = round( toLeft ),
          toY = round( toTop );

      var path = [ 'M', fromX, ',', fromY ];
      path.push( 'H', fromX + fromStubSgn * STUB_LENGTH );
      path.push( 'L', toX + toStubSgn * STUB_LENGTH, ',', toY );
      path.push( 'H', toX );

      return path.join('');
   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   /**
    * Try to circumvent boxes which are in the way
    */
   function svgCubicBezierLinkPath( fromLeft, fromTop, toLeft, toTop, fromStubSgn, toStubSgn, fromBox, toBox, noArrow ) {
      // Parameters:
      var curvePadding = CURVE_PADDING;
      var stubLength = STUB_LENGTH;
      var arrowHeadLength = ARROW_HEAD_LENGTH;

      var reverse, x0, y0, xN, yN, stub0, stubN, box0, boxN;
      initializeParameters();

      // Current path and position:
      var x = x0, y = y0;
      var path = [];
      var useBezierY = false;
      path.push( 'M', x, ',', y );

      if ( reverse ) {
         arrowHead();
      }

      horizontal( x + stub0 * stubLength );
      if ( stub0 < 0 ) {
         circumventBox0( box0, boxN, stubN );
      }
      if ( stubN > 0 && boxN ) {
         circumventBoxN( boxN );
      }
      else {
         cubic( xN + stubN * stubLength, yN );
      }
      horizontal( xN );

      if ( !reverse ) {
         arrowHead();
      }

      return path.join('');

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function initializeParameters() {
         var yRatio = 1;
         if( toBox ) {
            var boxDeltaY = abs( toTop > fromTop ? fromBox.bottom - toBox.top : toBox.bottom - fromBox.top );
            stubLength = STUB_LENGTH;
            if ( boxDeltaY < 3*STUB_LENGTH ) {
               yRatio = boxDeltaY / (3 * STUB_LENGTH);
               curvePadding = max( 3, max( 1, round( yRatio*CURVE_PADDING ) ) );
               stubLength += CURVE_PADDING - curvePadding;
            }
         }

         var deltaX = abs( fromLeft - toLeft );
         if ( deltaX < 3*STUB_LENGTH && yRatio < 1 ) {
            var xRatio = deltaX/(3*STUB_LENGTH);
            stubLength = max( 3, round( xRatio*STUB_LENGTH ) );
            curvePadding = max( 1, round( xRatio*CURVE_PADDING ) );
         }

         // Simplify by always drawing a path from left to right:
         reverse = fromLeft + fromStubSgn*stubLength > toLeft + toStubSgn*stubLength;
         if ( reverse  ) {
            x0 = round( toLeft);   xN = round( fromLeft );
            y0 = round( toTop );   yN = round( fromTop );
            stub0 = toStubSgn;     stubN = fromStubSgn;
            box0 = toBox;          boxN = fromBox;
         }
         else {
            x0 = round( fromLeft); xN = round( toLeft );
            y0 = round( fromTop ); yN = round( toTop );
            stub0 = fromStubSgn;   stubN = toStubSgn;
            box0 = fromBox;        boxN = toBox;
         }

      }

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

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

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function arrowHead() {
         if ( noArrow ) {
            return;
         }
         var ax = x - 20 - arrowHeadLength, ay = y;
         path.push( 'M', ax, ',', ay - arrowHeadLength,
                    'L', ax + 20/2, ',', ay,
                    'L', ax, ',', ay + arrowHeadLength,
                    'L', ax + arrowHeadLength, ',', ay,
                    'L', ax, ',', ay - arrowHeadLength,
                    'M', x, ',', y );
      }

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
         if ( yDir === 1 ) {
            vertical( max( box0.bottom, y+curvePadding ) );
         }
         else {
            vertical( min( box0.top, y-curvePadding) );
         }

         // Cling to bottom/top edge as far as needed:
         if ( yN * yDir < y * yDir || abs(y - yN)*4 < abs(x - xN) ) {
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

      ////////////////////////////////////////////////////////////////////////////////////////////////////////

      function circumventBoxN() {
         // Draw line to nearest corner of boxN:
         var yDir, yEdge, xEdge, sweep;
         if ( abs(boxN.top - y) + (y < yN ? -1 : 0) < abs(y - boxN.bottom) ) {
            yDir = 1;
            yEdge = min( boxN.top - curvePadding, yN -2*curvePadding );
            sweep = 1;
            xEdge = yEdge > y ? boxN.right : boxN.left;
         }
         else {
            yDir = -1;
            yEdge = max( boxN.bottom + curvePadding, yN +2*curvePadding );
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

   }

   ///////////////////////////////////////////////////////////////////////////////////////////////////////////

   return {
      cubic: svgCubicBezierLinkPath,
      linear: svgLinearLinkPath
   };

} );