$(document).ready( function() {
    $(function() {

      $("#date").datepicker( {
          minDate: +1,
          maxDate: '+6M',
      } );
    });
  });
