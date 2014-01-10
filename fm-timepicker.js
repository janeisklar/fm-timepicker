/**
 * Copyright (C) 2014, HARTWIG Communication & Events
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 * Created: 2014-01-07 15:49
 *
 * @author Oliver Salzburg
 * @copyright Copyright (C) 2014, HARTWIG Communication & Events
 * @license http://opensource.org/licenses/mit-license.php MIT License
 */

"use strict";

angular.module( "fm.components", [] )
  .filter( "fmTimeFormat", function() {
             return function( input, format ) {
               if( typeof input === "number" ) {
                 input = moment( input );
               }
               return moment( input ).format( format );
             }
           } )

  .filter( "fmTimeStep", function() {
             return function( input, start, end, step ) {
               if( null == start || null == end ) {
                 return input;
               }

               start = moment( start );
               end = moment( end );
               step = step || moment.duration( 30, "minutes" );

               for( var time = start.clone(); +time <= +end; time.add( step ) ) {
                 // We're using the UNIX offset integer value here.
                 // When trying to return the actual moment instance (and then later format it through a filter),
                 // you will get an infinite digest loop, because the returned objects in the resulting array
                 // will always be new, unique instances. We always need to return the identical, literal values for each input.
                 input.push( +time );
               }
               return input;
             };
           } )

  .controller( "fmTimepickerController", function( $scope ) {

                 // Create day of reference
                 $scope.reference = $scope.reference || moment();

                 $scope.isOpen = $scope.isOpen || false;
                 $scope.format = $scope.format || "HH:mm";
                 $scope.startTime = $scope.startTime || $scope.reference.startOf( "day" );
                 $scope.endTime = $scope.endTime || $scope.reference.endOf( "day" );
                 $scope.step = $scope.step || moment.duration( 30, "minutes" );
                 $scope.largeStep = $scope.largeStep || moment.duration( 60, "minutes" );

                 // Round the model value up to the next valid time that fits the configured steps.
                 var modelMilliseconds = $scope.ngModel.valueOf();
                 var stepMilliseconds = $scope.step.asMilliseconds();

                 modelMilliseconds -= modelMilliseconds % stepMilliseconds;
                 modelMilliseconds += stepMilliseconds;

                 $scope.ngModel = moment( modelMilliseconds );

                 /**
                  * Returns a time value that is within the bounds given by the start and end time parameters.
                  * @param {Moment} time The time value that should be constrained to be within the given bounds.
                  * @returns {Moment} A new time value within the bounds, or the input instance.
                  */
                 $scope.ensureTimeIsWithinBounds = function( time ) {
                   // Constrain model value to be in given bounds.
                   if( time.isBefore( $scope.startTime ) ) {
                     return moment( $scope.startTime );
                   }
                   if( time.isAfter( $scope.endTime ) ) {
                     return moment( $scope.endTime );
                   }
                   return time;
                 };
                 $scope.ngModel = $scope.ensureTimeIsWithinBounds( $scope.ngModel );


                 /**
                  * Makes sure that the moment instances we work with all use the same day as reference.
                  * We need this because we might construct moment instances from all kinds of sources,
                  * in the time picker, we only care about time values though and we still want to compare
                  * them through the moment mechanics (which respect the full date).
                  */
                 $scope.constrainToReference = function() {
                   if( !$scope.startTime.isSame( $scope.reference, "day" ) ) {
                     $scope.startTime.year( $scope.reference.year() ).month( $scope.reference.month() ).date( $scope.reference.date() );
                   }
                   if( !$scope.endTime.isSame( $scope.reference, "day" ) ) {
                     $scope.endTime.year( $scope.reference.year() ).month( $scope.reference.month() ).date( $scope.reference.date() );
                   }
                   if( !$scope.ngModel.isSame( $scope.reference, "day" ) ) {
                     $scope.ngModel.year( $scope.reference.year() ).month( $scope.reference.month() ).date( $scope.reference.date() );
                   }
                 };
                 $scope.constrainToReference();

                 /**
                  * Utility method to find the index of an item, in our collection of possible values, that matches a given time value.
                  * @param {Moment} model A moment instance to look for in our possible values.
                  */
                 $scope.findActiveIndex = function( model ) {
                   $scope.activeIndex = 0;
                   // We step through each possible value instead of calculating the index directly,
                   // to make sure we account for DST changes in the reference day.
                   for( var time = $scope.startTime.clone(); +time <= +$scope.endTime; time.add( $scope.step ), ++$scope.activeIndex ) {
                     if( time.isSame( model ) ) {
                       break;
                     }
                   }
                 };
                 // The index of the last element in our time value collection.
                 $scope.largestPossibleIndex = Number.MAX_VALUE;
                 // The amount of list items we should skip when we perform a large jump through the collection.
                 $scope.largeStepIndexJump = Number.MAX_VALUE;
                 // Seed the active index based on the current model value.
                 $scope.findActiveIndex( $scope.ngModel );

                 // Check the supplied step for validity.
                 $scope.$watch( "step", function( newStep, oldStep ) {
                   if( newStep.asMilliseconds() < 1 ) {
                     console.error( "[fm-timepicker] Error: Supplied step length is smaller than 1ms! Reverting to default." );
                     $scope.step = moment.duration( 30, "minutes" );
                   }
                 } );
                 // Check the supplied large step for validity.
                 $scope.$watch( "largeStep", function( newStep, oldStep ) {
                   if( newStep.asMilliseconds() < 10 ) {
                     console.error( "[fm-timepicker] Error: Supplied large step length is smaller than 10ms! Reverting to default." );
                     $scope.largeStep = moment.duration( 60, "minutes" );
                   }
                 } );
                 // Watch the given interval values.
                 $scope.$watchCollection( "[step,largeStep]", function( newValues ) {
                   // Pick array apart.
                   var newStep = newValues[0];
                   var newLargeStep = newValues[1];
                   // Get millisecond values for the intervals.
                   var newStepMilliseconds = newStep.asMilliseconds();
                   var newLargeStepMilliseconds = newLargeStep.asMilliseconds();
                   // Check if the large interval is a multiple of the interval.
                   if( 0 != ( newLargeStepMilliseconds % newStepMilliseconds ) ) {
                     console.log( "[fm-timepicker] Warning: Large interval is not a multiple of interval! Using internally computed value instead." );
                     $scope.largeStep = moment.duration( newStepMilliseconds * 5 );
                     newLargeStepMilliseconds = $scope.largeStep.asMilliseconds();
                   }
                   // Calculate how many indices we need to skip for a large jump through our collection.
                   $scope.largeStepIndexJump = newLargeStepMilliseconds / newStepMilliseconds;
                 } )
               } )

  .directive( "fmTimepicker", [
    "$timeout", function( $timeout ) {
      return {
        template   : "<div>" +
                     "  <div class='input-group'>" +
                     "    <input type='text' class='form-control' ng-model='time' ng-keyup='handleKeyboardInput($event)' ng-change='update()'>" +
                     "    <span class='input-group-btn'>" +
                     "      <button type='button' class='btn btn-default' ng-class='{active:isOpen}'>" +
                     "        <span class='glyphicon glyphicon-time'></span>" +
                     "      </button>" +
                     "    </span>" +
                     "  </div>" +
                     "  <div class='dropdown' ng-class='{open:isOpen}'>" +
                     "    <ul class='dropdown-menu form-control' style='height:auto; max-height:160px; overflow-y:scroll;'>" +
                       // Fill an empty array with time values between start and end time with the given interval, then iterate over that array.
                     "      <li ng-repeat='time in [] | fmTimeStep:startTime:endTime:step' ng-click='select(time,$index)' ng-class='{active:(activeIndex==$index)}'>" +
                       // For each item, check if it is the last item. If it is, communicate the index to a method in the scope.
                     "        {{$last?largestPossibleIndexIs($index):angular.noop()}}" +
                       // Render a link into the list item, with the formatted time value.
                     "        <a href='#' ng-click='preventDefault($event)'>{{time|fmTimeFormat:format}}</a>" +
                     "      </li>" +
                     "    </ul>" +
                     "  </div>" +
                     "</div>",
        replace    : true,
        restrict   : "E",
        scope      : {
          ngModel   : "=",
          format    : "=?",
          startTime : "=?",
          endTime   : "=?",
          step      : "=?",
          largeStep : "=?",
          isOpen    : "=?"
        },
        controller : "fmTimepickerController",
        require    : "ngModel",
        link       : function postLink( scope, element, attributes, controller ) {
          // Watch our input parameters and re-validate our view when they change.
          scope.$watchCollection( "[startTime,endTime,step]", function() {
            scope.constrainToReference();
            validateView();
          } );

          // Watch all time related parameters.
          scope.$watchCollection( "[startTime,endTime,step,ngModel]", function() {
            // When they change, find the index of the element in the dropdown that relates to the current model value.
            scope.findActiveIndex( scope.ngModel );
          } );


          /**
           * Invoked when we need to update the view due to a changed model value.
           */
          controller.$render = function() {
            // Convert the moment instance we got to a string in our desired format.
            var time = moment( controller.$modelValue ).format( scope.format );
            // Check if the given time is valid.
            var timeValid = checkTimeValueValid( time ) && checkTimeValueWithinBounds( time ) && checkTimeValueFitsStep( time );

            if( timeValid ) {
              // If the time is valid, store the time string in the scope used by the input box.
              scope.time = time;
            } else {
              throw new Error( "The provided time value is invalid." );
            }
          };

          /**
           * Reset the validity of the directive.
           * @param {Boolean} to What to set the validity to?
           */
          function resetValidity( to ) {
            controller.$setValidity( "time", to );
            controller.$setValidity( "bounds", to );
            controller.$setValidity( "step", to );
          }

          /**
           * Check if the value in the view is valid.
           * It has to represent a valid time in itself and it has to fit within the constraints defined through our input parameters.
           */
          function validateView() {
            resetValidity( true );
            // Check if the string in the input box represents a valid date according to the rules set through parameters in our scope.
            var timeValid = checkTimeValueValid( scope.time ) && checkTimeValueWithinBounds( scope.time ) && checkTimeValueFitsStep( scope.time );
            if( timeValid ) {
              // If the string is valid, convert it to a moment instance, store in the model and...
              controller.$setViewValue( moment( scope.time, scope.format ) );
              // ...convert it back to a string in our desired format.
              // This allows the user to input any partial format that moment accepts and we'll convert it to the format we expect.
              scope.time = moment( scope.time, scope.format ).format( scope.format );
            }
          }

          /**
           * Check if a given string represents a valid time in our expected format.
           * @param {String} timeString The timestamp is the expected format.
           * @returns {boolean} true if the string is a valid time; false otherwise.
           */
          function checkTimeValueValid( timeString ) {
            var time = timeString ? moment( timeString, scope.format ) : moment.invalid();
            if( !time.isValid() ) {
              controller.$setValidity( "time", false );
              controller.$setViewValue( null );
              return false;
            } else {
              controller.$setValidity( "time", true );
              return true;
            }
          }

          /**
           * Check if a given string represents a time within the bounds specified through our start and end times.
           * @param {String} timeString The timestamp is the expected format.
           * @returns {boolean} true if the string represents a valid time and the time is within the defined bounds; false otherwise.
           */
          function checkTimeValueWithinBounds( timeString ) {
            var time = timeString ? moment( timeString, scope.format ) : moment.invalid();
            if( !time.isValid() || time.isBefore( scope.startTime ) || time.isAfter( scope.endTime ) ) {
              controller.$setValidity( "bounds", false );
              controller.$setViewValue( null );
              return false;
            } else {
              controller.$setValidity( "bounds", true );
              return true;
            }
          }

          /**
           * Check if a given string represents a time that lies on a the boundary of a time step.
           * @param {String} timeString The timestamp in the expected format.
           * @returns {boolean} true if the string represents a valid time and that time lies on a time step boundary; false otherwise.
           */
          function checkTimeValueFitsStep( timeString ) {
            var time = timeString ? moment( timeString, scope.format ) : moment.invalid();
            // Check first if the time string could be parsed as a valid timestamp.
            var isValid = time.isValid();
            if( isValid ) {
              // Calculate the amount of milliseconds that passed since the specified start time.
              var durationSinceStartTime = time.diff( scope.startTime );
              // Calculate how many milliseconds are within the given time step.
              var stepMilliseconds = scope.step.asMilliseconds();
              // Check if the modulo operation has a remainder.
              isValid = ( 0 == ( durationSinceStartTime % stepMilliseconds ) );
            }

            if( !isValid ) {
              controller.$setValidity( "step", false );
              controller.$setViewValue( null );
              return false;
            } else {
              controller.$setValidity( "step", true );
              return true;
            }
          }

          function ensureUpdatedView() {
            scope.$root.$$phase || scope.$apply();

            // Scroll the selected list item into view if the popup is open.
            if( scope.isOpen ) {
              // Use $timeout to give the DOM time to catch up.
              $timeout( function() {
                scrollSelectedItemIntoView();
              } );
            }
          }

          /**
           * Scroll the time that is currently selected into view.
           * This applies to the dropdown below the input element.
           */
          function scrollSelectedItemIntoView() {
            // Find the popup.
            var popupListElement = element.find( "ul" );
            // Scroll it to the top, so that we can then get the correct relative offset for all list items.
            $( popupListElement ).scrollTop( 0 );
            // Find the selected list item.
            var selectedListElement = $( "li.active", popupListElement );
            // Retrieve offset from the top and height of the list element.
            var top = selectedListElement.length ? selectedListElement.position().top : 0;
            var height = selectedListElement.length ? selectedListElement.outerHeight( true ) : 0;
            // Scroll the list to bring the selected list element into the view.
            $( popupListElement ).scrollTop( top - height );
          }

          /**
           * Open the popup dropdown list.
           */
          function openPopup() {
            if( !scope.isOpen ) {
              scope.isOpen = true;
              scope.modelPreview = scope.ngModel ? scope.ngModel.clone() : scope.startTime.clone();
              ensureUpdatedView();
            }
          }

          /**
           * Close the popup dropdown list.
           */
          function closePopup( delayed ) {
            if( delayed ) {
              // Delay closing the popup by 200ms to ensure selection of
              // list items can happen before the popup is hidden.
              $timeout(
                function() {
                  scope.isOpen = false;
                }
                , 200 );
            } else {
              scope.isOpen = false;
              ensureUpdatedView();
            }
          }

          // --------------- Scope methods ---------------

          /**
           * Selects a given timestamp as the new value of the timepicker.
           * @param {Number} timestamp UNIX timestamp
           * @param {Number} elementIndex The index of the time element in the dropdown list.
           */
          scope.select = function( timestamp, elementIndex ) {
            // Construct a moment instance from the UNIX offset.
            var time = moment( timestamp );
            // Format the time to store it in the input box.
            scope.time = time.format( scope.format );

            // Store the selected index
            scope.activeIndex = elementIndex;

            scope.update();
            closePopup();
          };

          /**
           * Check if the value in the input control is a valid timestamp.
           */
          scope.update = function() {
            var timeValid = checkTimeValueValid( scope.time ) && checkTimeValueWithinBounds( scope.time );
            if( timeValid ) {
              controller.$setViewValue( moment( scope.time, scope.format ) );
            }
          };

          scope.handleKeyboardInput = function( event ) {
            switch( event.keyCode ) {
              case 13:
                // Enter
                if( scope.modelPreview ) {
                  scope.ngModel = scope.modelPreview;
                  scope.isOpen = false;
                }
                break;
              case 27:
                // Escape
                closePopup();
                break;
              case 33:
                // Page up
                scope.modelPreview.subtract( scope.largeStep );
                scope.modelPreview = scope.ensureTimeIsWithinBounds( scope.modelPreview );
                scope.activeIndex = Math.max( 0, scope.activeIndex - scope.largeStepIndexJump );
                break;
              case 34:
                // Page down
                scope.modelPreview.add( scope.largeStep );
                scope.modelPreview = scope.ensureTimeIsWithinBounds( scope.modelPreview );
                scope.activeIndex = Math.max( 0, scope.activeIndex + scope.largeStepIndexJump );
                break;
              case 38:
                // Up arrow
                openPopup();
                scope.modelPreview.subtract( scope.step );
                scope.modelPreview = scope.ensureTimeIsWithinBounds( scope.modelPreview );
                scope.activeIndex = Math.max( 0, scope.activeIndex - 1 );
                break;
              case 40:
                // Down arrow
                openPopup();
                scope.modelPreview.add( scope.step );
                scope.modelPreview = scope.ensureTimeIsWithinBounds( scope.modelPreview );
                scope.activeIndex = Math.min( scope.largestPossibleIndex, scope.activeIndex + 1 );
                break;
              default:
            }
            ensureUpdatedView();
          };

          /**
           * Prevent default behavior from happening.
           * @param event
           */
          scope.preventDefault = function( event ) {
            event.preventDefault();
          };

          /**
           * Remember the highest index of the existing list items.
           * We use this to constrain the possible values for the index that marks a list item as active.
           * @param {Number} index
           */
          scope.largestPossibleIndexIs = function( index ) {
            scope.largestPossibleIndex = index;
          };

          var inputElement = element.find( "input" );
          var toggleButtonElement = element.find( "button" );
          var popupListElement = element.find( "ul" );

          /**
           * Open the popup when the input box gets focus.
           */
          inputElement.bind( "focus", function() {
            openPopup();
          } );

          /**
           * Invoked when the input box loses focus.
           */
          inputElement.bind( "blur", function() {
            // Delay any action by 150ms
            $timeout( function() {
              // Check if we didn't get refocused in the meantime.
              // This can happen if the input box is selected and the user toggles the dropdown.
              // This would cause a hide and close in rapid succession, so don't do it.
              if( !$( inputElement ).is( ":focus" ) ) {
                closePopup();
                validateView();
              }
            }, 150 );
          } );

          /**
           * Define the behavior of the dropdown toggle button.
           */
          toggleButtonElement.bind( "click", function() {
            if( scope.isOpen ) {
              $( inputElement ).focus();
              closePopup();
            } else {
              // Focusing the input element will automatically open the popup
              $( inputElement ).focus();
            }
          } );

          popupListElement.bind( "mousedown", function( event ) {
            event.preventDefault();
          } );
        }
      }
    }
  ] );