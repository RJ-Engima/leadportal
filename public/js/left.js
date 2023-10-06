$(document).ready(function () {
  $(".subMenu a").removeClass("leftActive");
  let querySelector = 'a.topnav-item[href="' + window.location.pathname + '"]';
  $('a.topnav-item[href="' + window.location.pathname + '"]')
    .parents(".actLi")
    .find(".subMenu")
    .css("display", "block");
  $(querySelector).addClass("actBrd");

  $(".slideClick").click(function (e) {
    e.preventDefault();
    $(this).parent().find(".subMenu").toggle();
  });
});
