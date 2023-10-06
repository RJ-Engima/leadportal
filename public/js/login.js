$(document).ready(function () {

  var enc_token = document.querySelector('meta[name="theme-id-value"]').getAttribute('content');

  $(".forgot a").click(function () {
    $(".loginform").hide();
    $(".fgtPassword").css("display", "flex");
    $("#forgotemail").focus();
  });

  $("#email").focus();

  $(".myClose").click(function () {
    $("#logMsg").fadeOut("slow");
  });

  // login oage route to clear session
  sessionStorage.clear()


  $("#loginSubmit").on("submit", function (e) {

    e.preventDefault();

    if ($("#email").val() !== "" && $("#password").val() !== "") {
      var email = $("#email").val();
      var password = $("#password").val();

      $.ajax({
        url: "/login",
        data: {
          username: email,
          password: password,
        },
        headers: { 'CSRF-Token': enc_token },
        type: "POST",
        success: function (data) {
          console.log(data.userRole.applicationDetails[0].data.role.name);
          let role = data.userRole.applicationDetails[0].data.role.name
          sessionStorage.setItem('loginData', JSON.stringify(data.userRole.loginDetail))
          sessionStorage.setItem('userToken', data.jwttoken)
          sessionStorage.setItem("login", true)
          sessionStorage.setItem("Role", role)
          var token = sessionStorage.getItem('userToken')
          if(data.userRole.applicationDetails[0].data.role.name==="LEAD_LIVQUIK_MAKER"&&token){
            window.location = '/livquik-contact';
          }else if(data.userRole.applicationDetails[0].data.role.name==="LEAD_PAYLATER_MAKER"&&token){
            window.location = '/paylater';
          }
          else{
            window.location = '/contact';
          }
        },
        error: function (err) {
          $("#logMsg").removeClass("hide").addClass("dangerAlert").show();
          $("#logMsg").html(`<span><i class="fa fa-times-circle siIcon"></i></span><div> <h2 class="err">Error</h2> <p class="errBlw">${err.responseText}</p> </div>`);
        },
      });
      setTimeout(function () {
        $("#logMsg").fadeOut("slow");
      }, 2000);
    }
    else {
      $("#logMsg").removeClass("hide").addClass("dangerAlert").show();
      $("#logMsg").html(`<span><i class="fa fa-times-circle siIcon"></i></span><div> <h2 class="err">Error</h2> <p class="errBlw">Fill username or password</p> </div>`);
      setTimeout(function () {
        $("#logMsg").fadeOut("slow");
      }, 2000);
    }
  });


  $('#getotp').on('click', function (e) {
    e.preventDefault();
    if ($('#forgotemail').val() !== "") {

      var user = $('#forgotemail').val()
      $.ajax({
        url: "/forgotpassword",
        data: {
          userName: user
        },
        headers: { 'CSRF-Token': enc_token },
        type: "POST",
        success: function (data) {
          sessionStorage.setItem('user', user)
          $('#fgetpasssec').hide()
          $('#otpsec').removeClass("OtpSubcls").addClass("fgtOtpSub");
          $("#logMsg").removeClass("hide").addClass("successAlert").show();
          $("#logMsg").html(`<span><i class="fa fa-check-circle siIcon"></i></span><div> <h2 class="err">Success</h2> <p class="errBlw">OTP sent successfull</p> </div>`);
          setTimeout(function () {
            $("#logMsg").fadeOut("slow");
          }, 1000);

          $("#otpvalidate").focus()

        },
        error: function (err) {
          $("#logMsg").removeClass("hide").addClass("dangerAlert").show();
          $("#logMsg").html(`<span><i class="fa fa-times-circle siIcon"></i></span><div> <h2 class="err">Error</h2> <p class="errBlw">${err.responseText}</p> </div>`);
          setTimeout(function () {
            $("#logMsg").fadeOut("slow");
          }, 2000);
        },
      });

    }
    else{
      $("#logMsg").removeClass("hide").addClass("dangerAlert").show();
      $("#logMsg").html(`<span><i class="fa fa-times-circle siIcon"></i></span><div> <h2 class="err">Error</h2> <p class="errBlw">Fill username or Email Id</p> </div>`);
      setTimeout(function () {
        $("#logMsg").fadeOut("slow");
      }, 2000);
    }
    // else {
    //   $("#logMsg")
    //     .removeClass("hide")
    //     .addClass("dangerAlert")
    //     .slideDown()
    //     .show();
    //   $("#logMsg_content").html(
    //     '<h4> Enter Email Id<span class="myClose"><i class="fas fa-times"></i></span></h4>'
    //   );
    //   setTimeout(function () {
    //     $("#logMsg").fadeOut("slow");
    //   }, 2000);
    // }

  })

  $('#submitOtp').on('click', function (e) {
    e.preventDefault();
    if ($('#otpvalidate').val() !== "") {
      var user = sessionStorage.getItem('user')
      var otpVal = $('#otpvalidate').val()
      $.ajax({
        url: "/validateotp",
        data: {
          userName: user,
          otp: otpVal
        },
        headers: { 'CSRF-Token': enc_token },
        type: "POST",
        success: function (data) {
          console.log(data,"pass data");
          if(data === "Success"){
            $("#logMsg").removeClass("hide").addClass("successAlert").show();
            $("#logMsg").html(`<span><i class="fa fa-check-circle siIcon"></i></span><div> <h2 class="err">Success</h2> <p class="errBlw">OTP successfull</p> </div>`);
            setTimeout(function () {
              $("#logMsg").fadeOut("slow");
            }, 1000);
            $('#otpsec').hide()
            $('#setnewPass').css({ 'display': 'flex' })
          };
        },
        error: function (err) {
          $("#logMsg").removeClass("hide").removeClass("successAlert").addClass("dangerAlert").show();
          $("#logMsg").html(`<span><i class="fa fa-times-circle siIcon"></i></span><div> <h2 class="err">Error</h2> <p class="errBlw">${err.responseText}</p> </div>`);

          setTimeout(function () {
            $("#logMsg").fadeOut("slow");
          }, 2000);
        },
      });
    }
  })


  $('#submitResetpassword').on('submit', function (e) {
    e.preventDefault();

    var newPass = $('.newchangepass').val()
    var newConfirmPass = $('.newconfirmpass').val();

    if(newPass != newConfirmPass){
      $("#logMsg").removeClass("hide").removeClass("successAlert").addClass("dangerAlert").show();
      $("#logMsg").html(`<span><i class="fa fa-times-circle siIcon"></i></span><div> <h2 class="err">Error</h2> <p class="errBlw">New password and Confirm password must be same</p> </div>`);

      setTimeout(function () {
        $("#logMsg").fadeOut("slow");
      },2000);
      newPass.val("");
      newConfirmPass.val("")
    }

    if (newPass === newConfirmPass) {
      var user = sessionStorage.getItem('user')
      var otpVal = $('#otpvalidate').val()
      $.ajax({
        url: "/resetPassword",
        data: {
          userName: user,
          password: newPass
        },
        headers: { 'CSRF-Token': enc_token },
        type: "POST",
        success: function (data) {
          $("#logMsg").removeClass("hide").addClass("successAlert").show();
          $("#logMsg").html(`<span><i class="fa fa-check-circle siIcon"></i></span><div> <h2 class="err">Success</h2> <p class="errBlw">Password Changed Successfully</p> </div>`);
          setTimeout(function () {
            $("#logMsg").fadeOut("slow");
          }, 1000);
          sessionStorage.clear()
          window.location = '/'
        },
        error: function (err) {
          $("#logMsg").removeClass("hide").removeClass("successAlert").addClass("dangerAlert").show();
          $("#logMsg").html(`<span><i class="fa fa-times-circle siIcon"></i></span><div> <h2 class="err">Error</h2> <p class="errBlw">${err.responseText}</p> </div>`);

          setTimeout(function () {
            $("#logMsg").fadeOut("slow");
          }, 2000);

        },
      });
    }

  })


  $("#otpvalidate").keypress(function (e) {
    if ((e.which != 8) && (e.which != 0) && (e.which < 48 || e.which > 57)) {
      return false;
    }
  });


  // $(".newforgot").on("submit", function (e) {
  //   e.preventDefault()
  //   $(".changeIn").focus();

  //   var forInput = $("#forgotemail").val();

  //   setTimeout(function () {
  //     $('#messages').fadeOut('slow');
  //   }, 3000);
  // });


  // $(".changePass").on("submit", function (e) {
  //   e.preventDefault()
  //   var passFilter =
  //     /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
  //   var myPass = $(".changeIn").val();
  //   var myConfirm = $(".confirmIn").val();
  //   if (passFilter.test(myPass) && passFilter.test(myConfirm)) {
  //     $("#ChangeMgs")
  //       .removeClass("hide")
  //       .addClass("successAlert")
  //       .slideDown()
  //       .show();
  //     $("#ChangeMgs_content").html(
  //       '<h4>Password has been changed successfully<span class="myClose"><i class="fas fa-times"></i></span></h4>'
  //     );
  //   }
  //   if (myPass === myConfirm) {
  //     $(".new-pass").hide();
  //     $(".loginform").css("display", "flex");
  //     $("#ChangeMgs")
  //       .removeClass("hide")
  //       .addClass("successAlert")
  //       .slideDown()
  //       .show();
  //     $("#ChangeMgs_content").html(
  //       '<h4>Password has been changed successfully<span class="myClose"><i class="fas fa-times"></i></span></h4>'
  //     );
  //     $(".changeIn").val("");
  //     $(".confirmIn").val("");
  //   } else {
  //     $("#ChangeMgs")
  //       .removeClass("hide")
  //       .addClass("dangerAlert")
  //       .slideDown()
  //       .show();
  //     $("#ChangeMgs_content").html(
  //       '<h4>New password and confirm password must same<span class="myClose"><i class="fas fa-times"></i></span></h4>'
  //     );
  //   }
  //   setTimeout(function () {
  //     $("#ChangeMgs").fadeOut("slow");
  //   }, 3000);
  // });
});


